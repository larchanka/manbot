# 🧬 ManBot

A multi-process AI platform with type-safe IPC and capability-graph execution. Users interact via Telegram; the system plans tasks as DAGs, executes nodes (LLM, RAG, tools), and optionally revises output with a Critic agent.

> **Important:** This is **not** an AI chatbot. It is designed for **heavy tasks** that require time and substantial processing—planning, research, multi-step execution, tool use. It runs locally (Ollama) and performance depends on your machine's compute power; expect slower responses compared to cloud-based chat services.

## Features

- **Multi-agent pipeline**: Planner → Task Memory → Executor → Critic (optional revision loop)
- **Capability graph (DAG)**: Nodes for `generate_text`, `semantic_search`, `reflect`, `tool`; parallel execution where dependencies allow
- **Type-safe IPC**: JSONL over stdin/stdout with Zod-validated envelopes
- **Services**: Task Memory (SQLite, with `conversation_id` for session grouping), Logger, RAG (embeddings + SQLite; vector search via **sqlite-vss** when available, fallback to in-DB dot-product), Tool Host (**shell tool** for file operations and system commands, **enhanced http_get with browser fallback**, http_search), Cron Manager, Browser Service (Playwright with stealth capabilities)
- **Telegram adapter**: Commands `/start`, `/task`, `/new`, `/help`; session tracking and conversation archiving; optional allow-list of user IDs
- **Conversation archiving**: `/new` resets the session, summarizes the previous conversation via a dedicated summarizer prompt, and stores the summary in RAG for later retrieval
- **Reminder System**: Schedule one-time or recurring reminders via natural language; cron-based scheduling with Telegram delivery

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

Environment variables override `config.json`. Supported env vars:

- `CONFIG_PATH` — Path to config file (default: `./config.json`)
- `TELEGRAM_BOT_TOKEN`, `TELEGRAM_ALLOWED_USER_IDS`
- `OLLAMA_BASE_URL`, `OLLAMA_TIMEOUT_MS`, `OLLAMA_RETRIES`
- `TASK_MEMORY_DB`, `CRON_DB`, `LOG_DIR`, `LOG_FILE`
- `RAG_EMBED_MODEL`, `RAG_DB`, `RAG_EMBEDDING_DIMENSIONS`, `TOOL_SANDBOX_DIR`
- `MODEL_ROUTER_SMALL`, `MODEL_ROUTER_MEDIUM`, `MODEL_ROUTER_LARGE`
- `BROWSER_SERVICE_HEADLESS`, `BROWSER_SERVICE_TIMEOUT`, `BROWSER_SERVICE_ENABLE_STEALTH`, `BROWSER_SERVICE_REUSE_CONTEXT`

`config.json` is gitignored; do not commit secrets.

## Install

```bash
npm install
npm run build
```

### Browser Dependencies (for HTTP Get tool with browser fallback)

If you plan to use the enhanced HTTP Get tool with browser automation (for JavaScript-heavy sites or bot-protected pages), install Playwright browsers:

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

Other services (task-memory, logger, planner, executor, critic-agent, rag-service, tool-host, cron-manager) are normally started by the Orchestrator; run them manually only if you are wiring your own pipeline.

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

## Enhanced HTTP Get Tool

The `http_get` tool includes smart fallback to browser automation for handling JavaScript-heavy sites and bot-protected pages.

### Features

- **Smart Fallback**: Tries `fetch` API first (faster), automatically falls back to Playwright browser on 403/401 errors or when explicitly requested
- **Bot Detection Bypass**: Uses Playwright with stealth plugin to bypass common bot detection mechanisms
- **HTML to Markdown**: Automatically converts HTML responses to clean Markdown format (can be disabled)
- **Realistic Behavior**: Simulates human-like browsing with random delays, mouse movements, and scrolling

### Usage

The tool accepts these parameters:
- `url` (required): The URL to fetch
- `useBrowser` (optional): Force browser usage instead of fetch. Use for:
  - Single Page Applications (SPAs) requiring JavaScript execution
  - Sites with bot detection/anti-scraping protection
  - Pages that load content dynamically via JavaScript
- `convertToMarkdown` (optional, default: `true` for HTML): Convert HTML responses to Markdown

### Examples

```javascript
// Simple fetch (uses fetch API)
{ "tool": "http_get", "arguments": { "url": "https://example.com" } }

// Force browser for SPA
{ "tool": "http_get", "arguments": { "url": "https://spa.example.com", "useBrowser": true } }

// Keep HTML format
{ "tool": "http_get", "arguments": { "url": "https://example.com", "convertToMarkdown": false } }
```

### Performance

- **Fetch API**: Typically <1 second for most sites
- **Browser (Playwright)**: Typically 2-5 seconds, includes realistic delays and JavaScript execution
- Browser context reuse improves performance for multiple requests

### Configuration

Browser service settings can be configured in `config.json`:
- `browserService.headless`: Run in headless mode (default: `true`)
- `browserService.timeout`: Operation timeout in milliseconds (default: `30000`)
- `browserService.enableStealth`: Enable stealth plugin (default: `true`)
- `browserService.reuseContext`: Reuse browser context (default: `true`)

See [Troubleshooting](#troubleshooting) for common issues and debugging tips.

## Project layout

- **src/core/** — Core Orchestrator (process spawning, message routing, task pipeline)
- **src/agents/** — Planner, Executor, Critic; **prompts/** for system prompts (planner, critic, summarizer)
- **src/adapters/** — Telegram adapter
- **src/services/** — Task Memory, Logger, Ollama adapter, Model Router, Generator (generate_text + summarize), RAG (SQLite), Tool Host, Cron Manager
- **src/shared/** — Protocol (Zod schemas), BaseProcess, graph-utils, config
- **_docs/** — Architecture and protocol specs
- **_board/** — Task board and task specs

See **AI-Agent.md** for full folder/file structure and architecture. The agent users interact with is **🧬 ManBot**.

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
- Browser mode is slower than fetch (2-5s vs <1s)
- Use `useBrowser: true` only when necessary (SPAs, protected sites)
- Enable `browserService.reuseContext: true` to reuse browser instances

**Memory usage:**
- Browser instances consume ~100-200MB RAM
- Browser context reuse reduces memory overhead
- Close browser service when not needed for extended periods

For more details, see the browser service implementation in `src/services/browser-service.ts`.
