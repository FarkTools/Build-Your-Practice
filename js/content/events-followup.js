/* Follow-up journeys: events that only happen when you walk the trail again with an existing client.
 *
 * The client already trusts you, some facts carry over from last time, and life has
 * just changed (s.followUp.title). These beats are about the relationship itself:
 * picking up where you left off, not copying last time's plan, the people around
 * the client, and "how else can I help?"
 * Everything about the client comes from s.client and s.followUp, so these work for any archetype.
 */
(function (PP) {
  const C = (s) => PP.clientName(s);
  const F = (s) => !!s.followUp;
  const K = PP.knows;
  let roll = false;

  /* ---------- helpers ---------- */
  const S = (s) => (s.client && s.client.shortStake) || 'someone close to them';
  const lap = (s) => (s.followUp && s.followUp.lap) || 2;
  const nth = (n) => ({ 2: 'second', 3: 'third', 4: 'fourth', 5: 'fifth' }[n] || n + 'th');
  const change = (s) => ((s.followUp && s.followUp.title) || 'a change').toLowerCase();
  const opens = (s) => PP.skill(s, 'curiosity') > 0 || s.res.trust >= 6;
  const comm = (s) => PP.skill(s, 'communication') > 0;
  const needKnown = (s) => K(s, 'change_need');
  const seg = (s) => (s.client && PP.content.clients[s.client.id] && PP.content.clients[s.client.id].segment) || 'family';
  const bias = (s) => ({ [seg(s)]: 2 });
  /* Facts carried over from last time (known, still true, not this lap's need). */
  const carried = (s) => Object.keys(s.facts || {}).filter((k) => k !== 'change_need' && s.client && s.client.facts[k]);
  const oldFact = (s) => { const k = carried(s)[0]; return k ? s.client.facts[k].label.toLowerCase() : null; };
  const bookEntry = (s) => s.career && s.followUp && (s.career.book || []).find((b) => b.id === s.followUp.bookId);
  const lastPlan = (s) => { const b = bookEntry(s); const h = b && s.career && (s.career.history || []).find((x) => x.journey === b.journey); return h && h.outcome && PP.content.destinations ? h.outcome : 'last time\'s plan'; };
  const hasNotes = (s) => PP.hasItem(s, 'notebook') || (s.career && PP.career && PP.career.hasSystem && PP.career.hasSystem(s.career, 'notes'));

  PP.content.events.push(

    /* ================= ON THE ROAD ================= */

    {
      id: 'fu_remembered', title: '"You remembered"', at: ['travel'], weight: 2,
      when: (s) => F(s),
      text: (s) => `Half a day out, ${C(s)} goes quiet, then says, "I wasn't sure you'd remember me." You do. ${oldFact(s) ? `You remember that ${oldFact(s)}.` : 'You remember the name of their dog, how they take their coffee, and that they hate being called "folks."'} It's lap ${lap(s)} of this relationship, and it shows.`,
      choices: [
        { label: 'Say what you remember, and ask how things are really going', kind: 'prepare', hint: 'Warm. Opens a door. Takes a little time.',
          eff: { trust: 1, momentum: -1 },
          then: { text: (s) => `${C(s)} smiles properly for the first time since the call. "Okay. Since you asked. The ${change(s)} thing is... bigger than I made it sound on the phone."`,
            choices: [
              { label: 'Ask what "bigger" means', kind: 'prepare', hint: 'They might not be ready.',
                eff: (s) => (opens(s) ? { fact: 'change_need', insight: 1 } : { insight: 1 }),
                result: (s) => (opens(s) ? `It comes out in a rush. ${C(s)} looks lighter for having said it.` : `"I'll get there. Give me a day." Fair enough. You have time.`) },
              { label: '"Whenever you\'re ready. I\'m not going anywhere."', kind: 'around', eff: { trust: 1 }, result: (s) => `${C(s)} nods. "That's why I called you and not the number on the internet."` }
            ] } },
        { label: 'Skip the catch-up: you know them, get straight to it', kind: 'through', hint: 'Efficient. Familiarity can feel like assuming.',
          eff: { momentum: 2, debt: { tag: 'assumed_goal', sev: 1 } },
          result: (s) => `You launch into what you think the ${change(s)} means for them. ${C(s)} nods along. They haven't told you anything yet, you realize later.` },
        { label: 'Flip back through your notes from last time', kind: 'help', show: hasNotes, hint: 'Past you, writing things down. Hero.',
          eff: { insight: 1, trust: 1 },
          result: (s) => `There, in the margin: a detail you'd forgotten you knew. You mention it. ${C(s)} actually gasps. "You WROTE that down?"` }
      ]
    },

    {
      id: 'fu_stake_opinions', title: 'Someone has opinions', at: ['travel'],
      when: (s) => F(s) && !!s.client.shortStake,
      text: (s) => `${C(s)}'s phone buzzes for the fourth time in an hour. "Sorry. It's ${S(s)}. They heard about the ${change(s)}. They have thoughts. A lot of thoughts. One of them is in all capitals."`,
      choices: [
        { label: `Suggest bringing them into the next conversation`, kind: 'prepare', hint: 'Slower. Everyone who matters is in the room.',
          eff: (s) => ({ momentum: -1, trust: 1, insight: 1, fact: s.client.stakeholderFact }),
          then: { text: (s) => `${S(s)} joins by video, slightly too close to the camera. "I just want to know someone's actually thinking about this properly." They look at you. "Are you?"`,
            choices: [
              { label: 'Ask what worries them most', kind: 'prepare', eff: (s) => (comm(s) || s.res.trust >= 6 ? { trust: 1, insight: 1, fact: 'change_need' } : { insight: 1 }),
                result: (s) => `${S(s)} says the thing ${C(s)} hasn't been able to. ${C(s)} doesn't argue. Sometimes the people around a client know things first.` },
              { label: 'Walk them through what you did last time', kind: 'around', eff: { trust: 1, momentum: 1 },
                result: (s) => `${S(s)} listens, arms folded, then unfolds them. "Okay. That was sensible." High praise, apparently.` }
            ] } },
        { label: 'Let the client handle them and keep moving', kind: 'through', hint: 'Fast. You will hear their opinions later, secondhand.',
          eff: (s) => ({ momentum: 1, debt: { tag: 'unknown_stakeholder', sev: 2 } }),
          result: (s) => `${C(s)} types "I've got it handled" and puts the phone face-down. It keeps buzzing, face-down.` },
        { label: 'Offer to write a short note they can forward', kind: 'help', show: comm, hint: 'Communication: one clear page beats twelve texts.',
          eff: { energy: -1, trust: 1, momentum: 1 },
          result: (s) => `Five plain sentences, no jargon. ${C(s)} forwards it. The reply: "fine. thank you. who IS this person?"` }
      ]
    },

    {
      id: 'fu_rival_noticed', title: 'A rival noticed', at: ['travel'],
      when: (s) => F(s),
      text: (s) => `${C(s)} hands you a glossy card that arrived yesterday. "CONGRATULATIONS ON YOUR NEW CHAPTER! Let's talk about your future." It's from an agent across town. "How did he even know?" ${C(s)} asks. "I only told about six people. And the internet."`,
      choices: [
        { label: 'Ask what, if anything, appealed about it', kind: 'prepare', hint: 'Humbling, maybe. Useful, definitely.',
          eff: { insight: 1, momentum: -1 },
          then: { text: (s) => `${C(s)} thinks. "Honestly? He got in touch first. I called you. He just... showed up." They don't sound accusing. They sound like they're telling you something.`,
            choices: [
              { label: 'Promise to check in before the next change, not after', kind: 'prepare', eff: { trust: 2, energy: -1 }, result: (s) => `You put a date in your calendar while ${C(s)} watches. "Huh," they say. "Okay."` },
              { label: '"Fair. That\'s on me."', kind: 'around', eff: { trust: 1 }, result: 'Owning it costs nothing and buys a lot.' }
            ] } },
        { label: 'Make a joke about the font and move on', kind: 'around', hint: 'Light. Doesn\'t address why it stung.',
          eff: { momentum: 1 }, result: (s) => `${C(s)} laughs. The card goes in your pocket, not the bin. You notice that.` },
        { label: 'Out-pitch him: lay out everything you could do right now', kind: 'through', hint: 'Fights the rival, not the problem.',
          eff: { momentum: 2, trust: -1, debt: { tag: 'premature_pitch', sev: 2 } },
          result: (s) => `It's an impressive list. ${C(s)} says, "That's a lot," which is not the same as "yes."` }
      ]
    },

    {
      id: 'fu_phone_call', title: 'The call they had to take', at: ['travel'],
      when: (s) => F(s),
      text: (s) => `${C(s)} steps away to take a call. Something about the ${change(s)}: you catch "today?" and "no, I understand" and a long silence. They come back pale and say, "Sorry. Where were we?"`,
      choices: [
        { label: 'Stop for the day. Nothing here can\'t wait until tomorrow', kind: 'prepare', hint: 'A day lost. A person looked after.',
          eff: { days: 1, trust: 2, energy: 1, momentum: -1 },
          result: (s) => `You find a bench and a terrible vending-machine tea. ${C(s)} talks for a while, not about money at all. Tomorrow they're steadier.` },
        { label: 'Ask, gently, what the call was about', kind: 'help', hint: 'Only if they want to say.',
          eff: (s) => (s.res.trust >= 6 ? { fact: 'change_need', trust: 1 } : { insight: 1 }),
          result: (s) => (s.res.trust >= 6 ? `They tell you. It's exactly the thing that matters, and they hadn't said it until now.` : `"Just... admin," ${C(s)} says. It obviously wasn't. Maybe once they trust you a bit more.`) },
        { label: 'Pick up exactly where you left off', kind: 'through', hint: 'Keeps the pace. Reads a bit cold.',
          eff: { momentum: 1, trust: -1 },
          result: (s) => `You pick up mid-sentence. ${C(s)} nods at the right moments and doesn't hear a word.` }
      ]
    },

    {
      id: 'fu_we_did_this', title: '"We already did all this"', at: ['travel'],
      when: (s) => F(s) && lap(s) >= 2,
      text: (s) => `You start on the usual questions. ${C(s)} waves a hand. "We did all this last time. Same address, same job, same everything. Well. Except the ${change(s)}, obviously."`,
      choices: [
        { label: 'Skip it. They\'d know, wouldn\'t they?', kind: 'through', hint: 'Saves a day. Things change quietly too.',
          eff: { momentum: 2, debt: { tag: 'unverified_details', sev: 2 } },
          result: 'You skip ahead. It feels like trust. It might also be a gap.' },
        { label: 'Run through it quickly anyway', kind: 'prepare', hint: 'A little tedious. A little safer.',
          eff: { energy: -1, insight: 1 },
          result: (s) => `Halfway through, ${C(s)} says, "Oh. Actually, that's changed." Of course it has.` },
        { label: 'Explain why it matters after a big change', kind: 'help', show: comm, hint: 'Communication: turns a chore into care.',
          eff: { insight: 1, trust: 1 },
          result: (s) => `"When one big thing moves, little things move with it." ${C(s)} sighs, then hands over their phone to check. Two little things had moved.` }
      ]
    },

    {
      id: 'fu_how_else', title: '"How else can I help?"', at: ['travel', 'sands', 'summit'],
      when: (s) => F(s) && s.res.trust >= 4,
      text: (s) => `It's a good day on the trail. The ${change(s)} feels a bit more manageable. ${C(s)} says, "Thanks for coming back out with me. Seriously." There's a pause where you could say "of course" and leave it there.`,
      choices: [
        { label: 'Ask, "Is there anything else going on I should know about?"', kind: 'prepare', hint: 'The best question you\'ll ask all week.',
          eff: { insight: 1 },
          then: { text: (s) => `${C(s)} hesitates. "Well... it's not about me. A friend of mine has been going through something too. I didn't know if that was a thing you... did."`,
            choices: [
              { label: '"It\'s exactly a thing I do. Would they want to talk?"', kind: 'help', eff: (s) => ({ trust: 1, prospect: { temp: 'warm', source: `a friend of ${C(s)}`, bias: bias(s), event: true } }),
                result: (s) => `${C(s)} texts them right there. A thumbs-up comes back almost immediately. (New prospect in your pipeline.)` },
              { label: 'Ask how it\'s affecting the client', kind: 'prepare', eff: (s) => (opens(s) ? { fact: 'change_need', insight: 1 } : { insight: 1, trust: 1 }),
                result: (s) => (opens(s) ? `It turns out it's tangled up with their own situation more than they'd said. That changes the picture.` : `"Not much, really." But they're glad you asked about them first.`) }
            ] } },
        { label: '"Of course." Keep walking.', kind: 'around', eff: { momentum: 1 }, result: 'A nice moment. Just a moment.' },
        { label: 'Ask straight out who else they could refer', kind: 'through', hint: 'Direct. Can feel transactional mid-crisis.',
          eff: (s) => (comm(s) ? { prospect: { temp: 'warm', source: `a referral from ${C(s)}`, bias: bias(s), event: true } } : { trust: -1, prospect: { temp: 'cold', source: `a name ${C(s)} gave you`, event: true } }),
          result: (s) => (comm(s) ? `You ask lightly, and well. ${C(s)} gives you a name without thinking twice. (New prospect in your pipeline.)` : `${C(s)} gives you a name, a little stiffly. "Right now? Okay." (New prospect in your pipeline.)`) }
      ]
    },

    {
      id: 'fu_thank_you', title: 'A thank-you for last time', at: ['travel', 'meadows'],
      when: (s) => F(s),
      text: (s) => `${C(s)} digs in their bag and hands you something wrapped in foil. "I made these. For last time. I never said thank you properly, and then the ${change(s)} happened and I thought, well, I'd better say it before I ask for more help."`,
      choices: [
        { label: 'Accept, and ask what actually helped last time', kind: 'prepare', hint: 'Feedback is a gift too. Usually less crumbly.',
          eff: { insight: 1, trust: 1 },
          result: (s) => `"Honestly? You didn't make me feel stupid." ${C(s)} shrugs. "Everything else was fine. That part I remembered."` },
        { label: '"Just doing my job."', kind: 'around', hint: 'Modest. Also a bit of a door-close.',
          eff: { momentum: 1 },
          result: (s) => `${C(s)} looks faintly disappointed, as if they'd wanted it to be more than a job. The cookies are excellent.` },
        { label: 'Share them out and make it a proper break', kind: 'help', hint: 'Slower. Good for everyone.',
          eff: { energy: 2, trust: 1, momentum: -1 },
          result: (s) => `You sit on a wall and eat cookies. ${C(s)} tells you a story about last year you'd never heard. Lap ${lap(s)}, and you're still learning things.` }
      ]
    },

    /* ================= AT LANDMARKS ================= */

    {
      id: 'fu_copy_paste_plan', title: 'Copy last time\'s plan?', at: ['loop', 'swamp'],
      when: (s) => F(s),
      text: (s) => `The trail curls back on itself. A sign reads: "RETURNING CLIENT? Simply re-use your previous plan! (Recommended.)" Below it, a button: COPY ${String(lastPlan(s)).toUpperCase()}. It would be so easy. ${C(s)}'s life has changed, but has it changed THAT much?`,
      choices: [
        { label: 'Press the button', kind: 'through', hint: 'Last time\'s answer to last time\'s life.',
          eff: { momentum: 2, debt: [{ tag: 'ignored_change', sev: 2 }, { tag: 'assumed_goal', sev: 1 }] },
          result: 'Everything fills in beautifully. Every field is green. None of them mention the change.' },
        { label: 'Go through the old plan with them, line by line', kind: 'prepare', hint: 'Slow. Shows you what still fits and what doesn\'t.',
          eff: { energy: -1, insight: 1 },
          then: { text: (s) => `Line by line, ${C(s)} reads along. Most of it still holds. Then they stop at one line and frown. "That bit was for before."`,
            choices: [
              { label: 'Ask what "before" means now', kind: 'prepare', eff: (s) => (opens(s) ? { fact: 'change_need', trust: 1 } : { insight: 1 }),
                result: (s) => (opens(s) ? `"Before the ${change(s)}. Now it's..." and they tell you what's really changed.` : `"Just... before." They're not quite ready to say. But you know where to look.`) },
              { label: 'Mark it and keep going', kind: 'around', eff: { momentum: 1 }, result: 'You circle it in red. It is very much still circled.' }
            ] } },
        { label: 'Ask Olu to pull the old file and flag what\'s out of date', kind: 'help', contact: 'operator', show: (s) => PP.contactReady(s, 'operator'), hint: 'Olu loves a diff.',
          eff: { insight: 2, momentum: 1, clearDebt: 'stale_info' },
          result: 'Olu sends back the old file with three lines highlighted in yellow and a note: "These were true once."' }
      ]
    },

    {
      id: 'fu_fog_history', title: 'They remember for you', at: ['fog'],
      when: (s) => F(s),
      text: (s) => `In the fog, you reach for a detail from last time and it isn't there. Was it their brother or their cousin? Before you can guess, ${C(s)} says, "My cousin. You were going to ask. You always tilt your head when you're about to ask." Shared history works both ways.`,
      choices: [
        { label: 'Laugh, admit it, and let them lead for a bit', kind: 'around', hint: 'Humble. Slower. Clients like being the expert on their own life.',
          eff: { trust: 1, insight: 1, momentum: -1 },
          result: (s) => `${C(s)} walks you through the fog, filling in gaps. They know the way. It's their life, after all.` },
        { label: 'Bluff through the rest of the details', kind: 'through', hint: 'You\'ll get most of it right.',
          eff: { momentum: 1, debt: { tag: 'guessed_key', sev: 2 } },
          result: 'You nod confidently through the next three details. You are confident about two of them.' },
        { label: 'Check your notes from last time', kind: 'help', show: hasNotes, hint: 'The notebook, or the notes system, if you kept one.',
          eff: { insight: 2 },
          result: (s) => `Page by page, last time comes back. ${C(s)} peers at your handwriting. "Is that a drawing of my dog?" It is.` }
      ]
    },

    {
      id: 'fu_caves_resurface', title: 'It catches up with them', at: ['caves'],
      when: (s) => F(s),
      text: (s) => `Deep in the Caves of What-Ifs, the voices echo: "but what if...?" ${C(s)} stops walking. "I've been fine about the ${change(s)}. Really fine. Totally fine." Their voice cracks on the third "fine."`,
      choices: [
        { label: 'Sit down with them and say nothing for a while', kind: 'prepare', hint: 'Costs energy. Says more than a plan would.',
          eff: (s) => ({ energy: -1, trust: 2, fact: s.res.trust >= 5 ? 'change_need' : undefined }),
          result: (s) => (needKnown(s) ? `After a long while, ${C(s)} says the real thing out loud. The cave seems smaller afterwards.` : `You sit on a cold rock together. ${C(s)} doesn't say much. But they don't let go of your sleeve either.`) },
        { label: 'Gently walk through the what-ifs one at a time', kind: 'help', hint: 'Turn fear into a list.',
          eff: { insight: 2, energy: -1 },
          then: { text: (s) => `One by one, the what-ifs get smaller when you name them. Then ${C(s)} says, "There's one I haven't said."`,
            choices: [
              { label: '"Go on."', kind: 'prepare', eff: (s) => (opens(s) ? { fact: 'change_need' } : { trust: 1 }),
                result: (s) => (opens(s) ? 'They say it. That one is the one that matters.' : `"Not yet," ${C(s)} says. "But I will."`) },
              { label: '"That\'s enough for today."', kind: 'around', eff: { trust: 1, energy: 1 }, result: 'You head for the light. Some things keep.' }
            ] } },
        { label: 'Crack a joke to lift the mood and push on', kind: 'through', hint: 'Fast. Might land. Might not.',
          eff: () => ((roll = PP.chance(0.5)) ? { momentum: 1, trust: 1 } : { momentum: 1, trust: -1 }), preview: '50%: they laugh (Trust +1). Otherwise it stings (Trust -1).',
          result: (s) => (roll ? `${C(s)} snorts. "Okay. Okay. Thank you. I needed that."` : `${C(s)} gives you a look. "I'm being serious." You were too, sort of.`) }
      ]
    },

    {
      id: 'fu_old_spreadsheet', title: 'Last time\'s spreadsheet', at: ['swamp'],
      when: (s) => F(s),
      text: (s) => `${C(s)} opens the spreadsheet you built together last time. It's lovely. It's color-coded. Every number in it assumes life before the ${change(s)}. "Can we just... change a couple of cells?"`,
      choices: [
        { label: 'Change a couple of cells', kind: 'through', hint: 'Quick. Nobody remembers what the other cells assumed.',
          eff: { momentum: 1, debt: { tag: 'spreadsheet_assumptions', sev: 2 } },
          result: 'Two cells change. Forty others quietly carry on believing in a different life.' },
        { label: 'Start fresh from what\'s true now', kind: 'prepare', hint: 'A tiring afternoon. A model that fits.',
          eff: (s) => ({ energy: -2, insight: 2, fact: opens(s) ? 'change_need' : undefined }),
          result: (s) => (needKnown(s) ? `Rebuilding row by row, the real shape of the change appears in the numbers before ${C(s)} says it out loud.` : 'A fresh sheet. Cleaner. Something is still missing from it, but at least it\'s an honest gap.') },
        { label: 'Ask Marge which numbers actually matter', kind: 'help', contact: 'veteran', show: (s) => PP.contactReady(s, 'veteran'), hint: 'The Veteran spots overcomplication from a mile away.',
          eff: { insight: 1, momentum: 1, energy: 1 },
          result: 'Marge squints at it for ten seconds. "Three numbers matter. Delete the rest." She is right, and slightly smug about it.' }
      ]
    },

    {
      id: 'fu_snakepit_calls', title: 'They called twice before', at: ['snakepit'],
      when: (s) => F(s),
      text: (s) => `Down in the pit, a phone is ringing. You recognize the number: it's ${C(s)}. From a few weeks ago. And another one before that. They called about small things before the ${change(s)}. You meant to call back.`,
      choices: [
        { label: 'Own it, out loud, to the client', kind: 'prepare', hint: 'Uncomfortable. Honest.',
          eff: { trust: 1, energy: -1 },
          result: (s) => `"I missed your calls. I'm sorry." ${C(s)} blinks. "Honestly, I'd forgotten. But thanks for saying it."` },
        { label: 'Set up a regular check-in schedule, now', kind: 'help', hint: 'Follow-up you don\'t have to remember is follow-up that happens.',
          eff: (s) => (comm(s) ? { trust: 2, momentum: -1, clearDebt: 'missed_message' } : { trust: 1, momentum: -1, clearDebt: 'missed_message' }),
          result: (s) => `Every three months, in both your calendars. ${C(s)} adds it with a little emoji of a phone.` },
        { label: 'Climb out quietly and hope it never comes up', kind: 'through', hint: 'It will come up.',
          eff: { momentum: 1, debt: { tag: 'missed_message', sev: 2 } },
          result: 'The ringing fades behind you. It does not stop.' }
      ]
    },

    {
      id: 'fu_specialist_again', title: 'The Specialist remembers', at: ['summit'],
      when: (s) => F(s),
      text: (s) => `At the summit, the Specialist looks up from a stack of files. "Ah. ${C(s)}. We met last time." A pause. "Something's changed. People don't climb up here twice for fun."`,
      choices: [
        { label: 'Brief them properly: last time, the change, what you still don\'t know', kind: 'prepare', hint: 'Takes energy. Saves everyone from repeating themselves.',
          eff: { energy: -1, insight: 1, clearDebt: 'bad_handoff' },
          then: { text: (s) => `The Specialist listens, then turns to ${C(s)}. "One question. What's the part of this you're avoiding?"`,
            choices: [
              { label: 'Let the client answer', kind: 'around', eff: (s) => (s.res.trust >= 6 ? { fact: 'change_need', trust: 1 } : { insight: 1 }),
                result: (s) => (needKnown(s) ? `${C(s)} answers. The Specialist nods slowly. "That changes what I'd suggest."` : `${C(s)} says "nothing," which tells everyone something.`) },
              { label: 'Answer for them', kind: 'through', eff: { momentum: 1, trust: -1 }, result: (s) => `You answer. ${C(s)} looks at the floor. The Specialist notices.` }
            ] } },
        { label: 'Call in Dr. Okafor to translate for the client', kind: 'help', contact: 'specialist', show: (s) => PP.contactReady(s, 'specialist'), hint: 'The Specialist contact: experts made understandable.',
          eff: { insight: 2, momentum: 1 },
          result: (s) => `Dev explains it with a napkin and three arrows. ${C(s)} says, "Why didn't anyone draw it like that before?"` },
        { label: 'Forward last time\'s file and let them get on with it', kind: 'through', hint: 'Fast. Last time\'s file is about last time.',
          eff: { momentum: 2, debt: { tag: 'bad_handoff', sev: 2 } },
          result: 'The file goes up. A reply comes back in three to five business days.' }
      ]
    },

    {
      id: 'fu_toll_still_fits', title: 'Does the old plan still fit?', at: ['toll'],
      when: (s) => F(s),
      text: (s) => `The troll at the toll booth recognizes ${C(s)}. "Back again? Then before anything new crosses, the old one gets checked. Annual review rules. Even if it hasn't been a year. Especially then."`,
      choices: [
        { label: 'Review the existing plan properly, with the client', kind: 'prepare', hint: 'A day. Everything on the bridge is up to date.',
          eff: { days: 1, insight: 1, trust: 1, clearDebt: 'stale_info' },
          result: (s) => `Most of it still fits. One piece needed a nudge after the ${change(s)}. The troll stamps it with enormous satisfaction.` },
        { label: 'Ask the client what else has shifted besides the obvious', kind: 'help', hint: 'Big changes travel in groups.',
          eff: (s) => (opens(s) ? { fact: 'change_need', insight: 1 } : { insight: 1 }),
          result: (s) => (needKnown(s) ? `"Well, since you ask..." It isn't just the ${change(s)}. There's the part underneath it.` : `"Nothing else," ${C(s)} says, a bit too fast. The troll raises an eyebrow. So do you.`) },
        { label: 'Wave the old plan through: it was fine last time', kind: 'through', hint: 'The troll will accept this. The future might not.',
          eff: { momentum: 1, debt: { tag: 'stale_info', sev: 2 } },
          result: 'The troll shrugs and lifts the barrier. "Your bridge."' }
      ]
    },

    {
      id: 'fu_x_again', title: 'Back at the X', at: ['clients'],
      when: (s) => F(s),
      text: (s) => `Clients for Life looks different the ${nth(lap(s))} time. Less like a finish line, more like a front porch. ${C(s)} looks around and says, quietly, "I almost didn't call, you know. After the ${change(s)}. I thought you'd be too busy."`,
      choices: [
        { label: 'Ask what nearly stopped them', kind: 'prepare', hint: 'Worth knowing for every client in your book.',
          eff: { insight: 1, trust: 1 },
          result: (s) => `"You're doing well. I figured you'd moved on to bigger clients." ${C(s)} shrugs. You make a note to never let anyone in your book think that.` },
        { label: 'Promise to call them first next time', kind: 'help', hint: 'A promise is only as good as the calendar it lives in.',
          eff: { trust: 2, energy: -1 },
          result: (s) => `You both pull out your phones and put a date in. ${C(s)} seems more moved by that than by anything you said on the trail.` },
        { label: 'Ask who else in their life might need this', kind: 'through', hint: 'The right time to ask, if the lap went well.',
          eff: (s) => (s.res.trust >= 6 ? { prospect: { temp: 'warm', source: `a referral from ${C(s)} on lap ${lap(s)}`, bias: bias(s), event: true } } : { trust: -1 }),
          result: (s) => (s.res.trust >= 6 ? `${C(s)} doesn't even hesitate. "My neighbor. She keeps asking who I talk to." (New prospect in your pipeline.)` : `${C(s)} frowns. "Let's see how this one goes first."`) }
      ]
    }
  );
})(window.PP);
