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
console.log('Starting Desktop session...');
const desktopContext = await browser.newContext({
  viewport: { width: 1440, height: 900 },
  deviceScaleFactor: 2,
});
const desktopPage = await desktopContext.newPage();

// Login
await desktopPage.goto(`${baseUrl}/login`, { waitUntil: 'networkidle' });
await desktopPage.fill('input#email', 'pic.bdg@wact.test');
await desktopPage.fill('input#password', 'Password123!');
await desktopPage.click('button[type="submit"]');
await desktopPage.waitForURL(`${baseUrl}/dashboard`, { timeout: 15000 });
console.log('Desktop logged in successfully!');

// Go to My Tasks
await desktopPage.goto(`${baseUrl}/my-tasks`, { waitUntil: 'networkidle' });
await desktopPage.waitForTimeout(1500);
const desktopMyTasksPath = path.join(outDir, 'pic_mytasks_desktop_1440.png');
await desktopPage.screenshot({ path: desktopMyTasksPath, fullPage: false });
console.log('Saved:', desktopMyTasksPath);

// Go to Case Detail
await desktopPage.goto(`${baseUrl}/cases/${caseId}`, { waitUntil: 'networkidle' });
await desktopPage.waitForTimeout(1500);
const desktopCaseDetailPath = path.join(outDir, 'pic_casedetail_desktop_1440.png');
await desktopPage.screenshot({ path: desktopCaseDetailPath, fullPage: false });
console.log('Saved:', desktopCaseDetailPath);

// ── 2. Mobile 375x812 Session ────────────────────────────────────────────
console.log('Starting Mobile 375px session...');
const mobileContext = await browser.newContext({
  viewport: { width: 375, height: 812 },
  deviceScaleFactor: 2,
  isMobile: true,
});
const mobilePage = await mobileContext.newPage();

// Login
await mobilePage.goto(`${baseUrl}/login`, { waitUntil: 'networkidle' });
await mobilePage.fill('input#email', 'pic.bdg@wact.test');
await mobilePage.fill('input#password', 'Password123!');
await mobilePage.click('button[type="submit"]');
await mobilePage.waitForURL(`${baseUrl}/dashboard`, { timeout: 15000 });
console.log('Mobile logged in successfully!');

// Go to My Tasks
await mobilePage.goto(`${baseUrl}/my-tasks`, { waitUntil: 'networkidle' });
await mobilePage.waitForTimeout(1500);
const mobileMyTasksPath = path.join(outDir, 'pic_mytasks_mobile_375.png');
await mobilePage.screenshot({ path: mobileMyTasksPath, fullPage: false });
console.log('Saved:', mobileMyTasksPath);

// Go to Case Detail
await mobilePage.goto(`${baseUrl}/cases/${caseId}`, { waitUntil: 'networkidle' });
await mobilePage.waitForTimeout(1500);
const mobileCaseDetailPath = path.join(outDir, 'pic_casedetail_mobile_375.png');
await mobilePage.screenshot({ path: mobileCaseDetailPath, fullPage: false });
console.log('Saved:', mobileCaseDetailPath);

await browser.close();
console.log('PIC E2E screenshots completed successfully!');
