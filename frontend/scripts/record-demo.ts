// Records a short demo video of the real app: landing page -> live dashboard -> browse
// tab (lookup) -> Sharia board tab -> connect -> propose -> own signature counted.
// Needs `npm run dev` (vite, proxying /api) and dev-api-server.ts both already running.
import { chromium } from 'playwright';
import { privateKeyToAccount } from 'viem/accounts';
import type { Hex } from 'viem';

async function main() {
	const account = privateKeyToAccount(process.env.SHARIA_BOARD_MEMBER_1_PRIVATE_KEY as Hex);
	const browser = await chromium.launch();
	const context = await browser.newContext({
		viewport: { width: 1280, height: 800 },
		recordVideo: { dir: '/tmp/mizan-demo-video', size: { width: 1280, height: 800 } },
	});
	const page = await context.newPage();

	await page.exposeFunction('__mizanPersonalSign', async (hexMessage: Hex) =>
		account.signMessage({ message: { raw: hexMessage } }),
	);
	await page.addInitScript({
		content: `
			window.ethereum = {
				isMetaMask: true,
				request: async ({ method, params }) => {
					switch (method) {
						case 'eth_requestAccounts':
						case 'eth_accounts':
							return ['${account.address}'];
						case 'eth_chainId':
							return '0xaa36a7';
						case 'wallet_switchEthereumChain':
							return null;
						case 'personal_sign':
							return window.__mizanPersonalSign(params?.[0] ?? '');
						default:
							throw new Error('mock wallet: unsupported method ' + method);
					}
				},
				on: () => {},
				removeListener: () => {},
			};
		`,
	});

	// 1. Landing page.
	await page.goto('http://localhost:5173/#top', { waitUntil: 'networkidle' });
	await page.waitForTimeout(2500);

	// 2. Into the live dashboard.
	await page.getByRole('link', { name: /live dashboard/i }).click();
	await page.waitForTimeout(1500);

	// 3. Browse tab: look up an asset with no assessment yet.
	await page.getByLabel('Asset contract address').fill('0xfFf9976782d46CC05630D1f6eBAb18b2324d6B14');
	await page.getByRole('button', { name: /look up/i }).click();
	await page.waitForTimeout(2000);

	// 4. Sharia board tab.
	await page.getByRole('button', { name: /sharia board/i }).click();
	await page.waitForTimeout(500);
	const connect = page.getByRole('button', { name: /connect wallet/i });
	if (await connect.isVisible().catch(() => false)) {
		await connect.click();
	}
	await page.waitForSelector('text=Signed in as', { timeout: 15000 });
	await page.waitForTimeout(1000);

	// 5. Propose.
	const asset = '0x6B175474E89094C44Da98b954EedeAC495271d0F'; // demo subject, distinct from other scripts
	await page.getByLabel('Asset contract address').fill(asset);
	await page.getByLabel('Evidence note').fill('Demo recording: reviewed public filings, no interest-bearing debt found.');
	await page.getByRole('button', { name: /^propose$/i }).click();
	await page.waitForSelector(`text=${asset}`, { timeout: 15000 });
	await page.waitForTimeout(1500);

	// 6. Sign as the proposer.
	await page.getByRole('button', { name: /^sign$/i }).click();
	await page.waitForTimeout(2500);

	await context.close();
	await browser.close();
	console.log('Recorded. Video saved under /tmp/mizan-demo-video/');
}

main().catch((error) => {
	console.error('FAIL', error);
	process.exit(1);
});
