/**
 * Integration tests for Cron Manager Service (P11-04).
 * Verifies IPC message handling, schedule management, and event emission.
 */

import { randomUUID } from "node:crypto";
import { mkdirSync, rmSync } from "node:fs";
import { join } from "node:path";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { CronManager } from "../cron-manager.js";
import type { Envelope } from "../../shared/protocol.js";
import { PROTOCOL_VERSION } from "../../shared/protocol.js";

const TEST_DIR = join(process.cwd(), "data", "test-cron-" + randomUUID());

function freshDbPath(): string {
  return join(TEST_DIR, randomUUID() + ".sqlite");
}

describe("CronManager Integration Tests", () => {
  let manager: CronManager;
  let dbPath: string;
  let sentMessages: Envelope[];

  beforeEach(() => {
    mkdirSync(TEST_DIR, { recursive: true });
    dbPath = freshDbPath();
    sentMessages = [];
    
    // Create manager and capture sent messages
    manager = new CronManager(dbPath);
    
    // Override send to capture messages
    const originalSend = manager.send.bind(manager);
    manager.send = (envelope: Envelope) => {
      sentMessages.push(envelope);
      originalSend(envelope);
    };
  });

  afterEach(() => {
    // Stop all cron jobs
    manager.close?.();
    try {
      rmSync(TEST_DIR, { recursive: true, force: true });
    } catch {
      // ignore
    }
  });

  function createEnvelope(
    type: string,
    payload: Record<string, unknown>,
    from = "test-client",
  ): Envelope {
    return {
      id: randomUUID(),
      timestamp: Date.now(),
      from,
      to: "cron-manager",
      type,
      version: PROTOCOL_VERSION,
      payload,
    };
  }

  function waitForResponse(requestId: string, timeout = 1000): Envelope | null {
    const start = Date.now();
    while (Date.now() - start < timeout) {
      const response = sentMessages.find(
        (msg) => msg.correlationId === requestId && msg.type === "response",
      );
      if (response) return response;
      // Small delay to allow async operations
      if (typeof setImmediate !== "undefined") {
        // Node.js environment
        return null; // For now, return null and check synchronously
      }
    }
    return null;
  }

  describe("cron.schedule.add", () => {
    it("adds a schedule and returns schedule ID", () => {
      const request = createEnvelope("cron.schedule.add", {
        cronExpr: "0 9 * * *",
        taskType: "reminder",
        payload: { chatId: "123", reminderMessage: "Test reminder" },
      });

      manager.handleEnvelope(request);

      const response = sentMessages.find(
        (msg) => msg.correlationId === request.id && msg.type === "response",
      );
      expect(response).toBeDefined();
      expect(response?.payload).toMatchObject({
        status: "success",
        result: expect.objectContaining({
          id: expect.any(String),
          cronExpr: "0 9 * * *",
          taskType: "reminder",
        }),
      });
    });

    it("adds a reminder schedule with structured payload", () => {
      const request = createEnvelope("cron.schedule.add", {
        cronExpr: "0 10 * * *",
        taskType: "reminder",
        payload: {
          chatId: "chat-123",
          reminderMessage: "Don't forget to call mom",
          userId: "user-456",
        },
      });

      manager.handleEnvelope(request);

      const response = sentMessages.find(
        (msg) => msg.correlationId === request.id && msg.type === "response",
      );
      const result = (response?.payload as { result: { id: string } })?.result;
      expect(result?.id).toBeDefined();
    });

    it("rejects invalid cron expression", () => {
      const request = createEnvelope("cron.schedule.add", {
        cronExpr: "invalid cron",
        taskType: "reminder",
      });

      manager.handleEnvelope(request);

      const error = sentMessages.find(
        (msg) => msg.correlationId === request.id && msg.type === "error",
      );
      expect(error).toBeDefined();
      expect(error?.payload).toMatchObject({
        code: "CRON_ERROR",
        message: expect.stringContaining("Invalid cron expression"),
      });
    });

    it("rejects missing cronExpr", () => {
      const request = createEnvelope("cron.schedule.add", {
        taskType: "reminder",
      });

      manager.handleEnvelope(request);

      const error = sentMessages.find(
        (msg) => msg.correlationId === request.id && msg.type === "error",
      );
      expect(error).toBeDefined();
      expect(error?.payload).toMatchObject({
        code: "INVALID_PAYLOAD",
        message: expect.stringContaining("cronExpr"),
      });
    });
  });

  describe("cron.schedule.list", () => {
    it("lists all schedules", () => {
      // Add a schedule first
      const addRequest = createEnvelope("cron.schedule.add", {
        cronExpr: "0 9 * * *",
        taskType: "reminder",
        payload: { chatId: "123" },
      });
      manager.handleEnvelope(addRequest);
      sentMessages.length = 0; // Clear messages

      // List schedules
      const listRequest = createEnvelope("cron.schedule.list", {});
      manager.handleEnvelope(listRequest);

      const response = sentMessages.find(
        (msg) => msg.correlationId === listRequest.id && msg.type === "response",
      );
      expect(response).toBeDefined();
      const result = (response?.payload as { result: { schedules: unknown[] } })?.result;
      expect(result?.schedules).toBeDefined();
      expect(Array.isArray(result?.schedules)).toBe(true);
      expect(result?.schedules.length).toBeGreaterThan(0);
    });

    it("returns empty array when no schedules exist", () => {
      const listRequest = createEnvelope("cron.schedule.list", {});
      manager.handleEnvelope(listRequest);

      const response = sentMessages.find(
        (msg) => msg.correlationId === listRequest.id && msg.type === "response",
      );
      const result = (response?.payload as { result: { schedules: unknown[] } })?.result;
      expect(result?.schedules).toEqual([]);
    });
  });

  describe("cron.schedule.remove", () => {
    it("removes a schedule", () => {
      // Add a schedule
      const addRequest = createEnvelope("cron.schedule.add", {
        cronExpr: "0 9 * * *",
        taskType: "reminder",
      });
      manager.handleEnvelope(addRequest);
      const addResponse = sentMessages.find(
        (msg) => msg.correlationId === addRequest.id && msg.type === "response",
      );
      const scheduleId = (
        addResponse?.payload as { result: { id: string } }
      )?.result?.id;
      expect(scheduleId).toBeDefined();
      sentMessages.length = 0;

      // Remove the schedule
      const removeRequest = createEnvelope("cron.schedule.remove", {
        id: scheduleId,
      });
      manager.handleEnvelope(removeRequest);

      const removeResponse = sentMessages.find(
        (msg) => msg.correlationId === removeRequest.id && msg.type === "response",
      );
      expect(removeResponse).toBeDefined();
      expect(removeResponse?.payload).toMatchObject({
        status: "success",
        result: { removed: scheduleId },
      });

      // Verify it's gone
      const listRequest = createEnvelope("cron.schedule.list", {});
      manager.handleEnvelope(listRequest);
      const listResponse = sentMessages.find(
        (msg) => msg.correlationId === listRequest.id && msg.type === "response",
      );
      const schedules = (
        listResponse?.payload as { result: { schedules: Array<{ id: string }> } }
      )?.result?.schedules;
      expect(schedules?.find((s) => s.id === scheduleId)).toBeUndefined();
    });

    it("rejects missing id", () => {
      const request = createEnvelope("cron.schedule.remove", {});
      manager.handleEnvelope(request);

      const error = sentMessages.find(
        (msg) => msg.correlationId === request.id && msg.type === "error",
      );
      expect(error).toBeDefined();
      expect(error?.payload).toMatchObject({
        code: "INVALID_PAYLOAD",
        message: expect.stringContaining("id"),
      });
    });
  });

  describe("event.cron.completed emission", () => {
    it("emits event.cron.completed with reminder payload when cron job runs", async () => {
      // Use a cron expression that runs every second for testing
      const cronExpr = "* * * * * *"; // Every second (6-field format)
      
      const addRequest = createEnvelope("cron.schedule.add", {
        cronExpr,
        taskType: "reminder",
        payload: {
          chatId: "chat-123",
          reminderMessage: "Test reminder message",
          userId: "user-456",
        },
      });
      manager.handleEnvelope(addRequest);
      const addResponse = sentMessages.find(
        (msg) => msg.correlationId === addRequest.id && msg.type === "response",
      );
      const scheduleId = (addResponse?.payload as { result: { id: string } })?.result?.id;
      sentMessages.length = 0; // Clear add response

      // Wait for cron job to trigger (should happen within 2 seconds)
      await new Promise((resolve) => setTimeout(resolve, 2100));

      // Find event.cron.completed messages for this specific schedule
      const completedEvents = sentMessages.filter(
        (msg) =>
          msg.type === "event.cron.completed" &&
          (msg.payload as { scheduleId: string })?.scheduleId === scheduleId,
      );
      expect(completedEvents.length).toBeGreaterThan(0);

      const event = completedEvents[0];
      expect(event?.payload).toMatchObject({
        scheduleId,
        taskType: "reminder",
        chatId: "chat-123",
        reminderMessage: "Test reminder message",
        userId: "user-456",
        payload: expect.objectContaining({
          chatId: "chat-123",
        }),
        timestamp: expect.any(Number),
      });

      // Clean up: remove the schedule
      const removeRequest = createEnvelope("cron.schedule.remove", { id: scheduleId });
      manager.handleEnvelope(removeRequest);
    });

    it("emits event.cron.completed with structured fields for reminder task type", async () => {
      const cronExpr = "* * * * * *";
      
      const addRequest = createEnvelope("cron.schedule.add", {
        cronExpr,
        taskType: "reminder",
        payload: {
          chatId: "chat-789",
          reminderMessage: "Another reminder",
        },
      });
      manager.handleEnvelope(addRequest);
      const addResponse = sentMessages.find(
        (msg) => msg.correlationId === addRequest.id && msg.type === "response",
      );
      const scheduleId = (addResponse?.payload as { result: { id: string } })?.result?.id;
      sentMessages.length = 0;

      await new Promise((resolve) => setTimeout(resolve, 2100));

      // Find events for this specific schedule
      const completedEvents = sentMessages.filter(
        (msg) =>
          msg.type === "event.cron.completed" &&
          (msg.payload as { scheduleId: string })?.scheduleId === scheduleId,
      );
      expect(completedEvents.length).toBeGreaterThan(0);

      const event = completedEvents[0];
      const payload = event?.payload as Record<string, unknown>;
      expect(payload.chatId).toBe("chat-789");
      expect(payload.reminderMessage).toBe("Another reminder");

      // Clean up
      const removeRequest = createEnvelope("cron.schedule.remove", { id: scheduleId });
      manager.handleEnvelope(removeRequest);
    });

    it("emits event.cron.completed without reminder fields for non-reminder tasks", async () => {
      const cronExpr = "* * * * * *";
      
      const addRequest = createEnvelope("cron.schedule.add", {
        cronExpr,
        taskType: "generic",
        payload: { someData: "value" },
      });
      manager.handleEnvelope(addRequest);
      const addResponse = sentMessages.find(
        (msg) => msg.correlationId === addRequest.id && msg.type === "response",
      );
      const scheduleId = (addResponse?.payload as { result: { id: string } })?.result?.id;
      sentMessages.length = 0;

      await new Promise((resolve) => setTimeout(resolve, 2100));

      // Find events for this specific schedule
      const completedEvents = sentMessages.filter(
        (msg) =>
          msg.type === "event.cron.completed" &&
          (msg.payload as { scheduleId: string })?.scheduleId === scheduleId,
      );
      expect(completedEvents.length).toBeGreaterThan(0);

      const event = completedEvents[0];
      const payload = event?.payload as Record<string, unknown>;
      expect(payload.chatId).toBeUndefined();
      expect(payload.reminderMessage).toBeUndefined();
      expect(payload.taskType).toBe("generic");
      expect(payload.payload).toMatchObject({ someData: "value" });

      // Clean up
      const removeRequest = createEnvelope("cron.schedule.remove", { id: scheduleId });
      manager.handleEnvelope(removeRequest);
    });
  });
});
