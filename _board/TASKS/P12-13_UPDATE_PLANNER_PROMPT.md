# P12-13: Update Planner Prompt

**File**: `src/agents/prompts/planner.ts`  
**Dependencies**: P12-11  
**Phase**: 5 - Planner Integration

## Description
Update planner prompt to document enhanced `http_get` capabilities and parameters.

## Acceptance Criteria
- Updates `http_get` tool documentation to include `useBrowser` and `convertToMarkdown` parameters
- Adds example showing when to use `useBrowser: true` (e.g., for SPAs, sites with bot detection)
- Adds example showing Markdown conversion for web scraping
- Documents that HTML responses are automatically converted to Markdown
- Explains that `fetch` is tried first for performance, with automatic fallback to browser

## Implementation Notes
- Add to the "Available tools" section in planner prompt
- Include parameter descriptions and types
- Provide clear examples of when to use browser mode
- Mention that browser mode is slower but more reliable for SPAs
- Update any existing examples that use `http_get`
