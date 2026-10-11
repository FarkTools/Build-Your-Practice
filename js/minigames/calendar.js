/* Calendar Tetris. Your week, Monday to Friday, 8 to 6.
 * Appointments fall into the day you aim at and stack up from the evening.
 *
 * Built to be read at a glance rather than by sentences:
 *   - every block is an icon and one word; each client has a colour and their prep matches it
 *   - house rules are drawn on the calendar (day badges, hour marks, hatched-off time)
 *   - while a block falls, every day shows where it would land, tinted good / ok / bad
 *   - tap (or point at) a day to aim and see the verdict; tap it again, or Drop, to book it
 *
 * Each session draws a different week (dentist, a recital, a funeral, the gym...) and a
 * house rule or two. Personal blocks are pinned: if an appointment can't fit above one, it
 * slides past it. Midweek, someone asks "can we talk today?".
 * result.week = { prepared, prospecting, overbooked, missed } becomes a buff for your next journey. */
(function (PP) {
  const h = PP.h;
  const DAYS = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri'];
  const DAY_LONG = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday'];
  const ROWS = 10; // 8am .. 6pm
  const HOURS = ['8', '9', '10', '11', '12', '1', '2', '3', '4', '5'];
  const MAX_HOURS = 8;
  const ICON = { client: '👤', prep: '📋', prospect: '☎️', specialist: '🎓', review: '⭐', admin: '📄', lunch: '🥪', joint: '🤝', urgent: '❗', family: '📌', team: '📌' };
  const CLIENT_HUES = ['c1', 'c2', 'c3'];

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

  /* House rules. check(b, col, row, w) -> [q, text, pop] or null.
   * chip: the short icon label shown above the calendar. days / hours: drawn onto the grid. */
  const RULES = {
    specTT: { group: 'spec', icon: '🎓', chip: 'Tue · Thu', text: 'The specialist is only in Tue and Thu.', days: [1, 3], hint: 'Tue or Thu',
      check: (b, c) => b.type === 'specialist' ? (c === 1 || c === 3 ? ['good', `Specialist booked on ${DAYS[c]}.`, 'Specialist is in'] : ['bad', `The specialist isn't in on ${DAYS[c]}.`, 'Specialist is out']) : null },
    specMW: { group: 'spec', icon: '🎓', chip: 'Mon · Wed', text: 'This week the specialist is only in Mon and Wed.', days: [0, 2], hint: 'Mon or Wed',
      check: (b, c) => b.type === 'specialist' ? (c === 0 || c === 2 ? ['good', `Specialist booked on ${DAYS[c]}.`, 'Specialist is in'] : ['bad', `The specialist isn't in on ${DAYS[c]} this week.`, 'Specialist is out']) : null },
    noon: { group: 'pro', icon: '☎️', chip: 'before noon', text: 'Prospecting goes best before noon.', hours: 4, hint: 'Before noon',
      check: (b, c, r) => b.type === 'prospect' ? (r < 4 ? ['good', `${b.label}, ${DAYS[c]} morning.`, 'Morning calls'] : ['ok', `${b.label} in the afternoon. People are busier.`, 'Afternoon. Meh.']) : null },
    ten: { group: 'pro', icon: '☎️', chip: 'before 10', text: 'Prospecting must happen before 10.', hours: 2, hint: 'Before 10',
      check: (b, c, r) => b.type === 'prospect' ? (r < 2 ? ['good', `${b.label} first thing ${DAY_LONG[c]}.`, 'Early bird'] : r < 4 ? ['ok', `${b.label} at ${HOURS[r]}. A little late.`, 'Bit late'] : ['bad', `${b.label} in the afternoon. Nobody picks up after lunch.`, 'Too late']) : null },
    friday: { group: 'x', icon: '🚫', chip: 'Fri afternoon', text: 'No meetings Friday afternoon.', blockFri: true,
      check: (b, c, r) => c === 4 && r + b.len > 5 && b.type !== 'admin' ? ['bad', `${b.label} on Friday afternoon. You promised yourself.`, 'It\'s Friday!'] : null },
    adminWed: { group: 'x', icon: '📄', chip: 'Wed', text: 'Paperwork lives on Wednesday.', days: [2], dayIcon: '📄', hint: 'Wednesday',
      check: (b, c) => b.type === 'admin' ? (c === 2 ? ['good', 'Paperwork on admin Wednesday.', 'Admin day'] : ['ok', `Paperwork on ${DAYS[c]}. It works.`, 'Fine']) : null },
    lunch: { group: 'x', icon: '🥪', chip: 'covers 12', text: 'The lunch & learn has to cover noon.', noon: true, hint: 'Over noon',
      add: [{ type: 'lunch', len: 2, label: 'Lunch & learn', short: 'Lunch & learn', sub: 'must cover 12' }],
      check: (b, c, r) => b.type === 'lunch' ? (r <= 4 && r + b.len > 4 ? ['good', `Lunch & learn over lunch on ${DAYS[c]}.`, 'Sandwiches!'] : ['ok', `A lunch & learn at ${HOURS[r]} is mostly just a learn.`, 'Not lunch...']) : null },
    joint: { group: 'x', icon: '🤝', chip: '{jd}', text: 'Your partner agent is only free on {jd}.', partnerDay: true, hint: '{jd}',
      add: [{ type: 'joint', len: 2, label: 'Joint meeting', short: 'Joint', sub: 'with your partner' }],
      check: (b, c, r, w) => b.type === 'joint' ? (c === w.jd ? ['good', `Joint meeting on ${DAY_LONG[c]}, when your partner is free.`, 'Partner\'s in'] : ['bad', `Your partner can't make ${DAY_LONG[c]}.`, 'Partner\'s out']) : null }
  };
  const ruleFor = { specialist: 'spec', prospect: 'pro', admin: 'adminWed', lunch: 'lunch', joint: 'joint' };

  function makeQueue(names, rules, w) {
    const who = PP.shuffle(names.length ? names : CLIENTS).slice(0, 3);
    while (who.length < 3) who.push(PP.pick(CLIENTS.filter((n) => !who.includes(n))));
    const short = (n) => n.replace(/^(The|Mr\.|Ms\.|Mrs\.) /, '').replace(/ &.*/, '').slice(0, 8);
    const pairs = who.map((n, i) => [
      { type: 'client', len: 2, label: n, short: short(n), sub: 'client meeting', who: n, hue: CLIENT_HUES[i] },
      { type: 'prep', len: 1, label: 'Prep for ' + n, short: 'Prep', sub: 'right on top of ' + short(n), who: n, hue: CLIENT_HUES[i] }]);
    const rest = [
      { type: 'prospect', len: 2, label: 'Prospecting calls', short: 'Calls' },
      { type: 'prospect', len: 1, label: 'Coffee with a lead', short: 'Coffee' },
      { type: 'specialist', len: 1, label: 'Specialist review', short: 'Specialist' },
      { type: 'review', len: 1, label: PP.pick(['Annual review', 'Policy review', 'Plan check-up']), short: 'Review', sub: 'any time' },
      { type: 'admin', len: 1, label: PP.pick(['Paperwork', 'Filing', 'Forms for Operations']), short: 'Admin', sub: 'any time' }
    ];
    rules.forEach((id) => (RULES[id].add || []).forEach((b) => rest.push(Object.assign({}, b))));
    const mix = PP.shuffle(pairs.map((p) => ({ p })).concat(rest.map((b) => ({ b }))));
    const urgentName = PP.pick(CLIENTS.filter((n) => !who.includes(n)));
    mix.splice(Math.floor(mix.length * 0.55), 0, { b: { type: 'urgent', len: 1, label: `"Can we talk today?" (${urgentName})`, short: 'Today!', sub: 'today is ' + DAY_LONG[w.today], urgent: true } });
    const out = [];
    mix.forEach((m) => (m.p ? out.push(m.p[0], m.p[1]) : out.push(m.b)));
    return out;
  }

  PP.minigames.calendar = {
    title: 'Calendar Tetris',
    risk: 'time management',
    blurb: 'Your week is filling up. Drop each appointment into a day. Prep goes right on top of its meeting, follow this week\'s house rules, and nobody should work ten hours straight.',
    start(root, ctx, done) {
      const F = PP.fx;
      const prep = ctx.prep || 0;
      const narrow = root.getBoundingClientRect().width < 560;
      const week = PP.pick(WEEKS);
      const w = { today: 1 + Math.floor(Math.random() * 3), jd: 2 + Math.floor(Math.random() * 2) };
      const extras = PP.shuffle(['friday', 'adminWed', 'lunch', 'joint']).slice(0, 1);
      const rules = [PP.pick(['specTT', 'specMW']), PP.pick(['noon', 'noon', 'ten'])].concat(extras);
      const fillJd = (t) => String(t).replace('{jd}', DAY_LONG[w.jd]);
      const queue = makeQueue(ctx.names || [], rules, w);
      const ui = PP.mg.shell(root, this.title, this.risk);
      const placedC = F.counter('Booked'), prepC = F.counter('Prepared'), missC = F.counter('Missed');
      const bal = F.meter('Balance', 'good'); bal.set(10, 10, 'good');
      ui.hud.append(placedC.el, prepC.el, missC.el, bal.el);

      // House rules as icon chips. Tap one for the full sentence.
      const chipList = [{ icon: '📋', chip: 'on its meeting', text: 'Prep goes right on top of its client meeting, in the same colour.' }]
        .concat(rules.map((id) => RULES[id]), [{ icon: '❗', chip: DAYS[w.today], text: `Today is ${DAY_LONG[w.today]}. If someone asks "can we talk today?", today is the answer.` }, { icon: '⏱', chip: `max ${MAX_HOURS}h`, text: `More than ${MAX_HOURS} hours booked in one day burns you out.` }]);
      const ruleText = h('p', { class: 'cal-ruletext small muted', 'aria-live': 'polite' }, 'Tap a rule to read it.');
      ui.wrap.insertBefore(h('div', { class: 'mg-scene cal-scene' },
        h('b', null, 'This week: ' + week.name.toLowerCase()),
        h('div', { class: 'cal-chips' }, chipList.map((r) => h('button', { class: 'cal-chip', type: 'button', onclick: () => { ruleText.textContent = fillJd(r.text); } }, h('span', { 'aria-hidden': 'true' }, r.icon), ' ', fillJd(r.chip)))),
        ruleText), ui.hud);

      const rowH = narrow ? 30 : window.innerWidth < 700 ? 32 : 36;
      const grid = h('div', { class: 'cal-grid v2' + (narrow ? ' cal-narrow' : ''), style: { '--row': rowH + 'px' } });
      const dayBadges = (i) => {
        const b = [];
        rules.forEach((id) => { const r = RULES[id]; if (r.days && r.days.includes(i)) b.push(r.icon); });
        if (rules.includes('joint') && i === w.jd) b.push('🤝');
        return b;
      };
      grid.append(h('div'), ...DAYS.map((d, i) => h('div', { class: 'cal-dayhead' + (i === w.today ? ' today' : '') },
        h('span', null, narrow ? d.slice(0, 2) : d), i === w.today ? h('span', { class: 'cal-today', title: 'Today' }, 'today') : null,
        h('span', { class: 'cal-badges' }, dayBadges(i).join('')))));
      const pro = rules.map((id) => RULES[id]).find((r) => r.hours);
      grid.appendChild(h('div', { class: 'cal-hours' }, HOURS.map((x, r) => h('div', { class: 'cal-hour' + (pro && r < pro.hours ? ' pro' : '') + (rules.includes('lunch') && r === 4 ? ' noon' : '') }, x))));
      const cols = DAYS.map((d, i) => {
        const col = h('div', { class: 'cal-col', style: { height: ROWS * rowH + 'px' }, onclick: () => tapDay(i) },
          Array.from({ length: ROWS }, (_, r) => h('div', { class: 'cal-line', style: { top: r * rowH + 'px' } })));
        if (pro) col.appendChild(h('div', { class: 'cal-zone z-pro', style: { top: 0, height: pro.hours * rowH + 'px' } }));
        if (rules.includes('friday') && i === 4) col.appendChild(h('div', { class: 'cal-zone z-off', style: { top: 5 * rowH + 'px', height: 5 * rowH + 'px' } }, h('span', null, '🚫')));
        if (rules.includes('lunch')) col.appendChild(h('div', { class: 'cal-noon', style: { top: 4 * rowH + 'px' } }));
        col.addEventListener('pointerenter', (e) => { if (e.pointerType === 'mouse' && cur && landingRow(i, cur.b.len) >= 0) { cur.col = i; armed = i; place(); } });
        grid.appendChild(col);
        return col;
      });
      const nextBox = h('div', { class: 'cal-next' }, h('div', { class: 'eyebrow' }, 'Up next'));
      const nowBox = h('div', { class: 'cal-now' });
      const dropBtn = h('button', { class: 'btn small primary', onclick: () => drop() }, 'Drop');
      const side = h('div', { class: 'cal-side' }, nowBox,
        h('div', { class: 'cal-controls' },
          h('button', { class: 'btn small', 'aria-label': 'Move left', onclick: () => move(-1) }, '←'), dropBtn, h('button', { class: 'btn small', 'aria-label': 'Move right', onclick: () => move(1) }, '→')),
        nextBox,
        h('div', { class: 'cal-key small muted' }, h('span', { class: 'k k-good' }), ' good spot ', h('span', { class: 'k k-ok' }), ' works ', h('span', { class: 'k k-bad' }), ' breaks a rule'));
      const stage = h('div', { class: 'mg-stage-area cal-stage' }, grid, side);
      ui.body.append(h('p', { class: 'mg-instr' }, narrow ? 'Tap a day to aim. Outlines show where the block lands: green is a good spot. Tap again to drop.' : 'Point at a day (or ← →) to aim. Outlines show where the block lands: green is a good spot. Click, ↓ or Space to drop.'), stage);

      const occ = DAYS.map(() => Array(ROWS).fill(null));
      const log = [];
      let cur = null, idx = -1, finished = false, raf = 0, last = performance.now(), balV = 10, prepared = 0, missed = 0, prospectAM = 0, armed = -1;
      const over = {};
      const speed = 0.85 - prep * 0.1; // rows per second: slow enough to read the outlines
      const timer = PP.mg.timer(ui.bar, 80 + prep * 8, () => finish());
      const hueOf = (b) => (b.hue ? ' ' + b.hue : '');
      const blockEl = (b, cls) => h('div', { class: `cal-block b-${b.type}${hueOf(b)} ${cls || ''}`, style: { height: b.len * rowH - 3 + 'px' }, title: b.label },
        h('span', { class: 'cb-i', 'aria-hidden': 'true' }, ICON[b.type] || ''), h('span', { class: 'cb-s' }, b.short || b.label));
      const ghosts = DAYS.map((d, i) => { const g = h('div', { class: 'cal-ghost' }, h('span', { class: 'cg-t' })); cols[i].appendChild(g); return g; });

      week.blocks.forEach((b) => { for (let r = b.row; r < b.row + b.len; r++) occ[b.col][r] = b; const el = blockEl(b, 'pinned'); el.style.top = b.row * rowH + 'px'; cols[b.col].appendChild(el); });

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
        return -1;
      }
      /* What would happen if b landed at (col,row)? Pure: changes nothing. */
      function judge(b, col, row) {
        if (row < 0) return { q: 'bad', text: `No room on ${DAYS[col]} for ${b.label}.`, pop: 'No room' };
        let q = 'ok', text = `${b.label} on ${DAYS[col]} at ${HOURS[row]}.`, pop = 'Fine', ruled = false;
        if (b.type === 'prep') {
          ruled = true;
          const below = occ[col][row + b.len];
          if (below && below.type === 'client' && below.who === b.who) { q = 'good'; text = `Prepped right before ${b.who}.`; pop = 'Prepared'; }
          else { q = 'bad'; text = `Prep for ${b.who} isn't right on top of their meeting.`; pop = 'Not on its meeting'; }
        } else if (b.urgent) {
          ruled = true;
          if (col === w.today) { q = 'good'; text = `Made time for the "can we talk today?" call on ${DAY_LONG[col]}.`; pop = 'Today. They felt heard'; }
          else { q = 'bad'; text = `They asked for today (${DAY_LONG[w.today]}) and got ${DAY_LONG[col]}.`; pop = 'Not today'; }
        } else if (b.type === 'client' || b.type === 'review' || b.type === 'admin') { q = 'good'; pop = 'Booked'; }
        const rank = { good: 2, ok: 1, bad: 0 };
        rules.forEach((id) => {
          const v = RULES[id].check(b, col, row, w);
          if (!v) return;
          if (!ruled || rank[v[0]] < rank[q]) { q = v[0]; text = v[1]; pop = v[2]; }
          ruled = true;
        });
        const booked = occ[col].filter((x) => x && !x.fixed).length + b.len;
        const long = booked > MAX_HOURS && !over[col];
        if (long && q !== 'bad') { q = q === 'good' ? 'ok' : q; pop += ' · long day'; }
        return { q, text, pop, long };
      }
      function hintFor(b) {
        if (b.type === 'prep') return { icon: '📋', text: 'On top of ' + b.who.replace(/^(The|Mr\.|Ms\.) /, '') };
        if (b.urgent) return { icon: '❗', text: 'Today: ' + DAY_LONG[w.today] };
        const g = ruleFor[b.type];
        const r = g && rules.map((id) => RULES[id]).find((x) => x.group === g || (rules.includes(g) && x === RULES[g]));
        if (r && r.hint) return { icon: r.icon, text: fillJd(r.hint) };
        if (b.type === 'client') return { icon: '👤', text: 'Any day. Leave room on top for prep' };
        return { icon: '✓', text: 'Any time' };
      }
      function cardFor(b) {
        const hn = hintFor(b);
        const e = blockEl(b); e.style.height = '';
        return h('div', { class: 'cal-card' }, e, h('div', { class: 'cal-card-txt' }, h('strong', null, b.label), h('span', null, hn.icon + ' ' + hn.text)));
      }
      function showNext() {
        nextBox.querySelectorAll('.cal-card').forEach((e) => e.remove());
        const n = queue[idx + 1];
        if (n) nextBox.appendChild(cardFor(n));
        nowBox.innerHTML = '';
        if (cur) nowBox.append(h('div', { class: 'eyebrow' }, 'Falling now'), cardFor(cur.b));
      }
      function paint() {
        // Outline where the current block would land in every day, coloured by verdict.
        if (!cur) { ghosts.forEach((g) => (g.className = 'cal-ghost')); return; }
        DAYS.forEach((d, i) => {
          const g = ghosts[i], r = landingRow(i, cur.b.len);
          if (r < 0) { g.className = 'cal-ghost'; return; }
          const v = judge(cur.b, i, r);
          g.className = `cal-ghost on q-${v.q}${i === cur.col ? ' aimed' : ''}`;
          g.style.top = r * rowH + 'px'; g.style.height = cur.b.len * rowH - 3 + 'px';
          g.firstChild.textContent = i === cur.col ? (v.q === 'good' ? '✓ ' : v.q === 'bad' ? '✗ ' : '~ ') + v.pop : '';
        });
      }
      function spawn() {
        idx++;
        if (idx >= queue.length) return finish();
        const b = queue[idx];
        let col = 2;
        if (landingRow(col, b.len) < 0) col = [1, 3, 0, 4].find((c) => landingRow(c, b.len) >= 0) ?? 2;
        cur = { b, col, y: -b.len, el: blockEl(b, 'falling') };
        armed = -1;
        cols[cur.col].appendChild(cur.el);
        showNext();
        ui.status.textContent = `${idx + 1} of ${queue.length}`;
        if (b.urgent) { F.stamp(stage, 'Can we talk today?', 'bad'); F.sfx('ring'); ui.feedback.textContent = `A client needs you today. It's ${DAY_LONG[w.today]}.`; ui.feedback.className = 'mg-feedback q-ok'; }
        place();
      }
      function place() {
        if (!cur) return;
        if (cur.el.parentNode !== cols[cur.col]) cols[cur.col].appendChild(cur.el);
        cur.el.style.top = Math.max(-cur.b.len, cur.y) * rowH + 'px';
        cols.forEach((c, i) => c.classList.toggle('aim', i === cur.col));
        paint();
      }
      function tapDay(i) {
        if (!cur) return;
        if (landingRow(i, cur.b.len) < 0) { F.shake(cols[i]); F.popOn(stage, cols[i], 'No room', 'bad'); return; }
        if (armed === i && cur.col === i) return drop();
        cur.col = i; armed = i; place(); F.sfx('click');
      }
      function move(d) { if (!cur) return; let nc = cur.col + d; while (nc >= 0 && nc <= 4 && landingRow(nc, cur.b.len) < 0) nc += d; if (nc < 0 || nc > 4) { F.shake(cur.el); return; } cur.col = nc; armed = nc; place(); F.sfx('click'); }
      function drop() { if (!cur) return; land(landingRow(cur.col, cur.b.len)); }
      function frame(now) {
        if (finished) return;
        const dt = Math.min(0.05, (now - last) / 1000); last = now;
        if (cur) {
          cur.y += dt * speed;
          const lr = landingRow(cur.col, cur.b.len);
          if (cur.y >= lr) land(lr);
          else { cur.el.style.top = Math.max(-cur.b.len, cur.y) * rowH + 'px'; }
        }
        raf = requestAnimationFrame(frame);
      }
      function land(row) {
        const { b, col, el } = cur;
        const v = judge(b, col, row);
        cur = null; armed = -1;
        cols.forEach((c) => c.classList.remove('aim'));
        paint();
        if (row < 0) {
          el.classList.add('missed'); el.style.top = '0px';
          missed++; missC.set(missed); log.push({ b, q: 'bad', text: v.text });
          F.popOn(stage, cols[col], 'No room!', 'bad'); F.sfx('bad'); F.shake(cols[col]);
          setTimeout(() => el.remove(), 600);
          return setTimeout(spawn, 350);
        }
        el.classList.remove('falling'); el.classList.add('landed', 'q-' + v.q); el.style.top = row * rowH + 'px';
        for (let r = row; r < row + b.len; r++) occ[col][r] = b;
        placedC.set(log.filter((l) => l.placed).length + 1);
        F.sfx('thump');
        if (b.type === 'prep' && v.q === 'good') { prepared++; prepC.set(prepared); F.burstOn(stage, el, 'good', 12); el.classList.add('snapped'); }
        if (b.type === 'prospect' && v.q === 'good') prospectAM++;
        const kind = v.q === 'good' ? (b.type === 'prep' ? 'great' : 'good') : v.q === 'bad' ? 'bad' : 'meh';
        F.popOn(stage, el, v.pop, kind);
        if (kind === 'bad') { F.sfx('bad'); F.shake(el); } else if (v.q === 'good' && b.type !== 'client') F.sfx(kind === 'great' ? 'great' : 'good');
        if (v.q !== 'good') { ui.feedback.textContent = v.text; ui.feedback.className = 'mg-feedback q-' + v.q; }
        else ui.feedback.textContent = '';
        const hoursBooked = occ[col].filter((x) => x && !x.fixed).length;
        if (hoursBooked > MAX_HOURS && !over[col]) { over[col] = true; balV -= 3; bal.set(Math.max(0, balV), 10, balV >= 7 ? 'good' : balV >= 4 ? 'stretched' : 'burnt out'); F.stamp(stage, `${DAYS[col]} is overbooked`, 'bad'); cols[col].classList.add('overbooked'); }
        log.push({ b, q: v.q, text: v.text, placed: true });
        setTimeout(spawn, 280);
      }
      const onKey = (e) => {
        if (e.key === 'ArrowLeft') { e.preventDefault(); move(-1); }
        else if (e.key === 'ArrowRight') { e.preventDefault(); move(1); }
        else if (e.key === 'ArrowDown' || e.key === ' ') { e.preventDefault(); drop(); }
        else { const n = parseInt(e.key, 10); if (n >= 1 && n <= 5) tapDay(n - 1); }
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
          lines: log.map((l) => ({ q: l.q, text: (ICON[l.b.type] || '') + ' ' + l.text }))
        }, done);
      }
      spawn();
      raf = requestAnimationFrame(frame);
      return { stop() { finished = true; cancelAnimationFrame(raf); timer.stop(); document.removeEventListener('keydown', onKey); } };
    }
  };
})(window.PP);
