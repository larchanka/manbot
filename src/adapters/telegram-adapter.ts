/**
 * Telegram Adapter: standalone service that interfaces the platform with Telegram.
 * Normalizes incoming messages to the Message Protocol and forwards to Core;
 * receives responses from Core and sends them back to the user.
 * P4-01: _board/TASKS/P4-01_TELEGRAM_ADAPTER.md
 * P4-02: _board/TASKS/P4-02_TELEGRAM_INTEGRATION.md — commands, auth, task flow, progress.
 */

import TelegramBot from "node-telegram-bot-api";
import { randomUUID } from "node:crypto";
import { PROTOCOL_VERSION } from "../shared/protocol.js";
import type { Envelope } from "../shared/protocol.js";
import { BaseProcess } from "../shared/base-process.js";
import { getConfig } from "../shared/config.js";

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
 * Escape special characters for Telegram MarkdownV2 format.
 * According to Telegram API docs, these characters must be escaped: _ * [ ] ( ) ~ ` > # + - = | { } . !
 */
function escapeMarkdownV2(text: string): string {
  // Characters that need to be escaped in MarkdownV2
  const specialChars = /([_*\[\]()~`>#+\-=|{}.!])/g;
  return text.replace(specialChars, "\\$1");
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

  function sendToUser(
    chatId: number,
    text: string,
    options?: TelegramBot.SendMessageOptions
  ): void {
    bot.sendMessage(chatId, text, options).catch((err) => {
      console.error("Telegram send error:", err);
    });
  }

  // Incoming Telegram message → auth, commands, or task creation
  bot.on("message", (msg) => {
    const chatId = msg.chat?.id;
    const from = msg.from;
    const text = msg.text?.trim();
    if (chatId == null || from == null) return;

    // Authentication: allow-list of Telegram user IDs (optional)
    if (allowedUserIds !== null && !allowedUserIds.has(from.id)) {
      void bot.sendMessage(chatId, "You are not authorized to use this bot.");
      return;
    }

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
      const oldConversationId = conversationIdByChat.get(chatId);
      const newConversationId = randomUUID();
      conversationIdByChat.set(chatId, newConversationId);
      if (oldConversationId != null) {
        base.send(
          createEnvelope<ChatNewPayload>("chat.new", "core", {
            chatId,
            conversationId: oldConversationId,
          })
        );
      }
      sendToUser(chatId, "New session started. Previous conversation has been archived.");
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
        // Escape text ONLY if explicitly requested MarkdownV2
        const text = pl.parseMode === "MarkdownV2" ? escapeMarkdownV2(pl.text) : pl.text;
        const opts: TelegramBot.SendMessageOptions = {
          parse_mode: pl.parseMode ?? "Markdown",
          ...(pl.silent === true && { disable_notification: true }),
        };
        sendToUser(pl.chatId, text, opts);
      }
      return;
    }

    // Stream task progress updates back to the chat
    if (envelope.type === "telegram.progress") {
      const pl = envelope.payload as TelegramProgressPayload;
      if (typeof pl.chatId === "number" && typeof pl.text === "string") {
        const text = pl.parseMode === "MarkdownV2" ? escapeMarkdownV2(pl.text) : pl.text;
        const opts: TelegramBot.SendMessageOptions = {
          parse_mode: pl.parseMode ?? "Markdown",
        };
        sendToUser(pl.chatId, text, opts);
      }
      return;
    }

    // Response envelope with result containing chatId + text (e.g. from Orchestrator)
    if (envelope.type === "response") {
      const pl = envelope.payload as { status: string; result?: unknown };
      if (pl.status === "success" && pl.result && typeof pl.result === "object") {
        const r = pl.result as { chatId?: number; text?: string; reminders?: unknown[]; message?: string; parseMode?: "HTML" | "Markdown" | "MarkdownV2" };
        if (typeof r.chatId === "number" && typeof r.text === "string") {
          const text = r.parseMode === "MarkdownV2" ? escapeMarkdownV2(r.text) : r.text;
          const opts: TelegramBot.SendMessageOptions = {
            parse_mode: r.parseMode ?? "Markdown",
          };
          sendToUser(r.chatId, text, opts);
        } else if (typeof r.chatId === "number" && r.reminders) {
          // Handle reminder list response
          const reminders = r.reminders as Array<{ id: string; cronExpr: string; reminderMessage?: string }>;
          if (reminders.length === 0) {
            sendToUser(r.chatId, "No active reminders.");
          } else {
            const formatted = reminders
              .map((rem) => `ID: ${rem.id}\nTime: ${rem.cronExpr}\nMessage: ${rem.reminderMessage ?? "N/A"}`)
              .join("\n\n---\n\n");
            sendToUser(r.chatId, `Active reminders:\n\n${formatted}`);
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
