# DB-03: SVG Visualization Engine

**File**: `/stats/app.js`  
**Dependencies**: DB-01  
**Phase**: 3 - Visualization Engine

## Description
Implement helper functions to generate SVG chart strings from data arrays.

## Acceptance Criteria
- `generateBarChart(labels, values)`: Returns a string of SVG representing a bar chart.
- `generateLineChart(values)`: Returns a string of SVG representing an area/line trend.
- `generateDonutChart(data)`: Returns a string of SVG representing status distribution.
- Charts should be responsive (use `viewBox` and percentages).

## Implementation Notes
- Use plain template strings to build the `<svg>` and its children (`<rect>`, `<path>`, `<text>`).
- Define a consistent color palette for the SVGs.
- No external libraries like D3 or Chart.js allowed.
