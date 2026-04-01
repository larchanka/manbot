/**
 * Cron Manager: scheduled background tasks with dynamic registry in SQLite.
 * Uses node-cron; success/failure logged via Logger (event.cron.*).
 * P4-06: _board/TASKS/P4-06_CRON_MANAGER.md
 */

import { mkdirSync } from "node:fs";
import { dirname } from "node:path";
import { randomUUID } from "node:crypto";
import Database from "better-sqlite3";
import cron from "node-cron";
import { BaseProcess } from "../shared/base-process.js";
import type { Envelope } from "../shared/protocol.js";
import { PROTOCOL_VERSION } from "../shared/protocol.js";
import { responsePayloadSchema } from "../shared/protocol.js";
import { getConfig } from "../shared/config.js";

const PROCESS_NAME = "cron-manager";

const SCHEMA = `
CREATE TABLE IF NOT EXISTS cron_schedules (
  id TEXT PRIMARY KEY,
  cron_expr TEXT NOT NULL,
  task_type TEXT NOT NULL,
  payload TEXT,
  enabled INTEGER DEFAULT 1,
  created_at INTEGER NOT NULL,
  updated_at INTEGER NOT NULL
);
`;

interface ScheduleRow {
  id: string;
  cron_expr: string;
  task_type: string;
  payload: string;
  enabled: number;
  created_at: number;
  updated_at: number;
}

export class CronManager extends BaseProcess {
  private db: Database.Database;
  private jobs = new Map<string, cron.ScheduledTask>();

  constructor(dbPath?: string) {
    const path = dbPath ?? getConfig().cron.dbPath;
    super({ processName: PROCESS_NAME });
    mkdirSync(dirname(path), { recursive: true });
    this.db = new Database(path);
    this.db.exec(SCHEMA);
    this.loadSchedules();
  }

  private loadSchedules(): void {
    const rows = this.db.prepare("SELECT * FROM cron_schedules WHERE enabled = 1").all() as ScheduleRow[];
    for (const row of rows) {
      this.scheduleOne(row);
    }
  }

  private scheduleOne(row: ScheduleRow): void {
    if (this.jobs.has(row.id)) {
      this.jobs.get(row.id)!.stop();
      this.jobs.delete(row.id);
    }
    const valid = cron.validate(row.cron_expr);
    if (!valid) return;
    const task = cron.schedule(row.cron_expr, () => this.runJob(row));
    this.jobs.set(row.id, task);
  }

  private runJob(row: ScheduleRow): void {
    const now = Date.now();
    this.emitEvent("event.cron.started", {
      scheduleId: row.id,
      taskType: row.task_type,
      timestamp: now,
    });

    try {
      const payload = row.payload ? JSON.parse(row.payload) : {};
      
      // Default: Reminder or generic task payload
      const reminderPayload: Record<string, unknown> = {
        scheduleId: row.id,
        taskType: row.task_type,
        payload,
        timestamp: Date.now(),
      };

      // Extract common fields for easier routing in Orchestrator if present
      const q = payload.reminderMessage || payload.query;
      if (q) reminderPayload.reminderMessage = q;
      if (payload.chatId !== undefined) reminderPayload.chatId = payload.chatId;
      if (payload.userId !== undefined) reminderPayload.userId = payload.userId;

      // Emit specific event types for legacy/orchestrator compatibility
      if (row.task_type === "ai_query") {
        this.emitEvent("event.cron.ai_query", {
          scheduleId: row.id,
          taskType: row.task_type,
          query: payload.reminderMessage || payload.query || "",
          chatId: payload.chatId,
          userId: payload.userId,
          timestamp: Date.now(),
        });
      }

      // Always emit completed event for tracking and logging
      this.emitEvent("event.cron.completed", reminderPayload);
    } catch (err) {
      const message = err instanceof Error ? err.message : String(err);
      this.emitEvent("event.cron.failed", {
        scheduleId: row.id,
        taskType: row.task_type,
        error: message,
        timestamp: Date.now(),
      });
    }
  }

  private emitEvent(type: string, payload: unknown): void {
    this.send({
      id: randomUUID(),
      timestamp: Date.now(),
      from: PROCESS_NAME,
      to: "logger",
      type,
      version: PROTOCOL_VERSION,
      payload,
    });
  }

  private addSchedule(cronExpr: string, taskType: string, payload: unknown): string {
    const valid = cron.validate(cronExpr);
    if (!valid) throw new Error(`Invalid cron expression: ${cronExpr}`);
    const id = randomUUID();
    const now = Date.now();
    const payloadStr = payload !== undefined ? JSON.stringify(payload) : "";
    this.db
      .prepare(
        "INSERT INTO cron_schedules (id, cron_expr, task_type, payload, enabled, created_at, updated_at) VALUES (?, ?, ?, ?, 1, ?, ?)",
      )
      .run(id, cronExpr, taskType, payloadStr, now, now);
    const row = this.db.prepare("SELECT * FROM cron_schedules WHERE id = ?").get(id) as ScheduleRow;
    this.scheduleOne(row);
    return id;
  }

  private listSchedules(): Array<{ id: string; cronExpr: string; taskType: string; enabled: boolean }> {
    const rows = this.db.prepare("SELECT id, cron_expr, task_type, enabled FROM cron_schedules").all() as Array<{
      id: string;
      cron_expr: string;
      task_type: string;
      enabled: number;
    }>;
    return rows.map((r) => ({
      id: r.id,
      cronExpr: r.cron_expr,
      taskType: r.task_type,
      enabled: r.enabled === 1,
    }));
  }

  private removeSchedule(id: string): void {
    if (this.jobs.has(id)) {
      this.jobs.get(id)!.stop();
      this.jobs.delete(id);
    }
    this.db.prepare("DELETE FROM cron_schedules WHERE id = ?").run(id);
  }

  protected override handleEnvelope(envelope: Envelope): void {
    if (envelope.to !== PROCESS_NAME) return;
    const type = envelope.type;
    const payload = envelope.payload as Record<string, unknown>;

    if (type === "cron.schedule.add") {
      const cronExpr = payload.cronExpr ?? payload.cron_expr;
      const taskType = payload.taskType ?? payload.task_type ?? "generic";
      const args = payload.payload ?? payload.args;
      if (typeof cronExpr !== "string") {
        this.sendError(envelope, "INVALID_PAYLOAD", "cron.schedule.add requires cronExpr (string)");
        return;
      }
      try {
        const id = this.addSchedule(cronExpr, taskType as string, args);
        this.sendResponse(envelope, { id, cronExpr, taskType });
      } catch (err) {
        this.sendError(envelope, "CRON_ERROR", err instanceof Error ? err.message : String(err));
      }
      return;
    }

    if (type === "cron.schedule.list") {
      const list = this.listSchedules();
      this.sendResponse(envelope, { schedules: list });
      return;
    }

    if (type === "cron.schedule.remove") {
      const id = payload.id as string | undefined;
      if (typeof id !== "string") {
        this.sendError(envelope, "INVALID_PAYLOAD", "cron.schedule.remove requires id (string)");
        return;
      }
      this.removeSchedule(id);
      this.sendResponse(envelope, { removed: id });
      return;
    }
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

  /**
   * Closes the cron manager and stops all scheduled jobs.
   */
  close(): void {
    for (const [id, job] of this.jobs.entries()) {
      job.stop();
      this.jobs.delete(id);
    }
    this.db.close();
  }
}

function main(): void {
  const manager = new CronManager();
  manager.start();
}

main();
