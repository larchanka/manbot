/**
 * Audio Conversion Utility
 *
 * Converts any audio format (ogg, mp3, m4a, etc.) to 16 kHz mono PCM WAV
 * using the bundled ffmpeg-static binary. WAV is the format required by
 * nodejs-whisper for speech-to-text transcription.
 *
 * Telegram voice messages arrive as audio/ogg (Opus codec) — this conversion
 * is therefore always required before calling Whisper.
 */

import { spawn } from "node:child_process";
import ffmpegPathRaw from "ffmpeg-static";

/** Timeout for audio conversion operations (60 seconds). */
const CONVERSION_TIMEOUT_MS = 60_000;

/**
 * Convert an audio file to 16 kHz mono PCM WAV format.
 *
 * @param inputPath  Absolute path to the source audio file.
 * @param outputPath Absolute path where the converted WAV file will be written.
 *                   The caller is responsible for deleting this file after use.
 * @returns          Promise that resolves when conversion completes successfully.
 * @throws           Error with descriptive message on conversion failure or timeout.
 */
export async function convertToWav(
    inputPath: string,
    outputPath: string,
): Promise<void> {
    // ffmpeg-static returns null when no binary is available for the platform
    const ffmpegBin = (ffmpegPathRaw as unknown) as string | null;
    if (!ffmpegBin) {
        throw new Error(
            "audio-converter: ffmpeg-static binary not available on this platform. " +
            "Cannot convert audio for transcription.",
        );
    }

    return new Promise<void>((resolve, reject) => {
        const args = [
            "-y",           // overwrite output without asking
            "-i", inputPath,
            "-ar", "16000", // 16 kHz sample rate (Whisper requirement)
            "-ac", "1",     // mono channel
            "-f", "wav",    // WAV container
            outputPath,
        ];

        // Spawn ffmpeg. Use default stdio so stderr is a readable stream.
        const proc = spawn(ffmpegBin, args);

        let stderr = "";
        proc.stderr.on("data", (chunk: Buffer) => {
            stderr += chunk.toString();
        });

        const timer = setTimeout(() => {
            proc.kill("SIGKILL");
            reject(
                new Error(
                    `audio-converter: ffmpeg timed out after ${CONVERSION_TIMEOUT_MS / 1000}s ` +
                    `converting "${inputPath}"`,
                ),
            );
        }, CONVERSION_TIMEOUT_MS);

        proc.on("close", (code: number | null) => {
            clearTimeout(timer);
            if (code === 0) {
                resolve();
            } else {
                // Include last 500 chars of stderr for context
                const detail = stderr.slice(-500);
                reject(
                    new Error(
                        `audio-converter: ffmpeg exited with code ${code} ` +
                        `converting "${inputPath}". stderr: ${detail}`,
                    ),
                );
            }
        });

        proc.on("error", (err: Error) => {
            clearTimeout(timer);
            reject(
                new Error(`audio-converter: failed to spawn ffmpeg: ${err.message}`),
            );
        });
    });
}
