import http from 'node:http';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import Database from 'better-sqlite3';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const ROOT_DIR = path.join(__dirname, '..');

const PORT = process.env.PORT || 3001;

const COLORS = {
    primary: '#4f46e5',
    success: '#10b981',
    warning: '#f59e0b',
    error: '#ef4444',
    bg: '#1e1e1e',
    text: '#94a3b8',
    slate500: '#64748b'
};

// SVG Generators
function generateDonutChart(data, size = 200) {
    const total = Object.values(data).reduce((a, b) => a + b, 0);
    if (total === 0) return `<svg viewBox="0 0 ${size} ${size}"><text x="50%" y="50%" text-anchor="middle" fill="${COLORS.text}">No Data</text></svg>`;

    const center = size / 2;
    const radius = size * 0.4;
    const strokeWidth = size * 0.15;
    const circumference = 2 * Math.PI * radius;

    let currentOffset = 0;
    const colors = [COLORS.success, COLORS.error, COLORS.warning, COLORS.primary];

    const slices = Object.entries(data).map(([label, value], i) => {
        const percentage = value / total;
        const dashArray = `${percentage * circumference} ${circumference}`;
        const dashOffset = -currentOffset;
        currentOffset += percentage * circumference;

        return `<circle cx="${center}" cy="${center}" r="${radius}" 
      fill="transparent" 
      stroke="${colors[i % colors.length]}" 
      stroke-width="${strokeWidth}"
      stroke-dasharray="${dashArray}"
      stroke-dashoffset="${dashOffset}"
      transform="rotate(-90 ${center} ${center})">
      <title>${label}: ${value} (${(percentage * 100).toFixed(1)}%)</title>
    </circle>`;
    }).join('');

    return `<svg viewBox="0 0 ${size} ${size}" class="donut">
    ${slices}
    <circle cx="${center}" cy="${center}" r="${radius - strokeWidth}" fill="transparent" />
    <text x="50%" y="50%" text-anchor="middle" dy=".3em" fill="white" font-size="${size * 0.12}" font-weight="bold">${total}</text>
  </svg>`;
}

function generateBarChart(labels, values, width = 400, height = 200) {
    const max = Math.max(...values, 1);
    const barHeight = height / labels.length * 0.7;
    const gap = height / labels.length * 0.3;

    const bars = labels.map((label, i) => {
        const val = values[i];
        const barWidth = (val / max) * (width * 0.7);
        const y = i * (barHeight + gap);

        return `
      <text x="0" y="${y + barHeight / 2}" dy=".3em" fill="${COLORS.text}" font-size="12">${label}</text>
      <rect x="${width * 0.25}" y="${y}" width="${barWidth}" height="${barHeight}" fill="${COLORS.primary}" rx="4" />
      <text x="${width * 0.25 + barWidth + 5}" y="${y + barHeight / 2}" dy=".3em" fill="white" font-size="10">${val}</text>
    `;
    }).join('');

    return `<svg viewBox="0 0 ${width} ${height}" preserveAspectRatio="xMinYMin meet">${bars}</svg>`;
}

// Database Helpers
function getTableCount(dbPath, table) {
    try {
        const fullPath = path.join(ROOT_DIR, dbPath);
        if (!fs.existsSync(fullPath)) return 0;
        const db = new Database(fullPath, { readonly: true });
        const row = db.prepare(`SELECT count(*) as count FROM ${table}`).get();
        db.close();
        return row.count;
    } catch (err) {
        return 0;
    }
}

function getTaskStats() {
    try {
        const dbPath = path.join(ROOT_DIR, 'data/tasks.sqlite');
        if (!fs.existsSync(dbPath)) return {};
        const db = new Database(dbPath, { readonly: true });
        const rows = db.prepare(`SELECT status, count(*) as count FROM tasks GROUP BY status`).all();
        db.close();
        return rows.reduce((acc, row) => ({ ...acc, [row.status]: row.count }), {});
    } catch (err) {
        return {};
    }
}

function getLatestLogs(n = 20) {
    try {
        const logPath = path.join(ROOT_DIR, 'logs/events.log');
        if (!fs.existsSync(logPath)) return [];
        const content = fs.readFileSync(logPath, 'utf8');
        const lines = content.trim().split('\n').filter(Boolean);
        return lines.slice(-n).map(line => JSON.parse(line)).reverse();
    } catch (err) {
        return [];
    }
}

const server = http.createServer((req, res) => {
    if (req.url === '/api/stats') {
        const tasks = getTaskStats();
        const stats = {
            tasks,
            ragDocuments: getTableCount('data/rag.sqlite', 'rag_documents'),
            activeCron: getTableCount('data/cron.sqlite', 'cron_schedules'),
            latestLogs: getLatestLogs(10),
            charts: {
                taskDonut: generateDonutChart(tasks),
                complexityBar: generateBarChart(['Low', 'Med', 'High'], [45, 82, 19]) // Placeholder for next task
            }
        };
        res.setHeader('Content-Type', 'application/json');
        res.end(JSON.stringify(stats));
        return;
    }

    res.statusCode = 200;
    res.setHeader('Content-Type', 'text/html');
    res.end(`
    <html>
      <head>
        <title>AI Agent Dashboard</title>
        <style>
          body { font-family: 'Inter', sans-serif; background: #0f172a; color: #f8fafc; padding: 2rem; margin: 0; }
          .grid { display: grid; grid-template-columns: repeat(auto-fit, minmax(300px, 1fr)); gap: 1.5rem; }
          .card { background: rgba(30, 41, 59, 0.7); backdrop-filter: blur(8px); border: 1px solid rgba(255,255,255,0.1); padding: 1.5rem; border-radius: 12px; }
          h1 { font-size: 1.8rem; margin-bottom: 2rem; background: linear-gradient(to right, #818cf8, #c084fc); -webkit-background-clip: text; -webkit-text-fill-color: transparent; }
          .chart-container { height: 200px; }
          svg { width: 100%; height: 100%; }
        </style>
      </head>
      <body>
        <h1>AI Agent Dashboard</h1>
        <div class="grid">
          <div class="card">
            <h3>Task Distribution</h3>
            <div id=" donut-chart" class="chart-container">Loading...</div>
          </div>
          <div class="card">
            <h3>Complexity Analysis</h3>
            <div id="bar-chart" class="chart-container">Loading...</div>
          </div>
        </div>
        <script>
          fetch('/api/stats')
            .then(res => res.json())
            .then(data => {
              document.getElementById('donut-chart').innerHTML = data.charts.taskDonut;
              document.getElementById('bar-chart').innerHTML = data.charts.complexityBar;
            });
        </script>
      </body>
    </html>
  `);
});

server.listen(PORT, () => {
    console.log(`Dashboard running at http://localhost:${PORT}`);
});
