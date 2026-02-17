# 🧬 ManBot Task Execution Instructions

To ensure a structured and consistent development process, ManBot must follow these rules for task execution:

## 1. Task Selection
- Navigate to `_board/_BOARD.md`.
- Identify the **top-most** task in the `## To Do` column.
- Move the selected task from `## To Do` to `## In Progress`.

## 2. Research & Requirements
- Look for the `Source` field in the task's description block (e.g., `Source: P1-01_INITIALIZE_PROJECT.md`).
- Read the corresponding full task specification file located in the `_board/TASKS/` folder.
- Ensure all requirements and "Definition of Done" criteria are understood before starting.

## 3. Implementation
- Execute the task by modifying or creating the necessary files in the codebase.
- Follow existing architecture patterns and coding standards.

## 4. Verification & Testing
- Verify the results of the implementation.
- Run any relevant automated tests to ensure no regressions were introduced.
- Perform manual verification steps if specified in the task file.

## 5. Commit & Persistence
- Commit the changes to the repository with a descriptive commit message referencing the task ID.
- Ensure the codebase remains in a stable, buildable state.

## 6. Board Update
- Once the task is fully verified and committed, move the task from `## In Progress` to `## Done` in `_board/_BOARD.md`.
- Clear any specific status tags or update them as appropriate for the completed state.

## 7. Iteration
- Proceed to the next task in the `## To Do` column and repeat the process.
