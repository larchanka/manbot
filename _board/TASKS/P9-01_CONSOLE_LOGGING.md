# Task: P9-01 Proper Terminal Logging with Colorization

## Description
Implement a proper terminal logging system for the AI Agent platform with structured formatting, timestamps, log levels, and colorization. This provides visibility into IPC communication, system events, and child process output for debugging and monitoring.

## Requirements
- Install `@larchanka/colors-js` dependency.
- Create `src/utils/console-logger.ts` for structured terminal logging with:
  - Timestamps (ISO format or relative)
  - Log levels (INFO, DEBUG, WARN, ERROR)
  - Process name colorization (e.g., core=blue, telegram=magenta, planner=yellow, executor=green)
  - Message formatting for IPC envelopes (from → to, type, correlationId)
  - Error highlighting in red
- Update `Orchestrator` to use console-logger for:
  - All routed IPC envelopes (request/response/error/event)
  - Child process stderr output (with proper formatting)
  - Process lifecycle events (spawn, exit, errors)
  - Replace raw `process.stderr.write()` calls with structured logging
- Capture and display non-JSON output from child processes with proper formatting.
- Optionally update `LoggerService` to output to console in addition to file logging.

## Definition of Done
- All IPC messages are visible in the console with structured formatting (timestamp, level, process colors).
- Error messages are highlighted in red and include stack traces when available.
- Child process stderr output is properly formatted with process names and timestamps.
- Running `npm run dev:orchestrator` shows clear, readable activity logs with proper structure.
- Logging is consistent across all orchestrator output (IPC, errors, process events).
