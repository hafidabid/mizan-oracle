// Records the ~85s, 1920x1080 demo footage for pitch-video/ (Section 5): landing page ->
// live dashboard -> browse/lookup a real onchain assessment -> board tab -> propose -> three
// members sign -> quorum reached. One continuous take: the mock EIP-1193 wallet emits
// `accountsChanged` to hand over between demo board members, the same event a real wallet
// sends when you switch accounts, so the app's own wallet hook picks it up.
//
// Writes the footage to pitch-video/public/demo/demo-1080p.mp4 (via ffmpeg) and the beat
// timestamps the Demo scene keys its captions off to pitch-video/src/demoBeats.ts.
//
// Needs the dashboard (npm run dev, :5173) and dev-api-server.ts (:8787) already running.
// Usage: set -a; source secrets; source smart-contract/board-keys.local; set +a
//        npx tsx frontend/scripts/record-pitch-demo.ts
import { execFileSync } from 'node:child_process';
import { readdirSync, writeFileSync } from 'node:fs';
import path from 'node:path';
import { chromium } from 'playwright';
import { privateKeyToAccount } from 'viem/accounts';
import type { Address, Hex } from 'viem';

const REPO = path.resolve(import.meta.dirname, '../..');
const RAW_DIR = '/tmp/mizan-pitch-raw';
const OUT = path.join(REPO, 'pitch-video/public/demo/demo-1080p.mp4');
const BEATS_OUT = path.join(REPO, 'pitch-video/src/demoBeats.ts');

const DELIVERED_ASSET = '0x1c7D4B196Cb0C7B01d743Fbc6116a902379C7238'; // Sepolia USDC — assessment #1, delivered via CRE
const PROPOSE_ASSET = '0xfFf9976782d46CC05630D1f6eBAb18b2324d6B14'; // Sepolia WETH — proposed live in the take

const requireEnv = (name: string): string => {
	const value = process.env[name];
	if (!value) throw new Error(`missing required env var ${name}`);
	return value;
};

const members = [1, 2, 3].map((n) => privateKeyToAccount(requireEnv(`SHARIA_BOARD_MEMBER_${n}_PRIVATE_KEY`) as Hex));
let active = 0;

async function main() {
	const browser = await chromium.launch();
	const context = await browser.newContext({
		viewport: { width: 1920, height: 1080 },
		deviceScaleFactor: 1,
		recordVideo: { dir: RAW_DIR, size: { width: 1920, height: 1080 } },
	});
	const page = await context.newPage();
	const t0 = Date.now();
	const beats: Record<string, number> = {};
	const mark = (name: string) => {
		beats[name] = Math.round((Date.now() - t0) / 100) / 10;
		console.log(`  beat ${name} @ ${beats[name]}s`);
	};
	const pause = (ms: number) => page.waitForTimeout(ms);

	await page.exposeFunction('__mizanAccount', () => members[active].address);
	await page.exposeFunction('__mizanPersonalSign', (hexMessage: Hex) => members[active].signMessage({ message: { raw: hexMessage } }));
	await page.exposeFunction('__mizanSignTypedData', (raw: string) => {
		const td = JSON.parse(raw);
		const issue = td.message.issue;
		return members[active].signTypedData({
			domain: td.domain,
			types: td.types,
			primaryType: td.primaryType,
			message: {
				issue: {
					...issue,
					boardIssuedAt: BigInt(issue.boardIssuedAt),
					expiresAt: BigInt(issue.expiresAt),
					deadline: BigInt(issue.deadline),
					previousId: BigInt(issue.previousId),
					nonce: BigInt(issue.nonce),
				},
				opinion: td.message.opinion,
			},
		} as never);
	});
	// String-content init script (not a serialized function): see e2e-board-flow.ts for why.
	await page.addInitScript({
		content: `
			const listeners = {};
			window.__mizanEmit = (event, payload) => (listeners[event] || []).forEach((fn) => fn(payload));
			let connected = false;
			window.ethereum = {
				isMetaMask: true,
				request: async ({ method, params }) => {
					switch (method) {
						case 'eth_accounts': return connected ? [await window.__mizanAccount()] : [];
						case 'eth_requestAccounts': connected = true; return [await window.__mizanAccount()];
						case 'eth_chainId': return '0xaa36a7';
						case 'wallet_switchEthereumChain': return null;
						case 'personal_sign': return window.__mizanPersonalSign(params?.[0] ?? '');
						case 'eth_signTypedData_v4': {
							const raw = params?.[1];
							return window.__mizanSignTypedData(typeof raw === 'string' ? raw : JSON.stringify(raw));
						}
						default: throw new Error('mock wallet: unsupported method ' + method);
					}
				},
				on: (event, fn) => { (listeners[event] = listeners[event] || []).push(fn); },
				removeListener: (event, fn) => { listeners[event] = (listeners[event] || []).filter((f) => f !== fn); },
			};
		`,
	});

	const switchTo = async (index: number) => {
		active = index;
		await page.evaluate((address: Address) => (window as unknown as { __mizanEmit: (e: string, p: unknown) => void }).__mizanEmit('accountsChanged', [address]), members[index].address);
		await page.waitForSelector(`text=Demo-Sharia-Board-Member-${index + 1}`, { timeout: 15000 });
	};
	const typeSlowly = (selector: string, text: string) => page.locator(selector).pressSequentially(text, { delay: 18 });
	const signAndWait = async () => {
		await page.getByRole('button', { name: /^sign$/i }).click();
		await page.waitForSelector("text=/You've signed this one|Quorum reached/", { timeout: 20000 });
	};

	// 1. Landing page, then into the live dashboard.
	await page.goto('http://localhost:5173/#top', { waitUntil: 'networkidle' });
	await pause(3200);
	await page.getByRole('link', { name: /live dashboard/i }).click();
	mark('dashboard');
	await page.waitForSelector(`text=${DELIVERED_ASSET}`, { timeout: 20000 });
	await pause(1500);

	// 2. Browse: the real assessment, then a lookup of the same asset via resolve().
	mark('browse');
	await pause(3500);
	await page.locator('#lookup-address').click();
	await typeSlowly('#lookup-address', DELIVERED_ASSET);
	await pause(500);
	await page.getByRole('button', { name: /look up/i }).click();
	await page.waitForSelector('text=Assessment #', { timeout: 20000 });
	await pause(7000);

	// 3. Board tab: connect, membership resolves from the chain.
	await page.getByRole('button', { name: /sharia board/i }).click();
	await pause(1500);
	mark('board');
	await page.getByRole('button', { name: /connect wallet/i }).click();
	await page.waitForSelector('text=Signed in as', { timeout: 20000 });
	await pause(3000);

	// 4. Propose WETH, then sign as member 1.
	mark('propose');
	await typeSlowly('#propose-asset', PROPOSE_ASSET);
	await pause(400);
	await typeSlowly('#propose-evidence', 'Reviewed contract and issuer disclosures: no interest-bearing yield, no prohibited-sector exposure.');
	await pause(800);
	await page.getByRole('button', { name: /^propose$/i }).click();
	await page.waitForSelector(`text=${PROPOSE_ASSET}`, { timeout: 20000 });
	await pause(2500);
	await signAndWait();
	await pause(3000);

	// 5. Members 2 and 3 take over the same session and sign.
	await switchTo(1);
	mark('member2');
	await pause(2500);
	await signAndWait();
	await pause(3000);
	await switchTo(2);
	mark('member3');
	await pause(2500);
	await signAndWait();

	// 6. Quorum reached.
	await page.waitForSelector('text=Quorum reached', { timeout: 20000 });
	mark('quorum');
	await pause(9000);
	mark('end');

	await context.close();
	await browser.close();

	const raw = readdirSync(RAW_DIR).filter((f) => f.endsWith('.webm')).map((f) => path.join(RAW_DIR, f));
	if (raw.length !== 1) throw new Error(`expected exactly one recording in ${RAW_DIR}, found ${raw.length}`);
	execFileSync('ffmpeg', ['-y', '-loglevel', 'error', '-i', raw[0], '-r', '30', '-c:v', 'libx264', '-crf', '18', '-pix_fmt', 'yuv420p', '-movflags', '+faststart', OUT]);

	writeFileSync(
		BEATS_OUT,
		`// Timestamps (seconds into public/demo/demo-1080p.mp4) of each beat, written by
// frontend/scripts/record-pitch-demo.ts when it records the footage. Lower-third captions in
// the Demo scene key off these so they land on the right shot without hand-tuning.
export const DEMO_BEATS = ${JSON.stringify(beats, null, '\t')} as const;
`,
	);
	console.log(`footage -> ${OUT}\nbeats -> ${BEATS_OUT}`);
}

main().catch((error) => {
	console.error('FAIL', error);
	process.exit(1);
});
