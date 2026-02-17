# P12-03: Add Browser Service Configuration

**File**: `config.json`  
**Dependencies**: None  
**Phase**: 1 - Dependencies and Configuration

## Description
Add configuration section for browser service with sensible defaults.

## Acceptance Criteria
- Add `browserService` object to config.json
- Include properties: `headless`, `timeout`, `enableStealth`, `reuseContext`
- Set defaults: headless=true, timeout=30000, enableStealth=true, reuseContext=true
- Configuration is valid JSON
- No syntax errors

## Implementation Notes
- Keep timeout reasonable (30s) to avoid hanging requests
- Headless mode should be default for production
- Allow override via environment variables if needed
