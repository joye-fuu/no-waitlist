// Test location parsing by finding where location data actually appears
const puppeteer = require('puppeteer');

async function testLocationData() {
  console.log('🔧 Testing location data detection...');
  
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
    
    console.log(`📚 Testing location data in: ${courseLink.text}`);
    await page.goto(courseLink.href, { waitUntil: 'networkidle0' });
    
    // Find all location-like patterns in the data
    const locationAnalysis = await page.evaluate(() => {
      const dataElements = Array.from(document.querySelectorAll('.data'));
      const dataTexts = dataElements.map(el => el.innerText?.trim() || '');
      
      // Find all potential venue patterns
      const venuePatterns = [];
      const onlinePatterns = [];
      const buildingPatterns = [];
      
      dataTexts.forEach((text, index) => {
        // Venue patterns like "Quadrangle G048 (K-E15-G048)"
        const venueMatch = text.match(/^([A-Za-z\s]+)\s+([A-Za-z0-9]+)\s*\(([^)]+)\)$/);
        if (venueMatch) {
          venuePatterns.push({ 
            index, 
            text, 
            building: venueMatch[1].trim(), 
            room: venueMatch[2].trim(),
            code: venueMatch[3].trim() 
          });
        }
        
        // Online patterns
        if (text.toLowerCase().includes('online') && text.includes('(') && text.includes(')')) {
          onlinePatterns.push({ index, text });
        }
        
        // Simple building patterns
        const simpleVenueMatch = text.match(/^([A-Za-z]{2,})\s+([A-Za-z0-9]{1,4})$/);
        if (simpleVenueMatch && 
            !text.match(/^(Open|Full|On Hold|T1|T2|T3|Course Enrolment|Laboratory|Tutorial|Lecture)$/) &&
            !text.match(/^\d+\/\d+$/) &&
            text.length > 3 && text.length < 20) {
          buildingPatterns.push({ 
            index, 
            text, 
            building: simpleVenueMatch[1], 
            room: simpleVenueMatch[2] 
          });
        }
      });
      
      // Find class patterns to see distance from location data
      const classPatterns = [];
      for (let i = 0; i < dataTexts.length - 12; i++) {
        const potential = dataTexts.slice(i, i + 15);
        const classId = parseInt(potential[0]);
        
        if (!isNaN(classId) && classId > 1000) {
          const statusIndex = potential.findIndex(text => 
            text === 'Open' || text === 'Full' || text === 'On Hold'
          );
          const enrolmentIndex = potential.findIndex(text => text.match(/^\d+\/\d+$/));
          const termIndex = potential.findIndex(text => text === 'T1' || text === 'T2' || text === 'T3');
          
          if (statusIndex > 0 && enrolmentIndex > 0 && termIndex > 0) {
            classPatterns.push({
              index: i,
              classId: classId,
              section: potential[1],
              status: potential[statusIndex],
              enrolment: potential[enrolmentIndex],
              term: potential[termIndex]
            });
          }
        }
      }
      
      return {
        venuePatterns,
        onlinePatterns,
        buildingPatterns,
        classPatterns,
        totalElements: dataTexts.length
      };
    });
    
    console.log(`\n📊 Location Analysis Results:`);
    console.log(`Total data elements: ${locationAnalysis.totalElements}`);
    console.log(`\nFound ${locationAnalysis.classPatterns.length} classes:`);
    locationAnalysis.classPatterns.slice(0, 3).forEach(cls => {
      console.log(`  Class ${cls.classId} (${cls.section}) at index ${cls.index} - ${cls.status} ${cls.enrolment}`);
    });
    
    console.log(`\nFound ${locationAnalysis.venuePatterns.length} venue patterns:`);
    locationAnalysis.venuePatterns.slice(0, 5).forEach(venue => {
      console.log(`  Index ${venue.index}: "${venue.text}" -> ${venue.building} ${venue.room} (${venue.code})`);
    });
    
    console.log(`\nFound ${locationAnalysis.onlinePatterns.length} online patterns:`);
    locationAnalysis.onlinePatterns.slice(0, 3).forEach(online => {
      console.log(`  Index ${online.index}: "${online.text}"`);
    });
    
    console.log(`\nFound ${locationAnalysis.buildingPatterns.length} building patterns:`);
    locationAnalysis.buildingPatterns.slice(0, 5).forEach(building => {
      console.log(`  Index ${building.index}: "${building.text}" -> ${building.building} ${building.room}`);
    });
    
    // Calculate distances between classes and locations
    if (locationAnalysis.classPatterns.length > 0 && locationAnalysis.venuePatterns.length > 0) {
      console.log(`\n📍 Distance analysis:`);
      const firstClass = locationAnalysis.classPatterns[0];
      const closestVenue = locationAnalysis.venuePatterns.find(venue => venue.index > firstClass.index);
      if (closestVenue) {
        console.log(`  First class at index ${firstClass.index}, closest venue at index ${closestVenue.index}`);
        console.log(`  Distance: ${closestVenue.index - firstClass.index} elements`);
      }
    }
    
  } catch (error) {
    console.error('❌ Test error:', error);
  } finally {
    await browser.close();
  }
}

testLocationData();
