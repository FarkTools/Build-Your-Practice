/* Shared pieces for mini-games.
 * Every mini-game exposes the same contract, so the journey, the port quests
 * and the Element Lab can all run them:
 *
 *   PP.minigames.x = { title, risk, blurb, start(root, ctx, done) -> { stop() } }
 *   ctx  = { state, client, prep (Preparation level), practice (bool: full feedback) }
 *   done({ score, max, passed, eff, lines })   eff is applied by the caller via PP.apply
 */
(function (PP) {
  const h = PP.h;
  PP.mg = {};

  /* Countdown with a draining bar. Returns controls. */
  PP.mg.timer = function (bar, seconds, onEnd) {
    let left = seconds * 1000, last = performance.now(), raf = 0, paused = false, dead = false;
    const total = seconds * 1000;
    function tick(now) {
      if (dead) return;
      if (!paused) left -= now - last;
      last = now;
      const pct = Math.max(0, left / total);
      bar.style.transform = `scaleX(${pct})`;
      bar.classList.toggle('low', pct < 0.25);
      if (left <= 0) { dead = true; onEnd(); return; }
      raf = requestAnimationFrame(tick);
    }
    raf = requestAnimationFrame(tick);
    return {
      add(sec) { left = Math.min(total, left + sec * 1000); },
      sub(sec) { left -= sec * 1000; },
      left() { return Math.max(0, left / 1000); },
      pause(p) { paused = p; },
      stop() { dead = true; cancelAnimationFrame(raf); }
    };
  };

  PP.mg.shell = function (root, title, risk) {
    root.innerHTML = '';
    const bar = h('div', { class: 'mg-timer-fill' });
    const status = h('div', { class: 'mg-status' });
    const body = h('div', { class: 'mg-body' });
    const feedback = h('div', { class: 'mg-feedback', 'aria-live': 'polite' });
    const wrap = h('div', { class: 'mg' },
      h('div', { class: 'mg-head' },
        h('div', null, h('div', { class: 'eyebrow' }, 'Mini-game · ' + risk), h('h3', { class: 'mg-title' }, title)),
        status),
      h('div', { class: 'mg-timer' }, bar),
      body, feedback);
    root.appendChild(wrap);
    return { wrap, bar, status, body, feedback };
  };

  /* End screen: score, line-by-line review, effect chips, continue. */
  PP.mg.summary = function (root, title, result, done) {
    root.innerHTML = '';
    const chips = PP.ui.effectChips ? PP.ui.effectChips(result.eff, { hideDebt: !result.showDebt }) : null;
    root.appendChild(h('div', { class: 'mg mg-summary' },
      h('div', { class: 'eyebrow' }, 'Mini-game complete'),
      h('h3', { class: 'mg-title' }, title),
      h('p', { class: 'mg-score' }, h('strong', null, String(result.score)), ` / ${result.max}`, result.passed != null ? h('span', { class: 'pill ' + (result.passed ? 'good' : 'bad') }, result.passed ? 'Passed' : 'Not yet') : null),
      result.headline ? h('p', { class: 'mg-headline' }, result.headline) : null,
      h('ul', { class: 'mg-review' }, result.lines.map((l) => h('li', { class: 'q-' + (l.q || 'ok') }, h('span', { class: 'q-mark', 'aria-hidden': 'true' }, l.q === 'good' ? '+' : l.q === 'bad' ? '!' : '~'), h('span', null, l.text)))),
      chips ? h('div', { class: 'mg-effects' }, h('span', { class: 'eyebrow' }, 'Effect on the journey'), chips) : null,
      h('button', { class: 'btn primary', onclick: () => done(result), autofocus: true }, 'Continue')));
  };

  PP.mg.fill = (str, client) => {
    const name = client ? client.name : 'the client';
    return str.replace(/\{c\}/g, name).replace(/\{lc\}/g, name.toLowerCase().replace(/[^a-z]/g, '')).replace(/\{s\}/g, (client && client.shortStake) || 'their partner');
  };
})(window.PP);
