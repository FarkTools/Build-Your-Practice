/* Shoebox Fact Find. The client arrives with a shoebox of paperwork.
 * Each item pops out of the box. Drag it (or click a tray, or press 1-4) into:
 *   Ready to use · Needs an update · Ask the client · Not needed
 * Clues in the client's own handwriting reveal real facts about them when you ask.
 * Using something stale or half-finished adds hidden risk. */
(function (PP) {
  const h = PP.h;
  const ITEMS = [
    { name: 'Pay stub', meta: 'Last month · name and employer match', truth: 'ready', reveal: 'Current. Good to go.' },
    { name: 'Mortgage statement', meta: 'This quarter · balance and rate shown', truth: 'ready', reveal: 'Current.' },
    { name: 'Driver\'s license copy', meta: 'Valid until 2029 · both sides', truth: 'ready', reveal: 'Fine.' },
    { name: 'Retirement plan statement', meta: 'Current employer · this year', truth: 'ready', reveal: 'Up to date.' },
    { name: 'Beneficiary form', meta: 'Signed 2011 · names an ex-spouse', truth: 'update', reveal: 'Out of date. Needs a new form.' },
    { name: 'Health insurance card', meta: 'From the job they left two years ago', truth: 'update', reveal: 'Old coverage. Need the new card.' },
    { name: 'Will', meta: 'Drafted before the kids were born', truth: 'update', reveal: 'Doesn\'t mention the kids. Needs revisiting.' },
    { name: 'Bank statement', meta: 'Shows the old address', truth: 'update', reveal: 'They moved. Details need updating.' },
    { name: '401(k) statement', meta: 'From a job they left in 2016', truth: 'ask', reveal: 'Is that money still sitting there? Worth asking.' },
    { name: 'Sticky note', meta: '"Mom\'s account??" and nothing else', truth: 'ask', reveal: 'There\'s a story here. Ask.' },
    { name: 'Loan statement', meta: 'Lists a co-signer you haven\'t heard about', truth: 'ask', reveal: 'Who is the co-signer? Ask.' },
    { name: 'Application, page 1 of 3', meta: 'Pages 2 and 3 are missing', truth: 'ask', reveal: 'Incomplete. Ask for the rest.' },
    { name: 'Toaster warranty', meta: 'From 2009', truth: 'skip', reveal: 'Not needed. (The toaster is fine.)' },
    { name: 'Grocery receipts', meta: 'About forty of them', truth: 'skip', reveal: 'Not needed.' },
    { name: 'Takeout menu', meta: 'Thai Garden · several dishes circled', truth: 'skip', reveal: 'Not needed, but noted.' },
    { name: 'Birthday card', meta: '"From Aunt Linda, with love"', truth: 'skip', reveal: 'Sweet. Not needed.' }
  ];
  const RULES = {
    ready: { best: ['ready'], ok: ['ask'] },
    update: { best: ['update'], ok: ['ask'] },
    ask: { best: ['ask'], ok: ['update'] },
    skip: { best: ['skip'], ok: [] },
    clue: { best: ['ask'], ok: ['update'] }
  };
  const TRAYS = [
    { id: 'ready', label: 'Ready to use', key: '1', icon: '<path d="M6,13 l5,5 l10,-12" fill="none" stroke="currentColor" stroke-width="3" stroke-linecap="round" stroke-linejoin="round"/>' },
    { id: 'update', label: 'Needs an update', key: '2', icon: '<path d="M5,21 l2,-6 l11,-11 l4,4 l-11,11z M15,7 l4,4" fill="none" stroke="currentColor" stroke-width="2.6" stroke-linejoin="round"/>' },
    { id: 'ask', label: 'Ask the client', key: '3', icon: '<path d="M8,9 q0,-5 5,-5 q5,0 5,5 q0,3 -4,4.5 q-1,.5 -1,3" fill="none" stroke="currentColor" stroke-width="2.8" stroke-linecap="round"/><circle cx="13" cy="21" r="1.8" fill="currentColor"/>' },
    { id: 'skip', label: 'Not needed', key: '4', icon: '<path d="M6,8 h14 l-1.5,14 h-11z M4,8 h18 M10,8 v-3 h6 v3" fill="none" stroke="currentColor" stroke-width="2.4" stroke-linejoin="round"/>' }
  ];
  const BOX = '<svg viewBox="0 0 120 70" aria-hidden="true"><path d="M10,24 L110,24 L104,66 L16,66z" fill="#e3c6a0" stroke="#4a2c12" stroke-width="2" stroke-linejoin="round"/><path d="M6,14 L114,14 L110,26 L10,26z" fill="#eed3ad" stroke="#4a2c12" stroke-width="2" stroke-linejoin="round" transform="rotate(-8 10 20)"/><path d="M40,44 h40" stroke="#4a2c12" stroke-width="2" stroke-linecap="round"/><path d="M22,24 l6,-10 l10,8 M70,24 l10,-12 l8,10" fill="#fbf1e1" stroke="#4a2c12" stroke-width="1.6" stroke-linejoin="round"/></svg>';

  PP.minigames.factFind = {
    title: 'Shoebox Fact Find',
    risk: 'missing or out-of-date information',
    blurb: 'The client hands you a shoebox of paperwork. Sort each item: ready to use, needs an update, ask the client, or not needed. Clues in their handwriting tell you something real about them.',
    start(root, ctx, done) {
      const F = PP.fx;
      const prep = ctx.prep || 0;
      const client = ctx.client || (ctx.state && ctx.state.client);
      const known = (ctx.state && ctx.state.facts) || {};
      // Clues: facts about this client, written on scraps in the box.
      const clues = client ? Object.entries(client.facts).filter(([id]) => known[id] == null).slice(0, 2).map(([id, f]) => ({
        name: `A note in ${client.name}'s handwriting`, meta: `"${f.label.replace(/^\w/, (m) => m.toLowerCase())}…?"`, truth: 'clue', fact: id, reveal: `You ask about it. ${client.name} tells you more.`
      })) : [];
      const items = PP.shuffle(PP.shuffle(ITEMS).slice(0, 8 - clues.length).concat(clues));
      const ui = PP.mg.shell(root, this.title, this.risk);
      const sortedC = F.counter('Sorted'), comboC = F.counter('Combo'), factsC = F.counter('Facts');
      const risk = F.meter('Hidden risk', 'bad'); risk.set(0, 4, 'none');
      ui.hud.append(sortedC.el, comboC.el, factsC.el, risk.el);

      const box = h('div', { class: 'ff-box', html: BOX, style: { position: 'absolute', left: 'calc(50% - 60px)', top: '4px', width: '120px', zIndex: 6 } });
      const desk = h('div', { class: 'mg-stage-area dd-desk' }, box, h('div', { class: 'dd-pile' }, 'Falls off the table'));
      const trays = h('div', { class: 'dd-trays' });
      TRAYS.forEach((t) => {
        t.count = h('span', { class: 'dd-count' }, '0');
        t.el = h('button', { class: 'dd-tray t-' + t.id, onclick: () => choose(t.id) },
          h('span', { class: 'dd-icon', html: `<svg viewBox="0 0 26 26" aria-hidden="true">${t.icon}</svg>` }), h('span', null, t.label), h('kbd', null, t.key), t.count);
        trays.appendChild(t.el);
      });
      desk.appendChild(trays);
      ui.body.append(h('p', { class: 'mg-instr' }, 'Drag each item into a tray, click a tray, or press 1–4. Asking about everything wears the client out.'), desk);

      let i = -1, card = null, y = 0, finished = false, raf = 0, last = performance.now(), combo = 0, riskN = 0, busy = false, drag = null, asks = 0;
      const log = [], facts = [];
      const fall = 10 + prep * 2;
      const timer = PP.mg.timer(ui.bar, 60 + prep * 8, () => finish());
      const onKey = (e) => { const t = TRAYS.find((x) => x.key === e.key); if (t) { e.preventDefault(); choose(t.id); } };
      document.addEventListener('keydown', onKey);

      function next() {
        i++;
        if (i >= items.length) return finish();
        busy = false;
        const d = items[i];
        card = h('div', { class: 'dd-card' + (d.truth === 'clue' ? ' clue' : ''), style: { top: '24%' } },
          h('div', { class: 'doc-icon', 'aria-hidden': 'true' }), h('div', null, h('div', { class: 'doc-name' }, d.name), h('div', { class: 'doc-meta' }, d.meta)));
        y = 0;
        desk.appendChild(card);
        card.animate([{ transform: 'translateX(-50%) translateY(-40px) scale(.6) rotate(-8deg)', opacity: 0 }, { transform: 'translateX(-50%) translateY(6px) scale(1.04)', opacity: 1, offset: 0.7 }, { transform: 'translateX(-50%)', opacity: 1 }], { duration: 380, easing: 'ease-out' });
        F.bump(box);
        F.sfx('whoosh');
        card.addEventListener('pointerdown', startDrag);
        ui.status.textContent = `${i + 1} of ${items.length}`;
      }
      function frame(now) {
        if (finished) return;
        const dt = Math.min(0.05, (now - last) / 1000); last = now;
        if (card && !busy && !drag) {
          y += dt / fall;
          card.style.top = 24 + y * 32 + '%';
          if (y >= 1) { busy = true; log.push({ d: items[i], action: 'late', q: 'bad' }); F.stamp(desk, 'Lost it!', 'bad'); F.sfx('bad'); combo = 0; comboC.set(0); card.classList.add('dropped'); const c = card; card = null; setTimeout(() => { c.remove(); next(); }, 500); }
        }
        raf = requestAnimationFrame(frame);
      }
      function startDrag(e) {
        if (busy || !card) return;
        const b = desk.getBoundingClientRect(), r = card.getBoundingClientRect();
        drag = { dx: e.clientX - r.left, dy: e.clientY - r.top, b };
        card.setPointerCapture(e.pointerId);
        card.classList.add('dragging');
        card.addEventListener('pointermove', moveDrag);
        card.addEventListener('pointerup', endDrag, { once: true });
      }
      function moveDrag(e) {
        if (!drag) return;
        card.style.left = e.clientX - drag.b.left - drag.dx + 'px';
        card.style.top = e.clientY - drag.b.top - drag.dy + 'px';
        card.style.transform = 'none';
        TRAYS.forEach((t) => t.el.classList.toggle('hover', over(t.el, e)));
      }
      function endDrag(e) {
        card.removeEventListener('pointermove', moveDrag);
        card.classList.remove('dragging');
        const hit = TRAYS.find((t) => over(t.el, e));
        TRAYS.forEach((t) => t.el.classList.remove('hover'));
        drag = null;
        if (hit) choose(hit.id); else { card.style.left = ''; card.style.transform = ''; card.style.top = 24 + y * 32 + '%'; }
      }
      const over = (el, e) => { const r = el.getBoundingClientRect(); return e.clientX >= r.left && e.clientX <= r.right && e.clientY >= r.top && e.clientY <= r.bottom; };

      function choose(action) {
        if (finished || busy || !card) return;
        busy = true;
        const d = items[i], r = RULES[d.truth], tray = TRAYS.find((t) => t.id === action);
        let q = r.best.includes(action) ? 'good' : r.ok.includes(action) ? 'ok' : 'bad';
        if (action === 'ask') { asks++; if (asks > 4 && q !== 'good') q = 'bad'; }
        log.push({ d, action, q });
        tray.count.textContent = String(+tray.count.textContent + 1);
        F.fly(card, tray.el, desk, () => F.glow(tray.el, q === 'bad' ? 'bad' : 'good'));
        const c = card; card = null; c.remove();
        sortedC.set(log.filter((l) => l.action !== 'late').length);
        if (d.truth === 'clue' && action === 'ask') {
          facts.push(d.fact); factsC.set(facts.length);
          F.stamp(desk, 'New fact!', 'good'); F.sfx('great'); F.burstOn(desk, tray.el, 'good', 18); combo++;
        } else if (q === 'good') { combo++; F.stamp(desk, combo >= 3 ? `Good call ×${combo}` : 'Good call', 'good'); F.sfx(combo >= 3 ? 'great' : 'good'); F.burstOn(desk, tray.el, 'good', 12); }
        else if (q === 'ok') { combo = 0; F.stamp(desk, 'Fine', 'meh'); F.sfx('meh'); }
        else {
          combo = 0; F.stamp(desk, action === 'ask' ? 'Too many questions' : 'Risky!', 'bad'); F.sfx('bad'); F.shake(desk);
          if (action === 'ready') { riskN++; risk.set(riskN, 4, riskN >= 3 ? 'high' : riskN === 2 ? 'rising' : 'some'); }
        }
        ui.feedback.textContent = d.truth === 'clue' && action === 'ask' ? `${client.name}: "Oh, right. ${client.facts[d.fact].label}."` : d.reveal;
        ui.feedback.className = 'mg-feedback q-' + q;
        comboC.set(combo);
        setTimeout(next, 420);
      }

      function finish() {
        if (finished) return;
        finished = true;
        cancelAnimationFrame(raf); timer.stop(); document.removeEventListener('keydown', onKey);
        const score = log.reduce((a, l) => a + (l.q === 'good' ? 1 : l.q === 'ok' ? 0.5 : 0), 0);
        const risky = log.filter((l) => l.action === 'ready' && l.d.truth !== 'ready').length;
        const tossed = log.filter((l) => l.action === 'skip' && l.d.truth !== 'skip').length;
        const missedClues = items.filter((d) => d.truth === 'clue' && !facts.includes(d.fact)).length;
        const eff = {
          energy: -1,
          insight: score >= 6 ? 2 : score >= 4 ? 1 : 0,
          trust: (asks > 4 ? -1 : 0) + (facts.length ? 1 : 0),
          momentum: tossed >= 2 ? -1 : 0
        };
        if (facts.length) eff.fact = facts;
        if (risky) eff.debt = { tag: 'stale_info', sev: Math.min(3, risky) };
        const act = { ready: 'Used', update: 'Flagged for update', ask: 'Asked about', skip: 'Set aside', late: 'Lost' };
        PP.mg.summary(root, PP.minigames.factFind.title, {
          score: Math.round(score * 10) / 10, max: items.length, eff, showDebt: true,
          passed: ctx.pass != null ? score >= ctx.pass : null,
          headline: (facts.length ? `You learned ${facts.length} new thing${facts.length > 1 ? 's' : ''} about ${client.name}. ` : missedClues ? `There was a clue in ${client ? client.name + '\'s' : 'their'} handwriting you didn't ask about. ` : '') +
            (risky ? `${risky} item${risky > 1 ? 's' : ''} went into the file that needed another look.` : 'Nothing out of date went into the file.'),
          lines: log.map((l) => ({ q: l.q, text: `${act[l.action]}: ${l.d.name} (${l.d.reveal})` }))
        }, done);
      }
      next();
      raf = requestAnimationFrame(frame);
      return { stop() { finished = true; cancelAnimationFrame(raf); timer.stop(); document.removeEventListener('keydown', onKey); } };
    }
  };
})(window.PP);
