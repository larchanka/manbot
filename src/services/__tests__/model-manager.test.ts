/**
 * Unit tests for ModelManagerService.
 * Verifies tier-to-model mapping, keep-alive values, concurrency safety,
 * and sequential prewarming behaviour.
 */

import { describe, it, expect, vi, beforeEach } from "vitest";
import { ModelManagerService } from "../model-manager.js";
import type { OllamaAdapter } from "../ollama-adapter.js";
import type { ModelRouter } from "../model-router.js";

// Mock getConfig so tests don't depend on config.json on disk.
vi.mock("../../shared/config.js", () => ({
    getConfig: () => ({
        modelManager: {
            smallModelKeepAlive: "10m",
            mediumModelKeepAlive: "30m",
            largeModelKeepAlive: "5m",
            warmupPrompt: "hello",
        },
    }),
}));

function createMocks() {
    const warmup = vi.fn<[string, string | number], Promise<void>>().mockResolvedValue(undefined);
    const mockOllama = { warmup } as unknown as OllamaAdapter;

    const getModel = vi.fn((tier: string) => {
        const map: Record<string, string> = {
            small: "llama3:8b",
            medium: "mistral",
            large: "mixtral",
        };
        return map[tier] ?? "unknown";
    });
    const mockRouter = { getModel } as unknown as ModelRouter;

    const service = new ModelManagerService({
        ollama: mockOllama,
        modelRouter: mockRouter,
    });

    return { service, warmup, getModel };
}

// ---------------------------------------------------------------------------
// Tier-to-model and keep-alive mapping
// ---------------------------------------------------------------------------

describe("ensureModelLoaded – tier mapping", () => {
    it("warms up the small model with small keep-alive", async () => {
        const { service, warmup } = createMocks();
        await service.ensureModelLoaded("small");
        expect(warmup).toHaveBeenCalledOnce();
        expect(warmup).toHaveBeenCalledWith("llama3:8b", "10m");
    });

    it("warms up the medium model with medium keep-alive", async () => {
        const { service, warmup } = createMocks();
        await service.ensureModelLoaded("medium");
        expect(warmup).toHaveBeenCalledOnce();
        expect(warmup).toHaveBeenCalledWith("mistral", "30m");
    });

    it("warms up the large model with large keep-alive", async () => {
        const { service, warmup } = createMocks();
        await service.ensureModelLoaded("large");
        expect(warmup).toHaveBeenCalledOnce();
        expect(warmup).toHaveBeenCalledWith("mixtral", "5m");
    });
});

// ---------------------------------------------------------------------------
// Concurrency safety: concurrent calls for the same model are deduplicated
// ---------------------------------------------------------------------------

describe("ensureModelLoaded – concurrency deduplication", () => {
    it("only calls warmup once when called concurrently for the same tier", async () => {
        let resolveWarmup!: () => void;
        const pending = new Promise<void>((res) => {
            resolveWarmup = res;
        });

        const warmup = vi.fn<[string, string | number], Promise<void>>().mockReturnValue(pending);
        const mockOllama = { warmup } as unknown as OllamaAdapter;
        const mockRouter = {
            getModel: vi.fn(() => "llama3:8b"),
        } as unknown as ModelRouter;

        const service = new ModelManagerService({ ollama: mockOllama, modelRouter: mockRouter });

        // Start three concurrent calls.
        const p1 = service.ensureModelLoaded("small");
        const p2 = service.ensureModelLoaded("small");
        const p3 = service.ensureModelLoaded("small");

        // Warmup should only have been called once so far.
        expect(warmup).toHaveBeenCalledOnce();

        resolveWarmup();
        await Promise.all([p1, p2, p3]);

        // Still only one call after all settle.
        expect(warmup).toHaveBeenCalledOnce();
    });

    it("allows a second warmup call after the first settles", async () => {
        const { service, warmup } = createMocks();

        await service.ensureModelLoaded("small");
        expect(warmup).toHaveBeenCalledTimes(1);

        // A second call after the first completed should trigger a fresh warmup.
        await service.ensureModelLoaded("small");
        expect(warmup).toHaveBeenCalledTimes(2);
    });

    it("concurrent calls for different tiers each call warmup once", async () => {
        const { service, warmup } = createMocks();

        await Promise.all([
            service.ensureModelLoaded("small"),
            service.ensureModelLoaded("medium"),
            service.ensureModelLoaded("large"),
        ]);

        expect(warmup).toHaveBeenCalledTimes(3);
    });
});

// ---------------------------------------------------------------------------
// Error handling
// ---------------------------------------------------------------------------

describe("ensureModelLoaded – error propagation", () => {
    it("rejects when warmup fails", async () => {
        const warmup = vi.fn<[string, string | number], Promise<void>>().mockRejectedValue(
            new Error("network error"),
        );
        const mockOllama = { warmup } as unknown as OllamaAdapter;
        const mockRouter = {
            getModel: vi.fn(() => "llama3:8b"),
        } as unknown as ModelRouter;

        const service = new ModelManagerService({ ollama: mockOllama, modelRouter: mockRouter });
        await expect(service.ensureModelLoaded("small")).rejects.toThrow("network error");
    });

    it("clears the in-flight entry even when warmup fails", async () => {
        let callCount = 0;
        const warmup = vi.fn<[string, string | number], Promise<void>>().mockImplementation(() => {
            callCount++;
            if (callCount === 1) return Promise.reject(new Error("transient error"));
            return Promise.resolve();
        });
        const mockOllama = { warmup } as unknown as OllamaAdapter;
        const mockRouter = {
            getModel: vi.fn(() => "llama3:8b"),
        } as unknown as ModelRouter;

        const service = new ModelManagerService({ ollama: mockOllama, modelRouter: mockRouter });

        await expect(service.ensureModelLoaded("small")).rejects.toThrow("transient error");
        // After initial failure, a retry should succeed.
        await expect(service.ensureModelLoaded("small")).resolves.toBeUndefined();
        expect(warmup).toHaveBeenCalledTimes(2);
    });
});

// ---------------------------------------------------------------------------
// prewarmModels: sequential loading of small then medium
// ---------------------------------------------------------------------------

describe("prewarmModels", () => {
    it("warms up small before medium, in order", async () => {
        const callOrder: string[] = [];
        const warmup = vi.fn<[string, string | number], Promise<void>>().mockImplementation(
            (model) => {
                callOrder.push(model);
                return Promise.resolve();
            },
        );
        const mockOllama = { warmup } as unknown as OllamaAdapter;
        const mockRouter = {
            getModel: vi.fn((tier: string) => {
                const map: Record<string, string> = { small: "llama3:8b", medium: "mistral", large: "mixtral" };
                return map[tier];
            }),
        } as unknown as ModelRouter;

        const service = new ModelManagerService({ ollama: mockOllama, modelRouter: mockRouter });
        await service.prewarmModels();

        expect(callOrder).toEqual(["llama3:8b", "mistral"]);
        // Large model NOT prewarmed.
        expect(callOrder).not.toContain("mixtral");
    });

    it("calls warmup exactly twice (small + medium)", async () => {
        const { service, warmup } = createMocks();
        await service.prewarmModels();
        expect(warmup).toHaveBeenCalledTimes(2);
    });
});
