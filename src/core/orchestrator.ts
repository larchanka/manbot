/**
 * Core Orchestrator: central supervisor that spawns agents and services,
 * routes messages, and runs the task flow Telegram -> Planner -> Task Memory -> Executor -> Telegram.
 * P3-06: _board/TASKS/P3-06_CORE_ORCHESTRATOR.md
 */

import { createInterface } from "node:readline";
import { spawn, exec, type ChildProcess } from "node:child_process";
import { promisify } from "node:util";
import { randomUUID } from "node:crypto";
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";
import { mkdir, readdir, stat, unlink } from "node:fs/promises";
import { envelopeSchema } from "../shared/protocol.js";
import type { Envelope } from "../shared/protocol.js";
import { ConsoleLogger } from "../utils/console-logger.js";
import { getConfig } from "../shared/config.js";
import { LemonadeAdapter } from "../services/lemonade-adapter.js";
import { ModelRouter } from "../services/model-router.js";
import { ModelManagerService } from "../services/model-manager.js";
import type { FileIngestPayload, ProcessedFile } from "../shared/file-protocol.js";

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
  "dashboard": join(DIST, "services", "dashboard-service.js"),
  "file-processor": join(DIST, "services", "file-processor.js"),
};

interface ChildEntry {
  process: ChildProcess;
  name: string;
  stdin: NodeJS.WritableStream;
  scriptPath: string;
  startTime: number;
  restartCount: number;
  lastRestartTime: number | undefined;
}

type PendingResolve = (env: Envelope) => void;
type PendingReject = (env: Envelope) => void;

export class Orchestrator {
  private readonly children = new Map<string, ChildEntry>();
  private readonly pending = new Map<string, { resolve: PendingResolve; reject: PendingReject }>();
  private readonly modelManager: ModelManagerService;

  // Concurrency & Queueing
  private taskQueue: Array<{
    chatId: number;
    userId: number;
    goal: string;
    conversationId?: string | undefined;
    initialTaskId?: string | undefined;
    priority: number;
  }> = [];
  private activeTaskCount = 0;

  constructor() {
    const lemonade = new LemonadeAdapter();
    const modelRouter = new ModelRouter();
    this.modelManager = new ModelManagerService({ lemonade, modelRouter });
  }

  private spawnProcess(name: string, scriptPath: string, restartCount = 0): ChildEntry {
    const env = { ...process.env };
    // FP-PATH: Ensure common paths are present for tool execution on both macOS and Linux.
    // Prepend platform-specific paths but preserve the current Node version path at the very front.
    const home = env.HOME || env.USERPROFILE || "";
    const commonPaths = [
      // macOS Homebrew
      "/opt/homebrew/bin", "/opt/homebrew/sbin",
      // Shared
      "/usr/local/bin", "/usr/local/sbin",
      // Linux user paths (Go, pip, cargo, etc.)
      ...(home ? [
        `${home}/go/bin`,
        `${home}/.local/bin`,
        `${home}/.cargo/bin`,
      ] : []),
      // Snap (common on Debian/Ubuntu)
      "/snap/bin",
    ];
    const existingPath = env.PATH || "/usr/bin:/bin:/usr/sbin:/sbin";

    // Ensure we don't lose the path to the current node process
    const nodeDir = dirname(process.execPath);
    env.PATH = Array.from(new Set([nodeDir, ...commonPaths, ...existingPath.split(":")])).join(":");

    const child = spawn(process.execPath, [scriptPath], {
      cwd: ROOT,
      stdio: ["pipe", "pipe", "pipe"],
      env,
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
      this.handleProcessExit(name, code, signal);
    });
    const entry: ChildEntry = {
      process: child,
      name,
      stdin,
      scriptPath,
      startTime: Date.now(),
      restartCount,
      lastRestartTime: restartCount > 0 ? Date.now() : undefined
    };
    this.children.set(name, entry);
    ConsoleLogger.processEvent(name, restartCount > 0 ? "restart" : "spawn");
    return entry;
  }

  private handleProcessExit(name: string, code: number | null, signal: string | null): void {
    ConsoleLogger.processEvent(name, "exit", code ?? signal ?? undefined);

    // Don't restart if it was a clean exit (code 0) or if we're shutting down
    if (code === 0 || signal === "SIGTERM" || signal === "SIGINT") {
      this.children.delete(name);
      return;
    }

    const entry = this.children.get(name);
    if (!entry) return;

    const backoffTable = [1000, 2000, 5000, 10000, 30000]; // ms
    const delay = backoffTable[Math.min(entry.restartCount, backoffTable.length - 1)];

    ConsoleLogger.warn("core", `Process [${name}] exited unexpectedly (code ${code}, signal ${signal}). Restarting in ${delay}ms... (attempt ${entry.restartCount + 1})`);

    const dashboard = this.children.get("dashboard");
    if (dashboard?.stdin.writable) {
      dashboard.stdin.write(JSON.stringify({
        id: randomUUID(),
        timestamp: Date.now(),
        from: "core",
        to: "dashboard",
        type: "event.system.process_restart",
        version: "1.0",
        payload: { processName: name, restartCount: entry.restartCount + 1 }
      }) + "\n");
    }

    setTimeout(() => {
      this.spawnProcess(name, entry.scriptPath, entry.restartCount + 1);
    }, delay);
  }

  private handleLine(fromProcess: string, line: string): void {
    const trimmed = line.trim();
    if (!trimmed) return;
    try {
      const raw = JSON.parse(trimmed) as unknown;
      const envelope = envelopeSchema.parse(raw) as Envelope;

      // Log incoming IPC message
      ConsoleLogger.ipc("core", "←", envelope);
      this.broadcastIpcLog("←", fromProcess, "core", envelope);

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
      // Handle cron AI query events from cron-manager
      if (fromProcess === "cron-manager") {
        if (envelope.type === "event.cron.ai_query") {
          this.handleCronAIQueryEvent(envelope);
        } else if (envelope.type === "event.cron.completed") {
          const pl = envelope.payload as Record<string, unknown>;
          if (pl.taskType === "reminder") {
            this.handleCronReminderEvent(envelope);
          }
        }

        // Always forward cron events to logger for audit trail
        const logger = this.children.get("logger");
        if (logger?.stdin.writable) {
          logger.stdin.write(trimmed + "\n");
          ConsoleLogger.ipc("core", "→", envelope);
          this.broadcastIpcLog("→", "core", "logger", envelope);
        }

        // If it was one of our handled events, we're done
        if (envelope.type === "event.cron.ai_query" || envelope.type === "event.cron.completed") {
          return;
        }
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
        this.broadcastIpcLog("→", "core", to, envelope);
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

  private send(envelope: Envelope): void {
    const target = this.children.get(envelope.to);
    if (target?.stdin.writable) {
      target.stdin.write(JSON.stringify(envelope) + "\n");
      ConsoleLogger.ipc("core", "→", envelope);
      this.broadcastIpcLog("→", "core", envelope.to, envelope);
    } else {
      ConsoleLogger.warn("core", `Unknown target or process not writable: ${envelope.to}`, envelope);
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
    this.broadcastIpcLog("→", "core", to, envelope);
  }

  private broadcastIpcLog(direction: "←" | "→", fromP: string, toP: string, envelope: Envelope) {
    if (fromP === "dashboard" || toP === "dashboard" || envelope.to === "dashboard" || envelope.from === "dashboard") return;
    if (envelope.type === "event.system.heartbeat" || envelope.type === "event.dashboard.ipc_log") return;

    const dashboard = this.children.get("dashboard");
    if (dashboard?.stdin.writable) {
      dashboard.stdin.write(JSON.stringify({
        id: randomUUID(),
        timestamp: Date.now(),
        from: "core",
        to: "dashboard",
        type: "event.dashboard.ipc_log",
        version: "1.0",
        payload: { direction, fromProcess: fromP, toProcess: toP, message: envelope }
      }) + "\n");
    }
  }

  private handleCoreMessage(fromProcess: string, envelope: Envelope): void {
    const type = envelope.type;
    const payload = envelope.payload as Record<string, unknown>;

    if (type !== "event.system.heartbeat") {
      ConsoleLogger.info("core", `handleCoreMessage: type=${type}, fromProcess=${fromProcess}`);
    }

    if (type === "event.system.heartbeat") {
      const dashboard = this.children.get("dashboard");
      if (dashboard?.stdin.writable && fromProcess !== "dashboard") {
        dashboard.stdin.write(JSON.stringify({ ...envelope, to: "dashboard" }) + "\n");
      }
      return;
    }

    if (type === "chat.new" && fromProcess === "telegram-adapter") {
      const chatId = payload.chatId as number | undefined;
      const conversationId = payload.conversationId as string | undefined;
      if (chatId != null && conversationId != null) {
        this.runArchivingPipeline(chatId, conversationId).catch((err) => {
          ConsoleLogger.error("core", "Archiving pipeline error", err instanceof Error ? err : String(err), envelope);
          this.sendToTelegram(chatId, `😖 Archiving failed: ${err instanceof Error ? err.message : String(err)}`);
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
          this.sendToTelegram(chatId, `😖 Error listing reminders: ${err instanceof Error ? err.message : String(err)}`);
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
          this.sendToTelegram(chatId, `😖 Error canceling reminder: ${err instanceof Error ? err.message : String(err)}`);
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
        this.enqueueTask({
          chatId,
          userId: userId ?? 0,
          goal,
          conversationId,
          priority: 1
        });
      }
      return;
    }

    // FP-10: Handle file ingest from Telegram adapter
    if (type === "file.ingest" && fromProcess === "telegram-adapter") {
      const p = payload as unknown as FileIngestPayload;
      this.handleFileIngest(p).catch((err) => {
        ConsoleLogger.error("core", "File ingest error", err instanceof Error ? err : String(err), envelope);
        this.sendToTelegram(p.chatId, `😖 File processing error: ${err instanceof Error ? err.message : String(err)}`);
      });
      return;
    }

    // FP-SEND: Handle file sending request
    if (type === "telegram.send_file" && fromProcess !== "telegram-adapter") {
      const chatId = payload.chatId as number | undefined;
      const localPath = payload.localPath as string | undefined;
      if (chatId != null && localPath != null) {
        this.sendFileToTelegram(chatId, localPath, payload.caption as string | undefined);
      }
      return;
    }
  }

  private enqueueTask(task: {
    chatId: number;
    userId: number;
    goal: string;
    conversationId?: string | undefined;
    initialTaskId?: string | undefined;
    priority: number;
  }): void {
    const limit = getConfig().maxConcurrentTasks;
    const taskId = task.initialTaskId || randomUUID();
    const taskWithId = { ...task, initialTaskId: taskId };

    // Create task in memory immediately as 'pending' so it shows up in dashboard while in queue
    const taskMemory = this.children.get("task-memory");
    if (taskMemory?.stdin.writable) {
      this.send({
        id: randomUUID(),
        timestamp: Date.now(),
        from: "core",
        to: "task-memory",
        type: "task.create",
        version: "1.0",
        payload: {
          taskId,
          userId: String(task.userId),
          conversationId: task.conversationId ?? String(task.chatId),
          goal: task.goal,
          status: "pending",
          complexity: "unknown",
          nodes: [],
          edges: []
        }
      });
    }

    if (limit === 0) {
      // Infinite concurrency
      this.runTaskPipeline(taskWithId.chatId, taskWithId.userId, taskWithId.goal, taskWithId.conversationId, taskWithId.initialTaskId);
      return;
    }

    // Insert into queue with priority (Human priority 1 > Synthetic priority 0)
    if (task.priority > 0) {
      // Human goals go to the front
      this.taskQueue.unshift(taskWithId);
    } else {
      // Synthetic goals go to the back
      this.taskQueue.push(taskWithId);
    }

    this.processQueue();
  }

  private processQueue(): void {
    const limit = getConfig().maxConcurrentTasks;
    if (limit === 0) return; // Managed by direct execution in enqueueTask

    while (this.activeTaskCount < limit && this.taskQueue.length > 0) {
      const task = this.taskQueue.shift()!;
      this.activeTaskCount++;

      this.runTaskPipeline(task.chatId, task.userId, task.goal, task.conversationId, task.initialTaskId)
        .finally(() => {
          this.activeTaskCount--;
          this.processQueue();
        });
    }
  }

  private static readonly MAX_PLAN_RETRIES = 2; // 3 attempts total (0, 1, 2)

  private async runTaskPipeline(
    chatId: number,
    userId: number,
    goal: string,
    conversationId?: string,
    initialTaskId?: string
  ): Promise<void> {
    const planner = this.children.get("planner");
    const taskMemory = this.children.get("task-memory");
    const executor = this.children.get("executor");
    const telegram = this.children.get("telegram-adapter");
    if (!planner?.stdin.writable || !taskMemory?.stdin.writable || !executor?.stdin.writable || !telegram?.stdin.writable) {
      this.sendToTelegram(chatId, "🛑 Service unavailable.");
      return;
    }

    const plannerComplexity = getConfig().modelRouter.plannerComplexity;
    let lastError: string = "";
    let previousPlan: { nodes: unknown[]; edges?: unknown[] } | undefined;

    // Fetch conversation history if conversationId is provided
    let conversationHistory = "";
    if (conversationId) {
      try {
        const tasksEnv = await this.sendAndWait(taskMemory, "task.getByConversationId", { conversationId });
        const tasksPayload = tasksEnv.payload as { status?: string; result?: { tasks?: Array<{ id: string; goal: string; status: string }> } };
        const tasks = tasksPayload.result?.tasks ?? [];

        // Only take the last 5 tasks for context to avoid bloating the prompt
        const lastTasks = tasks.slice(-5);
        const historyParts: string[] = [];

        for (const t of lastTasks) {
          try {
            const taskDetail = await this.sendAndWait(taskMemory, "task.get", { taskId: t.id });
            const result = (taskDetail.payload as { result?: { nodes?: Array<{ output?: string }> } }).result;
            const nodes = result?.nodes ?? [];
            const lastOutput = nodes.filter((n) => n.output != null && n.output !== "").pop()?.output ?? "";
            const resultText = typeof lastOutput === "string" ? lastOutput : JSON.stringify(lastOutput);
            if (resultText) {
              historyParts.push(`User: ${t.goal}\nAssistant: ${resultText.substring(0, 500)}${resultText.length > 500 ? "..." : ""}`);
            }
          } catch (err) {
            ConsoleLogger.warn("core", `Failed to fetch details for task ${t.id} during history retrieval`);
          }
        }
        conversationHistory = historyParts.join("\n\n");
        ConsoleLogger.debug("core", `Fetched history for ${conversationId}: ${historyParts.length} tasks found.`);
        if (conversationHistory) {
          ConsoleLogger.debug("core", `Conversation history summary:\n${conversationHistory.substring(0, 200)}...`);
        }
      } catch (err) {
        ConsoleLogger.warn("core", `Failed to fetch conversation history for ${conversationId}`);
      }
    } else {
      ConsoleLogger.debug("core", "No conversationId provided, history fetch skipped.");
    }

    for (let attempt = 0; attempt <= Orchestrator.MAX_PLAN_RETRIES; attempt++) {
      const taskId = (attempt === 0 && initialTaskId) ? initialTaskId : randomUUID();
      const isRetry = attempt > 0;
      if (isRetry) {
        this.sendToTelegram(chatId, "⏳ Re-planning with error feedback...", true);
        // Create new task entry for the retry (new taskId)
        await this.sendAndWait(taskMemory, "task.create", {
          taskId,
          userId: String(userId),
          conversationId: conversationId ?? String(chatId),
          goal,
          status: "planning",
          complexity: "unknown",
          nodes: [],
          edges: []
        }).catch(() => { });
      } else {
        // Explicitly update task to 'planning' state (it was 'pending' if it came through enqueueTask)
        await this.sendAndWait(taskMemory, "task.updateStatus", {
          taskId,
          status: "planning",
          complexity: "unknown"
        }).catch(() => {
          // Fallback: if updateStatus failed (e.g. task not created yet due to race), try creating it
          return this.sendAndWait(taskMemory, "task.create", {
            taskId,
            userId: String(userId),
            conversationId: conversationId ?? String(chatId),
            goal,
            status: "planning",
            complexity: "unknown",
            nodes: [],
            edges: []
          }).catch(() => { });
        });
        this.sendToTelegram(chatId, "🪏 Planning started...", true);
      }

      const planCreatePayload: Record<string, unknown> = {
        goal,
        complexity: plannerComplexity,
        history: conversationHistory,
      };
      if (lastError) {
        planCreatePayload.previousError = lastError;
        if (previousPlan) planCreatePayload.previousPlan = previousPlan;
      }

      let planEnv: Envelope;
      try {
        planEnv = await this.sendAndWait(planner, "plan.create", planCreatePayload);
      } catch (errEnv) {
        const err = errEnv as Envelope & { payload?: { message?: string; details?: Record<string, unknown> } };
        lastError = err.payload?.message ?? "😨 Planning failed.";
        const details = err.payload?.details;
        if (details && typeof details === "object") {
          const parts: string[] = [lastError];
          if (details.nodeInput != null) parts.push(`Node input: ${JSON.stringify(details.nodeInput)}`);
          if (details.originalErrorMessage != null) parts.push(String(details.originalErrorMessage));
          lastError = parts.join(" ");
        }
        if (attempt === Orchestrator.MAX_PLAN_RETRIES) {
          this.sendToTelegram(chatId, lastError);
          return;
        }
        continue;
      }

      const planPayload = planEnv.payload as { status?: string; result?: unknown };
      const plan = planPayload.result as { nodes: unknown[]; edges?: unknown[]; complexity?: string } | undefined;
      if (!plan?.nodes || !Array.isArray(plan.nodes)) {
        lastError = "Invalid plan from planner: missing or invalid nodes.";
        if (attempt === Orchestrator.MAX_PLAN_RETRIES) {
          this.sendToTelegram(chatId, lastError);
          return;
        }
        continue;
      }

      previousPlan = plan;
      const nodes = plan.nodes as Array<{ id: string; type: string; service: string; input?: unknown }>;
      const edges = (plan.edges ?? []) as Array<{ from: string; to: string }>;

      // Update task DAG in memory
      await this.sendAndWait(taskMemory, "task.updateDag", {
        taskId,
        nodes: nodes.map((n) => ({ id: n.id, type: n.type, service: n.service, input: n.input })),
        edges: edges
          .filter((e) => e && typeof e === "object" && e.from && e.to)
          .map((e) => ({ fromNode: e.from, toNode: e.to })),
        complexity: plan.complexity ?? "medium"
      }).catch(() => { });

      this.sendToTelegram(chatId, "💨 Planning complete. Execution started...", true);

      // Explicitly set task to 'running' before dispatching to executor
      await this.sendAndWait(taskMemory, "task.updateStatus", { taskId, status: "running" }).catch(() => { });

      let execEnv: Envelope;
      try {
        execEnv = await this.sendAndWait(executor, "plan.execute", { taskId, plan, goal, chatId, userId, conversationId });
      } catch (errEnv) {
        const err = errEnv as Envelope & { payload?: { message?: string; details?: Record<string, unknown> } };
        lastError = err.payload?.message ?? "😨 Execution failed.";
        const details = err.payload?.details;
        if (details && typeof details === "object") {
          const parts: string[] = [lastError];
          if (details.nodeId != null) parts.push(`Node: ${details.nodeId}`);
          if (details.nodeInput != null) parts.push(`Input: ${JSON.stringify(details.nodeInput)}`);
          if (details.originalErrorMessage != null) parts.push(String(details.originalErrorMessage));
          lastError = parts.join(". ");
        }
        if (attempt === Orchestrator.MAX_PLAN_RETRIES) {
          this.sendToTelegram(chatId, lastError);
          return;
        }
        continue;
      }

      const execPayload = execEnv.payload as { status?: string; result?: any };
      const result = execPayload.result;
      let text: string;

      if (typeof result === "string") {
        text = result;
      } else if (result != null && typeof result === "object" && typeof result.text === "string") {
        text = result.text;
      } else if (result != null && typeof result === "object" && typeof result.result === "string") {
        text = result.result;
      } else {
        // Result is raw data (JSON object from tool, etc.) — run through analyzer
        const rawData = JSON.stringify(result ?? "✅ Done.");
        const modelRouterChild = this.children.get("model-router");
        if (modelRouterChild?.stdin.writable) {
          try {
            const analyzerEnv = await this.sendAndWait(modelRouterChild, "node.execute", {
              taskId: `analyze-${taskId}`,
              nodeId: "fallback-analyzer",
              type: "generate_text",
              service: "model-router",
              input: {
                prompt: `User asked: "${goal}". Here is the data:\n\n${rawData}`,
                system_prompt: "analyzer",
              },
            });
            const analyzerPayload = analyzerEnv.payload as { status?: string; result?: { text?: string } };
            text = analyzerPayload.result?.text ?? rawData;
          } catch {
            text = rawData;
          }
        } else {
          text = rawData;
        }
      }
      this.sendToTelegram(chatId, text, false, "HTML");
      // Mark task as completed after message is sent
      this.sendAndWait(taskMemory, "task.complete", { taskId }).catch(() => { });
      return;
    }

    this.sendToTelegram(chatId, lastError || "Task failed after retries.");
  }

  // ---------------------------------------------------------------------------
  // FP-10: File ingest pipeline
  // ---------------------------------------------------------------------------

  private async handleFileIngest(p: FileIngestPayload): Promise<void> {
    const { chatId, userId, conversationId, files, caption } = p;
    const fileProcessor = this.children.get("file-processor");
    const ragService = this.children.get("rag-service");
    const modelRouter = this.children.get("model-router");

    if (!fileProcessor?.stdin.writable) {
      this.sendToTelegram(chatId, "⚠️ File processing service unavailable.", true);
      return;
    }

    const taskId = randomUUID();
    // Create placeholder task in memory so it shows up in dashboard during processing
    const taskMemory = this.children.get("task-memory");
    if (taskMemory?.stdin.writable) {
      this.send({
        id: randomUUID(),
        timestamp: Date.now(),
        from: "core",
        to: "task-memory",
        type: "task.create",
        version: "1.0",
        payload: {
          taskId,
          userId: String(userId),
          conversationId: conversationId ?? String(chatId),
          goal: caption || "Processing uploaded files...",
          status: "pending",
          complexity: "unknown",
          nodes: [],
          edges: []
        }
      });
    }

    // Notify user processing has started
    const fileWord = files.length === 1 ? "file" : "files";
    this.sendToTelegram(chatId, `⏳ Processing ${files.length} ${fileWord}...`, true);

    // Process all files in parallel — allSettled so one failure doesn't cancel others
    const results = await Promise.allSettled(
      files.map((file) =>
        this.sendAndWait(fileProcessor, "file.process", {
          fileId: file.fileId,
          localPath: file.localPath,
          fileName: file.fileName,
          mimeType: file.mimeType,
          category: file.category,
        }),
      ),
    );

    const warnings: string[] = [];
    const inlineContextParts: string[] = [];
    let audioTranscript: string | undefined;

    for (let i = 0; i < results.length; i++) {
      const r = results[i]!;
      const file = files[i]!;

      if (r.status === "rejected") {
        const msg = r.reason instanceof Error ? r.reason.message : String(r.reason);
        warnings.push(`⚠️ Failed to process "${file.fileName}": ${msg}`);
        continue;
      }

      const env = r.value;
      const pl = env.payload as { status?: string; result?: ProcessedFile };
      const processed = pl.result;

      if (!processed) {
        warnings.push(`⚠️ No result for "${file.fileName}"`);
        continue;
      }

      switch (processed.type) {
        case "text": {
          inlineContextParts.push(`--- file: ${processed.fileName} ---\n${processed.content}\n---`);
          break;
        }
        case "text_long": {
          if (ragService?.stdin.writable && modelRouter?.stdin.writable) {
            const ragNote = await this.indexLongText(
              processed.content,
              processed.fileName,
              conversationId,
              modelRouter,
              ragService,
            );
            inlineContextParts.push(ragNote);
          } else {
            // Fallback: truncate and inline if RAG unavailable
            const truncated = processed.content.slice(0, 6000);
            inlineContextParts.push(`--- file: ${processed.fileName} (truncated) ---\n${truncated}\n---`);
          }
          break;
        }
        case "image_ocr": {
          inlineContextParts.push(`--- image: ${processed.fileName} ---\n${processed.content}\n---`);
          break;
        }
        case "audio_transcript": {
          audioTranscript = processed.content;
          break;
        }
        case "ignored": {
          const meta = processed.metadata as { reason?: string; error?: string };
          const reason = meta.reason || meta.error || "unsupported format";
          warnings.push(`⚠️ "${processed.fileName}" skipped: ${reason}`);
          break;
        }
      }
    }

    // Send warnings silently before running the pipeline
    if (warnings.length > 0) {
      // Use plain text for warnings to avoid issues with filenames containing underscores
      this.sendToTelegram(chatId, warnings.join("\n"), true, undefined as any);
    }

    // Build the enriched goal
    const inlineContext = inlineContextParts.join("\n\n");
    let enrichedGoal: string;

    if (audioTranscript && !caption) {
      // Audio transcript is the primary goal
      enrichedGoal = audioTranscript;
    } else if (audioTranscript && caption) {
      enrichedGoal = `${caption}\n\n[Audio transcript: ${audioTranscript}]`;
    } else if (inlineContext && caption) {
      enrichedGoal = `${caption}\n\n${inlineContext}`;
    } else if (inlineContext) {
      // Default intent if user sent files without a caption
      enrichedGoal = `Analyze the provided file(s) and provide a concise summary or extraction of the contents:\n\n${inlineContext}`;
    } else if (caption) {
      enrichedGoal = caption;
    } else {
      // Everything was ignored or failed with no caption
      if (warnings.length > 0) {
        this.sendToTelegram(chatId, "⚠️ No processable content found in the uploaded files.", true);
      }
      return;
    }

    // Guard against absurdly large goals (cap inline context at ~32k chars)
    const MAX_GOAL_CHARS = 32_000;
    if (enrichedGoal.length > MAX_GOAL_CHARS) {
      enrichedGoal = enrichedGoal.slice(0, MAX_GOAL_CHARS) + "\n\n[...content truncated for context limit]";
    }

    // Run the task pipeline with the enriched goal
    ConsoleLogger.debug("core", `Running task pipeline with enriched goal (length: ${enrichedGoal.length})`);
    await this.runTaskPipeline(chatId, userId, enrichedGoal, conversationId, taskId);
  }

  // ---------------------------------------------------------------------------
  // FP-11: Long text chunking, summarisation, and RAG indexing
  // ---------------------------------------------------------------------------

  private async indexLongText(
    content: string,
    fileName: string,
    conversationId: string,
    modelRouter: ChildEntry,
    ragService: ChildEntry,
  ): Promise<string> {
    const CHUNK_SIZE = 2000;
    const OVERLAP = 200;
    const chunks: string[] = [];

    // Chunk with overlap
    for (let start = 0; start < content.length; start += CHUNK_SIZE - OVERLAP) {
      chunks.push(content.slice(start, start + CHUNK_SIZE));
    }

    ConsoleLogger.info("core", `Indexing "${fileName}" into RAG: ${chunks.length} chunk(s)`);

    // Summarise each chunk (limit concurrency to 3)
    const summaries: string[] = [];
    const CONCURRENCY = 3;
    for (let i = 0; i < chunks.length; i += CONCURRENCY) {
      const batch = chunks.slice(i, i + CONCURRENCY);
      const batchResults = await Promise.allSettled(
        batch.map((chunk, idx) =>
          this.sendAndWait(modelRouter, "node.execute", {
            taskId: `file-index-${randomUUID()}`,
            nodeId: `chunk-${i + idx}`,
            type: "generate_text",
            service: "model-router",
            input: {
              prompt: `Summarize this section of a document concisely, preserving all key facts, numbers, and structure:\n\n${chunk}`,
              system_prompt: "summarizer",
            },
          }),
        ),
      );
      for (const res of batchResults) {
        if (res.status === "fulfilled") {
          const pl = res.value.payload as { result?: { text?: string } };
          summaries.push(pl.result?.text ?? "");
        }
        // Failed chunks are skipped silently
      }
    }

    // Insert each summary into RAG
    await Promise.allSettled(
      summaries.map((summary, idx) =>
        this.sendAndWait(ragService, "memory.semantic.insert", {
          content: summary,
          metadata: {
            source: "file",
            fileName,
            conversationId,
            uploadedAt: Date.now(),
            chunkIndex: idx,
          },
        }),
      ),
    );

    return (
      `File "${fileName}" has been indexed (${summaries.length} section(s)). ` +
      `Use semantic search to retrieve relevant content.`
    );
  }

  private async runArchivingPipeline(chatId: number, conversationId: string): Promise<void> {
    const taskMemory = this.children.get("task-memory");
    const modelRouter = this.children.get("model-router");
    const ragService = this.children.get("rag-service");
    if (!taskMemory?.stdin.writable || !modelRouter?.stdin.writable || !ragService?.stdin.writable) {
      this.sendToTelegram(chatId, "⚠️ Service unavailable for archiving.");
      return;
    }
    let tasksEnv: Envelope;
    try {
      tasksEnv = await this.sendAndWait(taskMemory, "task.getByConversationId", { conversationId });
    } catch {
      this.sendToTelegram(chatId, "✅ Archived."); // no history or error
      return;
    }
    const tasksPayload = tasksEnv.payload as { status?: string; result?: { tasks?: Array<{ id: string; goal: string; status: string }> } };
    const tasks = tasksPayload.result?.tasks ?? [];
    if (tasks.length === 0) {
      this.sendToTelegram(chatId, "✅ Archived. (No previous tasks found in this session.)");
      return;
    }

    // Only archive the last 20 tasks to avoid prompt explosion while still capturing recent context
    const recentTasks = tasks.slice(-20);
    this.sendToTelegram(chatId, `🧠 Archiving ${recentTasks.length} task(s)...`, true);

    const historyParts: string[] = [];
    for (const t of recentTasks) {
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
      const resultTextRaw = typeof lastOutput === "string" ? lastOutput : JSON.stringify(lastOutput);

      // Truncate individual task outputs to 2000 chars for summarization
      const resultText = resultTextRaw.length > 2000
        ? resultTextRaw.substring(0, 2000) + "... [truncated]"
        : resultTextRaw;

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
      this.sendToTelegram(chatId, `😖 Archiving failed: ${err.payload?.message ?? "Summarization error"}`);
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
      this.sendToTelegram(chatId, "⚠️ Summary produced but RAG storage failed. Check logs.");
      return;
    }

    // Emit success event
    this.send({
      id: randomUUID(),
      timestamp: Date.now(),
      from: "core",
      to: "logger",
      type: "event.archiving.completed",
      version: "1.0",
      payload: { chatId, conversationId, taskCount: tasks.length }
    });

    this.sendToTelegram(chatId, "✅ Archived. Conversation summary has been stored in your long-term memory.");
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

    this.sendToTelegram(chatIdNum, formattedMessage, false, "HTML");
  }

  private handleCronAIQueryEvent(envelope: Envelope): void {
    const payload = envelope.payload as Record<string, unknown>;
    const query = payload.query as string | undefined;
    const chatId = payload.chatId as number | string | undefined;
    const userId = payload.userId as number | string | undefined;

    if (!query || !chatId) {
      ConsoleLogger.warn("core", "event.cron.ai_query missing query or chatId", envelope);
      return;
    }

    const chatIdNum = typeof chatId === "string" ? parseInt(chatId, 10) : chatId;
    const userIdNum = typeof userId === "string" ? parseInt(userId, 10) : (userId ?? 0);
    const taskId = randomUUID();

    ConsoleLogger.info("core", `Triggering autonomous AI task: "${query}" for chatId ${chatIdNum} (taskId: ${taskId})`);

    // TODO: Immediate feedback so user knows the cron triggered
    // this.sendToTelegram(chatIdNum, `🤖 <b>Autonomous task triggered</b>:\n<blockquote>${query}</blockquote>\n\nStarting planning...`, true, "HTML");

    // Route to task queue (priority 0 for synthetic)
    this.enqueueTask({
      chatId: chatIdNum,
      userId: userIdNum,
      goal: query,
      conversationId: String(chatIdNum),
      initialTaskId: taskId,
      priority: 0
    });
  }

  private async handleListReminders(chatId: number, _request: Envelope): Promise<void> {
    ConsoleLogger.info("core", `handleListReminders called for chatId: ${chatId}`);
    const cronManager = this.children.get("cron-manager");
    if (!cronManager?.stdin.writable) {
      ConsoleLogger.warn("core", "Cron manager not available or not writable");
      this.sendToTelegram(chatId, "⚠️ Cron manager service unavailable.");
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
        payload: string;
        enabled: boolean;
      }>;

      ConsoleLogger.info("core", `Found ${schedules.length} total schedules`);

      // Filter reminders for this chatId
      const filteredSchedules = schedules.filter((s) => {
        if (!s.enabled) return false;
        if (s.taskType !== "reminder" && s.taskType !== "ai_query") return false;

        try {
          const payload = JSON.parse(s.payload);
          return payload.chatId === chatId;
        } catch (err) {
          return false;
        }
      });

      ConsoleLogger.info("core", `Found ${filteredSchedules.length} filtered schedules for chatId ${chatId}`);

      if (filteredSchedules.length === 0) {
        ConsoleLogger.info("core", "No reminders found, sending 'No active reminders' message");
        this.sendToTelegram(chatId, "👌🏻 No active reminders.");
        return;
      }

      // Format reminders - include message/query and task type
      const formatted = filteredSchedules
        .map((s) => {
          let message = "N/A";
          try {
            const p = JSON.parse(s.payload);
            message = p.reminderMessage || p.query || "N/A";
          } catch (e) { }

          const typeLabel = s.taskType === "ai_query" ? "🤖 Task" : "🔔 Reminder";
          return `<b>${typeLabel}</b>\nID: <code>${s.id}</code>\nTime: <code>${s.cronExpr}</code>\n<blockquote>Message: ${message.substring(0, 100)}...</blockquote>`;
        })
        .join("\n\n---\n\n");

      const message = `⏰ <b>Active schedules:</b>\n\n${formatted}`;
      ConsoleLogger.info("core", `Sending reminder list to chatId ${chatId}: ${message.substring(0, 100)}...`);
      this.sendToTelegram(chatId, message, false, "HTML");
    } catch (err) {
      const message = err instanceof Error ? err.message : String(err);
      ConsoleLogger.error("core", `Error in handleListReminders: ${message}`, err instanceof Error ? err : undefined);
      this.sendToTelegram(chatId, `😨 Error listing reminders: ${message}`);
    }
  }

  private async handleCancelReminder(chatId: number, reminderId: string, _request: Envelope): Promise<void> {
    const cronManager = this.children.get("cron-manager");
    if (!cronManager?.stdin.writable) {
      this.sendToTelegram(chatId, "⚠️ Cron manager service unavailable.");
      return;
    }

    try {
      // Security: verify that this reminder belongs to this chatId
      const listResponse = await this.sendAndWait(cronManager, "cron.schedule.list", {});
      const listPayload = listResponse.payload as { result?: { schedules?: Array<{ id: string; payload: string }> } };
      const schedules = listPayload.result?.schedules ?? [];
      const targetSchedule = schedules.find(s => s.id === reminderId);

      if (!targetSchedule) {
        this.sendToTelegram(chatId, `😨 Reminder <code>${reminderId}</code> not found.`);
        return;
      }

      try {
        const payload = JSON.parse(targetSchedule.payload);
        if (payload.chatId !== chatId) {
          this.sendToTelegram(chatId, `❌ You are not authorized to cancel this reminder.`);
          return;
        }
      } catch (e) {
        // If payload is malformed or missing chatId, we might want to prevent deletion or allow it?
        // Let's be conservative: if we can't confirm ownership, we reject.
        // UNLESS we are superuser (could add later).
        this.sendToTelegram(chatId, `❌ Security check failed for reminder <code>${reminderId}</code>.`);
        return;
      }

      const response = await this.sendAndWait(cronManager, "cron.schedule.remove", { id: reminderId });
      const responsePayload = response.payload as { status?: string; result?: { removed?: string } };
      if (responsePayload.result?.removed === reminderId) {
        this.sendToTelegram(chatId, `🟢 Reminder <code>${reminderId}</code> has been canceled.`);
      } else {
        this.sendToTelegram(chatId, `😨 Reminder <code>${reminderId}</code> not found.`);
      }
    } catch (err) {
      const message = err instanceof Error ? err.message : String(err);
      this.sendToTelegram(chatId, `😨 Error canceling reminder: ${message}`);
    }
  }

  /**
   * Split text into chunks that fit within Telegram's 4096 character limit.
   * Tries to split at newlines to avoid breaking sentences.
   */
  private splitMessage(text: string, maxLength: number = 4096): string[] {
    if (text.length <= maxLength) {
      return [text];
    }

    const chunks: string[] = [];
    let remaining = text;

    while (remaining.length > 0) {
      if (remaining.length <= maxLength) {
        chunks.push(remaining);
        break;
      }

      // Try to find a good split point (newline) within the limit
      let splitIndex = maxLength;
      const lastNewline = remaining.lastIndexOf('\n', maxLength);

      if (lastNewline > maxLength * 0.7) {
        // If we found a newline in the last 30% of the chunk, use it
        splitIndex = lastNewline + 1;
      } else {
        // Otherwise, try to split at a space
        const lastSpace = remaining.lastIndexOf(' ', maxLength);
        if (lastSpace > maxLength * 0.7) {
          splitIndex = lastSpace + 1;
        }
      }

      chunks.push(remaining.substring(0, splitIndex));
      remaining = remaining.substring(splitIndex);
    }

    return chunks;
  }

  private sendToTelegram(chatId: number, text: string, silent?: boolean, parseMode?: "HTML" | "Markdown"): void {
    const telegram = this.children.get("telegram-adapter");
    if (!telegram?.stdin.writable) return;

    // Split message if it's too long (Telegram limit is 4096 characters).
    // We use a safe buffer (3000) to account for MarkdownV2 escaping growth and continuation markers.
    const chunks = this.splitMessage(text, 4000);

    chunks.forEach((chunk, index) => {
      let messageText = chunk;

      // Add continuation markers for multi-part messages
      if (chunks.length > 1) {
        if (index === 0) {
          messageText = chunk + `\n\n(continued... ${index + 1}/${chunks.length})`;
        } else if (index === chunks.length - 1) {
          messageText = `(part ${index + 1}/${chunks.length})\n\n` + chunk;
        } else {
          messageText = `(part ${index + 1}/${chunks.length})\n\n` + chunk + `\n\n(continued...)`;
        }
      }

      const envelope: Envelope = {
        id: randomUUID(),
        timestamp: Date.now(),
        from: "core",
        to: "telegram-adapter",
        type: "telegram.send",
        version: "1.0",
        payload: { chatId, text: messageText, silent, parseMode: parseMode ?? "HTML" },
      };
      telegram.stdin.write(JSON.stringify(envelope) + "\n");
      ConsoleLogger.ipc("core", "→", envelope);
    });
  }

  private sendFileToTelegram(chatId: number, localPath: string, caption?: string): void {
    const telegram = this.children.get("telegram-adapter");
    if (!telegram?.stdin.writable) return;

    const envelope: Envelope = {
      id: randomUUID(),
      timestamp: Date.now(),
      from: "core",
      to: "telegram-adapter",
      type: "telegram.send_file",
      version: "1.0",
      payload: { chatId, localPath, caption },
    };
    telegram.stdin.write(JSON.stringify(envelope) + "\n");
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

  private async verifySystemDependencies(): Promise<void> {
    const execAsync = promisify(exec);
    try {
      await execAsync("lynx --version");
      ConsoleLogger.info("core", "Dependency check passed: lynx found.");
    } catch (err) {
      ConsoleLogger.warn("core", "Dependency check failed: 'lynx' not found. Research skill will be non-functional.");
    }
  }

  start(): void {
    this.verifySystemDependencies().catch((err) => {
      ConsoleLogger.error("core", "Dependency verification error", err);
    });

    // FP-13: Ensure upload directory exists and clean up orphaned files (> 1h old)
    this.initUploadDirectory().catch((err) => {
      ConsoleLogger.warn("core", `Upload directory init error: ${err instanceof Error ? err.message : String(err)}`);
    });

    for (const [name, scriptPath] of Object.entries(PROCESS_SCRIPTS)) {
      this.spawnProcess(name, scriptPath);
    }
    // Non-blocking pre-warm of small and medium models.
    ConsoleLogger.info("core", "Model prewarming started...");
    this.modelManager.prewarmModels()
      .then(() => ConsoleLogger.info("core", "Model prewarming complete."))
      .catch((err: unknown) =>
        ConsoleLogger.warn("core", `Model prewarming failed: ${err instanceof Error ? err.message : String(err)}`)
      );
  }

  /** FP-13: Create uploads dir and purge stale orphan files from crashed sessions. */
  private async initUploadDirectory(): Promise<void> {
    const uploadDir = getConfig().fileProcessor.uploadDir;
    await mkdir(uploadDir, { recursive: true });

    const ORPHAN_AGE_MS = 60 * 60 * 1000; // 1 hour
    const now = Date.now();
    let deleted = 0;
    try {
      const entries = await readdir(uploadDir, { withFileTypes: true });
      await Promise.all(
        entries.map(async (entry) => {
          const entryPath = join(uploadDir, entry.name);
          try {
            if (entry.isDirectory()) {
              // Scan conversation subdirectories
              const subEntries = await readdir(entryPath, { withFileTypes: true });
              await Promise.all(
                subEntries.map(async (sub) => {
                  const subPath = join(entryPath, sub.name);
                  const s = await stat(subPath);
                  if (now - s.mtimeMs > ORPHAN_AGE_MS) {
                    await unlink(subPath).catch(() => { });
                    deleted++;
                  }
                }),
              );
            } else {
              const s = await stat(entryPath);
              if (now - s.mtimeMs > ORPHAN_AGE_MS) {
                await unlink(entryPath).catch(() => { });
                deleted++;
              }
            }
          } catch {
            // Ignore per-file stat errors
          }
        }),
      );
    } catch {
      // Directory may be empty or scanning failed — non-fatal
    }
    if (deleted > 0) {
      ConsoleLogger.info("core", `Upload dir cleanup: removed ${deleted} orphaned file(s) from ${uploadDir}`);
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

const isESMMain = typeof import.meta !== 'undefined' && import.meta.url && process.argv[1] === fileURLToPath(import.meta.url);
const isCJSMain = typeof require !== 'undefined' && require.main === module;

if (isESMMain || isCJSMain) {
  main();
}
