/**
 * Tests for markdown parser with hierarchical section extraction and hybrid chunking.
 */

import { describe, test, expect } from "bun:test";
import {
  parseMarkdown,
  slugify,
  estimateTokens,
  MAX_SECTION_TOKENS,
} from "./parser";

describe("slugify", () => {
  test("converts text to lowercase slug", () => {
    expect(slugify("Hello World")).toBe("hello-world");
  });

  test("removes special characters", () => {
    expect(slugify("API: Usage & Examples!")).toBe("api-usage-examples");
  });

  test("collapses multiple hyphens", () => {
    expect(slugify("Foo---Bar")).toBe("foo-bar");
  });

  test("handles empty string", () => {
    expect(slugify("")).toBe("");
  });
});

describe("estimateTokens", () => {
  test("estimates ~4 chars per token", () => {
    const text = "a".repeat(400); // 400 chars = ~100 tokens
    expect(estimateTokens(text)).toBe(100);
  });

  test("handles empty string", () => {
    expect(estimateTokens("")).toBe(0);
  });
});

describe("parseMarkdown", () => {
  test("parses single section", () => {
    const md = `# Heading\n\nParagraph content.`;
    const sections = parseMarkdown(md);

    expect(sections).toHaveLength(1);
    expect(sections[0].heading).toBe("Heading");
    expect(sections[0].content).toBe("Paragraph content.");
    expect(sections[0].level).toBe(1);
    expect(sections[0].anchor).toBe("heading");
    expect(sections[0].parentAnchor).toBeUndefined();
  });

  test("preserves hierarchy with parent-child relationships", () => {
    const md = `# Parent\n\nParent content.\n\n## Child\n\nChild content.`;
    const sections = parseMarkdown(md);

    expect(sections).toHaveLength(2);
    expect(sections[0].heading).toBe("Parent");
    expect(sections[0].level).toBe(1);
    expect(sections[0].parentAnchor).toBeUndefined();

    expect(sections[1].heading).toBe("Child");
    expect(sections[1].level).toBe(2);
    expect(sections[1].parentAnchor).toBe("parent");
  });

  test("handles multiple levels of nesting", () => {
    const md = `# L1\n\nContent.\n\n## L2\n\nContent.\n\n### L3\n\nContent.`;
    const sections = parseMarkdown(md);

    expect(sections).toHaveLength(3);
    expect(sections[0].level).toBe(1);
    expect(sections[0].parentAnchor).toBeUndefined();
    expect(sections[1].level).toBe(2);
    expect(sections[1].parentAnchor).toBe("l1");
    expect(sections[2].level).toBe(3);
    expect(sections[2].parentAnchor).toBe("l2");
  });

  test("handles sibling sections at same level", () => {
    const md = `## Section 1\n\nContent 1.\n\n## Section 2\n\nContent 2.`;
    const sections = parseMarkdown(md);

    expect(sections).toHaveLength(2);
    expect(sections[0].heading).toBe("Section 1");
    expect(sections[1].heading).toBe("Section 2");
    expect(sections[0].parentAnchor).toBeUndefined();
    expect(sections[1].parentAnchor).toBeUndefined();
  });

  test("handles code blocks", () => {
    const md = `# Code Example\n\n\`\`\`ts\nconst x = 1;\n\`\`\``;
    const sections = parseMarkdown(md);

    expect(sections).toHaveLength(1);
    expect(sections[0].content).toContain("```ts");
    expect(sections[0].content).toContain("const x = 1;");
  });

  test("handles lists", () => {
    const md = `# List\n\n- Item 1\n- Item 2`;
    const sections = parseMarkdown(md);

    expect(sections).toHaveLength(1);
    expect(sections[0].content).toContain("- Item 1");
    expect(sections[0].content).toContain("- Item 2");
  });

  test("chunks oversized section", () => {
    // Create a section that exceeds MAX_SECTION_TOKENS
    const longContent = "x".repeat(MAX_SECTION_TOKENS * 4 + 100); // ~512 tokens * 4 chars + extra
    const md = `# Large Section\n\n${longContent}`;
    const sections = parseMarkdown(md);

    // Should be chunked into multiple sections
    expect(sections.length).toBeGreaterThan(1);

    // All chunks should have same heading
    sections.forEach((section) => {
      expect(section.heading).toBe("Large Section");
      expect(section.isChunk).toBe(true);
      expect(section.chunkIndex).toBeDefined();
    });

    // Each chunk should be within token limit
    sections.forEach((section) => {
      expect(estimateTokens(section.content)).toBeLessThanOrEqual(
        MAX_SECTION_TOKENS + 10, // Small buffer for overhead
      );
    });
  });

  test("does not chunk normal-sized section", () => {
    const md = `# Normal Section\n\nShort content.`;
    const sections = parseMarkdown(md);

    expect(sections).toHaveLength(1);
    expect(sections[0].isChunk).toBeUndefined();
    expect(sections[0].chunkIndex).toBeUndefined();
  });

  test("handles empty markdown", () => {
    const sections = parseMarkdown("");
    expect(sections).toHaveLength(0);
  });

  test("handles markdown with no headings", () => {
    const md = "Just plain text.";
    const sections = parseMarkdown(md);
    expect(sections).toHaveLength(0);
  });

  test("generates unique anchors for duplicate headings", () => {
    const md = `## Examples\n\nFirst examples.\n\n## Examples\n\nSecond examples.\n\n## Examples\n\nThird examples.`;
    const sections = parseMarkdown(md);

    expect(sections).toHaveLength(3);
    expect(sections[0].anchor).toBe("examples");
    expect(sections[1].anchor).toBe("examples-1");
    expect(sections[2].anchor).toBe("examples-2");
  });

  test("handles tables", () => {
    const md = `# Table Section\n\n| Column A | Column B |\n|---|---|\n| Cell 1 | Cell 2 |\n| Cell 3 | Cell 4 |`;
    const sections = parseMarkdown(md);

    expect(sections).toHaveLength(1);
    expect(sections[0].content).toContain("Column A");
    expect(sections[0].content).toContain("Column B");
    expect(sections[0].content).toContain("Cell 1");
    expect(sections[0].content).toContain("|");
  });

  test("preserves ordered list numbering", () => {
    const md = `# Steps\n\n1. First step\n2. Second step\n3. Third step`;
    const sections = parseMarkdown(md);

    expect(sections).toHaveLength(1);
    expect(sections[0].content).toContain("1.");
    expect(sections[0].content).toContain("2.");
    expect(sections[0].content).toContain("3.");
  });

  test("correctly handles hierarchy when going back up and down levels", () => {
    const md = `# Main\n\nMain content.\n\n## Section A\n\nA content.\n\n### Subsection\n\nSub content.\n\n## Section B\n\nB content.\n\n### Another\n\nAnother content.`;
    const sections = parseMarkdown(md);

    expect(sections).toHaveLength(5);
    expect(sections[0].heading).toBe("Main");
    expect(sections[0].parentAnchor).toBeUndefined();

    expect(sections[1].heading).toBe("Section A");
    expect(sections[1].parentAnchor).toBe("main");

    expect(sections[2].heading).toBe("Subsection");
    expect(sections[2].parentAnchor).toBe("section-a");

    // Section B should have "main" as parent, not "subsection"
    expect(sections[3].heading).toBe("Section B");
    expect(sections[3].parentAnchor).toBe("main");

    // Another should have "section-b" as parent
    expect(sections[4].heading).toBe("Another");
    expect(sections[4].parentAnchor).toBe("section-b");
  });

  test("throws on non-string input", () => {
    // @ts-expect-error Testing runtime validation
    expect(() => parseMarkdown(null)).toThrow(TypeError);
    // @ts-expect-error Testing runtime validation
    expect(() => parseMarkdown(undefined)).toThrow(TypeError);
    // @ts-expect-error Testing runtime validation
    expect(() => parseMarkdown(123)).toThrow(TypeError);
  });
});
