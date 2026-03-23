/**
 * Model Router: maps abstract complexity levels to Lemonade model names.
 * Per _docs/TECH.md: small -> qwen2.5:0.5b, medium -> qwen2.5:1.5b, large -> qwen2.5:7b.
 */

import { getConfig } from "../shared/config.js";

export type ComplexityLevel = "small" | "medium" | "large";

export interface ModelRouterConfig {
    small: string;
    medium: string;
    large: string;
}

export class ModelRouter {
    private readonly config: ModelRouterConfig;

    constructor(config?: Partial<ModelRouterConfig>) {
        const defaults = getConfig().modelRouter;
        this.config = { ...defaults, ...config };
    }

    /**
     * Return the Lemonade model name for the given complexity level.
     */
    getModel(complexity: ComplexityLevel): string {
        return this.config[complexity];
    }

    getConfig(): ModelRouterConfig {
        return { ...this.config };
    }
}
