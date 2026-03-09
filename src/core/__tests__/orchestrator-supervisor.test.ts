import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { Orchestrator } from "../orchestrator.js";

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

describe("Supervisor Auto-Restart Logic", () => {
    let orchestrator: any;

    beforeEach(() => {
        vi.useFakeTimers();
        orchestrator = new Orchestrator();
        orchestrator.spawnProcess = vi.fn();
        vi.clearAllMocks();
    });

    afterEach(() => {
        vi.useRealTimers();
    });

    it("should not restart on clean exit (code 0)", () => {
        orchestrator.children.set("test-proc", {
            cp: null,
            scriptPath: "test.js",
            startTime: Date.now(),
            restartCount: 0
        });

        orchestrator["handleProcessExit"]("test-proc", 0, null);

        expect(orchestrator.children.has("test-proc")).toBe(false);
        expect(orchestrator.spawnProcess).not.toHaveBeenCalled();
    });

    it("should not restart on SIGTERM / SIGINT", () => {
        orchestrator.children.set("test-proc", {
            cp: null,
            scriptPath: "test.js",
            startTime: Date.now(),
            restartCount: 0
        });

        orchestrator["handleProcessExit"]("test-proc", null, "SIGTERM");

        expect(orchestrator.children.has("test-proc")).toBe(false);
        expect(orchestrator.spawnProcess).not.toHaveBeenCalled();
    });

    it("should restart on abnormal exit (code 1) with backoff", () => {
        orchestrator.children.set("test-proc", {
            cp: null,
            scriptPath: "test.js",
            startTime: Date.now(),
            restartCount: 0
        });

        orchestrator["handleProcessExit"]("test-proc", 1, null);

        // Uses setTimeout with delay `backoffTable = [1000, 2000, 5000, 10000, 30000]`
        // Since restartCount is 0, delay is 1000
        expect(orchestrator.spawnProcess).not.toHaveBeenCalled(); // not yet

        vi.advanceTimersByTime(1000);

        expect(orchestrator.spawnProcess).toHaveBeenCalledWith("test-proc", "test.js", 1);
        expect(mockConsoleLogger.warn).toHaveBeenCalledWith("core", expect.stringContaining("Restarting in 1000ms"));
    });

    it("should cap backoff limit at highest table value", () => {
        orchestrator.children.set("test-proc", {
            cp: null,
            scriptPath: "test.js",
            startTime: Date.now(),
            restartCount: 10
        });

        orchestrator["handleProcessExit"]("test-proc", null, "SIGKILL");

        // Limit should be 30000 (last element of [1000, 2000, 5000, 10000, 30000])
        expect(orchestrator.spawnProcess).not.toHaveBeenCalled();

        vi.advanceTimersByTime(29000);
        expect(orchestrator.spawnProcess).not.toHaveBeenCalled();

        vi.advanceTimersByTime(1000);
        expect(orchestrator.spawnProcess).toHaveBeenCalledWith("test-proc", "test.js", 11);
        expect(mockConsoleLogger.warn).toHaveBeenCalledWith("core", expect.stringContaining("Restarting in 30000ms"));
    });
});
