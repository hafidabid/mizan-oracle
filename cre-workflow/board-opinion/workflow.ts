import {
	CronCapability,
	EVMClient,
	HTTPClient,
	TxStatus,
	bytesToHex,
	getNetwork,
	handlerInTee,
	prepareReportRequest,
	type TeeRuntime,
	type Workflow,
} from '@chainlink/cre-sdk'
import { encodeAbiParameters, parseAbiParameters, type Address, type Hex } from 'viem'
import { z } from 'zod'

export const configSchema = z.object({
	schedule: z.string(),
	// The dashboard's serverless store (frontend/api/pending.ts, resolve.ts). Points at a
	// Vercel deployment URL once one exists, e.g. https://<project>.vercel.app/api.
	apiBaseUrl: z.string(),
	secretsIds: z.object({
		workflowResolveSecret: z.string(),
	}),
	evm: z.object({
		chainSelectorName: z.string(),
		receiverAddress: z.string(),
		gasLimit: z.string(),
	}),
})

export type Config = z.infer<typeof configSchema>

// Mirrors frontend/api/_store.ts's Proposal exactly — the dashboard's serverless store is
// the source of truth for this shape. Only the fields this workflow needs are declared.
interface OpinionEntry {
	shariaBoardMember: Address
	opinion: 1 | 2 | 3
	signature: Hex
}

interface Proposal {
	asset: Address
	subjectVersion: Hex
	outcome: 1 | 2 | 3
	evidenceHash: Hex
	evidenceURI: string
	boardIssuedAt: string
	expiresAt: string
	deadline: string
	previousId: string
	nonce: string
	status: 'awaiting_signatures' | 'quorum_reached' | 'resolved' | 'expired'
	opinions: OpinionEntry[]
}

// Mirrors MizanRegistry.Issue / Opinion[] and MizanReceiver.onReport's decode exactly.
// See smart-contract/src/MizanRegistry.sol and MizanReceiver.sol. Proven against the real
// deployed contracts via a simulated eth_call in frontend/scripts/test-board-flow.ts before
// this workflow was written.
const ISSUE_PARAMS = parseAbiParameters(
	'(address asset, bytes32 subjectVersion, uint8 outcome, bytes32 evidenceHash, string evidenceURI, uint64 boardIssuedAt, uint64 expiresAt, uint64 deadline, uint256 previousId, uint256 nonce)',
)
const OPINIONS_PARAMS = parseAbiParameters('(address shariaBoardMember, uint8 opinion, bytes signature)[]')
const OUTER_PARAMS = parseAbiParameters('uint8 version, uint8 action, bytes payload, bytes signatures')
const REPORT_VERSION = 2
const ACTION_ISSUE = 0

const fetchQuorumReachedProposals = (runtime: TeeRuntime<Config>, client: HTTPClient): Proposal[] => {
	const response = client
		.sendRequest(runtime, { url: `${runtime.config.apiBaseUrl}/pending`, method: 'GET' })
		.result()
	const raw = new TextDecoder().decode(response.body)
	if (response.statusCode >= 400) {
		throw new Error(`GET /pending failed status=${response.statusCode} body=${raw}`)
	}
	const parsed = JSON.parse(raw) as { proposals?: Proposal[] }
	return (parsed.proposals ?? []).filter((p) => p.status === 'quorum_reached')
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
	return encodeAbiParameters(OUTER_PARAMS, [REPORT_VERSION, ACTION_ISSUE, payload, signatures]) as Hex
}

const deliverProposal = (runtime: TeeRuntime<Config>, proposal: Proposal): string => {
	const network = getNetwork({ chainFamily: 'evm', chainSelectorName: runtime.config.evm.chainSelectorName })
	if (!network) {
		throw new Error(`Network not found for chain selector name: ${runtime.config.evm.chainSelectorName}`)
	}

	const reportHex = buildReport(proposal)
	const donRuntime = runtime.usingTheDons()
	const reportResponse = donRuntime.report(prepareReportRequest(reportHex)).result()

	const evmClient = new EVMClient(network.chainSelector.selector)
	const writeResult = evmClient
		.writeReport(donRuntime, {
			receiver: runtime.config.evm.receiverAddress as Address,
			report: reportResponse,
			gasConfig: { gasLimit: runtime.config.evm.gasLimit },
		})
		.result()

	if (writeResult.txStatus !== TxStatus.SUCCESS) {
		throw new Error(
			`onchain write failed for ${proposal.asset}: ${writeResult.errorMessage || writeResult.txStatus}`,
		)
	}
	return bytesToHex(writeResult.txHash || new Uint8Array(32))
}

const markResolved = (runtime: TeeRuntime<Config>, client: HTTPClient, secret: string, asset: Address, txHash: string): void => {
	const body = new TextEncoder().encode(JSON.stringify({ asset, txHash }))
	const response = client
		.sendRequest(runtime, {
			url: `${runtime.config.apiBaseUrl}/resolve`,
			method: 'POST',
			headers: { 'Content-Type': 'application/json', 'x-mizan-workflow-secret': secret },
			body: Buffer.from(body).toString('base64'),
		})
		.result()
	if (response.statusCode >= 400) {
		const raw = new TextDecoder().decode(response.body)
		throw new Error(`POST /resolve failed status=${response.statusCode} body=${raw}`)
	}
}

export const onCronTrigger = async (runtime: TeeRuntime<Config>): Promise<string> => {
	const client = new HTTPClient()
	const secrets = runtime.getSecrets([{ id: runtime.config.secretsIds.workflowResolveSecret }]).result()
	const resolveSecret = secrets[runtime.config.secretsIds.workflowResolveSecret].value

	const proposals = fetchQuorumReachedProposals(runtime, client)
	const results = proposals.map((proposal) => {
		runtime.log(`board-opinion delivering asset=${proposal.asset} previousId=${proposal.previousId}`)
		const txHash = deliverProposal(runtime, proposal)
		runtime.log(`board-opinion onchain tx=${txHash} asset=${proposal.asset}`)
		markResolved(runtime, client, resolveSecret, proposal.asset, txHash)
		return { asset: proposal.asset, txHash }
	})
	return JSON.stringify(results)
}

export const initWorkflow = (config: Config): Workflow<Config> => {
	const cron = new CronCapability()
	return [
		handlerInTee(
			cron.trigger({ schedule: config.schedule }),
			onCronTrigger,
			{}, // any registered TEE, any region
		),
	]
}
