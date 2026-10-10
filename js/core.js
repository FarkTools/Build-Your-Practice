/* Port Prospect — engine core
 * State model, resource effects, risk debt, and small helpers.
 * Everything hangs off one global (window.PP) so the game runs from
 * plain <script> tags: GitHub Pages, a local double-click, or a single bundled file.
 */
window.PP = window.PP || {};
(function (PP) {
  PP.content = PP.content || {};
  PP.minigames = PP.minigames || {};
  PP.ui = PP.ui || {};

  /* ---------- Constants ---------- */
  PP.RES = [
    { id: 'trust', label: 'Trust', blurb: 'Does the client believe you understand them and are acting in their interest?' },
    { id: 'momentum', label: 'Momentum', blurb: 'Is the process moving forward, or stalled under delay and complexity?' },
    { id: 'energy', label: 'Energy', blurb: 'How much capacity you have left to keep solving problems.' },
    { id: 'insight', label: 'Insight', blurb: "How well you understand the client's real situation, priorities and constraints." }
  ];
  PP.MAX = 10;

  PP.SKILLS = [
    { id: 'curiosity', label: 'Curiosity', blurb: 'Unlocks better follow-up questions and exposes hidden motivations.' },
    { id: 'preparation', label: 'Preparation', blurb: 'More time in mini-games; softens risk-debt checks.' },
    { id: 'communication', label: 'Communication', blurb: 'Hard conversations go better; easier recovery from misunderstandings.' },
    { id: 'navigation', label: 'Navigation', blurb: 'Reveals names of nearby places through the fog.' },
    { id: 'resourcefulness', label: 'Resourcefulness', blurb: 'One extra contact slot, and each contact can help one extra time.' },
    { id: 'judgment', label: 'Judgment', blurb: 'Shows hints about likely tradeoffs, and a gut feeling about risk debt.' }
  ];

  PP.STYLE = [
    { id: 'avoid', label: 'Avoids hard questions', place: 'Fog of Forgotten Information expands' },
    { id: 'overcomplicate', label: 'Overcomplicates', place: 'Spreadsheet Swamp grows' },
    { id: 'soloist', label: 'Refuses help', place: 'Specialist Summit ices over' },
    { id: 'chase', label: 'Chases every new priority', place: 'Shifting Sands spread' }
  ];

  /* ---------- Small helpers ---------- */
  PP.clamp = (v, a, b) => Math.max(a, Math.min(b, v));
  PP.rand = () => Math.random();
  PP.chance = (p) => Math.random() < p;
  PP.pick = (arr) => arr[Math.floor(Math.random() * arr.length)];
  PP.shuffle = (arr) => {
    const a = arr.slice();
    for (let i = a.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [a[i], a[j]] = [a[j], a[i]];
    }
    return a;
  };
  PP.uid = (() => { let n = 0; return (p = 'id') => p + '_' + (++n) + '_' + Math.floor(Math.random() * 1e4); })();
  PP.val = (v, ...args) => (typeof v === 'function' ? v(...args) : v);

  /* Tiny DOM builder: PP.h('div', {class:'x', onclick: fn}, 'text', childNode, [more]) */
  PP.h = function (tag, attrs, ...kids) {
    const el = document.createElement(tag);
    if (attrs) {
      for (const k in attrs) {
        const v = attrs[k];
        if (v == null || v === false) continue;
        if (k.startsWith('on') && typeof v === 'function') el.addEventListener(k.slice(2), v);
        else if (k === 'class') el.className = v;
        else if (k === 'html') el.innerHTML = v;
        else if (k === 'style' && typeof v === 'object') { for (const sk in v) { if (sk.startsWith('--')) el.style.setProperty(sk, v[sk]); else el.style[sk] = v[sk]; } }
        else if (v === true) el.setAttribute(k, '');
        else el.setAttribute(k, v);
      }
    }
    const add = (c) => {
      if (c == null || c === false) return;
      if (Array.isArray(c)) c.forEach(add);
      else el.appendChild(c instanceof Node ? c : document.createTextNode(String(c)));
    };
    kids.forEach(add);
    return el;
  };

  PP.store = {
    get(k, d) { try { const v = localStorage.getItem('pp:' + k); return v == null ? d : JSON.parse(v); } catch (e) { return d; } },
    set(k, v) { try { localStorage.setItem('pp:' + k, JSON.stringify(v)); } catch (e) { /* storage unavailable */ } }
  };

  /* ---------- State ---------- */
  PP.newState = function () {
    return {
      phase: 'port',               // port -> journey -> end
      res: { trust: 5, momentum: 6, energy: 8, insight: 1 },
      skills: { curiosity: 0, preparation: 0, communication: 0, navigation: 0, resourcefulness: 0, judgment: 0 },
      contacts: [],                // active contact ids (limited slots)
      contactUses: {},             // id -> uses left this journey
      met: {},                     // npc id -> true
      quests: {},                  // quest id -> 'done' | 'failed'
      pack: [],                    // item ids
      usedItems: {},
      portActions: 0,
      client: null,                // client definition (from content)
      facts: {},                   // fact id -> turn learned
      missed: {},                  // fact id -> where it slipped past
      debt: [],                    // hidden risk debt
      settled: [],                 // debts that came due, with outcome
      style: { avoid: 0, overcomplicate: 0, soloist: 0, chase: 0 },
      map: { current: 'port', visited: { port: true }, named: {}, beam: false, extraEdges: [] },
      trail: ['port'],
      skepticActive: false,
      day: 1,                      // calendar day of the journey
      pace: 'steady',              // steady | brisk | breakneck
      at: 'port',                  // landmark you are at, or null while on a trail
      seg: null,                   // { from, to, left, total } while traveling
      walked: [],                  // trails traveled, as 'a|b'
      password: PP.store.get('password', false), // Steve's password carries over between runs
      askedTopics: {},             // check-in topics already asked
      lastCheckin: 0,
      talked: {},                  // landmark people already talked to
      seenCuts: {},
      seenEvents: {},
      turn: 0,
      log: [],
      ending: null
    };
  };

  PP.skill = (s, id) => s.skills[id] || 0;
  PP.knows = (s, fact) => !!s.facts[fact];
  PP.hasItem = (s, id) => s.pack.includes(id) && !s.usedItems[id];
  PP.useItem = (s, id) => { s.usedItems[id] = true; };
  PP.contactSlots = (s) => 2 + (PP.skill(s, 'resourcefulness') > 0 ? 1 : 0);
  PP.contactReady = (s, id) => s.contacts.includes(id) && (s.contactUses[id] || 0) > 0;
  PP.useContact = (s, id) => { s.contactUses[id] = Math.max(0, (s.contactUses[id] || 0) - 1); };
  PP.clientName = (s) => (s.client ? s.client.name : 'the client');

  PP.log = function (s, text, kind) {
    s.log.push({ turn: s.turn, where: s.map.current, text, kind: kind || 'note' });
  };

  /* ---------- Effects ----------
   * An effect object can carry:
   *  trust/momentum/energy/insight: number deltas
   *  debt: {tag, sev} or [..]   -> silently recorded risk debt
   *  clearDebt: tag             -> pay down a debt without a check
   *  fact: id or [ids]          -> learn about the client (ignored if the client has no such fact)
   *  missed: id                 -> a fact slipped past (can resurface later)
   *  style: {avoid:1, ...}      -> working-style counters that reshape the map
   *  skill: {curiosity:1}
   *  reveal: true               -> lift fog labels across the map
   * Returns a list of visible changes for toasts. Debt is never reported.
   */
  PP.apply = function (s, eff, source) {
    const notes = [];
    if (!eff) return notes;
    eff = PP.val(eff, s);
    PP.RES.forEach(({ id }) => {
      if (eff[id]) {
        const before = s.res[id];
        s.res[id] = PP.clamp(s.res[id] + eff[id], 0, PP.MAX);
        const d = s.res[id] - before;
        if (d) notes.push({ kind: id, delta: d });
      }
    });
    if (eff.debt) [].concat(eff.debt).forEach((d) => PP.addDebt(s, d.tag, d.sev, source));
    if (eff.clearDebt) s.debt = s.debt.filter((d) => d.tag !== eff.clearDebt);
    if (eff.fact) [].concat(eff.fact).forEach((f) => { if (PP.learn(s, f)) notes.push({ kind: 'fact', fact: f }); });
    if (eff.missed && s.client && s.client.facts[eff.missed] && !s.facts[eff.missed]) s.missed[eff.missed] = s.map.current;
    if (eff.style) for (const k in eff.style) s.style[k] = Math.max(0, (s.style[k] || 0) + eff.style[k]);
    if (eff.skill) for (const k in eff.skill) {
      s.skills[k] = PP.clamp((s.skills[k] || 0) + eff.skill[k], 0, 2);
      notes.push({ kind: 'skill', skill: k });
    }
    if (eff.reveal) { s.map.beam = true; notes.push({ kind: 'reveal' }); }
    if (eff.item && !s.pack.includes(eff.item)) { s.pack.push(eff.item); notes.push({ kind: 'item', item: eff.item }); }
    if (eff.password) { s.password = true; PP.store.set('password', true); }
    if (eff.days) { s.day += eff.days; s.turn += eff.days; if (s.career && PP.career) for (let i = 0; i < eff.days; i++) PP.career.tickDay(s.career, true); notes.push({ kind: 'days', days: eff.days }); }
    if (eff.pace) s.pace = eff.pace;
    if (eff.prospect && s.career && PP.career) { const pr = PP.career.addProspect(s.career, eff.prospect); notes.push({ kind: 'prospect', name: pr.name }); }
    if (eff.poached) s.poached = eff.poached;
    if (eff.cash && s.career) { s.career.savings += eff.cash; notes.push({ kind: 'cash', delta: eff.cash }); }
    return notes;
  };

  PP.learn = function (s, fact) {
    if (!s.client || !s.client.facts[fact] || s.facts[fact] != null) return false;
    s.facts[fact] = s.turn;
    delete s.missed[fact];
    PP.log(s, 'Learned: ' + s.client.facts[fact].label, 'fact');
    return true;
  };

  /* ---------- Risk debt ----------
   * Shortcuts add debt silently. A few turns later a check event rolls it:
   * harmless, inconvenient, or costly. Severity (1-3) shifts the odds.
   */
  PP.addDebt = function (s, tag, sev, source) {
    const existing = s.debt.find((d) => d.tag === tag);
    if (existing) { existing.sev = PP.clamp(existing.sev + 1, 1, 3); return; }
    s.debt.push({ id: PP.uid('debt'), tag, sev: PP.clamp(sev || 1, 1, 3), turn: s.turn, where: s.map.current, source: source || '' });
  };

  PP.debtOdds = function (s, d) {
    const sev = PP.clamp(d.sev - (PP.skill(s, 'preparation') >= 2 ? 1 : 0), 0, 3);
    const costly = [0.05, 0.2, 0.4, 0.6][sev];
    const incon = [0.25, 0.35, 0.35, 0.3][sev];
    return { harmless: +(1 - costly - incon).toFixed(2), inconvenient: incon, costly };
  };

  PP.rollDebt = function (s, d) {
    const o = PP.debtOdds(s, d);
    const r = Math.random();
    if (r < o.costly) return 'costly';
    if (r < o.costly + o.inconvenient) return 'inconvenient';
    return 'harmless';
  };

  /* A debt is "due" once it has aged (turns = days on the trail).
   * After DEBT_MIN_AGE it may surface each day; by DEBT_MAX_AGE it always does. */
  PP.DEBT_MIN_AGE = 3;
  PP.DEBT_MAX_AGE = 8;
  PP.DEBT_DAILY_CHANCE = 0.3;
  PP.dueDebt = function (s) {
    const due = s.debt.filter((d) => s.turn - d.turn >= PP.DEBT_MIN_AGE);
    if (!due.length) return null;
    const oldest = due.sort((a, b) => a.turn - b.turn)[0];
    const age = s.turn - oldest.turn;
    return PP.chance(age >= PP.DEBT_MAX_AGE ? 1 : PP.DEBT_DAILY_CHANCE) ? oldest : null;
  };

  PP.settleDebt = function (s, d, outcome, how) {
    s.debt = s.debt.filter((x) => x.id !== d.id);
    s.settled.push(Object.assign({}, d, { outcome, how: how || 'came due', at: s.map.current, dueTurn: s.turn }));
  };

  /* Judgment gives a vague gut feeling about how much is hidden. */
  PP.gutFeeling = function (s) {
    const j = PP.skill(s, 'judgment');
    if (!j) return null;
    const weight = s.debt.reduce((a, d) => a + d.sev, 0);
    if (j >= 2) return weight === 0 ? 'Nothing nagging you.' : `${s.debt.length} thing${s.debt.length > 1 ? 's' : ''} you glossed over. ${weight >= 5 ? 'It feels heavy.' : ''}`.trim();
    if (weight === 0) return 'Calm waters, as far as you can tell.';
    if (weight <= 2) return 'Something small is nagging you.';
    if (weight <= 5) return 'You have an uneasy feeling about earlier shortcuts.';
    return 'Your gut is shouting. Something is going to come back.';
  };
})(window.PP);
