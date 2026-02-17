/**
 * Base class for processes that communicate via stdin/stdout JSONL.
 * Matches _docs/MESSAGE PROTOCOL SPEC.md transport (line-delimited JSON).
 */

import { EventEmitter } from "node:events";
import { createInterface } from "node:readline";
import type { Envelope } from "./protocol.js";
import { envelopeSchema } from "./protocol.js";

export interface BaseProcessOptions {
  /** Process name used as default `from` in outgoing messages. */
  processName: string;
}

export interface BaseProcessEvents {
  message: (envelope: Envelope) => void;
  parseError: (payload: { line: string; error: unknown }) => void;
}

/**
 * Base process: reads JSONL from stdin, validates with Zod, emits messages;
 * writes validated JSONL to stdout.
 */
export class BaseProcess extends EventEmitter {
  readonly processName: string;
  private rl: ReturnType<typeof createInterface> | null = null;
  private running = false;

  constructor(options: BaseProcessOptions) {
    super();
    this.processName = options.processName;
  }

  /**
   * Start reading stdin. Call once after setting up message handler.
   */
  start(): void {
    if (this.running) return;
    this.running = true;
    this.rl = createInterface({ input: process.stdin, terminal: false });
    this.rl.on("line", (line: string) => this.handleLine(line));
    this.rl.on("close", () => this.handleClose());
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
