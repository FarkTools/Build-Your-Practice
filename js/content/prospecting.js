/* Prospecting at Port Prospect. Each activity takes a day and fills your pipeline.
 * Mini-game activities return result.prospects = [{ temp, bias, source }]. */
(function (PP) {
  PP.content.prospecting = [
    { id: 'warm', name: 'Call your natural market', cost: 0, blurb: 'Friends, family, old colleagues. Warm, easy, and it runs out.', simple: true },
    { id: 'callathon', name: 'Call-a-thon', cost: 0, minigame: 'callathon', blurb: 'One phone, a list of strangers, and every objection in the book. Handle them fast.' },
    { id: 'mixer', name: 'Chamber of Commerce mixer', cost: 60, minigame: 'mixer', blurb: 'Name tags and warm white wine. Find the business owners. Avoid the essential oils.' },
    { id: 'market', name: 'Farmers market tent', cost: 120, minigame: 'market', blurb: 'A folding table, a raffle fishbowl, and a rival with an inflatable tube man.' },
    { id: 'seminar', name: 'Host a lunch & learn', cost: 400, blurb: 'Sandwiches for twenty. Whoever shows up, shows up. Better with Communication.', simple: true },
    { id: 'referrals', name: 'Ask happy clients for referrals', cost: 0, blurb: 'The best leads come from people who already trust you. Needs happy clients.', simple: true }
  ];

  /* Simple activities resolve instantly. Returns { text, prospects: [...] }. */
  PP.content.runSimpleProspecting = function (c, id) {
    const out = [];
    const C = PP.career;
    if (id === 'warm') {
      if (c.market <= 0) return { text: 'You scroll through your contacts. You have already called everyone who would pick up. Time for other ways to meet people.', prospects: [] };
      const n = c.agent === 'changer' ? 2 : PP.chance(0.6) ? 1 : 2;
      for (let i = 0; i < n && c.market > 0; i++) { c.market--; out.push(C.addProspect(c, { temp: 'warm', source: 'your natural market' })); }
      return { text: `You spend the day calling people you know. ${out.map((p) => p.name).join(' and ')} would love to talk. (${c.market} warm contacts left.)`, prospects: out };
    }
    if (id === 'seminar') {
      const comm = c.skills.communication || 0;
      const n = 1 + (PP.chance(0.5 + comm * 0.2) ? 1 : 0) + (comm >= 2 ? 1 : 0) + (c.workspace === 'office' ? 1 : 0);
      for (let i = 0; i < n; i++) out.push(C.addProspect(c, { temp: PP.chance(0.5) ? 'warm' : 'cold', source: 'your lunch & learn', bias: { morgan: 2, taylor: 1, rosa: 1 } }));
      return { text: `Twenty sandwiches, eleven attendees, ${n} real conversation${n > 1 ? 's' : ''} afterwards: ${out.map((p) => p.name).join(', ')}.`, prospects: out };
    }
    if (id === 'referrals') {
      const happy = c.book.filter((b) => (b.status === 'life' || b.status === 'steady') && b.sat >= 7);
      if (!happy.length) return { text: 'You do not have any happy clients to ask yet. Service the ones you have, or land some good ones.', prospects: [] };
      happy.forEach((b) => {
        b.sat = Math.max(0, b.sat - 0.5);
        if (PP.chance(c.agent === 'connector' ? 0.7 : 0.5)) out.push(C.addProspect(c, { temp: 'hot', source: `referral from ${b.name}` }));
      });
      return { text: out.length ? `You ask ${happy.length} happy client${happy.length > 1 ? 's' : ''}. ${out.map((p) => p.name).join(' and ')} ${out.length > 1 ? 'are' : 'is'} keen to meet you.` : 'Everyone says they will think of someone. Nobody does, this time.', prospects: out };
    }
    return { text: '', prospects: out };
  };
})(window.PP);
