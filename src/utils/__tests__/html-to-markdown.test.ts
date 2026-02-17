/**
 * Tests for HTML to Markdown converter utility.
 */

import { describe, expect, it } from "vitest";
import { htmlToMarkdown } from "../html-to-markdown.js";

describe("htmlToMarkdown", () => {
  describe("basic conversions", () => {
    it("converts headings (h1-h6)", () => {
      const html = "<h1>Heading 1</h1><h2>Heading 2</h2><h3>Heading 3</h3>";
      const result = htmlToMarkdown(html);
      expect(result).toContain("# Heading 1");
      expect(result).toContain("## Heading 2");
      expect(result).toContain("### Heading 3");
    });

    it("converts paragraphs", () => {
      const html = "<p>First paragraph</p><p>Second paragraph</p>";
      const result = htmlToMarkdown(html);
      expect(result).toContain("First paragraph");
      expect(result).toContain("Second paragraph");
    });

    it("converts unordered lists", () => {
      const html = "<ul><li>Item 1</li><li>Item 2</li></ul>";
      const result = htmlToMarkdown(html);
      expect(result).toMatch(/-.*Item 1/);
      expect(result).toMatch(/-.*Item 2/);
    });

    it("converts ordered lists", () => {
      const html = "<ol><li>First</li><li>Second</li></ol>";
      const result = htmlToMarkdown(html);
      expect(result).toMatch(/1\..*First/);
      expect(result).toMatch(/2\..*Second/);
    });

    it("converts links", () => {
      const html = '<a href="https://example.com">Example</a>';
      const result = htmlToMarkdown(html);
      expect(result).toContain("[Example](https://example.com)");
    });

    it("converts images", () => {
      const html = '<img src="image.png" alt="Test Image">';
      const result = htmlToMarkdown(html);
      expect(result).toContain("![Test Image](image.png)");
    });

    it("converts images without alt text", () => {
      const html = '<img src="image.png">';
      const result = htmlToMarkdown(html);
      expect(result).toContain("![](image.png)");
    });

    it("converts bold text", () => {
      const html = "<p><strong>Bold text</strong></p>";
      const result = htmlToMarkdown(html);
      expect(result).toContain("**Bold text**");
    });

    it("converts italic text", () => {
      const html = "<p><em>Italic text</em></p>";
      const result = htmlToMarkdown(html);
      expect(result).toContain("*Italic text*");
    });

    it("converts inline code", () => {
      const html = "<p>Use <code>console.log()</code> to debug</p>";
      const result = htmlToMarkdown(html);
      expect(result).toContain("`console.log()`");
    });

    it("converts code blocks", () => {
      const html = "<pre><code>const x = 1;</code></pre>";
      const result = htmlToMarkdown(html);
      expect(result).toMatch(/```[\s\S]*const x = 1;[\s\S]*```/);
    });

    it("converts code blocks with language", () => {
      const html = '<pre><code class="language-javascript">const x = 1;</code></pre>';
      const result = htmlToMarkdown(html);
      expect(result).toMatch(/```javascript[\s\S]*const x = 1;[\s\S]*```/);
    });

    it("converts tables", () => {
      const html = `
        <table>
          <thead>
            <tr><th>Header 1</th><th>Header 2</th></tr>
          </thead>
          <tbody>
            <tr><td>Cell 1</td><td>Cell 2</td></tr>
          </tbody>
        </table>
      `;
      const result = htmlToMarkdown(html);
      expect(result).toContain("Header 1");
      expect(result).toContain("Header 2");
      expect(result).toContain("Cell 1");
      expect(result).toContain("Cell 2");
    });
  });

  describe("element stripping", () => {
    it("strips script tags", () => {
      const html = "<p>Content</p><script>alert('test');</script><p>More content</p>";
      const result = htmlToMarkdown(html);
      expect(result).not.toContain("alert");
      expect(result).toContain("Content");
      expect(result).toContain("More content");
    });

    it("strips style tags", () => {
      const html = "<p>Content</p><style>.class { color: red; }</style><p>More content</p>";
      const result = htmlToMarkdown(html);
      expect(result).not.toContain("color: red");
      expect(result).toContain("Content");
      expect(result).toContain("More content");
    });

    it("strips nav elements", () => {
      const html = "<nav><a href='/'>Home</a></nav><p>Main content</p>";
      const result = htmlToMarkdown(html);
      expect(result).not.toContain("Home");
      expect(result).toContain("Main content");
    });

    it("strips footer elements", () => {
      const html = "<p>Content</p><footer>Footer text</footer>";
      const result = htmlToMarkdown(html);
      expect(result).not.toContain("Footer text");
      expect(result).toContain("Content");
    });

    it("strips header elements", () => {
      const html = "<header>Header text</header><p>Content</p>";
      const result = htmlToMarkdown(html);
      expect(result).not.toContain("Header text");
      expect(result).toContain("Content");
    });
  });

  describe("edge cases", () => {
    it("handles empty input", () => {
      expect(htmlToMarkdown("")).toBe("");
      expect(htmlToMarkdown("   ")).toBe("");
    });

    it("handles null/undefined-like input", () => {
      expect(htmlToMarkdown("")).toBe("");
    });

    it("handles malformed HTML gracefully", () => {
      const html = "<p>Unclosed paragraph<div>Nested</p>";
      const result = htmlToMarkdown(html);
      // Should not throw and should return some content
      expect(typeof result).toBe("string");
    });

    it("handles nested lists", () => {
      const html = `
        <ul>
          <li>Item 1
            <ul>
              <li>Nested 1</li>
              <li>Nested 2</li>
            </ul>
          </li>
          <li>Item 2</li>
        </ul>
      `;
      const result = htmlToMarkdown(html);
      expect(result).toContain("Item 1");
      expect(result).toContain("Nested 1");
      expect(result).toContain("Nested 2");
      expect(result).toContain("Item 2");
    });

    it("handles special characters", () => {
      const html = "<p>Special: &lt; &gt; &amp; &quot; &apos;</p>";
      const result = htmlToMarkdown(html);
      expect(result).toContain("<");
      expect(result).toContain(">");
      expect(result).toContain("&");
    });

    it("handles links with no text", () => {
      const html = '<a href="https://example.com"></a>';
      const result = htmlToMarkdown(html);
      // Should handle gracefully without crashing
      expect(typeof result).toBe("string");
    });

    it("handles images with no src", () => {
      const html = '<img alt="No source">';
      const result = htmlToMarkdown(html);
      // Should return empty string for image without src
      expect(result).not.toContain("![");
    });
  });

  describe("options", () => {
    it("handles plainText option", () => {
      const html = "<h1>Title</h1><p>Content with <strong>bold</strong></p>";
      const result = htmlToMarkdown(html, { plainText: true });
      expect(result).toContain("Title");
      expect(result).toContain("Content with");
      expect(result).toContain("bold");
      // Should strip HTML tags
      expect(result).not.toMatch(/<[^>]+>/);
    });

    it("preserves code blocks by default", () => {
      const html = "<pre><code>const x = 1;</code></pre>";
      const result = htmlToMarkdown(html);
      expect(result).toMatch(/```/);
    });

    it("respects preserveCodeBlocks option", () => {
      const html = "<pre><code>const x = 1;</code></pre>";
      const result = htmlToMarkdown(html, { preserveCodeBlocks: false });
      // Should still convert but might format differently
      expect(typeof result).toBe("string");
    });
  });

  describe("whitespace normalization", () => {
    it("normalizes multiple newlines", () => {
      const html = "<p>First</p><p>Second</p><p>Third</p>";
      const result = htmlToMarkdown(html);
      // Should not have excessive newlines
      expect(result).not.toMatch(/\n{4,}/);
    });

    it("trims trailing whitespace", () => {
      const html = "<p>Content   </p>";
      const result = htmlToMarkdown(html);
      expect(result.trim()).toBe(result);
    });
  });
});
