import http from 'node:http';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import Database from 'better-sqlite3';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const ROOT_DIR = path.join(__dirname, '..');

const PORT = process.env.PORT || 3001;

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
        console.error(`Error reading ${dbPath}:`, err);
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
        console.error('Error reading tasks.sqlite:', err);
        return {};
    }
}

function getCronStats() {
    try {
        const dbPath = path.join(ROOT_DIR, 'data/cron.sqlite');
        if (!fs.existsSync(dbPath)) return 0;
        const db = new Database(dbPath, { readonly: true });
        const row = db.prepare(`SELECT count(*) as count FROM cron_schedules WHERE enabled = 1`).get();
        db.close();
        return row.count;
    } catch (err) {
        console.error('Error reading cron.sqlite:', err);
        return 0;
    }
}

// Log Helpers
function getLatestLogs(n = 20) {
    try {
        const logPath = path.join(ROOT_DIR, 'logs/events.log');
        if (!fs.existsSync(logPath)) return [];

        const content = fs.readFileSync(logPath, 'utf8');
        const lines = content.trim().split('\n').filter(Boolean);
        return lines.slice(-n).map(line => JSON.parse(line)).reverse();
    } catch (err) {
        console.error('Error reading events.log:', err);
        return [];
    }
}

const server = http.createServer((req, res) => {
    if (req.url === '/api/stats') {
        const stats = {
            tasks: getTaskStats(),
            ragDocuments: getTableCount('data/rag.sqlite', 'rag_documents'),
            activeCron: getCronStats(),
            latestLogs: getLatestLogs(20)
        };
        res.setHeader('Content-Type', 'application/json');
        res.end(JSON.stringify(stats, null, 2));
        return;
    }

    res.statusCode = 200;
    res.setHeader('Content-Type', 'text/html');
    res.end(`
    <html>
      <head>
        <title>AI Agent Dashboard</title>
        <style>
          body { font-family: sans-serif; background: #121212; color: #eee; padding: 2rem; }
          pre { background: #1e1e1e; padding: 1rem; border-radius: 4px; overflow: auto; }
          h1 { color: #4f46e5; }
        </style>
      </head>
      <body>
        <h1>AI Agent Dashboard (Data Extraction Test)</h1>
        <button onclick="location.reload()">Refresh</button>
        <div id="stats">
          <h2>Summary</h2>
          <pre id="summary">Loading...</pre>
          <h2>Latest Logs</h2>
          <pre id="logs">Loading...</pre>
        </div>
        <script>
          fetch('/api/stats')
            .then(res => res.json())
            .then(data => {
              document.getElementById('summary').textContent = JSON.stringify({
                tasks: data.tasks,
                ragDocuments: data.ragDocuments,
                activeCron: data.activeCron
              }, null, 2);
              document.getElementById('logs').textContent = JSON.stringify(data.latestLogs, null, 2);
            });
        </script>
      </body>
    </html>
  `);
});

server.listen(PORT, () => {
    console.log(`Dashboard running at http://localhost:${PORT}`);
});
