/**
 * Ollama adapter: bridge to local Ollama instance for generate, chat, and streaming.
 * Uses fetch; supports timeout and retry for network errors.
 */

import { readFile } from "node:fs/promises";
import { getConfig } from "../shared/config.js";


export interface GenerateOptions {
  timeoutMs?: number;
  keep_alive?: string | number;
  options?: Record<string, unknown>;
}

export interface ChatOptions {
  timeoutMs?: number;
  keep_alive?: string | number;
  tools?: any[];
  options?: Record<string, unknown>;
}

export interface GenerateResult {
  text: string;
  prompt_eval_count?: number;
  eval_count?: number;
  done: boolean;
}

export interface ChatMessage {
  role: "system" | "user" | "assistant" | "tool";
  content: string;
  tool_calls?: ToolCall[];
  tool_call_id?: string;
}

export interface ToolCall {
  id: string;
  type: string;
  function: {
    name: string;
    arguments: Record<string, any>;
  };
}

export interface ChatResult {
  message: {
    role: string;
    content: string;
    tool_calls?: ToolCall[];
  };
  prompt_eval_count?: number;
  eval_count?: number;
  done: boolean;
}

export interface StreamChunk {
  message?: { content: string; tool_calls?: ToolCall[] };
  done?: boolean;
  prompt_eval_count?: number;
  eval_count?: number;
}

export interface EmbedResult {
  embedding: number[];
  prompt_eval_count?: number;
}

export interface OllamaAdapterOptions {
  baseUrl?: string;
  timeoutMs?: number;
  retries?: number;
}

export class OllamaAdapter {
  private readonly baseUrl: string;
  private readonly timeoutMs: number;
  private readonly retries: number;
  private readonly numCtx: number;

  constructor(options: OllamaAdapterOptions = {}) {
    const c = getConfig().ollama;
    this.baseUrl = options.baseUrl ?? c.baseUrl;
    this.timeoutMs = options.timeoutMs ?? c.timeoutMs;
    this.retries = options.retries ?? c.retries;
    this.numCtx = c.numCtx;
  }

  /**
   * Generate completion for a single prompt. Returns full response (stream: false).
   */
  async generate(
    prompt: string,
    model: string,
    opts: GenerateOptions = {},
  ): Promise<GenerateResult> {
    const timeoutMs = opts.timeoutMs ?? this.timeoutMs;
    const url = `${this.baseUrl}/api/generate`;
    const body: Record<string, unknown> = {
      model,
      prompt,
      stream: false,
      options: {
        num_ctx: this.numCtx,
        ...opts.options,
      },
    };
    if (opts.keep_alive !== undefined) body.keep_alive = opts.keep_alive;
    const res = await this.fetchWithRetry(url, body, timeoutMs);
    const data = (await res.json()) as {
      response?: string;
      done?: boolean;
      prompt_eval_count?: number;
      eval_count?: number;
    };
    const result: GenerateResult = {
      text: data.response ?? "",
      done: data.done ?? true,
    };
    if (data.prompt_eval_count !== undefined) result.prompt_eval_count = data.prompt_eval_count;
    if (data.eval_count !== undefined) result.eval_count = data.eval_count;
    return result;
  }

  /**
   * Generate with an image attachment.
   */
  async generateWithImage(
    prompt: string,
    model: string,
    imagePath: string,
    opts: GenerateOptions = {},
  ): Promise<GenerateResult> {
    const imageBytes = await readFile(imagePath);
    const base64Image = imageBytes.toString("base64");

    const timeoutMs = opts.timeoutMs ?? this.timeoutMs;
    const url = `${this.baseUrl}/api/generate`;
    const body: Record<string, unknown> = {
      model,
      prompt,
      images: [base64Image],
      stream: false,
      options: {
        num_ctx: this.numCtx,
        ...opts.options,
      },
    };
    if (opts.keep_alive !== undefined) body.keep_alive = opts.keep_alive;

    const res = await this.fetchWithRetry(url, body, timeoutMs);
    const data = (await res.json()) as {
      response?: string;
      done?: boolean;
      prompt_eval_count?: number;
      eval_count?: number;
    };
    const result: GenerateResult = {
      text: data.response ?? "",
      done: data.done ?? true,
    };
    if (data.prompt_eval_count !== undefined) result.prompt_eval_count = data.prompt_eval_count;
    if (data.eval_count !== undefined) result.eval_count = data.eval_count;
    return result;
  }


  /**
   * Chat with messages. Returns full response (stream: false).
   */
  async chat(
    messages: ChatMessage[],
    model: string,
    opts: ChatOptions = {},
  ): Promise<ChatResult> {
    const timeoutMs = opts.timeoutMs ?? this.timeoutMs;
    const url = `${this.baseUrl}/api/chat`;
    const body: Record<string, unknown> = {
      model,
      messages,
      stream: false,
      options: {
        num_ctx: this.numCtx,
        ...opts.options,
      },
    };
    if (opts.keep_alive !== undefined) body.keep_alive = opts.keep_alive;
    if (opts.tools) body.tools = opts.tools;
    const res = await this.fetchWithRetry(url, body, timeoutMs);
    const data = (await res.json()) as {
      message?: { role: string; content: string; tool_calls?: ToolCall[] };
      done?: boolean;
      prompt_eval_count?: number;
      eval_count?: number;
    };
    const result: ChatResult = {
      message: data.message ?? { role: "assistant", content: "" },
      done: data.done ?? true,
    };
    if (data.prompt_eval_count !== undefined) result.prompt_eval_count = data.prompt_eval_count;
    if (data.eval_count !== undefined) result.eval_count = data.eval_count;
    return result;
  }

  /**
   * Chat with an image attachment. Reads the image file at `imagePath`, encodes it
   * as base64, and injects it into the last user message via Ollama's `images` field.
   * Intended for vision/OCR models such as `glm-ocr:q8_0`.
   *
   * @param messages  Conversation messages (same format as `chat()`).
   * @param model     Ollama model name supporting vision (must accept `images` field).
   * @param imagePath Absolute local path to the image file (jpeg, png, webp, etc.).
   * @param opts      Optional chat options (timeout, keep_alive, etc.).
   */
  async chatWithImage(
    messages: ChatMessage[],
    model: string,
    imagePath: string,
    opts: ChatOptions = {},
  ): Promise<ChatResult> {
    // Read and encode the image
    let imageBytes: Buffer;
    try {
      imageBytes = await readFile(imagePath);
    } catch (err) {
      throw new Error(
        `OllamaAdapter.chatWithImage: cannot read image at "${imagePath}": ${err instanceof Error ? err.message : String(err)
        }`,
      );
    }
    const base64Image = imageBytes.toString("base64");

    // Clone messages; inject images into the last user message
    const messagesWithImage: Array<Record<string, unknown>> = messages.map(
      (msg, idx) => {
        const clone: Record<string, unknown> = { ...msg };
        if (idx === messages.length - 1 && msg.role === "user") {
          clone.images = [base64Image];
        }
        return clone;
      },
    );

    // If no user message was found at the end, append one with just the image
    const lastMsg = messages[messages.length - 1];
    if (!lastMsg || lastMsg.role !== "user") {
      messagesWithImage.push({ role: "user", content: "", images: [base64Image] });
    }

    const timeoutMs = opts.timeoutMs ?? this.timeoutMs;
    const url = `${this.baseUrl}/api/chat`;
    const body: Record<string, unknown> = {
      model,
      messages: messagesWithImage,
      stream: false,
      options: {
        num_ctx: this.numCtx,
        ...opts.options,
      },
    };
    if (opts.keep_alive !== undefined) body.keep_alive = opts.keep_alive;

    const res = await this.fetchWithRetry(url, body, timeoutMs);
    const data = (await res.json()) as {
      message?: { role: string; content: string; tool_calls?: ToolCall[] };
      done?: boolean;
      prompt_eval_count?: number;
      eval_count?: number;
    };
    const result: ChatResult = {
      message: data.message ?? { role: "assistant", content: "" },
      done: data.done ?? true,
    };
    if (data.prompt_eval_count !== undefined) result.prompt_eval_count = data.prompt_eval_count;
    if (data.eval_count !== undefined) result.eval_count = data.eval_count;
    return result;
  }

  /**
   * Generate embedding for text. Uses POST /api/embed.
   */

  async embed(input: string, model: string, opts: { timeoutMs?: number } = {}): Promise<EmbedResult> {
    const timeoutMs = opts.timeoutMs ?? this.timeoutMs;
    const url = `${this.baseUrl}/api/embed`;
    const body = { model, input };
    const res = await this.fetchWithRetry(url, body, timeoutMs);
    const data = (await res.json()) as {
      embeddings?: number[][];
      prompt_eval_count?: number;
    };
    const embedding = Array.isArray(data.embeddings) && data.embeddings[0] ? data.embeddings[0] : [];
    const result: EmbedResult = { embedding };
    if (data.prompt_eval_count !== undefined) result.prompt_eval_count = data.prompt_eval_count;
    return result;
  }

  /**
   * Warm up a model by sending a minimal prompt, ensuring it is loaded into memory.
   * The keep_alive parameter controls how long the model stays in memory after the call.
   */
  async warmup(model: string, keepAlive: string | number): Promise<void> {
    const url = `${this.baseUrl}/api/chat`;
    const body = {
      model,
      messages: [{ role: "user", content: "hello" }],
      stream: false,
      keep_alive: keepAlive,
    };
    try {
      await this.fetchWithRetry(url, body, this.timeoutMs);
    } catch (err) {
      throw new Error(
        `OllamaAdapter.warmup failed for model "${model}": ${err instanceof Error ? err.message : String(err)
        }`,
      );
    }
  }

  /**
   * Stream chat response. Returns async iterator of chunks (NDJSON).
   */
  async *streamChat(
    messages: ChatMessage[],
    model: string,
    opts: ChatOptions = {},
  ): AsyncGenerator<StreamChunk> {
    const timeoutMs = opts.timeoutMs ?? this.timeoutMs;
    const url = `${this.baseUrl}/api/chat`;
    const body: Record<string, unknown> = { model, messages, stream: true };
    if (opts.keep_alive !== undefined) body.keep_alive = opts.keep_alive;
    if (opts.options !== undefined) body.options = opts.options;
    const res = await this.fetchWithRetry(url, body, timeoutMs);
    if (!res.body) return;
    const reader = res.body.getReader();
    const decoder = new TextDecoder();
    let buffer = "";
    try {
      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        buffer += decoder.decode(value, { stream: true });
        const lines = buffer.split("\n");
        buffer = lines.pop() ?? "";
        for (const line of lines) {
          const trimmed = line.trim();
          if (!trimmed) continue;
          try {
            const chunk = JSON.parse(trimmed) as StreamChunk;
            yield chunk;
          } catch {
            // skip malformed line
          }
        }
      }
      if (buffer.trim()) {
        try {
          yield JSON.parse(buffer.trim()) as StreamChunk;
        } catch {
          // skip
        }
      }
    } finally {
      reader.releaseLock();
    }
  }

  private async fetchWithRetry(
    url: string,
    body: unknown,
    timeoutMs: number,
  ): Promise<Response> {
    let lastError: unknown;
    for (let attempt = 0; attempt <= this.retries; attempt++) {
      try {
        const controller = new AbortController();
        const timeout = setTimeout(() => controller.abort(), timeoutMs);
        const res = await fetch(url, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(body),
          signal: controller.signal,
        });
        clearTimeout(timeout);
        if (!res.ok) {
          const text = await res.text();
          throw new Error(`Ollama ${res.status}: ${text}`);
        }
        return res;
      } catch (err) {
        lastError = err;
        const isRetryable =
          err instanceof Error &&
          (err.name === "AbortError" ||
            err.message.includes("fetch") ||
            err.message.includes("ECONNREFUSED") ||
            err.message.includes("network"));
        if (attempt === this.retries || !isRetryable) throw err;
      }
    }
    throw lastError;
  }
}
