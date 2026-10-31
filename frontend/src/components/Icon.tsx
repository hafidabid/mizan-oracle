const PATHS = {
  arrow: '<path d="M5 12h14M13 6l6 6-6 6"/>',
  token: '<path d="M12 3l8 4-8 4-8-4 8-4z"/><path d="M4 12l8 4 8-4"/><path d="M4 17l8 4 8-4"/>',
  pool: '<circle cx="12" cy="12" r="8"/><path d="M8 13.5c1.3 1.6 2.6 1.6 4 0s2.7-1.6 4 0"/><path d="M12 6.5v3"/>',
  vault: '<path d="M12 3l8 4.5v9L12 21l-8-4.5v-9L12 3z"/><path d="M4 7.5l8 4.5 8-4.5M12 12v9"/>',
  check: '<path d="M5 12.5l4.5 4.5L19 7.5"/>',
  x: '<path d="M7 7l10 10M17 7L7 17"/>',
  xc: '<circle cx="12" cy="12" r="8"/><path d="M9.5 9.5l5 5M14.5 9.5l-5 5"/>',
  book: '<path d="M4 5c3-1 6-1 8 1 2-2 5-2 8-1v14c-3-1-6-1-8 1-2-2-5-2-8-1z"/><path d="M12 6v14"/>',
  chart: '<path d="M4 20h16"/><path d="M7 16v-4M12 16V8M17 16V5"/>',
  code: '<path d="M9 8l-4 4 4 4M15 8l4 4-4 4"/>',
  clock: '<circle cx="12" cy="12" r="8"/><path d="M12 8v4l3 2"/>',
  search: '<circle cx="11" cy="11" r="6"/><path d="M20 20l-4.5-4.5"/>',
  info: '<circle cx="12" cy="12" r="8"/><path d="M12 11v5M12 8h.01"/>',
  alert: '<path d="M12 4l9 16H3z"/><path d="M12 10v4M12 17h.01"/>',
  undo: '<circle cx="12" cy="12" r="8"/><path d="M6.5 17.5l11-11"/>',
  replace: '<path d="M4 9h13l-3-3M20 15H7l3 3"/>',
  chev: '<path d="M9 6l6 6-6 6"/>',
  braces: '<path d="M8 4H6a2 2 0 00-2 2v4l-2 2 2 2v4a2 2 0 002 2h2M16 4h2a2 2 0 012 2v4l2 2-2 2v4a2 2 0 01-2 2h-2"/>',
  shield: '<path d="M12 3l7 3v6c0 4.5-3 7.5-7 9-4-1.5-7-4.5-7-9V6z"/><path d="M9 12l2 2 4-4"/>',
} as const;

export type IconName = keyof typeof PATHS;

/** Line icons drawn on a 24px grid. The markup is static and authored here. */
export function Icon({ name, className = 'ic' }: { name: IconName; className?: string }) {
  return (
    <svg
      className={className}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={1.7}
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
      dangerouslySetInnerHTML={{ __html: PATHS[name] }}
    />
  );
}

/** An eight-point star (two squares at 45°), the grid every Mizan mark is built on. */
export const STAR_8 = (cx: number, cy: number, r: number) => {
  const pts: string[] = [];
  for (let i = 0; i < 16; i++) {
    const a = (i * Math.PI) / 8 - Math.PI / 2;
    const rr = i % 2 ? r * 0.7654 : r; // inner radius of a {8/2} star made from two squares
    pts.push(`${(cx + Math.cos(a) * rr).toFixed(2)},${(cy + Math.sin(a) * rr).toFixed(2)}`);
  }
  return pts.join(' ');
};

/** The Mizan mark: a balance drawn inside an eight-point star. */
export function MizanMark({ inverted = false }: { inverted?: boolean }) {
  const fg = inverted ? '#F3EBDD' : '#14202A';
  return (
    <svg viewBox="0 0 40 40" aria-hidden="true" className="mark">
      <polygon points={STAR_8(20, 20, 19)} fill="none" stroke={fg} strokeWidth="1.4" strokeLinejoin="round" />
      <g fill="none" stroke={fg} strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round">
        <path d="M20 11v17M15.5 28h9M12 15h16" />
        <path d="M12 15l-3 6h6zM28 15l-3 6h6z" />
      </g>
      <circle cx="20" cy="11" r="1.4" fill="#B8893F" />
    </svg>
  );
}

/** A small eight-point star used as a divider and list marker. */
export function Star({ size = 10 }: { size?: number }) {
  return (
    <svg viewBox="0 0 20 20" width={size} height={size} aria-hidden="true" className="star">
      <polygon points={STAR_8(10, 10, 9.5)} fill="currentColor" />
    </svg>
  );
}
