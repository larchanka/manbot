/**
 * Lemonade adapter: bridge to Lemonade-Server (OpenAI-compatible local AI).
 * Supports chat completions, vision, embeddings, and audio transcription.
 */

import { readFile } from "node:fs/promises";
import { getConfig } from "../shared/config.js";

export interface ChatMessagePart {
    type: "text" | "image_url";
    text?: string;
    image_url?: {
        url: string;
    };
}

export interface ChatMessage {
    role: "system" | "user" | "assistant" | "tool";
    content: string | ChatMessagePart[];
    tool_calls?: ToolCall[];
    tool_call_id?: string;
    name?: string;
}

export interface ToolCall {
    id: string;
    type: string;
    function: {
        name: string;
        arguments: string; // OpenAI uses stringified JSON for arguments
    };
}

export interface ChatOptions {
    timeoutMs?: number;
    tools?: any[];
    tool_choice?: string | object;
    temperature?: number;
    max_tokens?: number;
    response_format?: { type: "json_object" | "text" };
}

export interface ChatResult {
    message: {
        role: string;
        content: string;
        tool_calls?: ToolCall[];
    };
    usage?: {
        prompt_tokens: number;
        completion_tokens: number;
        total_tokens: number;
    };
    done: boolean;
}

export interface EmbedResult {
    embedding: number[];
}

export interface TranscriptionResult {
    text: string;
}

export interface LemonadeAdapterOptions {
    baseUrl?: string;
    timeoutMs?: number;
    retries?: number;
}

export class LemonadeAdapter {
    private readonly baseUrl: string;
    private readonly timeoutMs: number;
    private readonly retries: number;

    constructor(options: LemonadeAdapterOptions = {}) {
        const c = getConfig().lemonade;
        this.baseUrl = options.baseUrl ?? c.baseUrl;
        this.timeoutMs = options.timeoutMs ?? c.timeoutMs;
        this.retries = options.retries ?? c.retries;
    }

    /**
     * Chat completion (OpenAI compatible).
     */
    async chat(
        messages: ChatMessage[],
        model: string,
        opts: ChatOptions = {},
    ): Promise<ChatResult> {
        const timeoutMs = opts.timeoutMs ?? this.timeoutMs;
        const url = `${this.baseUrl}/chat/completions`;

        const body: Record<string, unknown> = {
            model,
            messages,
            stream: false,
            temperature: opts.temperature ?? 0.7,
            max_tokens: opts.max_tokens,
            tools: opts.tools,
            tool_choice: opts.tool_choice,
            response_format: opts.response_format,
        };

        const res = await this.fetchWithRetry(url, body, timeoutMs);
        const data = (await res.json()) as any;

        const choice = data.choices?.[0];
        if (!choice) {
            throw new Error(`Lemonade chat error: No choice returned. Data: ${JSON.stringify(data)}`);
        }

        // Convert OpenAI tool calls format if necessary (Lemonade usually follows OpenAI strictly)
        const tool_calls = choice.message.tool_calls?.map((tc: any) => ({
            id: tc.id,
            type: tc.type,
            function: {
                name: tc.function.name,
                arguments: tc.function.arguments // keep as string for compatibility or parse if needed
            }
        }));

        return {
            message: {
                role: choice.message.role,
                content: choice.message.content ?? "",
                tool_calls: tool_calls,
            },
            usage: data.usage,
            done: true,
        };
    }

    /**
     * Chat with an image attachment (OpenAI Vision compatible).
     */
    async chatWithImage(
        messages: ChatMessage[],
        model: string,
        imagePath: string,
        opts: ChatOptions = {},
    ): Promise<ChatResult> {
        const imageBytes = await readFile(imagePath);
        const base64Image = imageBytes.toString("base64");
        const mimeType = this.getMimeType(imagePath);
        const dataUri = `data:${mimeType};base64,${base64Image}`;

        // Clone messages and inject image into the last user message
        const updatedMessages: ChatMessage[] = JSON.parse(JSON.stringify(messages));
        const lastUserMsg = [...updatedMessages].reverse().find(m => m.role === "user");

        const imagePart: ChatMessagePart = {
            type: "image_url",
            image_url: { url: dataUri },
        };

        if (lastUserMsg) {
            if (typeof lastUserMsg.content === "string") {
                lastUserMsg.content = [
                    { type: "text", text: lastUserMsg.content },
                    imagePart,
                ];
            } else {
                lastUserMsg.content.push(imagePart);
            }
        } else {
            updatedMessages.push({
                role: "user",
                content: [imagePart],
            });
        }

        return this.chat(updatedMessages, model, opts);
    }

    /**
     * Embed text (OpenAI compatible).
     */
    async embed(input: string, model: string, opts: { timeoutMs?: number } = {}): Promise<EmbedResult> {
        const timeoutMs = opts.timeoutMs ?? this.timeoutMs;
        const url = `${this.baseUrl}/embeddings`;
        const body = { model, input };
        const res = await this.fetchWithRetry(url, body, timeoutMs);
        const data = (await res.json()) as any;

        const embedding = data.data?.[0]?.embedding;
        if (!embedding) {
            throw new Error("Lemonade embed error: No embedding returned");
        }

        return { embedding };
    }

    /**
     * Transcribe audio using Whisper model on Lemonade-Server.
     */
    async transcribe(
        audioPath: string,
        model: string = "Whisper-Tiny",
        language: string = "auto",
    ): Promise<TranscriptionResult> {
        const url = `${this.baseUrl}/audio/transcriptions`;
        const formData = new FormData();

        const audioBlob = new Blob([await readFile(audioPath)]);
        formData.append("file", audioBlob, "audio.wav");
        formData.append("model", model);
        if (language !== "auto") {
            formData.append("language", language);
        }

        const res = await fetch(url, {
            method: "POST",
            body: formData,
            // FormData sets content-type automatically with boundary
        });

        if (!res.ok) {
            const text = await res.text();
            throw new Error(`Lemonade transcription error ${res.status}: ${text}`);
        }

        const data = await res.json() as TranscriptionResult;
        return data;
    }

    /**
     * Warmup model (loads it into memory).
     * Lemonade might not have a specific warmup endpoint, 
     * but sending a small message often works.
     */
    async warmup(model: string): Promise<void> {
        try {
            await this.chat([{ role: "user", content: "hi" }], model, { max_tokens: 1, timeoutMs: 30000 });
        } catch (err) {
            console.warn(`Lemonade warmup for ${model} failed (non-fatal): ${err instanceof Error ? err.message : String(err)}`);
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
                    throw new Error(`Lemonade ${res.status}: ${text}`);
                }
                return res;
            } catch (err) {
                lastError = err;
                const isRetryable =
                    err instanceof Error &&
                    (err.name === "AbortError" ||
                        err.message.includes("fetch") ||
                        err.message.includes("ECONNREFUSED") ||
                        err.message.includes("network") ||
                        err.message.includes("reset") ||
                        err.message.includes("hangup"));

                if (attempt === this.retries || !isRetryable) {
                    throw err;
                }
                console.warn(`[lemonade-adapter] Fetch failed: ${err instanceof Error ? err.message : String(err)}. Retrying in ${(attempt + 1)}s...`);
                await new Promise((resolve) => setTimeout(resolve, (attempt + 1) * 1000));
            }
        }
        throw lastError;
    }

    private getMimeType(filePath: string): string {
        const ext = filePath.split(".").pop()?.toLowerCase();
        switch (ext) {
            case "png": return "image/png";
            case "jpg":
            case "jpeg": return "image/jpeg";
            case "webp": return "image/webp";
            case "gif": return "image/gif";
            default: return "image/jpeg";
        }
    }
}
