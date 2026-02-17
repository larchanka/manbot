/**
 * Unit tests for Time Parser Service (P11-01).
 * Verifies parsing of natural language time expressions into cron expressions.
 */

import { describe, expect, it, vi, beforeEach } from "vitest";
import { TimeParserService } from "../time-parser.js";
import type { OllamaAdapter } from "../ollama-adapter.js";
import type { ModelRouter } from "../model-router.js";
import type { ChatResult } from "../ollama-adapter.js";

describe("TimeParserService", () => {
  let mockOllama: OllamaAdapter;
  let mockModelRouter: ModelRouter;

  beforeEach(() => {
    // Mock OllamaAdapter
    mockOllama = {
      chat: vi.fn(),
    } as unknown as OllamaAdapter;

    // Mock ModelRouter
    mockModelRouter = {
      getModel: vi.fn(() => "llama3:8b"),
    } as unknown as ModelRouter;
  });

  describe("parseTimeExpression", () => {
    it("parses relative time 'in 5 minutes' correctly", async () => {
      const mockResponse: ChatResult = {
        message: {
          role: "assistant",
          content: JSON.stringify({
            cronExpr: "35 14 17 2 *",
            isRecurring: false,
            description: "In 5 minutes (at 14:35)",
          }),
        },
        done: true,
      };
      vi.mocked(mockOllama.chat).mockResolvedValue(mockResponse);

      const parser = new TimeParserService({ ollama: mockOllama, modelRouter: mockModelRouter });
      const result = await parser.parseTimeExpression("in 5 minutes");

      expect(result.cronExpr).toBe("35 14 17 2 *");
      expect(result.isRecurring).toBe(false);
      expect(result.description).toContain("5 minutes");
      expect(mockOllama.chat).toHaveBeenCalled();
    });

    it("parses relative time 'in 2 hours' correctly", async () => {
      const mockResponse: ChatResult = {
        message: {
          role: "assistant",
          content: JSON.stringify({
            cronExpr: "30 16 17 2 *",
            isRecurring: false,
            description: "In 2 hours (at 16:30)",
          }),
        },
        done: true,
      };
      vi.mocked(mockOllama.chat).mockResolvedValue(mockResponse);

      const parser = new TimeParserService({ ollama: mockOllama, modelRouter: mockModelRouter });
      const result = await parser.parseTimeExpression("in 2 hours");

      expect(result.cronExpr).toBe("30 16 17 2 *");
      expect(result.isRecurring).toBe(false);
      expect(result.description).toContain("2 hours");
    });

    it("parses relative time 'in 3 days' correctly", async () => {
      const mockResponse: ChatResult = {
        message: {
          role: "assistant",
          content: JSON.stringify({
            cronExpr: "0 9 20 2 *",
            isRecurring: false,
            description: "In 3 days (Feb 20 at 9:00 AM)",
          }),
        },
        done: true,
      };
      vi.mocked(mockOllama.chat).mockResolvedValue(mockResponse);

      const parser = new TimeParserService({ ollama: mockOllama, modelRouter: mockModelRouter });
      const result = await parser.parseTimeExpression("in 3 days");

      expect(result.cronExpr).toBe("0 9 20 2 *");
      expect(result.isRecurring).toBe(false);
      expect(result.description).toContain("3 days");
    });

    it("parses absolute time 'tomorrow at 3pm' correctly", async () => {
      const mockResponse: ChatResult = {
        message: {
          role: "assistant",
          content: JSON.stringify({
            cronExpr: "0 15 18 2 *",
            isRecurring: false,
            description: "Tomorrow at 3:00 PM (Feb 18)",
          }),
        },
        done: true,
      };
      vi.mocked(mockOllama.chat).mockResolvedValue(mockResponse);

      const parser = new TimeParserService({ ollama: mockOllama, modelRouter: mockModelRouter });
      const result = await parser.parseTimeExpression("tomorrow at 3pm");

      expect(result.cronExpr).toBe("0 15 18 2 *");
      expect(result.isRecurring).toBe(false);
      expect(result.description).toContain("Tomorrow");
      expect(result.description).toContain("3:00 PM");
    });

    it("parses absolute time 'next Monday at 9am' correctly", async () => {
      const mockResponse: ChatResult = {
        message: {
          role: "assistant",
          content: JSON.stringify({
            cronExpr: "0 9 24 2 *",
            isRecurring: false,
            description: "Next Monday at 9:00 AM (Feb 24)",
          }),
        },
        done: true,
      };
      vi.mocked(mockOllama.chat).mockResolvedValue(mockResponse);

      const parser = new TimeParserService({ ollama: mockOllama, modelRouter: mockModelRouter });
      const result = await parser.parseTimeExpression("next Monday at 9am");

      expect(result.cronExpr).toBe("0 9 24 2 *");
      expect(result.isRecurring).toBe(false);
      expect(result.description).toContain("Monday");
      expect(result.description).toContain("9:00 AM");
    });

    it("parses recurring 'every day at 9am' correctly", async () => {
      const mockResponse: ChatResult = {
        message: {
          role: "assistant",
          content: JSON.stringify({
            cronExpr: "0 9 * * *",
            isRecurring: true,
            description: "Every day at 9:00 AM",
          }),
        },
        done: true,
      };
      vi.mocked(mockOllama.chat).mockResolvedValue(mockResponse);

      const parser = new TimeParserService({ ollama: mockOllama, modelRouter: mockModelRouter });
      const result = await parser.parseTimeExpression("every day at 9am");

      expect(result.cronExpr).toBe("0 9 * * *");
      expect(result.isRecurring).toBe(true);
      expect(result.description).toContain("Every day");
      expect(result.description).toContain("9:00 AM");
    });

    it("parses recurring 'every Monday at 10am' correctly", async () => {
      const mockResponse: ChatResult = {
        message: {
          role: "assistant",
          content: JSON.stringify({
            cronExpr: "0 10 * * 1",
            isRecurring: true,
            description: "Every Monday at 10:00 AM",
          }),
        },
        done: true,
      };
      vi.mocked(mockOllama.chat).mockResolvedValue(mockResponse);

      const parser = new TimeParserService({ ollama: mockOllama, modelRouter: mockModelRouter });
      const result = await parser.parseTimeExpression("every Monday at 10am");

      expect(result.cronExpr).toBe("0 10 * * 1");
      expect(result.isRecurring).toBe(true);
      expect(result.description).toContain("Monday");
      expect(result.description).toContain("10:00 AM");
    });

    it("parses recurring 'every week' correctly", async () => {
      const mockResponse: ChatResult = {
        message: {
          role: "assistant",
          content: JSON.stringify({
            cronExpr: "0 0 * * 0",
            isRecurring: true,
            description: "Every week (Sunday at midnight)",
          }),
        },
        done: true,
      };
      vi.mocked(mockOllama.chat).mockResolvedValue(mockResponse);

      const parser = new TimeParserService({ ollama: mockOllama, modelRouter: mockModelRouter });
      const result = await parser.parseTimeExpression("every week");

      expect(result.cronExpr).toBe("0 0 * * 0");
      expect(result.isRecurring).toBe(true);
      expect(result.description).toContain("week");
    });

    it("handles JSON wrapped in markdown code blocks", async () => {
      const mockResponse: ChatResult = {
        message: {
          role: "assistant",
          content: "```json\n" +
            JSON.stringify({
              cronExpr: "0 9 * * *",
              isRecurring: true,
              description: "Every day at 9:00 AM",
            }) +
            "\n```",
        },
        done: true,
      };
      vi.mocked(mockOllama.chat).mockResolvedValue(mockResponse);

      const parser = new TimeParserService({ ollama: mockOllama, modelRouter: mockModelRouter });
      const result = await parser.parseTimeExpression("every day at 9am");

      expect(result.cronExpr).toBe("0 9 * * *");
      expect(result.isRecurring).toBe(true);
    });

    it("validates cron expression and throws error for invalid expression", async () => {
      const mockResponse: ChatResult = {
        message: {
          role: "assistant",
          content: JSON.stringify({
            cronExpr: "invalid cron expression",
            isRecurring: false,
            description: "Invalid",
          }),
        },
        done: true,
      };
      vi.mocked(mockOllama.chat).mockResolvedValue(mockResponse);

      const parser = new TimeParserService({ ollama: mockOllama, modelRouter: mockModelRouter });

      await expect(parser.parseTimeExpression("invalid")).rejects.toThrow("Generated cron expression is invalid");
    });

    it("throws error for empty string input", async () => {
      const parser = new TimeParserService({ ollama: mockOllama, modelRouter: mockModelRouter });

      await expect(parser.parseTimeExpression("")).rejects.toThrow("Invalid input");
      await expect(parser.parseTimeExpression("   ")).rejects.toThrow("Invalid input");
    });

    it("throws error for invalid JSON response", async () => {
      const mockResponse: ChatResult = {
        message: {
          role: "assistant",
          content: "This is not valid JSON",
        },
        done: true,
      };
      vi.mocked(mockOllama.chat).mockResolvedValue(mockResponse);

      const parser = new TimeParserService({ ollama: mockOllama, modelRouter: mockModelRouter });

      await expect(parser.parseTimeExpression("test")).rejects.toThrow("Failed to parse LLM response");
    });

    it("throws error for missing required fields in response", async () => {
      const mockResponse: ChatResult = {
        message: {
          role: "assistant",
          content: JSON.stringify({
            cronExpr: "0 9 * * *",
            // missing isRecurring and description
          }),
        },
        done: true,
      };
      vi.mocked(mockOllama.chat).mockResolvedValue(mockResponse);

      const parser = new TimeParserService({ ollama: mockOllama, modelRouter: mockModelRouter });

      await expect(parser.parseTimeExpression("test")).rejects.toThrow("missing or invalid");
    });

    it("throws error for non-string input", async () => {
      const parser = new TimeParserService({ ollama: mockOllama, modelRouter: mockModelRouter });

      // @ts-expect-error Testing invalid input type
      await expect(parser.parseTimeExpression(null)).rejects.toThrow("Invalid input");
      // @ts-expect-error Testing invalid input type
      await expect(parser.parseTimeExpression(undefined)).rejects.toThrow("Invalid input");
    });

    it("handles LLM network errors", async () => {
      vi.mocked(mockOllama.chat).mockRejectedValue(new Error("Network error"));

      const parser = new TimeParserService({ ollama: mockOllama, modelRouter: mockModelRouter });

      await expect(parser.parseTimeExpression("test")).rejects.toThrow("Network error");
    });

    it("handles empty LLM response", async () => {
      const mockResponse: ChatResult = {
        message: {
          role: "assistant",
          content: "",
        },
        done: true,
      };
      vi.mocked(mockOllama.chat).mockResolvedValue(mockResponse);

      const parser = new TimeParserService({ ollama: mockOllama, modelRouter: mockModelRouter });

      await expect(parser.parseTimeExpression("test")).rejects.toThrow("empty response");
    });
  });
});
