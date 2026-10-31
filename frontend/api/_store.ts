import { keccak256, recoverMessageAddress, recoverTypedDataAddress, stringToHex, toHex, type Address, type Hex } from 'viem'
import { buildDomain, ISSUE_OPINION_TYPES, type IssueMessage } from './_eip712.ts'
import { getKV } from './_kv.ts'
import { isActiveBoardMember, readLatestId, readPolicyId, readQuorum, readResolution, REGISTRY_ADDRESS } from './_chain.ts'

export type Outcome = 1 | 2 | 3 // Approved | Rejected | NeedsReview (0 = Unset is never stored)
export type ProposalStatus = 'awaiting_signatures' | 'quorum_reached' | 'resolved' | 'expired'

const SIGN_WINDOW_SECONDS = 7 * 24 * 60 * 60 // board members get a week to collect signatures
// MizanRegistry.publish() reverts InvalidInput if boardIssuedAt > block.timestamp. Public
// RPC "latest" blocks commonly lag wall-clock time by several seconds (Sepolia ~6-12s
// observed), so boardIssuedAt is backdated by this margin to tolerate that lag even on a
// near-instant propose -> sign -> deliver cycle.
const BOARD_ISSUED_AT_SAFETY_MARGIN_SECONDS = 120n
const DEFAULT_VALIDITY_DAYS = 180
const MAX_EVIDENCE_NOTE_CHARS = 280
const PROPOSE_AUTH_WINDOW_SECONDS = 5 * 60

export interface OpinionEntry {
	shariaBoardMember: Address
	opinion: Outcome
	signature: Hex
}

export interface Proposal {
	asset: Address
	subjectVersion: Hex
	outcome: Outcome
	evidenceHash: Hex
	evidenceURI: string
	evidenceNote: string
	boardIssuedAt: string // bigint-as-string (unix seconds)
	expiresAt: string
	deadline: string
	previousId: string
	nonce: string
	quorum: number
	status: ProposalStatus
	opinions: OpinionEntry[]
	proposerAddress: Address
	createdAt: number
	resolvedTxHash?: Hex
	resolvedAssessmentId?: string
}

export class StoreError extends Error {
	readonly code: string
	readonly status: number

	constructor(message: string, code: string, status = 400) {
		super(message)
		this.code = code
		this.status = status
	}
}

const INDEX_KEY = 'mizan:proposals:index'
const proposalKey = (asset: Address) => `mizan:proposal:${asset.toLowerCase()}`

const randomNonce = (): bigint => {
	const bytes = new Uint8Array(32)
	crypto.getRandomValues(bytes)
	return BigInt(toHex(bytes))
}

const nowSeconds = (): bigint => BigInt(Math.floor(Date.now() / 1000))

// btoa/TextEncoder are Web-standard (available on both Node 18+ and the Vercel Edge
// runtime); Buffer is Node-only and not guaranteed to exist under `export const config
// = { runtime: 'edge' }`, so base64 is encoded by hand instead of via Buffer.
const toBase64 = (input: string): string => {
	const bytes = new TextEncoder().encode(input)
	let binary = ''
	for (const byte of bytes) binary += String.fromCharCode(byte)
	return btoa(binary)
}

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

// Applies deadline expiry on read so a stuck proposal frees its asset slot without a cron job.
const applyExpiry = (proposal: Proposal): Proposal => {
	if (proposal.status === 'awaiting_signatures' && nowSeconds() > BigInt(proposal.deadline)) {
		return { ...proposal, status: 'expired' }
	}
	return proposal
}

const load = async (asset: Address): Promise<Proposal | null> => {
	const raw = await getKV().get(proposalKey(asset))
	if (!raw) return null
	return applyExpiry(JSON.parse(raw) as Proposal)
}

const save = async (proposal: Proposal): Promise<void> => {
	await getKV().set(proposalKey(proposal.asset), JSON.stringify(proposal))
	await getKV().sadd(INDEX_KEY, proposal.asset.toLowerCase())
}

export const getProposal = (asset: Address): Promise<Proposal | null> => load(asset)

export const listProposals = async (): Promise<Proposal[]> => {
	const assets = await getKV().smembers(INDEX_KEY)
	const proposals = await Promise.all(assets.map((asset) => load(asset as Address)))
	return proposals.filter((p): p is Proposal => p !== null)
}

const verifyProposeAuth = async (
	asset: Address,
	proposerAddress: Address,
	proposerTimestamp: number,
	proposerSignature: Hex,
): Promise<void> => {
	const age = Math.abs(Date.now() / 1000 - proposerTimestamp)
	if (age > PROPOSE_AUTH_WINDOW_SECONDS) {
		throw new StoreError('proposerTimestamp outside the signing window', 'auth_expired', 401)
	}
	const message = `mizan-propose:${asset.toLowerCase()}:${proposerTimestamp}`
	const recovered = await recoverMessageAddress({ message, signature: proposerSignature })
	if (recovered.toLowerCase() !== proposerAddress.toLowerCase()) {
		throw new StoreError('proposerSignature does not match proposerAddress', 'auth_invalid', 401)
	}
	if (!(await isActiveBoardMember(proposerAddress))) {
		throw new StoreError('proposerAddress is not an active Sharia board member', 'not_board_member', 403)
	}
}

export interface CreateProposalInput {
	asset: Address
	outcome: Outcome
	evidenceNote: string
	expiresInDays?: number
	proposerAddress: Address
	proposerTimestamp: number
	proposerSignature: Hex
}

export const createProposal = async (input: CreateProposalInput): Promise<Proposal> => {
	if (!input.evidenceNote || input.evidenceNote.length > MAX_EVIDENCE_NOTE_CHARS) {
		throw new StoreError(`evidenceNote must be 1-${MAX_EVIDENCE_NOTE_CHARS} characters`, 'invalid_evidence')
	}
	if (![1, 2, 3].includes(input.outcome)) {
		throw new StoreError('outcome must be 1 (Approved), 2 (Rejected), or 3 (NeedsReview)', 'invalid_outcome')
	}

	await verifyProposeAuth(input.asset, input.proposerAddress, input.proposerTimestamp, input.proposerSignature)

	// Best-effort atomicity: Upstash SETNX makes this a real atomic check-and-create; the
	// in-memory fallback is read-then-write and only safe single-process (see api/_kv.ts).
	const existing = await load(input.asset)
	if (existing && (existing.status === 'awaiting_signatures' || existing.status === 'quorum_reached')) {
		throw new StoreError('asset already has a pending proposal', 'already_pending', 409)
	}

	const [previousId, quorum] = await Promise.all([readLatestId(input.asset), readQuorum()])

	const evidenceURI = `data:text/plain;charset=utf-8;base64,${toBase64(input.evidenceNote)}`
	if (evidenceURI.length > 512) {
		throw new StoreError('evidenceNote too long once encoded (512 byte URI cap)', 'invalid_evidence')
	}

	const now = nowSeconds()
	const expiresInDays = input.expiresInDays ?? DEFAULT_VALIDITY_DAYS
	const proposal: Proposal = {
		asset: input.asset,
		subjectVersion: keccak256(stringToHex(evidenceURI)),
		outcome: input.outcome,
		evidenceHash: keccak256(stringToHex(input.evidenceNote)),
		evidenceURI,
		evidenceNote: input.evidenceNote,
		boardIssuedAt: (now - BOARD_ISSUED_AT_SAFETY_MARGIN_SECONDS).toString(),
		expiresAt: (now + BigInt(Math.max(1, expiresInDays)) * 86400n).toString(),
		deadline: (now + BigInt(SIGN_WINDOW_SECONDS)).toString(),
		previousId: previousId.toString(),
		nonce: randomNonce().toString(),
		quorum,
		status: 'awaiting_signatures',
		opinions: [],
		proposerAddress: input.proposerAddress,
		createdAt: Date.now(),
	}

	const created = await getKV().setnx(proposalKey(proposal.asset), JSON.stringify(proposal))
	if (!created) {
		throw new StoreError('asset already has a pending proposal', 'already_pending', 409)
	}
	await getKV().sadd(INDEX_KEY, proposal.asset.toLowerCase())
	return proposal
}

export interface SignProposalInput {
	asset: Address
	shariaBoardMember: Address
	opinion: Outcome
	signature: Hex
}

export const signProposal = async (input: SignProposalInput): Promise<Proposal> => {
	if (![1, 2, 3].includes(input.opinion)) {
		throw new StoreError('opinion must be 1 (Approved), 2 (Rejected), or 3 (NeedsReview)', 'invalid_outcome')
	}

	const proposal = await load(input.asset)
	if (!proposal) throw new StoreError('no proposal for this asset', 'not_found', 404)
	if (proposal.status === 'expired') {
		throw new StoreError('proposal signing window has expired', 'expired', 409)
	}
	if (proposal.status === 'quorum_reached' || proposal.status === 'resolved') {
		throw new StoreError('proposal already reached quorum; it is no longer accepting signatures', 'closed', 409)
	}
	if (proposal.opinions.some((o) => o.shariaBoardMember.toLowerCase() === input.shariaBoardMember.toLowerCase())) {
		throw new StoreError('this Sharia board member has already signed this proposal', 'already_signed', 409)
	}
	if (!(await isActiveBoardMember(input.shariaBoardMember))) {
		throw new StoreError('shariaBoardMember is not an active Sharia board member', 'not_board_member', 403)
	}

	const policyId = await readPolicyId()
	const recovered = await recoverTypedDataAddress({
		domain: buildDomain(REGISTRY_ADDRESS),
		types: ISSUE_OPINION_TYPES,
		primaryType: 'ShariaBoardMemberOpinion',
		message: { issue: issueMessageFromProposal(proposal, policyId), opinion: input.opinion },
		signature: input.signature,
	})
	if (recovered.toLowerCase() !== input.shariaBoardMember.toLowerCase()) {
		throw new StoreError('signature does not match shariaBoardMember for this Issue', 'invalid_signature', 401)
	}

	const opinions = [...proposal.opinions, { shariaBoardMember: input.shariaBoardMember, opinion: input.opinion, signature: input.signature }]
	const quorumReached = opinions.length >= proposal.quorum
	const updated: Proposal = {
		...proposal,
		opinions: quorumReached
			? [...opinions].sort((a, b) => a.shariaBoardMember.toLowerCase().localeCompare(b.shariaBoardMember.toLowerCase()))
			: opinions,
		status: quorumReached ? 'quorum_reached' : 'awaiting_signatures',
	}
	await save(updated)
	return updated
}

export interface ResolveProposalInput {
	asset: Address
	txHash: Hex
}

export const resolveProposal = async (input: ResolveProposalInput): Promise<Proposal> => {
	const proposal = await load(input.asset)
	if (!proposal) throw new StoreError('no proposal for this asset', 'not_found', 404)
	if (proposal.status !== 'quorum_reached') {
		throw new StoreError('proposal is not in quorum_reached state', 'invalid_state', 409)
	}

	const onchain = await readResolution(input.asset)
	if (
		!onchain.exists ||
		onchain.subjectVersion.toLowerCase() !== proposal.subjectVersion.toLowerCase() ||
		onchain.evidenceHash.toLowerCase() !== proposal.evidenceHash.toLowerCase()
	) {
		throw new StoreError(
			'on-chain resolve() does not match this proposal — refusing to mark resolved',
			'onchain_mismatch',
			409,
		)
	}

	const updated: Proposal = {
		...proposal,
		status: 'resolved',
		resolvedTxHash: input.txHash,
		resolvedAssessmentId: onchain.assessmentId.toString(),
	}
	await save(updated)
	return updated
}
