# P8-01: Natural Language Analysis of Tool Outputs

**File**: `src/agents/prompts/analyzer.ts`, `src/agents/prompts/planner.ts`, `src/services/generator-service.ts`
**Description**: Enhance the system to synthesize tool outputs (search results, shell output, etc.) into natural language using a dedicated analyzer prompt and a "Narrative Rule" in the planner.

## Acceptance Criteria
- [x] Dedicated `ANALYZER_SYSTEM_PROMPT` created in `src/agents/prompts/analyzer.ts`.
- [x] `PlannerAgent` updated with a "Narrative Rule" to always end research tasks with an analysis node.
- [x] `PlannerAgent` includes few-shot examples for "Search & Answer" tasks.
- [x] `GeneratorService` updated to handle the `"analyzer"` system prompt tag by replacing it with the full prompt.
- [x] `GeneratorService` uses `buildAnalyzerUserPrompt` to wrap goal and tool outputs.
- [x] Internal JSON-dependent chains (e.g., intermediate tool steps) remain functional.
- [x] Integration tests verify that `"analyzer"` tag triggers the correct prompt replacement.
- [x] All 150+ unit tests pass.

## Implementation Details
- The **Narrative Rule** ensures that if the user asks a question requiring research, the planner won't just list the tool nodes but will add a final `generate_text` node that consumes their output.
- The **Targeted Application** logic in `GeneratorService` ensures that we only apply natural language synthesis when the planner explicitly asks for it, preventing accidental breakage of logic-heavy JSON responses.
