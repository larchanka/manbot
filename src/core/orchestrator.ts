/**
 * Core Orchestrator: central supervisor that spawns agents and services,
 * routes messages, and runs the task flow Telegram -> Planner -> Task Memory -> Executor -> Telegram.
 * P3-06: _board/TASKS/P3-06_CORE_ORCHESTRATOR.md
 */

import { createInterface } from "node:readline";
import { spawn, type ChildProcess } from "node:child_process";
import { randomUUID } from "node:crypto";
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";
import { envelopeSchema } from "../shared/protocol.js";
import type { Envelope } from "../shared/protocol.js";

const __dirname = dirname(fileURLToPath(import.meta.url));
const ROOT = join(__dirname, "..", "..", "..");
const DIST = join(ROOT, "dist");

const PROCESS_SCRIPTS: Record<string, string> = {
  "task-memory": join(DIST, "services", "task-memory.js"),
  "logger": join(DIST, "services", "logger-service.js"),
  "planner": join(DIST, "agents", "planner-agent.js"),
  "executor": join(DIST, "agents", "executor-agent.js"),
  "critic-agent": join(DIST, "agents", "critic-agent.js"),
  "telegram-adapter": join(DIST, "adapters", "telegram-adapter.js"),
  "model-router": join(DIST, "services", "generator-service.js"),
  "rag-service": join(DIST, "services", "rag-service.js"),
  "tool-host": join(DIST, "services", "tool-host.js"),
  "cron-manager": join(DIST, "services", "cron-manager.js"),
};

interface ChildEntry {
  process: ChildProcess;
  name: string;
  stdin: NodeJS.WritableStream;
}

type PendingResolve = (env: Envelope) => void;
type PendingReject = (env: Envelope) => void;

export class Orchestrator {
  private readonly children = new Map<string, ChildEntry>();
  private readonly pending = new Map<string, { resolve: PendingResolve; reject: PendingReject }>();

  private spawnProcess(name: string, scriptPath: string): ChildEntry {
    const child = spawn("node", [scriptPath], {
      cwd: ROOT,
      stdio: ["pipe", "pipe", "pipe"],
      env: { ...process.env },
    });
    const stdin = child.stdin!;
    const rl = createInterface({ input: child.stdout!, terminal: false });
    rl.on("line", (line: string) => this.handleLine(name, line));
    child.stderr?.on("data", (data: Buffer) => process.stderr.write(`[${name}] ${data}`));
    child.on("error", (err) => {
      process.stderr.write(`[${name}] process error: ${err.message}\n`);
    });
    child.on("exit", (code, signal) => {
      process.stderr.write(`[${name}] exit code=${code} signal=${signal}\n`);
    });
    const entry: ChildEntry = { process: child, name, stdin };
    this.children.set(name, entry);
    return entry;
  }

  private handleLine(fromProcess: string, line: string): void {
    const trimmed = line.trim();
    if (!trimmed) return;
    try {
      const raw = JSON.parse(trimmed) as unknown;
      const envelope = envelopeSchema.parse(raw) as Envelope;
      const to = envelope.to;
      const cid = envelope.correlationId ?? envelope.id;
      const pendingEntry = cid ? this.pending.get(cid) : undefined;
      if (pendingEntry && (envelope.type === "response" || envelope.type === "error")) {
        this.pending.delete(cid!);
        if (envelope.type === "error") pendingEntry.reject(envelope);
        else pendingEntry.resolve(envelope);
        return;
      }
      if (to === "core") {
        this.handleCoreMessage(fromProcess, envelope);
        return;
      }
      const target = this.children.get(to);
      if (target?.stdin.writable) {
        target.stdin.write(trimmed + "\n");
      }
    } catch {
      // skip malformed
    }
  }

  private handleCoreMessage(fromProcess: string, envelope: Envelope): void {
    const type = envelope.type;
    const payload = envelope.payload as Record<string, unknown>;
    if (type === "task.create" && fromProcess === "telegram-adapter") {
      const goal = payload.goal as string | undefined;
      const chatId = payload.chatId as number | undefined;
      const userId = payload.userId as number | undefined;
      if (goal != null && chatId != null) {
        this.runTaskPipeline(chatId, userId ?? 0, goal).catch((err) => {
          process.stderr.write(`Orchestrator pipeline error: ${err}\n`);
          this.sendToTelegram(chatId, `Error: ${err instanceof Error ? err.message : String(err)}`);
        });
      }
    }
  }

  private async runTaskPipeline(chatId: number, userId: number, goal: string): Promise<void> {
    const taskId = randomUUID();
    const planner = this.children.get("planner");
    const taskMemory = this.children.get("task-memory");
    const executor = this.children.get("executor");
    const telegram = this.children.get("telegram-adapter");
    if (!planner?.stdin.writable || !taskMemory?.stdin.writable || !executor?.stdin.writable || !telegram?.stdin.writable) {
      this.sendToTelegram(chatId, "Service unavailable.");
      return;
    }
    const planReq = this.sendAndWait(planner, "plan.create", { goal, complexity: "medium" });
    let planEnv: Envelope;
    try {
      planEnv = await planReq;
    } catch (errEnv) {
      const err = errEnv as Envelope & { payload?: { message?: string } };
      this.sendToTelegram(chatId, err.payload?.message ?? "Planning failed.");
      return;
    }
    const planPayload = planEnv.payload as { status?: string; result?: unknown };
    const plan = planPayload.result as { nodes: unknown[]; edges?: unknown[] } | undefined;
    if (!plan?.nodes || !Array.isArray(plan.nodes)) {
      this.sendToTelegram(chatId, "Invalid plan from planner.");
      return;
    }
    const nodes = plan.nodes as Array<{ id: string; type: string; service: string; input?: unknown }>;
    const edges = (plan.edges ?? []) as Array<{ from: string; to: string }>;
    const taskCreatePayload = {
      taskId,
      userId: String(userId),
      conversationId: String(chatId),
      goal,
      nodes: nodes.map((n) => ({ id: n.id, type: n.type, service: n.service, input: n.input })),
      edges: edges.map((e) => ({ fromNode: e.from, toNode: e.to })),
    };
    this.sendAndWait(taskMemory, "task.create", taskCreatePayload).catch(() => {});
    const execReq = this.sendAndWait(executor, "plan.execute", { taskId, plan, goal });
    let execEnv: Envelope;
    try {
      execEnv = await execReq;
    } catch (errEnv) {
      const err = errEnv as Envelope & { payload?: { message?: string } };
      this.sendToTelegram(chatId, err.payload?.message ?? "Execution failed.");
      return;
    }
    const execPayload = execEnv.payload as { status?: string; result?: { result?: unknown } };
    const result = execPayload.result?.result;
    const text = typeof result === "string" ? result : result != null && typeof result === "object" && "text" in result ? String((result as { text: unknown }).text) : JSON.stringify(result ?? "Done.");
    this.sendToTelegram(chatId, text);
  }

  private sendToTelegram(chatId: number, text: string): void {
    const telegram = this.children.get("telegram-adapter");
    if (!telegram?.stdin.writable) return;
    const envelope: Envelope = {
      id: randomUUID(),
      timestamp: Date.now(),
      from: "core",
      to: "telegram-adapter",
      type: "telegram.send",
      version: "1.0",
      payload: { chatId, text },
    };
    telegram.stdin.write(JSON.stringify(envelope) + "\n");
  }

  private sendAndWait(target: ChildEntry, type: string, payload: unknown): Promise<Envelope> {
    return new Promise((resolve, reject) => {
      const id = randomUUID();
      const envelope: Envelope = {
        id,
        timestamp: Date.now(),
        from: "core",
        to: target.name,
        type,
        version: "1.0",
        payload,
      };
      this.pending.set(id, { resolve, reject });
      target.stdin.write(JSON.stringify(envelope) + "\n");
    });
  }

  start(): void {
    for (const [name, scriptPath] of Object.entries(PROCESS_SCRIPTS)) {
      this.spawnProcess(name, scriptPath);
    }
  }

  stop(): void {
    for (const entry of this.children.values()) {
      entry.process.kill();
    }
    this.children.clear();
    this.pending.clear();
  }
}

function main(): void {
  const orchestrator = new Orchestrator();
  orchestrator.start();
  process.on("SIGINT", () => {
    orchestrator.stop();
    process.exit(0);
  });
  process.on("SIGTERM", () => {
    orchestrator.stop();
    process.exit(0);
  });
}

main();
