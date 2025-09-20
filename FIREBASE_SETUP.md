# Firebase Setup for GitHub Actions

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
2. Find "UNSW Timetable Scraper" workflow
3. Click "Run workflow" → Check "Test run" → Run workflow

This will run a limited test scrape to verify everything works.

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
2. Click on the latest "UNSW Timetable Scraper" run
3. Click on "scrape-timetable" job
4. Expand "Run scraper" step
5. Look for logs like "Saving X classes to Firestore..."

### 3. iOS App (Once Connected)

Your iOS app will read this data automatically from Firestore to display available classes.
