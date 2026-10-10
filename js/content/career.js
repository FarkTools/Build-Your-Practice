/* Your Practice: the career that sits above every journey.
 *
 * You start with savings. Every day costs money (living costs). Clients you land
 * join your book and some pay a little every day after that. Your level comes from
 * how that daily income compares with your daily costs:
 *
 *   Unemployed  — savings ran out. Career over.
 *   Survivable  — income is below costs; you are living off savings.
 *   Sustainable — your book covers your costs.
 *   Profitable  — your book covers twice your costs. The goal.
 *
 * Outcomes ripple forward: quick closes pay more now but can cancel later
 * (clawback), good fits pay steadily and refer, a respectful "not yet" may return.
 */
(function (PP) {
  PP.content.practice = {
    startSavings: 4000,
    dailyCost: 100,
    levels: [
      { id: 'unemployed', label: 'Unemployed', blurb: 'Savings ran out.' },
      { id: 'survivable', label: 'Survivable', blurb: 'Living off savings. Income is below costs.' },
      { id: 'sustainable', label: 'Sustainable', blurb: 'Your book covers your costs.' },
      { id: 'profitable', label: 'Profitable', blurb: 'Your book covers twice your costs.' }
    ],
    // What each outcome pays. now = one-time commission; perDay = ongoing income from your book.
    payout(s, destId, fit) {
      const trust = s.res.trust;
      if (destId === 'not_now') return trust >= 6
        ? { now: 0, perDay: 0, status: 'door', note: 'No sale today, but the door is open. They may come back.' }
        : { now: 0, perDay: 0, status: 'lost', note: 'They walked away. No sale, no relationship.' };
      if (destId === 'grand_plan' && fit === 'poor') return { now: 3000, perDay: 0, status: 'at-risk', note: 'Big commission now. But it was not the right fit, and they might cancel.' };
      if (fit === 'appropriate') return { now: 1500, perDay: trust >= 4 ? 50 : 30, status: 'life', referral: trust >= 7, note: trust >= 7 ? 'A client for life, and they want to refer a friend.' : 'A client for life.' };
      if (fit === 'acceptable') return { now: 1000, perDay: 25, status: 'steady', note: 'A solid client. Not perfect, but steady.' };
      return { now: 500, perDay: 0, status: 'at-risk', note: 'A small sale that does not fit. It may not last.' };
    },
    cancelChance: 0.5,
    clawback: 2000,
    returnChance: 0.45,
    returnPayout: { now: 1000, perDay: 50 }
  };

  PP.newCareer = function () {
    return {
      savings: PP.content.practice.startSavings,
      journeys: 0,
      days: 0,
      book: [],               // { id, clientId, name, status, perDay, journey }
      skills: { curiosity: 0, preparation: 0, communication: 0, navigation: 0, resourcefulness: 0, judgment: 0 },
      contacts: [], met: {}, quests: {},
      referral: false,
      lastClient: null,
      history: [],            // { journey, client, outcome, cash }
      over: false,
      bestLevel: 'survivable'
    };
  };

  PP.career = {
    income(c) { return c.book.reduce((a, b) => a + (b.perDay || 0), 0); },
    level(c) {
      if (c.savings < 0) return 'unemployed';
      const inc = PP.career.income(c), cost = PP.content.practice.dailyCost;
      if (inc >= cost * 2) return 'profitable';
      if (inc >= cost) return 'sustainable';
      return 'survivable';
    },
    levelInfo(c) { const id = PP.career.level(c); return PP.content.practice.levels.find((l) => l.id === id); },
    runway(c) { const net = PP.content.practice.dailyCost - PP.career.income(c); return net <= 0 ? Infinity : Math.max(0, Math.floor(c.savings / net)); },
    /* One day passes: living costs out, book income in. Returns the net. */
    tickDay(c) {
      const net = PP.career.income(c) - PP.content.practice.dailyCost;
      c.savings += net; c.days++;
      return net;
    },
    save(c) { PP.store.set('career', c); },
    load() { const c = PP.store.get('career', null); return c && !c.over ? c : null; },
    clear() { PP.store.set('career', null); },
    money(n) { const v = Math.round(n); return (v < 0 ? '−$' : '$') + Math.abs(v).toLocaleString('en-US'); }
  };

  /* Mail from your book, delivered on the trail during later journeys. */
  PP.content.mailEvent = function (s, news) {
    const P = PP.content.practice;
    const entry = news.entry;
    if (news.kind === 'cancel') return {
      id: 'mail_cancel_' + entry.id, title: 'A letter by mail rider', at: ['travel'], cut: 'mail',
      text: `A rider gallops up with a letter. It's from ${entry.name}, your client from journey ${entry.journey}: "We've decided to cancel. It just wasn't the right fit for us." The commission is clawed back.`,
      choices: [
        { label: 'Call them to understand what went wrong', kind: 'prepare', eff: { cash: -P.clawback, energy: -1, insight: 1 }, result: `${entry.name} is kind about it. "You never really asked what we needed." That one stings, and it sticks.` },
        { label: 'File the letter and keep driving', kind: 'through', eff: { cash: -P.clawback }, result: 'You fold the letter very small.' }
      ],
      onResolve: () => { entry.status = 'cancelled'; entry.perDay = 0; }
    };
    if (news.kind === 'return') return {
      id: 'mail_return_' + entry.id, title: 'A letter by mail rider', at: ['travel'], cut: 'mail',
      text: `A rider brings a letter from ${entry.name}, who decided "not yet" on journey ${entry.journey}: "Things have settled. We're ready now, and we want to work with you."`,
      choices: [
        { label: 'Write back and welcome them', kind: 'prepare', eff: { cash: P.returnPayout.now, trust: 1 }, result: `${entry.name} joins your book. Your client notices you smiling.` }
      ],
      onResolve: () => { entry.status = 'life'; entry.perDay = P.returnPayout.perDay; }
    };
    return {
      id: 'mail_thanks_' + entry.id, title: 'A letter by mail rider', at: ['travel'], cut: 'mail',
      text: `A rider brings a note from ${entry.name}: "Just wanted to say thank you. Everything you set up is working."`,
      choices: [{ label: 'Pin it to the inside of the wagon', kind: 'prepare', eff: { energy: 2 }, result: 'It helps more than coffee.' }]
    };
  };
})(window.PP);
