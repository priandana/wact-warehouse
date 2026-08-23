import { chromium } from 'playwright-core';
import fs from 'fs';
import path from 'path';

const outDir = path.resolve('public/screenshots');
if (!fs.existsSync(outDir)) {
  fs.mkdirSync(outDir, { recursive: true });
}

// Find local chrome or edge executable
const executablePaths = [
  'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe',
  'C:\\Program Files (x86)\\Google\\Chrome\\Application\\chrome.exe',
  'C:\\Program Files (x86)\\Microsoft\\Edge\\Application\\msedge.exe',
  'C:\\Program Files\\Microsoft\\Edge\\Application\\msedge.exe',
];

const executablePath = executablePaths.find((p) => fs.existsSync(p));
console.log('Using browser executable:', executablePath);

const browser = await chromium.launch({
  executablePath,
  headless: true,
});

const baseUrl = 'http://localhost:3000';

// ── 1. Desktop 1440x900 Session ──────────────────────────────────────────
console.log('Starting QC Desktop session...');
const desktopContext = await browser.newContext({
  viewport: { width: 1440, height: 900 },
  deviceScaleFactor: 2,
});
const desktopPage = await desktopContext.newPage();

// Login as Admin
await desktopPage.goto(`${baseUrl}/login`, { waitUntil: 'networkidle' });
await desktopPage.fill('input#email', 'admin@wact.test');
await desktopPage.fill('input#password', 'Password123!');
await desktopPage.click('button[type="submit"]');
await desktopPage.waitForURL(`${baseUrl}/dashboard`, { timeout: 15000 });
console.log('Admin Desktop logged in successfully!');

// Screenshot 1: Inspections List Page (Desktop 1440)
await desktopPage.goto(`${baseUrl}/inspections`, { waitUntil: 'networkidle' });
await desktopPage.waitForTimeout(1000);
const desktopInspectionsPath = path.join(outDir, 'phase2c_inspections_desktop_1440.png');
await desktopPage.screenshot({ path: desktopInspectionsPath, fullPage: false });
console.log('Saved:', desktopInspectionsPath);

// Screenshot 2: Start Inspection Page (Desktop 1440)
await desktopPage.goto(`${baseUrl}/inspections/new`, { waitUntil: 'networkidle' });
await desktopPage.waitForTimeout(1000);
const desktopNewInspPath = path.join(outDir, 'phase2c_new_inspection_desktop_1440.png');
await desktopPage.screenshot({ path: desktopNewInspPath, fullPage: false });
console.log('Saved:', desktopNewInspPath);

// Screenshot 3: Templates Master Page (Desktop 1440)
await desktopPage.goto(`${baseUrl}/inspections/templates`, { waitUntil: 'networkidle' });
await desktopPage.waitForTimeout(1000);
const desktopTemplatesPath = path.join(outDir, 'phase2c_templates_desktop_1440.png');
await desktopPage.screenshot({ path: desktopTemplatesPath, fullPage: false });
console.log('Saved:', desktopTemplatesPath);

// ── 2. Mobile 375x812 Session ────────────────────────────────────────────
console.log('Starting QC Mobile 375px session...');
const mobileContext = await browser.newContext({
  viewport: { width: 375, height: 812 },
  deviceScaleFactor: 2,
  isMobile: true,
});
const mobilePage = await mobileContext.newPage();

// Login as Admin Mobile
await mobilePage.goto(`${baseUrl}/login`, { waitUntil: 'networkidle' });
await mobilePage.fill('input#email', 'admin@wact.test');
await mobilePage.fill('input#password', 'Password123!');
await mobilePage.click('button[type="submit"]');
await mobilePage.waitForURL(`${baseUrl}/dashboard`, { timeout: 15000 });
console.log('Admin Mobile logged in successfully!');

// Screenshot 4: Inspections List Page (Mobile 375)
await mobilePage.goto(`${baseUrl}/inspections`, { waitUntil: 'networkidle' });
await mobilePage.waitForTimeout(1000);
const mobileInspectionsPath = path.join(outDir, 'phase2c_inspections_mobile_375.png');
await mobilePage.screenshot({ path: mobileInspectionsPath, fullPage: false });
console.log('Saved:', mobileInspectionsPath);

// Screenshot 5: Start Inspection Page (Mobile 375)
await mobilePage.goto(`${baseUrl}/inspections/new`, { waitUntil: 'networkidle' });
await mobilePage.waitForTimeout(1000);
const mobileNewInspPath = path.join(outDir, 'phase2c_new_inspection_mobile_375.png');
await mobilePage.screenshot({ path: mobileNewInspPath, fullPage: false });
console.log('Saved:', mobileNewInspPath);

// Screenshot 6: Templates Master Page (Mobile 375)
await mobilePage.goto(`${baseUrl}/inspections/templates`, { waitUntil: 'networkidle' });
await mobilePage.waitForTimeout(1000);
const mobileTemplatesPath = path.join(outDir, 'phase2c_templates_mobile_375.png');
await mobilePage.screenshot({ path: mobileTemplatesPath, fullPage: false });
console.log('Saved:', mobileTemplatesPath);

await browser.close();
console.log('Phase 2C screenshots captured successfully!');
