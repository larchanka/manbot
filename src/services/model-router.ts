/**
 * Model Router: maps abstract complexity levels to Ollama model names.
 * Per _docs/TECH.md: small -> llama3:8b, medium -> mistral, large -> mixtral.
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
     * Return the Ollama model name for the given complexity level.
     */
    getModel(complexity: ComplexityLevel): string {
        return this.config[complexity];
    }

    getConfig(): ModelRouterConfig {
        return { ...this.config };
    }
}
