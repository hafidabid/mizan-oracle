import { PERIOD_DAYS, TIMELINE_DAYS } from '../lib/dates';
import { STAR_8 } from './Icon';

/** A pointed-arch outline, the same profile as the 3D gates. */
const archD = (x: number, y: number, w: number, spring: number, apex: number) =>
  `M${x} ${y}V${y - spring}C${x} ${y - spring - apex * 0.55} ${x + w * 0.4} ${y - spring - apex * 0.85} ${x + w / 2} ${y - spring - apex}` +
  `C${x + w * 0.6} ${y - spring - apex * 0.85} ${x + w} ${y - spring - apex * 0.55} ${x + w} ${y - spring}V${y}`;

/**
 * The hero drawing for the still page and the poster shown while the 3D loads: a balance in a
 * cut-paper arch window over a star lattice. It is level only while the approval holds today.
 * tilt: 0 level, 1 lapsed, 2 void or not approved.
 */
export function ScaleArt({ tilt }: { tilt: 0 | 1 | 2 }) {
  const a = [0, 6, 12][tilt];
  const stars = [];
  for (let i = 0; i < 7; i++) for (let j = 0; j < 9; j++) stars.push(<polygon key={`${i}-${j}`} points={STAR_8(58 + i * 34, 64 + j * 34, 11)} />);
  return (
    <svg className="art art-scale" viewBox="0 0 320 380" aria-hidden="true">
      <defs>
        <clipPath id="archClip">
          <path d={archD(40, 360, 240, 200, 130) + 'Z'} />
        </clipPath>
      </defs>
      <path d={archD(28, 372, 264, 206, 142) + 'Z'} fill="var(--paper-2)" />
      <g clipPath="url(#archClip)">
        <rect x="0" y="0" width="320" height="380" fill="var(--sheet)" />
        <g fill="none" stroke="var(--rule)" strokeWidth="1">{stars}</g>
      </g>
      <path d={archD(40, 360, 240, 200, 130)} fill="none" stroke="var(--lapis)" strokeWidth="1.5" />
      <path d={archD(28, 372, 264, 206, 142)} fill="none" stroke="var(--lapis)" strokeWidth="1" />
      <g fill="none" stroke="var(--ink)" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
        <path d="M160 108v222M124 330h72M136 318h48" />
        <g className="beam" style={{ transform: `rotate(${a}deg)`, transformOrigin: '160px 120px' }}>
          <path d="M86 120h148" />
          <g className="pan" style={{ transform: `rotate(${-a}deg)`, transformOrigin: '86px 120px' }}>
            <path d="M86 120l-28 76M86 120l28 76M54 196h64a32 13 0 01-64 0z" fill="var(--sheet)" />
          </g>
          <g className="pan" style={{ transform: `rotate(${-a}deg)`, transformOrigin: '234px 120px' }}>
            <path d="M234 120l-28 76M234 120l28 76M202 196h64a32 13 0 01-64 0z" fill="var(--sheet)" />
          </g>
        </g>
      </g>
      <polygon points={STAR_8(160, 100, 9)} fill="var(--brass)" />
    </svg>
  );
}

const SKY: Array<[number, string, string]> = [
  // [share of the timeline, top, horizon]
  [0, '#C9D3DC', '#F1DDBF'],
  [0.35, '#A9C2D6', '#F1EDE4'],
  [0.65, '#B4BCCB', '#EBCB9E'],
  [0.75, '#59617E', '#D9925A'],
  [0.83, '#1E2A44', '#3A4560'],
  [1, '#121B2E', '#26324A'],
];
const mix = (a: string, b: string, t: number) => {
  const pa = [1, 3, 5].map((i) => parseInt(a.slice(i, i + 2), 16));
  const pb = [1, 3, 5].map((i) => parseInt(b.slice(i, i + 2), 16));
  return `rgb(${pa.map((v, i) => Math.round(v + (pb[i] - v) * t)).join(',')})`;
};
const skyAt = (f: number) => {
  let i = 0;
  while (i < SKY.length - 2 && f > SKY[i + 1][0]) i++;
  const [f0, t0, h0] = SKY[i];
  const [f1, t1, h1] = SKY[i + 1];
  const t = Math.min(1, Math.max(0, (f - f0) / (f1 - f0)));
  return [mix(t0, t1, t), mix(h0, h1, t)];
};

/**
 * The still version of the sunset: the review year seen through the Mizan arch. The sun crosses
 * the sky over the 12 months and sets on the last day; after that it is night and the town's
 * windows are lit. Used on phones, under reduced motion and without WebGL.
 */
export function SkyArt({ day }: { day: number }) {
  const f = day / TIMELINE_DAYS;
  const [top, hor] = skyAt(f);
  const t = Math.min(day, PERIOD_DAYS) / PERIOD_DAYS;
  const sx = 40 + 240 * t;
  const sy = 230 - Math.sin(Math.PI * t) * 150;
  const night = day > PERIOD_DAYS;
  const lit = night ? 1 : 0;
  const town = 'M20 300V246h34v-14h22v14h30v-26h18l8-10 8 10h18v26h26v-18h36v18h22v-30h16l6-8 6 8h16v30h20v54Z';
  const windows: Array<[number, number]> = [[34, 262], [62, 250], [92, 262], [130, 236], [160, 250], [196, 262], [236, 248], [266, 262], [286, 250]];
  return (
    <svg className="art art-sky" viewBox="0 0 320 320" role="img" aria-label={night ? 'Night over the town: the review period has ended' : 'The sun crossing the sky during the review period'}>
      <defs>
        <linearGradient id="skyG" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor={top} />
          <stop offset="1" stopColor={hor} />
        </linearGradient>
        <clipPath id="skyClip">
          <path d={archD(20, 300, 280, 170, 110) + 'Z'} />
        </clipPath>
      </defs>
      <g clipPath="url(#skyClip)">
        <rect width="320" height="320" fill="url(#skyG)" />
        {night ? (
          <g fill="#F1EDE4">
            {[[80, 70], [150, 50], [220, 84], [250, 130], [110, 120], [190, 110]].map(([x, y], i) => (
              <polygon key={i} points={STAR_8(x, y, 3)} />
            ))}
          </g>
        ) : (
          <circle cx={sx} cy={sy} r="14" fill="var(--brass)" />
        )}
        <path d={town} fill={night ? '#0E1626' : 'var(--lapis)'} />
        <g fill="#F2C46B" opacity={lit}>
          {windows.map(([x, y], i) => (
            <path key={i} d={archD(x, y + 12, 7, 6, 5) + 'Z'} />
          ))}
        </g>
      </g>
      <path d={archD(20, 300, 280, 170, 110)} fill="none" stroke="var(--lapis)" strokeWidth="1.5" />
      <path d={archD(8, 312, 304, 176, 122)} fill="none" stroke="var(--lapis)" strokeWidth="1" opacity=".5" />
    </svg>
  );
}
