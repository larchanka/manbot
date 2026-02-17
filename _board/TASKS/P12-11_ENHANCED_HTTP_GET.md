# P12-11: Update HTTP Get Tool with Smart Fallback

**File**: `src/services/tool-host.ts`  
**Dependencies**: P12-05, P12-09  
**Phase**: 4 - Enhanced HTTP Get Tool

## Description
Enhance `httpGetTool` to support Playwright with smart fallback logic from fetch to browser.

## Acceptance Criteria
- Accepts new optional parameters: `useBrowser?: boolean`, `convertToMarkdown?: boolean`
- Implements fallback logic: try `fetch` first, use Playwright on 403/401 or if `useBrowser` is true
- Detects HTML content type from response headers
- Converts HTML to Markdown when `convertToMarkdown` is true (default for HTML)
- Returns enhanced response with `status`, `body`, `contentType`, `finalUrl`, `method` fields
- Handles errors from both `fetch` and Playwright
- Logs which method was used (fetch vs browser)

## Implementation Notes
- Check response status code: if 403 or 401, retry with browser
- Check Content-Type header: if contains "text/html", convert to Markdown
- Default `convertToMarkdown` to true for HTML responses
- Add error handling for browser service failures
- Log performance metrics (response time) for monitoring
- Ensure backward compatibility with existing `http_get` usage
