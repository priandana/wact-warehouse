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

const targetUrl = 'https://wact-warehouse.vercel.app/login';

console.log('Navigating to:', targetUrl);

// 1. Desktop 1440x900
const desktopContext = await browser.newContext({
  viewport: { width: 1440, height: 900 },
  deviceScaleFactor: 2,
});
const desktopPage = await desktopContext.newPage();
await desktopPage.goto(targetUrl, { waitUntil: 'networkidle' });
await desktopPage.waitForTimeout(1000);
const desktopPath = path.join(outDir, 'login_desktop_1440.png');
await desktopPage.screenshot({ path: desktopPath, fullPage: false });
console.log('Saved:', desktopPath);

// 2. Mobile 375x812
const mobileContext = await browser.newContext({
  viewport: { width: 375, height: 812 },
  deviceScaleFactor: 2,
  isMobile: true,
});
const mobilePage = await mobileContext.newPage();
await mobilePage.goto(targetUrl, { waitUntil: 'networkidle' });
await mobilePage.waitForTimeout(1000);
const mobilePath = path.join(outDir, 'login_mobile_375.png');
await mobilePage.screenshot({ path: mobilePath, fullPage: false });
console.log('Saved:', mobilePath);

// 3. Mobile 430x932
const mobile430Context = await browser.newContext({
  viewport: { width: 430, height: 932 },
  deviceScaleFactor: 2,
  isMobile: true,
});
const mobile430Page = await mobile430Context.newPage();
await mobile430Page.goto(targetUrl, { waitUntil: 'networkidle' });
await mobile430Page.waitForTimeout(1000);
const mobile430Path = path.join(outDir, 'login_mobile_430.png');
await mobile430Page.screenshot({ path: mobile430Path, fullPage: false });
console.log('Saved:', mobile430Path);

await browser.close();
console.log('Screenshots completed successfully!');
