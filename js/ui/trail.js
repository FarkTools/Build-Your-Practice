/* The journey: hiking the trail with your client, day by day.
 *
 * At a landmark you get a menu of tappable choices. Continuing shows the forks
 * (with days), then you and your client hike day by day. Each day can bring an
 * encounter, a risk-debt check, or the client asking "are we there yet?".
 * Reaching a landmark plays a cut scene and its event. Clients for Life ends it.
 */
(function (PP) {
  const h = PP.h;
  const PACE = {
    steady: { label: 'Steady', speed: 1, blurb: 'One trail-day per day. Energy holds up. The client gets impatient.' },
    brisk: { label: 'Brisk', speed: 1.5, blurb: 'Faster. Costs more energy.' },
    breakneck: { label: 'Breakneck', speed: 2, blurb: 'Twice as fast. Burns energy, and corners get cut without you noticing.' }
  };
  const WEATHER = ['Clear skies. 3 unread emails.', 'Light drizzle of meeting invites.', 'Overcast, with a chance of scope creep.', 'Warm. Someone is microwaving fish two towns over.', 'Breezy. Your calendar is wide open, which is suspicious.', 'Foggy in the mornings. Nobody remembers anything before coffee.', 'Sunny. The client is in a good mood.', 'Windy. Several memos blow past.', 'Humid. Every spreadsheet feels heavier.'];
  const PEOPLE = {
    port: [{ who: 'Marge, waving from the dock', line: '"Remember: the shortcut that works is the one that gets you. Write things down!"' }],
    meadows: [{ who: 'A sprite-wrangler with a butterfly net', line: '"Answer the weather once, then ask a real question. The sprites can\'t stand a real question. They fly off in a huff, and the client finally talks."', eff: { insight: 1 } }],
    lighthouse: [{ who: 'A fisherman mending nets', line: '"The Oracle told me \'the net that is never mended catches only wind.\' Took me ten years. She meant check in with your people. Also, stay off those rocks: the Sirens are singing again."' }],
    wreck: [{ who: 'A damp agent drying his socks', line: '"They sang \'sign today\' and I signed today. The client un-signed tomorrow. Bring earplugs, and let them talk first."' }],
    fog: [{ who: 'A traveler who followed a wisp in here', line: '"Lovely little light. Said the deadline was next year. It was last Tuesday. Write down dates. Write down everything."', eff: { insight: 1 } }],
    loop: [{ who: 'A clerk on lap 14 of the Ouroboros', line: '"It\'s eaten the same address form forty times since spring. Tip: feed it once, properly, and it stops being hungry."', eff: { insight: 1 } }],
    cliffs: [{ who: 'A harpy-watcher with binoculars', line: '"Hear that shrieking? Product names. They only swoop on agents who talk first. Sit down, ask a question, and they get bored and leave."' }],
    swamp: [{ who: 'A hydra hunter in a green visor', line: '"Never cut a head off in a hurry. Two grow back. Find out what the whole beast is FOR, then cut at the root."' }],
    snakepit: [{ who: 'A former Gorgon victim, mostly un-stoned', line: '"I let one call go a week. Then two weeks. Next thing, my left arm was granite. Call people back. Even just to say you\'ll call them back."' }],
    sands: [{ who: 'A nomad wearing nine contest lanyards', line: '"The Djinn gave me a trip every year for a decade. Took a client every year too. That was the fine print. The trips were nice. I don\'t remember them."', eff: { insight: 1 } }],
    caves: [{ who: 'An old miner with a lantern', line: '"The dragon\'s not as fierce as it looks. It just sleeps on the questions nobody wanted to ask. Go slow, bring a light, and let the client wake it."', eff: { insight: 1 } }],
    summit: [{ who: 'The Sphinx\'s assistant', line: '"She loves context and hates \'see below.\' Send it ahead and she sometimes skips the riddles. Sometimes."' }],
    isles: [{ who: 'A ferryman who rows past the Kraken daily', line: '"Every tentacle wants a different code. The trick is to have them all ready before it surfaces. Also, the password hint is always the pet\'s name. Always."' }],
    toll: [{ who: 'The Troll\'s cousin, selling snacks by the bridge', line: '"He\'s not mean. He just likes tidy files. You\'d be amazed how few people keep tidy files. Brings a tear to his eye when someone does."' }]
  };

  const T = (PP.trail = {});
  const put = (el, ...kids) => kids.flat().forEach((k) => k && el.appendChild(k));
  T.dayInJourney = () => T.s.day;

  PP.ui.startTrail = function (root, s, hooks) {
    T.s = s; T.hooks = hooks; T.root = root; T.mode = 'menu'; T.narr = []; T.timer = null; T.lastSavings = null;
    window.scrollTo({ top: 0 });
    s.pace = s.pace || 'steady';
    root.innerHTML = '';
    const canvas = h('canvas', { class: 'trail-canvas', width: 960, height: 320, 'aria-label': 'The trail: you and your client hiking through the landscape' });
    T.ledger = h('div', { class: 'ledger' });
    T.journal = h('div', { class: 'journal', 'aria-live': 'polite' });
    T.side = h('aside', { class: 'trail-side' });
    root.append(h('section', { class: 'trail' },
      h('div', { class: 'stage' }, canvas),
      T.ledger,
      h('div', { class: 'trail-grid' }, T.journal, T.side)));
    if (T.scene) T.scene.destroy();
    T.scene = new PP.TrailScene(canvas);
    T.scene.setTerrain('port'); T.scene.setLandmark('port'); T.scene.setPace(s.pace);
    if (T.keys) document.removeEventListener('keydown', T.keys);
    T.keys = onKey; document.addEventListener('keydown', T.keys);
    renderLedger(); renderSide();
    if (s.followUp) say(s.client.followCall || `${s.client.name} called. Life has changed.`);
    say(s.resumed ? `Day ${s.day}. You and ${s.client.name} head out of Port Prospect again, picking up where you left off.` : s.followUp ? `Day 1. You and ${s.client.name} set out again, lap ${s.followUp.lap} of your relationship. They already trust you, so the trails feel shorter.` : `Day 1. You and ${s.client.name} shoulder your packs at Port Prospect.` + (PP.you && PP.you(s.career) ? ` "Lead the way, ${PP.you(s.career)}."` : ''));
    T.scene.cut('depart', { title: 'Leaving Port Prospect', caption: `${s.client.name}: ${s.client.opener}` }).then(() => menu());
    showJournal(h('p', { class: 'muted' }, 'Lacing up your boots…'));
  };

  /* ---------- helpers ---------- */
  const C = () => T.s.client.name;
  function say(text, cls) { T.narr.push({ text, cls }); if (T.narr.length > 40) T.narr.shift(); }
  function goalLine() {
    const s = T.s;
    const narrow = window.matchMedia && window.matchMedia('(max-width: 560px)').matches;
    const open = narrow ? !!PP.store.get('goalOpen', false) : true;
    return h('details', { class: 'goal', open, ontoggle: (e) => { if (narrow) PP.store.set('goalOpen', e.target.open); } },
      h('summary', null, h('span', { class: 'eyebrow' }, 'Goals'), h('span', { class: 'goal-peek' }, ` Guide ${s.client.name} to the plan that fits`)),
      h('div', null, h('span', { class: 'eyebrow' }, 'This journey'), s.followUp ? ` ${s.client.name}'s life changed: ${s.followUp.title.toLowerCase()}. Find out what it really means for them, and see the relationship through to the next plan.` : ` Build rapport, find the facts, understand the risks, and guide ${s.client.name} to the plan that truly fits, with their trust intact.`),
      s.career ? h('div', null, h('span', { class: 'eyebrow' }, 'Your career'), ` Build a Profitable practice before your savings run out. Every day away costs ${PP.career.money(PP.career.costs(s.career))}, and your clients and prospects back at the port are waiting.`) : null);
  }
  function narration(n = 3) {
    return h('div', { class: 'narr' }, T.narr.slice(-n).map((l, i, a) => h('p', { class: (l.cls || '') + (i === a.length - 1 ? ' latest' : '') }, l.text)));
  }
  function showJournal(...kids) { T.journal.innerHTML = ''; kids.forEach((k) => k && T.journal.appendChild(k)); }
  function menuList(items) {
    return h('ol', { class: 'menu' }, items.map((it, i) => h('li', null, h('button', { class: 'menu-item' + (it.primary ? ' primary' : ''), disabled: it.disabled, onclick: it.go },
      h('span', { class: 'num' }, String(i + 1)), h('span', { class: 'mi-label' }, it.label), it.note ? h('span', { class: 'mi-note' }, it.note) : null, h('span', { class: 'chev', 'aria-hidden': 'true' }, '›')))));
  }
  function onKey(e) {
    if (!T.root || !T.root.isConnected) return;
    if (e.target && /INPUT|SELECT|TEXTAREA/.test(e.target.tagName)) return;
    if (document.querySelector('.overlay')) { const m = document.querySelector('.overlay.map-overlay'); if (e.key === 'Escape' && m) m.remove(); return; }
    if (T.journal.querySelector('.mg')) return;
    if (e.key === ' ' && T.mode === 'traveling') { e.preventDefault(); stopTravel(); return; }
    if (e.key === ' ' || e.key === 'Enter') { if (T.scene.cutState) { e.preventDefault(); T.scene.skip(); } return; }
    const n = parseInt(e.key, 10);
    if (!n) return;
    const btns = [...T.journal.querySelectorAll('.menu-item:not([disabled]), .choice')];
    const all = [...T.journal.querySelectorAll('.menu-item, .choice')];
    const b = all[n - 1];
    if (b && btns.includes(b)) { e.preventDefault(); b.click(); }
  }
  const nodeName = (id) => PP.content.nodes[id].name;

  function nextLandmarkText() {
    const s = T.s;
    if (s.seg) {
      const v = PP.visibility(s, s.seg.to);
      const nm = v === 'uncharted' || v === 'rumored' ? 'somewhere uncharted' : nodeName(s.seg.to);
      const d = Math.max(1, Math.ceil(s.seg.left / PACE[s.pace].speed));
      return `${nm}, ${d} day${d > 1 ? 's' : ''}`;
    }
    return 'You are at ' + nodeName(s.map.current);
  }

  function renderLedger(prev) {
    const s = T.s;
    T.ledger.innerHTML = '';
    T.ledger.classList.toggle('open', !!PP.store.get('ledgerOpen', false));
    put(T.ledger,
      compactLedger(s, prev),
      h('div', { class: 'ledger-cell' }, h('span', { class: 'lk' }, 'Day'), h('strong', null, String(s.day))),
      h('div', { class: 'ledger-cell wide' }, h('span', { class: 'lk' }, s.seg ? 'Next landmark' : 'Location'), h('strong', null, nextLandmarkText())),
      h('div', { class: 'ledger-cell' }, h('span', { class: 'lk' }, 'Pace'), h('strong', null, PACE[s.pace].label)),
      s.career ? moneyCell(s.career, prev) : null,
      h('div', { class: 'ledger-cell wide weather' }, h('span', { class: 'lk' }, 'Conditions'), h('span', null, T.weather || WEATHER[0])),
      PP.ui.gauges(s, prev),
      stageStrip(s));
    T.lastSavings = s.career ? s.career.savings : 0;
  }

  /* Phone: one tappable line with the essentials. Tap it to see the full ledger. */
  function compactLedger(s, prev) {
    const c = s.career, st = PP.stageStatus(s), done = st.filter((x) => x.done).length;
    const cur = st.find((x) => x.current);
    const runway = c ? PP.career.runway(c) : Infinity;
    const lvl = c ? PP.career.levelInfo(c) : null;
    const toggle = () => { const open = !T.ledger.classList.contains('open'); T.ledger.classList.toggle('open', open); PP.store.set('ledgerOpen', open); btn.setAttribute('aria-expanded', String(open)); };
    const btn = h('button', { class: 'ledger-compact', 'aria-expanded': String(T.ledger.classList.contains('open')), 'aria-label': 'Show or hide journey details', onclick: toggle },
      h('span', { class: 'lc-top' },
        h('span', { class: 'lc-day' }, 'Day ', h('strong', null, String(s.day))),
        c ? h('span', { class: 'lc-money lvl-' + lvl.id }, h('strong', null, PP.career.money(c.savings)), runway !== Infinity ? h('span', { class: runway <= 5 ? 'warn' : '' }, ` · ${runway}d left`) : null) : null,
        h('span', { class: 'lc-stage' }, cur ? cur.label : 'All stages', ` ${done}/${st.length}`),
        h('span', { class: 'lc-chev', 'aria-hidden': 'true' }, '▾')),
      h('span', { class: 'lc-gauges' }, PP.RES.map((r) => {
        const v = s.res[r.id], d = prev ? v - prev[r.id] : 0;
        return h('span', { class: 'lc-g g-' + r.id, title: r.label },
          h('span', { class: 'lc-gl' }, r.label.slice(0, 1)),
          h('span', { class: 'lc-track' }, h('span', { class: 'gauge-fill', style: { width: v * 10 + '%' } })),
          h('strong', null, String(v)),
          d ? h('span', { class: 'gauge-delta ' + (d > 0 ? 'up' : 'down') }, (d > 0 ? '+' : '') + d) : null);
      })));
    return btn;
  }

  function stageStrip(s) {
    return h('div', { class: 'stage-strip', 'aria-label': 'The relationship so far' },
      h('span', { class: 'lk' }, s.followUp ? `Relationship · lap ${s.followUp.lap}` : 'Relationship'),
      h('ol', null, PP.stageStatus(s).map((st) => h('li', { class: st.done ? 'done' : st.current ? 'current' : '', title: st.blurb }, st.label))));
  }
  function moneyCell(c) {
    const lvl = PP.career.levelInfo(c);
    const inc = PP.career.income(c), cost = PP.career.costs(c);
    const runway = PP.career.runway(c);
    const d = T.lastSavings != null ? c.savings - T.lastSavings : 0;
    return h('div', { class: 'ledger-cell wide money lvl-' + lvl.id },
      h('span', { class: 'lk' }, 'Savings · ' + lvl.label),
      h('strong', null, PP.career.money(c.savings), d ? h('span', { class: 'gauge-delta ' + (d > 0 ? 'up' : 'down') }, ' ' + (d > 0 ? '+' : '') + PP.career.money(d)) : null),
      h('span', { class: 'small' }, `${PP.career.money(inc)}/day in · ${PP.career.money(cost)}/day out` + (runway !== Infinity ? ` · ${runway} days left` : '')));
  }

  function homePanel(c) {
    const active = c.book.filter((b) => ['life', 'steady', 'at-risk'].includes(b.status));
    const avg = active.length ? active.reduce((a, b) => a + b.sat, 0) / active.length : 0;
    const soon = c.pipeline.slice().sort((a, b) => a.expires - b.expires)[0];
    return h('div', { class: 'panel home-panel' }, h('h4', null, 'Back at the port'),
      h('p', { class: 'small' }, active.length ? `${active.length} client${active.length > 1 ? 's' : ''}, average satisfaction ${avg.toFixed(1)}/10${avg < 4.5 ? ' (getting restless)' : ''}.` : 'No clients yet.'),
      h('p', { class: 'small' }, c.pipeline.length ? `${c.pipeline.length} prospect${c.pipeline.length > 1 ? 's' : ''} waiting. ${soon.name} goes cold in ${soon.expires - c.days} day${soon.expires - c.days === 1 ? '' : 's'}.` : 'Nobody waiting in your pipeline.'),
      c.partner ? h('p', { class: 'small muted' }, 'Your partner is looking after your clients.') : null);
  }

  function renderSide() {
    const s = T.s, c = s.client;
    const known = Object.keys(c.facts).filter((f) => s.facts[f] != null);
    const unknown = Object.keys(c.facts).length - known.length;
    const gut = PP.gutFeeling(s);
    const mapThumb = h('button', { class: 'map-thumb', onclick: openMap, 'aria-label': 'Open the map' });
    T.side.innerHTML = '';
    put(T.side,
      h('div', { class: 'panel client-card' },
        h('div', { class: 'row tight' }, PP.ui.avatar(c, 40), h('div', null, h('strong', null, c.name), h('div', { class: 'small muted' }, c.title))),
        h('div', { class: 'eyebrow mt' }, 'What you know'),
        h('ul', { class: 'facts' }, [h('li', { class: 'surface' }, c.surface), ...known.map((f) => h('li', { class: c.facts[f].key ? 'key' : '' }, c.facts[f].label))]),
        unknown ? h('div', { class: 'small muted' }, `${unknown} thing${unknown > 1 ? 's' : ''} you have not found out yet. Check in with ${c.name} to learn more.`) : h('div', { class: 'small good-text' }, 'You understand this client well.')),
      gut ? h('div', { class: 'gut' }, h('span', { class: 'eyebrow' }, 'Gut feeling'), h('span', null, gut)) : null,
      s.career ? homePanel(s.career) : null,
      h('div', { class: 'panel map-panel' }, h('div', { class: 'panel-head' }, h('h4', null, 'Map'), h('button', { class: 'btn small', onclick: openMap }, 'Open')), mapThumb),
      h('details', { class: 'panel log' }, h('summary', null, 'Trail diary'), h('ol', null, T.narr.slice().reverse().slice(0, 40).map((l) => h('li', { class: l.cls || '' }, l.text)))));
    PP.ui.renderMap(mapThumb, s, {});
  }

  function refresh(prev) { renderLedger(prev); renderSide(); }

  /* ---------- Menus ---------- */
  function menu(extra) {
    const s = T.s;
    T.mode = 'menu';
    T.scene.setMoving(false);
    PP.audio && PP.audio.bed('amb:' + (s.seg ? T.scene.terrain : PP.content.nodes[s.map.current].kind));
    if (!s.seg) { T.scene.setTerrain(PP.content.nodes[s.map.current].kind); T.scene.setLandmark(PP.content.nodes[s.map.current].kind); }
    else T.scene.setLandmark(null);
    refresh();
    const here = s.seg ? null : s.map.current;
    const people = here && (PEOPLE[here] || []).filter((p, i) => !s.talked[here + i]);
    const items = [];
    items.push({ label: s.seg ? 'Continue on the trail' : 'Continue on the trail', note: s.seg ? nextLandmarkText() : 'See where the trail goes from here', go: s.seg ? travel : forks, primary: true });
    // Walked back into town? You can pause the journey and pick it up later from the Trailhead.
    if (here === 'port' && s.career && s.trail.length > 1) items.push({ label: 'Head into town', note: `Pause this journey. ${C()} waits at the Trailhead and remembers everything so far.`, go: goHome });
    const openHere = here ? PP.passagesAt(here).filter((p) => PP.passageOpen(s, p)) : [];
    if (here && openHere.length && !s.passageTaken[here] && !s.faced[here]) items.push({ label: 'Take a hidden passage', note: openHere.map((p) => p.name).join(' or '), go: () => passageFork(here, PP.content.nodes[here], openHere, PP.passagesAt(here).filter((p) => !openHere.includes(p)), () => menu()) });
    items.push({ label: `Check in with ${C()}`, note: s.lastCheckin === s.day ? 'Already talked today' : 'Ask questions, learn what matters', go: checkin });
    if (people && people.length) items.push({ label: 'Talk to people here', note: people[0].who, go: talk });
    items.push({ label: 'Rest for a day', note: `Energy +3, but ${C()} waits`, go: rest });
    items.push({ label: 'Look at the map', go: openMap });
    items.push({ label: 'Change pace', note: 'Now: ' + PACE[s.pace].label, go: paceMenu });
    items.push({ label: 'Pack and contacts', note: packNote(), go: packMenu });
    showJournal(
      goalLine(),
      narration(extra ? 2 : 3),
      extra || null,
      here ? passageHint(here) : null,
      h('p', { class: 'you-may' }, 'What will you do? Tap one.'),
      menuList(items));
    focusFirst();
  }
  /* Show which hidden passages exist here, so players know what to work toward. */
  function passageHint(id) {
    const s = T.s, ps = PP.passagesAt(id);
    if (!ps.length) return null;
    const taken = s.passageTaken[id];
    return h('div', { class: 'passage-hint' }, h('span', { class: 'eyebrow' }, 'Hidden passages here'),
      h('ul', null, ps.map((p) => {
        const ok = PP.passageOpen(s, p);
        return h('li', { class: taken === p.id ? 'used' : ok ? 'open' : 'locked' }, h('strong', null, p.name), ' · ', taken === p.id ? 'you took this one' : ok ? (s.faced[id] || s.passageTaken[id] ? 'open to you next time' : 'open to you now') : 'needs ' + PP.passageNeed(p));
      })));
  }
  function focusFirst() { const b = T.journal.querySelector('.menu-item:not([disabled]), .choice'); if (b) b.focus({ preventScroll: true }); }
  function packNote() {
    const s = T.s;
    const usable = s.pack.filter((id) => !s.usedItems[id]).length;
    const ready = s.contacts.filter((id) => PP.contactReady(s, id)).length;
    return `${usable} item${usable === 1 ? '' : 's'}, ${ready} contact${ready === 1 ? '' : 's'} on call`;
  }
  function back() { return h('button', { class: 'btn ghost', onclick: () => menu() }, 'Back'); }
  function goHome() {
    say(`You walk ${C()} back into Port Prospect. "Call me when you're ready to pick this up," they say.`);
    finish('home');
  }

  /* ---------- Forks ---------- */
  function forks() {
    const s = T.s;
    const here = s.map.current;
    const node = PP.content.nodes[here];
    const opts = PP.content.trails.filter((t) => t.a === here || t.b === here).map((t) => {
      const to = t.a === here ? t.b : t.a;
      const v = PP.visibility(s, to);
      const known = v === 'visited' || v === 'named';
      const days = Math.max(1, Math.ceil((trailDays(s, t) - (s.passageBoost || 0)) / PACE[s.pace].speed));
      const isBack = s.cameFrom === to;
      const locked = false;
      return { t, to, known, days, isBack, locked, v };
    }).sort((a, b) => (a.isBack - b.isBack) || (a.locked - b.locked) || ((a.t.kind === 'side') - (b.t.kind === 'side')));
    const items = opts.map((o) => ({
      label: (o.isBack ? 'Go back to ' : 'Head for ') + (o.known ? nodeName(o.to) : 'somewhere uncharted') + ` (${o.days} day${o.days > 1 ? 's' : ''})`,
      note: o.locked ? o.t.desc : (o.isBack ? 'The way you came.' : o.t.desc) + (o.t.kind === 'side' ? ' A side trail: it does not go on from there.' : ''),
      disabled: o.locked,
      go: () => depart(o.t, o.to)
    }));
    showJournal(goalLine(),
      h('p', { class: 'scene-text' }, node.side ? 'This is a dead end. The only way on is back.' : opts.length > 2 ? `The trail splits at ${node.name}.` : `The trail leads on from ${node.name}.`),
      PP.skill(s, 'judgment') ? h('p', { class: 'small muted' }, 'Judgment: main trails (dotted on the map) lead toward Clients for Life. Side trails are detours with lessons, and risks.') : null,
      menuList(items), back());
    focusFirst();
  }

  function depart(t, to) {
    const s = T.s;
    s.cameFrom = s.map.current;
    const d = Math.max(1, trailDays(s, t) - (s.passageBoost || 0));
    s.passageBoost = 0;
    s.seg = { from: s.map.current, to, total: d, left: d, trail: t };
    s.walked.push(s.map.current + '|' + to);
    say(`You set out from ${nodeName(s.map.current)}.`);
    T.scene.setLandmark(null);
    T.scene.setTerrain(PP.content.nodes[to].kind === 'clients' ? 'toll' : PP.content.nodes[to].kind);
    travel();
  }

  /* ---------- Travel ---------- */
  function travel() {
    const s = T.s;
    if (!s.seg) return menu();
    T.mode = 'traveling';
    PP.audio && PP.audio.bed('music:' + PP.audio.trailMood(T.s));
    T.scene.setPace(s.pace);
    T.scene.setMoving(true);
    T.scene.setLandmark(null);
    const stop = h('button', { class: 'btn primary', onclick: stopTravel }, 'Stop to look around (Space)');
    T.travelBox = h('div', { class: 'travel-log' });
    showJournal(goalLine(), h('p', { class: 'you-may' }, 'On the trail…'), T.travelBox, stop);
    stop.focus({ preventScroll: true });
    clearTimeout(T.timer);
    T.firstDay = true;
    T.timer = setTimeout(day, 900);
  }
  function stopTravel() {
    clearTimeout(T.timer);
    if (T.mode !== 'traveling') return;
    say(`You stop to look around on day ${T.s.day}.`);
    menu();
  }
  function tick(text, cls) {
    say(text, cls);
    if (T.travelBox) { T.travelBox.appendChild(h('p', { class: cls || '' }, text)); while (T.travelBox.children.length > 4) T.travelBox.firstChild.remove(); }
  }

  function day() {
    const s = T.s;
    if (T.mode !== 'traveling') return;
    const prev = Object.assign({}, s.res);
    s.day++; s.turn++;
    T.weather = PP.pick(WEATHER);
    s.seg.left -= PACE[s.pace].speed;
    // Daily costs
    const eCost = s.pace === 'breakneck' ? 1 : s.pace === 'brisk' ? (s.day % 2 === 0 ? 1 : 0) : (s.day % 3 === 0 ? 1 : 0);
    if (eCost) PP.apply(s, { energy: -eCost });
    if (s.pace === 'breakneck' && PP.chance(0.25)) PP.addDebt(s, 'rushed_pace', 1, 'pace');
    const bizNotes = s.career ? PP.career.tickDay(s.career, true) : [];
    let line = `Day ${s.day}. ${T.weather}`;
    if (s.day % s.client.patience === 0) { PP.apply(s, { momentum: -1 }); line += ` ${C()} asks, "Are we there yet?"`; }
    tick(line);
    bizNotes.filter((n) => !s.career.inbox.some((m) => m.text === n.text)).forEach((n) => tick('Back at the port: ' + n.text, n.kind === 'bad' ? 'bad' : ''));
    if (s.res.energy <= 0) {
      PP.apply(s, { energy: 4, momentum: -1, days: 2 });
      tick('You are exhausted. You stop for two days to recover. (−1 Momentum)', 'bad');
    }
    renderLedger(prev);
    PP.audio && PP.audio.bed('music:' + PP.audio.trailMood(s));
    if (checkEnd()) return;
    if (s.seg.left <= 0) { T.timer = setTimeout(() => arrive(s.seg.to), 700); return; }
    // Mail from your book?
    const mail = s.career && s.career.inbox.shift();
    if (mail) return stopFor(PP.content.mailEvent(s, mail));
    // Something from earlier?
    const due = PP.dueDebt(s);
    if (due) return stopFor(PP.content.debtCheckEvent(s, due));
    // Encounter?
    const chance = 0.3 + Math.min(3, s.style.chase) * 0.08;
    if (!T.firstDay && PP.chance(chance)) { const ev = pickEncounter(); if (ev) return stopFor(ev); }
    T.firstDay = false;
    T.timer = setTimeout(day, 1100);
  }

  function pickEncounter() {
    const s = T.s;
    const pool = PP.content.events.filter((e) => e.at.includes('travel') && !s.seenEvents[e.id] && (!e.when || e.when(s)));
    return weighted(pool, (e) => (e.weight || 1));
  }
  /* Events this career has already seen many times are less likely, so journeys stay fresh. */
  function freshness(e) { const seen = (T.s.career && T.s.career.evSeen && T.s.career.evSeen[e.id]) || 0; return 1 / (1 + seen * 1.5); }
  function weighted(pool, w) {
    if (!pool.length) return null;
    const ws = pool.map((e) => w(e) * freshness(e));
    let r = Math.random() * ws.reduce((a, b) => a + b, 0);
    for (let i = 0; i < pool.length; i++) { r -= ws[i]; if (r <= 0) return pool[i]; }
    return pool[0];
  }

  async function stopFor(ev, after) {
    T.mode = 'event';
    T.scene.setMoving(false);
    PP.audio && PP.audio.bed(ev.debt ? 'music:tense' : 'amb:' + T.scene.terrain);
    if (ev.cut) await T.scene.cut(ev.cut, { title: ev.title });
    runEvent(ev, after || (() => (T.s.seg ? travel() : menu())));
  }

  /* Systems built from trail Marks make some trails shorter. */
  function trailDays(s, t) {
    let d = t.days - (s.followUp ? 1 : 0); // a client you already know moves faster
    const sys = PP.content.practice ? PP.content.practice.systems : {};
    for (const id in sys) if (sys[id].shortens && PP.career.hasSystem(s.career, id) && (t.a === sys[id].shortens || t.b === sys[id].shortens)) d -= 1;
    return Math.max(1, d);
  }
  PP.trailDays = trailDays;

  /* Handling a landmark well (prepare or get help) earns its Mark. */
  function maybeMark(id, choice) {
    const s = T.s, c = s.career;
    if (!c || !id || c.marks[id] || !choice) return;
    const sys = Object.values(PP.content.practice.systems).find((x) => x.mark === id);
    if (!sys) return;
    if (choice.kind === 'prepare' || choice.kind === 'help' || choice.minigame) {
      c.marks[id] = true;
      (s.newMarks = s.newMarks || []).push(id);
      say(`You earned the ${PP.content.nodes[id].name} Mark. Back at the port you can build: ${sys.name}.`, 'arrive');
    }
  }

  function runEvent(ev, after, landmark) {
    const s = T.s;
    T.mode = 'event';
    const host = h('div', { class: 'event-host' });
    showJournal(host);
    const prev = Object.assign({}, s.res);
    PP.ui.runScene(host, ev, {
      state: s,
      noFocus: false,
      onStep: () => { renderLedger(prev); },
      onMinigame: (on) => T.journal.classList.toggle('playing', on),
      onDone: (choice) => {
        say(`${ev.title}.`, ev.debt ? 'bad' : '');
        maybeMark(landmark, choice);
        refresh(prev);
        if (s.poached) { finish('poached'); return; }
        if (checkEnd()) return;
        after();
      }
    });
    renderLedger(prev);
  }

  /* ---------- Arriving ---------- */
  PP.ui.trailDebug = { arrive: (id) => arrive(id), state: () => T.s }; // for automated tests
  async function arrive(id) {
    const s = T.s;
    const node = PP.content.nodes[id];
    const first = !s.map.visited[id];
    s.seg = null;
    s.map.current = id;
    s.map.visited[id] = true;
    s.trail.push(id);
    T.mode = 'event';
    T.scene.setMoving(false);
    T.scene.setTerrain(node.kind);
    PP.audio && PP.audio.bed('amb:' + node.kind);
    const prev = Object.assign({}, s.res);
    if (first && !node.side && id !== 'port') PP.apply(s, { momentum: 1 });
    say(`Day ${s.day}. You arrive at ${node.name}.` + (first && !node.side && id !== 'port' ? ' Progress! (+1 Momentum)' : ''), 'arrive');
    refresh(prev);
    if (id === 'clients') { await T.scene.cut('finale', { title: node.name, caption: node.arrive, duration: 3400 }); T.scene.setLandmark('clients'); return finale(); }
    await T.scene.cut('arrive', { kind: node.kind, title: node.name, caption: first ? node.arrive : 'You have been here before.' });
    T.scene.setLandmark(node.kind);
    const ev = first || PP.chance(0.6) ? pickLandmarkEvent(id, first) : null;
    const face = async () => {
      if (ev) { s.faced[id] = true; if (ev.cut && ev.cut !== 'arrive') await T.scene.cut(ev.cut, { title: ev.title }); runEvent(ev, () => menu(), id); }
      else menu();
    };
    // Hidden passages: if you have earned a way through, you can take it instead of facing the obstacle.
    const ps = PP.passagesAt(id);
    const openPs = ps.filter((p) => PP.passageOpen(s, p) && !s.passageTaken[id]);
    if (openPs.length && ev) return passageFork(id, node, openPs, ps.filter((p) => !openPs.includes(p)), face);
    face();
  }

  /* There is more than one way through. */
  function passageFork(id, node, openPs, lockedPs, face) {
    const s = T.s;
    const ev = {
      id: 'passage_' + id, title: `A way through ${node.name}`, at: [id],
      text: openPs.length > 1 ? `You know more than one way through ${node.name}. Which do you take?` : `You know a way through ${node.name} that most agents never find.`,
      sub: lockedPs.length ? 'Still hidden here: ' + lockedPs.map((p) => `${p.name} (needs ${PP.passageNeed(p)})`).join('; ') + '.' : null,
      choices: openPs.map((p) => ({ label: `Take ${p.name.charAt(0).toLowerCase() + p.name.slice(1)}`, kind: 'help', passage: p, hint: `Opened by ${PP.passageNeed(p)}. Gets you through well, and the next trail is a day shorter.`, eff: () => PP.val(p.eff, s), result: (st) => PP.val(p.text, st) + ' (Next trail: one day shorter.)' }))
        .concat([{ label: 'Face it head on', kind: 'through', head: true, hint: 'The usual way. You might learn something, or it might cost you.', result: 'You square your shoulders and walk straight in.' }])
    };
    ev.choices.forEach((c) => { if (c.passage) { const p = c.passage; const before = c.eff; c.eff = () => { PP.passageSpend(s, p.key); s.passageTaken[id] = p.id; s.passageBoost = 1; const cr = s.career; if (cr) { cr.passagesUsed = cr.passagesUsed || {}; cr.passagesUsed[p.id] = (cr.passagesUsed[p.id] || 0) + 1; } return before(); }; } });
    runEvent(ev, () => {
      if (s.passageTaken[id]) { say(`You took ${s.passageTaken[id] && openPs.find((p) => p.id === s.passageTaken[id]).name.toLowerCase()} through ${node.name}.`, 'arrive'); menu(); }
      else face();
    }, id);
  }
  function pickLandmarkEvent(id, first) {
    const s = T.s;
    const pool = PP.content.events.filter((e) => e.at.includes(id) && !s.seenEvents[e.id] && (!e.when || e.when(s)));
    // The landmark's signature event is likeliest on a first visit, but not guaranteed once you've seen it before.
    return weighted(pool, (e) => (e.first ? (first ? 3 : 0.5) : 1));
  }

  /* ---------- Menu actions ---------- */
  function checkin() {
    const s = T.s, c = s.client;
    if (s.lastCheckin === s.day) {
      say(`${C()} holds up a hand. "Can we pick this up tomorrow? My brain is full."`);
      return menu();
    }
    const topics = PP.content.checkinTopics;
    const items = topics.map((t) => ({
      label: t.label, note: s.askedTopics[t.id] ? 'You already asked this' : null, go: () => answer(t)
    }));
    items.push({ label: 'Just chat for a while', note: 'No agenda. Builds rapport.', go: () => answer({ id: 'chat' }) });
    showJournal(h('div', { class: 'checkin-head' }, PP.ui.avatar(c, 44), h('div', null, h('strong', null, c.name), h('div', { class: 'small muted' }, `${c.traits.join(' · ')}. Trust ${s.res.trust}/10.`))),
      h('p', { class: 'scene-text' }, `You fall into step beside ${c.name}. What do you ask?`),
      menuList(items), back());
    focusFirst();
  }
  function answer(t) {
    const s = T.s, c = s.client;
    const prev = Object.assign({}, s.res);
    s.lastCheckin = s.day;
    let reply, eff = {};
    if (t.id === 'chat') {
      const yn = PP.you && PP.you(s.career);
      reply = PP.pick([`You talk about nothing in particular. ${C()} laughs at your story about the fax machine.` + (yn ? ` "You're all right, ${yn}."` : ''), `${C()} shows you photos of their dog. The dog is excellent.`, `You swap stories about terrible bosses. It turns out you have one in common.`]);
      eff = { trust: 1 };
    } else if (s.askedTopics[t.id]) {
      reply = `${C()}: "You asked me that already." They sound a little tired.`;
      eff = { trust: -1 };
    } else {
      s.askedTopics[t.id] = true;
      const a = (c.checkin || {})[t.id] || { text: '"Hm. I\'m not sure."' };
      const blockedTrust = a.minTrust && s.res.trust < a.minTrust;
      const blockedCur = a.curious && PP.skill(s, 'curiosity') < 1 && s.res.trust < 7;
      if ((blockedTrust || blockedCur) && a.guarded) {
        reply = a.guarded;
        eff = { insight: 0 };
        delete s.askedTopics[t.id]; // worth asking again once trust is higher
        if (blockedTrust) reply += ' (Maybe once they trust you more.)';
        else reply += ' (A more curious question might get further.)';
      } else {
        reply = a.text;
        eff = a.fact && !PP.knows(s, a.fact) ? { fact: a.fact, insight: 1 } : { insight: 0 };
      }
    }
    PP.apply(s, eff);
    say(`You ask ${t.label || 'about nothing in particular'}`, 'you');
    say(reply, 'reply');
    const learned = eff.fact && PP.knows(s, eff.fact) ? h('p', { class: 'learned' }, 'You learned: ' + c.facts[eff.fact].label + (c.facts[eff.fact].key ? '. This could change where the journey ends.' : '.')) : null;
    refresh(prev);
    menu(learned);
  }

  function talk() {
    const s = T.s, here = s.map.current;
    const list = PEOPLE[here] || [];
    const i = list.findIndex((p, k) => !s.talked[here + k]);
    if (i < 0) return menu();
    s.talked[here + i] = true;
    const p = list[i];
    const prev = Object.assign({}, s.res);
    if (p.eff) PP.apply(s, p.eff);
    say(`${p.who}: ${p.line}`, 'reply');
    refresh(prev);
    menu();
  }

  function rest() {
    const s = T.s;
    const prev = Object.assign({}, s.res);
    s.day++; s.turn++;
    if (s.career) PP.career.tickDay(s.career, true).forEach((n) => say('Back at the port: ' + n.text, n.kind === 'bad' ? 'bad' : ''));
    PP.apply(s, { energy: 3 });
    let line = `Day ${s.day}. You rest.`;
    if (s.day % s.client.patience === 0) { PP.apply(s, { momentum: -1 }); line += ` ${C()} drums their fingers. (−1 Momentum)`; }
    say(line);
    refresh(prev);
    if (checkEnd()) return;
    const due = PP.dueDebt(s);
    if (due) return stopFor(PP.content.debtCheckEvent(s, due), () => menu());
    menu();
  }

  function paceMenu() {
    const s = T.s;
    const items = Object.entries(PACE).map(([id, p]) => ({ label: p.label + (s.pace === id ? ' (current)' : ''), note: p.blurb, go: () => { s.pace = id; T.scene.setPace(id); say(`You set a ${p.label.toLowerCase()} pace.`); menu(); } }));
    showJournal(h('p', { class: 'scene-text' }, 'How hard do you push?'), menuList(items), back());
    focusFirst();
  }

  function packMenu() {
    const s = T.s;
    const items = [];
    s.pack.forEach((id) => {
      const it = PP.content.items[id];
      const used = s.usedItems[id];
      if (id === 'thermos') items.push({ label: 'Drink the coffee thermos', note: used ? 'Empty' : it.blurb, disabled: used, go: () => { const p = Object.assign({}, s.res); PP.useItem(s, id); PP.apply(s, { energy: 3 }); say('You drink the thermos. The world sharpens. (+3 Energy)'); refresh(p); menu(); } });
      else if (id === 'napkin_map') items.push({ label: 'Unfold the napkin map', note: used ? 'Already used' : it.blurb, disabled: used, go: () => { PP.useItem(s, id); PP.apply(s, { reveal: true }); say("You unfold Dev's napkin map. Every place on the map has a name now."); menu(); } });
      else items.push({ label: it.name, note: (used ? 'Used. ' : '') + it.blurb + ' (Works automatically.)', disabled: true });
    });
    s.contacts.forEach((id) => {
      const c = PP.content.contacts[id];
      const ready = PP.contactReady(s, id);
      if (id === 'skeptic') items.push({ label: 'Ask Gus to ride along for the next decision', note: s.skepticActive ? 'Gus is watching' : ready ? c.ability : 'Used', disabled: !ready || s.skepticActive, go: () => { PP.useContact(s, 'skeptic'); s.skepticActive = true; say('Gus falls in beside you. "Whatever you\'re about to do, I\'ll tell you what it costs."'); menu(); } });
      else if (id === 'connector') items.push({ label: 'Call Priya for a shortcut', note: !ready ? 'Used' : s.seg ? 'Halves the days left on this trail' : 'Start traveling first', disabled: !ready || !s.seg, go: () => { PP.useContact(s, 'connector'); s.seg.left = Math.max(0.5, s.seg.left / 2); say('Priya knows a farmer who knows a shortcut. The trail ahead gets much shorter.'); menu(); } });
      else items.push({ label: `${c.who} (${c.name})`, note: (ready ? 'On call. ' : 'Used. ') + c.when, disabled: true });
    });
    if (!items.length) items.push({ label: 'Your pack is empty and nobody is on call.', disabled: true });
    showJournal(h('p', { class: 'scene-text' }, 'You rummage through your pack.'), menuList(items), back());
    focusFirst();
  }

  function openMap() {
    const s = T.s;
    const host = h('div', { class: 'map-host big', id: 'trail-map' });
    const ov = h('div', { class: 'overlay map-overlay', role: 'dialog', 'aria-modal': 'true', 'aria-label': 'Map', onclick: (e) => { if (e.target === ov) ov.remove(); } },
      h('div', { class: 'map-card' },
        h('div', { class: 'row between' }, h('div', null, h('div', { class: 'eyebrow' }, 'Day ' + s.day), h('h3', null, 'The territory')), h('button', { class: 'btn', onclick: () => ov.remove() }, 'Close (Esc)')),
        host,
        h('p', { class: 'small map-legend' }, h('span', { class: 'lg dot' }), ' Main trail  ', h('span', { class: 'lg dash' }), ' Side trail (dead end)  ', h('span', { class: 'lg road' }), ' Hidden passage  ', h('span', { class: 'lg walked' }), ' Where you have been')));
    document.body.appendChild(ov);
    PP.ui.renderMap(host, s, {});
    ov.querySelector('.btn').focus();
  }

  /* ---------- Ending conditions ---------- */
  function checkEnd() {
    const s = T.s;
    if (s.career && s.career.savings < 0) { finish('broke'); return true; }
    const broke = s.res.trust <= 0 ? 'trust' : s.res.momentum <= 0 ? 'momentum' : null;
    if (!broke) return false;
    clearTimeout(T.timer);
    if (!s.lastChance) {
      s.lastChance = true;
      stopFor(PP.content.lastChanceEvent(s, broke));
      return true;
    }
    finish(broke === 'trust' ? 'walked' : 'stalled');
    return true;
  }

  /* ---------- Clients for Life ---------- */
  function finale() {
    const s = T.s, c = s.client;
    T.mode = 'finale';
    PP.audio && PP.audio.bed('music:triumph');
    const revealed = PP.destinationRevealed(s);
    const options = Object.keys(c.fit).filter((d) => d === 'grand_plan' || d === 'not_now' || (revealed && (c.unlocks[d] || []).every((f) => PP.knows(s, f))));
    const hidden = Object.keys(c.fit).length - options.length;
    const judgment = PP.skill(s, 'judgment');
    const items = options.map((d) => {
      const dest = PP.content.destinations[d];
      const fits = judgment && (c.unlocks[d] || []).length;
      return { label: dest.name, note: dest.blurb + (fits ? ' This fits what you learned along the way.' : ''), go: () => land(d) };
    });
    if (hidden) items.push({ label: 'Go back and learn more first', note: 'The X will wait. Your client might not.', go: () => { say('You turn back to learn more.'); menu(); } });
    showJournal(
      h('div', { class: 'eyebrow' }, 'Clients for Life · Day ' + s.day),
      h('h3', { class: 'scene-title' }, `Where does ${c.name} actually need to go?`),
      h('p', { class: 'scene-text' }, `You made it to the X. From here you can see a few places to land.` + (hidden ? ` You sense there ${hidden > 1 ? 'are others' : 'is another'}, but you cannot make ${hidden > 1 ? 'them' : 'it'} out. You don't know ${c.name} well enough yet.` : '')),
      menuList(items));
    focusFirst();
  }

  function land(destId) {
    const s = T.s;
    s.destination = destId;
    say(`You land at ${PP.content.destinations[destId].name}.`);
    const reck = s.debt.slice();
    reck.forEach((d) => {
      const outcome = PP.rollDebt(s, d);
      const def = PP.content.debts[d.tag];
      if (outcome !== 'harmless') PP.apply(s, def[outcome].eff, 'reckoning');
      PP.settleDebt(s, d, outcome, 'final reckoning');
    });
    finish('landed', reck.length);
  }

  function finish(kind, reckoned) {
    clearTimeout(T.timer);
    document.removeEventListener('keydown', T.keys);
    if (T.scene) { T.scene.destroy(); T.scene = null; }
    T.hooks.onEnd(kind, reckoned);
  }
  PP.trail.PACE = PACE;
})(window.PP);
