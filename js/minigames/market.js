/* Farmers market tent (prospecting). People stroll past your tent.
 * Click the ones who look interested to wave them over, then hand them a raffle slip
 * (into the fishbowl) or have a real chat. Waving at joggers is awkward. Anyone
 * interested who walks past gets pulled in by the rival tent's inflatable tube man. */
(function (PP) {
  const h = PP.h;
  const TYPES = [
    { id: 'family', fig: 'family', label: 'Pushing a stroller', interested: true, bias: { taylor: 3 }, w: 3 },
    { id: 'retiree', fig: 'retiree', label: 'Sun hat, reading glasses', interested: true, bias: { morgan: 2, taylor: 1 }, w: 2 },
    { id: 'vendor', fig: 'vendor', label: 'Apron from the bakery stall', interested: true, bias: { rosa: 3 }, w: 2 },
    { id: 'couple', fig: 'couple', label: 'Clutching a mortgage letter', interested: true, bias: { taylor: 2, morgan: 1 }, w: 1.5 },
    { id: 'jogger', fig: 'jogger', label: 'Jogging, earbuds in', interested: false, w: 2 },
    { id: 'kid', fig: 'kid', label: 'Chasing a balloon', interested: false, w: 1 },
    { id: 'dog', fig: 'dog', label: 'Walked by a large dog', interested: false, w: 1.5 },
    { id: 'phone', fig: 'phone', label: 'On a very loud call', interested: false, w: 1.5 }
  ];

  PP.minigames.market = {
    title: 'Farmers Market Tent',
    risk: 'prospecting in your community',
    prospecting: true,
    blurb: 'Wave over people who look interested, then hand them a raffle slip or have a real chat. Anyone interested who walks past ends up at the rival tent.',
    start(root, ctx, done) {
      const F = PP.fx;
      const prep = ctx.prep || 0;
      const ui = PP.mg.shell(root, this.title, this.risk);
      const leadsC = F.counter('Leads'), bowlC = F.counter('Fishbowl'), lostC = F.counter('Lost to rival');
      ui.hud.append(leadsC.el, bowlC.el, lostC.el);

      const bowl = h('div', { class: 'mk-bowl', title: 'Raffle fishbowl' });
      const clip = h('div', { class: 'mk-clip' }, h('span', null, 'Leads'));
      const rival = h('div', { class: 'mk-tent rival' }, h('span', null, 'Velocity Wealth'), h('i', { class: 'tube' }));
      const lane = h('div', { class: 'mg-stage-area mk-lane' },
        h('div', { class: 'mk-tent mine' }, h('span', null, 'Your tent'), h('div', { class: 'mk-table' }, bowl)),
        rival, clip, h('div', { class: 'mk-path' }));
      ui.body.append(h('p', { class: 'mg-instr' }, 'Click people who look interested. Raffle slips are quick but cold. A chat takes three seconds and usually makes a warm lead.'), lane);

      const leads = [], walkers = [];
      const stats = { stolen: 0, awkward: 0, raffle: 0, chat: 0 };
      let finished = false, busy = false, spawnT = null, raf = 0, last = performance.now(), seed = 1;
      const timer = PP.mg.timer(ui.bar, 30 + prep * 5, () => finish());
      const pickType = () => { const tot = TYPES.reduce((a, t) => a + t.w, 0); let r = Math.random() * tot; for (const t of TYPES) { r -= t.w; if (r <= 0) return t; } return TYPES[0]; };

      function spawn() {
        if (finished) return;
        const t = pickType();
        const w = { t, x: -10, speed: 9 + Math.random() * 6, row: Math.floor(Math.random() * 2) };
        w.el = h('button', { class: 'mk-walker', onclick: () => wave(w), 'aria-label': t.label });
        w.el.innerHTML = PP.art.figure(t.fig, { seed: seed++ });
        w.el.appendChild(h('span', { class: 'mk-label' }, t.label));
        w.el.style.top = (w.row ? 58 : 40) + '%';
        lane.appendChild(w.el);
        walkers.push(w);
        spawnT = setTimeout(spawn, 1000 + Math.random() * 1000);
      }
      function frame(now) {
        if (finished) return;
        const dt = Math.min(0.05, (now - last) / 1000); last = now;
        walkers.forEach((w) => {
          if (w.gone || w.stopped) return;
          w.x += w.speed * dt;
          w.el.style.left = w.x + '%';
          if (w.t.interested && w.x > 74 && !w.lost) {
            w.lost = true; w.gone = true; stats.stolen++; lostC.set(stats.stolen);
            w.el.classList.add('to-rival');
            F.popOn(lane, rival, 'Lost to the tube man!', 'bad'); F.sfx('meh');
            setTimeout(() => w.el.remove(), 600);
          } else if (w.x > 100) { w.gone = true; w.el.remove(); }
        });
        raf = requestAnimationFrame(frame);
      }
      function wave(w) {
        if (busy || w.gone || finished) return;
        if (!w.t.interested) {
          stats.awkward++; timer.sub(1.5); w.speed *= 1.8;
          F.popOn(lane, w.el, '?!  (−1.5s)', 'bad'); F.sfx('bad'); F.shake(w.el);
          return;
        }
        busy = true; w.stopped = true; w.el.classList.add('stopped'); F.sfx('click');
        const bub = h('div', { class: 'mk-bubble', style: { left: Math.min(70, w.x) + '%' } },
          h('p', null, '"Hi! What\'s this about?"'),
          h('div', { class: 'mx-choices' },
            h('button', { class: 'chip-btn', onclick: () => resolve(w, 'raffle', bub) }, 'Raffle slip'),
            h('button', { class: 'chip-btn primary', onclick: () => resolve(w, 'chat', bub) }, 'Have a real chat')));
        lane.appendChild(bub);
      }
      function addLead(w, temp, label) {
        leads.push({ temp, bias: w.t.bias, source: temp === 'warm' ? 'your farmers market tent' : 'your raffle fishbowl', event: true });
        leadsC.set(leads.length);
        F.popOn(lane, w.el, label, temp === 'warm' ? 'good' : 'meh'); F.sfx('coin');
        const card = h('div', { class: 'mx-card' }, temp);
        w.el.appendChild(card);
        F.fly(card, clip, lane, () => { clip.appendChild(h('i', { class: 'mx-card-stack ' + temp })); F.bump(clip); });
        card.remove();
      }
      function resolve(w, how, bub) {
        bub.remove();
        const leave = () => { w.el.classList.add('leaving'); w.gone = true; setTimeout(() => w.el.remove(), 500); busy = false; };
        if (how === 'raffle') {
          stats.raffle++; bowlC.set(stats.raffle);
          const slip = h('div', { class: 'mk-slip' });
          w.el.appendChild(slip);
          F.fly(slip, bowl, lane, () => { bowl.appendChild(h('i', { class: 'mk-slip-in', style: { left: 10 + Math.random() * 60 + '%', bottom: 6 + Math.random() * 30 + '%', transform: `rotate(${Math.random() * 60 - 30}deg)` } })); F.bump(bowl); });
          slip.remove();
          F.sfx('whoosh');
          if (PP.chance(0.3)) setTimeout(() => addLead(w, 'cold', '+ Cold lead'), 350); else F.popOn(lane, w.el, 'Into the bowl', 'meh');
          setTimeout(leave, 500);
        } else {
          stats.chat++;
          w.el.classList.add('chatting');
          setTimeout(() => {
            w.el.classList.remove('chatting');
            if (finished) return;
            const r = Math.random();
            if (r < 0.55) { addLead(w, 'warm', '+ Warm lead!'); F.burstOn(lane, w.el, 'good', 12); }
            else if (r < 0.8) addLead(w, 'cold', '+ Cold lead');
            else { F.popOn(lane, w.el, 'Lovely chat about tomatoes', 'meh'); F.sfx('meh'); }
            leave();
          }, 3000);
        }
      }
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
            { q: 'ok', text: `Raffle slips in the fishbowl: ${stats.raffle}` },
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
