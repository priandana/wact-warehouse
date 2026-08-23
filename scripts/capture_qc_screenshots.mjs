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
const caseId = 'af4fa63f-2423-4655-af0c-d65a90ac9f44';

// ── 1. Desktop 1440x900 Session ──────────────────────────────────────────
console.log('Starting QC Desktop session...');
const desktopContext = await browser.newContext({
  viewport: { width: 1440, height: 900 },
  deviceScaleFactor: 2,
});
const desktopPage = await desktopContext.newPage();

// Login as QC Leader BDG
await desktopPage.goto(`${baseUrl}/login`, { waitUntil: 'networkidle' });
await desktopPage.fill('input#email', 'qc.bdg@wact.test');
await desktopPage.fill('input#password', 'Password123!');
await desktopPage.click('button[type="submit"]');
await desktopPage.waitForURL(`${baseUrl}/dashboard`, { timeout: 15000 });
console.log('QC Desktop logged in successfully!');

// Screenshot Case Detail
await desktopPage.goto(`${baseUrl}/cases/${caseId}`, { waitUntil: 'networkidle' });
await desktopPage.waitForTimeout(1500);
const desktopCaseDetailPath = path.join(outDir, 'qc_casedetail_desktop_1440.png');
await desktopPage.screenshot({ path: desktopCaseDetailPath, fullPage: false });
console.log('Saved:', desktopCaseDetailPath);

// Screenshot Cases List
await desktopPage.goto(`${baseUrl}/cases`, { waitUntil: 'networkidle' });
await desktopPage.waitForTimeout(1500);
const desktopCasesListPath = path.join(outDir, 'qc_cases_desktop_1440.png');
await desktopPage.screenshot({ path: desktopCasesListPath, fullPage: false });
console.log('Saved:', desktopCasesListPath);

// ── 2. Mobile 375x812 Session ────────────────────────────────────────────
console.log('Starting QC Mobile 375px session...');
const mobileContext = await browser.newContext({
  viewport: { width: 375, height: 812 },
  deviceScaleFactor: 2,
  isMobile: true,
});
const mobilePage = await mobileContext.newPage();

// Login as QC Leader BDG
await mobilePage.goto(`${baseUrl}/login`, { waitUntil: 'networkidle' });
await mobilePage.fill('input#email', 'qc.bdg@wact.test');
await mobilePage.fill('input#password', 'Password123!');
await mobilePage.click('button[type="submit"]');
await mobilePage.waitForURL(`${baseUrl}/dashboard`, { timeout: 15000 });
console.log('QC Mobile logged in successfully!');

// Screenshot Case Detail
await mobilePage.goto(`${baseUrl}/cases/${caseId}`, { waitUntil: 'networkidle' });
await mobilePage.waitForTimeout(1500);
const mobileCaseDetailPath = path.join(outDir, 'qc_casedetail_mobile_375.png');
await mobilePage.screenshot({ path: mobileCaseDetailPath, fullPage: false });
console.log('Saved:', mobileCaseDetailPath);

await browser.close();
console.log('QC E2E screenshots completed successfully!');
