/**
 * ModelManagerService: manages tiered Lemonade model lifecycles.
 * Ensures models are loaded on demand,
 * with concurrency safety (deduplication of concurrent load calls).
 */


import { LemonadeAdapter } from "./lemonade-adapter.js";
import { ModelRouter } from "./model-router.js";

/** Model tier corresponds to the three tiers in ModelRouter. */
export type ModelTier = "small" | "medium" | "large";

export interface ModelManagerServiceOptions {
    lemonade: LemonadeAdapter;
    modelRouter: ModelRouter;
}

export class ModelManagerService {
    private readonly lemonade: LemonadeAdapter;
    private readonly modelRouter: ModelRouter;

    /**
     * In-flight warmup promises keyed by model name.
     * Prevents concurrent duplicate warmup calls for the same model.
     */
    private readonly inflight = new Map<string, Promise<void>>();

    constructor(opts: ModelManagerServiceOptions) {
        this.lemonade = opts.lemonade;
        this.modelRouter = opts.modelRouter;
    }

    /**
     * Ensure the model for the given tier is loaded.
     * Concurrent calls for the same model are deduplicated.
     */
    async ensureModelLoaded(tier: ModelTier): Promise<void> {
        const model = this.modelRouter.getModel(tier);

        // Reuse an in-flight warmup if one is already running for this model.
        const existing = this.inflight.get(model);
        if (existing) {
            return existing;
        }

        const promise = this.lemonade
            .warmup(model)
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
}
