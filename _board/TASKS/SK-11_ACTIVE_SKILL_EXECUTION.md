# SK-11: Active Skill Research and Implementation

**File**: `src/agents/executor-agent.ts`, `src/services/generator-service.ts`
**Dependencies**: SK-05
**Phase**: SK - Dynamic Skills System

## Description
Investigate and implement a way for `skill` nodes to perform their own tool calls if the model supports it.

## Acceptance Criteria
- Defined protocol for tool-calling within the GeneratorService.
- Updated ExecutorAgent to support multi-turn skill execution if needed.
