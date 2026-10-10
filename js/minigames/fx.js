/* Game feel for mini-games: instant visual and audio feedback.
 *   PP.fx.pop(box, x, y, text, kind)       floating "+1" style text
 *   PP.fx.popOn(box, el, text, kind)       same, centered on an element
 *   PP.fx.burst(box, x, y, kind, n)        sparkle particles
 *   PP.fx.shake(el) / PP.fx.glow(el, kind) element reactions
 *   PP.fx.stamp(box, text, kind)           big stamp across the play area
 *   PP.fx.fly(el, target, box, done)       a copy of el flies into target
 *   PP.fx.meter(label, kind)               live meter {el, set(v, max)}
 *   PP.fx.counter(label)                   live number {el, set(n)} with a bump
 *   PP.fx.sfx(name)                        tiny synthesized sounds (mutable)
 * And simple character art:
 *   PP.art.face({ mood, hue, hair, surprised })   SVG string, mood -2..2
 *   PP.art.figure(kind, opts)                    SVG string, a full person with props
 */
(function (PP) {
  const h = PP.h;
  const fx = (PP.fx = { sound: PP.store.get('sound', true) });

  function rel(box, el) {
    const b = box.getBoundingClientRect(), r = el.getBoundingClientRect();
    return { x: r.left - b.left + r.width / 2, y: r.top - b.top + r.height / 2, w: r.width, h: r.height };
  }
  fx.rel = rel;

  fx.pop = (box, x, y, text, kind) => {
    const el = h('div', { class: 'fx-pop k-' + (kind || 'good'), style: { left: x + 'px', top: y + 'px' } }, text);
    box.appendChild(el);
    setTimeout(() => el.remove(), 1200);
  };
  fx.popOn = (box, target, text, kind) => { const p = rel(box, target); fx.pop(box, p.x, p.y - p.h / 3, text, kind); };

  fx.burst = (box, x, y, kind, n = 12) => {
    for (let i = 0; i < n; i++) {
      const a = (i / n) * Math.PI * 2 + Math.random() * 0.4, d = 30 + Math.random() * 40;
      const el = h('i', { class: 'fx-spark k-' + (kind || 'good'), style: { left: x + 'px', top: y + 'px', '--dx': Math.cos(a) * d + 'px', '--dy': Math.sin(a) * d + 'px' } });
      box.appendChild(el);
      setTimeout(() => el.remove(), 700);
    }
  };
  fx.burstOn = (box, target, kind, n) => { const p = rel(box, target); fx.burst(box, p.x, p.y, kind, n); };

  const retrigger = (el, cls, ms) => { el.classList.remove(cls); void el.offsetWidth; el.classList.add(cls); setTimeout(() => el.classList.remove(cls), ms); };
  fx.shake = (el) => retrigger(el, 'fx-shake', 450);
  fx.glow = (el, kind) => retrigger(el, 'fx-glow-' + (kind || 'good'), 600);
  fx.bump = (el) => retrigger(el, 'fx-bump', 350);

  fx.stamp = (box, text, kind) => {
    const el = h('div', { class: 'fx-stamp k-' + (kind || 'good') }, text);
    box.appendChild(el);
    setTimeout(() => el.remove(), 900);
  };

  fx.fly = (el, target, box, done) => {
    const a = rel(box, el), b = rel(box, target);
    const ghost = el.cloneNode(true);
    ghost.classList.add('fx-ghost');
    Object.assign(ghost.style, { left: a.x - a.w / 2 + 'px', top: a.y - a.h / 2 + 'px', width: a.w + 'px', height: a.h + 'px' });
    box.appendChild(ghost);
    requestAnimationFrame(() => requestAnimationFrame(() => {
      ghost.style.transform = `translate(${b.x - a.x}px, ${b.y - a.y}px) scale(0.25) rotate(${Math.random() * 30 - 15}deg)`;
      ghost.style.opacity = '0.2';
    }));
    setTimeout(() => { ghost.remove(); done && done(); }, 480);
  };

  fx.meter = (label, kind) => {
    const fill = h('div', { class: 'fx-meter-fill k-' + (kind || 'good') });
    const num = h('span', { class: 'fx-meter-num' });
    const el = h('div', { class: 'fx-meter' }, h('span', { class: 'fx-meter-label' }, label), h('div', { class: 'fx-meter-track' }, fill), num);
    let last = null;
    return {
      el,
      set(v, max = 10, text) {
        fill.style.width = Math.max(0, Math.min(1, v / max)) * 100 + '%';
        num.textContent = text != null ? text : Math.round(v) + '/' + max;
        if (last != null && v !== last) fx.bump(num);
        last = v;
      }
    };
  };
  fx.counter = (label) => {
    const num = h('strong', null, '0');
    const el = h('div', { class: 'fx-counter' }, h('span', null, label), num);
    let last = 0;
    return { el, set(n) { num.textContent = String(n); if (n !== last) fx.bump(num); last = n; } };
  };

  /* Sounds: tiny oscillator sequences. [freq, start, duration, type, volume] */
  const SFX = {
    click: [[520, 0, 0.04, 'square', 0.03]],
    good: [[660, 0, 0.09, 'triangle', 0.12], [990, 0.08, 0.14, 'triangle', 0.12]],
    great: [[660, 0, 0.08, 'triangle', 0.12], [880, 0.07, 0.08, 'triangle', 0.12], [1320, 0.14, 0.18, 'triangle', 0.12]],
    bad: [[200, 0, 0.12, 'sawtooth', 0.07], [150, 0.1, 0.18, 'sawtooth', 0.07]],
    meh: [[440, 0, 0.1, 'sine', 0.08], [392, 0.09, 0.12, 'sine', 0.08]],
    coin: [[988, 0, 0.06, 'square', 0.05], [1319, 0.06, 0.2, 'square', 0.05]],
    ring: [[1200, 0, 0.06, 'sine', 0.05], [950, 0.07, 0.06, 'sine', 0.05], [1200, 0.14, 0.06, 'sine', 0.05], [950, 0.21, 0.06, 'sine', 0.05]],
    ding: [[1568, 0, 0.25, 'sine', 0.07]],
    thump: [[110, 0, 0.12, 'sine', 0.25]],
    whoosh: [[300, 0, 0.15, 'triangle', 0.05], [600, 0.04, 0.12, 'triangle', 0.04]]
  };
  /* Audio on phones needs three things the old code never did:
   *  1. The audio context must be created and resumed inside a real tap, not a timer.
   *  2. iPhone treats Web Audio as "ambient", so the ring/silent switch mutes it.
   *     Asking for the 'playback' audio session (Safari 17+) makes it behave like a game.
   *  3. A context that the browser suspends later (backgrounding, calls) has to be resumed. */
  function ctx() {
    const AC = window.AudioContext || window.webkitAudioContext;
    if (!AC) return null;
    if (!fx.ac) {
      try { if (navigator.audioSession) navigator.audioSession.type = 'playback'; } catch (e) { /* not supported */ }
      fx.ac = new AC();
      fx.master = fx.ac.createGain();
      fx.master.gain.value = 1.8; // phone speakers are small; the raw levels were very quiet
      fx.master.connect(fx.ac.destination);
    }
    if (fx.ac.state === 'suspended' || fx.ac.state === 'interrupted') fx.ac.resume().catch(() => {});
    return fx.ac;
  }
  function unlock() {
    const ac = ctx();
    if (!ac) return;
    try { // a silent one-sample buffer, played inside the tap, unlocks output on iOS
      const b = ac.createBuffer(1, 1, 22050), src = ac.createBufferSource();
      src.buffer = b; src.connect(ac.destination); src.start(0);
    } catch (e) { /* ignore */ }
    if (ac.state === 'running') ['pointerdown', 'touchend', 'keydown', 'click'].forEach((t) => document.removeEventListener(t, unlock, true));
  }
  ['pointerdown', 'touchend', 'keydown', 'click'].forEach((t) => document.addEventListener(t, unlock, true));
  document.addEventListener('visibilitychange', () => { if (!document.hidden && fx.ac) fx.ac.resume().catch(() => {}); });

  fx.sfx = (name) => {
    if (!fx.sound || !SFX[name]) return;
    try {
      const ac = ctx();
      if (!ac) return;
      const t0 = ac.currentTime + 0.01;
      SFX[name].forEach(([f, st, d, type, vol]) => {
        const o = ac.createOscillator(), g = ac.createGain();
        o.type = type || 'sine'; o.frequency.value = f;
        g.gain.setValueAtTime(0.0001, t0 + st);
        g.gain.exponentialRampToValueAtTime(vol || 0.1, t0 + st + 0.01);
        g.gain.exponentialRampToValueAtTime(0.0001, t0 + st + d);
        o.connect(g).connect(fx.master);
        o.start(t0 + st); o.stop(t0 + st + d + 0.02);
      });
    } catch (e) { /* audio unavailable */ }
  };
  fx.soundToggle = () => {
    const b = h('button', { class: 'fx-sound', 'aria-pressed': String(fx.sound), title: 'Sound effects', onclick: () => { fx.sound = !fx.sound; PP.store.set('sound', fx.sound); document.querySelectorAll('.fx-sound').forEach((x) => { x.setAttribute('aria-pressed', String(fx.sound)); x.textContent = fx.sound ? 'Sound on' : 'Sound off'; }); if (fx.sound) fx.sfx('ding'); } }, fx.sound ? 'Sound on' : 'Sound off');
    return b;
  };

  /* ---------- Character art ----------
   * Drawn like the map: flat muted fills, one even dark-brown line, no gradients,
   * small simple features. Faces are head-and-shoulders busts that react (mood -2..2). */
  const INK = '#4a2c12', SW = 2.2;
  const SKIN = ['#f3d6b6', '#e6bb93', '#cf9a70', '#ad7752', '#83583a', '#f6e0c8'];
  const HAIR = ['#4a2c12', '#2e241d', '#9c6a3c', '#cfa15a', '#8a4a2a', '#bdb1a2'];
  const COAT = ['#2f5a9c', '#7f9f5a', '#b0763c', '#9cc2e6', '#c86f4f', '#e6b85c', '#6f6a9a', '#5f8f86'];
  const pickBy = (arr, n) => arr[Math.abs(Math.round(n)) % arr.length];
  const ln = (d, w) => `<path d="${d}" fill="none" stroke="${INK}" stroke-width="${w || SW}" stroke-linecap="round" stroke-linejoin="round"/>`;
  const sh = (d, fill, w) => `<path d="${d}" fill="${fill}" stroke="${INK}" stroke-width="${w || SW}" stroke-linejoin="round"/>`;
  PP.art = { INK, SKIN, HAIR, COAT };

  /* Hair styles for the bust, drawn over a head centred at 50,44 (rx 21, ry 24). */
  const BUST_HAIR = [
    (c) => sh('M28,44 Q26,18 50,17 Q74,18 72,44 Q70,30 60,28 Q50,33 36,29 Q30,33 28,44z', c), // short
    (c) => sh('M28,46 Q24,16 52,16 Q76,18 72,46 L70,34 Q58,32 46,24 Q40,32 30,34z', c), // side part
    (c) => sh('M28,40 Q30,18 50,18 Q70,18 72,40 Q66,27 50,27 Q34,27 28,40z', c) + sh('M44,16 a7,6 0 1 1 12,0 a7,6 0 1 1 -12,0z', c), // bun
    (c) => sh('M27,70 Q20,40 30,24 Q40,14 54,16 Q76,18 74,44 L74,70 Q70,58 70,42 Q64,30 50,28 Q36,30 31,42 Q30,58 27,70z', c), // long
    (c) => sh('M29,42 Q28,34 32,30 L34,40z', c) + sh('M71,42 Q72,34 68,30 L66,40z', c), // bald
    (c) => sh('M27,46 Q22,22 38,18 Q50,10 64,18 Q78,24 73,46 Q72,34 66,30 Q60,36 50,30 Q40,36 34,30 Q28,36 27,46z', c) // curly
  ];

  PP.art.face = function (o = {}) {
    const mood = Math.max(-2, Math.min(2, o.mood || 0));
    const n = o.hue || 0;
    const skin = o.skin || pickBy(SKIN, n / 37);
    const hair = o.hair || pickBy(HAIR, n / 53);
    const coat = o.coat || pickBy(COAT, n / 29);
    const style = BUST_HAIR[o.style != null ? o.style : Math.abs(Math.round(n / 41)) % BUST_HAIR.length];
    const browY = 36 - (mood > 0 ? 1 : 0), tilt = mood * -1.6;
    const brows = ln(`M37,${browY + tilt} l8,${-tilt * 0.6}`, 2) + ln(`M63,${browY + tilt} l-8,${-tilt * 0.6}`, 2);
    const eyes = mood >= 2
      ? ln('M38,45 q3,-3.5 6,0', 2) + ln('M56,45 q3,-3.5 6,0', 2)
      : `<circle cx="41" cy="45" r="${o.surprised ? 2.6 : 2}" fill="${INK}"/><circle cx="59" cy="45" r="${o.surprised ? 2.6 : 2}" fill="${INK}"/>`;
    const mouth = o.surprised ? `<ellipse cx="50" cy="58" rx="3.2" ry="4" fill="${INK}"/>`
      : mood >= 2 ? sh('M42,55 Q50,64 58,55z', '#fbf1e1', 2)
      : ln(`M43,${57 - mood * 0.6} Q50,${57 + mood * 3} 57,${57 - mood * 0.6}`, 2);
    const cheeks = mood >= 1 ? '<circle cx="35" cy="53" r="3.5" fill="#e79a7a" opacity=".45"/><circle cx="65" cy="53" r="3.5" fill="#e79a7a" opacity=".45"/>' : '';
    const sweat = mood <= -2 ? sh('M74,30 q3.5,6 0,9 q-3.5,-3 0,-9z', '#cfe3f7', 1.6) : '';
    const glasses = o.glasses || (Math.round(n / 67) % 4 === 1) ? ln('M35,45 a5.5,5 0 1 0 11,0 a5.5,5 0 1 0 -11,0 M54,45 a5.5,5 0 1 0 11,0 a5.5,5 0 1 0 -11,0 M46,45 h8', 1.6) : '';
    return `<svg viewBox="0 0 100 100" class="art-face" aria-hidden="true">
      <circle cx="50" cy="50" r="48" fill="#fbf1e1"/>
      <clipPath id="cf${n | 0}${mood + 2}"><circle cx="50" cy="50" r="48"/></clipPath>
      <g clip-path="url(#cf${n | 0}${mood + 2})">
        ${sh('M12,104 Q14,78 50,76 Q86,78 88,104z', coat)}
        ${sh('M43,64 L43,76 Q50,82 57,76 L57,64z', skin)}
        ${ln('M40,77 L50,90 L60,77', 1.8)}
      </g>
      ${sh('M28,46 a3.5,5 0 1 0 0.1,0z', skin, 1.8)}${sh('M72,46 a3.5,5 0 1 1 -0.1,0z', skin, 1.8)}
      <ellipse cx="50" cy="44" rx="21" ry="24" fill="${skin}" stroke="${INK}" stroke-width="${SW}"/>
      ${style(hair)}
      ${brows}${eyes}${glasses}${cheeks}${mouth}${sweat}
      <circle cx="50" cy="50" r="48" fill="none" stroke="${INK}" stroke-width="1.6"/>
    </svg>`;
  };

  /* Full figures for the market, the mixer, the trail. Same line and palette as the map.
   * viewBox 0 0 70 100, feet on y=96. */
  const KIND_COAT = { family: '#7f9f5a', retiree: '#9a8fc0', vendor: '#e9dcc0', couple: '#9cc2e6', jogger: '#c86f4f', kid: '#e6b85c', dog: '#9aa3b5', phone: '#5f8f86', owner: '#b0763c', rival: '#3a3430', mlm: '#a77bb8', president: '#2f5a9c', connector: '#3f7a2f', numbers: '#8fa9b3', guest: '#b0763c', agent: '#000a62', client: '#7f9f5a' };
  PP.art.figure = function (kind, o = {}) {
    const seed = o.seed || 1;
    const skin = o.skin || pickBy(SKIN, seed), hair = o.hair || pickBy(HAIR, seed * 3);
    const coat = o.coat || KIND_COAT[kind] || pickBy(COAT, seed);
    const pants = kind === 'jogger' ? '#3a3430' : '#6b5a48';
    let back = '', front = '', hat = '';
    const arms = { l: 'M22,42 L16,62', r: 'M48,42 L54,62' };
    switch (kind) {
      case 'family':
        front = sh('M50,70 h16 v10 h-16z', '#9cc2e6', 2) + ln('M50,71 L46,60', 2) + `<circle cx="53" cy="84" r="3" fill="${INK}"/><circle cx="63" cy="84" r="3" fill="${INK}"/>`;
        arms.r = 'M48,42 L47,60'; break;
      case 'retiree':
        hat = sh('M20,18 Q35,12 50,18 L46,20 Q35,17 24,20z', '#e6c98a', 2) + sh('M27,17 Q28,8 35,8 Q42,8 43,17z', '#e6c98a', 2);
        front = ln('M54,62 L58,96', 2.4); arms.r = 'M48,42 L55,62'; break;
      case 'vendor':
        front = sh('M24,46 h22 v26 h-22z', '#fbf1e1', 1.8) + sh('M50,56 a6,6 0 1 0 0.1,0z', '#e6b85c', 1.8);
        arms.r = 'M48,42 L52,56'; break;
      case 'jogger':
        hat = ln('M24,16 Q35,8 46,16', 2.4) + `<circle cx="24" cy="20" r="2.6" fill="${INK}"/><circle cx="46" cy="20" r="2.6" fill="${INK}"/>`;
        arms.l = 'M22,42 L14,52 L20,58'; arms.r = 'M48,42 L56,50 L60,42'; break;
      case 'kid':
        front = ln('M50,52 L56,14', 1.4) + sh('M56,4 a7,9 0 1 0 0.1,0z', '#c86f4f', 1.8);
        arms.r = 'M48,42 L52,52'; break;
      case 'dog':
        front = ln('M48,46 L58,78', 1.4) + sh('M48,84 q2,-8 12,-8 h4 l4,-6 l4,4 l-2,6 q2,4 0,8z', '#c79a6a', 1.8) + ln('M52,84 v8 M62,84 v8', 2);
        arms.r = 'M48,42 L50,50'; break;
      case 'phone':
        front = sh('M44,22 h6 v11 h-6z', '#3a3430', 1.4) + ln('M53,20 q4,4 0,9 M56,17 q7,7 0,15', 1.4);
        arms.r = 'M48,42 L48,30'; break;
      case 'couple':
        front = sh('M44,48 h16 v12 h-16z', '#fbf1e1', 1.8) + ln('M47,52 h10 M47,56 h7', 1.2);
        arms.r = 'M48,42 L48,52'; break;
      case 'rival':
        hat = sh('M21,17 Q35,4 49,17z', '#3a3430', 2);
        front = sh('M33,34 l2,14 l2,-14z', '#c86f4f', 1.2) + sh('M50,60 h14 v10 h-14z', '#7a5a3a', 1.8);
        arms.r = 'M48,42 L52,60'; break;
      case 'mlm':
        front = sh('M48,52 h9 v14 h-9z', '#c9b3e8', 1.8) + sh('M50,48 h5 v4 h-5z', INK, 1);
        arms.r = 'M48,42 L50,52'; break;
      case 'president':
        front = sh('M33,34 l-2,16 l4,4 l4,-4 l-2,-16z', '#c86f4f', 1.2); break;
      case 'numbers':
        front = sh('M44,46 h16 v20 h-16z', '#dce6bc', 1.8) + ln('M44,52 h16 M44,58 h16 M52,46 v20', 1);
        arms.r = 'M48,42 L48,54'; break;
      case 'connector':
        front = ln('M48,42 L58,34', SW) + sh('M57,30 a4,4 0 1 0 0.1,0z', skin, 1.6); arms.r = ''; break;
      case 'owner':
        back = sh('M18,44 Q35,38 52,44 L50,76 L20,76z', '#fbf1e1', 1.8); break;
      case 'agent':
        back = sh('M12,40 Q12,34 18,34 h6 v30 h-12z', '#f39c12', 1.8);
        front = ln('M50,40 L60,96', 2.2); arms.r = 'M48,42 L56,58'; break;
      case 'client':
        front = sh('M46,48 h14 v10 h-14z', '#fbf1e1', 1.6) + ln('M50,48 v10 M55,48 v10', 1);
        arms.r = 'M48,42 L48,52'; break;
    }
    const step = kind === 'jogger' || o.walk;
    const legs = step ? ln('M30,74 L22,96', 4.5) + ln('M40,74 L50,94', 4.5) : ln('M30,74 L29,96', 4.5) + ln('M40,74 L41,96', 4.5);
    const legsFill = step ? ln('M30,74 L22,96', 2.2).replace(INK, pants) + ln('M40,74 L50,94', 2.2).replace(INK, pants) : ln('M30,74 L29,96', 2.2).replace(INK, pants) + ln('M40,74 L41,96', 2.2).replace(INK, pants);
    const hairShape = Math.round(seed) % 3 === 1
      ? sh('M23,22 Q22,8 35,8 Q48,8 47,22 L47,30 Q44,20 35,18 Q26,20 23,30z', hair, 2)
      : sh('M23,22 Q23,9 35,9 Q47,9 47,22 Q42,15 35,15 Q28,15 23,22z', hair, 2);
    const g = `
      <ellipse cx="35" cy="96" rx="16" ry="2.6" fill="${INK}" opacity=".12"/>
      ${back}${legs}${legsFill}
      ${arms.l ? ln(arms.l, 5) + ln(arms.l, 2.4).replace(INK, coat) : ''}
      ${sh('M22,40 Q35,32 48,40 L46,76 L24,76z', coat)}
      ${arms.r ? ln(arms.r, 5) + ln(arms.r, 2.4).replace(INK, coat) : ''}
      ${sh('M31,30 h8 v6 h-8z', skin, 1.6)}
      <circle cx="35" cy="21" r="11" fill="${skin}" stroke="${INK}" stroke-width="${SW}"/>
      ${hairShape}${hat}
      <circle cx="31.5" cy="22" r="1.4" fill="${INK}"/><circle cx="38.5" cy="22" r="1.4" fill="${INK}"/>
      ${ln('M32,26.5 q3,2.2 6,0', 1.5)}
      ${front}`;
    const t = kind === 'kid' ? 'transform="translate(10 30) scale(.7)"' : '';
    return `<svg viewBox="0 0 70 100" class="art-figure" aria-hidden="true"><g ${t}>${g}</g></svg>`;
  };
})(window.PP);
/* Small tap sounds outside the mini-games too, and a sound switch in the top bar. */
(function (PP) {
  document.addEventListener('click', (e) => {
    const t = e.target.closest && e.target.closest('.choice, .menu-item, .btn, .tp, .arrival-card, .pack-item');
    if (t && !t.closest('.mg') && !t.classList.contains('fx-sound') && !t.disabled) PP.fx.sfx('click');
  });
  document.addEventListener('DOMContentLoaded', () => {
    const bar = document.querySelector('.topbar');
    if (bar && PP.fx.soundToggle) bar.appendChild(PP.fx.soundToggle());
  });
})(window.PP);
