import { useEffect, useRef } from 'react';
import type { SectionId } from '../hooks/useScrollModel';
import { MizanMark } from './Icon';

export const SECTIONS: Array<{ id: Exclude<SectionId, null>; label: string }> = [
  { id: 'register', label: 'Register' },
  { id: 'how', label: 'How a review works' },
  { id: 'time', label: 'Status over time' },
  { id: 'who', label: 'Who decides' },
  { id: 'builders', label: 'For builders' },
];

export function Brand({ inverted = false }: { inverted?: boolean }) {
  return (
    <>
      <MizanMark inverted={inverted} />
      <b>Mizan</b>
    </>
  );
}

export function Nav({ active }: { active: SectionId }) {
  const header = useRef<HTMLElement>(null);
  const links = useRef<HTMLElement>(null);

  // The header's real height drives scroll offsets and pinned panels, since it wraps on small screens.
  useEffect(() => {
    const el = header.current;
    if (!el) return;
    const set = () => document.documentElement.style.setProperty('--nav-h', `${el.offsetHeight}px`);
    set();
    const ro = new ResizeObserver(set);
    ro.observe(el);
    return () => ro.disconnect();
  }, []);

  // Reading progress along the bottom edge, and a soft shadow once the page has moved.
  useEffect(() => {
    const el = header.current;
    if (!el) return;
    let raf = 0;
    const set = () => {
      raf = 0;
      const max = document.documentElement.scrollHeight - window.innerHeight;
      el.style.setProperty('--progress', max > 0 ? (window.scrollY / max).toFixed(4) : '0');
      el.classList.toggle('nav-scrolled', window.scrollY > 8);
    };
    const onScroll = () => {
      if (!raf) raf = requestAnimationFrame(set);
    };
    set();
    window.addEventListener('scroll', onScroll, { passive: true });
    window.addEventListener('resize', onScroll);
    return () => {
      cancelAnimationFrame(raf);
      window.removeEventListener('scroll', onScroll);
      window.removeEventListener('resize', onScroll);
    };
  }, []);

  // A brass marker slides under the current section's link.
  useEffect(() => {
    const row = links.current;
    if (!row) return;
    const place = () => {
      const a = row.querySelector<HTMLElement>('[aria-current="true"]');
      row.style.setProperty('--ink-x', a ? `${a.offsetLeft}px` : '0px');
      row.style.setProperty('--ink-w', a ? `${a.offsetWidth}px` : '0px');
      row.classList.toggle('has-ink', !!a);
    };
    place();
    const ro = new ResizeObserver(place);
    ro.observe(row);
    return () => ro.disconnect();
  }, [active]);

  // In the scrolling link row on small screens, keep the current section's link in view.
  useEffect(() => {
    const row = links.current;
    const a = row?.querySelector<HTMLElement>('[aria-current="true"]');
    if (!row || !a || row.scrollWidth <= row.clientWidth) return;
    row.scrollTo({ left: a.offsetLeft - 16, behavior: 'smooth' });
  }, [active]);

  return (
    <header className="nav" ref={header}>
      <div className="nav-sky" aria-hidden="true" />
      <div className="wrap nav-bar">
        <a className="brand" href="#top" aria-label="Mizan, back to top">
          <Brand />
        </a>
        <span className="demo-flag" title="Every record is fictional. Dates are fixed at 29 Oct 2026.">
          Demo
        </span>
        <nav className="nav-links" aria-label="Sections" ref={links}>
          {SECTIONS.map((l) => (
            <a key={l.id} href={`#${l.id}`} aria-current={active === l.id ? 'true' : undefined}>
              {l.label}
            </a>
          ))}
          <span className="nav-ink" aria-hidden="true" />
        </nav>
        <a className="btn btn-primary nav-cta" href="#register">
          Browse records
        </a>
      </div>
      <div className="nav-line" aria-hidden="true">
        <i />
      </div>
    </header>
  );
}
