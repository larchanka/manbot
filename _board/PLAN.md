# Enhanced HTTP Get Tool with Playwright Implementation Plan

## Overview

Enhance the existing `http_get` tool to support Single Page Applications (SPAs) by integrating Playwright with Chromium. The current implementation uses `fetch`, which cannot execute JavaScript or handle dynamic content. The enhanced version will:

1. Use Playwright to render JavaScript-heavy websites
2. Convert HTML responses to Markdown for better LLM consumption
3. Bypass bot detection mechanisms using realistic browser fingerprints and behaviors
4. Maintain backward compatibility with the existing `fetch`-based approach for simple requests

## User Review Required

> [!IMPORTANT]
> **Fallback Strategy**
> 
> The plan includes using `fetch` as the primary method and falling back to Playwright only when needed (e.g., on 403 errors, detected SPAs, or explicit user request). This minimizes resource usage and latency.
> 
> **Alternative**: Always use Playwright for all requests. This would be slower but more consistent. Please confirm which approach you prefer.

> [!IMPORTANT]
> **HTML to Markdown Conversion Library**
> 
> The plan proposes using `turndown` (popular, well-maintained) for HTML-to-Markdown conversion. 
> 
> **Alternatives**: 
> - `html-to-md` (lighter but less feature-rich)
> - `node-html-markdown` (newer, good TypeScript support)
> 
> Please confirm if `turndown` is acceptable or if you prefer a different library.

> [!IMPORTANT]
> **Bot Detection Bypass Techniques**
> 
> The plan includes:
> - Realistic user agents
> - Randomized viewport sizes
> - Stealth plugin for Playwright
> - Realistic mouse movements and delays
> 
> These techniques may not work for all sites with advanced bot detection (e.g., Cloudflare Turnstile, reCAPTCHA). Please confirm if this level of bypass is sufficient or if you need more advanced techniques.

## Proposed Changes

### Component 1: Dependencies

Add required npm packages for Playwright and HTML-to-Markdown conversion.

#### [MODIFY] [package.json](file:///Users/mikhaillarchanka/Projects/AI-Agent/package.json)

- Add `playwright` to dependencies for browser automation
- Add `playwright-extra` and `puppeteer-extra-plugin-stealth` for bot detection bypass
- Add `turndown` for HTML-to-Markdown conversion
- Add corresponding TypeScript type definitions to devDependencies

---

### Component 2: HTML to Markdown Converter

Create a utility service to convert HTML content to clean, readable Markdown.

#### [NEW] [html-to-markdown.ts](file:///Users/mikhaillarchanka/Projects/AI-Agent/src/utils/html-to-markdown.ts)

- Implement `htmlToMarkdown(html: string, options?: ConversionOptions): string` function
- Configure Turndown to preserve important elements (links, images, code blocks, tables)
- Strip unnecessary elements (scripts, styles, navigation, footers)
- Handle edge cases (malformed HTML, empty content)
- Export configuration options for customization

---

### Component 3: Playwright Browser Service

Create a service to manage Playwright browser instances and page interactions.

#### [NEW] [browser-service.ts](file:///Users/mikhaillarchanka/Projects/AI-Agent/src/services/browser-service.ts)

- Implement singleton pattern for browser instance management (reuse browser across requests)
- Configure Chromium with stealth plugin to bypass bot detection
- Implement realistic user agent rotation
- Implement randomized viewport sizes
- Add methods:
  - `fetchWithBrowser(url: string, options?: BrowserFetchOptions): Promise<{ status: number, html: string, finalUrl: string }>`
  - `close(): Promise<void>` for cleanup
- Handle timeouts and errors gracefully
- Add realistic delays and mouse movements to mimic human behavior

---

### Component 4: Enhanced HTTP Get Tool

Update the existing `http_get` tool to intelligently choose between `fetch` and Playwright.

#### [MODIFY] [tool-host.ts](file:///Users/mikhaillarchanka/Projects/AI-Agent/src/services/tool-host.ts)

- Update `httpGetTool` to accept new optional parameters:
  - `useBrowser?: boolean` - Force Playwright usage
  - `convertToMarkdown?: boolean` - Convert HTML to Markdown (default: true for HTML responses)
- Implement smart fallback logic:
  1. Try `fetch` first (fast path)
  2. If 403/401 or user specified `useBrowser`, use Playwright
  3. Detect HTML content type and convert to Markdown if requested
- Return enhanced response:
  ```typescript
  {
    status: number,
    body: string, // HTML or Markdown
    contentType: string,
    finalUrl: string, // After redirects
    method: 'fetch' | 'browser' // Which method was used
  }
  ```
- Handle errors from both methods and provide clear error messages

---

### Component 5: Bot Detection Bypass Configuration

Create configuration for user agents, viewport sizes, and stealth settings.

#### [NEW] [browser-config.ts](file:///Users/mikhaillarchanka/Projects/AI-Agent/src/services/browser-config.ts)

- Export array of realistic user agents (Chrome, Firefox, Safari on various OS)
- Export array of common viewport sizes (desktop and mobile)
- Export stealth plugin configuration
- Export function to randomly select user agent and viewport
- Document bot detection bypass techniques used

---

### Component 6: Planner Prompt Update

Update the planner prompt to document the enhanced `http_get` capabilities.

#### [MODIFY] [planner.ts](file:///Users/mikhaillarchanka/Projects/AI-Agent/src/agents/prompts/planner.ts)

- Update `http_get` tool documentation to include new parameters
- Add examples showing when to use `useBrowser: true`
- Add examples showing Markdown conversion for web scraping tasks
- Document that HTML responses are automatically converted to Markdown

---

### Component 7: Configuration

Add browser service configuration to the main config.

#### [MODIFY] [config.json](file:///Users/mikhaillarchanka/Projects/AI-Agent/config.json)

- Add `browserService` section with:
  - `headless: true` - Run browser in headless mode
  - `timeout: 30000` - Page load timeout in ms
  - `enableStealth: true` - Enable bot detection bypass
  - `reuseContext: true` - Reuse browser context for performance

#### [MODIFY] [config.ts](file:///Users/mikhaillarchanka/Projects/AI-Agent/src/shared/config.ts)

- Add TypeScript types for `browserService` configuration
- Add validation for browser service config

---

## Verification Plan

### Automated Tests

1. **Unit test for HTML to Markdown converter**
   ```bash
   npm test src/utils/__tests__/html-to-markdown.test.ts
   ```
   - Test conversion of various HTML elements (headings, lists, tables, code blocks)
   - Test stripping of unwanted elements (scripts, styles)
   - Test handling of malformed HTML

2. **Integration test for browser service**
   ```bash
   npm test src/services/__tests__/browser-service.test.ts
   ```
   - Test fetching a simple static page
   - Test fetching a JavaScript-heavy SPA (e.g., React app)
   - Test timeout handling
   - Test browser instance reuse
   - Test cleanup on shutdown

3. **Integration test for enhanced http_get tool**
   ```bash
   npm test src/services/__tests__/tool-host.test.ts
   ```
   - Test `fetch` fallback to Playwright on 403
   - Test explicit `useBrowser: true` parameter
   - Test HTML to Markdown conversion
   - Test response format with both methods

### Manual Verification

1. **Test with SPA website**
   - Start the orchestrator: `npm run dev:orchestrator`
   - Send message via Telegram: "Fetch https://react-example-app.com and summarize the content"
   - Verify that the tool uses Playwright (check logs)
   - Verify that content is properly extracted and converted to Markdown

2. **Test bot detection bypass**
   - Test with a site known to block bots (e.g., some news sites)
   - Send message: "Fetch https://site-with-bot-detection.com with browser"
   - Verify that the request succeeds (status 200)
   - Verify that content is properly extracted

3. **Test fallback mechanism**
   - Test with a simple static site (should use `fetch`)
   - Test with a site that returns 403 (should fallback to Playwright)
   - Check logs to confirm which method was used
   - Verify response times (fetch should be faster)

4. **Test Markdown conversion**
   - Fetch a Wikipedia article
   - Verify that the Markdown output is clean and readable
   - Verify that links, headings, and lists are properly formatted
   - Verify that navigation, scripts, and styles are stripped

5. **Test error handling**
   - Test with invalid URL
   - Test with timeout (very slow site)
   - Test with network error
   - Verify that error messages are clear and helpful
