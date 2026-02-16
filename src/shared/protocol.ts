/**
 * Message protocol schemas for type-safe IPC.
 * Matches _docs/MESSAGE PROTOCOL SPEC.md
 */

import { z } from "zod";

const VERSION = "1.0" as const;

// --- Envelope (base) ---

export const envelopeSchema = z.object({
  id: z.string().uuid(),
  correlationId: z.string().uuid().optional(),
  timestamp: z.number(),
  from: z.string(),
  to: z.string(),
  type: z.string(),
  version: z.literal(VERSION),
  payload: z.unknown(),
});

export type Envelope<T = unknown> = z.infer<typeof envelopeSchema> & { payload: T };

// --- Request (any type, payload optional) ---

export const requestSchema = envelopeSchema;
export type Request<T = unknown> = Envelope<T>;

// --- Response ---

export const responsePayloadSchema = z.object({
  status: z.enum(["success", "error"]),
  result: z.unknown(),
});

export const responseSchema = envelopeSchema.extend({
  type: z.literal("response"),
  payload: responsePayloadSchema,
});

export type ResponsePayload = z.infer<typeof responsePayloadSchema>;
export type Response = z.infer<typeof responseSchema>;

// --- Error ---

export const errorPayloadSchema = z.object({
  code: z.string(),
  message: z.string(),
  details: z.record(z.unknown()).optional(),
});

export const errorSchema = envelopeSchema.extend({
  type: z.literal("error"),
  payload: errorPayloadSchema,
});

export type ErrorPayload = z.infer<typeof errorPayloadSchema>;
export type ErrorMessage = z.infer<typeof errorSchema>;

// --- Event (fire-and-forget, type starts with "event.") ---

export const eventSchema = envelopeSchema.extend({
  type: z.string().refine((t) => t.startsWith("event."), {
    message: "Event type must start with 'event.'",
  }),
});

export type Event<T = unknown> = z.infer<typeof eventSchema> & { payload: T };

// --- Helpers ---

export const PROTOCOL_VERSION = VERSION;

/** Parse and validate a single envelope (e.g. from a JSONL line). */
export function parseEnvelope(line: string): Envelope {
  const data = JSON.parse(line) as unknown;
  return envelopeSchema.parse(data) as Envelope;
}

/** Parse as response; throws if not a valid response. */
export function parseResponse(line: string): Response {
  const data = JSON.parse(line) as unknown;
  return responseSchema.parse(data);
}

/** Parse as error message; throws if not a valid error. */
export function parseError(line: string): ErrorMessage {
  const data = JSON.parse(line) as unknown;
  return errorSchema.parse(data);
}

/** Parse as event; throws if not a valid event. */
export function parseEvent(line: string): Event {
  const data = JSON.parse(line) as unknown;
  return eventSchema.parse(data) as Event;
}
