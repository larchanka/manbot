# Enhanced HTTP Get Tool Tasks

## Phase 1: Dependencies and Configuration

### Task 1.1: Add Required Dependencies
**File**: `package.json`
**Dependencies**: None
**Description**: Add Playwright, stealth plugin, and HTML-to-Markdown conversion libraries.
**Acceptance Criteria**:
- Add `playwright` to dependencies
- Add `playwright-extra` to dependencies
- Add `puppeteer-extra-plugin-stealth` to dependencies
- Add `turndown` to dependencies
- Add `@types/turndown` to devDependencies
- Run `npm install` successfully
- All dependencies are compatible with Node.js 20+

### Task 1.2: Install Playwright Browsers
**Dependencies**: Task 1.1
**Description**: Install Chromium browser for Playwright.
**Acceptance Criteria**:
- Run `npx playwright install chromium`
- Verify Chromium is installed successfully
- Document browser installation in README or setup docs

### Task 1.3: Add Browser Service Configuration
**File**: `config.json`
**Dependencies**: None
**Description**: Add configuration section for browser service.
**Acceptance Criteria**:
- Add `browserService` object with `headless`, `timeout`, `enableStealth`, `reuseContext` properties
- Set sensible defaults (headless: true, timeout: 30000, enableStealth: true, reuseContext: true)
- Configuration is valid JSON

### Task 1.4: Update Config TypeScript Types
**File**: `src/shared/config.ts`
**Dependencies**: Task 1.3
**Description**: Add TypeScript types and validation for browser service configuration.
**Acceptance Criteria**:
- Add `BrowserServiceConfig` interface with typed properties
- Add `browserService` to main config type
- Add validation for browser service config in `getConfig()`
- TypeScript compilation succeeds with no errors

---

## Phase 2: Core Utilities

### Task 2.1: Create HTML to Markdown Converter
**File**: `src/utils/html-to-markdown.ts`
**Dependencies**: Task 1.1
**Description**: Create utility to convert HTML to clean Markdown using Turndown.
**Acceptance Criteria**:
- Exports `htmlToMarkdown(html: string, options?: ConversionOptions): string`
- Configures Turndown to preserve links, images, code blocks, tables, headings, lists
- Strips scripts, styles, navigation, footers, and other non-content elements
- Handles malformed HTML gracefully
- Returns empty string for empty/invalid input
- Includes JSDoc documentation

### Task 2.2: Add HTML to Markdown Tests
**File**: `src/utils/__tests__/html-to-markdown.test.ts`
**Dependencies**: Task 2.1
**Description**: Create unit tests for HTML to Markdown converter.
**Acceptance Criteria**:
- Tests conversion of headings (h1-h6)
- Tests conversion of lists (ul, ol)
- Tests conversion of links and images
- Tests conversion of code blocks and inline code
- Tests conversion of tables
- Tests stripping of scripts and styles
- Tests handling of malformed HTML
- Tests handling of empty input
- All tests pass with `npm test`

### Task 2.3: Create Browser Configuration
**File**: `src/services/browser-config.ts`
**Dependencies**: None
**Description**: Create configuration for user agents, viewports, and stealth settings.
**Acceptance Criteria**:
- Exports array of 10+ realistic user agents (Chrome, Firefox, Safari on Windows, macOS, Linux)
- Exports array of common viewport sizes (1920x1080, 1366x768, 1536x864, etc.)
- Exports function `getRandomUserAgent(): string`
- Exports function `getRandomViewport(): { width: number, height: number }`
- Exports stealth plugin configuration object
- Includes JSDoc documentation explaining bot detection bypass techniques

---

## Phase 3: Browser Service

### Task 3.1: Create Browser Service Core
**File**: `src/services/browser-service.ts`
**Dependencies**: Task 1.1, Task 1.4, Task 2.3
**Description**: Create service to manage Playwright browser instances.
**Acceptance Criteria**:
- Implements singleton pattern for browser instance
- Exports `BrowserService` class extending `BaseProcess`
- Implements `fetchWithBrowser(url: string, options?: BrowserFetchOptions): Promise<BrowserFetchResult>`
- Implements `close(): Promise<void>` for cleanup
- Configures Chromium with stealth plugin
- Uses random user agent and viewport for each request
- Handles browser launch errors gracefully
- Includes timeout handling (from config)
- Reuses browser context when `reuseContext` is enabled

### Task 3.2: Add Realistic Behavior to Browser Service
**File**: `src/services/browser-service.ts`
**Dependencies**: Task 3.1
**Description**: Add human-like behaviors to bypass bot detection.
**Acceptance Criteria**:
- Adds random delay (100-500ms) before page interaction
- Implements realistic mouse movement to random coordinates
- Waits for network idle before extracting content
- Adds random scroll behavior for long pages
- Configures browser to disable automation flags
- Sets realistic browser headers (Accept-Language, Accept-Encoding, etc.)

### Task 3.3: Add Browser Service Tests
**File**: `src/services/__tests__/browser-service.test.ts`
**Dependencies**: Task 3.2
**Description**: Create integration tests for browser service.
**Acceptance Criteria**:
- Tests fetching a simple static HTML page
- Tests fetching a page with JavaScript (mocked SPA)
- Tests timeout handling with slow-loading page
- Tests browser instance reuse
- Tests cleanup on shutdown
- Tests error handling for invalid URLs
- Tests stealth plugin is applied
- All tests pass with `npm test`

---

## Phase 4: Enhanced HTTP Get Tool

### Task 4.1: Update HTTP Get Tool with Smart Fallback
**File**: `src/services/tool-host.ts`
**Dependencies**: Task 2.1, Task 3.2
**Description**: Enhance `httpGetTool` to support Playwright with smart fallback logic.
**Acceptance Criteria**:
- Accepts new optional parameters: `useBrowser?: boolean`, `convertToMarkdown?: boolean`
- Implements fallback logic: try `fetch` first, use Playwright on 403/401 or if `useBrowser` is true
- Detects HTML content type from response headers
- Converts HTML to Markdown when `convertToMarkdown` is true (default for HTML)
- Returns enhanced response with `status`, `body`, `contentType`, `finalUrl`, `method` fields
- Handles errors from both `fetch` and Playwright
- Logs which method was used (fetch vs browser)

### Task 4.2: Add HTTP Get Tool Tests
**File**: `src/services/__tests__/tool-host.test.ts`
**Dependencies**: Task 4.1
**Description**: Create integration tests for enhanced HTTP get tool.
**Acceptance Criteria**:
- Tests successful fetch with simple URL
- Tests fallback to Playwright on 403 response
- Tests explicit `useBrowser: true` parameter
- Tests HTML to Markdown conversion
- Tests response format includes all required fields
- Tests error handling for invalid URLs
- Tests error handling for network failures
- All tests pass with `npm test`

---

## Phase 5: Planner Integration

### Task 5.1: Update Planner Prompt
**File**: `src/agents/prompts/planner.ts`
**Dependencies**: Task 4.1
**Description**: Update planner prompt to document enhanced `http_get` capabilities.
**Acceptance Criteria**:
- Updates `http_get` tool documentation to include `useBrowser` and `convertToMarkdown` parameters
- Adds example showing when to use `useBrowser: true` (e.g., for SPAs, sites with bot detection)
- Adds example showing Markdown conversion for web scraping
- Documents that HTML responses are automatically converted to Markdown
- Explains that `fetch` is tried first for performance, with automatic fallback to browser

---

## Phase 6: Testing & Documentation

### Task 6.1: Manual End-to-End Testing
**Dependencies**: All previous tasks
**Description**: Perform manual testing of the complete enhanced HTTP get flow.
**Acceptance Criteria**:
- Test fetching static HTML page (should use `fetch`)
- Test fetching SPA website (should fallback to Playwright)
- Test fetching site with bot detection (should use Playwright with stealth)
- Test explicit `useBrowser: true` parameter
- Test Markdown conversion quality on real websites
- Test error handling with invalid URLs
- Test timeout handling with slow sites
- Verify logs show which method was used
- Verify response times (fetch should be faster than Playwright)

### Task 6.2: Performance Benchmarking
**Dependencies**: Task 6.1
**Description**: Benchmark performance of fetch vs Playwright.
**Acceptance Criteria**:
- Measure average response time for `fetch` (should be <1s for most sites)
- Measure average response time for Playwright (should be <5s for most sites)
- Measure browser startup time (first request vs subsequent requests)
- Document performance characteristics in code comments or README
- Verify browser context reuse improves performance

### Task 6.3: Update README Documentation
**File**: `README.md`
**Dependencies**: Task 6.1
**Description**: Document the enhanced HTTP get tool in the README.
**Acceptance Criteria**:
- Adds section explaining enhanced `http_get` capabilities
- Documents when Playwright is used vs `fetch`
- Documents bot detection bypass techniques
- Documents HTML to Markdown conversion
- Includes examples of using `useBrowser` parameter
- Documents browser installation requirement (`npx playwright install chromium`)

### Task 6.4: Add Troubleshooting Guide
**File**: `README.md` or `docs/TROUBLESHOOTING.md`
**Dependencies**: Task 6.3
**Description**: Create troubleshooting guide for common browser service issues.
**Acceptance Criteria**:
- Documents how to debug Playwright issues (headless: false, slowMo, screenshots)
- Documents common bot detection bypass failures and solutions
- Documents how to handle sites with CAPTCHA
- Documents browser installation issues
- Documents timeout configuration
- Documents how to view browser logs
