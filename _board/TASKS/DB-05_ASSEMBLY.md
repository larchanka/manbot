# DB-05: Final Assembly and Integration

**File**: `/stats/app.js`  
**Dependencies**: DB-02, DB-03, DB-04  
**Phase**: 4 - Dashboard UI

## Description
Combine the data layer, visualization engine, and UI theme into the final request handler.

## Acceptance Criteria
- Request to `/` triggers data extraction.
- Extracted data is mapped to SVG generators and HTML components.
- Server returns a full, valid HTML5 document.
- Dashboard includes:
    - Summary Cards (Task counts, RAG docs).
    - SVG Charts (Complexity distribution, Recent activity).
    - Logs Table (Last 20 events).

## Implementation Notes
- Wrap everything in an `async` handler to manage DB/File reads.
- Add error boundaries so one failing DB doesn't break the whole page.
