# Backend Scraper Tests

This folder contains test scripts for debugging and validating the UNSW timetable scraper functionality.

## Test Files

### Core Tests

- **`test-firebase.js`** - Tests Firebase connection and authentication
- **`test-github-actions.js`** - Validates scraper functionality for GitHub Actions environment

### Development/Debug Tests

- **`test-any-term.js`** - Tests parsing with any term (T1, T2, T3) for debugging
- **`test-focused-comp-2025.js`** - Focused test for COMP courses in 2025
- **`test-updated-2025.js`** - Tests updated scraper logic for 2025 HTML structure

### Feature-Specific Tests

- **`test-schedule-location.js`** - Tests schedule and location data extraction
- **`test-location-analysis.js`** - Analyzes location data patterns in HTML
- **`test-location-edge-cases.js`** - Tests enhanced location parsing for edge cases like COMP4920 tutorials
- **`test-final-logic.js`** - Tests final scraper logic with exact parsing code

## Location Edge Case Handling

The scraper uses a **multi-strategy approach** to handle location parsing edge cases:

### Strategy 1: Condensed Format Search

- Searches within 150 elements after class data
- Works for most standard classes
- Handles venue patterns like "Quadrangle G048 (K-E15-G048)"

### Strategy 2: Expanded Detailed Format Search

- Searches in detailed section (index 700+)
- Specifically handles COMP4920-style tutorials
- Matches class ID in expanded section and finds nearby location

### Strategy 3: Broad Pattern-Based Search

- Wide-range search with location candidates
- Pattern matching for known buildings (Quadrangle, Matthews, Goldstein, etc.)
- Distance-based ranking of location candidates

### HTML Entity Cleaning

Inspired by devsoc-unsw/timetable-scraper approach:

- Cleans `&nbsp;`, `&amp;`, `&lt;`, `&gt;`, etc.
- Validates location data with regex patterns
- Generates warnings for invalid/missing location data

### Example Results

```
COMP4920 Tutorial Classes:
✅ Class 6047 - "Goldstein G05 (K-D16-G05)" (Building: Goldstein, Room: G05)
✅ Class 5883 - "Science Theatre (K-F13-G09)" (Building: Science, Room: Theatre)
✅ Class 5884 - "Squarehouse 208 (K-E4-208)" (Building: Squarehouse, Room: 208)
⚠️  Class 2317 - No location found (likely legitimate missing data)
```

## Running Tests

From the scraper directory (`/backend/scraper/`):

### Using npm scripts (recommended):

```bash
# Core functionality tests
npm run test-firebase          # Test Firebase connection
npm run test-actions          # Test GitHub Actions setup
npm run test-comp-t3          # Test COMP T3 2025 scraping

# Development/debugging tests
npm run test-any-term         # Test parsing with any term
npm run test-schedule         # Test schedule parsing
npm run test-location         # Test location analysis
npm run test-location-edge    # Test location edge cases (COMP4920, etc.)
```

### Direct node commands:

```bash
# Run individual tests directly
node tests/test-firebase.js
node tests/test-any-term.js
node tests/test-focused-comp-2025.js

# Run with different configurations
node tests/test-github-actions.js --test
```

## Test Requirements

- Node.js with Puppeteer installed
- Internet connection for scraping live data
- Firebase credentials (for Firebase tests)

## Notes

- Tests use headless browsers by default
- Some tests may take 30+ seconds due to page loading
- Location and schedule tests validate the enhanced parsing logic
- Debug tests include detailed console output for troubleshooting
