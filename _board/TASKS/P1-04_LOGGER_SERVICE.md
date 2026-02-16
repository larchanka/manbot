# Task: P1-04 Implement Logger Service

## Description
Create a dedicated logging service process that subscribes to system-wide events and persists them to files in a structured format.

## Requirements
- Create `src/services/logger-service.ts`.
- Use `pino` for low-overhead JSON logging.
- Implement file rotation or append to a log file.
- Listen for `event.*` type messages on stdin.
- Log both the message payload and metadata (from, type, timestamp).

## Definition of Done
- Logger service process stays alive and writes to a log file when receiving events.
- Log entries match the expected structured format.
