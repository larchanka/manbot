/**
 * File Processing Protocol Types
 *
 * Defines all TypeScript interfaces for the file processing IPC pipeline.
 * Shared across telegram-adapter, orchestrator, and file-processor service.
 *
 * Message types defined here:
 *   file.ingest        — telegram-adapter → core (files downloaded and ready)
 *   file.process       — core → file-processor (single file to process)
 *   event.file.processed — file-processor → logger (audit / fire-and-forget)
 *
 * MIME category classification rules:
 *   text/*  | application/json | application/pdf | application/xml → 'text'
 *   image/*                                                        → 'image'
 *   audio/* | video/ogg                                            → 'audio'
 *   anything else                                                  → 'unknown'
 */

// ---------------------------------------------------------------------------
// Shared primitives
// ---------------------------------------------------------------------------

/** File category, determined by MIME type at download time. */
export type FileCategory = "text" | "image" | "audio" | "unknown";

/**
 * Result type returned by file-processor after processing.
 *   text           — content inlined directly (short text file)
 *   text_long      — full text returned; orchestrator handles chunking + RAG
 *   image_ocr      — OCR / description result from glm-ocr:q8_0
 *   audio_transcript — Whisper transcript text
 *   ignored        — unsupported or unknown file type; content is empty
 */
export type ProcessedFileType =
    | "text"
    | "text_long"
    | "image_ocr"
    | "audio_transcript"
    | "ignored";

// ---------------------------------------------------------------------------
// FileDescriptor — describes a single downloaded file
// ---------------------------------------------------------------------------

export interface FileDescriptor {
    /** Telegram file ID (used for logging / deduplication). */
    fileId: string;
    /** Original file name as reported by Telegram. */
    fileName: string;
    /** MIME type string from Telegram (e.g. "audio/ogg", "image/jpeg"). */
    mimeType: string;
    /** File size in bytes. */
    sizeBytes: number;
    /** Absolute local path where the file was saved after download. */
    localPath: string;
    /** Derived category based on mimeType. */
    category: FileCategory;
}

// ---------------------------------------------------------------------------
// FileIngestPayload — telegram-adapter → core  (envelope type: "file.ingest")
// ---------------------------------------------------------------------------

export interface FileIngestPayload {
    /** Telegram chat ID of the sender. */
    chatId: number;
    /** Telegram user ID of the sender. */
    userId: number;
    /** Active conversation/session ID for context grouping. */
    conversationId: string;
    /** Telegram message ID (for logging). */
    messageId: number;
    /** One or more downloaded files attached to this message. */
    files: FileDescriptor[];
    /**
     * Optional user caption accompanying the file(s).
     * Used as the task goal / instruction; falls back to a type-appropriate default
     * if absent.
     */
    caption?: string;
}

// ---------------------------------------------------------------------------
// FileProcessRequest — core → file-processor  (envelope type: "file.process")
// ---------------------------------------------------------------------------

export interface FileProcessRequest {
    /** Telegram file ID (echoed back in the response for correlation). */
    fileId: string;
    /** Absolute local path to the downloaded file. */
    localPath: string;
    /** Original file name. */
    fileName: string;
    /** MIME type string. */
    mimeType: string;
    /** Pre-classified file category. */
    category: FileCategory;
    /**
     * Optional hint from the orchestrator.
     * Not used in Phase 1 — reserved for future on-demand processing modes.
     */
    processingHint?: string;
}

// ---------------------------------------------------------------------------
// ProcessedFile — file-processor → core  (inside a standard "response" envelope)
// ---------------------------------------------------------------------------

export interface ProcessedFile {
    /** Echoed Telegram file ID for correlation. */
    fileId: string;
    /** Original file name (for display in enriched goal). */
    fileName: string;
    /** Processing result type. */
    type: ProcessedFileType;
    /**
     * Extracted content string.
     * Empty string for type === 'ignored'.
     * For 'text_long': full raw text (chunking/summarizing is orchestrator's job).
     */
    content: string;
    /** Additional context metadata (e.g. duration for audio, dimensions for image). */
    metadata: Record<string, unknown>;
}

// ---------------------------------------------------------------------------
// FileProcessedEventPayload — fire-and-forget audit event to logger
// (envelope type: "event.file.processed")
// ---------------------------------------------------------------------------

export interface FileProcessedEventPayload {
    fileId: string;
    fileName: string;
    category: FileCategory;
    resultType: ProcessedFileType;
    /** Processing duration in milliseconds. */
    durationMs: number;
    /** Whether the original file was successfully deleted after processing. */
    deleted: boolean;
    /** Error message if processing failed (undefined on success). */
    error?: string;
}

// ---------------------------------------------------------------------------
// MIME classification helper
// ---------------------------------------------------------------------------

/**
 * Classify a MIME type string into a FileCategory.
 * Pure function — no side effects.
 */
export function classifyMimeType(mimeType: string): FileCategory {
    const m = mimeType.toLowerCase().trim();
    if (
        m.startsWith("text/") ||
        m === "application/json" ||
        m === "application/pdf" ||
        m === "application/xml" ||
        m === "application/x-yaml" ||
        m === "application/yaml"
    ) {
        return "text";
    }
    if (m.startsWith("image/")) {
        return "image";
    }
    if (m.startsWith("audio/") || m === "video/ogg") {
        // Telegram voice messages come as video/ogg on some clients
        return "audio";
    }
    return "unknown";
}
