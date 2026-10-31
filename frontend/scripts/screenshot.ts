import { chromium } from 'playwright';

async function main() {
	const browser = await chromium.launch();
	const page = await browser.newPage({ viewport: { width: 1280, height: 900 } });

	await page.goto('http://localhost:5173/#/dashboard', { waitUntil: 'networkidle' });
	await page.waitForTimeout(1500);
	await page.screenshot({ path: '/tmp/dashboard-browse.png', fullPage: true });

	await page.goto('http://localhost:5173/#/dashboard/board', { waitUntil: 'networkidle' });
	await page.waitForTimeout(500);
	await page.screenshot({ path: '/tmp/dashboard-board.png', fullPage: true });

	const consoleErrors: string[] = [];
	page.on('console', (msg) => {
		if (msg.type() === 'error') consoleErrors.push(msg.text());
	});
	await page.reload({ waitUntil: 'networkidle' });
	await page.waitForTimeout(500);
	console.log('console errors on board tab reload:', consoleErrors);

	await browser.close();
}

main();
