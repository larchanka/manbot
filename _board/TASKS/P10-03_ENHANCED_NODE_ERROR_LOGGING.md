# Task: P10-03 Enhanced node error logging and investigation

## Description
The user reported receiving a generic "Node execution failed" message and wants more details in the terminal console to investigate why specifically a node failed. Currently, the error might be too opaque.

## Requirements
- Update `ExecutorAgent` to include more context in error envelopes when a node fails (e.g., input values, service name, specific stack trace if available).
- Update `Orchestrator` to log detailed error payloads to the console using `ConsoleLogger`.
- Ensure `ConsoleLogger` highlights these specific node failures with red color and displays the full payload details (not just the message).
- Investigate the specific cause of the "Node execution failed" message reported by the user.

## Definition of Done
- When a node fails, the terminal console shows a detailed breakdown of the failure.
- The log includes the node ID, type, service, and the specific error message/stack trace.
- The `ExecutorAgent` correctly propagates more granular error information back to the `Orchestrator`.
- The cause of the user's reported error is identified and documented (as part of the investigation phase of this task).
