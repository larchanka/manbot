# P11-02: Add Time Parser Tests

**File**: `src/services/__tests__/time-parser.test.ts`  
**Dependencies**: P11-01  
**Phase**: 1 - Core Infrastructure

## Description
Create unit tests for the time parser service.

## Acceptance Criteria
- Tests parsing "in X minutes/hours/days"
- Tests parsing "tomorrow/next week at HH:MM"
- Tests parsing "every day/week/Monday at HH:MM"
- Tests error handling for invalid expressions
- All tests pass with `npm test`

## Test Cases
1. **Relative time**: "in 5 minutes", "in 2 hours", "in 3 days"
2. **Absolute time**: "tomorrow at 3pm", "next Monday at 9am"
3. **Recurring**: "every day at 9am", "every Monday at 10am", "every week"
4. **Invalid**: "asdfasdf", "remind me", empty string
