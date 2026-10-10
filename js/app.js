/* App shell: three views (Play, Element Lab, Roadmap). Deep-link with #play, #lab, #roadmap. */
(function (PP) {
  const views = { play: null, lab: null, roadmap: null };
  let mounted = {};

  function show(id) {
    if (!views[id]) id = 'play';
    Object.keys(views).forEach((k) => { views[k].hidden = k !== id; });
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
    document.querySelectorAll('[data-view]').forEach((b) => b.addEventListener('click', () => {
      show(b.dataset.view);
      try { history.replaceState(null, '', '#' + b.dataset.view); } catch (e) { /* sandboxed */ }
    }));
    const hash = (location.hash || '').replace('#', '');
    show(views[hash] ? hash : 'play');
  });
})(window.PP);
