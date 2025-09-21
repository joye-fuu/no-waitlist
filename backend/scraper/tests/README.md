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
- **`test-final-logic.js`** - Tests final scraper logic with exact parsing code

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
