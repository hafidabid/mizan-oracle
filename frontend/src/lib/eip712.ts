import type { Address, Hex, TypedDataDomain } from 'viem';

// Mirrors MizanRegistry's EIP-712 domain and ISSUE_TYPEHASH/OPINION_TYPEHASH exactly (see
// smart-contract/src/MizanRegistry.sol) and must stay byte-for-byte identical to the
// server-side copy at frontend/api/_eip712.ts — both are verified against the same
// contract, so a mismatch here would produce signatures the backend/contract reject.
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
} as const;

export const CHAIN_ID = 11155111;

export const buildDomain = (registryAddress: Address): TypedDataDomain => ({
  name: 'MizanOracle',
  version: '1',
  chainId: CHAIN_ID,
  verifyingContract: registryAddress,
});

export interface IssueMessage {
  policyId: Hex;
  asset: Address;
  subjectVersion: Hex;
  outcome: number;
  evidenceHash: Hex;
  evidenceURI: string;
  boardIssuedAt: bigint;
  expiresAt: bigint;
  deadline: bigint;
  previousId: bigint;
  nonce: bigint;
}
