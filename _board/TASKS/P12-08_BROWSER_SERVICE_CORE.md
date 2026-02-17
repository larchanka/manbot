# P12-08: Create Browser Service Core

**File**: `src/services/browser-service.ts`  
**Dependencies**: P12-01, P12-04, P12-07  
**Phase**: 3 - Browser Service

## Description
Create service to manage Playwright browser instances with singleton pattern.

## Acceptance Criteria
- Implements singleton pattern for browser instance
- Exports `BrowserService` class extending `BaseProcess`
- Implements `fetchWithBrowser(url: string, options?: BrowserFetchOptions): Promise<BrowserFetchResult>`
- Implements `close(): Promise<void>` for cleanup
- Configures Chromium with stealth plugin
- Uses random user agent and viewport for each request
- Handles browser launch errors gracefully
- Includes timeout handling (from config)
- Reuses browser context when `reuseContext` is enabled

## Implementation Notes
- Use `playwright-extra` with stealth plugin
- Launch browser only once and reuse across requests
- Create new context for each request (or reuse if configured)
- Handle browser crashes and auto-restart
- Wait for `networkidle` or `load` event before extracting content
- Return HTML content, status code, and final URL (after redirects)
