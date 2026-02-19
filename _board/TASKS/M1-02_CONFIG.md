# M1-02: Add Model Manager Configuration

**Files**: `config.json`, `src/shared/config.ts`  
**Dependencies**: None  
**Phase**: M1 - Core Infrastructure

## Description
Add configuration settings for the model manager, including keep-alive durations and warmup prompts.

## Acceptance Criteria
- `modelManager` section added to `config.json`.
- TypeScript types and validation added to `src/shared/config.ts`.
- Settings include `largeModelKeepAlive` and `warmupPrompt`.

## Implementation Notes
- Add `modelRouter` defaults if needed or use existing ones.
- Define `ModelManagerConfig` interface.
- Ensure validation in `getConfig()` handles missing or malformed config.
