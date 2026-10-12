/* Anonymous counts with GoatCounter (no cookies, no personal data).
 *
 *   PP.track('journey-end/landed')   counts a milestone
 *
 * Only plain milestone names are ever sent: never player names, client names, saves or
 * challenge details. Page views report just the page path, so challenge and transfer links
 * (which carry data in the address) are never recorded. Works offline: if GoatCounter is
 * blocked or not loaded yet, milestones wait in a short queue and are otherwise dropped. */
(function (PP) {
  // GoatCounter reads these settings when its script loads.
  window.goatcounter = Object.assign(window.goatcounter || {}, { path: () => location.pathname });
  const queue = [];
  const ready = () => !!(window.goatcounter && typeof window.goatcounter.count === 'function');
  function send(name) {
    try { window.goatcounter.count({ path: 'event/' + name, title: name, event: true }); } catch (e) { /* ignore */ }
  }
  PP.track = function (name) {
    if (!name) return;
    name = String(name).toLowerCase().replace(/[^a-z0-9/_-]+/g, '-').slice(0, 60);
    if (ready()) send(name); else if (queue.length < 20) queue.push(name);
  };
  // Flush anything counted before the script arrived.
  let tries = 0;
  const flush = setInterval(() => {
    if (ready()) { clearInterval(flush); while (queue.length) send(queue.shift()); }
    else if (++tries > 30) { clearInterval(flush); queue.length = 0; }
  }, 1000);
  /* Count every mini-game start, whichever screen it was launched from. */
  document.addEventListener('DOMContentLoaded', () => {
    Object.entries(PP.minigames || {}).forEach(([id, g]) => {
      if (!g || typeof g.start !== 'function' || g._tracked) return;
      const start = g.start;
      g.start = function () { PP.track('minigame/' + id); return start.apply(this, arguments); };
      g._tracked = true;
    });
    const standalone = (window.matchMedia && window.matchMedia('(display-mode: standalone)').matches) || window.navigator.standalone === true;
    if (standalone) PP.track('launch/home-screen-app');
    if (/[?&]challenge=/.test(location.search)) PP.track('challenge/link-opened');
  });
})(window.PP);
