# P11-01: Create Time Parser Service

**File**: `src/services/time-parser.ts`  
**Dependencies**: None  
**Phase**: 1 - Core Infrastructure

## Description
Create a service that converts natural language time expressions into cron expressions using the LLM.

## Acceptance Criteria
- Exports `parseTimeExpression(input: string): Promise<{ cronExpr: string, isRecurring: boolean, description: string }>`
- Uses `model-router` to parse natural language
- Returns valid cron expressions compatible with `node-cron`
- Handles both one-time and recurring reminders
- Throws descriptive errors for invalid inputs

## Implementation Notes
- Use the existing `ModelRouter` service to leverage LLM capabilities
- Include a system prompt that instructs the LLM to output cron expressions
- Validate the generated cron expression using `node-cron`'s `validate()` function
- For one-time reminders, calculate the exact time and convert to a cron expression that runs once
