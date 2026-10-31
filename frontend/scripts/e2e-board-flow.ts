// Full browser E2E for the Sharia-board tab: connect (mock EIP-1193 wallet backed by a
// real demo board key), propose, sign with the other two members, and confirm the UI
// reaches quorum_reached — exercising the actual rendered React app, not just the
// underlying lib functions. Needs the dashboard dev server (localhost:5173, proxying
// /api to frontend/scripts/dev-api-server.ts on :8787) already running.
//
// Usage: set -a; source secrets; source smart-contract/board-keys.local; set +a
//        npx tsx frontend/scripts/e2e-board-flow.ts
import { chromium, type Page } from 'playwright';
import { privateKeyToAccount } from 'viem/accounts';
import type { Address, Hex } from 'viem';

const requireEnv = (name: string): string => {
	const value = process.env[name];
	if (!value) throw new Error(`missing required env var ${name}`);
	return value;
};

const member = (n: number) => ({
	address: requireEnv(`SHARIA_BOARD_MEMBER_${n}_ADDRESS`) as Address,
	account: privateKeyToAccount(requireEnv(`SHARIA_BOARD_MEMBER_${n}_PRIVATE_KEY`) as Hex),
});

// Installs a minimal EIP-1193 provider on the page, backed by a real viem account via
// exposed Node-side signing functions (private keys never touch page JS).
async function installMockWallet(page: Page, account: ReturnType<typeof privateKeyToAccount>) {
	// EIP-1193's personal_sign convention is (hexMessage, address) — the message arrives
	// hex-encoded, not as plain text, matching MetaMask/viem's custom-transport behavior.
	await page.exposeFunction('__mizanPersonalSign', async (hexMessage: Hex) =>
		account.signMessage({ message: { raw: hexMessage } }),
	);
	// The page hands over EIP-712 typed data exactly as viem's custom-transport serialized it
	// for the wallet_* RPC call, i.e. uint64/uint256 fields as decimal strings (valid JSON has
	// no bigint). Coerce just those known numeric fields back to bigint before re-signing with
	// the real account — the rest (domain, types, addresses, bytes32, strings) pass through.
	await page.exposeFunction('__mizanSignTypedData', async (raw: string) => {
		const typedData = JSON.parse(raw) as {
			domain: Record<string, unknown>;
			types: Record<string, unknown>;
			primaryType: string;
			message: { issue: Record<string, unknown>; opinion: number };
		};
		const issue = typedData.message.issue;
		return account.signTypedData({
			domain: typedData.domain,
			types: typedData.types,
			primaryType: typedData.primaryType as 'ShariaBoardMemberOpinion',
			message: {
				issue: {
					...issue,
					boardIssuedAt: BigInt(issue.boardIssuedAt as string),
					expiresAt: BigInt(issue.expiresAt as string),
					deadline: BigInt(issue.deadline as string),
					previousId: BigInt(issue.previousId as string),
					nonce: BigInt(issue.nonce as string),
				},
				opinion: typedData.message.opinion,
			},
		} as never);
	});
	// A string-content init script, not a serialized function — Playwright/tsx's function
	// serialization path injects an esbuild `__name` helper call with nothing defining
	// `__name` in the page, which throws before window.ethereum is ever set.
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
						case 'eth_signTypedData_v4': {
							const raw = params?.[1];
							return window.__mizanSignTypedData(typeof raw === 'string' ? raw : JSON.stringify(raw));
						}
						default:
							throw new Error('mock wallet: unsupported method ' + method);
					}
				},
				on: () => {},
				removeListener: () => {},
			};
		`,
	});
}

async function main() {
	const asset = '0x1c7D4B196Cb0C7B01d743Fbc6116a902379C7238' as Address; // Sepolia USDC demo subject
	const [m1, m2, m3] = [member(1), member(2), member(3)];

	const browser = await chromium.launch();

	// Member 1 proposes.
	const page1 = await browser.newPage();
	await installMockWallet(page1, m1.account);
	page1.on('console', (msg) => msg.type() === 'error' && console.error('[page1 console]', msg.text()));
	await page1.goto('http://localhost:5173/#/dashboard/board', { waitUntil: 'networkidle' });
	// The mock wallet reports eth_accounts as already-authorized (realistic for a wallet
	// that previously granted this site permission), so the app may skip straight past the
	// connect button to the membership-gated board view.
	const connectButton = page1.getByRole('button', { name: /connect wallet/i });
	if (await connectButton.isVisible().catch(() => false)) await connectButton.click();
	await page1.waitForSelector('text=Signed in as', { timeout: 15000 });
	console.log('[1/3] member1 connected and recognized as active board member');

	await page1.getByLabel('Asset contract address').fill(asset);
	await page1.getByLabel('Evidence note').fill('E2E test: real-browser propose via mock wallet, demo subject only.');
	await page1.getByRole('button', { name: /^propose$/i }).click();
	await page1.waitForSelector(`text=${asset}`, { timeout: 15000 });
	console.log('[2/4] proposal created, visible in pending list');

	// Proposing doesn't itself cast an opinion — the proposer signs like any other member.
	await page1.waitForSelector('button:has-text("Sign")', { timeout: 15000 });
	await page1.getByRole('button', { name: /^sign$/i }).click();
	await page1.waitForTimeout(2000);
	console.log('[3/4] member1 signed their own proposal (1/3)');

	// Members 2 and 3 sign (separate pages/wallets), each reloading to see the fresh list.
	for (const m of [m2, m3]) {
		const page = await browser.newPage();
		await installMockWallet(page, m.account);
		page.on('console', (msg) => msg.type() === 'error' && console.error(`[signer ${m.address} console]`, msg.text()));
		await page.goto('http://localhost:5173/#/dashboard/board', { waitUntil: 'networkidle' });
		const connect = page.getByRole('button', { name: /connect wallet/i });
		if (await connect.isVisible().catch(() => false)) await connect.click();
		await page.waitForSelector('text=Signed in as', { timeout: 15000 });
		console.log(`  ${m.address} signed in`);
		await page.waitForSelector('button:has-text("Sign")', { timeout: 15000 });
		await page.getByRole('button', { name: /^sign$/i }).click();
		await page.waitForTimeout(2000);
		console.log(`  ${m.address} body after sign:`, await page.locator('.dash-card').last().innerText());
		await page.close();
	}

	await page1.reload({ waitUntil: 'networkidle' });
	await page1.waitForSelector('text=Quorum reached', { timeout: 15000 });
	console.log('[4/4] quorum reached, visible in the real rendered UI. PASS');
	await page1.screenshot({ path: '/tmp/dashboard-board-quorum.png', fullPage: true });

	await browser.close();
}

main().catch((error) => {
	console.error('FAIL', error);
	process.exit(1);
});
