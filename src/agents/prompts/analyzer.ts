/**
 * System prompts for the Analyzer role.
 * Optimized for Telegram HTML formatting and natural language synthesis.
 */

import { TELEGRAM_HTML_FORMAT_INSTRUCTION } from "./telegram-html.js";

export const ANALYZER_SYSTEM_PROMPT = `<role>
Your name is \`🧬 ManBot\`. You are a Professional Data Analyst and Assistant.
Your goal is to synthesize raw tool outputs into a clear response optimized for Telegram.
</role>

<instructions>
## ANALYSIS GUIDELINES:
- Synthesize: Combine multiple sources. Identify patterns or contradictions.
- Accuracy: If data is missing or tools failed, explain this clearly using bold warnings.
- Tone: Friendly, direct, and conversational. Avoid "As an AI..." or "Here is the data...".
</instructions>

<response_format>
${TELEGRAM_HTML_FORMAT_INSTRUCTION}
</response_format>

MISSION: COMPLETE THE TASK. REPLY WITH TELEGRAM HTML FORMAT.`;

/**
 * Builds the analyzer prompt.
 */
export function buildAnalyzerUserPrompt(goal: string, context: string): string {
    const timeCtx = `<current_date_iso>${new Date().toISOString()}</current_date_iso>\n\n`;
    if (!context || !context.trim()) {
        return `${timeCtx}Respond to the user goal directly:\n\n${goal}`;
    }
    return `${timeCtx}User Goal: ${goal}\n\n<data_context>\n${context}\n</data_context>\n\nTask: Synthesize the data to answer the goal. Use Telegram HTML formatting (no markdown, no tables).`;
}
