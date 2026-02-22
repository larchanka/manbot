import { describe, it, expect, vi, beforeEach } from 'vitest';
import { Orchestrator } from '../orchestrator.js';
import { getConfig } from '../../shared/config.js';

// Mock dependencies
vi.mock('../../shared/config', () => ({
    getConfig: vi.fn(),
}));

vi.mock('../../utils/console-logger', () => ({
    ConsoleLogger: {
        info: vi.fn(),
        warn: vi.fn(),
        error: vi.fn(),
        ipc: vi.fn(),
        success: vi.fn(),
    },
}));

// We need to mock the adapter and services that Orchestrator initializes in its constructor
vi.mock('../../adapters/ollama-adapter', () => ({
    OllamaAdapter: vi.fn().mockImplementation(function () { return {}; }),
}));

vi.mock('../model-router', () => ({
    ModelRouter: vi.fn().mockImplementation(function () { return {}; }),
}));

vi.mock('../../services/model-manager', () => ({
    ModelManagerService: vi.fn().mockImplementation(function () { return {}; }),
}));

describe('Orchestrator Concurrency', () => {
    let orchestrator: Orchestrator;

    beforeEach(() => {
        vi.clearAllMocks();
        (getConfig as any).mockReturnValue({
            maxConcurrentTasks: 1,
            ollama: { baseUrl: 'http://localhost:11434', timeoutMs: 60000 },
            modelRouter: { modelTiers: {} },
        });
        orchestrator = new Orchestrator();
    });

    it('should process human tasks sequentially when limit is 1', async () => {
        const runTaskPipelineSpy = vi.spyOn(orchestrator as any, 'runTaskPipeline');

        // Controlled promise to simulate long running task
        let resolveTask1: (value: unknown) => void;
        const task1Promise = new Promise((resolve) => { resolveTask1 = resolve; });

        runTaskPipelineSpy.mockImplementationOnce(() => task1Promise);
        runTaskPipelineSpy.mockImplementationOnce(() => Promise.resolve());

        // Enqueue two human tasks (priority 1)
        (orchestrator as any).enqueueTask({ chatId: 1, userId: 1, goal: 'task1', priority: 1 });
        (orchestrator as any).enqueueTask({ chatId: 1, userId: 1, goal: 'task2', priority: 1 });

        // Verify only task 1 started
        expect(runTaskPipelineSpy).toHaveBeenCalledTimes(1);
        expect(runTaskPipelineSpy).toHaveBeenCalledWith(1, 1, 'task1', undefined, undefined);

        // Complete task 1
        resolveTask1!(null);
        await new Promise(process.nextTick); // Let promises settle

        // Verify task 2 started
        expect(runTaskPipelineSpy).toHaveBeenCalledTimes(2);
        expect(runTaskPipelineSpy).toHaveBeenLastCalledWith(1, 1, 'task2', undefined, undefined);
    });

    it('should prioritize human tasks over synthetic tasks', async () => {
        const runTaskPipelineSpy = vi.spyOn(orchestrator as any, 'runTaskPipeline');

        // Controlled promise to simulate long running task
        let resolveTask1: (value: unknown) => void;
        const task1Promise = new Promise((resolve) => { resolveTask1 = resolve; });

        runTaskPipelineSpy.mockImplementationOnce(() => task1Promise);
        runTaskPipelineSpy.mockImplementation(() => Promise.resolve());

        // 1. Start a slow synthetic task (priority 0)
        (orchestrator as any).enqueueTask({ chatId: 1, userId: 1, goal: 'synthetic1', priority: 0 });

        // 2. Enqueue another synthetic task
        (orchestrator as any).enqueueTask({ chatId: 1, userId: 1, goal: 'synthetic2', priority: 0 });

        // 3. Enqueue a human task (priority 1)
        (orchestrator as any).enqueueTask({ chatId: 1, userId: 1, goal: 'human1', priority: 1 });

        // Verify only synthetic1 started
        expect(runTaskPipelineSpy).toHaveBeenCalledTimes(1);
        expect(runTaskPipelineSpy).toHaveBeenCalledWith(1, 1, 'synthetic1', undefined, undefined);

        // Controlled promise to simulate long running task 2 (human)
        let resolveTask2: (value: unknown) => void;
        const task2Promise = new Promise((resolve) => { resolveTask2 = resolve; });
        runTaskPipelineSpy.mockImplementationOnce(() => task2Promise);

        // Complete synthetic1
        resolveTask1!(null);
        await new Promise(process.nextTick);

        // Verify human1 started next (pushed to front)
        expect(runTaskPipelineSpy).toHaveBeenCalledTimes(2);
        expect(runTaskPipelineSpy).toHaveBeenCalledWith(1, 1, 'human1', undefined, undefined);

        // Complete human1
        resolveTask2!(null);
        await new Promise(process.nextTick);
        expect(runTaskPipelineSpy).toHaveBeenCalledTimes(3);
        expect(runTaskPipelineSpy).toHaveBeenCalledWith(1, 1, 'synthetic2', undefined, undefined);
    });

    it('should run immediately if limit is 0', async () => {
        (getConfig as any).mockReturnValue({
            maxConcurrentTasks: 0,
        });

        const runTaskPipelineSpy = vi.spyOn(orchestrator as any, 'runTaskPipeline').mockResolvedValue(null);

        (orchestrator as any).enqueueTask({ chatId: 1, userId: 1, goal: 'task1', priority: 1 });
        (orchestrator as any).enqueueTask({ chatId: 2, userId: 2, goal: 'task2', priority: 1 });

        expect(runTaskPipelineSpy).toHaveBeenCalledTimes(2);
    });
});
