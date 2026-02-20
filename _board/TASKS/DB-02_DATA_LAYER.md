# DB-02: SQLite and Log Data Extraction

**File**: `/stats/app.js`  
**Dependencies**: DB-01  
**Phase**: 2 - Data Layer

## Description
Implement the logic to extract data from the SQLite databases and the NDJSON log file.

## Acceptance Criteria
- Implements `getTaskStats()`: Query `tasks.sqlite` for counts of status types.
- Implements `getRagStats()`: Query `rag.sqlite` for total document count.
- Implements `getCronStats()`: Query `cron.sqlite` for active schedules.
- Implements `getLatestLogs(n)`: Reads the last N lines of `logs/events.log`.
- Handles missing files gracefully (returns empty data instead of crashing).

## Implementation Notes
- Use `require('better-sqlite3')` for database access.
- Use `fs.readFileSync` or a stream for logs. Since this is a simple internal tool, reading the last few KB of the file is acceptable.
- Path resolution should handle being run from the project root.
