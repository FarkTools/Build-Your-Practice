/* Music and ambience. Everything is synthesized in the browser, rendered once into a
 * looping WAV, and played through two reusable <audio> elements (the same approach
 * that made the sound effects work on iPhone). No audio files ship with the game.
 *
 *   PP.audio.bed('town:docks')   ambience for a place in town
 *   PP.audio.bed('amb:swamp')    ambience at a landmark on the trail
 *   PP.audio.bed('music:calm')   travel music; moods: calm, bright, tense, urgent, night, triumph, title
 *   PP.audio.bed(null)           silence
 *   PP.audio.hold(true/false)    pause/resume around mini-games
 *
 * iOS ignores audio.volume, so loudness is baked into each loop.
 */
(function (PP) {
  const A = (PP.audio = { music: PP.store.get('music', true), key: null, held: false });

  /* Everything that makes sound data lives in synthLib. It runs twice: here (a fallback) and as
   * a background Web Worker built from its own source, so generating a loop (about a second on
   * a phone) never blocks taps. It must not touch the page: no PP, no document, no URL. */
  function synthLib(scope) {
  const RATE = 22050;
  const rnd = (seed) => { let x = seed || 1; return () => { x = (x * 16807) % 2147483647; return x / 2147483647; }; };

  /* ---------- tiny DSP toolkit ---------- */
  const buf = (sec) => new Float32Array(Math.floor(sec * RATE));
  const note = (n) => 440 * Math.pow(2, (n - 69) / 12); // MIDI -> Hz
  function tone(out, t, dur, f, vol, type, att = 0.01, rel = 1, vib = 0) {
    const a = Math.floor(t * RATE), n = Math.floor(dur * RATE), at = Math.max(1, att * RATE);
    let ph = 0;
    for (let i = 0; i < n; i++) {
      const tt = i / RATE;
      const ff = typeof f === 'function' ? f(tt / dur) : f;
      ph += (ff * (1 + vib * Math.sin(2 * Math.PI * 5.5 * tt))) / RATE;
      const p = ph % 1;
      const w = type === 'square' ? (p < 0.5 ? 0.6 : -0.6) : type === 'saw' ? (2 * p - 1) * 0.6 : type === 'tri' ? 1 - 4 * Math.abs(p - 0.5) : Math.sin(2 * Math.PI * p);
      const env = i < at ? i / at : Math.pow(0.001, ((i - at) / Math.max(1, n - at)) * rel);
      const k = (a + i) % out.length; // wrap so loops stay seamless
      out[k] += w * env * vol;
    }
  }
  function bell(out, t, f, vol, dur = 2.2) { [1, 2.76, 5.4, 8.9].forEach((m, i) => tone(out, t, dur / (1 + i * 0.6), f * m, vol / (1 + i * 1.8), 'sine', 0.002, 1)); }
  function noiseBurst(out, t, dur, vol, hp, r, lp = 1) {
    const a = Math.floor(t * RATE), n = Math.floor(dur * RATE);
    let y = 0, prev = 0;
    for (let i = 0; i < n; i++) {
      const x = r() * 2 - 1;
      y += lp * (x - y); // low-pass
      const hpv = hp ? y - prev : y; prev = y;
      const env = Math.pow(0.001, i / n);
      out[(a + i) % out.length] += hpv * env * vol;
    }
  }
  /* A bed of filtered noise whose loudness swells with an LFO (waves, wind, crowds). */
  function noiseBed(out, vol, lp, lfoHz, depth, r, brown) {
    let y = 0, b = 0;
    for (let i = 0; i < out.length; i++) {
      const x = r() * 2 - 1;
      if (brown) { b = (b + x * 0.02) * 0.998; y += lp * (b * 8 - y); } else y += lp * (x - y);
      const l = 1 - depth + depth * (0.5 + 0.5 * Math.sin((2 * Math.PI * lfoHz * i) / RATE));
      out[i] += y * vol * l;
    }
  }
  function sweep(out, t, dur, f0, f1, vol, type = 'sine', vib = 0) { tone(out, t, dur, (u) => f0 + (f1 - f0) * u, vol, type, 0.02, 0.6, vib); }
  function echo(out, delay, fb) { const d = Math.floor(delay * RATE); for (let i = 0; i < out.length; i++) out[i] += out[(i - d + out.length) % out.length] * fb; }

  function wavBytes(f) {
    // soft limiter so nothing clips, then 16-bit PCM
    const out = new DataView(new ArrayBuffer(44 + f.length * 2));
    const str = (o, s) => [...s].forEach((ch, i) => out.setUint8(o + i, ch.charCodeAt(0)));
    str(0, 'RIFF'); out.setUint32(4, 36 + f.length * 2, true); str(8, 'WAVEfmt '); out.setUint32(16, 16, true); out.setUint16(20, 1, true); out.setUint16(22, 1, true);
    out.setUint32(24, RATE, true); out.setUint32(28, RATE * 2, true); out.setUint16(32, 2, true); out.setUint16(34, 16, true); str(36, 'data'); out.setUint32(40, f.length * 2, true);
    for (let i = 0; i < f.length; i++) out.setInt16(44 + i * 2, Math.tanh(f[i]) * 32767, true);
    return out.buffer;
  }

  /* ---------- ambience ----------
   * Each place gets sounds that say where you are. Noise is used sparingly (only real
   * water and wind), because a bed of filtered noise reads as "ocean" everywhere. */
  const gull = (o, t, v) => { sweep(o, t, 0.28, 1900, 1300, v, 'tri', 0.04); sweep(o, t + 0.32, 0.22, 1700, 1250, v * 0.8, 'tri', 0.04); };
  const chirp = (o, t, v, r) => { const f = 2600 + r() * 1400; for (let k = 0; k < 2 + Math.floor(r() * 3); k++) sweep(o, t + k * 0.09, 0.07, f, f * 1.25, v); };
  const clink = (o, t, v) => bell(o, t, 2400, v, 0.5);
  const tick = (o, t, v, r) => noiseBurst(o, t, 0.012, v, true, r);
  const typing = (o, t, n, v, r) => { for (let k = 0; k < n; k++) tick(o, t + k * (0.07 + r() * 0.08), v, r); };
  const step = (o, t, v) => tone(o, t, 0.07, (u) => 90 - 40 * u, v, 'sine', 0.002, 1.5);
  const cricket = (o, t, v) => { for (let k = 0; k < 3; k++) tone(o, t + k * 0.05, 0.03, 4400, v, 'sine', 0.002, 1); };
  const frog = (o, t, v, r) => { const f = 130 + r() * 70; for (let k = 0; k < 3; k++) tone(o, t + k * 0.07, 0.05, f, v, 'square', 0.004, 1); };
  const drip = (o, t, v, r) => tone(o, t, 0.18, (u) => (900 + r() * 500) * (1 + u * 0.6), v, 'sine', 0.001, 1.6);
  const bubble = (o, t, v, r) => tone(o, t, 0.05, (u) => (500 + r() * 700) * (1 + u), v, 'sine', 0.002, 1.2);
  const ring = (o, t, v) => { for (let k = 0; k < 6; k++) tone(o, t + k * 0.06, 0.05, k % 2 ? 950 : 1200, v, 'sine', 0.003, 1); };
  /* Distant voices: little pitch contours like speech, too far away to make out. */
  const voices = (o, v, r, density = 1) => { for (let t = 0; t < 15; t += (0.25 + r() * 0.5) / density) { const f = 150 + r() * 140; tone(o, t, 0.18 + r() * 0.25, (u) => f * (1 + 0.25 * Math.sin(u * 6 + r())), v, 'tri', 0.04, 1.2); } };
  /* A little tune: notes = MIDI numbers, step = seconds per note. */
  const tune = (o, t0, notes, stepS, v, type, len = 0.9) => notes.forEach((n, i) => n && tone(o, t0 + i * stepS, stepS * len, note(n), v, type, 0.01, 1.6));
  const AMB = {
    docks(o, r) { noiseBed(o, 0.5, 0.02, 1 / 6, 0.75, r, true); for (let t = 1; t < 15; t += 3 + r() * 3) gull(o, t, 0.05); bell(o, 0.4, 392, 0.12, 2.8); bell(o, 8.4, 392, 0.1, 2.8); },
    trailhead(o, r) { for (let t = 0.3; t < 15; t += 0.7 + r() * 1.6) chirp(o, t, 0.04, r); for (let t = 0; t < 15; t += 0.55) step(o, t, 0.07); for (let t = 0.2; t < 15; t += 0.9 + r() * 0.6) cricket(o, t, 0.012); },
    square(o, r) { voices(o, 0.025, r, 1.4); for (let t = 0.5; t < 15; t += 1.4 + r() * 2.5) clink(o, t, 0.05); // a busker on the corner
      tune(o, 0.5, [67, 71, 74, 72, 71, 69, 67, 0, 69, 71, 72, 74, 72, 71, 69, 0, 67, 71, 74, 76, 74, 72, 71, 69, 67], 0.45, 0.05, 'tri'); },
    chamber(o, r) { voices(o, 0.02, r, 1.8); for (let t = 0.3; t < 15; t += 0.8 + r() * 1.8) clink(o, t, 0.06); // a piano in the corner
      [[60, 64, 67, 71], [57, 60, 64, 67], [62, 65, 69, 72], [55, 59, 62, 65]].forEach((ch, i) => ch.forEach((n, k) => tone(o, i * 3.75 + k * 0.12, 3.4, note(n), 0.035, 'sine', 0.01, 0.8))); },
    office(o, r) { for (let t = 0.2; t < 15; t += 1.2 + r() * 2.2) typing(o, t, 4 + Math.floor(r() * 9), 0.14, r); for (let t = 0; t < 15; t += 1) tick(o, t, 0.05, r); ring(o, 9, 0.03); tone(o, 4, 0.08, 1320, 0.03, 'sine', 0.002, 1); tone(o, 4.1, 0.08, 1760, 0.03, 'sine', 0.002, 1); },
    street(o, r) { for (let t = 0; t < 15; t += 0.42 + r() * 0.1) step(o, t, 0.06); voices(o, 0.015, r, 0.6); sweep(o, 5.5, 0.4, 440, 435, 0.04, 'square'); bell(o, 11, 2200, 0.05, 0.6); bell(o, 11.15, 2200, 0.05, 0.6); },
    homes(o, r) { for (let t = 0.3; t < 15; t += 0.6 + r() * 1.4) chirp(o, t, 0.04, r); [72, 76, 79, 84].forEach((n, i) => bell(o, 3 + i * 0.35 + r() * 0.2, note(n), 0.05, 2.5)); [79, 84, 76].forEach((n, i) => bell(o, 10 + i * 0.4, note(n), 0.04, 2.5)); sweep(o, 7.2, 0.15, 500, 380, 0.05, 'saw'); sweep(o, 7.45, 0.15, 520, 400, 0.05, 'saw'); },
    school(o, r) { bell(o, 0.3, 988, 0.07, 1.5); bell(o, 0.65, 988, 0.06, 1.5); voices(o, 0.012, r, 0.8); for (let t = 3; t < 15; t += 0.25 + r() * 0.2) if (r() < 0.5) tick(o, t, 0.06, r); // chalk, and a piano lesson down the hall
      tune(o, 5, [60, 62, 64, 65, 67, 69, 71, 72, 71, 69, 67, 65, 64, 62, 60], 0.3, 0.035, 'sine'); },
    library(o, r) { for (let t = 0; t < 15; t += 1) tick(o, t, 0.04, r); for (let t = 2.5; t < 15; t += 4 + r() * 3) noiseBurst(o, t, 0.25, 0.012, true, r, 0.25); noiseBurst(o, 8, 0.6, 0.008, true, r, 0.9); tone(o, 12, 0.25, 140, 0.02, 'sine', 0.05, 1); },
    field(o, r) { noiseBurst(o, 1.5, 0.03, 0.2, true, r); voices(o, 0.02, r, 1.5); tune(o, 3, [60, 64, 67, 72, 0, 67, 72], 0.22, 0.06, 'square', 0.8); bell(o, 9, 3000, 0.04, 0.3); },
    meadows(o, r) { for (let t = 0.3; t < 15; t += 0.5 + r() * 1.3) chirp(o, t, 0.04, r); for (let t = 0.1; t < 15; t += 0.7 + r() * 0.5) cricket(o, t, 0.012); },
    sea(o, r) { noiseBed(o, 0.5, 0.02, 1 / 5, 0.8, r, true); for (let t = 2; t < 15; t += 4 + r() * 4) gull(o, t, 0.04); },
    fog(o, r) { sweep(o, 1, 3.2, 98, 96, 0.22, 'saw'); sweep(o, 1, 3.2, 147, 145, 0.12, 'saw'); sweep(o, 9, 2.5, 98, 96, 0.16, 'saw'); for (let t = 4.5; t < 15; t += 1.1 + r()) drip(o, t, 0.04, r); },
    swamp(o, r) { for (let t = 0.2; t < 15; t += 0.5 + r() * 1.1) frog(o, t, 0.1, r); for (let t = 0.1; t < 15; t += 0.4 + r() * 0.4) cricket(o, t, 0.015); },
    summit(o, r) { for (let t = 0; t < 15; t += 3.75) sweep(o, t, 3.6, 300 + r() * 80, 520 + r() * 100, 0.03, 'sine', 0.01); sweep(o, 6, 0.9, 1500, 1100, 0.05, 'tri', 0.03); },
    caves(o, r) { for (let t = 0.5; t < 15; t += 0.9 + r() * 1.8) drip(o, t, 0.08, r); tone(o, 0, 15, 55, 0.03, 'sine', 2, 0.1); echo(o, 0.23, 0.35); },
    sands(o, r) { // the incentive fair: a game-show jingle, a cash register, a crowd
      voices(o, 0.015, r, 1.2); tune(o, 0.4, [72, 76, 79, 84, 0, 79, 84], 0.16, 0.06, 'square', 0.8); for (const t of [4, 9.5, 13]) { bell(o, t, 2093, 0.05, 0.4); bell(o, t + 0.08, 2637, 0.05, 0.5); } tune(o, 7, [67, 0, 67, 72], 0.18, 0.05, 'square', 0.8); },
    isles(o, r) { noiseBed(o, 0.2, 0.02, 1 / 5, 0.8, r, true); for (let t = 1; t < 15; t += 2.5 + r() * 2) { tone(o, t, 0.08, 1760, 0.05, 'square', 0.002, 1); tone(o, t + 0.12, 0.08, 1320, 0.05, 'square', 0.002, 1); } },
    snakepit(o, r) { for (let t = 0.5; t < 15; t += 1.4 + r() * 2) ring(o, t, 0.05); tone(o, 6, 0.4, 425, 0.03, 'sine', 0.01, 0.5); },
    loop(o, r) { for (let t = 0.2; t < 15; t += 1 + r() * 1.5) typing(o, t, 5 + Math.floor(r() * 8), 0.14, r); for (const t of [4, 9, 13]) { tone(o, t, 0.15, 220, 0.05, 'square', 0.002, 1); tone(o, t + 0.17, 0.2, 196, 0.05, 'square', 0.002, 1); } },
    toll(o, r) { for (let t = 0; t < 15; t += 0.12 + r() * 0.2) bubble(o, t, 0.02, r); for (const t of [2, 7, 12]) sweep(o, t, 0.6, 180, 120, 0.04, 'saw'); },
    clients(o, r) { [72, 76, 79, 84, 88].forEach((n, i) => { bell(o, 0.5 + i * 0.4, note(n), 0.06, 3); bell(o, 7.5 + i * 0.4, note(n - 5), 0.05, 3); }); for (let t = 0.3; t < 15; t += 0.8 + r() * 1.5) chirp(o, t, 0.03, r); }
  };
  const AMB_ALIAS = { port: 'docks', lighthouse: 'sea', wreck: 'sea', meadow: 'meadows', cliffs: 'summit' };

  /* ---------- music ---------- */
  const MOODS = {
    title: { bpm: 88, root: 60, scale: [0, 2, 4, 7, 9], prog: [0, 5, 3, 4], lead: 'tri', drums: 0, bars: 8, vol: 0.9 },
    calm: { bpm: 96, root: 62, scale: [0, 2, 4, 7, 9], prog: [0, 4, 5, 3], lead: 'tri', drums: 1, bars: 8, vol: 1 },
    bright: { bpm: 112, root: 67, scale: [0, 2, 4, 7, 9], prog: [0, 3, 4, 0], lead: 'square', drums: 2, bars: 8, vol: 0.85 },
    tense: { bpm: 84, root: 57, scale: [0, 2, 3, 7, 8], prog: [0, 5, 3, 4], minor: true, lead: 'tri', drums: 3, bars: 8, vol: 1 },
    urgent: { bpm: 136, root: 62, scale: [0, 3, 5, 7, 10], prog: [0, 0, 5, 6], minor: true, lead: 'square', drums: 4, bars: 8, vol: 0.85 },
    night: { bpm: 70, root: 57, scale: [0, 2, 4, 7, 9], prog: [0, 5, 3, 4], lead: 'sine', drums: 0, bars: 8, vol: 0.9 },
    triumph: { bpm: 120, root: 65, scale: [0, 2, 4, 7, 9], prog: [0, 3, 4, 0], lead: 'square', drums: 2, bars: 4, vol: 0.9, fanfare: true }
  };
  // Chord roots as scale-ish semitone offsets for degrees I..VII (major) or i..VII (minor)
  const DEG = { major: [0, 2, 4, 5, 7, 9, 11], minor: [0, 2, 3, 5, 7, 8, 10] };
  function renderMusic(m, seed) {
    const r = rnd(seed);
    const beat = 60 / m.bpm, bar = beat * 4, len = bar * m.bars;
    const o = buf(len);
    const degs = m.minor ? DEG.minor : DEG.major;
    const triad = (d) => [0, 2, 4].map((k) => { const i = d + k; return degs[i % 7] + 12 * Math.floor(i / 7); });
    let pos = 2; // melody position on the scale
    for (let b = 0; b < m.bars; b++) {
      const d = m.prog[b % m.prog.length], t0 = b * bar, chord = triad(d);
      // pad: soft chord, slow attack
      chord.forEach((c) => tone(o, t0, bar * 1.02, note(m.root - 12 + c), 0.05 * m.vol, 'sine', 0.35, 0.25));
      // bass
      for (let k = 0; k < 4; k++) {
        if (m.drums >= 4 || k % 2 === 0 || m.drums >= 2) tone(o, t0 + k * beat, beat * 0.9, note(m.root - 24 + chord[0] + (k === 3 && m.drums >= 2 ? 7 : 0)), 0.16 * m.vol, m.drums >= 4 ? 'saw' : 'sine', 0.01, 2);
      }
      // melody: a random walk on the scale, landing on chord tones on the beat
      const steps = m.drums >= 4 ? 8 : m.bpm < 80 ? 2 : 4;
      for (let k = 0; k < steps; k++) {
        if (r() < (m.drums === 0 ? 0.35 : 0.2)) continue; // rests keep it breathing
        pos = Math.max(0, Math.min(9, pos + Math.round((r() - 0.5) * 3)));
        let semi = m.scale[pos % m.scale.length] + 12 * Math.floor(pos / m.scale.length);
        if (k % (steps / 2) === 0) { const ct = chord.map((c) => c % 12); if (!ct.includes(semi % 12)) semi = ct[Math.floor(r() * ct.length)] + 12 * Math.floor(pos / m.scale.length); }
        const dur = (bar / steps) * (r() < 0.3 ? 1.8 : 0.9);
        tone(o, t0 + k * (bar / steps), dur, note(m.root + 12 + semi), 0.09 * m.vol, m.lead, 0.008, 2.2);
      }
      // drums
      for (let k = 0; k < 8 && m.drums; k++) {
        const t = t0 + k * (beat / 2);
        if (k % 4 === 0 || (m.drums >= 4 && k % 2 === 0)) tone(o, t, 0.18, (u) => 120 - 70 * u, (m.drums === 3 ? 0.35 : 0.3) * m.vol, 'sine', 0.002, 1.5);
        if (m.drums >= 2 && k % 4 === 2) noiseBurst(o, t, 0.12, 0.12 * m.vol, true, r, 0.5);
        if (m.drums !== 3) noiseBurst(o, t, 0.035, (k % 2 ? 0.05 : 0.03) * m.vol, true, r);
        if (m.drums === 3 && k % 4 === 1) tone(o, t, 0.15, (u) => 100 - 50 * u, 0.22 * m.vol, 'sine', 0.002, 1.5); // heartbeat
      }
    }
    if (m.fanfare) [0, 4, 7, 12].forEach((s, i) => tone(o, i * beat * 0.5, beat * (i === 3 ? 3 : 0.5), note(m.root + 12 + s), 0.14 * m.vol, 'square', 0.005, 1.4));
    return o;
  }

  function renderRaw(key) {
    const [kind, name] = key.split(':');
    let o;
    if (kind === 'music') o = renderMusic(MOODS[name] || MOODS.calm, name.length * 97 + 13);
    else { o = buf(15); const fn = AMB[AMB_ALIAS[name] || name] || AMB.meadows; fn(o, rnd(name.length * 131 + 7)); }
    // Even out loudness: music sits a little above ambience, both well under the effects.
    let sum = 0; for (let i = 0; i < o.length; i++) sum += o[i] * o[i];
    let peak = 0; for (let i = 0; i < o.length; i++) peak = Math.max(peak, Math.abs(o[i]));
    const rms = Math.sqrt(sum / o.length) || 1;
    const k = Math.min(kind === 'music' ? 25 : 6, (kind === 'music' ? 0.1 : 0.05) / rms, 0.8 / (peak || 1));
    for (let i = 0; i < o.length; i++) o[i] *= k;
    return o;
  }
  if (scope) scope.onmessage = (e) => {
    const key = e.data && e.data.key;
    try { const f = renderRaw(key), w = wavBytes(f); scope.postMessage({ key, f, w }, [f.buffer, w]); }
    catch (err) { scope.postMessage({ key, err: String(err && err.message || err) }); }
  };
  return { RATE, renderRaw, wavBytes };
  }

  const LIB = synthLib(null);
  const RATE = LIB.RATE;
  const cache = {}, wavs = {}, waiting = {};
  let worker = null;
  try {
    worker = new Worker(URL.createObjectURL(new Blob(['(' + synthLib.toString() + ')(self);'], { type: 'text/javascript' })));
    worker.onmessage = (e) => {
      const { key, f, w, err } = e.data || {};
      if (!err) { cache[key] = f; wavs[key] = w; }
      const done = waiting[key]; delete waiting[key];
      if (done) done.forEach((fn) => fn());
    };
    worker.onerror = () => { worker = null; Object.keys(waiting).forEach((k) => { const d = waiting[k]; delete waiting[k]; d.forEach((fn) => fn()); }); };
  } catch (e) { worker = null; }
  /* Make sure a loop exists, without blocking the page. Calls back when it's ready. */
  function ensure(key, then) {
    if (cache[key]) { if (then) then(); return; }
    if (waiting[key]) { if (then) waiting[key].push(then); return; }
    waiting[key] = then ? [then] : [];
    if (worker) { worker.postMessage({ key }); return; }
    // No worker: render on the page, but after the current tap has finished drawing.
    setTimeout(() => { try { render(key); } catch (e) { /* ignore */ } const d = waiting[key] || []; delete waiting[key]; d.forEach((fn) => fn()); }, 60);
  }
  function render(key) { return cache[key] || (cache[key] = LIB.renderRaw(key)); } // synchronous; tests and fallback only
  const urls = {};
  const urlFor = (key) => urls[key] || (urls[key] = URL.createObjectURL(new Blob([wavs[key] || LIB.wavBytes(render(key))], { type: 'audio/wav' })));

  /* ---------- players ----------
   * Web Audio path (preferred): a looping buffer source into the shared master, so
   * music, ambience and effects all mix. Fallback: two reusable <audio> elements. */
  const FX = () => PP.fx || {};
  let webSrc = null, webKey = null;
  const webBufs = {};
  function stopWeb() { if (webSrc) { try { webSrc.stop(); } catch (e) { /* already stopped */ } webSrc.disconnect(); webSrc = null; webKey = null; } }
  function playWeb(key) {
    if (webKey === key && webSrc) return;
    stopWeb();
    const f = FX();
    const src = f.ac.createBufferSource();
    src.buffer = webBufs[key] || (webBufs[key] = f.toBuffer(render(key)));
    src.loop = true;
    const g = f.ac.createGain(); g.gain.setValueAtTime(0.0001, f.ac.currentTime); g.gain.exponentialRampToValueAtTime(1, f.ac.currentTime + 0.6);
    src.connect(g).connect(f.master); src.start();
    webSrc = src; webKey = key;
  }

  const players = [new Audio(), new Audio()];
  players.forEach((p) => { p.loop = true; p.preload = 'auto'; p.setAttribute('playsinline', ''); });
  let cur = 0;
  function stopHtml() { players.forEach((p) => { p._live = false; p.pause(); }); }
  function playHtml(key) {
    const same = players.find((x) => x._key === key);
    const p = same || players[(cur = 1 - cur)];
    players.forEach((x) => { if (x !== p) { x._live = false; x.pause(); } });
    if (!same) { p.src = urlFor(key); p._key = key; }
    p._live = true;
    const pr = p.play();
    if (pr && pr.catch) pr.catch((e) => { if (e && e.name === 'AbortError') return; A.err = String(e && e.name || e); p._live = false; });
  }

  function apply(key) {
    const want = key && A.music && !A.held;
    const f = FX();
    if (!want) { stopWeb(); stopHtml(); return; }
    if (!f.audio || !f.audio.unlocked) { ensure(key); return; } // nothing can play before the first tap, but get it ready
    if (!cache[key]) { ensure(key, () => { if (A.key === key) apply(key); }); return; } // still generating: the current loop keeps playing until it's ready
    try {
      if (f.web && f.web()) { stopHtml(); playWeb(key); A.engine = 'web'; }
      else { stopWeb(); playHtml(key); A.engine = 'html'; }
    } catch (e) { A.err = String(e && e.message || e); }
  }
  // The first tap starts the engine; whenever the engine state changes, (re)start the right loop.
  document.addEventListener('pp-audio', () => apply(A.key));
  // Warm up the common loops in the background (the worker does the work; the page stays responsive).
  ['music:title', 'town:office', 'music:calm', 'town:docks', 'town:square', 'town:trailhead', 'music:tense', 'music:bright'].forEach((k, i) => setTimeout(() => { if (worker) ensure(k); }, 800 + i * 400));
  // On every tap: if music should be playing but isn't (iOS can stop it), start it right there.
  ['touchend', 'click'].forEach((t) => document.addEventListener(t, () => {
    const f = FX();
    if (!A.key || !A.music || A.held) return;
    if (f.web && f.web()) { if (!webSrc) apply(A.key); }
    else if (!players.some((p) => p._live && !p.paused)) apply(A.key);
  }));

  A.bed = (key) => { if (key === A.key) return; A.key = key; apply(key); };
  A.hold = (on) => { A.held = on; apply(A.key); };
  A.toggle = () => {
    A.music = !A.music; PP.store.set('music', A.music);
    document.querySelectorAll('.fx-music').forEach((x) => { x.setAttribute('aria-pressed', String(A.music)); x.textContent = A.music ? 'Music on' : 'Music off'; });
    apply(A.key);
  };
  A.button = () => PP.h('button', { class: 'fx-sound fx-music', 'aria-pressed': String(A.music), title: 'Music and ambience', onclick: A.toggle }, A.music ? 'Music on' : 'Music off');
  document.addEventListener('visibilitychange', () => { if (document.hidden) { stopWeb(); stopHtml(); } else apply(A.key); });

  /* Mood of the trail right now, from the journey state. */
  A.trailMood = (s) => {
    if (!s) return 'calm';
    if (s.pace === 'breakneck') return 'urgent';
    const debt = (s.debt || []).length;
    if (s.res.energy <= 3 || s.res.trust <= 3 || debt >= 3) return 'tense';
    if (s.res.trust >= 7 && s.res.momentum >= 6) return 'bright';
    return 'calm';
  };
  A.render = render; // for testing
  A.status = () => { const f = PP.fx || {}; const p = players.find((x) => x._live); const playing = f.web && f.web() ? !!webSrc : !!(p && !p.paused); return `Music ${A.music ? 'on' : 'off'} · ${A.key || 'nothing queued'} · ${playing ? 'playing' : 'not playing'} · engine ${f.web && f.web() ? 'web audio' : 'audio elements'}${f.ac ? ' (' + f.ac.state + ')' : ''}` + (A.err ? ` · ${A.err}` : ''); };
})(window.PP);
