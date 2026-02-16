/**
 * RAG Service: semantic memory via embeddings and similarity search.
 * Uses Ollama for embeddings; in-memory vector store (FAISS can be plugged in later).
 * P4-03: _board/TASKS/P4-03_RAG_SERVICE.md
 */

import { randomUUID } from "node:crypto";
import { BaseProcess } from "../shared/base-process.js";
import type { Envelope } from "../shared/protocol.js";
import { PROTOCOL_VERSION } from "../shared/protocol.js";
import { responsePayloadSchema } from "../shared/protocol.js";
import { OllamaAdapter } from "./ollama-adapter.js";

const DEFAULT_EMBED_MODEL = "nomic-embed-text";
const PROCESS_NAME = "rag-service";

interface StoredDocument {
  id: string;
  content: string;
  metadata: Record<string, unknown>;
  embedding: number[];
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
  private readonly store: StoredDocument[] = [];

  constructor(options?: { ollama?: OllamaAdapter; embedModel?: string }) {
    super({ processName: PROCESS_NAME });
    this.ollama = options?.ollama ?? new OllamaAdapter();
    this.embedModel = options?.embedModel ?? DEFAULT_EMBED_MODEL;
  }

  /** Embed and store a document */
  async addDocument(content: string, metadata: Record<string, unknown> = {}): Promise<string> {
    const { embedding } = await this.ollama.embed(content, this.embedModel);
    const id = randomUUID();
    this.store.push({ id, content, metadata, embedding });
    return id;
  }

  /** Return relevant snippets by semantic similarity (cosine via dot product for L2-normalized vectors) */
  async search(query: string, limit = 5): Promise<Array<{ content: string; metadata: Record<string, unknown>; score: number }>> {
    if (this.store.length === 0) return [];
    const { embedding: queryEmbed } = await this.ollama.embed(query, this.embedModel);
    const scored = this.store.map((doc) => {
      const score = dotProduct(queryEmbed, doc.embedding);
      return { content: doc.content, metadata: doc.metadata, score };
    });
    scored.sort((a, b) => b.score - a.score);
    return scored.slice(0, limit);
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
      this.search(query, limit).then((results) => {
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
      const p = payload as unknown as MemorySearchPayload;
      const query = p.query ?? "";
      const limit = typeof p.limit === "number" ? p.limit : 5;
      if (typeof query !== "string") {
        this.sendError(envelope, "INVALID_PAYLOAD", "memory.semantic.search requires query (string)");
        return;
      }
      this.search(query, limit).then((results) => {
        this.sendResponse(envelope, { results });
      }).catch((err) => {
        this.sendError(envelope, "RAG_SEARCH_ERROR", err instanceof Error ? err.message : String(err));
      });
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
}

function dotProduct(a: number[], b: number[]): number {
  let sum = 0;
  const len = Math.min(a.length, b.length);
  for (let i = 0; i < len; i++) sum += a[i]! * b[i]!;
  return sum;
}

function main(): void {
  const service = new RAGService();
  service.start();
}

main();
