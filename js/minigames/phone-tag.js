/* The Snake Pit — the risk: letting calls go unreturned.
 * Whack-a-mole: phones pop out of the pit. Answer the client and their people
 * before they go to voicemail. Ignore robocalls (answering them wastes time).
 * Click/tap, or use number keys 1-9 for the holes.
 */
(function (PP) {
  const h = PP.h;
  PP.minigames.phoneTag = {
    title: 'The Snake Pit',
    risk: 'unreturned calls',
    blurb: 'Phones pop out of the pit. Answer your client and their people before it goes to voicemail. Leave the robocalls alone.',
    start(root, ctx, done) {
      const client = ctx.client;
      const prep = ctx.prep || 0;
      const practice = !!ctx.practice;
      const ui = PP.mg.shell(root, this.title, this.risk);
      const grid = h('div', { class: 'pit-grid' });
      const holes = [];
      for (let i = 0; i < 9; i++) {
        const b = h('button', { class: 'hole', 'aria-label': 'Hole ' + (i + 1), onclick: () => hit(i) }, h('span', { class: 'hole-num' }, String(i + 1)), h('span', { class: 'phone-pop' }));
        holes.push({ el: b, call: null });
        grid.appendChild(b);
      }
      ui.body.append(h('p', { class: 'mg-instr' }, `Answer calls from ${client.name} and ${client.shortStake || 'their people'}. Robocalls waste your time.`), grid);
      const callers = [
        { who: client.name, good: true, w: 4 },
        { who: client.shortStake || 'Their partner', good: true, w: 1.5 },
        { who: 'Extended warranty', good: false, w: 2 },
        { who: 'Unknown number', good: false, w: 1.5 },
        { who: '"You\'ve won a cruise"', good: false, w: 1 }
      ];
      const pickCaller = () => { const tot = callers.reduce((a, c) => a + c.w, 0); let r = Math.random() * tot; for (const c of callers) { r -= c.w; if (r <= 0) return c; } return callers[0]; };
      const stats = { answered: 0, missed: 0, robo: 0, total: 0 };
      let finished = false, spawnT = null;
      const onKey = (e) => { const n = parseInt(e.key, 10); if (n >= 1 && n <= 9) { e.preventDefault(); hit(n - 1); } };
      document.addEventListener('keydown', onKey);
      const timer = PP.mg.timer(ui.bar, 25 + prep * 4, () => finish());
      const F = PP.fx;
      const ansC = F.counter('Answered'), missC = F.counter('Voicemail'), comboC = F.counter('Combo');
      ui.hud.append(ansC.el, missC.el, comboC.el);
      let combo = 0;
      const pitBox = grid;

      function spawn() {
        if (finished) return;
        const free = holes.map((hh, i) => (hh.call ? -1 : i)).filter((i) => i >= 0);
        if (free.length) {
          const i = PP.pick(free);
          const caller = pickCaller();
          const life = (1500 - Math.min(600, stats.total * 25)) * (1 + prep * 0.15);
          const call = { caller, timeout: setTimeout(() => expire(i), life) };
          holes[i].call = call;
          if (caller.good) stats.total++;
          const pop = holes[i].el.querySelector('.phone-pop');
          pop.textContent = caller.who;
          holes[i].el.classList.add('up', caller.good ? 'good' : 'junk');
          if (caller.good) F.sfx('ring');
        }
        spawnT = setTimeout(spawn, Math.max(380, 820 - stats.total * 18));
      }
      function clear(i) {
        const hh = holes[i];
        if (hh.call) clearTimeout(hh.call.timeout);
        hh.call = null;
        hh.el.classList.remove('up', 'good', 'junk');
      }
      function expire(i) {
        const call = holes[i].call;
        if (!call) return;
        if (call.caller.good) { stats.missed++; missC.set(stats.missed); combo = 0; comboC.set(0); F.popOn(pitBox, holes[i].el, 'Voicemail…', 'bad'); F.sfx('meh'); say(`Voicemail. ${call.caller.who} sighs.`, 'bad'); }
        clear(i);
        status();
      }
      function hit(i) {
        if (finished) return;
        const call = holes[i].call;
        if (!call) return;
        if (call.caller.good) { stats.answered++; combo++; ansC.set(stats.answered); comboC.set(combo); F.popOn(pitBox, holes[i].el, combo >= 3 ? `Answered! x${combo}` : 'Answered!', 'good'); F.burstOn(pitBox, holes[i].el, 'good', 10); F.sfx(combo >= 3 ? 'great' : 'good'); say(`"Oh! Thanks for picking up." (${call.caller.who})`, 'good'); }
        else { stats.robo++; combo = 0; comboC.set(0); timer.sub(1); F.popOn(pitBox, holes[i].el, 'Robocall! −1s', 'bad'); F.shake(holes[i].el); F.sfx('bad'); say(`${call.caller.who}. You lose a second of your life.`, 'ok'); }
        clear(i);
        status();
      }
      function say(t, q) { ui.feedback.textContent = t; ui.feedback.className = 'mg-feedback q-' + q; }
      function status() { ui.status.textContent = `Answered ${stats.answered} · Missed ${stats.missed}`; }

      function finish() {
        if (finished) return;
        finished = true;
        clearTimeout(spawnT); timer.stop(); document.removeEventListener('keydown', onKey);
        holes.forEach((hh, i) => { if (hh.call && hh.call.caller.good) stats.missed++; clear(i); });
        const rate = stats.total ? stats.answered / stats.total : 1;
        const score = Math.round(rate * 10 - Math.min(3, stats.robo * 0.5));
        const eff = {
          energy: -1,
          trust: rate >= 0.8 ? 1 : stats.missed >= 4 ? -1 : 0,
          momentum: stats.answered >= 6 ? 1 : 0,
          insight: rate >= 0.6 ? 1 : 0
        };
        if (stats.missed >= 3) eff.debt = { tag: 'missed_message', sev: Math.min(3, stats.missed - 2) };
        else eff.clearDebt = 'missed_message';
        PP.mg.summary(root, PP.minigames.phoneTag.title, {
          score: Math.max(0, score), max: 10, eff, showDebt: practice, passed: ctx.pass != null ? score >= ctx.pass : null,
          headline: `You answered ${stats.answered} of ${stats.total} real calls.`,
          lines: [
            { q: rate >= 0.8 ? 'good' : rate >= 0.5 ? 'ok' : 'bad', text: `Calls answered: ${stats.answered} of ${stats.total}` },
            { q: stats.missed >= 3 ? 'bad' : 'good', text: `Went to voicemail: ${stats.missed}` + (stats.missed >= 3 ? '. Those turn into unreturned calls that follow you.' : '') },
            { q: stats.robo ? 'ok' : 'good', text: `Robocalls you picked up: ${stats.robo}` }
          ]
        }, done);
      }

      spawn();
      status();
      return { stop() { finished = true; clearTimeout(spawnT); timer.stop(); document.removeEventListener('keydown', onKey); holes.forEach((hh, i) => clear(i)); } };
    }
  };
})(window.PP);
