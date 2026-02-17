/**
 * Unit tests for RAG SQLite persistence (P6-01).
 * Verifies RAGStore insert/search and that documents persist across store restarts.
 */

import { randomUUID } from "node:crypto";
import { mkdirSync, rmSync } from "node:fs";
import { join } from "node:path";
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { RAGStore } from "../rag-service.js";

const TEST_DIR = join(process.cwd(), "data", "test-rag-" + randomUUID());

function freshDbPath(): string {
  return join(TEST_DIR, randomUUID() + ".sqlite");
}

/** Fixed 4-dim embedding for testing (L2-normalized for dot-product similarity). */
function norm(v: number[]): number[] {
  const len = Math.sqrt(v.reduce((s, x) => s + x * x, 0)) || 1;
  return v.map((x) => x / len);
}

describe("RAGStore", () => {
  let dbPath: string;
  let store: RAGStore;

  beforeEach(() => {
    mkdirSync(TEST_DIR, { recursive: true });
    dbPath = freshDbPath();
    store = new RAGStore(dbPath, 4); // 4-dim vectors for tests (vss table dimension must match)
  });

  afterEach(() => {
    store.close();
    try {
      rmSync(TEST_DIR, { recursive: true, force: true });
    } catch {
      // ignore
    }
  });

  describe("insert and search", () => {
    it("returns empty when no documents", () => {
      const results = store.search([1, 0, 0, 0], 5);
      expect(results).toHaveLength(0);
    });

    it("inserts and retrieves document by similarity", () => {
      const id = randomUUID();
      const content = "Hello world";
      const metadata = { source: "test" };
      const embedding = norm([1, 0.5, 0, 0]);
      store.insert(id, content, metadata, embedding);

      const queryEmbed = norm([1, 0.6, 0, 0]);
      const results = store.search(queryEmbed, 5);
      expect(results).toHaveLength(1);
      expect(results[0]?.content).toBe(content);
      expect(results[0]?.metadata).toEqual(metadata);
      expect(typeof results[0]?.score).toBe("number");
      // With vss: L2 distance -> score 1/(1+d); with dot-product: score in [0,1]. Both higher = more similar
      expect(results[0]?.score).toBeGreaterThan(0.5);
    });

    it("returns top-k by score", () => {
      const e1 = norm([1, 0, 0, 0]);
      const e2 = norm([0.9, 0.1, 0, 0]);
      const e3 = norm([0, 1, 0, 0]);
      store.insert("id1", "doc1", {}, e1);
      store.insert("id2", "doc2", {}, e2);
      store.insert("id3", "doc3", {}, e3);

      const queryEmbed = norm([1, 0, 0, 0]);
      const results = store.search(queryEmbed, 2);
      expect(results).toHaveLength(2);
      expect(results[0]?.content).toBe("doc1");
      expect(results[1]?.content).toBe("doc2");
      expect(results[0]?.score).toBeGreaterThanOrEqual(results[1]?.score ?? 0);
    });

    it("persists documents across store restarts", () => {
      const id = randomUUID();
      const content = "Persistent content";
      const metadata = { key: "value" };
      const embedding = norm([0.5, 0.5, 0.5, 0.5]);
      store.insert(id, content, metadata, embedding);
      store.close();

      const store2 = new RAGStore(dbPath, 4);
      const results = store2.search(embedding, 5);
      store2.close();

      expect(results).toHaveLength(1);
      expect(results[0]?.content).toBe(content);
      expect(results[0]?.metadata).toEqual(metadata);
    });
  });
});
