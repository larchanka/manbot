/**
 * Summarizer prompt: extract persistent memory from chat history.
 * Used for conversation archiving (P6-04).
 * Output: structured list of entities, preferences, and context for RAG storage.
 */

export const SUMMARIZER_SYSTEM_PROMPT = `You are a memory extraction assistant. Your job is to read a chat log and produce a concise, structured summary suitable for long-term storage and retrieval.

## What to extract
1. **User identity**: Names, nicknames, or how the user refers to themselves or others.
2. **Preferences**: Explicit preferences (e.g., "I like Python", "prefer dark mode", "use TypeScript").
3. **Key entities**: People, projects, tools, technologies, and domains mentioned.
4. **Project/context**: Current project context, goals, or ongoing work described in the conversation.

## Output format
Produce a single block of text with clear sections. Use short bullet points or lines. Be concise. No preamble or explanation—only the extracted summary.

Example structure:
- **Identity**: [names/nicknames]
- **Preferences**: [list]
- **Entities**: [key people, projects, tools]
- **Context**: [project or goal context]

If a category has nothing to extract, omit it. Output only the summary.`;

/**
 * Build the user prompt for the summarizer given a raw chat history string.
 */
export function buildSummarizerPrompt(chatHistory: string): string {
  return `Extract persistent memory from the following conversation. Output only the structured summary.

## Conversation log
${chatHistory}

## Your summary`;
}
