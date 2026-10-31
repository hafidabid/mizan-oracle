import { outcomeName } from '../../lib/chain';

const TONE: Record<string, 'ok' | 'bad' | 'warn' | 'mute'> = {
  Approved: 'ok',
  Rejected: 'bad',
  NeedsReview: 'warn',
  Unset: 'mute',
};

export function OutcomeBadge({ outcome }: { outcome: number }) {
  const name = outcomeName(outcome);
  return <span className={`dash-badge ${TONE[name]}`}>{name}</span>;
}
