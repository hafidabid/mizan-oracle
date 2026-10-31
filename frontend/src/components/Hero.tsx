import { getReview, type HeroProductId } from '../data/reviews';
import { formatDate, periodNote, validity } from '../lib/dates';
import { ConclusionText, StatusTag } from './Status';
import { useRef } from 'react';
import { ScaleArt } from './Art';
import { HeroWindow } from './HeroWindow';
import { Motes, Rosette } from './Ornament';

// Labelled with the real status names, so what you learn here is what you filter by in the register.
const OUTCOMES: Array<{ id: HeroProductId; label: string }> = [
  { id: 'token', label: 'Active' },
  { id: 'vault', label: 'Expired' },
  { id: 'rent', label: 'Withdrawn' },
  { id: 'lend', label: 'Closed' },
];

interface Props {
  chosen: HeroProductId;
  onChoose: (id: HeroProductId) => void;
  onOpen: (id: string) => void;
  staticMode: boolean;
}

export function Hero({ chosen, onChoose, onOpen, staticMode }: Props) {
  const heroRef = useRef<HTMLElement>(null);
  const frameRef = useRef<HTMLDivElement>(null);
  const r = getReview(chosen);
  const v = validity(r);
  const holds = r.status === 'Active';
  return (
    <section className="hero" aria-labelledby="heroTitle" ref={heroRef}>
      <div className="hero-glow" aria-hidden="true" />
      {!staticMode && <HeroWindow hero={heroRef} frame={frameRef} />}
      <div className="hero-orn" aria-hidden="true">
        <Rosette size={560} className="orn-a" />
        <Rosette size={340} className="orn-b" />
        <Motes />
      </div>
      <div className="wrap hero-grid">
        <div className="hero-copy">
          <p className="hero-mark">
            <span lang="ar" className="ar-mark">
              ميزان
            </span>
            <span className="hero-mark-en">Mizan, the balance. A Shari’ah review register for DeFi.</span>
          </p>
          <h1 id="heroTitle">Check whether a DeFi product’s Shari’ah approval still holds.</h1>
          <p className="lede">
            Each record states what the board concluded, exactly what it covered, and whether that conclusion is still current. People read it here; smart contracts read it through the oracle.
          </p>

          <div className="record-card">
            <div className="rc-head">
              <span className="rc-label" id="rcLabel">
                Try a sample record
              </span>
              <div className="seg seg-sm" role="group" aria-labelledby="rcLabel">
                {OUTCOMES.map((p) => {
                  const x = getReview(p.id);
                  return (
                    <button key={p.id} aria-pressed={p.id === chosen} onClick={() => onChoose(p.id)}>
                      <b>{p.label}</b>
                      <small>{x.type}</small>
                    </button>
                  );
                })}
              </div>
            </div>
            <div className="rc-body">
              <div className="rc-id">
                <span className="rec">{r.rec}</span>
                <span className="rc-name">
                  {r.name} <span className="muted">{r.version}</span>
                </span>
              </div>
              <dl className="rc-states">
                <div>
                  <dt>Review status</dt>
                  <dd>
                    <StatusTag status={r.status} large />
                  </dd>
                  <dd className="sub">{holds ? periodNote(r) : v.text}</dd>
                </div>
                <div>
                  <dt>Board conclusion</dt>
                  <dd>
                    <ConclusionText conclusion={r.conclusion} status={r.status} retractedOn={r.statusDate} large />
                  </dd>
                  <dd className="sub">
                    Vote {r.vote[0]}–{r.vote[1]}, issued {formatDate(r.issue)}
                  </dd>
                </div>
              </dl>
              <div className="rc-foot">
                <p className="rc-verdict">
                  <b>{holds ? 'The approval holds today.' : r.conclusion === 'Approved' ? 'Do not rely on this approval today.' : 'There is no approval to rely on.'}</b> {r.holders ?? ''}
                </p>
                <button className="btn btn-quiet" onClick={() => onOpen(r.id)}>
                  Open record {r.rec}
                </button>
              </div>
            </div>
            <p className="sr" role="status">
              Showing {r.rec}: status {r.status}, conclusion {r.conclusion}.
            </p>
          </div>

          <div className="audiences">
            <a href="#register" className="btn btn-primary">
              Browse all records
            </a>
            <a href="#how" className="text-link">
              Scholars: method and board
            </a>
            <a href="#builders" className="text-link">
              Builders: the oracle
            </a>
          </div>
        </div>
        <div className="hero-art">
          <div className="hero-frame" ref={frameRef}>
            <ScaleArt tilt={holds ? 0 : r.status === 'Expired' ? 1 : 2} />
          </div>
          <p className="art-cap">The scale is level only while an approval holds today.</p>
        </div>
      </div>
    </section>
  );
}
