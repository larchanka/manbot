# My Project Board

## To Do

### P1-01 Initialize project structure

  - tags: [pending]
  - defaultExpanded: false
    ```md
    Set up the base directory structure, initialize the Node.js project, and configure TypeScript for a multi-process architecture.

    Source: P1-01_INITIALIZE_PROJECT.md
    ```

### P1-02 Define shared Zod schemas

  - tags: [pending]
  - defaultExpanded: false
    ```md
    Define the core message protocol using Zod to ensure type-safe IPC communication between all system processes.

    Source: P1-02_DEFINE_SCHEMAS.md
    ```

### P1-03 Create base Process class

  - tags: [pending]
  - defaultExpanded: false
    ```md
    Implement a base class or helper to standardize the way individual processes handle stdin/stdout communication, message parsing, and error handling.

    Source: P1-03_BASE_PROCESS_CLASS.md
    ```

### P1-04 Implement Logger Service

  - tags: [pending]
  - defaultExpanded: false
    ```md
    Create a dedicated logging service process that subscribes to system-wide events and persists them to files in a structured format.

    Source: P1-04_LOGGER_SERVICE.md
    ```

### P1-05 Implement Task Memory Service

  - tags: [pending]
  - defaultExpanded: false
    ```md
    Establish the persistence layer for task lifecycle and execution states using SQLite. This service will manage all data related to task DAGs and node results.

    Source: P1-05_TASK_MEMORY_SERVICE.md
    ```

### P1-06 Write integration tests for Task Memory Service

  - tags: [pending]
  - defaultExpanded: false
    ```md
    Develop a comprehensive suite of integration tests to verify that the Task Memory Service correctly persists task states, child nodes, and their transitions throughout the execution lifecycle.

    Source: P1-06_TASK_MEMORY_TESTS.md
    ```

### P2-01 Implement Ollama Adapter

  - tags: [pending]
  - defaultExpanded: false
    ```md
    Build a bridge between the AI Agent platform and the local Ollama instance. This adapter will handle model inference, streaming responses, and token usage reporting.

    Source: P2-01_OLLAMA_ADAPTER.md
    ```

### P2-02 Implement Model Router

  - tags: [pending]
  - defaultExpanded: false
    ```md
    Create a service that maps abstract task complexity levels (`small`, `medium`, `large`) to specific local model names in Ollama.

    Source: P2-02_MODEL_ROUTER.md
    ```

### P2-03 Create System Prompts for Planner

  - tags: [pending]
  - defaultExpanded: false
    ```md
    Craft the foundational system prompts that guide the Planner Agent in converting a user message into a structured capability graph (DAG).

    Source: P2-03_PLANNER_PROMPTS.md
    ```

### P2-04 Implement Planner Agent

  - tags: [pending]
  - defaultExpanded: false
    ```md
    Develop the Planner Agent process which takes user intent and produces a structured execution DAG using the Ollama Adapter.

    Source: P2-04_PLANNER_AGENT.md
    ```

### P2-05 Validate DAG logic

  - tags: [pending]
  - defaultExpanded: false
    ```md
    Implement algorithmic checks to ensure that the plan produced by the Planner Agent is a valid Directed Acyclic Graph (DAG) before it reaches the Executor.

    Source: P2-05_VALIDATE_DAG.md
    ```

### P3-01 Implement Executor Agent core loop

  - tags: [pending]
  - defaultExpanded: false
    ```md
    Build the core engine that traverses the capability graph (DAG) and orchestrates the execution of individual nodes in the correct order based on their dependencies.

    Source: P3-01_EXECUTOR_CORE_LOOP.md
    ```

### P3-02 Parallel node execution

  - tags: [pending]
  - defaultExpanded: false
    ```md
    Optimize the Executor Agent to execute independent nodes in parallel, maximizing the utilization of available services and reducing overall task latency.

    Source: P3-02_PARALLEL_EXECUTION.md
    ```

### P3-03 Create System Prompts for Critic

  - tags: [pending]
  - defaultExpanded: false
    ```md
    Develop the system prompts for the Critic Agent, focusing on its role as a quality control layer that evaluates the Executor's draft results for accuracy, logic, and safety.

    Source: P3-03_CRITIC_PROMPTS.md
    ```

### P3-04 Implement Critic Agent process

  - tags: [pending]
  - defaultExpanded: false
    ```md
    Implement the Critic Agent as a standalone process that receives execution results and provides feedback on whether the task is complete and satisfactory.

    Source: P3-04_CRITIC_AGENT.md
    ```

### P3-05 Dynamic Revision Nodes

  - tags: [pending]
  - defaultExpanded: false
    ```md
    Extend the Executor Agent to handle "REVISE" decisions from the Critic by dynamically injecting revision nodes into the execution flow to improve the final result.

    Source: P3-05_REVISION_LOGIC.md
    ```

### P3-06 Build Core Orchestrator

  - tags: [pending]
  - defaultExpanded: false
    ```md
    Develop the central supervisor process that manages the lifecycle of all agents and services, mediates communication, and handles system-wide errors.

    Source: P3-06_CORE_ORCHESTRATOR.md
    ```

### P4-01 Telegram Adapter

  - tags: [pending]
  - defaultExpanded: false
    ```md
    Develop a standalone service to interface the AI Agent platform with Telegram, allowing users to interact with the system via a bot.

    Source: P4-01_TELEGRAM_ADAPTER.md
    ```

### P4-02 Connect Telegram to Orchestrator

  - tags: [pending]
  - defaultExpanded: false
    ```md
    Integrate the Telegram Adapter with the Core Orchestrator to enable the standard task creation and execution flow triggered by Telegram messages.

    Source: P4-02_TELEGRAM_INTEGRATION.md
    ```

### P4-03 Implement RAG Service

  - tags: [pending]
  - defaultExpanded: false
    ```md
    Implement a Retrieval-Augmented Generation (RAG) service using the FAISS vector database to provide the system with long-term semantic memory and document access.

    Source: P4-03_RAG_SERVICE.md
    ```

### P4-04 Semantic Search Node

  - tags: [pending]
  - defaultExpanded: false
    ```md
    Create a new node type in the capability graph that allows the Executor to invoke the RAG service for retrieving context.

    Source: P4-04_SEMANTIC_SEARCH_NODE.md
    ```

### P4-05 Build Tool Host

  - tags: [pending]
  - defaultExpanded: false
    ```md
    Implement a secure and isolated tool execution host that allows the platform to perform actions in the physical world (filesystem, network, etc.).

    Source: P4-05_TOOL_HOST.md
    ```

### P4-06 Cron Manager

  - tags: [pending]
  - defaultExpanded: false
    ```md
    Add a service for managing scheduled background tasks, such as periodic maintenance, database optimization, or recurring AI actions.

    Source: P4-06_CRON_MANAGER.md
    ```


## In Progress

## Done

