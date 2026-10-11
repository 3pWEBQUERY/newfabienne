// Musik, die mit der Geschichte mitgeht – komplett im Browser erzeugt:
// ein weiches Klavier, das in jeder Stimmung eigene Töne sucht, ein kleines
// wiederkehrendes Motiv für sie, ein warmer Klangteppich darunter, dazu
// ein Glöckchen für jede Zeile, Herzschlag, Regen und Wind.

const CHORDS = {
  intro:    [38, 50, 57, 64, 66],
  before:   [38, 50, 53, 57, 64],
  fall:     [36, 48, 51, 55, 62],
  off:      [36, 48, 55, 62],
  stir:     [41, 53, 57, 60, 67],
  spark:    [43, 55, 59, 62, 69],
  cold:     [40, 52, 55, 59, 65],
  ache:     [40, 52, 55, 58, 62],
  care:     [41, 53, 57, 64, 67],
  grow:     [36, 48, 55, 64, 67, 71],
  roads:    [43, 55, 62, 66, 69],
  twin:     [45, 57, 61, 64, 68, 71],
  twinWarm: [38, 50, 57, 61, 66, 69],
  still:    [45, 57, 60, 64, 67],
  unsure:   [45, 57, 60, 62, 65],
  love:     [41, 53, 60, 64, 69, 72],
  loveFull: [38, 50, 57, 62, 66, 73],
  mind:     [43, 55, 62, 64, 69],
  calm:     [36, 48, 55, 62, 64, 67],
  bye:      [47, 59, 62, 66, 69],
  bye2:     [43, 55, 59, 62, 66],
  nein:     [40, 52, 55, 59, 62],
  miss:     [43, 55, 59, 64, 66],
  thanks:   [36, 48, 52, 55, 59, 64],
  me:       [41, 53, 57, 60, 64, 67],
  release:  [38, 50, 57, 64, 66, 69, 74],
};

// Wie das Klavier in jeder Stimmung spielt: Abstand der Töne, wie oft, Tonlage, Lautstärke
const FEEL = {
  intro:    { gap: 0.95, p: 0.75, lo: 62, hi: 81, v: 0.85, motif: true },
  before:   { gap: 1.05, p: 0.7, lo: 57, hi: 76, v: 0.75 },
  fall:     { gap: 1.4, p: 0.5, lo: 52, hi: 72, v: 0.6 },
  off:      { gap: 2.2, p: 0.3, lo: 55, hi: 67, v: 0.45 },
  stir:     { gap: 1.0, p: 0.6, lo: 60, hi: 79, v: 0.7 },
  spark:    { gap: 0.7, p: 0.85, lo: 62, hi: 86, v: 0.9, motif: true },
  cold:     { gap: 1.2, p: 0.55, lo: 55, hi: 76, v: 0.65 },
  ache:     { gap: 1.5, p: 0.45, lo: 52, hi: 72, v: 0.55 },
  care:     { gap: 0.85, p: 0.75, lo: 60, hi: 81, v: 0.8 },
  grow:     { gap: 0.65, p: 0.85, lo: 62, hi: 86, v: 0.9 },
  roads:    { gap: 0.6, p: 0.8, lo: 62, hi: 86, v: 0.8 },
  twin:     { gap: 0.5, p: 0.8, lo: 66, hi: 88, v: 0.75 },
  twinWarm: { gap: 0.6, p: 0.85, lo: 62, hi: 86, v: 0.85, motif: true },
  still:    { gap: 1.2, p: 0.6, lo: 57, hi: 76, v: 0.65 },
  unsure:   { gap: 1.05, p: 0.55, lo: 55, hi: 77, v: 0.6 },
  love:     { gap: 0.62, p: 0.85, lo: 62, hi: 88, v: 0.9, motif: true },
  loveFull: { gap: 0.55, p: 0.9, lo: 62, hi: 90, v: 1.0 },
  mind:     { gap: 0.42, p: 0.75, lo: 60, hi: 84, v: 0.6 },
  calm:     { gap: 1.0, p: 0.7, lo: 60, hi: 79, v: 0.75 },
  bye:      { gap: 1.1, p: 0.65, lo: 59, hi: 78, v: 0.75 },
  bye2:     { gap: 1.1, p: 0.6, lo: 59, hi: 78, v: 0.7 },
  nein:     { gap: 1.7, p: 0.45, lo: 52, hi: 71, v: 0.55 },
  miss:     { gap: 0.9, p: 0.75, lo: 59, hi: 81, v: 0.8 },
  thanks:   { gap: 0.75, p: 0.8, lo: 60, hi: 84, v: 0.9, motif: true },
  me:       { gap: 0.7, p: 0.8, lo: 62, hi: 84, v: 0.8 },
  release:  { gap: 0.95, p: 0.7, lo: 62, hi: 86, v: 0.85, motif: true },
};

const hz = (m) => 440 * Math.pow(2, (m - 69) / 12);

// Eine Viertelsekunde Stille als WAV. Spielt man sie über ein normales
// Audio-Element ab, behandelt iOS die Seite als Musik – der Stummschalter
// am iPhone schaltet den Ton dann nicht mehr ab.
function silentWav() {
  const n = 2000, buf = new ArrayBuffer(44 + n), v = new DataView(buf);
  const s = (o, t) => { for (let i = 0; i < t.length; i++) v.setUint8(o + i, t.charCodeAt(i)); };
  s(0, 'RIFF'); v.setUint32(4, 36 + n, true); s(8, 'WAVE'); s(12, 'fmt ');
  v.setUint32(16, 16, true); v.setUint16(20, 1, true); v.setUint16(22, 1, true);
  v.setUint32(24, 8000, true); v.setUint32(28, 8000, true); v.setUint16(32, 1, true); v.setUint16(34, 8, true);
  s(36, 'data'); v.setUint32(40, n, true);
  for (let i = 0; i < n; i++) v.setUint8(44 + i, 128);
  let bin = ''; const u = new Uint8Array(buf);
  for (let i = 0; i < u.length; i++) bin += String.fromCharCode(u[i]);
  return 'data:audio/wav;base64,' + btoa(bin);
}

export function createSound() {
  let ctx = null, master, out, padBus, keysBus, fxBus, verb, analyser;
  let enabled = false, mood = 'intro', voices = [];
  let heartTimer = 0, rainGain = null, windGain = null, windFilter = null, noiseBuf = null;
  let silentEl = null, seqTimer = 0, nextNote = 0, walk = 0, motifUntil = 0, motifNotes = [];

  function impulse(sec = 5, decay = 2.4) {
    const len = Math.floor(ctx.sampleRate * sec);
    const b = ctx.createBuffer(2, len, ctx.sampleRate);
    for (let c = 0; c < 2; c++) {
      const d = b.getChannelData(c);
      let lp = 0;
      for (let i = 0; i < len; i++) {
        // leicht gedämpfter, weicher Hall
        lp = lp * 0.6 + (Math.random() * 2 - 1) * 0.4;
        d[i] = lp * Math.pow(1 - i / len, decay) * (i < ctx.sampleRate * 0.01 ? i / (ctx.sampleRate * 0.01) : 1);
      }
    }
    return b;
  }
  function noise() {
    if (noiseBuf) return noiseBuf;
    const len = ctx.sampleRate * 3;
    noiseBuf = ctx.createBuffer(1, len, ctx.sampleRate);
    const d = noiseBuf.getChannelData(0);
    for (let i = 0; i < len; i++) d[i] = Math.random() * 2 - 1;
    return noiseBuf;
  }

  function unlockIOS() {
    try { if (navigator.audioSession) navigator.audioSession.type = 'playback'; } catch {}
    try {
      if (!silentEl) {
        silentEl = new Audio(silentWav());
        silentEl.loop = true;
        silentEl.setAttribute('playsinline', '');
        silentEl.preload = 'auto';
      }
      const p = silentEl.play();
      if (p && p.catch) p.catch(() => {});
    } catch {}
  }

  function init() {
    const AC = window.AudioContext || window.webkitAudioContext;
    if (!AC) return false;
    ctx = new AC({ latencyHint: 'playback' });
    master = ctx.createGain(); master.gain.value = 0;
    const comp = ctx.createDynamicsCompressor();
    comp.threshold.value = -16; comp.knee.value = 12; comp.ratio.value = 3.5; comp.attack.value = 0.01; comp.release.value = 0.4;
    out = ctx.createGain(); out.gain.value = 1.4;
    analyser = ctx.createAnalyser(); analyser.fftSize = 1024;
    master.connect(comp); comp.connect(out); out.connect(ctx.destination); out.connect(analyser);

    verb = ctx.createConvolver(); verb.buffer = impulse();
    const verbGain = ctx.createGain(); verbGain.gain.value = 0.55;
    verb.connect(verbGain); verbGain.connect(master);

    // Klangteppich: weich gefiltert, aber nicht so tief, dass Handys ihn verschlucken
    padBus = ctx.createGain(); padBus.gain.value = 0.55;
    const padLP = ctx.createBiquadFilter(); padLP.type = 'lowpass'; padLP.frequency.value = 2400; padLP.Q.value = 0.4;
    padBus.connect(padLP); padLP.connect(master); padLP.connect(verb);

    keysBus = ctx.createGain(); keysBus.gain.value = 0.9;
    const keysVerb = ctx.createGain(); keysVerb.gain.value = 0.75;
    keysBus.connect(master); keysBus.connect(keysVerb); keysVerb.connect(verb);

    fxBus = ctx.createGain(); fxBus.gain.value = 1;
    fxBus.connect(master); fxBus.connect(verb);

    const mk = (type, f, q) => {
      const src = ctx.createBufferSource(); src.buffer = noise(); src.loop = true;
      const flt = ctx.createBiquadFilter(); flt.type = type; flt.frequency.value = f; flt.Q.value = q;
      const g = ctx.createGain(); g.gain.value = 0;
      src.connect(flt); flt.connect(g); g.connect(fxBus);
      src.start();
      return [g, flt];
    };
    [rainGain] = mk('bandpass', 3200, 0.5);
    [windGain, windFilter] = mk('bandpass', 700, 0.7);
    return true;
  }

  /* ---------- Klavier ---------- */
  function piano(m, when, vel = 1, len = 4.5, dest = keysBus) {
    const f = hz(m);
    const g = ctx.createGain(); g.gain.value = 0;
    const lp = ctx.createBiquadFilter(); lp.type = 'lowpass'; lp.Q.value = 0.5;
    lp.frequency.setValueAtTime(Math.min(12000, f * (6 + vel * 4)), when);
    lp.frequency.exponentialRampToValueAtTime(Math.max(500, f * 1.6), when + len * 0.7);
    const pan = ctx.createStereoPanner ? ctx.createStereoPanner() : null;
    const parts = [[1, 1, 1], [2, 0.42, 0.6], [3, 0.2, 0.42], [4, 0.1, 0.3], [5.02, 0.05, 0.22], [0.5, 0.06, 0.8]];
    for (const [mul, amp, dk] of parts) {
      const o = ctx.createOscillator();
      o.type = 'sine';
      o.frequency.value = f * mul * (1 + 0.00035 * mul * mul);
      o.detune.value = (Math.random() - 0.5) * 4;
      const og = ctx.createGain();
      og.gain.setValueAtTime(amp, when);
      og.gain.exponentialRampToValueAtTime(amp * 0.001 + 1e-5, when + len * dk);
      o.connect(og); og.connect(g);
      o.start(when); o.stop(when + len + 0.1);
    }
    const peak = 0.13 * vel * (m > 80 ? 0.75 : 1);
    g.gain.setValueAtTime(0, when);
    g.gain.linearRampToValueAtTime(peak, when + 0.006);
    g.gain.exponentialRampToValueAtTime(peak * 0.35, when + 0.5);
    g.gain.exponentialRampToValueAtTime(0.0001, when + len);
    g.connect(lp);
    if (pan) { pan.pan.value = Math.max(-0.6, Math.min(0.6, (m - 70) / 30)); lp.connect(pan); pan.connect(dest); }
    else lp.connect(dest);
  }

  function pool(name) {
    const F = FEEL[name] || FEEL.intro, notes = CHORDS[name] || CHORDS.intro;
    const pcs = [...new Set(notes.map((n) => n % 12))];
    const p = [];
    for (let m = F.lo; m <= F.hi; m++) if (pcs.includes(m % 12)) p.push(m);
    return p;
  }

  // Das Motiv: Quinte, Terz, Sekunde, Grundton – ein kleines, fallendes „für dich“
  function playMotif(name, at) {
    const notes = CHORDS[name] || CHORDS.intro;
    let base = notes[0] % 12 + 60;
    while (base + 7 < 67) base += 12;
    while (base + 16 > 86) base -= 12;
    const seq = [[7, 0, 0.9], [16, 0.75, 0.85], [14, 1.5, 0.8], [12, 2.25, 0.95], [7, 3.9, 0.45]];
    // eigener Regler, damit das Motiv sanft ausklingt, wenn die Stimmung wechselt
    const env = ctx.createGain();
    env.connect(keysBus);
    motifNotes.push(env);
    for (const [iv, dt, v] of seq) piano(base + iv, at + dt, v, 5.5, env);
    motifUntil = at + 5.2;
  }

  function sequencer() {
    if (!ctx || !enabled) return;
    const ahead = ctx.currentTime + 0.25;
    while (nextNote < ahead) {
      const F = FEEL[mood] || FEEL.intro;
      const at = Math.max(nextNote, ctx.currentTime + 0.02);
      if (at >= motifUntil && Math.random() < F.p) {
        const p = pool(mood);
        if (p.length) {
          const steps = [-2, -1, -1, 1, 1, 2, 3, -3];
          walk = Math.max(0, Math.min(p.length - 1, walk + steps[Math.floor(Math.random() * steps.length)]));
          const vel = F.v * (0.65 + Math.random() * 0.35);
          piano(p[walk], at, vel);
          if (Math.random() < 0.18 && walk > 2) piano(p[walk - 2], at + 0.012, vel * 0.6);
        }
      }
      // etwas Atem im Tempo
      nextNote += F.gap * (0.8 + Math.random() * 0.5) * (Math.random() < 0.12 ? 2 : 1);
    }
  }

  /* ---------- Klangteppich ---------- */
  function playChord(name, fade = 3.5) {
    if (!ctx) return;
    const tnow = ctx.currentTime;
    for (const v of voices) {
      v.g.gain.cancelScheduledValues(tnow);
      v.g.gain.setValueAtTime(v.g.gain.value, tnow);
      v.g.gain.linearRampToValueAtTime(0, tnow + fade);
      v.oscs.forEach((o) => o.stop(tnow + fade + 0.1));
    }
    voices = [];
    const notes = CHORDS[name] || CHORDS.intro;
    notes.forEach((m0, idx) => {
      // tiefe Töne eine Oktave höher holen, damit auch kleine Lautsprecher sie spielen
      let m = m0; if (idx > 0) while (m < 55) m += 12;
      const g = ctx.createGain(); g.gain.value = 0;
      const level = idx === 0 ? 0.07 : 0.045 * (m > 74 ? 0.6 : 1);
      const oscs = [];
      [[0, 'sine', 1], [5 + idx, 'triangle', 0.3], [-6 - idx, 'sawtooth', 0.045]].forEach(([det, type, amp]) => {
        const o = ctx.createOscillator(); o.type = type; o.frequency.value = hz(m); o.detune.value = det;
        const og = ctx.createGain(); og.gain.value = amp;
        o.connect(og); og.connect(g); o.start(tnow); oscs.push(o);
      });
      const lfo = ctx.createOscillator(); lfo.frequency.value = 0.06 + idx * 0.021;
      const lg = ctx.createGain(); lg.gain.value = level * 0.4;
      lfo.connect(lg); lg.connect(g.gain); lfo.start(tnow); oscs.push(lfo);
      const pan = ctx.createStereoPanner ? ctx.createStereoPanner() : null;
      if (pan) { pan.pan.value = (idx / Math.max(1, notes.length - 1) - 0.5) * 0.9; g.connect(pan); pan.connect(padBus); } else g.connect(padBus);
      g.gain.setValueAtTime(0, tnow);
      g.gain.linearRampToValueAtTime(level, tnow + fade + idx * 0.3);
      voices.push({ g, oscs });
    });
  }

  function chime(strength = 1) {
    if (!ctx || !enabled) return;
    const notes = CHORDS[mood] || CHORDS.intro;
    let m = notes[1 + Math.floor(Math.random() * (notes.length - 1))];
    while (m < 79) m += 12;
    if (m > 93) m -= 12;
    const t = ctx.currentTime + 0.02;
    const g = ctx.createGain(); g.gain.value = 0;
    [[1, 1], [2.76, 0.18], [5.4, 0.05]].forEach(([mul, amp]) => {
      const o = ctx.createOscillator(); o.type = 'sine'; o.frequency.value = hz(m) * mul;
      const og = ctx.createGain(); og.gain.value = amp;
      o.connect(og); og.connect(g); o.start(t); o.stop(t + 4);
    });
    const peak = 0.06 * strength;
    g.gain.setValueAtTime(0, t);
    g.gain.linearRampToValueAtTime(peak, t + 0.005);
    g.gain.exponentialRampToValueAtTime(0.0001, t + 3.5);
    const pan = ctx.createStereoPanner ? ctx.createStereoPanner() : null;
    if (pan) { pan.pan.value = (Math.random() - 0.5) * 0.8; g.connect(pan); pan.connect(fxBus); } else g.connect(fxBus);
  }

  // ein tiefer, schwerer Klavierton für jedes „Nein“
  function low() {
    if (!ctx || !enabled) return;
    const t = ctx.currentTime + 0.03;
    piano(40, t, 0.9, 7);
    piano(52, t + 0.01, 0.55, 7);
    motifUntil = Math.max(motifUntil, t + 1.6);
  }

  function thump(t, amp) {
    // Grundton + Oberton, damit man ihn auch auf dem Handy hört
    [[62, 1], [124, 0.45], [186, 0.12]].forEach(([f, a]) => {
      const o = ctx.createOscillator(); o.type = 'sine';
      o.frequency.setValueAtTime(f * 1.5, t); o.frequency.exponentialRampToValueAtTime(f, t + 0.07);
      const g = ctx.createGain(); g.gain.value = 0;
      o.connect(g); g.connect(master); o.start(t); o.stop(t + 0.5);
      g.gain.setValueAtTime(0, t);
      g.gain.linearRampToValueAtTime(amp * a, t + 0.01);
      g.gain.exponentialRampToValueAtTime(0.0001, t + 0.34);
    });
  }
  function heartbeat(on) {
    clearInterval(heartTimer); heartTimer = 0;
    if (!on || !ctx) return;
    let next = 0;
    heartTimer = setInterval(() => {
      if (!enabled) return;
      // im selben Takt wie das Licht: volle Sekunden
      const perfNow = performance.now() / 1000;
      const beat = Math.ceil(perfNow);
      if (beat === next || beat - perfNow > 0.3) return;
      next = beat;
      const t = ctx.currentTime + (beat - perfNow);
      thump(t, 0.3); thump(t + 0.28, 0.18);
    }, 60);
  }

  function level(g, v, time = 1.5) {
    if (!ctx) return;
    const t = ctx.currentTime;
    g.gain.cancelScheduledValues(t);
    g.gain.setValueAtTime(g.gain.value, t);
    g.gain.linearRampToValueAtTime(v, t + time);
  }

  function startSeq() {
    clearInterval(seqTimer);
    nextNote = ctx.currentTime + 0.6;
    seqTimer = setInterval(sequencer, 90);
  }

  return {
    get on() { return enabled; },
    start() {
      unlockIOS();
      if (!ctx && !init()) return;
      if (ctx.state !== 'running') ctx.resume();
      enabled = true;
      level(master, 1, 2);
      playChord(mood, 3);
      startSeq();
    },
    // bei jeder Berührung: falls iOS den Ton unterbrochen hat, wieder aufwecken
    wake() {
      if (!ctx || !enabled) return;
      if (ctx.state !== 'running') ctx.resume();
      if (silentEl && silentEl.paused) unlockIOS();
    },
    toggle() {
      if (!ctx) { this.start(); return true; }
      enabled = !enabled;
      if (enabled) {
        unlockIOS(); ctx.resume(); level(master, 1, 1.2); startSeq();
      } else {
        level(master, 0, 0.6); clearInterval(seqTimer);
        if (silentEl) silentEl.pause();
      }
      return enabled;
    },
    pause(p) {
      if (!ctx) return;
      if (p) ctx.suspend(); else if (enabled) { ctx.resume(); nextNote = ctx.currentTime + 0.3; }
    },
    mood(name) {
      if (name === mood || !CHORDS[name]) return;
      mood = name;
      if (!ctx) return;
      const t = ctx.currentTime;
      for (const env of motifNotes) { env.gain.setValueAtTime(env.gain.value, t); env.gain.linearRampToValueAtTime(0, t + 1.4); }
      motifNotes = [];
      motifUntil = Math.min(motifUntil, t + 0.8);
      playChord(name);
      if (enabled && (FEEL[name] || {}).motif) playMotif(name, ctx.currentTime + 1.2);
    },
    chime, low,
    heartbeat,
    rain(v) { if (rainGain) level(rainGain, v * 0.07, 2.5); },
    wind(v) {
      if (!windGain) return;
      level(windGain, v * 0.3, v ? 0.5 : 1.8);
      const t = ctx.currentTime;
      windFilter.frequency.cancelScheduledValues(t);
      windFilter.frequency.setValueAtTime(windFilter.frequency.value, t);
      windFilter.frequency.linearRampToValueAtTime(v ? 1300 : 600, t + 0.8);
    },
    // Lautstärke (RMS) für Tests
    level() {
      if (!analyser) return 0;
      const d = new Float32Array(analyser.fftSize);
      analyser.getFloatTimeDomainData(d);
      let s = 0; for (let i = 0; i < d.length; i++) s += d[i] * d[i];
      return Math.sqrt(s / d.length);
    },
    get state() { return ctx ? ctx.state : 'none'; },
  };
}
