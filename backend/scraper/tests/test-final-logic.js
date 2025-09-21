// Test the actual updated scraper logic
const puppeteer = require('puppeteer');

async function testActualScraperLogic() {
  console.log('🔧 Testing actual updated scraper logic...');
  
  const browser = await puppeteer.launch({
    headless: true,
    args: ['--no-sandbox', '--disable-setuid-sandbox', '--disable-dev-shm-usage']
  });
  
  const page = await browser.newPage();
  
  try {
    await page.goto('https://timetable.unsw.edu.au/2025/subjectSearch.html', { 
      waitUntil: 'networkidle0',
      timeout: 30000 
    });
    
    await new Promise(resolve => setTimeout(resolve, 3000));
    
    const compLink = await page.evaluate(() => {
      const links = Array.from(document.querySelectorAll('a'));
      const compLink = links.find(link => {
        const text = link.textContent?.trim();
        return text === 'COMP' && link.href.includes('COMPKENS.html');
      });
      return compLink ? compLink.href : null;
    });
    
    await page.goto(compLink, { waitUntil: 'networkidle0' });
    
    const courseLink = await page.evaluate(() => {
      const links = Array.from(document.querySelectorAll('a'));
      const courseLink = links.find(link => {
        const text = link.textContent?.trim();
        return text && text.match(/^COMP\d{4}$/);
      });
      return courseLink ? { href: courseLink.href, text: courseLink.textContent?.trim() } : null;
    });
    
    console.log(`📚 Testing with course: ${courseLink.text}`);
    await page.goto(courseLink.href, { waitUntil: 'networkidle0' });
    
    // Use the EXACT logic from the updated scraper
    const testResults = await page.evaluate(() => {
      const pageText = document.body.textContent || '';
      const titleMatch = pageText.match(/([A-Z]{4}\d{4})\s+(.+?)(?=\n|Faculty)/);
      const courseCode = titleMatch ? titleMatch[1] : '';
      const courseName = titleMatch ? titleMatch[2].trim() : '';
      
      const dataElements = Array.from(document.querySelectorAll('.data'));
      const dataTexts = dataElements.map(el => el.innerText?.trim() || '');
      
      let foundClasses = [];
      const seenClasses = new Set();
      
      for (let i = 0; i < dataTexts.length - 12; i++) {
        const potential = dataTexts.slice(i, i + 15);
        
        const classId = parseInt(potential[0]);
        if (isNaN(classId) || classId < 1000) continue;
        
        const statusIndex = potential.findIndex(text => 
          text === 'Open' || text === 'Full' || text === 'On Hold'
        );
        const enrolmentIndex = potential.findIndex(text => text.match(/^\d+\/\d+$/));
        const termIndex = potential.findIndex(text => text === 'T1' || text === 'T2' || text === 'T3');
        
        if (statusIndex > 0 && statusIndex < 7 && 
            enrolmentIndex > 0 && enrolmentIndex < 7 && 
            termIndex > 0 && termIndex < 10) {
          
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
          
          // EXACT TIME PARSING from updated scraper
          let startTime = '';
          let endTime = '';
          let dayOfWeek = '';
          let fullSchedule = '';
          
          const timeSearchWindow = dataTexts.slice(Math.max(0, i - 5), i + 25);
          
          for (let j = 0; j < timeSearchWindow.length; j++) {
            const text = timeSearchWindow[j];
            
            const complexScheduleMatch = text.match(/^(Mon|Tue|Wed|Thu|Fri|Sat|Sun)\s+(\d{1,2}:\d{2})\s*-\s*(\d{1,2}:\d{2})/);
            if (complexScheduleMatch) {
              dayOfWeek = complexScheduleMatch[1];
              startTime = complexScheduleMatch[2];
              endTime = complexScheduleMatch[3];
              fullSchedule = text;
              break;
            }
            
            const simpleTimeMatch = text.match(/^(\d{1,2}:\d{2})\s*-\s*(\d{1,2}:\d{2})$/);
            if (simpleTimeMatch && !startTime) {
              startTime = simpleTimeMatch[1];
              endTime = simpleTimeMatch[2];
            }
            
            if (text.match(/^(Mon|Tue|Wed|Thu|Fri|Sat|Sun)$/) && !dayOfWeek) {
              dayOfWeek = text;
            }
          }
          
          // EXACT LOCATION PARSING from updated scraper with 150 element window
          let location = '';
          let building = '';
          let room = '';
          
          const locationSearchWindow = dataTexts.slice(i, Math.min(dataTexts.length, i + 150));
          
          for (let j = 0; j < locationSearchWindow.length; j++) {
            const text = locationSearchWindow[j];
            
            const venueMatch = text.match(/^([A-Za-z\s]+)\s+([A-Za-z0-9]+)\s*\(([^)]+)\)$/);
            if (venueMatch && !location) {
              building = venueMatch[1].trim();
              room = venueMatch[2].trim();
              location = text;
              break;
            }
            
            if (text.match(/^Online\s*\([^)]+\)$/i) && !location) {
              location = text;
              building = 'Online';
              room = '';
              break;
            }
            
            const simpleVenueMatch = text.match(/^([A-Za-z]{2,})\s+([A-Za-z0-9]{1,4})$/);
            if (simpleVenueMatch && 
                !text.match(/^(Open|Full|On Hold|T1|T2|T3|Course Enrolment|Laboratory|Tutorial|Lecture|TERM|Teaching)$/i) &&
                !text.match(/^\d+\/\d+$/) &&
                !text.match(/^[A-Z]\d{2,3}[A-Z]?$/) &&
                text.length > 3 && text.length < 20 && !location) {
              building = simpleVenueMatch[1];
              room = simpleVenueMatch[2];
              location = text;
              break;
            }
          }
          
          const [enrolled, capacity] = enrolment.split('/').map(num => parseInt(num) || 0);
          
          const classKey = `${classId}-${term}-${activity}`;
          if (!seenClasses.has(classKey) && enrolled >= 0 && capacity > 0) {
            seenClasses.add(classKey);
            
            foundClasses.push({
              classID: classId,
              section: section,
              term: term,
              activity: activity || 'Unknown',
              status: status,
              enrolment: `${enrolled}/${capacity}`,
              schedule: {
                dayOfWeek: dayOfWeek || '',
                startTime: startTime || '',
                endTime: endTime || '',
                timeDisplay: startTime && endTime ? `${startTime}-${endTime}` : '',
                fullSchedule: fullSchedule || ''
              },
              location: {
                full: location || '',
                building: building || '',
                room: room || ''
              },
              mode: location.toLowerCase().includes('online') ? 'Online' : 'In Person',
              
              locationSearchWindowSize: locationSearchWindow.length,
              foundLocationAt: location ? locationSearchWindow.findIndex(t => t === location) : -1
            });
          }
        }
      }
      
      return {
        courseCode,
        courseName,
        classes: foundClasses.slice(0, 3)
      };
    });
    
    console.log(`\n📊 Course: ${testResults.courseCode} - ${testResults.courseName}`);
    console.log(`Found ${testResults.classes.length} classes with updated logic:\n`);
    
    testResults.classes.forEach((cls, index) => {
      console.log(`Class ${index + 1}:`);
      console.log(`  ID: ${cls.classID}, Section: ${cls.section}, Term: ${cls.term}`);
      console.log(`  Activity: ${cls.activity}, Status: ${cls.status} (${cls.enrolment})`);
      console.log(`  Schedule:`, cls.schedule);
      console.log(`  Location:`, cls.location);
      console.log(`  Location search window: ${cls.locationSearchWindowSize} elements`);
      console.log(`  Found location at position: ${cls.foundLocationAt} (${cls.foundLocationAt === -1 ? 'NOT FOUND' : 'FOUND'})`);
      console.log(`  Mode: ${cls.mode}`);
      console.log('');
    });
    
  } catch (error) {
    console.error('❌ Test error:', error);
  } finally {
    await browser.close();
  }
}

testActualScraperLogic();
