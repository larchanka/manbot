# Task: P7-01 RAG Vector Search with sqlite-vss

## Description
Use the sqlite-vss extension for scalable vector similarity search in the RAG service, with a fallback to the current in-DB dot-product search when the extension is unavailable (e.g. unsupported platform).

## Requirements
- Add `sqlite-vss` as a dependency (optional/peer if needed for platform support).
- Load the sqlite-vss extension when opening the RAG database; create a `vss0` virtual table for embeddings (dimension from config, default 768 for nomic-embed-text).
- Keep the existing `rag_documents` table (id, content, metadata, embedding BLOB) for compatibility and fallback.
- On insert: insert into `rag_documents`, then insert the same embedding into the vss virtual table (using `rag_documents` rowid for JOINs).
- On search: use `vss_search()` when the extension is loaded; return rowids and distance, JOIN to `rag_documents` for content/metadata; map distance to a score (e.g. 1/(1+distance) for L2). When the extension is not available, use the current full-scan dot-product search.
- Add config `rag.embeddingDimensions` (default 768) and document it.

## Definition of Done
- RAG search uses sqlite-vss KNN when the extension loads successfully.
- Fallback to in-DB dot-product search works when sqlite-vss is unavailable.
- Existing unit and integration tests pass; add or adjust tests as needed for both code paths.
- Documentation (README, TECH, COMPONENTS, etc.) updated to describe sqlite-vss and fallback.
