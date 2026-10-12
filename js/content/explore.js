/* Reasons to explore the whole map.
 *
 *  1. Client places: each client's key fact comes out at one landmark that fits their story.
 *     Check-ins hint at it ("maybe somewhere quieter"), then a Hunch names the place.
 *  2. Keepsakes: every landmark hides one unique piece of gear, found on your first visit.
 *  3. Trail conditions: each journey, a trail may be washed out, a new shortcut open, or
 *     a place may have something special on.
 *  4. Town requests: errands from people in town to far-off places, paid when you get back.
 *
 * {c} in any text is replaced with the client's name. */
(function (PP) {
  const N = () => PP.content.nodes;
  const fill = (t, s) => String(t || '').replace(/\{c\}/g, s && s.client ? s.client.name : 'your client');

  /* ---------- 1. Where each client opens up ---------- */
  PP.content.clientPlaces = {
    taylor: { at: 'lighthouse', hint: '{c} goes quiet whenever work comes up, and keeps looking out toward the water.',
      scene: 'At the top of the lighthouse, {c} watches the ferries for a long time. "There\'s a job. In Denver. I haven\'t told anyone. I don\'t even know if I want it."' },
    morgan: { at: 'wreck', hint: '{c} changes the subject every time you ask who else is involved.',
      scene: '{c} stares at the broken hull for a while. "Jordan hasn\'t seen the spreadsheet. Any of it. I kept meaning to show them when it was finished."' },
    rosa: { at: 'summit', hint: '{c} talks about the shop as "mine" and then corrects it to "ours", every time.',
      scene: 'The Specialist asks one question: "Is there a buy-sell agreement?" {c} goes pale. "Dee has been talking about getting out. I didn\'t want to say it out loud."' },
    evelyn: { at: 'fog', hint: '{c} says "the house" a lot, never "home".',
      scene: 'In the grey quiet of the fog, {c} finally says it. "It isn\'t the money. The house is just so quiet now. I keep the radio on all day."' },
    walter: { at: 'caves', hint: 'When you ask about retirement, {c} only ever says "I", never "we".',
      scene: 'Deep in the Caves of What-Ifs, {c} asks the question himself. "What if Bernadette doesn\'t stop working? She loves that job. She hasn\'t said she\'s retiring. I just assumed."' },
    mateo: { at: 'isles', hint: '{c} gets oddly vague whenever work benefits come up.',
      scene: 'On the Login Isles, {c} tries to sign in to the benefits portal and can\'t. "Huh. I think I never actually set this up. Is there free money in here?" There is. A full company match, unclaimed.' },
    lorraine: { at: 'snakepit', hint: '{c} keeps glancing at her phone, then putting it face down.',
      scene: 'Among the ringing phones, {c} finally plays you a voicemail from her dad\'s doctor. "He\'s forgetting things. And nobody is allowed to sign anything for him. Nobody."' },
    zoe: { at: 'swamp', hint: '{c} answers "how much do you make?" with "it depends", every time.',
      scene: 'In Spreadsheet Swamp, {c} finally fills in a row for every month. One huge number. Then three zeros. Then another huge number. "Yeah. That\'s what it\'s like."' },
    darnell: { at: 'cliffs', hint: '{c} wants everything done now, and flinches when you mention paperwork.',
      scene: 'At the edge of Product-First Cliffs, {c} stops you. "Wait. Before we pick anything: the divorce isn\'t final until spring. My lawyer said not to change anything yet."' },
    ingrid: { at: 'sands', hint: '{c} talks about the inheritance like it belongs to someone else.',
      scene: 'Among the contest banners, {c} says it plainly. "I want it gone. All of it. It doesn\'t feel like mine. It feels like I\'m spending her."' },
    rafael: { at: 'loop', hint: '{c} describes the family store like a chore he can never finish.',
      scene: 'On lap three of the Loop, {c} laughs, then stops. "This is what the store feels like. Every day the same. I don\'t want to run it. I want to teach. I\'ve never said that."' },
    maxine: { at: 'toll', hint: '{c} is very sure about the pension, and has never actually read the letter.',
      scene: 'The troll at the toll bridge reads {c}\'s pension letter out loud. Full benefits begin at age 60. {c} plans to stop at 55. The bridge goes very quiet.' }
  };
  PP.clientPlace = (s) => (s && s.client && !s.followUp ? PP.content.clientPlaces[s.client.id] : null);
  /* Known once a check-in brushes against it, or right away with good Judgment. */
  PP.placeHintKnown = (s) => !!(PP.clientPlace(s) && (s.placeHint || PP.skill(s, 'judgment') >= 1));
  PP.placeEvent = function (s) {
    const cp = PP.clientPlace(s);
    if (!cp || PP.knows(s, s.client.keyFact)) return null;
    return {
      id: 'place_' + s.client.id, title: `${s.client.name} opens up`, at: [cp.at],
      text: fill(cp.scene, s),
      choices: [
        { label: 'Stop and really listen', kind: 'prepare', eff: { fact: s.client.keyFact, insight: 1, trust: 1 }, result: (st) => `You put the plan down and listen. This changes things. (You learned: ${st.client.facts[st.client.keyFact].label.toLowerCase()}.)` },
        { label: 'Gently steer back to the plan', kind: 'through', eff: { momentum: 1, trust: -1 }, result: `${s.client.name} nods and goes quiet again. The moment passes.` }
      ]
    };
  };
  PP.placeHintText = (s) => { const cp = PP.clientPlace(s); return cp ? fill(cp.hint, s) : ''; };

  /* ---------- 2. Keepsakes: one per landmark ---------- */
  const K = {
    meadows: { id: 'k_wildflower', icon: '🌼', name: 'Pressed wildflower', blurb: 'Start each journey with +1 Trust.', kind: 'start', eff: { trust: 1 } },
    lighthouse: { id: 'k_lantern', icon: '🏮', name: "Keeper's lantern", blurb: '+2 Insight, once: you see what the client is not saying.', kind: 'use', eff: { insight: 2 }, useLabel: "Light the keeper's lantern" },
    wreck: { id: 'k_earplugs', icon: '🎧', name: 'Siren earplugs', blurb: '+1 Trust and +1 Momentum, once: you tune out the hard sell.', kind: 'use', eff: { trust: 1, momentum: 1 }, useLabel: 'Put in the siren earplugs' },
    fog: { id: 'k_compass', icon: '🧭', name: 'Fog compass', blurb: '+2 Momentum, once: it always points to the next real step.', kind: 'use', eff: { momentum: 2 }, useLabel: 'Check the fog compass' },
    loop: { id: 'k_escape', icon: '⎋', name: 'Escape key', blurb: '+2 Momentum and +1 Energy, once: you break out of the loop.', kind: 'use', eff: { momentum: 2, energy: 1 }, useLabel: 'Press the escape key' },
    cliffs: { id: 'k_rope', icon: '🪢', name: 'Safety rope', blurb: 'Catches one shortcut before it comes due, once.', kind: 'use', eff: { clearOneDebt: true }, useLabel: 'Tie off the safety rope' },
    swamp: { id: 'k_plank', icon: '🪵', name: 'Boardwalk plank', blurb: 'Start each journey with +1 Insight and +1 Energy.', kind: 'start', eff: { insight: 1, energy: 1 } },
    snakepit: { id: 'k_rolodex', icon: '📇', name: 'Old rolodex', blurb: 'Once: call someone you forgot. +1 Trust and a warm prospect.', kind: 'use', eff: { trust: 1, prospect: { temp: 'warm', source: 'an old card in your rolodex' } }, useLabel: 'Flip through the old rolodex' },
    sands: { id: 'k_hourglass', icon: '⏳', name: 'Hourglass', blurb: '+3 Energy, once: you take your time.', kind: 'use', eff: { energy: 3 }, useLabel: 'Turn over the hourglass' },
    caves: { id: 'k_candle', icon: '🕯️', name: 'Candle stub', blurb: '+2 Insight and +1 Trust, once: you ask the hard question gently.', kind: 'use', eff: { insight: 2, trust: 1 }, useLabel: 'Light the candle stub' },
    summit: { id: 'k_card', icon: '🎓', name: "Specialist's card", blurb: 'Start each journey with +1 Insight and +1 Momentum.', kind: 'start', eff: { insight: 1, momentum: 1 } },
    isles: { id: 'k_password', icon: '🔑', name: 'Master password', blurb: '+2 Momentum, once: every portal opens.', kind: 'use', eff: { momentum: 2 }, useLabel: 'Use the master password' },
    toll: { id: 'k_token', icon: '🎟️', name: 'Toll token', blurb: 'Once: +1 Momentum, and one shortcut is quietly settled.', kind: 'use', eff: { momentum: 1, clearOneDebt: true }, useLabel: 'Hand over the toll token' },
    clients: { id: 'k_golden_x', icon: '🏆', name: 'Golden X', blurb: 'Start each journey with +1 Trust, +1 Momentum and +1 Energy.', kind: 'start', eff: { trust: 1, momentum: 1, energy: 1 } }
  };
  PP.content.keepsakes = K;
  Object.entries(K).forEach(([place, k]) => { PP.content.items[k.id] = Object.assign({ keepsake: place }, k); });
  PP.keepsakeAt = (place) => K[place] || null;
  PP.keepsakeFound = (c, place) => !!(c && K[place] && c.gear && c.gear[K[place].id]);

  /* ---------- 3. Trail conditions for this journey ---------- */
  const mainTrails = () => PP.content.trails.filter((t) => t.kind === 'main' && t.a !== 'port' && t.b !== 'clients');
  function connected(skip) {
    const seen = { port: true }, q = ['port'];
    while (q.length) { const n = q.shift(); PP.content.trails.forEach((t) => { if (t === skip) return; const o = t.a === n ? t.b : t.b === n ? t.a : null; if (o && !seen[o]) { seen[o] = true; q.push(o); } }); }
    return !!seen.clients;
  }
  const BONUSES = [
    { label: 'Market day', text: 'Market day: locals with questions everywhere. Visit for a warm prospect.', eff: { prospect: { temp: 'warm', source: 'market day on the trail' } } },
    { label: 'A quiet retreat', text: 'A quiet retreat center is open. Visit for +3 Energy.', eff: { energy: 3 } },
    { label: 'A workshop', text: 'A free workshop is running. Visit for +2 Insight.', eff: { insight: 2 } },
    { label: 'A speaking gig', text: 'Someone needs a speaker. Visit to earn $400.', eff: { cash: 400 } }
  ];
  PP.rollConditions = function (c) {
    const out = [], visits = (c && c.visits) || {};
    // A washout on one main trail, as long as Clients for Life can still be reached.
    if (Math.random() < 0.6) {
      const t = PP.shuffle(mainTrails()).find((x) => connected(x));
      if (t) out.push({ type: 'closed', a: t.a, b: t.b });
    }
    // A shortcut on a trail you rarely use.
    if (Math.random() < 0.5) {
      const pool = mainTrails().filter((t) => t.days >= 2 && !out.some((o) => o.a === t.a && o.b === t.b)).sort((x, y) => ((visits[x.a] || 0) + (visits[x.b] || 0)) - ((visits[y.a] || 0) + (visits[y.b] || 0)));
      const t = pool[Math.floor(Math.random() * Math.min(4, pool.length))];
      if (t) out.push({ type: 'shortcut', a: t.a, b: t.b });
    }
    // Something on at a place you rarely visit.
    const places = Object.keys(N()).filter((id) => id !== 'port' && id !== 'clients').sort((x, y) => (visits[x] || 0) - (visits[y] || 0)).slice(0, 7);
    const b = PP.pick(BONUSES);
    out.push(Object.assign({ type: 'bonus', at: PP.pick(places) }, b));
    return out;
  };
  PP.trailClosed = (s, a, b) => (s.conditions || []).some((o) => o.type === 'closed' && ((o.a === a && o.b === b) || (o.a === b && o.b === a)));
  PP.trailShortcut = (s, a, b) => (s.conditions || []).some((o) => o.type === 'shortcut' && ((o.a === a && o.b === b) || (o.a === b && o.b === a)));
  PP.conditionText = (o) => {
    const n = N();
    if (o.type === 'closed') return { icon: '⛔', text: `Washed out: ${n[o.a].name} to ${n[o.b].name}. Find another way.` };
    if (o.type === 'shortcut') return { icon: '⚡', text: `New ferry: ${n[o.a].name} to ${n[o.b].name} is a day shorter this time.` };
    return { icon: '🎉', text: `${n[o.at].name}: ${o.text}` };
  };

  /* ---------- 4. Town requests ---------- */
  const ASKS = [
    { giver: 'marge', text: 'Marge wants to know if the old keeper at {place} still remembers her.' },
    { giver: 'olu', text: 'Olu needs a form signed by someone at {place}. "Bring it back unwrinkled."' },
    { giver: 'dev', text: 'Dev is updating his napkin map and needs a sketch of {place}.' },
    { giver: 'priya', text: 'Priya has a friend near {place} who would love an introduction to you.' },
    { giver: 'kenji', text: 'Kenji left his good charger at {place}. Again.' },
    { giver: 'gus', text: 'Gus bets you have never actually been to {place}. Prove him wrong.' },
    { giver: null, text: 'The Chamber of Commerce wants a report on how business is going around {place}.' },
    { giver: null, text: 'The Night School wants a guest story from {place} for its next class.' }
  ];
  const REWARDS = [
    (c) => ({ cash: 300 + 100 * Math.floor(Math.random() * 4) }),
    (c) => { const sk = PP.shuffle(Object.keys(c.skills)).find((k) => (c.skills[k] || 0) < 2); return sk ? { skill: sk } : { cash: 400 }; },
    (c) => { const g = PP.shuffle(Object.keys(PP.content.items).filter((id) => PP.content.items[id].cost && !(c.gear || {})[id])); return g[0] ? { gear: g[0] } : { cash: 400 }; }
  ];
  PP.rewardText = (r) => r.cash ? PP.career.money(r.cash) : r.skill ? `+1 ${PP.SKILLS.find((x) => x.id === r.skill).label}` : r.gear ? `${PP.content.items[r.gear].icon} ${PP.content.items[r.gear].name}` : r.met ? `meet ${r.metName}` : '';
  PP.refillRequests = function (c) {
    c.requests = (c.requests || []).filter((q) => !q.done);
    const visits = c.visits || {};
    const taken = new Set(c.requests.map((q) => q.at));
    const places = Object.keys(N()).filter((id) => id !== 'port' && id !== 'clients' && !taken.has(id)).sort((x, y) => (visits[x] || 0) - (visits[y] || 0) + (Math.random() - 0.5));
    while (c.requests.length < 2 && places.length) {
      const at = places.shift(), ask = PP.pick(ASKS);
      const npc = ask.giver && PP.content.npcs.find((n) => n.id === ask.giver);
      let reward = PP.pick(REWARDS)(c);
      if (npc && !c.met[npc.id] && Math.random() < 0.6) reward = { met: npc.id, metName: npc.name, cash: 200 };
      c.requests.push({ id: PP.uid('q'), at, text: ask.text.replace('{place}', N()[at].name), reward, giver: npc ? npc.name : null });
    }
    return c.requests;
  };
  /* Pay out requests whose place was visited on this journey. Returns lines for the report. */
  PP.settleRequests = function (c, visited) {
    const lines = [];
    (c.requests || []).forEach((q) => {
      if (q.done || !visited[q.at]) return;
      q.done = true;
      const r = q.reward;
      if (r.cash) c.savings += r.cash;
      if (r.skill) c.skills[r.skill] = Math.min(2, (c.skills[r.skill] || 0) + 1);
      if (r.gear) { c.gear = c.gear || {}; c.gear[r.gear] = c.gear[r.gear] || 1; }
      if (r.met) c.met[r.met] = true;
      lines.push(`📜 ${N()[q.at].name}: done. ${r.met ? `${r.metName} is grateful and will come along when you need them` + (r.cash ? `, plus ${PP.career.money(r.cash)}` : '') : 'Reward: ' + PP.rewardText(r)}.`);
    });
    return lines;
  };
})(window.PP);
