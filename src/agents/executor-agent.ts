/**
 * Executor Agent: traverses the capability graph (DAG) and orchestrates node execution.
 * Identifies ready nodes, dispatches to services, records results in Task Memory.
 * P3-01: _board/TASKS/P3-01_EXECUTOR_CORE_LOOP.md
 * P3-02: parallel execution with concurrency limit (_board/TASKS/P3-02_PARALLEL_EXECUTION.md).
 * P3-05: handle REVISE from Critic, inject revision (re-run generation with feedback), max 3 cycles.
 */

const MAX_CONCURRENT_NODES = 5;
const MAX_REVISION_CYCLES = 3;

import { randomUUID } from "node:crypto";
import { BaseProcess } from "../shared/base-process.js";
import type { CapabilityGraph, CapabilityNode } from "../shared/graph-utils.js";
import {
  getDependencyMap,
  getReadyNodes,
  validateGraph,
} from "../shared/graph-utils.js";
import type { Envelope } from "../shared/protocol.js";
import { PROTOCOL_VERSION } from "../shared/protocol.js";
import { responsePayloadSchema } from "../shared/protocol.js";

const PLAN_EXECUTE = "plan.execute";
const NODE_EXECUTE = "node.execute";
const PROCESS_NAME = "executor";

interface PlanExecutePayload {
  taskId: string;
  plan: CapabilityGraph;
  goal?: string;
}

interface NodeExecutePayload {
  taskId: string;
  nodeId: string;
  type: string;
  service: string;
  input: Record<string, unknown>;
  context?: Record<string, unknown>;
}

type PendingResolve = (envelope: Envelope) => void;
type PendingReject = (err: Envelope) => void;

export class ExecutorAgent extends BaseProcess {
  private readonly pending = new Map<string, { resolve: PendingResolve; reject: PendingReject }>();

  constructor() {
    super({ processName: PROCESS_NAME });
  }

  protected override handleEnvelope(envelope: Envelope): void {
    if (envelope.type === "response" || envelope.type === "error") {
      const cid = envelope.correlationId ?? envelope.id;
      const entry = cid ? this.pending.get(cid) : undefined;
      if (entry) {
        this.pending.delete(cid!);
        if (envelope.type === "error") entry.reject(envelope);
        else entry.resolve(envelope);
      }
      return;
    }

    if (envelope.type !== PLAN_EXECUTE) return;

    const payload = envelope.payload as Record<string, unknown>;
    const p = payload as unknown as PlanExecutePayload;
    const { taskId, plan, goal } = p;
    if (!taskId || !plan?.nodes) {
      this.sendError(envelope, "INVALID_PAYLOAD", "plan.execute requires taskId and plan with nodes");
      return;
    }

    const validation = validateGraph(plan);
    if (!validation.valid) {
      this.sendError(envelope, "DAG_VALIDATION_FAILED", validation.errors.join("; "));
      return;
    }

    this.runExecutionLoop(envelope, taskId, plan, typeof goal === "string" ? goal : "").catch((err) => {
      const msg = err instanceof Error ? err.message : String(err);
      this.sendError(envelope, "EXECUTOR_ERROR", msg);
    });
  }

  private async runExecutionLoop(
    request: Envelope,
    taskId: string,
    plan: CapabilityGraph,
    goal: string,
  ): Promise<void> {
    const dependencyMap = getDependencyMap(plan);
    const completedIds = new Set<string>();
    const nodeOutputs = new Map<string, unknown>();
    const nodeMap = new Map(plan.nodes.map((n) => [n.id, n]));

    while (completedIds.size < plan.nodes.length) {
      const ready = getReadyNodes(plan, dependencyMap, completedIds);
      if (ready.length === 0) {
        this.sendError(request, "EXECUTION_STUCK", "No ready nodes; possible cycle or missing deps.");
        return;
      }

      const batch = ready.slice(0, MAX_CONCURRENT_NODES);
      const runOne = async (nodeId: string): Promise<{ nodeId: string; result: unknown } | { nodeId: string; err: Envelope }> => {
        const node = nodeMap.get(nodeId);
        if (!node) return { nodeId, err: {} as Envelope };
        this.sendTaskUpdate(taskId, nodeId, "running");
        const context: Record<string, unknown> = {};
        const deps = dependencyMap.get(nodeId);
        if (deps) {
          for (const depId of deps) {
            const out = nodeOutputs.get(depId);
            if (out !== undefined) context[depId] = out;
          }
        }
        if (goal) context["_goal"] = goal;
        try {
          const result = await this.dispatchNode(taskId, node, context);
          return { nodeId, result };
        } catch (errEnvelope) {
          return { nodeId, err: errEnvelope as Envelope };
        }
      };

      const results = await Promise.all(batch.map((nodeId) => runOne(nodeId)));
      for (const r of results) {
        if ("result" in r) {
          nodeOutputs.set(r.nodeId, r.result);
          this.sendTaskUpdate(taskId, r.nodeId, "completed", r.result);
          completedIds.add(r.nodeId);
        } else {
          const err = r.err as Envelope & { payload?: { message?: string } };
          const message = err.payload?.message ?? "Node execution failed";
          this.sendTaskUpdate(taskId, r.nodeId, "failed");
          this.sendTaskFail(taskId, message);
          this.sendError(request, "NODE_FAILED", message);
          return;
        }
      }
    }

    let aggregated = this.aggregateResult(plan, nodeOutputs);
    const reflectionMode = (plan.reflectionMode ?? "OFF") as string;
    const complexity = (plan.complexity ?? "medium") as "small" | "medium" | "large";

    if (reflectionMode !== "OFF" && reflectionMode !== "off") {
      let revisionCount = 0;
      let draftOutput = this.draftToString(aggregated);
      while (revisionCount <= MAX_REVISION_CYCLES) {
        const evaluation = await this.dispatchReflection(taskId, goal, draftOutput, complexity);
        if (evaluation.decision === "PASS") break;
        this.sendTaskAppendReflection(taskId, undefined, evaluation.feedback, "REVISE");
        revisionCount++;
        if (revisionCount > MAX_REVISION_CYCLES) break;
        const lastGenNode = this.getLastGenerationNode(plan);
        if (!lastGenNode) break;
        const revContext: Record<string, unknown> = {};
        const deps = dependencyMap.get(lastGenNode.id);
        if (deps) {
          for (const depId of deps) {
            const out = nodeOutputs.get(depId);
            if (out !== undefined) revContext[depId] = out;
          }
        }
        revContext["_goal"] = goal;
        revContext["_criticFeedback"] = evaluation.feedback;
        revContext["_previousDraft"] = draftOutput;
        try {
          const revised = await this.dispatchNode(taskId, lastGenNode, revContext);
          draftOutput = this.draftToString(revised);
          aggregated = revised;
          nodeOutputs.set(lastGenNode.id, revised);
        } catch {
          break;
        }
      }
    }

    this.sendTaskComplete(taskId);
    this.sendResponse(request, { taskId, result: aggregated });
  }

  private draftToString(draft: unknown): string {
    if (typeof draft === "string") return draft;
    if (draft != null && typeof draft === "object" && "text" in draft && typeof (draft as { text: string }).text === "string") return (draft as { text: string }).text;
    return JSON.stringify(draft);
  }

  private getLastGenerationNode(plan: CapabilityGraph): CapabilityNode | undefined {
    for (let i = plan.nodes.length - 1; i >= 0; i--) {
      const n = plan.nodes[i];
      if (n && (n.type === "generate_text" || n.type === "generate")) return n;
    }
    const last = plan.nodes[plan.nodes.length - 1];
    return last ?? undefined;
  }

  private dispatchReflection(
    taskId: string,
    goal: string,
    draftOutput: string,
    complexity: "small" | "medium" | "large",
  ): Promise<{ decision: "PASS" | "REVISE"; feedback: string; score: number }> {
    return new Promise((resolve) => {
      const id = randomUUID();
      this.send({
        id,
        timestamp: Date.now(),
        from: PROCESS_NAME,
        to: "critic-agent",
        type: "reflection.evaluate",
        version: PROTOCOL_VERSION,
        payload: { taskId, goal, draftOutput, complexity },
      });
      this.pending.set(id, {
        resolve: (env) => {
          const pl = env.payload as { status?: string; result?: { decision?: string; feedback?: string; score?: number } };
          const r = pl.result;
          const decision = r?.decision === "REVISE" ? "REVISE" : "PASS";
          const feedback = typeof r?.feedback === "string" ? r.feedback : "";
          const score = typeof r?.score === "number" ? r.score : 5;
          resolve({ decision, feedback, score });
        },
        reject: (errEnv) => {
          const pl = errEnv.payload as { message?: string };
          resolve({ decision: "PASS", feedback: pl?.message ?? "Critic error", score: 5 });
        },
      });
    });
  }

  private sendTaskAppendReflection(
    taskId: string,
    nodeId: string | undefined,
    criticFeedback: string,
    decision: "PASS" | "REVISE",
  ): void {
    this.send({
      id: randomUUID(),
      timestamp: Date.now(),
      from: PROCESS_NAME,
      to: "task-memory",
      type: "task.appendReflection",
      version: PROTOCOL_VERSION,
      payload: { taskId, nodeId, criticFeedback, decision },
    });
  }

  private dispatchNode(
    taskId: string,
    node: CapabilityNode,
    context: Record<string, unknown>,
  ): Promise<unknown> {
    return new Promise((resolve, reject) => {
      const id = randomUUID();
      const payload: NodeExecutePayload = {
        taskId,
        nodeId: node.id,
        type: node.type,
        service: node.service,
        input: node.input ?? {},
        ...(Object.keys(context).length > 0 && { context }),
      };
      this.send({
        id,
        timestamp: Date.now(),
        from: PROCESS_NAME,
        to: node.service,
        type: NODE_EXECUTE,
        version: PROTOCOL_VERSION,
        payload,
      });
      const timeout = setTimeout(() => {
        if (this.pending.has(id)) {
          this.pending.delete(id);
          reject(new Error(`Node execution timed out after 30s: ${node.id} (${node.type})`));
        }
      }, 30000);

      this.pending.set(id, {
        resolve: (env) => {
          clearTimeout(timeout);
          const pl = env.payload as { status?: string; result?: unknown };
          resolve(pl.result);
        },
        reject: (err) => {
          clearTimeout(timeout);
          reject(err);
        },
      });
    });
  }

  private aggregateResult(plan: CapabilityGraph, nodeOutputs: Map<string, unknown>): unknown {
    if (nodeOutputs.size === 0) return null;
    const lastNode = plan.nodes[plan.nodes.length - 1];
    const lastOutput = lastNode ? nodeOutputs.get(lastNode.id) : undefined;
    if (lastOutput !== undefined) return lastOutput;
    return Object.fromEntries(nodeOutputs);
  }

  private sendTaskUpdate(
    taskId: string,
    nodeId: string,
    status: "pending" | "running" | "completed" | "failed",
    output?: unknown,
  ): void {
    this.send({
      id: randomUUID(),
      timestamp: Date.now(),
      from: PROCESS_NAME,
      to: "task-memory",
      type: "task.update",
      version: PROTOCOL_VERSION,
      payload: {
        taskId,
        nodeId,
        status,
        ...(output !== undefined && { output }),
      },
    });
  }

  private sendTaskComplete(taskId: string): void {
    this.send({
      id: randomUUID(),
      timestamp: Date.now(),
      from: PROCESS_NAME,
      to: "task-memory",
      type: "task.complete",
      version: PROTOCOL_VERSION,
      payload: { taskId },
    });
  }

  private sendTaskFail(taskId: string, reason: string): void {
    this.send({
      id: randomUUID(),
      timestamp: Date.now(),
      from: PROCESS_NAME,
      to: "task-memory",
      type: "task.fail",
      version: PROTOCOL_VERSION,
      payload: { taskId, reason },
    });
  }

  private sendResponse(request: Envelope, result: unknown): void {
    const payload = responsePayloadSchema.parse({ status: "success", result });
    this.send({
      id: randomUUID(),
      correlationId: request.id,
      from: PROCESS_NAME,
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
      from: PROCESS_NAME,
      to: request.from,
      type: "error",
      version: PROTOCOL_VERSION,
      timestamp: Date.now(),
      payload: { code, message, details: {} },
    });
  }
}

function main(): void {
  const agent = new ExecutorAgent();
  agent.start();
}

main();
