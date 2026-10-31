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
import { encodeAbiParameters, keccak256, parseAbiParameters, stringToHex, type Address, type Hex } from 'viem'
import { z } from 'zod'

// Mirrors MizanAIPreScreen.PreScreenInput / MizanAIReceiver's onReport decode exactly.
// See smart-contract/src/MizanAIReceiver.sol and MizanAIPreScreen.sol.
const REPORT_PARAMS = parseAbiParameters(
	'uint8 version, address asset, (uint8 score, bytes32 rationaleHash, string rationaleURI, string model, uint64 generatedAt) input',
)
const SCHEMA_VERSION = 1

export const configSchema = z.object({
	schedule: z.string(),
	openrouterUrl: z.string().default('https://openrouter.ai/api/v1/chat/completions'),
	openrouterModel: z.string(),
	secretsIds: z.object({
		openrouterApiKey: z.string(),
	}),
	// Static for the hackathon MVW: a real deployment would fetch this list from an
	// assessment API instead. See docs/CRE-WORKFLOW-PLAN.md section 2.
	assets: z.array(
		z.object({
			address: z.string(),
			name: z.string(),
			description: z.string(),
		}),
	),
	evm: z.object({
		chainSelectorName: z.string(),
		receiverAddress: z.string(),
		gasLimit: z.string(),
	}),
})

export type Config = z.infer<typeof configSchema>

interface ModelVerdict {
	score: number
	reasoning: string
	flags: string[]
}

const JSON_HEADERS = { 'Content-Type': 'application/json' }

const asObject = (value: unknown): Record<string, unknown> => {
	if (!value || typeof value !== 'object' || Array.isArray(value)) return {}
	return value as Record<string, unknown>
}

const asNumber = (value: unknown, fallback = 0): number => {
	const n = typeof value === 'string' ? Number(value) : value
	return typeof n === 'number' && Number.isFinite(n) ? n : fallback
}

const asString = (value: unknown, fallback = ''): string => (typeof value === 'string' ? value : fallback)

const asStringArray = (value: unknown): string[] =>
	Array.isArray(value) ? value.filter((v): v is string => typeof v === 'string') : []

const clampScore = (n: number): number => Math.max(0, Math.min(100, Math.round(n)))

const buildPrompt = (asset: Config['assets'][number]): string =>
	JSON.stringify(
		{
			objective:
				'Give a preliminary, non-binding Sharia compliance screen for this asset. This is NOT a fatwa and does not replace Sharia board review.',
			asset,
			checks: [
				'interest-bearing debt or lending exposure',
				'alcohol, gambling, or other prohibited-sector revenue',
				'cash plus interest-bearing securities as a share of total assets',
			],
			responseFormat: {
				score: 'integer 0-100, higher = more likely compliant on a preliminary read',
				reasoning: 'one or two sentences',
				flags: 'array of short strings naming any concern found, empty if none',
			},
		},
		null,
		2,
	)

const parseVerdict = (content: string): ModelVerdict => {
	let parsed: unknown
	try {
		parsed = JSON.parse(content)
	} catch (error) {
		const message = error instanceof Error ? error.message : String(error)
		throw new Error(`model did not return valid JSON: ${message}; content=${content}`)
	}
	const row = asObject(parsed)
	return {
		score: clampScore(asNumber(row.score, 0)),
		reasoning: asString(row.reasoning, 'No reasoning provided by model'),
		flags: asStringArray(row.flags),
	}
}

const requestVerdict = (
	runtime: TeeRuntime<Config>,
	client: HTTPClient,
	apiKey: string,
	asset: Config['assets'][number],
): ModelVerdict => {
	const bodyBytes = new TextEncoder().encode(
		JSON.stringify({
			model: runtime.config.openrouterModel,
			messages: [
				{
					role: 'system',
					content:
						'You are a preliminary Sharia-compliance screening assistant. Respond with strict JSON only, no prose outside the JSON object. Your output is advisory only and is never a substitute for a human Sharia board ruling.',
				},
				{ role: 'user', content: buildPrompt(asset) },
			],
			response_format: { type: 'json_object' },
			temperature: 0.2,
		}),
	)

	const response = client
		.sendRequest(runtime, {
			url: runtime.config.openrouterUrl,
			method: 'POST',
			headers: { ...JSON_HEADERS, Authorization: `Bearer ${apiKey}` },
			body: Buffer.from(bodyBytes).toString('base64'),
		})
		.result()

	const raw = new TextDecoder().decode(response.body)
	if (response.statusCode >= 400) {
		throw new Error(`OpenRouter request failed status=${response.statusCode} body=${raw}`)
	}

	const parsed = asObject(JSON.parse(raw))
	const choices = Array.isArray(parsed.choices) ? parsed.choices : []
	const messageContent = asString(asObject(asObject(choices[0]).message).content)
	if (!messageContent) {
		throw new Error(`OpenRouter response missing choices[0].message.content: ${raw}`)
	}
	return parseVerdict(messageContent)
}

const writeVerdictOnChain = (
	runtime: TeeRuntime<Config>,
	asset: Config['assets'][number],
	verdict: ModelVerdict,
	generatedAt: bigint,
): string => {
	const network = getNetwork({ chainFamily: 'evm', chainSelectorName: runtime.config.evm.chainSelectorName })
	if (!network) {
		throw new Error(`Network not found for chain selector name: ${runtime.config.evm.chainSelectorName}`)
	}

	// Kept minimal: MizanAIPreScreen caps rationaleURI at 512 bytes (MAX_URI_BYTES), and this
	// data: URI must fit under that after base64 expansion. asset/name/description are already
	// available from the record's key and the workflow config, so they're left out here.
	const REASONING_CHAR_CAP = 50
	const truncatedReasoning =
		verdict.reasoning.length > REASONING_CHAR_CAP
			? `${verdict.reasoning.slice(0, REASONING_CHAR_CAP - 1)}…`
			: verdict.reasoning
	const rationale = JSON.stringify({
		score: verdict.score,
		reasoning: truncatedReasoning,
		flags: verdict.flags,
		model: runtime.config.openrouterModel,
	})
	// Self-contained: no IPFS pinning dependency for the hackathon demo. rationaleHash
	// commits to these exact bytes; anyone can decode the data: URI and re-hash to verify.
	const rationaleURI = `data:application/json;base64,${Buffer.from(rationale, 'utf-8').toString('base64')}`
	if (rationaleURI.length > 512) {
		throw new Error(`rationaleURI too long for MizanAIPreScreen (512 byte cap): ${rationaleURI.length} bytes`)
	}
	const rationaleHash = keccak256(stringToHex(rationale))

	const reportHex = encodeAbiParameters(REPORT_PARAMS, [
		SCHEMA_VERSION,
		asset.address as Address,
		{
			score: verdict.score,
			rationaleHash,
			rationaleURI,
			model: runtime.config.openrouterModel,
			generatedAt,
		},
	]) as Hex

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
		throw new Error(`onchain write failed for ${asset.address}: ${writeResult.errorMessage || writeResult.txStatus}`)
	}
	return bytesToHex(writeResult.txHash || new Uint8Array(32))
}

const screenAsset = (
	runtime: TeeRuntime<Config>,
	client: HTTPClient,
	apiKey: string,
	asset: Config['assets'][number],
): Record<string, unknown> => {
	const verdict = requestVerdict(runtime, client, apiKey, asset)
	runtime.log(`ai-prescreen asset=${asset.address} score=${verdict.score} flags=${verdict.flags.join(',')}`)

	const generatedAt = BigInt(Math.floor(runtime.now().getTime() / 1000))
	const txHash = writeVerdictOnChain(runtime, asset, verdict, generatedAt)
	runtime.log(`ai-prescreen onchain tx=${txHash} asset=${asset.address}`)

	return { asset: asset.address, score: verdict.score, flags: verdict.flags, txHash }
}

export const onCronTrigger = async (runtime: TeeRuntime<Config>): Promise<string> => {
	const client = new HTTPClient()
	const secrets = runtime.getSecrets([{ id: runtime.config.secretsIds.openrouterApiKey }]).result()
	const apiKey = secrets[runtime.config.secretsIds.openrouterApiKey].value

	const results = runtime.config.assets.map((asset) => screenAsset(runtime, client, apiKey, asset))
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
