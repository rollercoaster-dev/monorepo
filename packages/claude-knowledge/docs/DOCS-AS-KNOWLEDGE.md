# Documentation as Knowledge Foundation

> RFC: Making documentation the primary knowledge source instead of commit messages.

## Problem Statement

The current knowledge graph captures learnings from:

- Commit message parsing → low value, terse fragments
- File change counts → nearly useless

Meanwhile, actual knowledge lives in:

- `docs/*.md` files with architecture, patterns, decisions
- `CLAUDE.md` files with project-specific context
- README files with usage examples
- JSDoc/TSDoc comments in code

**The roadmap assumes we should "prove value first" but there's nothing valuable to prove with commit fragments.**

## Proposed Solution

Index documentation as the primary knowledge source. Semantic search over real documentation will provide actual value.

## Design

### New Entity Type: `DocSection`

```typescript
interface DocSection {
  id: string;
  /** Source file path */
  filePath: string;
  /** Section heading (null for preamble content) */
  heading: string | null;
  /** Markdown content of this section */
  content: string;
  /** Heading level (1-6, 0 for preamble) */
  level: number;
  /** Parent section ID for hierarchy navigation */
  parentId: string | null;
  /** Anchor slug for linking (e.g., "design-decisions") */
  anchor: string | null;
}
```

### New Relationship Types

| Type         | From       | To          | Meaning                 |
| ------------ | ---------- | ----------- | ----------------------- |
| `CHILD_OF`   | DocSection | DocSection  | Hierarchy (h2 under h1) |
| `DOCUMENTS`  | DocSection | GraphEntity | Doc describes this code |
| `IN_DOC`     | DocSection | File        | Section belongs to file |
| `REFERENCES` | DocSection | DocSection  | Cross-doc link          |

### Schema Changes

```sql
-- Add to EntityType enum
-- 'DocSection' added to type CHECK constraint

-- Add to RelationshipType enum
-- 'CHILD_OF', 'DOCUMENTS', 'IN_DOC', 'REFERENCES' added
```

## Implementation

### Phase 1: Markdown Parser (`src/docs/parser.ts`)

Parse markdown into sections preserving hierarchy:

```typescript
import { marked } from "marked";

interface ParsedSection {
  heading: string | null;
  content: string;
  level: number;
  anchor: string | null;
  startLine: number;
  endLine: number;
  children: ParsedSection[];
}

/**
 * Parse markdown into hierarchical sections.
 * Splits on headings, preserves content between them.
 */
export function parseMarkdown(content: string): ParsedSection[] {
  const tokens = marked.lexer(content);
  const sections: ParsedSection[] = [];
  const stack: ParsedSection[] = [];

  let currentContent: string[] = [];
  let currentStart = 0;

  for (const token of tokens) {
    if (token.type === "heading") {
      // Flush current content to previous section
      if (stack.length > 0 || currentContent.length > 0) {
        const section = createSection(currentContent, currentStart, token);
        attachToParent(section, stack, sections);
      }

      // Start new section
      const newSection: ParsedSection = {
        heading: token.text,
        content: "",
        level: token.depth,
        anchor: slugify(token.text),
        startLine: token.raw ? currentStart : 0,
        endLine: 0,
        children: [],
      };

      // Adjust stack based on heading level
      while (stack.length > 0 && stack[stack.length - 1].level >= token.depth) {
        stack.pop();
      }
      stack.push(newSection);
      currentContent = [];
      currentStart = token.raw
        ? currentStart + token.raw.split("\n").length
        : 0;
    } else {
      currentContent.push(token.raw || "");
    }
  }

  // Flush final content
  if (currentContent.length > 0 && stack.length > 0) {
    stack[stack.length - 1].content = currentContent.join("");
  }

  return sections;
}

function slugify(text: string): string {
  return text
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "");
}
```

### Phase 2: Doc Store (`src/docs/store.ts`)

```typescript
import { getDatabase } from "../db/sqlite";
import {
  createOrMergeEntity,
  generateEmbedding,
  createRelationship,
} from "../knowledge/helpers";
import { parseMarkdown, type ParsedSection } from "./parser";
import { randomUUID } from "crypto";

interface IndexOptions {
  /** Link to code entities mentioned in content */
  linkToCode?: boolean;
  /** Minimum section length to index (skip tiny sections) */
  minContentLength?: number;
}

/**
 * Index a markdown file into the knowledge graph.
 * Creates DocSection entities with embeddings for semantic search.
 */
export async function indexDocument(
  filePath: string,
  options: IndexOptions = {},
): Promise<{ sectionsIndexed: number; linkedToCode: number }> {
  const { linkToCode = true, minContentLength = 50 } = options;

  const file = Bun.file(filePath);
  if (!(await file.exists())) {
    throw new Error(`File not found: ${filePath}`);
  }

  const content = await file.text();
  const sections = parseMarkdown(content);
  const db = getDatabase();

  let sectionsIndexed = 0;
  let linkedToCode = 0;

  // Flatten sections with parent references
  const flatSections = flattenSections(sections, filePath);

  // Generate embeddings in parallel
  const embeddings = await Promise.all(
    flatSections.map((s) =>
      generateEmbedding([s.heading, s.content].filter(Boolean).join("\n")),
    ),
  );

  db.run("BEGIN TRANSACTION");

  try {
    // Create File entity for the document
    const fileId = `file-${Buffer.from(filePath).toString("base64url")}`;
    createOrMergeEntity(db, "File", fileId, { path: filePath });

    for (let i = 0; i < flatSections.length; i++) {
      const section = flatSections[i];
      const embedding = embeddings[i];

      // Skip tiny sections
      if (section.content.length < minContentLength && !section.heading) {
        continue;
      }

      // Create DocSection entity
      createOrMergeEntity(
        db,
        "DocSection",
        section.id,
        {
          filePath,
          heading: section.heading,
          content: section.content,
          level: section.level,
          anchor: section.anchor,
        },
        embedding,
      );

      sectionsIndexed++;

      // Create hierarchy relationship
      if (section.parentId) {
        createRelationship(db, section.id, section.parentId, "CHILD_OF");
      }

      // Create IN_DOC relationship
      createRelationship(db, section.id, fileId, "IN_DOC");

      // Link to code entities if enabled
      if (linkToCode) {
        const codeLinks = extractCodeReferences(section.content, db);
        for (const entityId of codeLinks) {
          createRelationship(db, section.id, entityId, "DOCUMENTS");
          linkedToCode++;
        }
      }
    }

    db.run("COMMIT");
  } catch (error) {
    db.run("ROLLBACK");
    throw error;
  }

  return { sectionsIndexed, linkedToCode };
}

interface FlatSection {
  id: string;
  heading: string | null;
  content: string;
  level: number;
  anchor: string | null;
  parentId: string | null;
}

function flattenSections(
  sections: ParsedSection[],
  filePath: string,
  parentId: string | null = null,
): FlatSection[] {
  const result: FlatSection[] = [];

  for (const section of sections) {
    const id = `doc-${Buffer.from(filePath).toString("base64url")}-${section.anchor || randomUUID()}`;

    result.push({
      id,
      heading: section.heading,
      content: section.content,
      level: section.level,
      anchor: section.anchor,
      parentId,
    });

    // Recurse into children
    if (section.children.length > 0) {
      result.push(...flattenSections(section.children, filePath, id));
    }
  }

  return result;
}

/**
 * Extract references to code entities from documentation content.
 * Looks for patterns like `functionName()`, `ClassName`, backtick code.
 */
function extractCodeReferences(content: string, db: Database): string[] {
  const refs: string[] = [];

  // Match backtick code references
  const codeMatches = content.matchAll(/`([a-zA-Z_][a-zA-Z0-9_]*(?:\(\))?)`/g);

  for (const match of codeMatches) {
    const name = match[1].replace(/\(\)$/, "");

    // Look up in code graph
    const entity = db
      .query<
        { id: string },
        [string]
      >("SELECT id FROM graph_entities WHERE name = ? LIMIT 1")
      .get(name);

    if (entity) {
      refs.push(entity.id);
    }
  }

  return [...new Set(refs)]; // Dedupe
}

/**
 * Index all markdown files in a directory.
 */
export async function indexDirectory(
  dirPath: string,
  options: IndexOptions & { pattern?: string } = {},
): Promise<{ filesIndexed: number; totalSections: number }> {
  const { pattern = "**/*.md", ...indexOptions } = options;

  const glob = new Bun.Glob(pattern);
  const files = await Array.fromAsync(
    glob.scan({ cwd: dirPath, absolute: true }),
  );

  let filesIndexed = 0;
  let totalSections = 0;

  for (const file of files) {
    const result = await indexDocument(file, indexOptions);
    filesIndexed++;
    totalSections += result.sectionsIndexed;
  }

  return { filesIndexed, totalSections };
}
```

### Phase 3: Doc Search (`src/docs/search.ts`)

```typescript
import { getDatabase } from "../db/sqlite";
import { generateEmbedding } from "../knowledge/helpers";
import { bufferToFloatArray } from "../embeddings";
import { cosineSimilarity } from "../embeddings/similarity";

interface DocSearchResult {
  /** The matching documentation section */
  section: {
    id: string;
    filePath: string;
    heading: string | null;
    content: string;
    level: number;
    anchor: string | null;
  };
  /** Similarity score (0.0 - 1.0) */
  similarity: number;
  /** File path for quick reference */
  location: string;
}

interface SearchOptions {
  /** Maximum results (default: 10) */
  limit?: number;
  /** Minimum similarity (default: 0.3) */
  threshold?: number;
  /** Filter to specific files */
  filePaths?: string[];
}

/**
 * Semantic search over indexed documentation.
 */
export async function searchDocs(
  query: string,
  options: SearchOptions = {},
): Promise<DocSearchResult[]> {
  const { limit = 10, threshold = 0.3, filePaths } = options;

  const db = getDatabase();

  // Generate query embedding
  const queryEmbedding = await generateEmbedding(query);
  if (!queryEmbedding) {
    return [];
  }
  const queryVector = bufferToFloatArray(queryEmbedding);

  // Fetch all doc sections with embeddings
  let sql = `
    SELECT id, data, embedding
    FROM entities
    WHERE type = 'DocSection' AND embedding IS NOT NULL
  `;

  if (filePaths && filePaths.length > 0) {
    const placeholders = filePaths.map(() => "?").join(",");
    sql += ` AND json_extract(data, '$.filePath') IN (${placeholders})`;
  }

  const rows = db
    .query<{ id: string; data: string; embedding: Buffer }, string[]>(sql)
    .all(...(filePaths || []));

  // Score and rank
  const scored: Array<{ row: (typeof rows)[0]; similarity: number }> = [];

  for (const row of rows) {
    if (!row.embedding) continue;

    const rowVector = bufferToFloatArray(row.embedding);
    const similarity = cosineSimilarity(queryVector, rowVector);

    if (similarity >= threshold) {
      scored.push({ row, similarity });
    }
  }

  // Sort by similarity descending
  scored.sort((a, b) => b.similarity - a.similarity);

  // Build results
  return scored.slice(0, limit).map(({ row, similarity }) => {
    const section = JSON.parse(row.data);
    return {
      section,
      similarity,
      location: `${section.filePath}${section.anchor ? "#" + section.anchor : ""}`,
    };
  });
}

/**
 * Get documentation for a specific code entity.
 * Uses DOCUMENTS relationships created during indexing.
 */
export function getDocsForCode(entityId: string): DocSearchResult[] {
  const db = getDatabase();

  const sql = `
    SELECT e.id, e.data
    FROM entities e
    JOIN relationships r ON r.from_id = e.id
    WHERE r.to_id = ? AND r.type = 'DOCUMENTS'
  `;

  const rows = db
    .query<{ id: string; data: string }, [string]>(sql)
    .all(entityId);

  return rows.map((row) => {
    const section = JSON.parse(row.data);
    return {
      section,
      similarity: 1.0, // Direct link, not semantic match
      location: `${section.filePath}${section.anchor ? "#" + section.anchor : ""}`,
    };
  });
}

/**
 * Get code entities documented by a section.
 * Reverse lookup of DOCUMENTS relationship.
 */
export function getCodeForDoc(
  sectionId: string,
): Array<{ id: string; name: string; type: string }> {
  const db = getDatabase();

  const sql = `
    SELECT ge.id, ge.name, ge.type
    FROM graph_entities ge
    JOIN relationships r ON r.to_id = ge.id
    WHERE r.from_id = ? AND r.type = 'DOCUMENTS'
  `;

  return db
    .query<{ id: string; name: string; type: string }, [string]>(sql)
    .all(sectionId);
}
```

### Phase 4: CLI Commands (`src/cli/docs.ts`)

```typescript
import { indexDocument, indexDirectory } from "../docs/store";
import { searchDocs, getDocsForCode } from "../docs/search";

export async function handleDocsCommand(args: string[]): Promise<void> {
  const [subcommand, ...rest] = args;

  switch (subcommand) {
    case "index": {
      const [path] = rest;
      if (!path) {
        console.error("Usage: docs index <file-or-directory>");
        process.exit(1);
      }

      const stat = (await Bun.file(path).exists()) ? "file" : "directory";

      if (stat === "file") {
        const result = await indexDocument(path);
        console.log(`Indexed ${result.sectionsIndexed} sections`);
        console.log(`Linked ${result.linkedToCode} code references`);
      } else {
        const result = await indexDirectory(path);
        console.log(`Indexed ${result.filesIndexed} files`);
        console.log(`Total ${result.totalSections} sections`);
      }
      break;
    }

    case "search": {
      const query = rest.join(" ");
      if (!query) {
        console.error("Usage: docs search <query>");
        process.exit(1);
      }

      const results = await searchDocs(query, { limit: 5 });

      if (results.length === 0) {
        console.log("No matching documentation found.");
        return;
      }

      for (const result of results) {
        console.log(`\n## ${result.section.heading || "(No heading)"}`);
        console.log(`   ${result.location}`);
        console.log(`   Similarity: ${(result.similarity * 100).toFixed(1)}%`);
        console.log(`   ${result.section.content.slice(0, 200)}...`);
      }
      break;
    }

    case "for-code": {
      const [entityId] = rest;
      if (!entityId) {
        console.error("Usage: docs for-code <entity-id>");
        process.exit(1);
      }

      const docs = getDocsForCode(entityId);

      if (docs.length === 0) {
        console.log("No documentation linked to this entity.");
        return;
      }

      for (const doc of docs) {
        console.log(`\n## ${doc.section.heading || "(No heading)"}`);
        console.log(`   ${doc.location}`);
      }
      break;
    }

    default:
      console.error("Unknown docs subcommand:", subcommand);
      console.error("Available: index, search, for-code");
      process.exit(1);
  }
}
```

### Phase 5: Session Hook Integration

Update `onSessionStart` to inject relevant docs:

```typescript
// In hooks.ts, add to onSessionStart:

// Get relevant documentation for modified files
const relevantDocs: DocSearchResult[] = [];

if (context.modifiedFiles && context.modifiedFiles.length > 0) {
  // Search docs semantically based on file paths and code areas
  const searchTerms = [
    ...codeAreas,
    ...context.modifiedFiles.map(f => path.basename(f, path.extname(f)))
  ].join(' ');

  const docResults = await searchDocs(searchTerms, {
    limit: 5,
    threshold: 0.4,
  });

  relevantDocs.push(...docResults);
}

// Add to KnowledgeContext return
return {
  learnings,
  patterns,
  mistakes,
  topics,
  docs: relevantDocs,  // NEW
  summary: formatKnowledgeContext(learnings, patterns, mistakes, topics, relevantDocs),
  _sessionMetadata: { ... },
};
```

## File Structure

```
src/docs/
├── index.ts        # Public exports
├── parser.ts       # Markdown → sections
├── store.ts        # Index documents
├── search.ts       # Search & linking
└── types.ts        # DocSection types

src/cli/
├── index.ts        # Add 'docs' command routing
└── docs.ts         # CLI handlers
```

## Usage

```bash
# Index package documentation
bun run checkpoint docs index packages/claude-knowledge/docs/

# Index entire monorepo docs
bun run checkpoint docs index . --pattern "**/docs/**/*.md"

# Search documentation
bun run checkpoint docs search "semantic search embeddings"

# Find docs for a code entity
bun run checkpoint docs for-code "claude-knowledge:src/knowledge/semantic.ts:function:searchSimilar"
```

## Migration Path

1. **Keep existing Learning/Topic capture** - but deprioritize it
2. **Add DocSection as primary knowledge source**
3. **Update session hooks** to inject docs alongside learnings
4. **Dogfood with real documentation** - now there's value to measure

## Success Criteria

After implementation:

- [ ] Can search docs semantically: "how does the checkpoint system work?"
- [ ] Modified file → relevant docs surfaced automatically
- [ ] Code entity → linked documentation available
- [ ] Session start injects useful context (not commit fragments)

## Dependencies

- `marked` (or `remark`) for markdown parsing
- Existing embedding infrastructure (TF-IDF already works)
- Existing SQLite storage

## Estimated Effort

| Component    | Lines | Complexity |
| ------------ | ----- | ---------- |
| parser.ts    | ~100  | Medium     |
| store.ts     | ~150  | Medium     |
| search.ts    | ~100  | Low        |
| cli/docs.ts  | ~80   | Low        |
| types.ts     | ~30   | Low        |
| hook updates | ~50   | Low        |
| tests        | ~200  | Medium     |

**Total**: ~700 lines, 1-2 days of focused work

## Design Decisions (Researched)

### 1. Chunking Strategy: Hybrid Heading + Size Limit

**Decision**: Split on markdown headings first, then apply size limits to oversized sections.

**Research findings** ([Weaviate](https://weaviate.io/blog/chunking-strategies-for-rag), [Firecrawl](https://www.firecrawl.dev/blog/best-chunking-strategies-rag-2025), [Pinecone](https://www.pinecone.io/learn/chunking-strategies/)):

- Structure-aware chunking (headings) is ideal for markdown - up to 9% better recall than naive splitting
- Optimal chunk size: **256-512 tokens** with **10-20% overlap**
- "MarkdownHeaderTextSplitter first, then RecursiveCharacterTextSplitter on chunks that are still too big"

**Implementation**:

```typescript
const MAX_SECTION_TOKENS = 512;
const OVERLAP_TOKENS = 50;

function chunkSection(section: ParsedSection): ParsedSection[] {
  const tokens = estimateTokens(section.content);

  if (tokens <= MAX_SECTION_TOKENS) {
    return [section]; // Keep as-is
  }

  // Split on paragraph breaks, preserving overlap
  return splitByParagraphs(section, MAX_SECTION_TOKENS, OVERLAP_TOKENS);
}
```

**Rationale**: Documentation has clear structural hierarchy (headings), but some sections (like this RFC) are very long. Hybrid approach respects structure while keeping chunks searchable.

---

### 2. Re-indexing Strategy: Content Hash Incremental

**Decision**: Use content hashing for incremental updates, with periodic full reindex.

**Research findings** ([LangChain Indexing](https://js.langchain.com/docs/how_to/indexing/), [Zilliz](https://zilliz.com/ai-faq/how-does-incremental-indexing-or-periodic-batch-indexing-help-in-handling-continuously-growing-large-datasets-and-what-are-the-limitations-of-these-approaches)):

- Full reindex of 12,000 files: 22 minutes, $8.50 API costs
- Incremental update (10 files): 45 seconds, $0.07 API costs
- Content hashing detects changes without re-embedding unchanged content
- Caveat: Incremental mode doesn't handle deletions well

**Implementation**:

```typescript
interface IndexedDoc {
  filePath: string;
  contentHash: string; // SHA-256 of file content
  indexedAt: string;
}

async function indexDocumentIncremental(
  filePath: string,
): Promise<IndexResult> {
  const content = await Bun.file(filePath).text();
  const hash = hashContent(content);

  const existing = db
    .query<
      IndexedDoc,
      [string]
    >("SELECT content_hash FROM doc_index WHERE file_path = ?")
    .get(filePath);

  if (existing?.contentHash === hash) {
    return { status: "unchanged", sectionsIndexed: 0 };
  }

  // Delete old sections for this file, re-index
  db.run(
    'DELETE FROM entities WHERE type = "DocSection" AND json_extract(data, "$.filePath") = ?',
    filePath,
  );
  return indexDocument(filePath);
}

// Full reindex command for cleanup
async function fullReindex(dirPath: string): Promise<void> {
  db.run('DELETE FROM entities WHERE type = "DocSection"');
  await indexDirectory(dirPath);
}
```

**Rationale**: Our doc corpus is small (~100 files), so incremental is fast. Monthly full reindex handles edge cases (deletions, schema changes).

---

### 3. Cross-Doc Links: Yes, Parse into REFERENCES

**Decision**: Extract markdown links and create REFERENCES relationships.

**Research findings** ([KRML](https://github.com/edwardanderson/krml), [Scholarcy](https://www.scholarcy.com/blog/knowledge-graphs)):

- Knowledge graph tools commonly use markdown links as relationship signals
- "Forward and backward links between documents" enable graph traversal
- Cross-document coreference improves retrieval by connecting related content

**Implementation**:

```typescript
function extractCrossDocLinks(
  content: string,
  currentFilePath: string,
): string[] {
  const linkPattern = /\[([^\]]+)\]\(([^)]+\.md(?:#[^)]*)?)\)/g;
  const refs: string[] = [];

  for (const match of content.matchAll(linkPattern)) {
    const [, , targetPath] = match;

    // Resolve relative paths
    const absolutePath = resolve(
      dirname(currentFilePath),
      targetPath.split("#")[0],
    );
    const anchor = targetPath.includes("#") ? targetPath.split("#")[1] : null;

    // Generate target section ID
    const targetId = anchor
      ? `doc-${Buffer.from(absolutePath).toString("base64url")}-${anchor}`
      : `file-${Buffer.from(absolutePath).toString("base64url")}`;

    refs.push(targetId);
  }

  return refs;
}

// In indexDocument(), after creating section:
const crossRefs = extractCrossDocLinks(section.content, filePath);
for (const targetId of crossRefs) {
  createRelationship(db, section.id, targetId, "REFERENCES");
}
```

**Rationale**: Our docs already use cross-references extensively (e.g., "See [ARCHITECTURE.md](./ARCHITECTURE.md)"). Capturing these as graph edges enables "related docs" queries.

---

### 4. JSDoc/TSDoc Extraction: Yes, via ts-morph

**Decision**: Extract JSDoc comments as `CodeDoc` entities linked to code graph entities.

**Research findings** ([ts-morph docs](https://ts-morph.com/details/documentation), [TSDoc](https://tsdoc.org/)):

- ts-morph provides `getJsDocs()` on any declaration node
- Returns `JSDoc[]` with `getDescription()`, `getTags()`, `getInnerText()`
- Already using ts-morph for code graph - zero additional dependencies

**Implementation** (extend existing `parser.ts`):

```typescript
// In extractEntities(), after creating function entity:
const jsDocs = fn.getJsDocs();
if (jsDocs.length > 0) {
  const jsDoc = jsDocs[0];
  const description = jsDoc.getDescription();
  const tags = jsDoc.getTags();

  if (description || tags.length > 0) {
    const docContent = [
      description,
      ...tags.map((t) => `@${t.getTagName()} ${t.getCommentText() || ""}`),
    ]
      .filter(Boolean)
      .join("\n");

    const docId = `codedoc-${entityId}`;
    const embedding = await generateEmbedding(docContent);

    createOrMergeEntity(
      db,
      "CodeDoc",
      docId,
      {
        entityId,
        content: docContent,
        description,
        tags: tags.map((t) => ({
          name: t.getTagName(),
          text: t.getCommentText(),
        })),
      },
      embedding,
    );

    // Link to the code entity
    createRelationship(db, docId, entityId, "DOCUMENTS");
  }
}
```

**New entity type**:

```typescript
interface CodeDoc {
  id: string;
  /** The code entity this documents */
  entityId: string;
  /** Full JSDoc content */
  content: string;
  /** Just the description portion */
  description: string;
  /** Parsed tags */
  tags: Array<{ name: string; text: string | null }>;
}
```

**Rationale**: JSDoc is structured documentation that's already co-located with code. Extracting it:

- Enables "what does this function do?" queries
- Links code graph to semantic search
- Zero extra work during parsing (ts-morph already loads the AST)

---

## Updated Implementation Plan

With these decisions, the implementation order becomes:

1. **Phase 1**: Markdown parser with hybrid chunking (~120 LOC)
2. **Phase 2**: Doc store with content-hash incremental indexing (~180 LOC)
3. **Phase 3**: Cross-doc link extraction during indexing (~40 LOC)
4. **Phase 4**: JSDoc extraction in code graph parser (~60 LOC)
5. **Phase 5**: Unified search across DocSection + CodeDoc (~120 LOC)
6. **Phase 6**: Session hook integration (~50 LOC)
7. **Phase 7**: CLI commands (~100 LOC)

**Revised total**: ~670 LOC + tests

---

## Sources

- [Weaviate: Chunking Strategies for RAG](https://weaviate.io/blog/chunking-strategies-for-rag)
- [Firecrawl: Best Chunking Strategies 2025](https://www.firecrawl.dev/blog/best-chunking-strategies-rag-2025)
- [Pinecone: Chunking Strategies](https://www.pinecone.io/learn/chunking-strategies/)
- [LangChain: Indexing How-To](https://js.langchain.com/docs/how_to/indexing/)
- [Zilliz: Incremental vs Batch Indexing](https://zilliz.com/ai-faq/how-does-incremental-indexing-or-periodic-batch-indexing-help-in-handling-continuously-growing-large-datasets-and-what-are-the-limitations-of-these-approaches)
- [ts-morph: JS Docs](https://ts-morph.com/details/documentation)
- [TSDoc Specification](https://tsdoc.org/)
- [KRML: Markdown to Knowledge Graph](https://github.com/edwardanderson/krml)
