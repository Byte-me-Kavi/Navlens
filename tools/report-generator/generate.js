const puppeteer = require('puppeteer');
const path = require('path');
const fs = require('fs');

// --- CONFIGURATION ---
const SITE_ID = '10104f75-c77f-4851-ab22-d9bf99ce2ff2'; // <--- CHANGE THIS for each client
const REPORT_URL = `http://localhost:3000/report-preview/${SITE_ID}`;
const OUTPUT_FILENAME = `Navlens_Report_${SITE_ID}_${Date.now()}.pdf`;

// Admin Login Credentials (for local auto-login)
const ADMIN_EMAIL = 'kaveeshatmdss@gmail.com'; 
const ADMIN_PASSWORD = 'secure_admin_password_123'; 

(async () => {
  console.log('🚀 Starting Local Report Generator...');
  
  // 1. Launch Browser
  const browser = await puppeteer.launch({
    headless: false, 
    defaultViewport: null,
    args: ['--start-maximized'],
    // Found Chrome at 32-bit path
    executablePath: 'C:\\Program Files (x86)\\Google\\Chrome\\Application\\chrome.exe'
  });

  const page = await browser.newPage();
  
  // Set high-res viewport for better screenshot/PDF quality
  await page.setViewport({ width: 1440, height: 900, deviceScaleFactor: 2 });

  // 2. Login Flow
  console.log('🔑 Authenticating...');
  try {
    // Go to a page that triggers the admin check, or just the login page
    await page.goto('http://localhost:3000/sys-secure-entry-x92', { waitUntil: 'networkidle0' });
    
    // Check for login input
    const identifierSelector = 'input[placeholder="Enter admin identifier"]';
    
    // Wait a moment for animation
    await new Promise(r => setTimeout(r, 1000));

    if (await page.$(identifierSelector) !== null) {
        console.log('Logging in...');
        
        // Use more specific selectors based on placeholder since IDs might be missing
        await page.type('input[placeholder="Enter admin identifier"]', ADMIN_EMAIL);
        await page.type('input[placeholder="Enter secure passkey"]', ADMIN_PASSWORD);
        
        // Find the specific Authenticate button
        // Use Promise.all to prevent race condition where navigation starts before we await it
        await Promise.all([
          page.waitForNavigation({ waitUntil: 'domcontentloaded', timeout: 60000 }),
          page.click('button[type="submit"]'),
        ]);
        console.log('✅ Logged in successfully');
    } else {
        console.log('ℹ️ Already logged in or different page detected');
    }

  } catch (error) {
    console.warn('⚠️ Login logic encountered specific state:', error.message);
  }

  // 3. Navigate to Report Preview
  console.log(`📄 Navigating to Report: ${REPORT_URL}`);
  // Increased timeout to 2 minutes for heavy report generation
  await page.goto(REPORT_URL, { waitUntil: 'domcontentloaded', timeout: 120000 });

  // Safety check: ensure we are NOT on the login page anymore
  const pageContent = await page.content();
  if (pageContent.includes('Restricted Access') || pageContent.includes('Enter admin identifier')) {
      console.error('❌ FATAL: Stuck on login page. Credentials might be wrong or session failed.');
      await browser.close();
      return;
  }

  // 4. Wait for Render & Hide Cookie Banner
  // Increased wait time to 15s because we are loading multiple heatmaps now
  console.log('⏳ Waiting for charts & heatmaps to stabilize (15s)...');
  await new Promise(r => setTimeout(r, 15000));

  // Hide Cookie Banner and other non-print elements
  await page.addStyleTag({
      content: `
          .cookie-banner, [class*="cookie"], [class*="banner"] { display: none !important; }
          nav, aside { display: none !important; }
      `
  });

  // 5. Generate PDF
  console.log('🖨️  Printing PDF...');
  
  // Create 'output' folder if not exists
  const outputDir = path.join(__dirname, 'output');
  if (!fs.existsSync(outputDir)){
      fs.mkdirSync(outputDir);
  }
  
  await page.pdf({
    path: path.join(outputDir, OUTPUT_FILENAME),
    format: 'A4',
    printBackground: true,
    margin: { 
        top: '10mm', 
        bottom: '10mm',
        left: '10mm',
        right: '10mm'
    }
  });

  console.log(`✅ PDF Saved to: tools/report-generator/output/${OUTPUT_FILENAME}`);

  await browser.close();
  console.log('👋 Done.');
})();
