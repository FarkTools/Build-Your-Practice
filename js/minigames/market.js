/* Farmers market tent (prospecting). People stroll past your tent.
 * Click the ones who look interested to wave them over, then offer a quick raffle slip
 * or a real chat. Waving at joggers is just awkward. Anyone interested who walks past
 * gets pulled in by the rival tent's inflatable tube man. */
(function (PP) {
  const h = PP.h;
  const TYPES = [
    { id: 'family', label: 'Pushing a stroller', interested: true, bias: { taylor: 3 }, w: 3 },
    { id: 'retiree', label: 'Sun hat, reading glasses', interested: true, bias: { morgan: 2, taylor: 1 }, w: 2 },
    { id: 'vendor', label: 'Apron from the bakery stall', interested: true, bias: { rosa: 3 }, w: 2 },
    { id: 'couple', label: 'Arguing about a mortgage', interested: true, bias: { taylor: 2, morgan: 1 }, w: 1.5 },
    { id: 'jogger', label: 'Jogging, earbuds in', interested: false, w: 2 },
    { id: 'kid', label: 'Kid chasing a balloon', interested: false, w: 1 },
    { id: 'dog', label: 'Being walked by a large dog', interested: false, w: 1.5 },
    { id: 'phone', label: 'On a very loud phone call', interested: false, w: 1.5 }
  ];

  PP.minigames.market = {
    title: 'Farmers Market Tent',
    risk: 'prospecting in your community',
    prospecting: true,
    blurb: 'Wave over people who look interested, then offer a quick raffle slip or a real chat. Anyone interested who walks past ends up at the rival tent.',
    start(root, ctx, done) {
      const prep = ctx.prep || 0;
      const ui = PP.mg.shell(root, this.title, this.risk);
      const lane = h('div', { class: 'market-lane', 'aria-label': 'Market lane' }, h('div', { class: 'tent mine' }, 'Your tent'), h('div', { class: 'tent rival' }, 'Velocity Wealth', h('span', { class: 'tube' })));
      const prompt = h('div', { class: 'market-prompt' });
      ui.body.append(h('p', { class: 'mg-instr' }, 'Click people as they pass. Raffle slips are quick but cold. A chat takes a few seconds but makes a warm lead.'), lane, prompt);
      const leads = [], walkers = [];
      const stats = { stolen: 0, awkward: 0, raffle: 0, chat: 0 };
      let finished = false, busy = false, spawnT = null, raf = 0, last = performance.now();
      const timer = PP.mg.timer(ui.bar, 30 + prep * 5, () => finish());
      const pickType = () => { const tot = TYPES.reduce((a, t) => a + t.w, 0); let r = Math.random() * tot; for (const t of TYPES) { r -= t.w; if (r <= 0) return t; } return TYPES[0]; };

      function spawn() {
        if (finished) return;
        const t = pickType();
        const el = h('button', { class: 'walker' + (t.interested ? ' maybe' : ''), onclick: () => wave(w) }, h('span', { class: 'walker-fig', 'aria-hidden': 'true' }), h('span', { class: 'walker-label' }, t.label));
        const w = { t, el, x: -12, speed: 11 + Math.random() * 7, lane: Math.floor(Math.random() * 2), gone: false };
        el.style.top = (w.lane ? 64 : 36) + '%';
        lane.appendChild(el);
        walkers.push(w);
        spawnT = setTimeout(spawn, 1100 + Math.random() * 1000);
      }
      function frame(now) {
        if (finished) return;
        const dt = Math.min(0.05, (now - last) / 1000); last = now;
        walkers.forEach((w) => {
          if (w.gone || w.stopped) return;
          w.x += w.speed * dt;
          w.el.style.left = w.x + '%';
          if (w.x > 86) { w.gone = true; w.el.remove(); if (w.t.interested) { stats.stolen++; say('The tube man got one. They wander into the Velocity Wealth tent.', 'bad'); } }
        });
        status();
        raf = requestAnimationFrame(frame);
      }
      function wave(w) {
        if (busy || w.gone || finished) return;
        if (!w.t.interested) { stats.awkward++; timer.sub(1.5); w.el.classList.add('nope'); say('They speed up. Awkward.', 'ok'); return; }
        busy = true; w.stopped = true; w.el.classList.add('stopped');
        prompt.innerHTML = '';
        prompt.append(h('p', null, h('strong', null, w.t.label + ': '), '"Hi! What\'s this about?"'),
          h('div', { class: 'row' },
            h('button', { class: 'btn', onclick: () => resolve(w, 'raffle') }, 'Hand them a raffle slip'),
            h('button', { class: 'btn primary', onclick: () => resolve(w, 'chat') }, 'Have a real chat (3 seconds)')));
      }
      function resolve(w, how) {
        prompt.innerHTML = '';
        const finishIt = () => {
          if (how === 'chat') { stats.chat++; const r = Math.random(); if (r < 0.5) { leads.push({ temp: 'warm', bias: w.t.bias, source: 'your farmers market tent', event: true }); say('A real conversation. They want to meet properly.', 'good'); } else if (r < 0.75) { leads.push({ temp: 'cold', bias: w.t.bias, source: 'your farmers market tent', event: true }); say('Nice chat. They take a card. Maybe.', 'ok'); } else say('Lovely chat about heirloom tomatoes. Not a prospect.', 'ok'); }
          else { stats.raffle++; if (PP.chance(0.3)) leads.push({ temp: 'cold', bias: w.t.bias, source: 'your raffle fishbowl', event: true }); say('Into the fishbowl it goes.', 'ok'); }
          w.gone = true; w.el.remove(); busy = false;
        };
        if (how === 'chat') { prompt.append(h('p', { class: 'muted' }, 'Chatting…')); setTimeout(() => { prompt.innerHTML = ''; if (!finished) finishIt(); }, 3000); }
        else finishIt();
      }
      function say(t, q) { ui.feedback.textContent = t; ui.feedback.className = 'mg-feedback q-' + q; }
      function status() { ui.status.textContent = `${leads.length} lead${leads.length === 1 ? '' : 's'} · ${stats.stolen} lost to the tube man`; }
      function finish() {
        if (finished) return;
        finished = true;
        clearTimeout(spawnT); cancelAnimationFrame(raf); timer.stop();
        const n = leads.length;
        PP.mg.summary(root, PP.minigames.market.title, {
          score: n, max: Math.max(n, 5), eff: { energy: -1 }, prospects: leads, passed: ctx.pass != null ? n >= ctx.pass : null,
          headline: `${n} lead${n === 1 ? '' : 's'} from the market.`,
          lines: [
            { q: stats.chat ? 'good' : 'ok', text: `Real chats: ${stats.chat}` },
            { q: 'ok', text: `Raffle slips: ${stats.raffle}` },
            { q: stats.stolen > 3 ? 'bad' : 'ok', text: `Lost to the rival tent: ${stats.stolen}` },
            { q: stats.awkward ? 'bad' : 'good', text: `Awkward waves at people who weren't interested: ${stats.awkward}` }
          ]
        }, done);
      }
      spawn();
      raf = requestAnimationFrame(frame);
      return { stop() { finished = true; clearTimeout(spawnT); cancelAnimationFrame(raf); timer.stop(); } };
    }
  };
})(window.PP);
