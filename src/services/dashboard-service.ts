import http from 'node:http';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import Database from 'better-sqlite3';
import { BaseProcess } from '../shared/base-process.js';
import { randomUUID } from 'node:crypto';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const ROOT_DIR = path.join(__dirname, '..', '..');

const PORT = parseInt(process.env.DASHBOARD_PORT || '3001', 10);

const CSS = `
  :root {
    --bg: #ffffff;
    --text: #37352f;
    --text-muted: #787774;
    --subtle: #f7f6f3;
    --border: rgba(55, 53, 47, 0.09);
    --primary: #2383e2;
    --success: #0b6e4f;
    --error: #df2a5f;
    --warning: #d9730d;
  }

  @media (prefers-color-scheme: dark) {
    :root {
      --bg: #191919;
      --text: #d4d4d4;
      --text-muted: #8b8b8b;
      --subtle: #252525;
      --border: rgba(255, 255, 255, 0.09);
      --primary: #2ea7ff;
      --success: #529e72;
      --error: #ff4d4d;
      --warning: #ffdc4d;
    }
  }

  * { box-sizing: border-box; }
  body { 
    font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Helvetica, "Apple Color Emoji", Arial, sans-serif, "Segoe UI Emoji", "Segoe UI Symbol";
    background-color: var(--bg);
    color: var(--text);
    margin: 0;
    padding: 0;
    display: flex;
    justify-content: center;
    line-height: 1.5;
  }

  .container {
    max-width: 900px;
    width: 100%;
    padding: 80px 40px;
  }

  header {
    margin-bottom: 40px;
  }

  h1 {
    font-size: 40px;
    font-weight: 700;
    margin: 0 0 10px 0;
    display: flex;
    align-items: center;
    gap: 12px;
  }

  .live-indicator {
    font-size: 12px;
    font-weight: 500;
    padding: 2px 8px;
    background: var(--subtle);
    border: 1px solid var(--border);
    border-radius: 4px;
    color: var(--success);
    display: flex;
    align-items: center;
    gap: 6px;
  }

  .live-indicator::before {
    content: '';
    width: 6px;
    height: 6px;
    background: var(--success);
    border-radius: 50%;
    display: block;
  }

  .description {
    color: var(--text-muted);
    font-size: 16px;
    margin-bottom: 40px;
  }

  .grid {
    display: grid;
    grid-template-columns: repeat(4, 1fr);
    gap: 20px;
    margin-bottom: 40px;
  }

  .card {
    border: 1px solid var(--border);
    border-radius: 8px;
    padding: 20px;
    background: var(--bg);
  }

  .card h2 {
    font-size: 14px;
    font-weight: 600;
    color: var(--text-muted);
    margin: 0 0 8px 0;
    text-transform: uppercase;
    letter-spacing: 0.03em;
  }

  .metric-value {
    font-size: 32px;
    font-weight: 600;
  }

  .chart-section {
    margin-bottom: 60px;
  }

  .chart-section h3 {
    font-size: 18px;
    font-weight: 600;
    margin-bottom: 20px;
    padding-bottom: 8px;
    border-bottom: 1px solid var(--border);
  }

  .charts-grid {
    display: grid;
    grid-template-columns: 1fr 1fr;
    gap: 30px;
  }

  .models-section {
    margin-top: 40px;
    padding-top: 20px;
    border-top: 1px solid var(--border);
  }

  .model-pill {
    display: inline-flex;
    align-items: center;
    gap: 8px;
    padding: 4px 12px;
    background: var(--subtle);
    border: 1px solid var(--border);
    border-radius: 20px;
    font-size: 13px;
    margin-right: 12px;
    margin-bottom: 12px;
  }

  .model-pill b { color: var(--primary); }

  .chart-container {
    height: 240px;
    display: flex;
    align-items: center;
    justify-content: center;
    background: var(--subtle);
    border-radius: 8px;
    padding: 20px;
  }

  .logs-section h3 {
    font-size: 18px;
    font-weight: 600;
    margin-bottom: 20px;
    padding-bottom: 8px;
    border-bottom: 1px solid var(--border);
  }

  table {
    width: 100%;
    border-collapse: collapse;
    table-layout: auto;
  }

  th {
    text-align: left;
    font-size: 12px;
    font-weight: 500;
    color: var(--text-muted);
    padding: 12px 10px;
    border-bottom: 1px solid var(--border);
    white-space: nowrap;
  }

  td {
    padding: 12px 10px;
    border-bottom: 1px solid var(--border);
    font-size: 14px;
    vertical-align: middle;
  }

  .tag {
    font-size: 12px;
    padding: 2px 6px;
    border-radius: 3px;
    font-weight: 500;
  }

  .tag.success { background: rgba(11, 110, 79, 0.1); color: var(--success); }
  .tag.error { background: rgba(223, 42, 95, 0.1); color: var(--error); }
  .tag.warning { background: rgba(217, 115, 13, 0.1); color: var(--warning); }
  .tag.running { 
    background: rgba(35, 131, 226, 0.1); 
    color: var(--primary);
    display: inline-flex;
    align-items: center;
    gap: 4px;
  }

  .tag.complexity-small { background: var(--subtle); color: var(--text-muted); border: 1px solid var(--border); }
  .tag.complexity-medium { background: rgba(35, 131, 226, 0.1); color: var(--primary); }
  .tag.complexity-large { background: rgba(147, 51, 234, 0.1); color: #9333ea; }

  .pulse {
    width: 6px;
    height: 6px;
    background: var(--primary);
    border-radius: 50%;
    animation: pulse-ring 1.5s infinite;
  }

  @keyframes pulse-ring {
    0% { transform: scale(0.7); opacity: 1; }
    50% { transform: scale(1); opacity: 0.5; }
    100% { transform: scale(0.7); opacity: 1; }
  }

  .btn-refresh {
    font-size: 14px;
    font-weight: 500;
    padding: 6px 12px;
    background: var(--bg);
    border: 1px solid var(--border);
    border-radius: 4px;
    cursor: pointer;
    color: var(--text);
    transition: background 0.2s;
  }

  tr.log-row {
    cursor: pointer;
    transition: background 0.1s;
  }

  tr.log-row:hover {
    background-color: var(--subtle);
  }

  .log-details-row {
    display: none;
  }

  .log-details-row.open {
    display: table-row;
  }

  .log-details-container {
    padding: 0 20px 20px 20px;
  }

  .log-details-content {
    font-size: 11px;
    color: var(--text-muted);
    background: var(--subtle);
    padding: 12px;
    border-radius: 4px;
    white-space: pre-wrap;
    word-break: break-all;
    border: 1px solid var(--border);
    font-family: monospace;
  }

  @media (max-width: 768px) {
    .grid {
      grid-template-columns: 1fr 1fr;
    }
    .charts-grid {
      grid-template-columns: 1fr;
    }
    .container {
      padding: 40px 20px;
    }
  }
`;

export class DashboardService extends BaseProcess {
  private readonly server: http.Server;

  constructor() {
    super({ processName: 'dashboard' });
    this.server = http.createServer((req, res) => this.handleRequest(req, res));
  }

  override start(): void {
    super.start();
    this.server.listen(PORT, () => {
      this.logEvent('info', `Dashboard server started on port ${PORT}`);
    });

    // Send initial log announcement to orchestrator
    this.send({
      id: randomUUID(),
      timestamp: Date.now(),
      from: 'dashboard',
      to: 'logger',
      type: 'event.system.dashboard_online',
      version: '1.0',
      payload: { port: PORT, status: 'online' }
    });
  }

  private logEvent(level: string, message: string) {
    this.send({
      id: randomUUID(),
      timestamp: Date.now(),
      from: 'dashboard',
      to: 'logger',
      type: `event.dashboard.${level}`,
      version: '1.0',
      payload: { message }
    });
  }

  private handleRequest(req: http.IncomingMessage, res: http.ServerResponse) {
    const url = new URL(req.url || '/', `http://${req.headers.host}`);

    if (url.pathname === '/api/stats') {
      const date = url.searchParams.get('date') || undefined;
      const s = this.getStats(date);
      res.setHeader('Content-Type', 'application/json');
      res.end(JSON.stringify({
        ...s,
        charts: {
          taskDonut: this.generateDonutChart(s.tasks),
          compBar: this.generateBarChart(Object.keys(s.complexity), Object.values(s.complexity))
        }
      }));
      return;
    }

    if (url.pathname === '/api/log-files') {
      try {
        const logDir = path.join(ROOT_DIR, 'logs');
        if (!fs.existsSync(logDir)) {
          res.setHeader('Content-Type', 'application/json');
          res.end(JSON.stringify([]));
          return;
        }
        const files = fs.readdirSync(logDir)
          .filter(f => f.startsWith('events-') && f.endsWith('.log'))
          .map(f => f.replace('events-', '').replace('.log', ''))
          .sort((a, b) => b.localeCompare(a)); // Newest first

        res.setHeader('Content-Type', 'application/json');
        res.end(JSON.stringify(files));
      } catch (e) {
        res.statusCode = 500;
        res.end(JSON.stringify({ error: String(e) }));
      }
      return;
    }

    if (url.pathname === '/') {
      res.setHeader('Content-Type', 'text/html');
      res.end(this.getHTML());
      return;
    }

    if (url.pathname.startsWith('/api/fail-task')) {
      const taskId = url.searchParams.get('id');
      if (taskId) {
        try {
          const tdb = new Database(path.join(ROOT_DIR, 'data/tasks.sqlite'));
          tdb.prepare("UPDATE tasks SET status = 'failed', updated_at = ?, metadata = ? WHERE id = ?").run(Date.now(), JSON.stringify({ reason: 'Manually failed via dashboard' }), taskId);
          tdb.close();
          res.setHeader('Content-Type', 'application/json');
          res.end(JSON.stringify({ status: 'success' }));
          return;
        } catch (e) {
          res.statusCode = 500;
          res.end(JSON.stringify({ status: 'error', message: String(e) }));
          return;
        }
      }
    }

    res.statusCode = 404;
    res.end('Not Found');
  }

  private getStats(date?: string) {
    const stats: any = {
      tasks: {},
      complexity: { small: 0, medium: 0, large: 0, unknown: 0 },
      rag: 0,
      cron: 0,
      logs: [],
      maxNodes: 0,
      timing: { first: '-', last: '-', avg: '-' },
      models: {}
    };
    try {
      const configPath = path.join(ROOT_DIR, 'config.json');
      if (fs.existsSync(configPath)) {
        const config = JSON.parse(fs.readFileSync(configPath, 'utf8'));
        stats.models = config.modelRouter || {};
      }
    } catch (e) { }

    try {
      const tdb = new Database(path.join(ROOT_DIR, 'data/tasks.sqlite'), { readonly: true });
      tdb.prepare('SELECT status, count(*) as c FROM tasks GROUP BY status').all().forEach((r: any) => stats.tasks[r.status] = r.c);
      tdb.prepare('SELECT complexity, count(*) as c FROM tasks GROUP BY complexity').all().forEach((r: any) => {
        const key = r.complexity ? r.complexity.toLowerCase() : 'unknown';
        stats.complexity[key] = (stats.complexity[key] || 0) + r.c;
      });
      const peak = tdb.prepare('SELECT MAX(cnt) as m FROM (SELECT count(*) as cnt FROM task_nodes GROUP BY task_id)').get() as { m: number } | undefined;
      stats.maxNodes = peak ? peak.m : 0;

      const times = tdb.prepare('SELECT MIN(created_at) as first, MAX(updated_at) as last FROM tasks').get() as { first: number, last: number } | undefined;
      if (times?.first) {
        const fmt = (d: number) => {
          const date = new Date(d);
          return `${date.getDate()} ${date.toLocaleString('en-US', { month: 'short' })}, ${date.getFullYear()} ${date.toLocaleTimeString('en-GB')}`;
        };
        stats.timing.first = fmt(times.first);
        stats.timing.last = fmt(times.last);
      }

      const avg = tdb.prepare("SELECT AVG(updated_at - created_at) as a FROM tasks WHERE status = 'completed' AND updated_at > created_at").get() as { a: number } | undefined;
      if (avg?.a) {
        const sec = Math.round(avg.a / 1000);
        stats.timing.avg = sec > 60 ? `${Math.floor(sec / 60)}m ${sec % 60}s` : `${sec}s`;
      }

      stats.pendingTasks = tdb.prepare('SELECT id, goal, status, complexity, updated_at FROM tasks WHERE status IN (?, ?) ORDER BY updated_at DESC')
        .all('pending', 'running');

      tdb.close();
    } catch (e) { }
    try {
      const rdb = new Database(path.join(ROOT_DIR, 'data/rag.sqlite'), { readonly: true });
      const row = rdb.prepare('SELECT count(*) as c FROM rag_documents').get() as { c: number } | undefined;
      stats.rag = row ? row.c : 0;
      rdb.close();
    } catch (e) { }
    try {
      const cdb = new Database(path.join(ROOT_DIR, 'data/cron.sqlite'), { readonly: true });
      const row = cdb.prepare('SELECT count(*) as c FROM cron_schedules WHERE enabled=1').get() as { c: number } | undefined;
      stats.cron = row ? row.c : 0;
      cdb.close();
    } catch (e) { }
    try {
      const dateStr = date || new Date().toISOString().split('T')[0];
      const logPath = path.join(ROOT_DIR, 'logs', `events-${dateStr}.log`);
      if (fs.existsSync(logPath)) {
        stats.logs = fs.readFileSync(logPath, 'utf8').trim().split('\n').map(line => {
          try { return JSON.parse(line); } catch (e) { return { message: line }; }
        }).reverse();
      }
    } catch (e) { }
    return stats;
  }

  private generateDonutChart(data: any, size = 200) {
    const total = Object.values(data).reduce((a: any, b: any) => a + b, 0) as number;
    if (!total) return `<svg width="${size}" height="${size}" viewBox="0 0 ${size} ${size}"><text x="50%" y="50%" text-anchor="middle" fill="#8b8b8b">No Data</text></svg>`;
    const radius = 75, circumference = 2 * Math.PI * radius;
    let offset = 0;
    const colors: any = { completed: '#0b6e4f', failed: '#df2a5f', pending: '#d9730d', running: '#2383e2' };
    const slices = Object.entries(data).map(([k, v]: [string, any]) => {
      const p = v / total, dash = (p * circumference) + ' ' + circumference, currentOffset = -offset;
      offset += p * circumference;
      return `<circle cx="100" cy="100" r="${radius}" fill="transparent" stroke="${colors[k] || '#2383e2'}" stroke-width="25" stroke-dasharray="${dash}" stroke-dashoffset="${currentOffset}" transform="rotate(-90 100 100)"></circle>`;
    }).join('');
    return `<svg width="100%" height="100%" viewBox="0 0 200 200" preserveAspectRatio="xMidYMid meet">${slices}<text x="50%" y="50%" text-anchor="middle" dy=".3em" fill="currentColor" font-size="28" font-weight="700">${total}</text></svg>`;
  }

  private generateBarChart(labels: string[], values: number[], width = 400, height = 200) {
    const max = Math.max(...values, 1), barWidth = (width / labels.length) * 0.5, gap = (width / labels.length) * 0.5;
    const bars = labels.map((l, i) => {
      const val = values[i] ?? 0;
      const h = (val / max) * 120, x = i * (barWidth + gap) + gap / 2;
      return `<rect x="${x}" y="${160 - h}" width="${barWidth}" height="${h}" fill="#2ea7ff" rx="4"></rect>` +
        `<text x="${x + barWidth / 2}" y="180" text-anchor="middle" fill="#8b8b8b" font-size="10">${l}</text>` +
        `<text x="${x + barWidth / 2}" y="${150 - h}" text-anchor="middle" fill="currentColor" font-size="10">${val}</text>`;
    }).join('');
    return `<svg width="100%" height="100%" viewBox="0 0 ${width} ${height}" preserveAspectRatio="xMidYMid meet">${bars}</svg>`;
  }

  private getHTML() {
    return `<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>ManBot Dashboard</title>
    <link rel="preconnect" href="https://fonts.googleapis.com">
    <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
    <link href="https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700&display=swap" rel="stylesheet">
    <style>${CSS}</style>
</head>
<body>
    <div class="container">
        <header>
            <h1>🍱 ManBot Dashboard <span class="live-indicator">LIVE</span></h1>
            <p class="description">Real-time internal monitoring for AI-Agent orchestration, memory, and events.</p>
            <div style="display: flex; gap: 10px;">
                <button class="btn-refresh" onclick="updateDashboard()">Refresh Data</button>
            </div>
        </header>

        <div class="grid">
            <div class="card">
                <h2>Total Tasks</h2>
                <div class="metric-value" id="task-total">0</div>
            </div>
            <div class="card">
                <h2>Knowledge Base</h2>
                <div class="metric-value"><span id="rag-count">0</span> <small style="font-size: 14px; font-weight: 400; color: var(--text-muted);">docs</small></div>
            </div>
            <div class="card">
                <h2>Active Schedules</h2>
                <div class="metric-value" id="cron-count">0</div>
            </div>
            <div class="card">
                <h2>Peak Nodes</h2>
                <div class="metric-value" id="max-nodes">0</div>
            </div>
        </div>

        <div class="grid" style="grid-template-columns: repeat(3, 1fr); margin-bottom: 60px;">
            <div class="card">
                <h2>First Task</h2>
                <div class="metric-value" id="time-first" style="font-size: 20px;">-</div>
            </div>
            <div class="card">
                <h2>Last Active</h2>
                <div class="metric-value" id="time-last" style="font-size: 20px;">-</div>
            </div>
            <div class="card">
                <h2>Avg Duration</h2>
                <div class="metric-value" id="time-avg" style="font-size: 20px;">-</div>
            </div>
        </div>

        <div class="chart-section">
            <h3>Analytics</h3>
            <div class="charts-grid">
                <div class="card">
                    <h2>Task Distribution</h2>
                    <div id="c1" class="chart-container"></div>
                </div>
                <div class="card">
                    <h2>Task Complexity</h2>
                    <div id="c2" class="chart-container"></div>
                </div>
            </div>
            
            <div class="models-section" id="model-mapping" style="border-top: none; margin-top: 20px;">
                <div id="model-list"></div>
            </div>
        </div>

        <div class="logs-section" id="active-queue-section" style="margin-bottom: 60px; display: none;">
            <h3>Active Tasks Queue</h3>
            <div class="card" style="padding: 0;">
                <table id="queue-table">
                    <thead>
                        <tr>
                            <th style="padding-left: 20px; width: 100px;">UPDATED</th>
                            <th style="width: 100px;">STATUS</th>
                            <th style="width: 120px;">COMPLEXITY</th>
                            <th>GOAL</th>
                            <th style="padding-right: 20px; text-align: right; width: 80px;">ACTION</th>
                        </tr>
                    </thead>
                    <tbody id="qt"></tbody>
                </table>
            </div>
        </div>

        <div class="logs-section">
            <div style="display: flex; gap: 0.5rem; align-items: center; margin-bottom: 20px; padding-bottom: 8px;">
                <h3 style="margin: 0; flex: 1;">Intelligence Pipeline</h3>
                <select id="log-date-select" onchange="updateDashboard()" style="width: 140px; padding: 4px 8px; border-radius: 6px; border: 1px solid var(--border); background: var(--subtle); color: var(--text); font-family: inherit; font-size: 13px; cursor: pointer; height: 32px;">
                </select>
            </div>
            <div class="card" style="padding: 0;">
                <table id="log-table" style="table-layout: fixed;">
                    <thead>
                        <tr>
                            <th style="padding-left: 20px; width: 25%;">TIME</th>
                            <th style="width: 25%;">TYPE</th>
                            <th style="padding-right: 20px; width: 50%;">CONTENT</th>
                        </tr>
                    </thead>
                    <tbody id="lt"></tbody>
                </table>
            </div>
            <div style="text-align: center; margin-top: 20px;">
                <button id="show-more-btn" class="btn-refresh" style="display: none;" onclick="toggleLogs()">Show More</button>
            </div>
        </div>
    </div>

    <script>
        let allLogs = [];
        let showingAll = false;

        function fmtDate(d) {
            const date = new Date(d);
            return \`\${date.getDate()} \${date.toLocaleString('en-US', { month: 'short' })}, \${date.getFullYear()} \${date.toLocaleTimeString('en-GB')}\`;
        }

        function failTask(id) {
            if (!confirm("Mark this task as failed?")) return;
            fetch(\`/api/fail-task?id=\${id}\`)
                .then(r => r.json())
                .then(d => {
                    if (d.status === 'success') {
                        updateDashboard();
                    } else {
                        alert("Error: " + d.message);
                    }
                });
        }

        function toggleLogs() {
            showingAll = !showingAll;
            const btn = document.getElementById("show-more-btn");
            btn.textContent = showingAll ? "Show Less" : "Show More";
            renderLogs();
        }

        function renderLogs() {
            const lt = document.getElementById("lt");
            const logsToRender = showingAll ? allLogs : allLogs.slice(0, 20);
            
            lt.innerHTML = logsToRender.map(l => {
                const tc = l.type?.includes("failed") ? "error" : (l.type?.includes("completed") ? "success" : "warning");
                const typeLabel = (l.type || "EVENT").split(".").pop();
                const mainContent = l.payload?.toolName || l.payload?.nodeId || l.message || "-";
                const args = l.payload ? JSON.stringify(l.payload, null, 2) : "";
                
                return \`<tr class="log-row" onclick="const next = this.nextElementSibling; if(next) next.classList.toggle('open')">
                    <td style="padding-left: 20px; color: var(--text-muted); vertical-align: top; padding-top: 12px;">\${fmtDate(l.time || l.timestamp || Date.now())}</td>
                    <td style="vertical-align: top; padding-top: 12px;"><span class="tag \${tc}">\${typeLabel}</span></td>
                    <td style="padding-right: 20px; color: var(--text-muted); font-size: 13px; vertical-align: top; padding-top: 12px;">
                      <div style="font-weight: 600; color: var(--text);">\${mainContent}</div>
                    </td>
                </tr>
                \${args ? \`<tr class="log-details-row">
                    <td colspan="3">
                        <div class="log-details-container">
                            <div class="log-details-content">\${args}</div>
                        </div>
                    </td>
                </tr>\` : ""}\`;
            }).join("");

            document.getElementById("show-more-btn").style.display = allLogs.length > 20 ? "inline-block" : "none";
        }

        function updateDashboard() {
            const dateSelect = document.getElementById("log-date-select");
            const date = dateSelect.value;
            
            fetch(\`/api/stats\${date ? '?date=' + date : ''}\`)
                .then(r => r.json())
                .then(d => {
                    const total = Object.values(d.tasks).reduce((a, b) => a + b, 0);
                    document.getElementById("task-total").textContent = total;
                    document.getElementById("rag-count").textContent = d.rag;
                    document.getElementById("cron-count").textContent = d.cron;
                    document.getElementById("max-nodes").textContent = d.maxNodes || 0;
                    
                    document.getElementById("time-first").textContent = d.timing.first;
                    document.getElementById("time-last").textContent = d.timing.last;
                    document.getElementById("time-avg").textContent = d.timing.avg;

                    const modelsSection = document.getElementById("model-list");
                    modelsSection.innerHTML = Object.entries(d.models)
                        .filter(([k]) => ['small', 'medium', 'large'].includes(k))
                        .map(([k, v]) => \`<div class="model-pill"><span>\${k.toUpperCase()}:</span><b>\${v}</b></div>\`)
                        .join("");
                    
                    document.getElementById("c1").innerHTML = d.charts.taskDonut;
                    document.getElementById("c2").innerHTML = d.charts.compBar;

                    // Active Queue
                    const qt = document.getElementById("qt");
                    const qs = document.getElementById("active-queue-section");
                    if (d.pendingTasks && d.pendingTasks.length > 0) {
                        qs.style.display = "block";
                        qt.innerHTML = d.pendingTasks.map(t => {
                            const isRunning = t.status === 'running';
                            const tc = isRunning ? "running" : "warning";
                            const indicator = isRunning ? '<div class="pulse"></div>' : '';
                            return \`<tr>
                                <td style="padding-left: 20px; color: var(--text-muted); white-space: nowrap;">\${fmtDate(t.updated_at)}</td>
                                <td style="white-space: nowrap;"><span class="tag \${tc}">\${indicator}\${t.status.toUpperCase()}</span></td>
                                <td style="white-space: nowrap;"><span class="tag complexity-\${t.complexity || 'unknown'}">\${(t.complexity || 'unknown').toUpperCase()}</span></td>
                                <td style="font-weight: 500; word-break: break-word;">\${t.goal}</td>
                                <td style="padding-right: 20px; text-align: right;">
                                    <button onclick="failTask('\${t.id}')" style="cursor: pointer; font-size: 11px; padding: 2px 8px; border: 1px solid var(--border); border-radius: 4px; background: var(--bg); color: var(--error);">FAIL</button>
                                </td>
                            </tr>\`;
                        }).join("");
                    } else {
                        qs.style.display = "none";
                    }
                    
                    allLogs = d.logs;
                    renderLogs();
                });
        }

        // Initial load
        fetch("/api/log-files")
            .then(r => r.json())
            .then(files => {
                const dateSelect = document.getElementById("log-date-select");
                const today = new Date().toISOString().split('T')[0];
                
                // Add today if not in files
                if (!files.includes(today)) {
                    files.unshift(today);
                }
                
                dateSelect.innerHTML = files.map(f => \`<option value="\${f}" \${f === today ? 'selected' : ''}>\${f}</option>\`).join("");
                updateDashboard();
                
                // Auto-refresh every 5 seconds
                setInterval(updateDashboard, 5000);
            });
    </script>
</body>
</html>`;
  }
}

if (process.argv[1] === fileURLToPath(import.meta.url)) {
  new DashboardService().start();
}
