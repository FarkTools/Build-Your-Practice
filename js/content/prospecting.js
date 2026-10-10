/* Prospecting at Port Prospect. Each activity takes a day and fills your pipeline.
 * Mini-game activities return result.prospects = [{ temp, bias, source }].
 * Simple activities resolve instantly through runSimpleProspecting.
 * Optional on any activity: requires(c) -> bool and requiresText, so the UI can
 * disable the button with a reason (runSimpleProspecting also checks and refunds). */
(function (PP) {
  const activeClients = (c) => c.book.filter((b) => ['life', 'steady', 'at-risk'].includes(b.status));

  PP.content.prospecting = [
    { id: 'warm', name: 'Call your natural market', cost: 0, blurb: 'Friends, family, old colleagues. Warm, easy, and it runs out.', simple: true },
    { id: 'callathon', name: 'Call-a-thon', cost: 0, minigame: 'callathon', blurb: 'One phone, a list of strangers, and every objection in the book. Handle them fast.' },
    { id: 'mixer', name: 'Chamber of Commerce mixer', cost: 60, minigame: 'mixer', blurb: 'Name tags and warm white wine. Find the business owners. Avoid the essential oils.' },
    { id: 'market', name: 'Farmers market tent', cost: 120, minigame: 'market', blurb: 'A folding table, a raffle fishbowl, and a rival with an inflatable tube man.' },
    { id: 'seminar', name: 'Host a lunch & learn', cost: 400, blurb: 'Sandwiches for twenty. Whoever shows up, shows up. Better with Communication.', simple: true },
    { id: 'referrals', name: 'Ask happy clients for referrals', cost: 0, blurb: 'The best leads come from people who already trust you. Needs happy clients.', simple: true,
      requires: (c) => c.book.some((b) => (b.status === 'life' || b.status === 'steady') && b.sat >= 7), requiresText: 'Needs at least one happy client.' },
    { id: 'fair', name: 'Booth at the school fair', cost: 80, blurb: 'A folding table between the bake sale and the dunk tank. Parents, grandparents, and a lot of sticky hands.', simple: true },
    { id: 'library', name: 'Free workshop at the library', cost: 30, blurb: 'Room B, Tuesday night, Connie\'s rule: teach, don\'t sell. Handouts cost a little. Better with Communication.', simple: true },
    { id: 'stripmall', name: 'Cold-walk the strip mall', cost: 0, blurb: 'Nine doors, nine owners, at least four "No soliciting" signs. Business owners, mostly cold.', simple: true },
    { id: 'neighbors', name: 'Post in the neighborhood group', cost: 0, blurb: 'Between the lost cats and the leaf-blower wars, a short, friendly hello. Free, and anything can happen.', simple: true },
    { id: 'littleleague', name: 'Sponsor a Little League team', cost: 250, blurb: 'Your name on fourteen small shirts and a day in the bleachers. Families and local business owners.', simple: true },
    { id: 'appreciation', name: 'Throw a client appreciation evening', cost: 200, blurb: 'Thank your clients and tell them to bring a friend. Clients feel looked after; some friends become prospects. Needs clients.', simple: true,
      requires: (c) => activeClients(c).length > 0, requiresText: 'Needs at least one client in your book.' }
  ];

  /* ---- Random outcome tables for the newer simple activities ----
   * Each outcome: w (weight, number or fn(c)), n (count or [min,max]),
   * temp ('warm' | 'cold' | 'hot' | 'mix'), bias (extra bias), text(names, n, c). */
  const list = (ps) => {
    const n = ps.map((p) => p.name);
    return n.length <= 1 ? n.join('') : n.slice(0, -1).join(', ') + ' and ' + n[n.length - 1];
  };
  const OUT = {
    fair: { event: true, source: 'the school fair', bias: { family: 2, caregiver: 1 }, outcomes: [
      { w: 3, n: 2, temp: 'warm', text: (x) => `You share a corner with the bake sale. Parents come for the brownies and stay to talk. ${x} want to hear more.` },
      { w: 3, n: 1, temp: 'warm', text: (x) => `The dunk tank is right next to you. Mostly you hear splashing. Then a damp parent, ${x}, dries off and asks a genuinely good question about "doing this properly before the kids get older."` },
      { w: 2, n: 0, text: () => 'A gang of nine-year-olds takes every pen, every sticker and one of your chairs. No prospects, but you are now famous with the third grade.' },
      { w: 2, n: 3, temp: 'mix', text: (x) => `Your "Guess the jelly beans" jar is a hit: sixty slips and three real conversations. ${x} all leave their numbers. The winner guessed 412. It was 411.` },
      { w: 2, n: 1, temp: 'cold', text: (x) => `The PTA moves you next to the bouncy castle. You shout an entire conversation with ${x} over the generator. They seem to have heard most of it.` },
      { w: 2, n: 2, temp: 'warm', bias: { caregiver: 2 }, text: (x) => `A grandmother collecting two kids tells you about her mother, her kids and her kids' kids, all at once. She sends over ${x}. "They need you more than I do, dear."` }
    ] },
    library: { event: true, source: 'your library workshop', bias: { early: 1, retiree: 1, changes: 1, windfall: 1 }, outcomes: [
      { w: 3, n: 2, temp: 'warm', text: (x) => `Twelve chairs, nine people, no selling. You teach one idea properly instead of six badly. Afterwards ${x} hang back to ask if you do one-on-ones.` },
      { w: 2, n: 1, temp: 'warm', text: (x) => `Three people come. One is asleep. One is Connie. The third, ${x}, fills a whole page with notes and asks for your card "for when I'm ready."` },
      { w: (c) => (c.skills.communication ? 1 : 3), n: 0, text: () => 'The projector refuses to talk to your laptop. You do the whole thing on a whiteboard with a dying marker. Nobody follows up, but Connie says you were "very nearly clear."' },
      { w: 2, n: 2, temp: 'mix', text: (x) => `One question turns into a twenty-minute story about an uncle and a timeshare. You let it, because everyone is nodding. ${x} email you that night.` },
      { w: (c) => 1 + (c.skills.communication || 0) * 2, n: 3, temp: 'warm', text: (x) => `You skip the slides and just answer questions. It is the best hour you have had all month. ${x} all want to keep the conversation going.` },
      { w: 1, n: 1, temp: 'hot', text: (x) => `A woman in the front row has clearly been waiting years for someone to explain this without making her feel silly. ${x} books a meeting before you have packed up.` }
    ] },
    stripmall: { source: 'cold-walking the strip mall', bias: { owner: 3 }, outcomes: [
      { w: 3, n: 1, temp: 'cold', text: (x) => `Nail salon, vape shop, dentist, sandwich place. The sandwich place owner, ${x}, talks to you between orders and admits nobody has ever asked how the business is actually doing.` },
      { w: 3, n: 0, text: () => 'Every door says "No soliciting." One says "No soliciting. Yes, you." You buy a sandwich out of respect and go home.' },
      { w: 2, n: 2, temp: 'cold', text: (x) => `You stop pitching after the second door and start asking "what's your busiest month?" instead. People open up. ${x} take your card and actually read it.` },
      { w: 2, n: 1, temp: 'warm', text: (x) => `The dry cleaner recognizes you from the farmers market. "You're the one who didn't have a tube man!" ${x} has questions and twenty minutes.` },
      { w: 2, n: 1, temp: 'cold', text: (x) => `The tattoo parlor owner, ${x}, hears you out with great seriousness. "Come back Tuesday. It's dead on Tuesdays. We'll talk properly."` },
      { w: 1, n: 0, text: () => 'You get as far as the pet groomer, where a very large dog leans on you for forty minutes. You are not allowed to leave. Nobody signs anything. You feel great.' }
    ] },
    neighbors: { source: 'your post in the neighborhood group', bias: { family: 1, changes: 1, caregiver: 1, early: 1 }, outcomes: [
      { w: 3, n: 0, text: () => 'Your post lands between a lost cat and a forty-comment fight about leaf blowers. It gets two likes. One is your aunt.' },
      { w: 3, n: 1, temp: 'cold', text: (x) => `${x} sends you a private message: "Saw your post. Not sure if this is your kind of thing, but..." It is exactly your kind of thing.` },
      { w: 2, n: 2, temp: 'warm', text: (x) => `Someone asks the group "does anyone know someone who explains money stuff without being weird about it?" Three people tag you. ${x} get in touch.` },
      { w: 2, n: 1, temp: 'warm', text: (x) => `Your post gets reported as spam. The moderator, who turns out to live next door to one of your clients, restores it with a note: "This one's alright." ${x} reaches out the same day.` },
      { w: 2, n: 0, text: () => 'A man replies "scam" with no further explanation. Eleven people like his comment. You decide not to argue with a stranger online, which is the most professional thing you do all week.' },
      { w: 1, n: 2, temp: 'mix', text: (x) => `You reply to a question about something else entirely with a helpful, plain answer and no pitch. It gets more attention than your post did. ${x} want to talk.` }
    ] },
    littleleague: { event: true, source: 'the Little League bleachers', bias: { family: 2, owner: 1 }, outcomes: [
      { w: 3, n: 2, temp: 'warm', text: (x) => `Your name is on the back of fourteen shirts. The Harbor Hawks lose 14-2, but in the bleachers ${x} want to know who you are and what you do.` },
      { w: 2, n: 1, temp: 'warm', text: (x) => `The jerseys arrive with your name misspelled. One parent, ${x}, thinks it is the funniest thing they have ever seen and insists on buying you a hot dog and hearing all about it.` },
      { w: 2, n: 3, temp: 'warm', text: (x) => `The Hawks win. Nobody can explain how. At the pizza party ${x} all thank "the sponsor" and ask for your card.` },
      { w: 2, n: 1, temp: 'warm', bias: { owner: 3 }, text: (x) => `The coach, ${x}, runs a landscaping business and spends three innings telling you about the slow season. "Can we talk properly? Not here, Tyler is about to bat."` },
      { w: 2, n: 0, text: () => 'It rains. The game is cancelled. You eat orange slices alone in your car and look at the banner, which does look great.' },
      { w: 1, n: 2, temp: 'mix', text: (x) => `You get roped into running the scoreboard and get the score wrong twice. Parents forgive you. ${x} even ask for a meeting, "as long as you're better with numbers than with the scoreboard."` }
    ] }
  };

  function rollOutcome(c, id) {
    const def = OUT[id];
    const weights = def.outcomes.map((o) => Math.max(0, PP.val(o.w, c)));
    let r = Math.random() * weights.reduce((a, b) => a + b, 0), o = def.outcomes[0];
    for (let i = 0; i < weights.length; i++) { r -= weights[i]; if (r <= 0) { o = def.outcomes[i]; break; } }
    let n = Array.isArray(o.n) ? o.n[0] + Math.floor(Math.random() * (o.n[1] - o.n[0] + 1)) : o.n;
    if (n && id === 'littleleague' && c.agent === 'connector') n++; // coaches know coaches
    const bias = Object.assign({}, def.bias);
    Object.entries(o.bias || {}).forEach(([k, v]) => (bias[k] = (bias[k] || 0) + v));
    const out = [];
    for (let i = 0; i < n; i++) {
      const temp = o.temp === 'mix' ? PP.pick(['warm', 'warm', 'cold']) : o.temp || 'warm';
      out.push(PP.career.addProspect(c, { temp, source: def.source, bias, event: !!def.event }));
    }
    return { text: o.text(list(out), n, c), prospects: out };
  }

  /* Simple activities resolve instantly. Returns { text, prospects: [...] }. */
  PP.content.runSimpleProspecting = function (c, id) {
    const out = [];
    const C = PP.career;
    const act = PP.content.prospecting.find((a) => a.id === id);
    if (act && act.requires && !act.requires(c)) {
      c.savings += act.cost || 0; // the UI charged up front; nothing happened, so give it back
      if (id === 'appreciation') return { text: 'You draft a lovely invitation, then realize you have nobody to send it to yet. Land a client or two first.', prospects: [] };
    }
    if (id === 'warm') {
      if (c.market <= 0) return { text: 'You scroll through your contacts. You have already called everyone who would pick up. Time for other ways to meet people.', prospects: [] };
      const n = c.agent === 'changer' ? 2 : PP.chance(0.6) ? 1 : 2;
      for (let i = 0; i < n && c.market > 0; i++) { c.market--; out.push(C.addProspect(c, { temp: 'warm', source: 'your natural market' })); }
      return { text: `You spend the day calling people you know. ${out.map((p) => p.name).join(' and ')} would love to talk. (${c.market} warm contacts left.)`, prospects: out };
    }
    if (id === 'seminar') {
      const comm = c.skills.communication || 0;
      const n = 1 + (PP.chance(0.5 + comm * 0.2) ? 1 : 0) + (comm >= 2 ? 1 : 0) + (c.workspace === 'office' ? 1 : 0);
      for (let i = 0; i < n; i++) out.push(C.addProspect(c, { temp: PP.chance(0.5) ? 'warm' : 'cold', source: 'your lunch & learn', bias: { numbers: 2, family: 1, owner: 1 } }));
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
    if (OUT[id]) return rollOutcome(c, id);
    if (id === 'appreciation') {
      const clients = activeClients(c);
      const venue = PP.pick([
        'You book the back room of the bakery and buy far too many little tarts.',
        'You rent two lanes at the bowling alley. Nobody bowls well. Everybody has a wonderful time.',
        'You set up a picnic by the harbor and pray for no rain. It holds, mostly.',
        'You host a trivia night. Your clients form a team called "Asked Good Questions" and win.',
        'You organize a cheese tasting. Nobody understands the cheese. The conversation is excellent.',
        'You take over the patio at the taco place. Bernie shows up uninvited with a coffee urn. It works.'
      ]);
      clients.forEach((b) => {
        b.sat = Math.min(10, b.sat + 1);
        if (PP.chance(b.sat >= 7 ? 0.45 : 0.25)) out.push(C.addProspect(c, { temp: b.sat >= 8 ? 'hot' : 'warm', source: `a friend ${b.name} brought along` }));
      });
      const tail = out.length >= 2 ? `By the end of the night ${list(out)} have asked if they can come and see you properly.`
        : out.length ? `${out[0].name}, who came as somebody's plus-one, asks for your card on the way out.`
          : 'Everyone came alone this time, but they left feeling looked after, and that counts for a lot.';
      return { text: `${venue} ${clients.length} client${clients.length > 1 ? 's' : ''} come${clients.length > 1 ? '' : 's'} (satisfaction +1 each). ${tail}`, prospects: out };
    }
    return { text: '', prospects: out };
  };
})(window.PP);
