/**
 * Time Parser Service: converts natural language time expressions into cron expressions using the LLM.
 * P11-01: _board/TASKS/P11-01_TIME_PARSER_SERVICE.md
 */

import cron from "node-cron";
import { OllamaAdapter } from "./ollama-adapter.js";
import { ModelRouter } from "./model-router.js";

const SYSTEM_PROMPT = `You are a time expression parser. Your task is to convert natural language time expressions into cron expressions.

Rules:
1. For recurring reminders (e.g., "every day at 9am", "every Monday", "every week"), output a standard cron expression.
2. For one-time reminders (e.g., "in 5 minutes", "tomorrow at 3pm", "next Monday at 9am"), calculate the exact date and time, then output a cron expression for that specific time.
3. Cron format: "minute hour day month dayOfWeek"
   - minute: 0-59
   - hour: 0-23 (24-hour format)
   - day: 1-31
   - month: 1-12
   - dayOfWeek: 0-7 (0 or 7 = Sunday, 1 = Monday, ..., 6 = Saturday)
4. Use * for "every" values (e.g., "every day" = "* * * * *")
5. For one-time reminders, use specific values for all fields (e.g., "15 14 17 2 *" = Feb 17 at 2:15 PM)

Output your response as a JSON object with this exact format:
{
  "cronExpr": "<cron expression>",
  "isRecurring": <true or false>,
  "description": "<human-readable description of when this will trigger>"
}

Examples:
- Input: "in 5 minutes" (assuming current time is 14:30)
  Output: {"cronExpr": "35 14 <day> <month> *", "isRecurring": false, "description": "In 5 minutes (at 14:35)"}
  
- Input: "every day at 9am"
  Output: {"cronExpr": "0 9 * * *", "isRecurring": true, "description": "Every day at 9:00 AM"}
  
- Input: "every Monday at 2pm"
  Output: {"cronExpr": "0 14 * * 1", "isRecurring": true, "description": "Every Monday at 2:00 PM"}
  
- Input: "tomorrow at 3pm" (assuming today is Feb 17)
  Output: {"cronExpr": "0 15 18 2 *", "isRecurring": false, "description": "Tomorrow at 3:00 PM (Feb 18)"}
  
Note: For one-time reminders, calculate the exact date and time based on the current date/time provided in the user message. Replace <day> and <month> placeholders with actual numeric values.

Important: Always output valid JSON. The cron expression must be valid according to node-cron format.`;

export interface ParseTimeExpressionResult {
  cronExpr: string;
  isRecurring: boolean;
  description: string;
}

export class TimeParserService {
  private readonly ollama: OllamaAdapter;
  private readonly modelRouter: ModelRouter;

  constructor(options?: { ollama?: OllamaAdapter; modelRouter?: ModelRouter }) {
    this.ollama = options?.ollama ?? new OllamaAdapter();
    this.modelRouter = options?.modelRouter ?? new ModelRouter();
  }

  /**
   * Parse a natural language time expression into a cron expression.
   * @param input Natural language time expression (e.g., "in 5 minutes", "every day at 9am")
   * @returns Promise resolving to cron expression, recurrence flag, and description
   * @throws Error if the input cannot be parsed or the generated cron expression is invalid
   */
  async parseTimeExpression(input: string): Promise<ParseTimeExpressionResult> {
    if (!input || typeof input !== "string" || input.trim().length === 0) {
      throw new Error("Invalid input: time expression must be a non-empty string");
    }

    const prompt = `Parse this time expression into a cron expression: "${input.trim()}"\n\nCurrent date and time: ${new Date().toISOString()}`;

    try {
      // Use "small" model for this task as it's relatively straightforward
      const model = this.modelRouter.getModel("small");
      const result = await this.ollama.chat(
        [
          { role: "system", content: SYSTEM_PROMPT },
          { role: "user", content: prompt },
        ],
        model,
      );

      const responseText = (result.message.content || "").trim();
      if (!responseText) {
        throw new Error("LLM returned empty response");
      }

      // Try to extract JSON from the response (may be wrapped in markdown code blocks)
      let jsonText = responseText;
      const jsonMatch = responseText.match(/```(?:json)?\s*(\{[\s\S]*\})\s*```/);
      if (jsonMatch && jsonMatch[1]) {
        jsonText = jsonMatch[1];
      } else {
        // Try to find JSON object in the response
        const braceMatch = responseText.match(/\{[\s\S]*\}/);
        if (braceMatch && braceMatch[0]) {
          jsonText = braceMatch[0];
        }
      }

      let parsed: ParseTimeExpressionResult;
      try {
        parsed = JSON.parse(jsonText) as ParseTimeExpressionResult;
      } catch (parseError) {
        throw new Error(
          `Failed to parse LLM response as JSON. Response: ${responseText.substring(0, 200)}`,
        );
      }

      // Validate required fields
      if (typeof parsed.cronExpr !== "string") {
        throw new Error(`Invalid response: missing or invalid cronExpr field`);
      }
      if (typeof parsed.isRecurring !== "boolean") {
        throw new Error(`Invalid response: missing or invalid isRecurring field`);
      }
      if (typeof parsed.description !== "string") {
        throw new Error(`Invalid response: missing or invalid description field`);
      }

      // Validate cron expression using node-cron
      const isValid = cron.validate(parsed.cronExpr);
      if (!isValid) {
        throw new Error(
          `Generated cron expression is invalid: "${parsed.cronExpr}". LLM response: ${responseText.substring(0, 200)}`,
        );
      }

      return parsed;
    } catch (err) {
      const message = err instanceof Error ? err.message : String(err);
      if (message.includes("Invalid") || message.includes("Failed to parse")) {
        throw new Error(`Failed to parse time expression "${input}": ${message}`);
      }
      // Re-throw network/timeout errors as-is
      throw err;
    }
  }
}

/**
 * Convenience function to parse a time expression.
 * Creates a new TimeParserService instance and calls parseTimeExpression.
 */
export async function parseTimeExpression(
  input: string,
): Promise<ParseTimeExpressionResult> {
  const parser = new TimeParserService();
  return parser.parseTimeExpression(input);
}
