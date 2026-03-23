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

export class DashboardService extends BaseProcess {
  private readonly server: http.Server;
  private processStats: Record<string, any> = {};
  private readonly ipcLogBuffer: any[] = [];

  constructor() {
    super({ processName: 'dashboard' });
    this.server = http.createServer((req, res) => this.handleRequest(req, res));
  }

  override handleEnvelope(envelope: any): void {
    if (envelope.type === 'event.system.heartbeat') {
      const p = envelope.payload;
      this.processStats[envelope.from] = {
        ...this.processStats[envelope.from],
        status: p.status,
        uptime: p.uptime,
        memory: p.memory,
        lastHeartbeat: Date.now()
      };
    } else if (envelope.type === 'event.system.process_restart') {
      const p = envelope.payload;
      const pName = p.processName;
      if (pName) {
        const existing = this.processStats[pName] || { restartCount: 0 };
        this.processStats[pName] = { ...existing, restartCount: p.restartCount, lastRestart: Date.now() };
      }
    } else if (envelope.type === 'event.dashboard.ipc_log') {
      this.ipcLogBuffer.push(envelope.payload);
      if (this.ipcLogBuffer.length > 500) this.ipcLogBuffer.shift();
    }
    super.handleEnvelope(envelope);
  }

  override start(): void {
    super.start();
    this.server.listen(PORT, () => {
      this.logEvent('info', `Dashboard server started on port ${PORT}`);
    });

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

    if (url.pathname === '/api/ipc-logs') {
      const since = parseInt(url.searchParams.get('since') || '0', 10);
      const logs = this.ipcLogBuffer.filter(log => log.message.timestamp > since);
      res.setHeader('Content-Type', 'application/json');
      res.end(JSON.stringify(logs));
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
          .sort((a, b) => b.localeCompare(a));

        res.setHeader('Content-Type', 'application/json');
        res.end(JSON.stringify(files));
      } catch (e) {
        res.statusCode = 500;
        res.end(JSON.stringify({ error: String(e) }));
      }
      return;
    }

    if (url.pathname === '/api/fail-task' || url.pathname.startsWith('/api/fail-task')) {
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

    if (url.pathname === '/styles.css') {
      const cssPath = path.join(ROOT_DIR, 'src/services/dashboard/styles.css');
      if (fs.existsSync(cssPath)) {
        res.setHeader('Content-Type', 'text/css');
        res.end(fs.readFileSync(cssPath, 'utf8'));
        return;
      }
    }

    if (url.pathname === '/app.js') {
      const jsPath = path.join(ROOT_DIR, 'src/services/dashboard/app.js');
      if (fs.existsSync(jsPath)) {
        res.setHeader('Content-Type', 'application/javascript');
        res.end(fs.readFileSync(jsPath, 'utf8'));
        return;
      }
    }

    if (url.pathname === '/') {
      const htmlPath = path.join(ROOT_DIR, 'src/services/dashboard/index.html');
      if (fs.existsSync(htmlPath)) {
        res.setHeader('Content-Type', 'text/html');
        res.end(fs.readFileSync(htmlPath, 'utf8'));
        return;
      } else {
        res.statusCode = 404;
        res.end('Dashboard UI files missing.');
        return;
      }
    }

    res.statusCode = 404;
    res.end('Not Found');
  }

  private getStats(date?: string) {
    const stats: any = {
      processes: this.processStats,
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

      stats.pendingTasks = tdb.prepare(`
        SELECT t.id, t.goal, t.status, t.complexity, t.updated_at,
        (SELECT json_group_array(json_object('id', id, 'type', type, 'status', status, 'input', input)) FROM task_nodes WHERE task_id = t.id ORDER BY started_at ASC) as nodes,
        (SELECT json_group_array(json_object('from', from_node, 'to', to_node)) FROM task_edges WHERE task_id = t.id) as edges
        FROM tasks t WHERE t.status IN (?, ?, ?, ?) ORDER BY t.updated_at DESC
      `).all('planning', 'pending', 'running', 'finalizing').map((t: any) => ({
        ...t,
        nodes: JSON.parse(t.nodes || '[]'),
        edges: JSON.parse(t.edges || '[]')
      }));

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
    const colors: any = { completed: '#0b6e4f', failed: '#df2a5f', pending: '#d9730d', running: '#2383e2', planning: '#8b8b8b', finalizing: '#9333ea' };
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
}

if (process.argv[1] === fileURLToPath(import.meta.url)) {
  new DashboardService().start();
}
