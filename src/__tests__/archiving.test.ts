/**
 * Integration test for conversation archiving flow (P6-06).
 * Verifies: task history retrieval by conversation_id, summary insertion into RAG, SQLite persistence.
 * Summarization step is mocked (no Ollama).
 */

import { randomUUID } from "node:crypto";
import { mkdirSync, rmSync } from "node:fs";
import { join } from "node:path";
import Database from "better-sqlite3";
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { RAGStore } from "../services/rag-service.js";
import { TaskMemoryStore } from "../services/task-memory.js";

const TEST_DIR = join(process.cwd(), "data", "test-archiving-" + randomUUID());

function freshDbPath(prefix: string): string {
    return join(TEST_DIR, `${prefix}-${randomUUID()}.sqlite`);
}

/** Fixed 4-dim embedding for test (L2-normalized). */
function norm(v: number[]): number[] {
    const len = Math.sqrt(v.reduce((s, x) => s + x * x, 0)) || 1;
    return v.map((x) => x / len);
}

describe("Archiving pipeline integration", () => {
    let taskDbPath: string;
    let ragDbPath: string;
    let taskStore: TaskMemoryStore;
    let ragStore: RAGStore;

    beforeEach(() => {
        mkdirSync(TEST_DIR, { recursive: true });
        taskDbPath = freshDbPath("tasks");
        ragDbPath = freshDbPath("rag");
        taskStore = new TaskMemoryStore(taskDbPath);
        ragStore = new RAGStore(ragDbPath, 4); // 4-dim for test vectors
    });

    afterEach(() => {
        taskStore.close();
        ragStore.close();
        try {
            rmSync(TEST_DIR, { recursive: true, force: true });
        } catch {
            // ignore
        }
    });

    it("chat.new flow: task history retrieval, mock summarization, RAG insert, SQLite contains record", () => {
        const conversationId = "conv-" + randomUUID();
        const taskId1 = "t1-" + randomUUID();
        const taskId2 = "t2-" + randomUUID();

        // 1. Create tasks in task-memory with same conversation_id (simulate prior conversation)
        taskStore.createTaskWithDag({
            taskId: taskId1,
            conversationId,
            goal: "Explain TypeScript benefits",
            nodes: [
                { id: "n1", type: "generate_text", service: "model-router", input: {} },
            ],
            edges: [],
        });
        taskStore.updateNodeStatus(taskId1, "n1", "completed", {
            output: "TypeScript adds static types and better tooling.",
        });

        taskStore.createTaskWithDag({
            taskId: taskId2,
            conversationId,
            goal: "Summarize the previous answer",
            nodes: [
                { id: "n2", type: "generate_text", service: "model-router", input: {} },
            ],
            edges: [],
        });
        taskStore.updateNodeStatus(taskId2, "n2", "completed", {
            output: "User learned about TypeScript benefits.",
        });

        // 2. Retrieve task history by conversation_id (simulate orchestrator step)
        const tasks = taskStore.getTasksByConversationId(conversationId);
        expect(tasks).toHaveLength(2);
        expect(tasks.map((t) => t.goal)).toContain("Explain TypeScript benefits");
        expect(tasks.map((t) => t.goal)).toContain("Summarize the previous answer");

        // 3. Format history and "summarize" (mock: no Ollama)
        const historyParts: string[] = [];
        for (const t of tasks) {
            const task = taskStore.getTask(t.id) as { nodes?: Array<{ output?: string }> } | null;
            const nodes = task?.nodes ?? [];
            const lastOutput = nodes.filter((n) => n.output != null && n.output !== "").pop()?.output ?? "";
            historyParts.push(`Goal: ${t.goal}\nResult: ${lastOutput || "(no output)"}`);
        }
        const chatHistory = historyParts.join("\n\n---\n\n");
        expect(chatHistory).toContain("TypeScript");
        const mockSummary = "User preferences: TypeScript. Context: learning about static typing and tooling.";

        // 4. Store summary in RAG (simulate memory.semantic.insert; use dummy embedding)
        const docId = randomUUID();
        const embedding = norm([0.5, 0.5, 0.5, 0.5]);
        const metadata = { conversationId, chatId: 12345, archivedAt: Date.now(), source: "archiving" };
        ragStore.insert(docId, mockSummary, metadata, embedding);

        // 5. Verify RAG retrieval and SQLite contain the archived record
        const results = ragStore.search(embedding, 5);
        expect(results).toHaveLength(1);
        expect(results[0]?.content).toBe(mockSummary);
        expect(results[0]?.metadata).toMatchObject({ conversationId, source: "archiving" });

        // 6. Verify SQLite rag_documents has the row
        const db = new Database(ragDbPath);
        const row = db.prepare("SELECT id, content, metadata FROM rag_documents WHERE id = ?").get(docId) as
            | { id: string; content: string; metadata: string }
            | undefined;
        db.close();
        expect(row).toBeDefined();
        expect(row?.id).toBe(docId);
        expect(row?.content).toBe(mockSummary);
        const meta = JSON.parse(row?.metadata ?? "{}") as Record<string, unknown>;
        expect(meta.conversationId).toBe(conversationId);
        expect(meta.source).toBe("archiving");
    });
});
