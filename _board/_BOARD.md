# My Project Board

## To Do

### P12-13 Update Planner Prompt
- Source: P12-13_UPDATE_PLANNER_PROMPT.md

### P12-14 Manual End-to-End Testing
- Source: P12-14_E2E_TESTING.md

### P12-15 Performance Benchmarking
- Source: P12-15_PERFORMANCE_BENCHMARK.md

### P12-16 Update README Documentation
- Source: P12-16_UPDATE_README.md

### P12-17 Add Troubleshooting Guide
- Source: P12-17_TROUBLESHOOTING_GUIDE.md

## In Progress

### P12-12 Add HTTP Get Tool Tests
- Source: P12-12_HTTP_GET_TESTS.md

## Done

### P12-11 Update HTTP Get Tool with Smart Fallback
- Source: P12-11_ENHANCED_HTTP_GET.md

### P12-10 Add Browser Service Tests
- Source: P12-10_BROWSER_SERVICE_TESTS.md

### P12-09 Add Realistic Behavior to Browser Service
- Source: P12-09_REALISTIC_BEHAVIOR.md

### P12-08 Create Browser Service Core
- Source: P12-08_BROWSER_SERVICE_CORE.md

### P12-07 Create Browser Configuration
- Source: P12-07_BROWSER_CONFIG_UTILS.md

### P12-06 Add HTML to Markdown Tests
- Source: P12-06_HTML_MARKDOWN_TESTS.md

### P12-05 Create HTML to Markdown Converter
- Source: P12-05_HTML_TO_MARKDOWN.md

### P12-04 Update Config TypeScript Types
- Source: P12-04_CONFIG_TYPES.md

### P12-03 Add Browser Service Configuration
- Source: P12-03_BROWSER_CONFIG.md

### P12-02 Install Playwright Browsers
- Source: P12-02_INSTALL_BROWSERS.md

### P12-01 Add Required Dependencies
- Source: P12-01_ADD_DEPENDENCIES.md

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

