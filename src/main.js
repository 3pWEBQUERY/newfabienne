import { createWorld } from './world.js';
import { createSound } from './audio.js';

const reduce = matchMedia('(prefers-reduced-motion: reduce)').matches;
const small = Math.min(screen.width, screen.height) < 520 || (navigator.deviceMemory && navigator.deviceMemory <= 3);

/* ---------- Sitzung ---------- */
const store = {
  get(k) { try { return localStorage.getItem(k); } catch { return null; } },
  set(k, v) { try { localStorage.setItem(k, v); } catch {} },
};
const uuid = () => (crypto.randomUUID ? crypto.randomUUID()
  : 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, (c) => {
    const r = (Math.random() * 16) | 0; return (c === 'x' ? r : (r & 0x3) | 0x8).toString(16);
  }));
let session = store.get('nf_session');
if (!session) { session = uuid(); store.set('nf_session', session); }
const post = (url, body) => fetch(url, {
  method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body), keepalive: true,
});
post('/api/visit', { session }).catch(() => {});

/* ---------- Welt ---------- */
const noop = () => {};
let world;
try {
  world = createWorld(document.getElementById('world'), { reduce, small });
} catch (err) {
  console.warn('WebGL nicht verfügbar', err);
  document.body.classList.add('no-webgl');
  world = new Proxy({}, { get: (_, k) => (k === 'labels' ? () => null : k === 'shape' ? null : noop) });
}
const sound = createSound();

/* ---------- Text vorbereiten: Überschriften Wort für Wort ---------- */
for (const h of document.querySelectorAll('h1.line, h2.line')) {
  let n = 0;
  const wrap = (node) => {
    for (const child of [...node.childNodes]) {
      if (child.nodeType === 3) {
        const parts = child.textContent.split(/(\s+)/);
        const frag = document.createDocumentFragment();
        for (const p of parts) {
          if (!p) continue;
          if (/^\s+$/.test(p)) { frag.appendChild(document.createTextNode(p)); continue; }
          const s = document.createElement('span');
          s.className = 'w'; s.style.setProperty('--w', n++); s.textContent = p;
          frag.appendChild(s);
        }
        child.replaceWith(frag);
      } else if (child.nodeName === 'EM') {
        // Hervorhebung als Ganzes, damit der Farbverlauf bleibt
        const s = document.createElement('span');
        s.className = 'w'; s.style.setProperty('--w', n++);
        child.replaceWith(s); s.appendChild(child);
      }
    }
  };
  wrap(h);
  h.classList.add('words');
}

/* ---------- Szenen ---------- */
const scenes = [...document.querySelectorAll('.scene')];
const hint = document.getElementById('hint');
const progress = document.getElementById('progress');
const soundBtn = document.getElementById('sound');
const places = [...document.querySelectorAll('[data-place]')];
const finalScene = document.getElementById('final');
const farewell = document.getElementById('farewell');
const steps = scenes.length - 1;
progress.innerHTML = '<i></i>'.repeat(steps);
const bars = [...progress.children];

const wide = () => innerWidth >= 900 && innerWidth >= innerHeight;
function layoutFor(scene) {
  const centered = scene.classList.contains('center') || scene === finalScene;
  document.body.classList.toggle('centered', centered);
  if (wide()) {
    if (centered) world.setLayout(0.5, scene === finalScene ? 0.5 : 0.3, 0.75, scene === finalScene ? 0.86 : 0.48);
    else world.setLayout(0.3, 0.5, 0.5, 0.84);
  } else if (centered) {
    world.setLayout(0.5, scene === finalScene ? 0.42 : 0.27, 1, scene === finalScene ? 0.74 : 0.42);
  } else {
    // Licht oben, Text unten; je mehr Text, desto weniger Platz
    const inner = scene.querySelector('.inner');
    const textH = inner ? inner.getBoundingClientRect().height : innerHeight * 0.5;
    const free = Math.max(0.3, Math.min(0.6, 1 - (textH + 110) / innerHeight));
    world.setLayout(0.5, 0.05 + free * 0.5, 1, Math.min(0.7, free * 1.25));
  }
}

let idx = 0, active = scenes[0], maxSeen = 0, timers = [], pending = [], hintTimer = 0, lockUntil = 0;

function clearTimers() { timers.forEach(clearTimeout); timers = []; pending = []; clearTimeout(hintTimer); }

function fire(line, quiet) {
  line.classList.add('in');
  if (line.dataset.shape) world.setShape(line.dataset.shape);
  if (line.dataset.mood) { world.setMood(line.dataset.mood); sound.mood(line.dataset.mood); applySoundFor(line.dataset.mood); }
  const cue = line.dataset.cue;
  if (cue === 'letters') world.setLetters(true);
  if (cue === 'nein') sound.low();
  if (!quiet && !line.classList.contains('chapter') && cue !== 'nein') sound.chime(line.matches('h1,h2') ? 1 : 0.7);
}

function applySoundFor(mood) {
  sound.heartbeat(mood === 'spark');
  sound.rain(mood === 'nein' ? 1 : 0);
}

function show(scene, instant) {
  clearTimers();
  if (active === finalScene && scene !== finalScene) resetFinale();
  active.classList.remove('on');
  scene.classList.add('on');
  scene.scrollTop = 0;
  active = scene;
  const i = scenes.indexOf(scene);

  // Ausgangszustand der Szene
  const lines = [...scene.querySelectorAll('.line')];
  lines.forEach((l) => l.classList.remove('in', 'instant'));
  world.setShape(scene.dataset.shape);
  world.setMood(scene.dataset.mood);
  sound.mood(scene.dataset.mood);
  applySoundFor(scene.dataset.mood);
  layoutFor(scene);
  places.forEach((p) => p.classList.remove('on'));

  bars.forEach((b, n) => b.classList.toggle('done', i > 0 && n < i));
  progress.classList.toggle('show', i > 0 && scene !== finalScene);
  if (i > maxSeen) { maxSeen = i; post('/api/progress', { session, step: i, total: steps }).catch(() => {}); }
  hint.classList.remove('show');

  // Zeilen nacheinander, Tempo nach Textlänge
  let at = instant ? 0 : 650;
  lines.forEach((line, n) => {
    at += Number(line.dataset.wait || 0);
    const job = { line, at };
    pending.push(job);
    timers.push(setTimeout(() => { fire(line); pending = pending.filter((p) => p !== job); if (!pending.length) done(scene); }, reduce ? n * 120 : at));
    const len = line.textContent.trim().length;
    at += line.classList.contains('chapter') ? 650 : Math.min(3400, 900 + len * 16);
  });
  lockUntil = performance.now() + (reduce ? 200 : 900);
  if (scene === finalScene) armFinale();
}

function done(scene) {
  if (scene !== active) return;
  if (!scene.hasAttribute('data-notap')) {
    hintTimer = setTimeout(() => { hint.textContent = 'Tippen'; hint.classList.add('show'); }, reduce ? 300 : 1800);
  }
  if (scene === finalScene) finaleReady();
}

// Erster Tipp zeigt den Rest sofort, der zweite blättert weiter
function revealAll() {
  timers.forEach(clearTimeout); timers = [];
  const rest = pending; pending = [];
  rest.forEach(({ line }, n) => { line.classList.add('instant'); fire(line, n < rest.length - 1); });
  done(active);
}

function go(d) {
  if (performance.now() < lockUntil) return;
  if (d > 0 && pending.length) { revealAll(); return; }
  const n = idx + d;
  if (n < 0 || n >= scenes.length) return;
  if (d > 0 && scenes[idx].hasAttribute('data-notap')) return;
  idx = n; show(scenes[idx]);
}

function begin(withSound) {
  if (withSound) sound.start();
  soundBtn.hidden = false;
  soundBtn.classList.toggle('off', !withSound);
  soundBtn.setAttribute('aria-label', withSound ? 'Ton aus' : 'Ton an');
  idx = 1; show(scenes[1]);
}
document.getElementById('start').addEventListener('click', (e) => { e.stopPropagation(); begin(true); });
document.getElementById('start-silent').addEventListener('click', (e) => { e.stopPropagation(); begin(false); });
soundBtn.addEventListener('click', (e) => {
  e.stopPropagation();
  const on = sound.toggle();
  if (on) { sound.mood(active.dataset.mood); applySoundFor(active.dataset.mood); }
  soundBtn.classList.toggle('off', !on);
  soundBtn.setAttribute('aria-label', on ? 'Ton aus' : 'Ton an');
});
document.addEventListener('visibilitychange', () => sound.pause(document.hidden));

/* ---------- Bedienung ---------- */
const stage = document.getElementById('stage');
let down = null, moved = false;
stage.addEventListener('pointerdown', (e) => {
  down = { x: e.clientX, y: e.clientY, t: performance.now() }; moved = false;
  world.pointerDown(e.clientX, e.clientY);
  if (active === finalScene && finale.ready) blow(true);
});
addEventListener('pointermove', (e) => {
  if (down && Math.hypot(e.clientX - down.x, e.clientY - down.y) > 12) moved = true;
  world.pointerMove(e.clientX, e.clientY, !!down || e.pointerType === 'mouse');
});
const up = (e) => {
  world.pointerUp();
  if (active === finalScene) blow(false);
  if (!down) return;
  const dx = e.clientX - down.x, dy = e.clientY - down.y;
  const quick = performance.now() - down.t < 600;
  down = null;
  if (e.target.closest && e.target.closest('button,a')) return;
  if (Math.abs(dx) > 60 && Math.abs(dx) > Math.abs(dy) * 1.5) { if (dx < 0) go(1); else if (idx > 1) go(-1); return; }
  if (moved || !quick) return;
  if (e.clientX < innerWidth * 0.2 && idx > 1) go(-1); else go(1);
};
addEventListener('pointerup', up);
addEventListener('pointercancel', () => { down = null; world.pointerUp(); blow(false); });
addEventListener('keydown', (e) => {
  if (e.repeat) { if (e.key === ' ' && active === finalScene) e.preventDefault(); return; }
  if (e.key === ' ' && active === finalScene && finale.ready) { e.preventDefault(); blow(true); return; }
  if (e.key === 'ArrowRight' || e.key === ' ' || e.key === 'Enter') { e.preventDefault(); go(1); }
  if (e.key === 'ArrowLeft' && idx > 1) go(-1);
});
addEventListener('keyup', (e) => { if (e.key === ' ' && active === finalScene) blow(false); });
addEventListener('resize', () => layoutFor(active));

/* ---------- Karte: Ortsnamen folgen den Lichtpunkten ---------- */
world.onFrame((t, ts) => {
  if (world.shapeName !== 'map') return;
  const pts = world.labels();
  if (!pts) return;
  const times = [...world.mapTimes, 0.4, 0.4];
  const offs = [[-12, 12, 'end'], [12, -14, 'start'], [-12, -16, 'end'], [12, 8, 'start'], [12, 0, 'start'], [0, -6, 'mid'], [0, 0, 'start']];
  places.forEach((el, k) => {
    const [x, y] = pts[k];
    const [ox, oy, al] = offs[k];
    const w = el.offsetWidth;
    const lx = al === 'end' ? x + ox - w : al === 'mid' ? x - w / 2 : x + ox;
    el.style.transform = `translate(${lx.toFixed(1)}px, ${(y + oy - 6).toFixed(1)}px)`;
    el.classList.toggle('on', ts > times[k] + 0.3 && active.classList.contains('map-scene'));
  });
});

/* ---------- Finale: die Pusteblume ---------- */
const finale = { ready: false, started: false, timers: [], blowing: false };
function armFinale() {
  finale.ready = false; finale.started = false; finale.blowing = false;
  finale.timers.forEach(clearTimeout); finale.timers = [];
  document.body.classList.remove('finale');
  finalScene.classList.remove('finale');
  finalScene.querySelectorAll('.cl').forEach((c) => c.classList.remove('in'));
}
function finaleReady() {
  if (finale.ready || active !== finalScene) return;
  finale.timers.push(setTimeout(() => {
    finale.ready = true;
    hint.textContent = matchMedia('(pointer: fine)').matches ? 'Halte die Maustaste gedrückt und puste' : 'Halte deinen Finger auf das Licht und puste';
    hint.classList.add('show');
    // falls sie nicht pustet, trägt der Wind nach einer Weile ein paar Samen weg
    finale.timers.push(setTimeout(() => { const s = world.shape; if (s && s.puff && !finale.started) s.puff(3); }, 14000));
  }, reduce ? 300 : 2600));
}
function blow(on) {
  const s = world.shape;
  if (!s || !s.puff || !finale.ready) return;
  if (on === finale.blowing) return;
  finale.blowing = on;
  s.blowing = on;
  sound.wind(on ? 1 : 0);
  if (on) {
    s.puff(4);
    hint.classList.remove('show');
    if (!finale.started) watchRelease();
  }
}
function watchRelease() {
  const check = () => {
    const s = world.shape;
    if (active !== finalScene || !s || !s.releasedFraction) return;
    if (s.releasedFraction() > 0.25) startFinale();
    else finale.timers.push(setTimeout(check, 200));
  };
  check();
}
function startFinale() {
  if (finale.started) return;
  finale.started = true;
  post('/api/moment', { session, name: 'pusteblume' }).catch(() => {});
  const s = world.shape;
  if (s.autoBreeze) s.autoBreeze();
  const r = farewell.getBoundingClientRect();
  farewell.style.setProperty('--dy', `${Math.round(innerHeight / 2 - (r.top + r.height / 2))}px`);
  finalScene.classList.add('finale');
  document.body.classList.add('finale');
  // das Licht rückt nach oben, damit die letzten Worte Platz haben
  if (wide()) world.setLayout(0.5, 0.3, 0.75, 0.8); else world.setLayout(0.5, 0.3, 1, 0.74);
  sound.chime(1.2);
  const cl = [...finalScene.querySelectorAll('.cl')];
  const step = reduce ? 400 : 3000;
  cl.forEach((c, k) => finale.timers.push(setTimeout(() => { c.classList.add('in'); sound.chime(0.8); }, (reduce ? 200 : 3200) + k * step)));
  finale.timers.push(setTimeout(() => {
    const sh = world.shape;
    if (sh && sh.newLight) sh.newLight();
    sound.chime(1);
  }, (reduce ? 400 : 3200) + cl.length * step + 1500));
  finale.timers.push(setTimeout(() => sound.wind(0), 4000));
}
function resetFinale() {
  finale.timers.forEach(clearTimeout); finale.timers = [];
  finale.ready = false; finale.started = false; finale.blowing = false;
  finalScene.classList.remove('finale');
  document.body.classList.remove('finale');
  sound.wind(0);
}

/* Start */
layoutFor(scenes[0]);
world.snapLayout();
show(scenes[0], false);

// Direkt zu einer Seite springen (z. B. #s=5), praktisch zum Nachschauen
const jump = location.hash.match(/s=(\d+)/);
if (jump && +jump[1] > 0 && +jump[1] < scenes.length) {
  begin(false);
  idx = +jump[1]; show(scenes[idx]);
}
