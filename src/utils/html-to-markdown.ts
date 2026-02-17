/**
 * HTML to Markdown converter utility using Turndown.
 * Converts HTML content to clean, readable Markdown while preserving
 * important elements (links, images, code blocks, tables, headings, lists)
 * and stripping non-content elements (scripts, styles, navigation, footers).
 */

import TurndownService = require("turndown");

export interface ConversionOptions {
  /** Preserve code blocks with syntax highlighting (default: true) */
  preserveCodeBlocks?: boolean;
  /** Strip all HTML tags and return plain text (default: false) */
  plainText?: boolean;
}

/**
 * Converts HTML string to Markdown format.
 *
 * @param html - HTML content to convert
 * @param options - Optional conversion settings
 * @returns Markdown string, or empty string if input is invalid/empty
 *
 * @example
 * ```typescript
 * const markdown = htmlToMarkdown('<h1>Hello</h1><p>World</p>');
 * // Returns: "# Hello\n\nWorld"
 * ```
 */
export function htmlToMarkdown(html: string, options?: ConversionOptions): string {
  // Handle empty or invalid input
  if (!html || typeof html !== "string" || html.trim().length === 0) {
    return "";
  }

  // If plain text mode, strip all HTML tags
  if (options?.plainText) {
    const turndown = new TurndownService({
      headingStyle: "atx",
      codeBlockStyle: "fenced",
    });
    turndown.remove(["script", "style", "nav", "footer", "header", "aside", "noscript"]);
    return turndown.turndown(html).replace(/<[^>]*>/g, "").trim();
  }

  // Configure Turndown with sensible defaults
  const turndown = new TurndownService({
    headingStyle: "atx", // Use # for headings
    codeBlockStyle: "fenced", // Use ``` for code blocks
    bulletListMarker: "-", // Use - for unordered lists
    emDelimiter: "*", // Use * for emphasis
    strongDelimiter: "**", // Use ** for bold
  });

  // Remove unwanted elements that don't contribute to content
  turndown.remove([
    "script",
    "style",
    "nav",
    "footer",
    "header",
    "aside",
    "noscript",
    "iframe",
    "form",
    "button",
    "input",
    "select",
    "textarea",
  ]);

  // Add custom rules for better conversion
  // Preserve links with descriptive text
  turndown.addRule("preserveLinks", {
    filter: "a",
    replacement: (content, node) => {
      const href = (node as HTMLElement).getAttribute("href");
      const text = content.trim();
      if (href && text) {
        return `[${text}](${href})`;
      }
      return text || "";
    },
  });

  // Preserve images with alt text
  turndown.addRule("preserveImages", {
    filter: "img",
    replacement: (node) => {
      const img = node as unknown as HTMLElement;
      const alt = img.getAttribute("alt") || "";
      const src = img.getAttribute("src") || "";
      if (src) {
        return `![${alt}](${src})`;
      }
      return "";
    },
  });

  // Preserve code blocks with language if available
  if (options?.preserveCodeBlocks !== false) {
    turndown.addRule("preserveCodeBlocks", {
      filter: (node) => {
        return (
          node.nodeName === "PRE" &&
          node.firstChild?.nodeName === "CODE"
        );
      },
      replacement: (content, node) => {
        const code = node.querySelector("code");
        const className = code?.getAttribute("class") || "";
        const languageMatch = className.match(/language-(\w+)/);
        const language = languageMatch ? languageMatch[1] : "";
        const codeContent = code?.textContent || content;
        return `\n\`\`\`${language}\n${codeContent}\n\`\`\`\n`;
      },
    });
  }

  // Preserve inline code
  turndown.addRule("preserveInlineCode", {
    filter: "code",
    replacement: (content, node) => {
      // Don't process if inside a pre block (handled by preserveCodeBlocks)
      const parent = (node as unknown as HTMLElement).parentElement;
      if (parent?.nodeName === "PRE") {
        return content;
      }
      return `\`${content.trim()}\``;
    },
  });

  try {
    const markdown = turndown.turndown(html);
    // Clean up extra whitespace and normalize line breaks
    return markdown
      .replace(/\n{3,}/g, "\n\n") // Replace 3+ newlines with 2
      .replace(/[ \t]+$/gm, "") // Remove trailing spaces
      .trim();
  } catch (error) {
    // If conversion fails, return empty string
    console.warn("HTML to Markdown conversion failed:", error);
    return "";
  }
}
