// Formen, in die sich das Licht verwandelt.
// Jede Form legt für jedes Teilchen ein Ziel fest: Position, Farbe, Grösse.
// Teilchen können zu Gruppen gehören (eigene, bewegte Mitte) oder "frei" sein
// (sie fliessen dann mit einer Strömung statt zu einem Ziel).

const TAU = Math.PI * 2;

export const COL = {
  ember: [1.0, 0.72, 0.52],
  gold: [1.0, 0.84, 0.62],
  warm: [1.0, 0.93, 0.86],
  white: [1.0, 0.97, 0.96],
  rose: [0.96, 0.56, 0.72],
  pink: [1.0, 0.74, 0.85],
  sky: [0.58, 0.76, 1.0],
  ice: [0.66, 0.74, 0.88],
  steel: [0.52, 0.6, 0.78],
  dust: [0.52, 0.48, 0.58],
  lav: [0.76, 0.7, 1.0],
  sprout: [0.86, 0.85, 0.6],
};

const mix = (a, b, t) => [a[0] + (b[0] - a[0]) * t, a[1] + (b[1] - a[1]) * t, a[2] + (b[2] - a[2]) * t];
const clamp = (x, a = 0, b = 1) => (x < a ? a : x > b ? b : x);
const smooth = (x) => { x = clamp(x); return x * x * (3 - 2 * x); };

function rng(seed) {
  let a = seed >>> 0;
  return () => {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

class B {
  constructor(N, seed, opts = {}) {
    this.N = N;
    this.r = rng(seed);
    this.pos = new Float32Array(N * 3);
    this.col = new Float32Array(N * 4);
    this.size = new Float32Array(N);
    this.group = null;
    this.free = null;
    Object.assign(this, opts);
  }
  g() { // Normalverteilung
    const u = this.r() || 1e-6, v = this.r();
    return Math.sqrt(-2 * Math.log(u)) * Math.cos(TAU * v);
  }
  dir() {
    const z = this.r() * 2 - 1, a = this.r() * TAU, s = Math.sqrt(1 - z * z);
    return [Math.cos(a) * s, z, Math.sin(a) * s];
  }
  put(i, x, y, z, c, a, s) {
    const p = i * 3, q = i * 4;
    this.pos[p] = x; this.pos[p + 1] = y; this.pos[p + 2] = z;
    this.col[q] = c[0]; this.col[q + 1] = c[1]; this.col[q + 2] = c[2]; this.col[q + 3] = a;
    this.size[i] = s;
  }
  hide(i) {
    const d = this.dir(), r = 1.5 + this.r() * 2;
    this.put(i, d[0] * r, d[1] * r, d[2] * r - 1, COL.dust, 0, 0);
  }
  groups(n) { this.group = new Uint16Array(this.N); this.G = n; return this; }
  frees() { this.free = new Uint8Array(this.N); return this; }
  // Staub, der still im Raum schwebt
  dust(i, a = 0.06, R = 3.2, c = COL.dust) {
    const d = this.dir(), r = R * Math.cbrt(this.r());
    this.put(i, d[0] * r * 1.3, d[1] * r * 0.9, d[2] * r - 0.6, c, a * (0.4 + this.r()), 0.022 + this.r() * 0.02);
  }
  blob(i, cx, cy, cz, sd, c, a, s) {
    this.put(i, cx + this.g() * sd, cy + this.g() * sd, cz + this.g() * sd, c, a * (0.6 + 0.4 * this.r()), s * (0.7 + 0.6 * this.r()));
  }
}

// Herzschlag: lub – dub, einmal pro Sekunde
export function heartbeat(t) {
  const ph = ((t + 0.2) % 1) - 0.2;
  return Math.exp(-Math.pow(ph / 0.055, 2)) + 0.6 * Math.exp(-Math.pow((ph - 0.28) / 0.065, 2));
}

/* ------------------------------------------------------------------ */

function nebula(N) {
  const b = new B(N, 11, { k: 7, damp: 0.75, wobble: 0.03, rx: 0.32, spin: [0, 0.06, 0], fit: 2.4 });
  for (let i = 0; i < N; i++) {
    const u = i / N;
    if (u < 0.06) b.blob(i, 0, 0, 0, 0.13, COL.warm, 0.5, 0.09);
    else if (u < 0.78) {
      const d = b.dir(), rad = 1.55 * Math.pow(b.r(), 0.45);
      const t = rad / 1.55;
      let c = mix(COL.warm, COL.ember, Math.min(1, t * 1.4));
      c = d[0] > 0 ? mix(c, COL.rose, t * 0.55) : mix(c, COL.sky, t * 0.5);
      b.put(i, d[0] * rad, d[1] * rad * 0.86, d[2] * rad, c, 0.42 * (1 - t * 0.6), 0.04 + b.r() * 0.04);
    } else {
      const a = b.r() * TAU, rr = 2.0 + 1.3 * Math.pow(b.r(), 2);
      b.put(i, Math.cos(a) * rr, b.g() * 0.04, Math.sin(a) * rr, mix(COL.ember, b.r() < 0.5 ? COL.rose : COL.sky, b.r() * 0.6), 0.2, 0.03);
    }
  }
  b.pulse = (t) => 1 + 0.025 * Math.sin(t * 0.9);
  return b;
}

/* I · Vorher ---------------------------------------------------------- */
const STEP = { n: 6, w: 0.62, rise: 0.42, x0: -1.85, y0: -1.35, depth: 0.7 };
const stepTop = (j) => [STEP.x0 + j * STEP.w + STEP.w * 0.5, STEP.y0 + (j + 1) * STEP.rise + 0.14, 0];

function steps(N) {
  const b = new B(N, 21, { k: 6, damp: 0.7, wobble: 0.012, rx: 0.14, ry: -0.42, fit: 2.3,
    cam: [0, 0.5, 8], look: [0, -0.15, 0] }).groups(2);
  const climber = Math.floor(N * 0.06), stepsN = Math.floor(N * 0.72);
  for (let i = 0; i < N; i++) {
    if (i < climber) { b.group[i] = 1; b.blob(i, 0, 0, 0, 0.075, mix(COL.warm, COL.ember, b.r() * 0.6), 0.9, 0.08); }
    else if (i < climber + stepsN) {
      const j = Math.floor(b.r() * STEP.n);
      const warmth = 0.3 + j * 0.09;
      const c = mix(COL.dust, COL.ember, warmth);
      let x, y, z = (b.r() - 0.5) * STEP.depth, a = 0.2;
      if (b.r() < 0.62) { // Trittfläche
        x = STEP.x0 + j * STEP.w + b.r() * STEP.w; y = STEP.y0 + (j + 1) * STEP.rise;
        if (Math.abs(z) > STEP.depth * 0.44) a = 0.38; // Kanten heller
      } else { // Stufe
        x = STEP.x0 + j * STEP.w; y = STEP.y0 + j * STEP.rise + b.r() * STEP.rise;
        if (b.r() < 0.3) a = 0.32;
      }
      b.put(i, x, y, z, c, a, 0.034 + b.r() * 0.012);
    } else b.dust(i, 0.07);
  }
  b.centers = (t, ts, C) => {
    const p = Math.min(STEP.n - 1, ts * 0.62);
    const j = Math.floor(p), f = p - j;
    const e = smooth((f - 0.45) / 0.55);
    const A = stepTop(Math.min(j, STEP.n - 1)), Bp = stepTop(Math.min(j + 1, STEP.n - 1));
    C[5] = A[0] + (Bp[0] - A[0]) * e;
    C[6] = A[1] + (Bp[1] - A[1]) * e + Math.sin(Math.PI * e) * 0.24 + 0.02 * Math.sin(t * 2);
    C[7] = 0;
  };
  return b;
}

function floorDust(b, i, a, c = COL.dust) {
  b.put(i, b.g() * 1.35, -1.58 + Math.abs(b.g()) * 0.025, b.g() * 0.7, mix(c, COL.ice, b.r() * 0.3), a * (0.5 + b.r()), 0.026 + b.r() * 0.014);
}

function collapse(N) {
  const b = new B(N, 31, { k: 2.4, damp: 0.32, wobble: 0.004, rx: 0.14, ry: -0.42, fit: 2.3, cam: [0, 0.5, 8], look: [0, -0.15, 0] });
  const climber = Math.floor(N * 0.06);
  for (let i = 0; i < N; i++) {
    if (i < climber) b.put(i, 0.5 + b.g() * 0.18, -1.55 + Math.abs(b.g()) * 0.05, b.g() * 0.12, COL.ember, 0.32, 0.05);
    else floorDust(b, i, 0.17);
  }
  return b;
}

function emberBase(N, seed, extra) {
  const b = new B(N, seed, { k: 2.2, damp: 0.55, wobble: 0.004, rx: 0.14, ry: -0.42, fit: 2.3, flicker: 0.45,
    cam: [0, 0.5, 8], look: [0, -0.15, 0] });
  const em = Math.floor(N * 0.016);
  for (let i = 0; i < N; i++) {
    if (i < em) b.blob(i, 0.35, -1.42, 0, 0.05, COL.ember, 0.6, 0.06);
    else floorDust(b, i, 0.065);
  }
  if (extra) extra(b, em);
  return b;
}
const ember = (N) => emberBase(N, 41);
const glimmer = (N) => emberBase(N, 41, (b, em) => {
  const her = Math.floor(N * 0.03);
  for (let i = em; i < em + her; i++) b.blob(i, -0.7, 1.05, -0.5, 0.06, mix(COL.pink, COL.warm, 0.5), 0.75, 0.065);
  b.flicker = 0.25;
});

function stir(N) {
  const b = new B(N, 51, { k: 3.2, damp: 0.6, wobble: 0.02, rx: 0.1, spin: [0, 0.38, 0], fit: 2.3,
    cam: [0, 0.3, 8], look: [0, -0.1, 0] });
  const em = Math.floor(N * 0.03), her = Math.floor(N * 0.03);
  for (let i = 0; i < N; i++) {
    if (i < em) b.blob(i, 0, -1.3, 0, 0.07, COL.ember, 0.75, 0.065);
    else if (i < em + her) b.blob(i, 0, 1.3, 0, 0.07, mix(COL.pink, COL.warm, 0.5), 0.8, 0.065);
    else if (b.r() < 0.82) {
      const u = b.r(), y = -1.3 + u * 2.6;
      const a = u * TAU * 2.3 + b.g() * 0.35, rad = 0.25 + 0.95 * Math.sin(Math.PI * u) + b.g() * 0.08;
      b.put(i, Math.cos(a) * rad, y, Math.sin(a) * rad, mix(COL.dust, COL.ember, 0.3 + u * 0.5), 0.16 + u * 0.18, 0.032);
    } else b.dust(i, 0.05);
  }
  return b;
}

/* II · Herzschlag ----------------------------------------------------- */
function heart(N) {
  const b = new B(N, 61, { k: 7, damp: 0.6, wobble: 0.015, spin: [0, 0.1, 0], fit: 2.0, bloomPulse: 0.5 });
  for (let i = 0; i < N; i++) {
    const u = b.r();
    if (u < 0.1) b.blob(i, 0, 0, 0, 0.12, COL.white, 0.45, 0.09);
    else if (u < 0.74) {
      const d = b.dir(), rad = 1.0 * Math.pow(b.r(), 1.1), t = rad / 1.0;
      const c = mix(mix(COL.warm, COL.ember, t), COL.rose, t * t * 0.7);
      b.put(i, d[0] * rad, d[1] * rad, d[2] * rad, c, 0.3, 0.045 + b.r() * 0.03);
    } else if (u < 0.95) {
      const d = b.dir(), rad = 1.4 + b.r() * 0.35;
      b.put(i, d[0] * rad, d[1] * rad, d[2] * rad, mix(COL.rose, COL.ember, b.r() * 0.5), 0.13, 0.032);
    } else b.dust(i, 0.05);
  }
  b.pulse = (t) => 1 + 0.075 * heartbeat(t);
  return b;
}

/* III · C -------------------------------------------------------------- */
function trio(N, seed, mode) {
  const b = new B(N, seed, { k: 4.5, damp: 0.65, wobble: 0.02, fit: 2.3 });
  const SH = 7;
  b.groups(4 + SH);
  const sr = rng(seed * 7);
  const SHARDS = Array.from({ length: SH }, () => {
    const a = sr() * TAU, L1 = 0.18 + sr() * 0.28, L2 = 0.14 + sr() * 0.24, w = 0.6 + sr() * 1.4;
    return { ax: Math.cos(a) * L1, ay: Math.sin(a) * L1, az: (sr() - 0.5) * 0.2,
      bx: Math.cos(a + w) * L2, by: Math.sin(a + w) * L2, bz: (sr() - 0.5) * 0.2 };
  });
  const his = Math.floor(N * 0.35), her = Math.floor(N * 0.2), c = Math.floor(N * 0.15);
  for (let i = 0; i < N; i++) {
    if (i < his) {
      b.group[i] = 1;
      if (mode === 'shards') {
        const s = i % SH;
        b.group[i] = 4 + s;
        // Splitter: unregelmässige, flache Scherben
        const sh = SHARDS[s];
        let u = b.r(), v = b.r(); if (u + v > 1) { u = 1 - u; v = 1 - v; }
        const edge = u < 0.06 || v < 0.06 || u + v > 0.94;
        b.put(i, sh.ax * u + sh.bx * v, sh.ay * u + sh.by * v, (sh.az * u + sh.bz * v) + b.g() * 0.01,
          mix(COL.ember, COL.ice, 0.2 + b.r() * 0.25), edge ? 0.5 : 0.2, edge ? 0.04 : 0.034);
      } else b.blob(i, 0, 0, 0, 0.27, mix(COL.warm, COL.ember, b.r()), 0.55, 0.055);
    } else if (i < his + her) { b.group[i] = 2; b.blob(i, 0, 0, 0, 0.19, mix(COL.pink, COL.warm, b.r() * 0.5), 0.6, 0.055); }
    else if (i < his + her + c) { b.group[i] = 3; b.blob(i, 0, 0, 0, 0.2, mix(COL.steel, COL.ice, b.r() * 0.4), 0.48, 0.05); }
    else b.dust(i, 0.06);
  }
  const dirs = Array.from({ length: SH }, () => { const a = sr() * TAU; return [Math.cos(a) * (0.5 + sr()), Math.sin(a) * (0.5 + sr()) - 0.2, (sr() - 0.5) * 0.8, 0.3 + sr()]; });
  b.centers = (t, ts, C) => {
    const set = (g, x, y, z, s = 1, a = 1) => { const o = g * 5; C[o] = x; C[o + 1] = y; C[o + 2] = z; C[o + 3] = s; C[o + 4] = a; };
    if (mode === 'arrive') {
      const e = smooth(ts / 5.5);
      set(1, 1.05, -0.1 + 0.05 * Math.sin(t * 0.8), 0);
      set(2, -0.85, 0.45 + 0.04 * Math.sin(t * 0.9), 0);
      set(3, -3.2 + 1.7 * e, 0.95 - 0.35 * e, -1.2 + 1.0 * e);
    } else {
      const mid = mode === 'shards' ? [-1.25, 0.6, -0.9] : [-0.95, 0.45, 0];
      const a = t * 0.6, rr = mode === 'shards' ? 0.36 : 0.42;
      set(2, mid[0] + Math.cos(a) * rr, mid[1] + Math.sin(a) * 0.1, mid[2] + Math.sin(a) * 0.3, mode === 'shards' ? 0.85 : 1, mode === 'shards' ? 0.6 : 1);
      set(3, mid[0] - Math.cos(a) * rr, mid[1] - Math.sin(a) * 0.1, mid[2] - Math.sin(a) * 0.3, mode === 'shards' ? 0.85 : 1, mode === 'shards' ? 0.6 : 1);
      const hx = 1.2, hy = -0.3;
      set(1, hx, hy, 0.2, 1, 0.6);
      if (mode === 'shards') {
        const spread = 0.08 + 0.36 * (1 - Math.exp(-ts * 0.3));
        for (let s = 0; s < SH; s++) {
          const d = dirs[s];
          // die Scherben treiben auseinander und sinken langsam
          set(4 + s, hx + d[0] * spread + 0.02 * Math.sin(t * 1.3 + s), hy + d[1] * spread - Math.min(0.5, ts * 0.025 * d[3]), 0.2 + d[2] * spread, 1, 0.9);
        }
      }
    }
  };
  return b;
}

/* IV · Die schwere Zeit ---------------------------------------------- */
function shelterShape(N, seed, mode) {
  const b = new B(N, seed, { k: 4.5, damp: 0.7, wobble: 0.015, fit: 2.2 }).groups(2);
  const her = Math.floor(N * 0.08);
  const shellN = mode === 'fragile' ? 0 : Math.floor(N * (mode === 'big' ? 0.66 : 0.6));
  const R = mode === 'big' ? 1.7 : 1.2;
  for (let i = 0; i < N; i++) {
    if (i < her) {
      b.group[i] = 1;
      b.blob(i, 0, 0, 0, mode === 'big' ? 0.16 : 0.12, mix(COL.pink, COL.warm, 0.35 + b.r() * 0.4), mode === 'fragile' ? 0.55 : 0.78, 0.055);
    } else if (i < her + shellN) {
      const k = i - her, M = shellN;
      const y = 1 - (k + 0.5) / M * 2, rr = Math.sqrt(1 - y * y), th = k * 2.39996;
      const j = 1 + b.g() * 0.025;
      let c = mix(COL.ember, COL.gold, b.r()), a = mode === 'big' ? 0.42 : 0.3;
      if (mode === 'big' && b.r() < 0.12) c = mix(c, b.r() < 0.5 ? COL.rose : COL.sky, 0.5);
      b.put(i, Math.cos(th) * rr * R * j, y * R * j, Math.sin(th) * rr * R * j, c, a, 0.036 + b.r() * 0.014);
    } else if (mode === 'big' && b.r() < 0.35) {
      const a = b.r() * TAU, rr = 2.25 + b.g() * 0.06;
      b.put(i, Math.cos(a) * rr, b.g() * 0.03, Math.sin(a) * rr, mix(COL.gold, COL.pink, b.r() * 0.4), 0.2, 0.03);
    } else b.dust(i, mode === 'fragile' ? 0.09 : 0.05, 3.2, mode === 'fragile' ? mix(COL.dust, COL.ember, 0.3) : COL.dust);
  }
  if (mode !== 'fragile') { b.spin = [0, 0.22, 0]; b.rx = 0.25; }
  if (mode === 'big') b.pulse = (t) => 1 + 0.02 * Math.sin(t * 0.8);
  b.centers = (t, ts, C) => {
    const tremble = mode === 'fragile' ? 0.018 : 0.004;
    C[5] = Math.sin(t * 13.1) * tremble; C[6] = Math.sin(t * 11.3 + 1) * tremble; C[7] = 0;
    C[8] = 1; C[9] = 1;
  };
  return b;
}

/* V · Karte ------------------------------------------------------------ */
const bez = (p0, p1, p2, p3, t) => {
  const u = 1 - t;
  return [
    u * u * u * p0[0] + 3 * u * u * t * p1[0] + 3 * u * t * t * p2[0] + t * t * t * p3[0],
    u * u * u * p0[1] + 3 * u * u * t * p1[1] + 3 * u * t * t * p2[1] + t * t * t * p3[1],
  ];
};
function pathSampler(segs) {
  // gleichmässig entlang der Kurve verteilen
  const pts = [];
  for (const s of segs) for (let k = 0; k <= 60; k++) pts.push(bez(s[0], s[1], s[2], s[3], k / 60));
  const L = [0];
  for (let k = 1; k < pts.length; k++) L.push(L[k - 1] + Math.hypot(pts[k][0] - pts[k - 1][0], pts[k][1] - pts[k - 1][1]));
  const total = L[L.length - 1];
  return (u) => {
    const d = u * total;
    let lo = 0, hi = L.length - 1;
    while (hi - lo > 1) { const m = (lo + hi) >> 1; if (L[m] < d) lo = m; else hi = m; }
    const f = (d - L[lo]) / ((L[hi] - L[lo]) || 1);
    return [pts[lo][0] + (pts[hi][0] - pts[lo][0]) * f, pts[lo][1] + (pts[hi][1] - pts[lo][1]) * f];
  };
}
const M = (x, y) => [(x - 168) / 62, -(y - 175) / 62];
export const MAP_TIMES = [0.9, 1.9, 2.9, 3.9, 4.8];
const TOWNS = [[49, 208], [147, 58], [257, 120], [108, 220], [118, 289]].map(([x, y]) => M(x, y));
const ROUTE = pathSampler([
  [[49, 208], [58, 140], [100, 70], [147, 58]],
  [[147, 58], [200, 46], [252, 80], [257, 120]],
  [[257, 120], [262, 168], [176, 192], [108, 220]],
  [[108, 220], [84, 230], [96, 280], [118, 289]],
].map((s) => s.map(([x, y]) => M(x, y))));
const RHINE = pathSampler([
  [[262, 118], [220, 122], [175, 116], [153, 120]],
  [[153, 120], [120, 124], [92, 90], [78, 95]],
  [[78, 95], [66, 100], [72, 160], [55, 176]],
  [[55, 176], [38, 180], [20, 180], [2, 182]],
].map((s) => s.map(([x, y]) => M(x, y))));
const LAKE = M(300, 104);

function map(N) {
  const b = new B(N, 71, { k: 5, damp: 0.75, wobble: 0.006, rx: -0.9, fit: 2.75 });
  const route = Math.floor(N * 0.28), towns = Math.floor(N * 0.08), lake = Math.floor(N * 0.06), rhine = Math.floor(N * 0.04);
  const kind = new Uint8Array(N), param = new Float32Array(N);
  for (let i = 0; i < N; i++) {
    if (i < route) {
      const u = i / route, p = ROUTE(u);
      b.put(i, p[0] + b.g() * 0.012, p[1] + b.g() * 0.012, b.g() * 0.01, mix(COL.gold, COL.ember, b.r() * 0.5), 0.85, 0.045);
      kind[i] = 1; param[i] = u;
    } else if (i < route + towns) {
      const k = (i - route) % 5, T = TOWNS[k];
      const ring = b.r() < 0.35;
      if (ring) {
        const a = b.r() * TAU, rr = 0.15 + b.g() * 0.01;
        b.put(i, T[0] + Math.cos(a) * rr, T[1] + Math.sin(a) * rr, 0.01, COL.ember, 0.28, 0.026);
      } else b.blob(i, T[0], T[1], 0.02, 0.035, COL.white, 0.95, 0.07);
      kind[i] = 2; param[i] = k;
    } else if (i < route + towns + lake) {
      const a = b.r() * TAU, rr = Math.sqrt(b.r());
      const ex = Math.cos(a) * rr * 46 / 62, ey = Math.sin(a) * rr * 24 / 62, rot = 22 * Math.PI / 180;
      b.put(i, LAKE[0] + ex * Math.cos(rot) - ey * Math.sin(rot), LAKE[1] + ex * Math.sin(rot) + ey * Math.cos(rot), 0,
        mix(COL.sky, COL.ice, b.r() * 0.4), 0.17, 0.032);
      kind[i] = 3;
    } else if (i < route + towns + lake + rhine) {
      const u = b.r();
      if ((u * 60) % 1 > 0.55) { b.hide(i); continue; } // gestrichelt
      const p = RHINE(u);
      b.put(i, p[0], p[1], 0, COL.sky, 0.33, 0.024);
      kind[i] = 3;
    } else {
      // Landschaft: feines Höhenraster
      const x = (b.r() - 0.5) * 7, y = (b.r() - 0.5) * 6.4;
      const h = 0.08 * Math.sin(x * 1.3 + 0.4) * Math.cos(y * 1.1) + 0.05 * Math.sin(x * 3.1 + y * 2.3);
      const fade = Math.max(0, 1 - Math.hypot(x / 3.6, y / 3.3));
      b.put(i, x, y, h - 0.05, mix(COL.dust, COL.sky, 0.3), 0.11 * fade, 0.022);
      kind[i] = 4;
    }
  }
  b.reveal = (i, ts) => {
    const k = kind[i];
    if (k === 1) {
      const prog = smooth((ts - 0.8) / 4.2) * 1.02;
      const d = prog - param[i];
      return d < 0 ? 0 : d < 0.025 ? 1.7 : 1;
    }
    if (k === 2) return smooth((ts - MAP_TIMES[param[i]]) / 0.6);
    if (k === 3) return smooth((ts - 0.3) / 2.5);
    return 1;
  };
  b.labels = [...TOWNS.map((T) => [T[0], T[1], 0]), [LAKE[0] - 0.05, LAKE[1] + 0.48, 0], [(112 - 168) / 62, -(128 - 175) / 62, 0]];
  return b;
}

/* VI · Aliyah ---------------------------------------------------------- */
function twin(N, ring) {
  const TRAIL = 26;
  const b = new B(N, 81, { k: 7, damp: 0.7, wobble: 0.01, fit: 2.2 }).groups(3 + TRAIL);
  const fab = Math.floor(N * 0.26), aliN = Math.floor(N * 0.09), trail = Math.floor(N * 0.12), ringN = ring ? Math.floor(N * 0.22) : 0;
  for (let i = 0; i < N; i++) {
    if (i < fab) { b.group[i] = 1; b.blob(i, 0, 0, 0, 0.3, mix(COL.warm, COL.rose, b.r() * 0.6), 0.55, 0.055); }
    else if (i < fab + aliN) { b.group[i] = 2; b.blob(i, 0, 0, 0, 0.12, mix(COL.white, b.r() < 0.5 ? COL.pink : COL.sky, 0.45), 0.8, 0.055); }
    else if (i < fab + aliN + trail) {
      const k = (i - fab - aliN) % TRAIL;
      b.group[i] = 3 + k;
      const fade = 1 - k / TRAIL;
      b.blob(i, 0, 0, 0, 0.04 + k * 0.004, mix(COL.pink, COL.sky, k / TRAIL), 0.55 * fade * fade, 0.035);
    } else if (i < fab + aliN + trail + ringN) {
      const a = b.r() * TAU, rr = 1.75 + b.g() * 0.04;
      b.put(i, Math.cos(a) * rr - 0.15, Math.sin(a) * rr * 0.42 + 0.1, Math.sin(a) * 0.5, mix(COL.gold, COL.ember, b.r() * 0.5), 0.3, 0.032);
    } else b.dust(i, ring ? 0.07 : 0.05, 3.2, ring ? mix(COL.dust, COL.gold, 0.4) : COL.dust);
  }
  const ali = (t) => [
    -0.15 + Math.cos(t * 1.25) * 1.0,
    0.12 + 0.28 * Math.sin(t * 2.1) + 0.32 * Math.abs(Math.sin(t * 3.3)),
    Math.sin(t * 1.25) * 0.7,
  ];
  b.centers = (t, ts, C) => {
    const set = (g, p, s = 1, a = 1) => { const o = g * 5; C[o] = p[0]; C[o + 1] = p[1]; C[o + 2] = p[2]; C[o + 3] = s; C[o + 4] = a; };
    set(1, [-0.15 + 0.08 * Math.sin(t * 0.5), 0.05 * Math.sin(t * 0.7), 0], 1 + 0.03 * Math.sin(t * 1.1));
    set(2, ali(t));
    for (let k = 0; k < TRAIL; k++) set(3 + k, ali(t - (k + 1) * 0.045));
  };
  if (ring) b.spin = [0, 0, 0];
  return b;
}

/* VII · Ehrlich -------------------------------------------------------- */
// Zwei Lichter, dazwischen ein feiner Vorhang, den er nicht durchbricht.
function veil(N, restless) {
  const b = new B(N, 91, { k: 5, damp: 0.75, wobble: 0.006, fit: 2.1, ry: -0.35,
    wave: { amp: restless ? 0.14 : 0.05, speed: restless ? 1.6 : 0.7, axis: 'x' } }).groups(3);
  const her = Math.floor(N * 0.12), his = Math.floor(N * 0.1), cur = Math.floor(N * 0.55);
  b.waveMask = new Uint8Array(N);
  for (let i = 0; i < N; i++) {
    if (i < her) { b.group[i] = 1; b.blob(i, 0, 0, 0, 0.2, mix(COL.pink, COL.warm, 0.3 + b.r() * 0.4), 0.42, 0.05); }
    else if (i < her + his) { b.group[i] = 2; b.blob(i, 0, 0, 0, 0.16, mix(COL.ember, COL.warm, b.r() * 0.5), 0.5, 0.05); }
    else if (i < her + his + cur) {
      const y = (b.r() - 0.5) * 3.2, z = (b.r() - 0.5) * 2.6;
      const edge = clamp(1 - Math.abs(y) / 1.6) * clamp(1 - Math.abs(z) / 1.3);
      // feine senkrechte Fäden
      const strand = Math.round(z * 14) / 14;
      b.put(i, b.g() * 0.012, y, strand + b.g() * 0.006, mix(COL.ice, COL.sky, b.r() * 0.5), 0.5 * Math.sqrt(edge) + 0.04, 0.026);
      b.waveMask[i] = 1;
    } else b.dust(i, 0.045);
  }
  b.centers = (t, ts, C) => {
    const set = (g, x, y, z, s = 1, a = 1) => { const o = g * 5; C[o] = x; C[o + 1] = y; C[o + 2] = z; C[o + 3] = s; C[o + 4] = a; };
    set(1, -1.15, 0.2 + 0.05 * Math.sin(t * 0.6), 0, 1, restless ? 0.8 : 1);
    if (restless) {
      // er sucht, rät, kommt nah und weicht zurück
      set(2, 0.72 + 0.34 * Math.sin(t * 1.25) + 0.08 * Math.sin(t * 3.3), -0.05 + 0.35 * Math.sin(t * 0.85), 0.25 * Math.sin(t * 0.6), 0.9);
    } else set(2, 1.15, -0.1 + 0.05 * Math.sin(t * 0.7), 0);
  };
  return b;
}

/* VIII · Du ------------------------------------------------------------ */
function galaxy(N, mode) {
  const b = new B(N, 101, { k: 4, damp: 0.75, wobble: 0.008, fit: 2.4, touch: 1.8 });
  b.rx = mode === 'calm' ? -1.32 : mode === 'glow' ? -0.42 : -1.02;
  b.spin = [0, 0, mode === 'calm' ? -0.05 : -0.09];
  const baseY = mode === 'calm' ? -0.55 : 0;
  const bright = mode === 'glow' ? 1.3 : 1;
  for (let i = 0; i < N; i++) {
    const u = b.r();
    if (u < 0.1) {
      b.put(i, b.g() * 0.18, b.g() * 0.18 + baseY, b.g() * 0.1, mix(COL.white, COL.gold, b.r()), 0.8 * bright, 0.07);
    } else if (u < 0.86) {
      const arm = i & 1;
      const r = 0.15 + 2.25 * Math.pow(b.r(), 0.85);
      const a = arm * Math.PI + r * 2.35 + b.g() * 0.32 / (r + 0.35);
      const t = r / 2.4;
      let c = mix(COL.warm, arm ? COL.sky : COL.rose, smooth(t * 1.5));
      if (b.r() < 0.08) c = COL.white;
      b.put(i, Math.cos(a) * r, Math.sin(a) * r + baseY, b.g() * 0.07 * (1 - t), c, (0.5 - t * 0.2) * bright, 0.035 + b.r() * 0.035);
    } else {
      const d = b.dir(), r = 2.4 + b.r() * 1.4;
      b.put(i, d[0] * r, d[1] * r * 0.5 + baseY, d[2] * 0.3, mix(COL.white, b.r() < 0.5 ? COL.pink : COL.sky, 0.4), 0.12, 0.025);
    }
  }
  if (mode === 'glow') b.pulse = (t) => 1 + 0.018 * Math.sin(t * 1.6);
  return b;
}

/* IX · Mein Kopf ------------------------------------------------------- */
function knot(N, calm) {
  const b = new B(N, 111, { k: calm ? 2.6 : 5, damp: 0.7, wobble: calm ? 0.006 : 0.02, fit: 2.1 });
  const P = 3, Q = 7;
  for (let i = 0; i < N; i++) {
    if (i < N * 0.8) {
      const phi = (i / (N * 0.8)) * TAU;
      let x, y, z;
      if (calm) {
        const R = 1.35;
        x = Math.cos(phi) * R; y = Math.sin(phi) * R; z = 0;
      } else {
        const r = 1.0 + 0.42 * Math.cos(Q * phi);
        x = r * Math.cos(P * phi); y = r * Math.sin(P * phi); z = 0.55 * Math.sin(Q * phi);
      }
      const sd = calm ? 0.05 : 0.045;
      const c = calm ? mix(COL.gold, COL.ember, b.r()) : mix(COL.lav, b.r() < 0.5 ? COL.rose : COL.sky, b.r() * 0.5);
      b.put(i, x + b.g() * sd, y + b.g() * sd, z + b.g() * sd, c, 0.42, 0.032 + b.r() * 0.012);
    } else b.dust(i, calm ? 0.05 : 0.09, 3, calm ? COL.dust : COL.lav);
  }
  if (calm) { b.rx = 0.9; b.spin = [0, 0, 0.12]; }
  else {
    b.rot = (t) => [Math.sin(t * 0.37) * 1.1, t * 0.45 + Math.sin(t * 0.93) * 0.9, Math.sin(t * 0.23) * 0.6];
  }
  return b;
}

/* X · Abschied --------------------------------------------------------- */
function heavy(N, mode) {
  const b = new B(N, 121, { k: 3.5, damp: 0.7, wobble: 0.01, fit: 2.2 }).groups(4).frees();
  b.flow = { v: [0, -0.12, 0], turb: 0.05, respawn: 'top', drag: 1.2 };
  const core = Math.floor(N * (mode === 'heavy' ? 0.5 : 0.3)), echo = mode === 'whatif' ? Math.floor(N * 0.12) : 0;
  for (let i = 0; i < N; i++) {
    if (i < core) {
      b.group[i] = 1;
      b.put(i, b.g() * 0.42, b.g() * 0.2, b.g() * 0.42, mix(COL.ember, COL.warm, b.r() * 0.5), mode === 'heavy' ? 0.32 : 0.5, 0.045);
    } else if (i < core + echo * 2) {
      b.group[i] = i < core + echo ? 2 : 3;
      b.blob(i, 0, 0, 0, 0.25, mix(COL.ember, b.group[i] === 2 ? COL.pink : COL.sky, 0.4), 0.2, 0.045);
    } else { b.free[i] = 1; b.dust(i, 0.09, 3); }
  }
  b.centers = (t, ts, C) => {
    const set = (g, x, y, z, s = 1, a = 1) => { const o = g * 5; C[o] = x; C[o + 1] = y; C[o + 2] = z; C[o + 3] = s; C[o + 4] = a; };
    if (mode === 'heavy') set(1, 0, -0.85 + 0.04 * Math.sin(t * 0.5), 0, 1 + 0.02 * Math.sin(t * 0.6));
    else {
      set(1, 0, -0.25 + 0.05 * Math.sin(t * 0.6), 0, 0.85);
      const o = 0.95 + 0.18 * Math.sin(t * 0.7);
      set(2, -o, -0.1 + 0.08 * Math.sin(t * 0.9), -0.3, 0.8 + 0.15 * Math.sin(t * 1.1), 0.7 + 0.3 * Math.sin(t * 0.7));
      set(3, o, -0.1 + 0.08 * Math.sin(t * 0.9 + 2), -0.3, 0.8 + 0.15 * Math.sin(t * 1.1 + 2), 0.7 - 0.3 * Math.sin(t * 0.7));
    }
  };
  return b;
}

function days(N) {
  const b = new B(N, 131, { k: 4.5, damp: 0.75, wobble: 0.008, rx: 0.3, spin: [0, 0, 0.035], fit: 2.1 });
  const D = 28, lights = Math.floor(N * 0.5), core = Math.floor(N * 0.05), path = Math.floor(N * 0.1);
  const day = new Int16Array(N).fill(-1);
  for (let i = 0; i < N; i++) {
    if (i < lights) {
      const d = i % D, a = Math.PI / 2 - (d / D) * TAU, R = 1.6;
      const t = d / (D - 1);
      b.blob(i, Math.cos(a) * R, Math.sin(a) * R, 0, 0.045, mix(mix(COL.warm, COL.ember, 0.3), COL.sky, t), 0.75 - t * 0.45, 0.05);
      day[i] = d;
    } else if (i < lights + core) b.blob(i, 0, 0, 0, 0.09, COL.ember, 0.55, 0.06);
    else if (i < lights + core + path) {
      const a = b.r() * TAU;
      b.put(i, Math.cos(a) * 1.6, Math.sin(a) * 1.6, 0, COL.dust, 0.09, 0.022);
    } else b.dust(i, 0.04);
  }
  b.reveal = (i, ts) => (day[i] < 0 ? 1 : smooth((ts - 0.4 - day[i] * 0.17) / 0.5));
  return b;
}

function feelings(N, mode) {
  const b = new B(N, 141, { k: 4.5, damp: 0.75, wobble: 0.012, fit: 2.1 }).frees();
  b.flow = { v: [0.05, mode === 'far' ? 0.42 : 0.26, -0.08], turb: 0.22, drag: 0.8, fadeTop: 3.1 };
  if (mode !== 'together') b.burst = 0.25;
  const core = Math.floor(N * 0.72);
  for (let i = 0; i < N; i++) {
    if (i < core) {
      const isFeeling = (i % 5) < 2;
      if (isFeeling) {
        const d = b.dir(), r = 0.78 * Math.pow(b.r(), 0.7);
        b.put(i, d[0] * r, d[1] * r, d[2] * r, mix(COL.rose, COL.pink, b.r()), 0.42, 0.05);
        if (mode !== 'together') b.free[i] = 1;
      } else {
        const R = mode === 'together' ? 0.78 : mode === 'far' ? 0.42 : 0.52;
        const d = b.dir(), r = R * Math.pow(b.r(), 0.45);
        b.put(i, d[0] * r, d[1] * r, d[2] * r, mix(COL.white, COL.sky, 0.35 + b.r() * 0.5), mode === 'far' ? 0.42 : 0.3, 0.045);
      }
    } else b.dust(i, 0.05);
  }
  return b;
}

function rain(N, level) {
  const b = new B(N, 151 + level, { k: 3.5, damp: 0.75, wobble: 0.006, fit: 2.2, flicker: level === 4 ? 0 : 0.12, streak: true }).groups(2).frees();
  const L = Math.min(level, 3);
  b.flow = { v: [-0.12, -(1.5 + L * 0.7), 0], turb: 0.03, drag: 2.5, respawn: 'rain' };
  const light = Math.floor(N * 0.06);
  const frac = [0.1, 0.33, 0.58, 0.85, 0][level];
  const alpha = [0.85, 0.6, 0.42, 0.26, 0.3][level];
  for (let i = 0; i < N; i++) {
    if (i < light) { b.group[i] = 1; b.blob(i, 0, 0, 0, 0.1, mix(COL.white, COL.sky, 0.45), alpha, 0.06); }
    else if (b.r() < frac) {
      b.free[i] = 1;
      b.put(i, (b.r() - 0.5) * 7, (b.r() - 0.5) * 6, (b.r() - 0.7) * 4, mix(COL.sky, COL.ice, b.r()), 0.6, 0.15);
    } else if (level === 4) {
      b.put(i, b.g() * 1.6, -1.7 + Math.abs(b.g()) * 0.01, b.g() * 0.8, mix(COL.steel, COL.sky, b.r() * 0.5), 0.1, 0.024);
    } else b.put(i, b.g() * 1.6, -1.7, b.g() * 0.8, COL.steel, 0.045, 0.022);
  }
  b.centers = (t, ts, C) => {
    const s = [1, 0.85, 0.72, 0.58, 0.6][level];
    C[5] = 0; C[6] = 1.2 + 0.03 * Math.sin(t * 0.7); C[7] = -0.4; C[8] = s; C[9] = 1;
  };
  return b;
}

function moments(N, warm) {
  const b = new B(N, 161, { k: 3, damp: 0.75, wobble: 0.01, fit: 2.2, burst: 0.9 }).frees();
  b.flow = { v: [0, 0.03, warm ? 0.32 : 0.24], turb: 0.06, drag: 0.6, respawn: 'back', fadeNear: 5.2 };
  const bok = Math.floor(N * 0.07), glit = Math.floor(N * 0.26), core = warm ? Math.floor(N * 0.05) : 0;
  const pal = warm ? [COL.gold, COL.ember, COL.pink, COL.warm, COL.sky] : [COL.gold, COL.pink, COL.sky, COL.warm];
  for (let i = 0; i < N; i++) {
    if (i < bok) {
      b.free[i] = 1;
      b.put(i, (b.r() - 0.5) * 9, (b.r() - 0.5) * 6, -6 + b.r() * 10, pal[i % pal.length], (warm ? 0.2 : 0.16) + b.r() * 0.08, 0.14 + b.r() * 0.2);
    } else if (i < bok + glit) {
      b.free[i] = 1;
      b.put(i, (b.r() - 0.5) * 9, (b.r() - 0.5) * 6, -6 + b.r() * 10, pal[i % pal.length], 0.3, 0.024);
    } else if (i < bok + glit + core) b.blob(i, 0, 0.1, 0, 0.14, mix(COL.warm, COL.ember, b.r() * 0.6), 0.7, 0.06);
    else b.hide(i);
  }
  return b;
}

function growth(N, bloom) {
  const b = new B(N, 171, { k: 3.6, damp: 0.75, wobble: 0.006, fit: 2.1, rx: -0.15 });
  const head = bloom ? Math.floor(N * 0.55) : 0, stem = Math.floor(N * 0.05), bud = Math.floor(N * 0.025), leaves = Math.floor(N * 0.05);
  const idx = new Float32Array(N).fill(-1);
  const top = bloom ? 0.35 : -1.15, bottom = -2.25;
  for (let i = 0; i < N; i++) {
    if (i < head) {
      const k = i, M = head;
      const th = k * 2.399963, t0 = Math.sqrt(k / M);
      // sieben Blütenblätter: der Rand wölbt sich nach aussen
      const petal = Math.pow(Math.abs(Math.cos(th * 3.5)), 1.6);
      const t = t0 * (t0 > 0.32 ? 0.78 + 0.22 * petal : 1);
      const r = 1.5 * t;
      let c = mix(COL.gold, COL.warm, 0.3);
      c = mix(c, COL.ember, smooth((t0 - 0.12) * 4));
      c = mix(c, mix(COL.rose, COL.ember, 0.5), smooth((t0 - 0.38) * 2.6));
      if (t0 > 0.75 && k % 4 === 0) c = mix(c, COL.pink, 0.6);
      b.put(i, Math.cos(th) * r, top + Math.sin(th) * r, -r * r * 0.22, c, (t0 < 0.3 ? 0.9 : 0.68) * (0.85 + petal * 0.3), 0.03 + t * 0.03);
      idx[i] = k / M;
    } else if (i < head + stem) {
      const u = b.r(), y = bottom + (top - (bloom ? 1.0 : 0) - bottom) * u;
      b.put(i, Math.sin(u * 3) * 0.08 + b.g() * 0.01, y, b.g() * 0.01, mix(COL.sprout, COL.gold, u), 0.35, 0.03);
    } else if (i < head + stem + bud) b.blob(i, 0, top + (bloom ? 0 : 0.05), 0.02, bloom ? 0.16 : 0.05, bloom ? COL.gold : COL.warm, bloom ? 0.55 : 0.85, 0.06);
    else if (i < head + stem + bud + leaves) {
      const side = i & 1 ? 1 : -1, u = b.r(), w = Math.sin(u * Math.PI) * 0.12;
      const y0 = bottom + 0.55 + (bloom ? 0.35 : 0);
      b.put(i, side * (0.06 + u * 0.55) * (bloom ? 1 : 0.55), y0 + u * 0.35 * (bloom ? 1 : 0.6) + b.g() * w * 0.4, b.g() * 0.02,
        mix(COL.sprout, COL.gold, 0.3), 0.3, 0.028);
    } else b.dust(i, 0.05, 3, mix(COL.dust, COL.gold, 0.3));
  }
  if (bloom) {
    b.reveal = (i, ts) => (idx[i] < 0 ? 1 : clamp((smooth((ts - 0.2) / 6) * 1.05 - idx[i]) / 0.05));
  }
  return b;
}

/* Finale: Pusteblume --------------------------------------------------- */
function dandelion(N) {
  const b = new B(N, 181, { k: 6, damp: 0.75, wobble: 0.004, fit: 2.25, touch: 0.4 });
  const SEED_P = 20;
  const S = Math.max(90, Math.min(320, Math.floor((N * 0.55) / SEED_P)));
  b.groups(3 + S);
  const H = [0, 0.55, 0], r0 = 0.15, r1 = 0.95;
  const stem = Math.floor(N * 0.04), core = Math.floor(N * 0.025);
  const dirs = [];
  for (let s = 0; s < S; s++) {
    const y = 1 - (s + 0.5) / S * 2, rr = Math.sqrt(1 - y * y), th = s * 2.399963;
    dirs.push([Math.cos(th) * rr, y, Math.sin(th) * rr]);
  }
  let i = 0;
  for (; i < stem; i++) {
    b.group[i] = 1;
    const u = b.r(), y = -2.7 + (H[1] - r0 - -2.7) * u;
    b.put(i, Math.sin(u * 2.2) * 0.12 * (1 - u) + b.g() * 0.008, y, b.g() * 0.008, mix(COL.sprout, COL.warm, u * 0.5), 0.3, 0.028);
  }
  for (; i < stem + core; i++) { b.group[i] = 1; b.blob(i, H[0], H[1], H[2], 0.07, mix(COL.gold, COL.ember, b.r() * 0.4), 0.65, 0.05); }
  const seedStart = i;
  for (let s = 0; s < S; s++) {
    const d = dirs[s];
    const tint = s % 3 === 0 ? COL.pink : s % 3 === 1 ? COL.sky : COL.white;
    // senkrechte Hilfsachsen für den Schirm
    const ax = Math.abs(d[1]) < 0.9 ? [0, 1, 0] : [1, 0, 0];
    let ux = d[1] * ax[2] - d[2] * ax[1], uy = d[2] * ax[0] - d[0] * ax[2], uz = d[0] * ax[1] - d[1] * ax[0];
    const ul = Math.hypot(ux, uy, uz); ux /= ul; uy /= ul; uz /= ul;
    const vx = d[1] * uz - d[2] * uy, vy = d[2] * ux - d[0] * uz, vz = d[0] * uy - d[1] * ux;
    for (let k = 0; k < SEED_P && i < N; k++, i++) {
      b.group[i] = 3 + s;
      if (k < 8) {
        const f = (k + 0.5) / 8 * (r1 - r0);
        b.put(i, d[0] * f, d[1] * f, d[2] * f, mix(COL.white, COL.warm, 0.4), 0.22, 0.02);
      } else {
        const a = (k - 8) / (SEED_P - 8) * TAU, L = 0.06 + b.r() * 0.08;
        const ox = Math.cos(a) * ux + Math.sin(a) * vx, oy = Math.cos(a) * uy + Math.sin(a) * vy, oz = Math.cos(a) * uz + Math.sin(a) * vz;
        const f = r1 - r0 + 0.02;
        b.put(i, d[0] * (f + L * 0.55) + ox * L, d[1] * (f + L * 0.55) + oy * L, d[2] * (f + L * 0.55) + oz * L,
          mix(COL.white, tint, 0.3), 0.5, 0.03);
      }
    }
  }
  for (; i < N; i++) { b.group[i] = 2; b.dust(i, 0.05, 4.2, mix(COL.white, COL.sky, 0.3)); b.size[i] = 0.03; }

  // Zustand der Samen
  const st = {
    att: new Uint8Array(S).fill(1),
    p: new Float32Array(S * 3), v: new Float32Array(S * 3),
    order: dirs.map((d, s) => [s, d[2] + d[0] * 0.3 + Math.random() * 0.35]).sort((a, c) => c[1] - a[1]).map((x) => x[0]),
    released: 0, wind: 0, light: 0, bald: 0, auto: 0,
  };
  const W = [0.38, 0.5, -1];
  b.seedCount = S;
  b.blowing = false;
  b.releasedFraction = () => st.released / S;
  b.newLight = () => { st.light = 0.0001; };
  b.autoBreeze = () => { st.auto = 1; };
  const releaseOne = () => {
    if (st.released >= S) return;
    const s = st.order[st.released++];
    st.att[s] = 0;
    const d = dirs[s], o = s * 3;
    st.p[o] = H[0] + d[0] * r0; st.p[o + 1] = H[1] + d[1] * r0; st.p[o + 2] = H[2] + d[2] * r0;
    const sp = 0.6 + Math.random() * 0.8;
    st.v[o] = d[0] * 0.5 + W[0] * sp; st.v[o + 1] = d[1] * 0.5 + W[1] * sp; st.v[o + 2] = d[2] * 0.5 + W[2] * sp;
  };
  b.puff = (n) => { for (let k = 0; k < n; k++) releaseOne(); };
  let acc = 0;
  b.centers = (t, ts, C, dt) => {
    const set = (g, x, y, z, s = 1, a = 1) => { const o = g * 5; C[o] = x; C[o + 1] = y; C[o + 2] = z; C[o + 3] = s; C[o + 4] = a; };
    const target = b.blowing ? 1 : st.auto ? 0.35 : 0;
    st.wind += (target - st.wind) * Math.min(1, dt * (b.blowing ? 2.2 : 0.8));
    // beim Pusten lösen sich nach und nach Samen
    acc += dt * st.wind * S * 0.3;
    while (acc >= 1) { acc -= 1; releaseOne(); }
    if (st.released / S > 0.85) st.bald = Math.min(1, st.bald + dt * 0.25);
    const sway = Math.sin(t * 0.9) * 0.02 + st.wind * 0.06;
    set(1, sway * 0.4, 0, 0, 1, 1 - st.bald * 0.85);
    if (st.light > 0) st.light = Math.min(1, st.light + dt / 6);
    const L = smooth(st.light);
    set(2, 0, 2.0 * L, 0, 1 - 0.975 * L, 1 + L * 9);
    for (let s = 0; s < S; s++) {
      const o = s * 3, g = 3 + s, d = dirs[s];
      if (st.att[s]) {
        set(g, H[0] + d[0] * r0 + sway * (0.5 + d[1] * 0.5), H[1] + d[1] * r0, H[2] + d[2] * r0);
      } else {
        const v = st.v;
        v[o] += (W[0] * st.wind * 0.6 + Math.sin(t * 0.7 + s) * 0.12) * dt;
        v[o + 1] += (0.16 + Math.sin(t * 0.9 + s * 1.7) * 0.1) * dt;
        v[o + 2] += (W[2] * st.wind * 0.4) * dt;
        const drag = Math.exp(-0.55 * dt);
        v[o] *= drag; v[o + 1] *= drag; v[o + 2] *= drag;
        st.p[o] += v[o] * dt; st.p[o + 1] += v[o + 1] * dt; st.p[o + 2] += v[o + 2] * dt;
        const far = clamp(1 - (st.p[o + 1] - 3.2) / 2.5) * clamp(1 + (st.p[o + 2] + 7) / 6);
        set(g, st.p[o], st.p[o + 1], st.p[o + 2], 1, far);
      }
    }
  };
  b.labels = null;
  return b;
}

export const SHAPES = {
  nebula, steps, collapse, ember, glimmer, stir, heart,
  three: (N) => trio(N, 91, 'arrive'),
  gaze: (N) => trio(N, 92, 'gaze'),
  shards: (N) => trio(N, 93, 'shards'),
  fragile: (N) => shelterShape(N, 201, 'fragile'),
  shelter: (N) => shelterShape(N, 202, 'shelter'),
  shelterBig: (N) => shelterShape(N, 203, 'big'),
  map,
  twin: (N) => twin(N, false),
  twinRing: (N) => twin(N, true),
  water: (N) => veil(N, false),
  waterRough: (N) => veil(N, true),
  galaxy: (N) => galaxy(N, 'open'),
  galaxyCalm: (N) => galaxy(N, 'calm'),
  galaxyGlow: (N) => galaxy(N, 'glow'),
  knot: (N) => knot(N, false),
  loop: (N) => knot(N, true),
  heavy: (N) => heavy(N, 'heavy'),
  whatif: (N) => heavy(N, 'whatif'),
  days,
  together: (N) => feelings(N, 'together'),
  apart: (N) => feelings(N, 'apart'),
  apartFar: (N) => feelings(N, 'far'),
  rain0: (N) => rain(N, 0),
  rain1: (N) => rain(N, 1),
  rain2: (N) => rain(N, 2),
  rain3: (N) => rain(N, 3),
  rainStill: (N) => rain(N, 4),
  moments: (N) => moments(N, false),
  momentsWarm: (N) => moments(N, true),
  seedling: (N) => growth(N, false),
  flower: (N) => growth(N, true),
  dandelion,
};

// Formen mit eigenem Zustand werden bei jedem Aufruf neu gebaut
export const FRESH = new Set(['dandelion']);
