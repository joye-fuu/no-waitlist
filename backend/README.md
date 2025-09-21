# UNSW COMP T3 2025 Scraper

Backend scraper for the UNSW waitlist app, focused on Computer Science courses in Term 3 2025.

## Overview

This scraper automatically extracts class enrollment data from the UNSW timetable website and stores it in Firebase Firestore for the iOS waitlist app.

## Configuration

- **Target:** COMP courses only (Computer Science)
- **Year:** 2025
- **Term:** T3 (Term 3) only
- **Data:** Class enrollment numbers, status, and schedule info
- **Frequency:** Runs every hour via GitHub Actions

## Local Development

### Prerequisites

- Node.js 18+
- Firebase service account key (for production)

### Setup

```bash
cd backend/scraper
npm install
```

### Testing (No Firebase Required)

```bash
# Test COMP T3 2025 extraction
npm run test-comp-t3

# Test GitHub Actions compatibility
npm run test-actions

# Test single course extraction
node test-updated-2025.js
```

### Firebase Testing (Requires Service Account)

```bash
# Test Firebase connection and permissions
npm run test-firebase
```

### Production Run (Requires Firebase)

```bash
# Test run (limited courses)
npm run test

# Full run (all COMP T3 courses)
npm run scrape
```

## File Structure

- `index.js` - Main scraper class with COMP T3 2025 logic
- `test-*.js` - Various test scripts for debugging
- `package.json` - Dependencies and scripts

## GitHub Actions

The scraper runs automatically via GitHub Actions:

- Workflow: `.github/workflows/scraper.yml`
- Schedule: Every hour during T3 2025
- Manual trigger: Available in Actions tab

## Data Output

Each scraped class includes:

```json
{
  "courseCode": "COMP1511",
  "courseName": "Programming Fundamentals",
  "classID": 9301,
  "section": "1UGA",
  "term": "T3",
  "activity": "Lecture",
  "status": "Open",
  "courseEnrolment": {
    "enrolments": 329,
    "capacity": 350
  },
  "mode": "In Person",
  "lastUpdated": "2025-09-21T...",
  "scrapedFor": "comp-t3-2025"
}
```

## Testing

The `tests/` folder contains various test scripts for debugging and validation:

```bash
# Test Firebase connection
npm run test-firebase

# Test scraping logic (any term)
npm run test-any-term

# Test specific COMP T3 2025 scraping
npm run test-comp-t3

# Test GitHub Actions compatibility
npm run test-actions

# Test schedule and location parsing
npm run test-schedule
npm run test-location
```

See `tests/README.md` for detailed test documentation.

## Troubleshooting

- **No classes found:** Normal if T3 hasn't started or COMP courses aren't published yet
- **Chrome errors:** GitHub Actions includes all required dependencies
- **Firebase errors:** Check service account permissions in Firebase Console

For detailed setup instructions, see `/FIREBASE_SETUP.md`
