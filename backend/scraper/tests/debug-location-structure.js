// Debug the entire HTML structure to find where location data is stored
const puppeteer = require('puppeteer');

async function debugLocationStructure() {
  console.log('🔧 Debugging full HTML structure for COMP4920...');
  
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
    
    console.log('📚 Found COMP4920, analyzing full structure...');
    await page.goto(comp4920Link, { waitUntil: 'networkidle0' });
    
    // Extract all text data and analyze structure
    const fullAnalysis = await page.evaluate(() => {
      const dataWindows = document.querySelectorAll('.data');
      let allResults = [];
      
      dataWindows.forEach((dataWindow, windowIndex) => {
        const allCells = dataWindow.querySelectorAll('td');
        const dataTexts = Array.from(allCells).map(cell => cell.textContent?.trim()).filter(text => text);
        
        console.log(`Data window ${windowIndex}: ${dataTexts.length} elements`);
        
        // Find all venue-like patterns
        const venues = [];
        const classIds = [];
        const schedules = [];
        
        dataTexts.forEach((text, index) => {
          // Venue patterns
          if (text.match(/^([A-Za-z\s]+)\s+([A-Za-z0-9]+)\s*\(([^)]+)\)$/)) {
            venues.push({ text, index, type: 'venue_with_parens' });
          }
          if (text.match(/^Online\s*\([^)]+\)$/i)) {
            venues.push({ text, index, type: 'online' });
          }
          if (text.match(/^([A-Za-z]{2,})\s+([A-Za-z0-9]{1,4})$/) && 
              !text.match(/^(Open|Full|On Hold|T1|T2|T3|Course Enrolment|Laboratory|Tutorial|Lecture)$/i) &&
              !text.match(/^\d+\/\d+$/) &&
              text.length > 3 && text.length < 20) {
            venues.push({ text, index, type: 'simple_venue' });
          }
          
          // Class IDs (4-5 digit numbers)
          if (text.match(/^\d{4,5}$/) && parseInt(text) >= 1000) {
            classIds.push({ text, index });
          }
          
          // Schedule patterns
          if (text.match(/^(Mon|Tue|Wed|Thu|Fri|Sat|Sun)\s+(\d{1,2}:\d{2})\s*-\s*(\d{1,2}:\d{2})/)) {
            schedules.push({ text, index });
          }
        });
        
        allResults.push({
          windowIndex,
          totalElements: dataTexts.length,
          venues,
          classIds,
          schedules,
          firstElements: dataTexts.slice(0, 20),
          lastElements: dataTexts.slice(-20)
        });
      });
      
      return allResults;
    });
    
    // Analyze results
    console.log('\n📊 Structure Analysis:');
    fullAnalysis.forEach(result => {
      console.log(`\nData window ${result.windowIndex}:`);
      console.log(`  Total elements: ${result.totalElements}`);
      console.log(`  Class IDs found: ${result.classIds.length}`);
      console.log(`  Venues found: ${result.venues.length}`);
      console.log(`  Schedules found: ${result.schedules.length}`);
      
      if (result.classIds.length > 0) {
        console.log(`  First few class IDs: ${result.classIds.slice(0, 5).map(c => `${c.text}@${c.index}`).join(', ')}`);
      }
      
      if (result.venues.length > 0) {
        console.log(`  Venues found:`);
        result.venues.forEach(venue => {
          console.log(`    ${venue.type}: "${venue.text}" at index ${venue.index}`);
        });
      }
      
      console.log(`  First 10 elements: [${result.firstElements.slice(0, 10).join(', ')}]`);
      console.log(`  Last 10 elements: [${result.lastElements.slice(-10).join(', ')}]`);
    });
    
    // Try to map class IDs to venues by proximity
    const mainWindow = fullAnalysis.find(w => w.classIds.length > 0);
    if (mainWindow && mainWindow.venues.length > 0) {
      console.log('\n🗺️  Mapping Classes to Venues:');
      
      mainWindow.classIds.slice(0, 10).forEach(classInfo => {
        const classId = classInfo.text;
        const classIndex = classInfo.index;
        
        // Find closest venues
        const closestVenues = mainWindow.venues
          .map(venue => ({
            ...venue,
            distance: Math.abs(venue.index - classIndex)
          }))
          .sort((a, b) => a.distance - b.distance)
          .slice(0, 3);
        
        console.log(`  Class ${classId} (index ${classIndex}):`);
        closestVenues.forEach(venue => {
          console.log(`    Distance ${venue.distance}: ${venue.text} (${venue.type})`);
        });
      });
    }
    
  } finally {
    await browser.close();
  }
}

debugLocationStructure().catch(console.error);
