# My Project Board

## To Do

### P11-02 Add Time Parser Tests
- tags: [todo, reminder-system, phase-1, testing]
- defaultExpanded: false
  ```md
  Create unit tests for the time parser service.

  Source: P11-02_TIME_PARSER_TESTS.md
  ```

### P11-03 Update Cron Manager Event Payload
- tags: [todo, reminder-system, phase-1]
- defaultExpanded: false
  ```md
  Modify CronManager.runJob() to emit structured reminder data in event.cron.completed.

  Source: P11-03_CRON_EVENT_PAYLOAD.md
  ```

### P11-04 Add Cron Manager Integration Tests
- tags: [todo, reminder-system, phase-1, testing]
- defaultExpanded: false
  ```md
  Create integration tests for cron manager reminder functionality.

  Source: P11-04_CRON_INTEGRATION_TESTS.md
  ```

### P11-05 Handle Cron Events in Orchestrator
- tags: [todo, reminder-system, phase-2]
- defaultExpanded: false
  ```md
  Add handler for event.cron.completed to route reminders to Telegram.

  Source: P11-05_ORCHESTRATOR_CRON_HANDLER.md
  ```

### P11-06 Update Planner Prompt with Reminder Capability
- tags: [todo, reminder-system, phase-3]
- defaultExpanded: false
  ```md
  Add cron-manager service and schedule_reminder capability to planner prompt.

  Source: P11-06_PLANNER_REMINDER_CAPABILITY.md
  ```

### P11-07 Add Planner Example for Reminders
- tags: [todo, reminder-system, phase-3]
- defaultExpanded: false
  ```md
  Add few-shot example showing how to plan a reminder request.

  Source: P11-07_PLANNER_REMINDER_EXAMPLE.md
  ```

### P11-08 Add Schedule Reminder Handler to Executor
- tags: [todo, reminder-system, phase-4]
- defaultExpanded: false
  ```md
  Add handler for schedule_reminder node type in the executor.

  Source: P11-08_EXECUTOR_REMINDER_HANDLER.md
  ```

### P11-09 Add List Reminders Command
- tags: [todo, reminder-system, phase-5]
- defaultExpanded: false
  ```md
  Add /reminders command to list active reminders for the user.

  Source: P11-09_LIST_REMINDERS_COMMAND.md
  ```

### P11-10 Add Cancel Reminder Command
- tags: [todo, reminder-system, phase-5]
- defaultExpanded: false
  ```md
  Add /cancel_reminder command to remove a specific reminder.

  Source: P11-10_CANCEL_REMINDER_COMMAND.md
  ```

### P11-11 Update Help Command
- tags: [todo, reminder-system, phase-5]
- defaultExpanded: false
  ```md
  Update /help command to document reminder functionality.

  Source: P11-11_UPDATE_HELP_COMMAND.md
  ```

### P11-12 Manual End-to-End Testing
- tags: [todo, reminder-system, phase-6, testing]
- defaultExpanded: false
  ```md
  Perform manual testing of the complete reminder flow.

  Source: P11-12_E2E_TESTING.md
  ```

### P11-13 Update README
- tags: [todo, reminder-system, phase-6, documentation]
- defaultExpanded: false
  ```md
  Document the reminder feature in the README.

  Source: P11-13_UPDATE_README.md
  ```

## In Progress

### P11-01 Create Time Parser Service
- tags: [in-progress, reminder-system, phase-1]
- defaultExpanded: false
  ```md
  Create a service that converts natural language time expressions into cron expressions using the LLM.

  Source: P11-01_TIME_PARSER_SERVICE.md
  ```

## Done
### P10-06 Model Selection Verification
- tags: [done]
- defaultExpanded: false
  ```md
  Conduct a verification run to ensure that the complexity mapping works as expected after the changes in P10-04 and P10-05.

  Source: P10-06_MODEL_SELECTION_VERIFICATION.md
  ```
### P10-04 Improved Model Selection Fallback
- tags: [done]
- defaultExpanded: false
  ```md
  Ensure that model selection correctly falls back to the plan's global complexity instead of a hardcoded "medium" default.

  Source: P10-04_IMPROVED_MODEL_FALLBACK.md
  ```

### P10-05 Configurable Planner Complexity
- tags: [done]
- defaultExpanded: false
  ```md
  Move the hardcoded "medium" complexity for the initial planning phase into the global configuration.

  Source: P10-05_CONFIGURABLE_PLANNER_COMPLEXITY.md
  ```

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

