// Local smoke test for the propose -> sign x N -> quorum_reached backend flow
// (frontend/api/_store.ts), run directly against real Sepolia reads but an
// in-memory KV (no Upstash needed). Exercises real EIP-712 signing with the
// demo board wallets, so it catches typed-data mismatches the type checker can't.
//
// Then proves the board-opinion CRE workflow's onReport payload (same encoding
// as cre-workflow/board-opinion/workflow.ts) would be accepted by the real,
// already-deployed MizanReceiver/MizanRegistry — via a simulated eth_call from
// the real forwarder address (no private key needed, no state is written), not
// by running the workflow itself end to end. The CRE transport (forwarder +
// workflow identity) was already proven live for the AI pre-screen workflow;
// this only needs to prove the NEW thing — that this payload's encoding and
// the signed Issue/Opinions in it are accepted by the registry's own checks.
//
// Usage: set -a; source secrets; source smart-contract/board-keys.local; set +a
//        npx tsx frontend/scripts/test-board-flow.ts
import { encodeAbiParameters, parseAbiParameters, type Address, type Hex } from 'viem'
import { privateKeyToAccount } from 'viem/accounts'
import { buildDomain, ISSUE_OPINION_TYPES, type IssueMessage } from '../api/_eip712.ts'
import { publicClient, readPolicyId, REGISTRY_ADDRESS } from '../api/_chain.ts'
import { createProposal, signProposal, type Proposal } from '../api/_store.ts'

const requireEnv = (name: string): string => {
	const value = process.env[name]
	if (!value) throw new Error(`missing required env var ${name}`)
	return value
}

const boardMembers = Array.from({ length: 5 }, (_, i) => {
	const n = i + 1
	return {
		address: requireEnv(`SHARIA_BOARD_MEMBER_${n}_ADDRESS`) as Address,
		account: privateKeyToAccount(requireEnv(`SHARIA_BOARD_MEMBER_${n}_PRIVATE_KEY`) as Hex),
	}
})

const issueMessageFromProposal = (proposal: Proposal, policyId: Hex): IssueMessage => ({
	policyId,
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
})

// Mirrors MizanRegistry.Issue / Opinion[] and MizanReceiver.onReport's decode exactly.
const ISSUE_PARAMS = parseAbiParameters(
	'(address asset, bytes32 subjectVersion, uint8 outcome, bytes32 evidenceHash, string evidenceURI, uint64 boardIssuedAt, uint64 expiresAt, uint64 deadline, uint256 previousId, uint256 nonce)',
)
const OPINIONS_PARAMS = parseAbiParameters('(address shariaBoardMember, uint8 opinion, bytes signature)[]')
const OUTER_PARAMS = parseAbiParameters('uint8 version, uint8 action, bytes payload, bytes signatures')

const RECEIVER_ADDRESS = '0x6B2E8925bC577B79FA7aB3182Dd54afDDDE180AD' as Address
const REAL_FORWARDER = '0x15fC6ae953E024d975e77382eEeC56A9101f9F88' as Address
// Fixed CRE simulator debug identity, proven simulator-wide in this session (see
// smart-contract/deployments/sepolia.json core.forwarderNote) and wired into this
// MizanReceiver deployment.
const WORKFLOW_ID = '0x1111111111111111111111111111111111111111111111111111111111111111' as Hex
const WORKFLOW_OWNER = '0xaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa' as Address

const buildMetadata = (): Hex => {
	const workflowName = new Uint8Array(10) // zero-padded, same as the ai-prescreen probe
	const idBytes = WORKFLOW_ID.slice(2)
	const ownerBytes = WORKFLOW_OWNER.slice(2)
	const nameHex = Array.from(workflowName)
		.map((b) => b.toString(16).padStart(2, '0'))
		.join('')
	return `0x${idBytes}${nameHex}${ownerBytes}` as Hex
}

const buildReport = (proposal: Proposal): Hex => {
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
	]) as Hex
	const signatures = encodeAbiParameters(OPINIONS_PARAMS, [
		proposal.opinions.map((o) => ({
			shariaBoardMember: o.shariaBoardMember,
			opinion: o.opinion,
			signature: o.signature,
		})),
	]) as Hex
	return encodeAbiParameters(OUTER_PARAMS, [2, 0, payload, signatures]) as Hex
}

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
] as const

async function main() {
	const asset = '0xfFf9976782d46CC05630D1f6eBAb18b2324d6B14' as Address
	const proposer = boardMembers[0]
	const proposerTimestamp = Math.floor(Date.now() / 1000)
	const proposerSignature = await proposer.account.signMessage({
		message: `mizan-propose:${asset.toLowerCase()}:${proposerTimestamp}`,
	})

	console.log('[1/4] creating proposal...')
	const proposal = await createProposal({
		asset,
		outcome: 1,
		evidenceNote: 'Smoke test: demo asset reviewed under the hackathon demo policy, no real compliance claim.',
		proposerAddress: proposer.address,
		proposerTimestamp,
		proposerSignature,
	})
	console.log(`  status=${proposal.status} quorum=${proposal.quorum} previousId=${proposal.previousId}`)
	if (proposal.status !== 'awaiting_signatures') throw new Error('expected awaiting_signatures after propose')

	const policyId = await readPolicyId()
	let current = proposal
	for (const member of boardMembers) {
		const signature = await member.account.signTypedData({
			domain: buildDomain(REGISTRY_ADDRESS),
			types: ISSUE_OPINION_TYPES,
			primaryType: 'ShariaBoardMemberOpinion',
			message: { issue: issueMessageFromProposal(current, policyId), opinion: 1 },
		})
		console.log(`[2/4] signing as ${member.address}...`)
		current = await signProposal({ asset, shariaBoardMember: member.address, opinion: 1, signature })
		console.log(`  opinions=${current.opinions.length}/${current.quorum} status=${current.status}`)
		if (current.status === 'quorum_reached') break
	}

	if (current.status !== 'quorum_reached') throw new Error(`expected quorum_reached, got ${current.status}`)
	console.log('[3/4] quorum reached, opinions sorted ascending.')

	console.log('[4/4] simulating onReport() as the real forwarder (eth_call, no state written)...')
	const metadata = buildMetadata()
	const report = buildReport(current)
	try {
		const { result } = await publicClient.simulateContract({
			address: RECEIVER_ADDRESS,
			abi: RECEIVER_ABI,
			functionName: 'onReport',
			args: [metadata, report],
			account: REAL_FORWARDER,
		})
		console.log('  onReport() simulation PASS — publish() would succeed. result:', result)
	} catch (error) {
		console.error('  onReport() simulation FAILED', error)
		throw error
	}
	console.log('PASS')
}

main().catch((error) => {
	console.error('FAIL', error)
	process.exit(1)
})
