# Task: P2-02 Implement Model Router

## Description
Create a service that maps abstract task complexity levels (`small`, `medium`, `large`) to specific local model names in Lemonade.

## Requirements
- Create `src/services/model-router.ts`.
- Define a configuration mapping (e.g., small: `llama3:8b`, medium: `mistral`, large: `mixtral`).
- Implement logic to select the best model based on:
  - Requested complexity level.
  - System performance (optional heuristic).
- Expose a simple `getModel(complexity)` method.

## Definition of Done
- `ModelRouter` returns the correct model string for each complexity level based on its configuration.
- Configuration is easily adjustable.
