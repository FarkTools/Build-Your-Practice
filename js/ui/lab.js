/* Element Lab: one working example of each core element, playable in isolation.
 * Everything here runs on a sandbox state, separate from the main game. */
(function (PP) {
  const h = PP.h;

  PP.ui.mountLab = function (root) {
    root.innerHTML = '';
    const nav = h('nav', { class: 'lab-nav', 'aria-label': 'Lab sections' });
    const body = h('div', { class: 'lab-body' });
    const sections = [
      ['trail', 'Trail & cut scenes', labTrail],
      ['practice', 'Your practice', labPractice],
      ['resources', 'Resources & risk debt', labResources],
      ['map', 'Fog map & world reaction', labMap],
      ['minigames', 'Mini-games', labMinigames],
      ['events', 'Event deck', labEvents],
      ['clients', 'Clients', labClients],
      ['people', 'Skills & contacts', labPeople]
    ];
    let current = PP.store.get('labTab', 'trail');
    if (!sections.find((x) => x[0] === current)) current = 'trail';
    function show(id) {
      current = id;
      PP.store.set('labTab', id);
      nav.querySelectorAll('button').forEach((b) => b.setAttribute('aria-current', b.dataset.id === id ? 'true' : 'false'));
      body.innerHTML = '';
      if (body._stop) { body._stop(); body._stop = null; }
      sections.find((x) => x[0] === id)[2](body);
    }
    sections.forEach(([id, label]) => nav.appendChild(h('button', { 'data-id': id, onclick: () => show(id) }, label)));
    root.append(h('header', { class: 'screen-head' }, h('div', null, h('div', { class: 'eyebrow' }, 'Element Lab'), h('h2', { class: 'display-sm' }, 'Each core piece, on its own')),
      h('p', { class: 'muted' }, 'Sandboxes for every mechanic in the concept. Hidden values are shown here so you can see how the machinery works.')), nav, body);
    show(current);
  };

  const sandbox = (clientId = 'taylor') => {
    const s = PP.newState();
    s.client = PP.content.clients[clientId];
    s.trail = ['port'];
    s.phase = 'journey';
    return s;
  };

  function intro(title, text) {
    return h('div', { class: 'lab-intro' }, h('h3', null, title), h('p', null, text));
  }

  function select(id, label, options, value, onchange) {
    return h('label', { class: 'field', for: id }, h('span', null, label),
      h('select', { id, onchange: (e) => onchange(e.target.value) }, options.map(([v, l]) => h('option', { value: v, selected: v === String(value) }, l))));
  }

  /* ---------------- Trail scene & cut scenes ---------------- */
  function labTrail(root) {
    const canvas = h('canvas', { class: 'trail-canvas', width: 960, height: 320 });
    const scene = new PP.TrailScene(canvas);
    scene.setMoving(true);
    root._stop = () => scene.destroy();
    const kinds = PP.TrailScene.KINDS.map((k) => [k, (Object.values(PP.content.nodes).find((n) => n.kind === k) || { name: k }).name]);
    const cuts = h('div', { class: 'cut-buttons' }, PP.TrailScene.CUTS.map((k) => h('button', { class: 'btn small', onclick: () => {
      const node = Object.values(PP.content.nodes).find((n) => n.kind === scene.terrain);
      scene.cut(k, k === 'arrive' ? { kind: scene.terrain, title: node ? node.name : 'Arriving', caption: node ? node.arrive : '' } : { title: k[0].toUpperCase() + k.slice(1), caption: k === 'debt' ? 'A shortcut you took earlier finally catches up with you.' : '' });
    } }, k)));
    root.append(intro('Trail & cut scenes', 'You and your client hike day by day through terrain that matches each part of the map. Cut scenes play when you reach a landmark, meet someone, or when a past shortcut catches up with you.'),
      h('div', { class: 'stage' }, canvas),
      h('div', { class: 'row wrap' },
        select('tr-terrain', 'Terrain', kinds, scene.terrain, (v) => scene.setTerrain(v)),
        select('tr-pace', 'Pace', [['steady', 'Steady'], ['brisk', 'Brisk'], ['breakneck', 'Breakneck']], 'steady', (v) => scene.setPace(v)),
        h('label', { class: 'field check', for: 'tr-move' }, h('input', { type: 'checkbox', id: 'tr-move', checked: true, onchange: (e) => scene.setMoving(e.target.checked) }), h('span', null, 'Hikers walking')),
        select('tr-lm', 'Landmark in view', [['', 'None']].concat(kinds), '', (v) => scene.setLandmark(v || null))),
      h('div', { class: 'panel' }, h('h4', null, 'Play a cut scene'), cuts));
  }

  /* ---------------- Your practice ---------------- */
  function labPractice(root) {
    const P = PP.content.practice, M = PP.career.money;
    const fake = (trust) => ({ res: { trust } });
    const rows = [
      ['Right destination, high trust', P.payout(fake(8), 'bridge_plan', 'appropriate')],
      ['Acceptable destination', P.payout(fake(6), 'referral', 'acceptable')],
      ['The Grand Plan when it is the wrong fit', P.payout(fake(6), 'grand_plan', 'poor')],
      ['Not Yet Harbor, trust 6+', P.payout(fake(7), 'not_now', 'acceptable')]
    ];
    let agent = 'changer', c = PP.newCareer(agent), log = [];
    const sim = h('div');
    const day = (away) => { log = PP.career.tickDay(c, away).map((n) => n.text).concat(log).slice(0, 8); };
    function renderSim() {
      sim.innerHTML = '';
      sim.append(
        select('lp-agent', 'Agent type', PP.content.agentTypes.map((a) => [a.id, a.name]), agent, (v) => { agent = v; c = PP.newCareer(v); log = []; renderSim(); }),
        h('div', { class: 'practice-nums' },
          [['Day', String(c.days)], ['Savings', M(c.savings)], ['Income', M(PP.career.income(c)) + '/day'], ['Costs', M(PP.career.costs(c)) + '/day'], ['Level', PP.career.levelInfo(c).label], ['Pipeline', String(c.pipeline.length)], ['Clients', String(c.book.filter((b) => ['life', 'steady', 'at-risk'].includes(b.status)).length)]
        ].map(([k, v]) => h('div', { class: 'stat' }, h('span', { class: 'lk' }, k), h('strong', null, v)))),
        h('div', { class: 'row wrap mt' },
          h('button', { class: 'btn small', onclick: () => { log.unshift(PP.content.runSimpleProspecting(c, 'warm').text); day(false); renderSim(); } }, 'Day: warm calls'),
          h('button', { class: 'btn small', onclick: () => { c.book.forEach((b) => (b.sat = Math.min(10, b.sat + 4))); log.unshift('Service day.'); day(false); renderSim(); } }, 'Day: service clients'),
          ...rows.map(([label, pay]) => h('button', { class: 'btn small', onclick: () => { for (let i = 0; i < 18; i++) day(true); c.savings += pay.now; if (pay.status !== 'lost') c.book.push({ id: PP.uid('b'), name: 'Client ' + (c.book.length + 1), status: pay.status, perDay: pay.perDay, sat: pay.sat, journey: c.book.length + 1 }); log.unshift(`18-day journey: ${label}.`); renderSim(); } }, '18-day journey: ' + label)),
          h('button', { class: 'btn small', onclick: () => { c.workspace = c.workspace === 'office' ? 'kitchen' : 'office'; renderSim(); } }, c.workspace === 'office' ? 'Move out of the office' : 'Rent an office'),
          h('button', { class: 'btn ghost small', onclick: () => { c = PP.newCareer(agent); log = []; renderSim(); } }, 'Reset')),
        h('ul', { class: 'plain small mt' }, log.map((l) => h('li', null, l))));
    }
    root.append(intro('Your practice', 'The reason to keep going. Every day costs money: living costs plus rent. Clients pay you every day while they are happy, but satisfaction slips without service days, and unhappy clients cancel. Prospects wait in your pipeline, go cold, and can be taken by rivals while you are away.'),
      h('div', { class: 'lab-cols two' },
        h('div', { class: 'panel' }, h('h4', null, 'Agent types'), h('div', { class: 'table-wrap' }, h('table', { class: 'tbl' },
          h('thead', null, h('tr', null, ['Agent', 'Savings', 'Living', 'Market', 'Perk'].map((x) => h('th', null, x)))),
          h('tbody', null, PP.content.agentTypes.map((a) => h('tr', null, h('th', null, a.name), h('td', null, M(a.savings)), h('td', null, M(a.living) + '/day'), h('td', null, String(a.market)), h('td', { class: 'small' }, a.perk + ': ' + a.perkText))))))),
        h('div', { class: 'panel' }, h('h4', null, 'What each outcome pays'), h('div', { class: 'table-wrap' }, h('table', { class: 'tbl' },
          h('thead', null, h('tr', null, ['Outcome', 'Now', 'Per day', 'Starting satisfaction'].map((x) => h('th', null, x)))),
          h('tbody', null, rows.map(([label, p]) => h('tr', null, h('td', null, label), h('td', null, M(p.now)), h('td', null, M(p.perDay)), h('td', null, String(p.sat))))))),
          h('p', { class: 'small muted' }, `Poor fits can cancel at any time and ${M(P.clawback)} is clawed back. A "not yet" has a small daily chance of coming back as a client.`)),
        h('div', { class: 'panel' }, h('h4', null, 'Building the practice'), h('table', { class: 'tbl' }, h('tbody', null,
          Object.values(P.workspaces).map((w) => h('tr', null, h('th', null, w.name), h('td', { class: 'small' }, `${M(w.rent)}/day. ${w.blurb}`))),
          h('tr', null, h('th', null, 'Partner'), h('td', { class: 'small' }, P.partnerTerms + ` Needs ${P.partnerNeeds} paying clients.`)),
          h('tr', null, h('th', null, 'Recruits'), h('td', { class: 'small' }, `Hire for ${M(P.hireCost)}, train for ${P.trainDays} days, then earn an override. Mentor them every ${P.mentorEvery} days or they may quit. Needs an office and ${P.recruitNeeds} paying clients.`))))),
        h('div', { class: 'panel' }, h('h4', null, 'Systems earned on the trail'), h('table', { class: 'tbl' }, h('tbody', null,
          Object.values(P.systems).map((sy) => h('tr', null, h('th', null, sy.name), h('td', { class: 'small' }, `Mark: ${PP.content.nodes[sy.mark].name}. ${M(sy.cost)}. ${sy.blurb}`))))))),
      h('div', { class: 'panel' }, h('h4', null, 'Try a career'), sim));
    renderSim();
  }

  /* ---------------- Resources & risk debt ---------------- */
  function labResources(root) {
    const s = sandbox();
    const out = h('div', { class: 'lab-log', 'aria-live': 'polite' });
    const view = h('div');
    const shortcuts = [
      ['spreadsheet_assumptions', 2, 'Accept the spreadsheet as-is', { momentum: 2 }],
      ['unverified_details', 2, 'Skip verifying the address', { momentum: 2 }],
      ['fraud', 3, 'Act on an unverified request', { momentum: 2 }],
      ['defaults', 2, 'Click through form defaults', { momentum: 2 }],
      ['missed_message', 1, 'Ignore the inbox', {}]
    ];
    function say(t, cls) { out.prepend(h('div', { class: 'lab-line ' + (cls || '') }, h('span', { class: 'muted small' }, `Turn ${s.turn} · `), t)); }
    function render() {
      view.innerHTML = '';
      view.append(
        h('div', { class: 'lab-cols' },
          h('div', { class: 'panel' }, h('h4', null, 'The four resources'), PP.ui.gauges(s),
            h('div', { class: 'res-buttons' }, PP.RES.map((r) => h('div', { class: 'row tight' }, h('span', { class: 'small', style: { width: '6.5em' } }, r.label),
              h('button', { class: 'btn small', 'aria-label': 'decrease ' + r.label, onclick: () => { PP.apply(s, { [r.id]: -1 }); render(); } }, '−'),
              h('button', { class: 'btn small', 'aria-label': 'increase ' + r.label, onclick: () => { PP.apply(s, { [r.id]: 1 }); render(); } }, '+')))),
            h('p', { class: 'small muted' }, 'These pull against each other. Asking more questions builds Insight and costs Momentum. Speed keeps Momentum and adds hidden risk.')),
          h('div', { class: 'panel' }, h('h4', null, 'Take a shortcut'),
            h('p', { class: 'small muted' }, 'Each button looks like a win (usually +Momentum) and silently records risk debt.'),
            h('div', { class: 'stack' }, shortcuts.map(([tag, sev, label, eff]) => h('button', { class: 'btn', onclick: () => { PP.apply(s, Object.assign({ debt: { tag, sev } }, eff)); say(`Shortcut: ${label}. Nothing happens. Yet.`); render(); } }, label))),
            h('div', { class: 'row mt' },
              h('button', { class: 'btn primary', onclick: advance }, 'Advance a turn'),
              h('button', { class: 'btn ghost', onclick: () => { Object.assign(s, sandbox()); out.innerHTML = ''; render(); } }, 'Reset'))),
          h('div', { class: 'panel' }, h('h4', null, 'Modifiers'),
            select('lab-prep', 'Preparation skill', [['0', '0'], ['1', '1'], ['2', '2 (softens checks)']], s.skills.preparation, (v) => { s.skills.preparation = +v; render(); }),
            select('lab-judg', 'Judgment skill', [['0', '0 (no gut feeling)'], ['1', '1 (vague)'], ['2', '2 (specific)']], s.skills.judgment, (v) => { s.skills.judgment = +v; render(); }),
            h('div', { class: 'gut' }, h('span', { class: 'eyebrow' }, 'What the player feels'), h('span', null, PP.gutFeeling(s) || '(nothing: no Judgment skill)')))),
        h('div', { class: 'panel' }, h('h4', null, 'Hidden risk debt (the player never sees this table)'),
          s.debt.length ? h('div', { class: 'table-wrap' }, h('table', { class: 'tbl' },
            h('thead', null, h('tr', null, ['Shortcut', 'Severity', 'Age', 'Harmless', 'Inconvenient', 'Costly'].map((x) => h('th', null, x)))),
            h('tbody', null, s.debt.map((d) => { const o = PP.debtOdds(s, d); return h('tr', null, h('td', null, PP.content.debts[d.tag].label), h('td', null, '●'.repeat(d.sev)), h('td', null, `${s.turn - d.turn} turn${s.turn - d.turn === 1 ? '' : 's'}${s.turn - d.turn >= 2 ? ' · due' : ''}`), h('td', null, pct(o.harmless)), h('td', null, pct(o.inconvenient)), h('td', null, pct(o.costly))); })))) : h('p', { class: 'muted small' }, 'No debt yet. Take a shortcut.'),
          h('p', { class: 'small muted' }, '`Each turn is a day on the trail. Debt can surface once it is ${PP.DEBT_MIN_AGE} days old (${Math.round(PP.DEBT_DAILY_CHANCE * 100)}% chance per day), and always surfaces by ${PP.DEBT_MAX_AGE} days. Anything left rolls once more at the end of the journey.`')),
        h('div', { class: 'panel' }, h('h4', null, 'What happened'), out));
    }
    function advance() {
      const before = Object.assign({}, s.res);
      s.turn++;
      const d = PP.dueDebt(s);
      if (!d) { say('A quiet turn. Nothing came due.'); return render(); }
      const def = PP.content.debts[d.tag];
      const o = PP.rollDebt(s, d);
      const eff = o === 'harmless' ? null : def[o].eff;
      PP.apply(s, eff);
      PP.settleDebt(s, d, o);
      say(h('span', null, h('strong', null, def.check + ' '), o === 'harmless' ? def.harmless : def[o].text, ' ', h('span', { class: 'pill o-' + o }, o)), 'o-' + o);
      render();
    }
    const pct = (x) => Math.round(x * 100) + '%';
    root.append(intro('Resources & risk debt', 'Four resources that pull against each other, plus hidden risk debt: shortcuts that look free, get recorded quietly, and come due a few turns later as harmless, inconvenient or costly.'), view);
    render();
  }

  /* ---------------- Fog map ---------------- */
  function labMap(root) {
    const s = sandbox();
    const mapHost = h('div', { class: 'map-host', id: 'lab-map' });
    const controls = h('div', { class: 'panel' });
    function render() {
      PP.ui.renderMap(mapHost, s, { onMove: (id) => { s.map.current = id; s.map.visited[id] = true; s.trail.push(id); render(); } });
      controls.innerHTML = '';
      controls.append(h('h4', null, 'Working style'),
        h('p', { class: 'small muted' }, 'The map reacts to how you operate. Drag these to see it.'),
        ...PP.STYLE.map((x) => h('label', { class: 'field slider', for: 'st-' + x.id },
          h('span', null, h('strong', null, x.label), h('span', { class: 'small muted' }, ' → ' + x.place)),
          h('input', { type: 'range', id: 'st-' + x.id, min: 0, max: 5, value: s.style[x.id], oninput: (e) => { s.style[x.id] = +e.target.value; render(); } }))),
        h('h4', { class: 'mt' }, 'Seeing through the fog'),
        select('lab-nav', 'Navigation skill', [['0', '0: only glimpses of neighbours'], ['1', '1: names of neighbours'], ['2', '2: names even in thick fog']], s.skills.navigation, (v) => { s.skills.navigation = +v; render(); }),
        h('label', { class: 'field check', for: 'lab-beam' }, h('input', { type: 'checkbox', id: 'lab-beam', checked: s.map.beam, onchange: (e) => { s.map.beam = e.target.checked; render(); } }), h('span', null, 'Lighthouse beam (reveals every name)')),
        h('button', { class: 'btn ghost', onclick: () => { Object.assign(s, sandbox()); render(); } }, 'Reset map'),
        h('p', { class: 'small muted' }, 'Click glowing markers to explore. Fog lifts around places you visit.'));
    }
    root.append(intro('Fog map & world reaction', 'Your map from the concept doc. Parchment clouds cover places you have not reached yet and lift as you travel. The geography also reflects your working style, so the same world feels different across runs.'),
      h('div', { class: 'lab-map-grid' }, h('div', { class: 'map-wrap' }, mapHost), controls));
    render();
  }

  /* ---------------- Mini-games ---------------- */
  function labMinigames(root) {
    let clientId = 'taylor', prep = 0, practice = true, running = null;
    const stage = h('div', { class: 'lab-stage' });
    const opts = h('div', { class: 'row wrap' },
      select('mg-client', 'Client', Object.values(PP.content.clients).map((c) => [c.id, c.name + ' · ' + c.title]), clientId, (v) => (clientId = v)),
      select('mg-prep', 'Preparation', [['0', '0'], ['1', '1 (more time)'], ['2', '2 (much more time)']], prep, (v) => (prep = +v)),
      h('label', { class: 'field check', for: 'mg-practice' }, h('input', { type: 'checkbox', id: 'mg-practice', checked: true, onchange: (e) => (practice = e.target.checked) }), h('span', null, 'Practice feedback (off = journey mode, where bad calls look fine)')));
    const cards = h('div', { class: 'mg-cards' }, Object.entries(PP.minigames).map(([id, mg]) =>
      h('article', { class: 'panel mg-card' }, h('div', { class: 'eyebrow' }, 'Risk: ' + mg.risk), h('h4', null, mg.title), h('p', { class: 'small' }, mg.blurb),
        h('button', { class: 'btn primary', onclick: () => run(id) }, 'Play'))));
    function run(id) {
      if (running) running.stop();
      const s = sandbox(clientId);
      s.skills.preparation = prep;
      stage.innerHTML = '';
      const inner = h('div', { class: 'scene mg-stage' });
      stage.appendChild(inner);
      stage.scrollIntoView({ behavior: 'smooth', block: 'start' });
      running = PP.minigames[id].start(inner, { state: s, client: s.client, prep, practice }, (res) => {
        running = null;
        stage.innerHTML = '';
        stage.append(h('div', { class: 'panel' }, h('h4', null, 'What this would do to a journey'),
          PP.ui.effectChips(res.eff, { client: s.client, showStyle: true }),
          h('p', { class: 'small muted' }, 'In the real game, risk debt and missed facts are hidden until they surface later.'),
          h('button', { class: 'btn', onclick: () => run(id) }, 'Play again')));
      });
    }
    root._stop = () => running && running.stop();
    root.append(intro('Mini-games', 'Each mini-game is a real judgment risk, and its result feeds back into the journey: insight, trust, momentum, and sometimes hidden risk debt. Document Dash, The Conversation and Fraud or Friend are judgment games from the concept doc. Call-a-thon, the Mixer and the Farmers Market are prospecting games played at the port. Inbox Rapids and the Snake Pit are the action games.'), opts, cards, stage);
    root.parentNode && (root.parentNode._stop = root._stop);
  }

  /* ---------------- Event deck ---------------- */
  function labEvents(root) {
    let clientId = 'taylor', filter = 'all';
    let s = sandbox(clientId);
    const list = h('div', { class: 'event-list' });
    const stage = h('div', { class: 'lab-stage' });
    const places = [['all', 'All places']].concat(Object.entries(PP.content.nodes).filter(([id]) => PP.content.events.some((e) => e.at.includes(id))).map(([id, n]) => [id, n.name]), [['travel', 'On the road']]);
    const skillToggles = h('div', { class: 'row wrap' });
    function renderToggles() {
      skillToggles.innerHTML = '';
      ['curiosity', 'communication', 'judgment'].forEach((k) => skillToggles.append(h('label', { class: 'field check', for: 'ev-' + k }, h('input', { type: 'checkbox', id: 'ev-' + k, checked: s.skills[k] > 0, onchange: (e) => { s.skills[k] = e.target.checked ? 1 : 0; renderList(); } }), h('span', null, PP.SKILLS.find((x) => x.id === k).label))));
      ['veteran', 'specialist', 'operator', 'whisperer', 'connector'].forEach((k) => skillToggles.append(h('label', { class: 'field check', for: 'ev-c-' + k }, h('input', { type: 'checkbox', id: 'ev-c-' + k, checked: s.contacts.includes(k), onchange: (e) => { if (e.target.checked) { s.contacts.push(k); s.contactUses[k] = 9; } else s.contacts = s.contacts.filter((x) => x !== k); renderList(); } }), h('span', null, PP.content.contacts[k].who))));
    }
    function renderList() {
      list.innerHTML = '';
      PP.content.events.filter((e) => filter === 'all' || e.at.includes(filter)).forEach((e) => {
        const ok = !e.when || e.when(s);
        const shown = e.choices.filter((c) => !c.show || c.show(s)).length;
        list.append(h('article', { class: 'panel ev' + (ok ? '' : ' dim') },
          h('div', { class: 'row tight between' }, h('div', null, h('div', { class: 'eyebrow' }, e.at.map((a) => (a === 'travel' ? 'On the road' : PP.content.nodes[a].name)).join(' · ') + (e.first ? ' · first visit' : '')), h('h4', null, e.title)),
            h('button', { class: 'btn small', onclick: () => play(e) }, 'Play')),
          h('p', { class: 'small' }, PP.val(e.text, s)),
          h('ul', { class: 'ev-choices' }, e.choices.map((c) => {
            const vis = !c.show || c.show(s);
            return h('li', { class: vis ? '' : 'dim' }, h('span', { class: 'kind-chip k-' + c.kind }, PP.ui.KIND[c.kind]), ' ', c.label, vis ? '' : ' (locked: needs a skill, contact or item)');
          })),
          !ok ? h('p', { class: 'small muted' }, 'Condition not met for this client right now.') : null,
          h('p', { class: 'small muted' }, `${shown} of ${e.choices.length} options available with current skills and contacts.`)));
      });
    }
    function play(e) {
      const fresh = sandbox(clientId);
      fresh.skills = Object.assign({}, s.skills);
      fresh.contacts = s.contacts.slice();
      fresh.contacts.forEach((k) => (fresh.contactUses[k] = 1));
      fresh.map.current = e.at[0] === 'travel' ? 'meadows' : e.at[0];
      fresh.career = PP.newCareer();
      fresh.map.visited.summit = true;
      stage.innerHTML = '';
      const before = Object.assign({}, fresh.res);
      PP.ui.runScene(stage, e, { state: fresh, lab: true, onDone: () => {
        stage.innerHTML = '';
        stage.append(h('div', { class: 'panel' }, h('h4', null, 'Sandbox after the event'), PP.ui.gauges(fresh, before),
          fresh.debt.length ? h('p', { class: 'small' }, 'Hidden debt now: ' + fresh.debt.map((d) => PP.content.debts[d.tag].label.toLowerCase()).join('; ')) : null,
          h('button', { class: 'btn', onclick: () => play(e) }, 'Replay')));
      } });
      stage.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }
    root.append(intro('Event deck', `${PP.content.events.length} reusable events, each with Go through / Go around / Prepare / Get help options. Toggle skills and contacts to see options unlock. Play any event: in the Lab, every choice shows its full effect, including the hidden risk.`),
      h('div', { class: 'row wrap' },
        select('ev-client', 'Client', Object.values(PP.content.clients).map((c) => [c.id, c.name]), clientId, (v) => { clientId = v; const k = s.skills, cs = s.contacts, cu = s.contactUses; s = sandbox(v); s.skills = k; s.contacts = cs; s.contactUses = cu; renderList(); }),
        select('ev-place', 'Place', places, filter, (v) => { filter = v; renderList(); })),
      skillToggles, stage, list);
    renderToggles();
    renderList();
  }

  /* ---------------- Clients ---------------- */
  function labClients(root) {
    root.append(intro('Clients', 'Each prospect is a character: different patience, communication preferences, hidden facts and stakeholders. The destination is not known at the start. What you discover decides which landing spots appear.'),
      h('div', { class: 'client-grid' }, Object.values(PP.content.clients).map((c) => h('article', { class: 'panel' },
        h('div', { class: 'row tight' }, PP.ui.avatar(c, 48), h('div', null, h('h4', null, c.name), h('div', { class: 'small muted' }, c.title))),
        h('p', null, c.opener),
        h('dl', { class: 'kv' },
          h('dt', null, 'Looks like'), h('dd', null, c.surface),
          h('dt', null, 'Prefers'), h('dd', null, { call: 'Phone calls', email: 'Email', text: 'Text messages' }[c.prefers]),
          h('dt', null, 'Patience'), h('dd', null, `Checks in every ${c.patience} moves (−1 Momentum)`),
          h('dt', null, 'Complexity'), h('dd', null, c.complexity === 'high' ? 'Loves detail' : 'Keep it simple')),
        h('div', { class: 'eyebrow mt' }, 'Hidden facts'),
        h('ul', { class: 'facts' }, Object.entries(c.facts).map(([id, f]) => h('li', { class: f.key ? 'key' : '' }, f.label, f.key ? ' (changes the destination)' : ''))),
        h('div', { class: 'eyebrow mt' }, 'Destinations'),
        h('ul', { class: 'dest-list' }, Object.entries(c.fit).map(([d, fit]) => h('li', null, h('span', { class: 'pill fit-' + fit }, fit), ' ', PP.content.destinations[d].name,
          c.unlocks[d] ? h('span', { class: 'small muted' }, ' · appears once you know: ' + c.unlocks[d].map((f) => c.facts[f].label.toLowerCase()).join(', ')) : (d === 'grand_plan' || d === 'not_now' ? h('span', { class: 'small muted' }, ' · always visible') : null))))))));
  }

  /* ---------------- People ---------------- */
  function labPeople(root) {
    root.append(intro('Skills & contacts', 'Skills reveal options, warnings and information rather than adding points. Contacts are equipment: limited slots, limited uses, each with one special ability.'),
      h('div', { class: 'lab-cols two' },
        h('div', { class: 'panel' }, h('h4', null, 'Skills'), h('table', { class: 'tbl' }, h('tbody', null, PP.SKILLS.map((k) => {
          const src = PP.content.npcs.filter((n) => (n.talk && n.talk.eff.skill && n.talk.eff.skill[k.id]) || (n.quest && n.quest.reward.skill[k.id])).map((n) => n.name);
          return h('tr', null, h('th', null, k.label), h('td', null, k.blurb, h('div', { class: 'small muted' }, 'Learn from: ' + (src.join(', ') || '—'))));
        })))),
        h('div', { class: 'panel' }, h('h4', null, 'Contacts'), h('table', { class: 'tbl' }, h('tbody', null, Object.entries(PP.content.contacts).map(([id, c]) => h('tr', null, h('th', null, c.name, h('div', { class: 'small muted' }, c.who)), h('td', null, c.ability, h('div', { class: 'small muted' }, c.when))))))),
        h('div', { class: 'panel' }, h('h4', null, 'Pack items'), h('table', { class: 'tbl' }, h('tbody', null, Object.values(PP.content.items).map((it) => h('tr', null, h('th', null, it.name), h('td', null, it.blurb)))))),
        h('div', { class: 'panel' }, h('h4', null, 'Port rules'), h('ul', { class: 'plain' },
          h('li', null, `A prospect arrives after ${PP.content.portRules.prospectAfter} actions at the port.`),
          h('li', null, 'After that, every extra action costs 1 Momentum while the client waits.'),
          h('li', null, `Contact slots: 2, or 3 with Resourcefulness. Each contact helps once per journey (twice with Resourcefulness).`),
          h('li', null, `Pack: ${PP.content.packSize} items.`)))));
  }
})(window.PP);
