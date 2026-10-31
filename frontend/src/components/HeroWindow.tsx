import { useEffect, useState, type RefObject } from 'react';

/** A faint eight-point-star lattice, the same tile the still hero uses (see --lattice in global.css). */
const LATTICE = `data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='64' height='64'%3E%3Cg fill='none' stroke='%231E3A5F' stroke-opacity='.075' stroke-width='1'%3E%3Cpolygon points='32.0,17.0 36.4,21.4 42.6,21.4 42.6,27.6 47.0,32.0 42.6,36.4 42.6,42.6 36.4,42.6 32.0,47.0 27.6,42.6 21.4,42.6 21.4,36.4 17.0,32.0 21.4,27.6 21.4,21.4 27.6,21.4'/%3E%3Cpolygon points='0.0,-8.0 2.3,-5.7 5.7,-5.7 5.7,-2.3 8.0,0.0 5.7,2.3 5.7,5.7 2.3,5.7 0.0,8.0 -2.3,5.7 -5.7,5.7 -5.7,2.3 -8.0,0.0 -5.7,-2.3 -5.7,-5.7 -2.3,-5.7'/%3E%3Cpolygon points='64.0,-8.0 66.3,-5.7 69.7,-5.7 69.7,-2.3 72.0,0.0 69.7,2.3 69.7,5.7 66.3,5.7 64.0,8.0 61.7,5.7 58.3,5.7 58.3,2.3 56.0,0.0 58.3,-2.3 58.3,-5.7 61.7,-5.7'/%3E%3Cpolygon points='0.0,56.0 2.3,58.3 5.7,58.3 5.7,61.7 8.0,64.0 5.7,66.3 5.7,69.7 2.3,69.7 0.0,72.0 -2.3,69.7 -5.7,69.7 -5.7,66.3 -8.0,64.0 -5.7,61.7 -5.7,58.3 -2.3,58.3'/%3E%3Cpolygon points='64.0,56.0 66.3,58.3 69.7,58.3 69.7,61.7 72.0,64.0 69.7,66.3 69.7,69.7 66.3,69.7 64.0,72.0 61.7,69.7 58.3,69.7 58.3,66.3 56.0,64.0 58.3,61.7 58.3,58.3 61.7,58.3'/%3E%3C/g%3E%3C/svg%3E`;

/** Pointed-arch path, same profile as the gates and the still emblem. */
function arch(x: number, y: number, w: number, h: number) {
  const spring = h * 0.64;
  const apex = h - spring;
  const b = y + h;
  return (
    `M${x} ${b}V${b - spring}C${x} ${b - spring - apex * 0.55} ${x + w * 0.4} ${b - spring - apex * 0.85} ${x + w / 2} ${y}` +
    `C${x + w * 0.6} ${b - spring - apex * 0.85} ${x + w} ${b - spring - apex * 0.55} ${x + w} ${b - spring}V${b}Z`
  );
}

/**
 * A sheet of paper over the hero with an arch cut out of it. The 3D scene shows only through
 * the arch, so the copy always sits on solid paper and the scene reads as a framed window.
 * The arch is traced around the element passed in (the hero's right column).
 */
export function HeroWindow({ hero, frame }: { hero: RefObject<HTMLElement | null>; frame: RefObject<HTMLElement | null> }) {
  const [box, setBox] = useState<{ W: number; H: number; x: number; y: number; w: number; h: number } | null>(null);

  useEffect(() => {
    const measure = () => {
      const a = hero.current?.getBoundingClientRect();
      const b = frame.current?.getBoundingClientRect();
      if (!a || !b || b.width < 10) return setBox(null);
      setBox({ W: a.width, H: a.height, x: b.left - a.left, y: b.top - a.top, w: b.width, h: b.height });
    };
    measure();
    const ro = new ResizeObserver(measure);
    if (hero.current) ro.observe(hero.current);
    if (frame.current) ro.observe(frame.current);
    return () => ro.disconnect();
  }, [hero, frame]);

  if (!box) return null;
  const { W, H, x, y, w, h } = box;
  const d = arch(x, y, w, h);
  const cx = x + w / 2;
  const cy = y + h * 0.7;
  return (
    <svg className="hero-window" width={W} height={H} viewBox={`0 0 ${W} ${H}`} aria-hidden="true">
      <defs>
        <clipPath id="heroSheet">
          <path d={`M0 0H${W}V${H}H0Z ${d}`} clipRule="evenodd" />
        </clipPath>
        {/* Dawn light spilling out of the window onto the paper, and a cool sky at the top edge. */}
        <radialGradient id="heroGlow" gradientUnits="userSpaceOnUse" cx={cx} cy={cy} r={Math.max(W, H) * 0.75}>
          <stop offset="0" stopColor="#F2C79C" stopOpacity=".62" />
          <stop offset=".32" stopColor="#F4D7B8" stopOpacity=".38" />
          <stop offset=".7" stopColor="#F1EDE4" stopOpacity="0" />
        </radialGradient>
        <linearGradient id="heroSky" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor="#D5DEE8" stopOpacity=".9" />
          <stop offset=".45" stopColor="#E4E6E6" stopOpacity="0" />
        </linearGradient>
        <pattern id="heroLattice" width="64" height="64" patternUnits="userSpaceOnUse">
          <image href={LATTICE} width="64" height="64" />
        </pattern>
      </defs>
      <g clipPath="url(#heroSheet)">
        <rect width={W} height={H} fill="var(--paper)" />
        <rect width={W} height={H} fill="url(#heroSky)" />
        <rect width={W} height={H} fill="url(#heroGlow)" className="glow-breathe" />
        <rect width={W} height={H} fill="url(#heroLattice)" />
      </g>
      <path d={d} fill="none" stroke="var(--lapis)" strokeWidth="1.5" />
      <path d={arch(x - 12, y - 16, w + 24, h + 16)} fill="none" stroke="var(--lapis)" strokeWidth="1" opacity=".5" />
    </svg>
  );
}
