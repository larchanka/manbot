# SK-02: Implement SkillManager Service

**File**: `src/services/skill-manager.ts`
**Dependencies**: SK-01
**Phase**: SK - Dynamic Skills System

## Description
Create a service to load and parse skill manifests and prompts from disk.

## Acceptance Criteria
- `SkillManager` class created.
- `listSkills()` correctly parses `CONFIG.md` (tables and lists).
- `getSkillPrompt(name)` loads `SKILL.md` for a specific skill.
- Paths are resolved correctly relative to the skills directory.
- Error handling for missing files or parse errors.
