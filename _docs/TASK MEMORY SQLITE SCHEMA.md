# TASK MEMORY SQLITE SCHEMA

## Tables Overview

```
tasks
task_nodes
task_edges
task_node_results
task_reflections
task_events
```

---

## tasks

```
CREATE TABLE tasks (
  id TEXT PRIMARY KEY,
  user_id TEXT,
  conversation_id TEXT,
  goal TEXT NOT NULL,
  status TEXT CHECK(status IN ('pending','running','completed','failed')),
  complexity TEXT,
  created_at INTEGER NOT NULL,
  updated_at INTEGER NOT NULL,
  metadata JSON
);
```

---

## task_nodes

```
CREATE TABLE task_nodes (
  id TEXT PRIMARY KEY,
  task_id TEXT NOT NULL,
  type TEXT NOT NULL,
  service TEXT NOT NULL,
  status TEXT CHECK(status IN ('pending','running','completed','failed')),
  input JSON,
  output JSON,
  started_at INTEGER,
  completed_at INTEGER,
  retry_count INTEGER DEFAULT 0,
  FOREIGN KEY(task_id) REFERENCES tasks(id)
);
```

---

## task_edges

```
CREATE TABLE task_edges (
  id TEXT PRIMARY KEY,
  task_id TEXT NOT NULL,
  from_node TEXT NOT NULL,
  to_node TEXT NOT NULL,
  FOREIGN KEY(task_id) REFERENCES tasks(id)
);
```

---

## task_node_results

```
CREATE TABLE task_node_results (
  id TEXT PRIMARY KEY,
  node_id TEXT NOT NULL,
  result JSON,
  FOREIGN KEY(node_id) REFERENCES task_nodes(id)
);
```

---

## task_reflections

```
CREATE TABLE task_reflections (
  id TEXT PRIMARY KEY,
  task_id TEXT NOT NULL,
  node_id TEXT,
  critic_feedback TEXT,
  decision TEXT CHECK(decision IN ('PASS','REVISE')),
  created_at INTEGER,
  FOREIGN KEY(task_id) REFERENCES tasks(id)
);
```

---

## task_events

```
CREATE TABLE task_events (
  id TEXT PRIMARY KEY,
  task_id TEXT NOT NULL,
  event_type TEXT,
  payload JSON,
  timestamp INTEGER
);
```