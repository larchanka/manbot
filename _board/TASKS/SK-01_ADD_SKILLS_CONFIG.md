# SK-01: Add Skills Configuration

**File**: `src/shared/config.ts`
**Dependencies**: None
**Phase**: SK - Dynamic Skills System

## Description
Add skills section to the central configuration system to specify the skills directory.

## Acceptance Criteria
- `SkillsConfig` interface added.
- `skills` added to `AppConfig` and `DEFAULT_CONFIG`.
- `mergeEnv` handles `SKILLS_DIR` environment variable.
- Configuration is successfully merged and validated.
