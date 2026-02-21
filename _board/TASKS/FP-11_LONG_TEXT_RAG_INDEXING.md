# FP-11: Long Text Chunking, Summarization, and RAG Indexing

**File**: `src/core/orchestrator.ts` (new private method) or `src/utils/text-chunker.ts`
**Dependencies**: FP-10, existing `rag-service`
**Phase**: 4 — Telegram Integration

## Description
Implement the long-text processing pipeline that is triggered by the Orchestrator when a `file-processor` returns `type: 'text_long'`. The pipeline chunks the text, summarizes each chunk using the medium Ollama model, and inserts the summaries into RAG with file metadata. Returns a short reference string for the planner prompt.

## Acceptance Criteria
- Chunking function: `chunkText(text: string, chunkSize = 2000, overlap = 200): string[]`
  - Splits text into overlapping chunks at sentence/paragraph boundaries when possible
  - Each chunk is at most `chunkSize` characters
  - Adjacent chunks share `overlap` characters for context continuity
- For each chunk: dispatch `node.execute` to `model-router` with:
  - `type: 'generate_text'`
  - `system_prompt: "summarizer"` (or a dedicated file-summary system prompt)
  - `prompt: "Summarize this section of a document concisely, preserving all key facts, numbers, and structure:\n\n{chunk}"`
- Collect all chunk summaries
- Insert each summary into RAG via `memory.semantic.insert` to `rag-service`:
  - `content`: the chunk summary
  - `metadata`: `{ source: 'file', fileName, conversationId, uploadedAt: Date.now(), chunkIndex }`
- Return a string: `"File '{fileName}' has been indexed ({N} sections). Use semantic search to retrieve relevant content."`

## Implementation Notes
- Chunk summaries can be processed in parallel — use `Promise.all` with a concurrency limit of 3
- If any chunk summarization fails, log a warning but continue with the rest
- The returned reference string is what gets injected into the planner's `enrichedGoal`
- This is an Orchestrator method — it uses `sendAndWait()` to call model-router and rag-service, consistent with the existing pattern in `runArchivingPipeline()`
