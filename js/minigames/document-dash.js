/* Document Dash — the risk: using wrong, stale, duplicate or incomplete information.
 * Sort each document: Use / Verify / Discard / Ask. Speed helps, rushing creates risk debt.
 * In the journey, "Use" gives no feedback: a bad document looks exactly like a good one until later.
 */
(function (PP) {
  const h = PP.h;

  const DOCS = [
    { name: 'Statement_2026_Q3.pdf', meta: 'Dated last month · all 6 pages · matches account on file', truth: 'good', reveal: 'Current and complete.' },
    { name: 'ID_scan_front_and_back.jpg', meta: 'Not expired · legible · both sides', truth: 'good', reveal: 'All good.' },
    { name: 'Paystub_current.pdf', meta: 'Most recent pay period · employer name matches', truth: 'good', reveal: 'Current.' },
    { name: 'Statement_2023.pdf', meta: 'Dated three years ago', truth: 'stale', reveal: 'Three years old. A lot has changed since.' },
    { name: 'Beneficiary_form_OLD.pdf', meta: 'Signed 2014 · names someone the client hasn\'t mentioned', truth: 'stale', reveal: 'Names an ex-spouse. Definitely needs updating.' },
    { name: 'Address_confirmation.pdf', meta: '12 Old Mill Rd · client mentioned moving recently', truth: 'stale', reveal: 'Old address. The client moved last spring.' },
    { name: 'Statement_2026_Q3 (1).pdf', meta: 'Same size and date as one already in the pile', truth: 'dup', reveal: 'Exact duplicate.' },
    { name: 'IMG_4471.jpg', meta: 'Photo of the Q3 statement, at an angle, with a thumb', truth: 'dup', reveal: 'Same statement, worse.' },
    { name: 'Fwd: Fwd: Fwd: RE: statement', meta: 'Attachment is the Q3 statement again', truth: 'dup', reveal: 'The same statement, forwarded through four people.' },
    { name: 'Application_page_1_of_4.pdf', meta: 'Pages 2 through 4: not attached', truth: 'incomplete', reveal: 'Missing three pages.' },
    { name: 'Tax_return.pdf', meta: 'Cover page only', truth: 'incomplete', reveal: 'Only the cover page. The numbers are on pages you don\'t have.' },
    { name: 'Signature_page.pdf', meta: 'Signature line: blank', truth: 'incomplete', reveal: 'Unsigned.' },
    { name: 'statement_FINAL_final_v3_REAL.xlsx', meta: 'Totals don\'t match v2 · nobody knows which is right', truth: 'odd', reveal: 'Two versions disagree. One of them is wrong.' },
    { name: 'Photo_of_screenshot_of_fax.png', meta: 'Mostly legible. Mostly.', truth: 'odd', reveal: 'Two digits are a smudge. They matter.' }
  ];

  const RULES = {
    good: { best: ['use'], ok: ['verify'] },
    stale: { best: ['verify', 'discard'], ok: [] },
    dup: { best: ['discard'], ok: ['verify'] },
    incomplete: { best: ['ask'], ok: ['verify'] },
    odd: { best: ['verify'], ok: ['ask'] }
  };
  const ACTIONS = [
    { id: 'use', label: 'Use', key: '1', tip: 'Put it straight into the file' },
    { id: 'verify', label: 'Verify', key: '2', tip: 'Check it first (costs 3 seconds)' },
    { id: 'discard', label: 'Discard', key: '3', tip: 'Not needed' },
    { id: 'ask', label: 'Ask', key: '4', tip: 'Request something from the client' }
  ];

  PP.minigames.documentDash = {
    title: 'Document Dash',
    risk: 'stale or incomplete information',
    blurb: 'Sort the incoming pile: Use, Verify, Discard, or Ask. Speed helps. Rushing creates risk you will not see until later.',
    start(root, ctx, done) {
      const prep = ctx.prep || 0;
      const practice = !!ctx.practice;
      const docs = PP.shuffle(DOCS).slice(0, 8);
      const ui = PP.mg.shell(root, this.title, this.risk);
      let i = 0, finished = false;
      const log = [];
      const card = h('div', { class: 'doc-card' });
      const btns = h('div', { class: 'mg-actions four' });
      ui.body.append(h('p', { class: 'mg-instr' }, practice ? 'Practice round: you will see how each call went.' : 'Sort the pile before time runs out.'), card, btns);

      const timer = PP.mg.timer(ui.bar, 40 + prep * 8, () => finish());

      ACTIONS.forEach((a) => btns.appendChild(h('button', { class: 'btn action', 'data-a': a.id, title: a.tip, onclick: () => choose(a.id) }, h('kbd', null, a.key), a.label)));
      const onKey = (e) => { const a = ACTIONS.find((x) => x.key === e.key); if (a) { e.preventDefault(); choose(a.id); } };
      document.addEventListener('keydown', onKey);

      function render() {
        ui.status.textContent = `${Math.min(i + 1, docs.length)} of ${docs.length}`;
        const d = docs[i];
        card.innerHTML = '';
        card.append(h('div', { class: 'doc-icon', 'aria-hidden': 'true' }), h('div', null, h('div', { class: 'doc-name' }, d.name), h('div', { class: 'doc-meta' }, d.meta)));
        card.classList.remove('enter'); void card.offsetWidth; card.classList.add('enter');
      }

      function choose(action) {
        if (finished) return;
        const d = docs[i];
        const r = RULES[d.truth];
        const q = r.best.includes(action) ? 'good' : r.ok.includes(action) ? 'ok' : 'bad';
        if (action === 'verify') timer.sub(3);
        log.push({ d, action, q });
        let fb;
        if (practice) fb = `${q === 'good' ? 'Good call.' : q === 'ok' ? 'Fine, but there was a better option.' : 'Risky.'} ${d.reveal}`;
        else if (action === 'use') fb = 'Filed. Looks fine.';
        else if (action === 'verify') fb = 'Checked: ' + d.reveal;
        else if (action === 'discard') fb = 'Tossed.';
        else fb = 'Request sent to the client.';
        ui.feedback.textContent = fb;
        ui.feedback.className = 'mg-feedback ' + (practice || action === 'verify' ? 'q-' + q : '');
        i++;
        if (i >= docs.length) finish(); else render();
      }

      function finish() {
        if (finished) return;
        finished = true;
        timer.stop();
        document.removeEventListener('keydown', onKey);
        const left = Math.round(timer.left());
        const score = log.reduce((a, l) => a + (l.q === 'good' ? 1 : l.q === 'ok' ? 0.5 : 0), 0);
        const riskyUse = log.filter((l) => l.action === 'use' && l.d.truth !== 'good').length;
        const lostInfo = log.filter((l) => l.action === 'discard' && (l.d.truth === 'good' || l.d.truth === 'incomplete')).length;
        const nagging = log.filter((l) => l.action === 'ask' && (l.d.truth === 'good' || l.d.truth === 'dup')).length;
        const unsorted = docs.length - log.length;
        const eff = {
          energy: -1,
          insight: score >= 6 ? 2 : score >= 4 ? 1 : 0,
          momentum: (left >= 10 ? 1 : 0) - (unsorted > 0 ? 1 : 0) - (nagging >= 2 ? 1 : 0),
          trust: lostInfo >= 2 ? -1 : 0
        };
        if (riskyUse) eff.debt = { tag: 'stale_info', sev: Math.min(3, riskyUse) };
        const actLabel = { use: 'Used', verify: 'Verified', discard: 'Discarded', ask: 'Asked about' };
        const lines = log.map((l) => ({
          q: practice || l.action !== 'use' ? l.q : 'ok',
          text: `${actLabel[l.action]} ${l.d.name}` + (practice ? ` — ${l.d.reveal}` : '')
        }));
        if (unsorted) lines.push({ q: 'bad', text: `${unsorted} document${unsorted > 1 ? 's' : ''} still in the pile when time ran out.` });
        const result = {
          score: Math.round(score * 10) / 10, max: docs.length, eff, lines, showDebt: practice,
          passed: ctx.pass != null ? score >= ctx.pass : null,
          headline: practice ? (riskyUse ? `You used ${riskyUse} document${riskyUse > 1 ? 's' : ''} that needed a second look. In a real journey, that becomes risk debt.` : 'Nothing risky went into the file.') : `Pile sorted with ${left}s to spare.`
        };
        PP.mg.summary(root, PP.minigames.documentDash.title, result, done);
      }

      render();
      return { stop() { finished = true; timer.stop(); document.removeEventListener('keydown', onKey); } };
    }
  };
})(window.PP);
