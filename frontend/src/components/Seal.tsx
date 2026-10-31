import { useId } from 'react';
import { STAR_8 } from './Icon';

/** The board's ink seal, stamped once on every record. It does not move: a seal stands for finality. */
export function Seal({ record, size = 112, small = false, void: isVoid = false, label = 'ILLUSTRATIVE SHARI’AH BOARD · DEMO RECORD' }: { record: string; size?: number; small?: boolean; void?: boolean; label?: string }) {
  const id = `seal-${useId().replace(/:/g, '')}`;
  const ink = 'var(--seal)';
  // The small seal drops the ring text, which cannot be read below about 90px.
  if (small)
    return (
      <svg className="seal" viewBox="0 0 120 120" width={size} height={size} aria-hidden="true">
        <circle cx="60" cy="60" r="56" fill="none" stroke={ink} strokeWidth="4" />
        <polygon points={STAR_8(60, 60, 44)} fill="none" stroke={ink} strokeWidth="3" strokeLinejoin="round" />
        <g fill="none" stroke={ink} strokeWidth="4" strokeLinecap="round" strokeLinejoin="round">
          <path d="M60 38v40M50 78h20M42 46h36M42 46l-6 12h12zM78 46l-6 12h12z" />
        </g>
      </svg>
    );
  return (
    <svg className="seal" viewBox="0 0 120 120" width={size} height={size} aria-hidden="true">
      <defs>
        <path id={id} d="M60,60 m-47,0 a47,47 0 1,1 94,0 a47,47 0 1,1 -94,0" />
      </defs>
      <circle cx="60" cy="60" r="57" fill="none" stroke={ink} strokeWidth="2" />
      <circle cx="60" cy="60" r="53" fill="none" stroke={ink} strokeWidth=".8" />
      <text fontFamily="var(--f-body)" fontSize="8" fontWeight="600" fill={ink} letterSpacing="1">
        <textPath href={`#${id}`} textLength="290" lengthAdjust="spacing">
          {label} ·
        </textPath>
      </text>
      <polygon points={STAR_8(60, 60, 38)} fill="none" stroke={ink} strokeWidth="1.4" strokeLinejoin="round" />
      <g fill="none" stroke={ink} strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
        <path d="M60 39v24M53 63h14M46 45h28M46 45l-5 9h10zM74 45l-5 9h10z" />
      </g>
      <text x="60" y="79" textAnchor="middle" fontFamily="var(--f-body)" fontWeight="600" fontSize="8.5" letterSpacing=".6" fill={ink}>
        {record}
      </text>
      {isVoid && (
        <g transform="rotate(-18 60 60)">
          <rect x="6" y="48" width="108" height="24" fill="var(--sheet)" stroke="var(--bad)" strokeWidth="2.5" />
          <text x="60" y="66" textAnchor="middle" fontFamily="var(--f-body)" fontWeight="700" fontSize="17" letterSpacing="5" fill="var(--bad)">
            VOID
          </text>
        </g>
      )}
    </svg>
  );
}
