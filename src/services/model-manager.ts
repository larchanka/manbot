/**
 * ModelManagerService: manages tiered Ollama model lifecycles.
 * Ensures models are loaded on demand with appropriate keep-alive settings,
 * with concurrency safety (deduplication of concurrent load calls).
 */

import { getConfig } from "../shared/config.js";
import { OllamaAdapter } from "./ollama-adapter.js";
import { ModelRouter } from "./model-router.js";

/** Model tier corresponds to the three tiers in ModelRouter. */
export type ModelTier = "small" | "medium" | "large";

export interface ModelManagerServiceOptions {
    ollama: OllamaAdapter;
    modelRouter: ModelRouter;
}

export class ModelManagerService {
    private readonly ollama: OllamaAdapter;
    private readonly modelRouter: ModelRouter;

    /**
     * In-flight warmup promises keyed by model name.
     * Prevents concurrent duplicate warmup calls for the same model.
     */
    private readonly inflight = new Map<string, Promise<void>>();

    constructor(opts: ModelManagerServiceOptions) {
        this.ollama = opts.ollama;
        this.modelRouter = opts.modelRouter;
    }

    /**
     * Ensure the model for the given tier is loaded.
     * Concurrent calls for the same model are deduplicated.
     */
    async ensureModelLoaded(tier: ModelTier): Promise<void> {
        const model = this.modelRouter.getModel(tier);
        const keepAlive = this.resolveKeepAlive(tier);

        // Reuse an in-flight warmup if one is already running for this model.
        const existing = this.inflight.get(model);
        if (existing) {
            return existing;
        }

        const promise = this.ollama
            .warmup(model, keepAlive)
            .finally(() => {
                this.inflight.delete(model);
            });

        this.inflight.set(model, promise);
        return promise;
    }

    /**
     * Sequentially pre-warm the small and medium models on startup.
     * Large model is loaded on demand only.
     */
    async prewarmModels(): Promise<void> {
        await this.ensureModelLoaded("small");
        await this.ensureModelLoaded("medium");
    }

    /**
     * Map a tier to its configured keep-alive value.
     * Small/Medium use infinite keep-alive (-1) per spec;
     * large uses the configured largeModelKeepAlive duration.
     */
    private resolveKeepAlive(tier: ModelTier): string | number {
        const cfg = getConfig().modelManager;
        switch (tier) {
            case "small":
                return cfg.smallModelKeepAlive;
            case "medium":
                return cfg.mediumModelKeepAlive;
            case "large":
                return cfg.largeModelKeepAlive;
        }
    }
}
