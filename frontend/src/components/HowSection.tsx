import type { RefObject } from 'react';
import { PARTS, type Part } from '../data/reviews';

interface Props {
  sectionRef: RefObject<HTMLElement | null>;
  panelRef: RefObject<HTMLDivElement | null>;
  step: number;
  onJump: (k: number) => void;
  staticMode: boolean;
}

function Field({ part }: { part: Part }) {
  return (
    <code className="field">
      {part.field.map(([k, v]) => (
        <span key={k}>
          <span className="fk">{k}:</span> {v}
        </span>
      ))}
    </code>
  );
}

function PartBody({ part }: { part: Part }) {
  return (
    <>
      <p>{part.text}</p>
      <Field part={part} />
    </>
  );
}

const Head = () => (
  <>
    <h2 id="howTitle">
      <span className="sec">§2</span> How a review works
    </h2>
    <p className="lede">Five steps, from submission to a signed record. Each review covers one product as it existed at one point in time.</p>
  </>
);

/**
 * The five steps of a review. With 3D, a short scroll track walks the camera through five
 * arches while the panel follows. Without it, the five steps are a plain numbered list.
 */
export function HowSection({ sectionRef, panelRef, step, onJump, staticMode }: Props) {
  if (staticMode) {
    return (
      <section id="how" ref={sectionRef} className="sect" aria-labelledby="howTitle">
        <div className="wrap" ref={panelRef}>
          <div className="sect-head">
            <Head />
          </div>
          <ol className="parts">
            {PARTS.map((p, i) => (
              <li key={p.short}>
                <span className="pnum">{i + 1}</span>
                <div>
                  <h3>
                    {p.short}: {p.title.toLowerCase()}
                  </h3>
                  <PartBody part={p} />
                </div>
              </li>
            ))}
          </ol>
        </div>
      </section>
    );
  }

  return (
    <section id="how" ref={sectionRef} className="track track-how" aria-labelledby="howTitle">
      {/* Snap points at the middle of each step, where the camera holds on its arch. */}
      {PARTS.map((p, i) => (
        <span key={p.short} className="snap" style={{ top: `calc(${((i + 0.5) / PARTS.length).toFixed(3)} * (100% - 100vh) + var(--nav-h) + 12px)` }} aria-hidden="true" />
      ))}
      <div className="sticky">
        <div className="wrap">
          <div className="panel" ref={panelRef}>
            <Head />
            <div className="steps" role="group" aria-label="Steps of a review">
              {PARTS.map((p, i) => (
                <button key={p.short} aria-pressed={i === step} onClick={() => onJump(i)}>
                  <span className="n">{i + 1}</span> {p.short}
                </button>
              ))}
            </div>
            {/* Screen readers get all five steps as one list; the visible card shows the current one. */}
            <ol className="sr">
              {PARTS.map((p) => (
                <li key={p.short}>
                  {p.short}: {p.title}. {p.text} Example fields: {p.field.map(([k, v]) => `${k} ${v}`).join('; ')}.
                </li>
              ))}
            </ol>
            {/* All five cards share one grid cell, so the card keeps one height and steps cross-fade both ways. */}
            <div className="step-stack" aria-hidden="true">
              {PARTS.map((p, i) => (
                <div key={p.short} className={`step-body${i === step ? ' on' : ''}`}>
                  <h3>{p.title}</h3>
                  <PartBody part={p} />
                </div>
              ))}
            </div>
            <a className="skip-on" href="#who">
              Skip to who decides
            </a>
          </div>
        </div>
      </div>
    </section>
  );
}
