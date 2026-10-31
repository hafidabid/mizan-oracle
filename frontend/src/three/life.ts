import * as THREE from 'three';
import { mergeGeometries } from 'three/examples/jsm/utils/BufferGeometryUtils.js';
import { glowTexture, prng, roadX } from './shapes';

/** What the ambient pieces need to know about the moment: time of day and the light. */
export interface Env {
  time: number;
  dt: number;
  /** 0 by day, 1 at full night. */
  night: number;
  /** 0..1, strongest near sunset. */
  golden: number;
  sunCol: THREE.Color;
  camera: THREE.Camera;
}

type Update = (e: Env) => void;
type Mat = (hex: string) => THREE.Material;

/* ---------- clouds: soft cut-paper puffs that drift and take the colour of the hour ---------- */
function cloudTexture(seed: number) {
  const c = document.createElement('canvas');
  c.width = 256;
  c.height = 128;
  const g = c.getContext('2d')!;
  const r = prng(seed);
  for (let i = 0; i < 14; i++) {
    const x = 40 + r() * 176;
    const y = 58 + (r() - 0.5) * 30 - Math.sin(((x - 40) / 176) * Math.PI) * 18;
    const rad = 18 + r() * 30;
    const gr = g.createRadialGradient(x, y, 0, x, y, rad);
    gr.addColorStop(0, 'rgba(255,255,255,.75)');
    gr.addColorStop(0.55, 'rgba(255,255,255,.35)');
    gr.addColorStop(1, 'rgba(255,255,255,0)');
    g.fillStyle = gr;
    g.fillRect(0, 0, 256, 128);
  }
  return new THREE.CanvasTexture(c);
}

export function clouds(scene: THREE.Scene): { update: Update; dispose: () => void } {
  const tex = [cloudTexture(5), cloudTexture(9), cloudTexture(17)];
  const r = prng(61);
  const list = Array.from({ length: 20 }, (_, i) => {
    const m = new THREE.SpriteMaterial({ map: tex[i % 3], transparent: true, depthWrite: false, fog: false, opacity: 0.9 });
    const s = new THREE.Sprite(m);
    const w = 160 + r() * 200;
    s.scale.set(w, w * 0.42, 1);
    s.position.set(-700 + r() * 1400, 55 + r() * 95, -380 - r() * 300);
    s.renderOrder = -0.5;
    scene.add(s);
    return { s, m, speed: 2 + r() * 3 };
  });
  const day = new THREE.Color('#FFFDF8');
  const nightC = new THREE.Color('#33405E');
  const tint = new THREE.Color();
  return {
    update(e) {
      tint.copy(day).lerp(e.sunCol, 0.25 + e.golden * 0.55).lerp(nightC, e.night);
      for (const c of list) {
        c.s.position.x += c.speed * e.dt;
        if (c.s.position.x > 760) c.s.position.x = -760;
        c.m.color.copy(tint);
        c.m.opacity = 0.92 - e.night * 0.4;
      }
    },
    dispose: () => tex.forEach((t) => t.dispose()),
  };
}

/* ---------- dust in the light by day, fireflies by night ---------- */
export function dust(scene: THREE.Scene): Update {
  const n = 900;
  const r = prng(88);
  const pos = new Float32Array(n * 3);
  const seed = new Float32Array(n);
  for (let i = 0; i < n; i++) {
    const z = 40 - r() * 300;
    pos[i * 3] = roadX(z) + (r() - 0.5) * 40;
    pos[i * 3 + 1] = 0.4 + Math.pow(r(), 1.6) * 11;
    pos[i * 3 + 2] = z;
    seed[i] = r() * 100;
  }
  const g = new THREE.BufferGeometry();
  g.setAttribute('position', new THREE.BufferAttribute(pos, 3));
  g.setAttribute('seed', new THREE.BufferAttribute(seed, 1));
  const u = { time: { value: 0 }, color: { value: new THREE.Color() }, opacity: { value: 0.5 }, px: { value: Math.min(window.devicePixelRatio || 1, 1.75) } };
  const m = new THREE.ShaderMaterial({
    uniforms: u,
    transparent: true,
    depthWrite: false,
    blending: THREE.AdditiveBlending,
    vertexShader: `uniform float time;uniform float px;attribute float seed;varying float vA;
      void main(){vec3 p=position;
        p.x+=sin(time*.21+seed)*1.4+sin(time*.07+seed*3.)*2.;
        p.y+=sin(time*.33+seed*1.7)*.7;
        p.z+=cos(time*.17+seed*2.3)*1.2;
        vec4 mv=modelViewMatrix*vec4(p,1.);
        float d=-mv.z;
        vA=smoothstep(140.,30.,d)*smoothstep(1.,4.,d)*(.55+.45*sin(time*1.3+seed*5.));
        gl_PointSize=px*clamp(26./d,1.,9.);
        gl_Position=projectionMatrix*mv;}`,
    fragmentShader: `uniform vec3 color;uniform float opacity;varying float vA;
      void main(){float d=length(gl_PointCoord-.5);float a=smoothstep(.5,.0,d);gl_FragColor=vec4(color*a*vA*opacity,1.);}`,
  });
  scene.add(new THREE.Points(g, m));
  const dayC = new THREE.Color('#FFE7C0');
  const fly = new THREE.Color('#FFD46A');
  return (e) => {
    u.time.value = e.time;
    u.color.value.copy(dayC).lerp(e.sunCol, e.golden * 0.6).lerp(fly, e.night);
    u.opacity.value = 0.28 + e.golden * 0.45 + e.night * 0.55;
  };
}

/* ---------- a small flock wheeling over the valley ---------- */
export function birds(scene: THREE.Scene): Update {
  const r = prng(23);
  const mat = new THREE.MeshBasicMaterial({ color: '#3B3431', side: THREE.DoubleSide, transparent: true });
  const flock = Array.from({ length: 11 }, () => {
    const g = new THREE.BufferGeometry();
    g.setAttribute('position', new THREE.BufferAttribute(new Float32Array(12 * 3), 3));
    const m = new THREE.Mesh(g, mat);
    m.frustumCulled = false;
    scene.add(m);
    return { m, g, off: new THREE.Vector3((r() - 0.5) * 22, (r() - 0.5) * 8, (r() - 0.5) * 22), ph: r() * 6.28, sp: 6 + r() * 3, size: 0.8 + r() * 0.5 };
  });
  const center = new THREE.Vector3(roadX(-130), 30, -130);
  return (e) => {
    mat.opacity = 1 - e.night;
    const a = e.time * 0.07;
    for (const b of flock) {
      const ang = a + b.off.x * 0.004;
      const x = center.x + Math.cos(ang) * 70 + b.off.x;
      const z = center.z + Math.sin(ang) * 45 + b.off.z;
      const y = center.y + b.off.y + Math.sin(e.time * 0.4 + b.ph) * 2;
      b.m.position.set(x, y, z);
      b.m.rotation.y = -ang;
      const f = Math.sin(e.time * b.sp + b.ph);
      const tip = f * 0.9 * b.size;
      const mid = f * 0.35 * b.size;
      const s = b.size;
      // two wings, each a body triangle plus a tip triangle, flapping about the spine (the z axis)
      const p = b.g.attributes.position as THREE.BufferAttribute;
      const v = [
        [0, 0, 0.6 * s], [0, 0, -0.5 * s], [-1.1 * s, mid, 0],
        [-1.1 * s, mid, 0], [0, 0, -0.5 * s], [-2.2 * s, tip, -0.45 * s],
        [0, 0, 0.6 * s], [0, 0, -0.5 * s], [1.1 * s, mid, 0],
        [1.1 * s, mid, 0], [0, 0, -0.5 * s], [2.2 * s, tip, -0.45 * s],
      ];
      v.forEach((q, i) => p.setXYZ(i, q[0], q[1], q[2]));
      p.needsUpdate = true;
    }
  };
}

/* ---------- date palms along the road, swaying in a light wind ---------- */
function frond(len: number, droop: number, width: number): THREE.BufferGeometry {
  const N = 10;
  const pos: number[] = [];
  const idx: number[] = [];
  for (let i = 0; i <= N; i++) {
    const t = i / N;
    const x = t * len;
    const y = Math.sin(t * Math.PI * 0.55) * len * 0.22 - droop * t * t * len;
    const w = width * Math.sin(Math.PI * Math.min(1, t * 1.15)) * (1 - t * 0.35);
    pos.push(x, y + w * 0.25, 0, x, y - w * 0.1, -w, x, y - w * 0.1, w);
    if (i > 0) {
      const a = (i - 1) * 3;
      const b = i * 3;
      idx.push(a, b, a + 1, b, b + 1, a + 1, a, a + 2, b, b, a + 2, b + 2);
    }
  }
  const g = new THREE.BufferGeometry();
  g.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3));
  g.setIndex(idx);
  const ng = g.toNonIndexed();
  ng.computeVertexNormals();
  return ng;
}

export function palms(scene: THREE.Scene, mat: Mat): Update {
  const r = prng(31);
  const trunkMat = mat('#8C735A');
  const leafMat = new THREE.MeshLambertMaterial({ color: '#6F7B4C', side: THREE.DoubleSide });
  const spots: Array<[number, number]> = [
    [-8.5, 8], [-8.5, -20], [-8.5, -48], [-8.8, -66], [-8.6, -96], [-8.5, -138], [-8.8, -168], [-9, -232], [-9.5, -282],
    [8.6, -26], [8.8, -66], [8.6, -92], [8.8, -128], [8.6, -170], [9, -255], [9.4, -310],
  ];
  const crowns: Array<{ g: THREE.Group; ph: number; base: THREE.Euler }> = [];
  for (const [dx, z] of spots) {
    const h = 7.5 + r() * 3.5;
    const lean = (dx < 0 ? 1 : -1) * (0.05 + r() * 0.1);
    // Trunk: stacked, slightly offset frustums give the ringed bark and a gentle curve.
    const segs: THREE.BufferGeometry[] = [];
    const SEG = 9;
    for (let i = 0; i < SEG; i++) {
      const t = i / SEG;
      const c = new THREE.CylinderGeometry(0.2 - t * 0.06, 0.26 - t * 0.06, h / SEG + 0.06, 8);
      c.translate(Math.sin(t * 1.4) * lean * h, (t + 0.5 / SEG) * h, 0);
      segs.push(c);
    }
    const trunk = new THREE.Mesh(mergeGeometries(segs), trunkMat);
    segs.forEach((s) => s.dispose());
    trunk.castShadow = trunk.receiveShadow = true;
    const g = new THREE.Group();
    g.position.set(roadX(z) + dx, 0, z);
    g.rotation.y = r() * Math.PI;
    g.add(trunk);
    const crown = new THREE.Group();
    crown.position.set(Math.sin(1.4) * lean * h, h, 0);
    const leaves: THREE.BufferGeometry[] = [];
    const n = 11;
    for (let k = 0; k < n; k++) {
      const f = frond(2.6 + r() * 1.3, 0.75 + r() * 0.35, 0.42);
      f.rotateZ(0.15 + r() * 0.35);
      f.rotateY((k / n) * Math.PI * 2 + r() * 0.3);
      leaves.push(f);
    }
    for (let k = 0; k < 4; k++) {
      const f = frond(1.6, 0.2, 0.3);
      f.rotateZ(0.9);
      f.rotateY(k * 1.6);
      leaves.push(f);
    }
    const crownMesh = new THREE.Mesh(mergeGeometries(leaves), leafMat);
    leaves.forEach((s) => s.dispose());
    crownMesh.castShadow = true;
    crown.add(crownMesh);
    g.add(crown);
    scene.add(g);
    crowns.push({ g: crown, ph: r() * 6.28, base: crown.rotation.clone() });
  }
  return (e) => {
    for (const c of crowns) {
      c.g.rotation.x = c.base.x + Math.sin(e.time * 0.9 + c.ph) * 0.035;
      c.g.rotation.z = c.base.z + Math.sin(e.time * 0.6 + c.ph * 1.3) * 0.05 + 0.02;
    }
  };
}

/* ---------- a mosque on the far horizon, closing the vista down the road ---------- */
export function mosque(scene: THREE.Scene, mat: Mat): Update {
  const g = new THREE.Group();
  const wall = mat('#E4D6BE');
  const domeM = mat('#D6BF98');
  const add = (geo: THREE.BufferGeometry, m: THREE.Material, x: number, y: number, z = 0) => {
    const o = new THREE.Mesh(geo, m);
    o.position.set(x, y, z);
    o.castShadow = o.receiveShadow = true;
    g.add(o);
    return o;
  };
  add(new THREE.BoxGeometry(64, 14, 22), wall, 0, 7);
  add(new THREE.CylinderGeometry(13, 13, 7, 40), wall, 0, 17.5);
  const dome = add(new THREE.SphereGeometry(13, 40, 20, 0, Math.PI * 2, 0, Math.PI / 2), domeM, 0, 21);
  dome.scale.y = 1.25;
  add(new THREE.CylinderGeometry(0.25, 0.4, 5, 8), domeM, 0, 38.5);
  for (const sx of [-1, 1]) {
    add(new THREE.CylinderGeometry(4.5, 4.5, 4, 24), wall, sx * 21, 16);
    const d = add(new THREE.SphereGeometry(4.5, 24, 12, 0, Math.PI * 2, 0, Math.PI / 2), domeM, sx * 21, 18);
    d.scale.y = 1.2;
    add(new THREE.CylinderGeometry(1.5, 1.9, 48, 16), wall, sx * 38, 24);
    add(new THREE.TorusGeometry(2.3, 0.35, 6, 20), domeM, sx * 38, 36).rotation.x = Math.PI / 2;
    add(new THREE.TorusGeometry(2.1, 0.3, 6, 20), domeM, sx * 38, 44).rotation.x = Math.PI / 2;
    add(new THREE.ConeGeometry(1.7, 6, 16), domeM, sx * 38, 51);
  }
  const z = -372;
  g.position.set(roadX(z), 0, z);
  scene.add(g);
  // A lamp on the finial and lit arches come on at dusk.
  const glow = new THREE.Sprite(new THREE.SpriteMaterial({ map: glowTexture('rgba(255,214,150,1)', 'rgba(255,170,90,.3)'), transparent: true, opacity: 0, depthWrite: false, blending: THREE.AdditiveBlending, fog: false }));
  glow.scale.set(14, 14, 1);
  glow.position.set(g.position.x, 41.5, z);
  scene.add(glow);
  const winMat = new THREE.MeshBasicMaterial({ color: 0xffc877, transparent: true, opacity: 0, fog: false });
  for (let i = -3; i <= 3; i++) {
    const w = new THREE.Mesh(new THREE.PlaneGeometry(3.2, 6), winMat);
    w.position.set(g.position.x + i * 7.5, 5, z + 11.05);
    scene.add(w);
  }
  return (e) => {
    const on = Math.max(0, e.night * 1.1 - 0.1);
    glow.material.opacity = on * (0.85 + Math.sin(e.time * 2.1) * 0.08);
    winMat.opacity = on * 0.9;
  };
}
