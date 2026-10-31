import { useEffect, useState } from 'react';
import type { Address, Hex } from 'viem';
import { readPolicyId } from '../../lib/chain';
import type { IssueMessage } from '../../lib/eip712';
import { listPendingProposals, signOpinion as submitSignature, type Outcome, type Proposal } from '../../lib/api';
import type { WalletState } from '../../lib/wallet';
import { OutcomeBadge } from './OutcomeBadge';

const STATUS_LABEL: Record<Proposal['status'], string> = {
  awaiting_signatures: 'Awaiting signatures',
  quorum_reached: 'Quorum reached — delivering onchain',
  resolved: 'Resolved onchain',
  expired: 'Signing window expired',
};

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
});

interface Props {
  wallet: WalletState;
  memberAddress: Address;
  refreshKey: number;
  onSigned: () => void;
}

export function PendingProposals({ wallet, memberAddress, refreshKey, onSigned }: Props) {
  const [proposals, setProposals] = useState<Proposal[] | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [myOpinion, setMyOpinion] = useState<Record<string, Outcome>>({});
  const [signing, setSigning] = useState<string | null>(null);
  const [signError, setSignError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    listPendingProposals()
      .then((list) => !cancelled && setProposals(list))
      .catch(() => !cancelled && setError('Could not load pending proposals.'));
    return () => {
      cancelled = true;
    };
  }, [refreshKey]);

  const sign = async (proposal: Proposal) => {
    setSigning(proposal.asset);
    setSignError(null);
    try {
      const policyId = await readPolicyId();
      const opinion = myOpinion[proposal.asset] ?? proposal.outcome;
      const signature = await wallet.signOpinion(issueMessageFromProposal(proposal, policyId), opinion);
      await submitSignature({ asset: proposal.asset, shariaBoardMember: memberAddress, opinion, signature });
      onSigned();
    } catch (err) {
      setSignError(err instanceof Error ? err.message : 'Signing failed.');
    } finally {
      setSigning(null);
    }
  };

  if (error) return <p className="dash-error">{error}</p>;
  if (proposals === null) return <p className="dash-empty">Loading pending proposals…</p>;
  if (proposals.length === 0) return <p className="dash-empty">No proposals are pending signature right now.</p>;

  return (
    <div className="dash-card">
      <h3 style={{ marginTop: 0 }}>Pending proposals</h3>
      {proposals.map((proposal) => {
        const alreadySigned = proposal.opinions.some(
          (o) => o.shariaBoardMember.toLowerCase() === memberAddress.toLowerCase(),
        );
        const canSign = proposal.status === 'awaiting_signatures' && !alreadySigned;
        return (
          <div className="dash-row" key={proposal.asset} style={{ flexDirection: 'column', alignItems: 'stretch' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', gap: 12 }}>
              <div>
                <div className="dash-asset">{proposal.asset}</div>
                <div className="dash-hint">
                  Proposed <OutcomeBadge outcome={proposal.outcome} /> · {proposal.opinions.length}/{proposal.quorum}{' '}
                  signed · {STATUS_LABEL[proposal.status]}
                </div>
                <div className="dash-hint">{proposal.evidenceNote}</div>
              </div>
            </div>
            {canSign && (
              <div style={{ display: 'flex', gap: 8, marginTop: 8, alignItems: 'center' }}>
                <select
                  value={myOpinion[proposal.asset] ?? proposal.outcome}
                  onChange={(e) =>
                    setMyOpinion((prev) => ({ ...prev, [proposal.asset]: Number(e.target.value) as Outcome }))
                  }
                >
                  <option value={1}>Approved</option>
                  <option value={2}>Rejected</option>
                  <option value={3}>Needs review</option>
                </select>
                <button
                  type="button"
                  className="dash-btn secondary"
                  onClick={() => sign(proposal)}
                  disabled={signing === proposal.asset}
                >
                  {signing === proposal.asset ? 'Signing…' : 'Sign'}
                </button>
              </div>
            )}
            {alreadySigned && proposal.status === 'awaiting_signatures' && (
              <p className="dash-hint">You've signed this one — waiting on the rest of the board.</p>
            )}
          </div>
        );
      })}
      {signError && <p className="dash-error">{signError}</p>}
    </div>
  );
}
