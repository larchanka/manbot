# P12-01: Add Required Dependencies

**File**: `package.json`  
**Dependencies**: None  
**Phase**: 1 - Dependencies and Configuration

## Description
Add Playwright, stealth plugin, and HTML-to-Markdown conversion libraries to the project.

## Acceptance Criteria
- Add `playwright` to dependencies
- Add `playwright-extra` to dependencies
- Add `puppeteer-extra-plugin-stealth` to dependencies
- Add `turndown` to dependencies
- Add `@types/turndown` to devDependencies
- Run `npm install` successfully
- All dependencies are compatible with Node.js 20+

## Implementation Notes
- Use latest stable versions of all packages
- Verify compatibility between `playwright-extra` and `playwright` versions
- Check that `puppeteer-extra-plugin-stealth` works with Playwright (not just Puppeteer)
