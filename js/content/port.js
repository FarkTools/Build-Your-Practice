/* Port Prospect: NPCs, practice quests, contacts ("people are equipment"), and pack items. */
(function (PP) {
  PP.content.contacts = {
    veteran: { name: 'The Veteran', who: 'Marge', ability: 'Once per journey, spots when you are massively overcomplicating something.', when: 'Appears as an option in Spreadsheet Swamp and other tangled moments.' },
    specialist: { name: 'The Specialist', who: 'Dr. Dev Okafor', ability: 'Makes technical areas understandable and makes expert help cheaper.', when: 'Appears as an option at Specialist Summit and during handoffs.' },
    operator: { name: 'The Operator', who: 'Olu', ability: 'Rescues one administrative or process disaster.', when: 'Offered when a costly risk-debt check lands.' },
    connector: { name: 'The Connector', who: 'Priya', ability: 'Opens an alternate route when you hit a dead end.', when: 'Use from your contact list on the map: adds a new route from where you stand.' },
    whisperer: { name: 'The Technology Whisperer', who: 'Kenji', ability: 'Neutralizes one Login Isles event.', when: 'Appears as an option in Login Isles events.' },
    skeptic: { name: 'The Skeptic', who: 'Gus', ability: 'Shows the downside of every option before you commit.', when: 'Use from your contact list during any event: reveals what each choice will cost, including hidden risk.' },

    /* Newer port contacts. Each carries a suggested `assist` (a ready-made event
     * choice: label, eff, result, and the places it fits) so events can wire them
     * with a single line: show: (s) => PP.contactReady(s, '<id>'). */
    regular: { name: 'The Old Hand', who: 'Bernie', ability: 'Talks you down when you are running on empty. Restores Energy and steadies your nerve once per journey.', when: 'Appears as an option at campfires, Cold Feet, and other low-energy moments.',
      assist: { label: 'Call Bernie from the coffee cart', at: ['travel'], eff: { energy: 3, momentum: 1 }, result: 'Bernie: "Kid, I once lost a client because I was tired and said yes to everything. Sleep. Then decide." You do. It helps.' } },
    expediter: { name: 'The Expediter', who: 'Fatima Noor', ability: 'Gets one stuck approval moving. Turns a long wait into a short one.', when: 'Appears as an option at the Specialist Summit, the Toll Bridge, and the Nobody-Remembers-Why Caves.',
      assist: { label: 'Ask Fatima to escalate it', at: ['summit', 'toll', 'caves'], eff: { momentum: 2 }, result: 'Fatima sends one email with a subject line in capitals. The 3-5 business days become this afternoon.' } },
    compliance: { name: 'The Compliance Officer', who: 'Harold Pike', ability: 'Tells you plainly whether a shortcut will come back to bite, and quietly fixes one that already has.', when: 'Appears as an option at the Sirens of the Quick Close, Product-First Cliffs, and when a risk debt comes due.',
      assist: { label: 'Run it past Harold first', at: ['wreck', 'cliffs'], eff: { insight: 1, clearDebt: 'premature_pitch' }, result: 'Harold reads it twice, sighs, and rewrites one sentence. "Now it is true. True is easier to defend." He almost smiles.' } },
    producer: { name: 'The Top Producer', who: 'Lance Stirling', ability: 'Lends you his unreasonable confidence when everything has stalled. Big Momentum, a little Trust risk.', when: 'Appears as an option in Dead in the Water, Phone Tag, and stalled moments.',
      assist: { label: 'Call Lance for a pep talk', at: ['travel'], eff: { momentum: 3, trust: -1 }, result: 'Lance talks for eleven minutes without breathing. You feel unstoppable. Your client notices you are suddenly very loud.' } },
    marketer: { name: 'The Marketer', who: 'Tess Alvarado', ability: 'Turns one good moment on the trail into a story people repeat. Adds a warm prospect to your pipeline.', when: 'Appears as an option when Trust is high, or when you meet a friend of your client.',
      assist: { label: 'Text Tess what just happened', at: ['travel'], eff: { prospect: { temp: 'warm', source: 'a story Tess told about you' } }, result: 'Tess turns it into a short post with your (new) headshot. Someone you have never met asks for your number.' } },
    banker: { name: 'The Community Banker', who: 'Ray Delgado', ability: 'Knows how money really moves through a small business or a household. Clears up one cash-flow question.', when: 'Appears as an option with business owners, freelancers, and anyone whose income goes up and down.',
      assist: { label: 'Call Ray at the bank', at: ['travel', 'meadows'], eff: { insight: 2 }, result: 'Ray asks two questions about when the money comes in and when it goes out. Suddenly the whole picture makes sense.' } },
    cpa: { name: 'The CPA', who: 'Ellen Ashby', ability: 'Untangles one numbers problem fast, and notices the detail everyone else skipped.', when: 'Appears as an option in Spreadsheet Swamp and with clients who have had a windfall.',
      assist: { label: 'Send the numbers to Ellen', at: ['swamp'], eff: { insight: 2, style: { overcomplicate: -1 } }, result: 'Ellen replies in four minutes: "Tabs 3 through 12 are the same tab. Look at line 40." Line 40 was the whole story.' } },
    librarian: { name: 'The Librarian', who: 'Connie Bell', ability: 'Finds the plain-language way to explain anything. Rescues one jargon-filled moment.', when: 'Appears as an option in "Explain it" moments and when a client has a confident misconception.',
      assist: { label: 'Borrow Connie\'s explanation', at: ['summit', 'isles', 'travel'], eff: { trust: 1, insight: 1 }, result: 'You use the analogy Connie uses at her workshops, the one with the jars. Your client nods. "Why didn\'t anyone just say that?"' } },
    peer: { name: 'The Peer', who: 'Sloane Park-Rivera', ability: 'Covers one client call while you are busy on the trail, because you would do the same for her. Probably.', when: 'Appears as an option in the Snake Pit of Unreturned Calls and when a rival is circling.',
      assist: { label: 'Ask Sloane to cover the call', at: ['snakepit', 'travel'], eff: { momentum: 1, trust: 1 }, result: 'Sloane handles it, then texts: "You owe me. Also your client is lovely. Also I am still beating you this quarter."' } },
    organizer: { name: 'The Organizer', who: 'Bev Okafor-Lund', ability: 'Vouches for you. Business owners and community people give you the benefit of the doubt once per journey.', when: 'Appears as an option with business owners and with passengers who have opinions.',
      assist: { label: 'Mention that Bev sent you', at: ['travel', 'meadows'], eff: { trust: 2 }, result: 'Their whole face changes. "Oh, you know Bev? Bev got my permit sorted in 2019. Okay. Talk to me."' } }
  };

  PP.content.npcs = [
    {
      id: 'marge', name: 'Marge', role: 'Harbor veteran, 30 years in', contact: 'veteran',
      greet: '"First client? Cute. Here\'s the thing nobody tells you: the shortcut that works is the one that gets you."',
      talk: { label: 'Listen to her stories', text: 'Marge walks you through three journeys that went sideways. None of them went sideways where you\'d expect.', eff: { skill: { judgment: 1 } } }
    },
    {
      id: 'dev', name: 'Dr. Dev Okafor', role: 'Specialist, visiting from the Summit', contact: 'specialist',
      greet: '"I can help with almost anything, as long as you tell me what the problem actually is."',
      talk: { label: 'Ask how the territory is laid out', text: 'Dev sketches the region on a napkin. It is surprisingly good, and slightly stained.', eff: { skill: { navigation: 1 } } }
    },
    {
      id: 'olu', name: 'Olu', role: 'Operations, keeper of all forms', contact: 'operator',
      greet: '"Ninety percent of disasters are paperwork that someone was sure about."',
      quest: { id: 'olu_dash', label: 'Practice: Shoebox Fact Find', minigame: 'factFind', text: 'Olu drops a shoebox on the desk. "A real client brought this in last year. Sort it. Go."', pass: 5, reward: { skill: { preparation: 1 } } }
    },
    {
      id: 'priya', name: 'Priya', role: 'Knows everyone at the port', contact: 'connector',
      greet: '"Every dead end is just a road you haven\'t been introduced to yet."',
      talk: { label: 'Ask her how she knows everyone', text: '"I write down one thing about every person I meet. Then I actually use it."', eff: { skill: { resourcefulness: 1 } } },
      quest: { id: 'priya_conv', label: 'Practice: The Conversation', minigame: 'conversation', practice: true, text: 'Priya introduces you to Captain Pat, a retired ferry captain who "might need some help, eventually."', pass: 4, reward: { skill: { communication: 1 } } }
    },
    {
      id: 'kenji', name: 'Kenji', role: 'Technology whisperer', contact: 'whisperer',
      greet: '"Have you tried turning the client off and on again? Kidding. Mostly."',
      quest: { id: 'kenji_fraud', label: 'Practice: Monday Morning Inbox', minigame: 'inbox', text: 'Kenji forwards you last Monday\'s inbox. "Handle it, book it, hand it off, or verify it. One of these is a scam."', pass: 5, reward: { skill: { curiosity: 1 } } }
    },
    {
      id: 'gus', name: 'Gus', role: 'Professional pessimist, end of the bar', contact: 'skeptic',
      greet: '"Whatever you\'re planning, I can tell you how it goes wrong. Buy me a coffee."',
      talk: { label: 'Buy Gus a coffee', text: 'Gus lists eleven ways your first journey could fail. Four of them are genuinely useful.', eff: { skill: { curiosity: 1 } } }
    },
    {
      id: 'bernie', name: 'Bernie', role: 'Runs the coffee cart. Retired agent, 41 years in', contact: 'regular',
      greet: '"Medium drip, no foam, no lectures. Unless you want a lecture. I have several."',
      talk: { label: 'Stay for a second cup', text: 'Bernie tells you about the year he had three clients and a car that only went in reverse. "The ones who stay are the ones you called when nothing was happening." He refills your cup without asking.', eff: { skill: { communication: 1 } } }
    },
    {
      id: 'fatima', name: 'Fatima Noor', role: 'Operations lead, Olu\'s boss', contact: 'expediter',
      greet: '"I don\'t need you to love process. I need you to stop putting sticky notes on the scanner."',
      talk: { label: 'Ask how a file actually moves', text: 'Fatima draws the path a single form takes through the building. It visits nine desks. Two of them are the same desk, on different days.', eff: { skill: { navigation: 1 } } },
      quest: { id: 'fatima_week', label: 'Practice: Fatima\'s week from hell', minigame: 'calendar', text: 'Fatima prints out a real agent\'s week. "Three meetings, no prep, specialist on a Wednesday. Fix it before I cry."', pass: 7, reward: { skill: { preparation: 1 } } }
    },
    {
      id: 'harold', name: 'Harold Pike', role: 'Compliance. Reads every word', contact: 'compliance',
      greet: '"I\'m not here to catch you. I\'m here so nobody else has to." He straightens a pen that was already straight.',
      talk: { label: 'Ask what he actually looks for', text: 'Harold thinks for a long time. "Whether you would be comfortable reading your notes out loud to the client\'s daughter." Then he gives you a mint.', eff: { skill: { judgment: 1 } } },
      quest: { id: 'harold_inbox', label: 'Practice: Spot the problem', minigame: 'inbox', text: 'Harold slides a folder across. "Last week\'s messages. Some need a call, some need Operations, one is a fraud attempt. Take your time. Actually, don\'t, that\'s the point."', pass: 6, reward: { skill: { curiosity: 1 } } }
    },
    {
      id: 'lance', name: 'Lance Stirling', role: 'Top producer. Will tell you', contact: 'producer',
      greet: '"Eleven years in the top ten. Ask me how. Actually don\'t, I\'ll just tell you."',
      talk: { label: 'Let Lance tell you about his year', text: 'Lance talks for forty minutes. You learn about his boat, his morning routine, and his watch. Buried in the middle: "I call every client on their birthday. Every single one." That part is real.', eff: { skill: { judgment: 1 } } },
      quest: { id: 'lance_calls', label: 'Practice: Beat Lance\'s first day', minigame: 'callathon', text: 'Lance hands you a phone and a list. "My first day I booked four. Nobody\'s beaten it. You won\'t either, but it\'ll be fun to watch."', pass: 4, reward: { skill: { communication: 1 } } }
    },
    {
      id: 'tess', name: 'Tess Alvarado', role: 'Marketing. Has opinions about your headshot', contact: 'marketer',
      greet: '"Is that your headshot? Is that a cropped wedding photo? I can see a shoulder. Whose shoulder is that?"',
      talk: { label: 'Let her fix your bio', text: 'Tess deletes "passionate," "dedicated," and "solutions." What is left is two plain sentences about who you help. It is weirdly better.', eff: { skill: { communication: 1 } } },
      quest: { id: 'tess_tent', label: 'Practice: Tess runs your tent', minigame: 'market', text: 'Tess sets up a tent with a banner that is mostly your face. "Talk to real people. Don\'t just wave. And smile like the headshot. The new one."', pass: 3, reward: { skill: { resourcefulness: 1 } } }
    },
    {
      id: 'ray', name: 'Ray Delgado', role: 'Community banker, Harbor Savings', contact: 'banker',
      greet: '"Thirty years lending to people on this street. Half of them still owe me a sandwich."',
      talk: { label: 'Ask how he reads a business', text: 'Ray ignores the profit number and asks one question: "What month do you dread?" Every owner on the street has an answer, and it tells him everything.', eff: { skill: { curiosity: 1 } } }
    },
    {
      id: 'ellen', name: 'Ellen Ashby', role: 'CPA upstairs. Refers people she likes', contact: 'cpa',
      greet: '"I send people to agents who return phone calls. You would be amazed how short that list is."',
      talk: { label: 'Ask what she wishes agents knew', text: 'Ellen: "That a client\'s shoebox is a biography. Read it like one." She also asks you to stop calling in April.', eff: { skill: { preparation: 1 } } },
      quest: { id: 'ellen_shoebox', label: 'Practice: April shoebox', minigame: 'factFind', text: 'Ellen drops a box on the desk with a thud. "Real receipts, real mess, names removed. Tell me what matters and what\'s a takeout menu."', pass: 6, reward: { skill: { curiosity: 1 } } }
    },
    {
      id: 'connie', name: 'Connie Bell', role: 'Librarian. Runs free money workshops', contact: 'librarian',
      greet: '"Tuesday nights, room B, free coffee. Nobody is selling anything. That is the rule, and I enforce it."',
      talk: { label: 'Sit in on her workshop', text: 'Connie explains a hard idea with three jars and a bag of dried beans. A man in the back row says "oh" out loud, like something clicked. You take notes on how she did it.', eff: { skill: { curiosity: 1 } } },
      quest: { id: 'connie_talk', label: 'Practice: After the workshop', minigame: 'conversation', text: 'Captain Pat lingers after Connie\'s workshop, holding a bean. "Can I ask you something? Not here. Over there, by the large-print section."', pass: 4.5, reward: { skill: { communication: 1 } } }
    },
    {
      id: 'sloane', name: 'Sloane Park-Rivera', role: 'New agent, started the same week as you', contact: 'peer',
      greet: '"Oh, hi! How many prospects do you have? No reason. I have nine. Not that it matters."',
      talk: { label: 'Compare notes over lunch', text: 'Sloane is ahead on prospects, behind on clients, and exactly as scared as you. You agree to cover for each other. You also both lie about how much sleep you are getting.', eff: { skill: { resourcefulness: 1 } } },
      quest: { id: 'sloane_cover', label: 'Practice: Cover Sloane\'s week', minigame: 'lifeHappens', text: 'Sloane is off to her cousin\'s wedding. "Just check on my people. Nothing will happen." Everything happens.', pass: 6, reward: { skill: { judgment: 1 } } }
    },
    {
      id: 'bev', name: 'Bev Okafor-Lund', role: 'Organizes the Harbor Street Business Association', contact: 'organizer',
      greet: '"Fourth Thursday, back room of the bakery. Bring cards. Do not bring a pitch. Bring a question."',
      talk: { label: 'Help her stack chairs', text: 'You stack forty chairs. Bev tells you who on Harbor Street is expanding, who is retiring, and who is quietly worried. "Don\'t use that to sell. Use it to listen."', eff: { skill: { resourcefulness: 1 } } },
      quest: { id: 'bev_mixer', label: 'Practice: The back-room mixer', minigame: 'mixer', text: 'Bev pins a name tag on you. "Find two owners who actually want to talk. Not the guy with the essential oils. He is my brother-in-law."', pass: 2, reward: { skill: { navigation: 1 } } }
    }
  ];

  /* Port timing: the prospect arrives after a few actions. After that, every
   * extra moment spent preparing costs Momentum: preparation is not free. */
  PP.content.portRules = { prospectAfter: 2, waitingCost: { momentum: -1 } };

  PP.content.items = {
    notebook: { name: 'Battered notebook', blurb: 'Rescues one forgotten detail in the fog.' },
    thermos: { name: 'Coffee thermos', blurb: 'Restore 3 Energy once, anywhere.' },
    checklist: { name: "Olu's checklist", blurb: 'Quietly pays off one risk debt before it comes due.' },
    cards: { name: 'Fresh business cards', blurb: 'Start the journey with +1 Trust.' },
    napkin_map: { name: 'Napkin map', blurb: 'Lift the fog off the whole map once.' }
  };
  PP.content.packSize = 2;
})(window.PP);
