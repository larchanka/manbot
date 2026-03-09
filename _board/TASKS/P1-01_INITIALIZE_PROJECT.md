# Task: P1-01 Initialize project structure

## Description
Set up the base directory structure, initialize the Node.js project, and configure TypeScript for a multi-process architecture.

## Requirements
- Initialize `package.json` with metadata.
- Install core dependencies: `typescript`, `tsx`, `zod`, `pino`.
- Configure `tsconfig.json` for Node.js 20+ and strict mode.
- Create initial directory structure:
  - `src/` (source code)
  - `src/core/` (orchestrator)
  - `src/agents/` (planner, executor, critic)
  - `src/services/` (memory, logging, lemonade)
  - `src/shared/` (types, protocol)
  - `src/adapters/` (telegram)

## Definition of Done
- `package.json` and `tsconfig.json` exist.
- Project compiles without errors using `tsc`.
- Directory structure is created as specified.
