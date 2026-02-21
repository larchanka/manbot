/**
 * Whisper Transcription Utility
 *
 * Speech-to-text transcription using nodejs-whisper (OpenAI Whisper local inference).
 * Accepts a pre-converted .wav file (16 kHz mono PCM — see audio-converter.ts) and
 * returns the transcript as a plain string.
 *
 * On first use, the Whisper model (~200 MB for base.en) is automatically downloaded.
 * A descriptive error guides the user to retry after the download completes.
 */

import { nodewhisper } from "nodejs-whisper";
import type { WhisperOptions } from "nodejs-whisper/dist/types.js";
import { getConfig } from "../shared/config.js";

/** Maximum time to wait for transcription (5 minutes for long recordings). */
const TRANSCRIPTION_TIMEOUT_MS = 5 * 60 * 1000;

/**
 * Transcribe a WAV audio file using the configured Whisper model.
 *
 * @param wavPath  Absolute path to a 16 kHz mono PCM WAV file.
 *                 The caller is responsible for deleting this file after use.
 * @returns        Promise resolving to the trimmed transcript string.
 * @throws         Error with descriptive message on failure, including a
 *                 user-friendly message when the model is still downloading.
 */
export async function transcribeAudio(wavPath: string): Promise<string> {
    const cfg = getConfig().whisper;

    // Build WhisperOptions — only set language when it's not "auto"
    // to satisfy exactOptionalPropertyTypes strictness
    const whisperOptions: WhisperOptions = { outputInText: true };
    if (cfg.language !== "auto") {
        whisperOptions.language = cfg.language;
    }

    /**
     * Race nodewhisper against a timeout.
     * nodewhisper has no built-in timeout, so we enforce one here.
     */
    const transcriptionPromise = nodewhisper(wavPath, {
        modelName: cfg.modelName,
        // autoDownloadModelName triggers an automatic download if the model is absent
        autoDownloadModelName: cfg.modelName,
        whisperOptions,
        // Suppress verbose progress logs; re-surface genuine errors via stderr
        logger: {
            debug: () => { },
            log: () => { },
            error: (msg: unknown) => {
                if (typeof msg === "string" && msg.toLowerCase().includes("error")) {
                    process.stderr.write(`[whisper] ${msg}\n`);
                }
            },
        },
    });

    const timeoutPromise = new Promise<never>((_, reject) =>
        setTimeout(
            () =>
                reject(
                    new Error(
                        `whisper-transcriber: transcription timed out after ` +
                        `${TRANSCRIPTION_TIMEOUT_MS / 1000}s. ` +
                        "The audio may be too long or the model may still be downloading.",
                    ),
                ),
            TRANSCRIPTION_TIMEOUT_MS,
        ),
    );

    let raw: string;
    try {
        raw = await Promise.race([transcriptionPromise, timeoutPromise]);
    } catch (err) {
        const message = err instanceof Error ? err.message : String(err);

        // Detect the model-not-downloaded scenario
        if (
            message.includes("No such file") ||
            message.includes("ENOENT") ||
            message.includes("model") ||
            message.includes("download")
        ) {
            throw new Error(
                "whisper-transcriber: Audio transcription model is downloading for the " +
                "first time (~200 MB). Please retry in a few minutes.",
            );
        }

        throw new Error(`whisper-transcriber: transcription failed — ${message}`);
    }

    return raw.trim();
}
