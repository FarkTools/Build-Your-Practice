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
      { id: 'meadows_guide', name: 'The questions that open the gate', key: { system: 'discovery' },
        text: (s) => `You don't wing it. Your discovery guide starts with the easy questions and reaches the real ones by the third bench. ${C(s)} talks for an hour, then says, "Nobody's ever asked me that."`,
        eff: (s) => ({ insight: 2, trust: 1, fact: s.client.stakeholderFact }) },
      { id: 'meadows_bev', name: 'Bev\'s introduction', key: { contact: 'organizer' },
        text: (s) => `You mention that Bev sent you. ${C(s)} visibly unclenches. "Bev? Okay. Then I'll skip the version I tell salespeople."`,
        eff: { trust: 2, insight: 1 } },
      { id: 'meadows_again', name: 'The same bench as last time', key: { followup: true },
        text: (s) => `You sit on the bench you sat on the first time. ${C(s)} doesn't need warming up. They start right in on what changed, and what it actually means for them.`,
        eff: { trust: 1, insight: 2 } },
      { id: 'meadows_known', name: 'The path you wore last time', key: { visits: 2 },
        text: 'You know this meadow now: which bench gets the shade, which questions land best before lunch. Less time finding your feet, more time listening.',
        eff: { insight: 1, energy: 1 } }
    ],
    lighthouse: [
      { id: 'lighthouse_marge', name: 'Marge at the lamp', key: { contact: 'veteran' },
        text: '"That one," Marge says, tapping a page of your notes by lamplight. A corner you cut, or a question you never asked. Either way you deal with it tonight, instead of finding out later.',
        eff: (s) => (s.debt.length ? { clearDebt: s.debt[0].tag, insight: 1 } : { insight: 2 }) },
      { id: 'lighthouse_bernie', name: 'Bernie on the phone', key: { contact: 'regular' },
        text: 'You call Bernie from the bottom of the stairs. "The keeper\'s going to tell you to slow down, kid. Save yourself the climb: slow down." You sleep well and wake up knowing what to ask.',
        eff: { energy: 2, insight: 1 } },
      { id: 'lighthouse_stair', name: 'The back channel: the service stair', key: { password: true },
        text: 'Steve\'s cousin keeps the lamp. He lets you up the service stair, past the queue for tea, to the window with the best view of the trail ahead. "Steve says you\'re all right. Don\'t tell the keeper."',
        eff: { reveal: true, momentum: 1, insight: 1 } },
      { id: 'lighthouse_known', name: 'A regular at the keeper\'s table', key: { visits: 2 },
        text: (s) => `The keeper pours your tea before you ask. "Back again? Good. Means the last one went well enough to need a next one." She skips the lecture. ${C(s)} notices she knows you.`,
        eff: { insight: 1, trust: 1 } }
    ],
    wreck: [
      { id: 'wreck_harold', name: 'Harold\'s earplugs', key: { contact: 'compliance' },
        text: (s) => `Harold hands you two wax earplugs and one sentence: "Say only what's true, and say it after they've told you what they need." The sirens sing their hearts out. ${C(s)} watches you not move.`,
        eff: { trust: 1, insight: 1, clearDebt: 'premature_pitch' } },
      { id: 'wreck_unhurried', name: 'A client in no hurry', key: { trust: 7 },
        text: (s) => `The sirens start up: "Close it to-day!" ${C(s)} laughs. "Do they think we're in a rush? I'd rather get it right." Trust like that works better than earplugs.`,
        eff: { momentum: 2, trust: 1 } },
      { id: 'wreck_mast', name: 'Lashed to the mast', key: { skill: 'judgment', level: 2 },
        text: (s) => `You can hear the song now without following it. You let it play, point at the wreck, and tell ${C(s)} the honest version: what quick decisions have cost people. They lean in.`,
        eff: { trust: 2, insight: 1 } },
      { id: 'wreck_known', name: 'Salvage from last time', key: { visits: 2 },
        text: 'You know this wreck. The soggy agent waves: he has dried out and is doing better. You pull one useful lesson off the rocks and leave the song behind.',
        eff: { insight: 1, momentum: 1 } }
    ],

    /* ---------------- Fact find ---------------- */
    fog: [
      { id: 'fog_notes', name: 'Notes, dated and searchable', key: { system: 'notes' },
        text: (s) => `The fog rolls in and you don't mind. "Next month," your notes say, with the date ${C(s)} said it and their exact words. The fog has nothing left to take.`,
        eff: { insight: 1, momentum: 1, clearDebt: 'timeline' } },
      { id: 'fog_notebook', name: 'The battered notebook', key: { item: 'notebook' },
        text: (s) => `In the grey you flip to a page you forgot you wrote: half a sentence ${C(s)} said weeks ago, underlined twice. You ask about it. Their eyebrows go up. "You remembered that?"`,
        eff: (s) => ({ insight: 1, trust: 1, fact: missedFact(s) || s.client.stakeholderFact }) },
      { id: 'fog_fieldnotes', name: 'Field notes in the margin', key: { any: [{ perk: 'scout' }, { skill: 'navigation', level: 2 }] },
        text: 'Your field habits pay off: every detail sorted by date, every "we\'ll see" flagged as a question to come back to. You walk the fog like a hallway with the lights on.',
        eff: { insight: 2 } },
      { id: 'fog_known', name: 'The questions you ask before the fog', key: { visits: 2 },
        text: (s) => `You've been lost in here before, so now you ask the date questions at the trailhead, before the fog arrives. ${C(s)} answers every one of them.`,
        eff: { momentum: 1, insight: 1 } }
    ],
    loop: [
      { id: 'loop_once', name: 'Enter it once', key: { system: 'crm' },
        text: 'The sign asks you to re-enter everything. Your client database already has it, checked and current. One button, and the loop unwinds into a straight line.',
        eff: { momentum: 2, insight: 1 } },
      { id: 'loop_clerk', name: 'Someone who knows the clerk', key: { any: [{ contact: 'connector' }, { skill: 'resourcefulness', level: 1 }] },
        text: 'You know someone who knows the clerk who maintains the loop. One friendly call later, there is a gate in the fence. It was always there. Nobody had asked.',
        eff: { momentum: 2, energy: 1 } },
      { id: 'loop_words', name: 'Their story, in their words', key: { facts: 2 },
        text: (s) => `Instead of retyping the form, you read back what ${C(s)} has told you so far, in their own words. "That's right," they say, "except..." The "except" is worth more than the whole form.`,
        eff: (s) => ({ insight: 1, trust: 1, fact: unknownFact(s) }) },
      { id: 'loop_known', name: 'Where the loop doubles back', key: { visits: 2 },
        text: 'You have done enough laps to know where the loop doubles back on itself. You check the address once, properly, and step off at the right spot.',
        eff: { momentum: 1, energy: 1 } }
    ],
    cliffs: [
      { id: 'cliffs_ask', name: 'The question before the brochure', key: { skill: 'curiosity', level: 1 },
        text: (s) => `Agents rush past, brochures flapping. You sit down well back from the edge and ask ${C(s)} what they'd want a plan to do for them if no product existed at all. The answer isn't in any brochure.`,
        eff: { insight: 2, trust: 1 } },
      { id: 'cliffs_reason', name: 'Lead with their reason', key: { fact: 'key' },
        text: (s) => `A brochure blows past and you let it go. You already know what matters here: ${keyLbl(s)}. Every option gets measured against that, out loud. ${C(s)} relaxes. You are clearly not here to sell them a brochure.`,
        eff: { trust: 2, momentum: 1 } },
      { id: 'cliffs_goats', name: 'The back channel: the goat path', key: { password: true },
        text: 'Steve\'s cousin keeps goats up here. "Goats never run off edges," he says, leading you along a slow path across the top. "They look first. Steve says you should too."',
        eff: { momentum: 1, insight: 1, energy: 1 } },
      { id: 'cliffs_known', name: 'You have watched them fall', key: { visits: 2 },
        text: (s) => `You have stood at this edge before and watched enough agents go over. This time you point it out to ${C(s)}: "That's what I'm trying not to do to you." They laugh, and then trust you a little more.`,
        eff: { trust: 1, insight: 1 } }
    ],

    /* ---------------- Risks ---------------- */
    swamp: [
      { id: 'swamp_boardwalk', name: 'The boardwalk', key: { system: 'planning' },
        text: (s) => `Your planning software lays a clean boardwalk across the cells. ${C(s)} watches the numbers line up and, for once, relaxes.`, eff: { momentum: 2, insight: 1 } },
      { id: 'swamp_their_model', name: 'Their own spreadsheet', key: { fact: 'any' },
        text: (s) => `Instead of fighting ${C(s)}'s spreadsheet, you ask them to walk you through it. Tab 7 is where the real worry lives.`, eff: (s) => ({ insight: 2, trust: 1, fact: s.client.spreadsheetFact }) },
      { id: 'swamp_second_eyes', name: 'A second pair of eyes', key: { any: [{ contact: 'cpa' }, { contact: 'banker' }] },
        text: 'You send the spreadsheet to someone at the port who reads numbers for a living. Four minutes later: "Ignore tabs 3 to 12. Look at when the money comes in and when it goes out." That one line drains half the swamp.',
        eff: { insight: 2, clearDebt: 'spreadsheet_assumptions' } },
      { id: 'swamp_local', name: 'Your old path through the reeds', key: { visits: 2 },
        text: 'You have crossed this swamp before. You know which cells hold weight and which are just formatting.', eff: { momentum: 1, energy: 1 } }
    ],
    caves: [
      { id: 'caves_lantern', name: 'A lantern made of what you know', key: { any: [{ facts: 3 }, { insight: 7 }] },
        text: (s) => `You know enough about ${C(s)} to light the way: which what-ifs are only scary, and which one is real for them. You go to that one first, gently. They tell you the rest themselves.`,
        eff: (s) => ({ trust: 1, insight: 1, fact: worryFact(s) }) },
      { id: 'caves_gentle', name: 'One what-if at a time', key: { any: [{ skill: 'communication', level: 2 }, { contact: 'librarian' }] },
        text: (s) => `Plain words, slow pace: "What if work stopped for six months? Let's just look at it." Then the next one, and the next. Nothing jumps out of the dark. ${C(s)} says it is the first money talk that didn't make their stomach hurt.`,
        eff: { trust: 2, insight: 1 } },
      { id: 'caves_together', name: 'You came in here together before', key: { followup: true },
        text: (s) => `Last time, you walked ${C(s)} through these tunnels and talked about what might happen. Now one of those things has. They remember that you went in with them, and this time they lead.`,
        eff: (s) => ({ trust: 1, insight: 2, fact: worryFact(s) }) },
      { id: 'caves_known', name: 'Your chalk marks on the wall', key: { visits: 2 },
        text: 'Your chalk marks from earlier trips are still on the walls: job loss this way, illness that way, the long-life tunnel at the back. You know which ones are dead ends and which ones go somewhere.',
        eff: { insight: 2 } }
    ],

    /* ---------------- Solutions ---------------- */
    sands: [
      { id: 'sands_filter', name: 'Your focus filter', key: { system: 'focus' },
        text: (s) => `Every banner gets the same question from your focus routine: does this help ${C(s)}, or does it help my quarter? Most of the banners go quiet. The sand under your boots firms up.`,
        eff: { insight: 1, momentum: 1, trust: 1 } },
      { id: 'sands_anchor', name: 'Anchored to what they need', key: { fact: 'key' },
        text: (s) => `The dunes slide toward this quarter's featured product. You stand still, because you know what this plan has to handle: ${keyLbl(s)}. No contest prize is shaped like that. ${C(s)} watches you walk past the banners and says nothing, but they noticed.`,
        eff: { trust: 2, insight: 1 } },
      { id: 'sands_judge', name: 'The back channel: the old contest judge', key: { password: true },
        text: 'Steve\'s cousin used to judge the sales contests, until he noticed the winners\' clients kept leaving. He shows you where the firm ground runs between the banners. "Pick the plan you\'d defend in five years. The trip only lasts a week."',
        eff: { momentum: 1, insight: 1, energy: 1 } },
      { id: 'sands_known', name: 'Same contest, new font', key: { visits: 2 },
        text: 'You have crossed these dunes before. You recognize the banners: last year\'s contest with a new font and a different beach. The ground only shifts if you step where the prize is.',
        eff: { momentum: 1, insight: 1 } }
    ],
    summit: [
      { id: 'summit_standing', name: 'The standing appointment', key: { system: 'specialist' },
        text: 'You have a standing slot with the Summit. Your handoff arrives before you do, with context, so the Specialist has read it over coffee and is already working when you reach the top.',
        eff: { insight: 1, momentum: 2 } },
      { id: 'summit_friend', name: 'A friend at the top', key: { any: [{ contact: 'specialist' }, { contact: 'expediter' }] },
        text: (s) => `Someone at the port owes you one. A short message goes up the mountain, and the "allow 3-5 business days" sign is quietly turned to "this afternoon." ${C(s)} is impressed that you know people.`,
        eff: { momentum: 2, trust: 1 } },
      { id: 'summit_answer', name: 'The answer before the question', key: { fact: 'key' },
        text: (s) => `The Specialist opens their mouth to ask the big question. You hand over the answer first: ${keyLbl(s)}. Something rare happens on the Summit. Someone says, "Oh, good."`,
        eff: { momentum: 2, insight: 1 } },
      { id: 'summit_known', name: 'The switchbacks you know', key: { visits: 3 },
        text: 'Your fourth time up this mountain. You know where the trail is steep, where it is only slow, and which forms to send ahead. You barely break a sweat.',
        eff: { energy: 2, momentum: 1 } }
    ],

    /* ---------------- Follow-through ---------------- */
    snakepit: [
      { id: 'snakepit_sloane', name: 'Sloane takes the overflow', key: { contact: 'peer' },
        text: 'Sloane picks up half the ringing phones while you take the rest. "You owe me lunch. Also, one of yours just had twins." You call that one yourself.',
        eff: { momentum: 1, trust: 1, clearDebt: 'missed_message' } },
      { id: 'snakepit_batch', name: 'Calls, in one calm batch', key: { any: [{ skill: 'preparation', level: 1 }, { perk: 'stamina' }] },
        text: 'You don\'t dive in. You sort first: hard news gets a call today, good news gets a card, everything else gets a time. An hour later the pit is quiet, and you still have something left in the tank.',
        eff: { momentum: 1, energy: 1, insight: 1 } },
      { id: 'snakepit_history', name: 'Clients who know you call back', key: { followup: true },
        text: (s) => `${C(s)} has been your client long enough to know you call back, and so have the others ringing down here. Nobody is panicking. They are just keeping you posted. ${C(s)} watches you handle it and looks quietly pleased to be one of them.`,
        eff: { trust: 2, momentum: 1 } },
      { id: 'snakepit_known', name: 'You know which ones bite', key: { visits: 2 },
        text: 'You have been down here before. You can tell a "just checking in" ring from a "something happened" ring, and you answer the right three first.',
        eff: { momentum: 1, trust: 1 } }
    ],
    isles: [
      { id: 'isles_setup', name: 'Bridges that just work', key: { system: 'tech' },
        text: (s) => `Your tech setup has the e-signature ready and the right portal open before ${C(s)} has found their glasses. Two taps, one code, done. "That's it? I took the afternoon off for this."`,
        eff: { momentum: 2, trust: 1 } },
      { id: 'isles_kenji', name: 'Kenji\'s ferry', key: { contact: 'whisperer' },
        text: (s) => `Kenji ferries you between the islands, muttering about password managers. On the way he spots one login request that did not come from ${C(s)}. "Delete that. Don't click it. You're welcome."`,
        eff: { momentum: 1, trust: 1, clearDebt: 'fraud' } },
      { id: 'isles_mailboat', name: 'The back channel: the mail boat', key: { password: true },
        text: 'Steve\'s cousin runs the mail boat, and the mail boat has never once asked for a password. Signed paper forms, carried by hand between the islands, delivered the same day. Old technology, fast result.',
        eff: { momentum: 2, energy: 1 } },
      { id: 'isles_known', name: 'You know each island\'s moods', key: { visits: 2 },
        text: (s) => `You have crossed the Isles enough to know which one wants the code by text, which wants it by email, and which one times out if you blink. ${C(s)} gets through without a single reset.`,
        eff: { momentum: 1, trust: 1 } }
    ],
    toll: [
      { id: 'toll_file', name: 'The tidy file', key: { system: 'review' },
        text: 'Your review process kept the file current long before you got here. The troll reads it, stamps it, and says something you have never heard him say: "Nothing to add."',
        eff: { trust: 1, momentum: 2 } },
      { id: 'toll_both', name: 'Everyone who has to agree, agreed', key: { fact: 'stakeholder' },
        text: (s) => `The troll wants to know who else needs to sign off. You already know: ${stake(s)} has seen the plan and had their say. The troll ticks a box with visible satisfaction.`,
        eff: { trust: 1, momentum: 1, clearDebt: 'unknown_stakeholder' } },
      { id: 'toll_olu', name: 'Olu\'s way across', key: { any: [{ item: 'checklist' }, { contact: 'operator' }] },
        text: 'Olu\'s checklist (or Olu himself, on the phone) has already caught the one thing that was out of date. You fix it at the booth. The troll nods. "Someone\'s been talking to Olu."',
        eff: (s) => (s.debt.length ? { momentum: 1, clearDebt: s.debt[0].tag } : { momentum: 1, insight: 1 }) },
      { id: 'toll_known', name: 'The troll knows your face', key: { visits: 2 },
        text: 'The troll waves from the booth. "You again. Your files are always tidy. Go on." It took a few trips to earn that wave.',
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
