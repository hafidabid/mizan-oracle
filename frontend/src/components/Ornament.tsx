import { useEffect, useRef, type CSSProperties } from 'react';
import { STAR_8 } from './Icon';

/**
 * A girih rosette built on the same eight-point star as the mark and the seal: two stars offset by
 * 22.5° make the sixteen-point outer band, with an inner star, spokes and rings.
 * Purely decorative, so it is hidden from assistive technology.
 */
export function Rosette({ size, className = '', style }: { size: number; className?: string; style?: CSSProperties }) {
  const c = 100;
  const spokes = Array.from({ length: 16 }, (_, i) => {
    const a = (i * Math.PI) / 8;
    return `M${(c + Math.cos(a) * 34).toFixed(1)} ${(c + Math.sin(a) * 34).toFixed(1)}L${(c + Math.cos(a) * 88).toFixed(1)} ${(c + Math.sin(a) * 88).toFixed(1)}`;
  }).join('');
  return (
    <svg className={`rosette ${className}`} style={{ width: size, height: size, ...style }} viewBox="0 0 200 200" aria-hidden="true">
      <g fill="none" stroke="currentColor" strokeLinejoin="round">
        <circle cx={c} cy={c} r="97" strokeWidth=".8" />
        <circle cx={c} cy={c} r="91" strokeWidth=".5" />
        <polygon points={STAR_8(c, c, 90)} strokeWidth="1" />
        <polygon points={STAR_8(c, c, 90)} strokeWidth="1" transform={`rotate(22.5 ${c} ${c})`} />
        <path d={spokes} strokeWidth=".5" />
        <polygon points={STAR_8(c, c, 58)} strokeWidth="1" />
        <polygon points={STAR_8(c, c, 58)} strokeWidth=".6" transform={`rotate(22.5 ${c} ${c})`} />
        <circle cx={c} cy={c} r="34" strokeWidth=".8" />
        <polygon points={STAR_8(c, c, 26)} strokeWidth="1" />
        <circle cx={c} cy={c} r="6" strokeWidth=".8" />
      </g>
    </svg>
  );
}

/** Soft light bubbles rising slowly through the hero, like dust lit by a low sun. Positions are fixed so every visit looks the same. */
const MOTES: Array<[left: number, size: number, dur: number, delay: number, drift: number]> = [
  [56, 14, 24, 0, 18], [62, 8, 28, 4, -14], [70, 22, 32, 9, 22], [77, 10, 26, 2, -20], [83, 16, 30, 12, 16],
  [88, 7, 25, 6, -12], [93, 12, 27, 15, 14], [66, 6, 23, 18, 10], [74, 9, 29, 7, -18], [59, 18, 34, 11, 20],
  [86, 26, 38, 3, -16], [80, 7, 24, 16, 12], [8, 12, 33, 5, 14], [22, 8, 30, 13, -10], [40, 16, 36, 20, 12],
];

export function Motes() {
  return (
    <div className="motes" aria-hidden="true">
      {MOTES.map(([left, size, dur, delay, drift], i) => (
        <span
          key={i}
          className="mote"
          // Bigger bubbles read as nearer: a touch fainter, so none of them competes with the copy.
          style={{ left: `${left}%`, width: size, height: size, animationDuration: `${dur}s`, animationDelay: `-${delay}s`, '--drift': `${drift}px`, '--peak': (size > 15 ? 0.45 : 0.6).toFixed(2) } as CSSProperties}
        />
      ))}
    </div>
  );
}

/** Twinkling stars for the night band. */
const STARS: Array<[x: number, y: number, s: number, d: number]> = [
  [6, 20, 3, 0], [14, 68, 2, 1.4], [21, 30, 2.5, 2.8], [29, 82, 2, 0.6], [36, 14, 3, 3.6], [44, 58, 2, 2.1],
  [57, 24, 2.5, 4.2], [63, 76, 2, 1.1], [71, 12, 3, 2.4], [78, 46, 2, 3.1], [86, 22, 2.5, 0.3], [92, 70, 2, 1.8],
  [97, 36, 2, 4.6], [3, 88, 2, 2.6], [49, 90, 2, 3.9],
];

export function Twinkles() {
  return (
    <div className="twinkles" aria-hidden="true">
      {STARS.map(([x, y, s, d], i) => (
        <svg key={i} viewBox="0 0 20 20" className="twinkle" style={{ left: `${x}%`, top: `${y}%`, width: s * 4, height: s * 4, animationDelay: `-${d}s` }}>
          <polygon points={STAR_8(10, 10, 9.5)} fill="currentColor" />
        </svg>
      ))}
    </div>
  );
}

/**
 * A dusk sky behind the closing sections: slow colour clouds, geometric stars that bob and turn
 * (and lean a little toward the pointer), and, for the last section, lanterns rising into the
 * evening. Animations pause while the section is off screen and stop under reduced motion.
 */
type Floater = [x: number, y: number, size: number, dur: number, delay: number, depth: number, tone: 'brass' | 'lapis' | 'rose', solid?: boolean];
const FLOATERS: Floater[] = [
  [4, 12, 26, 11, 0, 1, 'brass'], [11, 46, 14, 9, 3, 2, 'rose', true], [6, 82, 20, 13, 6, 1, 'lapis'],
  [93, 8, 18, 10, 2, 2, 'lapis', true], [88, 30, 30, 14, 5, 1, 'brass'], [96, 58, 12, 8, 1, 3, 'rose', true],
  [90, 86, 22, 12, 7, 2, 'brass'], [47, 4, 10, 9, 4, 3, 'brass', true], [62, 94, 16, 11, 8, 2, 'rose'],
  [30, 97, 12, 10, 2, 3, 'lapis', true], [76, 18, 9, 8, 6, 3, 'brass', true], [20, 24, 9, 9, 1, 3, 'lapis', true],
  [3, 34, 16, 12, 4, 2, 'rose'], [97, 42, 20, 13, 9, 1, 'brass'], [8, 64, 11, 9, 2, 3, 'brass', true],
  [94, 72, 15, 11, 3, 2, 'lapis'], [55, 52, 8, 10, 5, 3, 'rose', true], [2, 94, 18, 14, 7, 1, 'brass'],
];
type Lantern = [x: number, size: number, dur: number, delay: number, sway: number];
const LANTERNS: Lantern[] = [
  // The first three hug the edges: they are the only ones kept on phones, where text spans the width.
  [4, 30, 34, 0, 5], [86, 34, 38, 6, -5], [94, 24, 46, 22, 4], [17, 22, 42, 14, -4], [72, 18, 50, 30, 3], [32, 16, 54, 38, -3],
];

function LanternSvg() {
  return (
    <svg viewBox="0 0 40 70" aria-hidden="true">
      <circle cx="20" cy="4" r="3" fill="none" stroke="#9A6E2C" strokeWidth="1.4" />
      <path d="M11 15 L20 7 L29 15 Z" fill="#B8893F" />
      <path d="M11 15 H29 L32 24 V46 L27 54 H13 L8 46 V24 Z" fill="#F7C873" stroke="#9A6E2C" strokeWidth="1.2" />
      <path d="M14 50 V30 C14 25 17 22 20 19 C23 22 26 25 26 30 V50 Z" fill="#FFF1C9" />
      <path d="M8 24 H32 M8 46 H32" stroke="#9A6E2C" strokeWidth="1" />
      <path d="M15 54 H25 L20 63 Z" fill="#B8893F" />
    </svg>
  );
}

export function DuskSky({ lanterns = false, builders = false }: { lanterns?: boolean; builders?: boolean }) {
  const ref = useRef<HTMLDivElement>(null);
  useEffect(() => {
    const sky = ref.current;
    const host = sky?.parentElement;
    if (!sky || !host) return;
    const io = new IntersectionObserver(([e]) => sky.classList.toggle('sky-on', e.isIntersecting));
    io.observe(host);
    // The stars lean a little toward a mouse pointer; touch screens skip this.
    if (!window.matchMedia('(pointer: fine)').matches) return () => io.disconnect();
    let raf = 0;
    const onMove = (e: PointerEvent) => {
      cancelAnimationFrame(raf);
      raf = requestAnimationFrame(() => {
        const r = host.getBoundingClientRect();
        sky.style.setProperty('--px', ((e.clientX - r.left) / r.width - 0.5).toFixed(3));
        sky.style.setProperty('--py', ((e.clientY - r.top) / r.height - 0.5).toFixed(3));
      });
    };
    host.addEventListener('pointermove', onMove);
    return () => {
      io.disconnect();
      cancelAnimationFrame(raf);
      host.removeEventListener('pointermove', onMove);
    };
  }, []);
  return (
    <div className={`sky${lanterns ? ' sky-evening' : ''}`} ref={ref} aria-hidden="true">
      <div className="cloud c1" />
      <div className="cloud c2" />
      <div className="cloud c3" />
      {builders && <BuildersArt />}
      {(builders ? [...FLOATERS, ...MORE_FLOATERS] : FLOATERS).map(([x, y, size, dur, delay, depth, tone, solid], i) => (
        <div key={i} className={i % 3 === 2 ? 'floater sky-extra' : 'floater'} style={{ left: `${x}%`, top: `${y}%`, '--depth': depth } as CSSProperties}>
          <svg viewBox="0 0 20 20" className={`f-${tone}`} style={{ width: size * 1.6, height: size * 1.6, animationDuration: `${dur}s`, animationDelay: `-${delay}s` }}>
            <polygon points={STAR_8(10, 10, 9)} fill={solid ? 'currentColor' : 'none'} stroke="currentColor" strokeWidth={solid ? 0 : 1.1} />
            {!solid && <circle cx="10" cy="10" r="2.2" fill="currentColor" />}
          </svg>
        </div>
      ))}
      {lanterns &&
        LANTERNS.map(([x, size, dur, delay, sway], i) => (
          <div key={`l${i}`} className={i >= 3 ? 'lantern sky-extra' : 'lantern'} style={{ left: `${x}%`, width: size, animationDuration: `${dur}s`, animationDelay: `-${delay}s` } as CSSProperties}>
            <div className="lantern-sway" style={{ '--sway': `${sway}deg`, animationDuration: `${(5 + (i % 3)).toFixed(0)}s` } as CSSProperties}>
              <span className="lantern-glow" />
              <LanternSvg />
            </div>
          </div>
        ))}
    </div>
  );
}

/** Extra stars for the long §5 section: the gutters and the column under the pinned code. */
const MORE_FLOATERS: Floater[] = [
  [2, 22, 13, 10, 2, 2, 'brass', true], [97, 18, 16, 12, 5, 1, 'rose'], [26, 58, 14, 11, 3, 2, 'lapis'],
  [44, 66, 10, 9, 6, 3, 'brass', true], [34, 76, 18, 13, 1, 1, 'rose'], [21, 88, 12, 10, 8, 2, 'brass'],
  [48, 84, 9, 8, 4, 3, 'lapis', true], [95, 50, 12, 9, 7, 3, 'brass', true], [3, 52, 20, 14, 3, 1, 'lapis'],
  [97, 96, 14, 11, 2, 2, 'rose', true], [40, 92, 15, 12, 9, 1, 'brass'], [5, 74, 10, 9, 5, 3, 'rose', true],
];
const SPARKS: Array<[x: number, y: number, d: number]> = [
  [14, 8, 0], [58, 3, 1.3], [74, 9, 2.6], [99, 34, 0.7], [1, 40, 3.4], [30, 50, 1.9], [46, 60, 4.1], [24, 70, 0.4],
  [37, 82, 2.2], [51, 90, 3.7], [99, 64, 1.1], [1, 86, 2.9], [12, 96, 0.9], [62, 98, 3.2],
];

/** An astrolabe: the instrument that reads the sky, standing in for the oracle that reads the register. */
function Astrolabe() {
  const c = 200;
  const ticks = Array.from({ length: 72 }, (_, i) => {
    const a = (i * Math.PI) / 36;
    const r0 = i % 6 === 0 ? 176 : 186;
    return `M${(c + Math.cos(a) * r0).toFixed(1)} ${(c + Math.sin(a) * r0).toFixed(1)}L${(c + Math.cos(a) * 196).toFixed(1)} ${(c + Math.sin(a) * 196).toFixed(1)}`;
  }).join('');
  const pointers = Array.from({ length: 9 }, (_, i) => {
    const a = (i * 2 * Math.PI) / 9 + 0.3;
    const r = 112 + (i % 3) * 14;
    const x = c + Math.cos(a) * r;
    const y = c + Math.sin(a) * r;
    const t = a + Math.PI / 2;
    return `M${(x - Math.cos(t) * 5).toFixed(1)} ${(y - Math.sin(t) * 5).toFixed(1)}L${(x + Math.cos(a) * 14).toFixed(1)} ${(y + Math.sin(a) * 14).toFixed(1)}L${(x + Math.cos(t) * 5).toFixed(1)} ${(y + Math.sin(t) * 5).toFixed(1)}Z`;
  }).join('');
  return (
    <svg viewBox="0 0 400 400" className="astrolabe">
      <g fill="none" stroke="currentColor" strokeLinejoin="round">
        <circle cx={c} cy={c} r="197" strokeWidth="1.4" />
        <circle cx={c} cy={c} r="176" strokeWidth=".8" />
        <path d={ticks} strokeWidth=".8" />
        {[0, 1, 2, 3, 4, 5].map((k) => (
          <circle key={k} cx={c} cy={c + 14 + k * 13} r={150 - k * 24} strokeWidth=".6" />
        ))}
        <path d={`M${c - 160} ${c}H${c + 160}M${c} ${c - 160}V${c + 160}`} strokeWidth=".6" />
        <g className="astro-rete">
          <circle cx={c} cy={c - 34} r="104" strokeWidth="1.2" />
          <polygon points={STAR_8(c, c, 132)} strokeWidth=".7" />
          <path d={pointers} fill="currentColor" stroke="none" />
          <circle cx={c} cy={c} r="62" strokeWidth=".7" strokeDasharray="3 5" />
        </g>
        <g className="astro-alidade">
          <path d={`M${c - 182} ${c - 4}H${c + 182}V${c + 4}H${c - 182}Z`} strokeWidth="1" />
          <path d={`M${c - 182} ${c}l12 -9l12 9l-12 9Z M${c + 182} ${c}l-12 -9l-12 9l12 9Z`} fill="currentColor" />
        </g>
        <circle cx={c} cy={c} r="9" strokeWidth="1.4" />
        <circle cx={c} cy={c - 205} r="10" strokeWidth="1.4" />
      </g>
    </svg>
  );
}

/** The scales, mīzān itself, swaying very gently before coming to rest. */
function Scales() {
  const pan = (x: number) => (
    <g>
      <path d={`M${x} 40 L${x - 26} 92 M${x} 40 L${x + 26} 92`} strokeWidth="1" />
      <path d={`M${x - 32} 92 Q${x} 112 ${x + 32} 92 Z`} fill="currentColor" fillOpacity=".25" strokeWidth="1.2" />
    </g>
  );
  return (
    <svg viewBox="0 0 200 190" className="scales">
      <g fill="none" stroke="currentColor" strokeLinecap="round" strokeLinejoin="round">
        <path d="M100 30 V172 M70 176 H130 M82 172 H118" strokeWidth="2" />
        <polygon points={STAR_8(100, 18, 9)} fill="currentColor" stroke="none" />
        <g className="scales-beam">
          <path d="M26 38 H174" strokeWidth="2.4" />
          {pan(30)}
          {pan(170)}
        </g>
      </g>
    </svg>
  );
}

function BuildersArt() {
  return (
    <>
      <svg viewBox="0 0 60 60" className="crescent">
        <path d="M38 6 A26 26 0 1 0 54 44 A21 21 0 1 1 38 6 Z" fill="currentColor" />
        <polygon points={STAR_8(44, 22, 5)} fill="currentColor" />
      </svg>
      <div className="art-astro">
        <Astrolabe />
      </div>
      <div className="art-scales">
        <Scales />
      </div>
      {/* Two threads in the margins: requests travel down the left one, signed answers up the right one. */}
      {(['down', 'up'] as const).map((dir) => (
        <div key={dir} className={`thread thread-${dir}`}>
          {[8, 24, 40, 56, 72, 88].map((y) => (
            <svg key={y} viewBox="0 0 20 20" className="block" style={{ top: `${y}%` }}>
              <path d="M10 1.5 L18 6 V14 L10 18.5 L2 14 V6 Z M2 6 L10 10.5 L18 6 M10 10.5 V18.5" fill="none" stroke="currentColor" strokeWidth="1.2" strokeLinejoin="round" />
            </svg>
          ))}
          {[0, 1, 2].map((k) => (
            <span key={k} className="packet" style={{ animationDelay: `-${k * 6 + (dir === 'up' ? 3 : 0)}s` }} />
          ))}
        </div>
      ))}
      {SPARKS.map(([x, y, d], i) => (
        <svg key={`s${i}`} viewBox="0 0 20 20" className="spark" style={{ left: `${x}%`, top: `${y}%`, animationDelay: `-${d}s` }}>
          <path d="M10 0 L11.6 8.4 L20 10 L11.6 11.6 L10 20 L8.4 11.6 L0 10 L8.4 8.4 Z" fill="currentColor" />
        </svg>
      ))}
    </>
  );
}
