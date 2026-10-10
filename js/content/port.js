/* Port Prospect: NPCs, practice quests, contacts ("people are equipment"), and pack items. */
(function (PP) {
  PP.content.contacts = {
    veteran: { name: 'The Veteran', who: 'Marge', ability: 'Once per journey, spots when you are massively overcomplicating something.', when: 'Appears as an option in Spreadsheet Swamp and other tangled moments.' },
    specialist: { name: 'The Specialist', who: 'Dr. Dev Okafor', ability: 'Makes technical areas understandable and makes expert help cheaper.', when: 'Appears as an option at Specialist Summit and during handoffs.' },
    operator: { name: 'The Operator', who: 'Olu', ability: 'Rescues one administrative or process disaster.', when: 'Offered when a costly risk-debt check lands.' },
    connector: { name: 'The Connector', who: 'Priya', ability: 'Opens an alternate route when you hit a dead end.', when: 'Use from your contact list on the map: adds a new route from where you stand.' },
    whisperer: { name: 'The Technology Whisperer', who: 'Kenji', ability: 'Neutralizes one Login Isles event.', when: 'Appears as an option in Login Isles events.' },
    skeptic: { name: 'The Skeptic', who: 'Gus', ability: 'Shows the downside of every option before you commit.', when: 'Use from your contact list during any event: reveals what each choice will cost, including hidden risk.' }
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
      quest: { id: 'olu_dash', label: 'Practice: Document Dash', minigame: 'documentDash', text: 'Olu dumps a practice inbox on the desk. "Sort it. Use, verify, discard, or ask. Go."', pass: 5, reward: { skill: { preparation: 1 } } }
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
      quest: { id: 'kenji_fraud', label: 'Practice: Fraud or Friend?', minigame: 'fraudOrFriend', text: 'Kenji forwards you a week of his strangest messages. "Which of these would you act on?"', pass: 4, reward: { skill: { curiosity: 1 } } }
    },
    {
      id: 'gus', name: 'Gus', role: 'Professional pessimist, end of the bar', contact: 'skeptic',
      greet: '"Whatever you\'re planning, I can tell you how it goes wrong. Buy me a coffee."',
      talk: { label: 'Buy Gus a coffee', text: 'Gus lists eleven ways your first journey could fail. Four of them are genuinely useful.', eff: { skill: { curiosity: 1 } } }
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
