# Task: P1-02 Define shared Zod schemas

## Description
Define the core message protocol using Zod to ensure type-safe IPC communication between all system processes.

## Requirements
- Create `src/shared/protocol.ts`.
- Define `Envelope` schema matching the MESSAGE PROTOCOL SPEC.
- Define schemas for common message types: `Request`, `Response`, `Error`, `Event`.
- Export TypeScript types inferred from Zod schemas.

## Definition of Done
- `protocol.ts` exists and exports the required schemas and types.
- Zod validation successfully parses a sample message matching the spec.
