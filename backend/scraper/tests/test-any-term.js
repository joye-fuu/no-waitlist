// Test with any term to see if the parsing works
const puppeteer = require('puppeteer');

async function testAnyTerm() {
  console.log('🔧 Testing parsing with any term...');
  
  const browser = await puppeteer.launch({
    headless: true,
    args: [
      '--no-sandbox',
      '--disable-setuid-sandbox',
      '--disable-dev-shm-usage'
    ]
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
    
    // Test with ANY term (T1, T2, T3)
    const testResults = await page.evaluate(() => {
      const pageText = document.body.textContent || '';
      const titleMatch = pageText.match(/([A-Z]{4}\d{4})\s+(.+?)(?=\n|Faculty)/);
      const courseCode = titleMatch ? titleMatch[1] : '';
      const courseName = titleMatch ? titleMatch[2].trim() : '';
      
      const dataElements = Array.from(document.querySelectorAll('.data'));
      const dataTexts = dataElements.map(el => el.innerText?.trim() || '');
      
      console.log('First 20 data elements:', dataTexts.slice(0, 20));
      
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
        const termIndex = potential.findIndex(text => text === 'T1' || text === 'T2' || text === 'T3'); // Any term
        
        if (statusIndex > 0 && statusIndex < 7 && 
            enrolmentIndex > 0 && enrolmentIndex < 7 && 
            termIndex > 0 && termIndex < 10) {
          
          console.log(`Found potential class at index ${i}:`, potential);
          
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
          
          // Look for schedule in extended window
          const extendedStart = Math.max(0, i - 5);
          const extendedEnd = Math.min(dataTexts.length, i + 20);
          const extendedWindow = dataTexts.slice(extendedStart, extendedEnd);
          
          let startTime = '';
          let endTime = '';
          let dayOfWeek = '';
          let fullSchedule = '';
          
          for (let j = 0; j < extendedWindow.length; j++) {
            const text = extendedWindow[j];
            
            // Complex schedule pattern
            const complexScheduleMatch = text.match(/^(Mon|Tue|Wed|Thu|Fri|Sat|Sun)\s+(\d{1,2}:\d{2})\s*-\s*(\d{1,2}:\d{2})/);
            if (complexScheduleMatch) {
              dayOfWeek = complexScheduleMatch[1];
              startTime = complexScheduleMatch[2];
              endTime = complexScheduleMatch[3];
              fullSchedule = text;
              break;
            }
            
            // Simple time pattern
            const simpleTimeMatch = text.match(/^(\d{1,2}:\d{2})\s*-\s*(\d{1,2}:\d{2})$/);
            if (simpleTimeMatch && !startTime) {
              startTime = simpleTimeMatch[1];
              endTime = simpleTimeMatch[2];
            }
            
            // Day pattern
            if (text.match(/^(Mon|Tue|Wed|Thu|Fri|Sat|Sun)$/) && !dayOfWeek) {
              dayOfWeek = text;
            }
          }
          
          // Look for location
          let location = '';
          let building = '';
          let room = '';
          
          for (let j = 0; j < extendedWindow.length; j++) {
            const text = extendedWindow[j];
            
            // Venue pattern like "Quadrangle G048 (K-E15-G048)"
            const venueMatch = text.match(/^([A-Za-z\s]+)\s+([A-Za-z0-9]+)\s*\(([^)]+)\)$/);
            if (venueMatch) {
              building = venueMatch[1].trim();
              room = venueMatch[2].trim();
              location = text;
              break;
            }
            
            // Online pattern
            if (text.toLowerCase().includes('online') && 
                text.length > 6 && text.length < 30) {
              location = text;
              building = 'Online';
              room = '';
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
                dayOfWeek: dayOfWeek || 'N/A',
                startTime: startTime || 'N/A',
                endTime: endTime || 'N/A',
                timeDisplay: startTime && endTime ? `${startTime}-${endTime}` : 'N/A',
                fullSchedule: fullSchedule || 'N/A'
              },
              location: {
                full: location || 'N/A',
                building: building || 'N/A',
                room: room || 'N/A'
              },
              mode: location.toLowerCase().includes('online') ? 'Online' : 'In Person',
              
              debugExtended: extendedWindow
            });
          }
        }
      }
      
      return {
        courseCode,
        courseName,
        classes: foundClasses.slice(0, 3),
        totalDataElements: dataTexts.length
      };
    });
    
    console.log(`\n📊 Course: ${testResults.courseCode} - ${testResults.courseName}`);
    console.log(`Total data elements: ${testResults.totalDataElements}`);
    console.log(`Found ${testResults.classes.length} classes:\n`);
    
    testResults.classes.forEach((cls, index) => {
      console.log(`Class ${index + 1}:`);
      console.log(`  ID: ${cls.classID}, Section: ${cls.section}, Term: ${cls.term}`);
      console.log(`  Activity: ${cls.activity}, Status: ${cls.status} (${cls.enrolment})`);
      console.log(`  Schedule:`, cls.schedule);
      console.log(`  Location:`, cls.location);
      console.log(`  Extended window sample:`, cls.debugExtended.slice(0, 15));
      console.log('');
    });
    
  } catch (error) {
    console.error('❌ Test error:', error);
  } finally {
    await browser.close();
  }
}

testAnyTerm();
