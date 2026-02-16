/**
 * Generator Service: handles node.execute for generate_text.
 * Used by Executor when dispatching to "model-router"; calls Ollama via ModelRouter.
 */

import { randomUUID } from "node:crypto";
import { BaseProcess } from "../shared/base-process.js";
import type { Envelope } from "../shared/protocol.js";
import { PROTOCOL_VERSION } from "../shared/protocol.js";
import { responsePayloadSchema } from "../shared/protocol.js";
import { OllamaAdapter } from "./ollama-adapter.js";
import { ModelRouter } from "./model-router.js";

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
  private readonly ollama: OllamaAdapter;
  private readonly modelRouter: ModelRouter;

  constructor(options?: { ollama?: OllamaAdapter; modelRouter?: ModelRouter }) {
    super({ processName: PROCESS_NAME });
    this.ollama = options?.ollama ?? new OllamaAdapter();
    this.modelRouter = options?.modelRouter ?? new ModelRouter();
  }

  protected override handleEnvelope(envelope: Envelope): void {
    if (envelope.type !== NODE_EXECUTE || envelope.to !== PROCESS_NAME) return;

    const payload = envelope.payload as Record<string, unknown>;
    const p = payload as unknown as NodeExecutePayload;
    if (p.type !== "generate_text" && p.type !== "generate") {
      this.sendError(envelope, "UNSUPPORTED_TYPE", `Generator only handles generate_text, got ${p.type}`);
      return;
    }

    (async () => {
      try {
        const modelClass = (p.input?.modelClass as string) ?? "medium";
        const model = this.modelRouter.getModel(modelClass as "small" | "medium" | "large");
        const context = (p.context ?? {}) as Record<string, unknown>;
        const goal = context["_goal"] as string | undefined;
        let prompt: string;
        if (typeof p.input?.prompt === "string") {
          prompt = p.input.prompt;
        } else if (goal && (context["_criticFeedback"] != null || context["_previousDraft"] != null)) {
          const feedback = context["_criticFeedback"] as string | undefined;
          const previous = context["_previousDraft"] as string | undefined;
          prompt = `User goal: ${goal}\n\nPrevious draft:\n${previous ?? ""}\n\nCritic feedback:\n${feedback ?? ""}\n\nProduce an improved draft that addresses the feedback. Output only the improved text.`;
        } else if (goal) {
          const depOutputs = Object.entries(context)
            .filter(([k]) => !k.startsWith("_"))
            .map(([, v]) => (typeof v === "string" ? v : JSON.stringify(v)));
          prompt = `User goal: ${goal}\n\nContext from previous steps:\n${depOutputs.join("\n\n")}\n\nProduce a direct response to the goal. Output only the response text.`;
        } else {
          const depOutputs = Object.values(context).map((v) => (typeof v === "string" ? v : JSON.stringify(v)));
          prompt = depOutputs.join("\n\n") || "Generate a brief response.";
        }
        const result = await this.ollama.generate(prompt, model);
        this.sendResponse(envelope, { text: result.text, prompt_eval_count: result.prompt_eval_count, eval_count: result.eval_count });
      } catch (err) {
        const message = err instanceof Error ? err.message : String(err);
        this.sendError(envelope, "GENERATOR_ERROR", message);
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

  private sendError(request: Envelope, code: string, message: string): void {
    this.send({
      id: randomUUID(),
      correlationId: request.id,
      from: this.processName,
      to: request.from,
      type: "error",
      version: PROTOCOL_VERSION,
      timestamp: Date.now(),
      payload: { code, message, details: {} },
    });
  }
}

function main(): void {
  const service = new GeneratorService();
  service.start();
}

main();
