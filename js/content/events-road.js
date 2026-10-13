/* events-road: more encounters on the trail (at: ['travel']), appended to the deck.
 *
 * Rivals, chance meetings that become prospects, mentors and peers, moments with
 * your own client, and the ordinary interruptions of an agent's life.
 * Everything about the client comes from s.client, so these work for any archetype.
 */
(function (PP) {
  const C = (s) => PP.clientName(s);
  const K = PP.knows;

  /* ---------- helpers ---------- */
  const S = (s) => (s.client && s.client.shortStake) || 'someone back home';
  const facts = (s) => (s.client && s.client.facts) || {};
  const label = (s, f) => (facts(s)[f] ? facts(s)[f].label.toLowerCase() : 'something that matters');
  const unknownFact = (s) => Object.keys(facts(s)).find((f) => !K(s, f));
  const worry = (s) => s.client && s.client.checkin && s.client.checkin.worry;
  const opens = (s) => PP.skill(s, 'curiosity') > 0 || s.res.trust >= 6;
  const comm = (s) => PP.skill(s, 'communication') > 0;
  const pipe = (s) => (s.career && s.career.pipeline) || [];
  const book = (s) => ((s.career && s.career.book) || []).filter((b) => b.status === 'life' || b.status === 'steady' || b.status === 'at-risk');
  const shakiest = (s) => book(s).slice().sort((a, b) => (a.sat == null ? 7 : a.sat) - (b.sat == null ? 7 : b.sat))[0];
  const partner = (s) => s.career && s.career.partner && PP.content.practice.partners.find((p) => p.id === s.career.partner);
  const recruit = (s) => ((s.career && s.career.recruits) || [])[0];
  const afford = (n) => (s) => !s.career || s.career.savings >= n;
  const money = (n) => (PP.career ? PP.career.money(n) : '$' + n);
  const hotFirst = { hot: 0, warm: 1, cold: 2 };
  const bestProspect = (s) => pipe(s).slice().sort((a, b) => hotFirst[a.temp] - hotFirst[b.temp])[0];
  const loseProspect = (s, p, rival) => { if (!s.career || !p) return null; s.career.pipeline = s.career.pipeline.filter((x) => x.id !== p.id); if (rival) PP.career.lostToRival(s.career, p, rival); return p; };
  const warmUp = (s, p) => { if (!s.career || !p) return; p.temp = p.temp === 'cold' ? 'warm' : 'hot'; p.expires = Math.max(p.expires, s.career.days + 12); };
  const missingSystem = (s) => ['notes', 'discovery', 'focus', 'review'].find((id) => s.career && !PP.career.hasSystem(s.career, id));
  const sysName = (id) => (PP.content.practice.systems[id] ? PP.content.practice.systems[id].name.toLowerCase() : 'system');
  // Random outcomes: eff rolls and remembers, result reads it. Every random choice has a preview,
  // so the eff runs exactly once, when picked.
  let roll = false;
  // Targets of the current event (a prospect or a client in your book), fixed when the text is shown.
  let target = null;

  PP.content.events.push(

    /* ================= RIVALS ================= */
    {
      id: 'rd_rival_brochure', title: 'The shiny brochure', at: ['travel'], weight: 1.1,
      when: (s) => s.day >= 2,
      text: (s) => `A man in loafers that have never seen a trail jogs alongside you. "Brent Haskell! Love what you're doing, love it." He presses a glossy brochure into ${C(s)}'s hands. On the cover, a silver-haired couple laughs on a sailboat at nothing in particular.`,
      choices: [
        { label: 'Let them read it, then ask what caught their eye', kind: 'prepare', hint: 'Their reaction tells you something.',
          then: { text: (s) => `${C(s)} flips through it. "It's very... confident. Page six says I'll 'never worry again.' Is that a thing?" Brent is already halfway to the next hiker.`,
            choices: [
              { label: '"What would \'never worry again\' look like for you?"', kind: 'prepare', eff: (s) => Object.assign({ insight: 1, trust: 1 }, opens(s) && unknownFact(s) ? { fact: unknownFact(s) } : {}), result: (s) => opens(s) ? `${C(s)} thinks about it for a full minute, then tells you something you had not heard yet.` : `"Not checking my balance at 2am, mostly." It's a start.` },
              { label: '"Nobody can promise that. I won\'t either."', kind: 'through', eff: (s) => ({ trust: comm(s) ? 2 : 1 }), result: (s) => `${C(s)} folds the brochure into a paper hat. "Honest. Weird, but honest."` }
            ] } },
        { label: 'Take the brochure and point out the fine print', kind: 'through', hint: 'Right, but nobody likes being told they were fooled.', eff: (s) => ({ insight: 1, trust: comm(s) ? 1 : -1 }), result: (s) => comm(s) ? 'You read the tiny print aloud in a funny voice. Everyone laughs, including Brent, a little.' : `"Okay, okay, I get it," ${C(s)} says, a bit stung.` },
        { label: 'Promise your plan will be just as exciting', kind: 'around', eff: { momentum: 2, debt: { tag: 'premature_pitch', sev: 1 } }, result: 'You describe your plan with a lot more sailboats than it actually contains.' }
      ]
    },
    {
      id: 'rd_rival_badmouth', title: 'A rival with a long memory', at: ['travel'],
      when: (s) => s.day >= 3,
      text: (s) => `At a trail junction, a woman with a perfect blowout and a clipboard leans toward ${C(s)}, not quite out of your earshot. "Corinne Vail. Just so you know, this one's brand new. First year. I'd want someone who's done this before, but that's me."`,
      choices: [
        { label: 'Own it, plainly', kind: 'prepare', hint: 'Honesty about the gap, plus what you do about it.',
          then: { text: (s) => `${C(s)} turns to you. "Is that true? Is this your first year?"`,
            choices: [
              { label: '"Yes. Which is why I ask a lot of questions and bring in help."', kind: 'prepare', eff: (s) => (s.res.trust >= 4 ? { trust: 2, insight: 1 } : { trust: 1 }), result: (s) => `${C(s)} nods. "Honestly, the questions are why I'm still here." Corinne has already gone.` },
              { label: '"Yes, and I have a mentor checking my work."', kind: 'help', eff: { trust: 1, style: { soloist: -1 } }, result: 'True, and it lands. Now you have to actually call your mentor.' }
            ] } },
        { label: 'Talk up your experience a bit', kind: 'through', hint: 'It will be remembered.', eff: { momentum: 1, debt: { tag: 'unchallenged_assumption', sev: 2 } }, result: '"I\'ve been around," you say, which is technically true of anyone over thirty.' },
        { label: 'Badmouth her right back', kind: 'around', eff: { trust: -1, energy: -1 }, result: (s) => `It feels great for nine seconds. ${C(s)} looks at you like they just learned something.` }
      ]
    },
    {
      id: 'rd_rival_recruiter', title: 'Someone wants to hire you', at: ['travel'], weight: 0.9,
      when: (s) => !!s.career && s.day >= 3,
      text: (s) => `A man in a navy fleece with a big firm's logo stitched on the chest waves you over to a rest stop. "Harlan. Recruiting. I've heard about you. Base salary, benefits, a parking spot with your name on it. You'd never have to worry about covering ${money(PP.career.costs(s.career))} a day again." ${C(s)} is pretending not to listen.`,
      choices: [
        { label: 'Hear him out', kind: 'prepare', hint: 'Information is free. Your client is watching.',
          then: { text: '"The catch?" Harlan smiles. "No catch. Well. Your clients stay with us if you leave. And there\'s a product list. And a quota. Little things."',
            choices: [
              { label: '"What happens to the people who miss quota?"', kind: 'prepare', eff: (s) => (PP.skill(s, 'judgment') < 2 ? { skill: { judgment: 1 }, trust: -1 } : { insight: 1, trust: -1 }), result: '"We prefer to call it graduating." You learn more from his pause than his pitch. Your client heard the whole thing, though.' },
              { label: 'Take his card, for later', kind: 'through', eff: { energy: -1, trust: -1, style: { chase: 1 } }, result: (s) => `The card sits in your pocket like a pebble. ${C(s)} saw you take it.` },
              { label: '"Thanks. I like building my own thing."', kind: 'around', eff: { insight: 1 }, result: 'He shrugs. "Offer\'s open." You walk back to your client feeling oddly lighter.' }
            ] } },
        { label: 'Decline on the spot', kind: 'through', eff: (s) => ({ trust: 1, momentum: 1 }), result: (s) => `"I'm with a client," you say, and walk back. ${C(s)} pretends not to smile.` },
        { label: 'Ask if he has any clients he can\'t serve', kind: 'around', hint: 'Bold. Might work.', eff: () => ((roll = PP.chance(0.4)) ? { energy: -1, prospect: { temp: 'warm', source: 'a recruiter who could not serve them', event: true } } : { energy: -1 }), preview: '40% chance of a warm prospect. Costs Energy.', result: () => roll ? 'Harlan laughs. "Cheeky." But he does know someone who is "too small for us." (New prospect in your pipeline.)' : '"Ha. No." He seems to respect it, though.' }
      ]
    },
    {
      id: 'rd_rival_split', title: '"Let\'s split this one"', at: ['travel'],
      when: (s) => s.day >= 2,
      text: (s) => `An agent in a rumpled blazer falls into step. "Gordy Mack. I've been watching you with ${C(s)}. Here's my offer: you keep the relationship, I handle the hard parts, we split it fifty-fifty. I've never lost a client." He pauses. "Recently."`,
      choices: [
        { label: 'Shake on it', kind: 'through', hint: 'Less work today. Who actually knows this client?', eff: { momentum: 2, energy: 1, debt: { tag: 'bad_handoff', sev: 2 } }, result: 'He takes your notes, glances at the first page, and says "Got it." That was fast.' },
        { label: 'Ask what he\'d actually do', kind: 'prepare',
          then: { text: (s) => `"Do? The usual. Same as every client." He hasn't asked ${C(s)}'s name yet. "Does it matter?"`,
            choices: [
              { label: 'Ask him to meet your client first', kind: 'help', eff: () => ((roll = PP.chance(0.5)) ? { insight: 2, momentum: 1, style: { soloist: -1 } } : { trust: -1, momentum: -1 }), preview: 'A coin flip: he turns out to be useful, or he pitches your client directly.', result: (s) => roll ? `Surprise: one-on-one, Gordy is sharp. He asks ${C(s)} two questions you hadn't thought of, then waves goodbye.` : `Gordy hands ${C(s)} his own card within four minutes. You take it back. Awkward.` },
              { label: 'Politely pass', kind: 'around', eff: { insight: 1 }, result: '"Your loss," he says, and starts following another hiker.' }
            ] } },
        { label: 'No, thanks. Keep walking.', kind: 'around', eff: { momentum: 1 }, result: 'He shrugs. "Offer stands." It does not.' }
      ]
    },
    {
      id: 'rd_rival_familyfriend', title: 'A family friend in the business', at: ['travel'], weight: 1.1,
      when: (s) => s.day >= 3,
      text: (s) => `A cheerful voice calls out: "${C(s)}! Is that you?" It's Ray, an old family friend who has "done a bit of this" for decades. He hugs ${C(s)}, then looks you up and down. "And who's this, then? You know I'd have helped you for free, sweetheart."`,
      choices: [
        { label: 'Invite Ray into the conversation', kind: 'help', hint: 'Generous. Slower. Might backfire, might not.',
          then: { text: (s) => `Ray settles in. "So what's the plan?" He listens to your outline, then asks pointedly: "Have you asked about ${label(s, s.client.keyFact)}?"`,
            choices: [
              { label: '"Not yet. Good catch. Let\'s ask now."', kind: 'prepare', eff: (s) => ({ momentum: -1, trust: 2, insight: 1, fact: s.client.keyFact, style: { soloist: -1 } }), result: (s) => `${C(s)} answers, a little surprised to be asked. Ray gives you a nod on his way out: "You'll do."` },
              { label: '"I\'ve got it covered."', kind: 'through', eff: (s) => (K(s, s.client.keyFact) ? { trust: 1 } : { trust: -1, debt: { tag: 'guessed_key', sev: 2 } }), result: (s) => K(s, s.client.keyFact) ? 'You do. Ray seems impressed, and a little disappointed he can\'t correct you.' : 'Ray raises an eyebrow and lets it drop. For now.' }
            ] } },
        { label: 'Make your case for yourself', kind: 'through', hint: 'Only works if the relationship is already strong.', eff: (s) => (s.res.trust >= 6 ? { trust: 1 } : (roll = PP.chance(0.35)) ? { poached: 'Ray, an old family friend in the business' } : { trust: -1 }), preview: 'Trust 6+: they stay. Below that, a 35% chance they go with Ray.', result: (s) => s.poached ? `${C(s)} looks torn, then links arms with Ray. "He's known me since I was little."` : s.res.trust >= 7 ? `${C(s)} squeezes Ray's arm. "I think I've got the right person, Ray."` : 'Ray leaves, but he will be at the next family barbecue. Your name will come up.' },
        { label: 'Step back and let them catch up', kind: 'around', eff: { energy: 1, momentum: -1 }, result: 'Forty minutes of stories about a dog named Biscuit. You eat a granola bar.' }
      ]
    },
    {
      id: 'rd_rival_app', title: 'There\'s an app for that', at: ['travel'],
      text: (s) => `A billboard at the edge of the trail: YOUR FUTURE IN FOUR TAPS. ${C(s)} has already downloaded the app. "It says I'm a 'Bold Navigator.' It made a pie chart. It took ninety seconds. What do you do in ninety seconds?"`,
      choices: [
        { label: '"Show me. Let\'s look at it together."', kind: 'prepare', hint: 'Curiosity disarms. Contempt doesn\'t.',
          then: { text: (s) => `The app asked for an age, a zip code, and whether ${C(s)} "likes roller coasters." It did not ask about ${label(s, s.client.stakeholderFact)}.`,
            choices: [
              { label: 'Point out what it couldn\'t have known', kind: 'prepare', eff: (s) => ({ insight: 1, trust: comm(s) ? 2 : 1, fact: s.client.stakeholderFact }), result: (s) => `${C(s)} goes quiet. "Huh. Yeah. It doesn't know about any of that."` },
              { label: 'Admit it\'s decent at one small piece', kind: 'help', eff: { trust: 2 }, result: '"Honestly, for that one thing, it\'s fine." Your client looks at you like you just passed a test.' }
            ] } },
        { label: 'Make fun of it', kind: 'through', eff: { trust: -1, momentum: 1 }, result: (s) => `${C(s)} laughs, then quietly does not delete the app.` },
        { label: 'Ignore it and carry on', kind: 'around', eff: { debt: { tag: 'unchallenged_assumption', sev: 1 } }, result: 'The pie chart lives on their home screen now.' }
      ]
    },
    {
      id: 'rd_rival_pipeline', title: 'She\'s meeting your prospect', at: ['travel'], weight: 1.3,
      when: (s) => pipe(s).length > 0,
      text: (s) => { target = bestProspect(s); return `A rival agent you half-know from the port, Dara Quill, waves from the other trail. "Funny thing! I'm having coffee with ${target.name} on Thursday. They said you'd gone quiet. No hard feelings, right?"`; },
      choices: [
        { label: 'Send a proper note to the prospect right now', kind: 'prepare', hint: 'Costs energy. Shows you remember them.', eff: { energy: -1 }, result: (s) => { warmUp(s, target); return target ? `You write ${target.name} a short, specific note. They reply within the hour: "Oh good, I was hoping to hear from you."` : 'You write a short note.'; } },
        { label: 'Ask your partner to call them', kind: 'help', show: (s) => !!partner(s), eff: { momentum: 1 }, result: (s) => { warmUp(s, target); return `${partner(s).name} calls ${target ? target.name : 'them'} that afternoon. Dara's coffee gets cancelled.`; } },
        { label: '"If it\'s meant to be, it\'s meant to be."', kind: 'through', eff: { momentum: 1 }, preview: '60% chance you lose that prospect.', result: (s) => { if (PP.chance(0.6) && loseProspect(s, target, 'Dara Quill')) return `By Friday, ${target.name} has signed with Dara. It was meant to be, apparently. For her.`; return target ? `Dara texts on Thursday: "${target.name} cancelled. Something about waiting for you?" Lucky.` : 'Nothing happens.'; } },
        { label: 'Tell Dara to back off', kind: 'around', eff: { energy: -1, trust: -1 }, preview: 'Your client sees you snap. 40% chance you lose the prospect anyway.', result: (s) => { if (PP.chance(0.4) && loseProspect(s, target, 'Dara Quill')) return `Dara smiles and signs ${target.name} anyway. Your client watched you snap.`; return 'Dara holds up her hands and leaves. Your client looks at you a little warily.'; } }
      ]
    },
    {
      id: 'rd_rival_dinner', title: 'Free steak dinner', at: ['travel'],
      text: (s) => `A flyer is stapled to a trail post: FREE STEAK DINNER! LEARN THE SECRETS OF A WORRY-FREE FUTURE! TONIGHT ONLY. ${C(s)} reads it twice. "I mean... it is free steak."`,
      choices: [
        { label: 'Go together and sit in the back', kind: 'prepare', hint: 'Know what your client is hearing.', eff: () => ((roll = PP.chance(0.5)) ? { energy: 1, insight: 1, prospect: { temp: 'warm', source: 'someone you met at a rival\'s steak dinner', bias: { retiree: 2 }, event: true } } : { energy: 1, insight: 1 }), preview: 'Energy +1, Insight +1. 50% chance you leave with a prospect.', result: (s) => roll ? `The pitch is all fear, then all smiles. Afterwards a woman at your table asks you, quietly, what you'd actually ask her. (New prospect in your pipeline.) ${C(s)} says, "You're better than him."` : `The steak is grey. The pitch is loud. ${C(s)} whispers, "He never asked anyone a single question."` },
        { label: 'Let them go alone', kind: 'through', eff: () => ((roll = PP.chance(0.5)) ? { momentum: 1, trust: -1, debt: { tag: 'unchallenged_assumption', sev: 1 } } : { momentum: 1, energy: 1 }), preview: 'A coin flip: they come back unsettled, or they come back laughing.', result: (s) => roll ? `${C(s)} comes back with a tote bag and three new worries.` : `${C(s)} comes back with a doggy bag. "That guy was a clown. I brought you some steak."` },
        { label: 'Talk them out of it', kind: 'around', eff: (s) => ({ trust: comm(s) ? 0 : -1, momentum: 1 }), result: (s) => comm(s) ? 'You suggest dinner somewhere with fewer slides. They agree.' : `${C(s)} skips it, but sulks about the steak.` }
      ]
    },
    {
      id: 'rd_rival_cheaper', title: '"She said she\'d do it for half"', at: ['travel'],
      text: (s) => `${C(s)} has been on the phone. "So, a friend's agent says she'd do all this for half of what you charge. Half! Is that... true? What do you even get paid?"`,
      choices: [
        { label: 'Explain exactly how you get paid', kind: 'prepare', hint: 'Transparency costs a little time and earns a lot.',
          then: { text: (s) => `${C(s)} listens all the way through. "Okay. That's clearer than I expected. So what am I actually getting that the half-price version doesn't?"`,
            choices: [
              { label: 'Point to what you\'ve learned about them so far', kind: 'prepare', eff: (s) => (s.res.insight >= 4 ? { trust: 2 } : { trust: 1, insight: 1 }), preview: 'Strong if you have real Insight to point to.', result: (s) => s.res.insight >= 4 ? `You list what you know about ${C(s)}'s situation. They blink. "Okay. Yeah."` : 'You don\'t have much to point to yet. You say so, and promise to earn it.' },
              { label: '"Honestly? Maybe nothing, for some people. Let\'s see if you\'re one."', kind: 'around', eff: { trust: 2, momentum: -1 }, result: 'Disarmingly honest. They decide to keep going with you.' }
            ] } },
        { label: 'Offer a discount to match', kind: 'through', show: afford(400), hint: 'Keeps the client. Sets a price on you.', eff: { cash: -400, trust: 1, momentum: 1 }, result: `You knock ${money(400)} off. They're pleased. You wonder what you just taught them.` },
        { label: 'Change the subject', kind: 'around', eff: { style: { avoid: 1 }, debt: { tag: 'unchallenged_assumption', sev: 1 } }, result: '"Look at that view!" There is no view. They notice.' }
      ]
    },
    {
      id: 'rd_rival_oldtrainer', title: 'Your old trainer', at: ['travel'],
      when: (s) => pipe(s).length > 0,
      text: (s) => { target = bestProspect(s); return `Benny Okoro, who taught your licensing class and now works for a rival shop, is eating an apple on a fence. "Kid! Proud of you. Hey, I heard you've got ${target.name} waiting. You're stretched thin out here. Want me to take them off your hands? I'll send you a referral fee."`; },
      choices: [
        { label: 'Take the fee and hand them over', kind: 'through', hint: 'Cash now. One fewer future client.', eff: { cash: 300 }, result: (s) => { loseProspect(s, target); return `Benny writes you a check for ${money(300)} on his knee. ${target ? target.name : 'They'} will be fine with him. Probably better than fine.`; } },
        { label: 'Thank him and keep them', kind: 'around', eff: { energy: -1 }, result: '"Fair enough. Don\'t let them go cold." He tosses you the apple core, for some reason.' },
        { label: 'Ask him how he\'d handle them', kind: 'prepare',
          then: { text: '"Me? I\'d call this week, not next. And I\'d ask what made them reach out in the first place. Nobody asks that." He grins. "Free lesson. Fee\'s still on the table."',
            choices: [
              { label: 'Take the lesson, keep the prospect', kind: 'prepare', eff: { insight: 1 }, result: (s) => { warmUp(s, target); return `You text ${target ? target.name : 'them'} his exact question. They answer at length.`; } },
              { label: 'Fine. Take them. You\'ll do it right.', kind: 'help', eff: { cash: 300, trust: 1 }, result: (s) => { loseProspect(s, target); return 'Benny shakes your hand. Your client liked seeing you put someone else\'s interests first.'; } }
            ] } }
      ]
    },

    /* ================= CHANCE MEETINGS ================= */
    {
      id: 'rd_pros_restcouple', title: 'An argument at the rest stop', at: ['travel'],
      text: 'At a rest stop picnic table, a young couple is having a whispered argument over a banking app. "Why is it MY account?" "Because it\'s my paycheck!" They notice you noticing and both go red.',
      choices: [
        { label: 'Offer a neutral question, not advice', kind: 'prepare',
          then: { text: '"Can I ask," one of them says, "is it normal to fight about this? We\'ve been married five weeks."',
            choices: [
              { label: '"Extremely normal. Want to talk it through properly sometime?"', kind: 'prepare', eff: { energy: -1, prospect: { temp: 'warm', source: 'a couple at a rest stop', bias: { family: 2, early: 1 }, event: true } }, result: 'They both exhale. They take your card and argue, gently, about who gets to keep it. (New prospect in your pipeline.)' },
              { label: '"Normal. Good luck!"', kind: 'around', eff: { trust: 1 }, result: (s) => `They laugh. ${C(s)} says, "You're nice to strangers. I like that."` }
            ] } },
        { label: 'Leave them their privacy', kind: 'around', eff: { momentum: 1 }, result: 'You find a different table. Very professional.' },
        { label: 'Slide a business card across the table', kind: 'through', eff: () => ((roll = PP.chance(0.4)) ? { prospect: { temp: 'cold', source: 'a card at a rest stop', bias: { family: 2 }, event: true } } : { trust: -1 }), preview: '40%: a cold prospect. Otherwise it reads as pushy (Trust -1).', result: (s) => roll ? 'One of them pockets it. Maybe.' : `They stare at the card. ${C(s)} winces on your behalf.` }
      ]
    },
    {
      id: 'rd_pros_van', title: 'A van with flowers painted on it', at: ['travel'], cut: 'breakdown',
      text: 'A delivery van sits on the shoulder with its hood up and its hazards on. Painted on the side: PETAL & STEM, EST. LAST YEAR. The owner is on the phone, saying "No, I need them there by four" with rising panic.',
      choices: [
        { label: 'Help get it running', kind: 'help', hint: 'Hard work. Business owners remember who stopped.', eff: { energy: -2, prospect: { temp: 'hot', source: 'a florist whose van you helped fix', bias: { owner: 3 }, event: true } }, result: (s) => `Twenty sweaty minutes and a borrowed cable later, the van coughs to life. "You're a planner? I desperately need a planner." (Hot prospect in your pipeline.) ${C(s)} is impressed.` },
        { label: 'Lend your phone charger and offer a card', kind: 'around', eff: { prospect: { temp: 'warm', source: 'a florist on the side of the road', bias: { owner: 3 }, event: true } }, result: 'They take both. "Seasonal business. Cash flow is a nightmare. I\'ll call you." (New prospect in your pipeline.)' },
        { label: 'Drive on, you\'re mid-journey', kind: 'through', eff: { momentum: 1 }, result: 'In the mirror, the florist kicks a tire.' }
      ]
    },
    {
      id: 'rd_pros_grad', title: 'Cap, gown, and a cardboard box', at: ['travel'],
      text: 'A recent graduate sits at a bus shelter, still in a cap and gown, holding a cardboard box of dorm stuff. "My parents say I need to \'get a money guy.\' Are you a money guy? Is that a real job?"',
      choices: [
        { label: '"Sort of. What made them say that?"', kind: 'prepare',
          then: { text: '"I got a job offer with something called a \'benefits packet.\' It\'s forty pages. I used it as a coaster."',
            choices: [
              { label: 'Offer to walk through the packet with them', kind: 'prepare', eff: { energy: -1, prospect: { temp: 'warm', source: 'a new grad at a bus stop', bias: { early: 3 }, event: true } }, result: 'They light up. "Wait, it\'s money? Like, money for me?" (New prospect in your pipeline.)' },
              { label: 'Tell them to read page one tonight, at least', kind: 'around', eff: { insight: 1 }, result: 'A small push. They salute you with a tassel.' }
            ] } },
        { label: 'Hand over a card', kind: 'around', eff: () => ((roll = PP.chance(0.5)) ? { prospect: { temp: 'cold', source: 'a grad at a bus stop', bias: { early: 3 }, event: true } } : {}), preview: '50% chance of a cold prospect.', result: () => roll ? 'They tuck it into the box, between a lamp and a pan.' : 'The bus arrives. The card blows away.' },
        { label: 'Wish them luck', kind: 'through', eff: { momentum: 1 }, result: '"Thanks! I think I\'ll need it!" Probably true.' }
      ]
    },
    {
      id: 'rd_pros_pharmacy', title: 'The pharmacy line', at: ['travel'],
      text: 'You stop in a small-town pharmacy for blister plasters. The woman ahead of you is juggling three prescription bags, a phone on speaker ("Mom, I\'m getting them now"), and a parking ticket.',
      choices: [
        { label: 'Let her go ahead and hold a bag', kind: 'help',
          then: { text: '"Thank you. Sorry. It\'s my mom, and my kids, and work, and..." She laughs at herself. "What do you do?" You tell her. She stops laughing. "Do you help people with... parents? Like, planning for them?"',
            choices: [
              { label: '"I do. Can I call you next week?"', kind: 'prepare', eff: { energy: -1, prospect: { temp: 'warm', source: 'a caregiver in a pharmacy line', bias: { caregiver: 3 }, event: true } }, result: 'She writes her number on the parking ticket, then realizes and laughs. (New prospect in your pipeline.)' },
              { label: 'Give her a card, no pressure', kind: 'around', eff: () => ((roll = PP.chance(0.6)) ? { prospect: { temp: 'cold', source: 'a card in a pharmacy line', bias: { caregiver: 3 }, event: true } } : {}), preview: '60% chance of a cold prospect.', result: () => roll ? 'She tucks it in her phone case. "When things calm down." Things may not calm down. (New prospect.)' : 'She thanks you and rushes off. The card stays on the counter.' }
            ] } },
        { label: 'Just get your plasters', kind: 'through', eff: { energy: 1 }, result: 'Your feet thank you.' }
      ]
    },
    {
      id: 'rd_pros_windfall', title: 'A check on the diner counter', at: ['travel'],
      text: 'At a roadside diner, a man is showing a check to the waitress. "My aunt left it to me. I didn\'t even know she liked me." The waitress says, "Buy a boat." The cook shouts, "Buy a food truck!" He looks overwhelmed.',
      choices: [
        { label: 'Suggest he wait before deciding anything', kind: 'prepare', hint: 'Calm is rare at this counter.', eff: { prospect: { temp: 'warm', source: 'a man with an inheritance at a diner', bias: { windfall: 3 }, event: true } }, result: '"Wait? Nobody\'s said wait." He asks for your card. The cook looks disappointed. (New prospect in your pipeline.)' },
        { label: 'Pitch him hard, right there', kind: 'through', eff: () => ((roll = PP.chance(0.5)) ? { trust: -1, prospect: { temp: 'hot', source: 'a hard pitch at a diner', bias: { windfall: 3 }, event: true } } : { trust: -1 }), preview: 'A coin flip for a hot prospect. Your client watches either way (Trust -1).', result: (s) => roll ? `He signs up for a meeting, slightly dazed. ${C(s)} raises an eyebrow at you.` : `He backs away toward the pie case. ${C(s)} pretends not to know you.` },
        { label: 'Mind your own pancakes', kind: 'around', eff: { energy: 1 }, result: 'Excellent pancakes, as it happens.' }
      ]
    },
    {
      id: 'rd_pros_overlook', title: 'A countdown at the overlook', at: ['travel'],
      text: 'At a scenic overlook, an older couple is not looking at the view. They are looking at an app on his phone: 412 DAYS UNTIL RETIREMENT. "Four hundred and twelve," he says. "And then what?" she says.',
      choices: [
        { label: '"That\'s the best question there is."', kind: 'prepare', eff: { energy: -1, prospect: { temp: 'warm', source: 'a couple at a scenic overlook', bias: { retiree: 3 }, event: true } }, result: 'They talk for twenty minutes, mostly to each other, a little to you. They want to continue it properly. (New prospect in your pipeline.)' },
        { label: 'Offer to take their photo', kind: 'around', eff: { trust: 1 }, result: (s) => `You take a lovely photo. ${C(s)} says, "That'll be me someday," and goes quiet in a thoughtful way.` },
        { label: 'Enjoy the view yourself', kind: 'through', eff: { energy: 1 }, result: 'It is a very good view.' }
      ]
    },
    {
      id: 'rd_pros_laundromat', title: 'Small socks at the laundromat', at: ['travel'],
      text: 'At a laundromat, a man is folding very small socks with great concentration. A sticky note on his basket: "Weds/Sat = kids. DON\'T FORGET SOCCER." He catches you looking. "New arrangement. I\'m getting the hang of it."',
      choices: [
        { label: 'Fold a few socks and chat', kind: 'help', hint: 'Kindness first. Business maybe.',
          then: { text: '"Everything is in two places now. Two homes, two calendars, two of every charger. I don\'t even know what I own anymore."',
            choices: [
              { label: '"When you\'re ready, I can help sort that out."', kind: 'prepare', eff: { energy: -1, prospect: { temp: 'warm', source: 'a dad at a laundromat', bias: { changes: 3 }, event: true } }, result: '"When I\'m ready." He takes your card and puts it in a sock. (New prospect in your pipeline.)' },
              { label: 'Just keep folding', kind: 'around', eff: { trust: 1, energy: 1 }, result: 'You fold in companionable silence. It is weirdly restful.' }
            ] } },
        { label: 'Nod and switch your load', kind: 'through', eff: { momentum: 1 }, result: 'Your socks are also small, metaphorically.' }
      ]
    },
    {
      id: 'rd_pros_formula', title: 'A broken formula', at: ['travel'],
      text: 'In a café, a woman glares at her laptop. "#REF! Again! Why!" She notices your notebook full of numbers. "You. You look like you understand spreadsheets. Please."',
      choices: [
        { label: 'Fix it, and ask what the sheet is for', kind: 'prepare', eff: { energy: -1, prospect: { temp: 'warm', source: 'a spreadsheet you fixed in a café', bias: { numbers: 3 }, event: true } }, result: '"It\'s my whole life. In twelve tabs." She wants a second opinion on all twelve. (New prospect in your pipeline.)' },
        { label: 'Fix it and dash', kind: 'around', eff: { energy: -1, insight: 1 }, result: 'One misplaced dollar sign. She calls you a wizard. You feel like one.' },
        { label: 'Pretend you don\'t understand spreadsheets', kind: 'through', eff: { momentum: 1, style: { overcomplicate: -1 } }, result: 'A lie, but a restful one.' }
      ]
    },
    {
      id: 'rd_pros_stakefriend', title: 'A friend of a friend', at: ['travel'],
      when: (s) => s.res.trust >= 5 && !!s.client.shortStake,
      text: (s) => `${C(s)}'s phone buzzes. It's ${S(s)}. ${C(s)} reads the text aloud: "Tell your guide my coworker could use some help too. She's a mess. Lovingly."`,
      choices: [
        { label: '"I\'d love to meet her, after we\'re done here."', kind: 'prepare', eff: (s) => ({ trust: 1, prospect: { temp: 'warm', source: `${S(s)}'s coworker` } }), result: (s) => `${C(s)} sends back a thumbs up and looks pleased to be the one making the introduction. (New prospect in your pipeline.)` },
        { label: 'Ask for her number now', kind: 'through', eff: (s) => ({ momentum: -1, prospect: { temp: 'hot', source: `${S(s)}'s coworker` } }), result: (s) => `${C(s)} forwards the number, a bit slowly. You've just made their journey about someone else for a minute. (Hot prospect in your pipeline.)` },
        { label: '"Let\'s stay focused on you for now."', kind: 'around', eff: { trust: 1 }, result: (s) => `${C(s)} smiles. "Fair. I like being the focus."` }
      ]
    },
    {
      id: 'rd_pros_fair', title: 'A street fair with an empty table', at: ['travel'], weight: 0.8,
      when: (s) => s.day >= 2,
      text: (s) => `The trail passes through a small town having its summer street fair. There's an empty folding table between the honey stand and a man selling birdhouses. The organizer says you can have it for the afternoon. ${C(s)} is eyeing the kettle corn.`,
      choices: [
        { label: 'Set up for an afternoon', kind: 'prepare', hint: 'A real day of prospecting. Your client waits.', eff: (s) => ({ days: 1, energy: -1, momentum: -1, prospect: { temp: 'warm', source: 'a street fair table', event: true } }), result: (s) => `You hand out forty cards and have three real conversations. One of them wants a meeting. (New prospect in your pipeline.) ${C(s)} bought a birdhouse.` },
        { label: 'Wander the fair together for an hour', kind: 'around', eff: (s) => ({ trust: 1, energy: 1, momentum: -1 }), result: (s) => `You split kettle corn with ${C(s)}. They tell you more in an hour of browsing than in two days of walking.` },
        { label: 'Keep walking', kind: 'through', eff: { momentum: 1 }, result: 'The smell of kettle corn follows you for a mile.' }
      ]
    },

    /* ================= MENTORS & PEERS ================= */
    {
      id: 'rd_mentor_checklist', title: 'A pilot at a picnic table', at: ['travel'],
      when: (s) => PP.skill(s, 'preparation') < 2,
      text: 'A retired pilot is going through a checklist before eating her sandwich. Sandwich: present. Napkin: present. Mustard: checked. She looks up. "Forty years, never lost a plane. Want to know why?"',
      choices: [
        { label: 'Spend a day learning her method', kind: 'prepare', eff: { days: 1, energy: -1, skill: { preparation: 1 } }, result: '"You don\'t rise to the occasion. You fall to your preparation." You build your first real pre-meeting checklist. (+1 Preparation, for the rest of your career.)' },
        { label: 'Ask for the short version', kind: 'around', eff: { insight: 1 }, result: '"Check the boring things. The interesting things check themselves." Noted.' },
        { label: '"I\'m more of an improviser."', kind: 'through', eff: { momentum: 1 }, result: 'She writes something on her napkin. You suspect it\'s about you.' }
      ]
    },
    {
      id: 'rd_mentor_organizer', title: 'Someone who knows everyone', at: ['travel'],
      when: (s) => PP.skill(s, 'resourcefulness') < 2,
      text: 'A community organizer with a clipboard, three lanyards, and a phone that never stops buzzing waves you down. "Help me hand out these flyers for the food drive and I\'ll show you how I keep track of six hundred people."',
      choices: [
        { label: 'Hand out flyers all afternoon', kind: 'help', eff: { energy: -2, skill: { resourcefulness: 1 }, style: { soloist: -1 } }, result: '"Everyone has one thing they\'re great at. Write it down, then ask for it." You now know a plumber, a notary, and a man with a truck. (+1 Resourcefulness.)' },
        { label: 'Hand out a few, ask one question', kind: 'around', eff: { energy: -1, insight: 1 }, result: '"Never ask for help on the day you need it. Ask a month before." Hm.' },
        { label: 'Politely decline', kind: 'through', eff: { momentum: 1 }, result: 'She is already asking someone else. She will know their name by sundown.' }
      ]
    },
    {
      id: 'rd_mentor_adjuster', title: 'Lunch with a claims adjuster', at: ['travel'],
      when: (s) => PP.skill(s, 'judgment') < 2,
      text: 'At a diner counter, a retired claims adjuster is doing the crossword in pen. "Thirty years seeing how things go wrong," she says, without looking up. "Buy me lunch and I\'ll tell you the three ways it always goes wrong."',
      choices: [
        { label: 'Buy her lunch ($40)', kind: 'help', show: afford(40), eff: { cash: -40 },
          then: { text: '"One: nobody asked. Two: somebody assumed. Three: everybody knew, and nobody wrote it down." She fills in 14-Across. "Want to know which one you are?"',
            choices: [
              { label: '"Yes. Tell me."', kind: 'prepare', eff: (s) => (s.debt.length ? { skill: { judgment: 1 }, energy: -1, clearDebt: s.debt[0].tag } : { skill: { judgment: 1 }, energy: -1 }), result: 'She reads your notes like a menu and puts her pen on one line. It stings. She\'s right, and you fix it before dessert. (+1 Judgment.)' },
              { label: '"I think I know."', kind: 'around', eff: { insight: 1 }, result: '"Everyone thinks they know." She finishes the crossword. In pen.' }
            ] } },
        { label: 'Ask for the free version', kind: 'around', eff: { insight: 1 }, result: '"Free version: write it down." She goes back to her crossword.' },
        { label: 'Keep moving', kind: 'through', eff: { momentum: 1 }, result: 'She does not look up.' }
      ]
    },
    {
      id: 'rd_mentor_peersystem', title: 'A peer with a system', at: ['travel'], weight: 0.9,
      when: (s) => !!missingSystem(s),
      text: (s) => `At a campsite you meet Tamsin, an agent a few years ahead of you, eating chili out of the pot. She sees your messy notes and winces. "Oh, honey. Want me to set you up with my ${sysName(missingSystem(s))}? It changed my life. It'll cost you a day and a bit for the templates."`,
      choices: [
        { label: 'Pay for the templates and spend the day ($350)', kind: 'help', show: afford(350), eff: { cash: -350, days: 1, energy: -1, style: { soloist: -1 } },
          then: { text: (s) => `By the end of the day, you have a working ${sysName(missingSystem(s))}, three color-coded tabs, and chili on your sleeve. "Now use it every single time," Tamsin says, "or it's just decor."`,
            choices: [
              { label: 'Try it on your current client right away', kind: 'prepare', eff: { insight: 1 }, result: (s) => { const id = missingSystem(s); if (id) s.career.systems[id] = true; return `It works. You've built your ${sysName(id)}, for the rest of your career.`; } }
            ] } },
        { label: 'Ask her to just show you how she thinks', kind: 'around', eff: { insight: 1, energy: -1 }, result: '"Same questions, same order, every time. Boring is the point." You write that on your hand.' },
        { label: '"I\'ve got my own way."', kind: 'through', eff: { style: { soloist: 1 }, momentum: 1 }, result: 'Tamsin shrugs and eats more chili.' }
      ]
    },
    {
      id: 'rd_mentor_why', title: 'The why kid', at: ['travel'],
      when: (s) => PP.skill(s, 'curiosity') < 2,
      text: 'At a rest stop, a six-year-old attaches herself to you while her parents fill water bottles. "What do you do?" You tell her. "Why?" You explain. "Why?" You explain again, more deeply. "Why?"',
      choices: [
        { label: 'Keep answering. Every single why.', kind: 'prepare', eff: { energy: -1, skill: { curiosity: 1 } }, result: 'Seven whys in, you say something true about your own work that you have never said out loud. Out of the mouths of babes. (+1 Curiosity.)' },
        { label: 'Turn it around: "Why do YOU think?"', kind: 'around', eff: { insight: 1, trust: 1 }, result: (s) => `She thinks about it seriously and says, "Because people are scared?" ${C(s)}, overhearing, laughs a little too hard.` },
        { label: '"Because. Go find your mom."', kind: 'through', eff: { momentum: 1 }, result: 'She goes. She asks her mom why you were grumpy.' }
      ]
    },
    {
      id: 'rd_mentor_nurse', title: 'A nurse on her break', at: ['travel'],
      when: (s) => PP.skill(s, 'communication') < 2,
      text: 'Outside a small clinic, a nurse in scrubs is sitting on the curb with a coffee. You get talking. "Hard news? I give it every day. There\'s a way to do it so people can actually hear you."',
      choices: [
        { label: 'Ask her to teach you, properly', kind: 'prepare', eff: { days: 1, skill: { communication: 1 } }, result: '"Warn them it\'s coming. Say it plainly. Then stop talking." You practice on her for an hour. She is a tough audience. (+1 Communication.)' },
        { label: 'Ask for one tip', kind: 'around', eff: { insight: 1 }, result: '"Silence is not your enemy. Let them fill it." Okay.' },
        { label: 'Let her enjoy her break', kind: 'through', eff: { trust: 1 }, result: (s) => `${C(s)} saw you leave her in peace. Small things.` }
      ]
    },
    {
      id: 'rd_mentor_mailcarrier', title: 'The mail carrier', at: ['travel'],
      text: 'A mail carrier with calves like bowling pins strides past. "Twenty-two years on this route. Every shortcut, every dog, every dead end. Walk with me tomorrow and I\'ll show you."',
      choices: [
        { label: 'Walk her route for a day', kind: 'prepare', eff: (s) => (PP.skill(s, 'navigation') < 2 ? { days: 1, energy: -1, skill: { navigation: 1 } } : { days: 1, reveal: true }), result: (s) => 'By evening you can read the land like she does. (Your sense of the map improves.)' },
        { label: 'Ask her to sketch the area', kind: 'around', eff: () => ((roll = PP.chance(0.5)) ? { reveal: true } : { insight: 1 }), preview: '50% chance she maps the whole region for you.', result: () => roll ? 'She draws the whole region on the back of a parcel slip, from memory. The fog lifts.' : 'She draws a very good map of where the dogs are.' },
        { label: 'Thank her and push on', kind: 'through', eff: { momentum: 1 }, result: 'She is out of sight in about four seconds.' }
      ]
    },
    {
      id: 'rd_mentor_studygroup', title: 'Case review at the campsite', at: ['travel'], weight: 1.2,
      when: (s) => s.debt.length >= 2,
      text: 'Around a campfire, four agents are doing an informal case review: one person describes a client, the others poke holes. "Room for one more," says a woman in a beanie. "Bring your hardest file. Fair warning, we\'re brutal."',
      choices: [
        { label: 'Put your file on the table', kind: 'help', hint: 'Exposing your gaps is uncomfortable. That\'s the point.',
          then: { text: (s) => `They go quiet for a minute. Then the woman in the beanie says: "What about ${PP.content.debts[s.debt[0].tag].label.toLowerCase()}?" Everyone nods. Then someone mentions a second thing.`,
            choices: [
              { label: 'Stay up late fixing both', kind: 'prepare', eff: (s) => ({ energy: -2, clearDebt: s.debt[0].tag, insight: 1 }), result: (s) => 'Until midnight, with borrowed coffee. One problem is genuinely solved. The other you will deal with, eyes open.' },
              { label: 'Write it down and sleep on it', kind: 'around', eff: { insight: 1, energy: 1 }, result: 'At least now you know. Knowing is something.' }
            ] } },
        { label: 'Just listen to their cases', kind: 'around', eff: { insight: 1, energy: -1 }, result: 'You learn more from their mistakes than you\'d like to admit about your own.' },
        { label: 'Go to bed early', kind: 'through', eff: { energy: 2, style: { soloist: 1 } }, result: 'Their laughter drifts over the tents until late.' }
      ]
    },

    /* ================= YOUR CLIENT ON THE TRAIL ================= */
    {
      id: 'rd_cl_speaker', title: 'You\'re on speaker', at: ['travel'],
      text: (s) => `${C(s)}'s phone rings. "It's ${S(s)}," they say, and before you can react: "You're on speaker! My guide is here!" A pause. Then ${S(s)}'s voice: "Oh. Hello. And who exactly are you?"`,
      choices: [
        { label: 'Introduce yourself and ask what they think', kind: 'prepare', hint: 'A surprise chance to hear another voice.',
          then: { text: (s) => `${S(s)} is warier than you'd like. "I just want to make sure nobody's selling ${C(s)} something."`,
            choices: [
              { label: '"Fair. What would you want me to understand?"', kind: 'prepare', eff: (s) => ({ insight: 1, momentum: -1, fact: s.client.stakeholderFact, trust: 1 }), result: (s) => `${S(s)} talks for ten minutes. Some of it is exactly what you needed: ${label(s, s.client.stakeholderFact)}.` },
              { label: 'Reassure them it\'s all under control', kind: 'through', eff: (s) => ({ momentum: 1, debt: K(s, s.client.stakeholderFact) ? [] : { tag: 'unknown_stakeholder', sev: 1 } }), result: (s) => `"Mm-hm," says ${S(s)}. That "mm-hm" is going to come back.` }
            ] } },
        { label: 'Wave and give them privacy', kind: 'around', eff: (s) => (K(s, s.client.stakeholderFact) ? { trust: 1 } : { trust: 1, missed: s.client.stakeholderFact }), result: (s) => `You walk ahead. Behind you, you hear ${C(s)} say "I know, I know" several times.` },
        { label: 'Offer to set up a proper call for all three of you', kind: 'help', show: comm, hint: 'Communication: slower, steadier.', eff: (s) => ({ momentum: -1, trust: 2, fact: s.client.stakeholderFact }), result: (s) => `${S(s)} sounds surprised, then pleased. "Nobody's ever asked me before."` }
      ]
    },
    {
      id: 'rd_cl_goodnews', title: 'Good news!', at: ['travel'],
      text: (s) => `${C(s)} whoops at their phone. "A refund I completely forgot about just landed! It's not huge, but it's not nothing!" They're already talking about what to do with it.`,
      choices: [
        { label: 'Celebrate, then ask what it changes', kind: 'prepare', hint: 'Good news is a window into priorities.',
          then: { text: (s) => `${C(s)} thinks. "Honestly? My first thought was ${S(s)}. My second thought was, finally, something just for me. Is that bad?"`,
            choices: [
              { label: '"Not bad at all. Tell me more about both."', kind: 'prepare', eff: (s) => Object.assign({ insight: 2, trust: 1 }, unknownFact(s) && opens(s) ? { fact: unknownFact(s) } : {}), result: 'The refund turns out to be the least interesting part of the conversation.' },
              { label: '"Let\'s fold it into the plan."', kind: 'through', eff: { momentum: 1 }, result: 'Neat and tidy. They look slightly deflated.' }
            ] } },
        { label: 'Fold it into the plan right away', kind: 'through', eff: { momentum: 2, debt: { tag: 'assumed_goal', sev: 1 } }, result: (s) => `You have a plan for the refund before ${C(s)} finishes the sentence. They had a plan too.` },
        { label: 'Just celebrate', kind: 'around', eff: { trust: 1, energy: 1 }, result: 'You both do a small, awkward victory dance. Nobody sees. Probably.' }
      ]
    },
    {
      id: 'rd_cl_badnews', title: 'Bad news', at: ['travel'],
      text: (s) => `${C(s)} goes pale reading a text. "The car. The mechanic says it's the transmission, or the 'thing next to the transmission.' Either way, it's a lot." They sit down on a rock.`,
      choices: [
        { label: 'Sit with them for a bit', kind: 'prepare', hint: 'The plan can wait an hour.', eff: { momentum: -1, trust: 2 }, result: (s) => `You sit on the next rock. After a while ${C(s)} says, "Okay. Okay. Thanks." It mattered.` },
        { label: 'Help them sketch what this changes, on paper', kind: 'help', eff: { energy: -1, insight: 1, trust: 1 }, result: 'One page, three numbers. It\'s less scary written down. Not fun, but less scary.' },
        { label: '"Let\'s keep going, it won\'t change the plan."', kind: 'through', eff: { momentum: 1, trust: -1, debt: { tag: 'ignored_change', sev: 2 } }, result: 'It might change the plan. You both know that.' }
      ]
    },
    {
      id: 'rd_cl_tangent', title: 'A long story about a dog', at: ['travel'],
      text: (s) => `"Did I ever tell you," ${C(s)} begins, "about the dog we had growing up? Pickles? This is relevant, I promise." It is mile two of the story. It does not seem relevant.`,
      choices: [
        { label: 'Listen all the way through', kind: 'prepare', hint: 'Tangents sometimes go somewhere.', eff: (s) => ((roll = PP.chance(0.45) && !!unknownFact(s)) ? { energy: -1, trust: 1, fact: unknownFact(s) } : { energy: -1, trust: 1 }), preview: 'Energy -1, Trust +1, and a 45% chance the story lands on something real.', result: (s) => roll ? 'Mile four: the story about Pickles turns, out of nowhere, into something you really needed to know.' : 'Pickles was a very good dog. That is the whole story. You feel closer, anyway.' },
        { label: 'Steer it back, gently', kind: 'around', eff: (s) => ({ momentum: 1, trust: comm(s) ? 0 : -1 }), result: (s) => comm(s) ? '"I want to hear the end of that at dinner. Can I ask about one thing first?" Smooth.' : `${C(s)} trails off mid-Pickles. A little hurt.` },
        { label: 'Nod along while checking email', kind: 'through', eff: { momentum: 1, trust: -1 }, result: (s) => `${C(s)} stops talking. You didn't notice for a while. They did.` }
      ]
    },
    {
      id: 'rd_cl_fear', title: 'What if it still goes wrong?', at: ['travel'],
      when: (s) => s.day >= 3,
      text: (s) => `Walking uphill, ${C(s)} says, out of nowhere: "What if I do all of this, every step, and it still goes wrong?"`,
      choices: [
        { label: '"What would \'wrong\' look like?"', kind: 'prepare', hint: 'Fears usually have a shape.',
          then: { text: (s) => { const w = worry(s); return w ? (opens(s) || !w.guarded ? w.text : w.guarded) : '"I don\'t know. Just... wrong."'; },
            choices: [
              { label: 'Say it back to them, in plain words', kind: 'prepare', eff: (s) => { const w = worry(s); return Object.assign({ trust: 1, insight: 1 }, w && w.fact && (opens(s) || !w.guarded) ? { fact: w.fact } : {}); }, result: (s) => `${C(s)} nods slowly. "Yeah. That's it. That's the thing." The hill feels shorter.` },
              { label: 'Tell them what you would do if it happened', kind: 'around', eff: { trust: 1, momentum: 1 }, result: 'A plan for the bad day. It doesn\'t make the fear go away, but it gives it somewhere to sit.' }
            ] } },
        { label: '"It won\'t. Trust me."', kind: 'through', hint: 'Comforting, briefly.', eff: { momentum: 1, debt: { tag: 'unchallenged_assumption', sev: 2 }, style: { avoid: 1 } }, result: 'They say "okay." They don\'t look okay.' },
        { label: '"Honestly? Some of it might. That\'s why we plan."', kind: 'around', eff: (s) => ({ trust: comm(s) ? 2 : 1, momentum: -1 }), result: (s) => `${C(s)} laughs, surprised. "That's weirdly comforting."` }
      ]
    },
    {
      id: 'rd_cl_honesty', title: 'A pointed question', at: ['travel'], weight: 1.1,
      when: (s) => s.day >= 2,
      text: (s) => `Over lunch, ${C(s)} puts down their sandwich. "Can I ask you something? If you weren't getting paid for this, would you still tell me to do what you're telling me to do?"`,
      choices: [
        { label: 'Answer honestly, including how you get paid', kind: 'prepare', hint: 'The real answer is the only one that works later.',
          then: { text: (s) => `${C(s)} listens, then pushes once more: "And is there anything you're not sure about? With me, I mean."`,
            choices: [
              { label: 'Name the thing you\'re least sure of', kind: 'prepare', eff: (s) => (unknownFact(s) ? { trust: 2, insight: 1, fact: s.res.trust >= 5 ? unknownFact(s) : [] } : { trust: 2 }), preview: 'Trust +2. With Trust 5+, they fill the gap for you.', result: (s) => s.res.trust >= 5 ? `${C(s)} fills in the gap themselves. "Oh, that? Here's the thing..."` : `${C(s)} nods. "Okay. Thanks for saying it." That will matter later.` },
              { label: '"No, I\'m confident."', kind: 'through', eff: { momentum: 1, debt: { tag: 'unchallenged_assumption', sev: 1 } }, result: 'They study you for a second, then pick the sandwich back up.' }
            ] } },
        { label: '"Of course. I only care about you."', kind: 'through', eff: { momentum: 1, trust: -1 }, result: (s) => `${C(s)} smiles politely, the way people smile at a waiter who says every dish is their favorite.` },
        { label: 'Laugh it off', kind: 'around', eff: { style: { avoid: 1 } }, result: 'The sandwich is finished in silence.' }
      ]
    },
    {
      id: 'rd_cl_yourmistake', title: '"That\'s not what you said before"', at: ['travel'],
      when: (s) => s.day >= 3,
      text: (s) => `${C(s)} flips back through their own notes. "On day two you said one thing about the timing. Today you said something different. Which is it?" They are watching your face carefully.`,
      choices: [
        { label: '"I got it wrong earlier. Here\'s the correct version."', kind: 'prepare', hint: 'Admitting a mistake costs pride, not trust.', eff: (s) => ({ trust: comm(s) ? 2 : 1, insight: 1, clearDebt: 'timeline' }), result: (s) => `${C(s)} visibly relaxes. "Okay. Good. I'd rather you just tell me."` },
        { label: 'Blur it: "Both are true, in a way."', kind: 'through', eff: { momentum: 1, debt: { tag: 'confused_client', sev: 2 } }, result: 'They write down both versions with a question mark. That question mark will reappear.' },
        { label: 'Blame Operations', kind: 'around', eff: { trust: -1, momentum: 1 }, result: (s) => `"Operations, huh." ${C(s)} does not sound convinced. Somewhere, Olu sneezes.` }
      ]
    },
    {
      id: 'rd_cl_onemeeting', title: '"My friend did it in one meeting"', at: ['travel'],
      text: (s) => `"My friend says her agent did her whole plan in one meeting," ${C(s)} says. "Forty-five minutes. Why are we on day ${s.day}?"`,
      choices: [
        { label: 'Explain what you\'ve learned that one meeting would have missed', kind: 'prepare', eff: (s) => (Object.keys(s.facts).length >= 2 ? { trust: 2, momentum: 1 } : { trust: -1, insight: 1 }), preview: 'Convincing if you\'ve already learned at least two real facts. Otherwise it falls flat.', result: (s) => Object.keys(s.facts).length >= 2 ? `You name two things you only found out on the trail. ${C(s)} goes quiet. "Okay, fair."` : 'You struggle to name much. That\'s worth noticing.' },
        { label: 'Offer to speed up', kind: 'through', eff: { pace: 'brisk', momentum: 2, debt: { tag: 'rushed_pace', sev: 1 } }, result: 'You pick up the pace. Your feet file a complaint.' },
        { label: '"Is your friend happy with her plan?"', kind: 'around', eff: () => ((roll = PP.chance(0.5)) ? { trust: 1, insight: 1 } : { momentum: -1 }), preview: 'A coin flip, depending on the friend.', result: (s) => roll ? `${C(s)} pauses. "Actually... she just switched agents." Huh.` : `"She loves it." Well. Good for her.` }
      ]
    },
    {
      id: 'rd_cl_silent', title: 'Earbuds in', at: ['travel'],
      when: (s) => s.res.trust < 5,
      text: (s) => `${C(s)} has had their earbuds in since breakfast. When you say something, they take one out, say "Sorry?", and put it back in before you finish.`,
      choices: [
        { label: 'Walk beside them and wait', kind: 'prepare', hint: 'Patience is a kind of question.', eff: { trust: 1, momentum: -1 }, result: (s) => `After an hour, ${C(s)} takes both earbuds out. "Sorry. I'm just tired of thinking about this stuff." That's honest. You can work with honest.` },
        { label: 'Ask straight out if something\'s wrong', kind: 'through', eff: (s) => ((roll = comm(s) || PP.chance(0.5)) ? { trust: comm(s) ? 2 : 1, insight: 1 } : { trust: -1 }), preview: 'With Communication, it lands. Without it, a coin flip.', result: () => roll ? `"Honestly? I wasn't sure you were listening to me." Ouch. And fair.` : '"Nothing\'s wrong." Something is wrong.' },
        { label: 'Give them space and push the pace', kind: 'around', eff: { momentum: 1, debt: { tag: 'missed_message', sev: 1 } }, result: 'Lots of miles. Very few words.' }
      ]
    },
    {
      id: 'rd_cl_thanks', title: 'An unexpected thank-you', at: ['travel'], cut: 'campfire', weight: 1.2,
      when: (s) => s.res.trust >= 7,
      text: (s) => `By the fire, ${C(s)} hands you a slightly squashed granola bar. "Saved you one. Also... I wanted to say, you're good at this. I've never told anyone this much about my life without feeling judged."`,
      choices: [
        { label: 'Just say thank you', kind: 'around', eff: { energy: 2 }, result: 'You eat the granola bar. It is the best granola bar of your life.' },
        { label: 'Use the moment to ask the harder question', kind: 'prepare', hint: 'Trust is high. So are the stakes.', eff: (s) => (K(s, s.client.keyFact) ? { insight: 1, trust: 1 } : opens(s) ? { fact: s.client.keyFact, insight: 2 } : { insight: 1, trust: -1 }), result: (s) => K(s, s.client.keyFact) ? `${C(s)} answers without hesitating. You now understand: ${label(s, s.client.keyFact)}.` : 'Too soon. They change the subject, and the warmth dims a little.' },
        { label: 'Tell them about your own week', kind: 'help', eff: { trust: 1, energy: 1 }, result: (s) => `${C(s)} listens to you for once. It feels like a partnership.` }
      ]
    },
    {
      id: 'rd_cl_signtoday', title: '"Can we just sign something?"', at: ['travel'], weight: 1.1,
      when: (s) => s.day >= 5,
      text: (s) => `${C(s)} stops in the middle of the trail. "I'm tired. Can we just sign something today and be done? Anything. You pick."`,
      choices: [
        { label: 'Take the signature', kind: 'through', hint: 'A yes is not the same as the right yes.', eff: { momentum: 3, debt: { tag: 'premature_pitch', sev: 2 } }, result: 'They sign. Neither of you is quite sure what they signed up for.' },
        { label: 'Find one small, real step they can say yes to', kind: 'prepare', eff: { momentum: 1, insight: 1, trust: 1 }, result: (s) => `One small thing, done today. ${C(s)} sleeps better, and so do you.` },
        { label: '"Let\'s rest a day, then decide."', kind: 'around', eff: { days: 1, energy: 2, trust: 1, momentum: -1 }, result: 'A lazy day by a lake. The next morning they say, "Okay. I\'m back. Let\'s do it properly."' }
      ]
    },
    {
      id: 'rd_cl_personal', title: '"What about you?"', at: ['travel'],
      text: (s) => `${C(s)} turns the tables. "You know everything about me. What about you? Why do you do this? And does anyone do this for you?"`,
      choices: [
        { label: 'Tell them the real reason', kind: 'prepare', eff: { trust: 2, energy: -1 }, result: (s) => `You tell them. It's more personal than you planned. ${C(s)} says, "Huh. Okay. That makes sense of you."` },
        { label: 'Give the polished answer', kind: 'through', eff: { momentum: 1 }, result: '"I just love helping people!" It\'s true. It\'s also a bit like a brochure.' },
        { label: 'Admit you\'re still figuring out your own plan', kind: 'around', eff: (s) => ({ trust: 1, energy: s.res.energy <= 4 ? 1 : 0 }), result: (s) => `${C(s)} laughs. "Oh good, you're a person." It's oddly a relief to say it.` }
      ]
    },
    {
      id: 'rd_cl_onesentence', title: '"In one sentence, please"', at: ['travel'], weight: 1.2,
      when: (s) => s.style.overcomplicate > 0,
      text: (s) => `${C(s)} holds up a hand mid-explanation. "I'm going to be honest. I stopped following you about four tabs ago. Can you tell me the plan in one sentence?"`,
      choices: [
        { label: 'Try. One sentence.', kind: 'prepare', eff: (s) => (comm(s) || s.res.insight >= 5 ? { trust: 2, style: { overcomplicate: -1 } } : { trust: 1, insight: -1, style: { overcomplicate: -1 } }), preview: 'Easy with Communication or Insight 5+. Otherwise you discover you can\'t, yet.', result: (s) => comm(s) || s.res.insight >= 5 ? `One sentence. ${C(s)} repeats it back. Perfectly.` : 'You get to sentence four. Clearly the plan isn\'t clear to you yet either. Useful to know.' },
        { label: 'Draw it instead', kind: 'help', eff: { trust: 1, energy: -1, style: { overcomplicate: -1 } }, result: 'Three boxes and an arrow on the back of a trail map. They take a photo of it.' },
        { label: '"It\'s complicated, but trust me."', kind: 'through', eff: { momentum: 1, debt: { tag: 'confused_client', sev: 2 }, style: { overcomplicate: 1 } }, result: 'They nod. It is the nod of the lost.' }
      ]
    },

    /* ================= LIFE OF AN AGENT ================= */
    {
      id: 'rd_life_compliance', title: 'A message from Compliance', at: ['travel'], cut: 'emails',
      text: 'Your phone pings. Subject line: "ACTION REQUIRED: Annual continuing education due Friday (3rd reminder)." There is a forty-minute module. It has a cartoon mascot named Audit the Owl.',
      choices: [
        { label: 'Do the module now, at a picnic table', kind: 'prepare', eff: { energy: -1 },
          then: { text: 'Audit the Owl asks: "A client\'s relative calls asking to change the client\'s address. What do you do?" The answer options are A) Change it, B) Verify with the client directly, C) Owl noises.',
            choices: [
              { label: 'B, obviously', kind: 'prepare', eff: (s) => (s.debt.some((d) => d.tag === 'unverified_details' || d.tag === 'fraud') ? { insight: 1, clearDebt: s.debt.find((d) => d.tag === 'unverified_details' || d.tag === 'fraud').tag } : { insight: 1 }), result: 'Correct! Audit the Owl does a little dance. It also reminds you of something you meant to double-check.' },
              { label: 'C, for morale', kind: 'around', eff: { energy: 1 }, result: 'Incorrect, but you feel better. You retake it. Pass.' }
            ] } },
        { label: 'Ask your assistant to remind you Thursday', kind: 'around', eff: () => ((roll = PP.chance(0.6)) ? { momentum: 1 } : { momentum: 1, debt: { tag: 'missed_message', sev: 1 } }), preview: '60% it works out. Otherwise Thursday gets away from you.', result: () => roll ? 'Thursday, a polite nudge. You do it on a bench in eleven minutes.' : 'Thursday comes and goes. Friday arrives with a fourth reminder, in red.' },
        { label: 'Archive it', kind: 'through', eff: { momentum: 1, debt: { tag: 'missed_message', sev: 2 } }, result: 'Out of sight. The owl is still watching, somewhere.' }
      ]
    },
    {
      id: 'rd_life_bookcall', title: 'Someone from your book is calling', at: ['travel'], cut: 'phones', weight: 1.3,
      when: (s) => book(s).length > 0,
      text: (s) => { target = shakiest(s); return `Your phone buzzes. It's ${target.name}, one of your clients back at the port. Third call this week. You haven't picked up the other two.`; },
      choices: [
        { label: 'Step away and call them properly', kind: 'prepare', hint: 'Your other clients keep the lights on.', eff: { energy: -1, momentum: -1 }, result: (s) => { if (target) target.sat = Math.min(10, (target.sat == null ? 7 : target.sat) + 3); return `${target ? target.name : 'They'} just needed ten minutes and a straight answer. "Thanks for calling back. I was starting to wonder." (They feel looked after.)`; } },
        { label: 'Ask your partner to handle it', kind: 'help', show: (s) => !!partner(s), eff: { momentum: 0 }, result: (s) => { if (target) target.sat = Math.min(10, (target.sat == null ? 7 : target.sat) + 2); return `${partner(s).name} calls ${target ? target.name : 'them'} within the hour. A text: "Sorted. You owe me a coffee."`; } },
        { label: 'Send a quick text: "On the trail, call you next week!"', kind: 'around', eff: { momentum: 1 }, result: (s) => { if (target) target.sat = Math.max(0, (target.sat == null ? 7 : target.sat) - 0.5); return `${target ? target.name : 'They'} replies "ok." Just "ok." Lowercase.`; } },
        { label: 'Let it ring', kind: 'through', eff: { momentum: 1 }, result: (s) => { if (target) target.sat = Math.max(0, (target.sat == null ? 7 : target.sat) - 1.5); return 'It stops ringing. That is somehow worse.'; } }
      ]
    },
    {
      id: 'rd_life_laptop', title: 'Four percent battery', at: ['travel'],
      text: 'Your laptop flashes a warning: 4% battery. It contains the client file, two half-written proposals, and every note you have taken this week. The charger is, you now recall, plugged into a wall at the port.',
      choices: [
        { label: 'Find a café with an outlet', kind: 'around', eff: { momentum: -1, energy: 1 }, result: 'Two hours, one muffin, one outlet behind a fern. Fully charged and slightly caffeinated.' },
        { label: 'Switch to paper and keep going', kind: 'prepare', hint: 'Slower. You actually think about what you write.', eff: (s) => ({ energy: -1, insight: PP.hasItem(s, 'notebook') ? 2 : 1 }), result: (s) => PP.hasItem(s, 'notebook') ? 'Your battered notebook comes into its own. Writing by hand, you notice something you\'d skimmed past.' : 'You write on the back of receipts. Messy, but you remember more.' },
        { label: 'Wing it from memory until it\'s sorted', kind: 'through', eff: { momentum: 1, debt: { tag: 'stale_info', sev: 2 } }, result: 'Your memory is great. Mostly great. Fairly great.' },
        { label: 'Your tech setup has everything in the cloud', kind: 'help', show: (s) => PP.career && PP.career.hasSystem(s.career, 'tech'), eff: { momentum: 1 }, result: 'You pull it all up on your phone. Past you, who set this up, deserves a raise.' },
        { label: 'Call Kenji', kind: 'help', contact: 'whisperer', show: (s) => PP.contactReady(s, 'whisperer'), eff: { momentum: 1, insight: 1 }, result: 'Kenji walks you through a power-saving trick and recovers a draft you thought was gone. "Charge your stuff," he adds.' }
      ]
    },
    {
      id: 'rd_life_conference', title: 'A conference invitation', at: ['travel'], weight: 0.8,
      when: (s) => !!s.career,
      text: 'An email: "You\'re invited to the Regional Practice Summit! Two days of panels, networking, and a tote bag. Registration: $600. It\'s just off this trail."',
      choices: [
        { label: 'Go ($600, two days)', kind: 'prepare', show: afford(600), hint: 'Real value, real cost. Your client waits.', eff: { cash: -600, days: 2, momentum: -2 },
          then: { text: 'The summit is loud, fluorescent, and full of name tags. You have time for one thing properly.',
            choices: [
              { label: 'Work the room', kind: 'around', eff: { energy: -1, prospect: { temp: 'warm', source: 'someone you met at the Regional Practice Summit', event: true } }, result: 'You meet an attendee who isn\'t an agent at all. They came with a friend and want help. (New prospect in your pipeline.)' },
              { label: 'Sit in the best workshop', kind: 'prepare', eff: (s) => { const weak = PP.SKILLS.map((k) => k.id).find((k) => PP.skill(s, k) === 0); return weak ? { skill: { [weak]: 1 } } : { insight: 2 }; }, result: 'One speaker is genuinely brilliant. You fill nine pages. (A skill improves.)' },
              { label: 'Skip the panels and sleep in the hotel', kind: 'help', eff: { energy: 4 }, result: 'Best sleep in weeks. The tote bag makes a nice pillow.' }
            ] } },
        { label: 'Watch the livestream at night', kind: 'around', eff: { energy: -1, insight: 1 }, result: 'Half the panels, from a sleeping bag, at 1.5x speed. Not bad.' },
        { label: 'Decline', kind: 'through', eff: { momentum: 1 }, result: 'You will see the photos. Everyone will be holding the tote bag.' }
      ]
    },
    {
      id: 'rd_life_burnout', title: 'Running on empty', at: ['travel'], weight: 1.5,
      when: (s) => s.res.energy <= 3,
      text: 'This morning you snapped at a barista for spelling your name wrong. Your name is short. You have reread the same paragraph four times. Something in you is very, very tired.',
      choices: [
        { label: 'Take a real day off. Phone in a drawer.', kind: 'prepare', hint: 'Rest is part of the work.', eff: { days: 1, energy: 4, momentum: -1 }, result: (s) => `You sleep, read a book that has nothing to do with money, and apologize to the barista. ${C(s)} says you look like a different person.` },
        { label: 'Push through', kind: 'through', eff: { momentum: 1, energy: -1, debt: { tag: 'rushed_pace', sev: 2 } }, result: 'You push through. You will not remember most of today, which is a bad sign.' },
        { label: 'Call a friend from the port', kind: 'help', eff: { energy: 2, style: { soloist: -1 } }, result: '"You sound terrible." "Thanks." "No, I mean it, go to bed." You go to bed. It helps.' },
        { label: 'Tell your client you need an easy day', kind: 'around', eff: (s) => ({ pace: 'steady', energy: 2, trust: s.res.trust >= 5 ? 1 : 0 }), result: (s) => `${C(s)} looks relieved. "Oh thank goodness, me too."` }
      ]
    },
    {
      id: 'rd_life_sickkid', title: 'The school nurse is calling', at: ['travel'],
      text: '"Hi, this is the school nurse. Your little one has a fever and is asking for you. And also for a popsicle, but mostly you."',
      choices: [
        { label: 'Tell your client the truth and go', kind: 'prepare', hint: 'Being a person can build trust.',
          then: { text: (s) => `${C(s)} waves you off before you finish explaining. "Go! Obviously go. Family first. We'll pick it up when you're back."`,
            choices: [
              { label: 'Go home for two days', kind: 'prepare', eff: { days: 2, trust: 2, momentum: -2, energy: 1 }, result: 'Two days of soup, cartoons, and a very sweaty little hand in yours. When you get back, your client asks how they are before anything else.' },
              { label: 'Go for the afternoon, back by morning', kind: 'around', eff: { days: 1, trust: 1, momentum: -1, energy: -1 }, result: 'A long drive each way. Worth every mile. You are very tired.' }
            ] } },
        { label: 'Ask your partner to cover the trail for a day', kind: 'help', show: (s) => !!partner(s), eff: (s) => ({ days: 1, momentum: -1, energy: 1, trust: 1 }), result: (s) => `${partner(s).name} meets ${C(s)} for coffee while you're gone. Things went fine. Better than fine, maybe.` },
        { label: 'Ask family to pick them up', kind: 'through', eff: { energy: -2, momentum: 1 }, result: 'Grandma has it covered. You spend the afternoon thinking about it anyway.' }
      ]
    },
    {
      id: 'rd_life_thankyou', title: 'A thank-you card', at: ['travel'], cut: 'mail',
      when: (s) => book(s).length > 0,
      text: (s) => { target = book(s)[Math.floor(Math.random() * book(s).length)]; return `A card catches up with you, forwarded by your assistant. It's from ${target.name}: "Thank you. I sleep better now. I told my neighbor about you. Hope that's okay!"`; },
      choices: [
        { label: 'Write back by hand, and follow up with the neighbor', kind: 'prepare', eff: { energy: -1, prospect: { temp: 'warm', source: 'a neighbor of one of your clients' } }, result: (s) => { if (target) target.sat = Math.min(10, (target.sat == null ? 7 : target.sat) + 1.5); return 'A proper note back. The neighbor answers your call on the second ring. (New prospect in your pipeline.)'; } },
        { label: 'Tuck it in your pack for a bad day', kind: 'around', eff: { energy: 2 }, result: 'You read it twice. You will read it again on a worse day.' },
        { label: 'Show your client', kind: 'help', eff: { trust: 1 }, result: (s) => `${C(s)} reads it and hands it back. "That'll be me, someday." Maybe it will.` }
      ]
    },
    {
      id: 'rd_life_signature', title: 'A missing signature', at: ['travel'],
      text: 'Your assistant calls. "Small thing. Remember the file you closed last month? Page four is missing a signature. Yours. Operations needs it by tomorrow or it bounces back to the start."',
      choices: [
        { label: 'Find a print shop and overnight it', kind: 'prepare', show: afford(60), eff: { cash: -60, energy: -1 }, result: 'A shop in the next town with a fax machine from another century. It works. Barely.' },
        { label: 'E-sign it from your phone', kind: 'help', show: (s) => PP.career && PP.career.hasSystem(s.career, 'tech'), eff: { momentum: 1 }, result: 'Tap, tap, done. Your assistant sends a celebration emoji.' },
        { label: 'Tell them to sign it for you', kind: 'through', hint: 'Easy. Very much not allowed.', eff: { momentum: 1, debt: { tag: 'defaults', sev: 3 } }, result: '"I... can\'t do that," your assistant says. "But I\'ll pretend I didn\'t hear it, and it can wait." It cannot really wait.' },
        { label: 'Ask Olu to sort it', kind: 'help', contact: 'operator', show: (s) => PP.contactReady(s, 'operator'), eff: { momentum: 1 }, result: 'Olu finds a form that makes the form unnecessary. Nobody knows how.' }
      ]
    },
    {
      id: 'rd_life_partner', title: 'Your partner calls', at: ['travel'], weight: 1.3,
      when: (s) => !!partner(s),
      text: (s) => `${partner(s).name} calls from the port. "So. Two things. A great lead walked in asking for you specifically. And I may have spilled coffee on the desk calendar. Mostly on your side."`,
      choices: [
        { label: '"Book the lead for when I\'m back. Thank you!"', kind: 'prepare', eff: (s) => ({ prospect: { temp: 'hot', source: `a walk-in ${partner(s).name} held for you` } }), result: (s) => `${partner(s).name}: "Already done. Also I bought a new calendar. It has dogs on it." (Hot prospect in your pipeline.)` },
        { label: '"Take that lead yourself. You deserve it."', kind: 'help', eff: { trust: 0, energy: 1 }, result: (s) => `A pause. "Really? ...Thanks." ${partner(s).name} sounds genuinely touched. Partnerships run on moments like this.` },
        { label: 'Spend twenty minutes reconstructing the calendar', kind: 'around', eff: { energy: -1, insight: 1, prospect: { temp: 'warm', source: 'a walk-in at your practice' } }, result: 'Together you rebuild the week. Nothing was missed, it turns out. The lead goes in your pipeline. (New prospect.)' }
      ]
    },
    {
      id: 'rd_life_recruit', title: 'Your recruit is panicking', at: ['travel'], weight: 1.4,
      when: (s) => !!recruit(s),
      text: (s) => `A text from ${recruit(s).name}: "first real client meeting in 1 hr. they have a binder. what do i do. what do i SAY."`,
      choices: [
        { label: 'Call and coach them for twenty minutes', kind: 'help', hint: 'Mentoring keeps people.', eff: { energy: -1, momentum: -1 }, result: (s) => { const r = recruit(s); if (r) r.lastMentor = s.career.days; return `"Ask about the binder. Listen. Write it down." An hour later: "IT WENT GREAT. they cried. good crying." ${r ? r.name : 'They'} will remember you picked up.`; } },
        { label: 'Send three bullet points', kind: 'around', eff: { energy: 0 }, result: '"1. Ask. 2. Listen. 3. Don\'t pitch." A thumbs up comes back. You hope it went okay.' },
        { label: '"You\'ll be fine! On the trail, ttyl"', kind: 'through', eff: { momentum: 1 }, result: 'No reply. You wonder about it, later, more than you expected.' }
      ]
    }
  );
})(window.PP);
