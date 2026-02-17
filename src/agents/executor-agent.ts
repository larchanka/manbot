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
import { getConfig } from "../shared/config.js";

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
type PendingReject = (err: any) => void;

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
      let msg: string;
      let details: Record<string, unknown> | undefined;
      if (err && typeof err === "object" && "payload" in err) {
        // It's an error envelope
        const errEnv = err as Envelope;
        const payload = errEnv.payload as { message?: string; code?: string; details?: Record<string, unknown> };
        msg = payload?.message ?? "Executor error";
        details = payload?.details as Record<string, unknown> | undefined;
      } else {
        msg = err instanceof Error ? err.message : String(err);
        if (err instanceof Error && err.stack) {
          details = { stack: err.stack };
        }
      }
      this.sendError(envelope, "EXECUTOR_ERROR", msg, details);
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
      const runOne = async (nodeId: string): Promise<{ nodeId: string; result: unknown } | { nodeId: string; err: any }> => {
        const node = nodeMap.get(nodeId);
        if (!node) return { nodeId, err: new Error(`Node not found: ${nodeId}`) };
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
        // Include plan complexity in context for model selection fallback
        const planComplexity = plan.complexity ?? "medium";
        context["_complexity"] = planComplexity;
        try {
          const result = await this.dispatchNode(taskId, node, context);
          return { nodeId, result };
        } catch (error) {
          return { nodeId, err: error };
        }
      };

      const results = await Promise.all(batch.map((nodeId) => runOne(nodeId)));
      for (const r of results) {
        if ("result" in r) {
          nodeOutputs.set(r.nodeId, r.result);
          this.sendTaskUpdate(taskId, r.nodeId, "completed", r.result);
          completedIds.add(r.nodeId);
        } else {
          const err = r.err;
          const node = nodeMap.get(r.nodeId);
          const isEnvelope = typeof err === "object" && err !== null && "payload" in err;
          const errPayload = isEnvelope ? (err.payload as any) : undefined;

          // Extract error message from multiple possible sources
          let errStr: string | undefined;
          let originalErrorInfo: Record<string, unknown> | undefined;
          if (isEnvelope && errPayload) {
            // Try payload.message first (most common)
            errStr = typeof errPayload?.message === "string" ? errPayload.message : undefined;
            // If empty, try to get from nested details
            if ((!errStr || !errStr.trim()) && errPayload?.details && typeof errPayload.details === "object") {
              const details = errPayload.details as Record<string, unknown>;
              if (typeof details.message === "string") {
                errStr = details.message;
              }
              // Also check for serviceErrorMessage we might have added
              if ((!errStr || !errStr.trim()) && typeof details.serviceErrorMessage === "string") {
                errStr = details.serviceErrorMessage;
              }
            }
          } else if (err instanceof Error) {
            errStr = err.message;
            // Include the full error object in details for debugging
            originalErrorInfo = {
              name: err.name,
              message: err.message,
              stack: err.stack,
            };
          } else {
            errStr = String(err);
            originalErrorInfo = { value: err };
          }

          // Use the original error message from the service if available, otherwise fallback
          const message = (errStr && errStr.trim()) ? errStr : "Node execution failed";
          const errorCode = (isEnvelope && errPayload?.code)
            ? errPayload.code
            : "NODE_FAILED";

          // Extract error details including stack trace if available
          const errorDetails: Record<string, unknown> = {
            nodeId: r.nodeId,
            ...(node && {
              nodeType: node.type,
              nodeService: node.service,
              nodeInput: node.input ?? {},
            }),
            // Include original error message from service if available
            ...(errStr && errStr.trim() && { originalErrorMessage: errStr }),
            ...(originalErrorInfo && { originalError: originalErrorInfo }),
            ...(isEnvelope && errPayload?.details && typeof errPayload.details === "object" ? errPayload.details : {}),
          };

          // Extract error details if it's an envelope
          if (isEnvelope && errPayload?.details && typeof errPayload.details === "object") {
            const details = errPayload.details as Record<string, unknown>;
            if (details.stack) errorDetails.stack = details.stack;
            if (details.error) errorDetails.originalError = details.error;
          } else if (err instanceof Error && err.stack) {
            errorDetails.stack = err.stack;
          }

          // If we have the original error envelope, include its full payload for debugging
          let finalMessage = message;
          if (isEnvelope && errPayload) {
            errorDetails.serviceErrorCode = errPayload.code;
            // Include the service error message even if we're using it as the main message
            const serviceMsg = errPayload.message;
            if (serviceMsg && typeof serviceMsg === "string" && serviceMsg.trim()) {
              errorDetails.serviceErrorMessage = serviceMsg;
              // If main message is fallback, use service message instead
              if (message === "Node execution failed") {
                finalMessage = serviceMsg;
              }
            }
          }

          this.sendTaskUpdate(taskId, r.nodeId, "failed");
          this.sendTaskFail(taskId, finalMessage);
          this.sendError(request, errorCode, finalMessage, errorDetails);
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
        // Include plan complexity in revision context
        const planComplexity = plan.complexity ?? "medium";
        revContext["_complexity"] = planComplexity;
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
    // Handle schedule_reminder nodes specially
    if (node.type === "schedule_reminder") {
      return this.handleScheduleReminder(taskId, node, context);
    }

    return new Promise((resolve, reject) => {
      const id = randomUUID();
      const nodeTimeoutMs = getConfig().executor.nodeTimeoutMs;
      // DEBUG: Log the timeout value to verify configuration
      console.log(`[executor] Dispatching node ${node.id} with timeout ${nodeTimeoutMs}ms`);

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
          reject(new Error(`Node execution timed out after ${Math.floor(nodeTimeoutMs / 1000)}s: ${node.id} (${node.type})`));
        }
      }, nodeTimeoutMs);

      this.pending.set(id, {
        resolve: (env) => {
          clearTimeout(timeout);
          const pl = env.payload as { status?: string; result?: unknown };
          resolve(pl.result);
        },
        reject: (errEnvelope) => {
          clearTimeout(timeout);
          // Handle both error envelopes and plain Error objects
          const isEnvelope = typeof errEnvelope === "object" && errEnvelope !== null && "payload" in errEnvelope;

          if (isEnvelope) {
            // Enhance error envelope with node context before rejecting
            // Preserve original error code and message from the service
            const originalPayload = (errEnvelope as Envelope).payload as Record<string, unknown>;
            const originalMessage = originalPayload?.message;
            const enhancedError: Envelope = {
              ...(errEnvelope as Envelope),
              payload: {
                code: originalPayload?.code ?? "NODE_FAILED",
                // Preserve original message, even if empty - let error handler decide fallback
                message: typeof originalMessage === "string" ? originalMessage : (originalPayload?.message ?? ""),
                details: {
                  ...((originalPayload?.details as Record<string, unknown>) || {}),
                  nodeId: node.id,
                  nodeType: node.type,
                  nodeService: node.service,
                  nodeInput: node.input ?? {},
                },
              },
            };
            reject(enhancedError);
          } else {
            // Handle plain Error objects (e.g., from timeout)
            // Convert to error envelope format so it can be handled consistently
            const errorMessage = errEnvelope instanceof Error ? errEnvelope.message : String(errEnvelope);
            const errorStack = errEnvelope instanceof Error ? errEnvelope.stack : undefined;
            const errorEnvelope: Envelope = {
              id: randomUUID(),
              timestamp: Date.now(),
              from: PROCESS_NAME,
              to: PROCESS_NAME, // Will be handled by runOne
              type: "error",
              version: PROTOCOL_VERSION,
              payload: {
                code: "NODE_FAILED",
                message: errorMessage,
                details: {
                  nodeId: node.id,
                  nodeType: node.type,
                  nodeService: node.service,
                  nodeInput: node.input ?? {},
                  ...(errorStack && { stack: errorStack }),
                },
              },
            };
            reject(errorEnvelope);
          }
        },
      });
    });
  }

  private async handleScheduleReminder(
    _taskId: string,
    node: CapabilityNode,
    context: Record<string, unknown>,
  ): Promise<unknown> {
    const input = node.input ?? {};
    const nodeInput = input as Record<string, unknown>;

    // Extract cronExpr from input or dependency output
    let cronExpr = nodeInput.cronExpr as string | undefined;
    
    // Check if cronExpr is a placeholder string (should be ignored)
    const isPlaceholder = cronExpr && (
      cronExpr.includes("<output from") ||
      cronExpr.includes("<extract from") ||
      cronExpr.startsWith("<") && cronExpr.endsWith(">")
    );
    
    if (!cronExpr || isPlaceholder) {
      // Check if cronExpr is in a dependency output (from parse-time node)
      const dependsOn = (nodeInput.dependsOn as string[] | undefined) ?? [];
      for (const depId of dependsOn) {
        const depOutput = context[depId];
        if (typeof depOutput === "string") {
          // Try to extract cron expression from dependency output
          // The parse-time node might output:
          // 1. Plain text cron expression (e.g., "0 15 18 2 *")
          // 2. JSON string with cronExpr field
          // 3. JSON string with full parseTimeExpression result
          const trimmed = depOutput.trim();
          
          // First, try parsing as JSON
          try {
            const parsed = JSON.parse(trimmed) as { cronExpr?: string; cron_expr?: string };
            if (parsed.cronExpr) {
              cronExpr = parsed.cronExpr;
              break;
            }
            if (parsed.cron_expr) {
              cronExpr = parsed.cron_expr;
              break;
            }
          } catch {
            // If not JSON, check if it looks like a cron expression
            // Cron expressions typically have 5 or 6 space-separated fields
            const cronPattern = /^[\d\*\-\/,\s]+$/;
            if (cronPattern.test(trimmed) && trimmed.split(/\s+/).length >= 5) {
              cronExpr = trimmed;
              break;
            }
            // Otherwise, treat the whole output as cronExpr (fallback)
            cronExpr = trimmed;
            break;
          }
        } else if (depOutput && typeof depOutput === "object") {
          // Handle object outputs
          if ("cronExpr" in depOutput && typeof depOutput.cronExpr === "string") {
            cronExpr = depOutput.cronExpr as string;
            break;
          }
          if ("cron_expr" in depOutput && typeof depOutput.cron_expr === "string") {
            cronExpr = depOutput.cron_expr as string;
            break;
          }
          // Check if it's a result object with text field that might contain cron
          if ("text" in depOutput && typeof depOutput.text === "string") {
            const text = depOutput.text as string;
            try {
              const parsed = JSON.parse(text) as { cronExpr?: string };
              if (parsed.cronExpr) {
                cronExpr = parsed.cronExpr;
                break;
              }
            } catch {
              // If text is not JSON, check if it's a cron expression
              const cronPattern = /^[\d\*\-\/,\s]+$/;
              if (cronPattern.test(text.trim()) && text.trim().split(/\s+/).length >= 5) {
                cronExpr = text.trim();
                break;
              }
            }
          }
        }
      }
    }

    if (!cronExpr) {
      throw new Error("schedule_reminder requires cronExpr in input or dependency output");
    }

    // Extract reminder metadata
    const chatId = (nodeInput.chatId as number | string | undefined) ??
      (context.chatId as number | string | undefined);
    const reminderMessage = (nodeInput.reminderMessage as string | undefined) ??
      (context.reminderMessage as string | undefined);
    const userId = (nodeInput.userId as number | string | undefined) ??
      (context.userId as number | string | undefined);

    if (!chatId || !reminderMessage) {
      throw new Error("schedule_reminder requires chatId and reminderMessage");
    }

    // Send cron.schedule.add to cron-manager
    return new Promise((resolve, reject) => {
      const id = randomUUID();
      const timeout = setTimeout(() => {
        if (this.pending.has(id)) {
          this.pending.delete(id);
          reject(new Error(`Schedule reminder timed out: ${node.id}`));
        }
      }, getConfig().executor.nodeTimeoutMs);

      this.send({
        id,
        timestamp: Date.now(),
        from: PROCESS_NAME,
        to: "cron-manager",
        type: "cron.schedule.add",
        version: PROTOCOL_VERSION,
        payload: {
          cronExpr,
          taskType: "reminder",
          payload: {
            chatId: typeof chatId === "string" ? parseInt(chatId, 10) : chatId,
            reminderMessage,
            ...(userId && { userId: typeof userId === "string" ? parseInt(userId, 10) : userId }),
          },
        },
      });

      this.pending.set(id, {
        resolve: (env) => {
          clearTimeout(timeout);
          const pl = env.payload as { status?: string; result?: { id?: string } };
          const scheduleId = pl.result?.id;
          if (!scheduleId) {
            reject(new Error("cron-manager did not return schedule ID"));
            return;
          }
          resolve({ scheduleId, cronExpr, reminderMessage });
        },
        reject: (errEnvelope) => {
          clearTimeout(timeout);
          const isEnvelope = typeof errEnvelope === "object" && errEnvelope !== null && "payload" in errEnvelope;
          const errPayload = isEnvelope ? (errEnvelope as Envelope).payload as { message?: string } : undefined;
          const message = errPayload?.message ?? "Failed to schedule reminder";
          reject(new Error(message));
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

  private sendError(request: Envelope, code: string, message: string, details?: Record<string, unknown>): void {
    this.send({
      id: randomUUID(),
      correlationId: request.id,
      from: PROCESS_NAME,
      to: request.from,
      type: "error",
      version: PROTOCOL_VERSION,
      timestamp: Date.now(),
      payload: { code, message, details: details ?? {} },
    });
  }
}

function main(): void {
  const agent = new ExecutorAgent();
  agent.start();
}

main();
