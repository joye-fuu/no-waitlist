const puppeteer = require('puppeteer');
const admin = require('firebase-admin');
const fs = require('fs');

// Initialize Firebase Admin
let firebaseConfig;

if (fs.existsSync('./firebase-service-account.json')) {
  // GitHub Actions or local development with service account file
  const serviceAccount = require('./firebase-service-account.json');
  firebaseConfig = {
    credential: admin.credential.cert(serviceAccount),
    projectId: process.env.FIREBASE_PROJECT_ID || 'no-waitlist'
  };
} else {
  // Local development fallback - won't work but won't crash
  console.error('Firebase service account not found. This scraper needs to run in GitHub Actions.');
  console.error('To test locally, you would need to:');
  console.error('1. Download your Firebase service account key');
  console.error('2. Save it as firebase-service-account.json in this directory');
  console.error('3. Never commit this file to git!');
  process.exit(1);
}

admin.initializeApp(firebaseConfig);

const db = admin.firestore();

class UNSWTimetableScraper {
  constructor(isTestRun = false) {
    this.browser = null;
    this.isTestRun = isTestRun;
    this.scrapedClasses = [];
  }

  async init() {
    console.log('Initializing browser...');
    this.browser = await puppeteer.launch({
      headless: true,  // Updated for newer Puppeteer versions
      args: [
        '--no-sandbox',
        '--disable-setuid-sandbox',
        '--disable-dev-shm-usage',
        '--disable-accelerated-2d-canvas',
        '--no-first-run',
        '--no-zygote',
        '--single-process',
        '--disable-gpu',
        '--disable-web-security',
        '--disable-features=VizDisplayCompositor'
      ]
    });
  }

  async close() {
    if (this.browser) {
      await this.browser.close();
    }
  }

  async scrapeAllCourses() {
    const page = await this.browser.newPage();
    
    try {
      console.log('Navigating to UNSW timetable...');
      await page.goto('https://timetable.unsw.edu.au/', { 
        waitUntil: 'networkidle0',
        timeout: 30000 
      });

      // Get subject areas
      const subjectAreas = await this.getSubjectAreas(page);
      console.log(`Found ${subjectAreas.length} subject areas`);

      // Limit for test runs
      const areasToProcess = this.isTestRun ? subjectAreas.slice(0, 2) : subjectAreas;

      for (const subjectArea of areasToProcess) {
        try {
          console.log(`Processing: ${subjectArea.name}`);
          const courses = await this.getCoursesForSubject(page, subjectArea.url);
          
          // Limit courses per subject for test runs
          const coursesToProcess = this.isTestRun ? courses.slice(0, 5) : courses;
          
          for (const courseUrl of coursesToProcess) {
            try {
              const courseData = await this.scrapeCourse(page, courseUrl);
              if (courseData && courseData.classes) {
                this.scrapedClasses.push(...courseData.classes);
              }
            } catch (error) {
              console.error(`Error scraping course ${courseUrl}:`, error.message);
            }
          }
        } catch (error) {
          console.error(`Error processing subject ${subjectArea.name}:`, error.message);
        }
      }

      return this.scrapedClasses;
    } finally {
      await page.close();
    }
  }

  async getSubjectAreas(page) {
    return await page.evaluate(() => {
      const links = Array.from(document.querySelectorAll('a[href*="subject-area"]'));
      return links.map(link => ({
        name: link.textContent?.trim() || '',
        url: link.href
      })).filter(item => item.name && item.url);
    });
  }

  async getCoursesForSubject(page, subjectUrl) {
    await page.goto(subjectUrl, { waitUntil: 'networkidle0' });
    
    return await page.evaluate(() => {
      const links = Array.from(document.querySelectorAll('a[href*="/course/"]'));
      return links.map(link => link.href);
    });
  }

  async scrapeCourse(page, courseUrl) {
    try {
      await page.goto(courseUrl, { waitUntil: 'networkidle0' });

      const courseData = await page.evaluate(() => {
        // Extract course info
        const courseCodeElement = document.querySelector('h1');
        const fullTitle = courseCodeElement?.textContent?.trim() || '';
        const parts = fullTitle.split(' ');
        const courseCode = parts[0] || '';
        const courseName = parts.slice(1).join(' ') || '';

        const classes = [];
        const classRows = document.querySelectorAll('table tbody tr');

        classRows.forEach(row => {
          const cells = row.querySelectorAll('td');
          if (cells.length < 7) return;

          // Extract enrollment data (format: "enrolled / capacity")
          const enrolmentText = cells[6]?.textContent?.trim() || '';
          const enrolmentMatch = enrolmentText.match(/(\d+)\s*\/\s*(\d+)/);
          const enrolments = enrolmentMatch ? parseInt(enrolmentMatch[1]) : 0;
          const capacity = enrolmentMatch ? parseInt(enrolmentMatch[2]) : 0;

          // Extract basic class info
          const classId = parseInt(cells[0]?.textContent?.trim()) || 0;
          const section = cells[1]?.textContent?.trim() || '';
          const term = cells[2]?.textContent?.trim() || '';
          const activity = cells[3]?.textContent?.trim() || '';
          const status = cells[4]?.textContent?.trim() || '';
          const termDatesText = cells[5]?.textContent?.trim() || '';
          
          // Parse term dates
          const dateParts = termDatesText.split(' - ');
          const termDates = {
            start: dateParts[0] || '',
            end: dateParts[1] || ''
          };

          // Extract times and locations from the complex cell
          const timesCell = cells[7]?.innerHTML || '';
          const times = parseTimesAndLocations(timesCell);

          if (classId > 0) {
            classes.push({
              courseCode,
              courseName,
              classID: classId,
              section,
              term,
              activity,
              status,
              courseEnrolment: {
                enrolments,
                capacity
              },
              termDates,
              mode: 'In Person',
              times,
              notes: cells[8]?.textContent?.trim() || undefined,
              lastUpdated: new Date().toISOString()
            });
          }
        });

        // Helper function to parse times and locations
        function parseTimesAndLocations(html) {
          // This is a simplified parser - you may need to enhance this
          // based on the actual HTML structure of the timetable
          const times = [];
          
          // Remove HTML tags and split by lines
          const text = html.replace(/<[^>]*>/g, '\n').split('\n').filter(line => line.trim());
          
          for (let i = 0; i < text.length; i++) {
            const line = text[i].trim();
            
            // Look for day patterns (Mon, Tue, Wed, etc.)
            const dayMatch = line.match(/(Mon|Tue|Wed|Thu|Fri|Sat|Sun)/);
            if (dayMatch) {
              // Try to find time pattern in the same or next line
              const timeMatch = (line + ' ' + (text[i + 1] || '')).match(/(\d{1,2}:\d{2})\s*-\s*(\d{1,2}:\d{2})/);
              
              if (timeMatch) {
                times.push({
                  day: dayMatch[1],
                  time: {
                    start: timeMatch[1],
                    end: timeMatch[2]
                  },
                  weeks: '1-10', // Default - would need better parsing
                  location: 'TBA' // Would need better parsing
                });
              }
            }
          }
          
          return times;
        }

        return {
          courseCode,
          courseName,
          classes
        };
      });

      return courseData;
    } catch (error) {
      console.error(`Error scraping course ${courseUrl}:`, error.message);
      return null;
    }
  }

  async saveToFirestore() {
    console.log(`Saving ${this.scrapedClasses.length} classes to Firestore...`);
    
    const batch = db.batch();
    let batchCount = 0;
    
    for (const classData of this.scrapedClasses) {
      const docRef = db.collection('classes').doc(classData.classID.toString());
      batch.set(docRef, {
        ...classData,
        lastUpdated: admin.firestore.Timestamp.now()
      }, { merge: true });
      
      batchCount++;
      
      // Firestore batch limit is 500
      if (batchCount === 500) {
        await batch.commit();
        batchCount = 0;
      }
    }
    
    if (batchCount > 0) {
      await batch.commit();
    }
    
    console.log('Successfully saved to Firestore');
  }
}

async function main() {
  const isTestRun = process.argv.includes('--test') || process.env.TEST_RUN === 'true';
  const scraper = new UNSWTimetableScraper(isTestRun);
  
  try {
    console.log('Starting UNSW timetable scraper...');
    console.log(`Test run: ${isTestRun}`);
    
    await scraper.init();
    await scraper.scrapeAllCourses();
    await scraper.saveToFirestore();
    
    console.log('Scraper completed successfully!');
    process.exit(0);
  } catch (error) {
    console.error('Scraper failed:', error);
    process.exit(1);
  } finally {
    await scraper.close();
  }
}

if (require.main === module) {
  main();
}
