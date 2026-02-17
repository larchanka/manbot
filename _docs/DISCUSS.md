# Missing Information / Open Decisions

## 1. Reflection Strategy
- Single pass or iterative?
- Use larger model or same model?

---

## 2. Task Retention Policy
- Persist forever?
- TTL?
- Manual promotion?

---

## 3. Model Selection Strategy
- Static routing?
- Heuristic based?
- Token-based estimation?

---

## 4. Parallel Execution
- Allow DAG parallel nodes?
- Limit concurrency?

---

## 5. Resource Limits
- Max memory per agent?
- Max tokens?
- Timeout policy?

---

## 6. Tool Security
- Filesystem sandbox?
- Network restrictions?
- Rate limits?

---

## 7. Monitoring
- Web dashboard required?
- Metrics to expose?
- Token tracking per user?

---

## 8. Backup Strategy
- Snapshot SQLite (task memory, RAG, cron)?
- Log rotation policy?

---

## 9. Skill System
- Metadata schema?
- Versioning?
- Auto-embedding skills?

---

## 10. Failure Recovery
- Retry policy?
- Task rollback?
- Crash auto-restart?

---

## 11. Scaling Strategy
- Single machine only?
- Multi-process across machines?

---

## 12. Cost Tracking
- Token usage per task?
- Per user?
- Per model?

---

## 13. Testing Strategy
- Unit test per service?
- Integration tests for execution graphs?
- Simulated model responses?

---

