# Task: P4-04 Semantic Search Node

## Description
Create a new node type in the capability graph that allows the Executor to invoke the RAG service for retrieving context.

## Requirements
- Implement the `semantic_search` node handler in the Executor.
- Connect the node to the `RAG Service` message protocol types.
- Ensure the retrieved context is format-ready for subsequent `generate_text` nodes.

## Definition of Done
- The Planner can successfully include a `semantic_search` node in a DAG.
- The Executor correctly retrieves and passes context from the RAG service to other nodes.
