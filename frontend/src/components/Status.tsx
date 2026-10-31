import { STATUS, type Conclusion, type Status } from '../data/reviews';
import { formatDate } from '../lib/dates';
import { Icon } from './Icon';

/** The review status: the primary signal. Filled tag with an icon, never colour alone. */
export function StatusTag({ status, large = false }: { status: Status; large?: boolean }) {
  const s = STATUS[status];
  return (
    <span className={`stag t-${s.tone}${large ? ' lg' : ''}`}>
      <Icon name={s.icon} />
      {status}
    </span>
  );
}

interface ConclusionProps {
  conclusion: Conclusion;
  status: Status;
  /** Date of a withdrawal, shown as a retraction */
  retractedOn?: string;
  large?: boolean;
}

/**
 * The board conclusion: the secondary signal. In colour only while the record is Active.
 * Otherwise it is printed in neutral ink as history, and the status tag carries the reason.
 * A withdrawn approval is struck through, because a withdrawal voids it.
 */
export function ConclusionText({ conclusion, status, retractedOn, large = false }: ConclusionProps) {
  const lg = large ? ' lg' : '';
  if (conclusion !== 'Approved')
    return (
      <span className={`concl k-bad${lg}`}>
        <Icon name="x" />
        Not approved
      </span>
    );
  if (status === 'Withdrawn')
    return (
      <span className={`concl k-void${lg}`}>
        <s>Approved</s>
        <span className="hist-note">void{retractedOn ? `, withdrawn ${formatDate(retractedOn)}` : ''}</span>
      </span>
    );
  if (status === 'Active')
    return (
      <span className={`concl k-ok${lg}`}>
        <Icon name="check" />
        Approved
      </span>
    );
  // Expired, Needs review or Replaced: the approval stands as history. A text cue, not just grey, says it is not in force.
  return (
    <span className={`concl k-hist${lg}`}>
      Approved<span className="hist-note">not in force</span>
    </span>
  );
}
