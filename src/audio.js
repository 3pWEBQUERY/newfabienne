// Leise, erzeugte Musik: ein weicher Klangteppich pro Stimmung,
// ein feines Glöckchen für jede Zeile, ein Herzschlag, Regen und Wind.

const CHORDS = {
  intro:    [38, 50, 57, 64, 66],
  before:   [38, 50, 53, 57, 64],
  fall:     [36, 48, 51, 55, 62],
  off:      [36, 48, 55],
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
const hz = (m) => 440 * Math.pow(2, (m - 69) / 12);

export function createSound() {
  let ctx = null, master, padBus, fxBus, verb, enabled = false, mood = 'intro';
  let voices = [];
  let heartTimer = 0, rainGain = null, windGain = null, windFilter = null, noiseBuf = null;

  function impulse(sec = 4.5, decay = 2.6) {
    const len = Math.floor(ctx.sampleRate * sec);
    const b = ctx.createBuffer(2, len, ctx.sampleRate);
    for (let c = 0; c < 2; c++) {
      const d = b.getChannelData(c);
      for (let i = 0; i < len; i++) d[i] = (Math.random() * 2 - 1) * Math.pow(1 - i / len, decay);
    }
    return b;
  }
  function noise() {
    if (noiseBuf) return noiseBuf;
    const len = ctx.sampleRate * 3;
    noiseBuf = ctx.createBuffer(1, len, ctx.sampleRate);
    const d = noiseBuf.getChannelData(0);
    let b0 = 0;
    for (let i = 0; i < len; i++) { const w = Math.random() * 2 - 1; b0 = 0.97 * b0 + 0.03 * w; d[i] = w * 0.5 + b0 * 2; }
    return noiseBuf;
  }

  function init() {
    const AC = window.AudioContext || window.webkitAudioContext;
    if (!AC) return false;
    ctx = new AC();
    master = ctx.createGain(); master.gain.value = 0;
    const comp = ctx.createDynamicsCompressor();
    comp.threshold.value = -20; comp.ratio.value = 3;
    master.connect(comp); comp.connect(ctx.destination);
    verb = ctx.createConvolver(); verb.buffer = impulse();
    const verbGain = ctx.createGain(); verbGain.gain.value = 0.9;
    verb.connect(verbGain); verbGain.connect(master);
    padBus = ctx.createGain(); padBus.gain.value = 0.9;
    const padLP = ctx.createBiquadFilter(); padLP.type = 'lowpass'; padLP.frequency.value = 1400; padLP.Q.value = 0.3;
    padBus.connect(padLP); padLP.connect(master); padLP.connect(verb);
    fxBus = ctx.createGain(); fxBus.gain.value = 1;
    fxBus.connect(master); fxBus.connect(verb);

    // Regen und Wind: gefiltertes Rauschen, stumm bis gebraucht
    const mk = (type, f, q) => {
      const src = ctx.createBufferSource(); src.buffer = noise(); src.loop = true;
      const flt = ctx.createBiquadFilter(); flt.type = type; flt.frequency.value = f; flt.Q.value = q;
      const g = ctx.createGain(); g.gain.value = 0;
      src.connect(flt); flt.connect(g); g.connect(fxBus);
      src.start();
      return [g, flt];
    };
    [rainGain] = mk('bandpass', 2400, 0.6);
    [windGain, windFilter] = mk('lowpass', 500, 0.8);
    return true;
  }

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
    notes.forEach((m, idx) => {
      const g = ctx.createGain(); g.gain.value = 0;
      const pan = ctx.createStereoPanner ? ctx.createStereoPanner() : null;
      const level = (idx === 0 ? 0.05 : 0.032) * (m > 70 ? 0.6 : 1);
      const oscs = [];
      [[0, 'sine', 1], [4 + idx, 'triangle', 0.35], [-5 - idx, 'sine', 0.6]].forEach(([det, type, amp]) => {
        const o = ctx.createOscillator(); o.type = type; o.frequency.value = hz(m); o.detune.value = det;
        const og = ctx.createGain(); og.gain.value = amp;
        o.connect(og); og.connect(g); o.start(tnow); oscs.push(o);
      });
      // langsames Atmen in der Lautstärke
      const lfo = ctx.createOscillator(); lfo.frequency.value = 0.05 + idx * 0.017;
      const lg = ctx.createGain(); lg.gain.value = level * 0.35;
      lfo.connect(lg); lg.connect(g.gain); lfo.start(tnow); oscs.push(lfo);
      if (pan) { pan.pan.value = (idx / (notes.length - 1) - 0.5) * 0.8; g.connect(pan); pan.connect(padBus); } else g.connect(padBus);
      g.gain.setValueAtTime(0, tnow);
      g.gain.linearRampToValueAtTime(level, tnow + fade + idx * 0.25);
      voices.push({ g, oscs });
    });
  }

  function chime(strength = 1) {
    if (!ctx || !enabled) return;
    const notes = CHORDS[mood] || CHORDS.intro;
    let m = notes[1 + Math.floor(Math.random() * (notes.length - 1))];
    while (m < 74) m += 12;
    if (m > 91) m -= 12;
    const t = ctx.currentTime + 0.02;
    const out = ctx.createGain(); out.gain.value = 0;
    const pan = ctx.createStereoPanner ? ctx.createStereoPanner() : null;
    [[1, 1], [2.0, 0.22], [3.01, 0.06]].forEach(([mul, amp]) => {
      const o = ctx.createOscillator(); o.type = 'sine'; o.frequency.value = hz(m) * mul;
      const g = ctx.createGain(); g.gain.value = amp;
      o.connect(g); g.connect(out); o.start(t); o.stop(t + 4);
    });
    const peak = 0.045 * strength;
    out.gain.setValueAtTime(0, t);
    out.gain.linearRampToValueAtTime(peak, t + 0.008);
    out.gain.exponentialRampToValueAtTime(0.0001, t + 3.6);
    if (pan) { pan.pan.value = (Math.random() - 0.5) * 0.9; out.connect(pan); pan.connect(fxBus); } else out.connect(fxBus);
  }

  // ein tiefer, weicher Ton für jedes „Nein“
  function low() {
    if (!ctx || !enabled) return;
    const t = ctx.currentTime + 0.02;
    const o = ctx.createOscillator(); o.type = 'sine'; o.frequency.value = hz(40);
    const g = ctx.createGain(); g.gain.value = 0;
    o.connect(g); g.connect(fxBus); o.start(t); o.stop(t + 5);
    g.gain.linearRampToValueAtTime(0.14, t + 0.06);
    g.gain.exponentialRampToValueAtTime(0.0001, t + 4.5);
  }

  function thump(t, f, amp) {
    const o = ctx.createOscillator(); o.type = 'sine';
    o.frequency.setValueAtTime(f * 1.6, t); o.frequency.exponentialRampToValueAtTime(f, t + 0.08);
    const g = ctx.createGain(); g.gain.value = 0;
    o.connect(g); g.connect(master); o.start(t); o.stop(t + 0.5);
    g.gain.setValueAtTime(0, t);
    g.gain.linearRampToValueAtTime(amp, t + 0.012);
    g.gain.exponentialRampToValueAtTime(0.0001, t + 0.38);
  }
  function heartbeat(on) {
    clearInterval(heartTimer); heartTimer = 0;
    if (!on || !ctx) return;
    let next = 0;
    const schedule = () => {
      if (!enabled) return;
      // im selben Takt wie das Licht: volle Sekunden der Seitenzeit
      const perfNow = performance.now() / 1000;
      const ahead = 0.3;
      const beat = Math.ceil(perfNow);
      if (beat === next) return;
      const startIn = beat - perfNow;
      if (startIn > ahead) return;
      next = beat;
      const t = ctx.currentTime + startIn;
      thump(t, 52, 0.22); thump(t + 0.28, 48, 0.14);
    };
    heartTimer = setInterval(schedule, 60);
  }

  function level(g, v, time = 1.5) {
    if (!ctx) return;
    const t = ctx.currentTime;
    g.gain.cancelScheduledValues(t);
    g.gain.setValueAtTime(g.gain.value, t);
    g.gain.linearRampToValueAtTime(v, t + time);
  }

  return {
    get on() { return enabled; },
    start() {
      if (!ctx && !init()) return;
      if (ctx.state === 'suspended') ctx.resume();
      enabled = true;
      level(master, 0.8, 2.5);
      playChord(mood, 4);
    },
    toggle() {
      if (!ctx) { this.start(); return true; }
      enabled = !enabled;
      if (enabled) { ctx.resume(); level(master, 0.8, 1.2); }
      else level(master, 0, 0.6);
      return enabled;
    },
    pause(p) {
      if (!ctx) return;
      if (p) ctx.suspend(); else if (enabled) ctx.resume();
    },
    mood(name) {
      if (name === mood || !CHORDS[name]) return;
      mood = name;
      if (ctx) playChord(name);
    },
    chime, low,
    heartbeat,
    rain(v) { if (rainGain) level(rainGain, v * 0.05, 2.5); },
    wind(v) {
      if (!windGain) return;
      level(windGain, v * 0.12, 0.6);
      const t = ctx.currentTime;
      windFilter.frequency.cancelScheduledValues(t);
      windFilter.frequency.linearRampToValueAtTime(400 + v * 900, t + 0.6);
    },
  };
}
