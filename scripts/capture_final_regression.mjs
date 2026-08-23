import { chromium } from 'playwright-core';
import fs from 'fs';
import path from 'path';

const outDir = path.resolve('public/screenshots');
if (!fs.existsSync(outDir)) {
  fs.mkdirSync(outDir, { recursive: true });
}

const executablePaths = [
  'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe',
  'C:\\Program Files (x86)\\Google\\Chrome\\Application\\chrome.exe',
  'C:\\Program Files (x86)\\Microsoft\\Edge\\Application\\msedge.exe',
  'C:\\Program Files\\Microsoft\\Edge\\Application\\msedge.exe',
];

const executablePath = executablePaths.find((p) => fs.existsSync(p));
console.log('Using executable:', executablePath);

const browser = await chromium.launch({
  executablePath,
  headless: true,
});

const baseUrl = 'https://wact-warehouse.vercel.app';
const caseId = 'd003f4ad-d974-423f-ab34-9d753a92f7df';

const context = await browser.newContext({
  viewport: { width: 1440, height: 1100 },
  deviceScaleFactor: 2,
});
const page = await context.newPage();

console.log('Logging in as Coordinator BDG...');
await page.goto(`${baseUrl}/login`, { waitUntil: 'networkidle' });
await page.fill('input#email', 'coordinator.bdg@wact.test');
await page.fill('input#password', 'Password123!');
await page.click('button[type="submit"]');
await page.waitForTimeout(4000);
console.log('Logged in!');

console.log('Navigating to Case Detail for WHC-BDG-260823-006...');
await page.goto(`${baseUrl}/cases/${caseId}`, { waitUntil: 'networkidle' });
await page.waitForTimeout(2500);

const dest = path.join(outDir, 'final_regression_casedetail_1440.png');
await page.screenshot({ path: dest, fullPage: true });
console.log('Saved:', dest);

const brainDest = 'C:\\Users\\Priandana\\.gemini\\antigravity\\brain\\92de4bc8-0fa5-465e-92a5-7dbac64fcf0e\\final_regression_casedetail_1440.png';
fs.copyFileSync(dest, brainDest);
console.log('Copied to brain:', brainDest);

await browser.close();
console.log('Final screenshot captured successfully!');
