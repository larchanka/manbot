/**
 * Generator Service: handles node.execute for generate_text and summarize.
 * Used by Executor when dispatching to "model-router"; calls Lemonade via ModelRouter.
 * P6-04: summarize type uses summarizer prompt for memory extraction.
 */

import { randomUUID } from "node:crypto";
import { BaseProcess } from "../shared/base-process.js";
import type { Envelope } from "../shared/protocol.js";
import { PROTOCOL_VERSION } from "../shared/protocol.js";
import { responsePayloadSchema } from "../shared/protocol.js";
import { buildSummarizerPrompt, SUMMARIZER_SYSTEM_PROMPT } from "../agents/prompts/summarizer.js";
import { ANALYZER_SYSTEM_PROMPT, buildAnalyzerUserPrompt } from "../agents/prompts/analyzer.js";
import { DEFAULT_TELEGRAM_SYSTEM_PROMPT, TELEGRAM_HTML_FORMAT_INSTRUCTION } from "../agents/prompts/telegram-html.js";

/** Inline reminder appended to user prompts so the LLM sees formatting rules in the most prominent position. */
const HTML_PROMPT_SUFFIX = `\n\n${TELEGRAM_HTML_FORMAT_INSTRUCTION}\n\nNEVER use Markdown formatting. NEVER use plain JSON.`;
import { LemonadeAdapter, type ChatMessage } from "./lemonade-adapter.js";
import { ModelRouter } from "./model-router.js";
import { ModelManagerService, type ModelTier } from "./model-manager.js";

const NODE_EXECUTE = "node.execute";
const PROCESS_NAME = "model-router";

interface NodeExecutePayload {
    taskId: string;
    nodeId: string;
    type: string;
    service: string;
    input: Record<string, unknown>;
    context?: Record<string, unknown>;
}

export class GeneratorService extends BaseProcess {
    private readonly lemonade: LemonadeAdapter;
    private readonly modelRouter: ModelRouter;
    private readonly modelManager: ModelManagerService | null;

    constructor(options?: { lemonade?: LemonadeAdapter; modelRouter?: ModelRouter; modelManager?: ModelManagerService }) {
        super({ processName: PROCESS_NAME });
        this.lemonade = options?.lemonade ?? new LemonadeAdapter();
        this.modelRouter = options?.modelRouter ?? new ModelRouter();
        this.modelManager = options?.modelManager ?? null;
    }

    protected override handleEnvelope(envelope: Envelope): void {
        if (envelope.type !== NODE_EXECUTE || envelope.to !== PROCESS_NAME) return;

        const payload = envelope.payload as Record<string, unknown>;
        const p = payload as unknown as NodeExecutePayload;
        // Accept generate_text, generate, summarize; also "model-router" (planner sometimes uses service name as type)
        const isGenerate =
            p.type === "generate_text" || p.type === "generate" || p.type === "summarize" || p.type === "model-router";
        if (!isGenerate) {
            this.sendError(envelope, "UNSUPPORTED_TYPE", `Generator only handles generate_text, generate, summarize; got ${p.type}`);
            return;
        }

        (async () => {
            let model = "unknown";
            let prompt = "";
            let messages: ChatMessage[] | undefined;
            try {
                // Check for modelClass in input, then fallback to _complexity from context, then default to "medium"
                const modelClass = (p.input?.modelClass as string) ??
                    (p.context?._complexity as string) ??
                    "medium";
                const tier = modelClass as ModelTier;
                model = this.modelRouter.getModel(tier);

                // Ensure the model is loaded before inference.
                if (this.modelManager) {
                    await this.modelManager.ensureModelLoaded(tier);
                }
                const context = (p.context ?? {}) as Record<string, unknown>;
                const goal = context["_goal"] as string | undefined;
                let systemPrompt: string | undefined;
                if (p.type === "summarize") {
                    const chatHistory =
                        (typeof p.input?.chatHistory === "string" && p.input.chatHistory) ||
                        (context && typeof context.chatHistory === "string" && context.chatHistory) ||
                        "";
                    prompt = buildSummarizerPrompt(chatHistory);
                    systemPrompt = SUMMARIZER_SYSTEM_PROMPT;
                } else if (typeof p.input?.prompt === "string") {
                    // When there's an explicit prompt, still include dependency outputs if available
                    const depOutputs = Object.entries(context)
                        .filter(([k]) => !k.startsWith("_"))
                        .map(([, v]) => {
                            // Extract body from http_get responses
                            if (v && typeof v === "object" && "body" in v && typeof v.body === "string") {
                                return v.body;
                            }
                            // Extract stdout from shell tool responses
                            if (v && typeof v === "object" && "stdout" in v && typeof v.stdout === "string") {
                                const shellResult = v as { stdout: string; stderr?: string };
                                // Include stderr in context if present (for debugging)
                                if (shellResult.stderr && shellResult.stderr.trim()) {
                                    return `${shellResult.stdout}\n\n[stderr: ${shellResult.stderr}]`;
                                }
                                return shellResult.stdout;
                            }
                            // For strings, return as-is
                            if (typeof v === "string") {
                                return v;
                            }
                            // For other objects, stringify
                            return JSON.stringify(v);
                        });
                    if (depOutputs.length > 0) {
                        prompt = `${p.input.prompt}\n\nContent:\n${depOutputs.join("\n\n")}`;
                    } else {
                        prompt = p.input.prompt;
                    }
                    // Append HTML reminder unless a specialized system prompt handles formatting
                    if (!p.input?.system_prompt) {
                        prompt += HTML_PROMPT_SUFFIX;
                    }
                    if (typeof p.input?.system_prompt === "string") {
                        systemPrompt = p.input.system_prompt === "analyzer" ? ANALYZER_SYSTEM_PROMPT : p.input.system_prompt;
                        // If it's an analyzer prompt, use the specialized user prompt builder
                        if (p.input.system_prompt === "analyzer") {
                            prompt = buildAnalyzerUserPrompt(goal ?? p.input.prompt as string, depOutputs.join("\n\n"));
                        }
                    }
                } else if (goal && (context["_criticFeedback"] != null || context["_previousDraft"] != null)) {
                    const feedback = context["_criticFeedback"] as string | undefined;
                    const previous = context["_previousDraft"] as string | undefined;
                    prompt = `User goal: ${goal}\n\nPrevious draft:\n${previous ?? ""}\n\nCritic feedback:\n${feedback ?? ""}\n\nProduce an improved draft that addresses the feedback. Output only the improved text.${HTML_PROMPT_SUFFIX}`;
                    if (!systemPrompt) systemPrompt = DEFAULT_TELEGRAM_SYSTEM_PROMPT;
                } else if (goal) {
                    const depOutputs = Object.entries(context)
                        .filter(([k]) => !k.startsWith("_"))
                        .map(([, v]) => {
                            // Extract body from http_get responses
                            if (v && typeof v === "object" && "body" in v && typeof v.body === "string") {
                                return v.body;
                            }
                            // Extract stdout from shell tool responses
                            if (v && typeof v === "object" && "stdout" in v && typeof v.stdout === "string") {
                                const shellResult = v as { stdout: string; stderr?: string };
                                // Include stderr in context if present (for debugging)
                                if (shellResult.stderr && shellResult.stderr.trim()) {
                                    return `${shellResult.stdout}\n\n[stderr: ${shellResult.stderr}]`;
                                }
                                return shellResult.stdout;
                            }
                            // For strings, return as-is
                            if (typeof v === "string") {
                                return v;
                            }
                            // For other objects, stringify
                            return JSON.stringify(v);
                        });
                    prompt = `User goal: ${goal}\n\nContext from previous steps:\n${depOutputs.join("\n\n")}\n\nProduce a direct response to the goal. Output only the response text. Format HTML, available tags:\n${HTML_PROMPT_SUFFIX}`;
                } else {
                    const depOutputs = Object.values(context).map((v) => {
                        // Extract body from http_get responses
                        if (v && typeof v === "object" && "body" in v && typeof v.body === "string") {
                            return v.body;
                        }
                        // Extract stdout from shell tool responses
                        if (v && typeof v === "object" && "stdout" in v && typeof v.stdout === "string") {
                            const shellResult = v as { stdout: string; stderr?: string };
                            // Include stderr in context if present (for debugging)
                            if (shellResult.stderr && shellResult.stderr.trim()) {
                                return `${shellResult.stdout}\n\n[stderr: ${shellResult.stderr}]`;
                            }
                            return shellResult.stdout;
                        }
                        // For strings, return as-is
                        if (typeof v === "string") {
                            return v;
                        }
                        // For other objects, stringify
                        return JSON.stringify(v);
                    });
                    prompt = (depOutputs.join("\n\n") || "Generate a brief response.") + HTML_PROMPT_SUFFIX;
                }
                if (p.input?.messages && Array.isArray(p.input.messages)) {
                    messages = p.input.messages as ChatMessage[];

                    // Externally-provided messages (e.g. skill loop) may have the HTML
                    // formatting instruction buried deep in a long system prompt.
                    // Re-inject the reminder into the most prominent position so the LLM
                    // actually follows it: append to the last non-assistant message.
                    const lastIdx = messages.length - 1;
                    if (lastIdx >= 0) {
                        const last = messages[lastIdx]!;
                        const role = last.role;
                        if ((role === "user" || role === "tool") && typeof last.content === "string") {
                            // Only append if not already present
                            if (!last.content.includes("TELEGRAM HTML FORMATTING")) {
                                messages = [...messages];
                                messages[lastIdx] = { ...last, content: last.content + HTML_PROMPT_SUFFIX };
                            }
                        }
                    }
                }

                if (!messages) {
                    // Always inject a system prompt to ensure Telegram HTML output.
                    // Falls back to the default Telegram formatting prompt when no specific one is set.
                    const effectiveSystemPrompt = systemPrompt ?? DEFAULT_TELEGRAM_SYSTEM_PROMPT;
                    messages = [{ role: "system" as const, content: effectiveSystemPrompt }, { role: "user" as const, content: prompt }];
                }

                const genResult = await this.lemonade.chat(messages, model, {
                    tools: p.input?.tools as any[],
                });

                const text = genResult.message.content;
                const tool_calls = genResult.message.tool_calls;
                this.sendResponse(envelope, {
                    text,
                    tool_calls,
                    usage: genResult.usage
                });
            } catch (err) {
                const message = err instanceof Error ? err.message : String(err);
                const isTimeout = err instanceof Error && (err.name === "AbortError" || message.includes("aborted") || message.includes("timeout"));
                const errorCode = isTimeout ? "GENERATOR_TIMEOUT" : "GENERATOR_ERROR";

                const details: Record<string, unknown> = {
                    originalError: message,
                    isTimeout,
                    model,
                    promptLength: prompt.length,
                    messageCount: messages?.length ?? 0
                };
                if (err instanceof Error && err.stack) {
                    details.stack = err.stack;
                }
                this.sendError(envelope, errorCode, message, details);
            }
        })();
    }

    private sendResponse(request: Envelope, result: unknown): void {
        const payload = responsePayloadSchema.parse({ status: "success", result });
        this.send({
            id: randomUUID(),
            correlationId: request.id,
            from: this.processName,
            to: request.from,
            type: "response",
            version: PROTOCOL_VERSION,
            timestamp: Date.now(),
            payload,
        });
    }

    private sendError(request: Envelope, code: string, message: string, details: Record<string, unknown> = {}): void {
        this.send({
            id: randomUUID(),
            correlationId: request.id,
            from: this.processName,
            to: request.from,
            type: "error",
            version: PROTOCOL_VERSION,
            timestamp: Date.now(),
            payload: { code, message, details },
        });
    }
}

function main(): void {
    const service = new GeneratorService();
    service.start();
}

main();
