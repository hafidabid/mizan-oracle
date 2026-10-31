import * as THREE from 'three';

/** Small seeded random generator so the valley looks the same on every load. */
export function prng(seed: number): () => number {
  let s = seed;
  return () => {
    s = (s * 16807) % 2147483647;
    return (s - 1) / 2147483646;
  };
}

/** The road winds gently left and right as it runs into the distance (-z). */
export const roadX = (z: number) => 4 * Math.sin(z * 0.018) + 2 * Math.sin(z * 0.041 + 1);

/** A paper hill silhouette (y is up). */
export function hillShape(x0: number, x1: number, base: number, amp: number, n: number, seed: number, phase: number): THREE.Shape {
  const r = prng(seed);
  const s = new THREE.Shape();
  s.moveTo(x0, -2);
  const pts: THREE.Vector2[] = [];
  for (let i = 0; i <= n; i++) {
    const x = x0 + ((x1 - x0) * i) / n;
    pts.push(new THREE.Vector2(x, base + amp * (0.5 + 0.5 * Math.sin(i * 1.3 + phase)) * (0.55 + 0.45 * r())));
  }
  s.lineTo(pts[0].x, pts[0].y);
  s.splineThru(pts.slice(1));
  s.lineTo(x1, -2);
  s.closePath();
  return s;
}

/** Draws a pointed (Islamic) arch. Solid outlines and holes wind in opposite directions. */
function archPath<P extends THREE.Path>(p: P, x: number, y: number, w: number, spring: number, apex: number, hole: boolean): P {
  if (!hole) {
    p.moveTo(x, y);
    p.lineTo(x + w, y);
    p.lineTo(x + w, y + spring);
    p.bezierCurveTo(x + w, y + spring + apex * 0.55, x + w * 0.6, y + spring + apex * 0.85, x + w / 2, y + spring + apex);
    p.bezierCurveTo(x + w * 0.4, y + spring + apex * 0.85, x, y + spring + apex * 0.55, x, y + spring);
    p.lineTo(x, y);
  } else {
    p.moveTo(x, y);
    p.lineTo(x, y + spring);
    p.bezierCurveTo(x, y + spring + apex * 0.55, x + w * 0.4, y + spring + apex * 0.85, x + w / 2, y + spring + apex);
    p.bezierCurveTo(x + w * 0.6, y + spring + apex * 0.85, x + w, y + spring + apex * 0.55, x + w, y + spring);
    p.lineTo(x + w, y);
    p.lineTo(x, y);
  }
  return p;
}

type ArchArgs = [x: number, y: number, w: number, spring: number, apex: number];
export const archHole = (...a: ArchArgs) => archPath(new THREE.Path(), ...a, true);
export const archSolid = (...a: ArchArgs) => archPath(new THREE.Shape(), ...a, false);

/** A gate: a pointed arch with a pointed-arch opening cut through it. */
export function gateShape(w: number, h: number): THREE.Shape {
  const s = archPath(new THREE.Shape(), -w / 2, 0, w, h * 0.55, h * 0.45, false);
  s.holes.push(archHole(-w * 0.32, 0, w * 0.64, h * 0.48, h * 0.36));
  return s;
}

/** Eight-point star outline (two squares at 45°), as a path. */
export function starPath<P extends THREE.Path>(p: P, cx: number, cy: number, r: number): P {
  for (let i = 0; i < 16; i++) {
    const a = (i * Math.PI) / 8 - Math.PI / 2;
    const rr = i % 2 ? r * 0.7654 : r;
    const x = cx + Math.cos(a) * rr;
    const y = cy + Math.sin(a) * rr;
    if (i === 0) p.moveTo(x, y);
    else p.lineTo(x, y);
  }
  p.closePath();
  return p;
}

/** A pointed-arch screen (jali) cut with a grid of eight-point stars. */
export function latticeShape(w: number, h: number, cell: number): THREE.Shape {
  const spring = h * 0.68;
  const s = archSolid(-w / 2, 0, w, spring, h - spring);
  const cols = Math.floor((w - cell * 0.6) / cell);
  const rows = Math.floor((spring - cell * 0.6) / cell);
  const x0 = -((cols - 1) * cell) / 2;
  for (let i = 0; i < cols; i++) for (let j = 0; j < rows; j++) s.holes.push(starPath(new THREE.Path(), x0 + i * cell, cell * 0.8 + j * cell, cell * 0.36));
  return s;
}

/**
 * A town skyline traced as one paper outline from left to right: halls with raised
 * clerestories and plain blocks with a stepped parapet, sitting on a continuous wall. Windows are holes,
 * and each window also returns a matching shape so it can glow at night.
 */
export function skyline(x0: number, x1: number, wall: number, seed: number, sc: number) {
  const r = prng(seed);
  const s = new THREE.Shape();
  const lights: THREE.Shape[] = [];
  const win = (a: ArchArgs) => {
    s.holes.push(archHole(...a));
    lights.push(archSolid(...a));
  };
  s.moveTo(x0, -2);
  s.lineTo(x0, wall);
  let x = x0 + 1;
  while (x < x1 - 8 * sc) {
    const t = r();
    if (t < 0.58) {
      const w = (6.5 + r() * 5) * sc;
      const h = wall + (3.5 + r() * 4) * sc;
      if (x + w > x1) break;
      const cx = x + w / 2;
      const dr = w * 0.3;
      const y = h + h * 0.12;
      const rr = dr * 1.05;
      s.lineTo(x, wall);
      s.lineTo(x, h);
      s.lineTo(cx - dr, h);
      s.lineTo(cx - dr, y);
      // A raised clerestory block with a stepped parapet, in place of a dome.
      s.lineTo(cx - dr, y + rr * 0.9);
      s.lineTo(cx - dr * 0.7, y + rr * 0.9);
      s.lineTo(cx - dr * 0.7, y + rr * 1.15);
      s.lineTo(cx + dr * 0.7, y + rr * 1.15);
      s.lineTo(cx + dr * 0.7, y + rr * 0.9);
      s.lineTo(cx + dr, y + rr * 0.9);
      s.lineTo(cx + dr, h);
      s.lineTo(x + w, h);
      s.lineTo(x + w, wall);
      const n = Math.max(2, Math.floor(w / (2.2 * sc)));
      const aw = w / (n * 2.2);
      for (let i = 0; i < n; i++) {
        const ax = x + (w - n * aw * 2.2) / 2 + aw * 0.6 + i * aw * 2.2;
        win([ax, wall + (h - wall) * 0.18, aw, (h - wall) * 0.3, (h - wall) * 0.18]);
      }
      x += w + (0.6 + r() * 1.6) * sc;
    } else {
      const w = (3.5 + r() * 4) * sc;
      const h = wall + (2 + r() * 5) * sc;
      if (x + w > x1) break;
      s.lineTo(x, wall);
      s.lineTo(x, h);
      // A plain parapet: one step up, no crenellation.
      s.lineTo(x + w * 0.15, h);
      s.lineTo(x + w * 0.15, h + 0.35 * sc);
      s.lineTo(x + w * 0.85, h + 0.35 * sc);
      s.lineTo(x + w * 0.85, h);
      s.lineTo(x + w, wall);
      const aw = Math.min(1.3 * sc, w * 0.25);
      win([x + w / 2 - aw / 2, wall + (h - wall) * 0.2, aw, (h - wall) * 0.35, (h - wall) * 0.15]);
      x += w + (0.6 + r() * 1.6) * sc;
    }
  }
  s.lineTo(x1, wall);
  s.lineTo(x1, -2);
  s.lineTo(x0, -2);
  return { shape: s, lights };
}

/** A canvas of off-white paper fibres, tiled across every paper surface. */
export function paperTexture(): THREE.CanvasTexture {
  const c = document.createElement('canvas');
  c.width = c.height = 256;
  const g = c.getContext('2d')!;
  const id = g.createImageData(256, 256);
  const r = prng(9);
  for (let i = 0; i < id.data.length; i += 4) {
    const v = 236 + r() * 19;
    id.data[i] = id.data[i + 1] = id.data[i + 2] = v;
    id.data[i + 3] = 255;
  }
  g.putImageData(id, 0, 0);
  g.globalAlpha = 0.12;
  g.strokeStyle = '#7a6a58';
  for (let i = 0; i < 180; i++) {
    g.beginPath();
    const x = r() * 256;
    const y = r() * 256;
    const a = r() * 6.28;
    const l = 6 + r() * 20;
    g.moveTo(x, y);
    g.lineTo(x + Math.cos(a) * l, y + Math.sin(a) * l);
    g.lineWidth = 0.4 + r() * 0.8;
    g.stroke();
  }
  const t = new THREE.CanvasTexture(c);
  t.wrapS = t.wrapT = THREE.RepeatWrapping;
  t.repeat.set(0.11, 0.11);
  return t;
}

/** A soft round glow, used for the moon and the lamp halos. */
export function glowTexture(inner: string, outer: string): THREE.CanvasTexture {
  const c = document.createElement('canvas');
  c.width = c.height = 128;
  const g = c.getContext('2d')!;
  const gr = g.createRadialGradient(64, 64, 0, 64, 64, 64);
  gr.addColorStop(0, inner);
  gr.addColorStop(0.25, inner);
  gr.addColorStop(0.3, outer);
  gr.addColorStop(1, 'rgba(0,0,0,0)');
  g.fillStyle = gr;
  g.fillRect(0, 0, 128, 128);
  return new THREE.CanvasTexture(c);
}

/** A round paper medallion with a gate number. */
export function numberSprite(n: number): THREE.Sprite {
  const c = document.createElement('canvas');
  c.width = c.height = 128;
  const x = c.getContext('2d')!;
  // An eight-point star medallion, matching the seal.
  x.beginPath();
  for (let i = 0; i < 16; i++) {
    const a = (i * Math.PI) / 8 - Math.PI / 2;
    const rr = i % 2 ? 58 * 0.7654 : 58;
    x.lineTo(64 + Math.cos(a) * rr, 64 + Math.sin(a) * rr);
  }
  x.closePath();
  x.fillStyle = '#FBF7EF';
  x.fill();
  x.strokeStyle = '#B8893F';
  x.lineWidth = 4;
  x.stroke();
  x.fillStyle = '#1E3A5F';
  x.font = '600 52px "IBM Plex Sans", system-ui, sans-serif';
  x.textAlign = 'center';
  x.textBaseline = 'middle';
  x.fillText(String(n), 64, 68);
  const s = new THREE.Sprite(new THREE.SpriteMaterial({ map: new THREE.CanvasTexture(c), transparent: true }));
  s.scale.set(2.2, 2.2, 1);
  return s;
}
