// Debug COMP4920 location parsing specifically
const puppeteer = require('puppeteer');

async function debugComp4920Location() {
  console.log('🔧 Debugging COMP4920 location parsing...');
  
  const browser = await puppeteer.launch({
    headless: true,
    args: ['--no-sandbox', '--disable-setuid-sandbox', '--disable-dev-shm-usage']
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
    
    await page.goto(compLink, { waitUntil: 'networkidle0' });
    
    // Find COMP4920 specifically
    const comp4920Link = await page.evaluate(() => {
      const links = Array.from(document.querySelectorAll('a'));
      const courseLink = links.find(link => {
        const text = link.textContent?.trim();
        return text === 'COMP4920';
      });
      return courseLink ? courseLink.href : null;
    });
    
    if (!comp4920Link) {
      console.log('❌ COMP4920 not found');
      return;
    }
    
    console.log('📚 Found COMP4920, analyzing location data...');
    await page.goto(comp4920Link, { waitUntil: 'networkidle0' });
    
    // Analyze the page structure for COMP4920
    const analysis = await page.evaluate(() => {
      const dataElements = Array.from(document.querySelectorAll('.data'));
      const dataTexts = dataElements.map(el => el.innerText?.trim() || '');
      
      // Find all classes in COMP4920
      const classes = [];
      
      for (let i = 0; i < dataTexts.length - 12; i++) {
        const potential = dataTexts.slice(i, i + 15);
        
        const classId = parseInt(potential[0]);
        if (isNaN(classId) || classId < 1000) continue;
        
        const statusIndex = potential.findIndex(text => 
          text === 'Open' || text === 'Full' || text === 'On Hold'
        );
        const enrolmentIndex = potential.findIndex(text => text.match(/^\d+\/\d+$/));
        const termIndex = potential.findIndex(text => text === 'T1' || text === 'T2' || text === 'T3');
        
        if (statusIndex > 0 && enrolmentIndex > 0 && termIndex > 0) {
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
          
          // Search for location data in a very wide window
          const locationSearchStart = i;
          const locationSearchEnd = Math.min(dataTexts.length, i + 200);
          const locationSearchWindow = dataTexts.slice(locationSearchStart, locationSearchEnd);
          
          // Find all potential location patterns
          const locationCandidates = [];
          
          for (let j = 0; j < locationSearchWindow.length; j++) {
            const text = locationSearchWindow[j];
            
            // Venue patterns like "Quadrangle G048 (K-E15-G048)"
            const venueMatch = text.match(/^([A-Za-z\s]+)\s+([A-Za-z0-9]+)\s*\(([^)]+)\)$/);
            if (venueMatch) {
              locationCandidates.push({
                type: 'venue',
                position: j,
                text: text,
                building: venueMatch[1].trim(),
                room: venueMatch[2].trim()
              });
            }
            
            // Online patterns
            if (text.match(/^Online\s*\([^)]+\)$/i)) {
              locationCandidates.push({
                type: 'online',
                position: j,
                text: text
              });
            }
            
            // Simple building patterns
            const simpleVenueMatch = text.match(/^([A-Za-z]{2,})\s+([A-Za-z0-9]{1,4})$/);
            if (simpleVenueMatch && 
                !text.match(/^(Open|Full|On Hold|T1|T2|T3|Course Enrolment|Laboratory|Tutorial|Lecture|TERM|Teaching|Standard|Back|In Person|Consent)$/i) &&
                !text.match(/^\d+\/\d+$/) &&
                !text.match(/^[A-Z]\d{2,3}[A-Z]?$/) &&
                text.length > 3 && text.length < 20) {
              locationCandidates.push({
                type: 'simple',
                position: j,
                text: text,
                building: simpleVenueMatch[1],
                room: simpleVenueMatch[2]
              });
            }
          }
          
          classes.push({
            classId: classId,
            section: section,
            activity: activity,
            status: status,
            term: term,
            enrolment: enrolment,
            locationSearchStart: locationSearchStart,
            locationSearchEnd: locationSearchEnd,
            locationCandidates: locationCandidates,
            potentialData: potential,
            contextWindow: dataTexts.slice(Math.max(0, i - 10), Math.min(dataTexts.length, i + 30))
          });
        }
      }
      
      return {
        totalElements: dataTexts.length,
        classes: classes,
        sampleData: dataTexts.slice(0, 50)
      };
    });
    
    console.log(`\n📊 COMP4920 Analysis Results:`);
    console.log(`Total data elements: ${analysis.totalElements}`);
    console.log(`Found ${analysis.classes.length} classes:\n`);
    
    analysis.classes.forEach((cls, index) => {
      console.log(`Class ${index + 1}: ${cls.classId}`);
      console.log(`  Section: ${cls.section}, Activity: ${cls.activity}`);
      console.log(`  Status: ${cls.status}, Term: ${cls.term}, Enrolment: ${cls.enrolment}`);
      console.log(`  Location search range: ${cls.locationSearchStart} to ${cls.locationSearchEnd}`);
      console.log(`  Location candidates found: ${cls.locationCandidates.length}`);
      
      if (cls.locationCandidates.length > 0) {
        console.log(`  Location candidates:`);
        cls.locationCandidates.slice(0, 3).forEach(candidate => {
          console.log(`    ${candidate.type} at position ${candidate.position}: "${candidate.text}"`);
        });
      } else {
        console.log(`  ❌ No location candidates found`);
        console.log(`  Context window:`, cls.contextWindow.slice(10, 25));
      }
      console.log('');
    });
    
  } catch (error) {
    console.error('❌ Debug error:', error);
  } finally {
    await browser.close();
  }
}

debugComp4920Location();
