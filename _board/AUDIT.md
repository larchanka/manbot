# Audit: Model Orchestrator & Selection Logic
**Audit Time**: 2026-02-17 11:25:00

## Overview
Investigation into how the AI-Agent selects models for planning and execution, and whether the `ModelRouter` works correctly with the current configuration.

## Findings

### 1. Model Selection Mechanism
- The `ModelRouter` ([model-router.ts](file:///Users/mikhaillarchanka/Projects/AI-Agent/src/services/model-router.ts)) translates abstract complexity levels (`small`, `medium`, `large`) into concrete model names.
- Configuration is loaded from [config.json](file:///Users/mikhaillarchanka/Projects/AI-Agent/config.json) and merged with defaults and environment variables.
- Models are selected correctly based on the following mapping:
  - **Planner Agent**: Uses the complexity level provided by the Orchestrator (currently hardcoded to `medium` in `runTaskPipeline`).
  - **Generator Service**: Uses `modelClass` from the node's input, falling back to `medium`.

### 2. Configuration Status
The current active mapping in `config.json` is:
- **Small**: `qwen3:0.6b`
- **Medium**: `qwen3:1.7b`
- **Large**: `qwen3:8b`

### 3. Observed Issues / Observations
- **Planner Defaults**: The Orchestrator hardcodes `complexity: "medium"` for the initial planning phase.
- **Node Granularity**: The Planner can specify different models for different nodes in the DAG (e.g., `large` for generation, `small` for summarization).
- **Fallback Logic**: If `modelClass` is missing from a node's input, the `GeneratorService` defaults to `medium`, ignoring the global plan complexity.

## Actions to Perform

1. **[TASK] [P10-04] Improved Model Selection Fallback**
   - Update `GeneratorService` or `Executor` to use the plan's global complexity as a fallback for `modelClass` instead of a hardcoded `medium`.
2. **[TASK] [P10-05] Configurable Planner Complexity**
   - Make the initial planning complexity configurable in `config.json` instead of being hardcoded in `orchestrator.ts`.
3. **[AUDIT] Verification**
   - Conduct a test run with a "large" complexity goal to verify that the `qwen3:8b` model is correctly invoked for critical nodes.
