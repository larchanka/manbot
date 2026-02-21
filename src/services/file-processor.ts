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

/** OCR system prompt — model auto-detects text vs. visual-only images. */
const OCR_PROMPT =
    "Examine this image carefully. " +
    "Primary Goal: If it contains readable text (documents, screenshots, receipts, signs, code, etc.), " +
    "extract ALL text verbatim and return it. " +
    "Secondary Goal: If it contains no significant text, describe the image in detail (objects, people, scene, colors). " +
    "Do NOT return generic messages like 'No OCR text extracted'. " +
    "Return ONLY the extracted text or description — no preamble, no commentary.";

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
                processedFile = await this.route(req);
                // Hard limit: Content should not exceed 64KB per file to prevent overwhelming the planner
                if (processedFile.content.length > 65536) {
                    processedFile.content = processedFile.content.slice(0, 65536) + "\n\n[...content truncated due to excessive length]";
                }
                // Sanity check: Strip anything that looks like a huge base64 or hex string (likely model barf or leaked data)
                const base64Regex = /[A-Za-z0-9+/]{200,}/g;
                if (base64Regex.test(processedFile.content)) {
                    processedFile.content = processedFile.content.replace(base64Regex, "[...large data-string removed...]");
                }
            } catch (err) {
                const msg = err instanceof Error ? err.message : String(err);
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

        const messages = [
            { role: "user" as const, content: OCR_PROMPT },
        ];

        const result = await this.ollama.chatWithImage(messages, ocrModel, req.localPath);
        const content = result.message?.content?.trim() ?? "";

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
        const wavPath = req.localPath.replace(/\.[^.]+$/, "") + "_converted.wav";
        let wavDeleted = false;

        try {
            await convertToWav(req.localPath, wavPath);
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
