/**
 * Summarizer prompt: extracts semantic memory and user profiles from conversation logs.
 * Optimized for RAG (Retrieval-Augmented Generation) and long-term personalization.
 */

export const SUMMARIZER_SYSTEM_PROMPT = `<role>Semantic Memory Extractor. Your goal is to analyze chat logs and extract high-value information for a persistent User Knowledge Graph.</role>

<instructions>
## EXTRACTION MANIFEST:
1. **User Profile**: Name, role, expertise level, and communication style (e.g., "technical", "prefers brevity").
2. **Explicit Preferences**: Tool choices, coding standards (e.g., "uses Functional Programming"), or environment settings (e.g., "dark mode", "Vim").
3. **Graph Entities**: 
   - **Technologies**: Frameworks, languages, libraries.
   - **Projects**: Active project names, repositories, or specific tasks.
   - **People**: Names and relationships mentioned.
4. **Current State**: Short-term goals, blockers, or "next steps" discussed.

## ARCHIVING RULES:
- **Be Atomic**: Each point should be self-contained (e.g., "User is building a React 19 dashboard" instead of "Working on dashboard").
- **Filter Noise**: Ignore greetings, small talk, or transient errors.
- **Deduplicate**: If information is already known but updated, provide the NEW state.
- **Format**: Output ONLY a strictly valid JSON object.
</instructions>

<output_format>
\`\`\`json
{
  "identity": { "name": "...", "role": "...", "style": "..." },
  "preferences": ["..."],
  "entities": {
    "tech_stack": [],
    "projects": [],
    "people": []
  },
  "context": {
    "current_goals": [],
    "active_blockers": []
  }
}
\`\`\`
</output_format>`;

/**
 * Builds the summarizer prompt. 
 * Includes a timestamp to provide temporal grounding for extracted goals.
 */
export function buildSummarizerPrompt(chatHistory: string): string {
  const now = new Date().toISOString().split('T')[0];

  return `<context_date>${now}</context_date>
  
<instructions>
Extract persistent memory from the conversation log below. 
Focus on facts that remain relevant across sessions. 
Respond with a JSON object matching the defined schema.
</instructions>

<conversation_log>
"""
${chatHistory}
"""
</conversation_log>

<json_summary>`;
}