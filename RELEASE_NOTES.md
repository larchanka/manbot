# Release Notes

## v1.0 — 2026-03-23

### 🆕 File Sharing via Telegram

The agent can now **send files directly to Telegram** chats. Skills and tools that generate or download files (reports, images, data exports, etc.) can deliver them straight to the user using the new `send_file` tool — no need to leave the conversation.

**How it works:**
- Any skill can call `send_file` with a local file path and an optional caption.
- The Telegram adapter auto-detects file type (photo, audio, video, document) based on extension.
- Works seamlessly from both the active skill loop and standalone tool nodes.

---

### 🛠 Simplified Skill Management

Skills no longer require a separate `CONFIG.md` registry. The system now uses **dynamic skill discovery** — it scans the `skills/` directory at runtime and reads metadata directly from each skill's `SKILL.md` file.

**New `/add_skill` command:**
- Install a new skill directly from Telegram: `/add_skill <URL_TO_SKILL_MD>`
- The skill is downloaded into a disabled folder (prefixed with `_`).
- Rename the folder to remove the underscore to activate it.

**What changed:**
- Removed the centralized `skills/CONFIG.md` file.
- Skill descriptions are now extracted from the first line of each `SKILL.md`.
- Disabled skills (folders starting with `_` or `.`) are automatically excluded.

---

### 📊 Enhanced Dashboard Task Lifecycle

The monitoring dashboard now visualizes the **full task lifecycle** with granular status tracking:

| Status | Description |
|---|---|
| **Pending** | Task is queued, waiting for execution slot |
| **Planning** | Planner agent is building the capability graph |
| **Running** | Executor is processing the DAG nodes |
| **Finalizing** | Critic agent is reviewing the output (if reflection is enabled) |
| **Completed** | Task finished successfully |
| **Failed** | Task encountered an error |

Previously only `Pending`, `Completed`, and `Failed` were shown.

---

### 🧹 Default Skills Cleanup

The built-in skills have been cleaned up and streamlined:

- **Weather** — Fetches live weather via `wttr.in` (no API key required).
- **Research** — Deep web research using `lynx` with recursive search loop.
- **Email** — Email management via CLI tools.
- **Calendar** — Calendar operations via CLI tools.
- **Reminder** — Natural language reminder scheduling.
- **Budget** — Budget tracking and analysis.

Removed duplicate and outdated skill definitions. Each skill now has a clear `SKILL.md` with a description line, usage instructions, and tool specifications.

---

### 🐛 Bug Fixes

- **Telegram command parsing**: Fixed `/new`, `/help`, and other commands not working when selected from the Telegram command menu (Telegram appends `@botname` suffix).
- **Skill HTML formatting**: Skills now correctly output Telegram-compatible HTML instead of falling back to Markdown. The HTML formatting instruction is injected into the most recent message position for better LLM adherence.
- **Database migrations**: Resolved SQLite migration issues for task memory and cron storage.
- **Test coverage**: Added CI test coverage reporting and fixed test suite to match updated task lifecycle logic.
