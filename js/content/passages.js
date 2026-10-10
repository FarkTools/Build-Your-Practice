/* Hidden passages: better ways through each obstacle, opened by what you have built up.
 *
 * Every obstacle can still be faced head on (its normal event) or skipped by going around.
 * A passage is the third way: it gets you through the obstacle well, often turns it to
 * your advantage, and makes the next trail a day shorter. Locked passages are shown as
 * teasers ("needs Curiosity 2") so players know what to work toward.
 *
 *  PP.content.passages[nodeId] = [{
 *    id, name,                       short evocative name, e.g. 'The boardwalk'
 *    key: one of                      what opens it
 *      { skill: 'curiosity', level: 2 }
 *      { contact: 'whisperer' }       on call and not yet used this journey (uses it up)
 *      { system: 'planning' }         built at Harbor Street (or earned at the school)
 *      { item: 'notebook' }           in your pack, unused (uses it up)
 *      { trust: 7 } | { insight: 6 }  this journey's resources
 *      { fact: 'key' | 'stakeholder' | 'any' } or { facts: 3 }   what you know about this client
 *      { perk: 'scout' }              a school certificate perk
 *      { password: true }             Steve's back channels (from Steve, or his class at the school)
 *      { visits: 2 }                  you have been to this landmark on 2+ earlier journeys
 *      { followup: true }             only on a follow-up journey with an existing client
 *      { any: [key, key, ...] }       any one of these
 *    text: string | (s) => string,    what happens (use PP.clientName(s) for the client)
 *    eff:  effect object | (s) => effect   (see PP.apply in core.js)
 *  }]
 *
 * The engine (PP.passageOpen / PP.passageNeed) lives at the bottom of this file.
 */
(function (PP) {
  const C = (s) => PP.clientName(s);
  /* Small helpers so every passage reads well for any client archetype. */
  const facts = (s) => (s.client && s.client.facts) || {};
  const lbl = (s, f) => (f && facts(s)[f] ? facts(s)[f].label.toLowerCase() : 'what matters most to them');
  const keyLbl = (s) => lbl(s, s.client && s.client.keyFact);
  const stake = (s) => (s.client && s.client.shortStake) || 'everyone else who has a say';
  const worryFact = (s) => { const w = s.client && s.client.checkin && s.client.checkin.worry; return (w && w.fact) || (s.client && s.client.keyFact); };
  const unknownFact = (s) => Object.keys(facts(s)).find((f) => !PP.knows(s, f)) || null;
  const missedFact = (s) => Object.keys(s.missed || {}).find((f) => facts(s)[f] && !PP.knows(s, f)) || null;

  PP.content.passages = {
    /* ---------------- Rapport ---------------- */
    meadows: [
      { id: 'meadows_guide', name: 'Questions the sprites can\'t dodge', key: { system: 'discovery' },
        text: (s) => `The Small-Talk Sprites buzz in with the weather, the traffic, the weather again. Your discovery guide starts easy and reaches the real questions by the third bench, and the sprites run out of weather. ${C(s)} talks for an hour, then says, "Nobody's ever asked me that."`,
        eff: (s) => ({ insight: 2, trust: 1, fact: s.client.stakeholderFact }) },
      { id: 'meadows_bev', name: 'Bev knows the sprites by name', key: { contact: 'organizer' },
        text: (s) => `You mention that Bev sent you. The sprites, who adore Bev, settle on a fence to listen. ${C(s)} visibly unclenches. "Bev? Okay. Then I'll skip the version I tell salespeople."`,
        eff: { trust: 2, insight: 1 } },
      { id: 'meadows_again', name: 'The sprites remember you two', key: { followup: true },
        text: (s) => `You sit on the bench you sat on the first time. The sprites try "Lovely day, isn't it?" and ${C(s)} shoos them off: "We're past that." They start right in on what changed, and what it actually means for them.`,
        eff: { trust: 1, insight: 2 } },
      { id: 'meadows_known', name: 'You know the sprites\' tricks', key: { visits: 2 },
        text: 'You have met these sprites before. You let them have one weather remark each, then ask your real question while they are still curtseying. Less time finding your feet, more time listening.',
        eff: { insight: 1, energy: 1 } }
    ],
    lighthouse: [
      { id: 'lighthouse_marge', name: 'Marge translates the riddle', key: { contact: 'veteran' },
        text: '"The ship that sails on a hole forgets the hole," says the Oracle. Marge taps a page of your notes. "She means that one." A corner you cut, or a question you never asked. You fix it tonight, instead of finding out later.',
        eff: (s) => (s.debt.length ? { clearDebt: s.debt[0].tag, insight: 1 } : { insight: 2 }) },
      { id: 'lighthouse_bernie', name: 'Bernie has the answer key', key: { contact: 'regular' },
        text: 'You call Bernie from the bottom of the stairs. "She\'s going to say \'the tide is never late for itself\'. It means slow down, kid. Save yourself the climb." You sleep well and wake up knowing what to ask.',
        eff: { energy: 2, insight: 1 } },
      { id: 'lighthouse_stair', name: 'The back channel: the Oracle\'s nephew', key: { password: true },
        text: 'Steve\'s cousin is the Oracle\'s nephew. He takes you up the service stair, past the queue of puzzled agents, to the window with the best view of the trail ahead. "Aunt says the riddle is \'look before you walk\'. Steve says you\'re all right."',
        eff: { reveal: true, momentum: 1, insight: 1 } },
      { id: 'lighthouse_known', name: 'The riddle finally makes sense', key: { visits: 2 },
        text: (s) => `"What grows when you share it and shrinks when you rush it?" Last time it baffled you. Now you just say, "Trust." The Oracle pours your tea. ${C(s)} looks at you like you speak a secret language.`,
        eff: { insight: 1, trust: 1 } }
    ],
    wreck: [
      { id: 'wreck_harold', name: 'Wax in your ears, their story in your head', key: { contact: 'compliance' },
        text: (s) => `Harold hands you two wax earplugs and one sentence: "Say only what's true, and say it after they've told you what they need." The Sirens of the Quick Close sing their hearts out. ${C(s)} watches you not move.`,
        eff: { trust: 1, insight: 1, clearDebt: 'premature_pitch' } },
      { id: 'wreck_unhurried', name: 'The client laughs at the Sirens', key: { trust: 7 },
        text: (s) => `"Sign to-day! Sign to-day!" ${C(s)} laughs out loud. "Do they think we're in a rush? I'd rather get it right." The Sirens look genuinely offended. Trust like that works better than earplugs.`,
        eff: { momentum: 2, trust: 1 } },
      { id: 'wreck_mast', name: 'Lashed to the mast', key: { skill: 'judgment', level: 2 },
        text: (s) => `You can hear the Sirens now without following them. You let them sing, point at the wreck, and tell ${C(s)} the honest version: what quick decisions have cost people. The Sirens lose their place in the chorus.`,
        eff: { trust: 2, insight: 1 } },
      { id: 'wreck_known', name: 'The Sirens know that tune won\'t work', key: { visits: 2 },
        text: 'The Sirens see you coming and sigh. "Oh, it\'s you." They hum half-heartedly. The soggy agent on the rocks waves: he has dried out and is doing better. You pull one useful lesson off the wreck and keep walking.',
        eff: { insight: 1, momentum: 1 } }
    ],

    /* ---------------- Fact find ---------------- */
    fog: [
      { id: 'fog_notes', name: 'A lantern the wisps can\'t fool', key: { system: 'notes' },
        text: (s) => `A wisp bobs up: "Was it next YEAR?" Your notes say next month, with the date ${C(s)} said it and their exact words. You hold them up like a lantern and the wisp fizzles out in embarrassment.`,
        eff: { insight: 1, momentum: 1, clearDebt: 'timeline' } },
      { id: 'fog_notebook', name: 'The wisp you caught in a notebook', key: { item: 'notebook' },
        text: (s) => `In the grey you flip to a page you forgot you wrote: half a sentence ${C(s)} said weeks ago, underlined twice. One wisp was trapped in there all along. You ask about it. Their eyebrows go up. "You remembered that?"`,
        eff: (s) => ({ insight: 1, trust: 1, fact: missedFact(s) || s.client.stakeholderFact }) },
      { id: 'fog_fieldnotes', name: 'Every wisp, labeled and dated', key: { any: [{ perk: 'scout' }, { skill: 'navigation', level: 2 }] },
        text: 'Your field habits pay off: every detail sorted by date, every "we\'ll see" flagged as a question to come back to. The wisps try to lead you astray and find themselves politely filed. You walk the fog like a hallway with the lights on.',
        eff: { insight: 2 } },
      { id: 'fog_known', name: 'You\'ve followed the wrong wisp before', key: { visits: 2 },
        text: (s) => `You remember which wisp got you lost last time, so you ask the date questions at the trailhead, before the fog rolls in. ${C(s)} answers every one. The wisps drift off to bother someone else.`,
        eff: { momentum: 1, insight: 1 } }
    ],
    loop: [
      { id: 'loop_once', name: 'Feed the Ouroboros once', key: { system: 'crm' },
        text: 'The Ouroboros opens its jaws and asks for everything again. Your client database already has it, checked and current. You hand it over in one go. The serpent, full for once, uncoils into a straight line and takes a nap.',
        eff: { momentum: 2, insight: 1 } },
      { id: 'loop_clerk', name: 'Someone who knows the serpent\'s keeper', key: { any: [{ contact: 'connector' }, { skill: 'resourcefulness', level: 1 }] },
        text: 'You know someone who knows the clerk who feeds the Ouroboros. One friendly call later, the serpent lifts its tail like a gate. It could always do that. Nobody had asked.',
        eff: { momentum: 2, energy: 1 } },
      { id: 'loop_words', name: 'Read the serpent their own words', key: { facts: 2 },
        text: (s) => `Instead of filling in the form again, you read back what ${C(s)} has told you so far, in their own words. The Ouroboros stops chewing to listen. "That's right," ${C(s)} says, "except..." The "except" is worth more than the whole form.`,
        eff: (s) => ({ insight: 1, trust: 1, fact: unknownFact(s) }) },
      { id: 'loop_known', name: 'Where the serpent bites its tail', key: { visits: 2 },
        text: 'You have done enough laps around this serpent to know exactly where its mouth meets its tail. You check the address once, properly, and step over the gap.',
        eff: { momentum: 1, energy: 1 } }
    ],
    cliffs: [
      { id: 'cliffs_ask', name: 'A question the Harpies can\'t shout over', key: { skill: 'curiosity', level: 1 },
        text: (s) => `The Harpies shriek product names and herd agents toward the edge. You sit down well back and ask ${C(s)} what they'd want a plan to do if no product existed at all. The Harpies have no word for that, and go quiet.`,
        eff: { insight: 2, trust: 1 } },
      { id: 'cliffs_reason', name: 'Their reason drowns out the shrieking', key: { fact: 'key' },
        text: (s) => `A Harpy swoops in waving a brochure. You let it pass. You already know what matters here: ${keyLbl(s)}. Every option gets measured against that, out loud. ${C(s)} relaxes. The Harpy, ignored, goes to sulk on a rock.`,
        eff: { trust: 2, momentum: 1 } },
      { id: 'cliffs_goats', name: 'The back channel: the goat path', key: { password: true },
        text: 'Steve\'s cousin keeps goats up here and is on first-name terms with every Harpy, mostly because they are scared of his goats. "Goats never run off edges," he says, leading you along a slow path across the top. "They look first. Steve says you should too."',
        eff: { momentum: 1, insight: 1, energy: 1 } },
      { id: 'cliffs_known', name: 'You know where the Harpies herd people', key: { visits: 2 },
        text: (s) => `You have watched the Harpies drive enough agents over this edge. This time you point it out to ${C(s)}: "That's what I'm trying not to do to you." They laugh, and then trust you a little more.`,
        eff: { trust: 1, insight: 1 } }
    ],

    /* ---------------- Risks ---------------- */
    swamp: [
      { id: 'swamp_boardwalk', name: 'Cut the head off at the root', key: { system: 'planning' },
        text: (s) => `Your planning software finds the one root all the Hydra's heads grow from. Snip. No new tabs sprout. ${C(s)} watches the numbers line up and, for once, relaxes.`, eff: { momentum: 2, insight: 1 } },
      { id: 'swamp_their_model', name: 'Ask which head bites hardest', key: { fact: 'any' },
        text: (s) => `Instead of fighting ${C(s)}'s Hydra, you ask them to introduce you to each head. Head number seven, the quiet one on tab 7, is where the real worry lives.`, eff: (s) => ({ insight: 2, trust: 1, fact: s.client.spreadsheetFact }) },
      { id: 'swamp_second_eyes', name: 'A Hydra-tamer from the port', key: { any: [{ contact: 'cpa' }, { contact: 'banker' }] },
        text: 'You send a sketch of the Hydra to someone at the port who tames numbers for a living. Four minutes later: "Ignore heads 3 to 12. Watch the two that matter: money in, money out." Half the heads go to sleep on the spot.',
        eff: { insight: 2, clearDebt: 'spreadsheet_assumptions' } },
      { id: 'swamp_local', name: 'The Hydra remembers your sword', key: { visits: 2 },
        text: 'You have faced this Hydra before. It eyes you warily. You know which heads hold weight and which are just formatting, and you walk straight past the decorative ones.', eff: { momentum: 1, energy: 1 } }
    ],
    caves: [
      { id: 'caves_lantern', name: 'Name each fear and the dragon rolls over', key: { any: [{ facts: 3 }, { insight: 7 }] },
        text: (s) => `You know enough about ${C(s)} to tell which worst cases are only scary and which one is real for them. You name that one first, gently. The What-If Dragon rolls over like a big dog, and ${C(s)} tells you the rest themselves.`,
        eff: (s) => ({ trust: 1, insight: 1, fact: worryFact(s) }) },
      { id: 'caves_gentle', name: 'Wake the dragon one scale at a time', key: { any: [{ skill: 'communication', level: 2 }, { contact: 'librarian' }] },
        text: (s) => `Plain words, slow pace: "What if work stopped for six months? Let's just look at it." The dragon opens one eye, then the other, and nothing breathes fire. ${C(s)} says it is the first money talk that didn't make their stomach hurt.`,
        eff: { trust: 2, insight: 1 } },
      { id: 'caves_together', name: 'You faced this dragon together before', key: { followup: true },
        text: (s) => `Last time, you and ${C(s)} woke the dragon together and looked at its hoard. Now one of those worst cases has come true. They remember you went in with them, and this time they walk up and pat its nose first.`,
        eff: (s) => ({ trust: 1, insight: 2, fact: worryFact(s) }) },
      { id: 'caves_known', name: 'The dragon knows your footsteps', key: { visits: 2 },
        text: 'The dragon lifts its head, sniffs, and puts it back down. "You again." Your chalk marks are still on the walls: job loss this way, illness that way, the long-life tunnel at the back. You know which ones go somewhere.',
        eff: { insight: 2 } }
    ],

    /* ---------------- Solutions ---------------- */
    sands: [
      { id: 'sands_filter', name: 'The fine print, read aloud', key: { system: 'focus' },
        text: (s) => `The Djinn offers its three wishes. Your focus routine reads the fine print aloud: does this help ${C(s)}, or does it help my quarter? The Djinn sulks back into its lamp, and the sand under your boots firms up.`,
        eff: { insight: 1, momentum: 1, trust: 1 } },
      { id: 'sands_anchor', name: 'A wish the Djinn can\'t grant', key: { fact: 'key' },
        text: (s) => `The Djinn waves this quarter's prize at you. You stand still, because you know what this plan has to handle: ${keyLbl(s)}. No wish in the lamp is shaped like that. ${C(s)} watches you turn the Djinn down and says nothing, but they noticed.`,
        eff: { trust: 2, insight: 1 } },
      { id: 'sands_judge', name: 'The back channel: the Djinn\'s old master', key: { password: true },
        text: 'Steve\'s cousin once held the Djinn\'s lamp, until he noticed his wishes kept costing him clients. He shows you the firm ground between the dunes. "Pick the plan you\'d defend in five years. The prize trip only lasts a week."',
        eff: { momentum: 1, insight: 1, energy: 1 } },
      { id: 'sands_known', name: 'Same three wishes, new lamp', key: { visits: 2 },
        text: 'The Djinn rises with a fresh sparkle and the same three wishes: last year\'s contest with a new font and a different beach. You wave politely. It only gets a grip on you if you step toward the prize.',
        eff: { momentum: 1, insight: 1 } }
    ],
    summit: [
      { id: 'summit_standing', name: 'The Sphinx already knows you', key: { system: 'specialist' },
        text: (s) => `You have a standing slot with the Summit Sphinx. Your notes on ${C(s)} arrive before you do, so she has read them over coffee. "No riddles today," she says, and waves you through.`,
        eff: { insight: 1, momentum: 2 } },
      { id: 'summit_friend', name: 'A friend of the Sphinx', key: { any: [{ contact: 'specialist' }, { contact: 'expediter' }] },
        text: (s) => `Someone at the port owes you one. A short message goes up the mountain, and the Sphinx quietly turns her "allow 3-5 business days" sign to "this afternoon." ${C(s)} is impressed that you know people. And sphinxes.`,
        eff: { momentum: 2, trust: 1 } },
      { id: 'summit_answer', name: 'The answer before the riddle', key: { fact: 'key' },
        text: (s) => `The Sphinx draws breath for her first riddle. You answer it before she asks: ${keyLbl(s)}. Something rare happens on the Summit. The Sphinx says, "Oh, good."`,
        eff: { momentum: 2, insight: 1 } },
      { id: 'summit_known', name: 'You know all three riddles by heart', key: { visits: 3 },
        text: 'Your fourth time up this mountain. You know the Sphinx\'s riddles, which forms to send ahead, and that she likes the handoff stapled, not clipped. You barely break a sweat.',
        eff: { energy: 2, momentum: 1 } }
    ],

    /* ---------------- Follow-through ---------------- */
    snakepit: [
      { id: 'snakepit_sloane', name: 'Sloane holds half the snakes', key: { contact: 'peer' },
        text: 'Sloane grabs half the Gorgon\'s ringing snakes while you answer the rest. "You owe me lunch. Also, one of yours just had twins." You call that one yourself.',
        eff: { momentum: 1, trust: 1, clearDebt: 'missed_message' } },
      { id: 'snakepit_batch', name: 'Return every call: the snakes go quiet', key: { any: [{ skill: 'preparation', level: 1 }, { perk: 'stamina' }] },
        text: 'You don\'t dive in. You sort first: hard news gets a call today, good news gets a card, everything else gets a time. One by one the snakes stop ringing. The Gorgon, deprived of material, files her nails.',
        eff: { momentum: 1, energy: 1, insight: 1 } },
      { id: 'snakepit_history', name: 'Clients the Gorgon can\'t petrify', key: { followup: true },
        text: (s) => `${C(s)} has been your client long enough to know you call back, and so have the others ringing down here. The Gorgon glares, but nobody turns to stone. ${C(s)} watches you handle it and looks quietly pleased to be one of them.`,
        eff: { trust: 2, momentum: 1 } },
      { id: 'snakepit_known', name: 'You know which snakes bite', key: { visits: 2 },
        text: 'You have stared down the Gorgon before. You can tell a "just checking in" hiss from a "something happened" hiss, and you answer the right three first.',
        eff: { momentum: 1, trust: 1 } }
    ],
    isles: [
      { id: 'isles_setup', name: 'A friendly tentacle', key: { system: 'tech' },
        text: (s) => `Your tech setup has the Kraken trained. One tentacle holds the e-signature, another holds the right portal open before ${C(s)} has found their glasses. Two taps, one code, done. "That's it? I took the afternoon off for this."`,
        eff: { momentum: 2, trust: 1 } },
      { id: 'isles_kenji', name: 'Kenji speaks Kraken', key: { contact: 'whisperer' },
        text: (s) => `Kenji ferries you past the Kraken, muttering at it about password managers. On the way he spots one tentacle waving a login request that did not come from ${C(s)}. "Delete that. Don't click it. You're welcome."`,
        eff: { momentum: 1, trust: 1, clearDebt: 'fraud' } },
      { id: 'isles_mailboat', name: 'The back channel: the mail boat', key: { password: true },
        text: 'Steve\'s cousin runs the mail boat, and the Kraken has never once asked it for a password. They play cards on Thursdays. Signed paper forms, carried by hand between the islands, delivered the same day.',
        eff: { momentum: 2, energy: 1 } },
      { id: 'isles_known', name: 'You know each tentacle\'s moods', key: { visits: 2 },
        text: (s) => `You have wrestled the Kraken enough to know which tentacle wants the code by text, which wants it by email, and which one times out if you blink. ${C(s)} gets through without a single reset.`,
        eff: { momentum: 1, trust: 1 } }
    ],
    toll: [
      { id: 'toll_file', name: 'The Troll checks his list and you\'re on it', key: { system: 'review' },
        text: 'Your review process kept the file current long before you got here. The Toll Troll runs a finger down his list, finds you, and says something you have never heard him say: "Nothing to add."',
        eff: { trust: 1, momentum: 2 } },
      { id: 'toll_both', name: 'Everyone the Troll asks about, asked', key: { fact: 'stakeholder' },
        text: (s) => `The Troll wants to know who else needs to sign off. You already know: ${stake(s)} has seen the plan and had their say. The Troll ticks a box with visible, slightly alarming satisfaction.`,
        eff: { trust: 1, momentum: 1, clearDebt: 'unknown_stakeholder' } },
      { id: 'toll_olu', name: 'Olu, the Troll\'s favorite', key: { any: [{ item: 'checklist' }, { contact: 'operator' }] },
        text: 'Olu\'s checklist (or Olu himself, on the phone) has already caught the one date that was out of date. You fix it at the booth. The Troll nods. "Someone\'s been talking to Olu."',
        eff: (s) => (s.debt.length ? { momentum: 1, clearDebt: s.debt[0].tag } : { momentum: 1, insight: 1 }) },
      { id: 'toll_known', name: 'The Troll knows your face', key: { visits: 2 },
        text: (s) => `The Troll waves from under the bridge. "You again. Your files are always tidy. Go on." ${C(s)} is impressed. It took a few trips to earn that wave.`,
        eff: { momentum: 1, energy: 1 } }
    ]
  };

  /* ---------- engine ---------- */
  const skillLabel = (id) => (PP.SKILLS.find((x) => x.id === id) || { label: id }).label;
  function open(s, k) {
    const c = s.career || {};
    if (k.any) return k.any.some((x) => open(s, x));
    if (k.skill) return PP.skill(s, k.skill) >= Math.max(1, k.level - (c.perks && c.perks.pathfinder ? 1 : 0));
    if (k.contact) return (s.contacts || []).includes(k.contact) && PP.contactReady(s, k.contact);
    if (k.system) return PP.career.hasSystem(c, k.system);
    if (k.item) return PP.hasItem(s, k.item);
    if (k.trust) return s.res.trust >= k.trust;
    if (k.insight) return s.res.insight >= k.insight;
    if (k.facts) return Object.keys(s.facts).length >= k.facts;
    if (k.fact) {
      const cl = s.client || {};
      if (k.fact === 'any') return Object.keys(s.facts).length > 0;
      if (k.fact === 'key') return PP.knows(s, cl.keyFact);
      if (k.fact === 'stakeholder') return PP.knows(s, cl.stakeholderFact);
      return PP.knows(s, k.fact);
    }
    if (k.perk) return !!(c.perks && c.perks[k.perk]);
    if (k.password) return !!s.password;
    if (k.visits) return ((c.visits || {})[s.map.current] || 0) >= k.visits;
    if (k.followup) return !!s.followUp;
    return false;
  }
  function need(k) {
    if (k.any) return k.any.map(need).join(' or ');
    if (k.skill) return `${skillLabel(k.skill)} ${k.level}`;
    if (k.contact) return `${(PP.content.contacts[k.contact] || {}).who || k.contact} on call`;
    if (k.system) return `the ${((PP.content.practice.systems[k.system]) || {}).name || k.system}`;
    if (k.item) return `a ${((PP.content.items[k.item]) || {}).name || k.item} in your pack`;
    if (k.trust) return `Trust ${k.trust}`;
    if (k.insight) return `Insight ${k.insight}`;
    if (k.facts) return `${k.facts} facts about the client`;
    if (k.fact) return k.fact === 'any' ? 'something you have learned about the client' : k.fact === 'key' ? 'the thing that changes everything for this client' : k.fact === 'stakeholder' ? 'knowing who else has a say' : 'a particular fact about the client';
    if (k.perk) return `the ${((PP.content.town && PP.content.town.perks[k.perk]) || {}).name || k.perk} certificate`;
    if (k.password) return 'one of Steve\'s back channels';
    if (k.visits) return `${k.visits} earlier trips through here`;
    if (k.followup) return 'an existing client';
    return '?';
  }
  PP.passageOpen = (s, p) => open(s, p.key);
  PP.passageNeed = (p) => p.need || need(p.key);
  PP.passagesAt = (id) => (PP.content.passages && PP.content.passages[id]) || [];
  /* Spend what the key consumes (a contact's help or a pack item). */
  PP.passageSpend = (s, k) => {
    if (k.any) { const hit = k.any.find((x) => open(s, x)); if (hit) PP.passageSpend(s, hit); return; }
    if (k.contact) PP.useContact(s, k.contact);
    if (k.item) PP.useItem(s, k.item);
  };
})(window.PP);
