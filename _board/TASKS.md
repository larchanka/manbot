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

---

# Replace read_file and write_file with shell Tool Tasks

## Phase 1: Core Shell Tool Implementation

### Task S1.1: Implement Shell Tool Core
**File**: `src/services/tool-host.ts`
**Dependencies**: None
**Description**: Implement the core shell tool that executes shell commands.
**Acceptance Criteria**:
- Add `shellTool` method that accepts `command` (required, string) and `cwd` (optional, string)
- Use Node.js `child_process.exec` or `spawn` to execute commands
- Default `cwd` to `sandboxDir` from config
- Return structured response: `{ stdout, stderr, exitCode, command, cwd }`
- Handle command execution errors gracefully
- Include JSDoc documentation

### Task S1.2: Add Command Validation
**File**: `src/services/tool-host.ts`
**Dependencies**: Task S1.1
**Description**: Add validation to ensure commands operate within sandbox.
**Acceptance Criteria**:
- Add `validateCommand(command: string, cwd: string): { allowed: boolean, reason?: string }` method
- Validate that `cwd` is within sandbox directory (resolve and check)
- Validate that resolved `cwd` path starts with `sandboxDir` and doesn't contain `..`
- Return clear error messages when validation fails
- Handle edge cases (empty cwd, relative paths, etc.)

### Task S1.3: Replace read_file and write_file Registration
**File**: `src/services/tool-host.ts`
**Dependencies**: Task S1.2
**Description**: Update tool registration to use shell tool instead of read_file/write_file.
**Acceptance Criteria**:
- Remove `readFileTool` and `writeFileTool` from `registerDefaultTools()`
- Add `shell` tool registration: `this.tools.set("shell", this.shellTool.bind(this))`
- Remove `readFileTool` and `writeFileTool` method implementations
- Remove `resolvePath` method if no longer needed (or adapt for shell tool validation)
- Update file header comment to reflect shell tool instead of read_file/write_file

### Task S1.4: Add Shell Tool Tests
**File**: `src/services/__tests__/tool-host.test.ts`
**Dependencies**: Task S1.3
**Description**: Create tests for shell tool functionality.
**Acceptance Criteria**:
- Test reading file: `cat file.txt` command
- Test writing file: `echo "content" > file.txt` then verify file exists
- Test listing files: `ls -la` command
- Test custom cwd parameter
- Test sandbox path validation (reject paths outside sandbox)
- Test invalid command handling
- Test command with non-zero exit code
- Test stdout and stderr capture
- All tests pass with `npm test`

---

## Phase 2: Update Dependent Services

### Task S2.1: Update Generator Service Content Extraction
**File**: `src/services/generator-service.ts`
**Dependencies**: Task S1.3
**Description**: Update generator service to extract content from shell tool responses.
**Acceptance Criteria**:
- Remove `read_file` response handling (content extraction logic)
- Add `shell` tool response handling:
  - Extract `stdout` from shell tool responses
  - Include `stderr` in context if non-empty (for debugging)
  - Handle read operations (e.g., `cat file.txt` outputs to stdout)
- Update comments to reflect shell tool usage
- Test that shell tool stdout is correctly extracted and used in prompts

### Task S2.2: Add Generator Service Tests
**File**: `src/services/__tests__/generator-service.test.ts`
**Dependencies**: Task S2.1
**Description**: Test generator service handles shell tool responses correctly.
**Acceptance Criteria**:
- Test that shell tool stdout is extracted correctly
- Test that stderr is handled appropriately (included if non-empty)
- Test that read operations (cat) produce expected content in prompts
- All tests pass with `npm test`

---

## Phase 3: Update Planner and Documentation

### Task S3.1: Update Planner Prompt - Remove Old Tools
**File**: `src/agents/prompts/planner.ts`
**Dependencies**: Task S1.3
**Description**: Remove read_file and write_file from planner prompt tool list.
**Acceptance Criteria**:
- Remove `read_file` and `write_file` from available tools list
- Update tool list to show: `shell`, `http_get`, `http_search`
- Update "DO NOT invent tool names" warning to reflect new tool list
- Remove examples that use read_file/write_file

### Task S3.2: Update Planner Prompt - Document Shell Tool
**File**: `src/agents/prompts/planner.ts`
**Dependencies**: Task S3.1
**Description**: Add comprehensive documentation for shell tool.
**Acceptance Criteria**:
- Add `shell` tool documentation section with:
  - Purpose: Execute shell commands for file operations, process management, etc.
  - Arguments: `command` (required), `cwd` (optional)
  - Response format: `{ stdout, stderr, exitCode, command, cwd }`
  - Common use cases:
    - Read file: `cat path/to/file.txt`
    - Write file: `echo "content" > path/to/file.txt` or heredoc syntax
    - List files: `ls -la`, `ls -la directory/`
    - Check processes: `ps aux`, `pgrep process_name`
    - Search files: `grep "pattern" file.txt`, `find . -name "*.txt"`
  - Security note: All file operations restricted to sandbox directory
- Add examples showing shell tool usage for file operations
- Update "For file operations" section to use shell tool

### Task S3.3: Update Config Documentation
**File**: `src/shared/config.ts`
**Dependencies**: Task S1.3
**Description**: Update config comments to reflect shell tool usage.
**Acceptance Criteria**:
- Update `ToolHostConfig` interface comment:
  - Change from: `/** Directory allowed for read_file/write_file. Paths outside are rejected. */`
  - Change to: `/** Directory allowed for shell tool file operations. Paths outside are rejected. */`
- TypeScript compilation succeeds with no errors

---

## Phase 4: Update External Documentation

### Task S4.1: Update README.md
**File**: `README.md`
**Dependencies**: Task S3.2
**Description**: Update README to reflect shell tool instead of read_file/write_file.
**Acceptance Criteria**:
- Update services list: Replace `read_file, write_file` with `shell` tool
- Document shell tool capabilities and common use cases
- Add example shell commands for file operations
- Update any references to old tools

### Task S4.2: Update AI-Agent.md
**File**: `AI-Agent.md`
**Dependencies**: Task S3.2
**Description**: Update AI-Agent.md to reflect shell tool.
**Acceptance Criteria**:
- Update tool-host.ts description: Replace `read_file, write_file` with `shell`
- Update tool capabilities list
- Update any architecture diagrams or descriptions

---

## Phase 5: Testing and Verification

### Task S5.1: Manual Testing - File Operations
**Dependencies**: Task S1.4, Task S2.2
**Description**: Manually test file read/write operations using shell tool.
**Acceptance Criteria**:
- Test reading file: Execute `cat test.txt` and verify stdout contains file contents
- Test writing file: Execute `echo "test content" > test.txt` and verify file created
- Test appending: Execute `echo "more content" >> test.txt` and verify appended
- Test listing: Execute `ls -la` and verify directory listing in stdout
- Test nested directories: Execute `ls -la subdir/` and verify works correctly
- Verify all operations respect sandbox directory

### Task S5.2: Manual Testing - Sandbox Enforcement
**Dependencies**: Task S1.4
**Description**: Test that sandbox restrictions are properly enforced.
**Acceptance Criteria**:
- Try to access file outside sandbox: `cat /etc/passwd` (if sandbox is not root)
- Verify command is rejected or fails appropriately
- Try to change directory outside sandbox: `cd / && pwd`
- Verify sandbox restrictions are enforced
- Try relative path traversal: `cat ../../etc/passwd`
- Verify path traversal is blocked
- Test that operations within sandbox work correctly

### Task S5.3: Manual Testing - Process Management
**Dependencies**: Task S1.4
**Description**: Test shell tool with process management commands.
**Acceptance Criteria**:
- Execute `ps aux | head -5` and verify output shows process list
- Execute `pgrep node` and verify output shows Node.js process IDs
- Execute `echo $PATH` and verify environment variables are accessible
- Test command chaining: `ls -la | grep ".txt"`
- Verify stdout/stderr are captured correctly

### Task S5.4: Manual Testing - Error Handling
**Dependencies**: Task S1.4
**Description**: Test error handling for various failure scenarios.
**Acceptance Criteria**:
- Execute invalid command: `nonexistentcommand`
- Verify stderr contains error message
- Verify exit code is non-zero
- Verify structured error response
- Test command that fails: `cat nonexistentfile.txt`
- Verify stderr contains file not found error
- Verify exit code reflects failure
- Test timeout handling (if implemented)

### Task S5.5: End-to-End Integration Test
**Dependencies**: All previous tasks
**Description**: Test complete flow from planner to executor using shell tool.
**Acceptance Criteria**:
- Send task via Telegram: "Read the file test.txt and summarize it"
- Verify planner generates plan using shell tool (`cat test.txt`)
- Verify executor executes shell tool correctly
- Verify generator service extracts stdout and uses it in prompt
- Verify final response includes file content summary
- Test write operation: "Write 'Hello World' to hello.txt"
- Verify file is created correctly
- Verify response confirms file creation

---

# Ollama Model Manager Tasks

## Phase M1: Core Infrastructure

### Task M1.1: Enhance OllamaAdapter with Warmup Support
**File**: `src/services/ollama-adapter.ts`
**Dependencies**: None
**Description**: Add a `warmup` method to `OllamaAdapter` that uses the `/api/chat` endpoint with a minimal prompt and supports the `keep_alive` parameter.
**Acceptance Criteria**:
- `warmup(model: string, keepAlive: string | number): Promise<void>` implemented.
- Uses `/api/chat` with `stream: false`.
- `chat` and `generate` methods updated to accept `keep_alive` in options.
- Error handling for warmup failures.

### Task M1.2: Add Model Manager Configuration
**Files**: `config.json`, `src/shared/config.ts`
**Dependencies**: None
**Description**: Add configuration settings for the model manager, including keep-alive durations and warmup prompts.
**Acceptance Criteria**:
- `modelManager` section added to `config.json`.
- TypeScript types and validation added to `src/shared/config.ts`.
- Settings include `largeModelKeepAlive` and `warmupPrompt`.

### Task M1.3: Implement ModelManagerService Core
**File**: `src/services/model-manager.ts`
**Dependencies**: Task M1.1, Task M1.2
**Description**: Create the `ModelManagerService` to manage tiered model lifecycles and ensure model availability.
**Acceptance Criteria**:
- `ModelManagerService` class created.
- `ensureModelLoaded(tier: ModelTier)` implemented with concurrency safety (locking).
- `prewarmModels()` implemented for sequential loading of small and medium models.
- Correct `keep_alive` values passed during warmup based on tier.

### Task M1.4: Unit Tests for ModelManagerService
**File**: `src/services/__tests__/model-manager.test.ts`
**Dependencies**: Task M1.3
**Description**: Create comprehensive unit tests for the `ModelManagerService`.
**Acceptance Criteria**:
- Tests sequential prewarming logic.
- Tests concurrency safety (concurrent `ensureModelLoaded` calls).
- Tests correct tier-to-model mapping and keep-alive parameters.
- All tests pass with `npm test`.

---

## Phase M2: Integration & Verification

### Task M2.1: Integrate ModelManager into GeneratorService
**File**: `src/services/generator-service.ts`
**Dependencies**: Task M1.3
**Description**: Update `GeneratorService` to call the `ModelManagerService` before performing any inference.
**Acceptance Criteria**:
- `ModelManagerService` injected into `GeneratorService`.
- `ensureModelLoaded` called before `ollama.chat` and `ollama.generate`.
- Works correctly with all model tiers.

---

# Phase P8: Natural Language Analysis of Tool Outputs

## Overview

Improve LLM outputs by ensuring that data gathered from tools (search, shell, web) is analyzed and presented as coherent text. This phase introduces a "Narrative Rule" for the planner and a dedicated analyzer service role.

## Proposed Changes

### Component 1: Analyzer Prompt
- Create a specialized analyzer system prompt that forbids raw JSON in final outputs.
- Implement a user prompt template that clearly separates "User Goal" from "Raw Tool Data".

### Component 2: Planner "Narrative Rule"
- Update the Planner Agent to always conclude research tasks with a `generate_text` node.
- These nodes are tagged with `system_prompt: "analyzer"`.

### Component 3: Targeted Deployment in Generator
- The Generator Service detects the "analyzer" tag and applies the synthesis prompt.
- This prevents breaking internal tool chains that require JSON.

### Task M2.2: Implement Startup Prewarming in Orchestrator
**File**: `src/core/orchestrator.ts`
**Dependencies**: Task M1.3
**Description**: Trigger the prewarming of small and medium models during application startup.
**Acceptance Criteria**:
- `ModelManagerService` initialized in `Orchestrator`.
- `prewarmModels()` called during the bootstrap phase.
- Prewarming does not block the main application flow.

### Task M2.3: Integration Testing for Inference Flow
**File**: `src/services/__tests__/generator-model-manager.test.ts`
**Dependencies**: Task M2.1
**Description**: Integration test to verify that inference requests correctly trigger model loading.
**Acceptance Criteria**:
- Mock Ollama adapter.
- Verify `GeneratorService` + `ModelManagerService` interaction.
- All tests pass with `npm test`.

### Task M2.4: Manual Verification and Documentation
**Dependencies**: All previous tasks
**Description**: Perform manual verification of model states and update project documentation.
**Acceptance Criteria**:
- Verify models are loaded at startup using `ollama ps`.
- Verify large model loads on demand and unloads after inactivity.
- Update `README.md` or `AI-Agent.md` with model management details.

---

# Phase 8: Natural Language Analysis

### Task 8.1: Implement Analyzer Prompt and Synthesis Logic
**Files**: `src/agents/prompts/analyzer.ts`, `src/services/generator-service.ts`
**Description**: Create the analyzer role and integrate it into the generator service.
**Acceptance Criteria**:
- `ANALYZER_SYSTEM_PROMPT` created.
- `GeneratorService` swaps "analyzer" tag for full prompt.
- `GeneratorService` uses analysis-specific user template.

### Task 8.2: Planner Narrative Rule and Search Examples
**File**: `src/agents/prompts/planner.ts`
**Description**: Update the planner to ensure it always schedules an analysis node after data-gathering tools.
**Acceptance Criteria**:
- Narrative Rule added to system prompt.
- Search & Answer few-shot example added.
- All research plans end with a `generate_text` node tagged as "analyzer".

# Phase P9: Dynamic Skills System Tasks

## Phase 9.1: Core Infrastructure

### Task 9.1: Add Skills Configuration
**File**: `src/shared/config.ts`
**Dependencies**: None
**Description**: Add skills section to the central configuration system to specify the skills directory.
**Acceptance Criteria**:
- `SkillsConfig` interface added.
- `skills` added to `AppConfig` and `DEFAULT_CONFIG`.
- `mergeEnv` handles `SKILLS_DIR` environment variable.
- Configuration is successfully merged and validated.

### Task 9.2: Implement SkillManager Service
**File**: `src/services/skill-manager.ts`
**Dependencies**: Task 9.1
**Description**: Create a service to load and parse skill manifests and prompts from disk.
**Acceptance Criteria**:
- `SkillManager` class created.
- `listSkills()` correctly parses `CONFIG.md` (tables and lists).
- `getSkillPrompt(name)` loads `SKILL.md` for a specific skill.
- Paths are resolved correctly relative to the skills directory.
- Error handling for missing files or parse errors.

## Phase 9.2: Agent Integration

### Task 9.3: Update Planner Prompts for Skills
**File**: `src/agents/prompts/planner.ts`
**Dependencies**: Task 9.2
**Description**: Modify the planner system prompt to support dynamic skills and the `skill` node type.
**Acceptance Criteria**:
- `PlannerPromptOptions` updated to include optional skills array.
- `buildPlannerPrompt` injects "AVAILABLE SKILLS" section if skills are provided.
- System prompt includes instructions for creating `type: "skill"` nodes.
- Example skill node provided in the prompt.

### Task 9.4: Integrate SkillManager into PlannerAgent
**File**: `src/agents/planner-agent.ts`
**Dependencies**: Task 9.3
**Description**: Wire the SkillManager into the PlannerAgent so it loads skills on every request.
**Acceptance Criteria**:
- `SkillManager` initialized in `PlannerAgent` constructor.
- `handleEnvelope` calls `listSkills()` and passes them to `buildPlannerPrompt`.
- Skills are successfully injected into the LLM prompt.

### Task 9.5: Support Skill Nodes in ExecutorAgent
**File**: `src/agents/executor-agent.ts`
**Dependencies**: Task 9.2
**Description**: Update the executor to recognize and process the new `skill` node type.
**Acceptance Criteria**:
- `SkillManager` initialized in `ExecutorAgent`.
- `TYPE_TO_SERVICE` maps `skill` to `model-router`.
- `dispatchNode` handles `type: skill` by loading the prompt via `SkillManager`.
- Skill task and prompt are correctly mapped to model-router input.

## Phase 9.3: Validation and Demo

### Task 9.6: Create Demo Skill
**File**: `skills/demo/SKILL.md`, `skills/CONFIG.md`
**Dependencies**: Task 9.4, Task 9.5
**Description**: Create a sample skill to verify the system end-to-end.
**Acceptance Criteria**:
- `skills/CONFIG.md` initialized with a demo skill entry.
- `skills/demo/SKILL.md` created with clear instructions.
- Verification that the skill appears in the planner's context.

### Task 9.7: Project Compilation
**File**: Project-wide
**Dependencies**: All Phase 9 tasks
**Description**: Ensure the project builds successfully with the new changes.
**Acceptance Criteria**:
- `npm run build` succeeds without TypeScript errors.
- Lint errors related to the new services are resolved.
