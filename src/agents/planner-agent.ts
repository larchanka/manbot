/**
 * Planner Agent: converts user intent into a structured execution DAG.
 * Listens for plan.create, uses Ollama Adapter + Model Router, validates DAG, emits response.
 */

import { randomUUID } from "node:crypto";
import { BaseProcess } from "../shared/base-process.js";
import type { CapabilityGraph } from "../shared/graph-utils.js";
import { validateGraph } from "../shared/graph-utils.js";
import type { Envelope } from "../shared/protocol.js";
import { responsePayloadSchema } from "../shared/protocol.js";
import { buildPlannerPrompt } from "./prompts/planner.js";
import { ModelRouter } from "../services/model-router.js";
import { OllamaAdapter } from "../services/ollama-adapter.js";

const PLAN_CREATE = "plan.create";

interface PlanCreatePayload {
  goal?: string;
  message?: string;
  complexity?: "small" | "medium" | "large";
  /** When set, a previous attempt failed; use this to produce a corrected plan. */
  previousError?: string;
  /** Optional previous plan that failed (object). Will be stringified for the prompt. */
  previousPlan?: Record<string, unknown>;
  /** Optional conversation history for context. */
  history?: string;
}

function extractJson(text: string): string {
  let s = text.trim();
  const start = s.indexOf("{");
  const end = s.lastIndexOf("}");
  if (start !== -1 && end !== -1 && end > start) {
    s = s.slice(start, end + 1);
  }
  return s;
}

export class PlannerAgent extends BaseProcess {
  private readonly ollama: OllamaAdapter;
  private readonly modelRouter: ModelRouter;

  constructor(options?: { ollama?: OllamaAdapter; modelRouter?: ModelRouter }) {
    super({ processName: "planner" });
    this.ollama = options?.ollama ?? new OllamaAdapter();
    this.modelRouter = options?.modelRouter ?? new ModelRouter();
  }

  protected override handleEnvelope(envelope: Envelope): void {
    if (envelope.type !== PLAN_CREATE) return;

    const payload = envelope.payload as Record<string, unknown>;
    const p = payload as unknown as PlanCreatePayload;
    const goal = p.goal ?? p.message ?? "";
    const complexity = p.complexity ?? "medium";

    if (!goal || typeof goal !== "string") {
      this.sendError(envelope, "INVALID_PAYLOAD", "plan.create requires goal or message");
      return;
    }

    (async () => {
      try {
        const model = this.modelRouter.getModel(complexity);
        const previousError = typeof p.previousError === "string" ? p.previousError : undefined;
        const previousPlanJson =
          p.previousPlan && typeof p.previousPlan === "object"
            ? JSON.stringify(p.previousPlan, null, 2)
            : undefined;
        const promptOptions = {
          ...(previousError && { previousError }),
          ...(previousPlanJson && { previousPlanJson }),
          ...(p.history && { conversationHistory: p.history }),
        };
        const prompt = buildPlannerPrompt(goal, promptOptions);
        const messages = [
          { role: "system" as const, content: "You output only valid JSON. No markdown, no explanation." },
          { role: "user" as const, content: prompt },
        ];
        const result = await this.ollama.chat(messages, model);
        const raw = result.message?.content ?? "";
        const jsonStr = extractJson(raw);
        const dag = JSON.parse(jsonStr) as CapabilityGraph;

        if (!dag.nodes || !Array.isArray(dag.nodes)) {
          this.sendError(envelope, "INVALID_DAG", "Model output missing nodes array");
          return;
        }

        const validation = validateGraph(dag);
        if (!validation.valid) {
          this.sendError(envelope, "DAG_VALIDATION_FAILED", validation.errors.join("; "));
          return;
        }

        this.sendResponse(envelope, dag);
      } catch (err) {
        const message = err instanceof Error ? err.message : String(err);
        this.sendError(envelope, "PLANNER_ERROR", message);
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
      version: "1.0",
      timestamp: Date.now(),
      payload,
    });
  }

  private sendError(request: Envelope, code: string, message: string): void {
    this.send({
      id: randomUUID(),
      correlationId: request.id,
      from: this.processName,
      to: request.from,
      type: "error",
      version: "1.0",
      timestamp: Date.now(),
      payload: { code, message, details: {} },
    });
  }
}

function main(): void {
  const agent = new PlannerAgent();
  agent.start();
}

main();
