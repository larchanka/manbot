# Task: P6-06 End-to-End Archiving Integration Test

## Description
Write an integration test that verifies the full conversation archiving flow.

## Requirements
- Mock Lemonade for the summarization step.
- Verify that `chat.new` triggers task history retrieval.
- Verify that the summary is correctly inserted into the `RAGService`.
- Verify that the SQLite database contains the expected archived record.

## Definition of Done
- A new test file `src/__tests__/archiving.test.ts` (or similar) passes.
- Test covers the sequence from command receipt to RAG storage.
