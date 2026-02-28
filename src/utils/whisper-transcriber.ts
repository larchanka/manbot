/**
 * Whisper Transcription Utility
 *
 * Speech-to-text transcription using Lemonade-Server (OpenAI-compatible).
 * Returns the transcript as a plain string.
 */

import { getConfig } from "../shared/config.js";
import { LemonadeAdapter } from "../services/lemonade-adapter.js";

/**
 * Transcribe a WAV audio file using the configured Whisper model via Lemonade.
 *
 * @param wavPath  Absolute path to a 16 kHz mono PCM WAV file.
 * @returns        Promise resolving to the trimmed transcript string.
 */
export async function transcribeAudio(wavPath: string): Promise<string> {
    const cfg = getConfig().whisper;
    const lemonade = new LemonadeAdapter();

    try {
        const result = await lemonade.transcribe(wavPath, cfg.modelName, cfg.language);
        return result.text.trim();
    } catch (err) {
        const message = err instanceof Error ? err.message : String(err);
        throw new Error(`whisper-transcriber: transcription failed — ${message}`);
    }
}
