# P12-09: Add Realistic Behavior to Browser Service

**File**: `src/services/browser-service.ts`  
**Dependencies**: P12-08  
**Phase**: 3 - Browser Service

## Description
Add human-like behaviors to bypass advanced bot detection mechanisms.

## Acceptance Criteria
- Adds random delay (100-500ms) before page interaction
- Implements realistic mouse movement to random coordinates
- Waits for network idle before extracting content
- Adds random scroll behavior for long pages
- Configures browser to disable automation flags
- Sets realistic browser headers (Accept-Language, Accept-Encoding, etc.)

## Implementation Notes
- Use `page.mouse.move()` with random coordinates
- Use `page.evaluate()` to scroll to random positions
- Set `navigator.webdriver = false` via page context
- Add random delays between actions using `page.waitForTimeout()`
- Set Accept-Language to common values (en-US, en-GB, etc.)
- Disable `--enable-automation` flag in browser launch args
