# Task: P4-05 Build Tool Host

## Description
Implement a secure and isolated tool execution host that allows the platform to perform actions in the physical world (filesystem, network, etc.).

## Requirements
- Create `src/services/tool-host.ts`.
- Implement a registry of available tools (e.g., `read_file`, `write_file`, `http_get`).
- Enforce strict sandboxing (e.g., restriction to a specific directory for file tools).
- Use a standard protocol (MCP-compatible) for tool definition and execution.

## Definition of Done
- Tools are correctly registered and executed within the Tool Host process.
- Permission errors are returned if a tool tries to access unauthorized resources.
