import { useCallback, useEffect, useRef, useState, type RefObject } from 'react';
import { TIMELINE_DAYS, TODAY_DAY } from '../lib/dates';
import { PARTS } from '../data/reviews';

/** Page positions (in px from the top) that the 3D camera and the panels key off. */
export interface Metrics {
  vh: number;
  /** Top and bottom of the opaque register section. */
  regS: number;
  regE: number;
  howS: number;
  howE: number;
  timeS: number;
  timeE: number;
  /** Where the opaque document sections begin; past this the canvas is covered. */
  doc: number;
}

export type SectionId = 'how' | 'time' | 'register' | 'who' | 'builders' | null;

interface Sections {
  how: RefObject<HTMLElement | null>;
  time: RefObject<HTMLElement | null>;
  register: RefObject<HTMLElement | null>;
  who: RefObject<HTMLElement | null>;
  builders: RefObject<HTMLElement | null>;
  howPanel: RefObject<HTMLElement | null>;
}

const clamp = (v: number, a: number, b: number) => Math.max(a, Math.min(b, v));
/** 0 → 1 as y goes from a to b, eased at both ends. */
const ease = (y: number, a: number, b: number) => {
  const t = clamp((y - a) / (b - a), 0, 1);
  return t * t * (3 - 2 * t);
};

/** Fades a pinned panel in as it arrives and lifts it out as it leaves. */
function stagePanel(section: HTMLElement | null, inn: number, out: number) {
  const panel = section?.querySelector<HTMLElement>('.panel');
  if (!panel) return;
  const vis = inn * (1 - out);
  panel.style.setProperty('--vis', vis.toFixed(3));
  panel.style.setProperty('--shift', `${((1 - inn) * 44 - out * 44).toFixed(1)}px`);
  panel.style.pointerEvents = vis < 0.2 ? 'none' : '';
}

/**
 * Turns scroll position into story state: which part of a review the walk is at,
 * which day of the review year is shown, and which nav link is active.
 * In static mode (no 3D or reduced motion) the tracks collapse, so only the
 * active nav link follows scroll; the part and day are picked by the reader.
 */
export function useScrollModel(s: Sections, staticMode: boolean) {
  const metrics = useRef<Metrics>({ vh: 800, regS: 800, regE: 2400, howS: 2400, howE: 3800, timeS: 3800, timeE: 5000, doc: 5800 });
  const [step, setStep] = useState(0);
  const [day, setDay] = useState(TODAY_DAY);
  const [active, setActive] = useState<SectionId>(null);

  const measure = useCallback(() => {
    const top = (el: HTMLElement) => el.getBoundingClientRect().top + window.scrollY;
    const { how, time, register, who, howPanel } = s;
    if (!how.current || !time.current || !register.current || !who.current) return;
    const vh = window.innerHeight;
    const m = metrics.current;
    m.vh = vh;
    m.howS = top(how.current);
    m.howE = Math.max(m.howS + 1, m.howS + how.current.offsetHeight - vh);
    m.timeS = top(time.current);
    m.timeE = Math.max(m.timeS + 1, m.timeS + time.current.offsetHeight - vh);
    m.regS = top(register.current);
    m.regE = m.regS + register.current.offsetHeight;
    m.doc = top(who.current);
    if (howPanel.current) document.documentElement.style.setProperty('--ph', `${howPanel.current.offsetHeight}px`);
  }, [s]);

  const update = useCallback(() => {
    const y = window.scrollY;
    const m = metrics.current;
    if (!staticMode) {
      const pHow = clamp((y - m.howS) / (m.howE - m.howS), 0, 1);
      const pTime = clamp((y - m.timeS) / (m.timeE - m.timeS), 0, 1);
      if (y >= m.howS - m.vh * 0.5 && y <= m.howE + m.vh * 0.5) // A step begins as the camera starts through the previous arch, so the arch the panel
        // describes is always the lapis, numbered one in front of the camera.
        setStep(Math.min(PARTS.length - 1, Math.floor(pHow * PARTS.length + 0.3)));
      if (y >= m.timeS - m.vh && y <= m.timeE + m.vh) setDay(Math.round(pTime * TIMELINE_DAYS));

      // Dimming, as on a product page: the scene darkens around the panel while §2 and §3 are on
      // stage, dips darker between them so one panel can hand over to the next, and lifts again
      // as §4 rises. The veil sits over the canvas only; the paper sections cover it.
      const vh = m.vh;
      const gap = m.howE + vh * 0.5;
      const settle = ease(y, m.howS - vh * 0.8, m.howS - vh * 0.1);
      const dip = 1 - ease(Math.abs(y - gap), 0, vh * 0.5);
      const leave = ease(y, m.timeE + vh * 0.1, m.timeE + vh * 0.85);
      document.documentElement.style.setProperty('--dim', ((settle * 0.16 + dip * 0.4) * (1 - leave)).toFixed(3));
      stagePanel(s.how.current, ease(y, m.howS - vh * 0.85, m.howS - vh * 0.3), ease(y, m.howE + vh * 0.05, m.howE + vh * 0.45));
      stagePanel(s.time.current, ease(y, m.timeS - vh * 0.5, m.timeS - vh * 0.1), ease(y, m.timeE + vh * 0.15, m.timeE + vh * 0.6));
    }
    const mid = y + m.vh * 0.35;
    const at = (el: RefObject<HTMLElement | null>) => {
      if (!el.current) return false;
      const t = el.current.getBoundingClientRect().top + window.scrollY;
      return mid >= t && mid < t + el.current.offsetHeight;
    };
    let on: SectionId = null;
    if (at(s.register)) on = 'register';
    else if (at(s.how)) on = 'how';
    else if (at(s.time)) on = 'time';
    else if (at(s.who)) on = 'who';
    else if (at(s.builders)) on = 'builders';
    setActive(on);
  }, [s, staticMode]);

  useEffect(() => {
    measure();
    update();
    const onResize = () => {
      measure();
      update();
    };
    window.addEventListener('scroll', update, { passive: true });
    window.addEventListener('resize', onResize);
    document.fonts?.ready.then(onResize).catch(() => undefined);
    const ro = new ResizeObserver(onResize);
    ro.observe(document.body);
    return () => {
      window.removeEventListener('scroll', update);
      window.removeEventListener('resize', onResize);
      ro.disconnect();
    };
  }, [measure, update]);

  const scrollToStep = useCallback(
    (k: number) => {
      if (staticMode) return setStep(k);
      const m = metrics.current;
      window.scrollTo({ top: m.howS + ((k + 0.5) / PARTS.length) * (m.howE - m.howS), behavior: 'smooth' });
    },
    [staticMode],
  );
  const scrollToDay = useCallback(
    (d: number) => {
      if (staticMode) return setDay(d);
      const m = metrics.current;
      window.scrollTo({ top: m.timeS + (d / TIMELINE_DAYS) * (m.timeE - m.timeS), behavior: 'smooth' });
    },
    [staticMode],
  );

  return { metrics, step, day, active, scrollToStep, scrollToDay, setDay };
}
