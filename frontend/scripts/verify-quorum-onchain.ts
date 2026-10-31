// Takes whatever quorum_reached proposal is currently sitting in the dev API server
// (e.g. the one the browser E2E in e2e-board-flow.ts just produced through the real UI)
// and proves MizanReceiver/MizanRegistry would accept it, via the same simulated
// eth_call approach as frontend/scripts/test-board-flow.ts — closing the loop between
// "the UI says quorum reached" and "the chain would actually accept this."
import { encodeAbiParameters, parseAbiParameters, type Address, type Hex } from 'viem';
import { publicClient } from '../api/_chain.ts';
import type { Proposal } from '../api/_store.ts';

const ISSUE_PARAMS = parseAbiParameters(
	'(address asset, bytes32 subjectVersion, uint8 outcome, bytes32 evidenceHash, string evidenceURI, uint64 boardIssuedAt, uint64 expiresAt, uint64 deadline, uint256 previousId, uint256 nonce)',
);
const OPINIONS_PARAMS = parseAbiParameters('(address shariaBoardMember, uint8 opinion, bytes signature)[]');
const OUTER_PARAMS = parseAbiParameters('uint8 version, uint8 action, bytes payload, bytes signatures');

const RECEIVER_ADDRESS = '0x6B2E8925bC577B79FA7aB3182Dd54afDDDE180AD' as Address;
const REAL_FORWARDER = '0x15fC6ae953E024d975e77382eEeC56A9101f9F88' as Address;
const WORKFLOW_ID = '0x1111111111111111111111111111111111111111111111111111111111111111' as Hex;
const WORKFLOW_OWNER = '0xaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa' as Address;

const buildMetadata = (): Hex => `0x${WORKFLOW_ID.slice(2)}${'00'.repeat(10)}${WORKFLOW_OWNER.slice(2)}` as Hex;

const RECEIVER_ABI = [
	{
		type: 'function',
		name: 'onReport',
		stateMutability: 'nonpayable',
		inputs: [
			{ name: 'metadata', type: 'bytes' },
			{ name: 'report', type: 'bytes' },
		],
		outputs: [],
	},
] as const;

async function main() {
	const response = await fetch('http://localhost:8787/api/pending');
	const { proposals } = (await response.json()) as { proposals: Proposal[] };
	const proposal = proposals.find((p) => p.status === 'quorum_reached');
	if (!proposal) throw new Error('no quorum_reached proposal found — run the E2E first');

	console.log(`Verifying onchain acceptance for asset=${proposal.asset} (${proposal.opinions.length} signatures)...`);

	const payload = encodeAbiParameters(ISSUE_PARAMS, [
		{
			asset: proposal.asset,
			subjectVersion: proposal.subjectVersion,
			outcome: proposal.outcome,
			evidenceHash: proposal.evidenceHash,
			evidenceURI: proposal.evidenceURI,
			boardIssuedAt: BigInt(proposal.boardIssuedAt),
			expiresAt: BigInt(proposal.expiresAt),
			deadline: BigInt(proposal.deadline),
			previousId: BigInt(proposal.previousId),
			nonce: BigInt(proposal.nonce),
		},
	]) as Hex;
	const signatures = encodeAbiParameters(OPINIONS_PARAMS, [proposal.opinions]) as Hex;
	const report = encodeAbiParameters(OUTER_PARAMS, [2, 0, payload, signatures]) as Hex;

	await publicClient.simulateContract({
		address: RECEIVER_ADDRESS,
		abi: RECEIVER_ABI,
		functionName: 'onReport',
		args: [buildMetadata(), report],
		account: REAL_FORWARDER,
	});
	console.log('onReport() simulation PASS — the real MizanReceiver/MizanRegistry would accept this delivery. PASS');
}

main().catch((error) => {
	console.error('FAIL', error);
	process.exit(1);
});
