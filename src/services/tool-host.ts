/**
 * Tool Host: secure sandbox for tool execution (read_file, write_file, http_get).
 * Enforces sandbox directory for file tools; MCP-compatible tool definition and execution.
 * P4-05: _board/TASKS/P4-05_TOOL_HOST.md
 */

import { randomUUID } from "node:crypto";
import { readFile, writeFile } from "node:fs/promises";
import { resolve } from "node:path";
import { BaseProcess } from "../shared/base-process.js";
import type { Envelope } from "../shared/protocol.js";
import { PROTOCOL_VERSION } from "../shared/protocol.js";
import { responsePayloadSchema } from "../shared/protocol.js";
import { getConfig } from "../shared/config.js";
import { BrowserService } from "./browser-service.js";
import { htmlToMarkdown } from "../utils/html-to-markdown.js";

const PROCESS_NAME = "tool-host";
const TOOL_EXECUTE = "tool.execute";

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
    this.tools.set("read_file", this.readFileTool.bind(this));
    this.tools.set("write_file", this.writeFileTool.bind(this));
    this.tools.set("http_get", this.httpGetTool.bind(this));
  }

  private resolvePath(relativePath: string): { path: string; allowed: boolean } {
    const pathArg = relativePath.replace(/\.\./g, "");
    const full = resolve(this.sandboxDir, pathArg);
    const allowed = full.startsWith(this.sandboxDir) && !full.includes("..");
    return { path: full, allowed };
  }

  private async readFileTool(args: Record<string, unknown>): Promise<unknown> {
    const pathArg = args.path ?? args.file;
    if (typeof pathArg !== "string") throw new Error("read_file requires path (string)");
    const { path: full, allowed } = this.resolvePath(pathArg);
    if (!allowed) throw new Error("Permission denied: path outside sandbox");
    const content = await readFile(full, "utf-8");
    return { content };
  }

  private async writeFileTool(args: Record<string, unknown>): Promise<unknown> {
    const pathArg = args.path ?? args.file;
    const content = args.content ?? args.data;
    if (typeof pathArg !== "string") throw new Error("write_file requires path (string)");
    if (typeof content !== "string") throw new Error("write_file requires content (string)");
    const { path: full, allowed } = this.resolvePath(pathArg);
    if (!allowed) throw new Error("Permission denied: path outside sandbox");
    await writeFile(full, content, "utf-8");
    return { path: full, written: true };
  }

  private async httpGetTool(args: Record<string, unknown>): Promise<unknown> {
    const url = args.url;
    if (typeof url !== "string") throw new Error("http_get requires url (string)");
    
    const useBrowser = args.useBrowser === true;
    const convertToMarkdown = args.convertToMarkdown !== false; // Default true for HTML
    
    const startTime = Date.now();
    let method = "fetch";
    
    try {
      // Try fetch first (unless useBrowser is explicitly true)
      if (!useBrowser) {
        try {
          const res = await fetch(url, { method: "GET" });
          const status = res.status;
          const contentType = res.headers.get("content-type") || "";
          const text = await res.text();
          
          // Check if we should fallback to browser (403, 401, or other error statuses)
          if (status === 403 || status === 401) {
            // Fallback to browser for blocked requests
            method = "browser (fallback from fetch)";
            return await this.fetchWithBrowser(url, text, contentType, convertToMarkdown, startTime);
          }
          
          // Check if content is HTML and should be converted to Markdown
          const isHTML = contentType.includes("text/html") || text.trim().startsWith("<!DOCTYPE") || text.trim().startsWith("<html");
          let body = text;
          
          if (convertToMarkdown && isHTML) {
            body = htmlToMarkdown(text);
          }
          
          const responseTime = Date.now() - startTime;
          
          return {
            status,
            body,
            contentType,
            finalUrl: url,
            method: "GET",
            usedMethod: method,
            responseTimeMs: responseTime,
          };
        } catch (fetchError) {
          // If fetch fails, try browser as fallback
          method = "browser (fallback from fetch error)";
          const contentType = "";
          return await this.fetchWithBrowser(url, "", contentType, convertToMarkdown, startTime);
        }
      } else {
        // Use browser directly
        method = "browser";
        const contentType = "";
        return await this.fetchWithBrowser(url, "", contentType, convertToMarkdown, startTime);
      }
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      throw new Error(`HTTP GET failed (${method}): ${message}`);
    }
  }

  private async fetchWithBrowser(
    url: string,
    fallbackContent: string,
    contentType: string,
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
      try {
        const result = await tool(args);
        this.sendResponse(envelope, result);
      } catch (err) {
        const message = err instanceof Error ? err.message : String(err);
        const isPermission = message.includes("Permission denied");
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
}

function main(): void {
  const host = new ToolHost();
  host.start();
}

main();
