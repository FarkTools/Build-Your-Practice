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
