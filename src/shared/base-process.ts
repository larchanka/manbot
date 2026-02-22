/**
 * Base class for processes that communicate via stdin/stdout JSONL.
 * Matches _docs/MESSAGE PROTOCOL SPEC.md transport (line-delimited JSON).
 */

import { EventEmitter } from "node:events";
import { createInterface } from "node:readline";
import { randomUUID } from "node:crypto";
import type { Envelope, ProcessStatus, HeartbeatPayload } from "./protocol.js";
import { envelopeSchema, PROTOCOL_VERSION } from "./protocol.js";

export interface BaseProcessOptions {
  /** Process name used as default `from` in outgoing messages. */
  processName: string;
  /** How often to send heartbeats in ms. Default 10s. */
  heartbeatInterval?: number;
}

export interface BaseProcessEvents {
  message: (envelope: Envelope) => void;
  parseError: (payload: { line: string; error: unknown }) => void;
}

/**
 * Base process: reads JSONL from stdin, validates with Zod, emits messages;
 * writes validated JSONL to stdout.
 * Includes lifecycle management and periodic heartbeats.
 */
export class BaseProcess extends EventEmitter {
  readonly processName: string;
  protected status: ProcessStatus = "starting";
  private rl: ReturnType<typeof createInterface> | null = null;
  private running = false;
  private heartbeatTimer: NodeJS.Timeout | null = null;
  private readonly heartbeatInterval: number;
  private readonly startTime: number;

  constructor(options: BaseProcessOptions) {
    super();
    this.processName = options.processName;
    this.heartbeatInterval = options.heartbeatInterval ?? 10000;
    this.startTime = Date.now();
  }

  /**
   * Start reading stdin and begin heartbeats.
   */
  start(): void {
    if (this.running) return;
    this.running = true;
    this.status = "ready";

    this.rl = createInterface({ input: process.stdin, terminal: false });
    this.rl.on("line", (line: string) => this.handleLine(line));
    this.rl.on("close", () => this.handleClose());

    this.startHeartbeat();
  }

  /**
   * Stop reading and stop heartbeats.
   */
  stop(): void {
    this.status = "stopping";
    this.stopHeartbeat();
    if (this.rl) {
      this.rl.close();
      this.rl = null;
    }
    this.running = false;
  }

  protected setStatus(status: ProcessStatus): void {
    this.status = status;
    this.sendHeartbeat(); // Immediate heartbeat on status change
  }

  private startHeartbeat(): void {
    this.stopHeartbeat();
    this.sendHeartbeat();
    this.heartbeatTimer = setInterval(() => this.sendHeartbeat(), this.heartbeatInterval);
  }

  private stopHeartbeat(): void {
    if (this.heartbeatTimer) {
      clearInterval(this.heartbeatTimer);
      this.heartbeatTimer = null;
    }
  }

  private sendHeartbeat(): void {
    const memory = process.memoryUsage();
    const payload: HeartbeatPayload = {
      status: this.status,
      uptime: Math.floor((Date.now() - this.startTime) / 1000),
      memory: {
        rss: memory.rss,
        heapTotal: memory.heapTotal,
        heapUsed: memory.heapUsed,
        external: memory.external,
      },
      version: "1.0.1", // TODO: pull from package.json or config
    };

    const envelope: Envelope<HeartbeatPayload> = {
      id: randomUUID(),
      timestamp: Date.now(),
      from: this.processName,
      to: "core", // System events usually go to core/supervisor
      type: "event.system.heartbeat",
      version: PROTOCOL_VERSION,
      payload,
    };

    this.send(envelope);
  }

  /**
   * Override to handle each valid envelope. Default emits "message" (for use with onMessage).
   */
  protected handleEnvelope(envelope: Envelope): void {
    this.emit("message", envelope);
  }

  /**
   * Override to handle parse/validation errors. Default emits "parseError".
   */
  protected handleParseError(line: string, error: unknown): void {
    this.emit("parseError", { line, error });
  }

  private handleLine(line: string): void {
    const trimmed = line.trim();
    if (!trimmed) return;

    try {
      const raw = JSON.parse(trimmed) as unknown;
      const envelope = envelopeSchema.parse(raw) as Envelope;
      this.handleEnvelope(envelope);
    } catch (error) {
      this.handleParseError(line, error);
    }
  }

  private handleClose(): void {
    this.running = false;
    this.status = "stopping";
  }

  /**
   * Send an envelope to stdout. Validates with Zod before writing.
   * @throws if envelope fails validation
   */
  send(envelope: Envelope): void {
    const parsed = envelopeSchema.parse(envelope) as Envelope;
    const line = JSON.stringify(parsed) + "\n";
    process.stdout.write(line);
  }

  /**
   * Register a message handler. For subclass override, override handleEnvelope instead.
   */
  onMessage(handler: (envelope: Envelope) => void): this {
    return this.on("message", handler);
  }
}
