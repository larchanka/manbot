# AI Runtime Platform (Local Multi-Agent System)

## Overview

This project is a local-first, multi-agent AI runtime built with Node.js and TypeScript.  
It is designed as a modular, process-oriented architecture where each capability runs independently and communicates via structured JSON over stdin/stdout.

The system operates as a clean, deterministic AI execution engine rather than a simple chatbot.

It supports:

- Multi-agent cognitive architecture
- Capability-based execution planning
- Task-level isolated memory
- Layered memory system
- Local LLM inference via Ollama
- RAG via FAISS
- Structured persistence via SQLite
- Tool execution via MCP-compatible tool host
- Telegram interface
- Cron-based background jobs
- Advanced structured logging
- Markdown-based skill injection

The system is designed for powerful personal use, with extensibility toward a future distributed runtime platform.

---

## Goals

1. Local-first AI system (no cloud dependency required)
2. Clean multi-agent separation of cognitive roles
3. Deterministic execution flows
4. Strong observability and auditability
5. Independent process isolation
6. Extensible architecture
7. Pluggable memory layers
8. Future web monitoring capability

---

## Core Cognitive Model

The runtime uses a structured multi-agent model:

- Planner Agent (strategic reasoning)
- Executor Agent (operational execution)
- Critic Agent (self-reflection and validation)
- Capability Graph Engine (dynamic service selection)

All agents operate independently and communicate via structured protocol.

---

## Memory Philosophy

Memory is layered:

1. Short-Term Conversation Memory
2. Task Memory (isolated per execution)
3. Semantic Memory (vector via FAISS)
4. Structured Memory (SQLite)
5. Long-Term Knowledge (RAG indexed documents)

Each memory layer has a clearly defined purpose and scope.

---

## Execution Philosophy

Every user interaction becomes a task:

- Task created
- Execution plan generated
- Plan executed step-by-step
- Reflection applied
- Memory updated
- Logged permanently

Tasks are isolated from conversation memory.

---

## Long-Term Vision

This project may evolve into:

- A local AI operating system
- A workflow automation engine
- A distributed multi-agent platform
- A monitored AI runtime with web dashboard

