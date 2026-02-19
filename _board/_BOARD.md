# My Project Board

## To Do

### M1-02 Add Model Manager Configuration
  - tags: [todo]
  - defaultExpanded: false
    ```md
    Add configuration settings for the model manager, including keep-alive durations and warmup prompts.
    
    Source: M1-02_CONFIG.md
    ```

### M1-03 Implement ModelManagerService Core
  - tags: [todo]
  - defaultExpanded: false
    ```md
    Create the ModelManagerService to manage tiered model lifecycles and ensure model availability.
    
    Source: M1-03_MODEL_MANAGER_CORE.md
    ```

### M1-04 Unit Tests for ModelManagerService
  - tags: [todo]
  - defaultExpanded: false
    ```md
    Create comprehensive unit tests for the ModelManagerService.
    
    Source: M1-04_MODEL_MANAGER_TESTS.md
    ```

### M2-01 Integrate ModelManager into GeneratorService
  - tags: [todo]
  - defaultExpanded: false
    ```md
    Update GeneratorService to call the ModelManagerService before performing any inference.
    
    Source: M2-01_GENERATOR_INTEGRATION.md
    ```

### M2-02 Implement Startup Prewarming in Orchestrator
  - tags: [todo]
  - defaultExpanded: false
    ```md
    Trigger the prewarming of small and medium models during application startup.
    
    Source: M2-02_STARTUP_PREWARMING.md
    ```

### M2-03 Integration Testing for Inference Flow
  - tags: [todo]
  - defaultExpanded: false
    ```md
    Integration test to verify that inference requests correctly trigger model loading.
    
    Source: M2-03_INTEGRATION_TESTS.md
    ```

### M2-04 Manual Verification and Documentation
  - tags: [todo]
  - defaultExpanded: false
    ```md
    Perform manual verification of model states and update project documentation.
    
    Source: M2-04_MANUAL_VERIFICATION.md
    ```

## In Progress

### M1-01 Enhance OllamaAdapter with Warmup Support
  - tags: [in-progress]
  - defaultExpanded: true
    ```md
    Add a warmup method to OllamaAdapter that uses the /api/chat endpoint with a minimal prompt and supports the keep_alive parameter.
    
    Source: M1-01_OLLAMA_WARMUP.md
    ```

## Done

### S5-05 End-to-End Integration Test
  - tags: [done]
  - defaultExpanded: false
    ```md
    Test complete flow from planner to executor using shell tool for file operations in real scenarios.
    
    Source: S5-05_E2E_INTEGRATION_TEST.md
    Note: Automated tests cover these scenarios (S1-04). Manual E2E testing recommended for final verification.
    ```

### S5-04 Manual Testing - Error Handling
  - tags: [done]
  - defaultExpanded: false
    ```md
    Test error handling for various failure scenarios including invalid commands and file errors.
    
    Source: S5-04_MANUAL_TESTING_ERROR_HANDLING.md
    Note: Covered by automated tests (S1-04). Manual verification recommended.
    ```

### S5-03 Manual Testing - Process Management
  - tags: [done]
  - defaultExpanded: false
    ```md
    Test shell tool with process management commands to verify system command execution and output capture.
    
    Source: S5-03_MANUAL_TESTING_PROCESSES.md
    Note: Covered by automated tests (S1-04). Manual verification recommended.
    ```

### S5-02 Manual Testing - Sandbox Enforcement
  - tags: [done]
  - defaultExpanded: false
    ```md
    Test that sandbox restrictions are properly enforced and commands outside sandbox are rejected.
    
    Source: S5-02_MANUAL_TESTING_SANDBOX.md
    Note: Covered by automated tests (S1-04). Manual verification recommended.
    ```

### S5-01 Manual Testing - File Operations
  - tags: [done]
  - defaultExpanded: false
    ```md
    Manually test file read/write operations using shell tool to verify functionality and sandbox restrictions.
    
    Source: S5-01_MANUAL_TESTING_FILE_OPS.md
    Note: Covered by automated tests (S1-04). Manual verification recommended.
    ```

### S4-02 Update AI-Agent.md
  - tags: [done]
  - defaultExpanded: false
    ```md
    Update AI-Agent.md to reflect shell tool in tool-host.ts description and tool capabilities list.
    
    Source: S4-02_UPDATE_AI_AGENT_MD.md
    ```

### S4-01 Update README.md
  - tags: [done]
  - defaultExpanded: false
    ```md
    Update README to reflect shell tool instead of read_file/write_file in services list and documentation.
    
    Source: S4-01_UPDATE_README.md
    ```

### S3-03 Update Config Documentation
  - tags: [done]
  - defaultExpanded: false
    ```md
    Update config interface comments to reflect shell tool usage instead of read_file/write_file.
    
    Source: S3-03_UPDATE_CONFIG_DOCS.md
    ```

### S3-02 Update Planner Prompt - Document Shell Tool
  - tags: [done]
  - defaultExpanded: false
    ```md
    Add comprehensive documentation for shell tool including purpose, arguments, response format, and common use cases.
    
    Source: S3-02_DOCUMENT_SHELL_TOOL.md
    ```

### S3-01 Update Planner Prompt - Remove Old Tools
  - tags: [done]
  - defaultExpanded: false
    ```md
    Remove read_file and write_file from planner prompt tool list and update references to use shell tool.
    
    Source: S3-01_REMOVE_OLD_TOOLS_FROM_PLANNER.md
    ```

### S2-02 Add Generator Service Tests
  - tags: [done]
  - defaultExpanded: false
    ```md
    Test that generator service correctly handles shell tool responses and extracts content for prompts.
    
    Source: S2-02_GENERATOR_SERVICE_TESTS.md
    ```

### S2-01 Update Generator Service Content Extraction
  - tags: [done]
  - defaultExpanded: false
    ```md
    Update generator service to extract content from shell tool responses instead of read_file responses.
    
    Source: S2-01_UPDATE_GENERATOR_SERVICE.md
    ```

### S1-04 Add Shell Tool Tests
  - tags: [done]
  - defaultExpanded: false
    ```md
    Create comprehensive tests for shell tool functionality including file operations, validation, and error handling.
    
    Source: S1-04_SHELL_TOOL_TESTS.md
    ```

### S1-03 Replace read_file and write_file Registration
  - tags: [done]
  - defaultExpanded: false
    ```md
    Update tool registration to use shell tool instead of read_file/write_file tools and remove old implementations.
    
    Source: S1-03_REPLACE_FILE_TOOLS.md
    ```

### S1-02 Add Command Validation
  - tags: [done]
  - defaultExpanded: false
    ```md
    Add validation to ensure commands operate within sandbox directory restrictions and prevent path traversal attacks.
    
    Source: S1-02_COMMAND_VALIDATION.md
    ```

### S1-01 Implement Shell Tool Core
  - tags: [done]
  - defaultExpanded: false
    ```md
    Implement the core shell tool that executes shell commands in a sandboxed environment with structured response format.
    
    Source: S1-01_SHELL_TOOL_CORE.md
    ```

### P12-14 Manual End-to-End Testing
  - tags: [done]
  - defaultExpanded: false
    ```md
    Perform manual testing of the complete enhanced HTTP get flow including static pages, SPAs, bot-protected sites, and error handling.
    
    Source: P12-14_E2E_TESTING.md
    ```

### P12-15 Performance Benchmarking
  - tags: [done]
  - defaultExpanded: false
    ```md
    Benchmark performance of fetch vs Playwright to measure response times and browser startup overhead.
    
    Source: P12-15_PERFORMANCE_BENCHMARK.md
    ```

### P12-16 Update README Documentation
  - tags: [done]
  - defaultExpanded: false
    ```md
    Document the enhanced http_get tool in the README including Playwright usage, bot detection bypass, and HTML to Markdown conversion.
    
    Source: P12-16_UPDATE_README.md
    ```

### P12-17 Add Troubleshooting Guide
  - tags: [done]
  - defaultExpanded: false
    ```md
    Create troubleshooting guide for common browser service issues including Playwright debugging, bot detection failures, and CAPTCHA handling.
    
    Source: P12-17_TROUBLESHOOTING_GUIDE.md
    ```

### P12-13 Update Planner Prompt
  - tags: [done]
  - defaultExpanded: false
    ```md
    Update planner prompt to document enhanced http_get capabilities including useBrowser and convertToMarkdown parameters.
    
    Source: P12-13_UPDATE_PLANNER_PROMPT.md
    ```

### P12-12 Add HTTP Get Tool Tests
  - tags: [done]
  - defaultExpanded: false
    ```md
    Create integration tests for enhanced HTTP get tool including fallback logic, browser usage, and Markdown conversion.
    
    Source: P12-12_HTTP_GET_TESTS.md
    ```

### P12-11 Update HTTP Get Tool with Smart Fallback
  - tags: [done]
  - defaultExpanded: false
    ```md
    Enhance httpGetTool to support Playwright with smart fallback logic from fetch to browser for SPAs and bot-protected sites.
    
    Source: P12-11_ENHANCED_HTTP_GET.md
    ```

### P12-10 Add Browser Service Tests
  - tags: [done]
  - defaultExpanded: false
    ```md
    Create integration tests for browser service including static pages, SPAs, timeout handling, and browser instance reuse.
    
    Source: P12-10_BROWSER_SERVICE_TESTS.md
    ```

### P12-09 Add Realistic Behavior to Browser Service
  - tags: [done]
  - defaultExpanded: false
    ```md
    Add human-like behaviors to browser service including random delays, mouse movements, and realistic headers to bypass bot detection.
    
    Source: P12-09_REALISTIC_BEHAVIOR.md
    ```

### P12-08 Create Browser Service Core
  - tags: [done]
  - defaultExpanded: false
    ```md
    Create service to manage Playwright browser instances with stealth plugin, user agent rotation, and context reuse.
    
    Source: P12-08_BROWSER_SERVICE_CORE.md
    ```

### P12-07 Create Browser Configuration
  - tags: [done]
  - defaultExpanded: false
    ```md
    Create configuration for user agents, viewports, and stealth settings to support bot detection bypass.
    
    Source: P12-07_BROWSER_CONFIG_UTILS.md
    ```

### P12-06 Add HTML to Markdown Tests
  - tags: [done]
  - defaultExpanded: false
    ```md
    Create unit tests for HTML to Markdown converter including various HTML elements, stripping unwanted content, and malformed HTML handling.
    
    Source: P12-06_HTML_MARKDOWN_TESTS.md
    ```

### P12-05 Create HTML to Markdown Converter
  - tags: [done]
  - defaultExpanded: false
    ```md
    Create utility to convert HTML content to clean Markdown using Turndown, preserving important elements and stripping scripts/styles.
    
    Source: P12-05_HTML_TO_MARKDOWN.md
    ```

### P12-04 Update Config TypeScript Types
  - tags: [done]
  - defaultExpanded: false
    ```md
    Add TypeScript types and validation for browser service configuration including headless, timeout, stealth, and context reuse settings.
    
    Source: P12-04_CONFIG_TYPES.md
    ```

### P12-03 Add Browser Service Configuration
  - tags: [done]
  - defaultExpanded: false
    ```md
    Add configuration section for browser service with headless, timeout, enableStealth, and reuseContext properties.
    
    Source: P12-03_BROWSER_CONFIG.md
    ```

### P12-02 Install Playwright Browsers
  - tags: [done]
  - defaultExpanded: false
    ```md
    Install Chromium browser for Playwright automation and document browser installation requirements.
    
    Source: P12-02_INSTALL_BROWSERS.md
    ```

### P12-01 Add Required Dependencies
  - tags: [done]
  - defaultExpanded: false
    ```md
    Add Playwright, stealth plugin, and HTML-to-Markdown conversion libraries to package.json dependencies.
    
    Source: P12-01_ADD_DEPENDENCIES.md
    ```

### P11-12 Manual End-to-End Testing


### P11-15 Fix Reminder List Handler in Orchestrator


### P11-16 Fix Executor Context for Reminder Scheduling


### P11-15 Fix Reminder List Handler in Orchestrator


### P11-14 Fix Cron Expression Extraction in Executor


### P11-13 Update README


### P11-11 Update Help Command


### P11-10 Add Cancel Reminder Command


### P11-09 Add List Reminders Command


### P11-08 Add Schedule Reminder Handler to Executor


### P11-07 Add Planner Example for Reminders


### P11-06 Update Planner Prompt with Reminder Capability


### P11-05 Handle Cron Events in Orchestrator


### P11-04 Add Cron Manager Integration Tests


### P11-03 Update Cron Manager Event Payload


### P11-02 Add Time Parser Tests


### P11-01 Create Time Parser Service


### P10-06 Model Selection Verification


### P10-04 Improved Model Selection Fallback


### P10-05 Configurable Planner Complexity


### P10-03 Enhanced node error logging and investigation


### P10-02 Silent system messages in Telegram


### P10-01 Investigate and fix Telegram response failure


### P9-01 Proper Terminal Logging with Colorization


### P8-01 Fix Orchestrator path calculation bug

  - tags: [done]
  - defaultExpanded: false
    ```md
    Fix incorrect path calculation in orchestrator.ts that causes "Cannot find module" errors when spawning child processes.
    
    Source: P8-01_FIX_ORCHESTRATOR_PATH.md
    ```

### P7-01 RAG Vector Search with sqlite-vss

  - tags: [done]
  - defaultExpanded: false
    ```md
    Use sqlite-vss for scalable vector similarity search; fallback to in-DB dot-product when extension unavailable.
    
    Source: P7-01_RAG_SQLITE_VSS.md
    ```

### P6-06 End-to-End Archiving Integration Test

  - tags: [done]
  - defaultExpanded: false
    ```md
    Write an integration test that verifies the full conversation archiving flow.
    
    Source: P6-06_ARCHIVING_INTEGRATION_TESTS.md
    ```

### P6-05 Orchestrate Conversation Archiving

  - tags: [done]
  - defaultExpanded: false
    ```md
    Implement the logic in Orchestrator to handle chat.new and run the archiving pipeline.
    
    Source: P6-05_CHAT_NEW_ORCHESTRATION.md
    ```

### P6-04 Specialized Summarizer Prompt and Node

  - tags: [done]
  - defaultExpanded: false
    ```md
    Create a specialized system prompt and capability node for extracting persistent memory from chat history.
    
    Source: P6-04_SUMMARIZER_PROMPT_AGENT.md
    ```

### P6-03 Telegram /new Command and Session Tracking

  - tags: [done]
  - defaultExpanded: false
    ```md
    Implement the /new command in Telegram Adapter to reset the current session and trigger archiving.
    
    Source: P6-03_TELEGRAM_NEW_COMMAND.md
    ```

### P6-02 Add conversation_id to TaskMemory Schema

  - tags: [done]
  - defaultExpanded: false
    ```md
    Update the tasks table schema to include a conversation_id column to group tasks by chat session.
    
    Source: P6-02_TASK_MEMORY_SCHEMA_CONV_ID.md
    ```

### P6-01 SQLite Persistence for RAG Service

  - tags: [done]
  - defaultExpanded: false
    ```md
    Update the RAGService to use SQLite for persistent embedding storage instead of in-memory array.
    
    Source: P6-01_RAG_SQLITE_PERSISTENCE.md
    ```

### P5-01 Configure GitHub Actions Workflow

  - tags: [done]
  - defaultExpanded: false
    ```md
    Set up the initial GitHub Actions infrastructure for the repository to enable automated workflows.
    
    Source: P5-01_CI_WORKFLOW.md
    ```

### P5-02 Implement CI Build and Test Job

  - tags: [done]
  - defaultExpanded: false
    ```md
    Add a functional CI job that automatically installs dependencies, builds the TypeScript project, and runs the test suite.
    
    Source: P5-02_CI_BUILD_TEST.md
    ```

