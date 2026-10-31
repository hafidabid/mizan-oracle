import { useState } from 'react';
import { isAddress, type Address } from 'viem';
import type { WalletState } from '../../lib/wallet';
import { proposeAssessment, type Outcome } from '../../lib/api';

const OUTCOMES: { value: Outcome; label: string }[] = [
  { value: 1, label: 'Approved' },
  { value: 2, label: 'Rejected' },
  { value: 3, label: 'Needs review' },
];

interface Props {
  wallet: WalletState;
  onProposed: () => void;
}

export function ProposeForm({ wallet, onProposed }: Props) {
  const [asset, setAsset] = useState('');
  const [outcome, setOutcome] = useState<Outcome>(1);
  const [evidenceNote, setEvidenceNote] = useState('');
  const [status, setStatus] = useState<'idle' | 'submitting' | 'error'>('idle');
  const [error, setError] = useState<string | null>(null);

  const submit = async () => {
    if (!wallet.address) return;
    if (!isAddress(asset)) {
      setStatus('error');
      setError('Enter a valid asset contract address.');
      return;
    }
    if (!evidenceNote.trim()) {
      setStatus('error');
      setError('Evidence note is required — summarize what was reviewed and why.');
      return;
    }
    setStatus('submitting');
    setError(null);
    try {
      const { proposerTimestamp, proposerSignature } = await wallet.signProposeAuth(asset as Address);
      await proposeAssessment({
        asset: asset as Address,
        outcome,
        evidenceNote: evidenceNote.trim(),
        proposerAddress: wallet.address,
        proposerTimestamp,
        proposerSignature,
      });
      setAsset('');
      setEvidenceNote('');
      setStatus('idle');
      onProposed();
    } catch (err) {
      setStatus('error');
      setError(err instanceof Error ? err.message : 'Could not create the proposal.');
    }
  };

  return (
    <div className="dash-card">
      <h3 style={{ marginTop: 0 }}>Propose an assessment</h3>
      <div className="dash-field">
        <label htmlFor="propose-asset">Asset contract address</label>
        <input id="propose-asset" placeholder="0x…" value={asset} onChange={(e) => setAsset(e.target.value.trim())} />
      </div>
      <div className="dash-field">
        <label htmlFor="propose-outcome">Proposed outcome</label>
        <select id="propose-outcome" value={outcome} onChange={(e) => setOutcome(Number(e.target.value) as Outcome)}>
          {OUTCOMES.map((o) => (
            <option key={o.value} value={o.value}>
              {o.label}
            </option>
          ))}
        </select>
      </div>
      <div className="dash-field">
        <label htmlFor="propose-evidence">Evidence note (max 280 characters)</label>
        <textarea
          id="propose-evidence"
          maxLength={280}
          value={evidenceNote}
          onChange={(e) => setEvidenceNote(e.target.value)}
          placeholder="What was reviewed, and why this outcome — this is hashed and stored onchain as the evidence record."
        />
      </div>
      <button type="button" className="dash-btn" onClick={submit} disabled={status === 'submitting'}>
        {status === 'submitting' ? 'Signing…' : 'Propose'}
      </button>
      {status === 'error' && error && <p className="dash-error">{error}</p>}
    </div>
  );
}
