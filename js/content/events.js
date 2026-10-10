/* Event deck. Each event is data:
 *
 *  id, title
 *  at:     landmark ids where it can fire, or ['travel'] for encounters on the trail
 *  first:  true = the event that greets you on a first visit to that landmark
 *  when:   optional (state) => boolean
 *  cut:    optional cut scene to play first (see trailscene.js)
 *  weight: optional, for encounters (default 1)
 *  text:   string or (state) => string
 *  choices: [{
 *     label, kind: 'through' | 'around' | 'prepare' | 'help'
 *     show:     optional (state) => boolean      (skills, contacts, items gate options)
 *     hint:     shown to players with Judgment   (a tradeoff hint, never the answer)
 *     eff:      effect object or (state) => effect object   (see PP.apply in core.js)
 *     result:   string or (state) => string
 *     then:     { text, choices }  -> the conversation continues (back-and-forth)
 *     minigame: run a mini-game; its result is applied, then eff
 *     contact / item: consumed when chosen
 *     preview:  what the Skeptic says when eff is random
 *  }]
 */
(function (PP) {
  const C = (s) => PP.clientName(s);
  const K = PP.knows;
  const keyAdmission = (s) => {
    const ci = s.client.checkin || {};
    const t = Object.values(ci).find((x) => x.fact === s.client.keyFact);
    return t ? t.text : '"There\'s something I haven\'t told you."';
  };
  const R = {}; // remembers what an eff decided, so result() can describe it
  const ciWorry = (s) => (s.client.checkin && s.client.checkin.worry) || null;
  const worryOpen = (s) => PP.skill(s, 'curiosity') > 0 || s.res.trust >= 6;
  const worryText = (s) => { const w = ciWorry(s); return w ? (worryOpen(s) ? w.text : (w.guarded || w.text)) : '"I don\'t even know which one scares me most."'; };

  PP.content.events = [
    /* ================= LANDMARKS ================= */

    /* ---- Meadows of Understanding ---- */
    {
      id: 'meadow_first_talk', title: 'The first real conversation', at: ['meadows'], first: true,
      text: (s) => `${C(s)} sits on a bench overlooking the meadow. ${s.client.opener} It is quiet here. This is your chance to understand what is actually going on.`,
      choices: [
        { label: 'Sit down and really talk', kind: 'prepare', minigame: 'conversation', hint: 'Costs energy. Insight lives here.', eff: { energy: -1 }, result: 'You head back to the trail with a lot to think about.' },
        { label: 'Skip the small talk and pitch the Grand Plan', kind: 'through', hint: 'Fast. You will be acting on assumptions.', eff: { momentum: 2, trust: -1, debt: { tag: 'premature_pitch', sev: 2 }, style: { avoid: 1 } }, result: (s) => `${C(s)} nods politely. "Sure. That sounds... comprehensive."` },
        { label: 'Hand over a questionnaire for later', kind: 'around', hint: 'Safe and slow. Forms miss tone.', eff: (s) => ({ momentum: -1, insight: 1, trust: s.client.prefers === 'email' ? 1 : -1 }), result: (s) => s.client.prefers === 'email' ? `${C(s)} loves a form. It comes back annotated.` : `${C(s)} fills in half of it on their phone.` }
      ]
    },
    {
      id: 'meadow_we', title: 'Who is "we"?', at: ['meadows', 'travel'],
      when: (s) => !K(s, s.client.stakeholderFact),
      text: (s) => `Mid-sentence, ${C(s)} says: ${s.client.we} Then moves right on to something else.`,
      choices: [
        { label: 'Stop and ask who else is involved', kind: 'prepare', hint: 'A small detour now.', eff: (s) => ({ momentum: -1, insight: 2, fact: s.client.stakeholderFact }), result: (s) => `It turns out ${s.client.stakeholder} matters a lot here.` },
        { label: 'Make a note and keep going', kind: 'through', hint: 'Notes are only as good as the follow-up.', eff: (s) => ({ momentum: 1, debt: { tag: 'unknown_stakeholder', sev: 2 }, missed: s.client.stakeholderFact }), result: 'You scribble "we = ?" in the margin. Momentum feels great.' },
        { label: 'Invite everyone to the next meeting', kind: 'around', show: (s) => PP.skill(s, 'communication') > 0, hint: 'Communication: slower, but it builds trust.', eff: (s) => ({ momentum: -2, trust: 2, fact: s.client.stakeholderFact }), result: (s) => `${C(s)} looks relieved. "Honestly? That would help."` }
      ]
    },

    /* ---- Veteran's Lighthouse ---- */
    {
      id: 'lighthouse_marge', title: 'Tea with the keeper', at: ['lighthouse'], first: true,
      text: 'The keeper pours you a tea strong enough to stand a spoon in. "Long trip so far? Sit. Tell me where you think you\'re going."',
      choices: [
        { label: 'Talk through your plan with her', kind: 'help', hint: 'Help is rarely free, but it is often cheap.', eff: { insight: 1, style: { soloist: -1 } },
          then: { text: (s) => s.debt.length ? `She taps your notes. "This bit here. ${PP.content.debts[s.debt[0].tag].label}. That'll come back, you know." She refills your tea. "Want to fix it now, or find out later?"` : '"Honestly? Looks clean. Don\'t get cocky. Anything you haven\'t asked the client yet?"',
            choices: [
              { label: 'Fix it now, while you\'re here', kind: 'prepare', show: (s) => s.debt.length > 0, eff: (s) => ({ energy: -1, days: 1, clearDebt: s.debt[0].tag }), result: 'It takes a day at her kitchen table. One less thing following you.' },
              { label: 'Ask for her best advice', kind: 'help', eff: (s) => (PP.skill(s, 'judgment') < 2 ? { skill: { judgment: 1 } } : { insight: 1 }), result: '"Shortcuts are loans. Know who you\'re borrowing from." You write it down.' },
              { label: 'Thank her and get going', kind: 'through', eff: { momentum: 1 }, result: 'She waves you off with a biscuit for the road.' }
            ] } },
        { label: 'Rest here a day', kind: 'prepare', hint: 'Energy back, momentum slips.', eff: { energy: 3, days: 1, momentum: -1 }, result: 'You nap in a chair shaped like a whale. Refreshing.' },
        { label: 'Climb the tower and study the land', kind: 'prepare', eff: { energy: -1, reveal: true }, result: 'From the lamp room, the fog thins. You can see the whole region, all the way to the X.' }
      ]
    },

    /* ---- Relation-Ship Wreck (side trail) ---- */
    {
      id: 'wreck_sirens', title: 'The Sirens of the Quick Close', at: ['wreck'], first: true, cut: 'sirens',
      text: 'On the rocks, three sirens sing: "Close it to-day! Close it to-day! Sign right here and sail a-way!" It is incredibly catchy. Beside the wreck, a soggy agent sits on a crate.',
      choices: [
        { label: 'Follow the song', kind: 'through', hint: 'Fastest route to a signature. Not always to a client.', eff: { momentum: 3, trust: -2, debt: { tag: 'assumed_goal', sev: 3 } }, result: 'You hum it for the next three days. Your client watched the whole thing.' },
        { label: 'Ask the soggy agent what happened', kind: 'prepare',
          then: { text: '"Had a great client. Heard the song, closed in a day. Wrong plan, wrong time. They left, told their friends." He wrings out his tie. "Ask more questions than you think you need to. That\'s all I\'ve got."',
            choices: [
              { label: 'Help him off the rocks', kind: 'help', eff: { energy: -1, trust: 1, insight: 1 }, result: 'Your client saw that. They look at you a little differently.' },
              { label: 'Thank him and head back', kind: 'around', eff: { insight: 1 }, result: 'You leave with your ears plugged and a lesson.' }
            ] } },
        { label: 'Plug your ears and turn back', kind: 'around', eff: { energy: -1 }, result: 'Wasted a trip, but your plan is intact.' }
      ]
    },

    /* ---- Fog of Forgotten Info ---- */
    {
      id: 'fog_forgot', title: 'The Fog of Forgotten Info', at: ['fog'], first: true, cut: 'fog',
      text: (s) => `Fog rolls over the trail. Did ${C(s)} say "next year" or "next month"? You genuinely can't remember. Neither can they, apparently.`,
      choices: [
        { label: 'Go with your best guess', kind: 'through', hint: 'Fast and confident. Possibly wrong.', eff: { momentum: 1, debt: { tag: 'timeline', sev: 2 }, style: { avoid: 1 } }, result: '"Next year." Probably. Sure.' },
        { label: 'Ask the client again', kind: 'prepare', hint: 'Asking twice costs a little credibility, unless you ask well.', eff: (s) => ({ insight: 1, trust: PP.skill(s, 'communication') > 0 ? 0 : -1, momentum: -1 }), result: (s) => PP.skill(s, 'communication') > 0 ? '"Just want to get this exactly right." No harm done.' : `${C(s)}: "I told you that already?" Slightly awkward.` },
        { label: 'Check your battered notebook', kind: 'help', item: 'notebook', show: (s) => PP.hasItem(s, 'notebook'), eff: { insight: 1 }, result: 'Page four, underlined twice: "NEXT MONTH." Past you is a hero.' }
      ]
    },

    /* ---- Loop of Endless Data Entry ---- */
    {
      id: 'loop_reentry', title: 'The same form, again', at: ['loop'], first: true, cut: 'loop',
      text: (s) => `The trail curves, and curves, and curves. A sign: "Please re-enter all of ${C(s)}'s information." You entered it two days ago. And at the port. And on a napkin.`,
      choices: [
        { label: 'Copy-paste everything from last time', kind: 'through', hint: 'Fast, if last time was right.', eff: () => (PP.chance(0.4) ? { momentum: -1, days: 1, debt: { tag: 'stale_info', sev: 2 } } : { momentum: 1, debt: { tag: 'stale_info', sev: 2 } }), preview: 'Quick, adds hidden risk, and 40% of the time the loop sends you round again (lose a day).', result: (s) => 'Pasted. The trail straightens out. Or did it loop? You can\'t tell.' },
        { label: 'Go through the shoebox of paperwork properly', kind: 'prepare', minigame: 'factFind', hint: 'Sort what\'s current, what needs updating, and what to ask about.', result: 'The paperwork is sorted. The trail straightens out.' },
        { label: 'Re-type everything, checking as you go', kind: 'prepare', eff: { energy: -2, insight: 1 }, result: 'Slow. Tedious. You catch an old address in the process.' },
        { label: 'Ask Olu if there is a way out of the loop', kind: 'help', contact: 'operator', show: (s) => PP.contactReady(s, 'operator'), eff: { momentum: 1, insight: 1 }, result: 'Olu: "There\'s a button. Nobody uses the button." There is a button.' }
      ]
    },

    /* ---- Product-First Cliffs (side trail) ---- */
    {
      id: 'cliffs_edge', title: 'Product-First Cliffs', at: ['cliffs'], first: true, cut: 'cliffs',
      text: 'A crowd of eager agents sprints toward the cliff edge, waving brochures and shouting product names. One by one they disappear over the side. Faintly, from below: "...but it has great features!"',
      choices: [
        { label: 'Join them: pitch the product right now', kind: 'through', hint: 'It feels like progress the whole way down.', eff: { momentum: 2, trust: -2, debt: { tag: 'premature_pitch', sev: 2 } }, result: (s) => `${C(s)} listens to the whole pitch, then asks, "But do I need that?" You don't know.` },
        { label: 'Stand at the edge and watch what happens', kind: 'prepare', eff: (s) => (PP.skill(s, 'judgment') < 2 ? { skill: { judgment: 1 }, energy: -1 } : { insight: 1 }), result: 'You watch three agents go over before they know what the client needs. Lesson learned, safely.' },
        { label: 'Turn around', kind: 'around', result: 'A day wasted, nobody hurt.' }
      ]
    },

    /* ---- Spreadsheet Swamp ---- */
    {
      id: 'swamp_sheet', title: 'The spreadsheet', at: ['swamp'], first: true, cut: 'swamp',
      text: (s) => s.client.spreadsheet + ' It all looks very official.',
      choices: [
        { label: 'Accept the assumptions and move on', kind: 'through', hint: 'Momentum now. The model may be answering the wrong question.', eff: (s) => ({ momentum: 2, debt: { tag: 'spreadsheet_assumptions', sev: 2 }, missed: s.client.spreadsheetFact }), result: 'Momentum rises. So does something you cannot see.' },
        { label: 'Ask what decision this is meant to support', kind: 'prepare', hint: 'Curiosity makes this question land.',
          then: { text: (s) => `${C(s)} pauses. "What decision? I mean... the future, I guess?" You can push a little further, or let it be.`,
            choices: [
              { label: '"What would change your mind?"', kind: 'prepare', eff: (s) => (PP.skill(s, 'curiosity') > 0 || s.res.trust >= 6 ? { insight: 2, momentum: -1, fact: s.client.spreadsheetFact } : { insight: 1, momentum: -1 }), preview: 'With Curiosity or Trust 6+, they tell you the real reason.', result: (s) => (PP.knows(s, s.client.spreadsheetFact) ? `The real answer has nothing to do with the spreadsheet: ${s.client.facts[s.client.spreadsheetFact].label.toLowerCase()}.` : `${C(s)} shrugs. You sense there is more, but not today.`) },
              { label: 'Let it be for now', kind: 'around', eff: { insight: 1 }, result: 'You note the question for later.' }
            ] } },
        { label: 'Rebuild the whole model yourself', kind: 'through', hint: 'You will understand it. It will cost you.', eff: (s) => ({ energy: -3, days: 1, insight: 1, style: { overcomplicate: 2 }, fact: s.client.spreadsheetFact }), result: 'You now own a 22-tab spreadsheet. You found something, but at what cost.' },
        { label: 'Call Marge: "What\'s the one number that matters?"', kind: 'help', contact: 'veteran', show: (s) => PP.contactReady(s, 'veteran'), eff: (s) => ({ insight: 2, fact: s.client.spreadsheetFact, style: { overcomplicate: -1 } }), result: 'Marge ignores thirteen tabs and points at one cell. She\'s right.' }
      ]
    },
    {
      id: 'swamp_one_more_tab', title: 'Just one more tab', at: ['swamp'],
      when: (s) => s.style.overcomplicate > 0,
      text: 'You feel the pull of the swamp. What if you modeled interest rates by lunar phase? Just to be thorough.',
      choices: [
        { label: 'Add the tab', kind: 'through', eff: { energy: -2, insight: 1, style: { overcomplicate: 1 } }, result: 'The moon does not affect interest rates. You now know this for sure.' },
        { label: 'Close the laptop', kind: 'around', eff: { momentum: 1, style: { overcomplicate: -1 } }, result: 'The swamp recedes slightly.' }
      ]
    },

    /* ---- Snake Pit of Unreturned Calls (side trail) ---- */
    {
      id: 'snakepit_calls', title: 'The Snake Pit of Unreturned Calls', at: ['snakepit'], first: true, cut: 'phones',
      text: 'The pit is full of ringing phones, coiled like snakes. Your other clients have been busy living: a new baby, a layoff, a birthday you nearly forgot. All of them want to hear from you.',
      choices: [
        { label: 'Climb in and get back to everyone', kind: 'prepare', minigame: 'lifeHappens', hint: 'Hard news needs a call. Big plans need a review. Celebrations get a card.', result: 'You climb out with a sore ear and a lot of grateful clients.' },
        { label: 'Let them ring', kind: 'through', eff: { momentum: 1, debt: { tag: 'missed_message', sev: 2 } }, result: 'The ringing fades behind you. For now.' },
        { label: 'Send one group text to everyone', kind: 'around', eff: { momentum: 1, trust: -1 }, result: '"Hi all! Circling back!" Three people reply "who is this?"' }
      ]
    },

    /* ---- Shifting Sands of Incentives ---- */
    {
      id: 'sands_change', title: 'The contest banner', at: ['sands'], first: true,
      text: (s) => `The dunes are plastered with banners. This quarter's sales contest: place enough of the featured product and win a week at a beach resort. Your manager has circled your name on the leaderboard. ${C(s)} is reading the banner too. "Is that... something I should have?"`,
      choices: [
        { label: 'Steer them toward the featured product', kind: 'through', hint: 'A bonus now. Is it right for them, or right for the leaderboard?', eff: { cash: 400, momentum: 1, trust: -2, debt: { tag: 'premature_pitch', sev: 2 }, style: { chase: 1 } }, result: (s) => `You climb two places on the leaderboard. ${C(s)} goes along with it, but keeps glancing back at the banner like it might explain itself.` },
        { label: '"Honestly? Maybe not. Let\'s find out what fits you first."', kind: 'prepare', hint: 'No trip. A client who remembers you said it.', eff: (s) => (worryOpen(s) ? { trust: 2, insight: 1, momentum: -1, fact: s.client.keyFact } : { trust: 2, momentum: -1 }), preview: 'With Curiosity or Trust 6+, they tell you what they actually need.', result: (s) => `${C(s)} blinks. "You'd say that with a beach on the line?" ` + (PP.knows(s, s.client.keyFact) ? `Then, more quietly, they tell you what is really going on: ${s.client.facts[s.client.keyFact].label.toLowerCase()}.` : 'They don\'t say much more today, but they remember it.') },
        { label: 'Tell them about the contest, openly, then talk about fit', kind: 'around', hint: 'Awkward to say. Easier to defend.', eff: (s) => ({ trust: PP.skill(s, 'communication') > 0 ? 2 : 1, insight: 1 }), result: '"Full disclosure: I\'d win a trip if you bought that. Here\'s why it might not be for you." It is the strangest sentence you have said all week. It works.' },
        { label: 'Walk past the banners without a word', kind: 'around', eff: { momentum: 1 }, result: (s) => `${C(s)} keeps looking back at the beach on the banner. You never explain. They wonder about it later.` }
      ]
    },
    {
      id: 'sands_initiative', title: 'Two short of quota', at: ['sands'],
      text: (s) => `Your phone buzzes. Your manager: "You're two sales short of quota this month, and this month's featured product is a great fit for ${C(s)}, isn't it?" You haven't finished understanding ${C(s)} yet.`,
      choices: [
        { label: 'Push it to make quota', kind: 'through', hint: 'Your manager will be happy until the client is not.', eff: { cash: 250, momentum: 1, trust: -1, debt: { tag: 'premature_pitch', sev: 2 }, style: { chase: 1 } }, result: (s) => `Quota made. ${C(s)} asks, twice, why this came up so suddenly.` },
        { label: 'Tell your manager it isn\'t a fit yet', kind: 'prepare', hint: 'Short-term pain. Long-term reputation.', eff: { energy: -1, insight: 1, trust: 1 }, result: 'Your manager sighs down the phone. "Fine. But next month..." You hang up and get back to the actual client, who overheard your half of the call.' },
        { label: 'Ask your manager what would make it a fit', kind: 'prepare', eff: { insight: 1 }, result: '"I mean, if they needed it, I guess." A pause. "Do they?" You don\'t know yet. Now you both know that.' }
      ]
    },

    /* ---- Caves of What-Ifs (side trail) ---- */
    {
      id: 'caves_process', title: 'The Caves of What-Ifs', at: ['caves'], first: true, cut: 'caves',
      text: (s) => `The cave mouth is cold, and somewhere inside a voice keeps asking, "...but what if?" ${C(s)} hangs back. "Do we have to go in there? I'd honestly rather not think about the bad stuff."`,
      choices: [
        { label: 'March through every scary scenario at once', kind: 'through', hint: 'Thorough on paper. A lot to hear in ten minutes.', eff: { insight: 1, trust: -2, energy: -1, debt: { tag: 'confused_client', sev: 1 } }, result: (s) => `Job loss, illness, a long life, a parent needing care: all of it, in ten minutes, with charts. ${C(s)} goes pale and stops asking questions.` },
        { label: 'Go in slowly, one what-if at a time', kind: 'prepare', hint: 'Slower. The real worry is usually a few tunnels in.',
          then: { text: (s) => `"What if work changed suddenly?" ${C(s)} thinks about it. "What if you were sick for a few months?" Each one gets smaller once it is said out loud. At the third, they stop and say: ${worryText(s)}`,
            choices: [
              { label: '"Is that the one that keeps you up at night?"', kind: 'prepare', preview: 'With Curiosity or Trust 6+, they tell you the whole thing.', eff: (s) => { const w = ciWorry(s); R.cave = worryOpen(s) && !!(w && w.fact); return R.cave ? { trust: 2, insight: 2, fact: w.fact } : { trust: 1, insight: 1 }; }, result: () => (R.cave ? `They nod. You spend the rest of the afternoon in that tunnel, together, and it turns out to be where the plan has to start.` : 'They shrug. "Maybe." The door is open a crack. You will come back to it.') },
              { label: 'Write the what-ifs down for next time', kind: 'around', eff: { insight: 1, trust: 1 }, result: 'A short list, in their handwriting. Less scary on paper than in the dark.' }
            ] } },
        { label: 'Sit at the cave mouth and just let them talk', kind: 'prepare', minigame: 'conversation', hint: 'Listen for the worry under the words.', eff: { energy: -1 }, result: 'By the time the lantern burns low, you know more about what scares them than any form could tell you.' },
        { label: 'Skip the cave and keep things upbeat', kind: 'around', hint: 'Everyone feels better today.', eff: (s) => ({ momentum: 1, debt: { tag: 'guessed_key', sev: 2 }, missed: s.client.keyFact, style: { avoid: 1 } }), result: 'Everyone is relieved. The plan now has a blind spot exactly the shape of whatever was in that cave.' }
      ]
    },

    /* ---- Specialist Summit ---- */
    {
      id: 'summit_question', title: 'The question from the summit', at: ['summit'], first: true, cut: 'summit',
      text: (s) => (K(s, s.client.keyFact)
        ? `The Specialist reads your notes. "${s.client.facts[s.client.keyFact].label}. Good. That changes the approach, and you already knew it."`
        : s.client.keyQuestion + ' You blink. Somewhere back on the trail, you think you heard something about that.') + (s.style.soloist >= 2 ? ' (The path up was icy. You took the hard way, alone.)' : ''),
      choices: [
        { label: 'Work through it with the Specialist', kind: 'help', show: (s) => K(s, s.client.keyFact), eff: (s) => ({ insight: 2, momentum: 1, energy: s.style.soloist >= 2 ? -2 : 0 }), result: 'You come down the mountain with a sharper plan.' },
        { label: 'Backtrack: ask the client directly', kind: 'prepare', show: (s) => !K(s, s.client.keyFact), hint: 'Costs momentum. Catching it yourself may build trust.', eff: (s) => ({ momentum: -2, trust: 1, insight: 1, fact: s.client.keyFact, energy: s.style.soloist >= 2 ? -2 : 0 }), result: (s) => `${C(s)}: "Oh! Yes, I mentioned that, didn't I? Thanks for catching it."` },
        { label: 'Adjust the plan with a reasonable guess', kind: 'around', show: (s) => !K(s, s.client.keyFact), hint: 'Plausible guesses are the most dangerous kind.', eff: { momentum: -1, debt: { tag: 'guessed_key', sev: 3 } }, result: 'You pencil in an assumption. It looks great on paper.' },
        { label: 'Proceed anyway', kind: 'through', show: (s) => !K(s, s.client.keyFact), eff: (s) => ({ momentum: 1, debt: { tag: 'guessed_key', sev: 3 }, style: { avoid: 1 }, missed: s.client.keyFact }), result: '"Probably not relevant," you say. The Specialist raises one eyebrow.' }
      ]
    },
    {
      id: 'summit_handoff', title: 'The handoff', at: ['summit'],
      text: (s) => `You need an expert's help with part of ${C(s)}'s situation. The expert can only help with what you pass along.`,
      choices: [
        { label: 'Write a proper handoff: what you know and what you don\'t', kind: 'prepare', hint: 'Only as good as your Insight.', eff: (s) => (s.res.insight >= 5 ? { energy: -1, insight: 1, momentum: 1 } : { energy: -1, debt: { tag: 'bad_handoff', sev: 1 } }), preview: 'Energy -1. If your Insight is low, the handoff will have gaps.', result: (s) => s.res.insight >= 5 ? 'The expert reads it once and asks one good question.' : 'You write what you can. It is shorter than you hoped.' },
        { label: 'Forward the whole email chain', kind: 'through', hint: '"See below."', eff: { momentum: 1, debt: { tag: 'bad_handoff', sev: 2 } }, result: '"See below." 47 messages below.' },
        { label: 'Skip the expert and do it yourself', kind: 'around', eff: { energy: -3, insight: 1, style: { soloist: 1 } }, result: 'You learn a lot. Slowly. Painfully.' },
        { label: 'Bring Dev in, with context', kind: 'help', contact: 'specialist', show: (s) => PP.contactReady(s, 'specialist'), eff: { insight: 2, momentum: 1, style: { soloist: -1 } }, result: 'Dev already knows the area and asks exactly the right follow-ups.' }
      ]
    },
    {
      id: 'summit_jargon', title: 'Explain it', at: ['summit', 'isles'],
      text: (s) => `The Specialist explains the options to ${C(s)} using the phrase "tax-advantaged sequencing optionality." ${C(s)} is nodding the way people nod when they are lost.`,
      choices: [
        { label: 'Translate it into plain language', kind: 'prepare', hint: 'Simple without being wrong is a skill.', eff: (s) => (PP.skill(s, 'communication') > 0 || PP.chance(0.5) ? { trust: 2, insight: 1 } : { trust: -1, debt: { tag: 'confused_client', sev: 1 } }), preview: 'With Communication: Trust +2. Without it, a coin flip.', result: 'You draw it on a napkin. Napkins are underrated.' },
        { label: 'Let the expert finish, it\'s their area', kind: 'through', eff: (s) => ({ momentum: 1, debt: { tag: 'confused_client', sev: s.client.complexity === 'high' ? 1 : 2 } }), result: 'Very thorough. Very long. Nods all round.' },
        { label: 'Send a one-page summary afterwards', kind: 'around', eff: { energy: -1, trust: 1 }, result: 'One page. Three bullets. One diagram. It gets stuck to a fridge.' }
      ]
    },

    /* ---- The Login Isles ---- */
    {
      id: 'isles_locked', title: 'Locked out', at: ['isles'], first: true, cut: 'isles',
      text: (s) => `${C(s)} is locked out of the portal. The reset email goes to an address that no longer exists. The security question asks for "your first pet's favorite color."`,
      choices: [
        { label: 'Walk them through it on the phone', kind: 'through', hint: 'Patience required, on both ends.', eff: (s) => ({ energy: -2, trust: PP.skill(s, 'communication') > 0 ? 1 : -1 }), result: (s) => PP.skill(s, 'communication') > 0 ? 'Forty minutes, but you stayed calm and so did they.' : 'Forty minutes. Someone said "I AM clicking it" more than once.' },
        { label: 'Switch to paper forms', kind: 'around', hint: 'Bulletproof. Glacial.', eff: { momentum: -1, days: 2 }, result: 'The forms are in the mail. Two days later, they arrive.' },
        { label: 'Call Kenji', kind: 'help', contact: 'whisperer', show: (s) => PP.contactReady(s, 'whisperer'), eff: { momentum: 1, trust: 1 }, result: 'Kenji fixes it in ninety seconds and refuses to explain how.' }
      ]
    },
    {
      id: 'isles_message', title: 'Suspicious messages', at: ['isles', 'travel'],
      text: (s) => `Your inbox lights up. Some of these are from ${C(s)}. Some of them only claim to be.`,
      choices: [
        { label: 'Work through the inbox carefully', kind: 'prepare', minigame: 'inbox', hint: 'Quick ones now, big news gets a call, paperwork to your assistant, verify anything odd.', result: 'Inbox cleared.' },
        { label: 'Act on everything, it\'s probably fine', kind: 'through', hint: 'It is probably fine.', eff: { momentum: 2, debt: { tag: 'fraud', sev: 3 } }, result: 'Everything is done. Very efficient. Hmm.' },
        { label: 'Escalate the whole lot to Operations', kind: 'around', eff: { momentum: -2, energy: 1 }, result: 'Operations sighs and sorts it. Safe, slow, slightly embarrassing.' },
        { label: 'Call Kenji', kind: 'help', contact: 'whisperer', show: (s) => PP.contactReady(s, 'whisperer'), eff: { insight: 1 }, result: 'Kenji glances at the headers. "That one\'s fake. Those are fine." Done.' }
      ]
    },

    /* ---- Annual Review Toll Bridge ---- */
    {
      id: 'toll_bridge', title: 'The Annual Review Toll Bridge', at: ['toll'], first: true, cut: 'bridge',
      text: (s) => `A troll in a green visor leans out of the toll booth. "Toll is: show me the file's up to date." The river below is fast and cold. ${s.res.insight >= 5 ? 'Your file is in decent shape.' : 'Your file is... thin.'}`,
      choices: [
        { label: 'Pay the toll: walk through the file together', kind: 'prepare', hint: 'Easy if you did the work earlier.', eff: (s) => (s.res.insight >= 5 ? { trust: 1, momentum: 1 } : { energy: -2, days: 1, insight: 1 }), preview: 'With Insight 5+: smooth. Otherwise a day of catch-up.', result: (s) => (s.res.insight >= 5 ? 'The troll nods at every page. "Tidy." The gate swings open.' : 'A long day of digging up what you should have collected earlier. The troll waits, eating a sandwich.') },
        { label: 'Ford the river, skip the review', kind: 'through', hint: 'Wet, fast, and you might lose something.', eff: () => (PP.chance(0.35) ? { momentum: -1, energy: -2, trust: -1, debt: { tag: 'rushed_pace', sev: 2 } } : { momentum: 2, debt: { tag: 'rushed_pace', sev: 2 } }), preview: 'Fast, adds hidden risk, and 35% of the time you slip (Energy -2, Trust -1).', result: 'Splash. You make it across. Mostly dry. Mostly.' },
        { label: 'Wait for the ferry', kind: 'around', eff: { days: 2, energy: 2, momentum: -1 }, result: 'Two days on the riverbank. Restful. The client keeps checking their watch.' },
        { label: 'Ask Olu to get the file ready', kind: 'help', contact: 'operator', show: (s) => PP.contactReady(s, 'operator'), eff: { momentum: 1, trust: 1 }, result: 'Olu shows up with a binder. The troll salutes.' }
      ]
    },

    /* ================= ON THE TRAIL ================= */
    {
      id: 'road_change_of_mind', title: 'Change of mind', at: ['travel'],
      when: (s) => s.day >= 5 && !K(s, s.client.keyFact),
      text: (s) => `The trail shifts under your boots. So does ${C(s)}. ${s.client.changeOfMind}`,
      choices: [
        { label: 'Defend the current plan', kind: 'through', hint: 'Sunk cost feels like commitment.', eff: { momentum: 1, trust: -2, debt: { tag: 'ignored_change', sev: 2 } }, result: '"The plan is still solid," you say. The client sounds unconvinced.' },
        { label: 'Ask what changed, and why', kind: 'prepare', eff: (s) => ({ momentum: -1, insight: 2, trust: 1, fact: s.client.keyFact }), result: 'It turns out this was coming for a while. Now the picture is clearer.' },
        { label: 'Restart discovery from scratch', kind: 'around', hint: 'Thorough. Expensive.', eff: (s) => ({ momentum: -3, days: 2, insight: 3, trust: 1, fact: Object.keys(s.client.facts) }), result: 'Two long days of conversation. Everything is on the table now.' },
        { label: 'Note it and carry on', kind: 'through', eff: { debt: { tag: 'ignored_change', sev: 2 }, style: { avoid: 1 } }, result: 'Noted. Carrying on.' }
      ]
    },
    {
      id: 'enc_rick', title: 'Slick Rick, top producer', at: ['travel'],
      text: 'A hiker in very expensive boots strides up. "Slick Rick, top producer! Where you headed, kid? Closed four deals this week. Want to know my secret?"',
      choices: [
        { label: 'Ask for his closing script', kind: 'through', eff: { momentum: 1, debt: { tag: 'premature_pitch', sev: 1 } }, result: 'He hands you a laminated card. It just says ALWAYS BE CLOSING, in three fonts.' },
        { label: 'Ask how those four clients are doing now', kind: 'prepare',
          then: { text: '"How they\'re...?" Rick\'s smile flickers. "Two cancelled. One stopped returning calls. The fourth was my cousin." He stares at the horizon for a while.',
            choices: [
              { label: 'Suggest he talk to the lighthouse keeper', kind: 'help', eff: { insight: 1, trust: 1 }, result: '"The lighthouse lady? ...Maybe." He walks off slower than he arrived. Your client noticed how you handled that.' },
              { label: 'Wish him luck', kind: 'around', eff: { insight: 1 }, result: 'You file that away.' }
            ] } },
        { label: 'Wave and keep walking', kind: 'around', result: 'Rick checks his smartwatch and power-walks away.' }
      ]
    },
    {
      id: 'enc_intern', title: 'A lost intern', at: ['travel'],
      text: 'A young person from Operations is wandering the trail with an armful of forms. "Is this the way back to the port? I\'ve been walking for three days. I think these are due."',
      choices: [
        { label: 'Walk with them and help sort the forms', kind: 'help', eff: (s) => ({ energy: -1, item: 'checklist', trust: 1 }), result: 'They peel off at the next crossroads and give you a laminated checklist as thanks. Your client liked seeing that.' },
        { label: 'Point them the right way', kind: 'around', eff: { trust: 0 }, result: '"Back that way, past the meadow." They trudge off, grateful.' },
        { label: 'Keep walking, you have a client', kind: 'through', eff: { momentum: 1, style: { soloist: 1 } }, result: 'They wave sadly as you go.' }
      ]
    },
    {
      id: 'enc_campfire_key', title: 'Campfire', at: ['travel'], cut: 'campfire', weight: 2,
      when: (s) => s.res.trust >= 6 && !K(s, s.client.keyFact),
      text: (s) => `Night on the trail. The fire crackles. ${C(s)} is quiet for a long time, then says: ${keyAdmission(s)}`,
      choices: [
        { label: 'Just listen', kind: 'prepare', hint: 'Sometimes the best question is none.', eff: (s) => ({ fact: s.client.keyFact, insight: 2, trust: 1 }), result: (s) => `You listen until the fire burns low. Now you understand: ${s.client.facts[s.client.keyFact].label.toLowerCase()}.` },
        { label: 'Reassure them with the plan you have', kind: 'through', eff: (s) => ({ trust: -1, missed: s.client.keyFact }), result: (s) => `${C(s)} nods and says "you're probably right." They go to bed. The moment is gone.` }
      ]
    },
    {
      id: 'enc_campfire', title: 'A quiet night', at: ['travel'], cut: 'campfire',
      when: (s) => s.res.trust < 6,
      text: (s) => `Night on the trail. ${C(s)} is scrolling their phone on the other side of the fire. It's a bit awkward.`,
      choices: [
        { label: 'Tell the story of your worst first month', kind: 'prepare', eff: { trust: 1, energy: -1 }, result: (s) => `${C(s)} laughs at the part about the fax machine. Something thaws.` },
        { label: 'Turn in early', kind: 'around', eff: { energy: 2 }, result: 'You sleep like a log. A log with a client.' }
      ]
    },
    {
      id: 'enc_peddler', title: 'The Plan Generator 3000', at: ['travel'],
      text: 'A peddler waves from a cart covered in blinking lights. "PLAN GENERATOR 3000! Type in a name, out comes a plan! No questions asked! That\'s the beauty!"',
      choices: [
        { label: 'Buy one ($300)', kind: 'through', eff: { cash: -300, momentum: 2, debt: { tag: 'assumed_goal', sev: 2 } }, result: 'It produces a 90-page plan for someone named CLIENT_NAME_HERE.' },
        { label: '"What does it ask the client?"', kind: 'prepare',
          then: { text: '"Ask? It doesn\'t ask! Asking is slow!" He leans in. "Between us, it\'s a mail merge."',
            choices: [
              { label: 'Laugh and move on', kind: 'around', eff: { insight: 1 }, result: 'Your client laughs too. "I\'d rather just talk to you."' },
              { label: 'Buy one anyway, for the lights ($300)', kind: 'through', eff: { cash: -300, momentum: 1, debt: { tag: 'assumed_goal', sev: 1 } }, result: 'The lights are very nice.' }
            ] } },
        { label: 'Keep walking', kind: 'around', result: '"Your loss! Version 4000 comes out next week!"' }
      ]
    },
    {
      id: 'enc_steve', title: 'A man called Steve', at: ['travel'], cut: 'steve', weight: 0.6,
      when: (s) => !s.password && s.day >= 4,
      text: 'A man in a cardigan is fishing in a creek that clearly has no fish in it. "Name\'s Steve," he says, without looking up.',
      choices: [
        { label: 'Ask what he\'s fishing for', kind: 'prepare',
          then: { text: '"Nothing. It\'s about the waiting." He looks at you sideways. "You seem all right. Want to know something nobody else knows?"',
            choices: [
              { label: '"Yes."', kind: 'prepare', eff: { password: true, insight: 1 }, result: '"Back channels," he says. "Every obstacle out there has a quiet way around it, if you know who to ask. My cousin keeps the lighthouse lamp. Another one runs the mail boat in the Login Isles. There\'s one with goats." He winks. "I have a lot of cousins." (Steve\'s back channels are open to you: new hidden passages at several landmarks, from now on.)' },
              { label: '"I\'m good, thanks."', kind: 'around', result: 'Steve shrugs and casts again.' }
            ] } },
        { label: 'Offer him some coffee', kind: 'help', item: 'thermos', show: (s) => PP.hasItem(s, 'thermos'), eff: { password: true, trust: 1 }, result: 'Steve sips. "Good coffee. Tell you what: at the lighthouse, the cliffs, the dunes and the Isles, ask for my cousins. Say Steve sent you. They know the quiet ways around." (Steve\'s back channels are open to you: new hidden passages at several landmarks, from now on.)' },
        { label: 'Leave him to it', kind: 'around', result: 'Steve does not notice you leave.' }
      ]
    },
    {
      id: 'enc_storm', title: 'Your week falls apart', at: ['travel'], cut: 'emails',
      text: 'The sky darkens and it starts raining calendar invites. Three clients want to move their meetings, the specialist can only do Tuesday, and your kid\'s game is Thursday at four.',
      choices: [
        { label: 'Rebuild the week, block by block', kind: 'prepare', minigame: 'calendar', hint: 'Prep before meetings. Specialist on Tue/Thu. Don\'t overbook.', result: 'The week holds together. Mostly.' },
        { label: 'Pull over and wait it out', kind: 'around', eff: { days: 1, momentum: -1, energy: 1 }, result: 'A day under a tarp. It passes.' },
        { label: 'Double-book and hope for the best', kind: 'through', eff: { momentum: 1, debt: { tag: 'missed_message', sev: 2 } }, result: 'Everything is on the calendar. Some of it twice.' }
      ]
    },
    {
      id: 'enc_stakeholder', title: 'A passenger with opinions', at: ['travel'],
      when: (s) => !K(s, s.client.stakeholderFact),
      text: (s) => `At a crossroads, ${s.client.shortStake} catches up and joins the hike. "${C(s)} said I should come along. I have some thoughts."`,
      choices: [
        { label: 'Listen to their thoughts', kind: 'prepare', eff: (s) => ({ insight: 1, momentum: -1, fact: s.client.stakeholderFact }), result: (s) => `${s.client.shortStake} has a lot of thoughts. Some of them are very important.` },
        { label: 'Politely suggest they wait for the next meeting', kind: 'around', eff: (s) => ({ trust: PP.skill(s, 'communication') > 0 ? 0 : -1, debt: { tag: 'unknown_stakeholder', sev: 1 } }), result: 'They head home, a bit put out.' },
        { label: 'Hand them the map and let them lead', kind: 'through', eff: (s) => ({ trust: 1, days: 1, style: { chase: 1 }, fact: s.client.stakeholderFact }), result: 'They take you on a scenic detour, but you learn a lot along the way.' }
      ]
    },
    {
      id: 'enc_hitchhiker', title: 'A hitchhiker in a fleece vest', at: ['travel'],
      when: (s) => !s.map.visited.summit,
      text: 'A hiker in a fleece vest with a laminated badge falls into step with you. "Specialist, heading back up to the Summit. Mind if I walk with you?"',
      choices: [
        { label: 'Walk together', kind: 'help', eff: { insight: 2, momentum: -1, style: { soloist: -1 } }, result: 'They answer three questions you didn\'t know you had.' },
        { label: 'Ask one quick question as they pass', kind: 'around', eff: { insight: 1 }, result: '"Good question," they say. You feel ten feet tall.' },
        { label: 'Push on alone, you\'ve got this', kind: 'through', eff: { momentum: 1, style: { soloist: 1 } }, result: 'They fall behind. The Summit looks a little icier.' }
      ]
    },
    {
      id: 'enc_coldfeet', title: 'Cold feet', at: ['travel'],
      text: (s) => `In the morning, ${C(s)} doesn't lace up their boots. "Maybe we should just... turn back? This feels like a lot."`,
      choices: [
        { label: '"It\'ll be fine, trust me."', kind: 'through', hint: 'Reassurance without understanding.', eff: { momentum: 1, debt: { tag: 'unchallenged_assumption', sev: 1 } }, result: 'They lace up. They do not look reassured.' },
        { label: '"What\'s making this feel like a lot?"', kind: 'prepare',
          then: { text: (s) => { const w = s.client.checkin && s.client.checkin.worry; return (w && (PP.skill(s, 'curiosity') > 0 || s.res.trust >= 6) ? w.text : (w ? w.guarded : '"I don\'t know. Everything?"')); },
            choices: [
              { label: 'Thank them for telling you', kind: 'prepare', eff: (s) => { const w = s.client.checkin && s.client.checkin.worry; const open = PP.skill(s, 'curiosity') > 0 || s.res.trust >= 6; return Object.assign({ trust: 1, insight: 1 }, open && w && w.fact ? { fact: w.fact } : {}); }, result: 'They shoulder their pack. Lighter, somehow.' }
            ] } },
        { label: 'Agree to slow down', kind: 'around', eff: { pace: 'steady', trust: 1, momentum: -1 }, result: 'You set an easier pace. They visibly relax.' }
      ]
    },
    {
      id: 'enc_wheel', title: 'Your pack strap snaps', at: ['travel'], cut: 'breakdown',
      text: 'SNAP. Your pack tumbles down the slope into a ditch. Someone has written "PROCESS" on the broken strap.',
      choices: [
        { label: 'Fix it yourself', kind: 'through', eff: { energy: -2, style: { soloist: 1 } }, result: 'Greasy, but fixed. Probably.' },
        { label: 'Call Olu', kind: 'help', contact: 'operator', show: (s) => PP.contactReady(s, 'operator'), eff: { momentum: 1 }, result: 'Olu appears with a spare strap labelled "PROCESS (v2)". It fits perfectly.' },
        { label: 'Wait for help to come by', kind: 'around', eff: { days: 2, momentum: -1, energy: 1 }, result: 'Two days later, a friendly hiker with a sewing kit comes by. Everyone needs a hand sometimes.' }
      ]
    },
    {
      id: 'enc_checklist', title: 'Something on the trail', at: ['travel'], weight: 0.6,
      when: (s) => !s.pack.includes('checklist'),
      text: 'Half-buried in the dirt: a laminated checklist. In faded marker at the top: "Did you ACTUALLY verify?"',
      choices: [
        { label: 'Pick it up', kind: 'prepare', eff: { item: 'checklist' }, result: 'It goes in your pack. It will catch one problem before it lands.' },
        { label: 'Leave it', kind: 'around', result: 'Someone else might need it more.' }
      ]
    },
    {
      id: 'enc_stampede', title: 'Stampede!', at: ['travel'], cut: 'stampede',
      when: (s) => s.map.visited.swamp || s.style.chase > 0,
      text: 'A herd of sales contests thunders across the trail, each one trailing a banner: BONUS TRIP! DOUBLE POINTS! PRODUCT OF THE MONTH! The ground shakes. One of them looks at your client meaningfully.',
      choices: [
        { label: 'Wait for the herd to pass', kind: 'around', eff: { days: 1, momentum: -1 }, result: 'A day later, the dust settles. Most of the contests have already been replaced by new ones.' },
        { label: 'Grab one and ride it', kind: 'through', hint: 'Exciting. Is it going where your client needs to go?', eff: { momentum: 1, energy: -1, style: { chase: 1 } }, result: 'Wheee! It takes you somewhere. Mostly toward a prize.' },
        { label: 'Ask which one, if any, actually helps this client', kind: 'prepare', eff: { insight: 1 }, result: 'One of them might, a little. You make a note. The rest gallop off toward someone else\'s client.' }
      ]
    },
    {
      id: 'enc_dragon', title: 'Here be dragons', at: ['travel'], cut: 'dragon', weight: 0.8,
      when: (s) => s.day >= 3,
      text: 'A long shape rises out of a lake beside the trail. A dragon! It peers at you over half-moon glasses. "Spot review," it rumbles. "Nothing personal. Show me what you\'ve got."',
      choices: [
        { label: 'Show it everything, gaps and all', kind: 'prepare', hint: 'Honest and thorough. Probably exhausting.', eff: (s) => (s.debt.length ? { energy: -2, clearDebt: s.debt[0].tag, insight: 1 } : { trust: 1, insight: 1 }), result: 'The dragon flips through everything. Where it finds a gap, it helps you fix it. Thorough. Exhausting. Kind of nice.' },
        { label: 'Show it only the good parts', kind: 'through', eff: { momentum: 1, debt: { tag: 'rushed_pace', sev: 1 } }, result: 'The dragon squints, then shrugs and sinks back into the water.' },
        { label: 'Hide behind a rock until it leaves', kind: 'around', eff: { days: 1, momentum: -1 }, result: 'A day behind a rock. The dragon was reading a novel. It was in no hurry.' }
      ]
    },

    /* --- Smaller moments on the trail --- */
    {
      id: 'road_phone_tag', title: 'Phone tag', at: ['travel'],
      text: (s) => `You need two answers from ${C(s)}, who has gone quiet a few steps behind you, deep in their phone. Three days now.`,
      choices: [
        { label: 'Call them (they are right there)', kind: 'through', hint: 'Persistence or pestering, depending on the client.', eff: (s) => (s.client.prefers === 'call' ? { trust: 1, momentum: 1, energy: -1 } : { trust: -1, energy: -1 }), result: (s) => (s.client.prefers === 'call' ? 'They pick up on the first ring. Answers!' : 'It rings three steps behind you. They decline it.') },
        { label: 'Send a short text', kind: 'around', eff: (s) => (s.client.prefers === 'text' ? { momentum: 2, trust: 1 } : { momentum: 0 }), result: (s) => (s.client.prefers === 'text' ? '"k. yes. 3pm." Perfect.' : 'Read at 11:42pm. No reply.') },
        { label: 'Write a clear email with both questions', kind: 'around', eff: (s) => (s.client.prefers === 'email' ? { momentum: 2, insight: 1 } : { momentum: -1 }), result: (s) => (s.client.prefers === 'email' ? 'A detailed reply with headings. Wonderful.' : 'The email is somewhere under 400 newsletters.') }
      ]
    },
    {
      id: 'road_coffee', title: 'A roadside coffee stand', at: ['travel'],
      text: 'A little stand by the trail sells coffee that smells like it costs more than your boots. The owner offers you a cup on the house.',
      choices: [
        { label: 'Accept', kind: 'prepare', eff: { energy: 2 }, result: 'Life-changing. You will think about this coffee for years.' },
        { label: 'Decline, you\'re on the clock', kind: 'through', eff: { momentum: 1 }, result: 'Brisk. Professional. Undercaffeinated.' }
      ]
    },
    {
      id: 'road_calendar', title: 'Calendar Tetris', at: ['travel'],
      text: (s) => `You need a proper sit-down with ${C(s)}. The first open slot is tomorrow at 8am. The next one with prep time is three days out.`,
      choices: [
        { label: 'Take tomorrow, prep on the trail', kind: 'through', hint: 'Speed versus readiness.', eff: { momentum: 1, debt: { tag: 'unprepared_meeting', sev: 1 } }, result: 'Booked. You\'ll figure it out.' },
        { label: 'Wait for the later slot, come prepared', kind: 'prepare', eff: { momentum: -1, insight: 1 }, result: 'You walk in ready.' },
        { label: 'Later slot, and bring Dev along', kind: 'help', contact: 'specialist', show: (s) => PP.contactReady(s, 'specialist'), eff: { momentum: -1, insight: 2, trust: 1 }, result: 'Two of you, fully prepared. The client is impressed.' }
      ]
    },
    {
      id: 'road_scope', title: '"While you\'re in there..."', at: ['travel'],
      text: (s) => `"While we're out here," ${C(s)} says, "could you also look at the car loan? And the HOA thing? And my cousin has a question."`,
      choices: [
        { label: 'Say yes to everything', kind: 'through', hint: 'People like yes. Swamps like it too.', eff: { trust: 1, energy: -2, style: { overcomplicate: 1, chase: 1 } }, result: 'The to-do list is now longer than the trail.' },
        { label: 'Park it in a "later" list, out loud', kind: 'around', eff: (s) => ({ trust: PP.skill(s, 'communication') > 0 ? 1 : 0 }), result: '"Great questions. Let\'s finish this first, then those." Clean.' },
        { label: 'Politely decline', kind: 'through', eff: { trust: -1, momentum: 1 }, result: 'Focus preserved. A little warmth lost.' }
      ]
    },
    {
      id: 'road_misconception', title: 'A confident misconception', at: ['travel', 'meadows'],
      text: (s) => `${C(s)} says something with total confidence that you are fairly sure is not true. They seem to be building on it.`,
      choices: [
        { label: 'Gently challenge it now', kind: 'through', hint: 'Right call, if you can do it without bruising.', eff: (s) => ({ insight: 1, trust: PP.skill(s, 'communication') > 0 ? 1 : -1 }), result: (s) => PP.skill(s, 'communication') > 0 ? '"Huh. I didn\'t know that." Good conversation.' : 'Correct, but it lands a little hard.' },
        { label: 'Let it slide for now', kind: 'around', eff: { trust: 1, debt: { tag: 'unchallenged_assumption', sev: 2 }, style: { avoid: 1 } }, result: 'Pleasant. Easy. Unresolved.' },
        { label: 'Ask how they came to that view', kind: 'prepare', show: (s) => PP.skill(s, 'curiosity') > 0, hint: 'Curiosity: understand before correcting.', eff: { insight: 2, trust: 1, momentum: -1 }, result: 'It came from a podcast. You talk about it. They change their own mind.' }
      ]
    },
    {
      id: 'road_fast_road', title: 'A faster road', at: ['travel'],
      text: (s) => `A smooth, fast stretch of trail opens up. To make the most of it, you could skip confirming ${C(s)}'s current details: address, contact info, the basics.`,
      choices: [
        { label: 'Skip it and push on', kind: 'through', hint: 'Usually fine. Usually.', eff: { momentum: 2, debt: { tag: 'unverified_details', sev: 2 } }, result: 'The miles fly by. Nothing happens. Nothing at all.' },
        { label: 'Pull over and verify everything', kind: 'prepare', eff: { energy: -1, momentum: -1, insight: 1 }, result: (s) => `${C(s)} moved last spring. Good thing you checked.` }
      ]
    },
    /* --- Rivals who want your client --- */
    {
      id: 'enc_rival_vance', title: 'Vance from Velocity Wealth', at: ['travel'], weight: 1.3,
      when: (s) => s.day >= 3,
      text: (s) => `A man in a quarter-zip jogs up the trail and falls in beside ${C(s)}. "Vance, Velocity Wealth. I can have a plan on your desk by Friday. No questions, no homework." He hands ${C(s)} a metal business card.`,
      choices: [
        { label: 'Let your work speak for itself', kind: 'through', hint: 'Only works if the relationship is already strong.', eff: (s) => (s.res.trust >= 6 ? { trust: 1 } : { poached: 'Vance from Velocity Wealth' }), preview: 'Trust 6 or more: they stay. Less: they leave with Vance.', result: (s) => (s.poached ? `${C(s)} hesitates, then walks off with Vance.` : `${C(s)} hands the card back. "I like the homework, actually."`) },
        { label: 'Ask your client what they make of his offer', kind: 'prepare', hint: 'Talking it through usually helps, if there is enough trust to work with.', eff: (s) => (s.res.trust >= 4 ? { trust: 1, insight: 1 } : PP.chance(0.5) ? { poached: 'Vance from Velocity Wealth' } : { insight: 1 }), preview: 'Trust 4 or more: they stay, and you learn something. Less: a coin flip.', result: (s) => (s.poached ? `"Honestly? Friday sounds good." ${C(s)} goes with Vance.` : `"No questions means he doesn't know me," ${C(s)} says. Vance jogs off.`) },
        { label: 'Tell your client Vance is a crook', kind: 'through', eff: { trust: -1 }, result: 'It works, but it does not look great on you.' },
        { label: 'Promise you can be faster than Vance', kind: 'around', eff: { momentum: 2, pace: 'brisk', debt: { tag: 'premature_pitch', sev: 2 } }, result: 'You pick up the pace. Now you have a deadline you invented.' }
      ]
    },
    {
      id: 'enc_rival_sign', title: '"GUARANTEED RESULTS"', at: ['travel'],
      text: (s) => `A huge sign beside the trail: GUARANTEED RESULTS, VELOCITY WEALTH, NEXT EXIT. ${C(s)} stares at it. "Can you guarantee results?"`,
      choices: [
        { label: 'Explain honestly why nobody can guarantee that', kind: 'prepare', eff: (s) => ({ trust: PP.skill(s, 'communication') > 0 ? 2 : 1, insight: 1 }), result: (s) => `${C(s)} nods slowly. "That's the first honest thing anyone's said about this."` },
        { label: '"Sure, basically."', kind: 'through', eff: { momentum: 1, debt: { tag: 'unchallenged_assumption', sev: 2 } }, result: 'It felt good to say. It will feel less good later.' },
        { label: 'Change the subject', kind: 'around', eff: { style: { avoid: 1 } }, result: 'The sign stays in your rear view for a long time.' }
      ]
    },
    /* --- New prospects on the trail --- */
    {
      id: 'enc_hiker_prospect', title: 'A fellow hiker', at: ['travel'],
      text: 'At a water stop, another hiker asks what you do. When you tell them, they go quiet. "Huh. I\'ve been meaning to figure all that out."',
      choices: [
        { label: 'Tell them more, and ask about them', kind: 'prepare', eff: { energy: -1, prospect: { temp: 'warm', source: 'a hiker you met on the trail' } }, result: 'You trade stories for twenty minutes. They want to meet when you are back at the port. (New prospect in your pipeline.)' },
        { label: 'Hand them a card and keep moving', kind: 'around', eff: () => (PP.chance(0.5) ? { prospect: { temp: 'cold', source: 'a card you handed out on the trail' } } : {}), preview: '50% chance of a cold prospect.', result: 'Maybe they will call.' },
        { label: 'Stay focused on your client', kind: 'through', eff: { trust: 1 }, result: 'Your client notices you kept your attention on them.' }
      ]
    },
    {
      id: 'enc_client_friend', title: 'A friend of your client', at: ['travel'], weight: 1.4,
      when: (s) => s.res.trust >= 7,
      text: (s) => `${C(s)}'s friend joins the hike for an afternoon. Near the end she pulls you aside: "${C(s)} won't stop talking about you. Are you taking new clients?"`,
      choices: [
        { label: '"Absolutely. Let\'s talk when we\'re back."', kind: 'prepare', eff: (s) => ({ prospect: { temp: 'hot', source: `${s.client.name}'s friend` } }), result: 'A hot referral, earned on the trail. (New prospect in your pipeline.)' },
        { label: '"Once I\'ve finished with your friend, yes."', kind: 'around', eff: (s) => ({ trust: 1, prospect: { temp: 'warm', source: `${s.client.name}'s friend` } }), result: `Your client overhears and beams.` }
      ]
    },
    {
      id: 'enc_lost_family', title: 'A lost family', at: ['travel'],
      text: 'A family stands at a fork with their map upside down. The kids are arguing about snacks. The parents are arguing about the mortgage.',
      choices: [
        { label: 'Help them find their way', kind: 'help', eff: { energy: -1, prospect: { temp: 'warm', source: 'a family you helped on the trail', bias: { family: 3 } } }, result: 'You turn their map the right way up. They ask for your card. (New prospect in your pipeline.)' },
        { label: 'Point the way and keep going', kind: 'around', eff: { momentum: 1 }, result: '"That way!" They wave thanks.' }
      ]
    },
    /* --- Mentors who teach on the trail --- */
    {
      id: 'enc_mentor_guide', title: 'A seasoned trail guide', at: ['travel'],
      when: (s) => PP.skill(s, 'navigation') < 2,
      text: 'A weathered guide sits on a rock, sharpening a pencil with a pocket knife. "You read the land like a tourist. Want to learn to read it properly?"',
      choices: [
        { label: 'Spend a day learning from them', kind: 'prepare', eff: { days: 1, skill: { navigation: 1 } }, result: 'By sundown you can tell a dead end from a shortcut at fifty paces. (+1 Navigation, for the rest of your career.)' },
        { label: 'Ask for one quick tip', kind: 'around', eff: { insight: 1 }, result: '"Dotted lines go somewhere. Dashed lines go nowhere useful." Noted.' },
        { label: 'No time, thanks', kind: 'through', eff: { momentum: 1 }, result: 'They shrug and keep sharpening.' }
      ]
    },
    {
      id: 'enc_mentor_retired', title: 'A retired advisor on a bench', at: ['travel'],
      text: 'An older woman eating a sandwich on a bench waves you over. "Forty years in this business. Want the one thing I learned?"',
      choices: [
        { label: '"Yes, please."', kind: 'prepare',
          then: { text: '"Ask one more question than feels comfortable. That\'s it. That\'s the whole job." She goes back to her sandwich.',
            choices: [
              { label: 'Try it on your client right away', kind: 'prepare', eff: (s) => (PP.skill(s, 'curiosity') < 2 ? { skill: { curiosity: 1 }, trust: 1 } : { insight: 2 }), result: 'You ask one more question. The answer surprises you both. (Curiosity improves for the rest of your career.)' },
              { label: 'Write it down for later', kind: 'around', eff: { insight: 1 }, result: 'It goes on the first page of your notebook.' }
            ] } },
        { label: 'Smile and keep walking', kind: 'through', result: 'She shrugs. More sandwich for her.' }
      ]
    },
    {
      id: 'enc_mentor_speaker', title: 'Someone practicing a speech to the trees', at: ['travel'],
      when: (s) => PP.skill(s, 'communication') < 2,
      text: 'A well-known speaker is rehearsing a keynote to a grove of very patient pine trees. They notice you. "You there. Explain what you do in one sentence."',
      choices: [
        { label: 'Try, and ask for honest feedback', kind: 'prepare', eff: { days: 1, skill: { communication: 1 } }, result: 'Seven attempts later, your sentence is clear, short, and true. (+1 Communication, for the rest of your career.)' },
        { label: 'Mumble something and hurry on', kind: 'through', eff: { momentum: 1 }, result: 'The trees seemed unimpressed too.' }
      ]
    }
  ];

  /* One rescue per run, the first time Trust or Momentum hits zero. */
  PP.content.lastChanceEvent = function (s, which) {
    if (which === 'trust') return {
      id: 'last_chance_trust', title: 'On thin ice', at: ['travel'],
      text: `${C(s)} has stopped talking to you. At the last town, they asked about other guides. You have one chance to rescue this.`,
      choices: [
        { label: 'Apologize, and ask what went wrong', kind: 'prepare', eff: { trust: 3, energy: -1, insight: 1 }, result: `It is an uncomfortable conversation. ${C(s)} appreciates it more than you expected.` },
        { label: 'Write a long letter explaining your reasoning', kind: 'around', eff: { trust: 2, energy: -1 }, result: 'They read it. They say "ok." It is a start.' }
      ]
    };
    return {
      id: 'last_chance_momentum', title: 'Dead in the water', at: ['travel'],
      text: `You have barely moved in days. ${C(s)} is "pretty swamped right now, can we circle back?" One more stall and this is over.`,
      choices: [
        { label: 'Propose one tiny, concrete next step', kind: 'prepare', eff: { momentum: 3 }, result: 'Small enough to say yes to. They say yes.' },
        { label: 'Ask what is getting in the way', kind: 'prepare', eff: { momentum: 2, insight: 1 }, result: 'It was never about the plan. It was about time. You can work with that.' }
      ]
    };
  };

  /* Generic check event built for any debt that comes due. */
  PP.content.debtCheckEvent = function (s, d) {
    const def = PP.content.debts[d.tag];
    const odds = PP.debtOdds(s, d);
    const choices = [
      { label: 'Deal with it', kind: 'through', debtRoll: true, preview: `Harmless ${Math.round(odds.harmless * 100)}% · Inconvenient ${Math.round(odds.inconvenient * 100)}% · Costly ${Math.round(odds.costly * 100)}%` }
    ];
    if (PP.contactReady(s, 'operator')) choices.push({ label: 'Call Olu before it gets worse', kind: 'help', contact: 'operator', debtRescue: true, preview: 'Olu makes it harmless.' });
    return {
      id: 'debt_' + d.tag, title: 'Something from earlier catches up', debt: d, cut: 'debt',
      text: def.check,
      sub: `Back at ${PP.content.nodes[d.where] ? PP.content.nodes[d.where].name : 'the start'}: ${def.label.toLowerCase()}.`,
      choices
    };
  };
})(window.PP);

/* Systems built at the port add better options to some landmark events. */
(function (PP) {
  const has = (id) => (s) => PP.career && PP.career.hasSystem(s.career, id);
  const add = (eventId, choice) => { const e = PP.content.events.find((x) => x.id === eventId); if (e) e.choices.push(Object.assign({ kind: 'help' }, choice)); };
  add('meadow_first_talk', { label: 'Work through your discovery guide', show: has('discovery'), eff: (s) => ({ insight: 2, trust: 1, fact: s.client.stakeholderFact }), result: 'Your proven questions surface something you would have missed.' });
  add('fog_forgot', { label: 'Check your note-taking system', show: has('notes'), eff: { insight: 1, momentum: 1 }, result: 'It is all there, dated and searchable. The fog thins.' });
  add('loop_reentry', { label: 'Pull everything from your CRM', show: has('crm'), eff: { momentum: 1, insight: 1 }, result: 'Entered once, used forever. The loop straightens into a line.' });
  add('swamp_sheet', { label: 'Run it through your planning software', show: has('planning'), eff: (s) => ({ insight: 2, fact: s.client.spreadsheetFact }), result: 'You cross on your own boardwalk. The software flags the one assumption that matters.' });
  add('sands_initiative', { label: 'Check it against your focus routine', show: has('focus'), eff: { insight: 1, momentum: 1 }, result: 'Your routine asks one question: would you sell this if there were no quota? Not to this client, not yet. You tell your manager so, with reasons. Done.' });
  add('sands_change', { label: 'Run the banner through your focus routine', show: has('focus'), eff: (s) => ({ insight: 2, trust: 1, fact: s.client.keyFact }), result: 'Client first, prize second. You talk about what they need instead, and the real reason they came comes out.' });
  add('road_change_of_mind', { label: 'Use your focus routine to sort what really changed', show: has('focus'), eff: (s) => ({ insight: 2, fact: s.client.keyFact }), result: 'You separate the signal from the noise together.' });
  add('summit_handoff', { label: 'Send it to your specialist partner', show: has('specialist'), eff: { insight: 2, momentum: 1 }, result: 'They know how you work. The handoff takes ten minutes.' });
  add('isles_locked', { label: 'Your tech setup handles it', show: has('tech'), eff: { momentum: 1, trust: 1 }, result: 'One tap, a code, and you are in.' });
  add('isles_message', { label: 'Let your tech setup screen them', show: has('tech'), eff: { insight: 1 }, result: 'The fakes are flagged before you even see them.' });
  add('toll_bridge', { label: 'Hand over your review file', show: has('review'), eff: { trust: 1, momentum: 2 }, result: 'The troll flips through it and waves you across. "Now that is a tidy file."' });
})(window.PP);
