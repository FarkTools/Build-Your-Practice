/* Build Your Practice: the business that sits above every journey.
 *
 * Every day costs money (your living costs plus rent). Clients in your book pay a
 * little every day, but only while they are happy: satisfaction slips unless you
 * spend days servicing them. Prospects wait in your pipeline, go cold, and can be
 * taken by rivals. Practice upgrades (workspace, a partner, recruits, systems
 * earned on the trail) change the math.
 *
 * Levels compare daily income with daily costs:
 *   Unemployed  savings below zero (career over)
 *   Survivable  income below costs
 *   Sustainable income covers costs
 *   Profitable  income covers twice your costs (the goal)
 */
(function (PP) {
  const P = (PP.content.practice = {
    levels: [
      { id: 'unemployed', label: 'Unemployed', blurb: 'Savings ran out.' },
      { id: 'survivable', label: 'Survivable', blurb: 'Living off savings. Income is below costs.' },
      { id: 'sustainable', label: 'Sustainable', blurb: 'Your income covers your costs.' },
      { id: 'profitable', label: 'Profitable', blurb: 'Your income covers twice your costs.' }
    ],
    clawback: 2000,
    // What each journey outcome pays. now = commission; perDay = ongoing income while the client stays happy.
    payout(s, destId, fit) {
      const trust = s.res.trust;
      if (destId === 'not_now') return trust >= 6
        ? { now: 0, perDay: 0, sat: 7, status: 'door', note: 'No sale today, but the door is open. They may come back.' }
        : { now: 0, perDay: 0, sat: 0, status: 'lost', note: 'They walked away. No sale, no relationship.' };
      if (destId === 'grand_plan' && fit === 'poor') return { now: 3000, perDay: 0, sat: 4, status: 'at-risk', note: 'Big commission now. But it was not the right fit, and they might cancel.' };
      if (fit === 'appropriate') return { now: 1500, perDay: trust >= 4 ? 50 : 30, sat: trust >= 7 ? 9 : 8, status: 'life', referral: trust >= 7, note: trust >= 7 ? 'A client for life, and they want to refer a friend.' : 'A client for life.' };
      if (fit === 'acceptable') return { now: 1000, perDay: 25, sat: 7, status: 'steady', note: 'A solid client. Not perfect, but steady.' };
      return { now: 500, perDay: 0, sat: 4, status: 'at-risk', note: 'A small sale that does not fit. It may not last.' };
    },
    workspaces: {
      kitchen: { name: 'Kitchen table', rent: 0, trust: 0, walkIn: 0, blurb: 'Free. Clients meet you at coffee shops. Nobody walks in.' },
      desk: { name: 'Shared desk at the Harbor Co-op', rent: 25, trust: 1, walkIn: 0.04, blurb: 'Looks professional (+1 starting Trust). The odd walk-in prospect.' },
      office: { name: 'Your own office on Harbor Street', rent: 70, trust: 1, walkIn: 0.12, blurb: 'A sign on the door brings regular walk-ins. Needed before you can recruit agents.' }
    },
    partners: [
      { id: 'avery', name: 'Avery Chen', blurb: 'Detail-oriented and great at follow-up. Quiet at events.', referral: 0.06, cover: 0.4 },
      { id: 'riley', name: 'Riley Park', blurb: 'Great with people, brings in leads, a little chaotic with paperwork.', referral: 0.12, cover: 0.65 }
    ],
    partnerTerms: 'You split rent 50/50 and each keep 75% of new commissions (25% goes to the partner). They look after your clients while you are on the trail, and pass you leads.',
    partnerNeeds: 2,
    recruits: [
      { id: 'devon', name: 'Devon', blurb: 'Career changer. Eager, needs structure.', override: 25, quit: 0.06 },
      { id: 'mei', name: 'Mei', blurb: 'Recent grad. Sharp, a little impatient.', override: 35, quit: 0.12 }
    ],
    recruitNeeds: 3, hireCost: 500, trainDays: 3, mentorEvery: 30,
    /* Systems are earned on the trail: handle a landmark well to earn its Mark,
     * then build the matching system back at Port Prospect. */
    systems: {
      discovery: { name: 'Discovery guide', mark: 'meadows', cost: 500, blurb: 'A proven set of first-meeting questions. Check-ins never stall for lack of Curiosity.' },
      notes: { name: 'Note-taking system', mark: 'fog', cost: 400, blurb: 'Never lose a detail again. A new option in the Fog of Forgotten Info.' },
      crm: { name: 'Client database (CRM)', mark: 'loop', cost: 900, blurb: 'Enter it once. The Loop of Endless Data Entry trails take a day less, with a clean way out.', shortens: 'loop' },
      planning: { name: 'Planning software', mark: 'swamp', cost: 1200, blurb: 'Builds a boardwalk across Spreadsheet Swamp: its trails take a day less, with a better option inside.', shortens: 'swamp' },
      focus: { name: 'Focus routine', mark: 'sands', cost: 300, blurb: 'A filter for every new initiative. New options in the Shifting Sands.' },
      specialist: { name: 'Specialist partnership', mark: 'summit', cost: 800, blurb: 'A standing relationship with the Summit. Its trails take a day less; handoffs go smoothly.', shortens: 'summit' },
      tech: { name: 'Tech setup', mark: 'isles', cost: 600, blurb: 'Logins, portals and e-signatures that just work. New options in the Login Isles.' },
      review: { name: 'Review process', mark: 'toll', cost: 600, blurb: 'Files always current. Sail through the Annual Review Toll Bridge.' }
    },
    names: {
      taylor: ['Taylor', 'Jamie', 'Alex', 'Robin', 'Casey', 'Drew', 'Kai', 'Jesse'],
      morgan: ['Morgan', 'Sam', 'Dana', 'Quinn', 'Reese', 'Harper', 'Elliot', 'Blair'],
      rosa: ['Rosa', 'Lena', 'Marisol', 'Bea', 'Nadia', 'Ines', 'Carmen', 'Opal']
    },
    life: { hot: 24, warm: 15, cold: 9 }
  });

  PP.newCareer = function (agentId) {
    const a = PP.content.agentTypes.find((x) => x.id === agentId) || PP.content.agentTypes[0];
    const skills = Object.assign({ curiosity: 0, preparation: 0, communication: 0, navigation: 0, resourcefulness: 0, judgment: 0 }, a.skills);
    return {
      agent: a.id, savings: a.savings, living: a.living, market: a.market,
      days: 0, journeys: 0,
      book: [], pipeline: [], inbox: [], history: [],
      skills, contacts: [], met: {}, quests: {},
      workspace: 'kitchen', partner: null, recruits: [], systems: {},
      marks: a.id === 'insider' ? { swamp: true } : {},
      known: { port: true },
      lastService: 0, usedNames: {}, over: false, bestLevel: 'survivable'
    };
  };

  const C = (PP.career = {
    agent(c) { return PP.content.agentTypes.find((x) => x.id === c.agent) || PP.content.agentTypes[0]; },
    rent(c) { return P.workspaces[c.workspace].rent * (c.partner ? 0.5 : 1); },
    costs(c) { return c.living + C.rent(c); },
    bookIncome(c) { return c.book.reduce((a, b) => a + (b.status === 'life' || b.status === 'steady' ? b.perDay : 0), 0); },
    overrides(c) { return c.recruits.reduce((a, r) => a + (r.trained ? r.override : 0), 0); },
    income(c) { return C.bookIncome(c) + C.overrides(c); },
    level(c) {
      if (c.savings < 0) return 'unemployed';
      const inc = C.income(c), cost = C.costs(c);
      if (inc >= cost * 2) return 'profitable';
      if (inc >= cost) return 'sustainable';
      return 'survivable';
    },
    levelInfo(c) { const id = C.level(c); return P.levels.find((l) => l.id === id); },
    runway(c) { const net = C.costs(c) - C.income(c); return net <= 0 ? Infinity : Math.max(0, Math.floor(c.savings / net)); },
    hasSystem(c, id) { return !!(c && c.systems && c.systems[id]); },
    money(n) { const v = Math.round(n); return (v < 0 ? '−$' : '$') + Math.abs(v).toLocaleString('en-US'); },
    save(c) { PP.store.set('career2', c); },
    load() { const c = PP.store.get('career2', null); return c && !c.over ? c : null; },
    clear() { PP.store.set('career2', null); },

    /* Prospects */
    newName(c, arch) {
      const list = P.names[arch];
      const used = c.usedNames[arch] || 0;
      c.usedNames[arch] = used + 1;
      return list[used % list.length] + (used >= list.length ? ' ' + String.fromCharCode(65 + Math.floor(used / list.length) - 1) + '.' : '');
    },
    addProspect(c, opts) {
      const weights = opts.bias || { taylor: 1, morgan: 1, rosa: 1 };
      if (c.agent === 'insider') weights.morgan = (weights.morgan || 1) + 1;
      let arch = opts.archetype;
      if (!arch) { const tot = Object.values(weights).reduce((a, b) => a + b, 0); let r = Math.random() * tot; for (const k in weights) { r -= weights[k]; if (r <= 0) { arch = k; break; } } arch = arch || 'taylor'; }
      let temp = opts.temp || 'warm';
      if (temp === 'cold' && c.agent === 'connector' && opts.event) temp = 'warm';
      const p = { id: PP.uid('p'), archetype: arch, name: C.newName(c, arch), temp, source: opts.source || 'met somewhere', expires: c.days + P.life[temp] };
      c.pipeline.push(p);
      return p;
    },
    /* Build a playable client from a prospect: the archetype with a new name. */
    makeClient(p) {
      const base = PP.content.clients[p.archetype];
      const json = JSON.stringify(base).split(base.name).join(p.name);
      const cl = JSON.parse(json);
      cl.id = p.archetype;
      cl.prospectId = p.id;
      cl.temp = p.temp;
      cl.source = p.source;
      return cl;
    },

    /* One day passes. away = on the trail. Returns notes for the player. */
    tickDay(c, away) {
      const notes = [];
      const note = (text, kind, mail) => { notes.push({ text, kind }); if (mail) c.inbox.push({ text, kind, mail }); };
      c.savings += C.income(c) - C.costs(c);
      c.days++;
      // Clients
      const decay = 0.2 * (away && c.partner ? 1 - P.partners.find((x) => x.id === c.partner).cover : 1);
      c.book.forEach((b) => {
        if (b.status === 'cancelled' || b.status === 'lost') return;
        b.sat = Math.max(0, (b.sat == null ? 7 : b.sat) - decay);
        const active = b.status === 'life' || b.status === 'steady' || b.status === 'at-risk';
        if (active && ((b.sat < 3.5 && PP.chance(0.06)) || (b.status === 'at-risk' && PP.chance(0.02)))) {
          const claw = b.status === 'at-risk';
          b.status = 'cancelled'; b.perDay = 0;
          if (claw) c.savings -= P.clawback;
          note(`${b.name} cancelled. ${claw ? `It was never the right fit. ${C.money(-P.clawback)} clawed back.` : 'They had not heard from you in a long time.'}`, 'bad', 'cancel');
        } else if (b.status === 'door' && PP.chance(0.02)) {
          b.status = 'life'; b.perDay = 50; b.sat = 8; c.savings += 1000;
          note(`${b.name}, who said "not yet," is ready now and wants to work with you. +${C.money(1000)}, and they join your book.`, 'good', 'return');
        }
      });
      // Pipeline
      c.pipeline = c.pipeline.filter((p) => {
        if (c.days > p.expires) { note(`${p.name} lost interest while waiting. They are off your pipeline.`, 'bad'); return false; }
        if (away && PP.chance(0.02)) { note(`A rival agent signed ${p.name} while you were on the trail.`, 'bad', 'poach'); return false; }
        return true;
      });
      // Walk-ins and partner leads
      const ws = P.workspaces[c.workspace];
      if (ws.walkIn && PP.chance(ws.walkIn)) { const p = C.addProspect(c, { temp: 'cold', source: 'walked into your office' }); note(`${p.name} walked into your ${c.workspace === 'office' ? 'office' : 'desk at the Co-op'} asking for help.`, 'good'); }
      if (c.partner) { const pt = P.partners.find((x) => x.id === c.partner); if (PP.chance(pt.referral)) { const p = C.addProspect(c, { temp: 'warm', source: `referral from ${pt.name}` }); note(`${pt.name} passed you a lead: ${p.name}.`, 'good'); } }
      // Recruits
      c.recruits = c.recruits.filter((r) => {
        if (!r.trained) return true;
        if (c.days - r.lastMentor > P.mentorEvery && PP.chance(r.quit)) { note(`${r.name} quit. They felt nobody was mentoring them.`, 'bad', 'quit'); return false; }
        return true;
      });
      return notes;
    }
  });

  /* News by carrier pigeon, delivered on the trail. */
  PP.content.mailEvent = function (s, item) {
    const choices = [{ label: 'Tuck the note away and keep going', kind: 'through', eff: {}, result: 'Back to the trail.' }];
    if (item.mail === 'cancel') choices.unshift({ label: 'Write back to ask what went wrong', kind: 'prepare', eff: { energy: -1, insight: 1 }, result: 'The reply is kind, and honest: "We never felt looked after." Lesson noted.' });
    if (item.mail === 'return') choices.unshift({ label: 'Write back and welcome them', kind: 'prepare', eff: { trust: 1 }, result: 'Your client notices you smiling.' });
    return { id: 'mail_' + PP.uid('m'), title: 'A carrier pigeon lands on your pack', at: ['travel'], cut: 'mail', text: 'There is a note tied to its leg. ' + item.text, choices };
  };
})(window.PP);
