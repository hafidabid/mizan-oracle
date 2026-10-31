import type { Address, Hex, TypedDataDomain } from 'viem'

// Mirrors MizanRegistry's EIP-712 domain and ISSUE_TYPEHASH/OPINION_TYPEHASH exactly.
// See smart-contract/src/MizanRegistry.sol — `EIP712("MizanOracle", "1")`, `ISSUE_TYPE`,
// `OPINION_TYPEHASH`. The signed `Issue` type carries `policyId` as its first field even
// though the Solidity `Issue` struct used as publish()'s calldata argument does not —
// `_hashIssueStruct` injects policyId when computing the digest. Frontend signing
// (frontend/src/lib/eip712.ts) must stay byte-for-byte identical to this definition.
export const ISSUE_OPINION_TYPES = {
	Issue: [
		{ name: 'policyId', type: 'bytes32' },
		{ name: 'asset', type: 'address' },
		{ name: 'subjectVersion', type: 'bytes32' },
		{ name: 'outcome', type: 'uint8' },
		{ name: 'evidenceHash', type: 'bytes32' },
		{ name: 'evidenceURI', type: 'string' },
		{ name: 'boardIssuedAt', type: 'uint64' },
		{ name: 'expiresAt', type: 'uint64' },
		{ name: 'deadline', type: 'uint64' },
		{ name: 'previousId', type: 'uint256' },
		{ name: 'nonce', type: 'uint256' },
	],
	ShariaBoardMemberOpinion: [
		{ name: 'issue', type: 'Issue' },
		{ name: 'opinion', type: 'uint8' },
	],
} as const

export const CHAIN_ID = 11155111

export const buildDomain = (registryAddress: Address): TypedDataDomain => ({
	name: 'MizanOracle',
	version: '1',
	chainId: CHAIN_ID,
	verifyingContract: registryAddress,
})

export interface IssueMessage {
	policyId: Hex
	asset: Address
	subjectVersion: Hex
	outcome: number
	evidenceHash: Hex
	evidenceURI: string
	boardIssuedAt: bigint
	expiresAt: bigint
	deadline: bigint
	previousId: bigint
	nonce: bigint
}
