import { useEffect, useRef } from 'react';
import type { HeroProductId } from '../data/reviews';
import type { Metrics } from '../hooks/useScrollModel';
import type { WorldHandle } from '../three/world';

interface Props {
  metrics: { current: Metrics };
  product: HeroProductId;
  gate: number;
  paused: boolean;
  onFail: () => void;
}

/**
 * The fixed canvas behind the story sections. three.js is loaded only after the content has
 * rendered, and the scene redraws only when something changes. Product, gate and pause state
 * reach it through refs so changing them never rebuilds the world.
 */
export function World3D({ metrics, product, gate, paused, onFail }: Props) {
  const canvas = useRef<HTMLCanvasElement>(null);
  const handle = useRef<WorldHandle | null>(null);
  const state = useRef({ product, gate, paused });
  const fail = useRef(onFail);

  useEffect(() => {
    state.current = { product, gate, paused };
    fail.current = onFail;
    handle.current?.wake();
  }, [product, gate, paused, onFail]);

  useEffect(() => {
    const el = canvas.current;
    if (!el) return;
    let cancelled = false;
    const start = () =>
      import('../three/world')
        .then(({ createWorld }) => {
          if (cancelled) return;
          handle.current = createWorld(el, { metrics, state, onLost: () => fail.current() });
          el.classList.add('ready');
          document.documentElement.classList.add('stage-ready');
        })
        .catch((err) => {
          console.error('Mizan: 3D scene could not start, showing the still page instead.', err);
          fail.current();
        });
    const idle = window.requestIdleCallback ?? ((cb: () => void) => window.setTimeout(cb, 200));
    idle(() => void start());
    return () => {
      cancelled = true;
      handle.current?.dispose();
      handle.current = null;
      document.documentElement.classList.remove('stage-ready');
    };
  }, [metrics]);

  return <canvas id="stage" ref={canvas} aria-hidden="true" />;
}
