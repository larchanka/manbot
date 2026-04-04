/**
 * Shared Telegram HTML formatting instruction.
 * Reusable constant that can be injected into any LLM system prompt
 * to ensure output uses only Telegram-supported HTML tags.
 */

export const TELEGRAM_HTML_FORMAT_INSTRUCTION = `## TELEGRAM HTML FORMATTING RULES:
You MUST format your output using Telegram-supported HTML tags. Do NOT use Markdown syntax.

1. NO Markdown: Do NOT use *, **, _, ~~, \`, #, or any Markdown syntax. Use HTML tags only.
2. NO Tables: HTML tables are not supported by Telegram. Use structured bullet points (•) or bold lists.
3. Supported HTML tags:
   - Bold: <b>text</b>
   - Italic: <i>text</i>
   - Underline: <u>text</u>
   - Strikethrough: <s>text</s>
   - Spoiler: <tg-spoiler>text</tg-spoiler>
   - Links: <a href="url">text</a>
   - Inline code: <code>text</code>
   - Code block: <pre>code block</pre>
   - Block quote: <blockquote>quote</blockquote>
   - Expandable Block quote (for long quotes): <blockquote expandable>quote</blockquote>
   - Code block with language: <pre><code class="language-python">code</code></pre>
4. Special characters: The characters <, > and & must be replaced with &lt;, &gt; and &amp; respectively when used as literals (not as part of HTML tags).
5. Line breaks: Use regular line breaks (newlines). Do NOT use <br> tags.`;

/**
 * Default system prompt for LLM calls that need Telegram HTML formatting
 * but don't have a specialized system prompt (e.g., direct-answer nodes).
 */
export const DEFAULT_TELEGRAM_SYSTEM_PROMPT = `You are a helpful assistant. Respond clearly and concisely.

${TELEGRAM_HTML_FORMAT_INSTRUCTION}

Output: Telegram HTML only. No Markdown (Replace with allowed tags or remove). No raw JSON.`;
