/**
 * Integration tests for Task Memory Service (TaskMemoryStore).
 * Verifies task creation, node status transitions, results, reflections, and error handling.
 */

import { randomUUID } from "node:crypto";
import { mkdirSync, rmSync } from "node:fs";
import { join } from "node:path";
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { TaskMemoryStore } from "../task-memory.js";

const TEST_DIR = join(process.cwd(), "data", "test-" + randomUUID());

function freshDbPath(): string {
  return join(TEST_DIR, randomUUID() + ".sqlite");
}

describe("TaskMemoryStore", () => {
  let store: TaskMemoryStore;

  beforeEach(() => {
    mkdirSync(TEST_DIR, { recursive: true });
    store = new TaskMemoryStore(freshDbPath());
  });

  afterEach(() => {
    store.close();
    try {
      rmSync(TEST_DIR, { recursive: true, force: true });
    } catch {
      // ignore
    }
  });

  describe("task creation with nodes and edges", () => {
    it("creates a task with nodes and edges successfully", () => {
      const taskId = "t-" + randomUUID();
      const payload = {
        taskId,
        goal: "test goal",
        nodes: [
          { id: "n1", type: "plan", service: "planner" },
          { id: "n2", type: "execute", service: "executor" },
        ],
        edges: [{ fromNode: "n1", toNode: "n2" }],
      };
      store.createTaskWithDag(payload);

      const task = store.getTask(taskId) as Record<string, unknown>;
      expect(task).not.toBeNull();
      expect(task?.id).toBe(taskId);
      expect(task?.goal).toBe("test goal");
      expect(task?.status).toBe("pending");

      const nodes = task?.nodes as Record<string, unknown>[];
      expect(nodes).toHaveLength(2);
      expect(nodes?.[0]).toMatchObject({ id: "n1", type: "plan", service: "planner", status: "pending" });
      expect(nodes?.[1]).toMatchObject({ id: "n2", type: "execute", service: "executor", status: "pending" });

      const edges = task?.edges as Record<string, unknown>[];
      expect(edges).toHaveLength(1);
      expect(edges?.[0]).toMatchObject({ from_node: "n1", to_node: "n2" });
    });

    it("creates task with optional userId and complexity", () => {
      const taskId = "t-" + randomUUID();
      store.createTaskWithDag({
        taskId,
        userId: "u1",
        goal: "goal",
        complexity: "medium",
        nodes: [{ id: "n1", type: "a", service: "b" }],
        edges: [],
      });
      const task = store.getTask(taskId) as Record<string, unknown>;
      expect(task?.user_id).toBe("u1");
      expect(task?.complexity).toBe("medium");
    });

    it("creates task with optional conversationId and getTasksByConversationId returns history", () => {
      const convId = "conv-" + randomUUID();
      const taskId1 = "t-" + randomUUID();
      const taskId2 = "t-" + randomUUID();
      store.createTaskWithDag({
        taskId: taskId1,
        conversationId: convId,
        goal: "first goal",
        nodes: [{ id: "n1", type: "a", service: "b" }],
        edges: [],
      });
      store.createTaskWithDag({
        taskId: taskId2,
        conversationId: convId,
        goal: "second goal",
        nodes: [{ id: "n2", type: "c", service: "d" }],
        edges: [],
      });

      const task1 = store.getTask(taskId1) as Record<string, unknown>;
      expect(task1?.conversation_id).toBe(convId);

      const history = store.getTasksByConversationId(convId);
      expect(history).toHaveLength(2);
      expect(history.map((t) => t.id)).toContain(taskId1);
      expect(history.map((t) => t.id)).toContain(taskId2);
      expect(history.map((t) => t.goal)).toContain("first goal");
      expect(history.map((t) => t.goal)).toContain("second goal");

      const otherConv = store.getTasksByConversationId("other-conv");
      expect(otherConv).toHaveLength(0);
    });
  });

  describe("node status updates (Pending -> Running -> Completed)", () => {
    it("updates node status through lifecycle", () => {
      const taskId = "t-" + randomUUID();
      store.createTaskWithDag({
        taskId,
        goal: "g",
        nodes: [{ id: "n1", type: "plan", service: "planner" }],
        edges: [],
      });

      let state = store.getTaskState(taskId);
      expect(state?.nodes.find((n) => n.id === "n1")?.status).toBe("pending");

      store.updateNodeStatus(taskId, "n1", "running");
      state = store.getTaskState(taskId);
      expect(state?.nodes.find((n) => n.id === "n1")?.status).toBe("running");

      store.updateNodeStatus(taskId, "n1", "completed", { output: { plan: "done" } });
      state = store.getTaskState(taskId);
      expect(state?.nodes.find((n) => n.id === "n1")?.status).toBe("completed");

      const task = store.getTask(taskId) as Record<string, unknown>;
      const nodes = task?.nodes as Record<string, unknown>[];
      const n1 = nodes?.find((n) => n.id === "n1") as Record<string, unknown>;
      expect(n1?.output).toBe('{"plan":"done"}');
      expect(n1?.started_at).toBeDefined();
      expect(n1?.completed_at).toBeDefined();
    });

    it("updates node to failed", () => {
      const taskId = "t-" + randomUUID();
      store.createTaskWithDag({
        taskId,
        goal: "g",
        nodes: [{ id: "n1", type: "run", service: "executor" }],
        edges: [],
      });
      store.updateNodeStatus(taskId, "n1", "running");
      store.updateNodeStatus(taskId, "n1", "failed", { output: { error: "timeout" } });
      const state = store.getTaskState(taskId);
      expect(state?.nodes.find((n) => n.id === "n1")?.status).toBe("failed");
    });
  });

  describe("node results and reflections", () => {
    it("stores node result and appends reflection", () => {
      const taskId = "t-" + randomUUID();
      store.createTaskWithDag({
        taskId,
        goal: "g",
        nodes: [{ id: "n1", type: "generate", service: "model" }],
        edges: [],
      });
      store.updateNodeStatus(taskId, "n1", "completed", { output: { text: "hello" } });
      store.storeNodeResult(taskId, "n1", { content: "hello", tokens: 5 });
      store.appendReflection(taskId, "PASS", "Output looks good", "n1");

      const task = store.getTask(taskId) as Record<string, unknown>;
      expect(task).not.toBeNull();
      // Reflections are in task_reflections table; getTask doesn't include them.
      // We only verify no throw and task still retrievable.
      expect(task?.id).toBe(taskId);
    });

    it("appends reflection without nodeId", () => {
      const taskId = "t-" + randomUUID();
      store.createTaskWithDag({
        taskId,
        goal: "g",
        nodes: [{ id: "n1", type: "a", service: "b" }],
        edges: [],
      });
      store.appendReflection(taskId, "REVISE", "Needs improvement");
      const task = store.getTask(taskId) as Record<string, unknown>;
      expect(task?.id).toBe(taskId);
    });
  });

  describe("retrieval of current task status", () => {
    it("getTaskState returns status and node states", () => {
      const taskId = "t-" + randomUUID();
      store.createTaskWithDag({
        taskId,
        goal: "g",
        nodes: [
          { id: "n1", type: "a", service: "b" },
          { id: "n2", type: "c", service: "d" },
        ],
        edges: [{ fromNode: "n1", toNode: "n2" }],
      });
      store.updateNodeStatus(taskId, "n1", "completed");

      const state = store.getTaskState(taskId);
      expect(state?.status).toBe("pending");
      expect(state?.nodes).toHaveLength(2);
      expect(state?.nodes.find((n) => n.id === "n1")?.status).toBe("completed");
      expect(state?.nodes.find((n) => n.id === "n2")?.status).toBe("pending");
    });

    it("completeTask and failTask update task status", () => {
      const taskId = "t-" + randomUUID();
      store.createTaskWithDag({
        taskId,
        goal: "g",
        nodes: [{ id: "n1", type: "a", service: "b" }],
        edges: [],
      });
      store.completeTask(taskId);
      expect(store.getTaskState(taskId)?.status).toBe("completed");

      const taskId2 = "t-" + randomUUID();
      store.createTaskWithDag({
        taskId: taskId2,
        goal: "g2",
        nodes: [{ id: "n1-" + randomUUID(), type: "a", service: "b" }],
        edges: [],
      });
      store.failTask(taskId2, "error reason");
      expect(store.getTaskState(taskId2)?.status).toBe("failed");
    });
  });

  describe("error handling", () => {
    it("throws or causes constraint violation on duplicate task id", () => {
      const taskId = "t-dup";
      store.createTaskWithDag({
        taskId,
        goal: "g",
        nodes: [{ id: "n1", type: "a", service: "b" }],
        edges: [],
      });
      expect(() => {
        store.createTaskWithDag({
          taskId,
          goal: "g2",
          nodes: [{ id: "n2", type: "c", service: "d" }],
          edges: [],
        });
      }).toThrow();
    });

    it("duplicate node id across tasks is now allowed", () => {
      const taskId1 = "t1";
      const taskId2 = "t2";
      const nodeId = "n-shared";
      store.createTaskWithDag({
        taskId: taskId1,
        goal: "g1",
        nodes: [{ id: nodeId, type: "a", service: "b" }],
        edges: [],
      });
      // This should NOT throw anymore
      store.createTaskWithDag({
        taskId: taskId2,
        goal: "g2",
        nodes: [{ id: nodeId, type: "c", service: "d" }],
        edges: [],
      });

      const t1 = store.getTask(taskId1) as any;
      const t2 = store.getTask(taskId2) as any;
      expect(t1.nodes[0].id).toBe(nodeId);
      expect(t2.nodes[0].id).toBe(nodeId);
    });

    it("getTask returns null for invalid task reference", () => {
      expect(store.getTask("nonexistent")).toBeNull();
      expect(store.getTaskState("nonexistent")).toBeNull();
    });

    it("updateNodeStatus does nothing for non-existent node", () => {
      const taskId = "t-" + randomUUID();
      store.createTaskWithDag({
        taskId,
        goal: "g",
        nodes: [{ id: "n1", type: "a", service: "b" }],
        edges: [],
      });
      store.updateNodeStatus(taskId, "n-nonexistent", "running");
      const state = store.getTaskState(taskId);
      expect(state?.nodes.find((n) => n.id === "n1")?.status).toBe("pending");
    });
  });
});
