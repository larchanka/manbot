/**
 * File Processor Service
 *
 * Independent BaseProcess subprocess. Listens on `file.process` envelopes,
 * routes each file to the appropriate handler by category, and responds with
 * a ProcessedFile result. After every processing attempt (success or error),
 * the original file is deleted from disk.
 *
 * Message types:
 *   Input:  file.process       (core → file-processor)
 *   Output: response           (file-processor → core)
 *   Output: event.file.processed (fire-and-forget → core/logger)
 */

import { randomUUID } from "node:crypto";
import { readFile, unlink } from "node:fs/promises";
import { resolve } from "node:path";
import { BaseProcess } from "../shared/base-process.js";
import type { Envelope } from "../shared/protocol.js";
import { PROTOCOL_VERSION } from "../shared/protocol.js";
import { getConfig } from "../shared/config.js";
import { OllamaAdapter } from "../services/ollama-adapter.js";
import { convertToWav } from "../utils/audio-converter.js";
import { transcribeAudio } from "../utils/whisper-transcriber.js";
import type {
    FileProcessRequest,
    ProcessedFile,
    ProcessedFileType,
    FileProcessedEventPayload,
} from "../shared/file-protocol.js";

const PROCESS_NAME = "file-processor";

/** OCR system prompt — optimized for glm-ocr as per user feedback. */
const OCR_PROMPT =
    "Text Recognition: Extract all text from this image. " +
    "If it contains tables or figures, describe them precisely. " +
    "If no text is found, describe the visual content in detail.";

class FileProcessorService extends BaseProcess {
    private readonly ollama: OllamaAdapter;

    constructor() {
        super({ processName: PROCESS_NAME });
        this.ollama = new OllamaAdapter();
    }

    protected override handleEnvelope(envelope: Envelope): void {
        if (envelope.type !== "file.process") return;

        const req = envelope.payload as FileProcessRequest;
        const startedAt = Date.now();

        (async () => {
            let processedFile: ProcessedFile;
            let deleted = false;
            let processingError: string | undefined;

            try {
                process.stderr.write(`[file-processor] [INFO] Routing ${req.fileName} (category: ${req.category})\n`);
                processedFile = await this.route(req);

                // Hard limit: Content should not exceed 64KB per file to prevent overwhelming the planner
                if (processedFile.content.length > 65536) {
                    processedFile.content = processedFile.content.slice(0, 65536) + "\n\n[...content truncated due to excessive length]";
                }

                // Sanity check: Strip anything that looks like a huge base64 or hex string
                const dataStringRegex = /[A-Za-z0-9+/]{200,}/g;
                if (dataStringRegex.test(processedFile.content)) {
                    processedFile.content = processedFile.content.replace(dataStringRegex, "[...large data-string removed...]");
                }

                // Stutter filter: Detect and clean up extremely repetitive model hallucinations
                if (processedFile.content.length > 100) {
                    const words = processedFile.content.split(/\s+/);
                    if (words.length > 20) {
                        const uniqueWords = new Set(words.map(w => w.toLowerCase()));
                        // If more than 70% of words are repeats in a long string, it's likely a loop
                        if (uniqueWords.size < words.length * 0.3) {
                            processedFile.content = words.slice(0, 20).join(" ") + "... [Repetitive model output truncated]";
                        }
                    }
                }
            } catch (err) {
                const msg = err instanceof Error ? err.message : String(err);
                process.stderr.write(`[file-processor] [ERROR] Failed to process ${req.fileName}: ${msg}\n`);
                processingError = msg;
                processedFile = {
                    fileId: req.fileId,
                    fileName: req.fileName,
                    type: "ignored",
                    content: "",
                    metadata: { error: msg },
                };
            }

            // Always delete the original local file after processing
            deleted = await this.safeDelete(req.localPath);

            // Respond to core
            const response: Envelope = {
                id: envelope.id,
                correlationId: envelope.id,
                timestamp: Date.now(),
                from: PROCESS_NAME,
                to: envelope.from,
                type: "response",
                version: PROTOCOL_VERSION,
                payload: {
                    status: processingError ? "error" : "success",
                    result: processedFile,
                },
            };
            this.send(response);

            // Fire-and-forget audit event
            const auditPayload: FileProcessedEventPayload = {
                fileId: req.fileId,
                fileName: req.fileName,
                category: req.category,
                resultType: processedFile.type,
                durationMs: Date.now() - startedAt,
                deleted,
                ...(processingError && { error: processingError }),
            };
            this.send({
                id: randomUUID(),
                timestamp: Date.now(),
                from: PROCESS_NAME,
                to: "core",
                type: "event.file.processed",
                version: PROTOCOL_VERSION,
                payload: auditPayload,
            });
        })().catch((fatalErr) => {
            // Last-resort: send an error envelope if even the error handling threw
            process.stderr.write(
                `[file-processor] fatal error processing ${req.fileId}: ${fatalErr}\n`,
            );
        });
    }

    // -------------------------------------------------------------------------
    // Routing
    // -------------------------------------------------------------------------

    private async route(req: FileProcessRequest): Promise<ProcessedFile> {
        switch (req.category) {
            case "text":
                return this.processText(req);
            case "image":
                return this.processImage(req);
            case "audio":
                return this.processAudio(req);
            default:
                return {
                    fileId: req.fileId,
                    fileName: req.fileName,
                    type: "ignored",
                    content: "",
                    metadata: { reason: "unsupported category" },
                };
        }
    }

    // -------------------------------------------------------------------------
    // Text handler
    // -------------------------------------------------------------------------

    private async processText(req: FileProcessRequest): Promise<ProcessedFile> {
        const cfg = getConfig().fileProcessor;
        const content = await readFile(req.localPath, "utf-8");
        const type: ProcessedFileType =
            content.length > cfg.textMaxInlineChars ? "text_long" : "text";

        return {
            fileId: req.fileId,
            fileName: req.fileName,
            type,
            content,
            metadata: {
                charCount: content.length,
                inlined: type === "text",
            },
        };
    }

    // -------------------------------------------------------------------------
    // Image handler — OCR / description via Ollama vision model
    // -------------------------------------------------------------------------

    private async processImage(req: FileProcessRequest): Promise<ProcessedFile> {
        const { ocrModel, ocrEnabled } = getConfig().fileProcessor;

        if (!ocrEnabled) {
            return {
                fileId: req.fileId,
                fileName: req.fileName,
                type: "ignored",
                content: "",
                metadata: { reason: "OCR disabled in config" },
            };
        }

        const result = await this.ollama.generateWithImage(OCR_PROMPT, ocrModel, req.localPath);
        const content = result.text?.trim() ?? "";

        // Log basic info for debugging without leaking full sensitive content
        process.stderr.write(`[file-processor] [DEBUG] OCR Result for ${req.fileName} (len: ${content.length}, words: ${content.split(/\s+/).length}): ${content.substring(0, 150).replace(/\n/g, " ")}...\n`);

        return {
            fileId: req.fileId,
            fileName: req.fileName,
            type: "image_ocr",
            content,
            metadata: {
                model: ocrModel,
                promptEvalCount: result.prompt_eval_count,
                evalCount: result.eval_count,
            },
        };
    }

    // -------------------------------------------------------------------------
    // Audio handler — convert to WAV → Whisper transcription
    // -------------------------------------------------------------------------

    private async processAudio(req: FileProcessRequest): Promise<ProcessedFile> {
        const absoluteLocalPath = resolve(process.cwd(), req.localPath);
        const wavPath = absoluteLocalPath.replace(/\.[^.]+$/, "") + "_converted.wav";
        let wavDeleted = false;

        try {
            await convertToWav(absoluteLocalPath, wavPath);
            const transcript = await transcribeAudio(wavPath);

            return {
                fileId: req.fileId,
                fileName: req.fileName,
                type: "audio_transcript",
                content: transcript,
                metadata: {
                    originalPath: req.localPath,
                    wavPath,
                },
            };
        } finally {
            // Always clean up the intermediate WAV file
            if (!wavDeleted) {
                await this.safeDelete(wavPath);
            }
        }
    }

    // -------------------------------------------------------------------------
    // Helpers
    // -------------------------------------------------------------------------

    private async safeDelete(filePath: string): Promise<boolean> {
        try {
            await unlink(filePath);
            return true;
        } catch {
            // File may already be gone or never existed — not an error
            return false;
        }
    }
}

// ---------------------------------------------------------------------------
// Entry point
// ---------------------------------------------------------------------------

const service = new FileProcessorService();
service.start();
