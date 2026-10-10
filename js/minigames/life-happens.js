/* Life Happens. A little map of the neighbourhood where your clients live.
 * Life events pop up over their houses and fade if nobody responds.
 * Click one and choose: Call now, Book a review, or Send a card.
 *   Hard news needs a call. Big plans need a review. Celebrations deserve a card.
 * You can only be on one call at a time.
 * result.sat = { clientName: change } so the caller can update the book. */
(function (PP) {
  const h = PP.h;
  const NAMES = ['The Parks', 'Dana R.', 'Mr. Okafor', 'Gloria', 'The Romeros', 'Mei'];
  const EVENTS = [
    { kind: 'call', text: 'Lost their job', life: 7 },
    { kind: 'call', text: 'Health scare', life: 7 },
    { kind: 'call', text: 'Basement flooded', life: 7 },
    { kind: 'call', text: 'Dad passed away', life: 7 },
    { kind: 'review', text: 'Baby on the way', life: 9 },
    { kind: 'review', text: 'Got a big promotion', life: 9 },
    { kind: 'review', text: 'Kid starts college next fall', life: 9 },
    { kind: 'review', text: 'Retiring next year', life: 9 },
    { kind: 'review', text: 'Bought a house', life: 9 },
    { kind: 'card', text: 'Birthday today', life: 8 },
    { kind: 'card', text: '25th anniversary', life: 8 },
    { kind: 'card', text: 'Daughter graduated', life: 8 },
    { kind: 'card', text: 'Ran their first marathon', life: 8 }
  ];
  const GRADE = {
    call: { call: 'good', review: 'ok', card: 'bad' },
    review: { review: 'good', call: 'ok', card: 'ok' },
    card: { card: 'good', call: 'ok', review: 'bad' }
  };
  const WHY = {
    call: 'Hard news. A real person on the phone matters most.',
    review: 'A big change. Time to sit down and update the plan.',
    card: 'A celebration. A card feels personal. A sales meeting does not.'
  };
  const SPOTS = [[6, 17], [41, 17], [75, 17], [6, 63], [41, 63], [75, 63]];
  const ROOFS = ['#c86f4f', '#2f5a9c', '#7f9f5a', '#b0763c', '#6f6a9a', '#e6b85c'];
  const house = (i) => `<svg viewBox="0 0 64 56" aria-hidden="true"><ellipse cx="32" cy="53" rx="28" ry="3" fill="#4a2c12" opacity=".12"/><path d="M10,26 L32,8 L54,26" fill="${ROOFS[i % ROOFS.length]}" stroke="#4a2c12" stroke-width="2" stroke-linejoin="round"/><path d="M14,24 h36 v28 h-36z" fill="#fbf1e1" stroke="#4a2c12" stroke-width="2" stroke-linejoin="round"/><path d="M28,52 v-14 h8 v14" fill="#e3c6a0" stroke="#4a2c12" stroke-width="2"/><path d="M18,30 h7 v7 h-7z M39,30 h7 v7 h-7z" fill="#cfe3f7" stroke="#4a2c12" stroke-width="1.6"/><path d="M42,15 v-6 h5 v10" fill="#e3c6a0" stroke="#4a2c12" stroke-width="1.6"/></svg>`;

  PP.minigames.lifeHappens = {
    title: 'Life Happens',
    risk: 'staying close to your clients',
    blurb: 'Your clients\' lives keep moving. When news pops up over a house, respond before it fades: call for hard news, book a review for big plans, send a card to celebrate.',
    start(root, ctx, done) {
      const F = PP.fx;
      const prep = ctx.prep || 0;
      const names = (ctx.names && ctx.names.length ? ctx.names : NAMES).slice(0, 6);
      while (names.length < 4) names.push(NAMES[names.length]);
      const ui = PP.mg.shell(root, this.title, this.risk);
      const helpedC = F.counter('Helped'), missC = F.counter('Missed'), streakC = F.counter('Streak');
      const phoneM = F.meter('Phone', 'good'); phoneM.set(1, 1, 'free');
      ui.hud.append(helpedC.el, missC.el, streakC.el, phoneM.el);

      const town = h('div', { class: 'mg-stage-area lh-town' });
      const houses = names.map((n, i) => {
        const el = h('div', { class: 'lh-house', style: { left: SPOTS[i][0] + '%', top: SPOTS[i][1] + '%' } }, h('span', { html: house(i) }), h('span', { class: 'lh-name' }, n));
        town.appendChild(el);
        return { name: n, el, ev: null };
      });
      ui.body.append(h('p', { class: 'mg-instr' }, 'Click the news over a house to respond. Calls take a moment, and you can only be on one at a time.'), town);

      const log = [], sat = {};
      let finished = false, raf = 0, last = performance.now(), spawnT = 0, streak = 0, callBusy = 0, picker = null, spawned = 0;
      const total = 10 + prep;
      const deck = PP.shuffle(EVENTS);
      const timer = PP.mg.timer(ui.bar, 55 + prep * 6, () => finish());
      const bumpSat = (who, d) => { sat[who] = (sat[who] || 0) + d; };

      function spawn() {
        const free = houses.filter((x) => !x.ev);
        if (!free.length || spawned >= total) return;
        const hs = PP.pick(free);
        const e = deck[spawned++ % deck.length];
        const life = h('span', { class: 'lh-life' });
        const badge = h('button', { class: 'lh-badge' + (e.kind === 'call' ? ' urgent' : ''), onclick: (ev) => { ev.stopPropagation(); openPicker(hs); } }, e.text, life);
        hs.ev = { ...e, t: e.life + prep, max: e.life + prep, badge, lifeEl: life };
        hs.el.appendChild(badge);
        F.sfx(e.kind === 'call' ? 'ring' : 'ding');
        F.bump(hs.el);
      }
      function closePicker() { if (picker) { picker.remove(); picker = null; } }
      function openPicker(hs) {
        closePicker();
        if (!hs.ev) return;
        const opt = (id, label, dis) => h('button', { class: 'btn small' + (id === 'call' ? ' primary' : ''), disabled: dis, onclick: (ev) => { ev.stopPropagation(); respond(hs, id); } }, label);
        picker = h('div', { class: 'lh-pick' }, h('p', null, `${hs.name}: ${hs.ev.text}`),
          opt('call', callBusy > 0 ? 'On another call…' : 'Call now', callBusy > 0), opt('review', 'Book a review'), opt('card', 'Send a card'));
        const r = hs.el.getBoundingClientRect(), b = town.getBoundingClientRect();
        const left = Math.min(b.width - 180, Math.max(4, r.left - b.left - 40));
        const top = r.top - b.top > b.height / 2 ? r.top - b.top - 120 : r.bottom - b.top + 4;
        Object.assign(picker.style, { left: left + 'px', top: top + 'px' });
        town.appendChild(picker);
      }
      town.addEventListener('click', closePicker);
      function respond(hs, id) {
        closePicker();
        const e = hs.ev; if (!e) return;
        const q = GRADE[e.kind][id];
        hs.ev = null; e.badge.remove();
        log.push({ who: hs.name, e, id, q });
        if (id === 'call') { callBusy = 3; phoneM.set(0, 1, 'on a call'); }
        if (q === 'good') { streak++; bumpSat(hs.name, e.kind === 'call' ? 3 : 2); F.popOn(town, hs.el, streak >= 3 ? `Thoughtful ×${streak}` : { call: 'They needed that call', review: 'Review booked', card: 'Card sent ♥' }[id], 'good'); F.burstOn(town, hs.el, 'good', 12); F.sfx(streak >= 3 ? 'great' : 'good'); }
        else if (q === 'ok') { streak = 0; bumpSat(hs.name, 1); F.popOn(town, hs.el, 'That works', 'meh'); F.sfx('meh'); }
        else { streak = 0; bumpSat(hs.name, -1); F.popOn(town, hs.el, id === 'card' ? 'A card? Really?' : 'Felt like a sales pitch', 'bad'); F.sfx('bad'); F.shake(hs.el); }
        streakC.set(streak);
        helpedC.set(log.filter((l) => l.id !== 'missed' && l.q !== 'bad').length);
        ui.feedback.textContent = WHY[e.kind];
        ui.feedback.className = 'mg-feedback q-' + q;
        checkEnd();
      }
      function frame(now) {
        if (finished) return;
        const dt = Math.min(0.05, (now - last) / 1000); last = now;
        if (callBusy > 0) { callBusy -= dt; phoneM.set(callBusy > 0 ? 0 : 1, 1, callBusy > 0 ? 'on a call' : 'free'); }
        spawnT -= dt;
        const active = houses.filter((x) => x.ev).length;
        if (spawnT <= 0 && active < 3) { spawn(); spawnT = 3.2 + prep * 0.4 - Math.min(1.2, spawned * 0.08); }
        houses.forEach((hs) => {
          if (!hs.ev) return;
          hs.ev.t -= dt;
          hs.ev.lifeEl.style.transform = `scaleX(${Math.max(0, hs.ev.t / hs.ev.max)})`;
          if (hs.ev.t <= 0) {
            const e = hs.ev; hs.ev = null; e.badge.remove();
            log.push({ who: hs.name, e, id: 'missed', q: 'bad' });
            bumpSat(hs.name, e.kind === 'call' ? -2 : -1); streak = 0; streakC.set(0);
            missC.set(log.filter((l) => l.id === 'missed').length);
            F.popOn(town, hs.el, e.kind === 'call' ? 'They didn\'t hear from you' : 'Missed it', 'bad'); F.sfx('bad');
            checkEnd();
          }
        });
        raf = requestAnimationFrame(frame);
      }
      function checkEnd() { if (spawned >= total && !houses.some((x) => x.ev)) setTimeout(finish, 600); }

      function finish() {
        if (finished) return;
        finished = true;
        cancelAnimationFrame(raf); timer.stop(); closePicker();
        houses.forEach((hs) => { if (hs.ev) { log.push({ who: hs.name, e: hs.ev, id: 'missed', q: 'bad' }); bumpSat(hs.name, -1); } });
        const score = log.reduce((a, l) => a + (l.q === 'good' ? 1 : l.q === 'ok' ? 0.5 : 0), 0);
        const missedCalls = log.filter((l) => l.id === 'missed' && l.e.kind === 'call').length;
        const salesy = log.filter((l) => l.e.kind === 'card' && l.id === 'review').length;
        const eff = { energy: -1, trust: score >= log.length * 0.7 ? 1 : missedCalls ? -1 : 0 };
        const act = { call: 'Called', review: 'Booked a review with', card: 'Sent a card to', missed: 'Missed' };
        PP.mg.summary(root, PP.minigames.lifeHappens.title, {
          score: Math.round(score * 10) / 10, max: log.length, eff, sat,
          passed: ctx.pass != null ? score >= ctx.pass : null,
          headline: missedCalls ? `${missedCalls} client${missedCalls > 1 ? 's' : ''} went through something hard and didn't hear from you.` : salesy ? 'Turning a celebration into a meeting felt like a sales pitch.' : 'You showed up when it mattered.',
          lines: log.map((l) => ({ q: l.q, text: `${act[l.id]} ${l.who}: ${l.e.text.toLowerCase()}.` + (l.q === 'good' ? '' : ' ' + WHY[l.e.kind]) }))
        }, done);
      }
      raf = requestAnimationFrame(frame);
      return { stop() { finished = true; cancelAnimationFrame(raf); timer.stop(); } };
    }
  };
})(window.PP);
