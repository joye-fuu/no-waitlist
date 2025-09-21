const puppeteer = require('puppeteer');

// Test the updated 2025 class extraction logic
async function testUpdated2025Logic() {
  console.log('🎯 Testing updated 2025 class extraction logic...');
  
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
    console.log('📍 Testing COMP1511 2025 with updated logic...');
    await page.goto('https://timetable.unsw.edu.au/2025/COMP1511.html', { 
      waitUntil: 'networkidle0',
      timeout: 30000 
    });
    
    await new Promise(resolve => setTimeout(resolve, 2000));
    
    // Use the updated extraction logic from the main scraper
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
      for (let i = 0; i < dataTexts.length - 8; i++) {
        const potential = dataTexts.slice(i, i + 10);
        
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
        if (statusIndex > 0 && statusIndex < 5 && 
            enrolmentIndex > 0 && enrolmentIndex < 5 && 
            termIndex > 0 && termIndex < 8) {
          
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
    
    console.log(`✅ Found ${courseData.classes.length} classes for ${courseData.courseCode} - ${courseData.courseName}`);
    
    if (courseData.classes.length > 0) {
      console.log('\n📋 Sample classes:');
      courseData.classes.slice(0, 10).forEach(cls => {
        console.log(`   - Class ${cls.classID}: ${cls.section} ${cls.term} ${cls.activity} ${cls.status} (${cls.courseEnrolment.enrolments}/${cls.courseEnrolment.capacity})`);
      });
      
      // Show summary by term and activity
      const termSummary = {};
      const activitySummary = {};
      
      courseData.classes.forEach(cls => {
        termSummary[cls.term] = (termSummary[cls.term] || 0) + 1;
        activitySummary[cls.activity] = (activitySummary[cls.activity] || 0) + 1;
      });
      
      console.log('\n📊 Summary:');
      console.log('Terms:', Object.entries(termSummary).map(([term, count]) => `${term}: ${count}`).join(', '));
      console.log('Activities:', Object.entries(activitySummary).map(([activity, count]) => `${activity}: ${count}`).join(', '));
    }
    
  } catch (error) {
    console.error('❌ Error testing updated logic:', error.message);
  } finally {
    await browser.close();
  }
}

testUpdated2025Logic();
