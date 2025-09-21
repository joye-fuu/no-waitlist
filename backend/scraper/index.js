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
    console.log('🎯 COMP T3 2025 Scraper initialized');
    console.log('📊 Configuration: COMP courses only, Term 3 2025');
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
      await page.goto('https://timetable.unsw.edu.au/2025/subjectSearch.html', { 
        waitUntil: 'networkidle0',
        timeout: 30000 
      });

      // Wait a bit more for dynamic content
      await new Promise(resolve => setTimeout(resolve, 3000));

      // Get subject areas with more comprehensive selectors
      console.log('Looking for subject areas...');
      const subjectAreas = await this.getSubjectAreas(page);
      console.log(`Found ${subjectAreas.length} subject areas`);

      if (subjectAreas.length === 0) {
        console.log('No subject areas found. Checking page content...');
        const pageContent = await page.content();
        console.log('Page title:', await page.title());
        
        // Check for common elements that might indicate the page structure
        const links = await page.evaluate(() => {
          const allLinks = Array.from(document.querySelectorAll('a'));
          return allLinks.slice(0, 10).map(link => ({
            text: link.textContent?.trim() || '',
            href: link.href || ''
          }));
        });
        console.log('Sample links found:', links);
        
        // Return early if no subject areas found
        return [];
      }

      // Filter to only COMP courses for 2025
      const compAreas = subjectAreas.filter(area => area.name === 'COMP');
      
      if (compAreas.length === 0) {
        console.log('No COMP subject area found!');
        return [];
      }

      // Limit for test runs - but focus on COMP
      const areasToProcess = this.isTestRun ? compAreas.slice(0, 1) : compAreas;

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
    const subjectAreas = await page.evaluate(() => {
      // Look for subject code links (like ACCT, ACTL, AERO, etc.)
      const links = Array.from(document.querySelectorAll('a')).filter(link => {
        const href = link.href || '';
        const text = link.textContent?.trim() || '';
        
        // Look for links that go to subject pages (pattern: /2025/SUBJECTKENS.html)
        return href.match(/\/2025\/[A-Z]{4}KENS\.html$/) && 
               text.match(/^[A-Z]{4}$/) && 
               text.length === 4;
      });
      
      return links.map(link => ({
        name: link.textContent?.trim() || '',
        url: link.href
      })).filter(item => item.name && item.url);
    });
    
    console.log(`DEBUG: Found ${subjectAreas.length} subject code links`);
    if (subjectAreas.length > 0) {
      console.log(`DEBUG: First few subjects:`, subjectAreas.slice(0, 5));
    }
    
    return subjectAreas;
  }

  async getCoursesForSubject(page, subjectUrl) {
    await page.goto(subjectUrl, { waitUntil: 'networkidle0' });
    
    return await page.evaluate(() => {
      // Look for course links that match pattern like COMP1511, COMP2041, etc.
      const links = Array.from(document.querySelectorAll('a')).filter(link => {
        const text = link.textContent?.trim() || '';
        const href = link.href || '';
        
        // Match course code pattern (e.g., COMP1511) and has corresponding .html link
        return text.match(/^[A-Z]{4}\d{4}$/) && href.includes('.html');
      });
      
      return links.map(link => link.href);
    });
  }

  async scrapeCourse(page, courseUrl) {
    try {
      await page.goto(courseUrl, { waitUntil: 'networkidle0' });

      const courseData = await page.evaluate(() => {
        // Extract course info from the page
        const pageText = document.body.textContent || '';
        
        // Look for course title - it should be in format like "COMP1511 Programming Fundamentals"
        const titleMatch = pageText.match(/([A-Z]{4}\d{4})\s+(.+?)(?=\n|Faculty)/);
        const courseCode = titleMatch ? titleMatch[1] : '';
        const courseName = titleMatch ? titleMatch[2].trim() : '';

        // For 2025, use the new data structure approach
        const dataElements = Array.from(document.querySelectorAll('.data'));
        const dataTexts = dataElements.map(el => el.innerText?.trim() || '');
        
        let foundClasses = [];
        const seenClasses = new Set(); // Avoid duplicates
        
        // Look for class data sequences in the 2025 format
        for (let i = 0; i < dataTexts.length - 12; i++) {
          const potential = dataTexts.slice(i, i + 15); // Increased window to capture more data
          
          // Check if this looks like a class record (2025 format)
          const classId = parseInt(potential[0]);
          if (isNaN(classId) || classId < 1000) continue;
          
          // Check for status indicators
          const statusIndex = potential.findIndex(text => 
            text === 'Open' || text === 'Full' || text === 'On Hold'
          );
          
          // Check for enrolment pattern
          const enrolmentIndex = potential.findIndex(text => text.match(/^\d+\/\d+$/));
          
          // Check for term indicator - FILTER FOR T3 ONLY
          const termIndex = potential.findIndex(text => text === 'T3');
          
          // Must have all three indicators and in reasonable positions, and must be T3
          if (statusIndex > 0 && statusIndex < 7 && 
              enrolmentIndex > 0 && enrolmentIndex < 7 && 
              termIndex > 0 && termIndex < 10) {
            
            // Extract the structured data
            const section = potential[1] || '';
            const status = potential[statusIndex] || '';
            const enrolment = potential[enrolmentIndex] || '';
            const term = potential[termIndex] || '';
            
            // Try to find activity (look around the term)
            let activity = '';
            for (let j = Math.max(0, termIndex - 3); j < Math.min(potential.length, termIndex + 3); j++) {
              if (potential[j] && (
                potential[j].includes('Lecture') || 
                potential[j].includes('Tutorial') || 
                potential[j].includes('Laboratory') ||
                potential[j].includes('Course Enrolment')
              )) {
                activity = potential[j];
                break;
              }
            }
            
            // Parse time information - look for complex time patterns in 2025 format
            let startTime = '';
            let endTime = '';
            let dayOfWeek = '';
            let fullSchedule = '';
            
            for (let j = 0; j < potential.length; j++) {
              const text = potential[j];
              
              // Look for complex schedule patterns like "Wed 11:00 - 13:00 (Weeks:1-5,7-10)"
              const complexScheduleMatch = text.match(/^(Mon|Tue|Wed|Thu|Fri|Sat|Sun)\s+(\d{1,2}:\d{2})\s*-\s*(\d{1,2}:\d{2})/);
              if (complexScheduleMatch) {
                dayOfWeek = complexScheduleMatch[1];
                startTime = complexScheduleMatch[2];
                endTime = complexScheduleMatch[3];
                fullSchedule = text;
                break; // Take the first schedule found
              }
              
              // Look for simple time patterns like "11:00 - 13:00"
              const simpleTimeMatch = text.match(/^(\d{1,2}:\d{2})\s*-\s*(\d{1,2}:\d{2})$/);
              if (simpleTimeMatch && !startTime) {
                startTime = simpleTimeMatch[1];
                endTime = simpleTimeMatch[2];
              }
              
              // Look for standalone day patterns (Mon, Tue, Wed, Thu, Fri, Sat, Sun)
              if (text.match(/^(Mon|Tue|Wed|Thu|Fri|Sat|Sun)$/) && !dayOfWeek) {
                dayOfWeek = text;
              }
            }
            
            // Parse location information - use much wider search window (location is 140+ elements later)
            let location = '';
            let building = '';
            let room = '';
            
            // Location data appears much later in the sequence (140+ elements), so search a very wide range
            const locationSearchWindow = dataTexts.slice(i, Math.min(dataTexts.length, i + 150));
            
            for (let j = 0; j < locationSearchWindow.length; j++) {
              const text = locationSearchWindow[j];
              
              // Look for venue patterns like "Quadrangle G048 (K-E15-G048)" or "Online (ONLINE)"
              const venueMatch = text.match(/^([A-Za-z\s]+)\s+([A-Za-z0-9]+)\s*\(([^)]+)\)$/);
              if (venueMatch && !location) {
                building = venueMatch[1].trim();
                room = venueMatch[2].trim();
                location = text;
                break; // Take the first proper venue found
              }
              
              // Look for online indicators with parentheses like "Online (ONLINE)"
              if (text.match(/^Online\s*\([^)]+\)$/i) && !location) {
                location = text;
                building = 'Online';
                room = '';
                break;
              }
              
              // Look for simple building room patterns like "CLB 7", "Matthews 311"
              const simpleVenueMatch = text.match(/^([A-Za-z]{2,})\s+([A-Za-z0-9]{1,4})$/);
              if (simpleVenueMatch && 
                  !text.match(/^(Open|Full|On Hold|T1|T2|T3|Course Enrolment|Laboratory|Tutorial|Lecture|TERM|Teaching)$/i) &&
                  !text.match(/^\d+\/\d+$/) &&
                  !text.match(/^[A-Z]\d{2,3}[A-Z]?$/) && // Section codes like H11A
                  text.length > 3 && text.length < 20 && !location) {
                building = simpleVenueMatch[1];
                room = simpleVenueMatch[2];
                location = text;
                break;
              }
            }
            
            // Parse enrolment
            const [enrolled, capacity] = enrolment.split('/').map(num => parseInt(num) || 0);
            
            // Create unique key to avoid duplicates
            const classKey = `${classId}-${term}-${activity}`;
            if (!seenClasses.has(classKey) && enrolled >= 0 && capacity > 0) {
              seenClasses.add(classKey);
              
              foundClasses.push({
                courseCode,
                courseName,
                classID: classId,
                section: section,
                term: term,
                activity: activity || 'Unknown',
                status: status,
                courseEnrolment: {
                  enrolments: enrolled,
                  capacity: capacity
                },
                schedule: {
                  dayOfWeek: dayOfWeek || '',
                  startTime: startTime || '',
                  endTime: endTime || '',
                  timeDisplay: startTime && endTime ? `${startTime}-${endTime}` : '',
                  fullSchedule: fullSchedule || '' // Include the complete schedule string
                },
                location: {
                  full: location || '',
                  building: building || '',
                  room: room || ''
                },
                mode: location.toLowerCase().includes('online') ? 'Online' : 'In Person',
                lastUpdated: new Date().toISOString()
              });
            }
          }
        }
        
        return {
          courseCode,
          courseName,
          classes: foundClasses
        };
      });

      console.log(`Found ${courseData.classes.length} classes in course`);
      return courseData;
    } catch (error) {
      console.error(`Error scraping course ${courseUrl}:`, error.message);
      return null;
    }
  }

  async saveToFirestore() {
    console.log(`💾 Saving ${this.scrapedClasses.length} COMP T3 2025 classes to Firestore...`);
    
    if (this.scrapedClasses.length === 0) {
      console.log('⚠️  No classes to save');
      return;
    }
    
    // Show summary before saving
    const coursesSummary = {};
    const statusSummary = {};
    
    this.scrapedClasses.forEach(cls => {
      coursesSummary[cls.courseCode] = (coursesSummary[cls.courseCode] || 0) + 1;
      statusSummary[cls.status] = (statusSummary[cls.status] || 0) + 1;
    });
    
    console.log('📊 Summary of classes being saved:');
    console.log('Courses:', Object.entries(coursesSummary).map(([course, count]) => `${course}: ${count}`).join(', '));
    console.log('Status:', Object.entries(statusSummary).map(([status, count]) => `${status}: ${count}`).join(', '));
    
    const batch = db.batch();
    let batchCount = 0;
    
    for (const classData of this.scrapedClasses) {
      const docRef = db.collection('classes').doc(classData.classID.toString());
      batch.set(docRef, {
        ...classData,
        lastUpdated: admin.firestore.Timestamp.now(),
        scrapedFor: 'comp-t3-2025' // Add identifier for this specific scraper run
      }, { merge: true });
      
      batchCount++;
      
      // Firestore batch limit is 500
      if (batchCount === 500) {
        await batch.commit();
        console.log(`💾 Batch saved: ${batchCount} classes`);
        batchCount = 0;
      }
    }
    
    if (batchCount > 0) {
      await batch.commit();
    }
    
    console.log('✅ Successfully saved all COMP T3 2025 classes to Firestore');
  }
}

async function main() {
  const isTestRun = process.argv.includes('--test') || process.env.TEST_RUN === 'true';
  const scraper = new UNSWTimetableScraper(isTestRun);
  
  try {
    console.log('Starting UNSW COMP T3 2025 scraper...');
    console.log(`Test run: ${isTestRun}`);
    console.log('Target: COMP courses, Term 3 2025 only');
    
    await scraper.init();
    await scraper.scrapeAllCourses();
    await scraper.saveToFirestore();
    
    console.log(`🎉 COMP T3 2025 scraper completed successfully! Found ${scraper.scrapedClasses.length} classes`);
    process.exit(0);
  } catch (error) {
    console.error('COMP T3 2025 scraper failed:', error);
    process.exit(1);
  } finally {
    await scraper.close();
  }
}

if (require.main === module) {
  main();
}
