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

function createLogger(): pino.Logger {
  const { logDir, logFile } = getConfig().logger;
  const logPath = join(process.cwd(), logDir, logFile);
  mkdirSync(dirname(logPath), { recursive: true });
  const destination = pino.destination(logPath);
  return pino(
    {
      level: "info",
      base: null,
    },
    destination,
  );
}

/**
 * Logger service process: listens on stdin for event.* messages and writes
 * structured log entries (metadata + payload) to logs/events.log.
 */
export class LoggerService extends BaseProcess {
  private readonly log: pino.Logger;

  constructor() {
    super({ processName: "logger" });
    this.log = createLogger();
  }

  protected override handleEnvelope(envelope: Envelope): void {
    if (!envelope.type.startsWith("event.")) {
      return;
    }
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
