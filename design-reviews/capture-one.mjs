// node one.mjs url out.png width height scrollY
import { chromium } from 'playwright-core';
const [url, out, w, h, y] = process.argv.slice(2);
const exe = `${process.env.HOME}/Library/Caches/ms-playwright/chromium-1243/chrome-mac-arm64/Google Chrome for Testing.app/Contents/MacOS/Google Chrome for Testing`;
const b = await chromium.launch({ executablePath: exe, args: ['--use-angle=swiftshader','--enable-unsafe-swiftshader'] });
const p = await (await b.newContext({ viewport: { width: +w, height: +h }, isMobile: +w < 600, hasTouch: +w < 600 })).newPage();
await p.goto(url, { waitUntil: 'networkidle' });
await p.waitForTimeout(2000);
await p.evaluate((y) => window.scrollTo({ top: y, behavior: 'instant' }), +y);
await p.waitForTimeout(1500);
await p.screenshot({ path: out });
await b.close();
