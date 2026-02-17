# P11-16: Fix Executor Context for Reminder Scheduling

**File**: `src/agents/executor-agent.ts`, `src/core/orchestrator.ts`  
**Dependencies**: P11-08  
**Phase**: 4 - Bug Fix

## Description
Fix executor to receive and use chatId and userId in context for reminder scheduling.

## Problem
1. Executor console.log statements are written to stdout, breaking JSON parsing in orchestrator
2. chatId and userId are not passed to executor, causing schedule_reminder nodes to fail

## Acceptance Criteria
- Remove or redirect console.log statements that break JSON parsing
- Pass chatId and userId from orchestrator to executor in plan.execute payload
- Extract chatId and userId in executor and add to node context
- schedule_reminder nodes can access chatId and userId from context

## Implementation Notes
- Remove console.log from dispatchNode method
- Update PlanExecutePayload interface to include chatId and userId
- Update runExecutionLoop to accept and use chatId and userId
- Add chatId and userId to node context in runOne function
- Update orchestrator to pass chatId and userId in plan.execute payload
