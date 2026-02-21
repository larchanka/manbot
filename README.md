# 🧬 ManBot

A multi-process AI platform with type-safe IPC and capability-graph execution. Users interact via Telegram; the system plans tasks as DAGs, executes nodes (LLM, RAG, tools), and optionally revises output with a Critic agent.

> **Important:** This is **not** an AI chatbot. It is designed for **heavy tasks** that require time and substantial processing—planning, research, multi-step execution, tool use. It runs locally (Ollama) and performance depends on your machine's compute power; expect slower responses compared to cloud-based chat services.

## Features

- **Multi-agent pipeline**: Planner → Task Memory → Executor → Critic (optional revision loop)
- **Capability graph (DAG)**: Nodes for `generate_text`, `semantic_search`, `reflect`, `tool`; parallel execution where dependencies allow
- **Type-safe IPC**: JSONL over stdin/stdout with Zod-validated envelopes
- **Conversation Memory**: Short-term memory (last 5 tasks) is injected into the Planner for immediate session context; `/new` resets the session and archives the conversation.
- **Session-Scoped RAG**: Memory searches are session-scoped by default to prevent context leakage after `/new`, with an optional `global` scope.
- **Telegram adapter**: Commands `/start`, `/task`, `/new`, `/help`; session tracking and conversation archiving; robust message delivery with automatic plain-text fallback.
- **Reminder System**: Schedule one-time or recurring reminders via natural language; cron-based scheduling with Telegram delivery
- **File Processing**: Upload photos, documents, voice notes, or audio files via Telegram. Images are OCR'd locally (Ollama vision model), audio is transcribed locally (Whisper), and text files are inlined or chunked into RAG — all without any cloud calls.
- **Monitoring Dashboard**: A Notion-style internal web dashboard for real-time tracking of tasks, system stats, and event logs.

## Requirements

- **Node.js** >= 20
- **Ollama** running locally (for LLM and embeddings)
- **Telegram Bot Token** (from [@BotFather](https://t.me/BotFather)) if using the Telegram adapter

### Ollama models (recommended)

- Small: `llama3:8b`
- Medium: `mistral`
- Large: `mixtral`
- Embeddings: `nomic-embed-text` (for RAG)

Install and run Ollama, then pull the models you need:

```bash
ollama pull nomic-embed-text
ollama pull mistral
```

## Configuration

1. Copy the example config and edit:

   ```bash
   cp config.json.example config.json
   ```

2. Edit `config.json` with your settings. Important keys:
   - **telegram.botToken** — Telegram bot API token (required for Telegram adapter)
   - **telegram.allowedUserIds** — Comma-separated Telegram user IDs; leave empty to allow all
   - **ollama.baseUrl** — Ollama API URL (default `http://127.0.0.1:11434`)
   - **rag.embedModel** — Embedding model for RAG (default `nomic-embed-text`)
   - **rag.dbPath** — SQLite path for RAG document storage (default `data/rag.sqlite`)
   - **rag.embeddingDimensions** — Vector dimension for sqlite-vss (default 768 for nomic-embed-text)
   - **modelRouter** — Ollama model names for small/medium/large
   - **toolHost.sandboxDir** — Directory allowed for shell tool file operations (default: cwd)
   - **browserService.headless** — Run browser in headless mode (default: `true`)
   - **browserService.timeout** — Browser operation timeout in milliseconds (default: `30000`)
   - **browserService.enableStealth** — Enable stealth plugin for bot detection bypass (default: `true`)
   - **browserService.reuseContext** — Reuse browser context across requests (default: `true`)
   - **browserService.userDataDir** — Directory to store browser user data (persistent cookies, logins, etc.; default: `undefined`)
   - **modelManager.smallModelKeepAlive** — Keep-alive for small model (default: `"10m"`, Ollama duration string or seconds)
   - **modelManager.mediumModelKeepAlive** — Keep-alive for medium model (default: `"30m"`)
   - **modelManager.largeModelKeepAlive** — Keep-alive for large model after on-demand use (default: `"60m"`)
   - **modelManager.warmupPrompt** — Minimal prompt sent during warmup (default: `"hello"`)
   - **whisper.modelName** — Whisper model for transcription (default: `"base.en"`; downloaded on first use)
   - **whisper.language** — Transcription language, `"auto"` for auto-detect (default: `"auto"`)
   - **fileProcessor.uploadDir** — Temp directory for uploaded files (default: `"data/uploads"`)
   - **fileProcessor.maxFileSizeBytes** — Max upload size allowed (default: `52428800` = 50 MB)
   - **fileProcessor.textMaxInlineChars** — Files shorter than this are inlined in the goal (default: `8000`)
   - **fileProcessor.ocrModel** — Ollama vision model for image OCR (default: `"glm-ocr:q8_0"`)
   - **fileProcessor.ocrEnabled** — Enable/disable image OCR (default: `true`)

Environment variables override `config.json`. Supported env vars:

- `CONFIG_PATH` — Path to config file (default: `./config.json`)
- `TELEGRAM_BOT_TOKEN`, `TELEGRAM_ALLOWED_USER_IDS`
- `OLLAMA_BASE_URL`, `OLLAMA_TIMEOUT_MS`, `OLLAMA_RETRIES`
- `TASK_MEMORY_DB`, `CRON_DB`, `LOG_DIR`, `LOG_FILE`
- `RAG_EMBED_MODEL`, `RAG_DB`, `RAG_EMBEDDING_DIMENSIONS`, `TOOL_SANDBOX_DIR`
- `MODEL_ROUTER_SMALL`, `MODEL_ROUTER_MEDIUM`, `MODEL_ROUTER_LARGE`
- `BROWSER_SERVICE_HEADLESS`, `BROWSER_SERVICE_TIMEOUT`, `BROWSER_SERVICE_ENABLE_STEALTH`, `BROWSER_SERVICE_REUSE_CONTEXT`, `BROWSER_SERVICE_USER_DATA_DIR`
- `MODEL_MANAGER_SMALL_KEEP_ALIVE`, `MODEL_MANAGER_MEDIUM_KEEP_ALIVE`, `MODEL_MANAGER_LARGE_KEEP_ALIVE`, `MODEL_MANAGER_WARMUP_PROMPT`
- `WHISPER_MODEL_NAME`, `WHISPER_LANGUAGE`, `WHISPER_MODEL_DIR`
- `FILE_PROCESSOR_UPLOAD_DIR`, `FILE_PROCESSOR_MAX_FILE_SIZE_BYTES`, `FILE_PROCESSOR_TEXT_MAX_INLINE_CHARS`, `FILE_PROCESSOR_OCR_MODEL`, `FILE_PROCESSOR_OCR_ENABLED`

`config.json` is gitignored; do not commit secrets.

## Install

```bash
npm install
npm run build
```

### Browser Dependencies (for HTTP Get tool)

Since the `http_get` tool uses browser automation (for all sites, including JavaScript-heavy or bot-protected pages), you must install Playwright browsers:

```bash
npx playwright install chromium
```

This downloads Chromium (~250MB) to enable browser-based web scraping with stealth capabilities.

## Run

### Full pipeline (Orchestrator + all agents and services)

Runs all processes under the Core Orchestrator; Telegram adapter receives messages and tasks flow through Planner → Task Memory → Executor → Telegram.

```bash
npm run start:orchestrator
```

For development (TypeScript without pre-build):

```bash
npm run dev:orchestrator
```

Ensure `config.json` has a valid **telegram.botToken** and Ollama is running.

### Standalone services (for testing or custom setups)

- **Telegram adapter only**: `npm run start:telegram` or `npm run dev:telegram`
- **Generator (model-router)**: `npm run start:generator`

<img alt="Telegram Screenshot" src="_images/telegram-chat.png" width="300" />

Other services (task-memory, logger, planner, executor, critic-agent, rag-service, tool-host, cron-manager) are normally started by the Orchestrator; run them manually only if you are wiring your own pipeline.

![Terminal Screenshot](_images/terminal-run.jpg)

## Tests

```bash
npm test
```

The suite includes unit tests for Task Memory, RAG Store, graph utils, browser service, and HTTP Get tool, plus an integration test for the conversation archiving flow (`src/__tests__/archiving.test.ts`).

## Reminder System

The bot supports scheduling reminders using natural language:

### One-time Reminders
- "Remind me in 5 minutes to check the oven"
- "Remind me tomorrow at 3pm to call John"
- "Remind me next Monday at 9am about the meeting"

### Recurring Reminders
- "Remind me every day at 9am to take vitamins"
- "Remind me every Monday at 10am about the team meeting"
- "Remind me every week to review the budget"

### Managing Reminders
- List active reminders: `/reminders`
- Cancel a reminder: `/cancel_reminder <id>`

The system uses LLM-powered time parsing to convert natural language expressions into cron expressions, which are then scheduled via the Cron Manager service. When a reminder fires, the bot sends a message back to the user via Telegram.

### Message Reliability
The Telegram adapter includes a robust delivery system:
- **Automatic Escaping**: Handles MarkdownV2 special characters.
- **Plain-text Fallback**: If a formatted message fails to send (due to complex entities), the adapter automatically retries as plain text to ensure the user always receives the information.

## HTTP Get Tool (Browser-based)

The `http_get` tool uses Playwright browser automation for handling all websites, including JavaScript-heavy sites and bot-protected pages.

### Features

- **Full Rendering**: Uses Playwright to render pages, supporting Single Page Applications (SPAs) and dynamic content
- **Bot Detection Bypass**: Uses Playwright with stealth plugin to bypass common bot detection mechanisms
- **HTML to Markdown**: Automatically converts HTML responses to clean Markdown format (can be disabled)
- **Realistic Behavior**: Simulates human-like browsing with random delays, mouse movements, and scrolling

### Usage

The tool accepts these parameters:
- `url` (required): The URL to fetch
- `convertToMarkdown` (optional, default: `true` for HTML): Convert HTML responses to Markdown

### Examples

```javascript
// Fetch URL (uses browser)
{ "tool": "http_get", "arguments": { "url": "https://example.com" } }

// Keep HTML format
{ "tool": "http_get", "arguments": { "url": "https://example.com", "convertToMarkdown": false } }
```

### Performance

- **Browser-based**: Typically 2-5 seconds, includes realistic delays and JavaScript execution
- Browser context reuse improves performance for multiple requests

### Configuration

Browser service settings can be configured in `config.json`:
- `browserService.headless`: Run in headless mode (default: `true`)
- `browserService.timeout`: Operation timeout in milliseconds (default: `30000`)
- `browserService.enableStealth`: Enable stealth plugin (default: `true`)
- `browserService.reuseContext`: Reuse browser context (default: `true`)

See [Troubleshooting](#troubleshooting) for common issues and debugging tips.

## Model Management

The system includes a `ModelManagerService` that manages Ollama model lifecycles:

- **Startup prewarming**: On startup, the Orchestrator pre-warms the **small** and **medium** models sequentially, so the first request is served without cold-start delay.
- **On-demand loading**: The **large** model is loaded on demand when needed for a task.
- **Keep-alive control**: Each tier has a configurable keep-alive duration (Ollama removes a model from VRAM after it has been idle for the configured time).
- **Concurrency safety**: Concurrent warmup requests for the same model are deduplicated — only one `/api/chat` call is made regardless of how many parallel requests arrive.

### Keep-alive defaults

| Tier   | Default keep-alive | Behavior |
|--------|--------------------|----------|
| small  | `10m`              | Stays loaded for 10 minutes after last use |
| medium | `30m`              | Stays loaded for 30 minutes after last use |
| large  | `60m`              | Stays loaded for 60 minutes after last use |

Set keep-alive to `-1` (the number) to keep a model loaded indefinitely until Ollama is restarted.

### Monitoring model state

```bash
# Check which models are currently loaded in VRAM
ollama ps
```

The prewarming start and completion are logged by the Orchestrator (`core` prefix in logs).

## Monitoring Dashboard

ManBot includes a real-time internal monitoring dashboard with a clean, Notion-inspired design.

### Features
- **Task Analytics**: Distribution of task statuses (Completed, Failed, Pending) and complexity levels.
- **System Memory**: Real-time document count in RAG and active cron schedules.
- **Live Event Pipeline**: A feed of the most recent intelligence events from the log file.
- **System Theme Support**: Automatically switches between light and dark modes based on your OS settings.

### Access
The dashboard is automatically started by the Orchestrator and is available at:
**`http://localhost:3001`**

![Dashboard Screenshot](_images/dashboard-1.png)

![Dashboard Screenshot](_images/dashboard-2.png)

You can configure the port using the `DASHBOARD_PORT` environment variable or by editing `config.json` (planned).

<p align="center">
  <i>The dashboard outputs its own lifecycle events to the central logger, visible in <code>logs/events.log</code>.</i>
</p>

## Project layout

- **src/core/** — Core Orchestrator (process spawning, message routing, task pipeline, file ingest)
- **src/agents/** — Planner, Executor, Critic; **prompts/** for system prompts (planner, critic, summarizer)
- **src/adapters/** — Telegram adapter (including file detection and download)
- **src/services/** — Task Memory, Logger, Ollama adapter (with vision), Model Router, Generator, RAG (SQLite), Tool Host, Cron Manager, Dashboard Service, **File Processor**
- **src/utils/** — Console logger, audio-converter (ffmpeg-static), whisper-transcriber (nodejs-whisper)
- **src/shared/** — Protocol (Zod schemas), BaseProcess, graph-utils, config, **file-protocol**
- **_docs/** — Architecture and protocol specs
- **_board/** — Task board and task specs

See **AI-Agent.md** for full folder/file structure and architecture. The agent users interact with is **🧬 ManBot**.

## File Processing

ManBot can process file attachments sent directly in Telegram — no cloud services required, all processing runs locally.

### Supported Types

| Type | Telegram attachment | Processing |
|---|---|---|
| **Text** | Any document (`.txt`, `.md`, `.json`, `.pdf`, etc.) | Content read directly; short files inlined into goal, long files chunked + summarised + indexed in RAG |
| **Image** | Photo or image document | OCR/description via Ollama vision model (`glm-ocr:q8_0`) |
| **Voice / Audio** | Voice message or audio file | Converted to WAV (ffmpeg-static) → transcribed (OpenAI Whisper, local) |
| **Video** | Video or video note | ⚠️ Not supported yet |

### How it works

1. Send any supported file to the bot, optionally with a caption as your instruction
2. The bot downloads the file locally to `data/uploads/`
3. Processing runs in the dedicated `file-processor` subprocess:
   - Images → `OllamaAdapter.chatWithImage()` with the configured OCR model
   - Audio → `convertToWav()` (ffmpeg-static) → `transcribeAudio()` (Whisper `base.en` by default)
   - Text → `readFile()`, check length against `textMaxInlineChars`
4. Extracted content is injected into the planner goal as structured context
5. Long text files are chunked, each chunk summarised, and summaries stored in RAG for semantic retrieval
6. The original file is deleted from disk after processing

### First-use note for audio
The Whisper model (~75 MB for `base.en`) is automatically downloaded on first voice/audio transcription. Retry if the first request fails — the model downloads in the background.

### Requirements for image OCR
Pull the vision model from Ollama before use:
```bash
ollama pull glm-ocr:q8_0
```

## Troubleshooting

### Browser Service Issues

**Browser fails to launch:**
- Ensure Chromium is installed: `npx playwright install chromium`
- Check disk space (browser binaries are ~250MB)
- Verify Node.js version >= 20

**Timeout errors:**
- Increase `browserService.timeout` in config.json (default: 30000ms)
- Some sites may require longer timeouts for JavaScript-heavy pages

**Bot detection still triggered:**
- The stealth plugin helps but cannot bypass all detection systems
- Sites with CAPTCHA cannot be automatically bypassed
- Try increasing delays or using different user agents (configured automatically)

**Debugging browser issues:**
- Set `browserService.headless: false` in config.json to see browser window
- Check browser console logs for JavaScript errors
- Verify network connectivity and DNS resolution

**Performance issues:**
- Browser-based scraping is slower than raw fetch (2-5s vs <1s)
- Enable `browserService.reuseContext: true` to reuse browser instances

**Memory usage:**
- Browser instances consume ~100-200MB RAM
- Browser context reuse reduces memory overhead
- Close browser service when not needed for extended periods

For more details, see the browser service implementation in `src/services/browser-service.ts`.
