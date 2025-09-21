/**
 * Test enhanced location parsing for edge cases like COMP4920 tutorials
 */

const puppeteer = require('puppeteer');

class LocationEdgeCaseTest {
  constructor() {
    this.locationWarnings = [];
  }

  // Include the improved methods from the main scraper
  cleanHtmlEntities(str) {
    if (!str) return '';
    
    let cleaned = str.toString()
      .replace(/&amp;/g, 'and')
      .replace(/&nbsp;/g, '')
      .replace(/&lt;/g, '<')
      .replace(/&gt;/g, '>')
      .replace(/&quot;/g, '"')
      .replace(/&#39;/g, "'")
      .trim();
    
    return cleaned;
  }

  validateAndNormalizeLocation(locationText, classID, term) {
    if (!locationText) return null;
    
    const cleaned = this.cleanHtmlEntities(locationText);
    
    const hasValidContent = /[A-Za-z]/.test(cleaned);
    
    if (!hasValidContent || cleaned.length < 2) {
      this.locationWarnings.push({
        classID,
        term,
        issue: 'Invalid location format',
        value: cleaned,
        original: locationText
      });
      return null;
    }
    
    return cleaned;
  }

  parseLocationData(dataTexts, classIndex, classID, term) {
    const locationResult = {
      location: '',
      building: '',
      room: '',
      mode: 'Unknown'
    };

    // Strategy 1: Condensed format
    const condensedResult = this.parseLocationCondensed(dataTexts, classIndex);
    if (condensedResult.location) {
      Object.assign(locationResult, condensedResult);
      locationResult.location = this.validateAndNormalizeLocation(locationResult.location, classID, term);
      return locationResult;
    }

    // Strategy 2: Expanded detailed format
    const expandedResult = this.parseLocationExpanded(dataTexts, classID);
    if (expandedResult.location) {
      Object.assign(locationResult, expandedResult);
      locationResult.location = this.validateAndNormalizeLocation(locationResult.location, classID, term);
      return locationResult;
    }

    // Strategy 3: Broader search
    const broadResult = this.parseLocationBroad(dataTexts, classIndex, classID);
    if (broadResult.location) {
      Object.assign(locationResult, broadResult);
      locationResult.location = this.validateAndNormalizeLocation(locationResult.location, classID, term);
      return locationResult;
    }

    this.locationWarnings.push({
      classID,
      term,
      issue: 'No location data found',
      searchedRange: `${classIndex} to ${Math.min(dataTexts.length, classIndex + 200)}`
    });

    return locationResult;
  }

  parseLocationCondensed(dataTexts, classIndex) {
    const locationSearchWindow = dataTexts.slice(classIndex, Math.min(dataTexts.length, classIndex + 150));
    
    for (let j = 0; j < locationSearchWindow.length; j++) {
      const text = locationSearchWindow[j];
      
      const venueMatch = text.match(/^([A-Za-z\s]+)\s+([A-Za-z0-9]+)\s*\(([^)]+)\)$/);
      if (venueMatch) {
        return {
          building: venueMatch[1].trim(),
          room: venueMatch[2].trim(),
          location: text,
          mode: 'In Person'
        };
      }
      
      if (text.match(/^Online\s*\([^)]+\)$/i)) {
        return {
          location: text,
          building: 'Online',
          room: '',
          mode: 'Online'
        };
      }
      
      const simpleVenueMatch = text.match(/^([A-Za-z]{2,})\s+([A-Za-z0-9]{1,4})$/);
      if (simpleVenueMatch && 
          !text.match(/^(Open|Full|On Hold|T1|T2|T3|Course Enrolment|Laboratory|Tutorial|Lecture|TERM|Teaching)$/i) &&
          !text.match(/^\d+\/\d+$/) &&
          !text.match(/^[A-Z]\d{2,3}[A-Z]?$/) &&
          text.length > 3 && text.length < 20) {
        return {
          building: simpleVenueMatch[1],
          room: simpleVenueMatch[2],
          location: text,
          mode: 'In Person'
        };
      }
    }
    
    return { location: '', building: '', room: '', mode: 'Unknown' };
  }

  parseLocationExpanded(dataTexts, classID) {
    for (let i = 700; i < dataTexts.length - 10; i++) {
      if (dataTexts[i] === classID.toString()) {
        for (let j = i + 1; j < Math.min(dataTexts.length, i + 20); j++) {
          const text = dataTexts[j];
          
          const venueMatch = text.match(/^([A-Za-z\s]+)\s+([A-Za-z0-9]+)\s*\(([^)]+)\)$/);
          if (venueMatch) {
            return {
              building: venueMatch[1].trim(),
              room: venueMatch[2].trim(),
              location: text,
              mode: 'In Person'
            };
          }
          
          if (text.match(/^Online\s*\([^)]+\)$/i)) {
            return {
              location: text,
              building: 'Online',
              room: '',
              mode: 'Online'
            };
          }
        }
      }
    }
    
    return { location: '', building: '', room: '', mode: 'Unknown' };
  }

  parseLocationBroad(dataTexts, classIndex, classID) {
    const searchStart = Math.max(0, classIndex - 50);
    const searchEnd = Math.min(dataTexts.length, classIndex + 300);
    
    const locationCandidates = [];
    
    for (let i = searchStart; i < searchEnd; i++) {
      const text = dataTexts[i];
      
      if (text.includes('Quadrangle') || 
          text.includes('Matthews') || 
          text.includes('Goldstein') ||
          text.includes('Webster') ||
          text.includes('Science Theatre') ||
          text.match(/^[A-Za-z\s]+\s+[A-Za-z0-9]+\s*\([^)]+\)$/) ||
          text.match(/^Online\s*\([^)]+\)$/i)) {
        
        locationCandidates.push({
          text,
          distance: Math.abs(i - classIndex),
          index: i
        });
      }
    }
    
    if (locationCandidates.length > 0) {
      locationCandidates.sort((a, b) => a.distance - b.distance);
      const best = locationCandidates[0];
      
      const venueMatch = best.text.match(/^([A-Za-z\s]+)\s+([A-Za-z0-9]+)\s*\(([^)]+)\)$/);
      if (venueMatch) {
        return {
          building: venueMatch[1].trim(),
          room: venueMatch[2].trim(),
          location: best.text,
          mode: 'In Person'
        };
      }
      
      if (best.text.match(/^Online\s*\([^)]+\)$/i)) {
        return {
          location: best.text,
          building: 'Online',
          room: '',
          mode: 'Online'
        };
      }
    }
    
    return { location: '', building: '', room: '', mode: 'Unknown' };
  }

  async testCourseLocationParsing(courseCode) {
    const browser = await puppeteer.launch({ headless: true });
    const page = await browser.newPage();
    
    try {
      console.log(`🧪 Testing location parsing for ${courseCode}...`);
      await page.goto(`http://timetable.unsw.edu.au/2025/${courseCode}.html`, { waitUntil: 'networkidle0' });

      const result = await page.evaluate(() => {
        const dataElements = Array.from(document.querySelectorAll('.data'));
        const dataTexts = dataElements.map(el => el.innerText?.trim() || '');
        
        // Find T3 classes
        const foundClasses = [];
        const seenClasses = new Set();
        
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
            const activity = potential.find(text => text.includes('Tutorial') || text.includes('Lecture') || text.includes('Laboratory')) || 'Unknown';
            
            const classKey = `${classId}-T3-${activity}`;
            if (!seenClasses.has(classKey)) {
              seenClasses.add(classKey);
              foundClasses.push({
                classID: classId,
                section,
                activity,
                index: i
              });
            }
          }
        }
        
        return {
          dataTexts,
          foundClasses
        };
      });

      console.log(`Found ${result.foundClasses.length} T3 classes in ${courseCode}`);
      
      // Test our location parsing on each class
      const locationResults = [];
      for (const cls of result.foundClasses.slice(0, 5)) { // Test first 5 classes
        const locationData = this.parseLocationData(result.dataTexts, cls.index, cls.classID, 'T3');
        locationResults.push({
          ...cls,
          locationData
        });
      }

      // Display results
      console.log('\n📍 Location parsing results:');
      locationResults.forEach(result => {
        const { classID, section, activity, locationData } = result;
        console.log(`  Class ${classID} (${section}) - ${activity}:`);
        console.log(`    Location: "${locationData.location}"`);
        console.log(`    Building: "${locationData.building}"`);
        console.log(`    Room: "${locationData.room}"`);
        console.log(`    Mode: "${locationData.mode}"`);
        console.log();
      });

      // Display warnings
      if (this.locationWarnings.length > 0) {
        console.log('⚠️  Warnings:');
        this.locationWarnings.forEach(warning => {
          console.log(`  Class ${warning.classID}: ${warning.issue}`);
        });
      }

    } catch (error) {
      console.error('Test failed:', error);
    } finally {
      await browser.close();
    }
  }
}

async function runTests() {
  const tester = new LocationEdgeCaseTest();
  
  // Test courses known to have edge cases
  await tester.testCourseLocationParsing('COMP4920');
  
  console.log('\n' + '='.repeat(50));
  
  // Test a regular course for comparison
  await tester.testCourseLocationParsing('COMP1511');
}

runTests().catch(console.error);
