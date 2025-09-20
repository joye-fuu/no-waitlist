import * as puppeteer from 'puppeteer';

/**
 * Adapted version of your UNSW timetable scraper for Firebase Functions
 * This integrates with your existing scraper logic
 */

export interface ScrapedClassData {
  courseCode: string;
  courseName: string;
  school: string;
  campus: string;
  career: string;
  termsOffered: string[];
  censusDates: string[];
  classes: ScrapedClass[];
}

export interface ScrapedClass {
  classID: number;
  section: string;
  term: string;
  activity: string;
  status: string;
  courseEnrolment: {
    enrolments: number;
    capacity: number;
  };
  termDates: {
    start: string;
    end: string;
  };
  mode: string;
  times: Array<{
    day: string;
    time: {
      start: string;
      end: string;
    };
    weeks: string;
    location: string;
  }>;
  notes?: string;
}

export class UNSWTimetableScraper {
  private browser: puppeteer.Browser | null = null;

  async init(): Promise<void> {
    this.browser = await puppeteer.launch({
      headless: 'new',
      args: [
        '--no-sandbox',
        '--disable-setuid-sandbox',
        '--disable-dev-shm-usage',
        '--disable-accelerated-2d-canvas',
        '--no-first-run',
        '--no-zygote',
        '--single-process',
        '--disable-gpu'
      ]
    });
  }

  async close(): Promise<void> {
    if (this.browser) {
      await this.browser.close();
    }
  }

  async scrapeAllCourses(): Promise<ScrapedClass[]> {
    if (!this.browser) {
      throw new Error('Browser not initialized. Call init() first.');
    }

    const page = await this.browser.newPage();
    
    try {
      // Navigate to UNSW timetable
      await page.goto('https://timetable.unsw.edu.au/', { 
        waitUntil: 'networkidle0',
        timeout: 30000 
      });

      // Get all subject area links
      const subjectAreas = await this.getSubjectAreas(page);
      console.log(`Found ${subjectAreas.length} subject areas`);

      const allClasses: ScrapedClass[] = [];

      // Process each subject area
      for (const subjectArea of subjectAreas.slice(0, 5)) { // Limit for testing
        try {
          console.log(`Processing subject area: ${subjectArea.name}`);
          const courses = await this.getCoursesForSubject(page, subjectArea.url);
          
          for (const courseUrl of courses.slice(0, 10)) { // Limit courses per subject
            try {
              const courseData = await this.scrapeCourse(page, courseUrl);
              if (courseData && courseData.classes) {
                allClasses.push(...courseData.classes);
              }
            } catch (error) {
              console.error(`Error scraping course ${courseUrl}:`, error);
            }
          }
        } catch (error) {
          console.error(`Error processing subject area ${subjectArea.name}:`, error);
        }
      }

      return allClasses;
    } finally {
      await page.close();
    }
  }

  private async getSubjectAreas(page: puppeteer.Page): Promise<{name: string, url: string}[]> {
    return await page.evaluate(() => {
      const links = Array.from(document.querySelectorAll('a[href*="subject-area"]'));
      return links.map(link => ({
        name: (link as HTMLElement).textContent?.trim() || '',
        url: (link as HTMLAnchorElement).href
      }));
    });
  }

  private async getCoursesForSubject(page: puppeteer.Page, subjectUrl: string): Promise<string[]> {
    await page.goto(subjectUrl, { waitUntil: 'networkidle0' });
    
    return await page.evaluate(() => {
      const links = Array.from(document.querySelectorAll('a[href*="/course/"]'));
      return links.map(link => (link as HTMLAnchorElement).href);
    });
  }

  private async scrapeCourse(page: puppeteer.Page, courseUrl: string): Promise<ScrapedClassData | null> {
    try {
      await page.goto(courseUrl, { waitUntil: 'networkidle0' });

      // Extract course information
      const courseData = await page.evaluate(() => {
        // Course basic info
        const courseCodeElement = document.querySelector('h1');
        const courseCode = courseCodeElement?.textContent?.trim().split(' ')[0] || '';
        const courseName = courseCodeElement?.textContent?.trim().replace(courseCode, '').trim() || '';

        // Extract class data
        const classes: any[] = [];
        const classRows = document.querySelectorAll('table tbody tr');

        classRows.forEach((row, index) => {
          const cells = row.querySelectorAll('td');
          if (cells.length < 8) return;

          // Extract enrolment data
          const enrolmentText = cells[6]?.textContent?.trim() || '';
          const enrolmentMatch = enrolmentText.match(/(\d+)\s*\/\s*(\d+)/);
          const enrolments = enrolmentMatch ? parseInt(enrolmentMatch[1]) : 0;
          const capacity = enrolmentMatch ? parseInt(enrolmentMatch[2]) : 0;

          // Simple time extraction - you'll need to adapt your existing logic
          const timesAndLocations: any[] = [];

          const classData = {
            classID: parseInt(cells[0]?.textContent?.trim() || '0'),
            section: cells[1]?.textContent?.trim() || '',
            term: cells[2]?.textContent?.trim() || '',
            activity: cells[3]?.textContent?.trim() || '',
            status: cells[4]?.textContent?.trim() || '',
            courseEnrolment: {
              enrolments,
              capacity
            },
            termDates: {
              start: cells[5]?.textContent?.trim().split(' - ')[0] || '',
              end: cells[5]?.textContent?.trim().split(' - ')[1] || ''
            },
            mode: 'In Person', // Default, could be extracted
            times: timesAndLocations,
            notes: cells[8]?.textContent?.trim() || undefined
          };

          if (classData.classID > 0) {
            classes.push(classData);
          }
        });

        return {
          courseCode,
          courseName,
          school: 'Unknown', // Extract if available
          campus: 'Sydney',
          career: 'Undergraduate',
          termsOffered: [],
          censusDates: [],
          classes
        };
      });

      return courseData;
    } catch (error) {
      console.error(`Error scraping course ${courseUrl}:`, error);
      return null;
    }
  }
}

// Factory function for use in Firebase Functions
export async function scrapeUNSWTimetable(): Promise<ScrapedClass[]> {
  const scraper = new UNSWTimetableScraper();
  
  try {
    await scraper.init();
    const classes = await scraper.scrapeAllCourses();
    console.log(`Scraped ${classes.length} classes total`);
    return classes;
  } finally {
    await scraper.close();
  }
}
