/**
 * Logger service: subscribes to event.* messages on stdin and persists them to a log file.
 * Uses pino for structured JSON logging per _docs/TECH.md.
 */

import { mkdirSync } from "node:fs";
import { dirname, join } from "node:path";
import pino from "pino";
import { BaseProcess } from "../shared/base-process.js";
import type { Envelope } from "../shared/protocol.js";
import { getConfig } from "../shared/config.js";
import { ConsoleLogger } from "../utils/console-logger.js";

function getLogPath(): string {
  const { logDir } = getConfig().logger;
  const dateStr = new Date().toISOString().split("T")[0]; // YYYY-MM-DD
  return join(process.cwd(), logDir, `events-${dateStr}.log`);
}

function createLogger(): pino.Logger {
  const logPath = getLogPath();
  mkdirSync(dirname(logPath), { recursive: true });
  const destination = pino.destination({
    dest: logPath,
    sync: true, // Ensure logs are flushed
  });
  return pino(
    {
      level: "info",
      base: null,
      timestamp: () => `,"time":"${new Date().toISOString()}"`,
    },
    destination,
  );
}

/**
 * Logger service process: listens on stdin for event.* messages and writes
 * structured log entries (metadata + payload) to daily files logs/events-YYYY-MM-DD.log.
 */
export class LoggerService extends BaseProcess {
  private log: pino.Logger;
  private currentLogDate: string;

  constructor() {
    super({ processName: "logger" });
    this.currentLogDate = new Date().toISOString().split("T")[0]!;
    this.log = createLogger();
  }

  private checkRotation(): void {
    const today = new Date().toISOString().split("T")[0]!;
    if (today !== this.currentLogDate) {
      this.currentLogDate = today;
      this.log = createLogger();
    }
  }

  protected override handleEnvelope(envelope: Envelope): void {
    if (!envelope.type.startsWith("event.")) {
      return;
    }

    this.checkRotation();

    // Write to file (structured JSON logging)
    this.log.info({
      from: envelope.from,
      to: envelope.to,
      type: envelope.type,
      timestamp: envelope.timestamp,
      id: envelope.id,
      correlationId: envelope.correlationId,
      payload: envelope.payload,
    });
    // Also output to console with structured formatting
    ConsoleLogger.info("logger", `Event: ${envelope.type}`, envelope);
  }
}

function main(): void {
  const service = new LoggerService();
  service.start();
}

main();
