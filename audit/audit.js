const { chromium, devices } = require('playwright');
const fs = require('fs');
const path = require('path');

const targetUrl = 'https://new-real-estate-bs53.vercel.app/';
const screenshotDir = 'C:\\Users\\hp\\.gemini\\antigravity-ide\\brain\\f2fd57eb-b59b-4b94-8359-75e0aba4003f\\screenshots';

if (!fs.existsSync(screenshotDir)) {
  fs.mkdirSync(screenshotDir, { recursive: true });
}

async function runAudit() {
  const browser = await chromium.launch({ headless: true });
  const context = await browser.newContext();
  const page = await context.newPage();

  const logs = [];
  const errors = [];
  const networkErrors = [];

  page.on('console', msg => logs.push(`[${msg.type()}] ${msg.text()}`));
  page.on('pageerror', err => errors.push(err.message));
  page.on('response', response => {
    if (response.status() >= 400) {
      networkErrors.push(`HTTP ${response.status()} - ${response.url()}`);
    }
  });

  console.log('Navigating to target URL...');
  try {
    await page.goto(targetUrl, { waitUntil: 'load', timeout: 60000 });
  } catch (e) {
    console.log('Timeout or error on initial load, continuing anyway...');
    errors.push(`Page load error: ${e.message}`);
  }

  // Wait a little bit for initial JS execution
  await page.waitForTimeout(3000);

  console.log('Taking full desktop screenshot...');
  try {
    await page.screenshot({ path: path.join(screenshotDir, 'desktop_home.png'), fullPage: true, timeout: 10000 });
  } catch (e) {
    console.log('Screenshot failed: ' + e.message);
  }

  // 1. Navigation & Routing Check
  console.log('Checking navigation...');
  const navLinks = await page.$$('nav a, header a');
  const navResults = [];
  
  for (let i = 0; i < navLinks.length; i++) {
    try {
      const link = navLinks[i];
      const text = await link.innerText();
      const href = await link.getAttribute('href');
      
      if (text && href && href.startsWith('/')) {
        console.log(`Clicking navigation link: ${text} (${href})`);
        
        // Monitor for full page reload
        let didReload = false;
        const reloadListener = () => { didReload = true; };
        page.once('framenavigated', reloadListener);
        
        await link.click();
        await page.waitForTimeout(1500); // Wait for SPA transition
        
        page.removeListener('framenavigated', reloadListener);
        
        navResults.push({
          text, href,
          isSPA: !didReload,
          currentUrl: page.url()
        });
        
        await page.screenshot({ path: path.join(screenshotDir, `desktop_nav_${text.replace(/[^a-zA-Z0-9]/g, '_')}.png`), fullPage: true, timeout: 5000 }).catch(() => {});
      }
    } catch(e) {
       console.log('Error navigating link: ' + e.message);
    }
  }

  // Go back home
  try {
    await page.goto(targetUrl, { waitUntil: 'load', timeout: 30000 });
  } catch (e) {}

  // 2. UI & Responsiveness Audit (Mobile Viewport)
  console.log('Simulating mobile viewport (iPhone 13)...');
  const mobileContext = await browser.newContext({
    ...devices['iPhone 13']
  });
  const mobilePage = await mobileContext.newPage();
  
  mobilePage.on('console', msg => logs.push(`[Mobile][${msg.type()}] ${msg.text()}`));
  mobilePage.on('pageerror', err => errors.push(`[Mobile] ${err.message}`));
  
  try {
    await mobilePage.goto(targetUrl, { waitUntil: 'load', timeout: 30000 });
  } catch (e) {}
  
  await mobilePage.waitForTimeout(3000);
  
  try {
    await mobilePage.screenshot({ path: path.join(screenshotDir, 'mobile_home.png'), fullPage: true, timeout: 5000 });
  } catch(e) {}

  // Wait for 1s then scroll a bit and check horizontal scrolling
  await mobilePage.evaluate(() => window.scrollBy(0, 1000));
  await mobilePage.waitForTimeout(500);
  try {
    await mobilePage.screenshot({ path: path.join(screenshotDir, 'mobile_scrolled.png'), fullPage: true, timeout: 5000 });
  } catch(e) {}
  
  // Check if body has horizontal scroll
  const hasHorizontalScroll = await mobilePage.evaluate(() => {
    return document.documentElement.scrollWidth > window.innerWidth;
  });
  
  // 3. Functional Feature Testing
  console.log('Testing functional features...');
  try {
    // Find "View Details" or "Book Now" or similar buttons
    const propertyButtons = await mobilePage.$$('text=View Details, text=Book Now, text=Explore');
    if (propertyButtons.length > 0) {
      console.log(`Found ${propertyButtons.length} property buttons, clicking the first one.`);
      await propertyButtons[0].click({ timeout: 5000 });
      await mobilePage.waitForTimeout(1000);
      await mobilePage.screenshot({ path: path.join(screenshotDir, 'mobile_property_details.png'), fullPage: true, timeout: 5000 }).catch(()=>{});
    }
  } catch (e) {}

  // Find Forms (Contact, etc)
  const forms = await mobilePage.$$('form');
  const formResults = [];
  if (forms.length > 0) {
    try {
      console.log(`Found ${forms.length} forms. Testing first form...`);
      const form = forms[0];
      
      // Blank submission
      const submitBtn = await form.$('button[type="submit"], input[type="submit"], button:has-text("Submit"), button:has-text("Send")');
      if (submitBtn) {
        let didReloadForm = false;
        const reloadListenerForm = () => { didReloadForm = true; };
        mobilePage.once('framenavigated', reloadListenerForm);
        
        await submitBtn.click({ timeout: 5000 });
        await mobilePage.waitForTimeout(1000);
        mobilePage.removeListener('framenavigated', reloadListenerForm);
        
        await mobilePage.screenshot({ path: path.join(screenshotDir, 'mobile_form_blank_submit.png'), timeout: 5000 }).catch(()=>{});
        
        formResults.push({
          type: 'Blank Submission',
          isPreventDefaultWorking: !didReloadForm
        });
        
        // Dummy data submission
        const inputs = await form.$$('input:not([type="submit"]), textarea');
        for (const input of inputs) {
          const type = await input.getAttribute('type');
          if (type === 'email') await input.fill('test@example.com');
          else await input.fill('Test input');
        }
        
        didReloadForm = false;
        mobilePage.once('framenavigated', reloadListenerForm);
        await submitBtn.click({ timeout: 5000 });
        await mobilePage.waitForTimeout(1000);
        mobilePage.removeListener('framenavigated', reloadListenerForm);
        
        await mobilePage.screenshot({ path: path.join(screenshotDir, 'mobile_form_dummy_submit.png'), timeout: 5000 }).catch(()=>{});
        formResults.push({
          type: 'Dummy Data Submission',
          isPreventDefaultWorking: !didReloadForm
        });
      }
    } catch (e) {
      console.log('Error testing form: ' + e.message);
    }
  }

  await browser.close();

  const report = {
    navigation: navResults,
    responsiveness: {
      hasHorizontalScrollOnMobile: hasHorizontalScroll
    },
    forms: formResults,
    logs: logs,
    errors: errors,
    networkErrors: networkErrors
  };

  fs.writeFileSync(path.join(screenshotDir, 'audit_report.json'), JSON.stringify(report, null, 2));
  console.log('Audit complete.');
}

runAudit().catch(console.error);
