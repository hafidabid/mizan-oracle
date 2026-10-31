import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { findByRec, getReview, type HeroProductId } from './data/reviews';
import { useReducedMotion } from './hooks/useReducedMotion';
import { useMedia } from './hooks/useMedia';
import { useScrollModel } from './hooks/useScrollModel';
import { canRun3D } from './lib/webgl';
import { World3D } from './components/World3D';
import { Nav } from './components/Nav';
import { Hero } from './components/Hero';
import { HowSection } from './components/HowSection';
import { TimeSection } from './components/TimeSection';
import { Register } from './components/Register';
import { WhoDecides } from './components/WhoDecides';
import { Builders } from './components/Builders';
import { Request } from './components/Request';
import { Footer } from './components/Footer';
import { RecordModal } from './components/RecordModal';

/** Records are addressable as #record/MZN-004, so they can be shared and Back closes them. */
const recordFromHash = () => {
  const m = /^#record\/(MZN-\d+)$/.exec(window.location.hash);
  return m ? findByRec(m[1])?.id ?? null : null;
};

export default function App() {
  const reduceMotion = useReducedMotion();
  // Phones, tablets in portrait and short screens get the still page: same content, no pinned panels.
  // Tablets in portrait get it too, so the headline comes first; laptops from 600px tall keep the 3D.
  const compact = useMedia('(max-width: 900px), (max-height: 599px)');
  const [webgl, setWebgl] = useState(canRun3D);
  const staticMode = reduceMotion || compact || !webgl;
  const [chosen, setChosen] = useState<HeroProductId>('token');
  const [record, setRecord] = useState<string | null>(recordFromHash);

  const how = useRef<HTMLElement>(null);
  const howPanel = useRef<HTMLDivElement>(null);
  const time = useRef<HTMLElement>(null);
  const register = useRef<HTMLElement>(null);
  const who = useRef<HTMLElement>(null);
  const builders = useRef<HTMLElement>(null);
  const sections = useMemo(() => ({ how, time, register, who, builders, howPanel }), []);
  const scroll = useScrollModel(sections, staticMode);

  useEffect(() => {
    const sync = () => setRecord(recordFromHash());
    window.addEventListener('popstate', sync);
    window.addEventListener('hashchange', sync);
    return () => {
      window.removeEventListener('popstate', sync);
      window.removeEventListener('hashchange', sync);
    };
  }, []);

  // Each record opened here is one history entry tagged with its depth, so Back steps out of
  // records one at a time and Close steps back over all of them.
  const openRecord = useCallback((id: string) => {
    const depth = ((history.state as { mizanDepth?: number } | null)?.mizanDepth ?? 0) + 1;
    history.pushState({ mizanDepth: depth }, '', `#record/${getReview(id).rec}`);
    setRecord(id);
  }, []);
  const closeRecord = useCallback(() => {
    const depth = (history.state as { mizanDepth?: number } | null)?.mizanDepth ?? 0;
    if (depth > 0) return history.go(-depth);
    // Opened from a shared link: drop the hash without jumping the page.
    history.replaceState(null, '', window.location.pathname + window.location.search);
    setRecord(null);
  }, []);
  const onFail = useCallback(() => setWebgl(false), []);

  return (
    <div className={staticMode ? 'mode-static' : 'mode-3d'}>
      {!staticMode && <World3D metrics={scroll.metrics} product={chosen} gate={scroll.step} paused={!!record} onFail={onFail} />}
      {!staticMode && <div className="dim-veil" aria-hidden="true" />}
      <div className="page" inert={record ? true : undefined}>
        <a className="skip" href="#register">
          Skip to the register
        </a>
        <Nav active={scroll.active} />

        <main id="top">
          <Hero chosen={chosen} onChoose={setChosen} onOpen={openRecord} staticMode={staticMode} />
          <Register sectionRef={register} onOpen={openRecord} />
          <HowSection sectionRef={how} panelRef={howPanel} step={scroll.step} onJump={scroll.scrollToStep} staticMode={staticMode} />
          <TimeSection sectionRef={time} day={scroll.day} onJump={scroll.scrollToDay} staticMode={staticMode} />
          <WhoDecides sectionRef={who} />
          <Builders sectionRef={builders} onOpen={openRecord} />
          <Request />
        </main>
        <Footer />
      </div>

      {record && <RecordModal key={record} id={record} showJson={false} onClose={closeRecord} onOpen={openRecord} />}
    </div>
  );
}
