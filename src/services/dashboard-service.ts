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
  }

  th {
    text-align: left;
    font-size: 12px;
    font-weight: 500;
    color: var(--text-muted);
    padding: 8px 0;
    border-bottom: 1px solid var(--border);
  }

  td {
    padding: 12px 0;
    border-bottom: 1px solid var(--border);
    font-size: 14px;
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

  tr {
    cursor: pointer;
    transition: background 0.1s;
  }

  tr:hover {
    background-color: var(--subtle);
  }

  .log-details {
    display: none;
    font-size: 11px;
    color: var(--text-muted);
    background: var(--bg);
    padding: 8px;
    border-radius: 4px;
    margin-top: 4px;
    white-space: pre-wrap;
    word-break: break-all;
    border: 1px solid var(--border);
  }

  .log-details.open {
    display: block;
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
        if (req.url === '/api/stats') {
            const s = this.getStats();
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

        if (req.url === '/') {
            res.setHeader('Content-Type', 'text/html');
            res.end(this.getHTML());
            return;
        }

        res.statusCode = 404;
        res.end('Not Found');
    }

    private getStats() {
        const stats: any = { tasks: {}, complexity: { low: 0, medium: 0, high: 0, unknown: 0 }, rag: 0, cron: 0, logs: [], maxNodes: 0 };
        try {
            const tdb = new Database(path.join(ROOT_DIR, 'data/tasks.sqlite'), { readonly: true });
            tdb.prepare('SELECT status, count(*) as c FROM tasks GROUP BY status').all().forEach((r: any) => stats.tasks[r.status] = r.c);
            tdb.prepare('SELECT complexity, count(*) as c FROM tasks GROUP BY complexity').all().forEach((r: any) => {
                const key = r.complexity ? r.complexity.toLowerCase() : 'unknown';
                stats.complexity[key] = (stats.complexity[key] || 0) + r.c;
            });
            const peak = tdb.prepare('SELECT MAX(cnt) as m FROM (SELECT count(*) as cnt FROM task_nodes GROUP BY task_id)').get() as { m: number } | undefined;
            stats.maxNodes = peak ? peak.m : 0;
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
            const logPath = path.join(ROOT_DIR, 'logs/events.log');
            if (fs.existsSync(logPath)) {
                stats.logs = fs.readFileSync(logPath, 'utf8').trim().split('\n').slice(-20).map(line => {
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
            <button class="btn-refresh" onclick="location.reload()">Refresh Data</button>
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
        </div>

        <div class="logs-section">
            <h3>Recent Intelligence Pipeline</h3>
            <div class="card" style="padding: 0;">
                <table id="log-table">
                    <thead>
                        <tr>
                            <th style="padding-left: 20px;">TIME</th>
                            <th>TYPE</th>
                            <th style="padding-right: 20px;">CONTENT</th>
                        </tr>
                    </thead>
                    <tbody id="lt"></tbody>
                </table>
            </div>
        </div>
    </div>

    <script>
        fetch("/api/stats")
            .then(r => r.json())
            .then(d => {
                const total = Object.values(d.tasks).reduce((a, b) => a + b, 0);
                document.getElementById("task-total").textContent = total;
                document.getElementById("rag-count").textContent = d.rag;
                document.getElementById("cron-count").textContent = d.cron;
                document.getElementById("max-nodes").textContent = d.maxNodes || 0;
                
                document.getElementById("c1").innerHTML = d.charts.taskDonut;
                document.getElementById("c2").innerHTML = d.charts.compBar;
                
                document.getElementById("lt").innerHTML = d.logs.map(l => {
                    const tc = l.type?.includes("failed") ? "error" : (l.type?.includes("completed") ? "success" : "warning");
                    const typeLabel = (l.type || "EVENT").split(".").pop();
                    const mainContent = l.payload?.toolName || l.payload?.nodeId || l.message || "-";
                    const args = l.payload ? JSON.stringify(l.payload, null, 2) : "";
                    
                    return \`<tr onclick="this.querySelector('.log-details')?.classList.toggle('open')">
                        <td style="padding-left: 20px; color: var(--text-muted); vertical-align: top; padding-top: 12px;">\${new Date(l.time || Date.now()).toLocaleTimeString()}</td>
                        <td style="vertical-align: top; padding-top: 12px;"><span class="tag \${tc}">\${typeLabel}</span></td>
                        <td style="padding-right: 20px; color: var(--text-muted); font-family: monospace; font-size: 13px;">
                          <div style="font-weight: 600; color: var(--text); padding-top: 2px;">\${mainContent}</div>
                          \${args ? \`<div class="log-details">\${args}</div>\` : ""}
                        </td>
                    </tr>\`;
                }).join("");
            });
    </script>
</body>
</html>`;
    }
}

if (process.argv[1] === fileURLToPath(import.meta.url)) {
    new DashboardService().start();
}
