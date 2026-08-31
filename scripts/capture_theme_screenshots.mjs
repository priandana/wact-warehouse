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
console.log('Using browser executable:', executablePath);

const browser = await chromium.launch({
  executablePath,
  headless: true,
});

async function capture() {
  const targetBase = 'https://wact-warehouse.vercel.app';

  // 1. Desktop Light Mode 1440x900
  const ctxLight = await browser.newContext({
    viewport: { width: 1440, height: 900 },
    deviceScaleFactor: 2,
  });
  const pageLight = await ctxLight.newPage();
  
  await pageLight.addInitScript(() => {
    localStorage.setItem('wact-integrity-theme', 'light');
  });

  console.log('Navigating to Report Light Mode...');
  await pageLight.goto(`${targetBase}/integrity/report`, { waitUntil: 'domcontentloaded', timeout: 20000 });
  await pageLight.waitForTimeout(2000);
  const pathLightReport = path.join(outDir, 'integrity_report_light_1440.png');
  await pageLight.screenshot({ path: pathLightReport, fullPage: false });
  console.log('Saved:', pathLightReport);

  // 2. Desktop Dark Mode 1440x900
  const ctxDark = await browser.newContext({
    viewport: { width: 1440, height: 900 },
    deviceScaleFactor: 2,
  });
  const pageDark = await ctxDark.newPage();
  await pageDark.addInitScript(() => {
    localStorage.setItem('wact-integrity-theme', 'dark');
  });

  console.log('Navigating to Report Dark Mode...');
  await pageDark.goto(`${targetBase}/integrity/report`, { waitUntil: 'domcontentloaded', timeout: 20000 });
  await pageDark.waitForTimeout(2000);
  const pathDarkReport = path.join(outDir, 'integrity_report_dark_1440.png');
  await pageDark.screenshot({ path: pathDarkReport, fullPage: false });
  console.log('Saved:', pathDarkReport);

  // 3. Mobile 390x844 Light
  const ctxMobileLight = await browser.newContext({
    viewport: { width: 390, height: 844 },
    deviceScaleFactor: 2,
  });
  const pageMobileLight = await ctxMobileLight.newPage();
  await pageMobileLight.addInitScript(() => {
    localStorage.setItem('wact-integrity-theme', 'light');
  });
  console.log('Navigating to Report Mobile Light...');
  await pageMobileLight.goto(`${targetBase}/integrity/report`, { waitUntil: 'domcontentloaded', timeout: 20000 });
  await pageMobileLight.waitForTimeout(2000);
  const pathMobileLight = path.join(outDir, 'integrity_report_mobile_390_light.png');
  await pageMobileLight.screenshot({ path: pathMobileLight, fullPage: false });
  console.log('Saved:', pathMobileLight);

  // 4. Track Page Light Mode
  console.log('Navigating to Track Light Mode...');
  await pageLight.goto(`${targetBase}/integrity/track`, { waitUntil: 'domcontentloaded', timeout: 20000 });
  await pageLight.waitForTimeout(2000);
  const pathTrackLight = path.join(outDir, 'integrity_track_light_1440.png');
  await pageLight.screenshot({ path: pathTrackLight, fullPage: false });
  console.log('Saved:', pathTrackLight);

  // 5. Track Page Dark Mode
  console.log('Navigating to Track Dark Mode...');
  await pageDark.goto(`${targetBase}/integrity/track`, { waitUntil: 'domcontentloaded', timeout: 20000 });
  await pageDark.waitForTimeout(2000);
  const pathTrackDark = path.join(outDir, 'integrity_track_dark_1440.png');
  await pageDark.screenshot({ path: pathTrackDark, fullPage: false });
  console.log('Saved:', pathTrackDark);

  await browser.close();
  console.log('All screenshots captured successfully!');
}

capture();
