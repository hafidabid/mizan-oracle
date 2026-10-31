import { useState } from 'react';
import { isAddress, type Address } from 'viem';
import { effectiveOutcome, readResolution } from '../../lib/chain';
import { OutcomeBadge } from './OutcomeBadge';

type Resolution = Awaited<ReturnType<typeof readResolution>>;

export function AssetLookup() {
  const [input, setInput] = useState('');
  const [result, setResult] = useState<Resolution | null>(null);
  const [status, setStatus] = useState<'idle' | 'loading' | 'error'>('idle');

  const lookup = async () => {
    if (!isAddress(input)) {
      setStatus('error');
      setResult(null);
      return;
    }
    setStatus('loading');
    try {
      const resolution = await readResolution(input as Address);
      setResult(resolution);
      setStatus('idle');
    } catch {
      setStatus('error');
      setResult(null);
    }
  };

  return (
    <div className="dash-card">
      <div className="dash-field">
        <label htmlFor="lookup-address">Asset contract address</label>
        <input
          id="lookup-address"
          placeholder="0x…"
          value={input}
          onChange={(e) => setInput(e.target.value.trim())}
          onKeyDown={(e) => e.key === 'Enter' && lookup()}
        />
      </div>
      <button type="button" className="dash-btn" onClick={lookup} disabled={status === 'loading'}>
        {status === 'loading' ? 'Looking up…' : 'Look up'}
      </button>
      {status === 'error' && <p className="dash-error">Enter a valid address, or the lookup failed. Try again.</p>}

      {result && !result.exists && <p className="dash-empty">No Sharia board assessment exists for this asset.</p>}

      {result && result.exists && (
        <div style={{ marginTop: 16 }}>
          <div className="dash-row">
            <span>Outcome</span>
            <OutcomeBadge outcome={effectiveOutcome(result.tally.quorumMet, result.outcome)} />
          </div>
          <div className="dash-row">
            <span>Assessment #</span>
            <span className="dash-asset">{result.assessmentId.toString()}</span>
          </div>
          <div className="dash-row">
            <span>Board support</span>
            <span>
              {result.tally.approvals}A / {result.tally.rejections}R / {result.tally.needsReview}N (quorum{' '}
              {result.tally.quorum}, board size {result.tally.boardSize})
            </span>
          </div>
          <div className="dash-row">
            <span>Issued</span>
            <span>{new Date(Number(result.boardIssuedAt) * 1000).toLocaleString()}</span>
          </div>
          <div className="dash-row">
            <span>Expires</span>
            <span>{new Date(Number(result.expiresAt) * 1000).toLocaleString()}</span>
          </div>
          {result.expired && <p className="dash-hint">This assessment has expired.</p>}
          {result.revoked && <p className="dash-error">This assessment has been revoked.</p>}
          {!result.boardActive && <p className="dash-error">The Sharia board is currently suspended.</p>}
        </div>
      )}
    </div>
  );
}
