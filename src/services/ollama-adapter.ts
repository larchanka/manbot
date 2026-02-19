/**
 * Ollama adapter: bridge to local Ollama instance for generate, chat, and streaming.
 * Uses fetch; supports timeout and retry for network errors.
 */

import { getConfig } from "../shared/config.js";

export interface GenerateOptions {
  timeoutMs?: number;
  keep_alive?: string | number;
}

export interface ChatOptions {
  timeoutMs?: number;
  keep_alive?: string | number;
}

export interface GenerateResult {
  text: string;
  prompt_eval_count?: number;
  eval_count?: number;
  done: boolean;
}

export interface ChatMessage {
  role: "system" | "user" | "assistant";
  content: string;
}

export interface ChatResult {
  message: { role: string; content: string };
  prompt_eval_count?: number;
  eval_count?: number;
  done: boolean;
}

export interface StreamChunk {
  message?: { content: string };
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

  constructor(options: OllamaAdapterOptions = {}) {
    const c = getConfig().ollama;
    this.baseUrl = options.baseUrl ?? c.baseUrl;
    this.timeoutMs = options.timeoutMs ?? c.timeoutMs;
    this.retries = options.retries ?? c.retries;
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
    const body: Record<string, unknown> = { model, prompt, stream: false };
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
    const body: Record<string, unknown> = { model, messages, stream: false };
    if (opts.keep_alive !== undefined) body.keep_alive = opts.keep_alive;
    const res = await this.fetchWithRetry(url, body, timeoutMs);
    const data = (await res.json()) as {
      message?: { role: string; content: string };
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
