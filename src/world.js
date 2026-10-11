import * as THREE from 'three';
import { EffectComposer } from 'three/examples/jsm/postprocessing/EffectComposer.js';
import { RenderPass } from 'three/examples/jsm/postprocessing/RenderPass.js';
import { UnrealBloomPass } from 'three/examples/jsm/postprocessing/UnrealBloomPass.js';
import { OutputPass } from 'three/examples/jsm/postprocessing/OutputPass.js';
import { SHAPES, FRESH, MAP_TIMES, heartbeat } from './shapes.js';

const TAU = Math.PI * 2;
// langsame Geräte dürfen grössere Schritte machen, damit nichts in Zeitlupe läuft
const DT_MAX = /[?&]test/.test(location.search) ? 0.11 : 0.05;
const hex = (h) => { const c = new THREE.Color(h); return [c.r, c.g, c.b]; };

// Stimmung: Himmel, Nebel, Sterne, Leuchten
export const MOODS = {
  intro:    { top: '#0c0a18', bot: '#1b0f1e', neb: '#c76a8c', neb2: '#5a78b8', amt: 0.22, stars: 0.8, bloom: 1.05 },
  before:   { top: '#0a0a13', bot: '#16101b', neb: '#b8744f', neb2: '#3c3a55', amt: 0.1, stars: 0.6, bloom: 0.95 },
  fall:     { top: '#07070c', bot: '#0e0b11', neb: '#6a5a66', neb2: '#2a2a3a', amt: 0.05, stars: 0.32, bloom: 0.8 },
  off:      { top: '#050508', bot: '#09080c', neb: '#3a3440', neb2: '#1a1a24', amt: 0.02, stars: 0.12, bloom: 0.75 },
  stir:     { top: '#0a0912', bot: '#150f19', neb: '#a8607a', neb2: '#3a3a5a', amt: 0.09, stars: 0.38, bloom: 0.95 },
  spark:    { top: '#130b17', bot: '#26121d', neb: '#d0607e', neb2: '#c98a5a', amt: 0.3, stars: 0.65, bloom: 1.25 },
  cold:     { top: '#0a0d17', bot: '#121723', neb: '#5d6f96', neb2: '#7a5a6e', amt: 0.14, stars: 0.5, bloom: 1.0 },
  ache:     { top: '#08090f', bot: '#10111a', neb: '#4d5d7e', neb2: '#3a2a3a', amt: 0.09, stars: 0.32, bloom: 1.05 },
  care:     { top: '#0e0a14', bot: '#1d1219', neb: '#c27a5a', neb2: '#b06a8a', amt: 0.16, stars: 0.5, bloom: 1.0 },
  grow:     { top: '#150d16', bot: '#2b1519', neb: '#e08a5c', neb2: '#c0688a', amt: 0.3, stars: 0.6, bloom: 1.2 },
  roads:    { top: '#070b15', bot: '#0f1421', neb: '#4f6ea8', neb2: '#a8704f', amt: 0.13, stars: 0.55, bloom: 0.95 },
  twin:     { top: '#120b18', bot: '#1f1223', neb: '#c86a92', neb2: '#5e86c8', amt: 0.26, stars: 0.7, bloom: 1.12 },
  twinWarm: { top: '#140c16', bot: '#25141c', neb: '#e0905e', neb2: '#c86a92', amt: 0.32, stars: 0.75, bloom: 1.2 },
  still:    { top: '#060a13', bot: '#0b1221', neb: '#3e64a0', neb2: '#2a3a5a', amt: 0.14, stars: 0.6, bloom: 0.95 },
  unsure:   { top: '#05070d', bot: '#0a0f19', neb: '#34507e', neb2: '#2a2a3a', amt: 0.07, stars: 0.4, bloom: 0.85 },
  love:     { top: '#120a1d', bot: '#1d0f23', neb: '#d0649a', neb2: '#5a86d8', amt: 0.38, stars: 0.95, bloom: 1.25 },
  loveFull: { top: '#170b20', bot: '#261126', neb: '#ea74a8', neb2: '#6a98ea', amt: 0.5, stars: 1.0, bloom: 1.45 },
  mind:     { top: '#0b0a17', bot: '#141025', neb: '#7a6ac8', neb2: '#3a4a7a', amt: 0.18, stars: 0.5, bloom: 1.0 },
  calm:     { top: '#0e0b15', bot: '#1b1321', neb: '#c88a5a', neb2: '#7a6aa8', amt: 0.18, stars: 0.6, bloom: 1.1 },
  bye:      { top: '#0b0a12', bot: '#17101b', neb: '#b8744f', neb2: '#5a4a6a', amt: 0.13, stars: 0.5, bloom: 1.0 },
  bye2:     { top: '#0c0a14', bot: '#16111f', neb: '#c8648c', neb2: '#5a7ab8', amt: 0.2, stars: 0.6, bloom: 1.05 },
  nein:     { top: '#05070e', bot: '#0a0e19', neb: '#3a5888', neb2: '#1a2234', amt: 0.07, stars: 0.18, bloom: 0.85 },
  miss:     { top: '#110b14', bot: '#1f1219', neb: '#c8805a', neb2: '#b8648a', amt: 0.26, stars: 0.5, bloom: 1.15 },
  thanks:   { top: '#140c14', bot: '#26151a', neb: '#e8945e', neb2: '#d07098', amt: 0.34, stars: 0.6, bloom: 1.25 },
  me:       { top: '#0d0d17', bot: '#1a141d', neb: '#d8a060', neb2: '#7a90c8', amt: 0.22, stars: 0.7, bloom: 1.12 },
  release:  { top: '#070a17', bot: '#150f23', neb: '#5a7ed0', neb2: '#c8649a', amt: 0.26, stars: 1.0, bloom: 1.15 },
};

const BG_VERT = /* glsl */`
varying vec2 vUv;
void main(){ vUv = position.xy * 0.5 + 0.5; gl_Position = vec4(position.xy, 0.9999, 1.0); }`;
const BG_FRAG = /* glsl */`
precision highp float;
varying vec2 vUv;
uniform vec3 uTop, uBot, uNeb, uNeb2;
uniform float uAmt, uTime;
uniform vec2 uRes, uFocus;
float hash(vec2 p){ p = fract(p * vec2(123.34, 456.21)); p += dot(p, p + 45.32); return fract(p.x * p.y); }
float noise(vec2 p){ vec2 i = floor(p), f = fract(p); vec2 u = f*f*(3.-2.*f);
  return mix(mix(hash(i), hash(i+vec2(1,0)), u.x), mix(hash(i+vec2(0,1)), hash(i+vec2(1,1)), u.x), u.y); }
float fbm(vec2 p){ float v = 0., a = .5; for (int i = 0; i < 4; i++){ v += a * noise(p); p = p * 2.03 + 7.1; a *= .5; } return v; }
void main(){
  vec3 col = mix(uBot, uTop, smoothstep(0., 1., vUv.y));
  float asp = uRes.x / uRes.y;
  vec2 p = (vUv - uFocus) * vec2(asp, 1.);
  float glow = exp(-dot(p, p) * 1.8);
  float n = fbm(p * 1.5 + vec2(uTime * .012, -uTime * .009));
  float m = fbm(p * 2.2 - vec2(uTime * .01, uTime * .007) + 5.);
  col += uNeb * uAmt * n * n * (0.4 + 1.2 * glow);
  col += uNeb2 * uAmt * m * m * 0.9 * (1.0 - glow * 0.4);
  float v = smoothstep(1.3, .3, length((vUv - .5) * vec2(asp, 1.)));
  col *= mix(.55, 1., v);
  col += (hash(gl_FragCoord.xy + fract(uTime)) - .5) / 255.;
  gl_FragColor = vec4(col, 1.);
}`;

const P_VERT = /* glsl */`
attribute vec4 aColor;
attribute float aSize;
attribute float aRand;
attribute float aStreak;
uniform float uTime, uScale, uGain;
varying vec4 vColor;
varying float vStreak;
void main(){
  vec4 mv = modelViewMatrix * vec4(position, 1.0);
  gl_Position = projectionMatrix * mv;
  float tw = 0.82 + 0.18 * sin(uTime * (0.8 + aRand * 2.2) + aRand * 40.0);
  gl_PointSize = max(aSize * uScale / -mv.z, 0.0);
  vColor = vec4(aColor.rgb, aColor.a * tw * uGain);
  vStreak = aStreak;
}`;
const P_FRAG = /* glsl */`
precision highp float;
varying vec4 vColor;
varying float vStreak;
void main(){
  vec2 d = gl_PointCoord - 0.5;
  d.x *= 1.0 + vStreak * 7.0;
  float r2 = dot(d, d) * 4.0;
  float a = (exp(-r2 * 5.0) * 0.85 + exp(-r2 * 1.6) * 0.15) * vColor.a;
  if (a < 0.002) discard;
  gl_FragColor = vec4(vColor.rgb, a);
}`;

const S_VERT = /* glsl */`
attribute float aSize; attribute float aRand;
uniform float uTime, uPR, uAlpha;
varying float vA;
void main(){
  vec4 mv = modelViewMatrix * vec4(position, 1.0);
  gl_Position = projectionMatrix * mv;
  gl_PointSize = aSize * uPR;
  vA = uAlpha * (0.35 + 0.65 * (0.5 + 0.5 * sin(uTime * (0.4 + aRand * 1.4) + aRand * 60.0))) * (0.4 + aRand * 0.6);
}`;
const S_FRAG = /* glsl */`
precision highp float;
varying float vA;
void main(){ vec2 d = gl_PointCoord - .5; float a = smoothstep(.5, .0, length(d)) * vA; if (a < .003) discard; gl_FragColor = vec4(vec3(1., .96, .94), a); }`;

function letterTexture() {
  const c = document.createElement('canvas');
  c.width = 256; c.height = 176;
  const x = c.getContext('2d');
  const g = x.createLinearGradient(0, 0, 0, 176);
  g.addColorStop(0, '#f7ede4'); g.addColorStop(1, '#e8d8cc');
  x.fillStyle = g;
  x.beginPath(); x.roundRect(6, 6, 244, 164, 10); x.fill();
  x.strokeStyle = 'rgba(150,110,100,.35)'; x.lineWidth = 2.2;
  x.beginPath(); x.moveTo(10, 14); x.lineTo(128, 98); x.lineTo(246, 14); x.stroke();
  x.beginPath(); x.moveTo(10, 166); x.lineTo(104, 92); x.moveTo(246, 166); x.lineTo(152, 92); x.stroke();
  x.fillStyle = '#d98aa4';
  x.beginPath(); x.arc(128, 100, 13, 0, TAU); x.fill();
  x.fillStyle = 'rgba(255,255,255,.35)';
  x.beginPath(); x.arc(124, 96, 4, 0, TAU); x.fill();
  const t = new THREE.CanvasTexture(c);
  t.colorSpace = THREE.LinearSRGBColorSpace;
  t.anisotropy = 4;
  return t;
}

export function createWorld(canvas, { reduce = false, small = false } = {}) {
  const renderer = new THREE.WebGLRenderer({ canvas, antialias: false, alpha: false, powerPreference: 'high-performance' });
  renderer.outputColorSpace = THREE.LinearSRGBColorSpace;
  renderer.toneMapping = THREE.ACESFilmicToneMapping;
  renderer.toneMappingExposure = 1.2;
  renderer.setClearColor(0x07070e, 1);

  let PR = Math.min(window.devicePixelRatio || 1, small ? 1.75 : 2);
  const N = small ? 8000 : 14000;

  const scene = new THREE.Scene();
  const camera = new THREE.PerspectiveCamera(45, 1, 0.1, 120);
  camera.position.set(0, 0, 8);
  const root = new THREE.Group();
  scene.add(root);

  /* Himmel */
  const bgU = {
    uTop: { value: new THREE.Vector3() }, uBot: { value: new THREE.Vector3() },
    uNeb: { value: new THREE.Vector3() }, uNeb2: { value: new THREE.Vector3() },
    uAmt: { value: 0 }, uTime: { value: 0 }, uRes: { value: new THREE.Vector2(1, 1) }, uFocus: { value: new THREE.Vector2(0.5, 0.65) },
  };
  const bg = new THREE.Mesh(new THREE.PlaneGeometry(2, 2), new THREE.ShaderMaterial({
    vertexShader: BG_VERT, fragmentShader: BG_FRAG, uniforms: bgU, depthTest: false, depthWrite: false,
  }));
  bg.frustumCulled = false; bg.renderOrder = -10;
  scene.add(bg);

  /* Sterne */
  const SN = small ? 900 : 1600;
  const sPos = new Float32Array(SN * 3), sSize = new Float32Array(SN), sRand = new Float32Array(SN);
  for (let i = 0; i < SN; i++) {
    const z = Math.random() * 2 - 1, a = Math.random() * TAU, s = Math.sqrt(1 - z * z), r = 30 + Math.random() * 20;
    sPos[i * 3] = Math.cos(a) * s * r; sPos[i * 3 + 1] = z * r; sPos[i * 3 + 2] = Math.sin(a) * s * r - 10;
    sSize[i] = 0.8 + Math.pow(Math.random(), 3) * 2.2; sRand[i] = Math.random();
  }
  const sGeo = new THREE.BufferGeometry();
  sGeo.setAttribute('position', new THREE.BufferAttribute(sPos, 3));
  sGeo.setAttribute('aSize', new THREE.BufferAttribute(sSize, 1));
  sGeo.setAttribute('aRand', new THREE.BufferAttribute(sRand, 1));
  const sU = { uTime: { value: 0 }, uPR: { value: PR }, uAlpha: { value: 0.8 } };
  const stars = new THREE.Points(sGeo, new THREE.ShaderMaterial({
    vertexShader: S_VERT, fragmentShader: S_FRAG, uniforms: sU, transparent: true, depthWrite: false, blending: THREE.AdditiveBlending,
  }));
  stars.renderOrder = -5;
  scene.add(stars);

  /* Das Licht: Teilchen */
  const P = new Float32Array(N * 3), V = new Float32Array(N * 3);
  const colS = new Float32Array(N * 4), colOut = new Float32Array(N * 4);
  const sizeS = new Float32Array(N), sizeOut = new Float32Array(N), streak = new Float32Array(N);
  const R = new Float32Array(N * 4), aRand = new Float32Array(N), glow = new Float32Array(N);
  for (let i = 0; i < N; i++) {
    for (let k = 0; k < 4; k++) R[i * 4 + k] = Math.random();
    aRand[i] = R[i * 4];
    const z = Math.random() * 2 - 1, a = Math.random() * TAU, s = Math.sqrt(1 - z * z), r = 4 + Math.random() * 6;
    P[i * 3] = Math.cos(a) * s * r; P[i * 3 + 1] = z * r; P[i * 3 + 2] = Math.sin(a) * s * r;
  }
  const geo = new THREE.BufferGeometry();
  const posAttr = new THREE.BufferAttribute(P, 3).setUsage(THREE.DynamicDrawUsage);
  const colAttr = new THREE.BufferAttribute(colOut, 4).setUsage(THREE.DynamicDrawUsage);
  const sizeAttr = new THREE.BufferAttribute(sizeOut, 1).setUsage(THREE.DynamicDrawUsage);
  const streakAttr = new THREE.BufferAttribute(streak, 1).setUsage(THREE.DynamicDrawUsage);
  geo.setAttribute('position', posAttr);
  geo.setAttribute('aColor', colAttr);
  geo.setAttribute('aSize', sizeAttr);
  geo.setAttribute('aStreak', streakAttr);
  geo.setAttribute('aRand', new THREE.BufferAttribute(aRand, 1));
  geo.boundingSphere = new THREE.Sphere(new THREE.Vector3(), 100);
  const pU = { uTime: { value: 0 }, uScale: { value: 1 }, uGain: { value: 0.3 } };
  const points = new THREE.Points(geo, new THREE.ShaderMaterial({
    vertexShader: P_VERT, fragmentShader: P_FRAG, uniforms: pU, transparent: true, depthWrite: false, blending: THREE.AdditiveBlending,
  }));
  points.frustumCulled = false;
  root.add(points);

  /* Briefe – einer für jede Angst */
  const letters = new THREE.Group();
  const lTex = letterTexture();
  const lMats = [];
  for (let k = 0; k < 9; k++) {
    const m = new THREE.MeshBasicMaterial({ map: lTex, transparent: true, opacity: 0, side: THREE.DoubleSide, depthWrite: false, color: new THREE.Color(0.48, 0.43, 0.41) });
    lMats.push(m);
    const mesh = new THREE.Mesh(new THREE.PlaneGeometry(0.4, 0.28), m);
    mesh.userData.k = k;
    letters.add(mesh);
  }
  letters.renderOrder = 3;
  root.add(letters);
  let lettersOn = 0, lettersShown = 0, lettersStart = 0;

  /* Nachleuchten */
  let composer = null, bloom = null, useBloom = true;
  function buildComposer() {
    composer = new EffectComposer(renderer);
    composer.addPass(new RenderPass(scene, camera));
    bloom = new UnrealBloomPass(new THREE.Vector2(256, 256), 1.0, 0.55, 0.32);
    composer.addPass(bloom);
    composer.addPass(new OutputPass());
  }
  buildComposer();

  /* Zustand */
  const cache = new Map();
  let shape = null, shapeName = '', shapeStart = 0;
  const C = new Float32Array(400 * 5);
  const mood = { top: [0, 0, 0], bot: [0, 0, 0], neb: [0, 0, 0], neb2: [0, 0, 0], amt: 0, stars: 0, bloom: 1 };
  let moodT = MOODS.intro;
  const moodHex = {};
  const mh = (m) => moodHex[m] || (moodHex[m] = { top: hex(MOODS[m].top), bot: hex(MOODS[m].bot), neb: hex(MOODS[m].neb), neb2: hex(MOODS[m].neb2) });
  let moodName = 'intro';
  Object.assign(mood, { ...mh('intro'), amt: 0, stars: 0, bloom: 1 });
  mood.top = [...mood.top]; mood.bot = [...mood.bot]; mood.neb = [...mood.neb]; mood.neb2 = [...mood.neb2];

  const layout = { cx: 0.5, cy: 0.4, fw: 1, fh: 0.9 };
  const lay = { cx: 0.5, cy: 0.4, scale: 0.7 };
  const cam = { pos: new THREE.Vector3(0, 0, 8), look: new THREE.Vector3(0, 0, 0) };
  const camLook = new THREE.Vector3(0, 0, 0);
  const parallax = { x: 0, y: 0, tx: 0, ty: 0 };

  let W = 1, H = 1;
  function resize() {
    W = window.innerWidth; H = window.innerHeight;
    renderer.setPixelRatio(PR);
    renderer.setSize(W, H, false);
    composer.setPixelRatio(PR);
    composer.setSize(W, H);
    bloom.resolution.set(Math.round(W * PR * 0.5), Math.round(H * PR * 0.5));
    camera.aspect = W / H;
    applyView();
    bgU.uRes.value.set(W, H);
    sU.uPR.value = PR;
  }
  function applyView() {
    camera.setViewOffset(W, H, (0.5 - lay.cx) * W, (0.5 - lay.cy) * H, W, H);
    camera.updateProjectionMatrix();
    pU.uScale.value = (H * PR * 0.5) / Math.tan((camera.fov * Math.PI) / 360);
  }

  function setShape(name) {
    if (!SHAPES[name]) return;
    let s = cache.get(name);
    if (!s || FRESH.has(name)) { s = SHAPES[name](N); if (!FRESH.has(name)) cache.set(name, s); }
    const prevFree = shape && shape.free;
    shape = s; shapeName = name; shapeStart = now;
    if (s.burst && s.free) {
      for (let i = 0; i < N; i++) {
        if (!s.free[i] || (prevFree && prevFree[i])) continue;
        const z = Math.random() * 2 - 1, a = Math.random() * TAU, q = Math.sqrt(1 - z * z), m = s.burst * (0.4 + Math.random());
        V[i * 3] += Math.cos(a) * q * m; V[i * 3 + 1] += z * m; V[i * 3 + 2] += Math.sin(a) * q * m;
      }
    }
    // Regen beginnt gleichmässig verteilt, nicht als ein Schwall
    if (s.free && s.flow && s.flow.respawn === 'rain') {
      for (let i = 0; i < N; i++) {
        if (!s.free[i] || (prevFree && prevFree[i])) continue;
        P[i * 3] = (Math.random() - 0.5) * 7.5; P[i * 3 + 1] = -2.6 + Math.random() * 6.6; P[i * 3 + 2] = (Math.random() - 0.7) * 4;
        V[i * 3] = 0; V[i * 3 + 1] = s.flow.v[1]; V[i * 3 + 2] = 0;
        colS[i * 4 + 3] = 0;
      }
    }
    cam.pos.set(...(s.cam || [0, 0, 8]));
    cam.look.set(...(s.look || [0, 0, 0]));
    if (!/^shelter/.test(name)) lettersOn = 0;
  }
  function setMood(name) { if (MOODS[name]) { moodT = MOODS[name]; moodName = name; } }

  /* Berührung: streicheln und tippen */
  const ray = new THREE.Raycaster();
  const plane = new THREE.Plane(new THREE.Vector3(0, 0, 1), 0);
  const hit = new THREE.Vector3();
  const stroke = { on: false, x: 0, y: 0, vx: 0, vy: 0, lastT: 0, power: 0 };
  const ripples = [];
  function toLocal(px, py) {
    ray.setFromCamera(new THREE.Vector2((px / W) * 2 - 1, -(py / H) * 2 + 1), camera);
    if (!ray.ray.intersectPlane(plane, hit)) return null;
    return [hit.x / root.scale.x, hit.y / root.scale.y];
  }
  function pointerMove(px, py, active) {
    parallax.tx = (px / W - 0.5); parallax.ty = (py / H - 0.5);
    const p = toLocal(px, py);
    if (!p) return;
    const tt = performance.now() / 1000;
    if (stroke.on || active) {
      const dt = Math.max(0.008, tt - stroke.lastT);
      stroke.vx = stroke.vx * 0.5 + ((p[0] - stroke.x) / dt) * 0.5;
      stroke.vy = stroke.vy * 0.5 + ((p[1] - stroke.y) / dt) * 0.5;
    }
    stroke.x = p[0]; stroke.y = p[1]; stroke.lastT = tt;
    stroke.on = !!active;
    if (active) stroke.power = 1;
  }
  function pointerDown(px, py) {
    const p = toLocal(px, py);
    if (!p) return;
    stroke.x = p[0]; stroke.y = p[1]; stroke.vx = 0; stroke.vy = 0; stroke.lastT = performance.now() / 1000;
    if (!reduce) { ripples.push({ x: p[0], y: p[1], age: 0 }); if (ripples.length > 3) ripples.shift(); }
  }
  function pointerUp() { stroke.on = false; }

  /* Rotationsmatrix */
  const Mx = new Float32Array(9);
  function rotMatrix(rx, ry, rz) {
    const cx = Math.cos(rx), sx = Math.sin(rx), cy = Math.cos(ry), sy = Math.sin(ry), cz = Math.cos(rz), sz = Math.sin(rz);
    // Rx * Ry * Rz
    Mx[0] = cy * cz; Mx[1] = -cy * sz; Mx[2] = sy;
    Mx[3] = sx * sy * cz + cx * sz; Mx[4] = -sx * sy * sz + cx * cz; Mx[5] = -sx * cy;
    Mx[6] = -cx * sy * cz + sx * sz; Mx[7] = cx * sy * sz + sx * cz; Mx[8] = cx * cy;
  }
  function shapeRotation(t) {
    const s = shape;
    if (s.rot) { const r = s.rot(t); rotMatrix(r[0], r[1], r[2]); return; }
    const sp = s.spin || [0, 0, 0], k = reduce ? 0.3 : 1;
    rotMatrix((s.rx || 0) + sp[0] * t * k, (s.ry || 0) + sp[1] * t * k, (s.rz || 0) + sp[2] * t * k);
  }

  /* Bildschirmposition für Beschriftungen (Karte) */
  const tmpV = new THREE.Vector3();
  function labels() {
    if (!shape || !shape.labels) return null;
    const out = [];
    for (const L of shape.labels) {
      let x = Mx[0] * L[0] + Mx[1] * L[1] + Mx[2] * L[2];
      let y = Mx[3] * L[0] + Mx[4] * L[1] + Mx[5] * L[2];
      let z = Mx[6] * L[0] + Mx[7] * L[1] + Mx[8] * L[2];
      tmpV.set(x * root.scale.x, y * root.scale.y, z * root.scale.z).project(camera);
      out.push([(tmpV.x * 0.5 + 0.5) * W, (-tmpV.y * 0.5 + 0.5) * H]);
    }
    return out;
  }

  /* Bildrate beobachten und Qualität anpassen */
  const perf = { frames: 0, sum: 0, stage: 0 };
  function watchPerf(dtMs) {
    if (document.hidden) return;
    perf.frames++;
    if (perf.frames < 40) return;
    perf.sum += dtMs;
    if (perf.frames < 160) return;
    const avg = perf.sum / 120;
    perf.frames = 0; perf.sum = 0;
    if (avg > 24 && perf.stage === 0) { perf.stage = 1; PR = Math.min(PR, 1.25); resize(); }
    else if (avg > 26 && perf.stage === 1) { perf.stage = 2; PR = 1; resize(); }
    else if (avg > 28 && perf.stage === 2) { perf.stage = 3; useBloom = false; }
  }

  /* Hauptschleife */
  let now = performance.now() / 1000, last = now, running = true, raf = 0;
  const frameHooks = [];
  function frame(ms) {
    raf = requestAnimationFrame(frame);
    if (!running) return;
    now = ms / 1000;
    const dtRaw = now - last; last = now;
    const dt = Math.min(dtRaw, DT_MAX);
    watchPerf(dtRaw * 1000);
    const t = now, ts = now - shapeStart;

    // Stimmung angleichen
    const km = 1 - Math.exp(-dt * 1.1);
    const tg = mh(moodName);
    for (let k = 0; k < 3; k++) {
      mood.top[k] += (tg.top[k] - mood.top[k]) * km; mood.bot[k] += (tg.bot[k] - mood.bot[k]) * km;
      mood.neb[k] += (tg.neb[k] - mood.neb[k]) * km; mood.neb2[k] += (tg.neb2[k] - mood.neb2[k]) * km;
    }
    mood.amt += (moodT.amt - mood.amt) * km;
    mood.stars += (moodT.stars - mood.stars) * km;
    mood.bloom += (moodT.bloom - mood.bloom) * km;
    bgU.uTop.value.set(...mood.top); bgU.uBot.value.set(...mood.bot);
    bgU.uNeb.value.set(...mood.neb); bgU.uNeb2.value.set(...mood.neb2);
    bgU.uAmt.value = mood.amt; bgU.uTime.value = t;
    sU.uAlpha.value = mood.stars; sU.uTime.value = t;
    pU.uTime.value = t;
    stars.rotation.y = t * 0.004;

    // Aufteilung des Bildschirms und Grösse
    const kl = 1 - Math.exp(-dt * 1.4);
    lay.cx += (layout.cx - lay.cx) * kl; lay.cy += (layout.cy - lay.cy) * kl;
    const D = cam.pos.distanceTo(cam.look);
    const wpp = (2 * D * Math.tan((camera.fov * Math.PI) / 360)) / H;
    const fit = (shape && shape.fit) || 2.2;
    const sc = Math.min(1.08, (W * layout.fw * 0.5 * wpp) / fit, (H * layout.fh * 0.5 * wpp) / fit);
    lay.scale += (sc - lay.scale) * kl;
    root.scale.setScalar(lay.scale);
    applyView();
    bgU.uFocus.value.set(lay.cx, 1 - lay.cy);

    // Kamera
    const kc = 1 - Math.exp(-dt * 0.9);
    parallax.x += (parallax.tx - parallax.x) * kc; parallax.y += (parallax.ty - parallax.y) * kc;
    camera.position.x += (cam.pos.x + parallax.x * 0.45 - camera.position.x) * kc;
    camera.position.y += (cam.pos.y - parallax.y * 0.3 - camera.position.y) * kc;
    camera.position.z += (cam.pos.z - camera.position.z) * kc;
    camLook.lerp(cam.look, kc);
    camera.lookAt(camLook);

    if (shape) simulate(t, ts, dt);
    updateLetters(t, dt);
    for (const h of frameHooks) h(t, ts);

    const pulse = shape && shape.bloomPulse ? shape.bloomPulse * heartbeat(t) * 0.35 : 0;
    if (useBloom) {
      bloom.strength = mood.bloom * 0.8 * (1 + pulse);
      composer.render(dt);
    } else renderer.render(scene, camera);
  }

  function simulate(t, ts, dt) {
    const s = shape;
    const G = s.G || 1;
    for (let g = 0; g < G; g++) { const o = g * 5; C[o] = 0; C[o + 1] = 0; C[o + 2] = 0; C[o + 3] = 1; C[o + 4] = 1; }
    if (s.centers) s.centers(t, ts, C, dt);
    shapeRotation(t);
    const pulse = s.pulse ? s.pulse(t) : 1;
    const wob = (s.wobble || 0) * (reduce ? 0.3 : 1);
    const k0 = s.k || 5, zeta = s.damp || 0.7;
    const kc = 1 - Math.exp(-dt * 2.2);
    const decay = Math.exp(-dt * 2.4);
    const flick = s.flicker ? 1 - s.flicker * (0.5 + 0.5 * Math.sin(t * 9.3) * Math.sin(t * 3.7 + 1.3)) : 1;
    const wave = s.wave, wm = s.waveMask;
    const grp = s.group, free = s.free, flow = s.flow, reveal = s.reveal;
    const touch = (s.touch || 1);
    const pos = s.pos, col = s.col, size = s.size;
    const m0 = Mx[0], m1 = Mx[1], m2 = Mx[2], m3 = Mx[3], m4 = Mx[4], m5 = Mx[5], m6 = Mx[6], m7 = Mx[7], m8 = Mx[8];

    // Wellen von Berührungen
    for (const r of ripples) r.age += dt;
    while (ripples.length && ripples[0].age > 1.4) ripples.shift();
    stroke.power *= Math.exp(-dt * 3);
    const sOn = stroke.power > 0.02;
    const svx = stroke.vx, svy = stroke.vy;

    for (let i = 0; i < N; i++) {
      const i3 = i * 3, i4 = i * 4;
      let px = P[i3], py = P[i3 + 1], pz = P[i3 + 2];
      let vx = V[i3], vy = V[i3 + 1], vz = V[i3 + 2];
      let ta = col[i4 + 3];

      if (free && free[i]) {
        const fv = flow.v, kd = Math.min(1, flow.drag * dt), tb = flow.turb;
        const r0 = R[i4] * 6.28, r1 = R[i4 + 1] * 6.28;
        vx += (fv[0] - vx) * kd + Math.sin(py * 1.3 + t * 0.7 + r0) * tb * dt;
        vy += (fv[1] - vy) * kd + Math.sin(px * 1.1 + t * 0.6 + r1) * tb * 0.5 * dt;
        vz += (fv[2] - vz) * kd + Math.sin(pz * 1.2 + t * 0.5 + r0) * tb * dt;
        px += vx * dt; py += vy * dt; pz += vz * dt;
        let respawn = false;
        if (flow.respawn === 'top' && py < -2.9) { respawn = true; py = 2.9 + Math.random() * 0.4; px = (Math.random() - 0.5) * 6.5; pz = (Math.random() - 0.6) * 4; }
        else if (flow.respawn === 'rain' && py < -2.7) { respawn = true; py = 2.8 + Math.random() * 2; px = (Math.random() - 0.5) * 7.5; pz = (Math.random() - 0.7) * 4; vy = fv[1]; }
        else if (flow.respawn === 'back' && (pz > 6.2 || Math.abs(px) > 8 || Math.abs(py) > 6)) {
          respawn = true; pz = -7 - Math.random() * 2; px = (Math.random() - 0.5) * 11; py = (Math.random() - 0.5) * 7;
        }
        if (respawn) colS[i4 + 3] = 0;
        if (flow.fadeTop) ta *= Math.min(1, Math.max(0, (flow.fadeTop - py) / 1.4));
        if (flow.fadeNear) ta *= Math.min(1, Math.max(0, (flow.fadeNear - pz) / 2.5));
      } else {
        const g = grp ? grp[i] : 0, o = g * 5;
        const gs = C[o + 3];
        let lx = pos[i3] * gs + C[o], ly = pos[i3 + 1] * gs + C[o + 1], lz = pos[i3 + 2] * gs + C[o + 2];
        if (wave && wm[i]) {
          if (wave.axis === 'x') lx += wave.amp * (Math.sin(ly * 1.9 + t * wave.speed) * 0.6 + Math.sin(lz * 2.6 - t * wave.speed * 0.8) * 0.4);
          else ly += wave.amp * (Math.sin(lx * 1.7 + t * wave.speed) * 0.6 + Math.sin(lz * 2.4 - t * wave.speed * 0.75) * 0.4);
        }
        let tx = (m0 * lx + m1 * ly + m2 * lz) * pulse;
        let ty = (m3 * lx + m4 * ly + m5 * lz) * pulse;
        let tz = (m6 * lx + m7 * ly + m8 * lz) * pulse;
        if (wob) {
          const r0 = R[i4], r1 = R[i4 + 1], r2 = R[i4 + 2];
          tx += wob * Math.sin(t * (0.6 + r0 * 1.3) + r1 * 6.28);
          ty += wob * Math.sin(t * (0.5 + r2 * 1.1) + r0 * 6.28);
          tz += wob * Math.sin(t * (0.7 + r1) + r2 * 6.28);
        }
        const kk = k0 * (0.5 + R[i4 + 3]);
        const cd = 2 * zeta * Math.sqrt(kk);
        vx += (kk * (tx - px) - cd * vx) * dt;
        vy += (kk * (ty - py) - cd * vy) * dt;
        vz += (kk * (tz - pz) - cd * vz) * dt;
        px += vx * dt; py += vy * dt; pz += vz * dt;
        ta *= C[o + 4];
      }

      // Berührung
      let gl = glow[i] * decay;
      if (sOn) {
        const dx = px - stroke.x, dy = py - stroke.y, d2 = dx * dx + dy * dy;
        if (d2 < 0.22) {
          const f = (1 - d2 / 0.22) * stroke.power;
          vx += (svx * 0.35 + dx * 2.5) * f * dt * 3;
          vy += (svy * 0.35 + dy * 2.5) * f * dt * 3;
          if (f * touch * 0.9 > gl) gl = Math.min(1, f * touch * 0.9);
        }
      }
      for (let r = 0; r < ripples.length; r++) {
        const rp = ripples[r], dx = px - rp.x, dy = py - rp.y;
        const d = Math.sqrt(dx * dx + dy * dy) + 1e-4, rad = rp.age * 2.4, e = Math.abs(d - rad);
        if (e < 0.2) {
          const f = (1 - e / 0.2) * (1 - rp.age / 1.4);
          vx += (dx / d) * f * dt * 9; vy += (dy / d) * f * dt * 9;
          if (f * 0.7 > gl) gl = f * 0.7;
        }
      }
      glow[i] = gl;

      P[i3] = px; P[i3 + 1] = py; P[i3 + 2] = pz;
      V[i3] = vx; V[i3 + 1] = vy; V[i3 + 2] = vz;

      // Farbe & Grösse
      if (reveal) ta *= reveal(i, ts);
      ta *= flick;
      colS[i4] += (col[i4] - colS[i4]) * kc;
      colS[i4 + 1] += (col[i4 + 1] - colS[i4 + 1]) * kc;
      colS[i4 + 2] += (col[i4 + 2] - colS[i4 + 2]) * kc;
      colS[i4 + 3] += (Math.min(1, ta) - colS[i4 + 3]) * kc;
      sizeS[i] += (size[i] - sizeS[i]) * kc;
      const hasA = colS[i4 + 3] > 0.004;
      colOut[i4] = colS[i4] + (1 - colS[i4]) * gl * 0.6;
      colOut[i4 + 1] = colS[i4 + 1] + (1 - colS[i4 + 1]) * gl * 0.6;
      colOut[i4 + 2] = colS[i4 + 2] + (1 - colS[i4 + 2]) * gl * 0.6;
      colOut[i4 + 3] = hasA ? colS[i4 + 3] + gl * 0.35 : 0;
      sizeOut[i] = sizeS[i] * (1 + gl * 0.7);
      const st = (s.streak && free && free[i]) ? 1 : 0;
      streak[i] += (st - streak[i]) * kc;
    }
    posAttr.needsUpdate = true; colAttr.needsUpdate = true; sizeAttr.needsUpdate = true; streakAttr.needsUpdate = true;
  }

  function updateLetters(t, dt) {
    const k = 1 - Math.exp(-dt * 1.2);
    lettersShown += (lettersOn - lettersShown) * k;
    letters.visible = lettersShown > 0.01;
    if (!letters.visible) return;
    const lt = t - lettersStart;
    for (const m of letters.children) {
      const q = m.userData.k;
      const appear = Math.min(1, Math.max(0, (lt - q * 0.28) / 1.2));
      const a = q / 9 * TAU + t * 0.11;
      const rr = (shapeName === 'shelterBig' ? 2.0 : 1.6) + 0.15 * Math.sin(t * 0.3 + q);
      m.position.set(Math.cos(a) * rr, Math.sin(q * 1.7) * 0.7 + 0.12 * Math.sin(t * 0.5 + q) - (1 - appear) * 0.5, Math.sin(a) * rr * 0.6);
      m.rotation.set(Math.sin(t * 0.6 + q) * 0.25, Math.sin(t * 0.7 + q) * 0.6, Math.sin(t * 0.5 + q * 2) * 0.3);
      m.material.opacity = 0.88 * lettersShown * appear;
    }
  }
  function setLetters(on) {
    if (on && !lettersOn) lettersStart = performance.now() / 1000;
    lettersOn = on ? 1 : 0;
  }

  function setLayout(cx, cy, fw, fh) { Object.assign(layout, { cx, cy, fw, fh }); }
  function snapLayout() { lay.cx = layout.cx; lay.cy = layout.cy; }

  addEventListener('resize', resize);
  document.addEventListener('visibilitychange', () => {
    running = !document.hidden;
    if (running) { last = performance.now() / 1000; }
  });
  resize();
  setShape('nebula');
  raf = requestAnimationFrame(frame);

  return {
    setShape, setMood, setLayout, snapLayout, setLetters,
    pointerDown, pointerMove, pointerUp,
    labels, mapTimes: MAP_TIMES,
    get shape() { return shape; }, get shapeName() { return shapeName; },
    shapeTime: () => performance.now() / 1000 - shapeStart,
    onFrame: (fn) => frameHooks.push(fn),
  };
}
