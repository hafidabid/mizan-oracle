import { createPublicClient, http, type Address } from 'viem';
import { sepolia } from 'viem/chains';

// A free, keyless public Sepolia RPC. Anyone deploying this dashboard can override it with
// VITE_SEPOLIA_RPC_URL (e.g. their own Infura/Alchemy project) without touching code.
const DEFAULT_RPC_URL = 'https://ethereum-sepolia-rpc.publicnode.com';

export const REGISTRY_ADDRESS = (import.meta.env.VITE_MIZAN_REGISTRY_ADDRESS ??
  '0xAB7995471D8f075AE357c47AF884Ac814e6dBB38') as Address;

export const CHAIN_ID = sepolia.id;

const OUTCOME_NAMES = ['Unset', 'Approved', 'Rejected', 'NeedsReview'] as const;
export type OutcomeName = (typeof OUTCOME_NAMES)[number];
export const outcomeName = (outcome: number): OutcomeName => OUTCOME_NAMES[outcome] ?? 'Unset';

// The outcome apps should treat as authoritative: the proposed outcome if quorum agreed on
// it, else NeedsReview — mirrors MizanRegistry.getOutcome()/_effectiveOutcome().
export const effectiveOutcome = (quorumMet: boolean, proposedOutcome: number): number => (quorumMet ? proposedOutcome : 3);

const TALLY_COMPONENTS = [
  { name: 'approvals', type: 'uint16' },
  { name: 'rejections', type: 'uint16' },
  { name: 'needsReview', type: 'uint16' },
  { name: 'quorum', type: 'uint16' },
  { name: 'boardSize', type: 'uint16' },
  { name: 'quorumMet', type: 'bool' },
] as const;

const ISSUE_COMPONENTS = [
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
] as const;

export const REGISTRY_ABI = [
  {
    type: 'function',
    name: 'assessmentCount',
    stateMutability: 'view',
    inputs: [],
    outputs: [{ name: '', type: 'uint256' }],
  },
  {
    type: 'function',
    name: 'quorum',
    stateMutability: 'view',
    inputs: [],
    outputs: [{ name: '', type: 'uint16' }],
  },
  {
    type: 'function',
    name: 'policyId',
    stateMutability: 'view',
    inputs: [],
    outputs: [{ name: '', type: 'bytes32' }],
  },
  {
    type: 'function',
    name: 'policyURI',
    stateMutability: 'view',
    inputs: [],
    outputs: [{ name: '', type: 'string' }],
  },
  {
    type: 'function',
    name: 'shariaBoardMembers',
    stateMutability: 'view',
    inputs: [{ name: '', type: 'address' }],
    outputs: [
      { name: 'name', type: 'string' },
      { name: 'profileURI', type: 'string' },
      { name: 'active', type: 'bool' },
    ],
  },
  {
    type: 'function',
    name: 'getShariaBoardMembers',
    stateMutability: 'view',
    inputs: [],
    outputs: [{ name: '', type: 'address[]' }],
  },
  {
    type: 'function',
    name: 'getAssessment',
    stateMutability: 'view',
    inputs: [{ name: 'id', type: 'uint256' }],
    outputs: [
      {
        name: '',
        type: 'tuple',
        components: [
          { name: 'review', type: 'tuple', components: ISSUE_COMPONENTS },
          { name: 'tally', type: 'tuple', components: TALLY_COMPONENTS },
          { name: 'recordedAt', type: 'uint64' },
          { name: 'revoked', type: 'bool' },
          { name: 'revocationReasonHash', type: 'bytes32' },
          { name: 'revocationReasonURI', type: 'string' },
          { name: 'revokedAt', type: 'uint64' },
        ],
      },
    ],
  },
  {
    type: 'function',
    name: 'resolve',
    stateMutability: 'view',
    inputs: [{ name: 'asset', type: 'address' }],
    outputs: [
      {
        name: '',
        type: 'tuple',
        components: [
          { name: 'exists', type: 'bool' },
          { name: 'assessmentId', type: 'uint256' },
          { name: 'outcome', type: 'uint8' },
          { name: 'expired', type: 'bool' },
          { name: 'revoked', type: 'bool' },
          { name: 'boardActive', type: 'bool' },
          { name: 'tally', type: 'tuple', components: TALLY_COMPONENTS },
          { name: 'subjectVersion', type: 'bytes32' },
          { name: 'evidenceHash', type: 'bytes32' },
          { name: 'evidenceURI', type: 'string' },
          { name: 'boardIssuedAt', type: 'uint64' },
          { name: 'recordedAt', type: 'uint64' },
          { name: 'expiresAt', type: 'uint64' },
        ],
      },
    ],
  },
] as const;

export const publicClient = createPublicClient({
  chain: sepolia,
  transport: http(import.meta.env.VITE_SEPOLIA_RPC_URL ?? DEFAULT_RPC_URL),
});

export const readAssessmentCount = (): Promise<bigint> =>
  publicClient.readContract({ address: REGISTRY_ADDRESS, abi: REGISTRY_ABI, functionName: 'assessmentCount' });

export const readAssessment = (id: bigint) =>
  publicClient.readContract({ address: REGISTRY_ADDRESS, abi: REGISTRY_ABI, functionName: 'getAssessment', args: [id] });

export const readResolution = (asset: Address) =>
  publicClient.readContract({ address: REGISTRY_ADDRESS, abi: REGISTRY_ABI, functionName: 'resolve', args: [asset] });

export const readQuorum = (): Promise<number> =>
  publicClient.readContract({ address: REGISTRY_ADDRESS, abi: REGISTRY_ABI, functionName: 'quorum' }).then(Number);

export const readBoardMembers = (): Promise<readonly Address[]> =>
  publicClient.readContract({ address: REGISTRY_ADDRESS, abi: REGISTRY_ABI, functionName: 'getShariaBoardMembers' });

export const readBoardMemberInfo = (address: Address) =>
  publicClient.readContract({ address: REGISTRY_ADDRESS, abi: REGISTRY_ABI, functionName: 'shariaBoardMembers', args: [address] });

export const readPolicyId = (): Promise<`0x${string}`> =>
  publicClient.readContract({ address: REGISTRY_ADDRESS, abi: REGISTRY_ABI, functionName: 'policyId' });
