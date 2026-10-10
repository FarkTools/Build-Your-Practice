/* App shell. The player page (index.html) only has Play. The admin page adds the
 * Element Lab and Roadmap; deep-link there with #play, #lab, #roadmap. */
(function (PP) {
  const views = { play: null, lab: null, roadmap: null };
  let mounted = {};

  function show(id) {
    if (!views[id]) id = 'play';
    Object.keys(views).forEach((k) => { views[k].hidden = k !== id; });
    if (Object.keys(views).length === 1) return mounted.play || (mounted.play = true, PP.ui.mountGame(views.play));
    document.querySelectorAll('[data-view]').forEach((b) => b.setAttribute('aria-current', b.dataset.view === id ? 'page' : 'false'));
    if (!mounted[id]) {
      mounted[id] = true;
      if (id === 'play') PP.ui.mountGame(views.play);
      if (id === 'lab') PP.ui.mountLab(views.lab);
    }
    PP.store.set('view', id);
  }

  document.addEventListener('DOMContentLoaded', () => {
    views.play = document.getElementById('view-play');
    views.lab = document.getElementById('view-lab');
    views.roadmap = document.getElementById('view-roadmap');
    // The player page only has Play; the admin page has all three.
    Object.keys(views).forEach((k) => { if (!views[k]) delete views[k]; });
    document.querySelectorAll('[data-view]').forEach((b) => b.addEventListener('click', () => {
      show(b.dataset.view);
      try { history.replaceState(null, '', '#' + b.dataset.view); } catch (e) { /* sandboxed */ }
    }));
    const hash = (location.hash || '').replace('#', '');
    show(views[hash] ? hash : 'play');
  });
})(window.PP);

/* Footer: copyright and version. Tapping it opens the About box, which also has a sound test. */
(function (PP) {
  const h = PP.h;
  function about() {
    const status = h('p', { class: 'small muted', 'aria-live': 'polite' });
    const music = h('p', { class: 'small muted' });
    const show = () => { const a = (PP.fx && PP.fx.audio) || {}; music.textContent = PP.audio ? PP.audio.status() : ''; status.textContent = `Sound is ${PP.fx && PP.fx.sound ? 'on' : 'off'} · ${a.unlocked ? 'ready' : 'waiting for a tap'} · played ${a.played || 0}` + (a.errors ? ` · ${a.errors} blocked (${a.last})` : ''); };
    const ov = h('div', { class: 'overlay', role: 'dialog', 'aria-modal': 'true', 'aria-label': 'About', onclick: (e) => { if (e.target === ov) ov.remove(); } },
      h('div', { class: 'overlay-card about-card' }, h('div', { class: 'scene' },
        h('div', { class: 'eyebrow' }, 'About'),
        h('h3', { class: 'scene-title' }, 'Build Your Practice'),
        h('p', null, `Version ${PP.VERSION} · ${PP.BUILT}`),
        h('p', { class: 'small' }, `© ${PP.BUILT.slice(0, 4)} FarkTools. All rights reserved.`),
        h('h4', { class: 'place-sub' }, 'Recent versions'),
        h('ul', { class: 'about-changes' }, (PP.CHANGES || []).map(([v, t]) => h('li', null, h('strong', null, v), ' ', t))),
        h('h4', { class: 'place-sub' }, 'Sound check'),
        h('div', { class: 'row' }, h('button', { class: 'btn primary', onclick: () => { if (PP.fx) { if (!PP.fx.sound) PP.fx.soundToggle().click(); PP.fx.sfx('great'); } setTimeout(show, 300); } }, 'Play a test sound')),
        status, music,
        h('p', { class: 'small muted' }, 'No sound? Check the Sound switch in the top bar and your media volume. On iPhone, the ring/silent switch can mute games on older iOS.'),
        h('button', { class: 'btn', onclick: () => ov.remove() }, 'Close'))));
    document.body.appendChild(ov);
    show();
  }
  PP.ui.about = about;
  document.addEventListener('DOMContentLoaded', () => {
    const foot = document.querySelector('.site-foot');
    if (foot) foot.appendChild(h('button', { class: 'foot-link', onclick: about }, `© ${PP.BUILT.slice(0, 4)} FarkTools · v${PP.VERSION}`));
  });
})(window.PP);

/* Update check: when the game is hosted (GitHub Pages), look for a newer version every few
 * minutes and offer a one-tap reload, so nobody gets stuck on a cached old copy. */
(function (PP) {
  if (!/^https?:/.test(location.protocol) || !document.querySelector('script[src*="js/version.js"]')) return;
  const h = PP.h;
  let shown = false;
  async function check() {
    if (shown) return;
    try {
      const txt = await (await fetch('js/version.js?check=' + Date.now(), { cache: 'no-store' })).text();
      const m = txt.match(/PP\.VERSION = '([^']+)'/);
      if (m && m[1] !== PP.VERSION) {
        shown = true;
        document.body.appendChild(h('div', { class: 'update-bar', role: 'status' },
          h('span', null, `A new version (v${m[1]}) is ready.`),
          h('button', { class: 'btn primary small', onclick: () => { const u = new URL(location.href); u.searchParams.set('v', m[1]); location.replace(u.toString()); } }, 'Update now')));
      }
    } catch (e) { /* offline or not hosted */ }
  }
  document.addEventListener('DOMContentLoaded', () => { setTimeout(check, 3000); setInterval(check, 5 * 60 * 1000); });
  document.addEventListener('visibilitychange', () => { if (!document.hidden) check(); });
})(window.PP);
