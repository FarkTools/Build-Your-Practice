/* Calendar Tetris. Your week, Monday to Friday, 8 to 6.
 * Appointments drop into the day you pick and stack up from the evening.
 *   ← → (or click a day) to move · ↓ / Space to drop
 * Put each prep block directly above its client meeting. The specialist is only in
 * Tuesday and Thursday. Prospecting calls go better in the morning. Don't overbook a day.
 * result.week = { prepared, prospecting, overbooked } becomes a buff for your next journey. */
(function (PP) {
  const h = PP.h;
  const DAYS = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri'];
  const ROWS = 10; // 8am .. 6pm
  const HOURS = ['8', '9', '10', '11', '12', '1', '2', '3', '4', '5'];
  const FIXED = [
    { col: 1, row: 8, len: 2, type: 'family', label: 'Kid\'s game', sub: 'family' },
    { col: 2, row: 4, len: 1, type: 'family', label: 'Lunch with partner', sub: 'family' },
    { col: 3, row: 0, len: 1, type: 'family', label: 'School drop-off', sub: 'family' }
  ];
  const CLIENTS = ['The Parks', 'Dana', 'Mr. Okafor', 'Gloria', 'The Romeros', 'Mei'];

  function makeQueue(names) {
    const q = [];
    const who = PP.shuffle(names.length ? names : CLIENTS).slice(0, 3);
    who.forEach((n) => { q.push({ type: 'client', len: 2, label: n, sub: 'client meeting', who: n }); q.push({ type: 'prep', len: 1, label: 'Prep: ' + n, sub: 'goes right above', who: n }); });
    q.push({ type: 'prospect', len: 2, label: 'Prospecting calls', sub: 'best before noon' });
    q.push({ type: 'prospect', len: 1, label: 'Coffee with a lead', sub: 'best before noon' });
    q.push({ type: 'specialist', len: 1, label: 'Specialist review', sub: 'Tue or Thu only' });
    q.push({ type: 'review', len: 1, label: 'Annual review', sub: 'existing client' });
    q.push({ type: 'admin', len: 1, label: 'Paperwork', sub: 'admin' });
    q.push({ type: 'review', len: 1, label: 'Check-in call', sub: 'existing client' });
    // Keep each client before its prep so prep can stack on top of it.
    const pairs = [], rest = [];
    for (let i = 0; i < 6; i += 2) pairs.push([q[i], q[i + 1]]);
    q.slice(6).forEach((b) => rest.push(b));
    const out = [];
    const mix = PP.shuffle(pairs.map((p) => ({ p })).concat(rest.map((b) => ({ b }))));
    mix.forEach((m) => (m.p ? out.push(m.p[0], m.p[1]) : out.push(m.b)));
    return out;
  }

  PP.minigames.calendar = {
    title: 'Calendar Tetris',
    risk: 'time management',
    blurb: 'Your week is filling up. Drop each appointment into a day. Prep goes right above its meeting, the specialist only comes in Tuesday and Thursday, and nobody should work ten hours straight.',
    start(root, ctx, done) {
      const F = PP.fx;
      const prep = ctx.prep || 0;
      const queue = makeQueue(ctx.names || []);
      const ui = PP.mg.shell(root, this.title, this.risk);
      const placedC = F.counter('Booked'), prepC = F.counter('Prepared'), missC = F.counter('Missed');
      const bal = F.meter('Balance', 'good'); bal.set(10, 10, 'good');
      ui.hud.append(placedC.el, prepC.el, missC.el, bal.el);

      const rowH = window.innerWidth < 700 ? 28 : 32;
      const grid = h('div', { class: 'cal-grid', style: { '--row': rowH + 'px' } });
      grid.append(h('div'), ...DAYS.map((d) => h('div', { class: 'cal-dayhead' }, d)));
      const hours = h('div', null, HOURS.map((x) => h('div', { class: 'cal-hour' }, x)));
      grid.appendChild(hours);
      const cols = DAYS.map((d, i) => {
        const col = h('div', { class: 'cal-col', style: { height: ROWS * rowH + 'px' }, onclick: () => { cur.col = i; drop(); } },
          Array.from({ length: ROWS }, (_, r) => h('div', { class: 'cal-line', style: { top: r * rowH + 'px' } })));
        col.addEventListener('pointerenter', () => { if (cur && landingRow(i, cur.b.len) >= 0 && cur.y < landingRow(i, cur.b.len)) { cur.col = i; place(); } });
        grid.appendChild(col);
        return col;
      });
      const nextBox = h('div', { class: 'cal-next' }, h('div', { class: 'eyebrow' }, 'Up next'));
      const side = h('div', { class: 'cal-side' }, nextBox,
        h('div', { class: 'cal-controls' },
          h('button', { class: 'btn small', onclick: () => move(-1) }, '←'), h('button', { class: 'btn small primary', onclick: () => drop() }, 'Drop'), h('button', { class: 'btn small', onclick: () => move(1) }, '→')),
        h('div', { class: 'cal-rules' }, h('strong', null, 'House rules'), h('span', null, 'Prep goes directly above its client meeting.'), h('span', null, 'The specialist is only in Tue and Thu.'), h('span', null, 'Prospecting is best before noon.'), h('span', null, 'More than 8 hours in a day is too many.')));
      const stage = h('div', { class: 'mg-stage-area cal-stage' }, grid, side);
      ui.body.append(h('p', { class: 'mg-instr' }, 'Pick a day with ← → or by pointing at it, then drop with ↓, Space, or a click.'), stage);

      const occ = DAYS.map(() => Array(ROWS).fill(null));
      const log = [];
      let cur = null, idx = -1, finished = false, raf = 0, last = performance.now(), balV = 10, prepared = 0, missed = 0, prospectAM = 0;
      const over = {};
      const speed = 1.6 - prep * 0.2; // rows per second
      const timer = PP.mg.timer(ui.bar, 70 + prep * 8, () => finish());
      const blockEl = (b, cls) => h('div', { class: `cal-block b-${b.type} ${cls || ''}`, style: { height: b.len * rowH - 3 + 'px' } }, b.label, h('small', null, b.sub));

      FIXED.forEach((b) => { for (let r = b.row; r < b.row + b.len; r++) occ[b.col][r] = b; const el = blockEl(b); el.style.top = b.row * rowH + 'px'; cols[b.col].appendChild(el); });

      function landingRow(col, len) {
        // Falls from the top until it hits something.
        let r = -len;
        while (r + len < ROWS && !occ[col][r + len]) r++;
        return r; // top row of the block; < 0 means it doesn't fit
      }
      function showNext() {
        nextBox.querySelectorAll('.cal-block').forEach((e) => e.remove());
        const n = queue[idx + 1];
        if (n) { const e = blockEl(n); e.style.height = ''; nextBox.appendChild(e); }
      }
      function spawn() {
        idx++;
        if (idx >= queue.length) return finish();
        const b = queue[idx];
        cur = { b, col: 2, y: -b.len, el: blockEl(b, 'falling') };
        cols[cur.col].appendChild(cur.el);
        showNext();
        ui.status.textContent = `${idx + 1} of ${queue.length}`;
        place();
      }
      function place() {
        if (!cur) return;
        if (cur.el.parentNode !== cols[cur.col]) cols[cur.col].appendChild(cur.el);
        cur.el.style.top = cur.y * rowH + 'px';
        cols.forEach((c, i) => c.classList.toggle('aim', i === cur.col));
      }
      function move(d) { if (!cur) return; let nc = cur.col + d; while (nc >= 0 && nc <= 4 && landingRow(nc, cur.b.len) < 0) nc += d; if (nc < 0 || nc > 4) { F.shake(cur.el); return; } cur.col = nc; const lr = landingRow(cur.col, cur.b.len); if (cur.y > lr && lr >= -cur.b.len) cur.y = Math.min(cur.y, Math.max(-cur.b.len, lr)); place(); F.sfx('click'); }
      function drop() { if (!cur) return; land(landingRow(cur.col, cur.b.len)); }
      function frame(now) {
        if (finished) return;
        const dt = Math.min(0.05, (now - last) / 1000); last = now;
        if (cur) {
          cur.y += dt * speed;
          const lr = landingRow(cur.col, cur.b.len);
          if (cur.y >= lr) land(lr);
          else place();
        }
        raf = requestAnimationFrame(frame);
      }
      function land(row) {
        const { b, col, el } = cur; cur = null;
        cols.forEach((c) => c.classList.remove('aim'));
        if (row < 0) {
          el.classList.add('missed'); el.style.top = '0px';
          missed++; missC.set(missed); log.push({ b, q: 'bad', text: `No room on ${DAYS[col]} for ${b.label}.` });
          F.popOn(stage, cols[col], 'No room!', 'bad'); F.sfx('bad'); F.shake(cols[col]);
          setTimeout(() => el.remove(), 600);
          return setTimeout(spawn, 350);
        }
        el.classList.remove('falling'); el.classList.add('landed'); el.style.top = row * rowH + 'px';
        for (let r = row; r < row + b.len; r++) occ[col][r] = b;
        placedC.set(log.filter((l) => l.placed).length + 1);
        F.sfx('thump');
        let q = 'ok', text = `${b.label} on ${DAYS[col]} at ${HOURS[row]}.`;
        if (b.type === 'prep') {
          const below = occ[col][row + 1];
          if (below && below.type === 'client' && below.who === b.who) { q = 'good'; prepared++; prepC.set(prepared); text = `Prepped right before ${b.who}.`; F.popOn(stage, el, 'Prepared!', 'great'); F.burstOn(stage, el, 'good', 12); F.sfx('great'); }
          else { q = 'bad'; text = `Prep for ${b.who} isn't right before the meeting.`; F.popOn(stage, el, 'Prep in the wrong spot', 'bad'); }
        } else if (b.type === 'specialist') {
          if (col === 1 || col === 3) { q = 'good'; text = `Specialist booked on ${DAYS[col]}.`; F.popOn(stage, el, 'Specialist is in', 'good'); F.sfx('good'); }
          else { q = 'bad'; text = `The specialist isn't in on ${DAYS[col]}.`; F.popOn(stage, el, 'Specialist is out!', 'bad'); F.sfx('bad'); F.shake(el); }
        } else if (b.type === 'prospect') {
          if (row < 4) { q = 'good'; prospectAM++; text = `${b.label}, ${DAYS[col]} morning.`; F.popOn(stage, el, 'Morning calls', 'good'); F.sfx('good'); }
          else { text = `${b.label} in the afternoon. People are busier.`; F.popOn(stage, el, 'Afternoon. Meh.', 'meh'); }
        } else F.popOn(stage, el, 'Booked', 'good');
        const hoursBooked = occ[col].filter((x) => x && x.type !== 'family').length;
        if (hoursBooked > 8 && !over[col]) { over[col] = true; balV -= 3; bal.set(Math.max(0, balV), 10, balV >= 7 ? 'good' : balV >= 4 ? 'stretched' : 'burnt out'); F.stamp(stage, `${DAYS[col]} is overbooked`, 'bad'); }
        log.push({ b, q, text, placed: true });
        setTimeout(spawn, 280);
      }
      const onKey = (e) => {
        if (e.key === 'ArrowLeft') { e.preventDefault(); move(-1); }
        else if (e.key === 'ArrowRight') { e.preventDefault(); move(1); }
        else if (e.key === 'ArrowDown' || e.key === ' ') { e.preventDefault(); drop(); }
        else { const n = parseInt(e.key, 10); if (n >= 1 && n <= 5 && cur) { cur.col = n - 1; place(); } }
      };
      document.addEventListener('keydown', onKey);

      function finish() {
        if (finished) return;
        finished = true;
        cancelAnimationFrame(raf); timer.stop(); document.removeEventListener('keydown', onKey);
        if (cur) { missed++; log.push({ b: cur.b, q: 'bad', text: `${cur.b.label} never got booked.` }); }
        queue.slice(idx + 1).forEach((b) => { missed++; log.push({ b, q: 'bad', text: `${b.label} never got booked.` }); });
        const overN = Object.keys(over).length;
        const score = log.reduce((a, l) => a + (l.q === 'good' ? 1 : l.q === 'ok' ? 0.5 : 0), 0);
        const week = { prepared, prospecting: prospectAM, overbooked: overN, missed };
        const eff = { energy: overN ? -overN : 1, momentum: prepared >= 2 ? 1 : 0, insight: prepared >= 3 ? 1 : 0 };
        PP.mg.summary(root, PP.minigames.calendar.title, {
          score: Math.round(score * 10) / 10, max: queue.length, eff, week,
          passed: ctx.pass != null ? score >= ctx.pass : null,
          headline: `${prepared} of 3 meetings prepped` + (prospectAM ? `, ${prospectAM} prospecting block${prospectAM > 1 ? 's' : ''} in the morning` : '') + (overN ? `, and ${overN} overbooked day${overN > 1 ? 's' : ''}.` : ', and nobody burned out.') + (missed ? ` ${missed} thing${missed > 1 ? 's' : ''} didn't fit.` : ''),
          lines: log.map((l) => ({ q: l.q, text: l.text }))
        }, done);
      }
      spawn();
      raf = requestAnimationFrame(frame);
      return { stop() { finished = true; cancelAnimationFrame(raf); timer.stop(); document.removeEventListener('keydown', onKey); } };
    }
  };
})(window.PP);
