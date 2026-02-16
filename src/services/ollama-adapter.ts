/**
 * Ollama adapter: bridge to local Ollama instance for generate, chat, and streaming.
 * Uses fetch; supports timeout and retry for network errors.
 */

export interface GenerateOptions {
  timeoutMs?: number;
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

const DEFAULT_BASE_URL = "http://127.0.0.1:11434";
const DEFAULT_TIMEOUT_MS = 60_000;
const DEFAULT_RETRIES = 2;

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
    this.baseUrl = options.baseUrl ?? DEFAULT_BASE_URL;
    this.timeoutMs = options.timeoutMs ?? DEFAULT_TIMEOUT_MS;
    this.retries = options.retries ?? DEFAULT_RETRIES;
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
    const body = { model, prompt, stream: false };
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
    opts: { timeoutMs?: number } = {},
  ): Promise<ChatResult> {
    const timeoutMs = opts.timeoutMs ?? this.timeoutMs;
    const url = `${this.baseUrl}/api/chat`;
    const body = { model, messages, stream: false };
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
   * Stream chat response. Returns async iterator of chunks (NDJSON).
   */
  async *streamChat(
    messages: ChatMessage[],
    model: string,
    opts: { timeoutMs?: number } = {},
  ): AsyncGenerator<StreamChunk> {
    const timeoutMs = opts.timeoutMs ?? this.timeoutMs;
    const url = `${this.baseUrl}/api/chat`;
    const body = { model, messages, stream: true };
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
