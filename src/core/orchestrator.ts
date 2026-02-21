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
import { OllamaAdapter } from "../services/ollama-adapter.js";
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
}

type PendingResolve = (env: Envelope) => void;
type PendingReject = (env: Envelope) => void;

export class Orchestrator {
  private readonly children = new Map<string, ChildEntry>();
  private readonly pending = new Map<string, { resolve: PendingResolve; reject: PendingReject }>();
  private readonly modelManager: ModelManagerService;

  constructor() {
    const ollama = new OllamaAdapter();
    const modelRouter = new ModelRouter();
    this.modelManager = new ModelManagerService({ ollama, modelRouter });
  }

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
    ConsoleLogger.info("core", `handleCoreMessage: type=${type}, fromProcess=${fromProcess}`);
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

    // FP-10: Handle file ingest from Telegram adapter
    if (type === "file.ingest" && fromProcess === "telegram-adapter") {
      const p = (payload as unknown) as FileIngestPayload;
      this.handleFileIngest(p).catch((err) => {
        ConsoleLogger.error("core", "File ingest error", err instanceof Error ? err : String(err), envelope);
        this.sendToTelegram(p.chatId, `File processing error: ${err instanceof Error ? err.message : String(err)}`);
      });
    }
  }

  private static readonly MAX_PLAN_RETRIES = 2; // 3 attempts total (0, 1, 2)

  private async runTaskPipeline(chatId: number, userId: number, goal: string, conversationId?: string): Promise<void> {
    const planner = this.children.get("planner");
    const taskMemory = this.children.get("task-memory");
    const executor = this.children.get("executor");
    const telegram = this.children.get("telegram-adapter");
    if (!planner?.stdin.writable || !taskMemory?.stdin.writable || !executor?.stdin.writable || !telegram?.stdin.writable) {
      this.sendToTelegram(chatId, "Service unavailable.");
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
      const taskId = randomUUID();
      const isRetry = attempt > 0;
      if (isRetry) {
        this.sendToTelegram(chatId, "Re-planning with error feedback...", true);
      } else {
        this.sendToTelegram(chatId, "Planning started...", true);
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
        lastError = err.payload?.message ?? "Planning failed.";
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
      const taskCreatePayload = {
        taskId,
        userId: String(userId),
        conversationId: conversationId ?? String(chatId),
        goal,
        complexity: plan.complexity,
        nodes: nodes.map((n) => ({ id: n.id, type: n.type, service: n.service, input: n.input })),
        edges: edges
          .filter((e) => e && typeof e === "object" && e.from && e.to)
          .map((e) => ({ fromNode: e.from, toNode: e.to })),
      };
      this.sendAndWait(taskMemory, "task.create", taskCreatePayload).catch(() => { });

      this.sendToTelegram(chatId, "Planning complete. Execution started...", true);
      let execEnv: Envelope;
      try {
        execEnv = await this.sendAndWait(executor, "plan.execute", { taskId, plan, goal, chatId, userId, conversationId });
      } catch (errEnv) {
        const err = errEnv as Envelope & { payload?: { message?: string; details?: Record<string, unknown> } };
        lastError = err.payload?.message ?? "Execution failed.";
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
        const rawData = JSON.stringify(result ?? "Done.");
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
      this.sendToTelegram(chatId, text, false, "Markdown");
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
        this.sendToTelegram(chatId, "No processable content found in the uploaded files.", true);
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
    await this.runTaskPipeline(chatId, userId, enrichedGoal, conversationId);
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

  private sendToTelegram(chatId: number, text: string, silent?: boolean, parseMode?: "HTML" | "Markdown" | "MarkdownV2"): void {
    const telegram = this.children.get("telegram-adapter");
    if (!telegram?.stdin.writable) return;

    // Split message if it's too long (Telegram limit is 4096 characters)
    const chunks = this.splitMessage(text, 4000); // Use 4000 to leave room for continuation markers

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
        payload: { chatId, text: messageText, silent, parseMode },
      };
      telegram.stdin.write(JSON.stringify(envelope) + "\n");
      ConsoleLogger.ipc("core", "→", envelope);
    });
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

main();
