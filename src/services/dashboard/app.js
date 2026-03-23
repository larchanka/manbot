let allLogs = [];
let showingAll = false;
let lastDashboardState = {};

function showTab(tabId) {
    document.querySelectorAll('.tab-content').forEach(c => c.classList.remove('active'));
    document.querySelectorAll('.tab-btn').forEach(b => b.classList.remove('active'));

    document.getElementById(tabId + '-tab').classList.add('active');
    event.currentTarget.classList.add('active');
}

let lastIpcLogTimestamp = 0;
function updateIpcLogs() {
    fetch(`/api/ipc-logs?since=${lastIpcLogTimestamp}`)
        .then(r => r.json())
        .then(logs => {
            if (!logs || !logs.length) return;
            lastIpcLogTimestamp = Math.max(...logs.map(l => l.message.timestamp));
            const tbody = document.getElementById("ipc-table-body");
            if (!tbody) return;

            logs.forEach(log => {
                const tr = document.createElement("tr");
                const ts = new Date(log.message.timestamp);
                const tsStr = ts.getHours().toString().padStart(2, '0') + ':' + ts.getMinutes().toString().padStart(2, '0') + ':' + ts.getSeconds().toString().padStart(2, '0') + '.' + ts.getMilliseconds().toString().padStart(3, '0');

                let color = "var(--text)";
                if (log.message.type && log.message.type.includes("error")) color = "var(--error)";
                else if (log.message.type && log.message.type.includes("heartbeat")) color = "var(--text-muted)";
                else if (log.message.type && log.message.type.includes("event")) color = "var(--warning)";
                else if (log.message.type && log.message.type.includes("response")) color = "var(--success)";

                let routeHtml = '';
                if (log.direction === '←') {
                    routeHtml = `<span style="color:var(--text-muted)">${log.fromProcess}</span> <strong style="color:var(--primary)">→</strong> <span style="color:var(--text)">${log.toProcess}</span>`;
                } else {
                    routeHtml = `<span style="color:var(--text)">${log.fromProcess}</span> <strong style="color:var(--primary)">→</strong> <span style="color:var(--text-muted)">${log.toProcess}</span>`;
                }

                tr.innerHTML = `
                            <td style="color: var(--text-muted); font-size: 11px; font-family: monospace; padding-left: 20px;">${tsStr}</td>
                            <td style="font-size: 11px; font-family: monospace;">${routeHtml}</td>
                            <td style="color: ${color}; font-size: 11px; font-family: monospace; white-space: nowrap; overflow: hidden; text-overflow: ellipsis;" title="${log.message.type}">${log.message.type}</td>
                            <td style="font-size: 11px; font-family: monospace; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; padding-right: 20px;" title='${JSON.stringify(log.message.payload || {})}'>${JSON.stringify(log.message.payload || {})}</td>
                        `;
                tbody.insertBefore(tr, tbody.firstChild);
            });

            while (tbody.children.length > 200) tbody.removeChild(tbody.lastChild);
        }).catch(e => console.error(e));
}
setInterval(updateIpcLogs, 1000);
updateIpcLogs();

function getGraphLayout(nodes, edges) {
    if (!nodes || nodes.length === 0) return [];
    const nodeMap = {};
    nodes.forEach(n => nodeMap[n.id] = { ...n, incoming: 0, outgoing: [], level: 0 });
    (edges || []).forEach(e => {
        if (nodeMap[e.from] && nodeMap[e.to]) {
            nodeMap[e.from].outgoing.push(e.to);
            nodeMap[e.to].incoming++;
        }
    });

    // Assign levels
    let changed = true;
    let iterations = 0;
    while (changed && iterations < 100) {
        changed = false;
        iterations++;
        nodes.forEach(n => {
            const current = nodeMap[n.id];
            current.outgoing.forEach(nextId => {
                const next = nodeMap[nextId];
                if (next.level <= current.level) {
                    next.level = current.level + 1;
                    changed = true;
                }
            });
        });
    }

    const levels = [];
    Object.values(nodeMap).forEach(n => {
        if (!levels[n.level]) levels[n.level] = [];
        levels[n.level].push(n);
    });
    return levels.filter(l => l && l.length > 0);
}

function fmtDate(d) {
    const date = new Date(d);
    return `${date.getDate()} ${date.toLocaleString('en-US', { month: 'short' })}, ${date.getFullYear()} ${date.toLocaleTimeString('en-GB')}`;
}

function failTask(id) {
    if (!confirm("Mark this task as failed?")) return;
    fetch(`/api/fail-task?id=${id}`)
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

    // Check if logs actually changed before rendering
    const currentLogsHash = JSON.stringify(logsToRender);
    if (lastDashboardState.logsHash === currentLogsHash) return;
    lastDashboardState.logsHash = currentLogsHash;

    lt.innerHTML = logsToRender.map(l => {
        const tc = l.type?.includes("failed") ? "error" : (l.type?.includes("completed") ? "success" : "warning");
        const typeLabel = (l.type || "EVENT").split(".").pop();
        const mainContent = l.payload?.toolName || l.payload?.nodeId || l.message || "-";
        const args = l.payload ? JSON.stringify(l.payload, null, 2) : "";

        return `<tr class="log-row" onclick="const next = this.nextElementSibling; if(next) next.classList.toggle('open')">
                    <td style="padding-left: 20px; color: var(--text-muted); vertical-align: top; padding-top: 12px;">${fmtDate(l.time || l.timestamp || Date.now())}</td>
                    <td style="vertical-align: top; padding-top: 12px;"><span class="tag ${tc}">${typeLabel}</span></td>
                    <td style="padding-right: 20px; color: var(--text-muted); font-size: 13px; vertical-align: top; padding-top: 12px;">
                      <div style="font-weight: 600; color: var(--text);">${mainContent}</div>
                    </td>
                </tr>
                ${args ? `<tr class="log-details-row">
                    <td colspan="3">
                        <div class="log-details-container">
                            <div class="log-details-content">${args}</div>
                        </div>
                    </td>
                </tr>` : ""}`;
    }).join("");

    document.getElementById("show-more-btn").style.display = allLogs.length > 20 ? "inline-block" : "none";
}

function updateDashboard() {
    const dateSelect = document.getElementById("log-date-select");
    const date = dateSelect.value;

    fetch(`/api/stats${date ? '?date=' + date : ''}`)
        .then(r => r.json())
        .then(d => {
            // 1. Update Stats
            const statsChanged =
                lastDashboardState.rag !== d.rag ||
                lastDashboardState.cron !== d.cron ||
                lastDashboardState.maxNodes !== d.maxNodes ||
                JSON.stringify(lastDashboardState.tasks) !== JSON.stringify(d.tasks) ||
                JSON.stringify(lastDashboardState.timing) !== JSON.stringify(d.timing);

            if (statsChanged) {
                const total = Object.values(d.tasks).reduce((a, b) => a + b, 0);
                document.getElementById("task-total").textContent = total;
                document.getElementById("rag-count").textContent = d.rag;
                document.getElementById("cron-count").textContent = d.cron;
                document.getElementById("max-nodes").textContent = d.maxNodes || 0;
                document.getElementById("time-first").textContent = d.timing.first;
                document.getElementById("time-last").textContent = d.timing.last;
                document.getElementById("time-avg").textContent = d.timing.avg;

                lastDashboardState.rag = d.rag;
                lastDashboardState.cron = d.cron;
                lastDashboardState.maxNodes = d.maxNodes;
                lastDashboardState.tasks = d.tasks;
                lastDashboardState.timing = d.timing;
            }

            // 1.5 Update Processes
            const procsHash = JSON.stringify(d.processes);
            if (lastDashboardState.procsHash !== procsHash) {
                const pg = document.getElementById("processes-grid");
                if (pg && d.processes) {
                    const html = Object.keys(d.processes).sort().map(pName => {
                        const p = d.processes[pName];
                        const isDown = (Date.now() - (p.lastHeartbeat || 0)) > 30000;
                        const status = isDown ? "OFFLINE" : (p.status || "UNKNOWN").toUpperCase();
                        const tc = status === "OFFLINE" ? "error" : (status === "READY" ? "success" : "warning");
                        const indicator = status === "READY" ? '<div class="pulse"></div>' : '';
                        const restartLabel = p.restartCount ? `<div style="font-size: 11px; color: var(--error); margin-top: 5px; font-weight: 500;">Restarts: ${p.restartCount}</div>` : '';
                        const mem = p.memory && p.memory.rss ? `<div style="font-size: 11px; color: var(--text-muted); margin-top: 5px;">Mem: ${Math.round(p.memory.rss / 1024 / 1024)}MB</div>` : '';
                        const up = p.uptime ? `<div style="font-size: 11px; color: var(--text-muted);">Uptime: ${p.uptime}s</div>` : '';
                        return `<div class="card" style="padding: 15px;">
                                    <h2 style="margin-bottom: 10px;">${pName}</h2>
                                    <div style="display: flex; gap: 8px; flex-direction: column;">
                                        <div><span class="tag ${tc}">${indicator}${status}</span></div>
                                        <div>${mem}${up}</div>
                                    </div>
                                    ${restartLabel}
                                </div>`;
                    }).join("");
                    pg.innerHTML = html;
                }
                lastDashboardState.procsHash = procsHash;
            }

            // 2. Update Models
            const modelsHash = JSON.stringify(d.models);
            if (lastDashboardState.modelsHash !== modelsHash) {
                const modelsSection = document.getElementById("model-list");
                modelsSection.innerHTML = Object.entries(d.models)
                    .filter(([k]) => ['small', 'medium', 'large'].includes(k))
                    .map(([k, v]) => `<div class="model-pill"><span>${k.toUpperCase()}:</span><b>${v}</b></div>`)
                    .join("");
                lastDashboardState.modelsHash = modelsHash;
            }

            // 3. Update Charts
            const chartsHash = JSON.stringify(d.charts);
            if (lastDashboardState.chartsHash !== chartsHash) {
                document.getElementById("c1").innerHTML = d.charts.taskDonut;
                document.getElementById("c2").innerHTML = d.charts.compBar;
                lastDashboardState.chartsHash = chartsHash;
            }

            // 4. Update Active Queue
            const queueHash = JSON.stringify(d.pendingTasks);
            if (lastDashboardState.queueHash !== queueHash) {
                const qt = document.getElementById("qt");
                const qs = document.getElementById("active-queue-section");
                if (d.pendingTasks && d.pendingTasks.length > 0) {
                    qs.style.display = "block";
                    qt.innerHTML = d.pendingTasks.map(t => {
                        const isRunning = t.status === 'running' || t.status === 'finalizing';
                        let tc = "warning";
                        if (t.status === 'running') tc = "running";
                        else if (t.status === 'planning') tc = "planning";
                        else if (t.status === 'finalizing') tc = "finalizing";
                        const indicator = isRunning ? '<div class="pulse"></div>' : '';
                        return `<tr>
                                    <td style="padding-left: 20px; color: var(--text-muted); white-space: nowrap; vertical-align: top; padding-top: 15px; border-bottom: none;">${fmtDate(t.updated_at)}</td>
                                    <td style="white-space: nowrap; vertical-align: top; padding-top: 15px; border-bottom: none;"><span class="tag ${tc}">${indicator}${t.status.toUpperCase()}</span></td>
                                    <td style="white-space: nowrap; vertical-align: top; padding-top: 15px; border-bottom: none;"><span class="tag complexity-${t.complexity || 'unknown'}">${(t.complexity || 'unknown').toUpperCase()}</span></td>
                                    <td style="padding-top: 15px; border-bottom: none;">
                                        <div class="goal-text" data-title="${t.goal.replace(/"/g, '&quot;')}">${t.goal}</div>
                                    </td>
                                    <td style="padding-right: 20px; text-align: right; vertical-align: top; padding-top: 15px; border-bottom: none;">
                                        <button onclick="failTask('${t.id}')" style="cursor: pointer; font-size: 11px; padding: 2px 8px; border: 1px solid var(--border); border-radius: 4px; background: var(--bg); color: var(--error);">FAIL</button>
                                    </td>
                                </tr>
                                <tr>
                                    <td colspan="5" style="padding-left: 20px; padding-right: 20px; padding-bottom: 20px; border-top: none;">
                                        <div class="node-map">
                                            ${(() => {
                                const levels = getGraphLayout(t.nodes || [], t.edges || []);
                                return levels.map(level => `
                                                    <div class="node-stage">
                                                        ${level.map(n => {
                                    const activeIndicator = n.status === 'running' ? '<div class="pulse"></div>' : '';
                                    const typeLabel = n.type.split('.').pop().toUpperCase();
                                    let chipAttr = '';
                                    if (n.type === 'skill' && n.input) {
                                        try {
                                            const input = typeof n.input === 'string' ? JSON.parse(n.input) : n.input;
                                            const skillName = input.skillName || input.skill;
                                            if (skillName) chipAttr = ` data-title="Skill: ${skillName}"`;
                                        } catch (e) { }
                                    }
                                    return `<div class="node-chip ${n.status}"${chipAttr}>${activeIndicator}${typeLabel}</div>`;
                                }).join('')}
                                                    </div>
                                                `).join('<span style="color: var(--border); font-size: 14px; font-weight: 700;">➔</span>');
                            })()}
                                        </div>
                                    </td>
                                </tr>`;
                    }).join("");
                } else {
                    qs.style.display = "none";
                }
                lastDashboardState.queueHash = queueHash;
            }

            // 5. Update Logs
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

        if (!files.includes(today)) {
            files.unshift(today);
        }

        dateSelect.innerHTML = files.map(f => `<option value="${f}" ${f === today ? 'selected' : ''}>${f}</option>`).join("");
        updateDashboard();

        setInterval(updateDashboard, 5000);
    });