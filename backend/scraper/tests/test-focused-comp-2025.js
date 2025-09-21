const puppeteer = require('puppeteer');

// Test scraper focused on COMP 2025 without Firebase
class TestCOMP2025Scraper {
  constructor() {
    this.browser = null;
    this.scrapedClasses = [];
  }

  async init() {
    console.log('Initializing browser...');
    this.browser = await puppeteer.launch({
      headless: true,
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

  async getSubjectAreas(page) {
    console.log('Getting COMP subject area...');
    
    try {
      await page.goto('https://timetable.unsw.edu.au/2025/subjectSearch.html', { 
        waitUntil: 'networkidle0',
        timeout: 30000 
      });
      
      await new Promise(resolve => setTimeout(resolve, 2000));

      const subjectAreas = await page.evaluate(() => {
        // Look for COMP subject code links  
        const links = Array.from(document.querySelectorAll('a')).filter(link => {
          const href = link.href || '';
          const text = link.textContent?.trim() || '';
          
          // Look for links that go to COMP subject page
          return href.includes('/2025/COMPKENS.html') && text === 'COMP';
        });
        
        return links.map(link => ({
          name: link.textContent?.trim() || '',
          url: link.href
        })).filter(item => item.name && item.url);
      });
    
      console.log(`Found ${subjectAreas.length} COMP subject areas`);
      return subjectAreas;
    } catch (error) {
      console.error('Error getting subject areas:', error.message);
      return [];
    }
  }

  async getCoursesForSubject(page, subjectUrl) {
    await page.goto(subjectUrl, { waitUntil: 'networkidle0' });
    
    return await page.evaluate(() => {
      // Look for COMP course links
      const links = Array.from(document.querySelectorAll('a')).filter(link => {
        const text = link.textContent?.trim() || '';
        const href = link.href || '';
        
        // Match COMP course code pattern (e.g., COMP1511) and has corresponding .html link
        return text.match(/^COMP\d{4}$/) && href.includes('.html');
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
        
        // Look for course title
        const titleMatch = pageText.match(/([A-Z]{4}\d{4})\s+(.+?)(?=\n|Faculty)/);
        const courseCode = titleMatch ? titleMatch[1] : '';
        const courseName = titleMatch ? titleMatch[2].trim() : '';

        // For 2025, use the new data structure approach
        const dataElements = Array.from(document.querySelectorAll('.data'));
        const dataTexts = dataElements.map(el => el.innerText?.trim() || '');
        
        let foundClasses = [];
        const seenClasses = new Set();
        
        // Look for class data sequences in the 2025 format
        for (let i = 0; i < dataTexts.length - 8; i++) {
          const potential = dataTexts.slice(i, i + 10);
          
          const classId = parseInt(potential[0]);
          if (isNaN(classId) || classId < 1000) continue;
          
          const statusIndex = potential.findIndex(text => 
            text === 'Open' || text === 'Full' || text === 'On Hold'
          );
          
          const enrolmentIndex = potential.findIndex(text => text.match(/^\d+\/\d+$/));
          
          const termIndex = potential.findIndex(text => text === 'T3');
          
          if (statusIndex > 0 && statusIndex < 5 && 
              enrolmentIndex > 0 && enrolmentIndex < 5 && 
              termIndex > 0 && termIndex < 8) {
            
            const section = potential[1] || '';
            const status = potential[statusIndex] || '';
            const enrolment = potential[enrolmentIndex] || '';
            const term = potential[termIndex] || '';
            
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
            
            const [enrolled, capacity] = enrolment.split('/').map(num => parseInt(num) || 0);
            
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
                mode: 'In Person',
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

      console.log(`Found ${courseData.classes.length} classes in ${courseData.courseCode}`);
      return courseData;
    } catch (error) {
      console.error(`Error scraping course ${courseUrl}:`, error.message);
      return null;
    }
  }

  async scrapeAllCourses() {
    const page = await this.browser.newPage();
    
    try {
      const subjectAreas = await this.getSubjectAreas(page);
      
      if (subjectAreas.length === 0) {
        console.log('No COMP subject area found!');
        return [];
      }

      const compArea = subjectAreas[0]; // Should be COMP
      console.log(`Processing: ${compArea.name}`);
      const courses = await this.getCoursesForSubject(page, compArea.url);
      console.log(`Found ${courses.length} COMP courses`);
      
      // Test with just a few courses
      const testCourses = courses.slice(0, 5);
      console.log(`Testing with ${testCourses.length} courses...`);
      
      for (const courseUrl of testCourses) {
        try {
          const courseCode = courseUrl.match(/([A-Z]{4}\d{4})\.html/)?.[1] || 'Unknown';
          console.log(`Scraping course: ${courseUrl} (${courseCode})`);
          
          const courseData = await this.scrapeCourse(page, courseUrl);
          if (courseData && courseData.classes.length > 0) {
            this.scrapedClasses.push(...courseData.classes);
          }
        } catch (error) {
          console.error(`Error processing course ${courseUrl}:`, error.message);
        }
      }

    } catch (error) {
      console.error('Error in scrapeAllCourses:', error.message);
    } finally {
      await page.close();
    }
  }

  async run() {
    try {
      await this.init();
      await this.scrapeAllCourses();
      
      console.log(`\n🎉 Scraping completed! Found ${this.scrapedClasses.length} total classes`);
      
      if (this.scrapedClasses.length > 0) {
        // Show summary
        const coursesSummary = {};
        const termsSummary = {};
        const statusSummary = {};
        
        this.scrapedClasses.forEach(cls => {
          coursesSummary[cls.courseCode] = (coursesSummary[cls.courseCode] || 0) + 1;
          termsSummary[cls.term] = (termsSummary[cls.term] || 0) + 1;
          statusSummary[cls.status] = (statusSummary[cls.status] || 0) + 1;
        });
        
        console.log('\n📊 Summary:');
        console.log('Courses:', Object.entries(coursesSummary).map(([course, count]) => `${course}: ${count}`).join(', '));
        console.log('Terms:', Object.entries(termsSummary).map(([term, count]) => `${term}: ${count}`).join(', '));
        console.log('Status:', Object.entries(statusSummary).map(([status, count]) => `${status}: ${count}`).join(', '));
        
        console.log('\n📋 Sample classes:');
        this.scrapedClasses.slice(0, 10).forEach(cls => {
          console.log(`   - ${cls.courseCode} Class ${cls.classID}: ${cls.section} ${cls.term} ${cls.activity} ${cls.status} (${cls.courseEnrolment.enrolments}/${cls.courseEnrolment.capacity})`);
        });
      }
      
    } catch (error) {
      console.error('Error in scraper:', error.message);
    } finally {
      if (this.browser) {
        await this.browser.close();
      }
    }
  }
}

// Run the test
const scraper = new TestCOMP2025Scraper();
scraper.run();
