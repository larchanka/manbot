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

---

# Replace read_file and write_file with shell Tool Implementation Plan

## Overview

Replace the existing `read_file` and `write_file` tools with a unified `shell` tool that can execute shell commands. This provides more flexibility and power, allowing the system to perform any filesystem operation, process management, and other system-level tasks through a single interface.

The `shell` tool will:
1. Execute shell commands in a sandboxed environment
2. Support read operations (e.g., `cat file.txt`, `ls -la`)
3. Support write operations (e.g., `echo "content" > file.txt`)
4. Support any other shell operations (e.g., `ps aux`, `grep`, `find`)
5. Maintain security through sandbox directory restrictions
6. Return structured output (stdout, stderr, exit code)

## Security Considerations

> [!IMPORTANT]
> **Sandbox Enforcement**
> 
> The shell tool will execute commands with strict sandbox restrictions:
> - All file operations must be within the configured sandbox directory
> - Commands that attempt to access paths outside the sandbox will be rejected
> - Command validation may be implemented to block dangerous operations (optional)

## Proposed Changes

### Component 1: Shell Tool Implementation

Replace `readFileTool` and `writeFileTool` with a single `shellTool` that executes shell commands.

#### [MODIFY] [tool-host.ts](file:///Users/mikhaillarchanka/Projects/AI-Agent/src/services/tool-host.ts)

- Remove `readFileTool` and `writeFileTool` implementations
- Add `shellTool` implementation that:
  - Accepts `command` (required, string): The shell command to execute
  - Accepts `cwd` (optional, string): Working directory (defaults to sandboxDir)
  - Validates that any file paths in the command are within sandbox directory
  - Executes command using Node.js `child_process.exec` or `spawn`
  - Returns structured response:
    ```typescript
    {
      stdout: string,
      stderr: string,
      exitCode: number,
      command: string,
      cwd: string
    }
    ```
- Update `registerDefaultTools()` to register `shell` instead of `read_file` and `write_file`
- Maintain sandbox validation logic (reuse or adapt `resolvePath`)

### Component 2: Command Validation and Sandbox Enforcement

Implement security measures to ensure commands operate within the sandbox.

#### [MODIFY] [tool-host.ts](file:///Users/mikhaillarchanka/Projects/AI-Agent/src/services/tool-host.ts)

- Add `validateCommand(command: string, cwd: string): { allowed: boolean, reason?: string }` method
- Validate that:
  - `cwd` is within sandbox directory
  - File paths in the command (if detectable) are within sandbox (optional - may be complex)
  - Block dangerous commands if needed (e.g., `rm -rf /`, `> /dev/sda`) - optional
- Return clear error messages when validation fails

### Component 3: Update Generator Service

Update the generator service to handle shell tool responses instead of read_file responses.

#### [MODIFY] [generator-service.ts](file:///Users/mikhaillarchanka/Projects/AI-Agent/src/services/generator-service.ts)

- Update content extraction logic:
  - Remove `read_file` response handling (content extraction)
  - Add `shell` tool response handling:
    - Extract `stdout` from shell tool responses
    - Handle `stderr` appropriately (include in context if non-empty)
    - Handle read operations (e.g., `cat file.txt` outputs to stdout)

### Component 4: Update Planner Prompt

Update planner prompt to document the new `shell` tool and deprecated `read_file`/`write_file` tools.

#### [MODIFY] [planner.ts](file:///Users/mikhaillarchanka/Projects/AI-Agent/src/agents/prompts/planner.ts)

- Update tool list: Remove `read_file` and `write_file`, add `shell`
- Document `shell` tool:
  - **Purpose**: Execute shell commands for file operations, process management, etc.
  - **Arguments**:
    - `command` (required, string): Shell command to execute (e.g., `cat file.txt`, `ls -la`, `echo "content" > file.txt`)
    - `cwd` (optional, string): Working directory (defaults to sandbox directory)
  - **Common use cases**:
    - Read file: `cat path/to/file.txt`
    - Write file: `echo "content" > path/to/file.txt` or `cat > path/to/file.txt << 'EOF'\ncontent\nEOF`
    - List files: `ls -la`, `ls -la directory/`
    - Check processes: `ps aux`, `pgrep process_name`
    - Search files: `grep "pattern" file.txt`, `find . -name "*.txt"`
  - **Response format**:
    - `stdout`: Standard output from command
    - `stderr`: Error output from command
    - `exitCode`: Exit code (0 = success)
    - `command`: The executed command
    - `cwd`: Working directory used
  - **Security**: All file operations are restricted to sandbox directory
- Update examples to use `shell` tool instead of `read_file`/`write_file`

### Component 5: Update Configuration Documentation

Update config documentation to reflect shell tool usage.

#### [MODIFY] [config.ts](file:///Users/mikhaillarchanka/Projects/AI-Agent/src/shared/config.ts)

- Update `ToolHostConfig` interface comment:
  - Change from: `/** Directory allowed for read_file/write_file. Paths outside are rejected. */`
  - Change to: `/** Directory allowed for shell tool file operations. Paths outside are rejected. */`

### Component 6: Update Documentation Files

Update README and other documentation files to reflect the change.

#### [MODIFY] [README.md](file:///Users/mikhaillarchanka/Projects/AI-Agent/README.md)

- Update services list: Replace `read_file, write_file` with `shell` tool
- Document shell tool capabilities

#### [MODIFY] [AI-Agent.md](file:///Users/mikhaillarchanka/Projects/AI-Agent/AI-Agent.md)

- Update tool-host.ts description: Replace `read_file, write_file` with `shell`
- Update tool capabilities list

## Migration Strategy

1. **Backward Compatibility**: Consider maintaining `read_file` and `write_file` as deprecated wrappers that call `shell` tool internally (optional)
2. **Testing**: Test common file operations (read, write, list) using shell commands
3. **Documentation**: Update all references to old tools

## Verification Plan

### Automated Tests

1. **Unit test for shell tool**
   ```bash
   npm test src/services/__tests__/tool-host.test.ts
   ```
   - Test reading file: `cat file.txt`
   - Test writing file: `echo "content" > file.txt` then verify
   - Test listing files: `ls -la`
   - Test invalid command
   - Test sandbox path validation
   - Test command with custom cwd

2. **Integration test for generator service**
   ```bash
   npm test src/services/__tests__/generator-service.test.ts
   ```
   - Test that shell tool stdout is extracted correctly
   - Test that stderr is handled appropriately

### Manual Verification

1. **Test file read operation**
   - Execute shell command: `cat test.txt`
   - Verify stdout contains file contents
   - Verify response structure

2. **Test file write operation**
   - Execute shell command: `echo "test content" > test.txt`
   - Verify file was created with correct content
   - Verify exit code is 0

3. **Test sandbox enforcement**
   - Try to access file outside sandbox: `cat /etc/passwd` (if sandbox is not root)
   - Verify command is rejected or fails appropriately
   - Try to change directory outside sandbox: `cd / && pwd`
   - Verify sandbox restrictions are enforced

4. **Test process management**
   - Execute: `ps aux | head -5`
   - Verify output shows process list
   - Execute: `pgrep node`
   - Verify output shows Node.js process IDs

5. **Test error handling**
   - Execute invalid command: `nonexistentcommand`
   - Verify stderr contains error message
   - Verify exit code is non-zero
   - Verify structured error response

---

# Ollama Model Manager with Tiered Prewarming and Routing-Aware Optimization

## Overview

Implement a model management layer for Ollama that minimizes latency and RAM usage while integrating cleanly with the existing model routing system. The system will prewarm small and medium models at startup, load the large model on demand, and manage their lifecycles based on tiered keep-alive policies.

## Proposed Changes

### Component 1: Ollama Adapter

Enhance the Ollama adapter to support warmup requests and the `keep_alive` parameter.

#### [MODIFY] [ollama-adapter.ts](file:///Users/mikhaillarchanka/Projects/AI-Agent/src/services/ollama-adapter.ts)

- Add `warmup(model: string, keepAlive: string | number): Promise<void>` method.
- Update `chat` and `generate` methods to optionally accept `keep_alive` in options.

---

### Component 2: Model Manager Service

Create a new service dedicated to managing model states and lifecycles.

#### [NEW] [model-manager.ts](file:///Users/mikhaillarchanka/Projects/AI-Agent/src/services/model-manager.ts)

- Implement `ModelManagerService` to track and ensure model availability.
- Support sequential prewarming of small and medium models.
- Implement concurrency-safe loading (one load operation per model).
- Handle tiered `keep_alive` policies:
    - Small/Medium: `-1` (Infinity)
    - Large: `5m` (Configurable)

---

### Component 3: Generator Service Integration

Integrate the model manager into the existing inference workflow.

#### [MODIFY] [generator-service.ts](file:///Users/mikhaillarchanka/Projects/AI-Agent/src/services/generator-service.ts)

- Inject `ModelManagerService` into `GeneratorService`.
- Call `ensureModelLoaded` before executing any chat or generate request.

---

### Component 4: Startup & Configuration

Configure and initialize the model management system.

#### [MODIFY] [config.json](file:///Users/mikhaillarchanka/Projects/AI-Agent/config.json)

- Add `modelManager` configuration section.

#### [MODIFY] [config.ts](file:///Users/mikhaillarchanka/Projects/AI-Agent/src/shared/config.ts)

- Add TypeScript types and validation for model manager settings.

#### [MODIFY] [orchestrator.ts](file:///Users/mikhaillarchanka/Projects/AI-Agent/src/core/orchestrator.ts)

- Initialize `ModelManagerService` and trigger `prewarmModels()` during startup.

---

## Verification Plan

### Automated Tests

1. **ModelManagerService Unit Tests**
    - `npm test src/services/__tests__/model-manager.test.ts`
    - Verify sequential prewarming logic.
    - Verify concurrency safety (locks).
    - Verify `keep_alive` values for different tiers.

2. **Integration Tests**
    - `npm test src/services/__tests__/generator-model-manager.test.ts` (Mocking Ollama)
    - Verify that `GeneratorService` calls the manager before inference.

### Manual Verification

1. **Ollama State Monitoring**
    - Use `ollama ps` to verify models in memory.
    - Check startup logs for prewarming progress.
    - Verify large model unloads after inactivity.

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

# Phase P9: Dynamic Skills System

## Overview

Implement a dynamic skills system that allows the agent to load specialized prompts and instructions from a `/skills` directory. This enables easy extension of the agent's capabilities without modifying code.

The system features:
1.  **Skill Manifest**: A global `CONFIG.md` file to list and describe available skills.
2.  **Skill Prompts**: Individual `SKILL.md` files for each skill's specialized instructions.
3.  **Dynamic Discovery**: Skills are loaded from disk on every request by the Planner and Executor.
4.  **Skill Dispatch**: The Executor handles `skill` nodes by injecting the skill's prompt as a system prompt to the Model Router.

## Proposed Changes

### Component 1: Skill Management Service
- Create `SkillManager` to handle parsing `CONFIG.md` and loading `SKILL.md` files.
- Support both table and list formats in the manifest.

### Component 2: Configuration
- Add `skillsDir` to the central configuration system.
- Support environment variable override (`SKILLS_DIR`).

### Component 3: Planner Integration
- Update `PlannerAgent` to load skills at runtime.
- Update Planner prompt to include a dynamic "Available Skills" section.
- Instruct the Planner on how to use the new `skill` node type.

### Component 4: Executor Integration
- Update `ExecutorAgent` to recognize and execute `skill` nodes.
- Map `skill` nodes to the `model-router` service with a custom system prompt.

## Verification Plan

### Automated Tests
1. **SkillManager Unit Tests** (to be implemented)
2. **Planner Integration Tests** (verify skill injection in prompts)
3. **Executor Integration Tests** (verify skill node execution flow)

### Manual Verification
1. **Manifest Updates**: Add a skill to `CONFIG.md` and verify the Planner sees it immediately without restart.
2. **Prompt Updates**: Update a `SKILL.md` and verify the Executor uses the new version immediately.
3. **End-to-End**: Request a task covered by a specific skill and verify the agent uses the skill node as expected.
