# Task: P4-03 Implement RAG Service

## Description
Implement a Retrieval-Augmented Generation (RAG) service using the FAISS vector database to provide the system with long-term semantic memory and document access.

## Requirements
- Create `src/services/rag-service.ts`.
- Use FAISS (via node bindings or a Python microservice with a bridge).
- Implement methods:
  - `addDocument(content, metadata)`: Embeds and stores a document.
  - `search(query, limit)`: Returns relevant snippets based on semantic similarity.
- Use a dedicated embedding model (e.g., `nomic-embed-text`) via the Ollama Adapter.

## Definition of Done
- RAG Service can index text and retrieve relevant matches for a given query.
- Search performance is consistent with the local system requirements.
