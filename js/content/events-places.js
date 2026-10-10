/* events-places: more landmark events, appended to the deck.
 * Every landmark gets several possible events so repeat journeys feel different.
 * Each landmark is guarded by a mythical creature (PP.content.guardians in world.js)
 * that IS the real-world blocker there: the Sprites are small talk, the Sirens are the
 * quick close, the Hydra is an overbuilt spreadsheet, and so on. The events below deal
 * with that creature, its minions, its moods or its lair, while the real lesson stays
 * underneath.
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
    /* ================= Meadows of Understanding: the Small-Talk Sprites =================
     * Tiny sprites that steer every conversation back to the weather. Real thing: clients
     * who won't open up, and agents who let them. */
    {
      id: 'meadow_pause', title: 'A Sprite on your notepad', at: ['meadows'],
      text: (s) => `${C(s)} stops halfway through a sentence and looks out over the grass. The pause stretches. Instantly a Small-Talk Sprite lands on your notepad, tugs at your pen and whispers: "Say something about the weather. Anything. Quick, before they say something real."`,
      choices: [
        { label: 'Jump in with your next question', kind: 'through', hint: 'Keeps things moving. The Sprites cheer. Whatever they were about to say flies off with them.', eff: (s) => ({ momentum: 1, missed: s.client.keyFact, style: { avoid: 1 } }), result: (s) => `"Right, yes," ${C(s)} says, and answers your question instead. The Sprite gives you a tiny thumbs up. It was a good question. It was not what they were about to say.` },
        { label: 'Wait. Count to ten. Ignore the Sprite.', kind: 'prepare', hint: 'The Sprite will pull your hair. Silence is uncomfortable for both of you.',
          then: { text: (s) => `At about seven, the Sprite gives up in disgust and flits off to find a chattier agent. ${C(s)} says quietly: ` + (worry(s) ? worry(s).guarded || worry(s).text : '"Sorry. I was just thinking about how much is riding on this."'),
            choices: [
              { label: '"What\'s behind that?"', kind: 'prepare', preview: 'With Curiosity or Trust 6+, they tell you the rest. Otherwise it can feel like prying.',
                eff: (s) => { R.pause = open(s) && !!worry(s); return R.pause ? { fact: worryFact(s), insight: 2, trust: 1 } : { insight: 1, trust: -1 }; },
                result: (s) => (R.pause ? 'They take a breath and tell you. ' + worry(s).text : `${C(s)} shrugs. "Just... a lot." A Sprite drifts back and mentions the clouds. The door closes, gently.`) },
              { label: 'Nod, and let it sit', kind: 'around', eff: { trust: 1, insight: 1 }, result: 'You do not push. The Sprites find you deeply boring. Your client seems to file you under "safe."' },
              { label: 'Reassure them it will all work out', kind: 'through', eff: { trust: 1, momentum: 1, debt: { tag: 'unchallenged_assumption', sev: 1 } }, result: '"Thanks. I hope so." A Sprite hums approvingly. It was kind. It was also a guess.' }
            ] } },
        { label: 'Reflect back what you have heard so far', kind: 'prepare', show: comm, hint: 'Communication: they hear themselves, and correct you. Sprites cannot stand it.', eff: { trust: 2, insight: 1, energy: -1 }, result: '"So what I\'m hearing is..." You get two things right and one thing wrong. They fix the wrong one. That was the useful part. The Sprite on your notepad stomps off.' },
        { label: 'Make a joke about the Sprite', kind: 'around', eff: { trust: 1, style: { avoid: 1 } }, result: (s) => `${C(s)} laughs. The Sprite takes a bow and flies away, carrying whatever they were about to say in its tiny arms.` }
      ]
    },
    {
      id: 'meadow_visitor', title: 'A second cloud of Sprites', at: ['meadows'],
      text: (s) => `${stake(s)} is waiting at the bench with a thermos and a folding chair, wrapped in their own little cloud of Sprites. "${C(s)} mentioned you'd be here. Thought I'd sit in. If that's all right." The two clouds of Sprites eye each other like rival choirs.`,
      choices: [
        { label: 'Pull up a chair for them', kind: 'prepare', hint: 'A slower meeting with twice the Sprites. Fewer surprises later.', eff: (s) => ({ momentum: -1, energy: -1, fact: s.client.stakeholderFact }),
          then: { text: (s) => `${stake(s)} listens for a while, waves off a Sprite asking about the drive over, then says, "Can I ask what this is actually for? Because from where I sit, it looks different." ${C(s)} goes a little stiff. Both clouds of Sprites go very, very quiet.`,
            choices: [
              { label: 'Ask them both what "done" would look like', kind: 'prepare', preview: 'With Communication: Trust +2. Otherwise a coin flip on whether it turns into an argument.',
                eff: (s) => { R.visit = comm(s) || PP.chance(0.5); return R.visit ? { trust: 2, insight: 2 } : { trust: -1, insight: 2 }; },
                result: (s) => (R.visit ? 'Two different answers, said out loud, kindly. The Sprites, outnumbered by honesty, wander off. Now you can plan for both.' : 'Two different answers, said out loud, not so kindly. The Sprites scatter like startled pigeons. Useful, though. Very useful.') },
              { label: 'Steer back to your agenda', kind: 'through', eff: { momentum: 1, debt: { tag: 'unknown_stakeholder', sev: 1 } }, result: (s) => `${stake(s)}'s Sprites start a long chat about the thermos. ${stake(s)} says nothing else. That is not the same as agreeing.` },
              { label: 'Offer them their own conversation later', kind: 'around', eff: { trust: 1, days: 1 }, result: 'They accept. It costs you a day, and once their Sprites get bored and leave, you learn they have been worried about this for months.' }
            ] } },
        { label: 'Politely keep this meeting one-on-one', kind: 'through', hint: 'Half the Sprites. A missing voice.', eff: (s) => ({ momentum: 1, trust: s.res.trust >= 6 ? 0 : -1, debt: { tag: 'unknown_stakeholder', sev: 2 }, missed: s.client.stakeholderFact }), result: (s) => `${stake(s)} folds the chair back up. "Of course. You two talk." Their Sprites follow them off, chatting about rain. They seem fine. Mostly.` },
        { label: 'Let them run the meeting', kind: 'around', eff: (s) => ({ trust: -1, insight: 1, fact: s.client.stakeholderFact, style: { chase: 1 } }), result: (s) => `${stake(s)}'s Sprites are louder, so ${stake(s)} does all the talking. ${C(s)} barely says a word for an hour. You learn a lot about one of them.` }
      ]
    },
    {
      id: 'meadow_wishlist', title: 'The Sprites\' wish list', at: ['meadows'],
      text: (s) => `The Sprites have helped ${C(s)} write down every goal they have ever had, in no particular order, decorated with daisies. "Pay off everything" sits right above "learn the cello." The last item, in very small Sprite handwriting, is "nice weather." Two of the items contradict each other.`,
      choices: [
        { label: 'Rank them yourself, it is faster', kind: 'through', hint: 'You will rank them by what you think matters. The Sprites vote for "nice weather."', eff: { momentum: 2, debt: { tag: 'assumed_goal', sev: 2 } }, result: (s) => `You number them top to bottom. ${C(s)} says "Sure, that makes sense." It makes sense to you, anyway. The Sprites applaud politely.` },
        { label: '"If you could only do one this year?"', kind: 'prepare',
          then: { text: (s) => `The Sprites freeze. That is not a weather question. ${C(s)} stares at the list for a long time. Then they point at something that isn't on it at all. "Honestly? This. I didn't write it down because it felt silly."`,
            choices: [
              { label: 'Ask why it felt silly', kind: 'prepare', preview: 'With Curiosity or Trust 6+, the real priority comes out.',
                eff: (s) => { R.wish = open(s); return R.wish ? { insight: 2, trust: 1, fact: worryFact(s) } : { insight: 1, trust: 1 }; },
                result: (s) => (R.wish ? `It isn't silly at all. It is about ${label(s, worryFact(s))}. Not a Sprite in sight.` : '"It just did." They smile. A Sprite asks if anyone has noticed the breeze. You will come back to it.') },
              { label: 'Write it at the top of the list', kind: 'around', eff: { trust: 1, insight: 1 }, result: 'It goes at the top, in capital letters. The cello slides down to ninth. "Nice weather" is quietly crossed out.' },
              { label: 'Gently steer back to the written goals', kind: 'through', eff: { momentum: 1, debt: { tag: 'assumed_goal', sev: 1 } }, result: 'Back to the list. The Sprites are delighted. The one that was not written down stays that way.' }
            ] } },
        { label: 'Promise to tackle every single one', kind: 'through', hint: 'Everyone loves a yes, Sprites most of all. Your energy does not.', eff: { trust: 1, energy: -2, style: { overcomplicate: 1, chase: 1 } }, result: '"All of them?" "All of them." The Sprites carry you around on their tiny shoulders, briefly. Then you see the cello.' },
        { label: 'Talk it through properly', kind: 'prepare', minigame: 'conversation', hint: 'Costs energy. You will hear the list behind the list.', eff: { energy: -1 }, result: 'By the end, the list has three items on it. All three are real. The daisies stay. The Sprites, bored stiff, do not.' }
      ]
    },
    {
      id: 'meadow_easy_questions', title: 'Questions by Sprite', at: ['meadows'],
      when: (s) => s.style.avoid >= 1,
      text: (s) => `Looking back over your notes, you realize every question so far was whispered to you by a Sprite. Number of pets. Favorite season. Whether it looks like rain. Nothing that might make ${C(s)} uncomfortable. The Sprites are thrilled with you. The meadow is lovely. It would be easy to keep it that way.`,
      choices: [
        { label: 'Ask the question you have been dodging', kind: 'prepare', hint: 'Uncomfortable now. Less so later. The Sprites will gasp.', preview: 'Likely to land well with Communication or Trust 6+. Otherwise a coin flip on whether it feels like an ambush.',
          eff: (s) => (roll('easy', comm(s) || s.res.trust >= 6 ? 0.85 : 0.5) ? { insight: 2, trust: 1, fact: s.client.keyFact, style: { avoid: -2 } } : { insight: 1, trust: -1, style: { avoid: -1 } }),
          result: (s) => (R.easy ? `The Sprites gasp and scatter. ${C(s)} goes quiet, then answers properly. Now you know: ${label(s, s.client.keyFact)}.` : `"Wow. Okay." The Sprites gasp and scatter. ${C(s)} answers, but carefully. You will need to earn the rest.`) },
        { label: 'Keep it pleasant for today', kind: 'around', eff: { trust: 1, style: { avoid: 1 }, debt: { tag: 'unchallenged_assumption', sev: 1 } }, result: 'Pleasant. Easy. A Sprite crowns you with a daisy chain. You will have to ask eventually.' },
        { label: 'Leave the hard question for the Specialist', kind: 'through', hint: 'Someone else gets to be the bad guy. They also hear the answer first.', eff: { momentum: 1, debt: { tag: 'bad_handoff', sev: 1 }, style: { avoid: 1 } }, result: 'You write it on a sticky note for later: "ASK ABOUT THE THING." A Sprite draws a little sun on it. Very clear. Very brave.' },
        { label: 'Find a gentle way in: "What keeps you up at night?"', kind: 'prepare', show: curious, hint: 'Curiosity: it sounds like small talk, so the Sprites let it through.', eff: (s) => ({ insight: 2, trust: 1, fact: worryFact(s), style: { avoid: -1 } }), result: (s) => `The Sprites wave it past, thinking it is about sleep. ${C(s)} laughs, then stops laughing, then talks for twenty minutes.` }
      ]
    },

    /* ================= Veteran's Lighthouse: the Lighthouse Oracle =================
     * A helper. She answers in riddles, and the riddles are always good advice. */
    {
      id: 'lighthouse_logbook', title: 'The Oracle\'s book of endings', at: ['lighthouse'],
      text: 'The Oracle hauls out a logbook as thick as a doorstop. "What sets out for one place, arrives at another, and is surprised every time?" You do not know. She opens the book: every agent who came through here, where they were headed, and where they actually ended up. Most entries end somewhere different from where they started.',
      choices: [
        { label: 'Read the entries for clients like yours', kind: 'prepare', eff: { energy: -1, insight: 2 }, result: (s) => `Three agents had a client a lot like ${C(s)}. Two of them were surprised by the same thing. In the margin the Oracle has written: "The second surprise is a choice." You make a note not to be surprised.` },
        { label: 'Ask her what pattern she sees in you', kind: 'help', eff: { style: { soloist: -1 } },
          then: { text: (s) => {
            const msgs = { avoid: '"What is always sunny and never grows anything?" She taps your notes. "These. Every question in here is a nice one."', overcomplicate: '"What has a spire, nine bells and a crypt, and was asked for as a shed?" She taps your plans. "Yours. Every time."', soloist: '"What carries everything alone and calls it strength?" She glances at your overstuffed bag. "Tiredness. Ask for help."', chase: '"What follows every light on the water and never reaches port?" She points at you, kindly. "Something very like you."' };
            const top = Object.keys(msgs).sort((a, b) => (s.style[b] || 0) - (s.style[a] || 0))[0];
            return (s.style[top] || 0) > 0 ? `She reads your notes for a minute, then: ${msgs[top]}` : '"What cannot yet be read, because it has not yet been written?" She closes the logbook. "You. Either that is good, or the storm hasn\'t come."';
          },
            choices: [
              { label: 'Ask how to fix it', kind: 'prepare', eff: (s) => {
                const top = ['avoid', 'overcomplicate', 'soloist', 'chase'].sort((a, b) => (s.style[b] || 0) - (s.style[a] || 0))[0];
                if ((s.style[top] || 0) > 0) return { style: { [top]: -2 }, energy: -1 };
                return PP.skill(s, 'judgment') < 2 ? { skill: { judgment: 1 } } : { insight: 1 };
              }, result: '"What does the most work and costs nothing?" A long pause. "Noticing. Notice it once a day. Noticing does most of the work." You write it on your hand.' },
              { label: 'Push back a little', kind: 'around', eff: { insight: 1 }, result: '"The tide argues with the rocks too," she says, unbothered. "Write down how this trip goes. We\'ll see."' },
              { label: 'Laugh it off and head out', kind: 'through', eff: { momentum: 1 }, result: 'She laughs too. She also writes something in the logbook, in riddle. You decide not to ask.' }
            ] } },
        { label: 'Borrow the logbook overnight', kind: 'around', hint: 'A day lost. A wider view. Some of it is in riddle.', eff: { days: 1, momentum: -1, reveal: true }, result: 'You read by lamplight until two. Half the entries are riddles. All of them turn out to be true. By morning you know the shape of the whole region.' },
        { label: 'Skim it, smile, hand it back', kind: 'through', eff: { momentum: 1 }, result: '"What is always too busy to read the map?" she asks, shelving it. She does not wait for the answer. You suspect it was you.' }
      ]
    },
    {
      id: 'lighthouse_lamp', title: 'The seeing-lamp is out', at: ['lighthouse'],
      text: 'The great lamp at the top of the tower, the one the Oracle reads her riddles by, has gone dark. She is halfway up a ladder with a wrench in her teeth. "What is blind in the dark and wise in the light?" she asks, around the wrench. "Me. Also ships. Also agents. Hand me that bulb?"',
      choices: [
        { label: 'Climb up and help her fix it', kind: 'help', hint: 'Hard work. It might not even be the bulb.', preview: '60%: it lights up and you see the whole map. 40%: it takes all night and the next day.',
          eff: () => (roll('lamp', 0.6) ? { energy: -2, reveal: true, trust: 1, style: { soloist: -1 } } : { energy: -2, days: 1, trust: 1, style: { soloist: -1 } }),
          result: (s) => (R.lamp ? `The beam swings out over the land and, for a moment, you can see every trail. ${C(s)} watched you climb a ladder for an Oracle. That counts.` : 'It was not the bulb. It was the wiring, then the switch, then the bulb. The Oracle narrates each one as a riddle. Dawn, finally, and light.') },
        { label: 'Hold the ladder and talk shop', kind: 'prepare', eff: { insight: 1, energy: -1 }, result: '"What goes out without anyone seeing it go?" she calls down. "A client. Little things, one at a time. Same as lamps." The lamp flickers on.' },
        { label: 'Apologize, you have a client waiting', kind: 'through', eff: { momentum: 1, trust: -1 }, result: (s) => `"What hurries past the lighthouse?" she says, not unkindly. "Ask the rocks." ${C(s)} glances back at the dark tower as you leave.` },
        { label: 'Call Olu, who once fixed a lamp at the port', kind: 'help', contact: 'operator', show: ready('operator'), eff: { reveal: true, momentum: 1 }, result: 'Olu talks her through it on speakerphone. "It\'s always the fuse." It was the fuse. The Oracle, delighted, turns it into a riddle on the spot.' }
      ]
    },
    {
      id: 'lighthouse_old_storm', title: 'The longest word', at: ['lighthouse'],
      text: 'Over tea, the Oracle poses a riddle. "What is the longest word an agent ever says?" You guess. You guess wrong. "\'Mostly,\'" she says. "I once promised a client it would all be fine. And it mostly was." She stirs her tea. "That was my worst storm, and it was not the weather."',
      choices: [
        { label: '"What would you have done differently?"', kind: 'prepare',
          then: { text: '"What can a client always carry, but never forgive finding out late?" She waits. "\'I don\'t know yet.\' Say it sooner." She looks at you over her cup. "So. What don\'t you know yet, on this one?"',
            choices: [
              { label: 'Be honest: list what you are unsure of', kind: 'prepare', eff: (s) => (s.res.insight >= 5 ? { insight: 1, momentum: 1 } : { insight: 2, energy: -1 }), result: (s) => (K(s, s.client.keyFact) ? 'Your list is short. "What is short, and earned?" she asks, and answers herself: "That list."' : 'The list is longer than you would like. She circles one item. "Which riddle do you keep walking past? That one. Ask about that one."') },
              { label: '"Honestly, I think I have it covered."', kind: 'through', eff: { momentum: 1, debt: { tag: 'unchallenged_assumption', sev: 1 } }, result: '"What is a blanket that is just a bit too short?" she murmurs, and sips her tea. She does not explain. You think about it for a mile.' },
              { label: 'Ask her to look over your notes', kind: 'help', eff: (s) => { R.storm = !!oldestDebt(s); return R.storm ? { clearDebt: oldestDebt(s), energy: -1, days: 1 } : { insight: 1 }; }, result: () => (R.storm ? 'She finds one thing you glossed over and makes you fix it at her kitchen table. It takes a day. Every hint is a riddle. She refills your tea twice.' : '"What is clean and still suspicious?" She hands the notes back. "Nothing. They\'re just clean. Have a biscuit."') }
            ] } },
        { label: 'Tell her about your own near miss', kind: 'prepare', eff: { trust: 1, insight: 1, energy: -1 }, result: (s) => `She laughs at the part where you mailed a client someone else's birthday card. "What arrives on time for the wrong person?" ${C(s)}, overhearing, laughs too. Something relaxes.` },
        { label: 'Nod politely and finish your tea', kind: 'through', eff: { momentum: 1 }, result: '"What leaves with a biscuit and no riddle?" She hands you one for the road. "You. Off you go."' }
      ]
    },
    {
      id: 'lighthouse_client_chat', title: 'Riddles on the porch', at: ['lighthouse'],
      text: (s) => `You step out to make a call. When you come back, the Oracle and ${C(s)} are deep in conversation on the porch, and ${C(s)} is saying, "Oh! I get it. The answer was me!" They both stop talking as you walk up.`,
      choices: [
        { label: 'Give them more time, take a walk', kind: 'around', hint: 'She is good at this. You will only hear about it in riddle.', preview: 'With Trust 5+, 60% the Oracle passes on what matters. Otherwise she passes on that the client feels rushed (Trust -1).',
          eff: (s) => (roll('kc', s.res.trust >= 5 ? 0.6 : 0.35) ? { insight: 1, fact: s.client.keyFact } : { trust: -1, insight: 1 }),
          result: (s) => (R.kc ? `Later, the Oracle catches your sleeve. "What did they tell the lighthouse that they have not told the sailor?" A pause. "Something about ${label(s, s.client.keyFact)}. Be gentle with it."` : 'Later, the Oracle catches your sleeve. "What walks fast and believes it walks slowly? You, they say. They like you. They also think you\'re in a hurry. Are you?"') },
        { label: 'Sit down and join them', kind: 'prepare', eff: { energy: -1, trust: 1, insight: 1 }, result: (s) => `The Oracle switches to a riddle about the weather, purely to be polite. ${C(s)} seems glad you sat down, though. Whatever it was can wait.` },
        { label: 'Ask the Oracle privately what they talked about', kind: 'through', hint: 'Fast. Not your secret to collect this way.', eff: { insight: 1, trust: -1 }, result: '"What is the quickest road to an answer?" she says. "Asking the person who has it." Your client saw you whispering.' },
        { label: 'Ask your client: "Anything you want to tell me?"', kind: 'prepare', show: comm, hint: 'Communication: an open door, not a push.', eff: (s) => ({ trust: 1, insight: 2, fact: worryFact(s) }), result: (s) => `${C(s)} looks at the Oracle, who says only, "The door that is knocked on opens." Then they tell you.` }
      ]
    },

    /* ================= Relation-Ship Wreck: the Sirens of the Quick Close =================
     * "Sign today, sign today." Real thing: rushing to close before you understand. */
    {
      id: 'wreck_encore', title: 'The encore', at: ['wreck'], cut: 'sirens',
      text: (s) => `The Sirens have a new verse, and it has ${C(s)}'s name in it. "${C(s)}, ${C(s)}, sign today! Why let all those questions stay?" ${C(s)} turns to you, a little glassy-eyed. "Could we just... sign? Today? I'm tired of thinking about it."`,
      choices: [
        { label: 'Sign today. They asked, after all.', kind: 'through', hint: 'Momentum and a happy client tonight. You are not done understanding them.', eff: { momentum: 3, trust: 1, debt: [{ tag: 'assumed_goal', sev: 2 }, { tag: 'rushed_pace', sev: 1 }] }, result: 'The Sirens hit a high note and throw roses. Everyone feels fantastic. Behind them, the wreck creaks. For now, nobody mentions it.' },
        { label: 'Ask what is making them tired', kind: 'prepare',
          then: { text: (s) => `${C(s)} sighs. "Every meeting opens a new question. I just want it to be done." Behind you, the Sirens go "ooooh" in close harmony.`,
            choices: [
              { label: 'Offer one small thing they can finish today', kind: 'prepare', eff: { momentum: 1, trust: 2 }, result: 'One decision, small and real, finished today. The rest can wait for daylight. The Sirens, robbed of their big finish, sulk on their rock.' },
              { label: 'Promise the questions are almost over', kind: 'through', eff: { trust: 1, momentum: 1, debt: { tag: 'unchallenged_assumption', sev: 1 } }, result: '"Almost over," you say. The Sirens work it into the chorus at once. "Almost over" is doing a lot of work in that song.' },
              { label: 'Suggest a day off from planning entirely', kind: 'around', eff: { days: 1, energy: 2, trust: 1, momentum: -1 }, result: (s) => `You spend a day not talking about money at all, well out of earshot of the rocks. ${C(s)} comes back lighter, and ready.` }
            ] } },
        { label: 'Cover your ears and steer them away from the rocks', kind: 'around', hint: 'Saying no to a tired client is a skill. The Sirens take it personally.', eff: (s) => (comm(s) ? { trust: 1, momentum: -1 } : { trust: -1, momentum: -1 }), result: (s) => (comm(s) ? '"Let\'s not decide anything with that song stuck in our heads." They laugh. They agree. The Sirens boo.' : `${C(s)} lets you lead them away, sulking slightly. The song follows you for a mile.`) },
        { label: 'Hum along a little, then decide', kind: 'through', preview: 'A coin flip: a quick yes with a hidden cost, or you lose an afternoon to the chorus.',
          eff: () => (roll('enc', 0.5) ? { momentum: 2, debt: { tag: 'assumed_goal', sev: 1 } } : { momentum: -1, energy: -1 }),
          result: () => (R.enc ? 'You sign mid-chorus. The Sirens do jazz hands. It feels like a musical, the kind where the second act is sad.' : 'Three hours later you are both still humming and nothing has been decided. The Sirens are on their fourth encore.') }
      ]
    },
    {
      id: 'wreck_salvage', title: 'What the song left behind', at: ['wreck'],
      text: 'Washed up among the timbers of the last ship that listened to the Sirens: a waterlogged file. Another agent\'s client, a lot like yours. A finished plan, beautifully formatted, signed the same day, never used. A sticky note on the front says "THEY LEFT." On their rock, the Sirens hum innocently.',
      choices: [
        { label: 'Adapt the old plan for your client', kind: 'through', hint: 'Fast. Someone else\'s client, someone else\'s life. The Sirens love a reprise.', eff: { momentum: 2, debt: [{ tag: 'assumed_goal', sev: 2 }, { tag: 'stale_info', sev: 1 }] }, result: 'Find, replace, done. The Sirens sing it back to you with your client\'s name in it. It is uncanny how well it almost fits.' },
        { label: 'Read it to find out why it failed', kind: 'prepare', eff: { energy: -1 },
          then: { text: 'It takes an hour to dry the pages enough to read. The plan was fine. The meeting notes are what\'s interesting: every single time, the client mentioned someone, and the agent wrote the name in pencil in the margin, then went back to listening to the song. Nobody ever followed up.',
            choices: [
              { label: 'Check your own notes for the same mistake', kind: 'prepare', eff: (s) => { R.salv = K(s, s.client.stakeholderFact); return R.salv ? { insight: 1, trust: 1 } : { insight: 1, momentum: -1, fact: s.client.stakeholderFact }; }, result: (s) => (R.salv ? 'You already asked about the people in your client\'s life. You put the file down feeling slightly smug. The Sirens look disappointed in you.' : `There it is in your notes too: a name you skipped past while the song was playing. You ask ${C(s)} about ${stake(s)}. It matters.`) },
              { label: 'Keep it as a cautionary tale', kind: 'around', eff: (s) => (PP.skill(s, 'judgment') < 2 ? { skill: { judgment: 1 } } : { insight: 1 }), result: 'You keep the sticky note. "THEY LEFT." It goes inside the cover of your notebook, where no song can reach it.' }
            ] } },
        { label: 'Leave it to the sea and sit for a bit', kind: 'around', eff: { energy: 1 }, result: 'Some files are better left on the rocks. You watch the waves for a while instead. The Sirens, unable to get a rise out of you, start a crossword.' }
      ]
    },
    {
      id: 'wreck_survivor', title: 'Clinging to driftwood', at: ['wreck'],
      text: 'Someone is clinging to a plank just off the rocks, waving a soggy folder. "I followed the song! My agent closed in a day and stopped calling! I don\'t even know what I signed!" The Sirens wave at them cheerfully. Your client watches to see what you will do.',
      choices: [
        { label: 'Wade out and help them ashore', kind: 'help', eff: { energy: -1, trust: 1 },
          then: { text: 'On the beach, wrapped in your jacket, they tell you everything. It is a lot. They would like you to be their agent now. Please. Today. Out on the rocks, the Sirens perk up: "Sign today, sign today..."',
            choices: [
              { label: 'Offer to meet properly once you are back', kind: 'prepare', eff: { prospect: { temp: 'warm', source: 'someone you pulled out of the Sirens\' wreck' } }, result: 'They write their number on your hand in marker. The Sirens groan. (New prospect in your pipeline.)' },
              { label: 'Sign them up right here on the beach', kind: 'through', eff: { prospect: { temp: 'hot', source: 'a shipwrecked client you signed on the beach' }, trust: -1, debt: { tag: 'premature_pitch', sev: 1 } }, result: (s) => `A new client! Signed on a beach, soaking wet, to the Sirens' applause. ${C(s)} raises an eyebrow: is that how you would treat them?` },
              { label: 'Point them to the Lighthouse Oracle', kind: 'around', eff: { insight: 1 }, result: '"Up at the lighthouse. She talks in riddles, but they\'re good ones," you say. They squelch off up the path.' }
            ] } },
        { label: 'Throw them a line and keep walking', kind: 'around', eff: { momentum: 1 }, result: 'They catch it and haul themselves in. "Thanks," they gasp. You are already gone. The Sirens shrug and start another verse.' },
        { label: 'Tell them their old agent sounds like a crook', kind: 'through', hint: 'It might win you a client. Your client is listening.', eff: { prospect: { temp: 'warm', source: 'a shipwrecked client' }, trust: -1 }, result: (s) => `It feels good to say. Even the Sirens go "ooh." ${C(s)} wonders, quietly, what you would say about them.` }
      ]
    },

    /* ================= Fog of Forgotten Info: the Will-o'-Wisps =================
     * Each wisp is a half-remembered fact. Real thing: losing track of details. */
    {
      id: 'fog_two_versions', title: 'Two wisps, two answers', at: ['fog'],
      text: (s) => `Two Will-o'-Wisps bob in the fog. One glows "THIS SPRING," which is what your notes say. The other glows "AFTER THE SUMMER," which is what ${C(s)} remembers. Each of you is drifting, politely and firmly, toward your own wisp.`,
      choices: [
        { label: 'Follow the client\'s wisp', kind: 'around', hint: 'Good for the mood. Memory is not a filing system, and wisps know it.', eff: { trust: 1, debt: { tag: 'timeline', sev: 1 } }, result: '"You\'re probably right," you say. Their wisp brightens smugly. You cross out your note.' },
        { label: 'Follow your own wisp', kind: 'through', preview: 'A coin flip: either your notes were right, or you are now confidently wrong.',
          eff: () => (roll('tv', 0.5) ? { momentum: 1, insight: 1 } : { trust: -1, debt: { tag: 'timeline', sev: 1 } }),
          result: () => (R.tv ? 'They check their calendar. Your wisp was the real one. Nobody gloats. Out loud.' : 'They check their calendar. Your wisp pops like a soap bubble. "Do you write everything down wrong, or just this?"') },
        { label: 'Find the original email together', kind: 'prepare', eff: (s) => ({ energy: -1, insight: 2, clearDebt: hasDebt(s, 'timeline') ? 'timeline' : null }), result: 'Twenty minutes of scrolling, with both wisps peering over your shoulders. The answer is "after the summer, unless something comes up." Both wisps go out. You write it down. Exactly.' },
        { label: 'Check your battered notebook', kind: 'help', item: 'notebook', show: holding('notebook'), eff: { insight: 1, momentum: 1 }, result: 'Underlined, with a date: you both had it half right. The wisps sulk off to bother someone else. Past you is a hero, again.' }
      ]
    },
    {
      id: 'fog_name', title: 'The wisp that took the name', at: ['fog'],
      text: (s) => `${C(s)} says, "Anyway, so they think we should wait," as if you know exactly who "they" is. You have met them. You are almost sure. A Will-o'-Wisp floats past with the name glowing faintly inside it, just out of reach.`,
      choices: [
        { label: 'Bluff: "Ah, of course. How are they doing?"', kind: 'through', hint: 'Smooth, if it works. Wisps adore a bluff.',
          then: { text: (s) => `"They're good! Actually, they asked about you. Do you remember what they said last time?" ${C(s)} looks at you expectantly. The wisp bobs closer, giggling.`,
            choices: [
              { label: 'Come clean now', kind: 'prepare', eff: (s) => ({ trust: -1, insight: 1, fact: s.client.stakeholderFact }), result: (s) => `"I'm so sorry. Remind me who we're talking about?" ${C(s)} laughs. "${s.client.stakeholder}! Wow." The wisp fizzles out in disappointment. Then they tell you more than they would have otherwise.` },
              { label: 'Keep bluffing', kind: 'through', preview: '40% you get away with it. Otherwise it gets noticed (Trust -2).',
                eff: () => (roll('nm', 0.4) ? { momentum: 1 } : { trust: -2, debt: { tag: 'unknown_stakeholder', sev: 2 } }),
                result: (s) => (R.nm ? '"Something about the timing, I think?" Vague enough to be true. The wisp drifts off, bored. Phew.' : `${C(s)} frowns. "That wasn't them. You don't remember, do you?" You do not. The wisp has a lovely time.`) }
            ] } },
        { label: 'Admit it and ask', kind: 'prepare', eff: (s) => ({ trust: comm(s) ? 0 : -1, insight: 1, fact: s.client.stakeholderFact }), result: (s) => (comm(s) ? `"I want to get this exactly right. Who do you mean?" The wisp pops. No harm done. It is ${s.client.stakeholder}, and they matter more than you realized.` : `"Sorry, who?" A small wince. The wisp pops. It is ${s.client.stakeholder}. You will not forget again.`) },
        { label: 'Ask how "they" feel about all this', kind: 'prepare', show: curious, hint: 'Curiosity: let them fill in the name.', eff: (s) => ({ insight: 2, trust: 1, fact: s.client.stakeholderFact }), result: (s) => `An open question, and ${C(s)} fills in the name without noticing. The wisp goes out like a blown candle. ${s.client.stakeholder}. Their feelings are complicated.` },
        { label: 'Check your battered notebook', kind: 'help', item: 'notebook', show: holding('notebook'), eff: (s) => ({ fact: s.client.stakeholderFact, insight: 1 }), result: (s) => `Page two: "${stake(s)}. IMPORTANT." Of course. The wisp slinks away.` }
      ]
    },
    {
      id: 'fog_missing_page', title: 'Page three, glowing', at: ['fog'],
      text: (s) => `${C(s)} hands over a document that skips from page two to page four. "Oh, page three's nothing. Just boilerplate, I think." Off in the fog, a wisp is carrying something that looks very much like page three.`,
      choices: [
        { label: 'Take their word for it', kind: 'through', eff: { momentum: 1, debt: { tag: 'stale_info', sev: 2 } }, result: 'Page three is probably nothing. The wisp carrying it bobs away into the fog, humming. Probably.' },
        { label: 'Ask them to dig out the full copy', kind: 'around', eff: { days: 1, momentum: -1, insight: 1 }, result: (s) => `${C(s)} finds it a day later, in a drawer, completely wisp-free. Page three is mostly boilerplate. One line in the middle is not.` },
        { label: '"What do you remember was on it?"', kind: 'prepare',
          then: { text: (s) => `${C(s)} squints after the wisp. "Something about... what happens if... no, wait. That's the other one." They trail off, then frown. "Huh. Why do I remember that?"`,
            choices: [
              { label: 'Follow that thread', kind: 'prepare', eff: (s) => { R.mp = missedOne(s) || unknown(s); return R.mp ? { insight: 2, fact: R.mp, energy: -1 } : { insight: 1 }; }, result: (s) => (R.mp ? `You follow the wisp, carefully this time, and it leads somewhere. The fog gives back something it took: ${label(s, R.mp)}.` : 'It leads to a dead end, but a tidy one. The wisp goes out. You know this file better now.') },
              { label: 'Note it and move on', kind: 'around', eff: { insight: 1 }, result: 'You write "page 3??" in the margin and circle it twice. The wisp seems to find this hilarious.' }
            ] } },
        { label: 'Ask Olu to pull a copy from the archive', kind: 'help', contact: 'operator', show: ready('operator'), eff: { insight: 1, momentum: 1 }, result: '"Page three," says Olu, sending it over. "The wisps always take page three. Nobody knows why."' }
      ]
    },
    {
      id: 'fog_echo', title: 'A wisp you have met before', at: ['fog'],
      when: (s) => !!missedOne(s),
      text: (s) => `A familiar wisp drifts out of the fog, glowing with a phrase ${C(s)} said days ago that you let slide past. You can almost hear it again. Wisps rarely come back twice. If you don't catch this one now, it is gone for good.`,
      choices: [
        { label: 'Turn around and ask about it now', kind: 'prepare', eff: (s) => { R.echo = missedOne(s); return { momentum: -1, insight: 1, fact: R.echo, trust: comm(s) ? 1 : 0 }; }, result: (s) => `"Earlier you said something I didn't follow up on." The wisp settles into your hand like a firefly. ${C(s)} looks surprised, then pleased. It was about ${label(s, R.echo)}.` },
        { label: 'Let it go, you have momentum', kind: 'through', eff: { momentum: 1, style: { avoid: 1 } }, result: 'The wisp fades. The fog closes over it, gently.' },
        { label: 'Write down what you remember, ask later', kind: 'around', hint: 'Better than nothing. Later is a busy place.', eff: { insight: 1 }, result: 'You write it down by wisp-light: half a sentence, and a question mark.' },
        { label: 'Check your battered notebook', kind: 'help', item: 'notebook', show: holding('notebook'), eff: (s) => { R.echo2 = missedOne(s); return { fact: R.echo2, insight: 1, momentum: 1 }; }, result: (s) => `You did write it down, after all: ${label(s, R.echo2)}. The wisp, outdone, winks out.` }
      ]
    },

    /* ================= Loop of Endless Data Entry: the Paperwork Ouroboros =================
     * A serpent of forms eating its own tail. Real thing: entering the same information
     * again and again, until someone breaks the loop. */
    {
      id: 'loop_hold', title: 'The serpent\'s hold music', at: ['loop'],
      text: (s) => `To confirm one detail about ${C(s)}'s existing accounts, you have to call another company. Somewhere deep in the coils of the Paperwork Ouroboros, a phone rings, and rings. Its hold music is an eight-second flute clip on repeat. "Your call is important to us," the serpent hisses, for the ninth time.`,
      choices: [
        { label: 'Stay on hold, however long it takes', kind: 'prepare', preview: 'Half the time, an hour. Half the time, the whole day (and a little of your soul).',
          eff: () => (roll('hold', 0.5) ? { energy: -1, insight: 1 } : { energy: -2, days: 1, insight: 1 }),
          result: () => (R.hold ? 'Fifty-three minutes. A real person, somewhere near the tail. The detail is confirmed.' : 'At 4:58pm the serpent swallows your place in the queue. You call again the next morning. Same flute.') },
        { label: 'Fill it in from what you remember', kind: 'through', hint: 'Your memory is pretty good. Pretty.', eff: { momentum: 2, debt: { tag: 'unverified_details', sev: 2 } }, result: 'Typed, submitted, done. The serpent swallows it happily. It will be back for corrections.' },
        { label: 'Ask the client to call with you', kind: 'around', eff: (s) => ({ days: 1, momentum: -1, trust: s.client.prefers === 'call' ? 1 : -1, insight: 1 }), result: (s) => (s.client.prefers === 'call' ? `${C(s)} turns out to be wonderful on the phone. They charm the person inside the serpent in four minutes flat.` : `${C(s)} is visibly suffering. "Is it always this flute? Is it always this snake?"`) },
        { label: 'Ask Olu if there is a direct line', kind: 'help', contact: 'operator', show: ready('operator'), eff: { momentum: 1, insight: 1 }, result: 'There is a direct line that skips the coils entirely. Of course there is. Olu has it on a sticky note.' }
      ]
    },
    {
      id: 'loop_dropdown', title: 'A scale marked "Other"', at: ['loop'],
      text: (s) => `One of the Ouroboros's scales is a dropdown menu. None of the options describe ${C(s)}'s situation. The closest is "Other (please call)." Calling, you notice, leads straight back into the serpent's mouth.`,
      choices: [
        { label: 'Pick the closest option and move on', kind: 'through', eff: { momentum: 1, debt: { tag: 'defaults', sev: 2 } }, result: 'Close enough. The serpent swallows it without complaint, which is somehow worse.' },
        { label: 'Call and ask what "Other" means', kind: 'prepare', eff: { energy: -1 },
          then: { text: 'After twenty minutes inside the coils, someone in Operations says: "Pick Other and attach a note explaining. Then someone reads the note. Usually." Behind them, you can hear the serpent chewing.',
            choices: [
              { label: 'Write a short, careful note', kind: 'prepare', eff: { energy: -1, insight: 1, trust: 1 }, result: 'Four sentences. Clear and true. The serpent finds nothing to chew on. Somewhere, a reviewer exhales gratefully.' },
              { label: 'Write "see attached" and attach everything', kind: 'through', eff: { momentum: 1, debt: { tag: 'bad_handoff', sev: 1 } }, result: '"See attached." Attached: forty pages. The serpent gulps them down whole. Good luck, reviewer.' },
              { label: 'Hand the note to your assistant', kind: 'around', eff: { days: 1, energy: 1 }, result: 'Your assistant writes a lovely note a day later. You check it over. It is better than yours would have been, and the serpent spits nothing back.' }
            ] } },
        { label: 'Leave it blank and see what happens', kind: 'around', preview: '50% it sails through. 50% it bounces back in two days.',
          eff: () => (roll('dd', 0.5) ? { momentum: 1 } : { days: 2, momentum: -1 }),
          result: () => (R.dd ? 'Nobody notices. The serpent slithers on. You feel strangely uneasy about that.' : 'It comes out of the serpent\'s tail two days later with a red stamp: INCOMPLETE. Around the loop you go.') }
      ]
    },
    {
      id: 'loop_already_asked', title: 'Asked and swallowed', at: ['loop'],
      text: (s) => `The Ouroboros wants ${C(s)}'s date of birth. Again. ${C(s)} closes their eyes. "Your assistant asked me that. The Specialist asked me that. You asked me that. On Tuesday. That snake ate every one."`,
      choices: [
        { label: 'Apologize and ask anyway', kind: 'around', eff: { trust: -1, insight: 1 }, result: (s) => `${C(s)} tells you. Again. Slowly. The serpent swallows it and licks its lips.` },
        { label: 'Copy it from an old form instead', kind: 'through', eff: { momentum: 1, debt: { tag: 'stale_info', sev: 1 } }, result: 'Copied from an old form the serpent spat out, which was copied from an older form it spat out before that. Probably right.' },
        { label: 'Break the loop: one fact sheet everyone uses', kind: 'prepare', hint: 'Slow today. Fewer coils tomorrow.', eff: { energy: -2, days: 1, insight: 2, trust: 1 }, result: (s) => `One page, one source of truth. You send it to everyone and tell ${C(s)} they will never be asked again. For the first time, the serpent has nothing to eat. It looks genuinely confused.` },
        { label: 'Go through the shoebox of paperwork properly', kind: 'prepare', minigame: 'factFind', hint: 'Sort what is current, what needs updating, and what to ask.', result: 'Everything in one place now, checked and current. The serpent sniffs at it and slithers off to find someone less organized.' },
        { label: 'Pull it from your client database', kind: 'help', show: (s) => hasSys(s, 'crm'), eff: { momentum: 1, trust: 1 }, result: 'It is right there. You never ask again. The serpent goes hungry, and your client notices.' }
      ]
    },
    {
      id: 'loop_timeout', title: 'The serpent ate your form', at: ['loop'],
      text: 'You have spent an hour on the form. You press Submit. The Ouroboros yawns and swallows it whole. "Your session has expired for your security," it says, with its mouth full. "Please log in again." The form, needless to say, is empty.',
      choices: [
        { label: 'Press Back and hope', kind: 'through', preview: '40%: it is all still there. 60%: it is not, and now you are annoyed.',
          eff: () => (roll('to', 0.4) ? { momentum: 1 } : { energy: -1, momentum: -1 }),
          result: () => (R.to ? 'The serpent hiccups, and it is all there! You will never know why. Submit.' : 'It is not there. It is never there. You retype it with feeling.') },
        { label: 'Retype it carefully from the source documents', kind: 'prepare', eff: { energy: -2, insight: 1 }, result: 'Slow. This time you notice a detail you got wrong the first time. The serpent did you a favor. A horrible, scaly favor.' },
        { label: 'Retype it fast from memory', kind: 'through', eff: { momentum: 1, energy: -1, debt: { tag: 'unverified_details', sev: 1 } }, result: 'Done in twenty minutes. Mostly the same as before. The serpent will taste the difference later.' },
        { label: 'Call Kenji', kind: 'help', contact: 'whisperer', show: ready('whisperer'), eff: { momentum: 1, insight: 1 }, result: '"It autosaves to drafts. Top right. Tiny grey icon. The snake never finds that one." There it is. Kenji hangs up before you can thank him.' }
      ]
    },

    /* ================= Product-First Cliffs: the Pitch Harpies =================
     * Harpies shrieking product names, herding agents to the edge. Real thing: pitching
     * a product before you understand the client. */
    {
      id: 'cliffs_what_sell', title: '"So what do you actually sell?"', at: ['cliffs'],
      text: (s) => `The Pitch Harpies circle overhead, shrieking product names. ${C(s)} winces and turns to you. "Can I be blunt? What do you actually sell? I'd rather know now." Behind you, a Harpy herds some poor agent off the edge mid-sentence.`,
      choices: [
        { label: 'Pull out the brochure and walk them through it', kind: 'through', hint: 'A straight answer to a straight question. The Harpies scream with joy. You do not know what they need yet.', eff: { momentum: 2, debt: { tag: 'premature_pitch', sev: 2 } }, result: (s) => `The Harpies swoop in close, approving. ${C(s)} reads the whole thing. "Okay. And which of these is for me?" You realize you are not sure.` },
        { label: 'Answer honestly, then turn it around', kind: 'prepare', eff: { trust: 1 },
          then: { text: (s) => `"Fair question. I can help with a lot of things, but which ones depends on what you're trying to fix." The Harpies screech in protest. ${C(s)} considers this. "Okay. Then ask me something."`,
            choices: [
              { label: '"What made you pick up the phone?"', kind: 'prepare', preview: 'With Curiosity or Trust 6+, you hear the real reason.',
                eff: (s) => { R.cs = open(s); return R.cs ? { insight: 2, fact: worryFact(s) } : { insight: 1, trust: 1 }; },
                result: (s) => (R.cs ? `The Harpies lose interest and wheel away. The real reason has nothing to do with any brochure. It is about ${label(s, worryFact(s))}.` : '"Honestly? It just felt like time." You will need more than that, but it is a start. A Harpy drops a brochure at your feet, hopefully.') },
              { label: '"What would a good outcome look like?"', kind: 'around', eff: { insight: 1, trust: 1 }, result: 'They describe a feeling, not a product. The Harpies only know product names, so they have nothing to shriek. That is the most useful thing anyone has said all day.' },
              { label: 'Actually, show them the brochure now', kind: 'through', eff: { momentum: 1, debt: { tag: 'premature_pitch', sev: 1 } }, result: 'A Harpy drops it straight into their hands. They say they will read it. You both know they won\'t.' }
            ] } },
        { label: 'Explain plainly how you get paid', kind: 'around', hint: 'Uncomfortable. Honest. Harpies hate it.', eff: (s) => ({ trust: comm(s) ? 2 : 1, momentum: -1 }), result: (s) => `${C(s)} blinks. "Nobody's ever just told me that." The Harpies go strangely quiet. You both take a step back from the edge.` }
      ]
    },
    {
      id: 'cliffs_leaderboard', title: 'The Harpies\' leaderboard', at: ['cliffs'],
      text: 'The Harpies keep a big chalkboard nailed to a post at the cliff edge: TOP PITCHERS THIS WEEK. The names at the top have little stars and a few feathers stuck to them. Yours isn\'t on it. Below the board, a long way below, there is a large pile of brochures.',
      choices: [
        { label: 'Get on the board: pitch something today', kind: 'through', eff: { momentum: 2, trust: -1, debt: { tag: 'premature_pitch', sev: 2 } }, result: 'A Harpy chalks your name up with one talon. It looks great. Your client looks less great about it.' },
        { label: 'Ask which of those names still have their clients', kind: 'prepare',
          then: { text: 'A Harpy squints at the board. "Still have their clients? We don\'t track that. Why would we track that?" It cocks its head. "Huh. Why wouldn\'t we track that?" It flies off, deeply unsettled.',
            choices: [
              { label: 'Start tracking it yourself', kind: 'prepare', eff: (s) => (PP.skill(s, 'judgment') < 2 ? { skill: { judgment: 1 }, energy: -1 } : { insight: 1 }), result: 'You chalk a second column on the board: STILL CLIENTS? The Harpies avoid looking at it. It stays empty for a very long time.' },
              { label: 'Shrug and keep going', kind: 'around', eff: { insight: 1 }, result: 'You file the thought away for later. A Harpy files a feather in your hair.' }
            ] } },
        { label: 'Ignore the board entirely', kind: 'around', eff: { energy: 1 }, result: 'It is surprisingly restful, not caring about a board. The Harpies circle twice, then give up on you.' }
      ]
    },
    {
      id: 'cliffs_client_wants_it', title: 'A Harpy brought them an article', at: ['cliffs'],
      text: (s) => `A Harpy has dropped an article into ${C(s)}'s hands, and they are hooked. "I want the thing in this article. My coworker got one. Can you just get me that?" They are waving their phone very close to the edge. Overhead, the Harpies chant its name.`,
      choices: [
        { label: 'Get them exactly what they asked for', kind: 'through', hint: 'Fast, easy, and they asked. Whether it fits is another question.', eff: { momentum: 3, trust: 1, debt: { tag: 'assumed_goal', sev: 2 } }, result: '"Done!" They are delighted. The Harpies do a victory lap. The article was not written about them.' },
        { label: '"Tell me what you liked about it."', kind: 'prepare',
          then: { text: (s) => `"It just sounded... safe? Like I'd stop worrying." ${C(s)} lowers the phone. The Harpies fall quiet, confused. "Is that a weird reason?"`,
            choices: [
              { label: '"Not weird. What are you worried about?"', kind: 'prepare', preview: 'With Curiosity or Trust 6+, they tell you.',
                eff: (s) => { const w = worry(s); R.cw = open(s) && !!(w && w.fact); return R.cw ? { insight: 2, trust: 1, fact: w.fact } : { insight: 1, trust: 1 }; },
                result: (s) => (R.cw ? worry(s).text : (worry(s) && worry(s).guarded) || '"Everything, a bit." It is a start.') },
              { label: 'Explain why the article might not fit them', kind: 'around', eff: (s) => (comm(s) ? { trust: 1, insight: 1 } : { trust: -1, insight: 1 }), result: (s) => (comm(s) ? 'You manage it without making them feel silly. The Harpies sulk. Your client thanks you.' : `It is correct, but it comes out like a lecture, and the Harpies cackle. ${C(s)} puts the phone away a little sharply.`) },
              { label: 'Get it anyway: it does make them feel safe', kind: 'through', eff: { momentum: 2, debt: { tag: 'assumed_goal', sev: 1 } }, result: 'They feel safe. The Harpies feel triumphant. Whether your client actually is safe is a question for later.' }
            ] } },
        { label: 'Flatly say no', kind: 'around', hint: 'Maybe right. Definitely abrupt.', eff: { trust: -2, momentum: -1 }, result: (s) => `"Oh. Okay." ${C(s)} puts the phone away. A Harpy hisses at you on their behalf. They stop telling you things for a while.` },
        { label: 'Ask Dev to read the article with you', kind: 'help', contact: 'specialist', show: ready('specialist'), eff: { insight: 2, trust: 1 }, result: 'Dev reads it in thirty seconds, swatting a Harpy away with the other hand. "Good article. Wrong person." Explained kindly, it lands.' }
      ]
    },

    /* ================= Spreadsheet Swamp: the Spreadsheet Hydra =================
     * Answer one cell and two tabs grow back. Real thing: overcomplicating the plan.
     * You beat it by simplifying, not by adding tabs. */
    {
      id: 'swamp_versions', title: 'Seven heads, seven versions', at: ['swamp'],
      text: (s) => `${C(s)} sends over the spreadsheet. Then another one. The Hydra rears out of the swamp with seven heads, one per version. The newest head is called "final_v7_REAL_final (2)". The oldest is called "final". They are all talking at once.`,
      choices: [
        { label: 'Use the one with the latest date', kind: 'through', preview: '55% it is the real one. Otherwise the numbers are from an old version (hidden risk).',
          eff: () => (roll('ver', 0.55) ? { momentum: 1 } : { momentum: 1, debt: { tag: 'stale_info', sev: 2 } }),
          result: 'You pick the head with the newest date. Surely the newest head knows the newest numbers. The other six hiss.' },
        { label: 'Ask which one is real', kind: 'prepare',
          then: { text: (s) => `${C(s)} thinks. "Well, mine is the v5 head. ${stake(s)} grew v6 and v7. I haven't really looked at those." Two of the heads grin. "They might have changed some things."`,
            choices: [
              { label: 'Ask to see what changed, and why', kind: 'prepare', eff: (s) => ({ momentum: -1, insight: 2, fact: s.client.stakeholderFact }), result: (s) => `${stake(s)}'s heads answer a slightly different question from ${C(s)}'s. That difference is the whole conversation. The Hydra, briefly, has nothing to add.` },
              { label: 'Stick with the client\'s version', kind: 'through', eff: (s) => ({ momentum: 1, debt: { tag: 'unknown_stakeholder', sev: 1 }, missed: s.client.stakeholderFact }), result: 'v5 it is. Heads v6 and v7 sink back into the swamp, unopened, quietly disagreeing.' },
              { label: 'Merge them all into one master file', kind: 'around', eff: { energy: -2, insight: 1, style: { overcomplicate: 2 } }, result: 'final_v8_MASTER. Every time you merge two heads, three grow back. Twenty-six tabs. You are sinking, but in a very organized way.' }
            ] } },
        { label: 'Start a fresh one-page version together', kind: 'prepare', hint: 'Cut it down to one head. Some people are very attached to their heads.', eff: (s) => ({ energy: -1, insight: 1, style: { overcomplicate: -1 }, trust: s.client.complexity === 'high' ? -1 : 1 }), result: (s) => (s.client.complexity === 'high' ? `${C(s)} looks at the single page as if you have insulted their pet Hydra. Still, it is clearer.` : `${C(s)} looks relieved as the heads slide back under. "Oh, thank goodness. I didn't understand anything after v3."`) }
      ]
    },
    {
      id: 'swamp_circular', title: 'Two heads arguing', at: ['swamp'],
      text: 'Two of the Hydra\'s heads are locked in an argument. Tab 4 insists it gets its number from tab 9. Tab 9 insists it gets its number from tab 4. A little flag pops up: "There are one or more circular references." It has been there for months. Everyone just clicks OK. The Hydra gurgles contentedly.',
      choices: [
        { label: 'Click OK like everyone else', kind: 'through', eff: { momentum: 1, debt: { tag: 'spreadsheet_assumptions', sev: 2 } }, result: 'OK. The flag goes away. The heads keep arguing, very quietly, forever.' },
        { label: 'Trace it to the source', kind: 'prepare', preview: 'With Preparation, likely quick. Without it, a coin flip on whether you vanish into the swamp for an afternoon.',
          eff: (s) => (roll('circ', PP.skill(s, 'preparation') > 0 ? 0.8 : 0.5) ? { energy: -1, insight: 2, fact: s.client.spreadsheetFact } : { energy: -3, insight: 1, style: { overcomplicate: 1 } }),
          result: (s) => (R.circ ? `You follow each neck down into the mud. Untangling the two heads shows you what actually matters: ${label(s, s.client.spreadsheetFact)}.` : 'Three hours later you have found two more arguing heads and lost a shoe.') },
        { label: 'Ask: "What decision is this model for?"', kind: 'prepare', show: curious, hint: 'Curiosity: the question under the Hydra.', eff: (s) => ({ insight: 2, momentum: -1, style: { overcomplicate: -1 }, fact: s.client.spreadsheetFact }), result: (s) => `${C(s)} thinks. The answer fits on a sticky note. Half the Hydra's heads, suddenly unnecessary, sink without a sound.` },
        { label: 'Call Marge', kind: 'help', contact: 'veteran', show: ready('veteran'), eff: { insight: 1, momentum: 1, style: { overcomplicate: -1 } }, result: '"Cut off that head," Marge says. "Nobody\'s looked at it since the day it grew." She is right. It does not grow back.' }
      ]
    },
    {
      id: 'swamp_scenario', title: 'Scenario twelve', at: ['swamp'],
      text: (s) => `"One more scenario," ${C(s)} says. "What if everything goes great? And what if everything goes terribly? And what if it's somewhere in the middle, but on a Tuesday?" With each question, a new head pokes hopefully out of the swamp.`,
      choices: [
        { label: 'Model all three', kind: 'through', eff: { energy: -2, trust: 1, style: { overcomplicate: 1 } }, result: 'Scenarios twelve, thirteen and fourteen. Three new heads, fully grown. The Tuesday head looks a lot like the others.' },
        { label: '"Which of these would change what you do?"', kind: 'prepare',
          then: { text: (s) => `${C(s)} opens their mouth, closes it, and looks out at the swamp full of heads. "...None of them, really. I think I keep asking because I'm scared to pick."`,
            choices: [
              { label: 'Ask what picking feels like', kind: 'prepare', preview: 'With Curiosity or Trust 6+, you hear what is underneath.',
                eff: (s) => { const w = worry(s); R.sc = open(s) && !!(w && w.fact); return R.sc ? { insight: 2, trust: 1, fact: w.fact } : { insight: 1, trust: 1 }; },
                result: (s) => (R.sc ? worry(s).text : '"Like jumping." They laugh a little. It is not really a joke.') },
              { label: 'Pick the most likely scenario together', kind: 'around', eff: { momentum: 1, style: { overcomplicate: -1 } }, result: 'One scenario, circled in pen. The other heads sink back into the swamp. The Hydra loosens its grip.' }
            ] } },
        { label: 'Say no, kindly', kind: 'around', eff: (s) => ({ momentum: 1, trust: comm(s) ? 0 : -1 }), result: (s) => (comm(s) ? '"More heads won\'t make the choice easier. Let\'s talk about the choice." They nod, slowly. The new heads sink back, unfed.' : `"Oh. Okay." ${C(s)} closes the laptop, a little hurt. The new heads look hurt too.`) }
      ]
    },
    {
      id: 'swamp_knee_deep', title: 'Twenty-six heads', at: ['swamp'],
      when: (s) => s.style.overcomplicate >= 2,
      text: (s) => `You look up from the model. It is dark. You have been fighting the Hydra for two days, and it now has twenty-six heads, mostly because you kept adding them. You have not spoken to ${C(s)} since. You have, however, built a sensitivity analysis of your sensitivity analysis.`,
      choices: [
        { label: 'Close the laptop and call them', kind: 'prepare', eff: { trust: 1, momentum: -1, style: { overcomplicate: -2 } }, result: (s) => `${C(s)} picks up. "Oh! I thought you'd been eaten by something." Nearly. Behind you, the Hydra sinks into the swamp, sulking.` },
        { label: 'One more pass, then call', kind: 'through', eff: { energy: -2, insight: 1, style: { overcomplicate: 1 }, debt: { tag: 'missed_message', sev: 1 } }, result: 'One more pass becomes three, and three more heads. Your phone buzzes. You will get to it.' },
        { label: 'Send the model with a long explanatory email', kind: 'around', eff: (s) => ({ momentum: 1, trust: s.client.prefers === 'email' ? 1 : -1, debt: { tag: 'confused_client', sev: 1 } }), result: (s) => (s.client.prefers === 'email' ? 'They read it all. Twice. With a highlighter. They even give some of the heads names.' : 'They open it on their phone, meet twenty-six heads, scroll for a while, and go to bed.') },
        { label: 'Call Marge for a reality check', kind: 'help', contact: 'veteran', show: ready('veteran'), eff: { style: { overcomplicate: -2 }, insight: 1, energy: 1 }, result: '"Did the client ask for a Hydra?" "...No." "Then go to bed." You go to bed. By morning it is down to three heads, which is plenty.' }
      ]
    },

    /* ================= Snake Pit of Unreturned Calls: the Voicemail Gorgon =================
     * Her snakes are ringing phones; ignore them and relationships turn to stone. */
    {
      id: 'snakepit_old_voicemail', title: 'The snake with your client\'s voice', at: ['snakepit'], cut: 'phones',
      text: (s) => `One of the Voicemail Gorgon's snakes is coiled tighter than the rest, and it has ${C(s)}'s voice. A voicemail. Three weeks old. You never listened to it. It is forty seconds long, and the snake is starting to look a little stony around the edges.`,
      choices: [
        { label: 'Listen to it now', kind: 'prepare',
          then: { text: (s) => `The snake uncoils and plays it: ${C(s)}'s voice, a little nervous. "Hi, it's me. Sorry, it's probably nothing, but I wanted to mention... actually, I'll tell you next time. Bye!" They never did tell you next time.`,
            choices: [
              { label: 'Call them and ask what it was', kind: 'prepare', preview: 'With Trust 4+ or Communication, they tell you. Otherwise, it stings that you took three weeks.',
                eff: (s) => { R.vm = s.res.trust >= 4 || comm(s); return R.vm ? { trust: 1, insight: 2, fact: worryFact(s) } : { trust: -1, insight: 1 }; },
                result: (s) => (R.vm ? `"Oh! You got that." The snake turns warm and green again. A pause. Then they tell you: ${label(s, worryFact(s))}.` : `"That was weeks ago," ${C(s)} says. "It's fine. Don't worry about it." The snake stays a little grey. It is clearly not fine.`) },
              { label: 'Apologize for the delay first, properly', kind: 'around', eff: { trust: 1, energy: -1 }, result: (s) => `${C(s)} accepts the apology. "Honestly, I figured you were busy." The Gorgon smirks. That lands somewhere you do not like.` },
              { label: 'Assume it really was nothing', kind: 'through', eff: (s) => ({ momentum: 1, missed: worryFact(s), debt: { tag: 'missed_message', sev: 1 } }), result: 'They did say it was probably nothing. The snake goes quietly, completely, to stone.' }
            ] } },
        { label: 'Text "Got your message!" without listening', kind: 'through', hint: 'Technically true.', eff: { momentum: 1, debt: { tag: 'missed_message', sev: 2 } }, result: (s) => `${C(s)} replies with a thumbs up. The Gorgon laughs, which sounds like forty phones ringing at once. You both move on, in different directions.` },
        { label: 'Delete it with the others', kind: 'around', eff: { energy: 1, debt: { tag: 'missed_message', sev: 2 }, style: { avoid: 1 } }, result: 'The pit is quieter. One snake is now a small stone ornament. You feel a little lighter, and a little worse.' }
      ]
    },
    {
      id: 'snakepit_callbacks', title: 'Fourteen snakes', at: ['snakepit'],
      text: 'The Gorgon leans out of the pit and shakes her head at you. Fourteen snakes, each one a ringing phone: your callback list. Three are hissing URGENT. One is hissing URGENT!!! in your own voice, and you do not remember why.',
      choices: [
        { label: 'Block out time and work through the week', kind: 'prepare', minigame: 'calendar', hint: 'Prep before meetings. Don\'t overbook.', result: 'Every snake gets a slot. URGENT!!! turned out to be a birthday. You made it. For once, the Gorgon has nothing to hiss about.' },
        { label: 'Call the three loudest, ignore the rest', kind: 'through', eff: { momentum: 1, energy: -1, debt: { tag: 'missed_message', sev: 1 } }, result: 'The loud snakes are happy. The quiet ones are quiet, which is not the same thing. A couple are going grey.' },
        { label: 'Have your assistant send everyone a holding message', kind: 'around', preview: '60% it buys you time. 40% someone wanted a real answer, and your client hears about it.',
          eff: () => (roll('cb', 0.6) ? { energy: 1 } : { trust: -1, energy: 1 }),
          result: () => (R.cb ? '"Will call this week!" Most of the snakes settle down and doze.' : 'One snake hisses back, "I asked a yes or no question." Word gets around the pit. Your client hears.') },
        { label: 'Call the URGENT!!! one first', kind: 'prepare', eff: { energy: -1, trust: 1 }, result: (s) => `It is a client whose dog just died. You talk for ten minutes. The snake stops ringing and rests on your shoulder. ${C(s)} overhears, and looks at you a little differently.` }
      ]
    },
    {
      id: 'snakepit_cold_client', title: 'Half turned to stone', at: ['snakepit'],
      text: 'At the back of the pit stands a statue with a familiar face: a client you signed last year and have not called since. The Gorgon\'s handiwork. It is only half stone so far. One eye swivels toward you. "Remember me? Someone else has been calling."',
      choices: [
        { label: 'Apologize and book a proper review', kind: 'prepare', eff: { energy: -1, days: 1, prospect: { temp: 'warm', source: 'a friend of a past client you finally called back' } }, result: 'An hour on the phone. The stone flakes off as you talk. They are still cross, but they are still yours. They even mention a friend who needs help. (New prospect in your pipeline.)' },
        { label: 'Send a cheerful "checking in!" email', kind: 'around', preview: 'A coin flip: it lands, or it reads like exactly what it is.',
          eff: () => (roll('cold', 0.5) ? { momentum: 1 } : { trust: -1 }),
          result: () => (R.cold ? 'They reply "nice to hear from you." One ear un-stones. Thawing, slightly.' : 'They reply "Who is this?" and set a little harder. Your current client, reading over your shoulder, goes quiet.') },
        { label: 'Let them go, focus on your current client', kind: 'through', hint: 'Your client gets your full attention. Your book gets a little smaller.', eff: { momentum: 1, trust: 1 }, result: (s) => `You step past the statue. ${C(s)} gets all of you today. Back at the port, a file quietly turns to stone.` }
      ]
    },
    {
      id: 'snakepit_disconnected', title: 'The snake that only hisses', at: ['snakepit'],
      text: (s) => `You finally pick up one of the Gorgon's snakes to return a call about ${C(s)}'s file. It only hisses: "The number you have dialed is no longer in service." The details on file are out of date. Nobody updated them. Possibly you.`,
      choices: [
        { label: 'Ask your client for the new details', kind: 'prepare', eff: (s) => ({ trust: comm(s) ? 0 : -1, insight: 1, clearDebt: hasDebt(s, 'unverified_details') ? 'unverified_details' : null }), result: (s) => `${C(s)} gives you the right number. "I told someone that. Maybe not you." You update every file you can find. The snake stops hissing.` },
        { label: 'Track it down through someone close to them', kind: 'around', eff: (s) => ({ days: 1, fact: s.client.stakeholderFact, insight: 1 }), result: (s) => `${stake(s)} has the number, and some opinions about how hard it was to reach anyone. Fair. Even the Gorgon nods along.` },
        { label: 'Mark it "unreachable" and move on', kind: 'through', eff: { momentum: 1, debt: { tag: 'unverified_details', sev: 2 } }, result: 'UNREACHABLE, in red. The Gorgon files it under "future statues." That will definitely not come up again.' }
      ]
    },

    /* ================= Shifting Sands of Incentives: the Djinn of Incentives =================
     * Three wishes, a little fine print. Real thing: bonuses and contests that pull you
     * away from the client. Read the fine print before taking a wish. */
    {
      id: 'sands_priority_list', title: 'The first wish', at: ['sands'],
      text: (s) => `The Djinn of Incentives rises out of its trophy-shaped lamp between two dunes. "First wish," it purrs. "A big signing bonus at a shiny new firm. All you'd need to do is bring your clients over. ${C(s)} too, obviously. Their plan would just need... redoing. From scratch. It's in the fine print. The very fine print."`,
      choices: [
        { label: 'Take the wish and move everyone', kind: 'through', hint: 'Real money now. Every client starts their paperwork over.', eff: { cash: 1500, trust: -2, momentum: -1, debt: { tag: 'assumed_goal', sev: 2 } }, result: (s) => `The gold is real. So is ${C(s)}'s face when you explain that everything starts over, again, for reasons that are mostly about you. The Djinn tucks your signature into its lamp.` },
        { label: 'Read the fine print: what happens to clients who move?', kind: 'prepare',
          then: { text: '"Happens?" The Djinn examines its nails. "They move. Some of them. The ones who don\'t, well, there are always more clients." It smiles. The smile does not reach its eyes, which are shaped like little trophies.',
            choices: [
              { label: 'Turn it down', kind: 'prepare', eff: (s) => (PP.skill(s, 'judgment') < 2 ? { skill: { judgment: 1 }, trust: 1 } : { trust: 1, insight: 1 }), result: (s) => `"Thanks, but no." The Djinn sighs and sinks back into its lamp. ${C(s)} was close enough to hear, and pretends very hard that they weren't.` },
              { label: 'Keep the lamp, just in case', kind: 'around', eff: { insight: 1 }, result: 'The lamp is heavy and has embossed lettering. You put it somewhere you will find it on a bad day.' }
            ] } },
        { label: 'Say no on the spot', kind: 'around', eff: { trust: 1, momentum: 1 }, result: 'Short and polite. The Djinn is already drifting toward the next agent. Your client noticed you did not even think about it.' },
        { label: 'Run it through your focus routine', kind: 'help', show: (s) => hasSys(s, 'focus'), eff: { insight: 1, momentum: 1, trust: 1 }, result: 'Your routine asks: five years from now, which wish do you want to have made? It is not close. The Djinn looks offended.' }
      ]
    },
    {
      id: 'sands_new_platform', title: 'The Djinn\'s banquet', at: ['sands'],
      text: 'The Djinn has conjured a banquet tent in the dunes on behalf of an outside company: good sandwiches, a slideshow about their product, and a glittering points card. Every sale earns points toward a trip. The Djinn floats by with a tray. "The cookies are excellent," it says. "There is only a little fine print."',
      choices: [
        { label: 'Eat, collect points, pitch their product to your client', kind: 'through', hint: 'Good cookies. Whose wish does the pitch grant?', eff: { cash: 300, energy: 1, trust: -1, debt: { tag: 'premature_pitch', sev: 2 }, style: { chase: 1 } }, result: (s) => `You bring it up with ${C(s)} that afternoon, still holding a cookie. "Is this... from the Djinn?" They have seen the tent.` },
        { label: 'Eat the sandwich, keep your judgment', kind: 'prepare', eff: { energy: 2, insight: 1 }, result: 'You learn how the product works, ask two hard questions the Djinn cannot answer, and leave the points card on the table. A free sandwich is not a wish.' },
        { label: 'Skip the banquet and keep walking', kind: 'around', eff: { momentum: 1 }, result: 'You hear the slideshow through the tent wall for a while. Something about "unlocking value." The Djinn waves wistfully. The dunes sound better.' },
        { label: 'Run it past Harold first', kind: 'help', contact: 'compliance', show: ready('compliance'), eff: { insight: 1, clearDebt: 'premature_pitch' }, result: 'Harold reads the fine print on the points card twice, with a magnifying glass. "You can eat the sandwich. Recommend what fits the client, and write down why." He takes a cookie. For the file. The Djinn looks nervous.' }
      ]
    },
    {
      id: 'sands_mirage', title: 'The second wish', at: ['sands'],
      text: (s) => `The Djinn waves a hand and a mirage shimmers on the horizon: THE NEXT BONUS TIER. Your payout rate jumps if you reach it this quarter, and you are one decent-sized sale away. "Second wish," the Djinn whispers. "${C(s)}'s plan could be a little bigger than it needs to be. Nobody would ever know." A pause. "Probably."`,
      choices: [
        { label: 'Size the plan up, just a little', kind: 'through', hint: 'A bigger plan than they need. Clients sometimes notice.', preview: '50% the client never notices. 50% they ask why it got bigger.',
          eff: () => (roll('tier', 0.5) ? { cash: 300, momentum: 1, debt: { tag: 'premature_pitch', sev: 1 } } : { cash: 300, trust: -2, debt: { tag: 'premature_pitch', sev: 2 } }),
          result: (s) => (R.tier ? 'Nobody asks. The mirage gets closer. The Djinn smiles. You feel slightly worse than you expected to.' : `${C(s)} reads the numbers. "This is bigger than what we talked about. Why?" You do not have a good answer. The Djinn has suddenly remembered an appointment inside its lamp.`) },
        { label: 'Size it to what they actually need', kind: 'prepare', eff: { trust: 1, insight: 1 }, result: 'The mirage stays exactly as far away. The Djinn yawns. The plan fits. That will matter longer than a quarter does.' },
        { label: 'Ask what size feels right to them', kind: 'prepare', preview: 'Likely to land with Communication or Trust 6+.',
          eff: (s) => (roll('mir', comm(s) || s.res.trust >= 6 ? 0.8 : 0.45) ? { trust: 2, insight: 1 } : { trust: 1 }),
          result: (s) => (R.mir ? `${C(s)} thinks. "Smaller than I expected you to say. Is that allowed?" It is. The Djinn makes a face. ${C(s)} trusts you a good deal more for it.` : '"I don\'t know. What do you think?" You tell them honestly. It is a start.') },
        { label: 'Think about what the tier costs you long-term', kind: 'prepare', show: (s) => PP.skill(s, 'judgment') > 0, hint: 'Judgment: the payout is one quarter; the reputation is the whole career.', eff: { momentum: 1, trust: 1 }, result: 'You read the wish\'s fine print out loud: one quarter of a better payout, against twenty years of referrals from a client who trusts your numbers. The mirage fades.' }
      ]
    },
    {
      id: 'sands_stake_pivot', title: 'Someone else rubbed the lamp', at: ['sands'],
      when: (s) => K(s, s.client.stakeholderFact),
      text: (s) => `A message from ${stake(s)}: they found the Djinn's lamp too, and the Djinn told them all about the "product of the month." They want to know why ${C(s)} isn't getting "the thing everyone's talking about." ${C(s)} reads it aloud, frowning. "Should I be?"`,
      choices: [
        { label: 'Get them both on a call', kind: 'prepare', eff: { energy: -1, momentum: -1 },
          then: { text: (s) => `${stake(s)} explains what the Djinn told them. ${C(s)} explains what they told you. Both of them are right about something, both of them are getting louder, and somewhere a lamp is chuckling.`,
            choices: [
              { label: 'Explain honestly why it\'s featured, and whether it fits', kind: 'prepare', preview: 'With Communication: likely to settle it. Otherwise a coin flip.',
                eff: (s) => { R.sp = comm(s) || PP.chance(0.5); return R.sp ? { trust: 2, insight: 2 } : { trust: -1, insight: 1 }; },
                result: () => (R.sp ? '"It\'s featured because the company is promoting it this month. That\'s the Djinn\'s fine print. Here\'s what you actually need, and why." Silence. Then, "...that\'s refreshingly honest." Progress.' : 'You try to explain. Both of them correct your explanation. At least they agree on that.') },
              { label: 'Suggest they talk it through without you', kind: 'around', eff: { days: 1, trust: 1 }, result: 'A day later they come back with one question instead of two opinions. It is a better question, and nobody mentions the lamp.' },
              { label: 'Side with your client', kind: 'through', eff: { trust: 1, debt: { tag: 'unknown_stakeholder', sev: 2 } }, result: (s) => `${C(s)} looks grateful. ${stake(s)} hangs up and goes back to the lamp. That will come up again.` }
            ] } },
        { label: 'Just give them the featured product', kind: 'through', hint: 'Everyone stops asking. The Djinn grants it happily.', eff: { cash: 300, momentum: 1, trust: -1, debt: { tag: 'premature_pitch', sev: 2 }, style: { chase: 1 } }, result: (s) => `Easy. ${stake(s)} is satisfied. The Djinn takes a bow. ${C(s)} has a product nobody checked against their actual life.` },
        { label: 'Tell your client to ignore it', kind: 'around', eff: { momentum: 1, debt: { tag: 'unknown_stakeholder', sev: 1 } }, result: '"We\'ll come back to it." Famous last words, written in sand. The Djinn will dig them up again.' }
      ]
    },

    /* ================= Caves of What-Ifs: the What-If Dragon =================
     * Sleeps on a hoard of worst cases. Real thing: avoiding the scary questions about
     * risk. You calm it by naming the fears one at a time. */
    {
      id: 'caves_wet_ink', title: 'The first rumble', at: ['caves'],
      text: (s) => `The What-If Dragon shifts in its sleep, and a rumble rolls up the tunnel: "Whaaat if the paaaycheck stops?" ${C(s)} takes a big step back. "I try really hard not to think about that one. Can we not wake it?"`,
      choices: [
        { label: 'Assume their income is safe and move on', kind: 'through', hint: 'Comfortable. It is also a guess. The Dragon keeps snoring, for now.', eff: { momentum: 1, debt: { tag: 'guessed_key', sev: 1 }, style: { avoid: 1 } }, result: '"You\'ll be fine," you say. You both want it to be true. The Dragon rolls over, still clutching the question.' },
        { label: 'Wake it gently: how many months could they manage?', kind: 'prepare', hint: 'Name this one fear, calmly, with real numbers.',
          eff: (s) => { R.pay = topicFact(s, 'money') || topicFact(s, 'work'); return Object.assign({ insight: 2, energy: -1 }, R.pay ? { fact: R.pay, trust: 1 } : {}); },
          result: (s) => (R.pay ? `You count it out together on the back of an envelope, and with every month the Dragon shrinks a little. Somewhere around month three, ${C(s)} tells you something that matters: ${label(s, R.pay)}.` : `You count it out together. It is fewer months than ${C(s)} hoped, and more than they feared. Named out loud, the Dragon is suddenly only pony-sized. They look steadier. They are clearly holding something back, though.`) },
        { label: 'Lay out the worst case in full detail', kind: 'through', hint: 'Accurate. Also wakes the whole Dragon at once.', eff: (s) => (comm(s) ? { insight: 1, trust: 1 } : { insight: 1, trust: -2, debt: { tag: 'confused_client', sev: 1 } }), result: (s) => (comm(s) ? 'You say the hard version plainly and kindly. Faced head on, the Dragon lies down. They thank you for not sugarcoating it.' : `The Dragon wakes all at once and roars. ${C(s)} stares at the cave floor for a long time. You may have gone a little fast.`) },
        { label: 'Call Ray: "What do the lean months look like?"', kind: 'help', contact: 'banker', show: ready('banker'), eff: (s) => ({ insight: 2, fact: topicFact(s, 'money', true) }), result: 'Ray asks one question: "What month do you dread?" The Dragon perks up, then deflates. Everyone has an answer, and theirs explains a lot.' }
      ]
    },
    {
      id: 'caves_fax', title: 'Smoke rings', at: ['caves'],
      text: (s) => `The Dragon breathes out in its sleep, and a smoke ring drifts up the tunnel, curling into the words WHAT IF YOU COULDN'T WORK FOR A WHILE? ${C(s)} waves it away and laughs nervously. "I never get sick. Well. Almost never."`,
      choices: [
        { label: 'Joke along and move on', kind: 'around', eff: { trust: 1, debt: { tag: 'unchallenged_assumption', sev: 2 } }, result: '"Iron constitution!" you agree. The smoke ring drifts deeper into the cave, exactly where it can surprise you later.' },
        { label: 'Ask who would step in if they were laid up', kind: 'prepare', hint: 'Turns a scary question into a practical one. Dragons hate practical.',
          eff: (s) => ({ insight: 2, trust: 1, energy: -1, fact: s.client.stakeholderFact }),
          result: (s) => `"Who'd handle things? Huh." ${C(s)} thinks out loud, and ${s.client.stakeholder} comes up fast. The smoke ring thins to nothing. It turns out a lot depends on them.` },
        { label: 'Talk through it gently, step by step', kind: 'prepare', preview: 'With Communication or Trust 6+, it lands softly. Otherwise it can feel heavy.',
          eff: (s) => { R.sick = comm(s) || s.res.trust >= 6; return R.sick ? { trust: 2, insight: 1 } : { trust: -1, insight: 1 }; },
          result: (s) => (R.sick ? `You go slow, one puff at a time. Three months, then six. What would carry on, what would stop. The smoke clears. ${C(s)} breathes out. "That's less scary than I thought."` : `It is a lot, all at once, and the tunnel fills with smoke. ${C(s)} goes quiet.`) },
        { label: 'Bring Dev in to explain what usually protects an income', kind: 'help', contact: 'specialist', show: ready('specialist'), eff: { insight: 2, trust: 1 }, result: 'Dev explains the general idea in four sentences, without one acronym, while fanning away the smoke. Your client asks good questions. You take notes for later.' }
      ]
    },
    {
      id: 'caves_bob', title: 'Counting the hoard', at: ['caves'], cut: 'caves',
      text: (s) => `Deep in the cave, the Dragon is counting its hoard by torchlight, one coin per year. It has reached a ledge marked AGE 95, and the pile is getting thin. ${C(s)} laughs. "I'm not going to live that long." A pause. "Am I?" The Dragon stops counting and looks up.`,
      choices: [
        { label: 'Plan to an age that feels comfortable', kind: 'through', hint: 'A tidy number. People keep outliving tidy numbers.', eff: { momentum: 1, debt: { tag: 'guessed_key', sev: 1 } }, result: 'You pick a reasonable-sounding age. The plan looks lovely, right up to the edge of the page, where the Dragon is still counting.' },
        { label: 'Show them the long version, gently', kind: 'prepare', eff: (s) => (comm(s) || PP.skill(s, 'judgment') > 0 ? { insight: 2, trust: 1 } : { insight: 2, trust: -1 }), result: (s) => (comm(s) || PP.skill(s, 'judgment') > 0 ? `You walk to the ledge together, right past the Dragon. "Good news: you might get a long life. Let's make sure the money gets one too." ${C(s)} smiles at that. The Dragon goes back to sleep.` : `The numbers are right, but they land like a lecture, with the Dragon nodding along. ${C(s)} looks tired.`) },
        { label: 'Ask what a long life would look like for them', kind: 'prepare',
          then: { text: (s) => { const g = s.client.checkin && s.client.checkin.goal; return `${C(s)} sits on the ledge. The Dragon, surprisingly polite, scoots over. ` + (g ? g.text : '"I don\'t know. Being useful? Not being a burden?"'); },
            choices: [
              { label: '"Then that is what we plan for."', kind: 'prepare', eff: (s) => { const g = s.client.checkin && s.client.checkin.goal; return Object.assign({ trust: 2, insight: 1 }, g && g.fact ? { fact: g.fact } : {}); }, result: 'It is the first time the plan sounds like their life instead of a spreadsheet. The Dragon, with nothing left to brood over, starts to snore.' },
              { label: 'Write it down and keep walking', kind: 'around', eff: { insight: 1 }, result: 'One line in your notes. You will come back to it. The Dragon will be waiting.' }
            ] } },
        { label: 'Check Olu\'s checklist', kind: 'help', item: 'checklist', show: holding('checklist'), eff: (s) => ({ insight: 1, momentum: 1, clearDebt: oldestDebt(s) }), result: 'Line 12 of Olu\'s checklist: "Did you plan for a long life? Longer than that? Have you checked on the dragon?" You fix the one thing you had glossed over.' }
      ]
    },
    {
      id: 'caves_family_way', title: 'The softest treasure', at: ['caves'],
      text: (s) => `In the deepest corner of the hoard, among the gold, is a little kitchen scene: a parent at the table, a pill organizer, a calendar full of appointments. The Dragon is curled protectively around it. A sign reads WHAT IF SOMEONE YOU LOVE NEEDS CARE? ${C(s)} goes quiet.`,
      choices: [
        { label: 'Explain what care costs, with numbers', kind: 'through', hint: 'Useful. Possibly too much, too soon. The Dragon bristles.', eff: (s) => (comm(s) ? { trust: 1, insight: 1 } : { trust: -2, insight: 1 }), result: (s) => (comm(s) ? 'You keep it short and human. The Dragon uncurls a little. They take it in.' : `The Dragon snorts a plume of smoke. ${C(s)} folds their arms. "Can we not do this part right now?"`) },
        { label: 'Ask about the people in their life', kind: 'prepare',
          then: { text: (s) => `${C(s)} talks about family: who looks after whom, who never calls, who would drop everything. The Dragon listens, chin on its claws. ` + (worry(s) ? `Then, almost to themselves: ${open(s) ? worry(s).text : (worry(s).guarded || worry(s).text)}` : '"I suppose I\'ve never really thought about it."'),
            choices: [
              { label: '"Thank you for telling me that."', kind: 'prepare', preview: 'With Curiosity or Trust 6+, you learn what is really on their mind.',
                eff: (s) => { const w = worry(s); R.fam = open(s) && !!(w && w.fact); return R.fam ? { trust: 2, insight: 2, fact: w.fact } : { trust: 1, insight: 1, fact: s.client.stakeholderFact }; },
                result: (s) => (R.fam ? `The Dragon sighs, and settles. Now you know what this plan really has to handle: ${label(s, worry(s).fact)}.` : `You learn who matters most here: ${s.client.stakeholder}. The rest can wait for another day.`) },
              { label: 'Keep it light and move on', kind: 'around', eff: { trust: 1 }, result: 'They seem relieved to step back into the light. The Dragon curls back around its treasure.' }
            ] } },
        { label: 'Leave that corner for another day', kind: 'around', eff: { trust: 1, debt: { tag: 'guessed_key', sev: 1 }, style: { avoid: 1 } }, result: 'Easier today. The Dragon will still be curled there, and so will whatever it is guarding.' }
      ]
    },

    /* ================= Specialist Summit: the Summit Sphinx =================
     * Three riddles, and allow three to five business days. Real thing: specialist
     * reviews and approvals. A prepared case file makes her riddles easy. */
    {
      id: 'summit_waiting', title: 'The Sphinx is thinking', at: ['summit'],
      text: (s) => `You answered the Sphinx's riddle. She said "Hmm." It is now day four. ${C(s)} has asked twice whether there is any news. A sign between her paws reads: "Your answer is in the queue. Your position in the queue is: yes."`,
      choices: [
        { label: 'Send a polite follow-up', kind: 'prepare', preview: '50% it nudges things along. 50% it goes to the back of the queue.',
          eff: () => (roll('wait', 0.5) ? { days: 1, insight: 1 } : { days: 2, momentum: -1 }),
          result: () => (R.wait ? 'The next morning the Sphinx opens one eye. "Thank you for the nudge. I am just finishing my ponder."' : 'The Sphinx replies with a riddle: "What is received, and added, and waits?" Your follow-up. At the back of the queue. Hmm.') },
        { label: 'Make your best guess and keep moving', kind: 'through', hint: 'Fast. If you guessed right, the Sphinx will never mention it.', eff: { momentum: 2, debt: { tag: 'guessed_key', sev: 2 } }, result: 'You fill in her answer yourself and tiptoe past her paws. The real answer, when it comes, may or may not match.' },
        { label: 'Use the wait to sit down with the client', kind: 'prepare', eff: { days: 1, trust: 1 },
          then: { text: (s) => `With nothing to do but wait under a Sphinx, you and ${C(s)} actually talk. Not about the plan. At some point they say, "Can I ask you something I've been embarrassed to ask?" The Sphinx pretends very hard not to listen.`,
            choices: [
              { label: '"Of course."', kind: 'prepare', eff: (s) => { R.sw = unknown(s); return R.sw ? { insight: 2, trust: 1, fact: R.sw } : { insight: 1, trust: 1 }; }, result: (s) => (R.sw ? `It is a simple question, and the answer matters to them. Along the way, you learn about ${label(s, R.sw)}. The Sphinx makes a note: your case file just got better.` : 'It is a simple question. You answer it simply. They look relieved.') },
              { label: '"Can it wait until we hear back?"', kind: 'through', eff: { momentum: 1, trust: -1 }, result: '"Sure," they say. They do not ask again. The Sphinx, who loves a question, looks disappointed in you.' }
            ] } },
        { label: 'Ask Dev to nudge the queue', kind: 'help', contact: 'specialist', show: ready('specialist'), eff: { momentum: 1, insight: 1 }, result: 'Dev knows the Sphinx from way back. They swap riddles for a minute. The answer comes down the mountain by lunch.' }
      ]
    },
    {
      id: 'summit_one_more_doc', title: 'One more riddle', at: ['summit'],
      text: (s) => `The Sphinx needs one more thing before she can answer. "What is last year's, and printed, and lives in a drawer?" Last year's statement. ${C(s)} sends it. Then: "What is older still?" The year before. Then a signed letter. Then a riddle that seems to mean "the other thing."`,
      choices: [
        { label: 'Ask the client for each one as it comes up', kind: 'around', eff: { trust: -1, days: 1, insight: 1 }, result: (s) => `${C(s)}, on the fourth riddle: "Is there a list? Could there have been a list?"` },
        { label: 'Push back: ask for every riddle at once', kind: 'prepare',
          then: { text: 'The Sphinx pauses. "Fair. Honestly, I did not know my next riddle until I heard your last answer." She sends a list. It is seven riddles long. One of them is "explain riddle 3."',
            choices: [
              { label: 'Go through the list with the client in one sitting', kind: 'prepare', eff: { energy: -1, momentum: 1, trust: 1, insight: 1 }, result: 'One call, seven answers, one tidy case file. The Sphinx looks almost impressed. Riddle 3 turns out to be a typo.' },
              { label: 'Send the client the list and let them sort it', kind: 'through', eff: { momentum: 1, debt: { tag: 'confused_client', sev: 1 } }, result: (s) => `${C(s)} gets seven riddles. They solve four. They send six documents. Close enough? The Sphinx raises one eyebrow.` },
              { label: 'Bring Dev in to translate the list', kind: 'help', contact: 'specialist', show: ready('specialist'), eff: { momentum: 1, insight: 2 }, result: 'Dev turns seven riddles into seven plain sentences. The client sends everything in an afternoon. The Sphinx has nothing left to ask.' }
            ] } },
        { label: 'Send everything you have, all at once', kind: 'through', eff: { momentum: 1, debt: { tag: 'bad_handoff', sev: 1 } }, result: '"Please find attached: everything." You can hear the Sphinx sigh from the top of the mountain.' }
      ]
    },
    {
      id: 'summit_disagree', title: 'Two Sphinxes', at: ['summit'],
      text: (s) => `It turns out there are two Sphinxes at the Summit. They look at ${C(s)}'s situation and give two different answers. Both are very sure. Both are very senior. Both are looking at you, tails twitching.`,
      choices: [
        { label: 'Go with the older Sphinx', kind: 'through', hint: 'Rank is not the same as fit.', eff: { momentum: 1, debt: { tag: 'guessed_key', sev: 1 } }, result: 'The older Sphinx wins. The younger one shrugs. "Your riddle. Your answer."' },
        { label: 'Ask each: "What would change your mind?"', kind: 'prepare',
          then: { text: 'It turns out they are not really disagreeing. Each one is answering a slightly different riddle about the client\'s life. One assumes nothing big is about to change. The other assumes something is.',
            choices: [
              { label: 'Check with the client which is true', kind: 'prepare', eff: (s) => ({ momentum: -1, insight: 2, trust: 1, fact: s.client.keyFact }), result: (s) => `You ask ${C(s)} directly, which neither Sphinx had thought to do. Their answer settles it: ${label(s, s.client.keyFact)}.` },
              { label: 'Pick the assumption that seems likelier', kind: 'through', eff: (s) => (K(s, s.client.keyFact) ? { momentum: 1, insight: 1 } : { momentum: 1, debt: { tag: 'guessed_key', sev: 2 } }), result: (s) => (K(s, s.client.keyFact) ? 'You already know which one is true. You answer both Sphinxes in a sentence. They purr.' : 'You pick. It seems likely. Both Sphinxes narrow their eyes. "Seems likely" is doing a lot of work.') }
            ] } },
        { label: 'Put the client in the room with both', kind: 'around', preview: 'With Communication, 70% it clarifies things. Otherwise more likely to leave the client confused.',
          eff: (s) => (roll('dis', comm(s) ? 0.7 : 0.4) ? { trust: 1, insight: 2, energy: -1 } : { insight: 1, energy: -1, debt: { tag: 'confused_client', sev: 2 } }),
          result: (s) => (R.dis ? `${C(s)} listens to both Sphinxes and asks the one question that settles it. The Sphinxes are delighted. Brilliant.` : `${C(s)} leaves the Summit more confused than they came in. "So... even the Sphinxes don't know?"`) }
      ]
    },

    /* ================= The Login Isles: the Password Kraken =================
     * Every tentacle wants a different code. Real thing: logins, portals, passwords,
     * and the scams that live among them. */
    {
      id: 'isles_two_factor', title: 'The Kraken has their phone', at: ['isles'],
      text: (s) => `${C(s)} needs to approve something in the portal. A tentacle rises from the water: the security code has been sent to their old phone. Their old phone is, they explain, at the bottom of the sea. The Kraken holds it up and waves it, smugly.`,
      choices: [
        { label: 'Walk them through account recovery', kind: 'prepare', eff: { energy: -2, days: 1, trust: 1 }, result: 'A day of security questions, ID photos and hold music, while the Kraken tries a new tentacle every hour. Then: access. Real, proper, secure access.' },
        { label: '"Just read me your password and I\'ll sort it"', kind: 'through', hint: 'So much faster. So much worse. The Kraken is listening.', eff: { momentum: 2, debt: { tag: 'fraud', sev: 2 } }, result: 'You have their password now. It is their pet\'s name and 123. Somewhere under the waves, a tentacle takes notes.' },
        { label: 'Switch to paper for this one', kind: 'around', eff: { days: 2, momentum: -1 }, result: 'The paper form arrives in two days, by boat, the long way round. The Kraken keeps the phone.' },
        { label: 'Call Kenji', kind: 'help', contact: 'whisperer', show: ready('whisperer'), eff: { momentum: 1, trust: 1 }, result: 'Kenji resets it in four minutes, then tells the Kraken firmly: "Never again with the phone." It sinks, sulking.' },
        { label: 'Your tech setup has a backup method', kind: 'help', show: (s) => hasSys(s, 'tech'), eff: { momentum: 1, trust: 1 }, result: 'A verified backup method, set up months ago for exactly this. The tentacle sinks without a fight. In you go.' }
      ]
    },
    {
      id: 'isles_fake_you', title: 'The tentacle wearing your face', at: ['isles'],
      text: (s) => `${C(s)} forwards you a message. It is from you. It asks them to upload their documents to a new link, urgently, and it has your photo. You did not send it. Out in the water, one of the Kraken's tentacles is wearing a very bad paper mask of your face.`,
      choices: [
        { label: 'Check it together, carefully', kind: 'prepare',
          then: { text: (s) => `You walk ${C(s)} through it: the sender address is off by one letter, the link goes somewhere strange, and the mask has your ears on upside down. "So how do I know when it's really you?" they ask. Good question.`,
            choices: [
              { label: 'Agree on how to check it is really you', kind: 'prepare', eff: { trust: 2, energy: -1, insight: 1 }, result: 'Anything urgent gets a phone call, on the number they already have. They write it on a sticky note and look calmer. The tentacle drops its mask in the sea.' },
              { label: 'Report it to Operations and move on', kind: 'around', eff: { momentum: -1, insight: 1 }, result: 'Operations thanks you and sends a warning memo to everyone. The memo looks a bit like a Kraken wrote it too.' }
            ] } },
        { label: '"Just ignore it, it\'s nothing"', kind: 'through', hint: 'Probably nothing. The Kraken owns a lot of masks.', eff: { momentum: 1, debt: { tag: 'fraud', sev: 2 } }, result: (s) => `${C(s)} deletes it. Next week there is another one, with a much better mask.` },
        { label: 'Tell them to change every password, today', kind: 'around', eff: { days: 1, trust: -1, insight: 1 }, result: 'They change everything. Then they are locked out of everything. Safe, at least. Grumpy, definitely. Even the Kraken looks sorry for them.' },
        { label: 'Forward it to Kenji', kind: 'help', contact: 'whisperer', show: ready('whisperer'), eff: { insight: 1, trust: 1 }, result: 'Kenji blocks the sender, unmasks two more tentacles, and sends your client a one-line guide: "The real one never says urgent."' }
      ]
    },
    {
      id: 'isles_portals', title: 'Fourteen tentacles', at: ['isles'], cut: 'isles',
      text: (s) => `${C(s)} has accounts in fourteen different places. The Password Kraken rises with fourteen tentacles, one per portal, each wanting its own password, its own security question, and its own idea of what a "statement" is. ${C(s)} would like you to just see everything, in one place, please.`,
      choices: [
        { label: 'Have them put every login in a shared document', kind: 'through', hint: 'Convenient. Very, very convenient. For the Kraken too.', eff: { momentum: 2, debt: { tag: 'fraud', sev: 2 } }, result: 'One document. Fourteen passwords. Shared with you, possibly their book club, and very possibly the Kraken.' },
        { label: 'Sit together and untangle each tentacle', kind: 'prepare', eff: (s) => { R.por = unknown(s); return { energy: -2, insight: 2, fact: R.por }; }, result: (s) => 'Fourteen tentacles, three password resets, and one forgotten account with money in it, clutched in the smallest tentacle.' + (R.por ? ` Along the way, you learn about ${label(s, R.por)}.` : '') },
        { label: 'Ask them to download statements and send them over', kind: 'around', preview: 'They arrive in a day. Half the time, some are from the wrong year (hidden risk).',
          eff: () => (roll('port', 0.5) ? { days: 1, insight: 1 } : { days: 1, insight: 1, debt: { tag: 'stale_info', sev: 1 } }),
          result: 'A pile of files arrives, named "download (1)" through "download (14)", all slightly damp.' },
        { label: 'Focus on the three biggest, skip the rest', kind: 'through', eff: { momentum: 1, insight: 1, debt: { tag: 'stale_info', sev: 1 } }, result: 'Three tentacles, untangled by lunch. The other eleven wait under the water, quietly collecting surprises.' }
      ]
    },

    /* ================= Annual Review Toll Bridge: the Toll Troll =================
     * Nobody crosses until their file is current. He checks the dates. Twice. */
    {
      id: 'toll_initials', title: 'Initial here, here, and here', at: ['toll'],
      text: (s) => `The Toll Troll slides a stack of forms across his counter under the bridge. Thirty-seven places to initial. He licks a thumb and checks the dates. Twice. ${C(s)} picks up the pen, then stops. "What am I actually signing?"`,
      choices: [
        { label: '"Standard stuff, don\'t worry about it"', kind: 'through', eff: { momentum: 2, debt: { tag: 'confused_client', sev: 2 } }, result: 'Thirty-seven initials in four minutes. Impressive wrist work. The Troll stamps it. Nobody has any idea what any of it says.' },
        { label: 'Explain every page', kind: 'prepare', eff: { energy: -2, days: 1, trust: 2 }, result: 'Every page, every initial. It takes all day. The Troll follows along like it is a good film, and dabs his eyes at page twenty.' },
        { label: 'Explain the three pages that actually matter', kind: 'prepare', show: (s) => comm(s) || PP.skill(s, 'judgment') > 0, hint: 'Communication or Judgment: you know which three.', eff: { trust: 1, momentum: 1, insight: 1 }, result: '"These three matter. The rest are about the bridge." The Troll nods gravely: it is a very good bridge. They read the three. They ask one good question.' },
        { label: 'Give them a day to read it all', kind: 'around', eff: (s) => ({ days: 1, momentum: -1, trust: s.client.prefers === 'email' ? 2 : 1 }), result: (s) => (s.client.prefers === 'email' ? 'They read every page, with notes. You get one email with nine excellent questions. The Troll asks to be copied in.' : 'They read some of it. They feel respected, which matters more. The Troll approves.') }
      ]
    },
    {
      id: 'toll_anything_changed', title: '"Has anything changed?"', at: ['toll'],
      text: (s) => `The Troll reads from a card, very slowly: "Has. Anything. Changed. Since. Last. Year?" ${C(s)} says, "Nope." The Troll looks at you. You look at ${C(s)}. Something about the way they said it.`,
      choices: [
        { label: 'Accept "nope" and move along', kind: 'through', eff: { momentum: 1, debt: { tag: 'stale_info', sev: 2 } }, result: '"Nope" goes on the form. The Troll stamps it, sniffs it, and frowns slightly. The file is not as current as it looks.' },
        { label: 'Ask three specific questions instead', kind: 'prepare',
          then: { text: (s) => `"Anything new at work? At home? Anyone new depending on you?" ${C(s)} pauses on the second one. "Well... apart from..." And out comes a thing they had not thought of as a change. The Troll leans in.`,
            choices: [
              { label: 'Follow it up properly', kind: 'prepare', eff: (s) => { R.chg = unknown(s); return R.chg ? { insight: 2, trust: 1, fact: R.chg, energy: -1 } : { insight: 1, trust: 1 }; }, result: (s) => (R.chg ? `It is a change. A real one: ${label(s, R.chg)}. The Troll writes it down, tongue between his teeth.` : 'It is a small change, and you already knew about it. Still, they feel listened to. So does the Troll.') },
              { label: 'Note it and keep the review short', kind: 'around', eff: { insight: 1, momentum: 1 }, result: 'Noted. You will come back to it. The Troll taps the note meaningfully: he will be checking.' }
            ] } },
        { label: 'Mention what you already know has changed', kind: 'prepare', show: (s) => K(s, s.client.keyFact), hint: 'You did the work earlier. Now it pays.', eff: { trust: 2, momentum: 1 }, result: (s) => `"Well, there's ${label(s, s.client.keyFact)}." ${C(s)} blinks. "Oh. Right. I guess that counts." The Troll looks impressed, and checks the date anyway.` }
      ]
    },
    {
      id: 'toll_wrong_date', title: 'Thirty-four days', at: ['toll'],
      text: 'The Troll taps one page with a long, mossy fingernail. "This form is dated last month. Rules say within thirty days of today. It is thirty-four." He counts again on his knobbly fingers. Still thirty-four. There is a pen right there.',
      choices: [
        { label: 'Just change the date', kind: 'through', hint: 'Four days. Who would ever know?', eff: { momentum: 1, debt: { tag: 'rushed_pace', sev: 3 } }, result: 'You change it. The Troll happens to be looking the other way, at a duck. Somebody, someday, will not be.' },
        { label: 'Redo the form with the client', kind: 'prepare', eff: (s) => ({ days: 1, energy: -1, trust: s.res.trust >= 5 ? 1 : 0 }), result: (s) => `${C(s)} signs a fresh copy. The Troll checks the date twice and beams. "Thanks for doing it properly," ${C(s)} says, and seems to mean it.` },
        { label: 'Argue with the Troll', kind: 'around', preview: '30% the Troll lets it go. 70% you lose a day and look a bit silly.',
          eff: () => (roll('date', 0.3) ? { momentum: 1 } : { days: 1, trust: -1 }),
          result: () => (R.date ? '"Fine," says the Troll. "Thirty-four is close to thirty. Don\'t tell the other trolls."' : 'The Troll listens to your whole argument, nodding, then points at the rule again. Your client watched the entire thing.') },
        { label: 'Ask Olu to sort it', kind: 'help', contact: 'operator', show: ready('operator'), eff: { momentum: 1 }, result: 'Olu has a fresh copy pre-filled and on its way before you hang up. The Troll is so pleased he lets you pet his goat.' }
      ]
    },
    {
      id: 'toll_skip_review', title: '"Do we have to?"', at: ['toll'], cut: 'bridge',
      text: (s) => `${C(s)} eyes the bridge, and the Troll underneath it doing his stretches. "Do we really have to do the review? Nothing's changed. I'd honestly rather just go."`,
      choices: [
        { label: 'Skip it this year', kind: 'through', eff: { momentum: 2, trust: 1, debt: { tag: 'stale_info', sev: 2 } }, result: 'The Troll shrugs and waves you through. "Your funeral. I\'ll keep the old file warm." Charming Troll.' },
        { label: 'Make it fifteen minutes and one question', kind: 'prepare',
          then: { text: (s) => `"Fifteen minutes. One question: what surprised you this year?" The Troll flips an egg timer. ${C(s)} thinks. Then laughs. "Honestly? Lots of things."`,
            choices: [
              { label: 'Ask about the biggest surprise', kind: 'prepare', eff: (s) => { R.sk = unknown(s); return R.sk ? { insight: 2, fact: R.sk, trust: 1 } : { insight: 1, trust: 1 }; }, result: (s) => (R.sk ? `Fifteen minutes becomes forty. The Troll turns the egg timer over twice. Worth it: ${label(s, R.sk)}.` : 'Nothing you didn\'t already know. Fifteen minutes, as promised. They appreciate that, and so does the Troll.') },
              { label: 'Keep your promise: wrap up at fifteen', kind: 'around', eff: { trust: 1, momentum: 1 }, result: 'Fifteen minutes on the dot. The egg timer dings. They are amazed: nobody has ever kept that promise to them. The Troll stamps the file CURRENT.' }
            ] } },
        { label: 'Do the full review anyway', kind: 'around', hint: 'Thorough. They did ask not to.', eff: { energy: -2, days: 1, insight: 2, trust: -1 }, result: (s) => `Every page, every account, every date checked twice by the Troll. ${C(s)} sighs through all of it, but you leave with a file that is actually current.` }
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
