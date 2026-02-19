/**
 * Integration tests: GeneratorService + ModelManagerService interaction.
 * Verifies that inference requests correctly trigger model loading via
 * ModelManagerService.ensureModelLoaded before ollama.generate / ollama.chat.
 */

import { describe, it, expect, vi, beforeEach } from "vitest";
import { GeneratorService } from "../generator-service.js";
import { ModelManagerService } from "../model-manager.js";
import type { OllamaAdapter } from "../ollama-adapter.js";
import type { ModelRouter } from "../model-router.js";
import type { Envelope } from "../../shared/protocol.js";
import { randomUUID } from "node:crypto";

// ── helpers ──────────────────────────────────────────────────────────────────

function makeEnvelope(
    type: string,
    payload: Record<string, unknown>,
): Envelope {
    return {
        id: randomUUID(),
        from: "executor",
        to: "model-router",
        type,
        version: "1.0",
        timestamp: Date.now(),
        payload,
    };
}

function makeNodeExecute(
    overrides: Partial<{
        type: string;
        modelClass: string;
        prompt: string;
        context: Record<string, unknown>;
    }> = {},
): Envelope {
    return makeEnvelope("node.execute", {
        taskId: randomUUID(),
        nodeId: "n1",
        type: overrides.type ?? "generate_text",
        service: "model-router",
        input: { prompt: overrides.prompt ?? "Hello", modelClass: overrides.modelClass },
        context: overrides.context ?? {},
    });
}

// ── test setup ────────────────────────────────────────────────────────────────

function createIntegrationSetup() {
    const generate = vi.fn().mockResolvedValue({
        text: "mock response",
        prompt_eval_count: 5,
        eval_count: 10,
        done: true,
    });
    const chat = vi.fn().mockResolvedValue({
        message: { role: "assistant", content: "mock chat response" },
        prompt_eval_count: 5,
        eval_count: 10,
        done: true,
    });
    const warmup = vi.fn((_model: string, _keepAlive: string | number): Promise<void> => Promise.resolve());

    const mockOllama = { generate, chat, warmup } as unknown as OllamaAdapter;

    const getModel = vi.fn((tier: string) => {
        const map: Record<string, string> = {
            small: "llama3:8b",
            medium: "mistral",
            large: "mixtral",
        };
        return map[tier] ?? "mistral";
    });
    const mockRouter = { getModel } as unknown as ModelRouter;

    const modelManager = new ModelManagerService({
        ollama: mockOllama,
        modelRouter: mockRouter,
    });

    const ensureModelLoaded = vi.spyOn(modelManager, "ensureModelLoaded");

    const service = new GeneratorService({
        ollama: mockOllama,
        modelRouter: mockRouter,
        modelManager,
    });

    return { service, generate, chat, warmup, ensureModelLoaded, mockOllama, mockRouter };
}

// ── tests ─────────────────────────────────────────────────────────────────────

describe("GeneratorService + ModelManagerService integration", () => {
    let setup: ReturnType<typeof createIntegrationSetup>;

    beforeEach(() => {
        setup = createIntegrationSetup();
    });

    it("calls ensureModelLoaded before generate for the default (medium) tier", async () => {
        const { service, generate, ensureModelLoaded } = setup;

        const callOrder: string[] = [];
        ensureModelLoaded.mockImplementation(async () => { callOrder.push("ensure"); });
        generate.mockImplementation(async () => { callOrder.push("generate"); return { text: "ok", done: true }; });

        const envelope = makeNodeExecute();
        (service as unknown as { handleEnvelope: (e: Envelope) => void }).handleEnvelope(envelope);
        await new Promise((r) => setTimeout(r, 150));

        expect(callOrder).toEqual(["ensure", "generate"]);
    });

    it("passes the correct model tier (small) to ensureModelLoaded", async () => {
        const { service, ensureModelLoaded } = setup;
        const envelope = makeNodeExecute({ modelClass: "small" });
        (service as unknown as { handleEnvelope: (e: Envelope) => void }).handleEnvelope(envelope);
        await new Promise((r) => setTimeout(r, 150));
        expect(ensureModelLoaded).toHaveBeenCalledWith("small");
    });

    it("passes the correct model tier (large) to ensureModelLoaded", async () => {
        const { service, ensureModelLoaded } = setup;
        const envelope = makeNodeExecute({ modelClass: "large" });
        (service as unknown as { handleEnvelope: (e: Envelope) => void }).handleEnvelope(envelope);
        await new Promise((r) => setTimeout(r, 150));
        expect(ensureModelLoaded).toHaveBeenCalledWith("large");
    });

    it("does NOT call generate if ensureModelLoaded rejects", async () => {
        const { service, generate, ensureModelLoaded } = setup;
        ensureModelLoaded.mockRejectedValue(new Error("model load failed"));

        const envelope = makeNodeExecute();
        (service as unknown as { handleEnvelope: (e: Envelope) => void }).handleEnvelope(envelope);
        await new Promise((r) => setTimeout(r, 150));

        expect(generate).not.toHaveBeenCalled();
    });

    it("concurrent requests for the same tier deduplicate warmup calls", async () => {
        const { service, warmup } = setup;

        let resolveWarmup!: () => void;
        const pending = new Promise<void>((r) => { resolveWarmup = r; });
        warmup.mockReturnValue(pending);

        const env1 = makeNodeExecute({ modelClass: "medium" });
        const env2 = makeNodeExecute({ modelClass: "medium" });
        const handler = (service as unknown as { handleEnvelope: (e: Envelope) => void }).handleEnvelope.bind(service);
        handler(env1);
        handler(env2);

        // Only one warmup should have been dispatched.
        expect(warmup).toHaveBeenCalledTimes(1);

        resolveWarmup();
        await new Promise((r) => setTimeout(r, 150));
    });

    it("sends a response envelope after successful generation", async () => {
        const { service } = setup;
        const sendSpy = vi.spyOn(service as unknown as { send: (e: Envelope) => void }, "send");

        const envelope = makeNodeExecute({ prompt: "test prompt" });
        (service as unknown as { handleEnvelope: (e: Envelope) => void }).handleEnvelope(envelope);
        await new Promise((r) => setTimeout(r, 150));

        expect(sendSpy).toHaveBeenCalledOnce();
        const sent = sendSpy.mock.calls[0]![0] as Envelope;
        expect(sent.type).toBe("response");
        expect(sent.to).toBe(envelope.from);
    });
});
