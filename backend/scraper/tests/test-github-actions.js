const puppeteer = require('puppeteer');

// Quick test to simulate GitHub Actions environment
async function testGitHubActionsSetup() {
  console.log('🧪 Testing GitHub Actions setup simulation...');
  
  // Simulate environment variables that GitHub Actions would set
  process.env.TEST_RUN = 'true';
  
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
      '--disable-gpu',
      '--disable-web-security',
      '--disable-features=VizDisplayCompositor'
    ]
  });
  
  const page = await browser.newPage();
  
  try {
    console.log('📍 Testing 2025 COMP subject search...');
    await page.goto('https://timetable.unsw.edu.au/2025/subjectSearch.html', { 
      waitUntil: 'networkidle0',
      timeout: 30000 
    });
    
    // Find COMP subject area
    const compFound = await page.evaluate(() => {
      const links = Array.from(document.querySelectorAll('a')).filter(link => {
        const href = link.href || '';
        const text = link.textContent?.trim() || '';
        return href.includes('/2025/COMPKENS.html') && text === 'COMP';
      });
      return links.length > 0;
    });
    
    if (compFound) {
      console.log('✅ COMP subject area found in 2025');
      
      // Test a single COMP course
      await page.goto('https://timetable.unsw.edu.au/2025/COMP1511.html', { 
        waitUntil: 'networkidle0',
        timeout: 30000 
      });
      
      const t3Classes = await page.evaluate(() => {
        const dataElements = Array.from(document.querySelectorAll('.data'));
        const dataTexts = dataElements.map(el => el.innerText?.trim() || '');
        
        let t3Count = 0;
        for (let i = 0; i < dataTexts.length - 8; i++) {
          const potential = dataTexts.slice(i, i + 10);
          const classId = parseInt(potential[0]);
          if (isNaN(classId) || classId < 1000) continue;
          
          const hasT3 = potential.some(text => text === 'T3');
          const hasStatus = potential.some(text => 
            text === 'Open' || text === 'Full' || text === 'On Hold'
          );
          const hasEnrolment = potential.some(text => text.match(/^\d+\/\d+$/));
          
          if (hasT3 && hasStatus && hasEnrolment) {
            t3Count++;
          }
        }
        return t3Count;
      });
      
      console.log(`✅ Found ${t3Classes} T3 classes in COMP1511`);
      console.log('🎉 GitHub Actions setup test PASSED');
      
    } else {
      console.log('❌ COMP subject area not found');
      console.log('🚨 GitHub Actions setup test FAILED');
    }
    
  } catch (error) {
    console.error('❌ Error in GitHub Actions test:', error.message);
    console.log('🚨 GitHub Actions setup test FAILED');
  } finally {
    await browser.close();
  }
}

testGitHubActionsSetup();
