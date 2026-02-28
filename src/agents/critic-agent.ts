/**
 * Critic Agent: evaluates Executor draft results against the user goal.
 * Accepts reflection.evaluate, returns structured PASS/REVISE decision.
 * P3-04: _board/TASKS/P3-04_CRITIC_AGENT.md
 */

import { randomUUID } from "node:crypto";
import { BaseProcess } from "../shared/base-process.js";
import type { Envelope } from "../shared/protocol.js";
import { PROTOCOL_VERSION } from "../shared/protocol.js";
import { responsePayloadSchema } from "../shared/protocol.js";
import { CRITIC_SYSTEM_PROMPT, buildCriticPrompt } from "./prompts/critic.js";
import { LemonadeAdapter } from "../services/lemonade-adapter.js";
import { ModelRouter } from "../services/model-router.js";

const REFLECTION_EVALUATE = "reflection.evaluate";
const PROCESS_NAME = "critic-agent";

interface ReflectionEvaluatePayload {
  taskId?: string;
  goal: string;
  draftOutput: string;
  context?: Record<string, unknown>;
  complexity?: "small" | "medium" | "large";
}

interface CriticStructuredOutput {
  decision: "PASS" | "REVISE";
  feedback: string;
  score: number;
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

export class CriticAgent extends BaseProcess {
  private readonly lemonade: LemonadeAdapter;
  private readonly modelRouter: ModelRouter;

  constructor(options?: { lemonade?: LemonadeAdapter; modelRouter?: ModelRouter }) {
    super({ processName: PROCESS_NAME });
    this.lemonade = options?.lemonade ?? new LemonadeAdapter();
    this.modelRouter = options?.modelRouter ?? new ModelRouter();
  }

  protected override handleEnvelope(envelope: Envelope): void {
    if (envelope.type !== REFLECTION_EVALUATE) return;

    const payload = envelope.payload as Record<string, unknown>;
    const p = payload as unknown as ReflectionEvaluatePayload;
    const goal = p.goal ?? "";
    const draftOutput = p.draftOutput ?? "";
    const complexity = p.complexity ?? "medium";

    if (!goal || typeof goal !== "string" || typeof draftOutput !== "string") {
      this.sendError(envelope, "INVALID_PAYLOAD", "reflection.evaluate requires goal and draftOutput (strings)");
      return;
    }

    (async () => {
      try {
        const model = this.modelRouter.getModel(complexity);
        const userContent = buildCriticPrompt(goal, draftOutput);
        const messages = [
          { role: "system" as const, content: CRITIC_SYSTEM_PROMPT },
          { role: "user" as const, content: userContent },
        ];
        const result = await this.lemonade.chat(messages, model);
        const raw = result.message?.content ?? "";
        const jsonStr = extractJson(raw);
        const parsed = JSON.parse(jsonStr) as Record<string, unknown>;
        const decision = parsed.decision === "REVISE" ? "REVISE" : "PASS";
        const feedback = typeof parsed.feedback === "string" ? parsed.feedback : "";
        const score = typeof parsed.score === "number" ? Math.min(10, Math.max(1, parsed.score)) : 5;
        const structured: CriticStructuredOutput = { decision, feedback, score };
        this.sendResponse(envelope, structured);
      } catch (err) {
        const message = err instanceof Error ? err.message : String(err);
        this.sendError(envelope, "CRITIC_ERROR", message);
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
  const agent = new CriticAgent();
  agent.start();
}

main();
