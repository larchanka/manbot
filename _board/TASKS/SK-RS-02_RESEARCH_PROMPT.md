# Task: Create Research Skill Prompt

## Description
Create the `SKILL.md` file for the `research` skill, containing detailed instructions for the LLM on how to perform web research using `lynx` and DuckDuckGo.

## File
- `skills/research/SKILL.md`

## Dependencies
- Phase P9 (Dynamic Skills System)

## Acceptance Criteria
- [ ] Create `skills/research/` directory.
- [ ] Define DuckDuckGo HTML search URL: `https://html.duckduckgo.com/html?q={SEARCH+QUERY}`.
- [ ] Instruct LLM to use `lynx -dump` to get text representation of pages.
- [ ] Include detailed instructions for link navigation via the `References` section of the dump.
- [ ] Define standard browsing depth (e.g., recursive depth of 2).
- [ ] Mandate a final synthesis step to merge all gathered data.
