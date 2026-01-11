# Archived: Graph Prototype Scripts

These files were the prototype implementation for issue #431 (ts-morph static analysis proof of concept).

**Status:** Superseded by `src/graph/` module

## Migration

The functionality has been productionized in issue #394:

| Prototype File     | Production Location        |
| ------------------ | -------------------------- |
| `parse-package.ts` | `src/graph/parser.ts`      |
| `store-graph.ts`   | `src/graph/store.ts`       |
| `test-parser.ts`   | `src/graph/parser.test.ts` |
| `benchmark.ts`     | (benchmarks not migrated)  |

## Usage

Use the production module instead:

```typescript
import { graph } from "claude-knowledge";

// Parse a package
const result = graph.parsePackage("./src", "my-package");

// Store in database
graph.storeGraph(result, "my-package");

// Query the graph
const callers = graph.whatCalls("myFunction");
```

Or use the CLI:

```bash
bun run cli graph parse ./packages/my-package
bun run cli graph what-calls myFunction
bun run cli graph blast-radius src/index.ts
```

## Why Archived

These scripts served their purpose as a proof of concept but:

- Lacked proper error handling
- Used inline SQL instead of abstracted queries
- Had no test coverage
- Were not integrated with the CLI

The production module addresses all these issues.
