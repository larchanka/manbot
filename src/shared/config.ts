/**
 * Central configuration. Loads from config.json (optional) and merges with process.env.
 * Env vars override config file. Copy config.json.example to config.json and edit.
 */

import { readFileSync, existsSync } from "node:fs";
import { join } from "node:path";

export interface OllamaConfig {
  baseUrl: string;
  timeoutMs: number;
  retries: number;
}

export interface TelegramConfig {
  botToken: string;
  /** Comma-separated Telegram user IDs allowed to use the bot. Empty or omit = allow all. */
  allowedUserIds: string;
}

export interface TaskMemoryConfig {
  dbPath: string;
}

export interface LoggerConfig {
  logDir: string;
  logFile: string;
}

export interface RagConfig {
  embedModel: string;
  /** SQLite database path for RAG document storage. */
  dbPath: string;
  /** Embedding vector dimension (must match embed model, e.g. 768 for nomic-embed-text). Used for sqlite-vss. */
  embeddingDimensions: number;
}

export interface ToolHostConfig {
  /** Directory allowed for shell tool file operations. Paths outside are rejected. */
  sandboxDir: string;
}

export interface CronConfig {
  dbPath: string;
}

export interface ModelRouterConfig {
  small: string;
  medium: string;
  large: string;
  /** Complexity level to use for initial planning phase */
  plannerComplexity: string;
}

export interface ExecutorConfig {
  /** Timeout for individual node execution in milliseconds. */
  nodeTimeoutMs: number;
}

export interface BrowserServiceConfig {
  /** Run browser in headless mode (default: true for production). */
  headless: boolean;
  /** Timeout for browser operations in milliseconds (default: 30000). */
  timeout: number;
  /** Enable stealth plugin to bypass bot detection (default: true). */
  enableStealth: boolean;
  /** Reuse browser context across requests (default: true). */
  reuseContext: boolean;
}

export interface ModelManagerConfig {
  /**
   * How long to keep a small model in memory after the last request.
   * Accepts an Ollama duration string (e.g. "5m") or a number of seconds.
   */
  smallModelKeepAlive: string | number;
  /**
   * How long to keep a medium model in memory after the last request.
   */
  mediumModelKeepAlive: string | number;
  /**
   * How long to keep a large model in memory after the last request.
   */
  largeModelKeepAlive: string | number;
  /**
   * Minimal prompt sent during warmup to ensure the model is loaded.
   */
  warmupPrompt: string;
}

export interface AppConfig {
  ollama: OllamaConfig;
  telegram: TelegramConfig;
  taskMemory: TaskMemoryConfig;
  logger: LoggerConfig;
  rag: RagConfig;
  toolHost: ToolHostConfig;
  cron: CronConfig;
  modelRouter: ModelRouterConfig;
  executor: ExecutorConfig;
  browserService: BrowserServiceConfig;
  modelManager: ModelManagerConfig;
}

const DEFAULT_CONFIG: AppConfig = {
  ollama: {
    baseUrl: "http://127.0.0.1:11434",
    timeoutMs: 600_000, // 10 minutes default
    retries: 2,
  },
  telegram: {
    botToken: "",
    allowedUserIds: "",
  },
  taskMemory: {
    dbPath: "data/tasks.sqlite",
  },
  logger: {
    logDir: "logs",
    logFile: "events.log",
  },
  rag: {
    embedModel: "nomic-embed-text",
    dbPath: "data/rag.sqlite",
    embeddingDimensions: 768,
  },
  toolHost: {
    sandboxDir: process.cwd(),
  },
  cron: {
    dbPath: "data/cron.sqlite",
  },
  modelRouter: {
    small: "llama3:8b",
    medium: "mistral",
    large: "mixtral",
    plannerComplexity: "medium",
  },
  executor: {
    nodeTimeoutMs: 600_000, // 10 minutes default
  },
  browserService: {
    headless: true,
    timeout: 30_000, // 30 seconds default
    enableStealth: true,
    reuseContext: true,
  },
  modelManager: {
    smallModelKeepAlive: "10m",
    mediumModelKeepAlive: "30m",
    largeModelKeepAlive: "60m",
    warmupPrompt: "hello",
  },
};

function loadConfigFile(): Partial<AppConfig> {
  const configPath =
    process.env.CONFIG_PATH ??
    join(process.cwd(), "config.json");
  if (!existsSync(configPath)) return {};
  try {
    const raw = readFileSync(configPath, "utf-8");
    return JSON.parse(raw) as Partial<AppConfig>;
  } catch {
    return {};
  }
}

function mergeEnv(config: AppConfig): AppConfig {
  return {
    ollama: {
      baseUrl: process.env.OLLAMA_BASE_URL ?? config.ollama.baseUrl,
      timeoutMs: Number(process.env.OLLAMA_TIMEOUT_MS) || config.ollama.timeoutMs,
      retries: Number(process.env.OLLAMA_RETRIES) || config.ollama.retries,
    },
    telegram: {
      botToken: process.env.TELEGRAM_BOT_TOKEN ?? config.telegram.botToken,
      allowedUserIds: process.env.TELEGRAM_ALLOWED_USER_IDS ?? config.telegram.allowedUserIds,
    },
    taskMemory: {
      dbPath: process.env.TASK_MEMORY_DB ?? config.taskMemory.dbPath,
    },
    logger: {
      logDir: process.env.LOG_DIR ?? config.logger.logDir,
      logFile: process.env.LOG_FILE ?? config.logger.logFile,
    },
    rag: {
      embedModel: process.env.RAG_EMBED_MODEL ?? config.rag.embedModel,
      dbPath: process.env.RAG_DB ?? config.rag.dbPath,
      embeddingDimensions: Number(process.env.RAG_EMBEDDING_DIMENSIONS) || config.rag.embeddingDimensions,
    },
    toolHost: {
      sandboxDir: process.env.TOOL_SANDBOX_DIR ?? config.toolHost.sandboxDir,
    },
    cron: {
      dbPath: process.env.CRON_DB ?? config.cron.dbPath,
    },
    modelRouter: {
      small: process.env.MODEL_ROUTER_SMALL ?? config.modelRouter.small,
      medium: process.env.MODEL_ROUTER_MEDIUM ?? config.modelRouter.medium,
      large: process.env.MODEL_ROUTER_LARGE ?? config.modelRouter.large,
      plannerComplexity: process.env.MODEL_ROUTER_PLANNER_COMPLEXITY ?? config.modelRouter.plannerComplexity,
    },
    executor: {
      nodeTimeoutMs: Number(process.env.EXECUTOR_NODE_TIMEOUT_MS) || config.executor.nodeTimeoutMs,
    },
    browserService: {
      headless: process.env.BROWSER_SERVICE_HEADLESS === "false" ? false : config.browserService.headless,
      timeout: Number(process.env.BROWSER_SERVICE_TIMEOUT) || config.browserService.timeout,
      enableStealth: process.env.BROWSER_SERVICE_ENABLE_STEALTH === "false" ? false : config.browserService.enableStealth,
      reuseContext: process.env.BROWSER_SERVICE_REUSE_CONTEXT === "false" ? false : config.browserService.reuseContext,
    },
    modelManager: {
      smallModelKeepAlive: process.env.MODEL_MANAGER_SMALL_KEEP_ALIVE ?? config.modelManager.smallModelKeepAlive,
      mediumModelKeepAlive: process.env.MODEL_MANAGER_MEDIUM_KEEP_ALIVE ?? config.modelManager.mediumModelKeepAlive,
      largeModelKeepAlive: process.env.MODEL_MANAGER_LARGE_KEEP_ALIVE ?? config.modelManager.largeModelKeepAlive,
      warmupPrompt: process.env.MODEL_MANAGER_WARMUP_PROMPT ?? config.modelManager.warmupPrompt,
    },
  };
}

function deepMerge<T extends object>(base: T, override: Partial<T>): T {
  const out = { ...base };
  for (const key of Object.keys(override) as (keyof T)[]) {
    const v = override[key];
    if (v === undefined) continue;
    if (typeof v === "object" && v !== null && !Array.isArray(v) && typeof base[key] === "object" && base[key] !== null) {
      (out as Record<string, unknown>)[key as string] = deepMerge(
        base[key] as object,
        v as Partial<typeof base[typeof key]>,
      );
    } else {
      (out as Record<string, unknown>)[key as string] = v;
    }
  }
  return out;
}

let cached: AppConfig | null = null;

/** Get app config. Config file is merged over defaults, then env overrides. */
export function getConfig(): AppConfig {
  if (cached) return cached;
  const fileConfig = loadConfigFile();
  const merged = deepMerge(DEFAULT_CONFIG, fileConfig);
  cached = mergeEnv(merged);
  return cached;
}

/** Reset cached config (e.g. for tests). */
export function resetConfig(): void {
  cached = null;
}
