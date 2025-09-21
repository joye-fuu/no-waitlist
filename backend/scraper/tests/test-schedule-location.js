// Test the updated schedule and location parsing
const puppeteer = require('puppeteer');

async function testUpdatedParsing() {
  console.log('🔧 Testing updated schedule and location parsing...');
  
  const browser = await puppeteer.launch({
    headless: true,
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
  
  const page = await browser.newPage();
  
  try {
    // Navigate to COMP courses
    await page.goto('https://timetable.unsw.edu.au/2025/subjectSearch.html', { 
      waitUntil: 'networkidle0',
      timeout: 30000 
    });
    
    await new Promise(resolve => setTimeout(resolve, 3000));
    
    // Find COMP link
    const compLink = await page.evaluate(() => {
      const links = Array.from(document.querySelectorAll('a'));
      const compLink = links.find(link => {
        const text = link.textContent?.trim();
        return text === 'COMP' && link.href.includes('COMPKENS.html');
      });
      return compLink ? compLink.href : null;
    });
    
    if (!compLink) {
      console.log('❌ Could not find COMP link');
      return;
    }
    
    await page.goto(compLink, { waitUntil: 'networkidle0' });
    
    // Get first course
    const courseLink = await page.evaluate(() => {
      const links = Array.from(document.querySelectorAll('a'));
      const courseLink = links.find(link => {
        const text = link.textContent?.trim();
        return text && text.match(/^COMP\d{4}$/);
      });
      return courseLink ? { href: courseLink.href, text: courseLink.textContent?.trim() } : null;
    });
    
    if (!courseLink) {
      console.log('❌ Could not find course link');
      return;
    }
    
    console.log(`📚 Testing with course: ${courseLink.text}`);
    await page.goto(courseLink.href, { waitUntil: 'networkidle0' });
    
    // Test the parsing logic
    const testResults = await page.evaluate(() => {
      const pageText = document.body.textContent || '';
      const titleMatch = pageText.match(/([A-Z]{4}\d{4})\s+(.+?)(?=\n|Faculty)/);
      const courseCode = titleMatch ? titleMatch[1] : '';
      const courseName = titleMatch ? titleMatch[2].trim() : '';
      
      const dataElements = Array.from(document.querySelectorAll('.data'));
      const dataTexts = dataElements.map(el => el.innerText?.trim() || '');
      
      let foundClasses = [];
      const seenClasses = new Set();
      
      // Test the updated parsing logic
      for (let i = 0; i < dataTexts.length - 12; i++) {
        const potential = dataTexts.slice(i, i + 15);
        
        const classId = parseInt(potential[0]);
        if (isNaN(classId) || classId < 1000) continue;
        
        const statusIndex = potential.findIndex(text => 
          text === 'Open' || text === 'Full' || text === 'On Hold'
        );
        const enrolmentIndex = potential.findIndex(text => text.match(/^\d+\/\d+$/));
        const termIndex = potential.findIndex(text => text === 'T3');
        
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
          
          // UPDATED TIME PARSING
          let startTime = '';
          let endTime = '';
          let dayOfWeek = '';
          let fullSchedule = '';
          
          // Look in a wider range around the class data
          const extendedWindow = dataTexts.slice(Math.max(0, i - 10), i + 25);
          
          for (let j = 0; j < extendedWindow.length; j++) {
            const text = extendedWindow[j];
            
            // Look for complex schedule patterns
            const complexScheduleMatch = text.match(/^(Mon|Tue|Wed|Thu|Fri|Sat|Sun)\s+(\d{1,2}:\d{2})\s*-\s*(\d{1,2}:\d{2})/);
            if (complexScheduleMatch) {
              dayOfWeek = complexScheduleMatch[1];
              startTime = complexScheduleMatch[2];
              endTime = complexScheduleMatch[3];
              fullSchedule = text;
              break;
            }
            
            // Look for simple time patterns
            const simpleTimeMatch = text.match(/^(\d{1,2}:\d{2})\s*-\s*(\d{1,2}:\d{2})$/);
            if (simpleTimeMatch && !startTime) {
              startTime = simpleTimeMatch[1];
              endTime = simpleTimeMatch[2];
            }
            
            // Look for standalone day patterns
            if (text.match(/^(Mon|Tue|Wed|Thu|Fri|Sat|Sun)$/) && !dayOfWeek) {
              dayOfWeek = text;
            }
          }
          
          // UPDATED LOCATION PARSING
          let location = '';
          let building = '';
          let room = '';
          
          for (let j = 0; j < extendedWindow.length; j++) {
            const text = extendedWindow[j];
            
            // Look for venue patterns like "Quadrangle G048 (K-E15-G048)"
            const venueMatch = text.match(/^([A-Za-z\s]+)\s+([A-Za-z0-9]+)\s*\(([^)]+)\)$/);
            if (venueMatch) {
              building = venueMatch[1].trim();
              room = venueMatch[2].trim();
              location = text;
              break;
            }
            
            // Look for online indicators
            if (text.toLowerCase().includes('online') && 
                text.length > 6 && text.length < 30) {
              location = text;
              building = 'Online';
              room = '';
              break;
            }
            
            // Look for simple venue patterns
            const simpleVenueMatch = text.match(/^([A-Za-z]+)\s+([A-Za-z0-9]+)$/);
            if (simpleVenueMatch && 
                !text.match(/^(Open|Full|On Hold|T1|T2|T3|Course Enrolment|Laboratory|Tutorial|Lecture)$/) &&
                !text.match(/^\d+\/\d+$/) &&
                text.length > 3 && text.length < 20) {
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
              
              // Debug info
              debugInfo: {
                potentialData: potential,
                extendedWindow: extendedWindow
              }
            });
          }
        }
      }
      
      return {
        courseCode,
        courseName,
        classes: foundClasses.slice(0, 3) // Limit for debugging
      };
    });
    
    console.log(`\n📊 Course: ${testResults.courseCode} - ${testResults.courseName}`);
    console.log(`Found ${testResults.classes.length} classes for testing:\n`);
    
    testResults.classes.forEach((cls, index) => {
      console.log(`Class ${index + 1}:`);
      console.log(`  ID: ${cls.classID}`);
      console.log(`  Section: ${cls.section}`);
      console.log(`  Activity: ${cls.activity}`);
      console.log(`  Status: ${cls.status} (${cls.enrolment})`);
      console.log(`  Schedule:`, cls.schedule);
      console.log(`  Location:`, cls.location);
      console.log(`  Mode: ${cls.mode}`);
      console.log(`  Debug - Potential:`, cls.debugInfo.potentialData.slice(0, 10));
      console.log('');
    });
    
  } catch (error) {
    console.error('❌ Test error:', error);
  } finally {
    await browser.close();
  }
}

testUpdatedParsing();
