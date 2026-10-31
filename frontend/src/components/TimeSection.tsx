import type { RefObject } from 'react';
import { addDays, formatDate, ISSUE, PERIOD_DAYS, TIMELINE_DAYS, TODAY_DAY } from '../lib/dates';
import { ConclusionText, StatusTag } from './Status';
import { SkyArt } from './Art';

interface Props {
  sectionRef: RefObject<HTMLElement | null>;
  day: number;
  onJump: (day: number) => void;
  staticMode: boolean;
}

const JUMPS: Array<[string, number]> = [
  ['Issued', 0],
  ['Today', TODAY_DAY],
  ['Last day', PERIOD_DAYS],
  ['Feb 2028', 460],
];

const EXPIRY_PCT = (PERIOD_DAYS / TIMELINE_DAYS) * 100;

/** Sample Token A's review year. The status flips to Expired when the period ends; the conclusion does not change. */
export function TimeSection({ sectionRef, day, onJump, staticMode }: Props) {
  const active = day <= PERIOD_DAYS;
  const status = active ? 'Active' : 'Expired';
  const panel = (
    <div className="panel panel-time">
      <h2 id="timeTitle">
        <span className="sec">§3</span> An approval has a sunset
      </h2>
      <p className="lede">
        {staticMode ? 'Move the date to run' : 'Scroll to run'} Sample Token A’s 12-month review period. When it ends, the status changes. The board’s conclusion stays on the record, unchanged.
      </p>
      <div className="date-big">
        <b>{formatDate(addDays(ISSUE, day))}</b>
        <span>{active ? `${PERIOD_DAYS - day} days left` : `Ended ${day - PERIOD_DAYS} days ago`}</span>
      </div>
      {staticMode ? (
        <label className="range">
          <span className="sr">Date within the review period</span>
          <input type="range" min={0} max={TIMELINE_DAYS} value={day} onChange={(e) => onJump(+e.target.value)} aria-valuetext={formatDate(addDays(ISSUE, day))} />
        </label>
      ) : (
        <div className="yearbar" aria-hidden="true">
          <i style={{ width: `${((day / TIMELINE_DAYS) * 100).toFixed(1)}%` }} />
        </div>
      )}
      <div className="year-ticks" aria-hidden="true">
        <span>Issued 12 Oct 2026</span>
        <span className="tick-exp" style={{ left: `${EXPIRY_PCT}%` }}>
          Ends 12 Oct 2027
        </span>
      </div>
      <dl className="states">
        <div className={active ? 'on' : 'off'}>
          <dt>Review status</dt>
          <dd>
            <StatusTag status={status} large />
          </dd>
          <dd className="sub">{active ? 'Current within the period' : 'No longer current'}</dd>
        </div>
        <div>
          <dt>Board conclusion</dt>
          <dd>
            <ConclusionText conclusion="Approved" status={status} large />
          </dd>
          <dd className="sub">Unchanged. Stays on the record.</dd>
        </div>
      </dl>
      <div className="jumps" role="group" aria-label="Jump to a date">
        {JUMPS.map(([label, d]) => (
          <button key={label} onClick={() => onJump(d)}>
            {label}
          </button>
        ))}
      </div>
    </div>
  );

  if (staticMode) {
    return (
      <section id="time" ref={sectionRef} className="sect" aria-labelledby="timeTitle">
        <div className="wrap time-static">
          {panel}
          <SkyArt day={day} />
        </div>
      </section>
    );
  }
  return (
    <section id="time" ref={sectionRef} className="track track-time" aria-labelledby="timeTitle">
      <div className="sticky">
        <div className="wrap">{panel}</div>
      </div>
    </section>
  );
}
