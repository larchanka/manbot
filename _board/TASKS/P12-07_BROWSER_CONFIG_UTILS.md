# P12-07: Create Browser Configuration

**File**: `src/services/browser-config.ts`  
**Dependencies**: None  
**Phase**: 2 - Core Utilities

## Description
Create configuration for user agents, viewports, and stealth settings to bypass bot detection.

## Acceptance Criteria
- Exports array of 10+ realistic user agents (Chrome, Firefox, Safari on Windows, macOS, Linux)
- Exports array of common viewport sizes (1920x1080, 1366x768, 1536x864, etc.)
- Exports function `getRandomUserAgent(): string`
- Exports function `getRandomViewport(): { width: number, height: number }`
- Exports stealth plugin configuration object
- Includes JSDoc documentation explaining bot detection bypass techniques

## Implementation Notes
- Use recent browser versions in user agents (2024-2026)
- Include both desktop and mobile user agents
- Viewport sizes should match common screen resolutions
- Document which stealth features are enabled and why
