import { describe, it, expect, vi, beforeEach } from "vitest";
import { Orchestrator } from "../core/orchestrator.js";
import { randomUUID } from "node:crypto";
import { PROTOCOL_VERSION } from "../shared/protocol.js";

// Mock dependencies
vi.mock("../shared/config.js", () => ({
    getConfig: () => ({
        ollama: { baseUrl: "http://localhost:11434" },
        modelRouter: { plannerComplexity: "small" },
        taskMemory: { dbPath: ":memory:" },
        cron: { dbPath: ":memory:" },
        maxConcurrentTasks: 0
    })
}));

const mockConsoleLogger = vi.hoisted(() => ({
    info: vi.fn(),
    warn: vi.fn(),
    error: vi.fn(),
    debug: vi.fn(),
    ipc: vi.fn(),
    processEvent: vi.fn()
}));

vi.mock("../utils/console-logger.js", () => ({
    ConsoleLogger: mockConsoleLogger
}));

describe("Cron-to-AI Flow (E2E Mocked)", () => {
    let orchestrator: any;

    beforeEach(() => {
        orchestrator = new Orchestrator();

        // Mock child processes for PIPELINE
        const mockChild = (_name: string) => ({
            stdin: { writable: true, write: vi.fn() },
            cp: { pid: randomUUID() },
            scriptPath: "mock.js",
            startTime: Date.now(),
            restartCount: 0
        });

        // Add required children for the pipeline
        orchestrator.children.set("planner", mockChild("planner"));
        orchestrator.children.set("task-memory", mockChild("task-memory"));
        orchestrator.children.set("executor", mockChild("executor"));
        orchestrator.children.set("telegram-adapter", mockChild("telegram-adapter"));
        orchestrator.children.set("model-router", mockChild("model-router"));

        // Mock sendAndWait to return successful responses from these mock processes
        orchestrator.sendAndWait = vi.fn().mockImplementation((_target: any, type: string, _payload: any) => {
            if (type === "plan.create") {
                return Promise.resolve({
                    payload: {
                        result: {
                            nodes: [{ id: "n1", type: "generate_text", service: "model-router", input: {} }],
                            complexity: "small"
                        }
                    }
                });
            }
            if (type === "task.create") {
                return Promise.resolve({ payload: { status: "success" } });
            }
            if (type === "plan.execute") {
                return Promise.resolve({ payload: { result: "Cron Job Execution Succeeded" } });
            }
            if (type === "task.getByConversationId") {
                return Promise.resolve({ payload: { status: "success", result: { tasks: [] } } });
            }

            return Promise.resolve({ payload: { status: "unknown" } });
        });

        // Mock Telegram to prevent actual network calls, we verify it is called
        orchestrator.sendToTelegram = vi.fn();

        vi.clearAllMocks();
    });

    it("should process event.cron.ai_query through the task pipeline successfully", async () => {
        const query = "Run daily digest";
        const chatId = 1001;
        const userId = 2002;

        const envelope = {
            id: randomUUID(),
            timestamp: Date.now(),
            from: "cron-manager",
            to: "core",
            type: "event.cron.ai_query",
            version: PROTOCOL_VERSION,
            payload: {
                query,
                chatId,
                userId
            }
        };

        orchestrator.handleCronAIQueryEvent(envelope);

        // Wait for asynchronous pipeline execution
        await new Promise((resolve) => setTimeout(resolve, 50));

        // Verify that planner was called
        expect(orchestrator.sendAndWait).toHaveBeenCalledWith(
            expect.objectContaining({ scriptPath: "mock.js" }), // the planner child
            "plan.create",
            expect.objectContaining({ goal: query })
        );

        // Verify task memory was hit
        expect(orchestrator.sendAndWait).toHaveBeenCalledWith(
            expect.anything(),
            "task.create",
            expect.objectContaining({ goal: query })
        );

        // Verify executor was hit
        expect(orchestrator.sendAndWait).toHaveBeenCalledWith(
            expect.anything(),
            "plan.execute",
            expect.objectContaining({ goal: query })
        );

        // Verify results were sent to Telegram
        expect(orchestrator.sendToTelegram).toHaveBeenCalledWith(
            chatId,
            "Cron Job Execution Succeeded",
            false,
            "Markdown"
        );
    });
});
