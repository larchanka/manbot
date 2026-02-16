# Task: P3-05 Dynamic Revision Nodes

## Description
Extend the Executor Agent to handle "REVISE" decisions from the Critic by dynamically injecting revision nodes into the execution flow to improve the final result.

## Requirements
- In the Executor's main loop, handle the Critic's `REVISE` payload.
- If `REVISE` is received:
  - Capture the Critic's feedback.
  - Inject a new `revise` node into the graph (or re-run a generation node with the feedback as additional input).
  - Update Task Memory with the revision history.
- Limit the number of revision cycles (e.g., max 3) to prevent infinite loops.

## Definition of Done
- Executor successfully re-triggers a generation step when the Critic asks for a revision.
- The system eventually converges to a `PASS` or hits the revision limit.
