/* Full-screen map viewer: the parchment map fills the screen and can be zoomed and moved.
 *
 *   PP.ui.mapViewer(state, { title, eyebrow })
 *
 * Phones: pinch to zoom, drag to move, double-tap to zoom in, tap a place for its card.
 * Computers: scroll or trackpad to zoom, drag to move, double-click to zoom in.
 * Buttons: + / − / show all / find me. Keys: + − arrows, 0 for show all, Esc to close.
 * Works by changing the SVG's viewBox, so the drawing stays crisp at any zoom. */
(function (PP) {
  const h = PP.h;
  const W = 1280, H = 720;
  const BOUNDS = { x0: 40, y0: 60, x1: 1240, y1: 660 }; // the parchment, with a little sea around it
  const ZMIN = 1;

  function youAt(s) {
    const n = PP.content.nodes[s.map.current] || PP.content.nodes.port;
    const pin = document.querySelector('.map-viewer .m-pin');
    const m = pin && /translate\(([-\d.]+) ([-\d.]+)\)/.exec(pin.getAttribute('transform') || '');
    return m ? { x: +m[1], y: +m[2] - 20 } : { x: n.x, y: n.y };
  }

  function statusOf(s, id) {
    const v = PP.visibility(s, id);
    if (!s.seg && s.map.current === id) return { key: 'here', label: 'You are here', v };
    if (v === 'visited') return { key: 'visited', label: 'You have been here', v };
    if (v === 'named') return { key: 'named', label: 'On your map, not visited yet', v };
    if (v === 'rumored') return { key: 'rumored', label: 'Rumored: nearby, not explored', v };
    return { key: 'uncharted', label: 'Uncharted', v };
  }

  PP.ui.mapViewer = function (s, opts = {}) {
    const narrow = window.innerWidth < 700;
    const host = h('div', { class: 'mv-map' });
    const card = h('div', { class: 'mv-card', hidden: true, 'aria-live': 'polite' });
    const keyBox = h('div', { class: 'mv-key', hidden: true },
      h('p', null, h('span', { class: 'lg dot' }), ' Main trail'),
      h('p', null, h('span', { class: 'lg dash' }), ' Side trail (dead end)'),
      h('p', null, h('span', { class: 'lg road' }), ' Hidden passage'),
      h('p', null, h('span', { class: 'lg walked' }), ' Where you have been'),
      h('p', null, h('span', { class: 'lg pin' }), ' You'));
    const btn = (label, aria, fn, cls) => h('button', { class: 'mv-btn ' + (cls || ''), 'aria-label': aria, title: aria, onclick: (e) => { e.stopPropagation(); fn(); } }, label);
    const ov = h('div', { class: 'overlay map-overlay map-viewer', role: 'dialog', 'aria-modal': 'true', 'aria-label': 'Map' },
      h('div', { class: 'mv-top' },
        h('div', null, h('div', { class: 'eyebrow' }, opts.eyebrow || ('Day ' + s.day)), h('h3', null, opts.title || 'The territory')),
        h('button', { class: 'btn mv-close', onclick: () => close() }, 'Close')),
      h('div', { class: 'mv-stage' }, host,
        h('div', { class: 'mv-zoom' },
          btn('+', 'Zoom in', () => zoomBy(1.5)),
          btn('−', 'Zoom out', () => zoomBy(1 / 1.5)),
          btn('⤢', 'Show the whole map', () => animateTo({ z: 1, cx: W / 2, cy: H / 2 })),
          btn('◎', 'Find me', () => findMe(), 'mv-me')),
        h('div', { class: 'mv-left' }, btn('Key', 'Map key', () => { keyBox.hidden = !keyBox.hidden; }, 'mv-keybtn'), keyBox),
        h('p', { class: 'mv-hint' }, narrow ? 'Pinch to zoom · drag to move · tap a place' : 'Scroll to zoom · drag to move · click a place'),
        card));
    document.body.appendChild(ov);
    document.body.classList.add('modal-open');
    PP.ui.renderMap(host, s, {});
    const svg = host.querySelector('svg');
    svg.setAttribute('preserveAspectRatio', 'xMidYMid meet');

    // View: centre (cx, cy) in map units and zoom z, where z = 1 shows the whole map.
    const view = { z: 1, cx: W / 2, cy: H / 2 };
    const size = () => { const r = host.getBoundingClientRect(); return { cw: Math.max(1, r.width), ch: Math.max(1, r.height) }; };
    function dims(z) {
      const { cw, ch } = size();
      const s0 = Math.min(cw / W, ch / H), sc = s0 * z;
      return { vw: cw / sc, vh: ch / sc, sc };
    }
    // The zoom where the parchment fills the whole screen (on a tall phone that's well past 1).
    function coverZ() {
      const { cw, ch } = size(), s0 = Math.min(cw / W, ch / H);
      return Math.max(1, Math.max(cw / (BOUNDS.x1 - BOUNDS.x0), ch / (BOUNDS.y1 - BOUNDS.y0)) / s0);
    }
    const zmax = () => Math.max(5, coverZ() * 2.5);
    function clamp() {
      view.z = Math.min(zmax(), Math.max(ZMIN, view.z));
      const { vw, vh } = dims(view.z);
      const bw = BOUNDS.x1 - BOUNDS.x0, bh = BOUNDS.y1 - BOUNDS.y0;
      view.cx = vw >= bw ? (BOUNDS.x0 + BOUNDS.x1) / 2 : Math.min(BOUNDS.x1 - vw / 2, Math.max(BOUNDS.x0 + vw / 2, view.cx));
      view.cy = vh >= bh ? (BOUNDS.y0 + BOUNDS.y1) / 2 : Math.min(BOUNDS.y1 - vh / 2, Math.max(BOUNDS.y0 + vh / 2, view.cy));
    }
    function apply() {
      clamp();
      const { vw, vh } = dims(view.z);
      svg.setAttribute('viewBox', `${view.cx - vw / 2} ${view.cy - vh / 2} ${vw} ${vh}`);
      ov.classList.toggle('zoomed', view.z > 1.05);
    }
    // Screen point -> map point.
    function toMap(px, py) {
      const r = host.getBoundingClientRect(), { vw, vh, sc } = dims(view.z);
      return { x: view.cx - vw / 2 + (px - r.left) / sc, y: view.cy - vh / 2 + (py - r.top) / sc };
    }
    // Zoom by f keeping the map point under (px,py) still.
    function zoomAt(f, px, py) {
      const before = toMap(px, py);
      view.z = Math.min(zmax(), Math.max(ZMIN, view.z * f));
      const r = host.getBoundingClientRect(), { vw, vh, sc } = dims(view.z);
      view.cx = before.x - (px - r.left) / sc + vw / 2;
      view.cy = before.y - (py - r.top) / sc + vh / 2;
      apply();
    }
    function zoomBy(f) { const r = host.getBoundingClientRect(); animateTo({ z: view.z * f, cx: view.cx, cy: view.cy }); void r; }
    let anim = 0;
    function animateTo(t, ms = 260) {
      cancelAnimationFrame(anim);
      const from = Object.assign({}, view), t0 = performance.now();
      const to = { z: Math.min(zmax(), Math.max(ZMIN, t.z)), cx: t.cx, cy: t.cy };
      const step = (now) => {
        const k = Math.min(1, (now - t0) / ms), e = 1 - Math.pow(1 - k, 3);
        view.z = from.z + (to.z - from.z) * e; view.cx = from.cx + (to.cx - from.cx) * e; view.cy = from.cy + (to.cy - from.cy) * e;
        apply();
        if (k < 1) anim = requestAnimationFrame(step);
      };
      anim = requestAnimationFrame(step);
    }
    function findMe() { const p = youAt(s); animateTo({ z: Math.max(view.z, startZ()), cx: p.x, cy: p.y }); }
    const startZ = () => Math.max(narrow ? 2.6 : 1.5, coverZ());

    // Gestures: one pointer drags, two pointers pinch. A short press with no movement is a tap.
    const pts = new Map();
    let start = null, pinch = null, lastTap = 0;
    host.addEventListener('pointerdown', (e) => {
      host.setPointerCapture(e.pointerId);
      pts.set(e.pointerId, { x: e.clientX, y: e.clientY });
      cancelAnimationFrame(anim);
      if (pts.size === 1) start = { x: e.clientX, y: e.clientY, cx: view.cx, cy: view.cy, moved: false, t: performance.now() };
      if (pts.size === 2) {
        const [a, b] = [...pts.values()];
        pinch = { d: Math.hypot(a.x - b.x, a.y - b.y), z: view.z, mid: toMap((a.x + b.x) / 2, (a.y + b.y) / 2) };
        if (start) start.moved = true;
      }
    });
    host.addEventListener('pointermove', (e) => {
      if (!pts.has(e.pointerId)) return;
      pts.set(e.pointerId, { x: e.clientX, y: e.clientY });
      if (pts.size >= 2 && pinch) {
        const [a, b] = [...pts.values()];
        const d = Math.hypot(a.x - b.x, a.y - b.y), mx = (a.x + b.x) / 2, my = (a.y + b.y) / 2;
        view.z = Math.min(zmax(), Math.max(ZMIN, pinch.z * d / Math.max(1, pinch.d)));
        const r = host.getBoundingClientRect(), { vw, vh, sc } = dims(view.z);
        view.cx = pinch.mid.x - (mx - r.left) / sc + vw / 2;
        view.cy = pinch.mid.y - (my - r.top) / sc + vh / 2;
        apply();
      } else if (start) {
        const dx = e.clientX - start.x, dy = e.clientY - start.y;
        if (Math.abs(dx) + Math.abs(dy) > 6) start.moved = true;
        if (start.moved) { const { sc } = dims(view.z); view.cx = start.cx - dx / sc; view.cy = start.cy - dy / sc; apply(); host.classList.add('dragging'); }
      }
    });
    const up = (e) => {
      if (!pts.has(e.pointerId)) return;
      pts.delete(e.pointerId);
      host.classList.remove('dragging');
      if (pts.size < 2) pinch = null;
      if (pts.size === 1) { const [p] = [...pts.values()]; start = { x: p.x, y: p.y, cx: view.cx, cy: view.cy, moved: true }; return; }
      if (pts.size === 0 && start && !start.moved && e.type === 'pointerup') {
        const now = performance.now();
        if (now - lastTap < 320) { lastTap = 0; zoomAt(1.8, e.clientX, e.clientY); }
        else { lastTap = now; tapAt(e.clientX, e.clientY); }
      }
      if (pts.size === 0) start = null;
    };
    host.addEventListener('pointerup', up);
    host.addEventListener('pointercancel', up);
    host.addEventListener('wheel', (e) => {
      e.preventDefault();
      const f = Math.exp(-e.deltaY * (e.ctrlKey ? 0.012 : 0.0025));
      zoomAt(f, e.clientX, e.clientY);
    }, { passive: false });

    // Tap a place: show its card and mark it.
    let sel = null;
    function tapAt(px, py) {
      const p = toMap(px, py), { sc } = dims(view.z);
      const reach = Math.max(34, 30 / sc * 1.2);
      let best = null, bd = Infinity;
      Object.entries(PP.content.nodes).forEach(([id, n]) => { const d = Math.hypot(n.x - p.x, n.y - p.y); if (d < bd) { bd = d; best = id; } });
      if (!best || bd > reach) { card.hidden = true; if (sel) sel.remove(); sel = null; return; }
      showCard(best);
    }
    function exploreLines(id) {
      const out = [], c = s.career;
      const cp = PP.clientPlace && PP.clientPlace(s);
      if (cp && cp.at === id && PP.placeHintKnown(s) && !PP.knows(s, s.client.keyFact)) out.push(h('p', { class: 'mv-x-line hunch' }, `★ ${s.client.name} might open up here.`));
      if (c) (c.requests || []).forEach((q) => { if (!q.done && !q.noted && q.at === id) out.push(h('p', { class: 'mv-x-line' }, `📜 ${q.text} Reward: ${PP.rewardText(q.reward)}.`)); });
      const k = PP.keepsakeAt && PP.keepsakeAt(id);
      if (k && c && PP.visibility(s, id) !== 'uncharted') out.push(h('p', { class: 'mv-x-line' }, PP.keepsakeFound(c, id) || (s.pack || []).includes(k.id) ? `${k.icon} Keepsake found: ${k.name}.` : '🎁 A keepsake is hidden here.'));
      (s.conditions || []).forEach((o) => { if (o.type === 'bonus' && o.at === id && !o.done) out.push(h('p', { class: 'mv-x-line' }, `🎉 ${o.text}`)); });
      return out;
    }
    function showCard(id) {
      const n = PP.content.nodes[id], st = statusOf(s, id);
      const known = st.v === 'visited' || st.v === 'named';
      const name = known ? n.name : st.v === 'rumored' ? 'Somewhere nearby' : 'Uncharted';
      const line = st.v === 'visited' ? n.arrive : st.v === 'named' || st.v === 'rumored' ? n.teaser : 'Nobody you know has been here. Explore to find out.';
      const near = !s.seg && PP.neighbors ? PP.neighbors(s, s.map.current).includes(id) : false;
      card.innerHTML = '';
      card.append(...[
        h('div', { class: 'mv-card-head' }, h('span', { class: 'mv-st st-' + st.key }, st.label), h('button', { class: 'mv-x', 'aria-label': 'Close', onclick: () => { card.hidden = true; if (sel) sel.remove(); sel = null; } }, '×')),
        h('strong', null, name),
        n.sub && known ? h('span', { class: 'mv-sub' }, n.sub) : null,
        h('p', null, line),
        near ? h('p', { class: 'mv-near' }, 'One trail from where you are.') : null,
        n.side && known ? h('p', { class: 'mv-near' }, 'Side trail: a dead end with lessons, and risks.') : null].concat(exploreLines(id)).filter(Boolean));
      card.hidden = false;
      if (sel) sel.remove();
      sel = document.createElementNS('http://www.w3.org/2000/svg', 'circle');
      sel.setAttribute('cx', n.x); sel.setAttribute('cy', n.y); sel.setAttribute('r', 34); sel.setAttribute('class', 'mv-sel');
      svg.appendChild(sel);
    }

    const onKey = (e) => {
      if (e.key === 'Escape') { e.preventDefault(); e.stopPropagation(); close(); return; }
      const pan = 120 / view.z;
      if (e.key === '+' || e.key === '=') zoomBy(1.5);
      else if (e.key === '-' || e.key === '_') zoomBy(1 / 1.5);
      else if (e.key === '0') animateTo({ z: 1, cx: W / 2, cy: H / 2 });
      else if (e.key === 'ArrowLeft') animateTo({ z: view.z, cx: view.cx - pan, cy: view.cy });
      else if (e.key === 'ArrowRight') animateTo({ z: view.z, cx: view.cx + pan, cy: view.cy });
      else if (e.key === 'ArrowUp') animateTo({ z: view.z, cx: view.cx, cy: view.cy - pan });
      else if (e.key === 'ArrowDown') animateTo({ z: view.z, cx: view.cx, cy: view.cy + pan });
      else return;
      e.preventDefault(); e.stopPropagation();
    };
    document.addEventListener('keydown', onKey, true);
    const onResize = () => apply();
    window.addEventListener('resize', onResize);
    function close() {
      cancelAnimationFrame(anim);
      document.removeEventListener('keydown', onKey, true);
      window.removeEventListener('resize', onResize);
      document.body.classList.remove('modal-open');
      ov.remove();
    }

    // Start zoomed in on you (phones need it most); computers start a little closer than the whole map.
    apply();
    const p = youAt(s);
    if (opts.fit) { view.z = 1; apply(); }
    else { view.z = startZ(); view.cx = p.x; view.cy = p.y; apply(); }
    ov.querySelector('.mv-close').focus({ preventScroll: true });
    return { close };
  };
})(window.PP);
