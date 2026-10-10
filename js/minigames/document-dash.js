/* Document Dash — the risk: using wrong, stale, duplicate or incomplete information.
 * A sorting desk: each document slides down toward the "too late" pile.
 * Drag it (or click a tray, or press 1-4) into Use, Verify, Shred or Ask.
 * Every call gets an instant stamp; risky "Use" calls fill the Hidden risk meter. */
(function (PP) {
  const h = PP.h;
  const DOCS = [
    { name: 'Statement_2026_Q3.pdf', meta: 'Dated last month · all 6 pages · matches account on file', truth: 'good', reveal: 'Current and complete.' },
    { name: 'ID_scan_front_and_back.jpg', meta: 'Not expired · legible · both sides', truth: 'good', reveal: 'All good.' },
    { name: 'Paystub_current.pdf', meta: 'Most recent pay period · employer name matches', truth: 'good', reveal: 'Current.' },
    { name: 'Statement_2023.pdf', meta: 'Dated three years ago', truth: 'stale', reveal: 'Three years old. A lot has changed.' },
    { name: 'Beneficiary_form_OLD.pdf', meta: 'Signed 2014 · names someone the client never mentioned', truth: 'stale', reveal: 'Names an ex-spouse. Needs updating.' },
    { name: 'Address_confirmation.pdf', meta: '12 Old Mill Rd · client mentioned moving recently', truth: 'stale', reveal: 'Old address. They moved last spring.' },
    { name: 'Statement_2026_Q3 (1).pdf', meta: 'Same size and date as one already in the pile', truth: 'dup', reveal: 'Exact duplicate.' },
    { name: 'IMG_4471.jpg', meta: 'Photo of the Q3 statement, at an angle, with a thumb', truth: 'dup', reveal: 'Same statement, worse.' },
    { name: 'Fwd: Fwd: Fwd: RE: statement', meta: 'Attachment is the Q3 statement again', truth: 'dup', reveal: 'The same statement, forwarded through four people.' },
    { name: 'Application_page_1_of_4.pdf', meta: 'Pages 2 through 4: not attached', truth: 'incomplete', reveal: 'Missing three pages.' },
    { name: 'Tax_return.pdf', meta: 'Cover page only', truth: 'incomplete', reveal: 'Only the cover page.' },
    { name: 'Signature_page.pdf', meta: 'Signature line: blank', truth: 'incomplete', reveal: 'Unsigned.' },
    { name: 'statement_FINAL_final_v3_REAL.xlsx', meta: 'Totals don\'t match v2 · nobody knows which is right', truth: 'odd', reveal: 'Two versions disagree. One is wrong.' },
    { name: 'Photo_of_screenshot_of_fax.png', meta: 'Mostly legible. Mostly.', truth: 'odd', reveal: 'Two digits are a smudge. They matter.' }
  ];
  const RULES = {
    good: { best: ['use'], ok: ['verify'] },
    stale: { best: ['verify', 'discard'], ok: [] },
    dup: { best: ['discard'], ok: ['verify'] },
    incomplete: { best: ['ask'], ok: ['verify'] },
    odd: { best: ['verify'], ok: ['ask'] }
  };
  const TRAYS = [
    { id: 'use', label: 'Use', key: '1', icon: '<path d="M6,13 l5,5 l10,-12" fill="none" stroke="currentColor" stroke-width="3.5" stroke-linecap="round" stroke-linejoin="round"/>' },
    { id: 'verify', label: 'Verify', key: '2', icon: '<circle cx="11" cy="11" r="6.5" fill="none" stroke="currentColor" stroke-width="3"/><path d="M16,16 l6,6" stroke="currentColor" stroke-width="3.5" stroke-linecap="round"/>' },
    { id: 'discard', label: 'Shred', key: '3', icon: '<path d="M5,5 l16,16 M21,5 l-16,16" stroke="currentColor" stroke-width="3.5" stroke-linecap="round"/>' },
    { id: 'ask', label: 'Ask client', key: '4', icon: '<path d="M8,9 q0,-5 5,-5 q5,0 5,5 q0,3 -4,4.5 q-1,.5 -1,3" fill="none" stroke="currentColor" stroke-width="3" stroke-linecap="round"/><circle cx="13" cy="21" r="1.8" fill="currentColor"/>' }
  ];

  PP.minigames.documentDash = {
    title: 'Document Dash',
    risk: 'stale or incomplete information',
    blurb: 'Documents slide down your desk. Drag each one into Use, Verify, Shred or Ask before it falls into the pile. Rushing creates hidden risk.',
    start(root, ctx, done) {
      const F = PP.fx;
      const prep = ctx.prep || 0;
      const docs = PP.shuffle(DOCS).slice(0, 8);
      const ui = PP.mg.shell(root, this.title, this.risk);
      const sortedC = F.counter('Sorted'), comboC = F.counter('Combo');
      const risk = F.meter('Hidden risk', 'bad'); risk.set(0, 4, 'none');
      ui.hud.append(sortedC.el, comboC.el, risk.el);

      const desk = h('div', { class: 'mg-stage-area dd-desk' }, h('div', { class: 'dd-inbox' }, 'Incoming'), h('div', { class: 'dd-pile' }, 'Too late pile'));
      const trays = h('div', { class: 'dd-trays' });
      TRAYS.forEach((t) => {
        t.count = h('span', { class: 'dd-count' }, '0');
        t.el = h('button', { class: 'dd-tray t-' + t.id, onclick: () => choose(t.id) },
          h('span', { class: 'dd-icon', html: `<svg viewBox="0 0 26 26" aria-hidden="true">${t.icon}</svg>` }), h('span', null, t.label), h('kbd', null, t.key), t.count);
        trays.appendChild(t.el);
      });
      desk.appendChild(trays);
      ui.body.append(h('p', { class: 'mg-instr' }, ctx.practice ? 'Practice round. Drag documents into a tray, click a tray, or use keys 1–4.' : 'Drag documents into a tray, click a tray, or use keys 1–4.'), desk);

      let i = -1, card = null, y = 0, finished = false, raf = 0, last = performance.now(), combo = 0, riskN = 0, busy = false, drag = null;
      const log = [];
      const fall = 9 + prep * 2;
      const timer = PP.mg.timer(ui.bar, 55 + prep * 8, () => finish());
      const onKey = (e) => { const t = TRAYS.find((x) => x.key === e.key); if (t) { e.preventDefault(); choose(t.id); } };
      document.addEventListener('keydown', onKey);

      function next() {
        i++;
        if (i >= docs.length) return finish();
        busy = false;
        const d = docs[i];
        card = h('div', { class: 'dd-card', tabindex: '-1' }, h('div', { class: 'doc-icon', 'aria-hidden': 'true' }), h('div', null, h('div', { class: 'doc-name' }, d.name), h('div', { class: 'doc-meta' }, d.meta)));
        y = 0; card.style.top = '8%';
        desk.appendChild(card);
        F.sfx('whoosh');
        card.addEventListener('pointerdown', startDrag);
        ui.status.textContent = `${i + 1} of ${docs.length}`;
      }
      function frame(now) {
        if (finished) return;
        const dt = Math.min(0.05, (now - last) / 1000); last = now;
        if (card && !busy && !drag) {
          y += dt / fall;
          card.style.top = 8 + y * 46 + '%';
          if (y >= 1) { busy = true; log.push({ d: docs[i], action: 'late', q: 'bad' }); F.stamp(desk, 'Too late!', 'bad'); F.sfx('bad'); combo = 0; comboC.set(0); card.classList.add('dropped'); const c = card; card = null; setTimeout(() => { c.remove(); next(); }, 500); }
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
        if (hit) choose(hit.id); else { card.style.left = ''; card.style.transform = ''; card.style.top = 8 + y * 46 + '%'; }
      }
      const over = (el, e) => { const r = el.getBoundingClientRect(); return e.clientX >= r.left && e.clientX <= r.right && e.clientY >= r.top && e.clientY <= r.bottom; };

      function choose(action) {
        if (finished || busy || !card) return;
        busy = true;
        const d = docs[i], r = RULES[d.truth], tray = TRAYS.find((t) => t.id === action);
        const q = r.best.includes(action) ? 'good' : r.ok.includes(action) ? 'ok' : 'bad';
        log.push({ d, action, q });
        const land = () => {
          tray.count.textContent = String(+tray.count.textContent + 1);
          F.fly(card, tray.el, desk, () => F.glow(tray.el, q === 'bad' ? 'bad' : 'good'));
          const c = card; card = null; c.remove();
          sortedC.set(log.filter((l) => l.action !== 'late').length);
          if (q === 'good') { combo++; F.stamp(desk, combo >= 3 ? `Good call ×${combo}` : 'Good call', 'good'); F.sfx(combo >= 3 ? 'great' : 'good'); F.burstOn(desk, tray.el, 'good', 12); }
          else if (q === 'ok') { combo = 0; F.stamp(desk, 'Fine, but slow', 'meh'); F.sfx('meh'); }
          else {
            combo = 0; F.stamp(desk, 'Risky!', 'bad'); F.sfx('bad'); F.shake(desk);
            if (action === 'use') { riskN++; risk.set(riskN, 4, riskN >= 3 ? 'high' : riskN === 2 ? 'rising' : 'some'); }
          }
          ui.feedback.textContent = d.reveal; ui.feedback.className = 'mg-feedback q-' + q;
          comboC.set(combo);
          setTimeout(next, 450);
        };
        if (action === 'verify') {
          timer.sub(2);
          card.classList.add('scanning');
          F.popOn(desk, card, 'Checking… (−2s)', 'meh');
          setTimeout(() => { if (!finished) { card.classList.remove('scanning'); card.querySelector('.doc-meta').textContent = 'Checked: ' + d.reveal; setTimeout(land, 450); } }, 650);
        } else land();
      }

      function finish() {
        if (finished) return;
        finished = true;
        cancelAnimationFrame(raf); timer.stop(); document.removeEventListener('keydown', onKey);
        const score = log.reduce((a, l) => a + (l.q === 'good' ? 1 : l.q === 'ok' ? 0.5 : 0), 0);
        const riskyUse = log.filter((l) => l.action === 'use' && l.d.truth !== 'good').length;
        const lostInfo = log.filter((l) => l.action === 'discard' && (l.d.truth === 'good' || l.d.truth === 'incomplete')).length;
        const nagging = log.filter((l) => l.action === 'ask' && (l.d.truth === 'good' || l.d.truth === 'dup')).length;
        const unsorted = docs.length - log.filter((l) => l.action !== 'late').length;
        const eff = {
          energy: -1,
          insight: score >= 6 ? 2 : score >= 4 ? 1 : 0,
          momentum: (timer.left() >= 10 ? 1 : 0) - (unsorted > 1 ? 1 : 0) - (nagging >= 2 ? 1 : 0),
          trust: lostInfo >= 2 ? -1 : 0
        };
        if (riskyUse) eff.debt = { tag: 'stale_info', sev: Math.min(3, riskyUse) };
        const actLabel = { use: 'Used', verify: 'Verified', discard: 'Shredded', ask: 'Asked about', late: 'Missed' };
        PP.mg.summary(root, PP.minigames.documentDash.title, {
          score: Math.round(score * 10) / 10, max: docs.length, eff, showDebt: true,
          passed: ctx.pass != null ? score >= ctx.pass : null,
          headline: riskyUse ? `You used ${riskyUse} document${riskyUse > 1 ? 's' : ''} that needed a second look. That risk follows you.` : 'Nothing risky went into the file.',
          lines: log.map((l) => ({ q: l.q, text: `${actLabel[l.action]} ${l.d.name} — ${l.d.reveal}` }))
        }, done);
      }
      next();
      raf = requestAnimationFrame(frame);
      return { stop() { finished = true; cancelAnimationFrame(raf); timer.stop(); document.removeEventListener('keydown', onKey); } };
    }
  };
})(window.PP);
