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
  fx.sfx = (name) => {
    if (!fx.sound || !SFX[name]) return;
    try {
      const AC = window.AudioContext || window.webkitAudioContext;
      if (!AC) return;
      fx.ac = fx.ac || new AC();
      const ac = fx.ac, t0 = ac.currentTime + 0.01;
      SFX[name].forEach(([f, st, d, type, vol]) => {
        const o = ac.createOscillator(), g = ac.createGain();
        o.type = type || 'sine'; o.frequency.value = f;
        g.gain.setValueAtTime(0.0001, t0 + st);
        g.gain.exponentialRampToValueAtTime(vol || 0.1, t0 + st + 0.01);
        g.gain.exponentialRampToValueAtTime(0.0001, t0 + st + d);
        o.connect(g).connect(ac.destination);
        o.start(t0 + st); o.stop(t0 + st + d + 0.02);
      });
    } catch (e) { /* audio unavailable */ }
  };
  fx.soundToggle = () => {
    const b = h('button', { class: 'fx-sound', 'aria-pressed': String(fx.sound), title: 'Sound effects', onclick: () => { fx.sound = !fx.sound; PP.store.set('sound', fx.sound); b.setAttribute('aria-pressed', String(fx.sound)); b.textContent = fx.sound ? 'Sound on' : 'Sound off'; if (fx.sound) fx.sfx('click'); } }, fx.sound ? 'Sound on' : 'Sound off');
    return b;
  };

  /* ---------- Character art ---------- */
  const SKIN = ['#f2c79a', '#e8b48a', '#c98d62', '#a86f48', '#7a4f33', '#f5d3b5'];
  const HAIR = ['#4a2e14', '#1f1a17', '#b07a43', '#d9a441', '#7a3b1e', '#9a9a9a'];
  const pickBy = (arr, n) => arr[Math.abs(Math.round(n)) % arr.length];
  PP.art = {};
  PP.art.face = function (o = {}) {
    const mood = Math.max(-2, Math.min(2, o.mood || 0));
    const skin = o.skin || pickBy(SKIN, (o.hue || 0) / 37);
    const hair = o.hair || pickBy(HAIR, (o.hue || 0) / 53);
    const brow = mood * -3;
    const mouth = o.surprised ? '<ellipse cx="50" cy="70" rx="6" ry="8" fill="#4a2e14"/>'
      : `<path d="M36,${68 - mood} Q50,${68 + mood * 6} 64,${68 - mood}" fill="none" stroke="#4a2e14" stroke-width="3.5" stroke-linecap="round"/>`;
    const blush = mood >= 2 ? '<circle cx="31" cy="62" r="5" fill="#f28b82" opacity=".5"/><circle cx="69" cy="62" r="5" fill="#f28b82" opacity=".5"/>' : '';
    const sweat = mood <= -2 ? '<path d="M76,36 q4,8 0,12 q-4,-4 0,-12z" fill="#7cc4ff" stroke="#4a2e14" stroke-width="1.5"/>' : '';
    return `<svg viewBox="0 0 100 100" class="art-face" aria-hidden="true">
      <circle cx="50" cy="54" r="34" fill="${skin}" stroke="#4a2e14" stroke-width="3"/>
      <path d="M16,50 Q18,14 50,16 Q82,14 84,50 Q74,30 50,30 Q26,30 16,50z" fill="${hair}" stroke="#4a2e14" stroke-width="3"/>
      <path d="M33,${42 - brow * 0.3} l12,${brow}" stroke="#4a2e14" stroke-width="3" stroke-linecap="round"/>
      <path d="M67,${42 - brow * 0.3} l-12,${brow}" stroke="#4a2e14" stroke-width="3" stroke-linecap="round"/>
      <circle cx="39" cy="52" r="3.6" fill="#4a2e14"/><circle cx="61" cy="52" r="3.6" fill="#4a2e14"/>
      ${blush}${mouth}${sweat}</svg>`;
  };

  /* Full figures for the market and the mixer. kind picks clothes and props. */
  PP.art.figure = function (kind, o = {}) {
    const skin = pickBy(SKIN, o.seed || 1), hair = pickBy(HAIR, (o.seed || 1) * 3);
    const coat = o.coat || { family: '#6f9a54', retiree: '#c9a0dc', vendor: '#e8dcc0', couple: '#7cc4ff', jogger: '#ff7262', kid: '#f2b544', dog: '#9aa3b5', phone: '#5a6b8a', owner: '#c4532d', rival: '#2a2a2a', mlm: '#b46ad8', president: '#10196b', connector: '#3f8a4a', numbers: '#6b8f9e', guest: '#8a6a44' }[kind] || '#8a6a44';
    let extra = '';
    if (kind === 'family') extra = '<g transform="translate(40 58)"><rect x="0" y="0" width="22" height="14" rx="4" fill="#4a6fb0" stroke="#4a2e14" stroke-width="2"/><circle cx="4" cy="20" r="4" fill="#4a2e14"/><circle cx="18" cy="20" r="4" fill="#4a2e14"/><path d="M0,2 l-8,-10" stroke="#4a2e14" stroke-width="2"/></g>';
    if (kind === 'retiree') extra = '<ellipse cx="30" cy="12" rx="20" ry="5" fill="#f2d28a" stroke="#4a2e14" stroke-width="2"/><rect x="21" y="2" width="18" height="10" rx="4" fill="#f2d28a" stroke="#4a2e14" stroke-width="2"/>';
    if (kind === 'vendor') extra = '<rect x="20" y="40" width="20" height="26" fill="#fff" stroke="#4a2e14" stroke-width="2"/><circle cx="46" cy="52" r="6" fill="#d9a441" stroke="#4a2e14" stroke-width="2"/>';
    if (kind === 'jogger') extra = '<path d="M18,22 q12,-8 24,0" fill="none" stroke="#1f1a17" stroke-width="3"/><circle cx="18" cy="24" r="3" fill="#1f1a17"/><circle cx="42" cy="24" r="3" fill="#1f1a17"/>';
    if (kind === 'kid') extra = '<path d="M44,40 L52,6" stroke="#4a2e14" stroke-width="1.5"/><ellipse cx="53" cy="4" rx="7" ry="9" fill="#ff7262" stroke="#4a2e14" stroke-width="2"/>';
    if (kind === 'dog') extra = '<g transform="translate(38 70)"><ellipse cx="10" cy="6" rx="14" ry="8" fill="#b07a43" stroke="#4a2e14" stroke-width="2"/><circle cx="24" cy="0" r="6" fill="#b07a43" stroke="#4a2e14" stroke-width="2"/></g><path d="M40,48 L60,70" stroke="#4a2e14" stroke-width="1.5"/>';
    if (kind === 'phone') extra = '<rect x="38" y="16" width="7" height="13" rx="2" fill="#2a2a2a" stroke="#4a2e14" stroke-width="1.5"/><path d="M48,14 q6,4 0,10 M52,11 q9,7 0,16" fill="none" stroke="#4a2e14" stroke-width="1.5"/>';
    if (kind === 'couple') extra = '<rect x="42" y="44" width="16" height="12" fill="#fff" stroke="#4a2e14" stroke-width="2"/><path d="M45,48 h10 M45,52 h7" stroke="#4a2e14" stroke-width="1.2"/>';
    if (kind === 'rival') extra = '<path d="M22,14 Q30,2 42,12" fill="none" stroke="#1f1a17" stroke-width="5"/><path d="M28,38 l2,18 l2,-18z" fill="#d9a441"/>';
    if (kind === 'mlm') extra = '<rect x="42" y="44" width="10" height="16" rx="3" fill="#b9a0e8" stroke="#4a2e14" stroke-width="2"/><rect x="44" y="40" width="6" height="5" fill="#4a2e14"/>';
    if (kind === 'president') extra = '<path d="M30,36 l-4,22 l4,4 l4,-4z" fill="#c4321f"/>';
    if (kind === 'numbers') extra = '<rect x="40" y="42" width="16" height="20" fill="#e4f0d4" stroke="#4a2e14" stroke-width="2"/><path d="M40,48 h16 M40,54 h16 M48,42 v20" stroke="#4a2e14" stroke-width="1"/>';
    const legs = kind === 'jogger' ? '<path d="M26,72 l-8,20 M34,72 l10,18" stroke="#4a2e14" stroke-width="5" stroke-linecap="round"/>' : '<path d="M26,72 l-2,22 M34,72 l2,22" stroke="#4a2e14" stroke-width="5" stroke-linecap="round"/>';
    const scale = kind === 'kid' ? 'transform="translate(8 26) scale(.7)"' : '';
    return `<svg viewBox="0 0 70 100" class="art-figure" aria-hidden="true"><g ${scale}>
      ${legs}
      <path d="M16,36 Q30,28 44,36 L42,74 L18,74z" fill="${coat}" stroke="#4a2e14" stroke-width="2.5"/>
      <circle cx="30" cy="22" r="12" fill="${skin}" stroke="#4a2e14" stroke-width="2.5"/>
      <path d="M18,20 Q20,6 30,8 Q40,6 42,20 Q36,13 30,14 Q24,13 18,20z" fill="${hair}"/>
      <circle cx="26" cy="23" r="1.6" fill="#4a2e14"/><circle cx="34" cy="23" r="1.6" fill="#4a2e14"/>
      <path d="M26,28 q4,3 8,0" fill="none" stroke="#4a2e14" stroke-width="1.6" stroke-linecap="round"/>
      ${extra}</g></svg>`;
  };
})(window.PP);
