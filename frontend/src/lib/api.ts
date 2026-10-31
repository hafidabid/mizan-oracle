import type { Address, Hex } from 'viem';

// Mirrors frontend/api/_store.ts's Proposal — the backing serverless store is the source
// of truth for this shape.
export type Outcome = 1 | 2 | 3;
export type ProposalStatus = 'awaiting_signatures' | 'quorum_reached' | 'resolved' | 'expired';

export interface OpinionEntry {
  shariaBoardMember: Address;
  opinion: Outcome;
  signature: Hex;
}

export interface Proposal {
  asset: Address;
  subjectVersion: Hex;
  outcome: Outcome;
  evidenceHash: Hex;
  evidenceURI: string;
  evidenceNote: string;
  boardIssuedAt: string;
  expiresAt: string;
  deadline: string;
  previousId: string;
  nonce: string;
  quorum: number;
  status: ProposalStatus;
  opinions: OpinionEntry[];
  proposerAddress: Address;
  createdAt: number;
  resolvedTxHash?: Hex;
  resolvedAssessmentId?: string;
}

const BASE_URL = import.meta.env.VITE_MIZAN_API_BASE_URL ?? '/api';

class ApiError extends Error {
  code: string;
  constructor(message: string, code: string) {
    super(message);
    this.code = code;
  }
}

const parse = async <T>(response: Response): Promise<T> => {
  const body = await response.json();
  if (!response.ok) throw new ApiError(body.error ?? 'request failed', body.code ?? 'unknown');
  return body as T;
};

export const listPendingProposals = async (): Promise<Proposal[]> => {
  const response = await fetch(`${BASE_URL}/pending`);
  const body = await parse<{ proposals: Proposal[] }>(response);
  return body.proposals;
};

export const getPendingProposal = async (asset: Address): Promise<Proposal | null> => {
  const response = await fetch(`${BASE_URL}/pending?asset=${asset}`);
  if (response.status === 404) return null;
  const body = await parse<{ proposal: Proposal }>(response);
  return body.proposal;
};

export interface ProposeRequest {
  asset: Address;
  outcome: Outcome;
  evidenceNote: string;
  expiresInDays?: number;
  proposerAddress: Address;
  proposerTimestamp: number;
  proposerSignature: Hex;
}

export const proposeAssessment = async (request: ProposeRequest): Promise<Proposal> => {
  const response = await fetch(`${BASE_URL}/propose`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(request),
  });
  const body = await parse<{ proposal: Proposal }>(response);
  return body.proposal;
};

export interface SignRequest {
  asset: Address;
  shariaBoardMember: Address;
  opinion: Outcome;
  signature: Hex;
}

export const signOpinion = async (request: SignRequest): Promise<Proposal> => {
  const response = await fetch(`${BASE_URL}/sign`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(request),
  });
  const body = await parse<{ proposal: Proposal }>(response);
  return body.proposal;
};
