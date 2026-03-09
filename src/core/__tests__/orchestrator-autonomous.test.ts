import { describe, it, expect, vi, beforeEach } from "vitest";
import { Orchestrator } from "../orchestrator.js";
import { randomUUID } from "node:crypto";
import { PROTOCOL_VERSION } from "../../shared/protocol.js";

// Mock dependencies
vi.mock("../../shared/config.js", () => ({
    getConfig: () => ({
        lemonade: { baseUrl: "http://localhost:11434" },
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

vi.mock("../../utils/console-logger.js", () => ({
    ConsoleLogger: mockConsoleLogger
}));

// We need to partially mock Orchestrator to avoid spawning real children in this test
describe("Orchestrator Autonomous Ingestion", () => {
    let orchestrator: any;

    beforeEach(() => {
        orchestrator = new Orchestrator();
        // Mock runTaskPipeline to just resolve
        orchestrator.runTaskPipeline = vi.fn().mockResolvedValue(undefined);
        orchestrator.sendToTelegram = vi.fn();
        vi.clearAllMocks();
    });

    it("should handle event.cron.ai_query and route to pipeline with a new taskId", () => {
        const query = "What is the time?";
        const chatId = 12345;
        const userId = 67890;

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

        expect(orchestrator.runTaskPipeline).toHaveBeenCalledWith(
            chatId,
            userId,
            query,
            String(chatId),
            expect.any(String) // taskId
        );
    });

    it("should log a warning if query or chatId is missing", () => {
        const envelope = {
            id: randomUUID(),
            from: "cron-manager",
            type: "event.cron.ai_query",
            payload: { chatId: 123 } // missing query
        };

        orchestrator.handleCronAIQueryEvent(envelope as any);

        expect(mockConsoleLogger.warn).toHaveBeenCalledWith(
            "core",
            expect.stringContaining("missing query"),
            expect.anything()
        );
        expect(orchestrator.runTaskPipeline).not.toHaveBeenCalled();
    });
});
