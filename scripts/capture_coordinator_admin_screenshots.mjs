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

const baseUrl = 'https://wact-warehouse.vercel.app';
const newCaseId = 'd3c9950f-bdc4-4055-a739-cdb918dd64e7';

// ── 1. Coordinator BDG Desktop 1440x900 Session ──────────────────────────
console.log('Starting Coordinator BDG Desktop session...');
const coordDesktopContext = await browser.newContext({
  viewport: { width: 1440, height: 900 },
  deviceScaleFactor: 2,
});
const coordDesktopPage = await coordDesktopContext.newPage();

// Login as Coordinator BDG
await coordDesktopPage.goto(`${baseUrl}/login`, { waitUntil: 'networkidle' });
await coordDesktopPage.fill('input#email', 'coordinator.bdg@wact.test');
await coordDesktopPage.fill('input#password', 'Password123!');
await coordDesktopPage.click('button[type="submit"]');
await coordDesktopPage.waitForURL(`${baseUrl}/dashboard`, { timeout: 15000 });
console.log('Coordinator Desktop logged in successfully!');

// Screenshot Case Detail
await coordDesktopPage.goto(`${baseUrl}/cases/${newCaseId}`, { waitUntil: 'networkidle' });
await coordDesktopPage.waitForTimeout(1500);
const coordCaseDetailDesktop = path.join(outDir, 'coord_casedetail_desktop_1440.png');
await coordDesktopPage.screenshot({ path: coordCaseDetailDesktop, fullPage: false });
console.log('Saved:', coordCaseDetailDesktop);

// Screenshot Cases List
await coordDesktopPage.goto(`${baseUrl}/cases`, { waitUntil: 'networkidle' });
await coordDesktopPage.waitForTimeout(1500);
const coordCasesDesktop = path.join(outDir, 'coord_cases_desktop_1440.png');
await coordDesktopPage.screenshot({ path: coordCasesDesktop, fullPage: false });
console.log('Saved:', coordCasesDesktop);

// ── 2. Coordinator BDG Mobile 375x812 Session ────────────────────────────
console.log('Starting Coordinator BDG Mobile 375px session...');
const coordMobileContext = await browser.newContext({
  viewport: { width: 375, height: 812 },
  deviceScaleFactor: 2,
  isMobile: true,
});
const coordMobilePage = await coordMobileContext.newPage();

await coordMobilePage.goto(`${baseUrl}/login`, { waitUntil: 'networkidle' });
await coordMobilePage.fill('input#email', 'coordinator.bdg@wact.test');
await coordMobilePage.fill('input#password', 'Password123!');
await coordMobilePage.click('button[type="submit"]');
await coordMobilePage.waitForURL(`${baseUrl}/dashboard`, { timeout: 15000 });
console.log('Coordinator Mobile logged in successfully!');

await coordMobilePage.goto(`${baseUrl}/cases/${newCaseId}`, { waitUntil: 'networkidle' });
await coordMobilePage.waitForTimeout(1500);
const coordCaseDetailMobile = path.join(outDir, 'coord_casedetail_mobile_375.png');
await coordMobilePage.screenshot({ path: coordCaseDetailMobile, fullPage: false });
console.log('Saved:', coordCaseDetailMobile);

// ── 3. Admin BDG Desktop Session ─────────────────────────────────────────
console.log('Starting Admin Desktop session...');
const adminDesktopContext = await browser.newContext({
  viewport: { width: 1440, height: 900 },
  deviceScaleFactor: 2,
});
const adminDesktopPage = await adminDesktopContext.newPage();

await adminDesktopPage.goto(`${baseUrl}/login`, { waitUntil: 'networkidle' });
await adminDesktopPage.fill('input#email', 'admin@wact.test');
await adminDesktopPage.fill('input#password', 'Password123!');
await adminDesktopPage.click('button[type="submit"]');
await adminDesktopPage.waitForURL(`${baseUrl}/dashboard`, { timeout: 15000 });
console.log('Admin Desktop logged in successfully!');

await adminDesktopPage.goto(`${baseUrl}/cases/${newCaseId}`, { waitUntil: 'networkidle' });
await adminDesktopPage.waitForTimeout(1500);
const adminCaseDetailDesktop = path.join(outDir, 'admin_casedetail_desktop_1440.png');
await adminDesktopPage.screenshot({ path: adminCaseDetailDesktop, fullPage: false });
console.log('Saved:', adminCaseDetailDesktop);

await browser.close();
console.log('Coordinator & Admin E2E screenshots completed successfully!');
