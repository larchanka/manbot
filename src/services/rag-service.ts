/**
 * RAG Service: semantic memory via embeddings and similarity search.
 * Uses Ollama for embeddings; SQLite for persistent storage.
 * P6-01: SQLite persistence. P7-01: sqlite-vss for scalable KNN with fallback to dot-product.
 */

import { randomUUID } from "node:crypto";
import { mkdirSync } from "node:fs";
import { dirname } from "node:path";
import Database from "better-sqlite3";
import * as sqliteVss from "sqlite-vss";
import { BaseProcess } from "../shared/base-process.js";
import type { Envelope } from "../shared/protocol.js";
import { PROTOCOL_VERSION } from "../shared/protocol.js";
import { responsePayloadSchema } from "../shared/protocol.js";
import { getConfig } from "../shared/config.js";
import { OllamaAdapter } from "./ollama-adapter.js";
import { ConsoleLogger } from "../utils/console-logger.js";

const PROCESS_NAME = "rag-service";

const RAG_SCHEMA = `
CREATE TABLE IF NOT EXISTS rag_documents (
  id TEXT PRIMARY KEY,
  content TEXT NOT NULL,
  metadata TEXT NOT NULL,
  embedding BLOB NOT NULL
);
`;

function embeddingToBuffer(embedding: number[]): Buffer {
  const f64 = new Float64Array(embedding);
  return Buffer.from(f64.buffer, f64.byteOffset, f64.byteLength);
}

function bufferToEmbedding(buf: Buffer): number[] {
  const f64 = new Float64Array(buf.buffer, buf.byteOffset, buf.byteLength / 8);
  return Array.from(f64);
}

function dotProduct(a: number[], b: number[]): number {
  let sum = 0;
  const len = Math.min(a.length, b.length);
  for (let i = 0; i < len; i++) sum += a[i]! * b[i]!;
  return sum;
}

/** L2 distance to score: higher = more similar. */
function distanceToScore(distance: number): number {
  return 1 / (1 + Math.max(0, distance));
}

/** SQLite-backed store for RAG documents. Uses sqlite-vss for KNN when available, else dot-product full scan. */
export class RAGStore {
  private db: Database.Database;
  private useVss: boolean;
  private readonly embeddingDimensions: number;
  private readonly vssTableName = "vss_rag_embedding";

  constructor(dbPath: string, embeddingDimensions = 768) {
    mkdirSync(dirname(dbPath), { recursive: true });
    this.db = new Database(dbPath);
    this.embeddingDimensions = embeddingDimensions;
    this.db.exec(RAG_SCHEMA);
    let vssLoaded = false;
    try {
      sqliteVss.load(this.db);
      this.db.exec(
        `CREATE VIRTUAL TABLE IF NOT EXISTS ${this.vssTableName} USING vss0( embedding(${this.embeddingDimensions}) )`,
      );
      vssLoaded = true;
    } catch {
      // Extension unavailable (e.g. unsupported platform); use fallback
    }
    this.useVss = vssLoaded;
  }

  close(): void {
    this.db.close();
  }

  /** Whether sqlite-vss is active (KNN search). */
  isVssEnabled(): boolean {
    return this.useVss;
  }

  insert(id: string, content: string, metadata: Record<string, unknown>, embedding: number[]): void {
    const metaJson = JSON.stringify(metadata);
    const blob = embeddingToBuffer(embedding);
    const run = (): void => {
      this.db
        .prepare(
          `INSERT INTO rag_documents (id, content, metadata, embedding) VALUES (?, ?, ?, ?)`,
        )
        .run(id, content, metaJson, blob);
      if (this.useVss) {
        const rowid = this.db.prepare("SELECT last_insert_rowid()").pluck().get() as number;
        const embeddingJson = JSON.stringify(embedding);
        this.db.prepare(`INSERT INTO ${this.vssTableName}(rowid, embedding) VALUES (?, ?)`).run(rowid, embeddingJson);
      }
    };
    this.db.transaction(run)();
  }

  search(queryEmbedding: number[], limit: number, filters?: { conversationId?: string | undefined }): Array<{ content: string; metadata: Record<string, unknown>; score: number }> {
    const k = Math.max(1, Math.floor(limit));
    if (this.useVss) {
      const hasRows = (this.db.prepare(`SELECT 1 FROM ${this.vssTableName} LIMIT 1`).get() as unknown) != null;
      if (!hasRows) return [];
      const queryJson = JSON.stringify(queryEmbedding);
      // Use a CTE or subquery to filter if conversationId is provided
      let vssRows: Array<{ rowid: number; distance: number }>;
      if (filters?.conversationId) {
        vssRows = this.db
          .prepare(
            `SELECT t.rowid, t.distance 
             FROM ${this.vssTableName} t
             JOIN rag_documents d ON d.rowid = t.rowid
             WHERE vss_search(t.embedding, ?) 
               AND json_extract(d.metadata, '$.conversationId') = ?
             LIMIT ?`,
          )
          .all(queryJson, filters.conversationId, k) as Array<{ rowid: number; distance: number }>;
      } else {
        vssRows = this.db
          .prepare(
            `SELECT rowid, distance FROM ${this.vssTableName} WHERE vss_search(embedding, ?) LIMIT ?`,
          )
          .all(queryJson, k) as Array<{ rowid: number; distance: number }>;
      }
      if (vssRows.length === 0) return [];
      const rowids = vssRows.map((r) => r.rowid);
      const order = new Map(rowids.map((r, i) => [r, i]));
      const placeholders = rowids.map(() => "?").join(",");
      const docs = this.db
        .prepare(
          `SELECT rowid, content, metadata FROM rag_documents WHERE rowid IN (${placeholders})`,
        )
        .all(...rowids) as Array<{ rowid: number; content: string; metadata: string }>;
      docs.sort((a, b) => (order.get(a.rowid) ?? 0) - (order.get(b.rowid) ?? 0));
      const distanceByRowid = new Map(vssRows.map((r) => [r.rowid, r.distance]));
      return docs.map((d) => ({
        content: d.content,
        metadata: (JSON.parse(d.metadata || "{}") ?? {}) as Record<string, unknown>,
        score: distanceToScore(distanceByRowid.get(d.rowid) ?? 0),
      }));
    }
    const rows = this.db.prepare(`SELECT id, content, metadata, embedding FROM rag_documents`).all() as Array<{
      id: string;
      content: string;
      metadata: string;
      embedding: Buffer;
    }>;
    if (rows.length === 0) return [];
    let scored = rows.map((row) => {
      const embedding = bufferToEmbedding(row.embedding);
      const score = dotProduct(queryEmbedding, embedding);
      const metadata = (JSON.parse(row.metadata || "{}") ?? {}) as Record<string, unknown>;
      return { content: row.content, metadata, score };
    });
    if (filters?.conversationId) {
      scored = scored.filter((s) => s.metadata.conversationId === filters.conversationId);
    }
    scored.sort((a, b) => b.score - a.score);
    return scored.slice(0, k);
  }
}

interface MemorySearchPayload {
  query: string;
  limit?: number;
}

interface MemoryInsertPayload {
  content: string;
  metadata?: Record<string, unknown>;
}

export class RAGService extends BaseProcess {
  private readonly ollama: OllamaAdapter;
  private readonly embedModel: string;
  private readonly store: RAGStore;

  constructor(options?: { ollama?: OllamaAdapter; embedModel?: string; dbPath?: string; embeddingDimensions?: number }) {
    super({ processName: PROCESS_NAME });
    this.ollama = options?.ollama ?? new OllamaAdapter();
    this.embedModel = options?.embedModel ?? getConfig().rag.embedModel;
    const dbPath = options?.dbPath ?? getConfig().rag.dbPath;
    const embeddingDimensions = options?.embeddingDimensions ?? getConfig().rag.embeddingDimensions;
    this.store = new RAGStore(dbPath, embeddingDimensions);
  }

  /** Embed and store a document */
  async addDocument(content: string, metadata: Record<string, unknown> = {}): Promise<string> {
    ConsoleLogger.debug(PROCESS_NAME, `Embedding document: ${content.substring(0, 50)}...`);
    const { embedding } = await this.ollama.embed(content, this.embedModel, { timeoutMs: 60000 });
    const id = randomUUID();
    this.store.insert(id, content, metadata, embedding);
    ConsoleLogger.info(PROCESS_NAME, `Stored document ${id.substring(0, 8)}`);
    return id;
  }

  /** Return relevant snippets by semantic similarity (cosine via dot product for L2-normalized vectors) */
  async search(query: string, limit = 5, filters?: { conversationId?: string | undefined }): Promise<Array<{ content: string; metadata: Record<string, unknown>; score: number }>> {
    ConsoleLogger.debug(PROCESS_NAME, `Searching RAG: "${query}"${filters?.conversationId ? ` (filter: ${filters.conversationId})` : ""}`);
    const { embedding: queryEmbed } = await this.ollama.embed(query, this.embedModel, { timeoutMs: 30000 });
    const results = this.store.search(queryEmbed, limit, filters);
    ConsoleLogger.info(PROCESS_NAME, `Found ${results.length} results for query`);
    return results;
  }

  protected override handleEnvelope(envelope: Envelope): void {
    if (envelope.to !== PROCESS_NAME) return;
    const type = envelope.type;
    const payload = envelope.payload as Record<string, unknown>;

    if (type === "node.execute") {
      const p = payload as { type?: string; input?: Record<string, unknown> };
      if (p.type !== "semantic_search") return;
      const query = (p.input?.query ?? "") as string;
      const limit = (typeof p.input?.limit === "number" ? p.input.limit : 5) as number;
      const conversationId = p.input?.conversationId as string | undefined;

      this.search(query, limit, { conversationId }).then((results) => {
        this.sendResponse(envelope, { results, snippets: results.map((r) => r.content) });
      }).catch((err) => {
        this.sendError(envelope, "RAG_SEARCH_ERROR", err instanceof Error ? err.message : String(err));
      });
      return;
    }

    if (type === "memory.semantic.insert") {
      const p = payload as unknown as MemoryInsertPayload;
      const content = p.content ?? "";
      const metadata = (p.metadata ?? {}) as Record<string, unknown>;
      if (typeof content !== "string") {
        this.sendError(envelope, "INVALID_PAYLOAD", "memory.semantic.insert requires content (string)");
        return;
      }
      this.addDocument(content, metadata).then((id) => {
        this.sendResponse(envelope, { id });
      }).catch((err) => {
        this.sendError(envelope, "RAG_INSERT_ERROR", err instanceof Error ? err.message : String(err));
      });
      return;
    }

    if (type === "memory.semantic.search") {
      const p = payload as unknown as MemorySearchPayload & { conversationId?: string };
      const query = p.query ?? "";
      const limit = typeof p.limit === "number" ? p.limit : 5;
      const conversationId = p.conversationId;

      if (typeof query !== "string") {
        this.sendError(envelope, "INVALID_PAYLOAD", "memory.semantic.search requires query (string)");
        return;
      }
      this.search(query, limit, { conversationId }).then((results) => {
        this.sendResponse(envelope, { results });
      }).catch((err) => {
        this.sendError(envelope, "RAG_SEARCH_ERROR", err instanceof Error ? err.message : String(err));
      });
      return;
    }

    // Catch-all: respond with error for any unrecognized message type
    // This prevents the executor from hanging forever waiting for a response
    this.sendError(envelope, "UNSUPPORTED_TYPE", `rag-service does not handle type="${type}"`);
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
  const service = new RAGService();
  service.start();
}

main();
