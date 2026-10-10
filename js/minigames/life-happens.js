/* Life Happens. A little map of the neighbourhood where your clients live.
 * Life events pop up over their homes and fade if nobody responds.
 * Click one and choose: Call now, Book a review, or Send a card.
 *   Hard news needs a call. Big plans need a review. Celebrations deserve a card.
 * Real life is messier: some hard news would welcome a card as well, and some good
 * news has planning behind it. Those second-best answers count as "ok".
 * Each session lays out a different street (houses, apartment buildings, a shop with the
 * owner living upstairs), and some stories continue: hard news earlier, good news later.
 * You can only be on one call at a time.
 * result.sat = { clientName: change } so the caller can update the book. */
(function (PP) {
  const h = PP.h;
  const NAMES = ['The Parks', 'Dana R.', 'Mr. Okafor', 'Gloria', 'The Romeros', 'Mei'];
  /* g overrides the default grades for this event. where limits it to a kind of home.
   * chain is a later event for the same client. */
  const EVENTS = [
    { kind: 'call', text: 'Lost their job', chain: { kind: 'card', text: 'Started a new job!' } },
    { kind: 'call', text: 'Health scare', g: { card: 'ok' }, why: 'Scary news. Call. A card is a kind extra, not a replacement.', chain: { kind: 'card', text: 'All clear from the doctor' } },
    { kind: 'call', text: 'Basement flooded', chain: { kind: 'card', text: 'Flood repairs finally done' } },
    { kind: 'call', text: 'Dad passed away', g: { card: 'ok' }, why: 'Grief. Call first. A card is welcome too, but it can\'t replace your voice.', chain: { kind: 'review', text: 'Ready to sort out Dad\'s accounts' } },
    { kind: 'call', text: 'Car accident (everyone\'s okay)', g: { card: 'ok' }, why: 'Shaken up. A quick call to check in matters most.' },
    { kind: 'call', text: 'Got scammed out of $2,000', why: 'Embarrassed and upset. Call, and help them take the next steps.' },
    { kind: 'call', text: 'Spouse in the hospital', g: { card: 'ok' }, why: 'Call. A card is a lovely extra.', chain: { kind: 'card', text: 'Spouse home from the hospital' } },
    { kind: 'call', text: 'Filed for divorce', g: { review: 'ok' }, why: 'Call first. The plan can wait a week.', chain: { kind: 'review', text: 'Ready to rebuild the plan' } },
    { kind: 'call', text: 'Hours cut at work', g: { review: 'ok' }, why: 'Worry first, planning second. Call.' },
    { kind: 'call', text: 'Mom moving into memory care', g: { card: 'ok' }, why: 'Heavy news. Call. A card would be kind too.' },
    { kind: 'call', text: 'Laid off after 22 years', chain: { kind: 'card', text: 'Landed a new role!' } },
    { kind: 'call', text: 'Terrible quarter at the shop', g: { review: 'ok' }, where: 'shop', why: 'Stress first. Call, then look at the numbers together.' },
    { kind: 'call', text: 'Storm damaged the shop roof', where: 'shop', chain: { kind: 'card', text: 'Shop reopened after repairs' } },
    { kind: 'call', text: 'Burst pipe flooded the apartment', where: 'apt' },
    { kind: 'review', text: 'Baby on the way', chain: { kind: 'card', text: 'Baby arrived!' } },
    { kind: 'review', text: 'Got a big promotion' },
    { kind: 'review', text: 'Kid starts college next fall' },
    { kind: 'review', text: 'Retiring next year', chain: { kind: 'card', text: 'Retirement party this Friday' } },
    { kind: 'review', text: 'Bought a house', why: 'Big change. Update the plan. A housewarming card works too.' },
    { kind: 'review', text: 'Getting married in the spring', chain: { kind: 'card', text: 'Just got married!' } },
    { kind: 'review', text: 'Starting their own business' },
    { kind: 'review', text: 'Inherited the family cabin' },
    { kind: 'review', text: 'Twins on the way!', chain: { kind: 'card', text: 'The twins are here!' } },
    { kind: 'review', text: 'Adopting a child', chain: { kind: 'card', text: 'Adoption finalized!' } },
    { kind: 'review', text: 'Thinking of selling the shop', where: 'shop' },
    { kind: 'review', text: 'Mom moving in with them', why: 'A household change. Review the plan, and maybe call first.' },
    { kind: 'review', text: 'Grown kid moving back home' },
    { kind: 'card', text: 'Birthday today' },
    { kind: 'card', text: '25th anniversary' },
    { kind: 'card', text: 'Daughter graduated' },
    { kind: 'card', text: 'Ran their first marathon' },
    { kind: 'card', text: 'Their dog of 16 years died', why: 'Small but real grief. A handwritten card means a lot. A call is kind too.' },
    { kind: 'card', text: 'Kid made the honour roll' },
    { kind: 'card', text: 'Voted "Best Bakery" in the paper', where: 'shop' },
    { kind: 'card', text: 'Became a grandparent', g: { review: 'ok' }, why: 'A card first. The grandkids can come up at the next review.' },
    { kind: 'card', text: 'Moved into their dream apartment', where: 'apt' },
    { kind: 'card', text: '10 years cancer-free' },
    { kind: 'card', text: 'Became a citizen!' },
    { kind: 'card', text: 'Learned to swim at 60' },
    { kind: 'card', text: 'Paid off the car' },
    { kind: 'card', text: 'Shop turned 30 years old', where: 'shop', g: { review: 'ok' } },
    { kind: 'card', text: 'Finished chemo', g: { call: 'good' }, why: 'A milestone. A card or a warm call both land well.' }
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
  const ROOFS = ['#c86f4f', '#2f5a9c', '#7f9f5a', '#b0763c', '#6f6a9a', '#e6b85c'];
  const ART = {
    house: (i) => `<svg viewBox="0 0 64 56" aria-hidden="true"><ellipse cx="32" cy="53" rx="28" ry="3" fill="#4a2c12" opacity=".12"/><path d="M10,26 L32,8 L54,26" fill="${ROOFS[i % ROOFS.length]}" stroke="#4a2c12" stroke-width="2" stroke-linejoin="round"/><path d="M14,24 h36 v28 h-36z" fill="#fbf1e1" stroke="#4a2c12" stroke-width="2" stroke-linejoin="round"/><path d="M28,52 v-14 h8 v14" fill="#e3c6a0" stroke="#4a2c12" stroke-width="2"/><path d="M18,30 h7 v7 h-7z M39,30 h7 v7 h-7z" fill="#cfe3f7" stroke="#4a2c12" stroke-width="1.6"/><path d="M42,15 v-6 h5 v10" fill="#e3c6a0" stroke="#4a2c12" stroke-width="1.6"/></svg>`,
    apt: (i) => `<svg viewBox="0 0 64 56" aria-hidden="true"><ellipse cx="32" cy="53" rx="24" ry="3" fill="#4a2c12" opacity=".12"/><path d="M16,4 h32 v48 h-32z" fill="${['#e3c6a0', '#cfd6e8', '#e9dcc0'][i % 3]}" stroke="#4a2c12" stroke-width="2" stroke-linejoin="round"/><path d="M14,4 h36" stroke="#4a2c12" stroke-width="3" stroke-linecap="round"/><path d="M21,9 h7 v6 h-7z M36,9 h7 v6 h-7z M21,20 h7 v6 h-7z M36,20 h7 v6 h-7z M21,31 h7 v6 h-7z M36,31 h7 v6 h-7z" fill="#cfe3f7" stroke="#4a2c12" stroke-width="1.4"/><path d="M28,52 v-9 h8 v9" fill="${ROOFS[i % ROOFS.length]}" stroke="#4a2c12" stroke-width="1.8"/></svg>`,
    shop: (i) => `<svg viewBox="0 0 64 56" aria-hidden="true"><ellipse cx="32" cy="53" rx="28" ry="3" fill="#4a2c12" opacity=".12"/><path d="M12,6 h40 v46 h-40z" fill="#fbf1e1" stroke="#4a2c12" stroke-width="2" stroke-linejoin="round"/><path d="M18,11 h8 v7 h-8z M38,11 h8 v7 h-8z" fill="#cfe3f7" stroke="#4a2c12" stroke-width="1.4"/><path d="M8,24 h48 l-3,8 h-42z" fill="${ROOFS[i % ROOFS.length]}" stroke="#4a2c12" stroke-width="2" stroke-linejoin="round"/><path d="M14,24 l-1,8 M22,24 v8 M32,24 v8 M42,24 v8 M50,24 l1,8" stroke="#fbf1e1" stroke-width="2"/><path d="M16,36 h18 v12 h-18z" fill="#cfe3f7" stroke="#4a2c12" stroke-width="1.6"/><path d="M38,52 v-16 h9 v16" fill="#e3c6a0" stroke="#4a2c12" stroke-width="1.8"/></svg>`
  };
  /* Streets. kinds: what stands at each spot (h = house, a = apartment, s = shop with a flat above). */
  const LAYOUTS = [
    { id: 'grid', name: 'Maple & Third', spots: [[6, 17], [41, 17], [75, 17], [6, 63], [41, 63], [75, 63]], kinds: 'hhahhh' },
    { id: 'main', name: 'Main Street and the lanes behind it', spots: [[4, 16], [28, 16], [52, 16], [76, 16], [16, 64], [60, 64]], kinds: 'sashhh' },
    { id: 'lane', name: 'Willow Lane, which winds', spots: [[3, 16], [37, 16], [71, 16], [18, 63], [52, 63], [84, 63]], kinds: 'hhhhah' },
    { id: 'culdesac', name: 'Birch Court, a cul-de-sac', spots: [[4, 50], [20, 15], [43, 13], [66, 15], [82, 50], [43, 64]], kinds: 'hhhhhh' },
    { id: 'harbor', name: 'Down by the harbour', spots: [[5, 15], [40, 15], [76, 15], [5, 63], [40, 63], [76, 63]], kinds: 'aasshh' }
  ];
  const NARROW_SPOTS = [[6, 18], [53, 18], [6, 48], [53, 48], [6, 78], [53, 78]];

  PP.minigames.lifeHappens = {
    title: 'Life Happens',
    risk: 'staying close to your clients',
    blurb: 'Your clients\' lives keep moving. When news pops up over a home, respond before it fades: call for hard news, book a review for big plans, send a card to celebrate.',
    start(root, ctx, done) {
      const F = PP.fx;
      const prep = ctx.prep || 0;
      const narrow = root.getBoundingClientRect().width < 560;
      const names = (ctx.names && ctx.names.length ? ctx.names : NAMES).slice(0, 6);
      for (let k = 0; names.length < 4; k++) if (!names.includes(NAMES[k])) names.push(NAMES[k]);
      const layout = PP.pick(LAYOUTS);
      const ui = PP.mg.shell(root, this.title, this.risk);
      const helpedC = F.counter('Helped'), missC = F.counter('Missed'), streakC = F.counter('Streak');
      const phoneM = F.meter('Phone', 'good'); phoneM.set(1, 1, 'free');
      ui.hud.append(helpedC.el, missC.el, streakC.el, phoneM.el);
      ui.wrap.insertBefore(h('div', { class: 'mg-scene' }, h('b', null, layout.name), h('span', null, `${names.length} clients live around here.`)), ui.hud);

      const town = h('div', { class: 'mg-stage-area lh-town lh-' + layout.id + (narrow ? ' lh-narrow' : '') });
      // Who lives where: spots and buildings shuffled each time.
      const order = PP.shuffle(layout.spots.map((s, k) => k)).slice(0, names.length);
      const kinds = layout.kinds.split('');
      const houses = names.map((n, i) => {
        const k = order[i];
        const spot = narrow ? (names.length <= 4 ? [[6, 22], [53, 22], [6, 62], [53, 62]][i] : NARROW_SPOTS[i]) : layout.spots[k];
        const kind = { h: 'house', a: 'apt', s: 'shop' }[narrow ? PP.pick(kinds) : kinds[k]];
        const sub = kind === 'apt' ? 'Apt ' + (1 + Math.floor(Math.random() * 5)) + 'ABCD'[Math.floor(Math.random() * 4)] : kind === 'shop' ? 'Lives above the shop' : null;
        const el = h('div', { class: 'lh-house k-' + kind, style: { left: spot[0] + '%', top: spot[1] + '%' } }, h('span', { html: ART[kind](i + k) }), h('span', { class: 'lh-name' }, n, sub ? h('small', null, sub) : null));
        town.appendChild(el);
        return { name: n, el, ev: null, kind, chain: null, chainAt: 0 };
      });
      ui.body.append(h('p', { class: 'mg-instr' }, 'Tap the news over a home to respond. Calls take a moment, and you can only be on one at a time.'), town);

      const log = [], sat = {};
      let finished = false, raf = 0, last = performance.now(), spawnT = 0, streak = 0, callBusy = 0, picker = null, spawned = 0, chains = 0;
      const total = 10 + prep;
      const kindsHere = new Set(houses.map((x) => x.kind));
      const deck = PP.shuffle(EVENTS.filter((e) => !e.where || kindsHere.has(e.where)));
      const timer = PP.mg.timer(ui.bar, 55 + prep * 6, () => finish());
      const bumpSat = (who, d) => { sat[who] = (sat[who] || 0) + d; };
      const grade = (e, id) => (e.g && e.g[id]) || GRADE[e.kind][id];
      const why = (e) => e.why || WHY[e.kind];

      function clampIn(el) {
        // Keep a badge or picker inside the town, whatever the screen width.
        el.style.marginLeft = '0px';
        el.style.animation = 'none';
        const t = town.getBoundingClientRect(), r = el.getBoundingClientRect();
        el.style.animation = '';
        let dx = 0;
        if (r.left < t.left + 4) dx = t.left + 4 - r.left;
        else if (r.right > t.right - 4) dx = t.right - 4 - r.right;
        if (dx) el.style.marginLeft = dx + 'px';
        if (el.classList.contains('lh-badge') && r.top < t.top + 2) el.classList.add('below');
      }
      function nextEvent(free) {
        // A continuing story comes first, if one is ready.
        const ready = free.filter((x) => x.chain && spawned >= x.chainAt);
        if (ready.length) { const hs = PP.pick(ready); const e = Object.assign({ life: 8, chained: true }, hs.chain); hs.chain = null; chains++; return { hs, e }; }
        const hs = PP.pick(free);
        let k = deck.findIndex((e) => !e.where || e.where === hs.kind);
        if (k < 0) k = 0;
        const e = deck.splice(k, 1)[0] || PP.pick(EVENTS.filter((x) => !x.where));
        return { hs, e };
      }
      function spawn() {
        const free = houses.filter((x) => !x.ev);
        if (!free.length || spawned >= total) return;
        const { hs, e } = nextEvent(free);
        spawned++;
        const life = h('span', { class: 'lh-life' });
        const badge = h('button', { class: 'lh-badge' + (e.kind === 'call' ? ' urgent' : '') + (e.chained ? ' chained' : ''), onclick: (ev) => { ev.stopPropagation(); openPicker(hs); } }, e.chained ? h('small', null, 'Update') : null, e.text, life);
        const lifeS = (e.life || (e.kind === 'call' ? 7 : e.kind === 'review' ? 9 : 8)) + prep;
        hs.ev = { ...e, t: lifeS, max: lifeS, badge, lifeEl: life };
        hs.el.appendChild(badge);
        clampIn(badge);
        F.sfx(e.kind === 'call' ? 'ring' : 'ding');
        F.bump(hs.el.firstChild);
      }
      function closePicker() { if (picker) { picker.remove(); picker = null; } }
      function openPicker(hs) {
        closePicker();
        if (!hs.ev) return;
        const opt = (id, label, dis) => h('button', { class: 'btn small' + (id === 'call' ? ' primary' : ''), disabled: dis, onclick: (ev) => { ev.stopPropagation(); respond(hs, id); } }, label);
        picker = h('div', { class: 'lh-pick' }, h('p', null, `${hs.name}: ${hs.ev.text}`),
          opt('call', callBusy > 0 ? 'On another call…' : 'Call now', callBusy > 0), opt('review', 'Book a review'), opt('card', 'Send a card'));
        town.appendChild(picker);
        const r = hs.el.getBoundingClientRect(), b = town.getBoundingClientRect(), pw = picker.offsetWidth, ph = picker.offsetHeight;
        const left = Math.min(b.width - pw - 4, Math.max(4, r.left - b.left + r.width / 2 - pw / 2));
        let top = r.top - b.top > b.height / 2 ? r.top - b.top - ph - 4 : r.bottom - b.top + 4;
        top = Math.min(b.height - ph - 4, Math.max(4, top));
        Object.assign(picker.style, { left: left + 'px', top: top + 'px' });
      }
      town.addEventListener('click', closePicker);
      function respond(hs, id) {
        closePicker();
        const e = hs.ev; if (!e) return;
        if (id === 'call' && callBusy > 0) return;
        const q = grade(e, id);
        hs.ev = null; e.badge.remove();
        log.push({ who: hs.name, e, id, q });
        if (e.chain) { hs.chain = Object.assign({ rememberQ: q }, e.chain); hs.chainAt = spawned + 2 + Math.floor(Math.random() * 2); }
        if (id === 'call') { callBusy = 3; phoneM.set(0, 1, 'on a call'); }
        if (q === 'good') { streak++; bumpSat(hs.name, e.kind === 'call' ? 3 : 2); F.popOn(town, hs.el, streak >= 3 ? `Thoughtful ×${streak}` : e.chained && e.rememberQ === 'good' ? 'They remembered you were there' : { call: 'They needed that call', review: 'Review booked', card: 'Card sent ♥' }[id], 'good'); F.burstOn(town, hs.el, 'good', 12); F.sfx(streak >= 3 ? 'great' : 'good'); }
        else if (q === 'ok') { streak = 0; bumpSat(hs.name, 1); F.popOn(town, hs.el, 'That works', 'meh'); F.sfx('meh'); }
        else { streak = 0; bumpSat(hs.name, -1); F.popOn(town, hs.el, id === 'card' ? 'A card? Really?' : 'Felt like a sales pitch', 'bad'); F.sfx('bad'); F.shake(hs.el); }
        streakC.set(streak);
        helpedC.set(log.filter((l) => l.id !== 'missed' && l.q !== 'bad').length);
        ui.feedback.textContent = why(e);
        ui.feedback.className = 'mg-feedback q-' + q;
        checkEnd();
      }
      function frame(now) {
        if (finished) return;
        const dt = Math.min(0.05, (now - last) / 1000); last = now;
        if (callBusy > 0) { callBusy -= dt; phoneM.set(callBusy > 0 ? 0 : 1, 1, callBusy > 0 ? 'on a call' : 'free'); }
        spawnT -= dt;
        const active = houses.filter((x) => x.ev).length;
        if (spawnT <= 0 && active < (narrow ? 2 : 3)) { spawn(); spawnT = 3.2 + prep * 0.4 - Math.min(1.2, spawned * 0.08); }
        houses.forEach((hs) => {
          if (!hs.ev) return;
          hs.ev.t -= dt;
          hs.ev.lifeEl.style.transform = `scaleX(${Math.max(0, hs.ev.t / hs.ev.max)})`;
          if (hs.ev.t <= 0) {
            const e = hs.ev; hs.ev = null; e.badge.remove();
            if (picker && picker.textContent.startsWith(hs.name + ':')) closePicker();
            log.push({ who: hs.name, e, id: 'missed', q: 'bad' });
            if (e.chain) { hs.chain = Object.assign({ rememberQ: 'bad' }, e.chain); hs.chainAt = spawned + 2; }
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
        const salesy = log.filter((l) => l.e.kind === 'card' && l.id === 'review' && l.q === 'bad').length;
        const eff = { energy: -1, trust: score >= log.length * 0.7 ? 1 : missedCalls ? -1 : 0 };
        const act = { call: 'Called', review: 'Booked a review with', card: 'Sent a card to', missed: 'Missed' };
        PP.mg.summary(root, PP.minigames.lifeHappens.title, {
          score: Math.round(score * 10) / 10, max: log.length, eff, sat,
          passed: ctx.pass != null ? score >= ctx.pass : null,
          headline: missedCalls ? `${missedCalls} client${missedCalls > 1 ? 's' : ''} went through something hard and didn't hear from you.` : salesy ? 'Turning a celebration into a meeting felt like a sales pitch.' : chains ? 'You showed up when it mattered, and you were still there for the next chapter.' : 'You showed up when it mattered.',
          lines: log.map((l) => ({ q: l.q, text: `${act[l.id]} ${l.who}: ${l.e.text.replace(/!$/, '').toLowerCase()}.` + (l.q === 'good' ? '' : ' ' + why(l.e)) }))
        }, done);
      }
      raf = requestAnimationFrame(frame);
      return { stop() { finished = true; cancelAnimationFrame(raf); timer.stop(); } };
    }
  };
})(window.PP);
