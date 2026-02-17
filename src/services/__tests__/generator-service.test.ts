/**
 * Integration tests for Generator Service shell tool response handling.
 * Verifies that shell tool stdout is correctly extracted and used in prompts.
 */

import { describe, expect, it, vi, beforeEach } from "vitest";
import { GeneratorService } from "../generator-service.js";
import type { OllamaAdapter } from "../ollama-adapter.js";
import type { ModelRouter } from "../model-router.js";
import type { Envelope } from "../../shared/protocol.js";
import { randomUUID } from "node:crypto";

describe("GeneratorService shell tool response handling", () => {
  let generatorService: GeneratorService;
  let mockOllama: OllamaAdapter;
  let mockModelRouter: ModelRouter;

  beforeEach(() => {
    // Mock OllamaAdapter
    mockOllama = {
      generate: vi.fn().mockResolvedValue({
        text: "Generated response",
        prompt_eval_count: 10,
        eval_count: 20,
      }),
      chat: vi.fn().mockResolvedValue({
        message: {
          content: "Generated response",
          role: "assistant",
        },
        prompt_eval_count: 10,
        eval_count: 20,
      }),
    } as unknown as OllamaAdapter;

    // Mock ModelRouter
    mockModelRouter = {
      getModel: vi.fn(() => "llama3:8b"),
    } as unknown as ModelRouter;

    generatorService = new GeneratorService({
      ollama: mockOllama,
      modelRouter: mockModelRouter,
    });

  });

  describe("shell tool stdout extraction", () => {
    it("extracts stdout from shell tool response in context", async () => {
      const shellResponse = {
        stdout: "File content from cat command",
        stderr: "",
        exitCode: 0,
        command: "cat file.txt",
        cwd: "/sandbox",
      };

      const envelope: Envelope = {
        id: randomUUID(),
        from: "executor",
        to: "model-router",
        type: "node.execute",
        version: "1.0",
        timestamp: Date.now(),
        payload: {
          taskId: "t1",
          nodeId: "n1",
          type: "generate_text",
          service: "model-router",
          input: {
            prompt: "Summarize the file content",
          },
          context: {
            fileContent: shellResponse,
          },
        },
      };

      (generatorService as any).handleEnvelope(envelope);

      // Wait for async processing
      await new Promise((resolve) => setTimeout(resolve, 100));

      expect(mockOllama.generate).toHaveBeenCalled();
      const callArgs = (mockOllama.generate as ReturnType<typeof vi.fn>).mock.calls[0];
      expect(callArgs).toBeDefined();
      const prompt = callArgs![0] as string;

      expect(prompt).toContain("File content from cat command");
      expect(prompt).toContain("Summarize the file content");
    });

    it("includes stderr in context when non-empty", async () => {
      const shellResponse = {
        stdout: "Main output",
        stderr: "Warning: file not found",
        exitCode: 0,
        command: "cat file.txt",
        cwd: "/sandbox",
      };

      const envelope: Envelope = {
        id: randomUUID(),
        from: "executor",
        to: "model-router",
        type: "node.execute",
        version: "1.0",
        timestamp: Date.now(),
        payload: {
          taskId: "t1",
          nodeId: "n1",
          type: "generate_text",
          service: "model-router",
          input: {
            prompt: "Process this output",
          },
          context: {
            shellOutput: shellResponse,
          },
        },
      };

      (generatorService as any).handleEnvelope(envelope);

      // Wait for async processing
      await new Promise((resolve) => setTimeout(resolve, 100));

      expect(mockOllama.generate).toHaveBeenCalled();
      const callArgs = (mockOllama.generate as ReturnType<typeof vi.fn>).mock.calls[0];
      expect(callArgs).toBeDefined();
      const prompt = callArgs![0] as string;

      expect(prompt).toContain("Main output");
      expect(prompt).toContain("[stderr: Warning: file not found]");
    });

    it("handles empty stdout gracefully", async () => {
      const shellResponse = {
        stdout: "",
        stderr: "",
        exitCode: 0,
        command: "touch empty.txt",
        cwd: "/sandbox",
      };

      const envelope: Envelope = {
        id: randomUUID(),
        from: "executor",
        to: "model-router",
        type: "node.execute",
        version: "1.0",
        timestamp: Date.now(),
        payload: {
          taskId: "t1",
          nodeId: "n1",
          type: "generate_text",
          service: "model-router",
          input: {
            prompt: "Process this",
          },
          context: {
            emptyOutput: shellResponse,
          },
        },
      };

      (generatorService as any).handleEnvelope(envelope);

      // Wait for async processing
      await new Promise((resolve) => setTimeout(resolve, 100));

      expect(mockOllama.generate).toHaveBeenCalled();
      const callArgs = (mockOllama.generate as ReturnType<typeof vi.fn>).mock.calls[0];
      expect(callArgs).toBeDefined();
      const prompt = callArgs![0] as string;

      // Empty stdout should not break the prompt
      expect(prompt).toContain("Process this");
    });

    it("handles multiple shell tool responses in context", async () => {
      const shellResponse1 = {
        stdout: "First file content",
        stderr: "",
        exitCode: 0,
        command: "cat file1.txt",
        cwd: "/sandbox",
      };

      const shellResponse2 = {
        stdout: "Second file content",
        stderr: "",
        exitCode: 0,
        command: "cat file2.txt",
        cwd: "/sandbox",
      };

      const envelope: Envelope = {
        id: randomUUID(),
        from: "executor",
        to: "model-router",
        type: "node.execute",
        version: "1.0",
        timestamp: Date.now(),
        payload: {
          taskId: "t1",
          nodeId: "n1",
          type: "generate_text",
          service: "model-router",
          input: {
            prompt: "Compare these files",
          },
          context: {
            file1: shellResponse1,
            file2: shellResponse2,
          },
        },
      };

      (generatorService as any).handleEnvelope(envelope);

      // Wait for async processing
      await new Promise((resolve) => setTimeout(resolve, 100));

      expect(mockOllama.generate).toHaveBeenCalled();
      const callArgs = (mockOllama.generate as ReturnType<typeof vi.fn>).mock.calls[0];
      expect(callArgs).toBeDefined();
      const prompt = callArgs![0] as string;

      expect(prompt).toContain("First file content");
      expect(prompt).toContain("Second file content");
    });

    it("handles shell tool response with goal-based prompt", async () => {
      const shellResponse = {
        stdout: "Configuration file content",
        stderr: "",
        exitCode: 0,
        command: "cat config.json",
        cwd: "/sandbox",
      };

      const envelope: Envelope = {
        id: randomUUID(),
        from: "executor",
        to: "model-router",
        type: "node.execute",
        version: "1.0",
        timestamp: Date.now(),
        payload: {
          taskId: "t1",
          nodeId: "n1",
          type: "generate_text",
          service: "model-router",
          input: {},
          context: {
            _goal: "Analyze the configuration",
            configContent: shellResponse,
          },
        },
      };

      (generatorService as any).handleEnvelope(envelope);

      // Wait for async processing
      await new Promise((resolve) => setTimeout(resolve, 100));

      expect(mockOllama.generate).toHaveBeenCalled();
      const callArgs = (mockOllama.generate as ReturnType<typeof vi.fn>).mock.calls[0];
      expect(callArgs).toBeDefined();
      const prompt = callArgs![0] as string;

      expect(prompt).toContain("User goal: Analyze the configuration");
      expect(prompt).toContain("Configuration file content");
    });

    it("does not include stderr when empty", async () => {
      const shellResponse = {
        stdout: "Output content",
        stderr: "",
        exitCode: 0,
        command: "cat file.txt",
        cwd: "/sandbox",
      };

      const envelope: Envelope = {
        id: randomUUID(),
        from: "executor",
        to: "model-router",
        type: "node.execute",
        version: "1.0",
        timestamp: Date.now(),
        payload: {
          taskId: "t1",
          nodeId: "n1",
          type: "generate_text",
          service: "model-router",
          input: {
            prompt: "Process this",
          },
          context: {
            output: shellResponse,
          },
        },
      };

      (generatorService as any).handleEnvelope(envelope);

      // Wait for async processing
      await new Promise((resolve) => setTimeout(resolve, 100));

      expect(mockOllama.generate).toHaveBeenCalled();
      const callArgs = (mockOllama.generate as ReturnType<typeof vi.fn>).mock.calls[0];
      expect(callArgs).toBeDefined();
      const prompt = callArgs![0] as string;

      expect(prompt).toContain("Output content");
      expect(prompt).not.toContain("[stderr:");
    });

    it("handles shell tool response mixed with http_get response", async () => {
      const shellResponse = {
        stdout: "Local file content",
        stderr: "",
        exitCode: 0,
        command: "cat local.txt",
        cwd: "/sandbox",
      };

      const httpResponse = {
        status: 200,
        body: "Web page content",
        contentType: "text/html",
        finalUrl: "https://example.com",
        method: "GET",
        usedMethod: "fetch",
        responseTimeMs: 100,
      };

      const envelope: Envelope = {
        id: randomUUID(),
        from: "executor",
        to: "model-router",
        type: "node.execute",
        version: "1.0",
        timestamp: Date.now(),
        payload: {
          taskId: "t1",
          nodeId: "n1",
          type: "generate_text",
          service: "model-router",
          input: {
            prompt: "Compare local and web content",
          },
          context: {
            localFile: shellResponse,
            webContent: httpResponse,
          },
        },
      };

      (generatorService as any).handleEnvelope(envelope);

      // Wait for async processing
      await new Promise((resolve) => setTimeout(resolve, 100));

      expect(mockOllama.generate).toHaveBeenCalled();
      const callArgs = (mockOllama.generate as ReturnType<typeof vi.fn>).mock.calls[0];
      expect(callArgs).toBeDefined();
      const prompt = callArgs![0] as string;

      expect(prompt).toContain("Local file content");
      expect(prompt).toContain("Web page content");
    });
  });
});
