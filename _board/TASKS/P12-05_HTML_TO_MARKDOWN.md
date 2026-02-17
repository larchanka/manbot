# P12-05: Create HTML to Markdown Converter

**File**: `src/utils/html-to-markdown.ts`  
**Dependencies**: P12-01  
**Phase**: 2 - Core Utilities

## Description
Create utility to convert HTML to clean Markdown using Turndown library.

## Acceptance Criteria
- Exports `htmlToMarkdown(html: string, options?: ConversionOptions): string`
- Configures Turndown to preserve links, images, code blocks, tables, headings, lists
- Strips scripts, styles, navigation, footers, and other non-content elements
- Handles malformed HTML gracefully
- Returns empty string for empty/invalid input
- Includes JSDoc documentation

## Implementation Notes
- Use Turndown's `addRule()` to customize element handling
- Use `remove()` to strip unwanted elements (script, style, nav, footer, header)
- Configure `headingStyle: 'atx'` for consistent heading format
- Configure `codeBlockStyle: 'fenced'` for better code block rendering
- Test with real-world HTML to ensure quality output
