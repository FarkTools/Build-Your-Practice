/* Build Your Practice — game shell.
 * Title -> choose your agent -> Port Prospect (prospect, pipeline, book, build, people)
 * -> guide a prospect along the trail -> journey report -> back to the port.
 * Every activity at the port takes a day, and every day costs money. */
(function (PP) {
  const h = PP.h;
  const G = (PP.game = { s: null, career: null, root: null, tab: 'prospect' });
  const money = (n) => PP.career.money(n);
  const P = () => PP.content.practice;

  PP.ui.mountGame = function (root) { G.root = root; intro(); };

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
        h('div', { class: 'row' },
          saved ? h('button', { class: 'btn primary big', onclick: () => { G.career = saved; G.place = null; port(null); } }, `Continue (day ${saved.days}, ${PP.career.levelInfo(saved).label})`) : null,
          h('button', { class: 'btn ' + (saved ? 'ghost' : 'primary big'), onclick: chooseAgent }, saved ? 'Start a new career' : 'Start your career'))),
      h('div', { class: 'intro-map', id: 'intro-map' })));
    const demo = PP.newState();
    demo.map.beam = true;
    PP.ui.renderMap(document.getElementById('intro-map'), demo, {});
  }

  function chooseAgent() {
    screen(h('section', { class: 'choose' },
      h('header', { class: 'screen-head' }, h('div', null, h('div', { class: 'eyebrow' }, 'Who are you?'), h('h2', { class: 'display-sm' }, 'Choose your agent')),
        h('p', { class: 'muted' }, 'Each starting point trades money, skills and the size of your natural market (people you already know).')),
      h('div', { class: 'agent-grid' }, PP.content.agentTypes.map((a) => h('article', { class: 'panel agent-card' },
        h('h3', null, a.name), h('p', { class: 'agent-tag' }, a.tagline),
        h('dl', { class: 'kv' },
          h('dt', null, 'Savings'), h('dd', null, money(a.savings)),
          h('dt', null, 'Living costs'), h('dd', null, money(a.living) + '/day'),
          h('dt', null, 'Natural market'), h('dd', null, a.market + ' warm contacts'),
          h('dt', null, 'Runway'), h('dd', null, Math.floor(a.savings / a.living) + ' days with no income'),
          h('dt', null, 'Skills'), h('dd', null, Object.keys(a.skills).map((k) => PP.SKILLS.find((x) => x.id === k).label).join(', '))),
        h('p', { class: 'small' }, h('strong', null, a.perk + ': '), a.perkText),
        h('p', { class: 'small muted' }, a.cons),
        h('button', { class: 'btn primary', onclick: () => { G.career = PP.newCareer(a.id); PP.career.save(G.career); G.place = null; port('office', [{ text: `Day 1. You hang your license on the wall at Port Prospect. Time to find some people to help.`, kind: 'info' }]); } }, `Start as a ${a.name}`))))));
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
    if (!c.pipeline.length) return 'Nobody is waiting to set out. Find prospects: make calls from your desk, work the room at Chamber Hall, set up a tent in Market Square, or meet the boats at the Docks.';
    if (unhappy.length) return `${unhappy.map((b) => b.name).join(', ')} ${unhappy.length > 1 ? "haven't" : "hasn't"} heard from you in a while. Visit Maple Row before you head out.`;
    return `You have ${c.pipeline.length} prospect${c.pipeline.length > 1 ? 's' : ''} waiting. ${soon.name} goes cold in ${soon.expires - c.days} day${soon.expires - c.days === 1 ? '' : 's'}. Head to the Trailhead to set out, or keep building.`;
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
      h('p', { class: 'small' }, `Income: ${money(PP.career.bookIncome(c))}/day from clients` + (PP.career.overrides(c) ? ` + ${money(PP.career.overrides(c))}/day from your recruits` : '') + `. Costs: ${money(c.living)}/day living` + (PP.career.rent(c) ? ` + ${money(PP.career.rent(c))}/day rent` : '') + '.'));
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
    const c = G.career, T = PP.content.town;
    const want = T.places[where] ? where : T.tabPlace[where];
    if (want) G.place = want;
    if (!G.place) G.place = c.pipeline.length || (c.followUps || []).length ? 'trailhead' : 'office';
    PP.audio && PP.audio.bed('town:' + G.place);
    const flashBox = flash && flash.length ? h('div', { class: 'flash', role: 'status' }, flash.map((n) => h('p', { class: 'fl-' + (n.kind || 'info') }, n.text))) : null;
    const panel = h('div', { class: 'place-panel', id: 'place-panel' }, flashBox, placePanel(G.place));
    const map = PP.ui.townMap(c, G.place, (id) => {
      G.place = id; G.lastPlace = id;
      PP.audio && PP.audio.bed('town:' + id);
      map.querySelectorAll('.tp').forEach((g) => g.classList.toggle('on', g.dataset.id === id));
      panel.innerHTML = ''; panel.appendChild(placePanel(id));
      panel.scrollIntoView({ behavior: 'smooth', block: 'start' });
      PP.fx && PP.fx.sfx('click');
    });
    screen(h('section', { class: 'port' },
      h('header', { class: 'screen-head' }, h('div', null, h('div', { class: 'eyebrow' }, 'Home base'), h('h2', { class: 'display-sm' }, 'Port Prospect')),
        h('p', { class: 'muted' }, 'Every activity here takes a day, and every day costs money. Balance prospecting, looking after clients, and time on the trail.')),
      practicePanel(c),
      todayCard(c),
      h('p', { class: 'coach' }, h('span', { class: 'eyebrow' }, 'What now? '), coach(c)),
      h('div', { class: 'town-layout' }, h('div', { class: 'town-wrap' }, h('p', { class: 'pick-prompt' }, 'Tap a place in town'), map), panel)));
    // After doing something, stay where you were: show the result at the top of this place.
    if (flashBox && G.lastPlace === G.place) requestAnimationFrame(() => panel.scrollIntoView({ block: 'start' }));
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
      acts.length || pl.sections.some((x) => ['plan', 'boats', 'courses'].includes(x)) ? h('h4', { class: 'place-sub' }, 'Things to do here') : null,
      pl.sections.filter((x) => ['plan', 'boats'].includes(x)).map((x) => sec[x]()),
      acts.length ? h('div', { class: 'activity-grid' }, acts.map(activityCard)) : null,
      pl.sections.filter((x) => !['plan', 'boats'].includes(x)).map((x) => sec[x]()),
      npcs.length ? h('h4', { class: 'place-sub' }, 'Who\'s here') : null,
      npcs.length ? h('div', { class: 'npc-grid' }, npcs.map(npcCard)) : null);
  }
  function deskName(c) { return { kitchen: 'Your kitchen table', cowork: 'Your desk at the Co-op', office: 'Your office' }[c.workspace] || 'Your desk'; }
  const activeBook = () => G.career.book.filter((b) => ['life', 'steady', 'at-risk'].includes(b.status));

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
      h('div', null, h('strong', null, w.name), h('div', { class: 'small' }, w.blurb), h('div', { class: 'small muted' }, w.rent ? `${money(w.rent)}/day rent` : 'No rent')),
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
          if (c.pipeline.length && PP.chance(how === 'warm' ? 0.2 : 0.4)) { const lost = c.pipeline.splice(Math.floor(Math.random() * c.pipeline.length), 1)[0]; notes.push(`Later you hear ${lost.name} had coffee with him. They are no longer in your pipeline.`); }
          else notes.push('Nobody of yours went with him. This time.');
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
  function packScreen(p) {
    const chosen = new Set();
    const go = h('button', { class: 'btn primary big', disabled: true, onclick: () => startJourney(p, [...chosen]) }, `Choose ${PP.content.packSize}`);
    const list = h('div', { class: 'pack-grid' }, Object.entries(PP.content.items).map(([id, it]) => h('button', { class: 'pack-item', 'aria-pressed': 'false', 'data-id': id, onclick: () => {
      if (chosen.has(id)) chosen.delete(id); else if (chosen.size < PP.content.packSize) chosen.add(id);
      list.querySelectorAll('.pack-item').forEach((el) => el.setAttribute('aria-pressed', chosen.has(el.dataset.id) ? 'true' : 'false'));
      go.disabled = chosen.size !== PP.content.packSize;
      go.textContent = chosen.size === PP.content.packSize ? `Set out with ${p.name}` : `Choose ${PP.content.packSize - chosen.size} more`;
    } }, h('strong', null, it.name), h('span', { class: 'small' }, it.blurb))));
    screen(h('section', { class: 'pack' },
      h('header', { class: 'screen-head' }, h('div', null, h('div', { class: 'eyebrow' }, `Guiding ${p.name}`), h('h2', { class: 'display-sm' }, 'Pack your bag')), h('p', { class: 'muted' }, `You can carry ${PP.content.packSize} things. Days on the trail still cost money, and your other clients will be waiting.`)),
      list, h('div', { class: 'row' }, go, h('button', { class: 'btn ghost', onclick: () => port('pipeline') }, 'Back to the port'))));
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
      const trustMod = (p.temp === 'hot' ? 2 : p.temp === 'cold' ? -1 : 0) + P().workspaces[c.workspace].trust + (c.agent === 'changer' && p.source === 'your natural market' ? 1 : 0);
      PP.apply(s, { trust: trustMod });
    }
    s.contacts.forEach((id) => (s.contactUses[id] = 1 + (PP.skill(s, 'resourcefulness') > 0 ? 1 : 0)));
    if (s.pack.includes('cards')) { PP.apply(s, { trust: 1 }); PP.useItem(s, 'cards'); }
    if (c.perks && c.perks.stamina) PP.apply(s, { energy: 2 });
    if (c.perks && c.perks.scout) { PP.apply(s, { insight: 1 }); PP.content.trails.forEach((t) => { if (s.map.known[t.a] || s.map.known[t.b]) { c.known[t.a] = true; c.known[t.b] = true; } }); }
    if (c.energyNext) { PP.apply(s, { energy: c.energyNext }); c.energyNext = 0; }
    if (c.weekPlan) { PP.apply(s, weekBuff(c.weekPlan)); PP.log(s, 'Your planned week: ' + weekLabel(c.weekPlan), 'info'); c.weekPlan = null; }
    G.s = s;
    PP.career.save(c);
    G.root.innerHTML = '';
    PP.ui.startTrail(G.root, s, { onEnd: journeyEnd });
  }

  /* ---------------- Journey report ---------------- */
  /* Walked back into town mid-journey: the prospect goes back to the Trailhead, remembering everything. */
  function pauseJourney() {
    const s = G.s, c = G.career, cl = s.client, p = s.origin || {};
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
    port('trailhead', [{ text: `Back in town after ${s.day} day${s.day === 1 ? "" : "s"} on the trail. ${cl.name} is waiting at the Trailhead whenever you're ready to pick up where you left off.`, kind: 'info' }]);
  }

  function journeyEnd(kind, reckoned) {
    if (kind === 'home') return pauseJourney();
    const s = G.s, c = G.career, cl = s.client;
    const levelBefore = PP.career.level(Object.assign({}, c, { savings: Math.max(0, c.savings) }));
    let fit = null, pts = 0, pay = null, cut = 0;
    Object.keys(s.map.visited).forEach((k) => (c.known[k] = true));
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

    screen(h('section', { class: 'ending' },
      h('header', { class: 'ending-head' },
        h('div', { class: 'eyebrow' }, `${s.followUp ? 'Follow-up · ' : ''}Journey ${c.journeys} · ${cl.name} · ${s.day} days on the trail`),
        h('h2', { class: 'display' }, firstProfitable ? 'Profitable!' : rating),
        kind === 'landed' ? h('div', { class: 'stars', 'aria-label': `${pts} of 7` }, Array.from({ length: 7 }, (_, i) => h('span', { class: i < pts ? 'on' : '' }))) : null,
        h('p', { class: 'lede' }, firstProfitable ? `Your income now covers twice your costs. ${why}` : why),
        h('div', { class: 'row' },
          h('button', { class: 'btn primary big', onclick: () => port(c.pipeline.length ? 'pipeline' : 'prospect', [{ text: `Back at Port Prospect after ${s.day} days away.`, kind: 'info' }]) }, 'Back to Port Prospect'),
          h('button', { class: 'btn ghost', onclick: intro }, 'Title screen'))),
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
        h('div', { class: 'panel' }, h('h3', null, 'Your route'), h('div', { class: 'map-host small-map', id: 'end-map' })))));
    s.map.beam = true;
    PP.ui.renderMap(document.getElementById('end-map'), s, {});
  }

  function unemployed() {
    const c = G.career;
    PP.audio && PP.audio.bed('music:night');
    screen(h('section', { class: 'ending' },
      h('header', { class: 'ending-head' },
        h('div', { class: 'eyebrow' }, `Career over after ${c.days} days and ${c.journeys} journey${c.journeys === 1 ? '' : 's'}`),
        h('h2', { class: 'display' }, 'Unemployed'),
        h('p', { class: 'lede' }, 'Your savings ran out. You take a salaried job at the bank. It has excellent dental, and nobody ever asks you to find out what a client really needs.'),
        ladder('unemployed'),
        h('div', { class: 'row' }, h('button', { class: 'btn primary big', onclick: chooseAgent }, 'Start a new career'))),
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

  function toast(msg) {
    const t = h('div', { class: 'toast', role: 'status' }, msg);
    document.body.appendChild(t);
    setTimeout(() => t.classList.add('out'), 4200);
    setTimeout(() => t.remove(), 4800);
  }
  PP.ui.toast = toast;
})(window.PP);
