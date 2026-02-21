# Research Skill

Deep web research using the text-based browser `lynx` and DuckDuckGo HTML interface.

## When to Use

**USE this skill when:**

- You need current information from the web.
- You need to deep dive into a topic by following multiple links.
- Fact-checking or verifying news.
- Researching technical documentation or complex subjects.

**DON'T use this skill when:**

- The information is already available in your training data (unless it's time-sensitive).
- You can solve the task with a simple search and the snippet is enough.

## Strategy

Web research is a multi-step process. Do not stop at the first page of search results.

1.  **Search**: Start with a precise DuckDuckGo query.
2.  **Analyze**: Scan the search results. Identify 2-3 most promising links.
3.  **Browse**: Visit those links one by one.
4.  **Recurse**: If a page contains a "References" section or promising links to deeper info, follow them.
5.  **Summarize**: Gather all key findings and provide a comprehensive response.

**!!! IMPORTANT !!!** If you think that you dont have enough information to answer the user's request, you can generate new search queries and repeat the process.

## Commands

### 1. Perform a Search

Use DuckDuckGo's HTML or Lite interface with a standard User-Agent to avoid blocks.

```bash
lynx -useragent="Lynx/2.8.9rel.1 libwww-FM/2.14 SSL-MM/1.4.1 OpenSSL/1.1.1g" -dump "https://html.duckduckgo.com/html?q=YOUR+SEARCH+QUERY"
```

### 2. Browse a URL

```bash
lynx -useragent="Lynx/2.8.9rel.1 libwww-FM/2.14 SSL-MM/1.4.1 OpenSSL/1.1.1g" -dump "https://example.com/some/path"
```

## How to Navigate Links & Redirects

### Links
When you use `lynx -dump`, the output contains a **References** section at the bottom.
In the main text, numbers in brackets like `[1]` correspond to these links.

### Redirects (e.g., from DuckDuckGo)
DuckDuckGo search results often point to redirect URLs. If `lynx -dump` returns a page with a "REFRESH" link or just a single link, you MUST follow it to get the actual content.

**Example of DDG redirect output:**
```text
   REFRESH(0 sec):
   [1]https://actual-destination.com/article
```
In this case, execute a new search on the URL provided in `[1]`.

**Protocol**:
- List the URLs from the References section that you want to visit.
- Execute new `lynx -dump` commands for those URLs.

## Guidelines

- **Token Efficiency**: Web pages contain noise. Focus on the core content. Use specific search queries to find the exact page instead of browsing aimlessly.
- **Concise Summaries**: In multi-turn research, keep your internal notes concise. Do not repeat raw data if you have already extracted the key points.
- **Max Depth**: Typically go 1-2 levels deep from the search results.
- **Data Extraction**: Extract only relevant text. Ignore obvious navigation menus or ads.
- **Synthesis**: Your final output should not be a raw data dump. It must be a structured, factual answer to the user's initial goal.
- **Parallelism**: You can plan multiple `lynx` commands in parallel for different URLs if the Planner allows it.

## Example Workflow

User Goal: "Research the current status of the RISC-V ecosystem in 2024."

1. `lynx -dump "https://html.duckduckgo.com/html?q=RISC-V+ecosystem+status+2024"`
2. Identify links for "RISC-V International news", "Phoronix RISC-V benchmarks", and "Wikipedia RISC-V".
3. `lynx -dump "URL_FROM_PREVIOUS_STEP"` for each.
4. Synthesize findings into a categorized report (Hardware, Software Support, Benchmarks, Corporate Adoption).
