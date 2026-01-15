import { describe, test, expect } from "bun:test";
import { convertHtmlToMarkdown } from "./external";

describe("convertHtmlToMarkdown", () => {
  describe("security", () => {
    test("removes script tags", () => {
      const html = '<div><script>alert("xss")</script>Hello</div>';
      const result = convertHtmlToMarkdown(html);
      expect(result).not.toContain("script");
      expect(result).not.toContain("alert");
      expect(result).toContain("Hello");
    });

    test("removes script tags with whitespace in closing tag", () => {
      const html = '<script>alert("xss")</script >';
      const result = convertHtmlToMarkdown(html);
      expect(result).not.toContain("script");
      expect(result).not.toContain("alert");
    });

    test("removes nested script tags", () => {
      const html = "<script><script>inner</script>outer</script>content</div>";
      const result = convertHtmlToMarkdown(html);
      expect(result).not.toContain("script");
      expect(result).toContain("content");
    });

    test("removes encoded script tags", () => {
      const html = "&lt;script&gt;alert('xss')&lt;/script&gt;";
      const result = convertHtmlToMarkdown(html);
      // After decoding and stripping, angle brackets are replaced with []
      expect(result).not.toContain("<script>");
      expect(result).not.toContain("<");
      expect(result).not.toContain(">");
    });

    test("handles double-encoded entities", () => {
      // &amp;lt; should decode to &lt; which should decode to <
      // But our decoder does &amp; last, so this should be safe
      const html = "&amp;lt;script&amp;gt;alert('xss')&amp;lt;/script&amp;gt;";
      const result = convertHtmlToMarkdown(html);
      // Final result should have [] instead of <>
      expect(result).not.toContain("<");
      expect(result).not.toContain(">");
    });

    test("removes style tags", () => {
      const html = "<style>.danger { color: red; }</style>content";
      const result = convertHtmlToMarkdown(html);
      expect(result).not.toContain("style");
      expect(result).not.toContain("danger");
      expect(result).toContain("content");
    });

    test("removes iframe tags", () => {
      const html = '<iframe src="https://evil.com"></iframe>safe content';
      const result = convertHtmlToMarkdown(html);
      expect(result).not.toContain("iframe");
      expect(result).not.toContain("evil.com");
      expect(result).toContain("safe content");
    });

    test("replaces remaining angle brackets with safe alternatives", () => {
      const html = "<unknown-tag>content</unknown-tag>";
      const result = convertHtmlToMarkdown(html);
      // Angle brackets should be replaced with []
      expect(result).not.toContain("<");
      expect(result).not.toContain(">");
    });
  });

  describe("markdown conversion", () => {
    test("converts headings", () => {
      const html = "<h1>Title</h1><h2>Subtitle</h2><h3>Section</h3>";
      const result = convertHtmlToMarkdown(html);
      expect(result).toContain("# Title");
      expect(result).toContain("## Subtitle");
      expect(result).toContain("### Section");
    });

    test("converts code blocks", () => {
      const html = "<pre><code>const x = 1;</code></pre>";
      const result = convertHtmlToMarkdown(html);
      expect(result).toContain("```");
      expect(result).toContain("const x = 1;");
    });

    test("converts inline code", () => {
      const html = "Use <code>console.log()</code> for debugging";
      const result = convertHtmlToMarkdown(html);
      expect(result).toContain("`console.log()`");
    });

    test("converts links", () => {
      const html = '<a href="https://example.com">Click here</a>';
      const result = convertHtmlToMarkdown(html);
      expect(result).toContain("[Click here](https://example.com)");
    });

    test("converts lists", () => {
      const html = "<ul><li>First</li><li>Second</li></ul>";
      const result = convertHtmlToMarkdown(html);
      expect(result).toContain("- First");
      expect(result).toContain("- Second");
    });

    test("converts paragraphs", () => {
      const html = "<p>First paragraph</p><p>Second paragraph</p>";
      const result = convertHtmlToMarkdown(html);
      expect(result).toContain("First paragraph");
      expect(result).toContain("Second paragraph");
    });

    test("removes nav, header, footer elements", () => {
      const html =
        "<nav>Nav content</nav><main>Main content</main><footer>Footer</footer>";
      const result = convertHtmlToMarkdown(html);
      expect(result).not.toContain("Nav content");
      expect(result).not.toContain("Footer");
      expect(result).toContain("Main content");
    });
  });

  describe("entity decoding", () => {
    test("decodes ampersand and quote entities", () => {
      const html = "Tom &amp; Jerry said &quot;hello&quot;";
      const result = convertHtmlToMarkdown(html);
      expect(result).toContain("Tom & Jerry");
      expect(result).toContain('"hello"');
    });

    test("encoded tags become tags and get stripped (security)", () => {
      // When &lt;div&gt; is decoded to <div>, it becomes a tag and gets removed
      // This is correct security behavior - we don't want decoded HTML to survive
      const html = "&lt;div&gt;content&lt;/div&gt;";
      const result = convertHtmlToMarkdown(html);
      // The decoded <div> tags get stripped, leaving just the content
      expect(result).toContain("content");
      expect(result).not.toContain("<");
      expect(result).not.toContain(">");
    });

    test("numeric entities that become tags get stripped (security)", () => {
      // &#60; = < and &#62; = >
      const html = "&#60;span&#62;text&#60;/span&#62;";
      const result = convertHtmlToMarkdown(html);
      expect(result).toContain("text");
      expect(result).not.toContain("<");
      expect(result).not.toContain(">");
    });

    test("handles non-breaking spaces", () => {
      const html = "word&nbsp;word";
      const result = convertHtmlToMarkdown(html);
      expect(result).toContain("word word");
    });
  });
});
