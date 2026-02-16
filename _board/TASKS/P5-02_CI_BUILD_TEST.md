# Task: P5-02 Implement CI Build and Test Job

## Description
Add a functional CI job that automatically installs dependencies, builds the TypeScript project, and runs the test suite.

## Requirements
- Add a `build-and-test` job to `ci.yml`.
- Use `actions/checkout@v4` to pull the code.
- Use `actions/setup-node@v4` with Node.js version 20.
- Execute the following steps:
  - `npm ci` (clean install of dependencies).
  - `npm run build` or `npx tsc` (verify TypeScript compilation).
  - `npm test` (run the test suite).

## Definition of Done
- GitHub Actions pipeline runs successfully to completion.
- All steps (Install, Build, Test) pass.
- Errors in compilation or tests correctly fail the CI build.
