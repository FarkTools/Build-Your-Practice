/* World: landmarks, the trails between them (measured in days), destinations,
 * and the risk-debt catalogue. Coordinates are in a 1280 x 720 map space,
 * laid out to match the original concept map. */
(function (PP) {
  PP.content.nodes = {
    port: { name: 'Port Prospect', x: 112, y: 478, kind: 'port', label: [70, 524], teaser: 'Home. The coffee is free and mostly hot.',
      arrive: 'The harbor bell rings. Gulls argue over a bagel.' },
    meadows: { name: 'Meadows of Understanding', x: 168, y: 398, kind: 'meadow', major: true, label: [86, 338], color: 'green', teaser: 'Gentle green hills. Someone is waving.',
      arrive: 'Rolling hills, wildflowers, and a bench with a view. A good place to actually listen.' },
    lighthouse: { name: "Veteran's Lighthouse", x: 346, y: 220, kind: 'lighthouse', label: [372, 262], teaser: 'A beam sweeps slowly through the haze.',
      arrive: 'The lighthouse keeper has seen every kind of journey. She has opinions about all of them.' },
    wreck: { name: 'Relation-Ship Wreck', x: 218, y: 238, kind: 'wreck', side: true, label: [124, 268], color: 'blue', teaser: 'Something broken on the rocks. Singing nearby.',
      arrive: 'The wreck of a relationship that closed too fast. The Sirens of the Quick Close are still singing.' },
    fog: { name: 'Fog of Forgotten Info', x: 505, y: 200, kind: 'fog', label: [448, 166], color: 'grey', teaser: 'A bank of grey. Things go missing in there.',
      arrive: 'Thick grey fog. Did the client say "next year" or "next month"? Nobody remembers.' },
    loop: { name: 'Loop of Endless Data Entry', x: 520, y: 330, kind: 'loop', label: [318, 330], teaser: 'A trail that seems to circle back on itself.',
      arrive: 'The same form, again. You have definitely typed this address before. Several times.' },
    cliffs: { name: 'Product-First Cliffs', x: 392, y: 468, kind: 'cliffs', side: true, label: [416, 466], skull: true, teaser: 'A drop-off. People rush toward it.',
      arrive: 'A sheer drop. Many an eager agent has run straight off it, pitch deck first.' },
    swamp: { name: 'Spreadsheet Swamp', x: 705, y: 403, kind: 'swamp', major: true, label: [520, 412], color: 'green', teaser: 'A suspicious patch of green. Are those gridlines?',
      arrive: 'Thick, green, and divided into cells. Every step adds another tab.' },
    snakepit: { name: 'Snake Pit of Unreturned Calls', x: 705, y: 500, kind: 'snakepit', side: true, label: [580, 528], skull: true, teaser: 'A dark hole. Something is ringing down there.',
      arrive: 'Ringing, ringing, ringing. Every snake down here is a voicemail someone meant to return.' },
    sands: { name: 'Shifting Sands of Incentives', x: 780, y: 325, kind: 'sands', label: [636, 280], color: 'tan', teaser: 'Dunes covered in contest banners.',
      arrive: 'The dunes are covered in banners: a sales contest, a bonus trip, a "product of the month." The ground shifts toward whatever pays most this quarter.' },
    caves: { name: 'Caves of What-Ifs', x: 882, y: 410, kind: 'caves', side: true, label: [766, 446], teaser: 'A dark cave mouth. Voices inside asking "but what if...?"',
      arrive: 'Every client has a cave of what-ifs: losing a job, getting sick, living longer than the money. Nobody wants to go in. The good plans are built by people who do.' },
    summit: { name: 'Specialist Summit', x: 852, y: 168, kind: 'summit', major: true, label: [618, 186], sub: 'allow 3–5 business days', teaser: 'A peak above the clouds. Someone up there knows things.',
      arrive: 'Thin air, deep expertise. The Specialist will see you now (eventually).' },
    isles: { name: 'The Login Isles', x: 1010, y: 300, kind: 'isles', label: [952, 248], color: 'blue', teaser: 'Islands joined by flickering bridges.',
      arrive: 'Every island has a different password. Every bridge requires two-factor authentication.' },
    toll: { name: 'Annual Review Toll Bridge', x: 1090, y: 296, kind: 'toll', label: [1044, 382], teaser: 'A bridge with a toll booth. The toll is... paperwork?',
      arrive: 'A creaky bridge over the river. The troll in the booth wants to see that everything is up to date.' },
    clients: { name: 'Clients for Life', x: 1128, y: 158, kind: 'clients', label: [1112, 214], color: 'navy', big: true, teaser: 'The X on the map. Where every journey is supposed to end.',
      arrive: 'The X on the map. Now the real question: where does this client actually need to land?' }
  };

  /* Each landmark belongs to a stage of the client relationship. */
  PP.content.stages = [
    { id: 'rapport', label: 'Rapport', blurb: 'They trust you enough to talk honestly.' },
    { id: 'facts', label: 'Fact find', blurb: 'You know what they have and what they want.' },
    { id: 'risks', label: 'Risks', blurb: 'You understand what could go wrong for them.' },
    { id: 'solutions', label: 'Solutions', blurb: 'You know which plan actually fits.' },
    { id: 'followthrough', label: 'Follow-through', blurb: 'The paperwork, approvals and reviews got done.' },
    { id: 'followup', label: 'Follow-up', blurb: 'You came back when life changed.' }
  ];
  Object.entries({'meadows': 'rapport', 'lighthouse': 'rapport', 'wreck': 'rapport', 'fog': 'facts', 'loop': 'facts', 'cliffs': 'facts', 'swamp': 'risks', 'caves': 'risks', 'snakepit': 'followthrough', 'sands': 'solutions', 'summit': 'solutions', 'isles': 'followthrough', 'toll': 'followthrough', 'clients': 'followup'}).forEach(([id, st]) => { if (PP.content.nodes[id]) PP.content.nodes[id].stage = st; });

  /* Trails. days = travel time at a steady pace. kind: main (dotted), side (dashed, dead end), secret.
   * c = optional control point for the curve, so the map matches the hand-drawn route. */
  PP.content.trails = [
    { a: 'port', b: 'meadows', days: 3, kind: 'main', c: [150, 440], desc: 'Up the hill path to the Meadows of Understanding.' },
    { a: 'meadows', b: 'lighthouse', days: 3, kind: 'main', c: [250, 300], desc: 'North along the coast road toward the lighthouse. Slower, but you would get advice.' },
    { a: 'meadows', b: 'loop', days: 2, kind: 'main', c: [330, 410], desc: 'East on a well-worn shortcut. Lots of footprints. Many of them go in circles.' },
    { a: 'lighthouse', b: 'wreck', days: 1, kind: 'side', desc: 'Down to the rocks, where someone is singing a very catchy song about closing today.' },
    { a: 'lighthouse', b: 'fog', days: 2, kind: 'main', c: [430, 170], desc: 'Inland, into a bank of fog.' },
    { a: 'fog', b: 'loop', days: 2, kind: 'main', c: [580, 260], desc: 'Down out of the fog toward a trail that seems to spiral.' },
    { a: 'loop', b: 'cliffs', days: 1, kind: 'side', desc: 'A side path with a sign: PITCH HERE FIRST. It heads toward a cliff edge.' },
    { a: 'loop', b: 'swamp', days: 2, kind: 'main', c: [600, 400], desc: 'Southeast, toward something green and gridded.' },
    { a: 'swamp', b: 'snakepit', days: 1, kind: 'side', desc: 'A muddy path toward a pit. You can hear phones ringing.' },
    { a: 'swamp', b: 'sands', days: 2, kind: 'main', c: [770, 380], desc: 'North onto dunes that keep rearranging themselves.' },
    { a: 'sands', b: 'summit', days: 3, kind: 'main', c: [790, 240], desc: 'Up the mountain path to the Specialist. Steep, but someone up there knows things.' },
    { a: 'sands', b: 'isles', days: 3, kind: 'main', c: [930, 360], desc: 'The low road along the river, skipping the Summit. You would be on your own.' },
    { a: 'sands', b: 'caves', days: 1, kind: 'side', desc: 'A side trail down into the Caves of What-Ifs. Before you settle on a plan, look at what could go wrong.' },
    { a: 'summit', b: 'isles', days: 3, kind: 'main', c: [930, 170], desc: 'Down the far side of the mountain to the islands.' },
    { a: 'isles', b: 'toll', days: 1, kind: 'main', desc: 'Across the last island to the toll bridge.' },
    { a: 'toll', b: 'clients', days: 1, kind: 'main', c: [1120, 240], desc: 'Over the bridge. Clients for Life is just ahead.' },

  ];

  PP.trailBetween = (a, b) => PP.content.trails.find((t) => (t.a === a && t.b === b) || (t.a === b && t.b === a));

  PP.neighbors = function (s, id) {
    const out = [];
    PP.content.trails.forEach((t) => { if (t.a === id) out.push(t.b); else if (t.b === id) out.push(t.a); });
    return [...new Set(out)];
  };

  /* Destinations. The Grand Plan and Not Yet Harbor are always there; the rest
   * appear only when the player has discovered the facts that point to them. */
  PP.content.destinations = {
    grand_plan: { name: 'The Grand Plan', blurb: 'The big, complete, everything-at-once plan. What everyone assumes they came for.' },
    not_now: { name: 'Not Yet Harbor', blurb: 'No decision today. The client leaves with clarity and a door left open.' },
    bridge_plan: { name: 'The Bridge Plan', blurb: 'A smaller first step built to survive a change that is coming.' },
    joint_plan: { name: 'Two-Signature Shore', blurb: 'A plan built with everyone who actually has to agree to it.' },
    referral: { name: 'Referral Rock', blurb: "Part of this belongs with someone better suited. You hand it over well and stay in the client's corner." },
    simple_start: { name: 'The Simple Start', blurb: 'One small, useful thing that fits the reality of the client\'s week.' },
    partner_plan: { name: 'Partner Pass', blurb: 'Deal with the thing that changes everything first: who will still be running the business.' },
    steady_ground: { name: 'Steady Ground', blurb: 'Nothing big for now. Cover the next few months, keep every door open, and decide when the dust has settled.' },
    gap_check: { name: 'The Gap Check', blurb: 'Find out exactly what is already in place, then fill only the gap that is really there.' },
    buffer_first: { name: 'Cushion Cove', blurb: 'Build a cushion for the lean months first. Everything else can wait until the ground stops moving.' }
  };

  /* Risk debt catalogue. Each shortcut tag has a check that resurfaces later. */
  PP.content.debts = {
    assumed_goal: {
      label: 'Assumed what the client wanted instead of asking',
      check: 'The client frowns at your summary. "That\'s... not really what I said I wanted?"',
      harmless: 'Lucky guess. It was close enough.',
      inconvenient: { text: 'You redo a chunk of work.', eff: { momentum: -1, energy: -1 } },
      costly: { text: 'The client feels unheard and goes quiet for a week.', eff: { trust: -2, momentum: -2 } }
    },
    unknown_stakeholder: {
      label: 'Never asked who else is involved',
      check: 'Someone new appears in the email thread: "Hi, I\'m the one who actually has to sign this."',
      harmless: 'They are pleasant and agree with everything. Phew.',
      inconvenient: { text: 'You re-explain everything from the beginning.', eff: { momentum: -2 } },
      costly: { text: 'The newcomer hates the plan and wonders why nobody asked them.', eff: { trust: -2, momentum: -2 } }
    },
    unverified_details: {
      label: 'Skipped verifying basic details',
      check: 'Mail comes back marked RETURN TO SENDER.',
      harmless: 'Only the holiday card. Nothing important.',
      inconvenient: { text: 'You chase the right address for two days.', eff: { momentum: -1, energy: -1 } },
      costly: { text: 'Important paperwork went to an old address. Awkward phone call.', eff: { trust: -2, momentum: -1 } }
    },
    timeline: {
      label: 'Guessed at the timeline',
      check: 'The client mentions the deadline. It is not the one you wrote down.',
      harmless: 'You had more time than you thought.',
      inconvenient: { text: 'Some frantic rescheduling.', eff: { energy: -2 } },
      costly: { text: 'The window closed. Plan B, everyone.', eff: { momentum: -3, trust: -1 } }
    },
    spreadsheet_assumptions: {
      label: "Accepted the spreadsheet's assumptions without asking what decision it served",
      check: 'Cell F47 contains a number nobody can explain. Everything downstream depends on it.',
      harmless: 'F47 turns out to be fine. You do not ask why.',
      inconvenient: { text: 'You untangle the model with the client.', eff: { energy: -2, momentum: -1 } },
      costly: { text: 'The whole recommendation was built on a bad number.', eff: { trust: -2, momentum: -2, insight: -1 } }
    },
    stale_info: {
      label: 'Used documents without checking they were current',
      check: 'A reviewer flags it: "This statement is from 2023."',
      harmless: 'Nothing material changed since then.',
      inconvenient: { text: 'You request fresh copies and wait.', eff: { momentum: -2 } },
      costly: { text: 'The numbers moved a lot. Back to the drawing board.', eff: { momentum: -2, trust: -1, energy: -1 } }
    },
    fraud: {
      label: 'Acted on a request without verifying who sent it',
      check: 'The client calls: "Why did I get a confirmation for a change I never asked for?"',
      harmless: 'It was the client after all, just from a strange device. Close one.',
      inconvenient: { text: 'Caught early. Lots of forms, lots of apologies.', eff: { momentum: -2, energy: -2 } },
      costly: { text: 'Someone pretending to be the client got further than they should have.', eff: { trust: -4, momentum: -2 } }
    },
    defaults: {
      label: 'Clicked through the form defaults',
      check: 'A box you never looked at is checked. It should not be.',
      harmless: 'The default was actually right this time.',
      inconvenient: { text: 'Correction form. Then a correction to the correction form.', eff: { energy: -2 } },
      costly: { text: 'The default contradicts what the client told you, and they noticed first.', eff: { trust: -2, momentum: -1 } }
    },
    guessed_key: {
      label: 'Filled a critical gap with a guess',
      check: 'Reality arrives and does not match the guess.',
      harmless: 'Your guess was right. Do not get used to it.',
      inconvenient: { text: 'Part of the plan needs reworking.', eff: { momentum: -2, energy: -1 } },
      costly: { text: 'The plan no longer fits the client\'s life.', eff: { trust: -2, momentum: -3 } }
    },
    bad_handoff: {
      label: 'Handed off to an expert without real context',
      check: 'The specialist emails the client directly asking questions you already answered.',
      harmless: 'The client finds it thorough, actually.',
      inconvenient: { text: 'The client wonders why they are repeating themselves.', eff: { trust: -1, momentum: -1 } },
      costly: { text: 'The specialist solved the wrong problem beautifully.', eff: { momentum: -3, trust: -1 } }
    },
    confused_client: {
      label: 'Let the client leave a meeting confused',
      check: '"So I\'ve been thinking about what the specialist said, and I\'m scared to do anything."',
      harmless: 'A five-minute call clears it up.',
      inconvenient: { text: 'A second meeting to explain the first meeting.', eff: { momentum: -1, energy: -1 } },
      costly: { text: 'Confusion hardened into "let\'s just not."', eff: { momentum: -3 } }
    },
    ignored_change: {
      label: 'Kept going after the client\'s priorities changed',
      check: 'The client reads the plan: "This is for the old me."',
      harmless: 'The change was smaller than it sounded.',
      inconvenient: { text: 'A rework, with some sighing.', eff: { momentum: -2 } },
      costly: { text: 'The client feels you were not listening.', eff: { trust: -3, momentum: -1 } }
    },
    unprepared_meeting: {
      label: 'Took the earliest meeting with no prep time',
      check: 'Mid-meeting, the client asks a question you should have seen coming.',
      harmless: 'You wing it gracefully.',
      inconvenient: { text: '"Let me get back to you on that." Three times.', eff: { momentum: -1, trust: -1 } },
      costly: { text: 'You confidently said something wrong and had to walk it back.', eff: { trust: -2 } }
    },
    missed_message: {
      label: 'Let messages pile up unanswered',
      check: 'Buried in the pile: a message from the client, eleven days old.',
      harmless: 'It just said "thanks!"',
      inconvenient: { text: 'They had a question. They found the answer elsewhere.', eff: { trust: -1 } },
      costly: { text: 'They needed something time-sensitive.', eff: { trust: -2, momentum: -2 } }
    },
    premature_pitch: {
      label: 'Pitched before understanding the situation',
      check: 'The client brings up your early pitch: "Is that still what you think I need?"',
      harmless: 'They laugh it off.',
      inconvenient: { text: 'You spend a meeting rebuilding credibility.', eff: { trust: -1, energy: -1 } },
      costly: { text: 'They now suspect everything is a pitch.', eff: { trust: -3 } }
    },
    unchallenged_assumption: {
      label: 'Let a client misconception slide',
      check: 'The misconception is back, and it is load-bearing.',
      harmless: 'It turns out not to matter for this decision.',
      inconvenient: { text: 'An awkward correction late in the process.', eff: { trust: -1, momentum: -1 } },
      costly: { text: 'The client made a decision based on it.', eff: { trust: -2, momentum: -2 } }
    },
    rushed_pace: {
      label: 'Pushed the pace so hard that corners got cut',
      check: 'Looking back over the file, there are gaps you don\'t remember leaving.',
      harmless: 'The gaps are cosmetic.',
      inconvenient: { text: 'You spend two evenings filling them in.', eff: { energy: -2 } },
      costly: { text: 'One of the gaps mattered.', eff: { trust: -2, momentum: -1 } }
    }
  };
})(window.PP);
