# DB-04: UI Design and Theming

**File**: `/stats/app.js`  
**Dependencies**: DB-01  
**Phase**: 4 - Dashboard UI

## Description
Implement the CSS design system and base HTML template for the dashboard.

## Acceptance Criteria
- Defines a `CSS` constant with modern dark-mode styles.
- Uses Inter or similar Google Font if possible, otherwise sleek sans-serif stack.
- Implements "Premium" aesthetics: glassmorphism effects, subtle gradients, and smooth hover transisitions.
- Responsive grid layout for metrics.

## Implementation Notes
- Use CSS variables for colors.
- Use `backdrop-filter: blur()` for that premium feel.
- Ensure the "Refresh" button looks like a primary action.
