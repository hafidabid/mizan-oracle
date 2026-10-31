import { useEffect, useState } from 'react';
import { effectiveOutcome, readAssessment, readAssessmentCount } from '../../lib/chain';
import { OutcomeBadge } from './OutcomeBadge';

interface Row {
  id: bigint;
  asset: string;
  outcome: number;
  recordedAt: bigint;
  approvals: number;
  rejections: number;
  needsReview: number;
  quorum: number;
}

const MAX_ROWS = 50;

export function BrowseList() {
  const [rows, setRows] = useState<Row[] | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const count = await readAssessmentCount();
        if (count === 0n) {
          if (!cancelled) setRows([]);
          return;
        }
        const first = count > BigInt(MAX_ROWS) ? count - BigInt(MAX_ROWS) + 1n : 1n;
        const ids: bigint[] = [];
        for (let id = count; id >= first; id--) ids.push(id);

        const assessments = await Promise.all(ids.map((id) => readAssessment(id)));
        const next = assessments.map((a, i) => ({
          id: ids[i],
          asset: a.review.asset,
          outcome: effectiveOutcome(a.tally.quorumMet, a.review.outcome),
          recordedAt: a.recordedAt,
          approvals: a.tally.approvals,
          rejections: a.tally.rejections,
          needsReview: a.tally.needsReview,
          quorum: a.tally.quorum,
        }));
        if (!cancelled) setRows(next);
      } catch {
        if (!cancelled) setError('Could not load assessments from the registry. Try again in a moment.');
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  if (error) return <p className="dash-error">{error}</p>;
  if (rows === null) return <p className="dash-empty">Loading assessments…</p>;
  if (rows.length === 0) return <p className="dash-empty">No assessments have been published yet.</p>;

  return (
    <div className="dash-card">
      {rows.map((row) => (
        <div className="dash-row" key={row.id.toString()}>
          <div>
            <div className="dash-asset">{row.asset}</div>
            <div className="dash-hint">
              #{row.id.toString()} · {new Date(Number(row.recordedAt) * 1000).toLocaleString()} · {row.approvals}A/
              {row.rejections}R/{row.needsReview}N, quorum {row.quorum}
            </div>
          </div>
          <OutcomeBadge outcome={row.outcome} />
        </div>
      ))}
    </div>
  );
}
