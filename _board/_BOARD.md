# My Project Board

## To Do

## In Progress
### P9-01 Proper Terminal Logging with Colorization
- tags: [in-progress]
- defaultExpanded: false
  ```md
  Implement proper terminal logging system with structured formatting, timestamps, log levels, and colorization for IPC communication and system events.
  
  Source: P9-01_CONSOLE_LOGGING.md
  ```

## Done

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

