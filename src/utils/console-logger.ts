/**
 * Console logger utility for structured terminal logging with colorization.
 * Provides timestamps, log levels, process name colors, and IPC message formatting.
 */

import colors from "@larchanka/colors-js";
import type { Envelope } from "../shared/protocol.js";

export type LogLevel = "INFO" | "DEBUG" | "WARN" | "ERROR";

interface ProcessColorMap {
  [key: string]: (text: string) => string;
}

// Process name color mapping (using available colors: green, red, yellow, purple, pink, gray)
const PROCESS_COLORS: ProcessColorMap = {
  core: colors.purple,
  telegram: colors.pink,
  planner: colors.yellow,
  executor: colors.green,
  "critic-agent": colors.purple,
  "task-memory": colors.purple,
  logger: colors.gray,
  "model-router": colors.purple,
  "rag-service": colors.purple,
  "tool-host": colors.green,
  "cron-manager": colors.yellow,
};

// Identity function for reset/default color
const reset = (text: string) => text;

// Log level colors
const LEVEL_COLORS: Record<LogLevel, (text: string) => string> = {
  INFO: reset,
  DEBUG: colors.gray,
  WARN: colors.yellow,
  ERROR: colors.red,
};

/**
 * Format timestamp as ISO string or relative time
 */
function formatTimestamp(timestamp?: number): string {
  if (!timestamp) {
    timestamp = Date.now();
  }
  const date = new Date(timestamp);
  return date.toISOString();
}

/**
 * Get color function for a process name, defaulting to reset if not found
 */
function getProcessColor(processName: string): (text: string) => string {
  return PROCESS_COLORS[processName] || reset;
}

/**
 * Format log level with color
 */
function formatLevel(level: LogLevel): string {
  const colorFn = LEVEL_COLORS[level];
  return colorFn(`[${level}]`);
}

/**
 * Format process name with color
 */
function formatProcessName(processName: string): string {
  const colorFn = getProcessColor(processName);
  return colorFn(`[${processName}]`);
}

/**
 * Format IPC envelope for logging
 */
function formatEnvelope(envelope: Envelope): string {
  const parts: string[] = [];
  
  // from → to
  const fromColor = getProcessColor(envelope.from);
  const toColor = getProcessColor(envelope.to);
  parts.push(`${fromColor(envelope.from)} → ${toColor(envelope.to)}`);
  
  // type
  parts.push(`type=${colors.purple(envelope.type)}`);
  
  // correlationId or id
  const cid = envelope.correlationId ?? envelope.id;
  parts.push(`cid=${colors.gray(cid.substring(0, 8))}`);
  
  return parts.join(" ");
}

/**
 * Format error message with stack trace if available
 */
function formatError(error: Error | string): string {
  if (typeof error === "string") {
    return colors.red(error);
  }
  
  let output = colors.red(error.message);
  if (error.stack) {
    output += "\n" + colors.gray(error.stack);
  }
  return output;
}

/**
 * Console logger class for structured terminal output
 */
export class ConsoleLogger {
  /**
   * Log a message with level, process name, and optional envelope
   */
  static log(
    level: LogLevel,
    processName: string,
    message: string,
    envelope?: Envelope,
    error?: Error | string,
  ): void {
    const timestamp = formatTimestamp();
    const levelStr = formatLevel(level);
    const processStr = formatProcessName(processName);
    
    let output = `${timestamp} ${levelStr} ${processStr} ${message}`;
    
    if (envelope) {
      output += ` | ${formatEnvelope(envelope)}`;
    }
    
    if (error) {
      output += `\n${formatError(error)}`;
    }
    
    // Write to stderr for all logs to avoid interfering with stdout IPC
    process.stderr.write(output + "\n");
  }

  /**
   * Log an INFO message
   */
  static info(processName: string, message: string, envelope?: Envelope): void {
    this.log("INFO", processName, message, envelope);
  }

  /**
   * Log a DEBUG message
   */
  static debug(processName: string, message: string, envelope?: Envelope): void {
    this.log("DEBUG", processName, message, envelope);
  }

  /**
   * Log a WARN message
   */
  static warn(processName: string, message: string, envelope?: Envelope): void {
    this.log("WARN", processName, message, envelope);
  }

  /**
   * Log an ERROR message
   */
  static error(processName: string, message: string, error?: Error | string, envelope?: Envelope): void {
    this.log("ERROR", processName, message, envelope, error);
  }

  /**
   * Log an IPC envelope (request/response/error/event)
   */
  static ipc(processName: string, direction: "→" | "←", envelope: Envelope): void {
    const timestamp = formatTimestamp(envelope.timestamp);
    const level = envelope.type === "error" ? "ERROR" : envelope.type === "response" ? "INFO" : "DEBUG";
    const levelStr = formatLevel(level);
    const processStr = formatProcessName(processName);
    
    const directionSymbol = direction === "→" ? colors.green("→") : colors.purple("←");
    const envelopeStr = formatEnvelope(envelope);
    
    const output = `${timestamp} ${levelStr} ${processStr} ${directionSymbol} ${envelopeStr}`;
    process.stderr.write(output + "\n");
  }

  /**
   * Log child process stderr output with formatting
   */
  static processStderr(processName: string, data: Buffer | string): void {
    const timestamp = formatTimestamp();
    const processStr = formatProcessName(processName);
    const dataStr = typeof data === "string" ? data : data.toString("utf-8");
    
    // Remove trailing newlines for cleaner output
    const cleaned = dataStr.trimEnd();
    if (!cleaned) return;
    
    const output = `${timestamp} ${formatLevel("DEBUG")} ${processStr} ${colors.gray(cleaned)}`;
    process.stderr.write(output + "\n");
  }

  /**
   * Log process lifecycle events (spawn, exit, error)
   */
  static processEvent(processName: string, event: "spawn" | "exit" | "error", details?: string | number | Error): void {
    const timestamp = formatTimestamp();
    const processStr = formatProcessName(processName);
    
    let eventStr: string;
    let level: LogLevel = "INFO";
    
    switch (event) {
      case "spawn":
        eventStr = colors.green("spawned");
        break;
      case "exit":
        eventStr = colors.yellow(`exited`);
        if (details !== undefined) {
          eventStr += ` code=${details}`;
        }
        break;
      case "error":
        eventStr = colors.red("error");
        level = "ERROR";
        break;
    }
    
    let output = `${timestamp} ${formatLevel(level)} ${processStr} Process ${eventStr}`;
    
    if (details instanceof Error) {
      output += `: ${formatError(details)}`;
    } else if (typeof details === "string") {
      output += `: ${details}`;
    }
    
    process.stderr.write(output + "\n");
  }
}
