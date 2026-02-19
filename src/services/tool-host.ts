/**
 * Tool Host: secure sandbox for tool execution (shell, http_get, http_search).
 * Enforces sandbox directory restrictions for shell commands; MCP-compatible tool definition and execution.
 * P4-05: _board/TASKS/P4-05_TOOL_HOST.md
 */

import { randomUUID } from "node:crypto";
import { exec } from "node:child_process";
import { promisify } from "node:util";
import { resolve } from "node:path";
import { BaseProcess } from "../shared/base-process.js";
import type { Envelope } from "../shared/protocol.js";
import { PROTOCOL_VERSION } from "../shared/protocol.js";
import { responsePayloadSchema } from "../shared/protocol.js";
import { getConfig } from "../shared/config.js";
import { BrowserService } from "./browser-service.js";
import { htmlToMarkdown } from "../utils/html-to-markdown.js";
import { ConsoleLogger } from "../utils/console-logger.js";

const PROCESS_NAME = "tool-host";
const TOOL_EXECUTE = "tool.execute";
const execAsync = promisify(exec);

interface ToolExecutePayload {
  name: string;
  arguments?: Record<string, unknown>;
  args?: Record<string, unknown>;
}

type ToolImpl = (args: Record<string, unknown>) => Promise<unknown>;

export class ToolHost extends BaseProcess {
  private readonly sandboxDir: string;
  private readonly tools = new Map<string, ToolImpl>();
  private browserService: BrowserService | null = null;

  constructor(options?: { sandboxDir?: string }) {
    super({ processName: PROCESS_NAME });
    this.sandboxDir = resolve(options?.sandboxDir ?? getConfig().toolHost.sandboxDir);
    this.registerDefaultTools();
  }

  private getBrowserService(): BrowserService {
    if (!this.browserService) {
      this.browserService = new BrowserService();
    }
    return this.browserService;
  }

  private registerDefaultTools(): void {
    this.tools.set("shell", this.shellTool.bind(this));
    this.tools.set("http_get", this.httpGetTool.bind(this));
    this.tools.set("http_search", this.httpSearchTool.bind(this));
  }

  /**
   * Validate that a command and its working directory are safe to execute.
   * Ensures commands operate within sandbox directory restrictions and prevents path traversal attacks.
   * 
   * @param command - The shell command to validate
   * @param cwd - The working directory for the command
   * @returns Validation result with allowed status and optional reason for rejection
   */
  private validateCommand(command: string, cwd: string): { allowed: boolean; reason?: string } {
    // Normalize and resolve the cwd path
    const resolvedCwd = resolve(cwd);
    const normalizedSandboxDir = resolve(this.sandboxDir);

    // Check if cwd is empty or invalid
    if (!cwd || cwd.trim() === "") {
      return { allowed: false, reason: "Working directory cannot be empty" };
    }

    // Check for path traversal attempts in cwd
    if (cwd.includes("..")) {
      return { allowed: false, reason: "Path traversal detected: working directory contains '..'" };
    }

    // Ensure resolved cwd starts with sandbox directory
    if (!resolvedCwd.startsWith(normalizedSandboxDir)) {
      return {
        allowed: false,
        reason: `Working directory '${resolvedCwd}' is outside sandbox directory '${normalizedSandboxDir}'`,
      };
    }

    // Additional check: ensure no path traversal after resolution
    // This catches cases like /sandbox/../etc where resolve might normalize it
    const relativePath = resolvedCwd.slice(normalizedSandboxDir.length);
    if (relativePath.includes("..")) {
      return {
        allowed: false,
        reason: "Path traversal detected in resolved working directory path",
      };
    }

    // Check command string for obvious path traversal attempts
    // Note: This is a basic check; command parsing is complex and may have false positives
    // But it helps catch obvious attacks like "cd ../etc && cat passwd"
    if (command.includes("../") || command.includes("..\\")) {
      return {
        allowed: false,
        reason: "Path traversal detected in command string",
      };
    }

    return { allowed: true };
  }

  private async httpGetTool(args: Record<string, unknown>): Promise<unknown> {
    const url = args.url;
    if (typeof url !== "string") throw new Error("http_get requires url (string)");

    const convertToMarkdown = args.convertToMarkdown !== false; // Default true for HTML

    const startTime = Date.now();

    try {
      // Use browser directly for all requests
      const contentType = "";
      return await this.fetchWithBrowser(url, "", contentType, convertToMarkdown, startTime);
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      throw new Error(`HTTP GET failed (browser): ${message}`);
    }
  }

  private async httpSearchTool(args: Record<string, unknown>): Promise<unknown> {
    const query = args.query ?? args.q;
    if (typeof query !== "string") throw new Error("http_search requires query (string)");

    // Build Search URL (using the HTML endpoint which is more relaxed)
    const searchUrl = "https://search.yahoo.com/search?p=" + query;

    const startTime = Date.now();

    try {
      const browserService = this.getBrowserService();
      const result = await browserService.fetchWithBrowser(searchUrl);

      const responseTime = Date.now() - startTime;
      let body = result.body;

      // Convert HTML to Markdown (Search returns HTML)
      const isHTML = result.contentType.includes("text/html") || body.trim().startsWith("<!DOCTYPE") || body.trim().startsWith("<html");
      if (isHTML) {
        body = htmlToMarkdown(body);
      }

      return {
        status: result.status,
        body,
        contentType: result.contentType,
        finalUrl: result.finalUrl,
        method: result.method,
        usedMethod: "browser",
        responseTimeMs: responseTime,
        query,
        searchUrl,
      };
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      throw new Error(`HTTP search failed: ${message}`);
    }
  }

  /**
   * Execute a shell command in a sandboxed environment.
   * 
   * @param args - Tool arguments
   * @param args.command - Required. The shell command to execute
   * @param args.cwd - Optional. Working directory for command execution. Defaults to sandboxDir from config
   * @returns Structured response with stdout, stderr, exitCode, command, and cwd
   * @throws Error if command is missing, validation fails, or execution fails critically (e.g., timeout)
   */
  private async shellTool(args: Record<string, unknown>): Promise<unknown> {
    const command = args.command;
    if (typeof command !== "string") {
      throw new Error("shell requires command (string)");
    }
    if (command.trim() === "") {
      throw new Error("shell requires command (string)");
    }

    // Use provided cwd or default to sandboxDir
    const cwd = typeof args.cwd === "string" ? args.cwd : this.sandboxDir;

    // Validate command and cwd before execution
    const validation = this.validateCommand(command, cwd);
    if (!validation.allowed) {
      throw new Error(`Command validation failed: ${validation.reason}`);
    }

    // Resolve cwd after validation
    const resolvedCwd = resolve(cwd);

    // Use executor timeout as a reasonable default (10 minutes), or 30 seconds as a fallback
    const timeoutMs = getConfig().executor.nodeTimeoutMs || 30_000;

    try {
      const { stdout, stderr } = await execAsync(command, {
        cwd: resolvedCwd,
        timeout: timeoutMs,
        maxBuffer: 10 * 1024 * 1024, // 10MB max buffer
      });

      // Success case: command executed successfully
      return {
        stdout: stdout || "",
        stderr: stderr || "",
        exitCode: 0,
        command,
        cwd: resolvedCwd,
      };
    } catch (error: unknown) {
      // execAsync rejects on non-zero exit codes or execution errors
      // The error object contains stdout, stderr, and code properties

      // Handle timeout - this is a critical error that should be thrown
      if (
        error &&
        typeof error === "object" &&
        "code" in error &&
        (error.code === "ETIMEDOUT" || error.code === "TIMEOUT")
      ) {
        throw new Error(`Command execution timed out after ${Math.floor(timeoutMs / 1000)}s: ${command}`);
      }

      // Extract stdout, stderr, and exitCode from error object
      let stdout = "";
      let stderr = "";
      let exitCode = 1; // Default to 1 for errors

      if (error && typeof error === "object") {
        // execAsync error object has stdout, stderr, and code properties
        if ("stdout" in error && typeof error.stdout === "string") {
          stdout = error.stdout;
        }
        if ("stderr" in error && typeof error.stderr === "string") {
          stderr = error.stderr;
        }
        // code can be a number (exit code) or string (error code like 'ENOENT')
        if ("code" in error) {
          if (typeof error.code === "number") {
            exitCode = error.code;
          } else if (typeof error.code === "string" && error.code !== "ETIMEDOUT" && error.code !== "TIMEOUT") {
            // For system errors (like ENOENT), set stderr with error message
            const errorMessage = ("message" in error && typeof error.message === "string")
              ? error.message
              : String(error);
            stderr = errorMessage;
          }
        }
      } else {
        // Fallback error handling
        stderr = error instanceof Error ? error.message : String(error);
      }

      // Return structured response even on error (non-zero exit code)
      // This allows the caller to handle command failures gracefully
      return {
        stdout,
        stderr,
        exitCode,
        command,
        cwd: resolvedCwd,
      };
    }
  }

  private async fetchWithBrowser(
    url: string,
    _fallbackContent: string,
    _contentType: string,
    convertToMarkdown: boolean,
    startTime: number
  ): Promise<unknown> {
    const browserService = this.getBrowserService();
    const result = await browserService.fetchWithBrowser(url);

    const responseTime = Date.now() - startTime;
    let body = result.body;

    // Convert to Markdown if requested and content is HTML
    const isHTML = result.contentType.includes("text/html") || body.trim().startsWith("<!DOCTYPE") || body.trim().startsWith("<html");
    if (convertToMarkdown && isHTML) {
      body = htmlToMarkdown(body);
    }

    return {
      status: result.status,
      body,
      contentType: result.contentType,
      finalUrl: result.finalUrl,
      method: result.method,
      usedMethod: "browser",
      responseTimeMs: responseTime,
    };
  }

  protected override handleEnvelope(envelope: Envelope): void {
    if (envelope.to !== PROCESS_NAME) return;
    const type = envelope.type;
    const payload = envelope.payload as Record<string, unknown>;
    let name: string;
    let args: Record<string, unknown>;
    if (type === TOOL_EXECUTE) {
      const p = payload as unknown as ToolExecutePayload;
      name = p.name ?? "";
      args = (p.arguments ?? p.args ?? {}) as Record<string, unknown>;
    } else if (type === "node.execute") {
      const p = payload as { type?: string; input?: Record<string, unknown> };
      if (p.type !== "tool") return;
      name = (p.input?.tool ?? p.input?.name ?? "") as string;
      args = (p.input?.arguments ?? p.input?.args ?? p.input ?? {}) as Record<string, unknown>;
    } else {
      return;
    }
    const tool = this.tools.get(name);
    if (!tool) {
      this.sendError(envelope, "UNKNOWN_TOOL", `Tool not found: ${name}`);
      return;
    }
    (async () => {
      const startTime = Date.now();
      try {
        // Log tool execution start
        this.emitEvent("event.tool.started", {
          toolName: name,
          arguments: this.sanitizeArguments(args),
          taskId: (envelope.payload as Record<string, unknown>).taskId,
          nodeId: (envelope.payload as Record<string, unknown>).nodeId,
        });
        ConsoleLogger.info(PROCESS_NAME, `Tool execution started: ${name}`, envelope);

        const result = await tool(args);
        const duration = Date.now() - startTime;

        // Log tool execution success
        this.emitEvent("event.tool.completed", {
          toolName: name,
          arguments: this.sanitizeArguments(args),
          durationMs: duration,
          success: true,
          taskId: (envelope.payload as Record<string, unknown>).taskId,
          nodeId: (envelope.payload as Record<string, unknown>).nodeId,
        });
        ConsoleLogger.info(PROCESS_NAME, `Tool execution completed: ${name} (${duration}ms)`, envelope);

        this.sendResponse(envelope, result);
      } catch (err) {
        const duration = Date.now() - startTime;
        const message = err instanceof Error ? err.message : String(err);
        const isPermission = message.includes("Permission denied");

        // Log tool execution failure
        this.emitEvent("event.tool.failed", {
          toolName: name,
          arguments: this.sanitizeArguments(args),
          durationMs: duration,
          success: false,
          error: message,
          errorCode: isPermission ? "PERMISSION_DENIED" : "TOOL_ERROR",
          taskId: (envelope.payload as Record<string, unknown>).taskId,
          nodeId: (envelope.payload as Record<string, unknown>).nodeId,
        });
        ConsoleLogger.error(PROCESS_NAME, `Tool execution failed: ${name} - ${message}`, err instanceof Error ? err : undefined, envelope);

        this.sendError(envelope, isPermission ? "PERMISSION_DENIED" : "TOOL_ERROR", message);
      }
    })();
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

  private emitEvent(type: string, payload: unknown): void {
    this.send({
      id: randomUUID(),
      timestamp: Date.now(),
      from: PROCESS_NAME,
      to: "logger",
      type,
      version: PROTOCOL_VERSION,
      payload,
    });
  }

  /**
   * Sanitize arguments for logging (remove sensitive data, truncate large values)
   */
  private sanitizeArguments(args: Record<string, unknown>): Record<string, unknown> {
    const sanitized: Record<string, unknown> = {};
    const MAX_VALUE_LENGTH = 500;

    for (const [key, value] of Object.entries(args)) {
      if (typeof value === "string") {
        // Truncate long strings
        sanitized[key] = value.length > MAX_VALUE_LENGTH
          ? value.substring(0, MAX_VALUE_LENGTH) + "..."
          : value;
      } else if (typeof value === "object" && value !== null) {
        // For objects, stringify and truncate if needed
        const str = JSON.stringify(value);
        sanitized[key] = str.length > MAX_VALUE_LENGTH
          ? str.substring(0, MAX_VALUE_LENGTH) + "..."
          : value;
      } else {
        sanitized[key] = value;
      }
    }

    return sanitized;
  }
}

function main(): void {
  const host = new ToolHost();
  host.start();
}

main();
