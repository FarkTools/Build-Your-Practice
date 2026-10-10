/* events-places: more landmark events, appended to the deck.
 * Every landmark gets several possible events so repeat journeys feel different.
 * All events are written for any client archetype: they lean on s.client fields
 * (name, stakeholder, keyFact, checkin.worry ...) and never on a specific client. */
(function (PP) {
  const C = (s) => PP.clientName(s);
  const K = PP.knows;

  /* Random outcomes: eff rolls once and stores the result here so result() can read it. */
  const R = {};
  const roll = (k, p) => (R[k] = PP.chance(p));

  const comm = (s) => PP.skill(s, 'communication') > 0;
  const curious = (s) => PP.skill(s, 'curiosity') > 0;
  const open = (s) => curious(s) || s.res.trust >= 6;
  const worry = (s) => (s.client.checkin && s.client.checkin.worry) || null;
  const worryFact = (s) => { const w = worry(s); return (w && w.fact) || s.client.keyFact; };
  const label = (s, f) => (f && s.client.facts[f] ? s.client.facts[f].label.toLowerCase() : 'something you had not thought to ask about');
  const unknown = (s) => Object.keys(s.client.facts).find((f) => !K(s, f)) || null;
  const missedOne = (s) => Object.keys(s.missed || {}).find((f) => s.client.facts[f] && !K(s, f)) || null;
  const oldestDebt = (s) => (s.debt.length ? s.debt[0].tag : null);
  const hasDebt = (s, ...tags) => s.debt.find((d) => tags.includes(d.tag)) || null;
  const hasSys = (s, id) => !!(PP.career && s.career && PP.career.hasSystem(s.career, id));
  const stake = (s) => s.client.shortStake || 'someone close to them';
  const ready = (id) => (s) => PP.contactReady(s, id);
  /* A fact the client would share when asked about a check-in topic, if they are ready to (force = a contact gets it out of them). */
  const topicFact = (s, topic, force) => { const a = s.client.checkin && s.client.checkin[topic]; if (!a || !a.fact) return null; const ok = force || ((!a.minTrust || s.res.trust >= a.minTrust) && (!a.curious || curious(s))); return ok ? a.fact : null; };
  const holding = (id) => (s) => PP.hasItem(s, id);

  PP.content.events.push(
    /* ================= Meadows of Understanding ================= */
    {
      id: 'meadow_pause', title: 'The long pause', at: ['meadows'],
      text: (s) => `${C(s)} stops halfway through a sentence and looks out over the grass. The pause goes on. A bee lands on your notepad. Every instinct you have says to fill the silence.`,
      choices: [
        { label: 'Jump in with your next question', kind: 'through', hint: 'Keeps things moving. Whatever they were about to say goes with it.', eff: (s) => ({ momentum: 1, missed: s.client.keyFact, style: { avoid: 1 } }), result: (s) => `"Right, yes," ${C(s)} says, and answers your question instead. It was a good question. It was not what they were about to say.` },
        { label: 'Wait. Count to ten in your head.', kind: 'prepare', hint: 'Silence is uncomfortable for both of you.',
          then: { text: (s) => `At about seven, ${C(s)} says quietly: ` + (worry(s) ? worry(s).guarded || worry(s).text : '"Sorry. I was just thinking about how much is riding on this."'),
            choices: [
              { label: '"What\'s behind that?"', kind: 'prepare', preview: 'With Curiosity or Trust 6+, they tell you the rest. Otherwise it can feel like prying.',
                eff: (s) => { R.pause = open(s) && !!worry(s); return R.pause ? { fact: worryFact(s), insight: 2, trust: 1 } : { insight: 1, trust: -1 }; },
                result: (s) => (R.pause ? 'They take a breath and tell you. ' + worry(s).text : `${C(s)} shrugs. "Just... a lot." The door closes, gently.`) },
              { label: 'Nod, and let it sit', kind: 'around', eff: { trust: 1, insight: 1 }, result: 'You do not push. They notice that, and seem to file you under "safe."' },
              { label: 'Reassure them it will all work out', kind: 'through', eff: { trust: 1, momentum: 1, debt: { tag: 'unchallenged_assumption', sev: 1 } }, result: '"Thanks. I hope so." It was kind. It was also a guess.' }
            ] } },
        { label: 'Reflect back what you have heard so far', kind: 'prepare', show: comm, hint: 'Communication: they hear themselves, and correct you.', eff: { trust: 2, insight: 1, energy: -1 }, result: '"So what I\'m hearing is..." You get two things right and one thing wrong. They fix the wrong one. That was the useful part.' },
        { label: 'Make a light joke about the bee', kind: 'around', eff: { trust: 1, style: { avoid: 1 } }, result: (s) => `${C(s)} laughs. The bee leaves. So does whatever they were about to say.` }
      ]
    },
    {
      id: 'meadow_visitor', title: 'Company in the meadow', at: ['meadows'],
      text: (s) => `${stake(s)} is waiting at the bench with a thermos and a folding chair. "${C(s)} mentioned you'd be here. Thought I'd sit in. If that's all right."`,
      choices: [
        { label: 'Pull up a chair for them', kind: 'prepare', hint: 'A slower meeting. Fewer surprises later.', eff: (s) => ({ momentum: -1, energy: -1, fact: s.client.stakeholderFact }),
          then: { text: (s) => `${stake(s)} listens for a while, then says, "Can I ask what this is actually for? Because from where I sit, it looks different." ${C(s)} goes a little stiff.`,
            choices: [
              { label: 'Ask them both what "done" would look like', kind: 'prepare', preview: 'With Communication: Trust +2. Otherwise a coin flip on whether it turns into an argument.',
                eff: (s) => { R.visit = comm(s) || PP.chance(0.5); return R.visit ? { trust: 2, insight: 2 } : { trust: -1, insight: 2 }; },
                result: (s) => (R.visit ? 'Two different answers, said out loud, kindly. Now you can plan for both.' : 'Two different answers, said out loud, not so kindly. Useful, though. Very useful.') },
              { label: 'Steer back to your agenda', kind: 'through', eff: { momentum: 1, debt: { tag: 'unknown_stakeholder', sev: 1 } }, result: (s) => `${stake(s)} sips from the thermos and says nothing else. That is not the same as agreeing.` },
              { label: 'Offer them their own conversation later', kind: 'around', eff: { trust: 1, days: 1 }, result: 'They accept. It costs you a day, and you learn they have been worried about this for months.' }
            ] } },
        { label: 'Politely keep this meeting one-on-one', kind: 'through', hint: 'A cleaner meeting. A missing voice.', eff: (s) => ({ momentum: 1, trust: s.res.trust >= 6 ? 0 : -1, debt: { tag: 'unknown_stakeholder', sev: 2 }, missed: s.client.stakeholderFact }), result: (s) => `${stake(s)} folds the chair back up. "Of course. You two talk." They seem fine. Mostly.` },
        { label: 'Let them run the meeting', kind: 'around', eff: (s) => ({ trust: -1, insight: 1, fact: s.client.stakeholderFact, style: { chase: 1 } }), result: (s) => `${stake(s)} has a lot of ideas. ${C(s)} barely says a word for an hour. You learn a lot about one of them.` }
      ]
    },
    {
      id: 'meadow_wishlist', title: 'The wish list', at: ['meadows'],
      text: (s) => `${C(s)} unfolds a sheet of paper: every goal they have ever had, in no particular order. "Pay off everything" sits right above "learn the cello." There are eleven items. Two of them contradict each other.`,
      choices: [
        { label: 'Rank them yourself, it is faster', kind: 'through', hint: 'You will rank them by what you think matters.', eff: { momentum: 2, debt: { tag: 'assumed_goal', sev: 2 } }, result: (s) => `You number them one to eleven. ${C(s)} says "Sure, that makes sense." It makes sense to you, anyway.` },
        { label: '"If you could only do one this year?"', kind: 'prepare',
          then: { text: (s) => `${C(s)} stares at the list for a long time. Then they point at something that isn't on it at all. "Honestly? This. I didn't write it down because it felt silly."`,
            choices: [
              { label: 'Ask why it felt silly', kind: 'prepare', preview: 'With Curiosity or Trust 6+, the real priority comes out.',
                eff: (s) => { R.wish = open(s); return R.wish ? { insight: 2, trust: 1, fact: worryFact(s) } : { insight: 1, trust: 1 }; },
                result: (s) => (R.wish ? `It isn't silly at all. It is about ${label(s, worryFact(s))}.` : '"It just did." They smile. You will come back to it.') },
              { label: 'Write it at the top of the list', kind: 'around', eff: { trust: 1, insight: 1 }, result: 'It goes at the top, in capital letters. The cello slides down to ninth.' },
              { label: 'Gently steer back to the written goals', kind: 'through', eff: { momentum: 1, debt: { tag: 'assumed_goal', sev: 1 } }, result: 'Back to the list. The one that was not written down stays that way.' }
            ] } },
        { label: 'Promise to tackle all eleven', kind: 'through', hint: 'Everyone loves a yes. Your energy does not.', eff: { trust: 1, energy: -2, style: { overcomplicate: 1, chase: 1 } }, result: '"All of them?" "All of them." You feel heroic, briefly. Then you see the cello.' },
        { label: 'Talk it through properly', kind: 'prepare', minigame: 'conversation', hint: 'Costs energy. You will hear the list behind the list.', eff: { energy: -1 }, result: 'By the end, the list has three items on it. All three are real.' }
      ]
    },
    {
      id: 'meadow_easy_questions', title: 'Only the easy questions', at: ['meadows'],
      when: (s) => s.style.avoid >= 1,
      text: (s) => `Looking back over your notes, you realize every question so far has been one ${C(s)} could answer without thinking. Number of pets. Favorite season. Nothing that might make anyone uncomfortable. The meadow is lovely. It would be easy to keep it that way.`,
      choices: [
        { label: 'Ask the question you have been dodging', kind: 'prepare', hint: 'Uncomfortable now. Less so later.', preview: 'Likely to land well with Communication or Trust 6+. Otherwise a coin flip on whether it feels like an ambush.',
          eff: (s) => (roll('easy', comm(s) || s.res.trust >= 6 ? 0.85 : 0.5) ? { insight: 2, trust: 1, fact: s.client.keyFact, style: { avoid: -2 } } : { insight: 1, trust: -1, style: { avoid: -1 } }),
          result: (s) => (R.easy ? `${C(s)} goes quiet, then answers properly. Now you know: ${label(s, s.client.keyFact)}.` : `"Wow. Okay." ${C(s)} answers, but carefully. You will need to earn the rest.`) },
        { label: 'Keep it pleasant for today', kind: 'around', eff: { trust: 1, style: { avoid: 1 }, debt: { tag: 'unchallenged_assumption', sev: 1 } }, result: 'Pleasant. Easy. You will have to ask eventually.' },
        { label: 'Leave the hard question for the Specialist', kind: 'through', hint: 'Someone else gets to be the bad guy. They also hear the answer first.', eff: { momentum: 1, debt: { tag: 'bad_handoff', sev: 1 }, style: { avoid: 1 } }, result: 'You write it on a sticky note for later: "ASK ABOUT THE THING." Very clear. Very brave.' },
        { label: 'Find a gentle way in: "What keeps you up at night?"', kind: 'prepare', show: curious, hint: 'Curiosity: an easy question with a hard answer behind it.', eff: (s) => ({ insight: 2, trust: 1, fact: worryFact(s), style: { avoid: -1 } }), result: (s) => `${C(s)} laughs, then stops laughing, then talks for twenty minutes.` }
      ]
    },

    /* ================= Veteran's Lighthouse ================= */
    {
      id: 'lighthouse_logbook', title: 'The keeper\'s logbook', at: ['lighthouse'],
      text: 'The keeper hauls out a logbook as thick as a doorstop. "Every agent who came through here. Where they were headed, and where they actually ended up." Most entries end somewhere different from where they started.',
      choices: [
        { label: 'Read the entries for clients like yours', kind: 'prepare', eff: { energy: -1, insight: 2 }, result: (s) => `Three agents had a client a lot like ${C(s)}. Two of them were surprised by the same thing. You make a note not to be surprised.` },
        { label: 'Ask her what pattern she sees in you', kind: 'help', eff: { style: { soloist: -1 } },
          then: { text: (s) => {
            const msgs = { avoid: '"You skip the awkward questions. I can tell because your notes are all so nice."', overcomplicate: '"You build cathedrals when they asked for a shed."', soloist: '"You don\'t ask for help. You think that\'s strength. Mostly it\'s tiredness."', chase: '"Every shiny thing on the horizon, off you go to look at it."' };
            const top = Object.keys(msgs).sort((a, b) => (s.style[b] || 0) - (s.style[a] || 0))[0];
            return (s.style[top] || 0) > 0 ? `She reads your notes for a minute. ${msgs[top]}` : '"Nothing yet. Either that\'s good, or you haven\'t been tested." She closes the logbook.';
          },
            choices: [
              { label: 'Ask how to fix it', kind: 'prepare', eff: (s) => {
                const top = ['avoid', 'overcomplicate', 'soloist', 'chase'].sort((a, b) => (s.style[b] || 0) - (s.style[a] || 0))[0];
                if ((s.style[top] || 0) > 0) return { style: { [top]: -2 }, energy: -1 };
                return PP.skill(s, 'judgment') < 2 ? { skill: { judgment: 1 } } : { insight: 1 };
              }, result: '"Notice it once a day. That\'s all. Noticing does most of the work." You write it on your hand.' },
              { label: 'Push back a little', kind: 'around', eff: { insight: 1 }, result: '"Maybe," she says, unbothered. "Write down how this trip goes. We\'ll see."' },
              { label: 'Laugh it off and head out', kind: 'through', eff: { momentum: 1 }, result: 'She laughs too. She also writes something in the logbook. You decide not to ask.' }
            ] } },
        { label: 'Borrow the logbook overnight', kind: 'around', hint: 'A day lost. A wider view.', eff: { days: 1, momentum: -1, reveal: true }, result: 'You read by lamplight until two. By morning you know the shape of the whole region.' },
        { label: 'Skim it, smile, hand it back', kind: 'through', eff: { momentum: 1 }, result: '"Busy," she says. "They all are." She shelves it.' }
      ]
    },
    {
      id: 'lighthouse_lamp', title: 'The lamp is out', at: ['lighthouse'],
      text: 'The great lamp at the top of the tower has gone dark. The keeper is halfway up a ladder with a wrench in her teeth. "Ships can\'t see the rocks," she says, around the wrench. "Neither can agents. Hand me that bulb?"',
      choices: [
        { label: 'Climb up and help her fix it', kind: 'help', hint: 'Hard work. It might not even be the bulb.', preview: '60%: it lights up and you see the whole map. 40%: it takes all night and the next day.',
          eff: () => (roll('lamp', 0.6) ? { energy: -2, reveal: true, trust: 1, style: { soloist: -1 } } : { energy: -2, days: 1, trust: 1, style: { soloist: -1 } }),
          result: (s) => (R.lamp ? `The beam swings out over the land. ${C(s)} watched you climb a ladder for a stranger. That counts.` : 'It was not the bulb. It was the wiring, then the switch, then the bulb. Dawn, finally, and light.') },
        { label: 'Hold the ladder and talk shop', kind: 'prepare', eff: { insight: 1, energy: -1 }, result: '"Most lights go out slowly," she says from above. "Same with clients. Little things, one at a time." The lamp flickers on.' },
        { label: 'Apologize, you have a client waiting', kind: 'through', eff: { momentum: 1, trust: -1 }, result: (s) => `"Of course," she says. ${C(s)} glances back at the dark tower as you leave.` },
        { label: 'Call Olu, who once fixed a lamp at the port', kind: 'help', contact: 'operator', show: ready('operator'), eff: { reveal: true, momentum: 1 }, result: 'Olu talks her through it on speakerphone. "It\'s always the fuse." It was the fuse.' }
      ]
    },
    {
      id: 'lighthouse_old_storm', title: 'The worst storm', at: ['lighthouse'],
      text: 'Over tea, the keeper tells you about the worst storm she ever guided someone through. "Not the weather. The client. I promised them it would all be fine. And it mostly was. \'Mostly\' is a long word."',
      choices: [
        { label: '"What would you have done differently?"', kind: 'prepare',
          then: { text: '"Said \'I don\'t know yet\' sooner. People can handle \'I don\'t know.\' What they can\'t handle is finding out you didn\'t." She looks at you over her cup. "What don\'t you know yet, on this one?"',
            choices: [
              { label: 'Be honest: list what you are unsure of', kind: 'prepare', eff: (s) => (s.res.insight >= 5 ? { insight: 1, momentum: 1 } : { insight: 2, energy: -1 }), result: (s) => (K(s, s.client.keyFact) ? 'Your list is short. She nods. "Good. Short lists are earned."' : 'The list is longer than you would like. She circles one item. "That one. Ask about that one."') },
              { label: '"Honestly, I think I have it covered."', kind: 'through', eff: { momentum: 1, debt: { tag: 'unchallenged_assumption', sev: 1 } }, result: '"Mm," she says. That is all she says.' },
              { label: 'Ask her to look over your notes', kind: 'help', eff: (s) => { R.storm = !!oldestDebt(s); return R.storm ? { clearDebt: oldestDebt(s), energy: -1, days: 1 } : { insight: 1 }; }, result: () => (R.storm ? 'She finds one thing you glossed over and makes you fix it at her kitchen table. It takes a day. She refills your tea twice.' : '"Clean," she says, sounding faintly disappointed. "Have a biscuit."') }
            ] } },
        { label: 'Tell her about your own near miss', kind: 'prepare', eff: { trust: 1, insight: 1, energy: -1 }, result: (s) => `She laughs at the part where you mailed a client someone else's birthday card. ${C(s)}, overhearing, laughs too. Something relaxes.` },
        { label: 'Nod politely and finish your tea', kind: 'through', eff: { momentum: 1 }, result: '"Off you go, then." She waves you off with a biscuit for the road.' }
      ]
    },
    {
      id: 'lighthouse_client_chat', title: 'The keeper and your client', at: ['lighthouse'],
      text: (s) => `You step out to make a call. When you come back, the keeper and ${C(s)} are deep in conversation on the porch. They both stop talking as you walk up.`,
      choices: [
        { label: 'Give them more time, take a walk', kind: 'around', hint: 'She is good at this. You will not hear what was said.', preview: 'With Trust 5+, 60% the keeper passes on what matters. Otherwise she passes on that the client feels rushed (Trust -1).',
          eff: (s) => (roll('kc', s.res.trust >= 5 ? 0.6 : 0.35) ? { insight: 1, fact: s.client.keyFact } : { trust: -1, insight: 1 }),
          result: (s) => (R.kc ? `Later, the keeper catches your sleeve. "They told me something they haven't told you. It's about ${label(s, s.client.keyFact)}. Be gentle with it."` : 'Later, the keeper catches your sleeve. "They like you. They also think you\'re in a hurry. Are you?"') },
        { label: 'Sit down and join them', kind: 'prepare', eff: { energy: -1, trust: 1, insight: 1 }, result: (s) => `The conversation shifts politely to the weather. ${C(s)} seems glad you sat down, though. Whatever it was can wait.` },
        { label: 'Ask the keeper privately what they talked about', kind: 'through', hint: 'Fast. Not your secret to collect this way.', eff: { insight: 1, trust: -1 }, result: '"Ask them yourself," she says. "That\'s rather the point." Your client saw you whispering.' },
        { label: 'Ask your client: "Anything you want to tell me?"', kind: 'prepare', show: comm, hint: 'Communication: an open door, not a push.', eff: (s) => ({ trust: 1, insight: 2, fact: worryFact(s) }), result: (s) => `${C(s)} looks at the keeper, who nods. Then they tell you.` }
      ]
    },

    /* ================= Relation-Ship Wreck ================= */
    {
      id: 'wreck_encore', title: 'The encore', at: ['wreck'], cut: 'sirens',
      text: (s) => `The Sirens have a new verse, and it has ${C(s)}'s name in it. "${C(s)}, ${C(s)}, sign today! Why let all those questions stay?" ${C(s)} turns to you, a little glassy-eyed. "Could we just... sign? Today? I'm tired of thinking about it."`,
      choices: [
        { label: 'Sign today. They asked, after all.', kind: 'through', hint: 'Momentum and a happy client tonight. You are not done understanding them.', eff: { momentum: 3, trust: 1, debt: [{ tag: 'assumed_goal', sev: 2 }, { tag: 'rushed_pace', sev: 1 }] }, result: 'The Sirens hit a high note. Everyone feels fantastic. For now.' },
        { label: 'Ask what is making them tired', kind: 'prepare',
          then: { text: (s) => `${C(s)} sighs. "Every meeting opens a new question. I just want it to be done." Behind you, the Sirens go "ooooh."`,
            choices: [
              { label: 'Offer one small thing they can finish today', kind: 'prepare', eff: { momentum: 1, trust: 2 }, result: 'One decision, small and real, finished today. The rest can wait for daylight. The Sirens sulk.' },
              { label: 'Promise the questions are almost over', kind: 'through', eff: { trust: 1, momentum: 1, debt: { tag: 'unchallenged_assumption', sev: 1 } }, result: '"Almost over" is doing a lot of work in that sentence.' },
              { label: 'Suggest a day off from planning entirely', kind: 'around', eff: { days: 1, energy: 2, trust: 1, momentum: -1 }, result: (s) => `You spend a day not talking about money at all. ${C(s)} comes back lighter, and ready.` }
            ] } },
        { label: 'Steer them away from the rocks', kind: 'around', hint: 'Saying no to a tired client is a skill.', eff: (s) => (comm(s) ? { trust: 1, momentum: -1 } : { trust: -1, momentum: -1 }), result: (s) => (comm(s) ? '"Let\'s not decide anything with that song stuck in our heads." They laugh. They agree.' : `${C(s)} lets you lead them away, sulking slightly. The song follows you for a mile.`) },
        { label: 'Hum along a little, then decide', kind: 'through', preview: 'A coin flip: a quick yes with a hidden cost, or you lose an afternoon to the chorus.',
          eff: () => (roll('enc', 0.5) ? { momentum: 2, debt: { tag: 'assumed_goal', sev: 1 } } : { momentum: -1, energy: -1 }),
          result: () => (R.enc ? 'You sign mid-chorus. It feels like a musical.' : 'Three hours later you are both still humming and nothing has been decided.') }
      ]
    },
    {
      id: 'wreck_salvage', title: 'Salvage', at: ['wreck'],
      text: 'Washed up among the timbers: a waterlogged file. Another agent\'s client, a lot like yours. A finished plan, beautifully formatted, never used. A sticky note on the front says "THEY LEFT."',
      choices: [
        { label: 'Adapt the old plan for your client', kind: 'through', hint: 'Fast. Someone else\'s client, someone else\'s life.', eff: { momentum: 2, debt: [{ tag: 'assumed_goal', sev: 2 }, { tag: 'stale_info', sev: 1 }] }, result: 'Find, replace, done. It is uncanny how well it almost fits.' },
        { label: 'Read it to find out why it failed', kind: 'prepare', eff: { energy: -1 },
          then: { text: 'It takes an hour to dry the pages enough to read. The plan was fine. The meeting notes are what\'s interesting: every single time, the client mentioned someone, and the agent wrote the name in pencil in the margin. Nobody ever followed up.',
            choices: [
              { label: 'Check your own notes for the same mistake', kind: 'prepare', eff: (s) => { R.salv = K(s, s.client.stakeholderFact); return R.salv ? { insight: 1, trust: 1 } : { insight: 1, momentum: -1, fact: s.client.stakeholderFact }; }, result: (s) => (R.salv ? 'You already asked about the people in your client\'s life. You put the file down feeling slightly smug.' : `There it is in your notes too: a name you skipped past. You ask ${C(s)} about ${stake(s)}. It matters.`) },
              { label: 'Keep it as a cautionary tale', kind: 'around', eff: (s) => (PP.skill(s, 'judgment') < 2 ? { skill: { judgment: 1 } } : { insight: 1 }), result: 'You keep the sticky note. "THEY LEFT." It goes inside the cover of your notebook.' }
            ] } },
        { label: 'Leave it to the sea and sit for a bit', kind: 'around', eff: { energy: 1 }, result: 'Some files are better left on the rocks. You watch the waves for a while instead.' }
      ]
    },
    {
      id: 'wreck_survivor', title: 'Clinging to driftwood', at: ['wreck'],
      text: 'Someone is clinging to a plank just off the rocks, waving a soggy folder. "My agent closed in a day and stopped calling! I don\'t even know what I signed!" Your client watches to see what you will do.',
      choices: [
        { label: 'Wade out and help them ashore', kind: 'help', eff: { energy: -1, trust: 1 },
          then: { text: 'On the beach, wrapped in your jacket, they tell you everything. It is a lot. They would like you to be their agent now. Please. Today.',
            choices: [
              { label: 'Offer to meet properly once you are back', kind: 'prepare', eff: { prospect: { temp: 'warm', source: 'someone you pulled out of the Relation-Ship Wreck' } }, result: 'They write their number on your hand in marker. (New prospect in your pipeline.)' },
              { label: 'Sign them up right here on the beach', kind: 'through', eff: { prospect: { temp: 'hot', source: 'a shipwrecked client you signed on the beach' }, trust: -1, debt: { tag: 'premature_pitch', sev: 1 } }, result: (s) => `A new client! Signed on a beach, soaking wet. ${C(s)} raises an eyebrow: is that how you would treat them?` },
              { label: 'Point them to the lighthouse keeper', kind: 'around', eff: { insight: 1 }, result: '"She\'ll sort you out," you say. They squelch off up the path.' }
            ] } },
        { label: 'Throw them a line and keep walking', kind: 'around', eff: { momentum: 1 }, result: 'They catch it and haul themselves in. "Thanks," they gasp. You are already gone.' },
        { label: 'Tell them their old agent sounds like a crook', kind: 'through', hint: 'It might win you a client. Your client is listening.', eff: { prospect: { temp: 'warm', source: 'a shipwrecked client' }, trust: -1 }, result: (s) => `It feels good to say. ${C(s)} wonders, quietly, what you would say about them.` }
      ]
    },

    /* ================= Fog of Forgotten Info ================= */
    {
      id: 'fog_two_versions', title: 'Two versions of the truth', at: ['fog'],
      text: (s) => `In the fog, your notes say one thing and ${C(s)}'s memory says another. You wrote "this spring." They are sure they said "after the summer." Neither of you is backing down. Politely.`,
      choices: [
        { label: 'Go with what the client remembers', kind: 'around', hint: 'Good for the mood. Memory is not a filing system.', eff: { trust: 1, debt: { tag: 'timeline', sev: 1 } }, result: '"You\'re probably right," you say. They look pleased. You cross out your note.' },
        { label: 'Trust your notes', kind: 'through', preview: 'A coin flip: either your notes were right, or you are now confidently wrong.',
          eff: () => (roll('tv', 0.5) ? { momentum: 1, insight: 1 } : { trust: -1, debt: { tag: 'timeline', sev: 1 } }),
          result: () => (R.tv ? 'They check their calendar. Your notes win. Nobody gloats. Out loud.' : 'They check their calendar. They were right. "Do you write everything down wrong, or just this?"') },
        { label: 'Find the original email together', kind: 'prepare', eff: (s) => ({ energy: -1, insight: 2, clearDebt: hasDebt(s, 'timeline') ? 'timeline' : null }), result: 'Twenty minutes of scrolling. The answer is "after the summer, unless something comes up." You both write that down. Exactly.' },
        { label: 'Check your battered notebook', kind: 'help', item: 'notebook', show: holding('notebook'), eff: { insight: 1, momentum: 1 }, result: 'Underlined, with a date: you both had it half right. Past you is a hero, again.' }
      ]
    },
    {
      id: 'fog_name', title: 'What was their name?', at: ['fog'],
      text: (s) => `${C(s)} says, "Anyway, so they think we should wait," as if you know exactly who "they" is. You have met them. You are almost sure you have met them. The fog has taken the name.`,
      choices: [
        { label: 'Bluff: "Ah, of course. How are they doing?"', kind: 'through', hint: 'Smooth, if it works.',
          then: { text: (s) => `"They're good! Actually, they asked about you. Do you remember what they said last time?" ${C(s)} looks at you expectantly.`,
            choices: [
              { label: 'Come clean now', kind: 'prepare', eff: (s) => ({ trust: -1, insight: 1, fact: s.client.stakeholderFact }), result: (s) => `"I'm so sorry. Remind me who we're talking about?" ${C(s)} laughs. "${s.client.stakeholder}! Wow." Then they tell you more than they would have otherwise.` },
              { label: 'Keep bluffing', kind: 'through', preview: '40% you get away with it. Otherwise it gets noticed (Trust -2).',
                eff: () => (roll('nm', 0.4) ? { momentum: 1 } : { trust: -2, debt: { tag: 'unknown_stakeholder', sev: 2 } }),
                result: (s) => (R.nm ? '"Something about the timing, I think?" Vague enough to be true. Phew.' : `${C(s)} frowns. "That wasn't them. You don't remember, do you?" You do not.`) }
            ] } },
        { label: 'Admit it and ask', kind: 'prepare', eff: (s) => ({ trust: comm(s) ? 0 : -1, insight: 1, fact: s.client.stakeholderFact }), result: (s) => (comm(s) ? `"I want to get this exactly right. Who do you mean?" No harm done. It is ${s.client.stakeholder}, and they matter more than you realized.` : `"Sorry, who?" A small wince. It is ${s.client.stakeholder}. You will not forget again.`) },
        { label: 'Ask how "they" feel about all this', kind: 'prepare', show: curious, hint: 'Curiosity: let them fill in the name.', eff: (s) => ({ insight: 2, trust: 1, fact: s.client.stakeholderFact }), result: (s) => `An open question, and ${C(s)} fills in the name without noticing. ${s.client.stakeholder}. Their feelings are complicated.` },
        { label: 'Check your battered notebook', kind: 'help', item: 'notebook', show: holding('notebook'), eff: (s) => ({ fact: s.client.stakeholderFact, insight: 1 }), result: (s) => `Page two: "${stake(s)}. IMPORTANT." Of course.` }
      ]
    },
    {
      id: 'fog_missing_page', title: 'The missing page', at: ['fog'],
      text: (s) => `${C(s)} hands over a document that skips from page two to page four. "Oh, page three's nothing. Just boilerplate, I think." The fog swirls a little thicker.`,
      choices: [
        { label: 'Take their word for it', kind: 'through', eff: { momentum: 1, debt: { tag: 'stale_info', sev: 2 } }, result: 'Page three is probably nothing. Probably.' },
        { label: 'Ask them to dig out the full copy', kind: 'around', eff: { days: 1, momentum: -1, insight: 1 }, result: (s) => `${C(s)} finds it a day later. Page three is mostly boilerplate. One line in the middle is not.` },
        { label: '"What do you remember was on it?"', kind: 'prepare',
          then: { text: (s) => `${C(s)} squints into the fog. "Something about... what happens if... no, wait. That's the other one." They trail off, then frown. "Huh. Why do I remember that?"`,
            choices: [
              { label: 'Follow that thread', kind: 'prepare', eff: (s) => { R.mp = missedOne(s) || unknown(s); return R.mp ? { insight: 2, fact: R.mp, energy: -1 } : { insight: 1 }; }, result: (s) => (R.mp ? `It leads somewhere. The fog gives back something it took: ${label(s, R.mp)}.` : 'It leads to a dead end, but a tidy one. You know this file better now.') },
              { label: 'Note it and move on', kind: 'around', eff: { insight: 1 }, result: 'You write "page 3??" in the margin and circle it twice.' }
            ] } },
        { label: 'Ask Olu to pull a copy from the archive', kind: 'help', contact: 'operator', show: ready('operator'), eff: { insight: 1, momentum: 1 }, result: '"Page three," says Olu, sending it over. "It\'s always page three."' }
      ]
    },
    {
      id: 'fog_echo', title: 'An echo in the fog', at: ['fog'],
      when: (s) => !!missedOne(s),
      text: (s) => `Something drifts out of the fog: a phrase ${C(s)} said days ago that you let slide past. You can almost hear it again. If you don't catch it now, it will be gone for good.`,
      choices: [
        { label: 'Turn around and ask about it now', kind: 'prepare', eff: (s) => { R.echo = missedOne(s); return { momentum: -1, insight: 1, fact: R.echo, trust: comm(s) ? 1 : 0 }; }, result: (s) => `"Earlier you said something I didn't follow up on." ${C(s)} looks surprised, then pleased. It was about ${label(s, R.echo)}.` },
        { label: 'Let it go, you have momentum', kind: 'through', eff: { momentum: 1, style: { avoid: 1 } }, result: 'The echo fades. The fog closes over it, gently.' },
        { label: 'Write down what you remember, ask later', kind: 'around', hint: 'Better than nothing. Later is a busy place.', eff: { insight: 1 }, result: 'You write it down: half a sentence, and a question mark.' },
        { label: 'Check your battered notebook', kind: 'help', item: 'notebook', show: holding('notebook'), eff: (s) => { R.echo2 = missedOne(s); return { fact: R.echo2, insight: 1, momentum: 1 }; }, result: (s) => `You did write it down, after all: ${label(s, R.echo2)}.` }
      ]
    },

    /* ================= Loop of Endless Data Entry ================= */
    {
      id: 'loop_hold', title: 'Your call is important to us', at: ['loop'],
      text: (s) => `To confirm one detail about ${C(s)}'s existing accounts, you have to call another company. The hold music is an eight-second flute clip on repeat. "Your call is important to us," it says, for the ninth time.`,
      choices: [
        { label: 'Stay on hold, however long it takes', kind: 'prepare', preview: 'Half the time, an hour. Half the time, the whole day (and a little of your soul).',
          eff: () => (roll('hold', 0.5) ? { energy: -1, insight: 1 } : { energy: -2, days: 1, insight: 1 }),
          result: () => (R.hold ? 'Fifty-three minutes. A real person. The detail is confirmed.' : 'They transfer you to the back of the queue at 4:58pm. You call again the next morning. Same flute.') },
        { label: 'Fill it in from what you remember', kind: 'through', hint: 'Your memory is pretty good. Pretty.', eff: { momentum: 2, debt: { tag: 'unverified_details', sev: 2 } }, result: 'Typed, submitted, done. The flute plays on, for someone else.' },
        { label: 'Ask the client to call with you', kind: 'around', eff: (s) => ({ days: 1, momentum: -1, trust: s.client.prefers === 'call' ? 1 : -1, insight: 1 }), result: (s) => (s.client.prefers === 'call' ? `${C(s)} turns out to be wonderful on the phone. They charm the person on the other end in four minutes.` : `${C(s)} is visibly suffering. "Is it always this flute?"`) },
        { label: 'Ask Olu if there is a direct line', kind: 'help', contact: 'operator', show: ready('operator'), eff: { momentum: 1, insight: 1 }, result: 'There is a direct line. Of course there is. Olu has it on a sticky note.' }
      ]
    },
    {
      id: 'loop_dropdown', title: 'None of the above', at: ['loop'],
      text: (s) => `The form needs one answer from a dropdown menu. None of the options describe ${C(s)}'s situation. The closest is "Other (please call)." Calling, presumably, leads back here.`,
      choices: [
        { label: 'Pick the closest option and move on', kind: 'through', eff: { momentum: 1, debt: { tag: 'defaults', sev: 2 } }, result: 'Close enough. The form accepts it without complaint, which is somehow worse.' },
        { label: 'Call and ask what "Other" means', kind: 'prepare', eff: { energy: -1 },
          then: { text: 'After twenty minutes, someone in Operations says: "Pick Other and attach a note explaining. Then someone reads the note. Usually."',
            choices: [
              { label: 'Write a short, careful note', kind: 'prepare', eff: { energy: -1, insight: 1, trust: 1 }, result: 'Four sentences. Clear and true. Somewhere, a reviewer exhales gratefully.' },
              { label: 'Write "see attached" and attach everything', kind: 'through', eff: { momentum: 1, debt: { tag: 'bad_handoff', sev: 1 } }, result: '"See attached." Attached: forty pages. Good luck, reviewer.' },
              { label: 'Hand the note to your assistant', kind: 'around', eff: { days: 1, energy: 1 }, result: 'Your assistant writes a lovely note a day later. You check it over. It is better than yours would have been.' }
            ] } },
        { label: 'Leave it blank and see what happens', kind: 'around', preview: '50% it sails through. 50% it bounces back in two days.',
          eff: () => (roll('dd', 0.5) ? { momentum: 1 } : { days: 2, momentum: -1 }),
          result: () => (R.dd ? 'Nobody notices. You feel strangely uneasy about that.' : 'It bounces back two days later with a red stamp: INCOMPLETE. Around the loop you go.') }
      ]
    },
    {
      id: 'loop_already_asked', title: 'Asked and answered', at: ['loop'],
      text: (s) => `You ask ${C(s)} for their date of birth. They close their eyes. "Your assistant asked me that. The Specialist asked me that. You asked me that. On Tuesday."`,
      choices: [
        { label: 'Apologize and ask anyway', kind: 'around', eff: { trust: -1, insight: 1 }, result: (s) => `${C(s)} tells you. Again. Slowly.` },
        { label: 'Copy it from an old form instead', kind: 'through', eff: { momentum: 1, debt: { tag: 'stale_info', sev: 1 } }, result: 'Copied from an old form. Which was copied from an older form. Which was probably right.' },
        { label: 'Stop and build one fact sheet everyone uses', kind: 'prepare', hint: 'Slow today. Fewer loops tomorrow.', eff: { energy: -2, days: 1, insight: 2, trust: 1 }, result: (s) => `One page, one source of truth. You send it to everyone and tell ${C(s)} they will never be asked again. You mean it.` },
        { label: 'Go through the shoebox of paperwork properly', kind: 'prepare', minigame: 'factFind', hint: 'Sort what is current, what needs updating, and what to ask.', result: 'Everything in one place now, checked and current.' },
        { label: 'Pull it from your client database', kind: 'help', show: (s) => hasSys(s, 'crm'), eff: { momentum: 1, trust: 1 }, result: 'It is right there. You never ask again. They notice.' }
      ]
    },
    {
      id: 'loop_timeout', title: 'Session expired', at: ['loop'],
      text: 'You have spent an hour on the form. You press Submit. The screen goes white. "Your session has expired for your security. Please log in again." The form, needless to say, is empty.',
      choices: [
        { label: 'Press Back and hope', kind: 'through', preview: '40%: it is all still there. 60%: it is not, and now you are annoyed.',
          eff: () => (roll('to', 0.4) ? { momentum: 1 } : { energy: -1, momentum: -1 }),
          result: () => (R.to ? 'It is all there! You will never know why. Submit.' : 'It is not there. It is never there. You retype it with feeling.') },
        { label: 'Retype it carefully from the source documents', kind: 'prepare', eff: { energy: -2, insight: 1 }, result: 'Slow. This time you notice a detail you got wrong the first time. The timeout was a gift. A horrible gift.' },
        { label: 'Retype it fast from memory', kind: 'through', eff: { momentum: 1, energy: -1, debt: { tag: 'unverified_details', sev: 1 } }, result: 'Done in twenty minutes. Mostly the same as before. Mostly.' },
        { label: 'Call Kenji', kind: 'help', contact: 'whisperer', show: ready('whisperer'), eff: { momentum: 1, insight: 1 }, result: '"It autosaves to drafts. Top right. Tiny grey icon." There it is. Kenji hangs up before you can thank him.' }
      ]
    },

    /* ================= Product-First Cliffs ================= */
    {
      id: 'cliffs_what_sell', title: '"So what do you actually sell?"', at: ['cliffs'],
      text: (s) => `At the cliff edge, ${C(s)} turns to you. "Can I be blunt? What do you actually sell? I'd rather know now." Behind you, someone goes over the edge mid-sentence.`,
      choices: [
        { label: 'Pull out the brochure and walk them through it', kind: 'through', hint: 'A straight answer to a straight question. Before you know what they need.', eff: { momentum: 2, debt: { tag: 'premature_pitch', sev: 2 } }, result: (s) => `${C(s)} reads the whole thing. "Okay. And which of these is for me?" You realize you are not sure.` },
        { label: 'Answer honestly, then turn it around', kind: 'prepare', eff: { trust: 1 },
          then: { text: (s) => `"Fair question. I can help with a lot of things, but which ones depends on what you're trying to fix." ${C(s)} considers this. "Okay. Then ask me something."`,
            choices: [
              { label: '"What made you pick up the phone?"', kind: 'prepare', preview: 'With Curiosity or Trust 6+, you hear the real reason.',
                eff: (s) => { R.cs = open(s); return R.cs ? { insight: 2, fact: worryFact(s) } : { insight: 1, trust: 1 }; },
                result: (s) => (R.cs ? `The real reason has nothing to do with any brochure. It is about ${label(s, worryFact(s))}.` : '"Honestly? It just felt like time." You will need more than that, but it is a start.') },
              { label: '"What would a good outcome look like?"', kind: 'around', eff: { insight: 1, trust: 1 }, result: 'They describe a feeling, not a product. That is the most useful thing anyone has said all day.' },
              { label: 'Actually, show them the brochure now', kind: 'through', eff: { momentum: 1, debt: { tag: 'premature_pitch', sev: 1 } }, result: 'They take it. They say they will read it. You both know they won\'t.' }
            ] } },
        { label: 'Explain plainly how you get paid', kind: 'around', hint: 'Uncomfortable. Honest.', eff: (s) => ({ trust: comm(s) ? 2 : 1, momentum: -1 }), result: (s) => `${C(s)} blinks. "Nobody's ever just told me that." They take a step back from the edge.` }
      ]
    },
    {
      id: 'cliffs_leaderboard', title: 'The leaderboard', at: ['cliffs'],
      text: 'A big chalkboard on a post at the cliff edge: TOP PITCHERS THIS WEEK. The names at the top have little stars. Yours isn\'t on it. Below the board, a long way below, there is a large pile of brochures.',
      choices: [
        { label: 'Get on the board: pitch something today', kind: 'through', eff: { momentum: 2, trust: -1, debt: { tag: 'premature_pitch', sev: 2 } }, result: 'Your name goes up in chalk. It looks great. Your client looks less great about it.' },
        { label: 'Ask which of those names still have their clients', kind: 'prepare',
          then: { text: 'A passing agent squints at the board. "Still have their clients? Nobody tracks that. Why would you track that?" He thinks about it. "Huh. Why wouldn\'t you track that?"',
            choices: [
              { label: 'Start tracking it yourself', kind: 'prepare', eff: (s) => (PP.skill(s, 'judgment') < 2 ? { skill: { judgment: 1 }, energy: -1 } : { insight: 1 }), result: 'You chalk a second column on the board: STILL CLIENTS? It stays empty for a very long time.' },
              { label: 'Shrug and keep going', kind: 'around', eff: { insight: 1 }, result: 'You file the thought away for later.' }
            ] } },
        { label: 'Ignore the board entirely', kind: 'around', eff: { energy: 1 }, result: 'It is surprisingly restful, not caring about a board.' }
      ]
    },
    {
      id: 'cliffs_client_wants_it', title: 'They already know what they want', at: ['cliffs'],
      text: (s) => `${C(s)} has read an article. "I want the thing in this article. My coworker got one. Can you just get me that?" They are waving their phone very close to the edge.`,
      choices: [
        { label: 'Get them exactly what they asked for', kind: 'through', hint: 'Fast, easy, and they asked. Whether it fits is another question.', eff: { momentum: 3, trust: 1, debt: { tag: 'assumed_goal', sev: 2 } }, result: '"Done!" They are delighted. The article was not written about them.' },
        { label: '"Tell me what you liked about it."', kind: 'prepare',
          then: { text: (s) => `"It just sounded... safe? Like I'd stop worrying." ${C(s)} lowers the phone. "Is that a weird reason?"`,
            choices: [
              { label: '"Not weird. What are you worried about?"', kind: 'prepare', preview: 'With Curiosity or Trust 6+, they tell you.',
                eff: (s) => { const w = worry(s); R.cw = open(s) && !!(w && w.fact); return R.cw ? { insight: 2, trust: 1, fact: w.fact } : { insight: 1, trust: 1 }; },
                result: (s) => (R.cw ? worry(s).text : (worry(s) && worry(s).guarded) || '"Everything, a bit." It is a start.') },
              { label: 'Explain why the article might not fit them', kind: 'around', eff: (s) => (comm(s) ? { trust: 1, insight: 1 } : { trust: -1, insight: 1 }), result: (s) => (comm(s) ? 'You manage it without making them feel silly. They thank you.' : `It is correct, but it comes out like a lecture. ${C(s)} puts the phone away a little sharply.`) },
              { label: 'Get it anyway: it does make them feel safe', kind: 'through', eff: { momentum: 2, debt: { tag: 'assumed_goal', sev: 1 } }, result: 'They feel safe. Whether they are is a question for later.' }
            ] } },
        { label: 'Flatly say no', kind: 'around', hint: 'Maybe right. Definitely abrupt.', eff: { trust: -2, momentum: -1 }, result: (s) => `"Oh. Okay." ${C(s)} puts the phone away. They stop telling you things for a while.` },
        { label: 'Ask Dev to read the article with you', kind: 'help', contact: 'specialist', show: ready('specialist'), eff: { insight: 2, trust: 1 }, result: 'Dev reads it in thirty seconds. "Good article. Wrong person." Explained kindly, it lands.' }
      ]
    },

    /* ================= Spreadsheet Swamp ================= */
    {
      id: 'swamp_versions', title: 'final_v7_REAL_final', at: ['swamp'],
      text: (s) => `${C(s)} sends over the spreadsheet. Then another one. There are seven versions. The newest is called "final_v7_REAL_final (2)". The oldest is called "final".`,
      choices: [
        { label: 'Use the one with the latest date', kind: 'through', preview: '55% it is the real one. Otherwise the numbers are from an old version (hidden risk).',
          eff: () => (roll('ver', 0.55) ? { momentum: 1 } : { momentum: 1, debt: { tag: 'stale_info', sev: 2 } }),
          result: 'The latest date. Surely the latest date means the latest numbers.' },
        { label: 'Ask which one is real', kind: 'prepare',
          then: { text: (s) => `${C(s)} thinks. "Well, mine is v5. ${stake(s)} made v6 and v7. I haven't really looked at those." A pause. "They might have changed some things."`,
            choices: [
              { label: 'Ask to see what changed, and why', kind: 'prepare', eff: (s) => ({ momentum: -1, insight: 2, fact: s.client.stakeholderFact }), result: (s) => `${stake(s)}'s version answers a slightly different question from ${C(s)}'s. That difference is the whole conversation.` },
              { label: 'Stick with the client\'s version', kind: 'through', eff: (s) => ({ momentum: 1, debt: { tag: 'unknown_stakeholder', sev: 1 }, missed: s.client.stakeholderFact }), result: 'v5 it is. v6 and v7 sit in the inbox, unopened, quietly disagreeing.' },
              { label: 'Merge them all into one master file', kind: 'around', eff: { energy: -2, insight: 1, style: { overcomplicate: 2 } }, result: 'final_v8_MASTER. Twenty-six tabs. You are sinking, but in a very organized way.' }
            ] } },
        { label: 'Start a fresh one-page version together', kind: 'prepare', hint: 'Simpler. Some people love their tabs.', eff: (s) => ({ energy: -1, insight: 1, style: { overcomplicate: -1 }, trust: s.client.complexity === 'high' ? -1 : 1 }), result: (s) => (s.client.complexity === 'high' ? `${C(s)} looks at the single page as if you have insulted their family. Still, it is clearer.` : `${C(s)} looks relieved. "Oh, thank goodness. I didn't understand anything after v3."`) }
      ]
    },
    {
      id: 'swamp_circular', title: 'Circular reference', at: ['swamp'],
      text: 'A warning pops up on the model: "There are one or more circular references." It has been there for months. Everyone just clicks OK. Somewhere in the swamp, something gurgles.',
      choices: [
        { label: 'Click OK like everyone else', kind: 'through', eff: { momentum: 1, debt: { tag: 'spreadsheet_assumptions', sev: 2 } }, result: 'OK. The warning goes away. The reference stays circular.' },
        { label: 'Trace it to the source', kind: 'prepare', preview: 'With Preparation, likely quick. Without it, a coin flip on whether you vanish into the swamp for an afternoon.',
          eff: (s) => (roll('circ', PP.skill(s, 'preparation') > 0 ? 0.8 : 0.5) ? { energy: -1, insight: 2, fact: s.client.spreadsheetFact } : { energy: -3, insight: 1, style: { overcomplicate: 1 } }),
          result: (s) => (R.circ ? `Tab 4 points at tab 9, which points at tab 4. Untangling it shows you what actually matters: ${label(s, s.client.spreadsheetFact)}.` : 'Three hours later you have found two more circular references and lost a shoe.') },
        { label: 'Ask: "What decision is this model for?"', kind: 'prepare', show: curious, hint: 'Curiosity: the question under the spreadsheet.', eff: (s) => ({ insight: 2, momentum: -1, style: { overcomplicate: -1 }, fact: s.client.spreadsheetFact }), result: (s) => `${C(s)} thinks. The answer fits on a sticky note. Suddenly you don't need most of the model.` },
        { label: 'Call Marge', kind: 'help', contact: 'veteran', show: ready('veteran'), eff: { insight: 1, momentum: 1, style: { overcomplicate: -1 } }, result: '"Delete the tab," Marge says. "Nobody\'s looked at it since the day it was made." She is right.' }
      ]
    },
    {
      id: 'swamp_scenario', title: 'Scenario twelve', at: ['swamp'],
      text: (s) => `"One more scenario," ${C(s)} says. "What if everything goes great? And what if everything goes terribly? And what if it's somewhere in the middle, but on a Tuesday?"`,
      choices: [
        { label: 'Model all three', kind: 'through', eff: { energy: -2, trust: 1, style: { overcomplicate: 1 } }, result: 'Scenarios twelve, thirteen and fourteen. Tuesday looks a lot like the others.' },
        { label: '"Which of these would change what you do?"', kind: 'prepare',
          then: { text: (s) => `${C(s)} opens their mouth, closes it, and looks at the screen. "...None of them, really. I think I keep asking because I'm scared to pick."`,
            choices: [
              { label: 'Ask what picking feels like', kind: 'prepare', preview: 'With Curiosity or Trust 6+, you hear what is underneath.',
                eff: (s) => { const w = worry(s); R.sc = open(s) && !!(w && w.fact); return R.sc ? { insight: 2, trust: 1, fact: w.fact } : { insight: 1, trust: 1 }; },
                result: (s) => (R.sc ? worry(s).text : '"Like jumping." They laugh a little. It is not really a joke.') },
              { label: 'Pick the most likely scenario together', kind: 'around', eff: { momentum: 1, style: { overcomplicate: -1 } }, result: 'One scenario, circled in pen. The rest get archived. The swamp loosens its grip.' }
            ] } },
        { label: 'Say no, kindly', kind: 'around', eff: (s) => ({ momentum: 1, trust: comm(s) ? 0 : -1 }), result: (s) => (comm(s) ? '"More scenarios won\'t make the choice easier. Let\'s talk about the choice." They nod, slowly.' : `"Oh. Okay." ${C(s)} closes the laptop, a little hurt.`) }
      ]
    },
    {
      id: 'swamp_knee_deep', title: 'Knee-deep', at: ['swamp'],
      when: (s) => s.style.overcomplicate >= 2,
      text: (s) => `You look up from the model. It is dark. You have not spoken to ${C(s)} in two days. You have, however, built a sensitivity analysis of your sensitivity analysis.`,
      choices: [
        { label: 'Close the laptop and call them', kind: 'prepare', eff: { trust: 1, momentum: -1, style: { overcomplicate: -2 } }, result: (s) => `${C(s)} picks up. "Oh! I thought you'd been eaten by something." Nearly.` },
        { label: 'One more pass, then call', kind: 'through', eff: { energy: -2, insight: 1, style: { overcomplicate: 1 }, debt: { tag: 'missed_message', sev: 1 } }, result: 'One more pass becomes three. Your phone buzzes. You will get to it.' },
        { label: 'Send the model with a long explanatory email', kind: 'around', eff: (s) => ({ momentum: 1, trust: s.client.prefers === 'email' ? 1 : -1, debt: { tag: 'confused_client', sev: 1 } }), result: (s) => (s.client.prefers === 'email' ? 'They read it all. Twice. With a highlighter.' : 'They open it on their phone, scroll for a while, and go to bed.') },
        { label: 'Call Marge for a reality check', kind: 'help', contact: 'veteran', show: ready('veteran'), eff: { style: { overcomplicate: -2 }, insight: 1, energy: 1 }, result: '"Did the client ask for this?" "...No." "Then go to bed." You go to bed.' }
      ]
    },

    /* ================= Snake Pit of Unreturned Calls ================= */
    {
      id: 'snakepit_old_voicemail', title: 'A voicemail from three weeks ago', at: ['snakepit'], cut: 'phones',
      text: (s) => `Deep in the pit, coiled under the others: a voicemail from ${C(s)}. Three weeks old. You never listened to it. It is forty seconds long.`,
      choices: [
        { label: 'Listen to it now', kind: 'prepare',
          then: { text: (s) => `${C(s)}'s voice, a little nervous: "Hi, it's me. Sorry, it's probably nothing, but I wanted to mention... actually, I'll tell you next time. Bye!" They never did tell you next time.`,
            choices: [
              { label: 'Call them and ask what it was', kind: 'prepare', preview: 'With Trust 4+ or Communication, they tell you. Otherwise, it stings that you took three weeks.',
                eff: (s) => { R.vm = s.res.trust >= 4 || comm(s); return R.vm ? { trust: 1, insight: 2, fact: worryFact(s) } : { trust: -1, insight: 1 }; },
                result: (s) => (R.vm ? `"Oh! You got that." A pause. Then they tell you: ${label(s, worryFact(s))}.` : `"That was weeks ago," ${C(s)} says. "It's fine. Don't worry about it." It is clearly not fine.`) },
              { label: 'Apologize for the delay first, properly', kind: 'around', eff: { trust: 1, energy: -1 }, result: (s) => `${C(s)} accepts the apology. "Honestly, I figured you were busy." That lands somewhere you do not like.` },
              { label: 'Assume it really was nothing', kind: 'through', eff: (s) => ({ momentum: 1, missed: worryFact(s), debt: { tag: 'missed_message', sev: 1 } }), result: 'They did say it was probably nothing.' }
            ] } },
        { label: 'Text "Got your message!" without listening', kind: 'through', hint: 'Technically true.', eff: { momentum: 1, debt: { tag: 'missed_message', sev: 2 } }, result: (s) => `${C(s)} replies with a thumbs up. You both move on, in different directions.` },
        { label: 'Delete it with the others', kind: 'around', eff: { energy: 1, debt: { tag: 'missed_message', sev: 2 }, style: { avoid: 1 } }, result: 'The pit is quieter. You feel a little lighter, and a little worse.' }
      ]
    },
    {
      id: 'snakepit_callbacks', title: 'Fourteen callbacks', at: ['snakepit'],
      text: 'Your callback list has fourteen names on it. Three are marked URGENT. One is marked URGENT!!! in your own handwriting, and you do not remember why.',
      choices: [
        { label: 'Block out time and work through the week', kind: 'prepare', minigame: 'calendar', hint: 'Prep before meetings. Don\'t overbook.', result: 'Every name gets a slot. URGENT!!! turned out to be a birthday. You made it.' },
        { label: 'Call the three loudest, ignore the rest', kind: 'through', eff: { momentum: 1, energy: -1, debt: { tag: 'missed_message', sev: 1 } }, result: 'The loud ones are happy. The quiet ones are quiet, which is not the same thing.' },
        { label: 'Have your assistant send everyone a holding message', kind: 'around', preview: '60% it buys you time. 40% someone wanted a real answer, and your client hears about it.',
          eff: () => (roll('cb', 0.6) ? { energy: 1 } : { trust: -1, energy: 1 }),
          result: () => (R.cb ? '"Will call this week!" Most people are fine with that.' : 'One person replies, "I asked a yes or no question." Word gets around. Your client hears.') },
        { label: 'Call the URGENT!!! one first', kind: 'prepare', eff: { energy: -1, trust: 1 }, result: (s) => `It is a client whose dog just died. You talk for ten minutes. ${C(s)} overhears, and looks at you a little differently.` }
      ]
    },
    {
      id: 'snakepit_cold_client', title: 'A client gone cold', at: ['snakepit'],
      text: 'A snake uncoils from the back of the pit. It has a familiar face: a client you signed last year and have not called since. It hisses. "Remember me? Someone else has been calling."',
      choices: [
        { label: 'Apologize and book a proper review', kind: 'prepare', eff: { energy: -1, days: 1, prospect: { temp: 'warm', source: 'a friend of a past client you finally called back' } }, result: 'An hour on the phone. They are still cross, but they are still yours. They even mention a friend who needs help. (New prospect in your pipeline.)' },
        { label: 'Send a cheerful "checking in!" email', kind: 'around', preview: 'A coin flip: it lands, or it reads like exactly what it is.',
          eff: () => (roll('cold', 0.5) ? { momentum: 1 } : { trust: -1 }),
          result: () => (R.cold ? 'They reply "nice to hear from you." Thawing, slightly.' : 'They reply "Who is this?" Your current client, reading over your shoulder, goes quiet.') },
        { label: 'Let them go, focus on your current client', kind: 'through', hint: 'Your client gets your full attention. Your book gets a little smaller.', eff: { momentum: 1, trust: 1 }, result: (s) => `You step past. ${C(s)} gets all of you today. Back at the port, a file quietly closes.` }
      ]
    },
    {
      id: 'snakepit_disconnected', title: 'The number you have dialed', at: ['snakepit'],
      text: (s) => `You finally return a call about ${C(s)}'s file, and the number is disconnected. The details on file are out of date. Nobody updated them. Possibly you.`,
      choices: [
        { label: 'Ask your client for the new details', kind: 'prepare', eff: (s) => ({ trust: comm(s) ? 0 : -1, insight: 1, clearDebt: hasDebt(s, 'unverified_details') ? 'unverified_details' : null }), result: (s) => `${C(s)} gives you the right number. "I told someone that. Maybe not you." You update every file you can find.` },
        { label: 'Track it down through someone close to them', kind: 'around', eff: (s) => ({ days: 1, fact: s.client.stakeholderFact, insight: 1 }), result: (s) => `${stake(s)} has the number, and some opinions about how hard it was to reach anyone. Fair.` },
        { label: 'Mark it "unreachable" and move on', kind: 'through', eff: { momentum: 1, debt: { tag: 'unverified_details', sev: 2 } }, result: 'UNREACHABLE, in red. That will definitely not come up again.' }
      ]
    },

    /* ================= Shifting Sands of Incentives ================= */
    {
      id: 'sands_priority_list', title: 'The recruiter', at: ['sands'],
      text: (s) => `A recruiter in a very clean jacket finds you between two dunes. "Big signing bonus at our firm. All you'd need to do is bring your clients over. ${C(s)} too, obviously. Their plan would just need... redoing. From scratch. Small thing."`,
      choices: [
        { label: 'Take the bonus and move everyone', kind: 'through', hint: 'Real money now. Every client starts their paperwork over.', eff: { cash: 1500, trust: -2, momentum: -1, debt: { tag: 'assumed_goal', sev: 2 } }, result: (s) => `The money is real. So is ${C(s)}'s face when you explain that everything starts over, again, for reasons that are mostly about you.` },
        { label: 'Ask what happens to clients who move', kind: 'prepare',
          then: { text: '"Happens?" The recruiter checks his phone. "They move. Some of them. The ones who don\'t, well, there are always more clients." He smiles. It does not reach his eyes.',
            choices: [
              { label: 'Turn it down', kind: 'prepare', eff: (s) => (PP.skill(s, 'judgment') < 2 ? { skill: { judgment: 1 }, trust: 1 } : { trust: 1, insight: 1 }), result: (s) => `"Thanks, but no." ${C(s)} was close enough to hear, and pretends very hard that they weren't.` },
              { label: 'Take his card, just in case', kind: 'around', eff: { insight: 1 }, result: 'The card is heavy and has embossed lettering. You put it somewhere you will find it on a bad day.' }
            ] } },
        { label: 'Say no on the spot', kind: 'around', eff: { trust: 1, momentum: 1 }, result: 'Short and polite. The recruiter is already walking toward the next agent. Your client noticed you did not even think about it.' },
        { label: 'Run it through your focus routine', kind: 'help', show: (s) => hasSys(s, 'focus'), eff: { insight: 1, momentum: 1, trust: 1 }, result: 'Your routine asks: five years from now, which choice do you want to have made? It is not close.' }
      ]
    },
    {
      id: 'sands_new_platform', title: 'The free lunch', at: ['sands'],
      text: 'A rep from an outside company has set up a lunch tent in the dunes: good sandwiches, a slideshow about their product, and a points card. Every sale earns points toward a trip. The cookies are excellent.',
      choices: [
        { label: 'Eat, collect points, pitch their product to your client', kind: 'through', hint: 'Good cookies. Whose interest is the pitch in?', eff: { cash: 300, energy: 1, trust: -1, debt: { tag: 'premature_pitch', sev: 2 }, style: { chase: 1 } }, result: (s) => `You bring it up with ${C(s)} that afternoon, still holding a cookie. "Is this... from the lunch?" They have seen the tent.` },
        { label: 'Eat the sandwich, keep your judgment', kind: 'prepare', eff: { energy: 2, insight: 1 }, result: 'You learn how the product works, ask two hard questions the rep cannot answer, and leave the points card on the table. A free sandwich is not a contract.' },
        { label: 'Skip the lunch and keep walking', kind: 'around', eff: { momentum: 1 }, result: 'You hear the slideshow through the tent wall for a while. Something about "unlocking value." The dunes sound better.' },
        { label: 'Run it past Harold first', kind: 'help', contact: 'compliance', show: ready('compliance'), eff: { insight: 1, clearDebt: 'premature_pitch' }, result: 'Harold reads the points card twice. "You can eat the sandwich. Recommend what fits the client, and write down why." He takes a cookie. For the file.' }
      ]
    },
    {
      id: 'sands_mirage', title: 'The next bonus tier', at: ['sands'],
      text: (s) => `On the horizon, shimmering: THE NEXT BONUS TIER. Your payout rate jumps if you reach it this quarter, and you are one decent-sized sale away. ${C(s)}'s plan could be a little bigger than it needs to be. Nobody would ever know. Probably.`,
      choices: [
        { label: 'Size the plan up, just a little', kind: 'through', hint: 'A bigger plan than they need. Clients sometimes notice.', preview: '50% the client never notices. 50% they ask why it got bigger.',
          eff: () => (roll('tier', 0.5) ? { cash: 300, momentum: 1, debt: { tag: 'premature_pitch', sev: 1 } } : { cash: 300, trust: -2, debt: { tag: 'premature_pitch', sev: 2 } }),
          result: (s) => (R.tier ? 'Nobody asks. The mirage gets closer. You feel slightly worse than you expected to.' : `${C(s)} reads the numbers. "This is bigger than what we talked about. Why?" You do not have a good answer.`) },
        { label: 'Size it to what they actually need', kind: 'prepare', eff: { trust: 1, insight: 1 }, result: 'The mirage stays exactly as far away. The plan fits. That will matter longer than a quarter does.' },
        { label: 'Ask what size feels right to them', kind: 'prepare', preview: 'Likely to land with Communication or Trust 6+.',
          eff: (s) => (roll('mir', comm(s) || s.res.trust >= 6 ? 0.8 : 0.45) ? { trust: 2, insight: 1 } : { trust: 1 }),
          result: (s) => (R.mir ? `${C(s)} thinks. "Smaller than I expected you to say. Is that allowed?" It is. They trust you a good deal more for it.` : '"I don\'t know. What do you think?" You tell them honestly. It is a start.') },
        { label: 'Think about what the tier costs you long-term', kind: 'prepare', show: (s) => PP.skill(s, 'judgment') > 0, hint: 'Judgment: the payout is one quarter; the reputation is the whole career.', eff: { momentum: 1, trust: 1 }, result: 'One quarter of a better payout, against twenty years of referrals from a client who trusts your numbers. The mirage fades.' }
      ]
    },
    {
      id: 'sands_stake_pivot', title: 'They saw the banner too', at: ['sands'],
      when: (s) => K(s, s.client.stakeholderFact),
      text: (s) => `A message from ${stake(s)}: they saw the "product of the month" advertised and want to know why ${C(s)} isn't getting "the thing everyone's talking about." ${C(s)} reads it aloud, frowning. "Should I be?"`,
      choices: [
        { label: 'Get them both on a call', kind: 'prepare', eff: { energy: -1, momentum: -1 },
          then: { text: (s) => `${stake(s)} explains what they read. ${C(s)} explains what they told you. Both of them are right about something, and both of them are getting louder.`,
            choices: [
              { label: 'Explain honestly why it\'s featured, and whether it fits', kind: 'prepare', preview: 'With Communication: likely to settle it. Otherwise a coin flip.',
                eff: (s) => { R.sp = comm(s) || PP.chance(0.5); return R.sp ? { trust: 2, insight: 2 } : { trust: -1, insight: 1 }; },
                result: () => (R.sp ? '"It\'s featured because the company is promoting it this month. Here\'s what you actually need, and why." Silence. Then, "...that\'s refreshingly honest." Progress.' : 'You try to explain. Both of them correct your explanation. At least they agree on that.') },
              { label: 'Suggest they talk it through without you', kind: 'around', eff: { days: 1, trust: 1 }, result: 'A day later they come back with one question instead of two opinions. It is a better question.' },
              { label: 'Side with your client', kind: 'through', eff: { trust: 1, debt: { tag: 'unknown_stakeholder', sev: 2 } }, result: (s) => `${C(s)} looks grateful. ${stake(s)} hangs up. That will come up again.` }
            ] } },
        { label: 'Just give them the featured product', kind: 'through', hint: 'Everyone stops asking. For now.', eff: { cash: 300, momentum: 1, trust: -1, debt: { tag: 'premature_pitch', sev: 2 }, style: { chase: 1 } }, result: (s) => `Easy. ${stake(s)} is satisfied. ${C(s)} has a product nobody checked against their actual life.` },
        { label: 'Tell your client to ignore it', kind: 'around', eff: { momentum: 1, debt: { tag: 'unknown_stakeholder', sev: 1 } }, result: '"We\'ll come back to it." Famous last words, written in sand.' }
      ]
    },

    /* ================= Caves of What-Ifs ================= */
    {
      id: 'caves_wet_ink', title: 'What if the paycheck stops?', at: ['caves'],
      text: (s) => `A side tunnel is marked WHAT IF THE PAYCHECK STOPS? ${C(s)} peers in and steps back. "I try really hard not to think about that one."`,
      choices: [
        { label: 'Assume their income is safe and move on', kind: 'through', hint: 'Comfortable. It is also a guess.', eff: { momentum: 1, debt: { tag: 'guessed_key', sev: 1 }, style: { avoid: 1 } }, result: '"You\'ll be fine," you say. You both want it to be true.' },
        { label: 'Walk it through: how many months could they manage?', kind: 'prepare', hint: 'Gently, with real numbers.',
          eff: (s) => { R.pay = topicFact(s, 'money') || topicFact(s, 'work'); return Object.assign({ insight: 2, energy: -1 }, R.pay ? { fact: R.pay, trust: 1 } : {}); },
          result: (s) => (R.pay ? `You count it out together on the back of an envelope. Somewhere around month three, ${C(s)} tells you something that matters: ${label(s, R.pay)}.` : `You count it out together. It is fewer months than ${C(s)} hoped, and more than they feared. They look steadier. They are clearly holding something back, though.`) },
        { label: 'Lay out the worst case in full detail', kind: 'through', hint: 'Accurate. Possibly terrifying.', eff: (s) => (comm(s) ? { insight: 1, trust: 1 } : { insight: 1, trust: -2, debt: { tag: 'confused_client', sev: 1 } }), result: (s) => (comm(s) ? 'You say the hard version plainly and kindly. They thank you for not sugarcoating it.' : `${C(s)} stares at the cave floor for a long time. You may have gone a little fast.`) },
        { label: 'Call Ray: "What do the lean months look like?"', kind: 'help', contact: 'banker', show: ready('banker'), eff: (s) => ({ insight: 2, fact: topicFact(s, 'money', true) }), result: 'Ray asks one question: "What month do you dread?" Everyone has an answer, and theirs explains a lot.' }
      ]
    },
    {
      id: 'caves_fax', title: 'What if you get sick?', at: ['caves'],
      text: (s) => `Water drips in a tunnel marked WHAT IF YOU COULDN'T WORK FOR A WHILE? ${C(s)} laughs nervously. "I never get sick. Well. Almost never."`,
      choices: [
        { label: 'Joke along and move on', kind: 'around', eff: { trust: 1, debt: { tag: 'unchallenged_assumption', sev: 2 } }, result: '"Iron constitution!" you agree. The tunnel stays unexplored, which is exactly where it can surprise you later.' },
        { label: 'Ask who would step in if they were laid up', kind: 'prepare', hint: 'Turns a scary question into a practical one.',
          eff: (s) => ({ insight: 2, trust: 1, energy: -1, fact: s.client.stakeholderFact }),
          result: (s) => `"Who'd handle things? Huh." ${C(s)} thinks out loud, and ${s.client.stakeholder} comes up fast. It turns out a lot depends on them.` },
        { label: 'Talk through it gently, step by step', kind: 'prepare', preview: 'With Communication or Trust 6+, it lands softly. Otherwise it can feel heavy.',
          eff: (s) => { R.sick = comm(s) || s.res.trust >= 6; return R.sick ? { trust: 2, insight: 1 } : { trust: -1, insight: 1 }; },
          result: (s) => (R.sick ? `You go slow. Three months, then six. What would carry on, what would stop. ${C(s)} breathes out. "That's less scary than I thought."` : `It is a lot, all at once. ${C(s)} goes quiet.`) },
        { label: 'Bring Dev in to explain what usually protects an income', kind: 'help', contact: 'specialist', show: ready('specialist'), eff: { insight: 2, trust: 1 }, result: 'Dev explains the general idea in four sentences, without one acronym. Your client asks good questions. You take notes for later.' }
      ]
    },
    {
      id: 'caves_bob', title: 'What if the money runs out first?', at: ['caves'], cut: 'caves',
      text: (s) => `Deep in the cave there is a ledge with a sign: AGE 95. ${C(s)} laughs. "I'm not going to live that long." A pause. "Am I?"`,
      choices: [
        { label: 'Plan to an age that feels comfortable', kind: 'through', hint: 'A tidy number. People keep outliving tidy numbers.', eff: { momentum: 1, debt: { tag: 'guessed_key', sev: 1 } }, result: 'You pick a reasonable-sounding age. The plan looks lovely, right up to the edge of the page.' },
        { label: 'Show them the long version, gently', kind: 'prepare', eff: (s) => (comm(s) || PP.skill(s, 'judgment') > 0 ? { insight: 2, trust: 1 } : { insight: 2, trust: -1 }), result: (s) => (comm(s) || PP.skill(s, 'judgment') > 0 ? `You walk to the ledge together. "Good news: you might get a long life. Let's make sure the money gets one too." ${C(s)} smiles at that.` : `The numbers are right, but they land like a lecture. ${C(s)} looks tired.`) },
        { label: 'Ask what a long life would look like for them', kind: 'prepare',
          then: { text: (s) => { const g = s.client.checkin && s.client.checkin.goal; return `${C(s)} sits on the ledge. ` + (g ? g.text : '"I don\'t know. Being useful? Not being a burden?"'); },
            choices: [
              { label: '"Then that is what we plan for."', kind: 'prepare', eff: (s) => { const g = s.client.checkin && s.client.checkin.goal; return Object.assign({ trust: 2, insight: 1 }, g && g.fact ? { fact: g.fact } : {}); }, result: 'It is the first time the plan sounds like their life instead of a spreadsheet.' },
              { label: 'Write it down and keep walking', kind: 'around', eff: { insight: 1 }, result: 'One line in your notes. You will come back to it.' }
            ] } },
        { label: 'Check Olu\'s checklist', kind: 'help', item: 'checklist', show: holding('checklist'), eff: (s) => ({ insight: 1, momentum: 1, clearDebt: oldestDebt(s) }), result: 'Line 12 of Olu\'s checklist: "Did you plan for a long life? Longer than that?" You fix the one thing you had glossed over.' }
      ]
    },
    {
      id: 'caves_family_way', title: 'What if someone needs you?', at: ['caves'],
      text: (s) => `The tunnel narrows into what looks like a kitchen: a parent at the table, a pill organizer, a calendar full of appointments. A sign reads WHAT IF SOMEONE YOU LOVE NEEDS CARE? ${C(s)} goes quiet.`,
      choices: [
        { label: 'Explain what care costs, with numbers', kind: 'through', hint: 'Useful. Possibly too much, too soon.', eff: (s) => (comm(s) ? { trust: 1, insight: 1 } : { trust: -2, insight: 1 }), result: (s) => (comm(s) ? 'You keep it short and human. They take it in.' : `${C(s)} folds their arms. "Can we not do this part right now?"`) },
        { label: 'Ask about the people in their life', kind: 'prepare',
          then: { text: (s) => `${C(s)} talks about family: who looks after whom, who never calls, who would drop everything. ` + (worry(s) ? `Then, almost to themselves: ${open(s) ? worry(s).text : (worry(s).guarded || worry(s).text)}` : '"I suppose I\'ve never really thought about it."'),
            choices: [
              { label: '"Thank you for telling me that."', kind: 'prepare', preview: 'With Curiosity or Trust 6+, you learn what is really on their mind.',
                eff: (s) => { const w = worry(s); R.fam = open(s) && !!(w && w.fact); return R.fam ? { trust: 2, insight: 2, fact: w.fact } : { trust: 1, insight: 1, fact: s.client.stakeholderFact }; },
                result: (s) => (R.fam ? `Now you know what this plan really has to handle: ${label(s, worry(s).fact)}.` : `You learn who matters most here: ${s.client.stakeholder}. The rest can wait for another day.`) },
              { label: 'Keep it light and move on', kind: 'around', eff: { trust: 1 }, result: 'They seem relieved to step back into the light.' }
            ] } },
        { label: 'Leave that tunnel for another day', kind: 'around', eff: { trust: 1, debt: { tag: 'guessed_key', sev: 1 }, style: { avoid: 1 } }, result: 'Easier today. The tunnel will still be there, and so will whatever is in it.' }
      ]
    },

    /* ================= Specialist Summit ================= */
    {
      id: 'summit_waiting', title: 'Allow 3-5 business days', at: ['summit'],
      text: (s) => `You sent your question up the mountain. It is day four. ${C(s)} has asked twice whether there is any news. A sign at base camp reads: "Your request is in the queue. Your position in the queue is: yes."`,
      choices: [
        { label: 'Send a polite follow-up', kind: 'prepare', preview: '50% it nudges things along. 50% it goes to the back of the queue.',
          eff: () => (roll('wait', 0.5) ? { days: 1, insight: 1 } : { days: 2, momentum: -1 }),
          result: () => (R.wait ? 'A reply the next morning: "Thanks for the nudge, just finishing it now."' : 'An auto-reply: "Your follow-up has been received and added to the queue." Hmm.') },
        { label: 'Make your best guess and keep moving', kind: 'through', hint: 'Fast. If you guessed right, nobody will ever know.', eff: { momentum: 2, debt: { tag: 'guessed_key', sev: 2 } }, result: 'You fill in the gap yourself. The answer, when it comes, may or may not match.' },
        { label: 'Use the wait to sit down with the client', kind: 'prepare', eff: { days: 1, trust: 1 },
          then: { text: (s) => `With nothing to do but wait, you and ${C(s)} actually talk. Not about the plan. At some point they say, "Can I ask you something I've been embarrassed to ask?"`,
            choices: [
              { label: '"Of course."', kind: 'prepare', eff: (s) => { R.sw = unknown(s); return R.sw ? { insight: 2, trust: 1, fact: R.sw } : { insight: 1, trust: 1 }; }, result: (s) => (R.sw ? `It is a simple question, and the answer matters to them. Along the way, you learn about ${label(s, R.sw)}.` : 'It is a simple question. You answer it simply. They look relieved.') },
              { label: '"Can it wait until we hear back?"', kind: 'through', eff: { momentum: 1, trust: -1 }, result: '"Sure," they say. They do not ask again.' }
            ] } },
        { label: 'Ask Dev to nudge the queue', kind: 'help', contact: 'specialist', show: ready('specialist'), eff: { momentum: 1, insight: 1 }, result: 'Dev knows someone. The answer comes down the mountain by lunch.' }
      ]
    },
    {
      id: 'summit_one_more_doc', title: 'Just one more document', at: ['summit'],
      text: (s) => `The Specialist needs one more document before they can finish. Just last year's statement. ${C(s)} sends it. Then the Specialist needs the year before. And a signed letter. And "the other thing."`,
      choices: [
        { label: 'Ask the client for each one as it comes up', kind: 'around', eff: { trust: -1, days: 1, insight: 1 }, result: (s) => `${C(s)}, on the fourth request: "Is there a list? Could there have been a list?"` },
        { label: 'Push back: ask for everything in one list', kind: 'prepare',
          then: { text: 'The Specialist pauses. "Fair. Honestly, I didn\'t know what I\'d need until I saw the first one." They send a list. It is seven items long. One of them is "explain item 3."',
            choices: [
              { label: 'Go through the list with the client in one sitting', kind: 'prepare', eff: { energy: -1, momentum: 1, trust: 1, insight: 1 }, result: 'One call, seven items, done. Item 3 turns out to be a typo.' },
              { label: 'Send the client the list and let them sort it', kind: 'through', eff: { momentum: 1, debt: { tag: 'confused_client', sev: 1 } }, result: (s) => `${C(s)} gets the list. They understand four items. They send six. Close enough?` },
              { label: 'Bring Dev in to translate the list', kind: 'help', contact: 'specialist', show: ready('specialist'), eff: { momentum: 1, insight: 2 }, result: 'Dev rewrites the list in plain words. The client sends everything in an afternoon.' }
            ] } },
        { label: 'Send everything you have, all at once', kind: 'through', eff: { momentum: 1, debt: { tag: 'bad_handoff', sev: 1 } }, result: '"Please find attached: everything." You can hear the Specialist sigh through the email.' }
      ]
    },
    {
      id: 'summit_disagree', title: 'Two experts, two answers', at: ['summit'],
      text: (s) => `Two specialists look at ${C(s)}'s situation. They disagree. Both are very sure. Both are very senior. Both are looking at you.`,
      choices: [
        { label: 'Go with the more senior one', kind: 'through', hint: 'Rank is not the same as fit.', eff: { momentum: 1, debt: { tag: 'guessed_key', sev: 1 } }, result: 'Seniority wins. The other one shrugs. "Your call."' },
        { label: 'Ask each: "What would change your mind?"', kind: 'prepare',
          then: { text: 'It turns out they are not really disagreeing. Each one is assuming something different about the client\'s life. One assumes nothing big is about to change. The other assumes something is.',
            choices: [
              { label: 'Check with the client which is true', kind: 'prepare', eff: (s) => ({ momentum: -1, insight: 2, trust: 1, fact: s.client.keyFact }), result: (s) => `You ask ${C(s)} directly. Their answer settles it: ${label(s, s.client.keyFact)}.` },
              { label: 'Pick the assumption that seems likelier', kind: 'through', eff: (s) => (K(s, s.client.keyFact) ? { momentum: 1, insight: 1 } : { momentum: 1, debt: { tag: 'guessed_key', sev: 2 } }), result: (s) => (K(s, s.client.keyFact) ? 'You already know which one is true. Settled in a sentence.' : 'You pick. It seems likely. "Seems likely" is doing a lot of work.') }
            ] } },
        { label: 'Put the client in the room with both', kind: 'around', preview: 'With Communication, 70% it clarifies things. Otherwise more likely to leave the client confused.',
          eff: (s) => (roll('dis', comm(s) ? 0.7 : 0.4) ? { trust: 1, insight: 2, energy: -1 } : { insight: 1, energy: -1, debt: { tag: 'confused_client', sev: 2 } }),
          result: (s) => (R.dis ? `${C(s)} hears both sides and asks the one question that settles it. Brilliant.` : `${C(s)} leaves the room more confused than they came in. "So... nobody knows?"`) }
      ]
    },

    /* ================= The Login Isles ================= */
    {
      id: 'isles_two_factor', title: 'The code went to the old phone', at: ['isles'],
      text: (s) => `${C(s)} needs to approve something in the portal. The security code has been sent to their old phone. Their old phone is, they explain, at the bottom of a lake.`,
      choices: [
        { label: 'Walk them through account recovery', kind: 'prepare', eff: { energy: -2, days: 1, trust: 1 }, result: 'A day of security questions, ID photos and hold music. Then: access. Real, proper, secure access.' },
        { label: '"Just read me your password and I\'ll sort it"', kind: 'through', hint: 'So much faster. So much worse.', eff: { momentum: 2, debt: { tag: 'fraud', sev: 2 } }, result: 'You have their password now. It is their pet\'s name and 123. You try not to think about that.' },
        { label: 'Switch to paper for this one', kind: 'around', eff: { days: 2, momentum: -1 }, result: 'The paper form arrives in two days. The lake keeps the phone.' },
        { label: 'Call Kenji', kind: 'help', contact: 'whisperer', show: ready('whisperer'), eff: { momentum: 1, trust: 1 }, result: 'Kenji resets it in four minutes and says, "Never again with the lake."' },
        { label: 'Your tech setup has a backup method', kind: 'help', show: (s) => hasSys(s, 'tech'), eff: { momentum: 1, trust: 1 }, result: 'A verified backup method, set up months ago for exactly this. In you go.' }
      ]
    },
    {
      id: 'isles_fake_you', title: 'A message from "you"', at: ['isles'],
      text: (s) => `${C(s)} forwards you a message. It is from you. It asks them to upload their documents to a new link, urgently, and it has your photo. You did not send it.`,
      choices: [
        { label: 'Check it together, carefully', kind: 'prepare',
          then: { text: (s) => `You walk ${C(s)} through it: the sender address is off by one letter, and the link goes somewhere strange. "So how do I know when it's really you?" they ask. Good question.`,
            choices: [
              { label: 'Agree on how to check it is really you', kind: 'prepare', eff: { trust: 2, energy: -1, insight: 1 }, result: 'Anything urgent gets a phone call, on the number they already have. They write it on a sticky note and look calmer.' },
              { label: 'Report it to Operations and move on', kind: 'around', eff: { momentum: -1, insight: 1 }, result: 'Operations thanks you and sends a warning memo to everyone. The memo looks a bit like a scam too.' }
            ] } },
        { label: '"Just ignore it, it\'s nothing"', kind: 'through', hint: 'Probably nothing. They may get another one.', eff: { momentum: 1, debt: { tag: 'fraud', sev: 2 } }, result: (s) => `${C(s)} deletes it. Next week there is another one, slightly more convincing.` },
        { label: 'Tell them to change every password, today', kind: 'around', eff: { days: 1, trust: -1, insight: 1 }, result: 'They change everything. Then they are locked out of everything. Safe, at least. Grumpy, definitely.' },
        { label: 'Forward it to Kenji', kind: 'help', contact: 'whisperer', show: ready('whisperer'), eff: { insight: 1, trust: 1 }, result: 'Kenji blocks the sender, finds two more, and sends your client a one-line guide: "The real one never says urgent."' }
      ]
    },
    {
      id: 'isles_portals', title: 'Fourteen portals', at: ['isles'], cut: 'isles',
      text: (s) => `${C(s)} has accounts in fourteen different places. Each has its own portal, its own password, and its own idea of what a "statement" is. They would like you to just see everything, in one place, please.`,
      choices: [
        { label: 'Have them put every login in a shared document', kind: 'through', hint: 'Convenient. Very, very convenient.', eff: { momentum: 2, debt: { tag: 'fraud', sev: 2 } }, result: 'One document. Fourteen passwords. Shared with you, and possibly their book club.' },
        { label: 'Sit together and go through each portal', kind: 'prepare', eff: (s) => { R.por = unknown(s); return { energy: -2, insight: 2, fact: R.por }; }, result: (s) => 'Fourteen logins, three password resets, and one forgotten account with money in it.' + (R.por ? ` Along the way, you learn about ${label(s, R.por)}.` : '') },
        { label: 'Ask them to download statements and send them over', kind: 'around', preview: 'They arrive in a day. Half the time, some are from the wrong year (hidden risk).',
          eff: () => (roll('port', 0.5) ? { days: 1, insight: 1 } : { days: 1, insight: 1, debt: { tag: 'stale_info', sev: 1 } }),
          result: 'A pile of files arrives, named "download (1)" through "download (14)".' },
        { label: 'Focus on the three biggest, skip the rest', kind: 'through', eff: { momentum: 1, insight: 1, debt: { tag: 'stale_info', sev: 1 } }, result: 'Three portals, done by lunch. The other eleven wait, quietly collecting surprises.' }
      ]
    },

    /* ================= Annual Review Toll Bridge ================= */
    {
      id: 'toll_initials', title: 'Initial here, here, and here', at: ['toll'],
      text: (s) => `The troll slides a stack of forms across the counter. Thirty-seven places to initial. ${C(s)} picks up the pen, then stops. "What am I actually signing?"`,
      choices: [
        { label: '"Standard stuff, don\'t worry about it"', kind: 'through', eff: { momentum: 2, debt: { tag: 'confused_client', sev: 2 } }, result: 'Thirty-seven initials in four minutes. Impressive wrist work. No idea what any of it says.' },
        { label: 'Explain every page', kind: 'prepare', eff: { energy: -2, days: 1, trust: 2 }, result: 'Every page, every initial. It takes all day. The troll follows along like it is a good film.' },
        { label: 'Explain the three pages that actually matter', kind: 'prepare', show: (s) => comm(s) || PP.skill(s, 'judgment') > 0, hint: 'Communication or Judgment: you know which three.', eff: { trust: 1, momentum: 1, insight: 1 }, result: '"These three matter. The rest are about the bridge." They read the three. They ask one good question.' },
        { label: 'Give them a day to read it all', kind: 'around', eff: (s) => ({ days: 1, momentum: -1, trust: s.client.prefers === 'email' ? 2 : 1 }), result: (s) => (s.client.prefers === 'email' ? 'They read every page, with notes. You get one email with nine excellent questions.' : 'They read some of it. They feel respected, which matters more.') }
      ]
    },
    {
      id: 'toll_anything_changed', title: '"Has anything changed?"', at: ['toll'],
      text: (s) => `The troll reads from a card: "Has anything changed since last year?" ${C(s)} says, "Nope." The troll looks at you. You look at ${C(s)}. Something about the way they said it.`,
      choices: [
        { label: 'Accept "nope" and move along', kind: 'through', eff: { momentum: 1, debt: { tag: 'stale_info', sev: 2 } }, result: '"Nope" goes on the form. The troll stamps it.' },
        { label: 'Ask three specific questions instead', kind: 'prepare',
          then: { text: (s) => `"Anything new at work? At home? Anyone new depending on you?" ${C(s)} pauses on the second one. "Well... apart from..." And out comes a thing they had not thought of as a change.`,
            choices: [
              { label: 'Follow it up properly', kind: 'prepare', eff: (s) => { R.chg = unknown(s); return R.chg ? { insight: 2, trust: 1, fact: R.chg, energy: -1 } : { insight: 1, trust: 1 }; }, result: (s) => (R.chg ? `It is a change. A real one: ${label(s, R.chg)}.` : 'It is a small change, and you already knew about it. Still, they feel listened to.') },
              { label: 'Note it and keep the review short', kind: 'around', eff: { insight: 1, momentum: 1 }, result: 'Noted. You will come back to it. You have written that before.' }
            ] } },
        { label: 'Mention what you already know has changed', kind: 'prepare', show: (s) => K(s, s.client.keyFact), hint: 'You did the work earlier. Now it pays.', eff: { trust: 2, momentum: 1 }, result: (s) => `"Well, there's ${label(s, s.client.keyFact)}." ${C(s)} blinks. "Oh. Right. I guess that counts." The troll looks impressed.` }
      ]
    },
    {
      id: 'toll_wrong_date', title: 'The date is wrong', at: ['toll'],
      text: 'The troll taps one page with a long fingernail. "This form is dated last month. The rules say within thirty days of today. It is thirty-four." There is a pen right there.',
      choices: [
        { label: 'Just change the date', kind: 'through', hint: 'Four days. Who would ever know?', eff: { momentum: 1, debt: { tag: 'rushed_pace', sev: 3 } }, result: 'You change it. The troll happens to be looking the other way. Somebody, someday, will not be.' },
        { label: 'Redo the form with the client', kind: 'prepare', eff: (s) => ({ days: 1, energy: -1, trust: s.res.trust >= 5 ? 1 : 0 }), result: (s) => `${C(s)} signs a fresh copy. "Thanks for doing it properly," they say, and seem to mean it.` },
        { label: 'Argue with the troll', kind: 'around', preview: '30% the troll lets it go. 70% you lose a day and look a bit silly.',
          eff: () => (roll('date', 0.3) ? { momentum: 1 } : { days: 1, trust: -1 }),
          result: () => (R.date ? '"Fine," says the troll. "Thirty-four is close to thirty. Don\'t tell anyone."' : 'The troll listens to your whole argument, then points at the rule again. Your client watched the entire thing.') },
        { label: 'Ask Olu to sort it', kind: 'help', contact: 'operator', show: ready('operator'), eff: { momentum: 1 }, result: 'Olu has a fresh copy pre-filled and on its way before you hang up.' }
      ]
    },
    {
      id: 'toll_skip_review', title: '"Do we have to?"', at: ['toll'], cut: 'bridge',
      text: (s) => `${C(s)} eyes the toll booth. "Do we really have to do the review? Nothing's changed. I'd honestly rather just go."`,
      choices: [
        { label: 'Skip it this year', kind: 'through', eff: { momentum: 2, trust: 1, debt: { tag: 'stale_info', sev: 2 } }, result: 'The troll shrugs and waves you through. "Your funeral." Charming troll.' },
        { label: 'Make it fifteen minutes and one question', kind: 'prepare',
          then: { text: (s) => `"Fifteen minutes. One question: what surprised you this year?" ${C(s)} thinks. Then laughs. "Honestly? Lots of things."`,
            choices: [
              { label: 'Ask about the biggest surprise', kind: 'prepare', eff: (s) => { R.sk = unknown(s); return R.sk ? { insight: 2, fact: R.sk, trust: 1 } : { insight: 1, trust: 1 }; }, result: (s) => (R.sk ? `Fifteen minutes becomes forty. Worth it: ${label(s, R.sk)}.` : 'Nothing you didn\'t already know. Fifteen minutes, as promised. They appreciate that.') },
              { label: 'Keep your promise: wrap up at fifteen', kind: 'around', eff: { trust: 1, momentum: 1 }, result: 'Fifteen minutes on the dot. They are amazed. Nobody has ever kept that promise to them.' }
            ] } },
        { label: 'Do the full review anyway', kind: 'around', hint: 'Thorough. They did ask not to.', eff: { energy: -2, days: 1, insight: 2, trust: -1 }, result: (s) => `Every page, every account. ${C(s)} sighs through all of it, but you leave with a file that is actually current.` }
      ]
    },

    /* ================= Back channels, on the trail =================
     * The Back-Channel Bridge is gone; Steve's back channels are now hidden passages
     * around obstacles (see passages.js). These moments happen between landmarks. */
    {
      id: 'backchannel_nobody_asked', title: 'Nobody asked', at: ['travel'],
      when: (s) => s.day >= 5 && !K(s, s.client.stakeholderFact),
      text: (s) => `Halfway across a quiet footbridge, ${C(s)} leans on the railing. "You know, it's funny. You never asked who else is involved in all this." They say it lightly. They do not mean it lightly.`,
      choices: [
        { label: 'Ask now', kind: 'prepare', eff: (s) => ({ momentum: -1, insight: 2, trust: 1, fact: s.client.stakeholderFact }), result: (s) => `It turns out ${s.client.stakeholder} matters a great deal. Good thing there is still time.` },
        { label: '"We\'ll get to that"', kind: 'through', eff: (s) => ({ momentum: 1, debt: { tag: 'unknown_stakeholder', sev: 2 }, missed: s.client.stakeholderFact }), result: '"Sure," they say. The river keeps moving underneath.' },
        { label: 'Stop and do a proper fact-find right here', kind: 'prepare', minigame: 'factFind', hint: 'A day lost. Everything you skipped, in one go.', eff: { days: 1 }, result: 'The paperwork comes out and gets spread along the railing. Late, but thorough.' }
      ]
    },
    {
      id: 'backchannel_cousin', title: 'Steve\'s cousin', at: ['travel'], cut: 'steve', weight: 0.7,
      when: (s) => s.password && s.day >= 3,
      text: 'A man in a cardigan is fishing off a footbridge. He looks a lot like Steve. "Steve\'s cousin," he says, without looking up. "Steve\'s back channels get you around things. Mine skips the next landmark entirely. Straight across the water."',
      choices: [
        { label: 'Take the even shorter way', kind: 'through', hint: 'You are already short on what you know.', eff: { momentum: 3, debt: [{ tag: 'rushed_pace', sev: 2 }, { tag: 'guessed_key', sev: 1 }] }, result: 'You hop across the stepping stones. Fast. Very fast. Your client is a little out of breath and a lot unsure.' },
        { label: '"What usually happens at the end of it?"', kind: 'prepare',
          then: { text: 'He reels in nothing. "People get across quick. Then the client asks them something, and they don\'t know the answer. Then they walk all the way back." He casts again. "Steve thinks that\'s funny."',
            choices: [
              { label: 'Thank him and take the proper way', kind: 'prepare', eff: (s) => (PP.skill(s, 'judgment') < 2 ? { skill: { judgment: 1 } } : { insight: 1 }), result: 'He nods. "Smart. Steve would\'ve taken it."' },
              { label: 'Take it anyway, you\'ll figure it out', kind: 'through', eff: { momentum: 2, debt: { tag: 'guessed_key', sev: 2 } }, result: 'You figure you will figure it out. That is a plan, technically.' }
            ] } },
        { label: 'Ask him for fishing tips instead', kind: 'around', eff: { energy: 1, trust: 1 }, result: (s) => `You sit with him for an hour. ${C(s)} sits too. Nobody catches anything. It is the nicest hour of the trip.` }
      ]
    },
    {
      id: 'backchannel_too_fast', title: '"Was that too fast?"', at: ['travel'],
      when: (s) => s.pace !== 'steady' && s.day >= 4,
      text: (s) => `${C(s)} stops to catch their breath and watches a stream for a while. "That was quicker than I expected. Is that... good? It feels like we skipped some things."`,
      choices: [
        { label: '"It\'s good! We\'re nearly there."', kind: 'through', eff: { momentum: 1, debt: { tag: 'unchallenged_assumption', sev: 2 } }, result: (s) => `${C(s)} nods, a little unsure. You both keep walking.` },
        { label: '"Honestly, we did. Let\'s slow down."', kind: 'prepare', eff: { trust: 2, momentum: -2, pace: 'steady', insight: 1 }, result: 'Saying it out loud is a relief for both of you. The X can wait a few days.' },
        { label: '"What do you think we skipped?"', kind: 'prepare', eff: (s) => { R.tf = open(s); return { energy: -1 }; },
          then: { text: (s) => { const w = worry(s); if (!w) return `${C(s)} counts on their fingers. "Well, you never really asked what I'm worried about."`; return `${C(s)} hesitates, then: ` + (R.tf ? w.text : (w.guarded || w.text)); },
            choices: [
              { label: 'Thank them, and really listen', kind: 'prepare', eff: (s) => { const w = worry(s); return R.tf && w && w.fact ? { trust: 1, insight: 2, fact: w.fact } : { trust: 1, insight: 1 }; }, result: () => (R.tf ? 'Everything the hurry skipped, in one honest minute. Worth slowing down for.' : 'They do not tell you everything. But now you know there is more, and they know you will ask.') },
              { label: 'Promise to cover it all at the end', kind: 'through', eff: { momentum: 1, debt: { tag: 'assumed_goal', sev: 1 } }, result: '"At the end." They nod. The end keeps getting closer.' }
            ] } }
      ]
    }
  );
})(window.PP);
