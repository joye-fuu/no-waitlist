# Firebase Setup for COMP T3 2025 Scraper

## Project Overview

This scraper focuses specifically on:

- **COMP courses only** (Computer Science)
- **T3 2025 term** (Term 3, July-November 2025)
- **Real-time enrollment tracking** for waitlist functionality

## Required GitHub Secrets

You need to add these secrets to your GitHub repository:

### 1. FIREBASE_SERVICE_ACCOUNT_KEY

1. Go to [Firebase Console](https://console.firebase.google.com/)
2. Select your "no-waitlist" project
3. Go to Project Settings (gear icon) → Service Accounts
4. Click "Generate New Private Key"
5. Download the JSON file
6. Copy the ENTIRE contents of the JSON file
7. In GitHub: Go to your repo → Settings → Secrets and Variables → Actions
8. Click "New repository secret"
9. Name: `FIREBASE_SERVICE_ACCOUNT_KEY`
10. Value: Paste the entire JSON content

### 2. FIREBASE_PROJECT_ID

1. In GitHub: Add another secret
2. Name: `FIREBASE_PROJECT_ID`
3. Value: `no-waitlist`

## Enable Anonymous Authentication

1. Go to [Firebase Console](https://console.firebase.google.com/)
2. Select your "no-waitlist" project
3. Go to Authentication → Sign-in method
4. Click on "Anonymous"
5. Toggle "Enable" and click "Save"

This allows users to be automatically signed in without any login UI.

## Testing the Setup

1. Go to your GitHub repo → Actions tab
2. Find "UNSW COMP T3 2025 Scraper" workflow
3. Click "Run workflow" → Check "Test run" → Run workflow

This will run a limited test scrape of COMP T3 2025 courses to verify everything works.

## Troubleshooting Common Issues

### Exit Code 100 During Chrome Setup

If you see errors about missing packages like `libasound2`, this is due to package name changes in newer Ubuntu versions. The workflow has been updated to use the correct package names for Ubuntu 24.04.

### Exit Code 100 During Scraper Execution

This usually indicates:

1. **Missing GitHub Secrets** - Make sure both `FIREBASE_SERVICE_ACCOUNT_KEY` and `FIREBASE_PROJECT_ID` are set correctly
2. **Wrong Firebase Project ID** - Verify your project ID matches your Firebase project
3. **Firebase Permissions** - Ensure the service account has Firestore write permissions

Check the "Test Firebase connection" step in the GitHub Actions logs for specific error details.

## Manual Trigger

You can manually trigger the scraper anytime by:

1. Going to Actions tab
2. Selecting the workflow
3. Clicking "Run workflow"

## Viewing Scraped Data

After running the scraper, you can view the data in several ways:

### 1. Firebase Console (Recommended)

1. Go to [Firebase Console](https://console.firebase.google.com/)
2. Select your "no-waitlist" project
3. Go to Firestore Database
4. Look for the `classes` collection
5. Each document represents one class with data like:
   - `courseCode`: e.g., "COMP1511"
   - `courseName`: e.g., "Programming Fundamentals"
   - `classID`: Unique class identifier
   - `section`: e.g., "T09A"
   - `status`: "Open" or "Full"
   - `courseEnrolment`: enrollment numbers
   - `times`: class schedule
   - `lastUpdated`: when data was scraped

### 2. GitHub Actions Logs

1. Go to your repo → Actions tab
2. Click on the latest "UNSW COMP T3 2025 Scraper" run
3. Click on "scrape-comp-t3" job
4. Expand "Run COMP T3 2025 scraper" step
5. Look for logs like "Saving X COMP T3 2025 classes to Firestore..."

### 3. iOS App (Once Connected)

Your iOS app will read this COMP T3 2025 data automatically from Firestore to display available classes.

## Current Configuration

The scraper is configured for:

- **Subject:** COMP (Computer Science) only
- **Year:** 2025
- **Term:** T3 (Term 3) only
- **Data:** Real-time enrollment numbers (enrolled/capacity)
- **Schedule:** Runs every hour during T3 period

## Test Commands

Local testing (without Firebase):

```bash
cd backend/scraper
npm run test-comp-t3      # Test COMP T3 extraction
npm run test-actions      # Test GitHub Actions setup
```
