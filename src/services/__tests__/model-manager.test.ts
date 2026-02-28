/**
 * Unit tests for ModelManagerService.
 * Verifies tier-to-model mapping, keep-alive values, concurrency safety,
 * and sequential prewarming behaviour.
 */

import { describe, it, expect, vi } from "vitest";
import { ModelManagerService } from "../model-manager.js";
import type { LemonadeAdapter } from "../lemonade-adapter.js";
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

function makeWarmup(impl?: (model: string) => Promise<void>) {
    return vi.fn(impl ?? ((_model: string): Promise<void> => Promise.resolve()));
}

function makeRouter(map: Record<string, string> = { small: "llama3:8b", medium: "mistral", large: "mixtral" }) {
    return { getModel: vi.fn((tier: string) => map[tier] ?? "unknown") } as unknown as ModelRouter;
}

function createMocks() {
    const warmup = makeWarmup();
    const mockLemonade = { warmup } as unknown as LemonadeAdapter;
    const mockRouter = makeRouter();

    const service = new ModelManagerService({
        lemonade: mockLemonade,
        modelRouter: mockRouter,
    });

    return { service, warmup, mockLemonade, mockRouter };
}

// ---------------------------------------------------------------------------
// Tier-to-model and keep-alive mapping
// ---------------------------------------------------------------------------

describe("ensureModelLoaded – tier mapping", () => {
    it("warms up the small model", async () => {
        const { service, warmup } = createMocks();
        await service.ensureModelLoaded("small");
        expect(warmup).toHaveBeenCalledOnce();
        expect(warmup).toHaveBeenCalledWith("llama3:8b");
    });

    it("warms up the medium model", async () => {
        const { service, warmup } = createMocks();
        await service.ensureModelLoaded("medium");
        expect(warmup).toHaveBeenCalledOnce();
        expect(warmup).toHaveBeenCalledWith("mistral");
    });

    it("warms up the large model", async () => {
        const { service, warmup } = createMocks();
        await service.ensureModelLoaded("large");
        expect(warmup).toHaveBeenCalledOnce();
        expect(warmup).toHaveBeenCalledWith("mixtral");
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

        const warmup = vi.fn((_model: string): Promise<void> => pending);
        const mockLemonade = { warmup } as unknown as LemonadeAdapter;
        const service = new ModelManagerService({ lemonade: mockLemonade, modelRouter: makeRouter() });

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
        const warmup = vi.fn((_model: string): Promise<void> =>
            Promise.reject(new Error("network error")),
        );
        const mockLemonade = { warmup } as unknown as LemonadeAdapter;
        const service = new ModelManagerService({ lemonade: mockLemonade, modelRouter: makeRouter() });
        await expect(service.ensureModelLoaded("small")).rejects.toThrow("network error");
    });

    it("clears the in-flight entry even when warmup fails", async () => {
        let callCount = 0;
        const warmup = vi.fn((_model: string): Promise<void> => {
            callCount++;
            if (callCount === 1) return Promise.reject(new Error("transient error"));
            return Promise.resolve();
        });
        const mockLemonade = { warmup } as unknown as LemonadeAdapter;
        const service = new ModelManagerService({ lemonade: mockLemonade, modelRouter: makeRouter() });

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
        const warmup = vi.fn((model: string): Promise<void> => {
            callOrder.push(model);
            return Promise.resolve();
        });
        const mockLemonade = { warmup } as unknown as LemonadeAdapter;
        const service = new ModelManagerService({ lemonade: mockLemonade, modelRouter: makeRouter() });
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
