/**
 * Task Memory Service: SQLite persistence for task lifecycle and DAG execution state.
 * Handles task.create, task.update, task.get, task.appendReflection, task.complete, task.fail via stdin/stdout.
 * Schema: _docs/TASK MEMORY SQLITE SCHEMA.md
 */

import { mkdirSync } from "node:fs";
import { getConfig } from "../shared/config.js";
import { dirname } from "node:path";
import Database from "better-sqlite3";
import { randomUUID } from "node:crypto";
import { BaseProcess } from "../shared/base-process.js";
import type { Envelope } from "../shared/protocol.js";
import { responsePayloadSchema } from "../shared/protocol.js";


// --- Schema (from _docs/TASK MEMORY SQLITE SCHEMA.md) ---

const SCHEMA = `
CREATE TABLE IF NOT EXISTS tasks (
  id TEXT PRIMARY KEY,
  user_id TEXT,
  conversation_id TEXT,
  goal TEXT NOT NULL,
  status TEXT CHECK(status IN ('pending','running','completed','failed')),
  complexity TEXT,
  created_at INTEGER NOT NULL,
  updated_at INTEGER NOT NULL,
  metadata TEXT
);

CREATE TABLE IF NOT EXISTS task_nodes (
  task_id TEXT NOT NULL,
  id TEXT NOT NULL,
  type TEXT NOT NULL,
  service TEXT NOT NULL,
  status TEXT CHECK(status IN ('pending','running','completed','failed')),
  input TEXT,
  output TEXT,
  started_at INTEGER,
  completed_at INTEGER,
  retry_count INTEGER DEFAULT 0,
  PRIMARY KEY (task_id, id),
  FOREIGN KEY(task_id) REFERENCES tasks(id)
);

CREATE TABLE IF NOT EXISTS task_edges (
  id TEXT PRIMARY KEY,
  task_id TEXT NOT NULL,
  from_node TEXT NOT NULL,
  to_node TEXT NOT NULL,
  FOREIGN KEY(task_id, from_node) REFERENCES task_nodes(task_id, id),
  FOREIGN KEY(task_id, to_node) REFERENCES task_nodes(task_id, id),
  FOREIGN KEY(task_id) REFERENCES tasks(id)
);

CREATE TABLE IF NOT EXISTS task_node_results (
  id TEXT PRIMARY KEY,
  task_id TEXT NOT NULL,
  node_id TEXT NOT NULL,
  result TEXT,
  FOREIGN KEY(task_id, node_id) REFERENCES task_nodes(task_id, id)
);

CREATE TABLE IF NOT EXISTS task_reflections (
  id TEXT PRIMARY KEY,
  task_id TEXT NOT NULL,
  node_id TEXT,
  critic_feedback TEXT,
  decision TEXT CHECK(decision IN ('PASS','REVISE')),
  created_at INTEGER,
  FOREIGN KEY(task_id) REFERENCES tasks(id),
  FOREIGN KEY(task_id, node_id) REFERENCES task_nodes(task_id, id)
);

CREATE TABLE IF NOT EXISTS task_events (
  id TEXT PRIMARY KEY,
  task_id TEXT NOT NULL,
  event_type TEXT,
  payload TEXT,
  timestamp INTEGER,
  FOREIGN KEY(task_id) REFERENCES tasks(id)
);
`;

// --- Payload types (minimal for message handlers) ---

interface TaskCreatePayload {
  taskId: string;
  userId?: string;
  /** Optional conversation/session ID to group tasks by chat session. */
  conversationId?: string;
  goal: string;
  complexity?: string;
  nodes: Array<{ id: string; type: string; service: string; input?: unknown }>;
  edges: Array<{ fromNode: string; toNode: string }>;
}

interface TaskUpdatePayload {
  taskId: string;
  nodeId: string;
  status: "pending" | "running" | "completed" | "failed";
  output?: unknown;
  startedAt?: number;
  completedAt?: number;
}

interface TaskGetPayload {
  taskId: string;
}

interface TaskAppendReflectionPayload {
  taskId: string;
  nodeId?: string;
  criticFeedback: string;
  decision: "PASS" | "REVISE";
}

interface TaskCompletePayload {
  taskId: string;
}

interface TaskFailPayload {
  taskId: string;
  reason?: string;
}

interface TaskGetByConversationIdPayload {
  conversationId: string;
}

// --- Store ---

export class TaskMemoryStore {
  private db: Database.Database;

  constructor(dbPath?: string) {
    const path = dbPath ?? getConfig().taskMemory.dbPath;
    mkdirSync(dirname(path), { recursive: true });
    this.db = new Database(path);

    // Check if task_nodes has a composite primary key
    const tableInfo = this.db.prepare("PRAGMA table_info(task_nodes)").all() as Array<{ name: string; pk: number }>;
    const pkCount = tableInfo.filter(c => c.pk > 0).length;

    if (pkCount === 1 && tableInfo.find(c => c.name === "id")?.pk === 1) {
      // Old schema detected, needs migration. Since it's a dev database, we'll drop and recreate
      // as changing a PRIMARY KEY in SQLite requires recreating the table anyway.
      this.db.exec("DROP TABLE IF EXISTS task_node_results");
      this.db.exec("DROP TABLE IF EXISTS task_edges");
      this.db.exec("DROP TABLE IF EXISTS task_reflections");
      this.db.exec("DROP TABLE IF EXISTS task_nodes");
      this.db.exec("DROP TABLE IF EXISTS tasks");
      this.db.exec("DROP TABLE IF EXISTS task_events");
    }

    this.db.exec(SCHEMA);
    try {
      this.db.exec("ALTER TABLE tasks ADD COLUMN conversation_id TEXT");
    } catch {
      // Column already exists
    }
  }

  close(): void {
    this.db.close();
  }

  private now(): number {
    return Date.now();
  }

  private json(val: unknown): string {
    return val === undefined ? "" : JSON.stringify(val);
  }

  createTaskWithDag(payload: TaskCreatePayload): void {
    const now = this.now();
    this.db
      .prepare(
        `INSERT INTO tasks (id, user_id, conversation_id, goal, status, complexity, created_at, updated_at, metadata)
         VALUES (?, ?, ?, ?, 'pending', ?, ?, ?, ?)`,
      )
      .run(
        payload.taskId,
        payload.userId ?? null,
        payload.conversationId ?? null,
        payload.goal,
        payload.complexity ?? null,
        now,
        now,
        "",
      );

    const insertNode = this.db.prepare(
      `INSERT INTO task_nodes (task_id, id, type, service, status, input)
       VALUES (?, ?, ?, ?, 'pending', ?)`,
    );
    for (const n of payload.nodes) {
      insertNode.run(
        payload.taskId,
        n.id,
        n.type,
        n.service,
        this.json(n.input),
      );
    }

    const insertEdge = this.db.prepare(
      `INSERT INTO task_edges (id, task_id, from_node, to_node)
       VALUES (?, ?, ?, ?)`,
    );
    for (const e of payload.edges) {
      insertEdge.run(randomUUID(), payload.taskId, e.fromNode, e.toNode);
    }
  }

  updateNodeStatus(
    taskId: string,
    nodeId: string,
    status: "pending" | "running" | "completed" | "failed",
    opts?: { output?: unknown; startedAt?: number; completedAt?: number },
  ): void {
    const now = this.now();
    const row = this.db
      .prepare(
        `SELECT id, output, started_at, completed_at FROM task_nodes WHERE task_id = ? AND id = ?`,
      )
      .get(taskId, nodeId) as
      | { id: string; output: string | null; started_at: number | null; completed_at: number | null }
      | undefined;
    if (!row) return;

    const startedAt = opts?.startedAt ?? row.started_at ?? (status === "running" ? now : null);
    const completedAt =
      opts?.completedAt ?? row.completed_at ?? (status === "completed" || status === "failed" ? now : null);
    const output = opts?.output !== undefined ? this.json(opts.output) : row.output;

    this.db
      .prepare(
        `UPDATE task_nodes SET status = ?, output = ?, started_at = ?, completed_at = ?
         WHERE task_id = ? AND id = ?`,
      )
      .run(status, output, startedAt, completedAt, taskId, nodeId);

    this.db
      .prepare(`UPDATE tasks SET updated_at = ? WHERE id = ?`)
      .run(now, taskId);
  }

  storeNodeResult(taskId: string, nodeId: string, result: unknown): void {
    const id = randomUUID();
    this.db
      .prepare(`INSERT INTO task_node_results (id, task_id, node_id, result) VALUES (?, ?, ?, ?)`)
      .run(id, taskId, nodeId, this.json(result));
  }

  appendReflection(
    taskId: string,
    decision: "PASS" | "REVISE",
    criticFeedback: string,
    nodeId?: string,
  ): void {
    const id = randomUUID();
    const now = this.now();
    this.db
      .prepare(
        `INSERT INTO task_reflections (id, task_id, node_id, critic_feedback, decision, created_at)
         VALUES (?, ?, ?, ?, ?, ?)`,
      )
      .run(id, taskId, nodeId ?? null, criticFeedback, decision, now);
  }

  completeTask(taskId: string): void {
    const now = this.now();
    this.db
      .prepare(`UPDATE tasks SET status = 'completed', updated_at = ? WHERE id = ?`)
      .run(now, taskId);
  }

  failTask(taskId: string, reason?: string): void {
    const now = this.now();
    this.db
      .prepare(`UPDATE tasks SET status = 'failed', updated_at = ?, metadata = ? WHERE id = ?`)
      .run(now, reason ? this.json({ reason }) : "", taskId);
  }

  getTask(taskId: string): unknown {
    const task = this.db.prepare(`SELECT * FROM tasks WHERE id = ?`).get(taskId) as Record<string, unknown> | undefined;
    if (!task) return null;

    const nodes = this.db
      .prepare(`SELECT * FROM task_nodes WHERE task_id = ? ORDER BY id`)
      .all(taskId) as Record<string, unknown>[];
    const edges = this.db
      .prepare(`SELECT * FROM task_edges WHERE task_id = ?`)
      .all(taskId) as Record<string, unknown>[];

    return {
      ...task,
      nodes,
      edges,
    };
  }

  getTaskState(taskId: string): { status: string; nodes: Array<{ id: string; status: string }> } | null {
    const task = this.db.prepare(`SELECT status FROM tasks WHERE id = ?`).get(taskId) as { status: string } | undefined;
    if (!task) return null;
    const nodes = this.db
      .prepare(`SELECT id, status FROM task_nodes WHERE task_id = ?`)
      .all(taskId) as Array<{ id: string; status: string }>;
    return { status: task.status, nodes };
  }

  /** Retrieve task history for a conversation (by conversation_id). */
  getTasksByConversationId(conversationId: string): Array<{ id: string; goal: string; status: string; created_at: number; updated_at: number }> {
    const rows = this.db
      .prepare(
        `SELECT id, goal, status, created_at, updated_at FROM tasks WHERE conversation_id = ? ORDER BY created_at ASC`,
      )
      .all(conversationId) as Array<{ id: string; goal: string; status: string; created_at: number; updated_at: number }>;
    return rows;
  }
}

// --- Service process (stdin/stdout JSONL) ---

function isTaskMessage(type: string): boolean {
  return (
    type === "task.create" ||
    type === "task.update" ||
    type === "task.get" ||
    type === "task.getByConversationId" ||
    type === "task.appendReflection" ||
    type === "task.complete" ||
    type === "task.fail"
  );
}

export class TaskMemoryService extends BaseProcess {
  private store: TaskMemoryStore;

  constructor(dbPath?: string) {
    super({ processName: "task-memory" });
    const path = dbPath ?? getConfig().taskMemory.dbPath;
    this.store = new TaskMemoryStore(path);
  }

  override start(): void {
    super.start();
    // Ensure process stays alive until stdin closes
  }

  protected override handleEnvelope(envelope: Envelope): void {
    if (!isTaskMessage(envelope.type)) return;

    try {
      let result: unknown;
      const payload = envelope.payload as Record<string, unknown>;

      switch (envelope.type) {
        case "task.create": {
          const p = payload as unknown as TaskCreatePayload;
          this.store.createTaskWithDag(p);
          result = { taskId: p.taskId };
          break;
        }
        case "task.update": {
          const p = payload as unknown as TaskUpdatePayload;
          const opts: { output?: unknown; startedAt?: number; completedAt?: number } = {};
          if (p.output !== undefined) opts.output = p.output;
          if (p.startedAt !== undefined) opts.startedAt = p.startedAt;
          if (p.completedAt !== undefined) opts.completedAt = p.completedAt;
          this.store.updateNodeStatus(p.taskId, p.nodeId, p.status, opts);
          result = { taskId: p.taskId, nodeId: p.nodeId, status: p.status };
          break;
        }
        case "task.get": {
          const p = payload as unknown as TaskGetPayload;
          result = this.store.getTask(p.taskId);
          break;
        }
        case "task.getByConversationId": {
          const p = payload as unknown as TaskGetByConversationIdPayload;
          result = { tasks: this.store.getTasksByConversationId(p.conversationId ?? "") };
          break;
        }
        case "task.appendReflection": {
          const p = payload as unknown as TaskAppendReflectionPayload;
          this.store.appendReflection(p.taskId, p.decision, p.criticFeedback, p.nodeId);
          result = { taskId: p.taskId };
          break;
        }
        case "task.complete": {
          const p = payload as unknown as TaskCompletePayload;
          this.store.completeTask(p.taskId);
          result = { taskId: p.taskId };
          break;
        }
        case "task.fail": {
          const p = payload as unknown as TaskFailPayload;
          this.store.failTask(p.taskId, p.reason);
          result = { taskId: p.taskId };
          break;
        }
        default:
          this.sendError(envelope, "UNKNOWN_TYPE", `Unknown type: ${envelope.type}`);
          return;
      }

      this.sendResponse(envelope, result);
    } catch (err) {
      const message = err instanceof Error ? err.message : String(err);
      this.sendError(envelope, "STORE_ERROR", message);
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
  const service = new TaskMemoryService();
  service.start();
}

main();
