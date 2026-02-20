import http from 'node:http';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import Database from 'better-sqlite3';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const ROOT_DIR = path.join(__dirname, '..');

const PORT = parseInt(process.env.PORT || '3001', 10);

const COLORS = {
  primary: '#6366f1', secondary: '#a855f7', success: '#10b981',
  warning: '#f59e0b', error: '#ef4444', bg: '#0f172a',
  card: 'rgba(30, 41, 59, 0.7)', text: '#f8fafc', muted: '#94a3b8'
};

const CSS = `
  :root {
    --primary: ${COLORS.primary}; --secondary: ${COLORS.secondary};
    --success: ${COLORS.success}; --warning: ${COLORS.warning};
    --error: ${COLORS.error}; --bg: ${COLORS.bg};
    --card: var(--card); --text: ${COLORS.text}; --muted: ${COLORS.muted};
  }
  * { box-sizing: border-box; }
  body { 
    font-family: 'Inter', -apple-system, sans-serif; background-color: ${COLORS.bg};
    background-image: radial-gradient(circle at 0% 0%, rgba(99, 102, 241, 0.1) 0, transparent 50%),
                      radial-gradient(circle at 100% 100%, rgba(168, 85, 247, 0.1) 0, transparent 50%);
    color: var(--text); margin: 0; padding: 2rem; min-height: 100vh;
  }
  header { display: flex; justify-content: space-between; align-items: center; margin-bottom: 2rem; }
  h1 { font-size: 2rem; font-weight: 800; background: linear-gradient(135deg, var(--primary), var(--secondary)); -webkit-background-clip: text; -webkit-text-fill-color: transparent; }
  .btn-refresh { background: linear-gradient(135deg, var(--primary), var(--secondary)); color: white; border: none; padding: 0.6rem 1.25rem; border-radius: 2rem; font-weight: 600; cursor: pointer; }
  .grid { display: grid; grid-template-columns: repeat(auto-fit, minmax(320px, 1fr)); gap: 1.5rem; }
  .card { background: ${COLORS.card}; backdrop-filter: blur(12px); border: 1px solid rgba(255, 255, 255, 0.08); border-radius: 1rem; padding: 1.5rem; }
  .card h2 { font-size: 0.875rem; color: var(--muted); text-transform: uppercase; margin: 0 0 1rem 0; letter-spacing: 0.05em; }
  .metric-value { font-size: 2.5rem; font-weight: 700; margin-bottom: 0.25rem; }
  .chart-container { height: 200px; display: flex; align-items: center; justify-content: center; }
  table { width: 100%; border-collapse: collapse; margin-top: 1rem; font-size: 0.8125rem; }
  th { text-align: left; color: var(--muted); border-bottom: 1px solid rgba(255, 255, 255, 0.1); padding: 0.5rem 0; }
  td { padding: 0.75rem 0; border-bottom: 1px solid rgba(255, 255, 255, 0.05); }
  .tag { padding: 0.2rem 0.5rem; border-radius: 1rem; font-size: 0.7rem; font-weight: 700; }
  .tag.success { background: rgba(16, 185, 129, 0.1); color: var(--success); }
  .tag.error { background: rgba(239, 68, 68, 0.1); color: var(--error); }
  .tag.warning { background: rgba(245, 158, 11, 0.1); color: var(--warning); }
`;

function generateDonutChart(data, size = 200) {
  const total = Object.values(data).reduce((a, b) => a + b, 0);
  if (!total) return '<svg viewBox="0 0 200 200"><text x="50%" y="50%" text-anchor="middle" fill="#94a3b8">No Data</text></svg>';
  const radius = 75, circumference = 2 * Math.PI * radius;
  let offset = 0;
  const colors = { completed: COLORS.success, failed: COLORS.error, pending: COLORS.warning, running: COLORS.primary };
  const slices = Object.entries(data).map(([k, v]) => {
    const p = v / total, dash = (p * circumference) + ' ' + circumference, currentOffset = -offset;
    offset += p * circumference;
    return '<circle cx="100" cy="100" r="' + radius + '" fill="transparent" stroke="' + (colors[k] || COLORS.primary) + '" stroke-width="25" stroke-dasharray="' + dash + '" stroke-dashoffset="' + currentOffset + '" transform="rotate(-90 100 100)"></circle>';
  }).join('');
  return '<svg viewBox="0 0 200 200">' + slices + '<text x="50%" y="50%" text-anchor="middle" dy=".3em" fill="white" font-size="28" font-weight="800">' + total + '</text></svg>';
}

function generateBarChart(labels, values, width = 400, height = 200) {
  if (!labels.length) return '<svg viewBox="0 0 400 200"><text x="50%" y="50%" text-anchor="middle" fill="#94a3b8">No Complexity Data</text></svg>';
  const max = Math.max(...values, 1), barWidth = (width / labels.length) * 0.5, gap = (width / labels.length) * 0.5;
  const bars = labels.map((l, i) => {
    const h = (values[i] / max) * 120, x = i * (barWidth + gap) + gap / 2;
    return '<rect x="' + x + '" y="' + (160 - h) + '" width="' + barWidth + '" height="' + h + '" fill="' + COLORS.primary + '" rx="4"></rect>' +
      '<text x="' + (x + barWidth / 2) + '" y="180" text-anchor="middle" fill="#94a3b8" font-size="10">' + l + '</text>' +
      '<text x="' + (x + barWidth / 2) + '" y="' + (150 - h) + '" text-anchor="middle" fill="white" font-size="10">' + values[i] + '</text>';
  }).join('');
  return '<svg viewBox="0 0 ' + width + ' ' + height + '">' + bars + '</svg>';
}

function getStats() {
  const stats = { tasks: {}, complexity: { low: 0, medium: 0, high: 0 }, rag: 0, cron: 0, logs: [] };
  try {
    const tdb = new Database(path.join(ROOT_DIR, 'data/tasks.sqlite'), { readonly: true });
    tdb.prepare('SELECT status, count(*) as c FROM tasks GROUP BY status').all().forEach(r => stats.tasks[r.status] = r.c);
    tdb.prepare('SELECT complexity, count(*) as c FROM tasks WHERE complexity IS NOT NULL GROUP BY complexity').all().forEach(r => stats.complexity[r.complexity.toLowerCase()] = r.c);
    tdb.close();
  } catch (e) { }
  try {
    const rdb = new Database(path.join(ROOT_DIR, 'data/rag.sqlite'), { readonly: true });
    stats.rag = rdb.prepare('SELECT count(*) as c FROM rag_documents').get().c;
    rdb.close();
  } catch (e) { }
  try {
    const cdb = new Database(path.join(ROOT_DIR, 'data/cron.sqlite'), { readonly: true });
    const row = cdb.prepare('SELECT count(*) as c FROM cron_schedules WHERE enabled=1').get();
    stats.cron = row ? row.c : 0;
    cdb.close();
  } catch (e) { }
  try {
    const logPath = path.join(ROOT_DIR, 'logs/events.log');
    if (fs.existsSync(logPath)) {
      stats.logs = fs.readFileSync(logPath, 'utf8').trim().split('\n').slice(-15).map(line => {
        try { return JSON.parse(line); } catch (e) { return { message: line }; }
      }).reverse();
    }
  } catch (e) { }
  return stats;
}

const server = http.createServer((req, res) => {
  if (req.url === '/api/stats') {
    const s = getStats();
    res.setHeader('Content-Type', 'application/json');
    res.end(JSON.stringify({
      ...s,
      charts: {
        taskDonut: generateDonutChart(s.tasks),
        compBar: generateBarChart(Object.keys(s.complexity), Object.values(s.complexity))
      }
    }));
    return;
  }
  if (req.url === '/') {
    res.setHeader('Content-Type', 'text/html');
    res.end('<!DOCTYPE html><html><head><meta charset="UTF-8"><title>ManBot</title><style>' + CSS + '</style></head><body>' +
      '<header><h1>ManBot <small style="font-size: 0.8rem; vertical-align: middle; color: var(--success); margin-left: 0.5rem;">● LIVE</small></h1><button class="btn-refresh" onclick="location.reload()">Refresh</button></header>' +
      '<div class="grid"><div class="card"><h2>Tasks Status</h2><div id="c1" class="chart-container"></div></div>' +
      '<div class="card"><h2>Task Complexity</h2><div id="c2" class="chart-container"></div></div>' +
      '<div class="card"><h2>System Memory</h2><div style="display:flex;flex-direction:column;gap:1.5rem;">' +
      '<div><div style="color:var(--muted);font-size:0.8rem">RAG Documents</div><div class="metric-value" id="m1">0</div></div>' +
      '<div><div style="color:var(--muted);font-size:0.8rem">Active Schedules</div><div class="metric-value" id="m2" style="color:var(--secondary)">0</div></div>' +
      '</div></div></div>' +
      '<div class="card" style="margin-top:1.5rem"><h2>Recent Intelligence Events</h2><table><thead><tr><th>Time</th><th>Type</th><th>Capability / Details</th></tr></thead><tbody id="lt"></tbody></table></div>' +
      '<script>fetch("/api/stats").then(r=>r.json()).then(d=>{' +
      'document.getElementById("c1").innerHTML=d.charts.taskDonut;' +
      'document.getElementById("c2").innerHTML=d.charts.compBar;' +
      'document.getElementById("m1").textContent=d.rag;' +
      'document.getElementById("m2").textContent=d.cron;' +
      'document.getElementById("lt").innerHTML=d.logs.map(l=>{' +
      'const tc=l.type?.includes("failed")?"error":(l.type?.includes("completed")?"success":"warning");' +
      'return "<tr><td>"+new Date(l.time||Date.now()).toLocaleTimeString()+"</td><td><span class=\'tag "+tc+"\'>"+(l.type||"EV").split(".").pop()+"</span></td><td style=\'color:var(--muted)\'>"+(l.payload?.toolName||l.payload?.nodeId||l.message||"-")+"</td></tr>"' +
      '}).join("");});</script></body></html>');
    return;
  }

  res.statusCode = 404;
  res.end('Not Found');
});

server.listen(PORT, () => {
  console.log('Dashboard running at http://localhost:' + PORT);
});
