Description: PRIMARY SEARCH. Use for deep research, fact-checking, or when external/up-to-date information is required. The agent MUST decide the best tool: use existing tools when sufficient, or escalate to lynx for deep, recursive, multi-step research. The agent is expected to pursue **maximum completeness** and continue researching until the task is fully resolved.

# Research Skill

Flexible, **depth-first web research system** using:
- Existing tools (search APIs, structured tools, integrations)
- OR the text-based browser `lynx` for deep/manual exploration

---

## Core Principle

**DO NOT default to lynx.**  
**DO NOT stop early.**

You must:
1. Choose the simplest tool that can work
2. Escalate if needed
3. Continue researching until:
   - The question is fully answered
   - No major unknowns remain
   - Additional search provides diminishing returns

---

## Termination Rule (CRITICAL)

You MUST continue research in a loop until ALL conditions are met:

- ✅ The user’s question is fully answered  
- ✅ Key subtopics are covered  
- ✅ Conflicting information (if any) is resolved  
- ✅ You are confident no major gaps remain  

If NOT:  
→ Generate new queries and continue  

This creates an **effectively unbounded research loop** (within system limits).

---

## Tool Selection Logic (CRITICAL)

### 1. Use EXISTING TOOLS when:

- Answer can be obtained in **1–2 steps**
- Data is already structured
- Snippets are sufficient

---

### 2. Use LYNX when:

- You need **multi-step exploration**
- You must open and analyze pages
- Information is fragmented
- You need comparisons or synthesis
- Existing tools are insufficient

---

### 3. Hybrid Strategy (RECOMMENDED)

1. Start with existing tools → fast overview  
2. Identify gaps  
3. Use lynx → deep dive  
4. Repeat until complete  

---

## Deep Research Strategy (MANDATORY LOOP)

### Phase 1 — Planning

- Break the task into subtopics  
- Generate **diverse search queries**  
- Cover perspectives:
  - technical  
  - practical  
  - recent updates  
  - comparisons  

---

### Phase 2 — Search

Use:

```bash
lynx -dump "https://html.duckduckgo.com/html?q=YOUR+QUERY"
```

- Execute queries one by one  
- Use multiple variations  

---

### Phase 3 — Source Selection

- Identify **2–10 high-value links**  
- Prioritize:
  - authoritative sources  
  - recent content  
  - technical depth  

---

### Phase 4 — Browsing

```bash
lynx -dump "https://example.com"
```

- Open selected links  
- Extract only relevant content  

---

### Phase 5 — Extraction & Synthesis

- Extract key facts  
- Group insights by topic  
- Detect:
  - missing info  
  - contradictions  
  - shallow areas  

---

### Phase 6 — Gap Detection (CRITICAL)

Ask yourself:

- What is still unclear?  
- What is missing?  
- What needs validation?  

➡️ Generate NEW queries  

---

### Phase 7 — Recursive Loop

Repeat:

1. New queries  
2. New sources  
3. Deeper insights  

Continue until **Termination Rule is satisfied**

---

### Phase 8 — Final Synthesis

- Structure answer clearly  
- Provide:
  - key insights  
  - comparisons  
  - conclusions  

---

## Navigation Rules

### Links

- Use **References section**  
- `[1], [2], ...` map to URLs  

---

### Redirect Handling (MANDATORY)

If you see:

```text
REFRESH(0 sec):
[1]https://actual-site.com
```

➡️ You MUST follow `[1]`

---

## Depth Enforcement Rules

You MUST:

- Avoid stopping after first results  
- Use **multiple queries minimum**  
- Explore **multiple sources**  
- Cross-check important facts  
- Prefer **depth over speed**  

---

## Anti-Patterns (STRICTLY FORBIDDEN)

❌ One search → immediate answer  
❌ Only using snippets when depth is required  
❌ Ignoring contradictions  
❌ Skipping planning  
❌ Not iterating on gaps  

---

## Heuristics for “More Research Needed”

Continue researching if:

- Answer feels shallow  
- Only one source used  
- No comparison available  
- Missing recent data  
- Unverified claims exist  

---

## Efficiency Rules

- Be deep, but not wasteful  
- Avoid redundant browsing  
- Prefer high-signal sources  
- Stop only when confident  

---

## Example Workflow (Deep)

User: "State of RISC-V ecosystem"

1. Plan:
   - hardware  
   - software  
   - adoption  
   - benchmarks  

2. Search:
```bash id="8n0fjf"
lynx -dump "https://html.duckduckgo.com/html?q=RISC-V+ecosystem+2025"
```

3. Browse top links  

4. Detect gaps:
   - missing benchmarks  

5. New search:
```bash id="dm73x0"
lynx -dump "https://html.duckduckgo.com/html?q=RISC-V+benchmarks+2025"
```

6. Repeat until complete  

---

## Final Rule

> Research is **not finished when you find an answer**  
> Research is finished when **nothing important is missing**

> Prefer:
> - completeness over speed  
> - synthesis over collection  
> - depth over surface  