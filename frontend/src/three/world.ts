import * as THREE from 'three';
import { RoomEnvironment } from 'three/examples/jsm/environments/RoomEnvironment.js';
import { createPost } from './post';
import { birds, clouds, dust, mosque, palms, type Env } from './life';
import type { Metrics } from '../hooks/useScrollModel';
import type { HeroProductId } from '../data/reviews';
import { PERIOD_DAYS, TIMELINE_DAYS, TODAY_DAY } from '../lib/dates';
import {
  archHole,
  gateShape,
  glowTexture,
  hillShape,
  latticeShape,
  numberSprite,
  paperTexture,
  prng,
  roadX,
  skyline,
} from './shapes';

export interface WorldInputs {
  metrics: { current: Metrics };
  state: { current: { product: HeroProductId; gate: number; paused: boolean } };
  /** Called if the GPU drops the context, so the page can fall back to the still version. */
  onLost: () => void;
}

export interface WorldHandle {
  /** Ask for a redraw after something outside the scroll position changed. */
  wake: () => void;
  dispose: () => void;
}

const clamp = (v: number, a: number, b: number) => Math.max(a, Math.min(b, v));
const ease = (t: number) => {
  const c = clamp(t, 0, 1);
  return c * c * (3 - 2 * c);
};

/* Light intensities were tuned with three's legacy lighting; modern three uses
   physical units, which equal legacy × π for these light types. */
const PI = Math.PI;

/**
 * Time-of-day palette. 0 = dawn, 0.5 = midday, 1 = sunset (the review expires),
 * 1.3+ = night. Columns: [t, sky top, sky middle, horizon, sun colour, sun strength, fill strength].
 */
const TOD: Array<[number, string, string, string, string, number, number]> = [
  [0, '#B4C8DA', '#EEEAE0', '#F0DCC0', '#FFE6C6', 1.2, 0.74],
  [0.25, '#8CB2D4', '#E4ECEE', '#F5EAD6', '#FFF3E0', 1.45, 0.78],
  [0.5, '#88AED0', '#E0E9EC', '#F4ECDF', '#FFF7EA', 1.45, 0.76],
  [0.8, '#9CB0C6', '#EBDCC4', '#EAC293', '#FFDDB0', 1.15, 0.62],
  [1.0, '#59617E', '#C9A27C', '#D9925A', '#FFA66E', 0.7, 0.46],
  [1.12, '#26324A', '#3A4560', '#6A5A60', '#A07A70', 0.15, 0.34],
  [1.3, '#101B35', '#1B2A4A', '#2C3A5E', '#6070A0', 0, 0.26],
  [1.5, '#0B142C', '#14203D', '#222D4C', '#6070A0', 0, 0.24],
];

interface Station {
  p: THREE.Vector3;
  l: THREE.Vector3;
}
type ViewShift = [number, number];

export function createWorld(canvas: HTMLCanvasElement, io: WorldInputs): WorldHandle {
  // Keep colours exactly as authored (the palette was picked in sRGB by eye).
  THREE.ColorManagement.enabled = false;

  const small = Math.min(window.innerWidth, window.innerHeight) < 700;
  const renderer = new THREE.WebGLRenderer({ canvas, antialias: !small, powerPreference: 'high-performance' });
  renderer.outputColorSpace = THREE.LinearSRGBColorSpace;
  renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, small ? 1.5 : 1.75));
  renderer.setSize(window.innerWidth, window.innerHeight, false);
  renderer.shadowMap.enabled = true;
  renderer.shadowMap.type = THREE.PCFSoftShadowMap;

  const scene = new THREE.Scene();
  const camera = new THREE.PerspectiveCamera(42, window.innerWidth / window.innerHeight, 0.5, 1400);
  const fog = new THREE.Fog(0xe9c9a2, 90, 560);
  scene.fog = fog;
  // A soft studio environment gives the brass real reflections; it dims with the daylight.
  const pmrem = new THREE.PMREMGenerator(renderer);
  const envMap = pmrem.fromScene(new RoomEnvironment(), 0.04).texture;
  scene.environment = envMap;
  const post = createPost(renderer, small);

  /* ---------- materials ---------- */
  const paper = paperTexture();
  const mats = new Map<string, THREE.MeshLambertMaterial>();
  const mat = (hex: string) => {
    let m = mats.get(hex);
    if (!m) {
      m = new THREE.MeshLambertMaterial({ color: hex, map: paper });
      mats.set(hex, m);
    }
    return m;
  };
  const EX: THREE.ExtrudeGeometryOptions = { depth: 0.32, bevelEnabled: true, bevelThickness: 0.07, bevelSize: 0.07, bevelSegments: 1, curveSegments: 10 };
  const card = (shape: THREE.Shape | THREE.Shape[], material: string | THREE.Material, opts?: THREE.ExtrudeGeometryOptions) => {
    const m = new THREE.Mesh(new THREE.ExtrudeGeometry(shape, { ...EX, ...opts }), typeof material === 'string' ? mat(material) : material);
    m.castShadow = true;
    m.receiveShadow = true;
    return m;
  };
  const place = <T extends THREE.Object3D>(o: T, x = 0, y = 0, z = 0): T => {
    o.position.set(x, y, z);
    scene.add(o);
    return o;
  };

  /* ---------- sky, stars, moon ---------- */
  const skyU = {
    top: { value: new THREE.Color() },
    mid: { value: new THREE.Color() },
    bot: { value: new THREE.Color() },
    sunDir: { value: new THREE.Vector3(0, 0.2, -1) },
    sunCol: { value: new THREE.Color() },
    sunVis: { value: 1 },
  };
  const sky = new THREE.Mesh(
    new THREE.SphereGeometry(900, 32, 16),
    new THREE.ShaderMaterial({
      side: THREE.BackSide,
      depthWrite: false,
      fog: false,
      uniforms: skyU,
      vertexShader: 'varying vec3 vD;void main(){vD=normalize(position);gl_Position=projectionMatrix*modelViewMatrix*vec4(position,1.);}',
      fragmentShader:
        'uniform vec3 top,mid,bot,sunCol,sunDir;uniform float sunVis;varying vec3 vD;void main(){float h=vD.y;vec3 c=h>.06?mix(mid,top,smoothstep(.06,.55,h)):mix(bot,mid,smoothstep(-.04,.06,h));float s=max(dot(normalize(vD),normalize(sunDir)),0.);c+=sunCol*(smoothstep(.9993,.9996,s)*1.2+pow(s,40.)*.35+pow(s,5.)*.14)*sunVis;gl_FragColor=vec4(c,1.);}',
    }),
  );
  sky.renderOrder = -1;
  scene.add(sky);

  const stars = (() => {
    const g = new THREE.BufferGeometry();
    const n = 700;
    const p = new Float32Array(n * 3);
    const r = prng(3);
    for (let i = 0; i < n; i++) {
      const a = r() * Math.PI * 2;
      const e = Math.asin(0.05 + r() * 0.95);
      p[i * 3] = Math.cos(a) * Math.cos(e) * 850;
      p[i * 3 + 1] = Math.sin(e) * 850;
      p[i * 3 + 2] = Math.sin(a) * Math.cos(e) * 850;
    }
    g.setAttribute('position', new THREE.BufferAttribute(p, 3));
    const pts = new THREE.Points(g, new THREE.PointsMaterial({ color: 0xfff6e4, size: 1.7, sizeAttenuation: false, transparent: true, opacity: 0, fog: false, depthWrite: false }));
    scene.add(pts);
    return pts;
  })();

  const moon = new THREE.Sprite(new THREE.SpriteMaterial({ map: glowTexture('rgba(250,244,224,1)', 'rgba(230,230,255,.25)'), transparent: true, opacity: 0, fog: false, depthWrite: false }));
  moon.scale.set(90, 90, 1);
  scene.add(moon);
  const MOON_DIR = new THREE.Vector3(0.55, 0.32, -1).normalize().multiplyScalar(800);

  /* ---------- lights ---------- */
  const hemi = new THREE.HemisphereLight(0xffeedd, 0xc9a88a, 0.6 * PI);
  scene.add(hemi);
  const sun = new THREE.DirectionalLight(0xffe6c8, PI);
  sun.castShadow = true;
  const sm = small ? 512 : 2048;
  sun.shadow.mapSize.set(sm, sm);
  Object.assign(sun.shadow.camera, { left: -55, right: 55, top: 55, bottom: -55, near: 1, far: 320 });
  sun.shadow.bias = -0.0008;
  sun.shadow.normalBias = 0.04;
  scene.add(sun, sun.target);
  const moonLight = new THREE.DirectionalLight(0x9db0e0, 0);
  scene.add(moonLight, moonLight.target);
  // Cool sky light from the open side, so forms keep a shaded edge against the warm sun.
  const skyFill = new THREE.DirectionalLight(0xc9d6f0, 0.22 * PI);
  scene.add(skyFill, skyFill.target);

  /* ---------- ground and road ---------- */
  const ground = new THREE.Mesh(new THREE.PlaneGeometry(900, 900), mat('#E6DAC4'));
  ground.rotation.x = -Math.PI / 2;
  ground.position.z = -200;
  ground.receiveShadow = true;
  scene.add(ground);
  const ribbon = (width: number, y: number, color: string) => {
    const pos: number[] = [];
    const idx: number[] = [];
    let i = 0;
    for (let z = 60; z >= -420; z -= 1.5) {
      const x = roadX(z);
      pos.push(x - width / 2, y, z, x + width / 2, y, z);
      if (i > 0) {
        const a = (i - 1) * 2;
        idx.push(a, a + 1, a + 2, a + 1, a + 3, a + 2);
      }
      i++;
    }
    const g = new THREE.BufferGeometry();
    g.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3));
    g.setIndex(idx);
    g.computeVertexNormals();
    const m = new THREE.Mesh(g, mat(color));
    m.receiveShadow = true;
    scene.add(m);
  };
  ribbon(8.4, 0.02, '#CDBFA6');
  ribbon(6.6, 0.05, '#F6F0E4');

  /* ---------- the valley: layered hill cards either side of the road ---------- */
  const HC = ['#D9CFBD', '#C9BCA4', '#B5A88F', '#E2D8C6', '#A89A82', '#CFC3AE', '#9B8E77'];
  const r0 = prng(41);
  for (let z = -6, i = 0; z > -330; z -= 15 + r0() * 8, i++) {
    const rx = roadX(z);
    const gap = (z > -20 ? 15 : 9) + r0() * 5;
    place(card(hillShape(-220, 0, 1.2 + r0() * 2, 3 + r0() * 7, 7, 100 + i, r0() * 6), HC[i % HC.length]), rx - gap, 0, z);
    place(card(hillShape(0, 220, 1.2 + r0() * 2, 3 + r0() * 7, 7, 200 + i, r0() * 6), HC[(i + 3) % HC.length]), rx + gap, 0, z - 5 - r0() * 6);
    if (i % 2 === 0) {
      place(card(hillShape(-240, 0, 4 + r0() * 4, 8 + r0() * 10, 8, 400 + i, r0() * 6), HC[(i + 5) % HC.length]), rx - gap - 22, 0, z - 9);
      place(card(hillShape(0, 240, 4 + r0() * 4, 8 + r0() * 10, 8, 500 + i, r0() * 6), HC[(i + 1) % HC.length]), rx + gap + 22, 0, z - 12);
    }
  }

  /* ---------- cities, with windows that glow after sunset ---------- */
  const windowGlow = new THREE.MeshBasicMaterial({ color: 0xffc877, transparent: true, opacity: 0, depthWrite: false, fog: false });
  const city = (x0: number, x1: number, wall: number, seed: number, sc: number, color: string, z: number) => {
    const c = skyline(x0, x1, wall, seed, sc);
    place(card(c.shape, color), 0, 0, z);
    place(new THREE.Mesh(new THREE.ShapeGeometry(c.lights), windowGlow), 0, 0, z - 0.06);
  };
  place(card(hillShape(-500, 500, 30, 40, 10, 7, 0.3), '#DCCDB2'), 0, 0, -470);
  city(-260, 260, 7, 13, 2.2, '#BFA586', -430);
  place(card(hillShape(-400, 400, 10, 16, 10, 8, 1.7), '#C9BCA4'), 0, 0, -400);
  city(-120, roadX(-95) - 11, 2.4, 21, 1, '#B89C7C', -95);
  city(roadX(-150) + 11, 120, 2.4, 22, 1, '#A88E70', -150);
  city(-140, roadX(-262) - 12, 2.6, 23, 1.25, '#8F7A66', -262);
  city(roadX(-290) + 12, 150, 2.6, 24, 1.25, '#7D6C5E', -290);

  // An arcade wall beside the start of the road.
  {
    const s = new THREE.Shape();
    const x0 = -46;
    const x1 = -12;
    const h = 7;
    s.moveTo(x0, -1);
    s.lineTo(x0, h);
    for (let x = x0; x < x1; x += 1.4) {
      s.lineTo(x, h + 0.6);
      s.lineTo(x + 0.7, h + 0.6);
      s.lineTo(x + 0.7, h);
    }
    s.lineTo(x1, h);
    s.lineTo(x1, -1);
    s.lineTo(x0, -1);
    for (let x = x0 + 1.4; x < x1 - 3; x += 3.6) s.holes.push(archHole(x, 0, 2.2, 3.2, 1.8));
    place(card(s, '#3B4A4E'), roadX(-12), 0, -12);
  }

  /* ---------- cut-paper lattice screens along the road ---------- */
  const rp = prng(77);
  // Kept clear of the scale (z≈-2) and the hourglass sight line (z -185 to -235).
  const screens: Array<[number, number]> = [[-12, 18], [-9, -30], [10, -55], [-11, -88], [12, -118], [-10, -128], [11, -160], [-11, -250], [12, -270], [-14, -300]];
  screens.forEach(([dx, z], i) => {
    const h = 5 + rp() * 2.5;
    const m = card(latticeShape(h * 0.55, h, 0.62), i % 2 ? '#E2D8C6' : '#CFC3AE', { depth: 0.18, bevelThickness: 0.04, bevelSize: 0.04 });
    m.position.set(roadX(z) + dx, 0, z);
    m.rotation.y = (dx < 0 ? 1 : -1) * (0.5 + rp() * 0.4);
    scene.add(m);
  });

  /* ---------- lamp posts that light up at dusk ---------- */
  const lampMat = new THREE.MeshBasicMaterial({ color: 0xffd08a, transparent: true, opacity: 0.25, fog: false });
  const postMat = mat('#5B4A42');
  const lampGlow = glowTexture('rgba(255,214,140,1)', 'rgba(255,180,100,.35)');
  const halos: THREE.Sprite[] = [];
  const lampSpots: Array<[number, number]> = [];
  // Lamps start past the scale, so none stands in front of it in the hero window.
  for (let z = -16; z > -300; z -= 22) for (const dx of [-4.6, 4.6]) lampSpots.push([roadX(z) + dx, z]);
  // Posts and bulbs are instanced: two draw calls for all of them.
  const posts = new THREE.InstancedMesh(new THREE.CylinderGeometry(0.07, 0.09, 3.2, 6), postMat, lampSpots.length);
  const bulbs = new THREE.InstancedMesh(new THREE.SphereGeometry(0.22, 10, 8), lampMat, lampSpots.length);
  posts.castShadow = true;
  const m4 = new THREE.Matrix4();
  lampSpots.forEach(([x, z], i) => {
    posts.setMatrixAt(i, m4.makeTranslation(x, 1.6, z));
    bulbs.setMatrixAt(i, m4.makeTranslation(x, 3.3, z));
  });
  scene.add(posts, bulbs);
  {
    for (const [x, z] of lampSpots) {
      const halo = place(new THREE.Sprite(new THREE.SpriteMaterial({ map: lampGlow, transparent: true, opacity: 0, depthWrite: false, blending: THREE.AdditiveBlending, fog: false })), x, 3.3, z);
      halo.scale.set(2.6, 2.6, 1);
      halos.push(halo);
    }
  }

  /* ---------- hero: brass mizan scale on a stone plinth ---------- */
  const goldMat = () => new THREE.MeshStandardMaterial({ color: 0xb8893f, metalness: 0.45, roughness: 0.5, envMapIntensity: 0.35 });
  const gold = goldMat();
  const scale = (() => {
    const g = new THREE.Group();
    const stone = mat('#F6F1E7');
    const stone2 = mat('#E7DFCF');
    const tiers: Array<[number, number, number, number, THREE.Material]> = [
      [3.6, 3.8, 0.7, 0.35, stone],
      [2.9, 3.1, 0.55, 0.98, stone2],
      [1.2, 1.55, 0.6, 1.55, stone],
    ];
    for (const [a, b, h, y, m] of tiers) {
      const c = new THREE.Mesh(new THREE.CylinderGeometry(a, b, h, 56), m);
      c.position.y = y;
      c.castShadow = c.receiveShadow = true;
      g.add(c);
    }
    const ring = new THREE.Mesh(new THREE.TorusGeometry(2.98, 0.05, 8, 72), gold);
    ring.rotation.x = Math.PI / 2;
    ring.position.y = 1.12;
    g.add(ring);
    const pillar = new THREE.Mesh(new THREE.CylinderGeometry(0.13, 0.22, 5.4, 18), gold);
    pillar.position.y = 4.55;
    pillar.castShadow = true;
    g.add(pillar);
    const knob = new THREE.Mesh(new THREE.SphereGeometry(0.3, 20, 14), gold);
    knob.position.y = 7.45;
    g.add(knob);
    const fin = new THREE.Mesh(new THREE.ConeGeometry(0.14, 0.6, 12), gold);
    fin.position.y = 7.95;
    g.add(fin);
    const pivot = new THREE.Group();
    pivot.position.y = 7.1;
    g.add(pivot);
    const beam = new THREE.Mesh(new THREE.CylinderGeometry(0.075, 0.075, 6.6, 12), gold);
    beam.rotation.z = Math.PI / 2;
    beam.castShadow = true;
    pivot.add(beam);
    const panMat = goldMat();
    panMat.side = THREE.DoubleSide;
    const hangs = [-3.3, 3.3].map((x) => {
      const h = new THREE.Group();
      h.position.x = x;
      pivot.add(h);
      h.add(new THREE.Mesh(new THREE.SphereGeometry(0.13, 12, 10), gold));
      for (let k = 0; k < 3; k++) {
        const a = (k * Math.PI * 2) / 3 + 0.3;
        const e = new THREE.Vector3(Math.cos(a) * 1.02, -2.6, Math.sin(a) * 1.02);
        const chain = new THREE.Mesh(new THREE.CylinderGeometry(0.018, 0.018, e.length(), 5), gold);
        chain.position.copy(e.clone().multiplyScalar(0.5));
        chain.quaternion.setFromUnitVectors(new THREE.Vector3(0, 1, 0), e.clone().normalize());
        h.add(chain);
      }
      const pan = new THREE.Mesh(new THREE.SphereGeometry(1.15, 36, 12, 0, Math.PI * 2, Math.PI * 0.62, Math.PI * 0.38), panMat);
      pan.position.y = -2.6 + 0.43;
      pan.castShadow = true;
      h.add(pan);
      return h;
    });
    g.position.set(roadX(-2) + 6, 0, -2);
    scene.add(g);
    return { g, pivot, hangs, tilt: 0 };
  })();
  // The beam is level only while an approval holds today. A lapsed one dips; a void or refused one tips fully.
  const PRODUCT_TILT: Record<HeroProductId, number> = { token: 0, vault: 0.07, rent: 0.17, lend: 0.17 };

  /* ---------- how it works: five gates over the road ---------- */
  const GATE_Z = [-40, -75, -110, -145, -180];
  const gates = GATE_Z.map((z, i) => {
    const m = new THREE.MeshLambertMaterial({ color: 0xdcd2c0, map: paper });
    place(card(gateShape(10, 12), m, { depth: 0.7 }), roadX(z), 0, z);
    // The number hangs inside the arch's opening, so it is in frame while the camera holds on this gate.
    const s = place(numberSprite(i + 1), roadX(z), 6.9, z + 1.2);
    return { m, s, on: 0 };
  });

  /* ---------- status over time: an hourglass on a plinth ---------- */
  const HZ = -208;
  const HX = roadX(HZ) + 7.5;
  const hourglass = (() => {
    const g = new THREE.Group();
    const plinth = new THREE.Mesh(new THREE.CylinderGeometry(3, 3.2, 0.8, 48), mat('#EADDC9'));
    plinth.position.y = 0.4;
    plinth.castShadow = plinth.receiveShadow = true;
    g.add(plinth);
    const wood = new THREE.MeshStandardMaterial({ color: 0xb8893f, metalness: 0.4, roughness: 0.55, envMapIntensity: 0.3 });
    for (const y of [0.95, 8.15]) {
      const d = new THREE.Mesh(new THREE.CylinderGeometry(2.1, 2.1, 0.32, 40), wood);
      d.position.y = y;
      d.castShadow = true;
      g.add(d);
    }
    for (let k = 0; k < 3; k++) {
      const a = (k * Math.PI * 2) / 3 + 0.5;
      const rod = new THREE.Mesh(new THREE.CylinderGeometry(0.08, 0.08, 7, 10), wood);
      rod.position.set(Math.cos(a) * 1.8, 4.55, Math.sin(a) * 1.8);
      rod.castShadow = true;
      g.add(rod);
    }
    const profile = [[0.05, 1.1], [1.35, 1.35], [1.45, 2.6], [1.0, 3.8], [0.2, 4.55], [1.0, 5.3], [1.45, 6.5], [1.35, 7.75], [0.05, 8.0]].map(([x, y]) => new THREE.Vector2(x, y));
    g.add(new THREE.Mesh(new THREE.LatheGeometry(profile, 40), new THREE.MeshBasicMaterial({ color: 0xffffff, transparent: true, opacity: 0.1, side: THREE.DoubleSide, depthWrite: false })));
    const sand = new THREE.MeshLambertMaterial({ color: 0xe9c98a, map: paper, emissive: 0x000000 });
    const topSand = new THREE.Mesh(new THREE.ConeGeometry(1.15, 1.9, 36), sand);
    topSand.rotation.x = Math.PI;
    g.add(topSand);
    const bottomSand = new THREE.Mesh(new THREE.ConeGeometry(1.3, 1.6, 36), sand);
    g.add(bottomSand);
    const stream = new THREE.Mesh(new THREE.CylinderGeometry(0.035, 0.035, 3.3, 6), sand);
    stream.position.y = 2.9;
    g.add(stream);
    g.position.set(HX, 0, HZ);
    scene.add(g);
    return { topSand, bottomSand, stream, sand };
  })();
  /** f = share of the review period used up, 0..1 */
  const setSand = (f: number) => {
    const a = Math.cbrt(Math.max(0.001, 1 - f));
    const b = Math.cbrt(Math.max(0.02, f));
    hourglass.topSand.scale.setScalar(a);
    hourglass.topSand.position.y = 4.55 + 0.95 * a;
    hourglass.bottomSand.scale.setScalar(b);
    hourglass.bottomSand.position.y = 1.11 + 0.8 * b;
    hourglass.stream.visible = f > 0.002 && f < 0.998;
  };

  /* ---------- life: clouds, dust in the light, birds, palms, and a mosque on the horizon ---------- */
  const sky2 = clouds(scene);
  const living = [sky2.update, dust(scene), birds(scene), palms(scene, mat), mosque(scene, mat)];

  /* ---------- time of day ---------- */
  const cA = new THREE.Color();
  const cB = new THREE.Color();
  const white = new THREE.Color(0xffffff);
  const groundDay = new THREE.Color(0xc9a88a);
  const groundNight = new THREE.Color(0x2a2f4a);
  const lerpHex = (a: string, b: string, t: number, out: THREE.Color) => out.copy(cA.set(a)).lerp(cB.set(b), t);
  const sunDir = new THREE.Vector3();

  function applyTimeOfDay(t: number): number {
    let i = 0;
    while (i < TOD.length - 2 && t > TOD[i + 1][0]) i++;
    const A = TOD[i];
    const B = TOD[i + 1];
    const k = clamp((t - A[0]) / (B[0] - A[0]), 0, 1);
    lerpHex(A[1], B[1], k, skyU.top.value);
    lerpHex(A[2], B[2], k, skyU.mid.value);
    lerpHex(A[3], B[3], k, skyU.bot.value);
    lerpHex(A[4], B[4], k, skyU.sunCol.value);
    fog.color.copy(skyU.bot.value).lerp(skyU.mid.value, 0.35);

    // The sun climbs from the left at dawn, peaks at midday, and sets on the right at expiry.
    const th = Math.PI * (t <= 1 ? 0.07 + 0.86 * clamp(t, 0, 1) : 0.93 + (t - 1) * 0.9);
    sunDir.set(-Math.cos(th) * 0.85, Math.sin(th) * 0.5, -1).normalize();
    skyU.sunDir.value.copy(sunDir);
    skyU.sunVis.value = clamp(1 - (t - 1.08) / 0.08, 0, 1);

    sun.color.copy(skyU.sunCol.value);
    sun.intensity = (A[5] + (B[5] - A[5]) * k) * PI;
    hemi.intensity = (A[6] + (B[6] - A[6]) * k) * PI;
    hemi.color.copy(skyU.mid.value).lerp(white, 0.4);
    hemi.groundColor.copy(groundDay).lerp(groundNight, clamp((t - 0.95) / 0.3, 0, 1));

    const night = clamp((t - 1.0) / 0.25, 0, 1);
    stars.material.opacity = clamp((t - 1.05) / 0.2, 0, 1);
    windowGlow.opacity = clamp((t - 0.95) / 0.15, 0, 1);
    lampMat.opacity = 0.25 + night * 0.75;
    for (const h of halos) h.material.opacity = night * 0.9;
    moon.material.opacity = clamp((t - 1.08) / 0.15, 0, 1);
    moonLight.intensity = night * 0.35 * PI;
    skyFill.intensity = (0.22 - night * 0.12) * PI;
    scene.environmentIntensity = 0.35 + 0.65 * (1 - night);
    return night;
  }

  /* ---------- camera path: one station per chapter of the page ---------- */
  const portrait = () => window.innerWidth / window.innerHeight < 0.85;
  const S = (px: number, py: number, pz: number, lx: number, ly: number, lz: number): Station => ({ p: new THREE.Vector3(px, py, pz), l: new THREE.Vector3(lx, ly, lz) });
  const heroStation = () => {
    const sx = scale.g.position.x;
    return portrait() ? S(sx - 1, 5, 30, sx - 0.6, 4.4, -3) : S(sx - 7, 4.6, 27, sx - 0.6, 4.6, -4);
  };
  /**
   * Each of the five steps owns one arch. The camera approaches it, holds about 14 units in front
   * of it (so the arch and its number fill the frame while the panel describes that step), then
   * passes through it as the step ends.
   */
  const HOLD = 0.6;
  const dwell = (t: number) => (t < 0.3 ? HOLD * ease(t / 0.3) : t < 0.7 ? HOLD : HOLD + (1 - HOLD) * ease((t - 0.7) / 0.3));
  const howStation = (p: number) => {
    const k = Math.min(GATE_Z.length - 1, Math.floor(p * GATE_Z.length));
    const z = GATE_Z[k] + 35 * (1 - dwell(p * GATE_Z.length - k));
    return S(roadX(z), 2.9, z, roadX(z - 30), 5.4, z - 30);
  };
  const timeStation = (p: number) =>
    portrait() ? S(HX - 7 + 2 * p, 5.4, HZ + 25 - 3 * p, HX, 3.6, HZ - 2) : S(HX - 10 + 3 * p, 4.6, HZ + 15 - 3 * p, HX + 1, 4.4, HZ - 4);
  const blend = (a: Station, b: Station, t: number): Station => {
    const e = ease(t);
    return { p: a.p.clone().lerp(b.p, e), l: a.l.clone().lerp(b.l, e) };
  };
  // Where the subject sits on screen: positive x pushes it right of the text panels.
  const VIEW: Record<string, ViewShift> = { hero: [0.22, 0.02], how: [0.2, 0], time: [0.18, 0] };
  const VIEW_PORTRAIT: Record<string, ViewShift> = { hero: [0, 0.2], how: [0, 0.22], time: [0, 0.22] };
  const view = (k: string): ViewShift => (portrait() ? VIEW_PORTRAIT : VIEW)[k];
  const blendView = (a: ViewShift, b: ViewShift, t: number): ViewShift => {
    const e = ease(t);
    return [a[0] + (b[0] - a[0]) * e, a[1] + (b[1] - a[1]) * e];
  };

  interface Target extends Station {
    tod: number;
    v: ViewShift;
    sand?: number;
  }
  function target(y: number): Target {
    const M = io.metrics.current;
    if (y <= M.regS) {
      // Hero: the scale rides up with its arch window as the hero scrolls, so the window never empties.
      const f = y / Math.max(1, M.regS);
      const t = 0.06 * f;
      const v = blendView(view('hero'), view('how'), t);
      return { ...blend(heroStation(), howStation(0), t), tod: 0.24, v: [v[0], v[1] + y / M.vh] };
    }
    if (y <= M.howS) {
      // Hidden behind the register: finish the move so §2 opens on the first arch.
      const t = 0.06 + 0.94 * clamp((y - M.regS) / Math.max(1, M.howS - M.regS), 0, 1);
      return { ...blend(heroStation(), howStation(0), t), tod: 0.24, v: blendView(view('hero'), view('how'), t) };
    }
    if (y <= M.howE) {
      const p = (y - M.howS) / (M.howE - M.howS);
      return { ...howStation(p), tod: 0.24 + 0.16 * p, v: view('how') };
    }
    if (y <= M.timeS) {
      const t = (y - M.howE) / Math.max(1, M.timeS - M.howE);
      return { ...blend(howStation(1), timeStation(0), t), tod: 0.4 + 0.15 * t, v: blendView(view('how'), view('time'), t) };
    }
    if (y <= M.timeE) {
      // The review year runs across the afternoon: issued after midday, expiring at sunset.
      const p = (y - M.timeS) / (M.timeE - M.timeS);
      const d = p * TIMELINE_DAYS;
      const tod = d <= PERIOD_DAYS ? 0.55 + (0.45 * d) / PERIOD_DAYS : 1 + (0.15 * (d - PERIOD_DAYS)) / (TIMELINE_DAYS - PERIOD_DAYS);
      return { ...timeStation(p), tod, v: view('time'), sand: Math.min(1, d / PERIOD_DAYS) };
    }
    const t = clamp((y - M.timeE) / Math.max(1, M.doc - M.timeE), 0, 1);
    return { ...timeStation(1), tod: 1.15 + 0.15 * t, v: view('time'), sand: 1 };
  }

  /** True when an opaque section fills the whole viewport, so there is nothing to draw. */
  const covered = (y: number) => {
    const M = io.metrics.current;
    return (y >= M.regS + 4 && y + M.vh <= M.regE - 4) || y >= M.doc;
  };

  /* ---------- render loop: draws only while something is still settling ---------- */
  const start = target(window.scrollY);
  const cam = { p: start.p.clone(), l: start.l.clone(), tod: start.tod, v: [...start.v] as ViewShift };
  const onResize = () => {
    renderer.setSize(window.innerWidth, window.innerHeight, false);
    camera.aspect = window.innerWidth / window.innerHeight;
    camera.updateProjectionMatrix();
    post.setSize();
    wake();
  };
  const onScroll = () => wake();
  window.addEventListener('resize', onResize);
  window.addEventListener('scroll', onScroll, { passive: true });

  let sandF = TODAY_DAY / PERIOD_DAYS;
  setSand(sandF);
  let last = performance.now();
  let raf = 0;
  let first = true;
  const look = new THREE.Vector3();
  const lightBasis = new THREE.Matrix4();
  const lightInv = new THREE.Matrix4();
  const snap = new THREE.Vector3();
  const ORIGIN = new THREE.Vector3();
  const UP = new THREE.Vector3(0, 1, 0);
  const TEXEL = 110 / sm;
  const onLost = (e: Event) => {
    e.preventDefault();
    cancelAnimationFrame(raf);
    io.onLost();
  };
  canvas.addEventListener('webglcontextlost', onLost);

  function wake() {
    if (raf) return;
    last = performance.now();
    raf = requestAnimationFrame(frame);
  }

  const t0 = performance.now();
  let lastDraw = 0;
  const sunScreen = new THREE.Vector3();
  const fwd = new THREE.Vector3();
  const rayColor = new THREE.Color();
  const env: Env = { time: 0, dt: 0, night: 0, golden: 0, sunCol: skyU.sunCol.value, camera };
  const look2 = { sun: new THREE.Vector2(), rays: 0, rayColor, bloom: 0.4, time: 0 };
  const breath = new THREE.Vector3();

  function frame(now: number) {
    raf = 0;
    const st = io.state.current;
    // Covered by the record sheet or by an opaque section: nothing to draw.
    if (st.paused || covered(window.scrollY)) {
      first = true; // when the scene shows again, start from the right place instead of flying there
      return;
    }
    // The scene is alive (clouds, birds, wind), so it keeps drawing while visible: at full rate while
    // the camera moves and about 30 fps while it rests.
    raf = requestAnimationFrame(frame);
    const dt = Math.min(0.1, (now - last) / 1000);
    last = now;
    const s = target(window.scrollY);
    // Snap instead of flying when the target is far away (a nav jump), so the camera never cuts through hills.
    const k = first || cam.p.distanceToSquared(s.p) > 60 * 60 ? 1 : 1 - Math.exp(-dt * 4.5);
    first = false;
    let moving = cam.p.distanceToSquared(s.p) + cam.l.distanceToSquared(s.l) > 1e-4 || Math.abs(s.tod - cam.tod) > 1e-4;
    cam.p.lerp(s.p, k);
    cam.l.lerp(s.l, k);
    cam.tod += (s.tod - cam.tod) * k;
    cam.v[0] += (s.v[0] - cam.v[0]) * k;
    cam.v[1] += (s.v[1] - cam.v[1]) * k;
    if (s.sand != null) {
      if (Math.abs(s.sand - sandF) > 1e-4) moving = true;
      sandF += (s.sand - sandF) * k;
    }
    setSand(sandF);

    const time = (now - t0) / 1000;
    if (!moving && now - lastDraw < 31) return;
    const ddt = Math.min(0.1, (now - (lastDraw || now)) / 1000);
    lastDraw = now;
    // A slow breath in the camera, as if held by hand.
    breath.set(Math.sin(time * 0.31) * 0.12, Math.sin(time * 0.47) * 0.08, Math.cos(time * 0.23) * 0.1);
    camera.position.copy(cam.p).add(breath);
    look.copy(cam.l);
    camera.lookAt(look);
    const w = window.innerWidth;
    const h = window.innerHeight;
    camera.setViewOffset(w, h, -cam.v[0] * w, cam.v[1] * h, w, h);

    const night = applyTimeOfDay(cam.tod);
    // After the period ends the sand keeps a low glow, so the hourglass still reads at night.
    hourglass.sand.emissive.setRGB(0.42 * night, 0.3 * night, 0.1 * night);
    sky.position.copy(camera.position);
    stars.position.copy(camera.position);
    moon.position.copy(camera.position).add(MOON_DIR);
    // Snap the shadow camera to whole shadow-map texels in light space, so shadows do not crawl while scrolling.
    lightBasis.lookAt(sunDir, ORIGIN, UP);
    snap.copy(cam.l).applyMatrix4(lightInv.copy(lightBasis).transpose());
    snap.x = Math.round(snap.x / TEXEL) * TEXEL;
    snap.y = Math.round(snap.y / TEXEL) * TEXEL;
    snap.applyMatrix4(lightBasis);
    sun.target.position.copy(snap);
    sun.position.copy(snap).addScaledVector(sunDir, 140);
    moonLight.target.position.copy(cam.l);
    moonLight.position.copy(cam.l).add(new THREE.Vector3(60, 90, -80));

    // Scale: level for any approved product, tipped for one the board did not approve.
    const tiltTarget = PRODUCT_TILT[st.product] ?? 0;
    if (Math.abs(tiltTarget - scale.tilt) > 1e-4) moving = true;
    scale.tilt += (tiltTarget - scale.tilt) * (1 - Math.exp(-dt * 3));
    // A breath of air on the beam and the pans; it never reads as a tilt.
    scale.pivot.rotation.z = scale.tilt + Math.sin(time * 0.7) * 0.004;
    for (const [i, hang] of scale.hangs.entries()) {
      hang.rotation.z = -scale.pivot.rotation.z + Math.sin(time * 1.1 + i * 1.7) * 0.025;
      hang.rotation.x = Math.sin(time * 0.8 + i) * 0.02;
    }
    for (const [i, h] of halos.entries()) h.material.opacity *= 0.9 + 0.1 * Math.sin(time * 9 + i * 2.3) * Math.sin(time * 3.1 + i);

    const golden = ease((cam.tod - 0.62) / 0.33) * (1 - ease((cam.tod - 1.04) / 0.14));
    env.time = time;
    env.dt = ddt;
    env.night = night;
    env.golden = golden;
    for (const u of living) u(env);
    skyFill.position.copy(cam.l).add(new THREE.Vector3(-60, 70, 90));
    skyFill.target.position.copy(cam.l);

    // Light shafts: find the sun on screen, and fade them when it is down or behind the camera.
    camera.updateMatrixWorld();
    sunScreen.copy(camera.position).addScaledVector(sunDir, 500).project(camera);
    camera.getWorldDirection(fwd);
    const facing = clamp((fwd.dot(sunDir) - 0.05) / 0.5, 0, 1);
    look2.sun.set(sunScreen.x * 0.5 + 0.5, sunScreen.y * 0.5 + 0.5);
    look2.rays = facing * skyU.sunVis.value * (0.12 + golden * 0.38);
    rayColor.copy(skyU.sunCol.value).lerp(white, 0.15);
    look2.bloom = 0.1 + golden * 0.08 + night * 0.3;
    look2.time = time;

    // The arch for the part of the record you are reading turns brass.
    gates.forEach((g, i) => {
      const on = i === st.gate ? 1 : 0;
      if (Math.abs(on - g.on) > 1e-3) moving = true;
      g.on = k === 1 ? on : g.on + (on - g.on) * (1 - Math.exp(-dt * 9));
      // paper (#DCD2C0) to lapis (#1E3A5F)
      g.m.color.setRGB(0.863 - 0.745 * g.on, 0.824 - 0.597 * g.on, 0.753 - 0.38 * g.on);
      g.s.scale.setScalar(2.2 + g.on * 0.6);
      // Arch numbers belong to §1; keep them out of the hero.
      g.s.visible = i === st.gate && window.scrollY > io.metrics.current.regS;
    });

    post.render(scene, camera, look2);
  }
  raf = requestAnimationFrame(frame);

  return {
    wake,
    dispose() {
      cancelAnimationFrame(raf);
      window.removeEventListener('scroll', onScroll);
      canvas.removeEventListener('webglcontextlost', onLost);
      window.removeEventListener('resize', onResize);
      scene.traverse((o) => {
        const m = o as THREE.Mesh;
        m.geometry?.dispose();
        const material = m.material as THREE.Material | THREE.Material[] | undefined;
        if (Array.isArray(material)) material.forEach((x) => x.dispose());
        else material?.dispose();
      });
      paper.dispose();
      sky2.dispose();
      post.dispose();
      envMap.dispose();
      pmrem.dispose();
      renderer.dispose();
    },
  };
}
