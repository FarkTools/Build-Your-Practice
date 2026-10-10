/* Calendar Tetris. Your week, Monday to Friday, 8 to 6.
 * Appointments drop into the day you pick and stack up from the evening.
 *   ← → (or click a day) to move · ↓ / Space to drop
 * Each session draws a different week (dentist, a recital, a funeral, the gym...) and a
 * different set of house rules (when the specialist is in, when prospecting works, Friday
 * afternoons...). Personal blocks are pinned: if an appointment can't fit above one, it
 * slides past it. Midweek, someone asks "can we talk today?".
 * result.week = { prepared, prospecting, overbooked, missed } becomes a buff for your next journey. */
(function (PP) {
  const h = PP.h;
  const DAYS = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri'];
  const DAY_LONG = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday'];
  const ROWS = 10; // 8am .. 6pm
  const HOURS = ['8', '9', '10', '11', '12', '1', '2', '3', '4', '5'];
  const fam = (col, row, len, label, short, sub) => ({ col, row, len, type: 'family', label, short, sub: sub || 'personal', fixed: true });
  const WEEKS = [
    { name: 'A family week', blocks: [fam(1, 8, 2, 'Kid\'s game', 'Game'), fam(2, 4, 1, 'Lunch with partner', 'Lunch'), fam(3, 0, 1, 'School drop-off', 'Drop-off')] },
    { name: 'Dentist and a recital', blocks: [fam(0, 2, 1, 'Dentist', 'Dentist'), fam(3, 7, 2, 'Kid\'s recital', 'Recital'), fam(4, 0, 1, 'Gym', 'Gym')] },
    { name: 'A hard week', blocks: [fam(2, 2, 2, 'A funeral', 'Funeral', 'family'), fam(0, 7, 1, 'School pickup', 'Pickup'), fam(1, 0, 1, 'Gym', 'Gym')] },
    { name: 'Team week', blocks: [Object.assign(fam(0, 1, 1, 'Team meeting', 'Team', 'work'), { type: 'team' }), fam(1, 7, 1, 'School pickup', 'Pickup'), fam(3, 7, 1, 'School pickup', 'Pickup'), fam(2, 0, 1, 'Gym', 'Gym')] },
    { name: 'Moving week', blocks: [fam(3, 0, 2, 'Movers arrive', 'Movers'), fam(0, 4, 1, 'Car in the shop', 'Car'), fam(4, 8, 2, 'Unpack. Collapse.', 'Unpack')] },
    { name: 'Volunteer week', blocks: [fam(4, 5, 2, 'Food bank shift', 'Food bank'), fam(1, 1, 1, 'Kid\'s check-up', 'Check-up'), Object.assign(fam(2, 3, 1, 'Office training', 'Training', 'work'), { type: 'team' })] }
  ];
  const CLIENTS = ['The Parks', 'Dana', 'Mr. Okafor', 'Gloria', 'The Romeros', 'Mei', 'Ivan', 'The Lees', 'Bernadette', 'Sam & Jo', 'Ms. Haddad', 'Theo', 'Ruth', 'The Castillos', 'Arjun', 'Nell'];

  /* Rules. One from each group in `need`, plus extras. check(b, col, row) -> [q, text, pop] or null. */
  const RULES = {
    specTT: { group: 'spec', text: 'The specialist is only in Tue and Thu.', check: (b, c) => b.type === 'specialist' ? (c === 1 || c === 3 ? ['good', `Specialist booked on ${DAYS[c]}.`, 'Specialist is in'] : ['bad', `The specialist isn't in on ${DAYS[c]}.`, 'Specialist is out!']) : null },
    specMW: { group: 'spec', text: 'This week the specialist is only in Mon and Wed.', check: (b, c) => b.type === 'specialist' ? (c === 0 || c === 2 ? ['good', `Specialist booked on ${DAYS[c]}.`, 'Specialist is in'] : ['bad', `The specialist isn't in on ${DAYS[c]} this week.`, 'Specialist is out!']) : null },
    noon: { group: 'pro', text: 'Prospecting goes best before noon.', check: (b, c, r) => b.type === 'prospect' ? (r < 4 ? ['good', `${b.label}, ${DAYS[c]} morning.`, 'Morning calls'] : ['ok', `${b.label} in the afternoon. People are busier.`, 'Afternoon. Meh.']) : null },
    ten: { group: 'pro', text: 'Prospecting must happen before 10.', check: (b, c, r) => b.type === 'prospect' ? (r < 2 ? ['good', `${b.label} first thing ${DAY_LONG[c]}.`, 'Early bird!'] : r < 4 ? ['ok', `${b.label} at ${HOURS[r]}. A little late.`, 'Bit late'] : ['bad', `${b.label} in the afternoon. Nobody picks up after lunch.`, 'Too late']) : null },
    friday: { group: 'x', text: 'No meetings Friday afternoon.', check: (b, c, r) => c === 4 && r + b.len > 5 && b.type !== 'admin' ? ['bad', `${b.label} on Friday afternoon. You promised yourself.`, 'It\'s Friday!'] : null },
    adminWed: { group: 'x', text: 'Paperwork lives on Wednesday.', check: (b, c) => b.type === 'admin' ? (c === 2 ? ['good', 'Paperwork on admin Wednesday.', 'Admin day'] : ['ok', `Paperwork on ${DAYS[c]}. It works.`, 'Fine']) : null },
    lunch: { group: 'x', text: 'The lunch & learn has to cover noon.', add: [{ type: 'lunch', len: 2, label: 'Lunch & learn', short: 'Lunch & learn', sub: 'must cover 12' }], check: (b, c, r) => b.type === 'lunch' ? (r <= 4 && r + b.len > 4 ? ['good', `Lunch & learn over lunch on ${DAYS[c]}.`, 'Sandwiches!'] : ['ok', `A lunch & learn at ${HOURS[r]} is mostly just a learn.`, 'Not lunch...']) : null },
    joint: { group: 'x', text: 'Your partner agent is only free on {jd}.', add: [{ type: 'joint', len: 2, label: 'Joint meeting', short: 'Joint mtg', sub: 'with your partner' }], check: (b, c, r, w) => b.type === 'joint' ? (c === w.jd ? ['good', `Joint meeting on ${DAY_LONG[c]}, when your partner is free.`, 'Partner\'s in'] : ['bad', `Your partner can't make ${DAY_LONG[c]}.`, 'Partner\'s out']) : null }
  };

  function makeQueue(names, rules, w) {
    const who = PP.shuffle(names.length ? names : CLIENTS).slice(0, 3);
    while (who.length < 3) who.push(PP.pick(CLIENTS.filter((n) => !who.includes(n))));
    const short = (n) => n.replace(/^(The|Mr\.|Ms\.|Mrs\.) /, '').slice(0, 7);
    const pairs = who.map((n) => [{ type: 'client', len: 2, label: n, short: short(n), sub: 'client meeting', who: n }, { type: 'prep', len: 1, label: 'Prep: ' + n, short: 'Prep ' + short(n).slice(0, 4), sub: 'goes right above', who: n }]);
    const rest = [
      { type: 'prospect', len: 2, label: 'Prospecting calls', short: 'Calls', sub: rules.includes('ten') ? 'before 10' : 'best before noon' },
      { type: 'prospect', len: 1, label: 'Coffee with a lead', short: 'Coffee', sub: rules.includes('ten') ? 'before 10' : 'best before noon' },
      { type: 'specialist', len: 1, label: 'Specialist review', short: 'Specialist', sub: rules.includes('specMW') ? 'Mon or Wed only' : 'Tue or Thu only' },
      { type: 'review', len: 1, label: PP.pick(['Annual review', 'Policy review', 'Plan check-up']), short: 'Review', sub: 'existing client' },
      { type: 'admin', len: 1, label: PP.pick(['Paperwork', 'Filing', 'Forms for Operations']), short: 'Admin', sub: rules.includes('adminWed') ? 'Wednesday is admin day' : 'admin' },
      { type: 'review', len: 1, label: PP.pick(['Check-in call', 'Birthday call', 'Thank-you calls']), short: 'Check-in', sub: 'existing client' }
    ];
    rules.forEach((id) => (RULES[id].add || []).forEach((b) => rest.push(Object.assign({}, b))));
    // Keep each client right before its prep so prep can stack on top of it.
    const mix = PP.shuffle(pairs.map((p) => ({ p })).concat(rest.map((b) => ({ b }))));
    // Midweek, someone needs you today.
    const urgentName = PP.pick(CLIENTS.filter((n) => !who.includes(n)));
    mix.splice(Math.floor(mix.length * 0.55), 0, { b: { type: 'urgent', len: 1, label: `"Can we talk today?" (${urgentName})`, short: 'Urgent!', sub: `today is ${DAY_LONG[w.today]}`, urgent: true } });
    const out = [];
    mix.forEach((m) => (m.p ? out.push(m.p[0], m.p[1]) : out.push(m.b)));
    return out;
  }

  PP.minigames.calendar = {
    title: 'Calendar Tetris',
    risk: 'time management',
    blurb: 'Your week is filling up. Drop each appointment into a day. Prep goes right above its meeting, follow this week\'s house rules, and nobody should work ten hours straight.',
    start(root, ctx, done) {
      const F = PP.fx;
      const prep = ctx.prep || 0;
      const narrow = root.getBoundingClientRect().width < 560;
      const week = PP.pick(WEEKS);
      const w = { today: 1 + Math.floor(Math.random() * 3), jd: 2 + Math.floor(Math.random() * 2) };
      const extras = PP.shuffle(['friday', 'adminWed', 'lunch', 'joint']).slice(0, PP.chance(0.35) ? 2 : 1);
      const rules = [PP.pick(['specTT', 'specMW']), PP.pick(['noon', 'noon', 'ten'])].concat(extras);
      const queue = makeQueue(ctx.names || [], rules, w);
      const ui = PP.mg.shell(root, this.title, this.risk);
      const placedC = F.counter('Booked'), prepC = F.counter('Prepared'), missC = F.counter('Missed');
      const bal = F.meter('Balance', 'good'); bal.set(10, 10, 'good');
      ui.hud.append(placedC.el, prepC.el, missC.el, bal.el);
      ui.wrap.insertBefore(h('div', { class: 'mg-scene' }, h('b', null, 'This week: ' + week.name.toLowerCase()), h('span', null, narrow ? `Today is ${DAY_LONG[w.today]}. House rules are under the calendar.` : rules.map((r) => RULES[r].text.replace('{jd}', DAY_LONG[w.jd])).join(' '))), ui.hud);

      const rowH = narrow ? 24 : window.innerWidth < 700 ? 28 : 32;
      const grid = h('div', { class: 'cal-grid' + (narrow ? ' cal-narrow' : ''), style: { '--row': rowH + 'px' } });
      grid.append(h('div'), ...DAYS.map((d, i) => h('div', { class: 'cal-dayhead' + (i === w.today ? ' today' : '') }, narrow ? d.slice(0, 2) : d)));
      const hours = h('div', null, HOURS.map((x) => h('div', { class: 'cal-hour' }, x)));
      grid.appendChild(hours);
      const cols = DAYS.map((d, i) => {
        const col = h('div', { class: 'cal-col', style: { height: ROWS * rowH + 'px' }, onclick: () => { if (!cur) return; cur.col = i; drop(); } },
          Array.from({ length: ROWS }, (_, r) => h('div', { class: 'cal-line', style: { top: r * rowH + 'px' } })));
        col.addEventListener('pointerenter', (e) => { if (e.pointerType === 'mouse' && cur && landingRow(i, cur.b.len) >= 0 && cur.y < landingRow(i, cur.b.len)) { cur.col = i; place(); } });
        grid.appendChild(col);
        return col;
      });
      const nextBox = h('div', { class: 'cal-next' }, h('div', { class: 'eyebrow' }, 'Up next'));
      const houseRules = ['Prep goes directly above its client meeting.'].concat(rules.map((r) => RULES[r].text.replace('{jd}', DAY_LONG[w.jd])), ['More than 8 hours in a day is too many.']);
      const side = h('div', { class: 'cal-side' }, nextBox,
        h('div', { class: 'cal-controls' },
          h('button', { class: 'btn small', 'aria-label': 'Move left', onclick: () => move(-1) }, '←'), h('button', { class: 'btn small primary', onclick: () => drop() }, 'Drop'), h('button', { class: 'btn small', 'aria-label': 'Move right', onclick: () => move(1) }, '→')),
        h('div', { class: 'cal-rules' }, h('strong', null, 'House rules'), houseRules.map((t) => h('span', null, t))));
      const stage = h('div', { class: 'mg-stage-area cal-stage' }, grid, side);
      ui.body.append(h('p', { class: 'mg-instr' }, narrow ? 'Tap a day to drop the block there, or use ← Drop →.' : 'Pick a day with ← → or by pointing at it, then drop with ↓, Space, or a click.'), stage);

      const occ = DAYS.map(() => Array(ROWS).fill(null));
      const log = [];
      let cur = null, idx = -1, finished = false, raf = 0, last = performance.now(), balV = 10, prepared = 0, missed = 0, prospectAM = 0;
      const over = {};
      const speed = 1.6 - prep * 0.2; // rows per second
      const timer = PP.mg.timer(ui.bar, 72 + extras.length * 6 + prep * 8, () => finish());
      const blockEl = (b, cls) => h('div', { class: `cal-block b-${b.type} ${cls || ''}`, style: { height: b.len * rowH - 3 + 'px' }, title: b.label }, h('span', { class: 'cb-l' }, b.label), h('span', { class: 'cb-s' }, b.short || b.label), h('small', null, b.sub));

      week.blocks.forEach((b) => { for (let r = b.row; r < b.row + b.len; r++) occ[b.col][r] = b; const el = blockEl(b); el.style.top = b.row * rowH + 'px'; cols[b.col].appendChild(el); });

      function landingRow(col, len) {
        // Falls from the top until it hits something. Pinned personal blocks let it slide past if it can't fit above them.
        let r = 0;
        while (r < ROWS) {
          let end = r;
          while (end < ROWS && !occ[col][end]) end++;
          if (end - r >= len) return end - len;
          if (end >= ROWS || !occ[col][end].fixed) return -1;
          r = end;
          while (r < ROWS && occ[col][r] && occ[col][r].fixed) r++;
        }
        return -1; // doesn't fit
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
        let col = 2;
        if (landingRow(col, b.len) < 0) col = [1, 3, 0, 4].find((c) => landingRow(c, b.len) >= 0) ?? 2;
        cur = { b, col, y: -b.len, el: blockEl(b, 'falling') };
        cols[cur.col].appendChild(cur.el);
        showNext();
        ui.status.textContent = `${idx + 1} of ${queue.length}`;
        if (b.urgent) { F.stamp(stage, 'Can we talk today?', 'bad'); F.sfx('ring'); ui.feedback.textContent = `A client needs you today. It's ${DAY_LONG[w.today]}.`; ui.feedback.className = 'mg-feedback q-ok'; }
        place();
      }
      function place() {
        if (!cur) return;
        if (cur.el.parentNode !== cols[cur.col]) cols[cur.col].appendChild(cur.el);
        cur.el.style.top = cur.y * rowH + 'px';
        cols.forEach((c, i) => c.classList.toggle('aim', i === cur.col));
      }
      function move(d) { if (!cur) return; let nc = cur.col + d; while (nc >= 0 && nc <= 4 && landingRow(nc, cur.b.len) < 0) nc += d; if (nc < 0 || nc > 4) { F.shake(cur.el); return; } cur.col = nc; place(); F.sfx('click'); }
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
        let q = 'ok', text = `${b.label} on ${DAYS[col]} at ${HOURS[row]}.`, pop = 'Booked', kind = 'good';
        if (b.type === 'prep') {
          const below = occ[col][row + 1];
          if (below && below.type === 'client' && below.who === b.who) { q = 'good'; prepared++; prepC.set(prepared); text = `Prepped right before ${b.who}.`; pop = 'Prepared!'; kind = 'great'; F.burstOn(stage, el, 'good', 12); }
          else { q = 'bad'; text = `Prep for ${b.who} isn't right before the meeting.`; pop = 'Prep in the wrong spot'; kind = 'bad'; }
        } else if (b.urgent) {
          if (col === w.today) { q = 'good'; text = `Made time for the "can we talk today?" call on ${DAY_LONG[col]}.`; pop = 'They felt heard'; }
          else { q = 'bad'; text = `They asked for today (${DAY_LONG[w.today]}) and got ${DAY_LONG[col]}.`; pop = 'Not today...'; kind = 'bad'; }
        }
        // House rules. The worst verdict wins.
        const rank = { good: 2, ok: 1, bad: 0 };
        let ruled = b.type === 'prep' || !!b.urgent;
        rules.forEach((id) => {
          const v = RULES[id].check(b, col, row, w);
          if (!v) return;
          if (!ruled || rank[v[0]] < rank[q]) { q = v[0]; text = v[1]; pop = v[2]; kind = v[0] === 'good' ? 'good' : v[0] === 'bad' ? 'bad' : 'meh'; }
          ruled = true;
        });
        if (b.type === 'prospect' && q === 'good') prospectAM++;
        F.popOn(stage, el, pop, kind);
        if (kind === 'bad') { F.sfx('bad'); F.shake(el); } else if (q === 'good' && b.type !== 'client') F.sfx(kind === 'great' ? 'great' : 'good');
        const hoursBooked = occ[col].filter((x) => x && !x.fixed).length;
        if (hoursBooked > 8 && !over[col]) { over[col] = true; balV -= 3; bal.set(Math.max(0, balV), 10, balV >= 7 ? 'good' : balV >= 4 ? 'stretched' : 'burnt out'); F.stamp(stage, `${DAYS[col]} is overbooked`, 'bad'); }
        log.push({ b, q, text, placed: true });
        setTimeout(spawn, 280);
      }
      const onKey = (e) => {
        if (e.key === 'ArrowLeft') { e.preventDefault(); move(-1); }
        else if (e.key === 'ArrowRight') { e.preventDefault(); move(1); }
        else if (e.key === 'ArrowDown' || e.key === ' ') { e.preventDefault(); drop(); }
        else { const n = parseInt(e.key, 10); if (n >= 1 && n <= 5 && cur && landingRow(n - 1, cur.b.len) >= 0) { cur.col = n - 1; place(); } }
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
        const result = { prepared, prospecting: prospectAM, overbooked: overN, missed };
        const eff = { energy: overN ? -overN : 1, momentum: prepared >= 2 ? 1 : 0, insight: prepared >= 3 ? 1 : 0 };
        PP.mg.summary(root, PP.minigames.calendar.title, {
          score: Math.round(score * 10) / 10, max: queue.length, eff, week: result,
          passed: ctx.pass != null ? score >= ctx.pass : null,
          headline: `${prepared} of 3 meetings prepped` + (prospectAM ? `, ${prospectAM} prospecting block${prospectAM > 1 ? 's' : ''} at a good time` : '') + (overN ? `, and ${overN} overbooked day${overN > 1 ? 's' : ''}.` : ', and nobody burned out.') + (missed ? ` ${missed} thing${missed > 1 ? 's' : ''} didn't fit.` : ''),
          lines: log.map((l) => ({ q: l.q, text: l.text }))
        }, done);
      }
      spawn();
      raf = requestAnimationFrame(frame);
      return { stop() { finished = true; cancelAnimationFrame(raf); timer.stop(); document.removeEventListener('keydown', onKey); } };
    }
  };
})(window.PP);
