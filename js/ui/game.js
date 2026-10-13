/* Build Your Practice — game shell.
 * Title -> choose your agent -> Port Prospect (prospect, pipeline, book, build, people)
 * -> guide a prospect along the trail -> journey report -> back to the port.
 * Every activity at the port takes a day, and every day costs money. */
(function (PP) {
  const h = PP.h;
  const G = (PP.game = { s: null, career: null, root: null, tab: 'prospect' });
  const money = (n) => PP.career.money(n);
  const P = () => PP.content.practice;

  PP.ui.mountGame = function (root) { G.root = root; G.challenge = PP.challenge ? PP.challenge.read() : null; boot(); };

  /* ---------------- Where you left off ----------------
   * A refresh or relaunch goes straight back to where you were: the port, or the trail at
   * your last decision. The title screen only shows when you choose it (Menu → Title screen),
   * have no career yet, or opened a friend's challenge link. */
  const where = (w) => PP.store.set('where', w);
  // A save link opened in a tab that already has the game running (no reload happens).
  window.addEventListener('hashchange', () => {
    if (!/^#import=/.test(location.hash) || document.querySelector('.import-card')) return;
    const code = location.hash.slice(8);
    clearHash();
    readCode(code).then((d) => importPrompt(d)).catch(() => PP.ui.toast("That save link didn't work. Try copying the code instead."));
  });
  function boot() {
    if (/^#import=/.test(location.hash)) {
      const code = location.hash.slice(8);
      clearHash();
      readCode(code).then((d) => importPrompt(d, boot)).catch(() => { boot(); PP.ui.toast("That save link didn't work. Try copying the code instead."); });
      return;
    }
    const saved = PP.career.load();
    if (G.challenge || !saved || PP.store.get('where', '') === 'title') return intro();
    G.career = saved; G.place = null;
    const snap = PP.store.get('journey', null);
    if (snap && snap.s && PP.store.get('where', '') === 'trail') return resumeJourney(snap);
    port(null);
  }
  function snapshot(s) { const copy = Object.assign({}, s); delete copy.career; return copy; }
  function checkpointer(s) {
    return (narr) => { PP.career.save(G.career); PP.store.set('journey', { v: 1, at: Date.now(), s: snapshot(s), narr }); where('trail'); };
  }
  function clearJourney() { PP.store.set('journey', null); }
  function resumeJourney(snap) {
    const c = G.career, s = snap.s;
    s.career = c; s.skills = c.skills; s.contacts = c.contacts; s.met = c.met; s.quests = c.quests;
    G.s = s; G.snap = null;
    G.root.innerHTML = '';
    where('trail');
    PP.ui.startTrail(G.root, s, { onEnd: journeyEnd, checkpoint: checkpointer(s), restore: snap.narr || [] });
  }
  function hasJourney() { const snap = PP.store.get('journey', null); return !!(snap && snap.s); }

  function screen(...kids) {
    G.root.innerHTML = '';
    kids.forEach((k) => k && G.root.appendChild(k));
    window.scrollTo({ top: 0 });
  }

  /* ---------------- Title ---------------- */
  function intro() {
    PP.audio && PP.audio.bed('music:title');
    const saved = PP.career.load();
    screen(h('section', { class: 'intro' },
      h('div', { class: 'intro-copy' },
        h('div', { class: 'eyebrow' }, 'A light adventure about client work'),
        h('h1', { class: 'display' }, 'Build Your Practice'),
        h('p', { class: 'lede' }, 'You are a new agent at Port Prospect with some savings and a lot to learn. Find prospects, guide them through the wild terrain to a plan that actually suits them, look after the clients you have, and grow a practice that pays the bills before the money runs out.'),
        ladder(saved ? PP.career.level(saved) : 'survivable', true),
        G.challenge ? challengeCard(G.challenge, !!saved) : null,
        PP.ui.installTip ? PP.ui.installTip() : null,
        h('div', { class: 'row' },
          saved ? h('button', { class: 'btn primary big', onclick: () => { G.career = saved; G.place = null; const snap = PP.store.get('journey', null); if (snap && snap.s) resumeJourney(snap); else port(null); } }, hasJourney() ? `Continue your journey with ${(PP.store.get('journey', {}).s.client || {}).name || 'your client'}` : `Continue (day ${saved.days}, ${PP.career.levelInfo(saved).label})`) : null,
          h('button', { class: 'btn ' + (saved ? 'ghost' : 'primary big'), onclick: chooseAgent }, saved ? 'Start a new career' : 'Start your career'))),
      h('div', { class: 'intro-map', id: 'intro-map' })));
    const demo = PP.newState();
    demo.map.beam = true;
    PP.ui.renderMap(document.getElementById('intro-map'), demo, {});
  }

  /* A friend's challenge link: same agent type, same first prospect, their score to beat. */
  function challengeCard(ch, hasSave) {
    const cl = PP.content.clients[ch.arch], ag = PP.content.agentTypes.find((a) => a.id === ch.agent);
    return h('div', { class: 'panel challenge-card' },
      h('div', { class: 'eyebrow' }, 'You have been challenged'),
      h('h3', null, `${ch.by} challenged you`),
      h('p', null, `Start as a ${ag.name} and guide ${ch.client || cl.name}, ${cl.title.replace(/^The /, 'the ')}. ${ch.by} ${ch.stars ? `earned ${ch.stars} of 7 stars in ${ch.days} day${ch.days === 1 ? '' : 's'}` : `lost them after ${ch.days} days`}${ch.dest ? `, landing at ${ch.dest}` : ''}. Can you do better?`),
      hasSave ? h('p', { class: 'small muted' }, 'Accepting starts a new career. Your current one will be replaced.') : null,
      h('div', { class: 'row' }, h('button', { class: 'btn primary big', onclick: () => chooseAgent(ch) }, 'Accept the challenge'),
        h('button', { class: 'btn ghost', onclick: () => { G.challenge = null; PP.challenge.clear(); intro(); } }, 'No thanks')));
  }

  function chooseAgent(ch) {
    if (!ch || !ch.agent) ch = null;
    const prof = PP.profile.get();
    const nameIn = h('input', { type: 'text', id: 'you-name', autocomplete: 'name', maxlength: '40', placeholder: 'e.g. Sam Rivera', value: prof.name });
    const pracIn = h('input', { type: 'text', id: 'you-practice', autocomplete: 'organization', maxlength: '48', placeholder: 'e.g. Rivera Financial', value: prof.practice });
    const start = (a) => {
      PP.profile.set({ name: nameIn.value, practice: pracIn.value });
      const pf = PP.profile.get();
      clearJourney(); G.snap = null;
      PP.track && PP.track('career-start/' + a.id);
      G.career = PP.newCareer(a.id);
      G.career.you = pf.name; G.career.practiceName = pf.practice;
      let flash = `Day 1. You hang ${pf.name ? pf.name + "'s" : 'your'} license on the wall at Port Prospect${pf.practice ? `, under a hand-painted sign: ${pf.practice}` : ''}. Time to find some people to help.`;
      if (ch) {
        PP.track && PP.track('challenge/accepted');
        const p = PP.career.addProspect(G.career, { archetype: ch.arch, temp: ch.temp, source: `${ch.by}'s challenge` });
        if (ch.client) p.name = ch.client;
        G.career.challenge = Object.assign({}, ch, { pid: p.id });
        flash += ` ${p.name} is already waiting at the Trailhead: ${ch.by}'s challenge.`;
        G.challenge = null; PP.challenge.clear();
      }
      PP.career.save(G.career); G.place = null;
      port(ch ? 'trailhead' : 'office', [{ text: flash, kind: 'info' }]);
    };
    const agents = PP.content.agentTypes.filter((a) => !ch || a.id === ch.agent);
    screen(h('section', { class: 'choose' },
      h('header', { class: 'screen-head' }, h('div', null, h('div', { class: 'eyebrow' }, 'Who are you?'), h('h2', { class: 'display-sm' }, ch ? 'Your challenge' : 'Choose your agent')),
        h('p', { class: 'muted' }, ch ? `${ch.by} played as this agent. Same starting point, same first prospect.` : 'Each starting point trades money, skills and the size of your natural market (people you already know).')),
      h('div', { class: 'panel profile-form' },
        h('div', { class: 'field' }, h('label', { for: 'you-name' }, 'Your name'), nameIn),
        h('div', { class: 'field' }, h('label', { for: 'you-practice' }, 'Practice name ', h('span', { class: 'muted' }, '(optional)')), pracIn)),
      h('div', { class: 'agent-grid' }, agents.map((a) => h('article', { class: 'panel agent-card' },
        h('h3', null, a.name), h('p', { class: 'agent-tag' }, a.tagline),
        h('dl', { class: 'kv' },
          h('dt', null, 'Savings'), h('dd', null, money(a.savings)),
          h('dt', null, 'Living costs'), h('dd', null, money(a.living) + '/day'),
          h('dt', null, 'Natural market'), h('dd', null, a.market + ' warm contacts'),
          h('dt', null, 'Runway'), h('dd', null, Math.floor(a.savings / a.living) + ' days with no income'),
          h('dt', null, 'Skills'), h('dd', null, Object.keys(a.skills).map((k) => PP.SKILLS.find((x) => x.id === k).label).join(', '))),
        h('p', { class: 'small' }, h('strong', null, a.perk + ': '), a.perkText),
        h('p', { class: 'small muted' }, a.cons),
        h('button', { class: 'btn primary', onclick: () => start(a) }, `Start as a ${a.name}`))))));
  }

  function ladder(current, compact) {
    const levels = P().levels;
    const idx = levels.findIndex((l) => l.id === current);
    return h('ol', { class: 'ladder' + (compact ? ' compact' : '') }, levels.map((l, i) => h('li', { class: (i === idx ? 'now ' : '') + (i < idx ? 'past ' : '') + 'l-' + l.id },
      h('strong', null, l.label), compact ? null : h('span', { class: 'small' }, l.blurb))));
  }
  const stat = (k, v, cls) => h('div', { class: 'stat ' + (cls || '') }, h('span', { class: 'lk' }, k), h('strong', null, v));

  /* ---------------- Port Prospect ---------------- */
  function coach(c) {
    const active = c.book.filter((b) => ['life', 'steady', 'at-risk'].includes(b.status));
    const unhappy = active.filter((b) => b.sat < 5);
    const soon = c.pipeline.slice().sort((a, b) => a.expires - b.expires)[0];
    const fus = (c.followUps || []).length;
    const revs = (c.reviews || []).length;
    if (!c.pipeline.length && !fus && revs) return { head: 'Someone wants a second opinion', text: `${c.reviews[0].name}'s agent at ${c.reviews[0].rival} hasn't called in years. Look over their plan at your desk and tell them the truth.`, go: 'office', label: 'Go to your desk' };
    if (!c.pipeline.length && !fus) return { head: 'Find someone to help', text: 'Nobody is waiting to set out. Make calls from your desk, work the room at Chamber Hall, set up a tent in Market Square, or meet the boats at the Docks.', go: 'office', label: 'Go to your desk' };
    if (unhappy.length) return { head: `${unhappy.length > 1 ? 'Clients are' : unhappy[0].name + ' is'} getting restless`, text: `${unhappy.map((b) => b.name).join(', ')} ${unhappy.length > 1 ? "haven't" : "hasn't"} heard from you in a while. Visit Maple Row before you head out.`, go: 'homes', label: 'Go to Maple Row' };
    if (!c.pipeline.length) return { head: 'A client is calling', text: `${fus > 1 ? 'Clients whose lives changed are' : 'A client whose life changed is'} waiting at the Trailhead.`, go: 'trailhead', label: 'Go to the Trailhead' };
    const left = soon.expires - c.days;
    return { head: `${c.pipeline.length} prospect${c.pipeline.length > 1 ? 's' : ''} waiting`, text: `${soon.name} goes cold in ${left} day${left === 1 ? '' : 's'}. Set out from the Trailhead, or keep building.`, go: 'trailhead', label: 'Go to the Trailhead', urgent: left <= 4 };
  }
  function coachCard(c, select) {
    const k = coach(c), here = G.place === k.go;
    return h('div', { class: 'coach-card' + (k.urgent ? ' urgent' : '') },
      h('span', { class: 'cc-mark', 'aria-hidden': 'true', html: '<svg viewBox="0 0 40 40"><circle cx="20" cy="20" r="18" fill="#f5ddbb" stroke="#f39c12" stroke-width="2"/><path d="M20,5 L23.2,17 L20,20 L16.8,17z" fill="#f39c12" stroke="#4a2c12" stroke-width="1.1" stroke-linejoin="round"/><path d="M20,35 L23.2,23 L20,20 L16.8,23z" fill="#000a62" stroke="#4a2c12" stroke-width="1.1" stroke-linejoin="round"/><path d="M5,20 L17,16.8 L20,20 L17,23.2z M35,20 L23,16.8 L20,20 L23,23.2z" fill="#fbf1e1" stroke="#4a2c12" stroke-width="1.1" stroke-linejoin="round"/></svg>' }),
      h('div', { class: 'cc-txt' }, h('span', { class: 'eyebrow' }, 'What now?'), h('strong', null, k.head), h('span', null, k.text)),
      here ? null : h('button', { class: 'btn cc-go', onclick: () => select(k.go, true) }, k.label));
  }

  /* What changed since the port was last drawn: the chips on the result card. */
  function snapOf(c) {
    const pipe = {}, book = {};
    c.pipeline.forEach((p) => (pipe[p.id] = { name: p.name, temp: p.temp }));
    c.book.forEach((b) => (book[b.id] = { name: b.name, sat: b.sat, status: b.status }));
    return { days: c.days, savings: c.savings, level: PP.career.level(c), pipe, book, fus: (c.followUps || []).length };
  }
  function diffChips(a, b) {
    if (!a) return { chips: [], newPros: [] };
    const chips = [], newPros = [];
    const dd = b.days - a.days;
    if (dd > 0) chips.push({ t: `${dd} day${dd > 1 ? 's' : ''} passed`, k: '' });
    const dm = Math.round(b.savings - a.savings);
    if (dm) chips.push({ t: (dm > 0 ? '+' : '−') + money(Math.abs(dm)), k: dm > 0 ? 'good' : 'bad' });
    Object.entries(b.pipe).forEach(([id, p]) => { if (!a.pipe[id]) { newPros.push(p); chips.push({ t: `New prospect: ${p.name} (${p.temp})`, k: 'good' }); } });
    Object.entries(a.pipe).forEach(([id, p]) => { if (!b.pipe[id]) chips.push({ t: `${p.name} went cold`, k: 'bad' }); });
    if (b.fus > a.fus) chips.push({ t: 'A client is calling', k: 'good' });
    const moved = [];
    Object.entries(b.book).forEach(([id, x]) => {
      const y = a.book[id]; if (!y) return;
      if (y.status !== 'cancelled' && x.status === 'cancelled') chips.push({ t: `${x.name} cancelled`, k: 'bad' });
      else if (x.sat !== y.sat) moved.push({ name: x.name, d: x.sat - y.sat });
    });
    const up = moved.filter((m) => m.d > 0), down = moved.filter((m) => m.d < 0);
    const say = (list, good) => list.length > 2 ? chips.push({ t: `${list.length} clients ${good ? 'happier' : 'less happy'}`, k: good ? 'good' : 'bad' }) : list.forEach((m) => chips.push({ t: `${m.name} ${m.d > 0 ? '+' : ''}${m.d} happiness`, k: good ? 'good' : 'bad' }));
    say(up, true); say(down, false);
    if (a.level !== b.level) chips.push({ t: `Now ${P().levels.find((l) => l.id === b.level).label}`, k: ['survivable', 'unemployed'].includes(b.level) ? 'bad' : 'good' });
    return { chips, newPros };
  }
  /* The result of an action, as a card over the page, so nothing jumps around underneath. */
  function showResult(lines, d, select) {
    const c = G.career, pl = PP.content.town.places[G.place];
    const [main, ...rest] = lines;
    const close = () => { ov.remove(); document.body.classList.remove('modal-open'); document.removeEventListener('keydown', onKey, true); };
    const onKey = (e) => { if (e.key === 'Escape' || e.key === 'Enter') { e.preventDefault(); e.stopPropagation(); close(); } };
    const go = d.newPros.length && G.place !== 'trailhead' ? h('button', { class: 'btn', onclick: () => { close(); select('trailhead', true); } }, d.newPros.length > 1 ? 'See them at the Trailhead' : `See ${d.newPros[0].name} at the Trailhead`) : null;
    const ov = h('div', { class: 'overlay result-overlay', role: 'dialog', 'aria-modal': 'true', 'aria-label': 'What happened', onclick: (e) => { if (e.target === ov) close(); } },
      h('div', { class: 'result-card' },
        h('div', { class: 'eyebrow' }, `Day ${c.days + 1} · ${G.place === 'office' ? deskName(c) : pl ? pl.name : 'Port Prospect'}`),
        h('p', { class: 'rc-main fl-' + (main.kind || 'info') }, main.text),
        d.chips.length ? h('div', { class: 'rc-chips' }, d.chips.map((x) => h('span', { class: 'rc-chip ' + x.k }, x.t))) : null,
        rest.length ? h('div', { class: 'rc-more' }, h('div', { class: 'eyebrow' }, 'Also today'), h('ul', null, rest.map((n) => h('li', { class: 'fl-' + (n.kind || 'info') }, n.text)))) : null,
        h('div', { class: 'rc-actions' }, h('button', { class: 'btn primary', onclick: close }, 'Continue'), go)));
    document.body.appendChild(ov);
    document.body.classList.add('modal-open');
    document.addEventListener('keydown', onKey, true);
    ov.querySelector('.btn.primary').focus({ preventScroll: true });
  }

  function practicePanel(c) {
    const inc = PP.career.income(c), cost = PP.career.costs(c), runway = PP.career.runway(c);
    const lvl = PP.career.level(c);
    const clients = c.book.filter((b) => ['life', 'steady', 'at-risk'].includes(b.status)).length;
    const panel = h('div', { class: 'panel practice' + (PP.store.get('practiceOpen', false) ? ' open' : '') },
      // Phone: one tappable line with the essentials; tap for the full numbers and the ladder.
      h('button', { class: 'practice-compact', 'aria-label': 'Show or hide practice details', onclick: () => { const o = !panel.classList.contains('open'); panel.classList.toggle('open', o); PP.store.set('practiceOpen', o); } },
        h('span', { class: 'pc-level lvl-' + lvl }, h('span', { class: 'pc-day' }, `Day ${c.days + 1}`), h('strong', null, PP.career.levelInfo(c).label)),
        h('span', { class: 'pc-nums' },
          h('strong', { class: c.savings < 1000 ? 'warn' : '' }, money(c.savings)),
          h('span', null, runway === Infinity ? ' · covered' : ` · ${runway}d left`),
          h('span', null, ` · ${c.pipeline.length} waiting · ${clients} client${clients === 1 ? '' : 's'}`)),
        h('span', { class: 'lc-chev', 'aria-hidden': 'true' }, '▾')),
      h('div', { class: 'practice-top' },
        h('div', null, h('div', { class: 'eyebrow' }, `Day ${c.days + 1} · ${PP.career.agent(c).name}`), h('h3', null, PP.career.levelInfo(c).label)),
        h('div', { class: 'practice-nums' },
          stat('Savings', money(c.savings), c.savings < 1000 ? 'warn' : ''),
          stat('Income', money(inc) + '/day'),
          stat('Costs', money(cost) + '/day'),
          stat('Runway', runway === Infinity ? 'Covered' : runway + ' days'),
          stat('Pipeline', String(c.pipeline.length)),
          stat('Clients', String(clients)))),
      ladder(lvl),
      h('p', { class: 'small' }, `Income: ${money(PP.career.bookIncome(c))}/day from clients` + (PP.career.overrides(c) ? ` + ${money(PP.career.overrides(c))}/day from your recruits` : '') + `. Costs: ${money(c.living)}/day living` + (PP.career.rent(c) ? ` + ${money(PP.career.rent(c))}/day rent (${money(PP.career.rent(c) * 30)} a month)` : '') + '.'));
    return panel;
  }

  /* Today at the port: a small happening most mornings. */
  function todayCard(c) {
    if (!PP.content.pickPortDay) return null;
    if (!c.today || c.today.day !== c.days) {
      const ev = c.days > 0 && PP.chance(0.65) ? PP.content.pickPortDay(c) : null;
      c.today = { day: c.days, id: ev ? ev.id : null, done: !ev };
      PP.career.save(c);
    }
    if (c.today.done || !c.today.id) return null;
    const ev = PP.content.portDays.find((x) => x.id === c.today.id);
    if (!ev) return null;
    const txt = typeof ev.text === 'function' ? ev.text(c) : ev.text;
    return h('div', { class: 'panel today' }, h('div', { class: 'eyebrow' }, 'Today at the port'), h('p', null, txt),
      h('div', { class: 'today-choices' }, ev.choices.map((ch) => h('button', { class: 'btn' + (ev.choices.length === 1 ? ' primary' : ''), onclick: () => {
        c.today.done = true;
        const eff = ch.eff || {};
        const notes = [{ text: typeof ch.result === 'function' ? ch.result(c) : ch.result, kind: 'info' }];
        if (eff.day) {
          const rest = Object.assign({}, eff); delete rest.day;
          return spendDay(() => { PP.content.applyPortDay(c, rest, { noTick: true }).forEach((n) => notes.push(n)); return notes.map((n) => n.text).join(' '); });
        }
        PP.content.applyPortDay(c, eff, { noTick: true }).forEach((n) => notes.push(n));
        if (c.savings < 0) { c.over = true; PP.career.clear(); return unemployed(); }
        PP.career.save(c);
        port(G.place, notes);
      } }, ch.label))));
  }

  /* Port Prospect is a little town. Tap a place to see what you can do there. */
  function port(where, flash) {
    PP.store.set('where', 'port');
    const c = G.career, T = PP.content.town;
    const want = T.places[where] ? where : T.tabPlace[where];
    if (want) G.place = want;
    if (!G.place) G.place = c.pipeline.length || (c.followUps || []).length ? 'trailhead' : 'office';
    PP.audio && PP.audio.bed('town:' + G.place);
    const hasFlash = !!(flash && flash.length);
    const stay = hasFlash && G.lastPlace === G.place ? window.scrollY : null; // did something here: keep the page where it was
    const panel = h('div', { class: 'place-panel', id: 'place-panel' }, placePanel(G.place));
    const select = (id, fromCoach) => {
      G.place = id; G.lastPlace = id;
      PP.audio && PP.audio.bed('town:' + id);
      map.querySelectorAll('.tp').forEach((g) => g.classList.toggle('on', g.dataset.id === id));
      panel.innerHTML = ''; panel.appendChild(placePanel(id));
      const cc = document.querySelector('.coach-card'); if (cc) cc.replaceWith(coachCard(c, select));
      panel.scrollIntoView({ behavior: 'smooth', block: 'start' });
      if (!fromCoach) PP.fx && PP.fx.sfx('click');
    };
    const map = PP.ui.townMap(c, G.place, (id) => select(id));
    screen(h('section', { class: 'port' },
      h('header', { class: 'screen-head' }, h('div', null, h('div', { class: 'eyebrow' }, c.you ? `Home base · ${c.you}` : 'Home base'), h('h2', { class: 'display-sm' }, 'Port Prospect')),
        h('p', { class: 'muted' }, 'Every activity here takes a day, and every day costs money. Balance prospecting, looking after clients, and time on the trail.')),
      practicePanel(c),
      todayCard(c),
      coachCard(c, select),
      h('div', { class: 'town-layout' }, h('div', { class: 'town-wrap' }, h('p', { class: 'pick-prompt' }, 'Tap a place in town'), map), panel)));
    if (stay != null) window.scrollTo(0, stay);
    if (hasFlash) showResult(flash, diffChips(G.snap, snapOf(c)), select);
    G.snap = snapOf(c);
    G.lastPlace = G.place;
  }

  function placePanel(id) {
    const c = G.career, pl = PP.content.town.places[id];
    const name = id === 'office' ? deskName(c) : pl.name;
    const acts = pl.activities.map((aid) => PP.content.prospecting.find((a) => a.id === aid)).filter(Boolean);
    const sec = { plan: planCard, inbox: () => serviceCard('inbox', 'Work through the inbox', 'Questions, paperwork, life news, and the occasional scam.', activeBook()),
      oncall: contactsAndSkills, pipeline: tabPipeline, book: tabBook, boats: boatsCard, courses: coursesSection,
      workspace: () => buildParts().ws, partner: () => buildParts().pt, recruits: () => buildParts().rc, systems: () => buildParts().sys };
    const npcs = pl.npcs.map((nid) => PP.content.npcs.find((n) => n.id === nid)).filter(Boolean);
    return h('div', { class: 'place' },
      h('header', { class: 'place-head' }, h('div', { class: 'eyebrow' }, 'You are at'), h('h3', { class: 'place-title' }, name), h('p', { class: 'small muted' }, pl.blurb)),
      id === 'trailhead' ? requestBoard(c) : null,
      id === 'office' ? reviewsBox(c) : null,
      acts.length || pl.sections.some((x) => ['plan', 'boats', 'courses'].includes(x)) ? h('h4', { class: 'place-sub' }, 'Things to do here') : null,
      pl.sections.filter((x) => ['plan', 'boats'].includes(x)).map((x) => sec[x]()),
      acts.length ? h('div', { class: 'activity-grid' }, acts.map(activityCard)) : null,
      pl.sections.filter((x) => !['plan', 'boats'].includes(x)).map((x) => sec[x]()),
      npcs.length ? h('h4', { class: 'place-sub' }, 'Who\'s here') : null,
      npcs.length ? h('div', { class: 'npc-grid' }, npcs.map(npcCard)) : null);
  }
  /* The signpost at the Trailhead: errands from town. Done when you visit the place on any journey. */
  function requestBoard(c) {
    if (!PP.refillRequests) return null;
    if (!(c.requests || []).filter((q) => !q.done).length) { PP.refillRequests(c); PP.career.save(c); }
    const open = (c.requests || []).filter((q) => !q.done);
    if (!open.length) return null;
    return h('div', { class: 'panel request-board' },
      h('div', { class: 'eyebrow' }, '📜 Requests from town'),
      h('ul', null, open.map((q) => h('li', null,
        h('strong', null, PP.content.nodes[q.at].name), h('span', null, q.text), h('span', { class: 'rb-reward' }, 'Reward: ' + PP.rewardText(q.reward) + (q.noted ? ' · done, collect when you are back' : ''))))),
      h('p', { class: 'small muted' }, 'Visit the place on any journey. New requests go up as you finish these.'));
  }
  function deskName(c) {
    const base = { kitchen: 'Your kitchen table', cowork: 'Your desk at the Co-op', office: 'Your office' }[c.workspace] || 'Your desk';
    return c.practiceName ? `${c.practiceName} · ${base.replace(/^Your /, '')}` : base;
  }
  const activeBook = () => G.career.book.filter((b) => ['life', 'steady', 'at-risk'].includes(b.status));

  /* ---- Second opinions: a rival's forgotten clients ask you to look at their plan ---- */
  function reviewsBox(c) {
    const list = (c.reviews || []).filter((r) => (PP.content.secondOpinions || []).some((x) => x.id === r.case));
    if (!list.length) return null;
    return h('div', { class: 'panel reviews-box' },
      h('div', { class: 'eyebrow' }, '🗂️ Second opinions'),
      h('p', { class: 'small muted' }, 'Clients other agents signed and then forgot. Look over their plan and tell them the truth, even if the truth is "keep what you have."'),
      list.map((r) => {
        const cl = PP.content.clients[r.archetype] || {}, left = r.expires - c.days;
        return h('div', { class: 'review-row' },
          PP.ui.avatar({ name: r.name, hue: cl.hue }, 40),
          h('div', { class: 'rv-txt' }, h('strong', null, r.name), h('span', { class: 'small muted' }, `Signed by ${r.rival}. Hasn't heard from them since.`),
            h('span', { class: 'small ' + (left <= 3 ? 'warn' : 'muted') }, `Waits ${left} more day${left === 1 ? '' : 's'}.`)),
          h('button', { class: 'btn primary', onclick: () => reviewPlan(r) }, 'Review (1 day)'));
      }));
  }
  function reviewPlan(r) {
    const c = G.career, cs = (PP.content.secondOpinions || []).find((x) => x.id === r.case);
    if (!cs) return;
    const base = (PP.content.clients[cs.arch] || {}).name;
    const say = (t) => (base ? t.split(base).join(r.name) : t);
    const cl = PP.content.clients[r.archetype] || {};
    const overlay = h('div', { class: 'overlay', role: 'dialog', 'aria-modal': 'true', 'aria-label': 'Second opinion' });
    const card = h('div', { class: 'scene review-scene' });
    overlay.appendChild(h('div', { class: 'overlay-card' }, card));
    document.body.appendChild(overlay); document.body.classList.add('modal-open');
    const close = () => { overlay.remove(); document.body.classList.remove('modal-open'); };
    // Ethics training shows you one paper's real story before you decide.
    const peek = (c.skills.judgment || 0) > 0 ? Math.floor(Math.random() * cs.papers.length) : -1;
    const FLAG = { ok: ['✓', 'Fits'], gap: ['!', 'Gap'], wrong: ['✗', 'No longer fits'] };
    const paper = (pp, i, shown) => h('li', { class: 'so-paper' + (shown ? ' f-' + pp.flag : '') },
      h('span', { class: 'sp-icon', 'aria-hidden': 'true' }, pp.icon),
      h('span', { class: 'sp-txt' }, h('strong', null, pp.label), h('span', null, say(pp.note))),
      shown ? h('span', { class: 'sp-flag', title: FLAG[pp.flag][1] }, h('b', { 'aria-hidden': 'true' }, FLAG[pp.flag][0]), h('span', null, FLAG[pp.flag][1])) : null);
    const head = () => [h('div', { class: 'eyebrow' }, 'Second opinion · 1 day'),
      h('div', { class: 'row tight so-who' }, PP.ui.avatar({ name: r.name, hue: cl.hue }, 48), h('div', null, h('h3', { class: 'scene-title' }, `${r.name}'s plan`), h('div', { class: 'small muted' }, `From ${r.rival}`))),
      h('p', { class: 'scene-text so-ask' }, say(cs.ask))];
    const opt = (id, kind, label, hint) => h('button', { class: 'choice', onclick: () => decide(id) }, h('span', { class: 'kind' }, kind), h('span', { class: 'choice-label' }, label), h('span', { class: 'hint' }, hint), h('span', { class: 'chev' }, '›'));
    card.append(...head(),
      h('ul', { class: 'so-papers' }, cs.papers.map((pp, i) => paper(pp, i, i === peek))),
      peek >= 0 ? h('p', { class: 'small muted' }, 'Your ethics training helps you read one of these properly.') : null,
      h('p', { class: 'pick-prompt' }, 'What do you tell them? Tap one.'),
      h('div', { class: 'choices' },
        opt('keep', 'Honest', 'Keep what you have', 'No sale today. Just the truth.'),
        opt('fix', 'Light touch', 'Keep it, but fix one gap', 'A small change where it is needed.'),
        opt('replace', 'Big sale', 'Start over with a new plan', 'The biggest commission. Only right if the old plan really no longer fits.')),
      h('button', { class: 'btn ghost', onclick: close }, 'Not today'));
    function decide(choice) {
      const out = PP.content.secondOpinionOutcome(cs.verdict, choice);
      const right = { keep: 'Keep what you have', fix: 'Keep it, but fix one gap', replace: 'Start over with a new plan' }[cs.verdict];
      PP.fx && PP.fx.sfx(out.right ? 'great' : 'meh');
      PP.track && PP.track(`second-opinion/${choice}-${out.right ? 'right' : 'wrong'}`);
      card.innerHTML = '';
      card.append(...head(),
        h('ul', { class: 'so-papers' }, cs.papers.map((pp, i) => paper(pp, i, true))),
        h('div', { class: 'so-verdict ' + (out.right ? 'good' : 'bad') },
          h('strong', null, out.right ? 'The honest answer.' : `The honest answer was: ${right.toLowerCase()}.`),
          h('span', null, say(cs.lesson))),
        h('button', { class: 'btn primary', onclick: () => { close(); spendDay(() => {
          c.reviews = (c.reviews || []).filter((x) => x.id !== r.id);
          const cut = c.partner ? Math.round(out.now * 0.25) : 0;
          c.savings += out.now - cut;
          if (out.status) c.book.push({ id: PP.uid('b'), archetype: r.archetype, name: r.name, status: out.status, perDay: out.perDay, sat: out.sat, journey: c.journeys, day: c.days, lastLap: c.days, laps: 0, facts: [], changes: [], from: r.rival, replaced: out.replaced || undefined });
          const extra = [];
          if (out.now) extra.push(`+${money(out.now - cut)}${cut ? ` after your partner's share` : ''}.`);
          if (out.status) extra.push(`${r.name} joins your book${out.perDay ? ` (${money(out.perDay)}/day)` : ''}.`);
          if (out.referral) { const p = PP.career.addProspect(c, { temp: 'warm', source: `referral from ${r.name}` }); extra.push(`${p.name} is in your pipeline.`); }
          return out.text(r.name) + (extra.length ? ' ' + extra.join(' ') : '');
        }); } }, 'Continue'));
      card.scrollTop = 0;
    }
  }

  /* Spend a day at the port: do the thing, then the day passes. */
  function spendDay(fn, tab, free) {
    const c = G.career;
    const lines = [];
    const res = fn();
    if (res) lines.push({ text: res, kind: 'info' });
    if (!free) {
      const notes = PP.career.tickDay(c, false);
      c.inbox = [];
      lines.push(...notes);
    }
    if (c.savings < 0) { c.over = true; PP.career.clear(); return unemployed(); }
    PP.career.save(c);
    port(tab || G.place, lines);
  }

  /* ---- Prospecting ---- */
  function planCard() {
    const c = G.career;
    return h('article', { class: 'panel activity' },
      h('h3', null, 'Plan your week'), h('p', { class: 'small' }, 'Fit client meetings, prep, prospecting and the specialist into your calendar. A well-planned week gives your next journey a head start.'),
      c.weekPlan ? h('p', { class: 'small good' }, 'Ready: ' + weekLabel(c.weekPlan)) : null,
      h('div', { class: 'row between' }, h('span', { class: 'small muted' }, '1 day · mini-game'),
        h('button', { class: 'btn primary', onclick: () => overlayGame(PP.minigames.calendar, { state: { skills: c.skills, res: { trust: 5 } }, names: activeBook().map((b) => b.name), prep: c.skills.preparation || 0 }, (res) => {
          spendDay(() => { c.weekPlan = res.week; return 'Calendar Tetris: ' + weekLabel(res.week) + ' This carries into your next journey.'; });
        }, 'Calendar Tetris · 1 day') }, 'Play')));
  }
  function activityCard(a) {
    const c = G.career;
    const blocked = (a.id === 'warm' && c.market <= 0) || (a.requires && !a.requires(c));
    return h('article', { class: 'panel activity' },
      h('h3', null, a.name), h('p', { class: 'small' }, a.blurb),
      h('div', { class: 'row between' },
        h('span', { class: 'small muted' }, `1 day${a.cost ? ' · ' + money(a.cost) : ''}` + (a.id === 'warm' ? ` · ${c.market} contacts left` : '') + (a.minigame ? ' · mini-game' : '') + (a.requires && !a.requires(c) ? ' · ' + a.requiresText : '')),
        h('button', { class: 'btn primary', disabled: blocked || c.savings < a.cost, onclick: () => runActivity(a) }, a.minigame ? 'Play' : 'Do it')));
  }
  function runActivity(a) {
    const c = G.career;
    if (a.simple) return spendDay(() => { c.savings -= a.cost; return PP.content.runSimpleProspecting(c, a.id).text; });
    const mg = PP.minigames[a.minigame];
    overlayGame(mg, { state: { skills: c.skills, res: { trust: 5 } }, client: PP.content.clients.taylor, prep: c.skills.preparation || 0, practice: false }, (res) => {
      spendDay(() => {
        c.savings -= a.cost;
        const got = (res.prospects || []).map((p) => PP.career.addProspect(c, p));
        return got.length ? `${a.name}: ${got.length} new prospect${got.length > 1 ? 's' : ''} for your pipeline (${got.map((p) => `${p.name}, ${p.temp}`).join('; ')}).` : `${a.name}: no new prospects this time.`;
      });
    }, `${a.name} · ${a.cost ? money(a.cost) + ' · ' : ''}1 day`);
  }
  function weekBuff(w) {
    return { momentum: w.prepared >= 2 ? 1 : 0, insight: w.prepared >= 3 ? 1 : 0, energy: w.overbooked ? -w.overbooked : 1, trust: w.prospecting >= 2 ? 1 : 0 };
  }
  function weekLabel(w) {
    const e = weekBuff(w), parts = [];
    if (e.momentum) parts.push('+1 Momentum'); if (e.insight) parts.push('+1 Insight'); if (e.trust) parts.push('+1 Trust');
    parts.push(e.energy > 0 ? '+1 Energy' : `${e.energy} Energy`);
    return parts.join(', ') + '.';
  }
  const got0 = (res) => (res.prospects || []).length > 0;

  function overlayGame(mg, ctx, done, label) {
    const overlay = h('div', { class: 'overlay', role: 'dialog', 'aria-modal': 'true', 'aria-label': mg.title });
    const stage = h('div', { class: 'overlay-card' });
    overlay.appendChild(stage);
    stage.appendChild(h('div', { class: 'scene' }, h('div', { class: 'eyebrow' }, label || 'Mini-game'), h('h3', { class: 'scene-title' }, mg.title), h('p', { class: 'scene-text' }, mg.blurb),
      h('div', { class: 'row' }, h('button', { class: 'btn primary', onclick: go }, 'Start'), h('button', { class: 'btn ghost', onclick: () => close() }, 'Not now'))));
    document.body.appendChild(overlay);
    document.body.classList.add('modal-open');
    const close = () => { overlay.remove(); document.body.classList.remove('modal-open'); PP.audio && PP.audio.hold(false); };
    // iOS: a pinch inside a game should never zoom the page out from under you.
    overlay.addEventListener('gesturestart', (e) => e.preventDefault());
    overlay.querySelector('.btn').focus({ preventScroll: true });
    function go() {
      PP.audio && PP.audio.hold(true);
      stage.innerHTML = '';
      const inner = h('div', { class: 'scene mg-stage' });
      stage.appendChild(inner);
      mg.start(inner, ctx, (res) => { close(); done(res); });
    }
  }

  /* ---- Pipeline ---- */
  function followUpBox() {
    const fus = (G.career.followUps || []).map(followUpCard).filter(Boolean);
    return fus.length ? h('div', { class: 'stack' }, h('h4', { class: 'place-sub' }, 'Clients who called you back'), h('div', { class: 'pipeline-grid' }, fus)) : null;
  }
  function tabPipeline() {
    const c = G.career;
    if (!c.pipeline.length) return h('div', { class: 'stack' }, followUpBox(), h('div', { class: 'panel' }, h('p', null, 'No new prospects waiting. Prospects you meet show up here, ready to be guided along the trail.'), h('button', { class: 'btn primary', onclick: () => port('prospect') }, 'Go prospecting')));
    const nurture = h('div', { class: 'panel row between' }, h('div', null, h('h3', null, 'Keep your pipeline warm'), h('p', { class: 'small muted' }, 'Prospects go cold if you leave them waiting. A day of follow-up notes and calls buys everyone another week.')),
      h('button', { class: 'btn', onclick: () => spendDay(() => { c.pipeline.forEach((p) => (p.expires += 7)); return `You spend the day following up with ${c.pipeline.length} prospect${c.pipeline.length > 1 ? 's' : ''}. Everyone gets another week.`; }) }, 'Nurture your pipeline (1 day)'));
    return h('div', { class: 'stack' }, followUpBox(), h('h4', { class: 'place-sub' }, 'New prospects'), nurture, h('div', { class: 'pipeline-grid' }, c.pipeline.slice().sort((a, b) => a.expires - b.expires).map((p) => {
      const cl = PP.content.clients[p.archetype];
      const left = p.expires - c.days;
      return h('article', { class: 'panel prospect-card t-' + p.temp },
        h('div', { class: 'row tight' }, PP.ui.avatar({ name: p.name, hue: cl.hue }, 44), h('div', null, h('h3', null, p.name), h('div', { class: 'small muted' }, cl.title))),
        h('div', { class: 'row tight' }, h('span', { class: 'pill temp-' + p.temp }, p.temp), h('span', { class: 'small muted' }, `From ${p.source}`)),
        h('p', { class: 'small' }, cl.surface + ' ' + (p.temp === 'hot' ? 'Starts with +2 Trust.' : p.temp === 'cold' ? 'Starts with −1 Trust.' : '')),
        p.winback ? h('p', { class: 'small good-text' }, `Went with ${p.rival}, and it didn't work out. Starts with +1 Trust: they know what bad service looks like.`) : null,
        p.carry ? h('p', { class: 'small good-text' }, `Paused on day ${p.carry.day} of your journey. You'll pick up where you left off: trust ${p.carry.trust}, everything you learned, and any shortcuts still owed.`) : null,
        h('p', { class: 'small ' + (left <= 4 ? 'warn' : 'muted') }, `Goes cold in ${left} day${left === 1 ? '' : 's'}.`),
        h('button', { class: 'btn primary', onclick: () => packScreen(p) }, p.carry ? `Pick up with ${p.name}` : `Guide ${p.name} on the trail`));
    })));
  }

  /* Service days are mini-games. result.sat = { name: change } lands on the book. */
  function applySat(c, sat, active) {
    const touched = [];
    Object.entries(sat || {}).forEach(([name, d]) => { const b = active.find((x) => x.name === name); if (b) { const ch = Math.max(-3, Math.min(4, d)) + 1; b.sat = Math.max(0, Math.min(10, b.sat + ch)); touched.push(`${name} ${ch >= 0 ? '+' : ''}${ch}`); } });
    active.forEach((b) => { if (!sat || sat[b.name] == null) b.sat = Math.min(10, b.sat + 1); });
    return touched;
  }
  function serviceCard(id, title, blurb, active) {
    const c = G.career;
    return h('div', { class: 'option' }, h('div', null, h('strong', null, title), h('div', { class: 'small' }, blurb)),
      h('button', { class: 'btn primary', disabled: !active.length, onclick: () => {
        const mg = PP.minigames[id];
        overlayGame(mg, { state: { skills: c.skills, res: { trust: 5 } }, names: active.map((b) => b.name), prep: c.skills.preparation || 0 }, (res) => {
          spendDay(() => {
            const touched = applySat(c, res.sat, active);
            c.lastService = c.days;
            return `${mg.title}: ${touched.length ? 'satisfaction ' + touched.join(', ') + '.' : 'everyone feels a little more looked after.'}`;
          });
        }, `${mg.title} · 1 day`);
      } }, 'Play (1 day)'));
  }

  /* ---- Book ---- */
  function tabBook() {
    const c = G.career;
    const list = c.book.filter((b) => b.status !== 'lost');
    const active = c.book.filter((b) => ['life', 'steady', 'at-risk'].includes(b.status));
    return h('div', { class: 'stack' }, followUpBox(),
      h('div', { class: 'panel' },
        h('h3', null, 'Look after your clients'),
        h('p', { class: 'small muted' }, 'Satisfaction slips a little every day. Below 4, clients start to cancel. Spend a day on service to keep them close.' + (c.partner ? ' Your partner looks after them while you are on the trail.' : '')),
        h('div', { class: 'service-row' },
          serviceCard('inbox', 'Work through the inbox', 'Questions, paperwork, life news, and the occasional scam.', active),
          serviceCard('lifeHappens', 'Check in on everyone', 'Respond to what is happening in your clients\' lives.', active))),
      list.length ? h('div', { class: 'book-grid' }, list.map((b) => h('article', { class: 'panel client-row b-' + b.status },
        h('div', { class: 'row between' }, h('strong', null, b.name), h('span', { class: 'pill' }, { life: 'client for life', steady: 'steady', 'at-risk': 'might cancel', door: 'not yet', cancelled: 'cancelled' }[b.status])),
        h('div', { class: 'small muted' }, `Journey ${b.journey}` + (b.perDay ? ` · ${money(b.perDay)}/day` : '')),
        ['life', 'steady', 'at-risk'].includes(b.status) ? h('div', { class: 'sat' }, h('span', { class: 'lk' }, 'Satisfaction'), h('div', { class: 'gauge-track' }, h('div', { class: 'gauge-fill', style: { width: b.sat * 10 + '%', background: b.sat < 4 ? 'var(--red)' : b.sat < 6 ? 'var(--momentum)' : 'var(--energy)' } }))) : null))) : h('p', { class: 'panel' }, 'No clients yet. Guide a prospect to the right destination and they join your book.'));
  }

  /* ---- Build your practice ---- */
  function buildParts() {
    const c = G.career, pr = P();
    const activeCount = c.book.filter((b) => ['life', 'steady'].includes(b.status)).length;
    const ws = h('div', { class: 'panel' }, h('h3', null, 'Workspace'), h('div', { class: 'option-list' }, Object.entries(pr.workspaces).map(([id, w]) => h('div', { class: 'option' + (c.workspace === id ? ' current' : '') },
      h('div', null, h('strong', null, w.name), h('div', { class: 'small' }, w.blurb), h('div', { class: 'small muted' }, w.rent ? h('span', null, h('strong', null, `${money(w.rent * 30)} a month`), ` in rent (about ${money(w.rent)} a day${c.partner ? ', split with your partner' : ''})`) : 'No rent')),
      c.workspace === id ? h('span', { class: 'pill good' }, 'Current') : h('button', { class: 'btn', onclick: () => spendDay(() => { c.workspace = id; return `You move into: ${w.name}.`; }) }, 'Move here (1 day)')))));

    const partner = c.partner ? pr.partners.find((x) => x.id === c.partner) : null;
    const pt = h('div', { class: 'panel' }, h('h3', null, 'Partner with another agent'), h('p', { class: 'small' }, pr.partnerTerms),
      partner ? h('div', { class: 'option current' }, h('div', null, h('strong', null, partner.name), h('div', { class: 'small' }, partner.blurb)),
        h('button', { class: 'btn ghost', onclick: () => spendDay(() => { c.partner = null; return `You and ${partner.name} part ways, amicably.`; }) }, 'Part ways'))
        : activeCount < pr.partnerNeeds ? h('p', { class: 'small muted' }, `Agents will only partner with you once you have ${pr.partnerNeeds} paying clients. You have ${activeCount}.`)
          : h('div', { class: 'option-list' }, pr.partners.map((p) => h('div', { class: 'option' }, h('div', null, h('strong', null, p.name), h('div', { class: 'small' }, p.blurb)),
            h('button', { class: 'btn', onclick: () => spendDay(() => { c.partner = p.id; return `You and ${p.name} shake on it. Partners.`; }) }, 'Partner up (1 day)')))));

    const rc = h('div', { class: 'panel' }, h('h3', null, 'Recruit and train agents'),
      h('p', { class: 'small' }, `Bring on new agents and train them. Once trained, they pay you an override every day. They need mentoring at least every ${pr.mentorEvery} days or they may quit.`),
      c.workspace !== 'office' || activeCount < pr.recruitNeeds ? h('p', { class: 'small muted' }, `Needs your own office and ${pr.recruitNeeds} paying clients (you have ${activeCount}).`) : null,
      h('div', { class: 'option-list' }, pr.recruits.map((r) => {
        const mine = c.recruits.find((x) => x.id === r.id);
        const canHire = c.workspace === 'office' && activeCount >= pr.recruitNeeds && c.savings >= pr.hireCost;
        let action;
        if (!mine) action = h('button', { class: 'btn', disabled: !canHire, onclick: () => spendDay(() => { c.savings -= pr.hireCost; c.recruits.push({ id: r.id, name: r.name, override: r.override, quit: r.quit, trained: false, training: 0, lastMentor: c.days }); return `${r.name} joins your practice. Licensing costs ${money(pr.hireCost)}. Now they need training.`; }) }, `Recruit (${money(pr.hireCost)}, 1 day)`);
        else if (!mine.trained) action = h('button', { class: 'btn', onclick: () => spendDay(() => { mine.training++; mine.lastMentor = c.days; if (mine.training >= pr.trainDays) { mine.trained = true; return `${r.name} is trained and working on their own. +${money(r.override)}/day override.`; } return `A day of training with ${r.name} (${mine.training}/${pr.trainDays}).`; }) }, `Train (${mine.training}/${pr.trainDays})`);
        else action = h('button', { class: 'btn', onclick: () => spendDay(() => { mine.lastMentor = c.days; mine.override += 5; return `A mentoring day with ${r.name}. They are growing (+${money(5)}/day override).`; }) }, `Mentor (last ${c.days - mine.lastMentor}d ago)`);
        return h('div', { class: 'option' + (mine ? ' current' : '') }, h('div', null, h('strong', null, r.name), h('div', { class: 'small' }, r.blurb), h('div', { class: 'small muted' }, mine && mine.trained ? `Earning you ${money(mine.override)}/day` : `Will earn about ${money(r.override)}/day once trained`)), action);
      })));

    const sys = h('div', { class: 'panel' }, h('h3', null, 'Systems from the trail'),
      h('p', { class: 'small' }, 'Handle a landmark well (prepare or get help, rather than pushing through) to earn its Mark. Each Mark lets you build a system that makes future journeys easier.'),
      h('div', { class: 'option-list' }, Object.entries(pr.systems).map(([id, sy]) => {
        const has = c.systems[id], mark = c.marks[sy.mark];
        return h('div', { class: 'option' + (has ? ' current' : '') + (mark ? '' : ' locked') },
          h('div', null, h('strong', null, sy.name), h('div', { class: 'small' }, sy.blurb), h('div', { class: 'small muted' }, mark ? `Mark earned at ${PP.content.nodes[sy.mark].name}` : `Earn the Mark at ${PP.content.nodes[sy.mark].name}`)),
          has ? h('span', { class: 'pill good' }, 'Built') : h('button', { class: 'btn', disabled: !mark || c.savings < sy.cost, onclick: () => spendDay(() => { c.savings -= sy.cost; c.systems[id] = true; return `You build your ${sy.name.toLowerCase()}.`; }) }, `Build (${money(sy.cost)}, 1 day)`));
      })));
    return { ws, pt, rc, sys };
  }

  /* ---- People and skills ---- */
  const fakeState = () => { const c = G.career; return { skills: c.skills, contacts: c.contacts, met: c.met, quests: c.quests, res: { trust: 5 } }; };
  function contactsAndSkills() {
    const c = G.career, fake = fakeState();
    return h('div', { class: 'build-grid' },
      h('div', { class: 'panel' },
        h('div', { class: 'panel-head' }, h('h3', null, 'On call for the trail'), h('span', { class: 'muted small' }, `${c.contacts.length} / ${PP.contactSlots(fake)} slots`)),
        c.contacts.length ? h('ul', { class: 'contact-list' }, c.contacts.map((id) => {
          const ct = PP.content.contacts[id];
          return h('li', null, h('div', null, h('strong', null, ct.name), ' · ', ct.who, h('div', { class: 'small muted' }, ct.ability)),
            h('button', { class: 'btn ghost small', onclick: () => { c.contacts.splice(c.contacts.indexOf(id), 1); PP.career.save(c); port('office'); } }, 'Drop'));
        })) : h('p', { class: 'muted small' }, 'Nobody yet. Meet people around town, then put them on call. Each helps once per journey.')),
      h('div', { class: 'panel' }, h('h3', null, 'Your skills'), skillList(c.skills), h('p', { class: 'small muted' }, 'Learn more at Harbor Night School, or from people around town.'),
        perksLine(c)));
  }
  function perksLine(c) {
    const ps = Object.keys(c.perks || {}).map((k) => PP.content.town.perks[k]).filter(Boolean);
    return ps.length ? h('p', { class: 'small good' }, 'Certificates: ' + ps.map((x) => x.name).join(', ')) : null;
  }
  function npcCard(n) {
    const c = G.career, fake = fakeState(), free = c.agent === 'grad';
    const met = c.met[n.id];
    const q = n.quest && c.quests[n.quest.id];
    const ct = PP.content.contacts[n.contact];
    const canRecruit = (met || q === 'done') && !c.contacts.includes(n.contact);
    const full = c.contacts.length >= PP.contactSlots(fake);
    let n2 = 0; for (const ch of n.name) n2 = (n2 * 31 + ch.charCodeAt(0)) % 9973;
    return h('article', { class: 'npc' },
      h('div', { class: 'npc-head' }, h('span', { class: 'npc-face', 'aria-hidden': 'true', html: PP.art.face({ mood: met ? 2 : 1, hue: n2 }) }), h('div', null, h('h3', null, n.name), h('div', { class: 'small muted' }, n.role))),
      h('p', { class: 'npc-greet' }, n.greet),
      h('div', { class: 'npc-actions' },
        n.talk ? h('button', { class: 'btn', disabled: met, onclick: () => spendDay(() => { c.met[n.id] = true; PP.apply(fake, n.talk.eff); return n.talk.text + ' ' + skillGain(n.talk.eff); }, null, free) }, met ? 'Talked ✓' : n.talk.label + (free ? '' : ' (1 day)')) : null,
        n.quest ? h('button', { class: 'btn', disabled: q === 'done', onclick: () => runQuest(n, fake, free) }, q === 'done' ? 'Practice passed ✓' : n.quest.label + (q === 'failed' ? ' (retry)' : '')) : null,
        canRecruit ? h('button', { class: 'btn accent', disabled: full, onclick: () => { c.contacts.push(n.contact); PP.career.save(c); port(G.place, [{ text: `${n.name} is on call as ${ct.name}.` }]); } }, full ? 'Slots full' : 'Put on call') : null,
        c.contacts.includes(n.contact) ? h('span', { class: 'pill good' }, 'On call') : null),
      h('p', { class: 'small muted npc-ability' }, h('strong', null, ct.name + ': '), ct.ability));
  }

  /* ---- Harbor Night School ---- */
  function coursesSection() {
    const c = G.career;
    c.perks = c.perks || {}; c.courses = c.courses || {};
    const S = PP.content.town.school;
    const meets = (needs) => Object.entries(needs || {}).every(([k, v]) => (c.skills[k] || 0) >= v);
    const needText = (needs) => Object.entries(needs || {}).map(([k, v]) => `${PP.SKILLS.find((x) => x.id === k).label} ${v}`).join(', ');
    const done = (co) => co.skill ? (c.skills[co.skill] || 0) >= 2 : co.grants.system ? !!c.systems[co.grants.system] : co.grants.password ? PP.store.get('password', false) : !!c.perks[co.grants.perk];
    const card = (co) => {
      const has = done(co), ok = meets(co.needs), afford = c.savings >= co.cost;
      const what = co.skill ? `+1 ${PP.SKILLS.find((x) => x.id === co.skill).label} (now ${c.skills[co.skill] || 0}/2)` : co.grants.system ? `Builds: ${P().systems[co.grants.system].name}` : co.grants.password ? 'Opens Steve\'s back channels: hidden passages at several obstacles' : PP.content.town.perks[co.grants.perk].blurb;
      return h('article', { class: 'panel activity course' + (co.skill ? '' : ' cert') },
        h('div', { class: 'eyebrow' }, co.skill ? 'Course' : 'Certificate'),
        h('h3', null, co.name), h('p', { class: 'small' }, co.blurb), h('p', { class: 'small good' }, what),
        h('div', { class: 'row between' },
          h('span', { class: 'small muted' }, `${co.days} day${co.days > 1 ? 's' : ''} · ${money(co.cost)}` + (co.needs && !ok ? ` · needs ${needText(co.needs)}` : '')),
          has ? h('span', { class: 'pill good' }, co.skill ? 'Mastered' : 'Earned') : h('button', { class: 'btn primary', disabled: !ok || !afford, onclick: () => takeCourse(co) }, 'Enroll')));
    };
    return h('div', { class: 'stack' },
      h('h4', { class: 'place-sub' }, 'Courses: build a skill'), h('div', { class: 'activity-grid' }, S.courses.filter((x) => x.skill).map(card)),
      h('h4', { class: 'place-sub' }, 'Certificates: shortcuts on the trail'), h('div', { class: 'activity-grid' }, S.courses.filter((x) => !x.skill).map(card)));
  }
  function takeCourse(co) {
    const c = G.career;
    spendDays(co.days, () => {
      c.savings -= co.cost;
      c.courses[co.id] = true;
      if (co.skill) { c.skills[co.skill] = Math.min(2, (c.skills[co.skill] || 0) + 1); return `${co.name}: ${co.days} evening${co.days > 1 ? 's' : ''} of class. +1 ${PP.SKILLS.find((x) => x.id === co.skill).label}.`; }
      if (co.grants.system) { c.systems[co.grants.system] = true; return `${co.name} complete. ${P().systems[co.grants.system].name} is now part of your practice.`; }
      if (co.grants.password) { PP.store.set('password', true); return `${co.name}: two hours on bait, then, almost as an afterthought, a list of people who owe Steve favors all along the trail. His back channels are open to you.`; }
      c.perks[co.grants.perk] = true; return `${co.name} complete. ${PP.content.town.perks[co.grants.perk].blurb}`;
    });
  }
  function spendDays(n, fn) {
    const c = G.career;
    const lines = [{ text: fn(), kind: 'info' }];
    for (let i = 0; i < n; i++) lines.push(...PP.career.tickDay(c, false));
    c.inbox = [];
    if (c.savings < 0) { c.over = true; PP.career.clear(); return unemployed(); }
    PP.career.save(c);
    port(G.place, lines);
  }

  /* ---- The docks: watch the boats come in ---- */
  function boatsCard() {
    const c = G.career;
    return h('article', { class: 'panel activity boats' },
      h('div', { class: 'boats-art', 'aria-hidden': 'true', html: '<svg viewBox="0 0 320 70"><path d="M0,52 q20,-6 40,0 t40,0 t40,0 t40,0 t40,0 t40,0 t40,0 t40,0 V70 H0z" fill="#cfe3f7" stroke="#9cc2e6" stroke-width="1.5"/><g class="boat-a"><path d="M40,44 h70 l-10,14 h-50z" fill="#fbf1e1" stroke="#4a2c12" stroke-width="2" stroke-linejoin="round"/><path d="M75,44 v-30 l22,26z" fill="#f39c12" stroke="#4a2c12" stroke-width="2" stroke-linejoin="round"/></g><g class="boat-b"><path d="M190,46 h56 l-8,12 h-40z" fill="#e3c6a0" stroke="#4a2c12" stroke-width="2" stroke-linejoin="round"/><path d="M200,46 v-14 h24 v14" fill="#fbf1e1" stroke="#4a2c12" stroke-width="2"/></g><path d="M258,40 h62 M266,40 v18 M290,40 v18 M314,40 v18" stroke="#4a2c12" stroke-width="2.5"/></svg>' }),
      h('h3', null, 'Watch the boats come in'),
      h('p', { class: 'small' }, 'People stepping off the boats are new in town. They need everything set up and nobody has met them yet. Sailors in from the trail bring news of what lies ahead.'),
      h('div', { class: 'row between' }, h('span', { class: 'small muted' }, '1 day'), h('button', { class: 'btn primary', onclick: () => boatDay(c) }, 'Head to the pier')));
  }
  function boatDay(c) {
    const A = PP.content.town.arrivals;
    const seen = c.arrSeen || [];
    const pool = PP.shuffle(A.filter((a) => !seen.includes(a.id)).concat(A)).filter((a, i, arr) => arr.findIndex((b) => b.id === a.id) === i);
    const three = pool.slice(0, 3);
    c.arrSeen = seen.concat(three.map((a) => a.id)).slice(-8);
    const boat = PP.pick(['The 10:40 ferry', 'A water taxi', 'The morning ferry', 'A fishing boat', 'The weekend ferry', 'A sailboat with a hand-painted name']);
    const overlay = h('div', { class: 'overlay', role: 'dialog', 'aria-modal': 'true', 'aria-label': 'The docks' });
    const card = h('div', { class: 'scene boat-scene' });
    overlay.appendChild(h('div', { class: 'overlay-card' }, card));
    document.body.appendChild(overlay); document.body.classList.add('modal-open');
    const close = () => { overlay.remove(); document.body.classList.remove('modal-open'); };
    const pick = (a) => {
      card.innerHTML = '';
      const approach = (how) => {
        const notes = [];
        let text = how === 'warm' ? a.warm : a.cold;
        if (a.kind === 'resident' || a.kind === 'business') {
          const temp = how === 'warm' ? (PP.chance(0.25) ? 'hot' : 'warm') : (PP.chance(0.55) ? 'cold' : null);
          if (temp) { const p = PP.career.addProspect(c, { temp, source: 'the docks (new in town)', archetype: a.arch && PP.content.clients[a.arch] ? a.arch : undefined, bias: a.bias }); notes.push(`${p.name} is now in your pipeline (${temp}).`); }
          else notes.push('No prospect this time.');
        } else if (a.kind === 'sailor') {
          const unknown = Object.keys(PP.content.nodes).filter((k) => !c.known[k]);
          PP.shuffle(unknown).slice(0, how === 'warm' ? 2 : 1).forEach((k) => { c.known[k] = true; notes.push(`${PP.content.nodes[k].name} is now named on your map.`); });
          if (!unknown.length) notes.push('You already know every place she mentions.');
        } else if (a.kind === 'rival') {
          if (c.pipeline.length && PP.chance(how === 'warm' ? 0.2 : 0.4)) { const lost = c.pipeline.splice(Math.floor(Math.random() * c.pipeline.length), 1)[0]; PP.career.lostToRival(c, lost, 'the agent from the city'); notes.push(`Later you hear ${lost.name} had coffee with him. They are no longer in your pipeline.`); }
          else notes.push('Nobody of yours went with him. This time.');
        } else if (a.kind === 'second') {
          const r = how === 'warm' || PP.chance(0.5) ? PP.career.addReview(c, 'the docks') : null;
          notes.push(r ? `${r.name} would like you to look over their plan from ${r.rival}. (Your desk)` : 'They keep the folder and say they will think about it.');
        } else notes.push('Lovely. Not a prospect.');
        close();
        spendDay(() => `${boat} comes in. ${text} ${notes.join(' ')}`);
      };
      card.append(h('div', { class: 'eyebrow' }, 'The docks'), h('h3', { class: 'scene-title' }, a.who),
        h('div', { class: 'arrival big', html: PP.art.figure(a.fig, { seed: a.id.length * 7 }) }), h('p', { class: 'scene-text' }, a.tell),
        h('p', { class: 'pick-prompt' }, 'How do you say hello? Tap one.'),
        h('div', { class: 'choices' },
          h('button', { class: 'choice', onclick: () => approach('warm') }, h('span', { class: 'kind' }, 'Take your time'), h('span', { class: 'choice-label' }, 'Help them out, no pitch'), h('span', { class: 'hint' }, 'Slower, but people remember it.'), h('span', { class: 'chev' }, '›')),
          h('button', { class: 'choice', onclick: () => approach('cold') }, h('span', { class: 'kind' }, 'Quick'), h('span', { class: 'choice-label' }, 'Introduce yourself and hand over a card'), h('span', { class: 'hint' }, 'Covers more ground, leaves less of an impression.'), h('span', { class: 'chev' }, '›'))));
    };
    card.append(h('div', { class: 'eyebrow' }, 'The docks · 1 day'), h('h3', { class: 'scene-title' }, `${boat} is coming in`),
      h('p', { class: 'scene-text' }, 'Three people step onto the pier. You have time to really meet one of them.'),
      h('p', { class: 'pick-prompt' }, 'Who do you go and meet? Tap one.'),
      h('div', { class: 'arrivals' }, three.map((a) => h('button', { class: 'arrival-card', onclick: () => pick(a) },
        h('span', { class: 'arrival', html: PP.art.figure(a.fig, { seed: a.id.length * 7 }) }), h('strong', null, a.who), h('span', { class: 'small muted' }, a.tell)))),
      h('button', { class: 'btn ghost', onclick: close }, 'Not today'));
  }

  function skillGain(eff) {
    if (!eff || !eff.skill) return '';
    return '(+1 ' + Object.keys(eff.skill).map((k) => PP.SKILLS.find((x) => x.id === k).label).join(', ') + ')';
  }
  function runQuest(n, fake, free) {
    const c = G.career, q = n.quest, mg = PP.minigames[q.minigame];
    overlayGame(mg, { state: fake, client: q.minigame === 'conversation' ? PP.content.practiceClient : PP.content.clients.taylor, prep: c.skills.preparation || 0, practice: true, pass: q.pass }, (res) => {
      spendDay(() => {
        c.met[n.id] = true;
        if (res.passed) { c.quests[q.id] = 'done'; PP.apply(fake, q.reward); return `Passed! ${skillGain(q.reward)} ${n.name} can now be put on call.`; }
        c.quests[q.id] = 'failed'; return `Not quite (${res.score}/${res.max}). You can try again.`;
      }, null, free);
    }, `${n.name} · practice`);
  }
  function skillList(skills) {
    return h('ul', { class: 'skill-list' }, PP.SKILLS.map((k) => h('li', { class: skills[k.id] ? 'has' : '' },
      h('span', { class: 'pips', 'aria-label': `level ${skills[k.id]} of 2` }, h('i', { class: skills[k.id] >= 1 ? 'on' : '' }), h('i', { class: skills[k.id] >= 2 ? 'on' : '' })),
      h('span', null, h('strong', null, k.label), h('span', { class: 'small muted' }, ' ' + k.blurb)))));
  }

  /* ---------------- Starting a journey ---------------- */
  /* This journey's trail report, the open town requests, and keepsakes found so far. */
  function trailReport(p, c) {
    const rows = (p.conditions || []).map((o) => PP.conditionText(o));
    (c.requests || []).filter((q) => !q.done).forEach((q) => rows.push({ icon: '📜', text: `${PP.content.nodes[q.at].name}: ${q.text} Reward: ${PP.rewardText(q.reward)}.` }));
    const K = PP.content.keepsakes || {}, total = Object.keys(K).length, found = Object.keys(K).filter((id) => PP.keepsakeFound(c, id)).length;
    if (!rows.length && !total) return null;
    return h('div', { class: 'gear-sec trail-report' },
      h('div', { class: 'gear-sec-head' }, h('h3', null, '🗞️ Trail report'), total ? h('span', { class: 'gear-count' + (found === total ? ' full' : '') }, `🎁 ${found} / ${total}`) : null),
      h('ul', null, rows.map((r) => h('li', null, h('span', { class: 'tr-i', 'aria-hidden': 'true' }, r.icon), h('span', null, r.text)))),
      total && found < total ? h('p', { class: 'small muted' }, `Keepsakes are hidden at every landmark, side trails too. You have found ${found} of ${total}.`) : null);
  }

  /* ---- Getting ready: pack your bag, pick who's on call, visit the outfitter ---- */
  function packScreen(p) {
    const c = G.career;
    c.gear = c.gear || PP.career.starterGear(); c.bag = c.bag || PP.content.packSize;
    if (!p.conditions && PP.rollConditions) { p.conditions = PP.rollConditions(c); PP.career.save(c); }
    if (PP.refillRequests && !(c.requests || []).length) PP.refillRequests(c);
    const items = PP.content.items;
    const owned = () => Object.keys(items).filter((id) => c.gear[id]);
    const chosen = new Set((c.lastPack || []).filter((id) => c.gear[id]).slice(0, c.bag));
    const people = PP.content.npcs.filter((n) => c.met[n.id] || (n.quest && c.quests[n.quest.id] === 'done') || c.contacts.includes(n.contact));
    const onCall = new Set(c.contacts.filter((id) => people.some((n) => n.contact === id)).concat(c.contacts));
    const slots = () => PP.contactSlots(fakeState());
    const faceFor = (n) => { let k = 0; for (const ch of n.name) k = (k * 31 + ch.charCodeAt(0)) % 9973; return PP.art.face({ mood: 2, hue: k }); };
    const firstSentence = (t) => (String(t).match(/^.*?[.!?](\s|$)/) || [t])[0].trim();

    function buy(id, cost, up) {
      if (c.savings < cost) return;
      c.savings -= cost;
      if (up) c.gear[id] = 2; else { c.gear[id] = 1; if (chosen.size < c.bag) chosen.add(id); }
      PP.career.save(c); PP.fx && PP.fx.sfx('good');
      PP.ui.toast(up ? `Upgraded: ${items[id].icon} ${items[id].up.name}` : `New gear: ${items[id].icon} ${items[id].name}`);
      draw();
    }
    function buyBag() {
      const B = PP.content.bigBag; if (c.savings < B.cost) return;
      c.savings -= B.cost; c.bag = B.size; PP.career.save(c); PP.fx && PP.fx.sfx('good'); PP.ui.toast(`🎒 ${B.name}: you can carry ${B.size} things.`); draw();
    }
    function setOut() {
      c.contacts = [...onCall].slice(0, slots());
      c.lastPack = [...chosen];
      PP.career.save(c);
      startJourney(p, [...chosen]);
    }

    function itemCard(id) {
      const it = items[id], lv = c.gear[id] || 1, on = chosen.has(id), full = !on && chosen.size >= c.bag;
      const hint = PP.content.gearHint ? PP.content.gearHint(id, p, c) : null;
      return h('div', { class: 'gear-card' + (on ? ' on' : '') + (full ? ' full' : '') },
        h('button', { class: 'gear-pick', 'aria-pressed': String(on), onclick: () => { if (on) chosen.delete(id); else if (!full) chosen.add(id); else { PP.ui.toast(`Your bag is full. Take something out first.`); return; } draw(); } },
          h('span', { class: 'gear-icon', 'aria-hidden': 'true' }, it.icon),
          h('span', { class: 'gear-txt' },
            h('strong', null, lv >= 2 && it.up ? it.up.name : it.name, lv >= 2 ? h('span', { class: 'gear-lv' }, 'Upgraded') : null),
            h('span', null, lv >= 2 && it.up ? it.up.blurb : it.blurb),
            hint ? h('span', { class: 'gear-hint' }, '★ ' + hint) : null),
          h('span', { class: 'gear-check', 'aria-hidden': 'true' }, on ? '✓' : '')),
        it.up && lv < 2 ? h('button', { class: 'gear-up', disabled: c.savings < it.up.cost, onclick: () => buy(id, it.up.cost, true) }, `Upgrade to ${it.up.name} · ${money(it.up.cost)}`) : null);
    }
    function personCard(n) {
      const ct = PP.content.contacts[n.contact], on = onCall.has(n.contact), full = !on && onCall.size >= slots();
      return h('button', { class: 'gear-card person' + (on ? ' on' : '') + (full ? ' full' : ''), 'aria-pressed': String(on), onclick: () => { if (on) onCall.delete(n.contact); else if (!full) onCall.add(n.contact); else { PP.ui.toast('Everyone on call is busy enough. Take someone off first.'); return; } draw(); } },
        h('span', { class: 'gear-face', 'aria-hidden': 'true', html: faceFor(n) }),
        h('span', { class: 'gear-txt' }, h('strong', null, `${n.name} · ${ct.name.replace(/^The /, '')}`), h('span', null, firstSentence(ct.ability))),
        h('span', { class: 'gear-check', 'aria-hidden': 'true' }, on ? '✓' : ''));
    }
    function shopCard(id) {
      const it = items[id];
      return h('div', { class: 'gear-card shop' },
        h('span', { class: 'gear-icon', 'aria-hidden': 'true' }, it.icon),
        h('span', { class: 'gear-txt' }, h('strong', null, it.name), h('span', null, it.blurb)),
        h('button', { class: 'btn small', disabled: c.savings < it.cost, onclick: () => buy(id, it.cost, false) }, `Buy · ${money(it.cost)}`));
    }

    function draw() {
      const y = window.scrollY;
      const forSale = Object.keys(items).filter((id) => !c.gear[id] && items[id].cost);
      const B = PP.content.bigBag;
      screen(h('section', { class: 'pack v2' },
        h('header', { class: 'screen-head' }, h('div', null, h('div', { class: 'eyebrow' }, `${p.followUp ? 'Meeting ' + p.name + ' again' : 'Guiding ' + p.name}`), h('h2', { class: 'display-sm' }, 'Get ready to set out')),
          h('p', { class: 'muted' }, 'Pick what to carry and who to keep on call. Every day on the trail still costs money.')),
        trailReport(p, c),
        h('div', { class: 'gear-sec' },
          h('div', { class: 'gear-sec-head' }, h('h3', null, '🎒 Your bag'), h('span', { class: 'gear-count' + (chosen.size === c.bag ? ' full' : '') }, `${chosen.size} / ${c.bag}`)),
          h('div', { class: 'gear-grid' }, owned().map(itemCard))),
        h('div', { class: 'gear-sec' },
          h('div', { class: 'gear-sec-head' }, h('h3', null, '📞 On call'), h('span', { class: 'gear-count' + (onCall.size === slots() ? ' full' : '') }, `${Math.min(onCall.size, slots())} / ${slots()}`)),
          people.length ? h('div', { class: 'gear-grid' }, people.map(personCard))
            : h('p', { class: 'muted small' }, 'Nobody yet. Meet people around town (your desk, Chamber Hall, the Library and more) and they can help once per journey.')),
        h('details', { class: 'gear-sec outfitter', open: !!PP.store.get('outfitterOpen', false), ontoggle: (e) => PP.store.set('outfitterOpen', e.target.open) },
          h('summary', null, h('h3', null, '🏕️ Trail outfitter'), h('span', { class: 'small muted' }, `${forSale.length + (c.bag < B.size ? 1 : 0)} for sale · you have ${money(c.savings)}`)),
          h('p', { class: 'small muted' }, 'Buying gear costs money but no time. Upgrades are on each item above.'),
          h('div', { class: 'gear-grid' },
            c.bag < B.size ? h('div', { class: 'gear-card shop' }, h('span', { class: 'gear-icon', 'aria-hidden': 'true' }, '🎒'), h('span', { class: 'gear-txt' }, h('strong', null, B.name), h('span', null, B.blurb)),
              h('button', { class: 'btn small', disabled: c.savings < B.cost, onclick: buyBag }, `Buy · ${money(B.cost)}`)) : null,
            forSale.map(shopCard)),
          !forSale.length && c.bag >= B.size ? h('p', { class: 'small muted' }, 'You own everything the outfitter sells. Some gear only turns up on the trail.') : null),
        h('div', { class: 'gear-go' },
          h('button', { class: 'btn primary big', onclick: setOut }, `Set out with ${p.name}`),
          h('span', { class: 'small muted' }, `${chosen.size ? [...chosen].map((id) => items[id].icon).join(' ') : 'Empty bag'} · ${onCall.size ? Math.min(onCall.size, slots()) + ' on call' : 'nobody on call'}`),
          h('button', { class: 'btn ghost', onclick: () => port('pipeline') }, 'Back to the port'))));
      window.scrollTo(0, y);
    }
    draw();
    window.scrollTo(0, 0);
  }

  /* ---- Follow-up journeys: an existing client's life changed ---- */
  function setupFollowUp(s, c, f) {
    const b = c.book.find((x) => x.id === f.bookId), lc = PP.content.lifeChanges.find((x) => x.id === f.change), cl = s.client;
    const fill = (t) => String(t || '').replace(/\{c\}/g, cl.name);
    s.followUp = { id: f.id, bookId: b.id, change: lc.id, lap: (b.laps || 1) + 1, title: lc.title };
    (b.facts || []).forEach((k) => { if (cl.facts[k]) s.facts[k] = 0; });
    cl.facts.change_need = { label: fill(lc.need), key: true };
    cl.keyFact = 'change_need';
    cl.fit = {}; Object.keys(PP.content.destinations).forEach((d) => (cl.fit[d] = 'poor'));
    cl.fit[lc.right] = 'appropriate'; (lc.ok || []).forEach((d) => (cl.fit[d] = 'acceptable'));
    cl.unlocks = { [lc.right]: ['change_need'] };
    cl.surface = fill(lc.title) + '. ' + cl.surface;
    cl.checkin = Object.assign({}, cl.checkin, { worry: { curious: true, minTrust: 6, text: fill(lc.reveal), fact: 'change_need', guarded: fill(lc.guarded) }, goal: { text: fill(lc.goal) } });
    cl.conversation = (cl.conversation || []).concat([{ text: fill(lc.line), tag: 'fact', fact: 'change_need', subtle: true }]);
    cl.followCall = fill(lc.call); cl.followHelp = fill(lc.help);
    PP.apply(s, { trust: 1 + Math.min(2, b.laps || 1) });
  }
  function followUpEnd(s, c, pay, fit) {
    const b = c.book.find((x) => x.id === s.followUp.bookId);
    if (!b) return;
    pay.now = Math.round(pay.now * 0.6);
    b.laps = s.followUp.lap; b.lastLap = c.days;
    b.changes = (b.changes || []).concat(s.followUp.change);
    b.facts = [...new Set((b.facts || []).concat(Object.keys(s.facts).filter((k) => k !== 'change_need')))];
    if (pay.status === 'lost') { b.sat = Math.max(0, b.sat - 3); pay.note = `${b.name} felt you weren't really there for this change.`; return; }
    b.sat = Math.min(10, Math.max(b.sat, pay.sat) + 1);
    b.perDay += Math.round((pay.perDay || 10) * 0.6);
    if (fit === 'poor') b.status = 'at-risk';
    else if (b.laps >= 3) b.status = 'life';
    else if (b.status === 'at-risk') b.status = 'steady';
    pay.note = (fit === 'poor' ? `The change was handled, but not well. ${b.name} is less sure about you now.` : b.status === 'life' ? `${b.laps} laps together. ${b.name} is a client for life.` : `You were there when life changed. ${b.name}'s relationship with you deepens (lap ${b.laps}).`) + (fit !== 'poor' && s.client.followHelp ? ' ' + s.client.followHelp : '');
    if (fit === 'appropriate' && s.res.trust >= 7) pay.referral = true;
  }
  function followUpCard(f) {
    const c = G.career, b = c.book.find((x) => x.id === f.bookId);
    if (!b) return null;
    const cl = PP.content.clients[b.archetype];
    const left = f.expires - c.days;
    return h('article', { class: 'panel prospect-card followup' },
      h('div', { class: 'row tight' }, PP.ui.avatar({ name: b.name, hue: cl.hue }, 44), h('div', null, h('div', { class: 'eyebrow' }, `Follow-up · lap ${(b.laps || 1) + 1}`), h('h3', null, b.name), h('div', { class: 'small muted' }, f.title))),
      h('p', { class: 'small' }, `${b.name} trusts you already, so the trail is shorter. Find out what this change really means for them.`),
      f.carry ? h('p', { class: 'small good-text' }, `Paused on day ${f.carry.day}. You'll pick up where you left off.`) : null,
      h('p', { class: 'small ' + (left <= 5 ? 'warn' : 'muted') }, `They'll wait about ${left} more day${left === 1 ? '' : 's'}.`),
      h('button', { class: 'btn primary', onclick: () => packScreen({ id: f.id, name: b.name, archetype: b.archetype, temp: 'warm', source: 'a follow-up call', followUp: f }) }, `Meet ${b.name} again`));
  }

  function startJourney(p, pack) {
    const c = G.career;
    const s = PP.newState();
    s.career = c;
    s.skills = c.skills; s.contacts = c.contacts; s.met = c.met; s.quests = c.quests;
    s.client = PP.career.makeClient(p);
    if (p.followUp) setupFollowUp(s, c, p.followUp);
    s.map.known = c.known;
    s.pack = pack;
    s.conditions = p.conditions || (PP.rollConditions ? PP.rollConditions(c) : []);
    s.itemLv = {}; pack.forEach((id) => (s.itemLv[id] = (c.gear && c.gear[id]) || 1));
    s.phase = 'journey';
    c.pipeline = c.pipeline.filter((x) => x.id !== p.id);
    if (p.followUp) c.followUps = c.followUps.filter((f) => f.id !== p.followUp.id);
    s.origin = p;
    const carry = p.carry || (p.followUp && p.followUp.carry);
    if (carry) {
      // Picking up a paused journey: same day count, what you learned, where you have been, shortcuts still owed.
      Object.assign(s.facts, carry.facts); Object.assign(s.askedTopics, carry.askedTopics); Object.assign(s.seenEvents, carry.seenEvents);
      Object.assign(s.map.visited, carry.visited); Object.assign(s.faced, carry.faced); Object.assign(s.passageTaken, carry.passageTaken);
      s.res.trust = carry.trust; s.res.insight = carry.insight; s.res.momentum = Math.max(s.res.momentum, carry.momentum || 0);
      s.debt = (carry.debt || []).slice(); s.settled = (carry.settled || []).slice();
      s.day = carry.day; s.turn = carry.turn; s.trail = (carry.trail || ['port']).slice(); s.walked = (carry.walked || []).slice();
      s.resumed = true;
    } else {
      const trustMod = (p.temp === 'hot' ? 2 : p.temp === 'cold' ? -1 : 0) + P().workspaces[c.workspace].trust + (c.agent === 'changer' && p.source === 'your natural market' ? 1 : 0) + (p.winback ? 1 : 0);
      PP.apply(s, { trust: trustMod });
    }
    s.contacts.forEach((id) => (s.contactUses[id] = 1 + (PP.skill(s, 'resourcefulness') > 0 ? 1 : 0)));
    // Gear that works as you set out.
    s.pack.forEach((id) => {
      const it = PP.content.items[id]; if (!it || it.kind !== 'start') return;
      const lv = s.itemLv[id] || 1, eff = (lv >= 2 && it.up && it.up.eff) || it.eff;
      if (eff) PP.apply(s, eff);
      if (id === 'boots') { s.passageBoost = 1; if (lv >= 2) PP.apply(s, { energy: 1 }); }
      PP.useItem(s, id);
    });
    if (c.perks && c.perks.stamina) PP.apply(s, { energy: 2 });
    if (c.perks && c.perks.scout) { PP.apply(s, { insight: 1 }); PP.content.trails.forEach((t) => { if (s.map.known[t.a] || s.map.known[t.b]) { c.known[t.a] = true; c.known[t.b] = true; } }); }
    if (c.energyNext) { PP.apply(s, { energy: c.energyNext }); c.energyNext = 0; }
    if (c.weekPlan) { PP.apply(s, weekBuff(c.weekPlan)); PP.log(s, 'Your planned week: ' + weekLabel(c.weekPlan), 'info'); c.weekPlan = null; }
    G.s = s;
    PP.career.save(c);
    G.root.innerHTML = '';
    where('trail'); G.snap = null;
    PP.track && PP.track(s.resumed ? 'journey/resumed' : p.followUp ? 'journey/start-follow-up' : 'journey/start');
    if (!c.journeys && !s.resumed) PP.track && PP.track('journey/first-start');
    PP.ui.startTrail(G.root, s, { onEnd: journeyEnd, checkpoint: checkpointer(s) });
  }

  /* ---------------- Journey report ---------------- */
  /* Walked back into town mid-journey: the prospect goes back to the Trailhead, remembering everything. */
  function pauseJourney() {
    clearJourney();
    PP.track && PP.track('journey/paused');
    const s = G.s, c = G.career, cl = s.client, p = s.origin || {};
    keepFoundGear(s, c);
    const reqLines = PP.settleRequests ? PP.settleRequests(c, s.map.visited) : [];
    if (PP.refillRequests) PP.refillRequests(c);
    Object.keys(s.map.visited).forEach((k) => (c.known[k] = true));
    const carry = {
      facts: s.facts, askedTopics: s.askedTopics, seenEvents: s.seenEvents, visited: s.map.visited, faced: s.faced, passageTaken: s.passageTaken,
      trust: s.res.trust, insight: s.res.insight, momentum: s.res.momentum, debt: s.debt, settled: s.settled,
      day: s.day, turn: s.turn, trail: s.trail, walked: s.walked
    };
    if (s.followUp && p.followUp) {
      c.followUps = (c.followUps || []).filter((f) => f.id !== p.followUp.id);
      c.followUps.push(Object.assign({}, p.followUp, { carry, expires: Math.max(p.followUp.expires, c.days + 10) }));
    } else {
      const temp = s.res.trust >= 7 ? 'hot' : p.temp === 'cold' && s.res.trust < 5 ? 'cold' : 'warm';
      c.pipeline.push({ id: p.id || PP.uid('p'), archetype: p.archetype || cl.id, name: cl.name, temp, source: p.source || 'a paused journey', expires: c.days + P().life[temp], carry });
    }
    if (c.savings < 0) { c.over = true; PP.career.clear(); return unemployed(); }
    PP.career.save(c);
    port('trailhead', [{ text: `Back in town after ${s.day} day${s.day === 1 ? "" : "s"} on the trail. ${cl.name} is waiting at the Trailhead whenever you're ready to pick up where you left off.`, kind: 'info' }].concat(reqLines.map((t) => ({ text: t, kind: 'good' }))));
  }

  /* Anything that joined your pack on the trail stays in your gear collection. */
  function keepFoundGear(s, c) {
    c.gear = c.gear || PP.career.starterGear();
    const found = (s.pack || []).filter((id) => PP.content.items[id] && !c.gear[id]);
    found.forEach((id) => (c.gear[id] = 1));
    return found;
  }
  function journeyEnd(kind, reckoned) {
    if (kind === 'home') return pauseJourney();
    clearJourney(); where('port');
    const s = G.s, c = G.career, cl = s.client;
    const foundGear = keepFoundGear(s, c);
    const requestLines = PP.settleRequests ? PP.settleRequests(c, s.map.visited) : [];
    if (PP.refillRequests) PP.refillRequests(c);
    const levelBefore = PP.career.level(Object.assign({}, c, { savings: Math.max(0, c.savings) }));
    let fit = null, pts = 0, pay = null, cut = 0;
    Object.keys(s.map.visited).forEach((k) => (c.known[k] = true));
    if (kind === 'poached' && s.origin && !s.followUp) PP.career.lostToRival(c, s.origin, typeof s.poached === 'string' ? s.poached : null);
    if (kind === 'landed') {
      fit = cl.fit[s.destination] || 'poor';
      if (s.destination === 'not_now' && s.res.trust < 6) fit = 'poor';
      pts += fit === 'appropriate' ? 3 : fit === 'acceptable' ? 2 : 0;
      pts += s.res.trust >= 7 ? 2 : s.res.trust >= 4 ? 1 : 0;
      pts += s.settled.some((d) => d.outcome === 'costly') ? 0 : 1;
      pts += s.res.insight >= 6 ? 1 : 0;
      pay = P().payout(s, s.destination, fit);
      cut = c.partner ? Math.round(pay.now * 0.25) : 0;
      c.savings += pay.now - cut;
      if (s.followUp) followUpEnd(s, c, pay, fit);
      else if (pay.status !== 'lost') c.book.push({ id: PP.uid('b'), archetype: cl.id, name: cl.name, status: pay.status, perDay: pay.perDay, sat: pay.sat, journey: c.journeys + 1, day: c.days, lastLap: c.days, laps: 1, facts: Object.keys(s.facts), changes: [] });
      if (pay.referral) PP.career.addProspect(c, { temp: 'hot', source: `referral from ${cl.name}` });
    }
    if (s.followUp) {
      c.followUps = (c.followUps || []).filter((f) => f.id !== s.followUp.id);
      if (kind !== 'landed') { const b = c.book.find((x) => x.id === s.followUp.bookId); if (b) { b.sat = Math.max(0, b.sat - 3); b.lastLap = c.days; } }
    }
    c.visits = c.visits || {}; Object.keys(s.map.visited).forEach((k) => (c.visits[k] = (c.visits[k] || 0) + 1));
    if (kind !== 'broke') {
      c.journeys++;
      c.history.push({ journey: c.journeys, client: cl.name, outcome: kind === 'landed' ? PP.content.destinations[s.destination].name : kind, fit, cash: pay ? pay.now - cut : 0 });
    }
    if (kind === 'broke' || c.savings < 0) { c.over = true; PP.career.clear(); return unemployed(); }
    const levelAfter = PP.career.level(c);
    const firstProfitable = levelAfter === 'profitable' && c.bestLevel !== 'profitable';
    PP.track && PP.track('journey/end-' + kind + (kind === 'landed' ? '-' + fit : ''));
    if (c.journeys === 1) PP.track && PP.track('journey/first-finished');
    if (firstProfitable) PP.track && PP.track('level/profitable');
    else if (levelAfter === 'sustainable' && c.bestLevel === 'survivable') PP.track && PP.track('level/sustainable');
    if (levelAfter === 'profitable' || (levelAfter === 'sustainable' && c.bestLevel === 'survivable')) c.bestLevel = levelAfter;
    PP.career.save(c);

    PP.audio && PP.audio.bed(kind === 'landed' && pts >= 4 ? 'music:bright' : kind === 'landed' ? 'music:calm' : 'music:tense');
    const rating = kind === 'poached' ? 'A rival took your client' : kind !== 'landed' ? (kind === 'walked' ? 'The client found another guide' : 'The trail went cold')
      : pts >= 6 ? 'Trusted Guide' : pts >= 4 ? 'Steady Navigator' : pts >= 2 ? 'Got There, Eventually' : 'Lost in the Wilds';
    const why = kind === 'poached' ? `${cl.name} went with ${typeof s.poached === 'string' ? s.poached : 'a rival agent'}. The relationship was not strong enough to hold.`
      : kind === 'walked' ? `${cl.name} stopped talking to you. Trust ran out before the trail did.`
        : kind === 'stalled' ? `Everything slowed down until nothing was moving. ${cl.name} decided to "revisit this next year."`
          : fitText(s, fit);
    const shortcuts = s.settled.concat(s.debt.map((d) => Object.assign({}, d, { outcome: 'never came due' })));
    const unknown = Object.keys(cl.facts).filter((f) => s.facts[f] == null);
    const newMarks = s.newMarks || [];
    const destName = kind === 'landed' ? PP.content.destinations[s.destination].name : '';
    const headline = firstProfitable ? 'Profitable!' : rating;

    // Was this the prospect from a friend's challenge?
    const ch = c.challenge && !c.challenge.done && s.origin && s.origin.id === c.challenge.pid ? c.challenge : null;
    let beat = null;
    if (ch) {
      ch.done = true;
      const mine = kind === 'landed' ? pts : -1, theirs = ch.stars || -1;
      beat = mine > theirs || (mine === theirs && mine >= 0 && s.day < ch.days) ? 'won' : mine === theirs && s.day === ch.days ? 'tie' : 'lost';
      PP.track && PP.track('challenge/result-' + beat);
      PP.career.save(c);
    }
    const you = PP.you(c), full = PP.youFull(c), pr = PP.practiceName(c);
    const result = {
      name: full, agent: c.agent, archetype: cl.id, client: cl.name, temp: (s.origin && s.origin.temp) || 'warm',
      stars: kind === 'landed' ? pts : 0, days: s.day, rating: headline, dest: destName,
      eyebrow: [full || 'A new agent', pr].filter(Boolean).join(' · '),
      headline: beat === 'won' ? `Beat ${ch.by}'s challenge!` : headline,
      line: kind === 'landed' ? `Guided ${cl.name}, ${cl.title.replace(/^The /, 'the ')}, to ${destName} in ${s.day} day${s.day === 1 ? '' : 's'}.` + (beat ? ` ${ch.by}: ${ch.stars} star${ch.stars === 1 ? '' : 's'} in ${ch.days} day${ch.days === 1 ? '' : 's'}.` : '') : `${why}`,
      stats: [['Days', s.day], ['Level', PP.career.levelInfo(c).label], ['Clients', String(activeBook().length)]],
      gauges: s.res,
      cta: kind === 'landed' ? `Can you beat ${pts} star${pts === 1 ? '' : 's'} with ${cl.name}?` : `Think you can win ${cl.name} over?`,
      text: kind === 'landed'
        ? `${beat === 'won' ? `I beat ${ch.by}'s challenge! ` : ''}I guided ${cl.name} to ${destName} in ${s.day} day${s.day === 1 ? '' : 's'} and earned ${pts} of 7 stars in Build Your Practice. Think you can do better?`
        : `${cl.name} got away from me in Build Your Practice. Think you can win them over?`
    };
    if (kind !== 'landed') result.stars = null;
    const shareBtn = h('button', { class: 'btn big share-cta', onclick: () => PP.share.open(Object.assign({}, result, { stars: kind === 'landed' ? pts : null })) }, beat === 'won' ? 'Share your win' : 'Share and challenge');

    screen(h('section', { class: 'ending' },
      h('header', { class: 'ending-head' },
        h('div', { class: 'eyebrow' }, `${s.followUp ? 'Follow-up · ' : ''}Journey ${c.journeys} · ${cl.name} · ${s.day} days on the trail`),
        h('h2', { class: 'display' }, headline),
        kind === 'landed' ? h('div', { class: 'stars', 'aria-label': `${pts} of 7` }, Array.from({ length: 7 }, (_, i) => h('span', { class: i < pts ? 'on' : '' }))) : null,
        h('p', { class: 'lede' }, firstProfitable ? `Your income now covers twice your costs. ${why}` : why),
        h('div', { class: 'row' },
          h('button', { class: 'btn primary big', onclick: () => port(c.pipeline.length ? 'pipeline' : 'prospect', [{ text: `Back at Port Prospect after ${s.day} days away.`, kind: 'info' }]) }, 'Back to Port Prospect'),
          shareBtn,
          h('button', { class: 'btn ghost', onclick: () => { where('title'); intro(); } }, 'Title screen')),
        ch ? h('div', { class: 'panel challenge-result r-' + beat },
          h('div', { class: 'eyebrow' }, `${ch.by}'s challenge`),
          h('h3', null, beat === 'won' ? `You beat ${ch.by}${you ? ', ' + you : ''}!` : beat === 'tie' ? `Dead even with ${ch.by}.` : `${ch.by} still holds the record.`),
          h('div', { class: 'vs' },
            h('div', null, h('span', { class: 'lk' }, full || 'You'), h('strong', null, kind === 'landed' ? `${pts}★ · ${s.day} days` : `no sale · ${s.day} days`)),
            h('div', null, h('span', { class: 'lk' }, ch.by), h('strong', null, ch.stars ? `${ch.stars}★ · ${ch.days} days` : `no sale · ${ch.days} days`))),
          h('p', { class: 'small muted' }, beat === 'won' ? 'Send it back and see if they can beat you.' : 'Fewer days breaks a tie in stars.')) : null),
      h('div', { class: 'panel payday' },
        h('div', { class: 'eyebrow' }, 'What this journey did for your practice'),
        h('div', { class: 'practice-nums' },
          stat('Commission', pay ? money(pay.now - cut) + (cut ? ` (after ${money(cut)} to your partner)` : '') : '$0'),
          stat('Added income', pay && pay.perDay ? money(pay.perDay) + '/day' : 'nothing'),
          stat('Savings now', money(c.savings)),
          stat('Level', levelBefore !== levelAfter ? `${P().levels.find((l) => l.id === levelBefore).label} → ${PP.career.levelInfo(c).label}` : PP.career.levelInfo(c).label)),
        pay ? h('p', null, pay.note) : h('p', null, 'No sale, nothing added to your book. The days on the trail still cost money.'),
        pay && pay.status === 'at-risk' ? h('p', { class: 'small warn' }, `This one may cancel later, and ${money(P().clawback)} would be clawed back.`) : null,
        pay && pay.referral ? h('p', { class: 'small good-text' }, 'They referred a friend. A hot prospect is waiting in your pipeline.') : null,
        requestLines.map((t) => h('p', { class: 'small good-text' }, t)),
        foundGear.length ? h('p', { class: 'small good-text' }, `New gear for your collection: ${foundGear.map((id) => PP.content.items[id].icon + ' ' + PP.content.items[id].name).join(', ')}. Pack it on any journey.`) : null,
        newMarks.length ? h('p', { class: 'small good-text' }, `Marks earned: ${newMarks.map((m) => PP.content.nodes[m].name).join(', ')}. New systems are available under Build your practice.`) : null,
        ladder(levelAfter)),
      h('div', { class: 'ending-grid' },
        h('div', { class: 'panel' }, h('h3', null, s.followUp ? `The relationship · lap ${s.followUp.lap}` : 'The relationship'),
          h('ul', { class: 'score-list stages-end' }, PP.stageStatus(s).map((st) => h('li', { class: st.done ? 'done' : 'missed' }, h('span', null, st.label), h('strong', null, st.done ? '✓ ' + st.blurb : 'not yet'))))),
        h('div', { class: 'panel' }, h('h3', null, 'Where the journey ended'), PP.ui.gauges(s),
          kind === 'landed' ? h('ul', { class: 'score-list' },
            h('li', null, h('span', null, 'Destination fit'), h('strong', null, fit)),
            h('li', null, h('span', null, 'Trust'), h('strong', null, s.res.trust >= 7 ? 'strong' : s.res.trust >= 4 ? 'okay' : 'shaky')),
            h('li', null, h('span', null, 'No costly surprises'), h('strong', null, s.settled.some((d) => d.outcome === 'costly') ? 'no' : 'yes')),
            h('li', null, h('span', null, 'Understood the client'), h('strong', null, s.res.insight >= 6 ? 'yes' : 'partly'))) : null),
        h('div', { class: 'panel' }, h('h3', null, 'Your shortcuts, and when they came due'),
          shortcuts.length ? h('ol', { class: 'debt-timeline' }, shortcuts.map((d) => h('li', { class: 'o-' + String(d.outcome).replace(/ /g, '-') },
            h('div', null, h('strong', null, PP.content.debts[d.tag].label)),
            h('div', { class: 'small muted' }, `Taken near ${PP.content.nodes[d.where] ? PP.content.nodes[d.where].name : '?'}` + (d.how === 'final reckoning' ? ' · came due at the final reckoning' : d.at ? ` · came due near ${PP.content.nodes[d.at].name}` : '')),
            h('span', { class: 'pill' }, d.how === 'Olu' || d.how === 'checklist' ? 'rescued by ' + d.how : d.outcome)))) : h('p', { class: 'muted' }, 'You took no shortcuts that left a debt. Thorough, possibly slow, definitely tidy.'),
          reckoned ? h('p', { class: 'small muted' }, `${reckoned} unresolved shortcut${reckoned > 1 ? 's' : ''} rolled one last time when you arrived.`) : null),
        h('div', { class: 'panel' }, h('h3', null, `What you never found out about ${cl.name}`),
          unknown.length ? h('ul', { class: 'facts' }, unknown.map((f) => h('li', { class: cl.facts[f].key ? 'key' : '' }, cl.facts[f].label + (cl.facts[f].key ? ' (this changes the destination)' : '')))) : h('p', null, 'Nothing. You got the full picture.')),
        h('div', { class: 'panel' }, h('div', { class: 'panel-head' }, h('h3', null, 'Your route'), h('button', { class: 'btn small', onclick: () => PP.ui.mapViewer(s, { title: 'Your route', eyebrow: `${cl.name} · ${s.day} days`, fit: true }) }, 'Open map')),
          h('button', { class: 'map-host small-map map-open', id: 'end-map', 'aria-label': 'Open your route on the full map', onclick: () => PP.ui.mapViewer(s, { title: 'Your route', eyebrow: `${cl.name} · ${s.day} days`, fit: true }) })))));
    s.map.beam = true;
    PP.ui.renderMap(document.getElementById('end-map'), s, {});
  }

  function unemployed() {
    clearJourney();
    PP.track && PP.track('career-over/unemployed');
    const c = G.career;
    PP.audio && PP.audio.bed('music:night');
    screen(h('section', { class: 'ending' },
      h('header', { class: 'ending-head' },
        h('div', { class: 'eyebrow' }, `Career over after ${c.days} days and ${c.journeys} journey${c.journeys === 1 ? '' : 's'}`),
        h('h2', { class: 'display' }, 'Unemployed'),
        h('p', { class: 'lede' }, 'Your savings ran out. You take a salaried job at the bank. It has excellent dental, and nobody ever asks you to find out what a client really needs.'),
        ladder('unemployed'),
        h('div', { class: 'row' }, h('button', { class: 'btn primary big', onclick: chooseAgent }, 'Start a new career'),
          h('button', { class: 'btn big share-cta', onclick: () => PP.share.open({ challenge: false, name: PP.youFull(c), eyebrow: [PP.youFull(c) || 'A new agent', PP.practiceName(c)].filter(Boolean).join(' · '), headline: 'Unemployed', stars: null,
            line: `${c.days} days, ${c.journeys} journey${c.journeys === 1 ? '' : 's'}, ${c.book.length} client${c.book.length === 1 ? '' : 's'}. The bank job has excellent dental.`,
            stats: [['Days', c.days], ['Journeys', c.journeys], ['Clients', c.book.length]], cta: 'Can you keep a practice afloat?',
            text: `My practice lasted ${c.days} days in Build Your Practice before the savings ran out. Can you keep yours afloat?` }) }, 'Share'))),
      h('div', { class: 'panel' }, h('h3', null, 'Your career'),
        c.history.length ? h('ol', { class: 'plain' }, c.history.map((x) => h('li', null, `Journey ${x.journey}: ${x.client} → ${x.outcome}${x.fit ? ` (${x.fit} fit)` : ''}, ${money(x.cash)}`))) : h('p', { class: 'muted' }, 'You never landed a client.'))));
  }

  function fitText(s, fit) {
    const c = s.client, d = PP.content.destinations[s.destination].name;
    const keyKnown = PP.knows(s, c.keyFact);
    if (fit === 'appropriate') return `${d} was the right place for ${c.name}. You found it by noticing what mattered.`;
    if (fit === 'acceptable' && s.destination === 'not_now') return `${c.name} decided not to go ahead yet, and that is still a good outcome: the relationship is intact and the door is open.`;
    if (fit === 'acceptable') return `${d} works for ${c.name}, though there may have been a better fit.`;
    if (s.destination === 'not_now') return `${c.name} walked away undecided, and not in a good way. Without enough trust, "not now" means "not with you."`;
    return `${d} looked like the obvious destination, but it did not fit ${c.name}'s real situation.` + (keyKnown ? ' You knew enough to choose differently.' : ` The thing you never found out: ${c.facts[c.keyFact].label.toLowerCase()}.`);
  }

  /* ---------------- Move your game to another device ----------------
   * The whole career (and a journey in progress, as a paused journey) is packed into a short
   * code: JSON, compressed, base64url. A QR code carries it as a link (#import=...); the
   * fragment never reaches any server. No accounts, nothing stored online. */
  const b64url = (bytes) => { let bin = ''; bytes.forEach((b) => (bin += String.fromCharCode(b))); return btoa(bin).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, ''); };
  const unb64url = (str) => { const bin = atob(str.replace(/-/g, '+').replace(/_/g, '/')); return Uint8Array.from(bin, (ch) => ch.charCodeAt(0)); };
  async function squeeze(bytes, how) {
    const S = how === 'in' ? window.DecompressionStream : window.CompressionStream;
    const st = new S('deflate-raw'); const w = st.writable.getWriter(); w.write(bytes).catch(() => {}); w.close().catch(() => {}); // a bad code rejects the read below instead
    return new Uint8Array(await new Response(st.readable).arrayBuffer());
  }
  function clearHash() { try { history.replaceState(null, '', location.pathname + location.search); } catch (e) { /* sandboxed */ } }
  async function makeCode() {
    const c = JSON.parse(JSON.stringify(G.career));
    const snap = PP.store.get('journey', null);
    let traveling = null;
    if (snap && snap.s && snap.s.client) {
      // A journey in progress travels as a paused journey: the client waits at the Trailhead.
      const js = snap.s, o = js.origin || {};
      const carry = { facts: js.facts, askedTopics: js.askedTopics, seenEvents: js.seenEvents, visited: js.map.visited, faced: js.faced, passageTaken: js.passageTaken,
        trust: js.res.trust, insight: js.res.insight, momentum: js.res.momentum, debt: js.debt, settled: js.settled, day: js.day, turn: js.turn, trail: js.trail, walked: js.walked };
      if (js.followUp && o.followUp) c.followUps = (c.followUps || []).filter((f) => f.id !== o.followUp.id).concat(Object.assign({}, o.followUp, { carry, expires: Math.max(o.followUp.expires || 0, c.days + 10) }));
      else c.pipeline = c.pipeline.filter((x) => x.id !== o.id).concat({ id: o.id || PP.uid('p'), archetype: o.archetype || js.client.id, name: js.client.name, temp: o.temp || 'warm', source: o.source || 'a paused journey', expires: c.days + 15, carry });
      traveling = js.client.name;
    }
    delete c.evSeen; delete c.today; c.history = (c.history || []).slice(-8);
    const payload = { v: 1, c, p: PP.profile.get(), set: { sound: !!PP.fx.sound, music: !!(PP.audio && PP.audio.music), muted: !!PP.fx.muted } };
    const raw = new TextEncoder().encode(JSON.stringify(payload));
    const code = window.CompressionStream ? 'BYP1.' + b64url(await squeeze(raw, 'out')) : 'BYP0.' + b64url(raw);
    return { code, traveling };
  }
  async function readCode(text) {
    const m = String(text || '').match(/BYP([01])\.([A-Za-z0-9_-]+)/);
    if (!m) throw new Error('not a save code');
    const bytes = unb64url(m[2]);
    const json = new TextDecoder().decode(m[1] === '1' ? await squeeze(bytes, 'in') : bytes);
    const d = JSON.parse(json);
    if (!d || d.v !== 1 || !d.c || !d.c.agent) throw new Error('not a save');
    return d;
  }
  function saveSummary(c) { const clients = (c.book || []).filter((b) => ['life', 'steady', 'at-risk'].includes(b.status)).length; return `day ${c.days + 1}, ${PP.career.levelInfo(c).label}, ${money(c.savings)}, ${clients} client${clients === 1 ? '' : 's'}`; }
  /* "Load this game?" Shown before anything is replaced. */
  function importPrompt(d, onCancel) {
    const here = PP.career.load(), c = d.c, who = (d.p && d.p.name) || c.you;
    const close = () => { ov.remove(); document.body.classList.remove('modal-open'); };
    const ov = h('div', { class: 'overlay result-overlay', role: 'dialog', 'aria-modal': 'true', 'aria-label': 'Load a game' },
      h('div', { class: 'result-card import-card' },
        h('div', { class: 'eyebrow' }, 'Move your game'),
        h('h3', { class: 'scene-title' }, 'Load this game?'),
        h('p', { class: 'rc-main' }, `${who ? who + ', ' : ''}${PP.career.agent(c).name}: ${saveSummary(c)}.`),
        here ? h('p', { class: 'small warn' }, `This replaces the game on this device (${saveSummary(here)}).`) : null,
        h('div', { class: 'rc-actions' },
          h('button', { class: 'btn primary', onclick: () => { close(); applyImport(d); } }, 'Load it'),
          h('button', { class: 'btn ghost', onclick: () => { close(); if (onCancel) onCancel(); } }, here ? 'Keep my game here' : 'Cancel'))));
    document.body.appendChild(ov);
    document.body.classList.add('modal-open');
  }
  function applyImport(d) {
    if (PP.trail && PP.trail.active && PP.trail.active()) PP.trail.stop();
    PP.store.set('career2', d.c);
    if (d.p) PP.profile.set(d.p);
    if (d.set) { PP.store.set('sound', d.set.sound); PP.store.set('music', d.set.music); PP.store.set('muted', d.set.muted); }
    clearJourney();
    PP.store.set('where', 'port');
    PP.track && PP.track('transfer/imported');
    location.replace(location.pathname + location.search);
  }
  async function openTransfer() {
    const c = G.career && !G.career.over ? G.career : null;
    const close = () => { ov.remove(); document.body.classList.remove('modal-open'); };
    const status = h('p', { class: 'small muted tf-status', 'aria-live': 'polite' });
    const say = (t) => { status.textContent = t; };
    const copy = (text, msg) => { (navigator.clipboard && window.isSecureContext ? navigator.clipboard.writeText(text) : Promise.reject()).then(() => say(msg)).catch(() => { area.value = text; area.select(); say('Select the text in the box and copy it.'); }); };
    const area = h('textarea', { class: 'tf-paste', rows: 3, placeholder: 'Paste a save code or link here', autocomplete: 'off', autocapitalize: 'off', spellcheck: 'false' });
    const send = h('div', { class: 'tf-send' });
    const ov = h('div', { class: 'overlay result-overlay', role: 'dialog', 'aria-modal': 'true', 'aria-label': 'Move your game', onclick: (e) => { if (e.target === ov) close(); } },
      h('div', { class: 'result-card transfer-card' },
        h('div', { class: 'gm-head' }, h('div', null, h('div', { class: 'eyebrow' }, 'Move your game'), h('h3', { class: 'scene-title' }, c ? 'Take it to another device' : 'Bring a game here')), h('button', { class: 'mv-x', 'aria-label': 'Close', onclick: close }, '×')),
        c ? send : null,
        h('div', { class: 'tf-receive' },
          h('div', { class: 'eyebrow' }, c ? 'Or bring a game here' : 'Paste a code'),
          area,
          h('button', { class: 'btn', onclick: async () => { try { const d = await readCode(area.value); close(); importPrompt(d); } catch (e) { say("That code didn't work. Copy the whole thing and try again."); } } }, 'Load this game')),
        status));
    document.body.appendChild(ov);
    document.body.classList.add('modal-open');
    if (!c) return;
    send.append(h('p', { class: 'small muted' }, 'Packing your game…'));
    const { code, traveling } = await makeCode();
    const link = (PP.share && PP.share.base ? PP.share.base() : location.href.split('#')[0]) + '#import=' + code;
    let qrSvg = '';
    try { const qr = window.qrcode(0, 'L'); qr.addData(link); qr.make(); qrSvg = qr.createSvgTag({ cellSize: 4, margin: 4, scalable: true }); } catch (e) { qrSvg = ''; }
    send.innerHTML = '';
    const put = (...els) => send.append(...els.filter(Boolean));
    put(
      qrSvg ? h('div', { class: 'tf-qr', html: qrSvg, 'aria-label': 'QR code for your game' }) : h('p', { class: 'small warn' }, 'Your game is too big for a QR code. Use Copy code below instead.'),
      h('p', { class: 'tf-how' }, h('strong', null, 'Scan it with the other device\'s camera'), ', tap the link, and choose Load it.'),
      traveling ? h('p', { class: 'small muted' }, `Your journey travels too: ${traveling} will be waiting at the Trailhead.`) : null,
      h('div', { class: 'rc-actions' },
        h('button', { class: 'btn', onclick: () => copy(code, 'Code copied. On the other device: Menu → Move your game → paste it.') }, 'Copy code'),
        h('button', { class: 'btn', onclick: () => copy(link, 'Link copied. Send it to yourself and open it on the other device.') }, 'Copy link')),
      h('p', { class: 'small muted tf-app' }, 'Using the home screen app on the other device? iPhone opens scanned links in Safari, which keeps its own saves. Copy the code instead, send it to yourself, then in the app open Menu → Move your game and paste it.'));
    PP.track && PP.track('transfer/opened');
  }
  PP.ui.openTransfer = openTransfer;

  /* ---------------- Menu (top bar) ----------------
   * Always reachable, including in the home screen app where there is no reload button. */
  function leaveTrail() {
    if (PP.trail && PP.trail.active && PP.trail.active()) PP.trail.stop();
  }
  PP.ui.openMenu = function () {
    if (document.querySelector('.game-menu')) return;
    const c = G.career && !G.career.over ? G.career : null;
    const onTrail = !!(PP.trail && PP.trail.active && PP.trail.active());
    const close = () => { ov.remove(); document.body.classList.remove('modal-open'); };
    const item = (label, note, fn, cls) => h('button', { class: 'gm-item ' + (cls || ''), onclick: () => { close(); fn(); } }, h('strong', null, label), note ? h('span', null, note) : null);
    const confirmNew = () => {
      const box = h('div', { class: 'gm-confirm' },
        h('p', null, h('strong', null, 'Start over?'), ` This replaces your current career (day ${c.days}, ${PP.career.levelInfo(c).label}${onTrail ? ', and the journey you are on' : ''}) once you pick your new agent.`),
        h('div', { class: 'row' },
          h('button', { class: 'btn primary', onclick: () => { close(); leaveTrail(); where('title'); chooseAgent(); } }, 'Yes, start a new career'),
          h('button', { class: 'btn ghost', onclick: () => box.replaceWith(list) }, 'Cancel')));
      list.replaceWith(box);
    };
    const list = h('div', { class: 'gm-list' },
      item('Back to the game', null, () => {}, 'gm-back'),
      c ? item('Title screen', onTrail ? `Your journey with ${G.s && G.s.client ? G.s.client.name : 'your client'} is saved. Continue picks it up.` : 'Your career is saved. Continue picks it up.', () => { leaveTrail(); where('title'); intro(); }) : item('Title screen', null, () => { leaveTrail(); where('title'); intro(); }),
      c ? h('button', { class: 'gm-item gm-new', onclick: () => confirmNew() }, h('strong', null, 'Start a new career'), h('span', null, 'Pick a new agent and start from day 1.')) : null,
      item(c ? 'Move your game to another device' : 'Load a game from another device', c ? 'A QR code or a code to paste. Nothing is stored online.' : 'Paste a code from your other device.', () => openTransfer()),
      item('About and sound check', `Version ${PP.VERSION}`, () => PP.ui.about && PP.ui.about()));
    const sw = (key, label, note, get, set) => h('button', { class: 'gm-switch', role: 'switch', 'data-switch': key, 'aria-checked': String(get()), onclick: () => set(!get()) },
      h('span', { class: 'gm-sw-txt' }, h('strong', null, label), h('span', null, note)), h('span', { class: 'gm-sw-knob', 'aria-hidden': 'true' }));
    const sound = h('div', { class: 'gm-sound' + (PP.fx.muted ? ' is-muted' : '') }, h('div', { class: 'eyebrow' }, 'Sound'),
      sw('sound', 'Sound effects', 'Taps, wins, oops', () => !!PP.fx.sound, (v) => PP.fx.setSound(v)),
      sw('music', 'Music and ambience', 'Travel music and the sounds of each place', () => !!(PP.audio && PP.audio.music), (v) => PP.audio && PP.audio.setMusic(v)),
      h('p', { class: 'gm-muted small', hidden: !PP.fx.muted }, 'Everything is muted from the speaker in the top bar. Turning a switch on unmutes.'));
    const ov = h('div', { class: 'overlay game-menu', role: 'dialog', 'aria-modal': 'true', 'aria-label': 'Menu', onclick: (e) => { if (e.target === ov) close(); } },
      h('div', { class: 'gm-card' },
        h('div', { class: 'gm-head' }, h('div', null, h('div', { class: 'eyebrow' }, 'Menu'),
          h('h3', null, c ? [PP.youFull(c) || PP.career.agent(c).name, `Day ${c.days + 1} · ${PP.career.levelInfo(c).label}`].join(' · ') : 'Build Your Practice')),
          h('button', { class: 'mv-x', 'aria-label': 'Close menu', onclick: close }, '×')),
        list, sound));
    document.body.appendChild(ov);
    document.body.classList.add('modal-open');
    const onKey = (e) => { if (e.key === 'Escape') { e.stopPropagation(); close(); document.removeEventListener('keydown', onKey, true); } };
    document.addEventListener('keydown', onKey, true);
    ov.querySelector('.gm-back').focus({ preventScroll: true });
  };

  function toast(msg) {
    const t = h('div', { class: 'toast', role: 'status' }, msg);
    document.body.appendChild(t);
    setTimeout(() => t.classList.add('out'), 4200);
    setTimeout(() => t.remove(), 4800);
  }
  PP.ui.toast = toast;
})(window.PP);
