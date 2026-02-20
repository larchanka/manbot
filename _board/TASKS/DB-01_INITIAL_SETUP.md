# DB-01: Initial Setup and Basic Server

**File**: `/stats/app.js`  
**Dependencies**: None  
**Phase**: 1 - Setup & Infrastructure

## Description
Initialize the `/stats` directory and create the basic Node.js HTTP server.

## Acceptance Criteria
- Directory `/stats` exists.
- File `/stats/app.js` created.
- Basic `http.createServer` implementation listening on port 3001.
- Responds with "Hello Dashboard" for all requests.
- Uses `builtin` modules only (`http`, `fs`, `path`).

## Implementation Notes
- Use `const http = require('node:http')`.
- Port should be configurable via env var `PORT` or default to 3001.
- Log "Dashboard running at http://localhost:3001" to console on start.
