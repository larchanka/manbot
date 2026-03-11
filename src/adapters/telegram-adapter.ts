/**
 * Telegram Adapter: standalone service that interfaces the platform with Telegram.
 * Normalizes incoming messages to the Message Protocol and forwards to Core;
 * receives responses from Core and sends them back to the user.
 * P4-01: _board/TASKS/P4-01_TELEGRAM_ADAPTER.md
 * P4-02: _board/TASKS/P4-02_TELEGRAM_INTEGRATION.md — commands, auth, task flow, progress.
 */

import TelegramBot from "node-telegram-bot-api";
import { randomUUID } from "node:crypto";
import { mkdir, createWriteStream } from "node:fs";
import { pipeline } from "node:stream/promises";
import { resolve, extname } from "node:path";
import { PROTOCOL_VERSION } from "../shared/protocol.js";
import type { Envelope } from "../shared/protocol.js";
import { BaseProcess } from "../shared/base-process.js";
import { getConfig } from "../shared/config.js";
import { classifyMimeType } from "../shared/file-protocol.js";
import type { FileIngestPayload, FileDescriptor } from "../shared/file-protocol.js";

const PROCESS_NAME = "telegram-adapter";

/** Payload for incoming Telegram messages sent to Core */
export interface TelegramIncomingPayload {
  chatId: number;
  userId: number;
  username?: string;
  text: string;
  messageId: number;
}

/** Payload for task creation from Telegram (user goal = message.text) */
export interface TelegramTaskCreatePayload {
  chatId: number;
  userId: number;
  username?: string;
  /** Current conversation/session ID for grouping tasks. */
  conversationId: string;
  goal: string;
  messageId: number;
}

/** Payload for chat.new event (session reset / archiving trigger) */
export interface ChatNewPayload {
  chatId: number;
  conversationId: string;
}

/** Payload for messages from Core instructing the adapter to send to Telegram */
export interface TelegramSendPayload {
  chatId: number;
  text: string;
  parseMode?: "HTML" | "Markdown" | "MarkdownV2";
  /** If true, suppress this message (useful for intermediate system messages) */
  silent?: boolean;
}

/** Payload for progress updates (streamed to chat) */
export interface TelegramProgressPayload {
  chatId: number;
  text: string;
  parseMode?: "HTML" | "Markdown" | "MarkdownV2";
}

/** Parse allow-list from config: comma-separated Telegram user IDs. Empty = allow all. */
function getAllowedUserIds(): Set<number> | null {
  const raw = getConfig().telegram.allowedUserIds?.trim();
  if (!raw) return null;
  const ids = new Set<number>();
  for (const s of raw.split(",")) {
    const n = Number.parseInt(s.trim(), 10);
    if (Number.isFinite(n)) ids.add(n);
  }
  return ids.size > 0 ? ids : null;
}

/**
 * Escape HTML special characters for Telegram HTML parse mode.
 * Only <, > and & need escaping in Telegram HTML.
 */
function escapeHtml(text: string): string {
  return text
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;");
}

/**
 * Strip HTML tags from text for plain-text fallback.
 */
function stripHtmlTags(text: string): string {
  return text.replace(/<[^>]*>/g, "");
}

function createEnvelope<T>(type: string, to: string, payload: T): Envelope<T> {
  return {
    id: randomUUID(),
    timestamp: Date.now(),
    from: PROCESS_NAME,
    to,
    type,
    version: PROTOCOL_VERSION,
    payload,
  };
}

const HELP_TEXT = `Commands:
/start — Welcome and brief intro
/task [goal] — Start a new task with optional goal text
/new — Start a new conversation (previous one will be archived)
/help — Show this help

📅 Reminders:
- Ask me to remind you: "Remind me in 5 minutes to check the oven"
- Recurring reminders: "Remind me every day at 9am to take vitamins"
- List reminders: /reminders
- Cancel a reminder: /cancel_reminder <id>`;

/** chatId -> current conversation ID for session grouping */
const conversationIdByChat = new Map<number, string>();

function getOrCreateConversationId(chatId: number): string {
  let id = conversationIdByChat.get(chatId);
  if (id == null) {
    id = randomUUID();
    conversationIdByChat.set(chatId, id);
  }
  return id;
}

function main(): void {
  const token = getConfig().telegram.botToken;
  if (!token) {
    console.error("Telegram bot token is required. Set telegram.botToken in config.json or TELEGRAM_BOT_TOKEN.");
    process.exit(1);
  }

  const allowedUserIds = getAllowedUserIds();
  const bot = new TelegramBot(token, { polling: true });
  const base = new BaseProcess({ processName: PROCESS_NAME });

  async function sendToUser(
    chatId: number,
    text: string,
    options?: TelegramBot.SendMessageOptions,
    originalText?: string,
    isHtmlContent = false,
    retryCount = 0
  ): Promise<void> {
    const MAX_RETRIES = 3;
    const messageText = text?.trim() ? text : "[EMPTY_RESPONSE]";
    
    const finalOptions: TelegramBot.SendMessageOptions = {
      ...options,
      parse_mode: "HTML" as any
    };

    // If this is NOT LLM/HTML content (i.e. system messages), HTML-escape it
    const finalText = isHtmlContent ? messageText : escapeHtml(messageText);

    try {
      await bot.sendMessage(chatId, finalText, finalOptions);
    } catch (err: any) {
      // transient errors: retry
      const isTransient = 
        err.code === 'ECONNRESET' || 
        err.code === 'ETIMEDOUT' || 
        err.code === 'EFATAL' || 
        err.message?.includes("socket hang up");

      if (isTransient && retryCount < MAX_RETRIES) {
        const delay = 1000 * Math.pow(2, retryCount);
        console.warn(`[telegram-adapter] Transient error (${err.code || err.message}), retrying in ${delay}ms... (attempt ${retryCount + 1})`);
        await new Promise(resolve => setTimeout(resolve, delay));
        return sendToUser(chatId, text, options, originalText, isHtmlContent, retryCount + 1);
      }

      // If error is related to parsing entities, retry with plain text
      if (err.response?.body?.description?.includes("can't parse entities")) {
        console.warn(`Telegram fallback: Failed to parse HTML entities, retrying as plain text. Error: ${err.response.body.description}`);
        const fallbackText = stripHtmlTags(originalText?.trim() ? originalText : messageText);
        await bot.sendMessage(chatId, fallbackText, { ...options, parse_mode: undefined }).catch((innerErr) => {
          console.error("Telegram critical send error (fallback failed):", innerErr);
        });
      } else {
        console.error("Telegram send error:", err);
      }
    }
  }

  // Incoming Telegram message → auth, commands, file attachments, or task creation
  bot.on("message", (msg) => {
    const chatId = msg.chat?.id;
    const from = msg.from;
    const text = msg.text?.trim();
    if (chatId == null || from == null) return;

    // Authentication: allow-list of Telegram user IDs (optional)
    if (allowedUserIds !== null && !allowedUserIds.has(from.id)) {
      sendToUser(chatId, "You are not authorized to use this bot.");
      return;
    }

    // --- FP-09: File attachment detection ---
    const hasDocument = !!msg.document;
    const hasPhoto = !!msg.photo?.length;
    const hasVoice = !!msg.voice;
    const hasAudio = !!msg.audio;
    const hasVideo = !!(msg.video || msg.video_note);

    if (hasDocument || hasPhoto || hasVoice || hasAudio || hasVideo) {
      // Handle file upload asynchronously so we don't block the event loop
      ; (async () => {
        // Video: unsupported — notify and bail
        if (hasVideo) {
          await sendToUser(chatId, "⚠️ Video files are not supported yet.");
          return;
        }

        const cfg = getConfig();
        const uploadDir = resolve(process.cwd(), cfg.fileProcessor.uploadDir);
        const maxSize = cfg.fileProcessor.maxFileSizeBytes;
        const conversationId = getOrCreateConversationId(chatId);
        const caption = msg.caption?.trim();

        // Build a list of TelegramFile descriptors (one per attachment)
        type TgFileInfo = { fileId: string; fileName: string; mimeType: string; sizeBytes: number };
        const tgFiles: TgFileInfo[] = [];

        if (hasVoice && msg.voice) {
          const v = msg.voice;
          tgFiles.push({
            fileId: v.file_id,
            fileName: `voice_${v.file_id}.ogg`,
            mimeType: v.mime_type ?? "audio/ogg",
            sizeBytes: v.file_size ?? 0,
          });
        } else if (hasAudio && msg.audio) {
          const a = msg.audio;
          tgFiles.push({
            fileId: a.file_id,
            fileName: `audio_${a.file_id}.mp3`,
            mimeType: a.mime_type ?? "audio/mpeg",
            sizeBytes: a.file_size ?? 0,
          });
        } else if (hasPhoto && msg.photo) {
          // Telegram sends multiple resolutions; pick the highest
          const best = msg.photo[msg.photo.length - 1]!;
          tgFiles.push({
            fileId: best.file_id,
            fileName: `photo_${best.file_id}.jpg`,
            mimeType: "image/jpeg",
            sizeBytes: best.file_size ?? 0,
          });
        } else if (hasDocument && msg.document) {
          const d = msg.document;
          tgFiles.push({
            fileId: d.file_id,
            fileName: d.file_name ?? `document_${d.file_id}`,
            mimeType: d.mime_type ?? "application/octet-stream",
            sizeBytes: d.file_size ?? 0,
          });
        }

        // Download each file and build FileDescriptor list
        const fileDescriptors: FileDescriptor[] = [];

        for (const tgFile of tgFiles) {
          // Size check
          if (tgFile.sizeBytes > maxSize) {
            await sendToUser(
              chatId,
              `⚠️ "${tgFile.fileName}" is too large (${Math.round(tgFile.sizeBytes / 1_048_576)} MB). Max is ${Math.round(maxSize / 1_048_576)} MB. Skipping.`,
            );
            continue;
          }

          try {
            // Get download path from Telegram
            const fileInfo = await bot.getFile(tgFile.fileId);
            const filePath = fileInfo.file_path;
            if (!filePath) continue;

            // Determine local save path
            const convSubdir = resolve(uploadDir, conversationId);
            await new Promise<void>((res, rej) =>
              mkdir(convSubdir, { recursive: true }, (err) => (err ? rej(err) : res())),
            );
            const ext = extname(tgFile.fileName) || (tgFile.mimeType.startsWith("image/") ? ".jpg" : "");
            const localFileName = `${tgFile.fileId}${ext}`;
            const localPath = resolve(convSubdir, localFileName);

            // Download the file
            const downloadUrl = `https://api.telegram.org/file/bot${cfg.telegram.botToken}/${filePath}`;
            const resp = await fetch(downloadUrl);
            if (!resp.ok || !resp.body) {
              throw new Error(`HTTP ${resp.status} downloading ${tgFile.fileName}`);
            }
            await pipeline(
              resp.body as unknown as NodeJS.ReadableStream,
              createWriteStream(localPath),
            );

            fileDescriptors.push({
              fileId: tgFile.fileId,
              fileName: tgFile.fileName,
              mimeType: tgFile.mimeType,
              sizeBytes: tgFile.sizeBytes,
              localPath,
              category: classifyMimeType(tgFile.mimeType),
            });
          } catch (err) {
            await sendToUser(
              chatId,
              `⚠️ Failed to download "${tgFile.fileName}": ${err instanceof Error ? err.message : String(err)}`,
            );
          }
        }

        if (fileDescriptors.length === 0 && !caption) return;

        // Emit file.ingest to core
        const ingestPayload: FileIngestPayload = {
          chatId,
          userId: from.id,
          conversationId,
          messageId: msg.message_id ?? 0,
          files: fileDescriptors,
          ...(caption && { caption }),
        };
        base.send(createEnvelope<FileIngestPayload>("file.ingest", "core", ingestPayload));
      })().catch((err) => {
        console.error("[telegram-adapter] file handling error:", err);
      });
      return; // Don't fall through to text handling
    }
    // --- end file handling ---

    if (!text) {
      sendToUser(chatId, "Please send a text message or use /help.");
      return;
    }

    // /start
    if (text === "/start") {
      sendToUser(
        chatId,
        "Welcome to 🧬 ManBot. Send a task description or use /task <goal>. Use /help for commands."
      );
      return;
    }

    // /help
    if (text === "/help") {
      sendToUser(chatId, HELP_TEXT);
      return;
    }

    // /new — reset session and trigger archiving
    if (text === "/new") {
      const oldConversationId = conversationIdByChat.get(chatId) || String(chatId);
      const newConversationId = randomUUID();
      conversationIdByChat.set(chatId, newConversationId);

      // Emit event for logging
      base.send(createEnvelope("event.chat.reset", "logger", {
        chatId,
        oldConversationId,
        newConversationId
      }));

      // Trigger archiving in Core
      base.send(
        createEnvelope<ChatNewPayload>("chat.new", "core", {
          chatId,
          conversationId: oldConversationId,
        })
      );

      sendToUser(chatId, "🔄 New session started. Previous conversation is being archived...");
      return;
    }

    // /reminders — list active reminders
    if (text === "/reminders") {
      const reminderListEnvelope = createEnvelope("reminder.list", "core", { chatId });
      base.send(reminderListEnvelope);
      // Response will be handled in onMessage handler
      return;
    }

    // /cancel_reminder [id] — cancel a reminder
    if (text.startsWith("/cancel_reminder")) {
      const reminderId = text.slice(16).trim();
      if (!reminderId) {
        sendToUser(chatId, "Usage: /cancel_reminder <reminder-id>. Use /reminders to see your reminder IDs.");
        return;
      }
      const cancelEnvelope = createEnvelope("reminder.cancel", "core", { chatId, reminderId });
      base.send(cancelEnvelope);
      // Response will be handled in onMessage handler
      return;
    }

    // /task [goal] — if goal is provided, create task; else show usage
    if (text.startsWith("/task")) {
      const goal = text.slice(5).trim();
      if (!goal) {
        sendToUser(chatId, "Usage: /task <your goal>. Example: /task Summarize the benefits of TypeScript.");
        return;
      }
      const payload: TelegramTaskCreatePayload = {
        chatId,
        userId: from.id,
        conversationId: getOrCreateConversationId(chatId),
        messageId: msg.message_id ?? 0,
        goal,
        ...(from.username !== undefined && from.username !== "" && { username: from.username }),
      };
      base.send(createEnvelope<TelegramTaskCreatePayload>("task.create", "core", payload));
      return;
    }

    // Plain text: map to user goal and create task (same as /task <text>)
    const taskPayload: TelegramTaskCreatePayload = {
      chatId,
      userId: from.id,
      conversationId: getOrCreateConversationId(chatId),
      messageId: msg.message_id ?? 0,
      goal: text,
      ...(from.username !== undefined && from.username !== "" && { username: from.username }),
    };
    base.send(createEnvelope<TelegramTaskCreatePayload>("task.create", "core", taskPayload));
  });

  // Messages from Core (stdin) → send to Telegram user (initial/final output and progress)
  base.onMessage((envelope: Envelope) => {
    if (envelope.to !== PROCESS_NAME) return;

    if (envelope.type === "telegram.send") {
      const pl = envelope.payload as TelegramSendPayload;
      if (typeof pl.chatId === "number" && typeof pl.text === "string") {
        const opts: TelegramBot.SendMessageOptions = {
          parse_mode: pl.parseMode as any,
          ...(pl.silent === true && { disable_notification: true }),
        };
        sendToUser(pl.chatId, pl.text, opts, pl.text, true);
      }
      return;
    }

    // Stream task progress updates back to the chat
    if (envelope.type === "telegram.progress") {
      const pl = envelope.payload as TelegramProgressPayload;
      if (typeof pl.chatId === "number" && typeof pl.text === "string") {
        const opts: TelegramBot.SendMessageOptions = {
          parse_mode: pl.parseMode as any,
        };
        sendToUser(pl.chatId, pl.text, opts, pl.text, true);
      }
      return;
    }

    // Response envelope with result containing chatId + text (e.g. from Orchestrator)
    if (envelope.type === "response") {
      const pl = envelope.payload as { status: string; result?: unknown };
      if (pl.status === "success" && pl.result && typeof pl.result === "object") {
        const r = pl.result as { chatId?: number; text?: string; reminders?: unknown[]; message?: string; parseMode?: "HTML" | "Markdown" | "MarkdownV2" };
        if (typeof r.chatId === "number" && typeof r.text === "string") {
          const opts: TelegramBot.SendMessageOptions = {
            parse_mode: r.parseMode as any,
          };
          sendToUser(r.chatId, r.text, opts, r.text, true);
        } else if (typeof r.chatId === "number" && r.reminders) {
          // Handle reminder list response
          const reminders = r.reminders as Array<{ id: string; cronExpr: string; reminderMessage?: string }>;
          if (reminders.length === 0) {
            sendToUser(r.chatId, "🫙 No active reminders.");
          } else {
            const formatted = reminders
              .map((rem) => `ID: ${rem.id}\nTime: ${rem.cronExpr}\nMessage: ${rem.reminderMessage ?? "N/A"}`)
              .join("\n\n---\n\n");
            sendToUser(r.chatId, `⏰ Active reminders:\n\n${formatted}`);
          }
        } else if (typeof r.chatId === "number" && r.message) {
          sendToUser(r.chatId, r.message);
        }
      }
    }
  });

  base.start();
}

main();
