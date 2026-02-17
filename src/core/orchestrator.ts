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
import { ConsoleLogger } from "../utils/console-logger.js";
import { getConfig } from "../shared/config.js";

const __dirname = dirname(fileURLToPath(import.meta.url));
const ROOT = join(__dirname, "..", "..");
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
    child.stderr?.on("data", (data: Buffer) => {
      ConsoleLogger.processStderr(name, data);
    });
    child.on("error", (err) => {
      ConsoleLogger.processEvent(name, "error", err);
    });
    child.on("exit", (code, signal) => {
      ConsoleLogger.processEvent(name, "exit", code ?? signal ?? undefined);
    });
    const entry: ChildEntry = { process: child, name, stdin };
    this.children.set(name, entry);
    ConsoleLogger.processEvent(name, "spawn");
    return entry;
  }

  private handleLine(fromProcess: string, line: string): void {
    const trimmed = line.trim();
    if (!trimmed) return;
    try {
      const raw = JSON.parse(trimmed) as unknown;
      const envelope = envelopeSchema.parse(raw) as Envelope;

      // Log incoming IPC message
      ConsoleLogger.ipc("core", "←", envelope);

      const to = envelope.to;
      const cid = envelope.correlationId ?? envelope.id;
      const pendingEntry = cid ? this.pending.get(cid) : undefined;
      if (pendingEntry && (envelope.type === "response" || envelope.type === "error")) {
        this.pending.delete(cid!);
        if (envelope.type === "error") {
          // Log detailed error before rejecting
          ConsoleLogger.error("core", "Node execution error received", undefined, envelope);
          pendingEntry.reject(envelope);
        } else {
          pendingEntry.resolve(envelope);
        }
        return;
      }
      // Handle cron reminder events from cron-manager
      if (fromProcess === "cron-manager" && envelope.type === "event.cron.completed") {
        this.handleCronReminderEvent(envelope);
        // Also forward to logger as before
        const logger = this.children.get("logger");
        if (logger?.stdin.writable) {
          logger.stdin.write(trimmed + "\n");
          ConsoleLogger.ipc("core", "→", envelope);
        }
        return;
      }

      if (to === "core") {
        this.handleCoreMessage(fromProcess, envelope);
        return;
      }
      const target = this.children.get(to);
      if (target?.stdin.writable) {
        target.stdin.write(trimmed + "\n");
        // Log outgoing IPC message
        ConsoleLogger.ipc("core", "→", envelope);
      } else {
        ConsoleLogger.warn("core", `Unknown target or process not writable: ${to}`, envelope);
        // If it's a request (has an ID and is not a response/error/event), send error back to sender
        if (envelope.type !== "response" && envelope.type !== "error" && !envelope.type.startsWith("event.")) {
          this.sendErrorToSender(fromProcess, envelope, "UNKNOWN_TARGET", `Process [${to}] not found or unavailable`);
        }
      }
    } catch (err) {
      // skip malformed - log as debug/error
      ConsoleLogger.error("core", `Malformed JSON line from ${fromProcess}: ${trimmed.substring(0, 100)}`, err instanceof Error ? err : String(err));
    }
  }

  private sendErrorToSender(to: string, request: Envelope, code: string, message: string): void {
    const target = this.children.get(to);
    if (!target?.stdin.writable) return;

    const envelope: Envelope = {
      id: randomUUID(),
      correlationId: request.id,
      timestamp: Date.now(),
      from: "core",
      to: to,
      type: "error",
      version: "1.0",
      payload: { code, message, details: { originalTo: request.to, originalType: request.type } },
    };
    target.stdin.write(JSON.stringify(envelope) + "\n");
    ConsoleLogger.ipc("core", "→", envelope);
  }

  private handleCoreMessage(fromProcess: string, envelope: Envelope): void {
    const type = envelope.type;
    const payload = envelope.payload as Record<string, unknown>;
    if (type === "chat.new" && fromProcess === "telegram-adapter") {
      const chatId = payload.chatId as number | undefined;
      const conversationId = payload.conversationId as string | undefined;
      if (chatId != null && conversationId != null) {
        this.runArchivingPipeline(chatId, conversationId).catch((err) => {
          ConsoleLogger.error("core", "Archiving pipeline error", err instanceof Error ? err : String(err), envelope);
          this.sendToTelegram(chatId, `Archiving failed: ${err instanceof Error ? err.message : String(err)}`);
        });
      }
      return;
    }
    if (type === "reminder.list" && fromProcess === "telegram-adapter") {
      const chatId = payload.chatId as number | undefined;
      if (chatId != null) {
        ConsoleLogger.info("core", `Handling reminder.list request for chatId: ${chatId}`, envelope);
        this.handleListReminders(chatId, envelope).catch((err) => {
          ConsoleLogger.error("core", "List reminders error", err instanceof Error ? err.message : String(err), envelope);
          this.sendToTelegram(chatId, `Error listing reminders: ${err instanceof Error ? err.message : String(err)}`);
        });
      } else {
        ConsoleLogger.warn("core", "reminder.list missing chatId", envelope);
      }
      return;
    }
    if (type === "reminder.cancel" && fromProcess === "telegram-adapter") {
      const chatId = payload.chatId as number | undefined;
      const reminderId = payload.reminderId as string | undefined;
      if (chatId != null && reminderId != null) {
        this.handleCancelReminder(chatId, reminderId, envelope).catch((err) => {
          ConsoleLogger.error("core", "Cancel reminder error", err instanceof Error ? err.message : String(err), envelope);
          this.sendToTelegram(chatId, `Error canceling reminder: ${err instanceof Error ? err.message : String(err)}`);
        });
      }
      return;
    }
    if (type === "task.create" && fromProcess === "telegram-adapter") {
      const goal = payload.goal as string | undefined;
      const chatId = payload.chatId as number | undefined;
      const userId = payload.userId as number | undefined;
      if (goal != null && chatId != null) {
        const conversationId = payload.conversationId as string | undefined;
        this.runTaskPipeline(chatId, userId ?? 0, goal, conversationId).catch((err) => {
          ConsoleLogger.error("core", "Task pipeline error", err instanceof Error ? err : String(err), envelope);
          this.sendToTelegram(chatId, `Error: ${err instanceof Error ? err.message : String(err)}`);
        });
      }
    }
  }

  private async runTaskPipeline(chatId: number, userId: number, goal: string, conversationId?: string): Promise<void> {
    const taskId = randomUUID();
    const planner = this.children.get("planner");
    const taskMemory = this.children.get("task-memory");
    const executor = this.children.get("executor");
    const telegram = this.children.get("telegram-adapter");
    if (!planner?.stdin.writable || !taskMemory?.stdin.writable || !executor?.stdin.writable || !telegram?.stdin.writable) {
      this.sendToTelegram(chatId, "Service unavailable.");
      return;
    }
    this.sendToTelegram(chatId, "Planning started...", true);
    const plannerComplexity = getConfig().modelRouter.plannerComplexity;
    const planReq = this.sendAndWait(planner, "plan.create", { goal, complexity: plannerComplexity });
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
      conversationId: conversationId ?? String(chatId),
      goal,
      nodes: nodes.map((n) => ({ id: n.id, type: n.type, service: n.service, input: n.input })),
      edges: edges.map((e) => ({ fromNode: e.from, toNode: e.to })),
    };
    this.sendAndWait(taskMemory, "task.create", taskCreatePayload).catch(() => { });
    this.sendToTelegram(chatId, "Planning complete. Execution started...", true);
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

  private async runArchivingPipeline(chatId: number, conversationId: string): Promise<void> {
    const taskMemory = this.children.get("task-memory");
    const modelRouter = this.children.get("model-router");
    const ragService = this.children.get("rag-service");
    if (!taskMemory?.stdin.writable || !modelRouter?.stdin.writable || !ragService?.stdin.writable) {
      this.sendToTelegram(chatId, "Service unavailable for archiving.");
      return;
    }
    let tasksEnv: Envelope;
    try {
      tasksEnv = await this.sendAndWait(taskMemory, "task.getByConversationId", { conversationId });
    } catch {
      this.sendToTelegram(chatId, "Archived."); // no history or error
      return;
    }
    const tasksPayload = tasksEnv.payload as { status?: string; result?: { tasks?: Array<{ id: string; goal: string; status: string }> } };
    const tasks = tasksPayload.result?.tasks ?? [];
    if (tasks.length === 0) {
      this.sendToTelegram(chatId, "Archived. (No previous tasks in this conversation.)");
      return;
    }
    const historyParts: string[] = [];
    for (const t of tasks) {
      let taskDetail: Envelope;
      try {
        taskDetail = await this.sendAndWait(taskMemory, "task.get", { taskId: t.id });
      } catch {
        historyParts.push(`Goal: ${t.goal}\nResult: (unavailable)`);
        continue;
      }
      const getTaskResult = (taskDetail.payload as { result?: { nodes?: Array<{ output?: string }> } }).result;
      const nodes = getTaskResult?.nodes ?? [];
      const lastOutput = nodes.filter((n) => n.output != null && n.output !== "").pop()?.output ?? "";
      const resultText = typeof lastOutput === "string" ? lastOutput : JSON.stringify(lastOutput);
      historyParts.push(`Goal: ${t.goal}\nResult: ${resultText || "(no output)"}`);
    }
    const chatHistory = historyParts.join("\n\n---\n\n");
    let summaryEnv: Envelope;
    try {
      summaryEnv = await this.sendAndWait(modelRouter, "node.execute", {
        taskId: `archive-${randomUUID()}`,
        nodeId: "summarize-1",
        type: "summarize",
        service: "model-router",
        input: { chatHistory },
      });
    } catch (errEnv) {
      const err = errEnv as Envelope & { payload?: { message?: string } };
      this.sendToTelegram(chatId, `Archiving failed: ${err.payload?.message ?? "Summarization error"}`);
      return;
    }
    const summaryPayload = summaryEnv.payload as { status?: string; result?: { text?: string } };
    const summaryText = summaryPayload.result?.text ?? chatHistory;
    try {
      await this.sendAndWait(ragService, "memory.semantic.insert", {
        content: summaryText,
        metadata: { conversationId, chatId, archivedAt: Date.now(), source: "archiving" },
      });
    } catch {
      this.sendToTelegram(chatId, "Summary produced but storage failed. Check logs.");
      return;
    }
    this.sendToTelegram(chatId, "Archived. Conversation summary has been stored for later retrieval.");
  }

  private handleCronReminderEvent(envelope: Envelope): void {
    const payload = envelope.payload as Record<string, unknown>;
    const chatId = payload.chatId as number | string | undefined;
    const reminderMessage = payload.reminderMessage as string | undefined;

    if (!chatId || !reminderMessage) {
      ConsoleLogger.warn(
        "core",
        "event.cron.completed missing chatId or reminderMessage",
        envelope,
      );
      return;
    }

    // Format reminder message
    const formattedMessage = `🔔 Reminder: ${reminderMessage}`;
    const chatIdNum = typeof chatId === "string" ? parseInt(chatId, 10) : chatId;
    
    if (isNaN(chatIdNum)) {
      ConsoleLogger.warn("core", `Invalid chatId in reminder event: ${chatId}`, envelope);
      return;
    }

    this.sendToTelegram(chatIdNum, formattedMessage);
  }

  private async handleListReminders(chatId: number, _request: Envelope): Promise<void> {
    ConsoleLogger.info("core", `handleListReminders called for chatId: ${chatId}`);
    const cronManager = this.children.get("cron-manager");
    if (!cronManager?.stdin.writable) {
      ConsoleLogger.warn("core", "Cron manager not available or not writable");
      this.sendToTelegram(chatId, "Cron manager service unavailable.");
      return;
    }

    try {
      ConsoleLogger.info("core", "Sending cron.schedule.list to cron-manager");
      const response = await this.sendAndWait(cronManager, "cron.schedule.list", {});
      ConsoleLogger.info("core", `Received response from cron-manager: ${JSON.stringify(response.payload).substring(0, 200)}`);
      const responsePayload = response.payload as { status?: string; result?: { schedules?: unknown[] } };
      const schedules = (responsePayload.result?.schedules ?? []) as Array<{
        id: string;
        cronExpr: string;
        taskType: string;
        enabled: boolean;
      }>;

      ConsoleLogger.info("core", `Found ${schedules.length} total schedules`);

      // Filter reminders for this chatId - we need to check the payload of each schedule
      // Since we can't easily query by chatId, we'll need to get schedule details
      // For now, filter by taskType === "reminder"
      const reminderSchedules = schedules.filter((s) => s.taskType === "reminder" && s.enabled);

      ConsoleLogger.info("core", `Found ${reminderSchedules.length} reminder schedules`);

      if (reminderSchedules.length === 0) {
        ConsoleLogger.info("core", "No reminders found, sending 'No active reminders' message");
        this.sendToTelegram(chatId, "No active reminders.");
        return;
      }

      // Format reminders - we'll show ID and cronExpr, but reminderMessage is in the payload
      // For a better implementation, we'd need to query each schedule's payload
      const formatted = reminderSchedules
        .map((rem) => `ID: ${rem.id}\nTime: ${rem.cronExpr}`)
        .join("\n\n---\n\n");
      const message = `Active reminders:\n\n${formatted}`;
      ConsoleLogger.info("core", `Sending reminder list to chatId ${chatId}: ${message.substring(0, 100)}...`);
      this.sendToTelegram(chatId, message);
    } catch (err) {
      const message = err instanceof Error ? err.message : String(err);
      ConsoleLogger.error("core", `Error in handleListReminders: ${message}`, err instanceof Error ? err : undefined);
      this.sendToTelegram(chatId, `Error listing reminders: ${message}`);
    }
  }

  private async handleCancelReminder(chatId: number, reminderId: string, _request: Envelope): Promise<void> {
    const cronManager = this.children.get("cron-manager");
    if (!cronManager?.stdin.writable) {
      this.sendToTelegram(chatId, "Cron manager service unavailable.");
      return;
    }

    try {
      const response = await this.sendAndWait(cronManager, "cron.schedule.remove", { id: reminderId });
      const responsePayload = response.payload as { status?: string; result?: { removed?: string } };
      if (responsePayload.result?.removed === reminderId) {
        this.sendToTelegram(chatId, `Reminder ${reminderId} has been canceled.`);
      } else {
        this.sendToTelegram(chatId, `Reminder ${reminderId} not found.`);
      }
    } catch (err) {
      const message = err instanceof Error ? err.message : String(err);
      this.sendToTelegram(chatId, `Error canceling reminder: ${message}`);
    }
  }

  private sendToTelegram(chatId: number, text: string, silent?: boolean): void {
    const telegram = this.children.get("telegram-adapter");
    if (!telegram?.stdin.writable) return;
    const envelope: Envelope = {
      id: randomUUID(),
      timestamp: Date.now(),
      from: "core",
      to: "telegram-adapter",
      type: "telegram.send",
      version: "1.0",
      payload: { chatId, text, silent },
    };
    telegram.stdin.write(JSON.stringify(envelope) + "\n");
    // Log outgoing message to telegram
    ConsoleLogger.ipc("core", "→", envelope);
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
      // Log outgoing request
      ConsoleLogger.ipc("core", "→", envelope);
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
