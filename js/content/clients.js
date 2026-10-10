/* Clients. Each one is a character, not cargo: different patience, preferences,
 * hidden facts, and a destination that depends on what you discover.
 *
 * fit: how good each destination is for THIS client (appropriate / acceptable / poor)
 * unlocks: facts that make a destination appear on the map
 * conversation: script for The Conversation mini-game
 *   tag: emotion | tangent | question | misconception | fact
 *   subtle facts need Curiosity (or high Trust + listening) to surface fully
 */
(function (PP) {
  PP.content.clients = {
    taylor: {
      id: 'taylor', name: 'Taylor', title: 'The Hesitant Starter', hue: 18,
      opener: '"I think I need some help."',
      surface: 'Wants "a plan." Not sure what kind.',
      traits: ['Warm and chatty', 'Allergic to jargon', 'Decides with family'],
      prefers: 'call', patience: 4, complexity: 'low',
      facts: {
        family_first: { label: 'The kids come first in every decision' },
        career_change: { label: 'Likely changing jobs in the next few months', key: true },
        sister_binder: { label: 'Sister has strong opinions (and a color-coded binder)' }
      },
      stakeholderFact: 'family_first',
      stakeholder: 'Taylor\'s sister Jess', shortStake: 'Jess',
      we: '"I\'d want to run it by... well, everybody, honestly."',
      keyFact: 'career_change',
      keyQuestion: '"Before I sign off on this," the Specialist says, "when is Taylor changing jobs?"',
      changeOfMind: '"So, um. I got the offer. The one in Denver. Does that change anything?"',
      spreadsheetFact: 'career_change',
      spreadsheet: 'Taylor shares a budget their sister built. It assumes the current salary for the next twenty years.',
      fit: { grand_plan: 'poor', bridge_plan: 'appropriate', not_now: 'acceptable' },
      unlocks: { bridge_plan: ['career_change'] },
      conversation: [
        { text: '"So, um, thanks for meeting. I wasn\'t really sure where to start."', tag: 'emotion' },
        { text: '"My sister keeps telling me I need \'a plan.\' She has a binder."', tag: 'fact', fact: 'sister_binder' },
        { text: '"Everything I do, I think about the kids first."', tag: 'fact', fact: 'family_first', pitch: true },
        { text: '"Work\'s been... a lot lately. Things might be shifting there. We\'ll see."', tag: 'fact', fact: 'career_change', subtle: true },
        { text: '"What would you even need from me? Like, paperwork-wise?"', tag: 'question' },
        { text: '"I figure everyone basically needs the same big plan, right?"', tag: 'misconception', pitch: true },
        { text: '"Sorry, I\'m rambling. Did I mention the binder is color-coded?"', tag: 'tangent' },
        { text: '"I just don\'t want to make a mistake I can\'t undo."', tag: 'emotion' }
      ]
    },

    morgan: {
      id: 'morgan', name: 'Morgan', title: 'The Spreadsheet Enthusiast', hue: 200,
      opener: '"I\'ve done most of the work already. I just need you to check it."',
      surface: 'Wants validation of a very detailed model.',
      traits: ['Loves data', 'Patient with detail', 'Hates surprises'],
      prefers: 'email', patience: 6, complexity: 'high',
      facts: {
        spouse_stakeholder: { label: 'Spouse Jordan must agree, and has not been included', key: true },
        parent_care: { label: 'Morgan\'s mother needs more care soon', key: true },
        wants_validation: { label: 'Mostly wants to hear "you\'re right"' }
      },
      stakeholderFact: 'spouse_stakeholder',
      stakeholder: 'Morgan\'s spouse Jordan', shortStake: 'Jordan',
      we: '"Jordan and I... well, mostly I handle this. Jordan has opinions."',
      keyFact: 'spouse_stakeholder',
      keyQuestion: '"Who else signs this?" the Specialist asks. "Because tab 3 assumes two incomes."',
      changeOfMind: '"Small update: Mom fell last week. She\'s fine. But I think we need to plan for her moving in."',
      spreadsheetFact: 'parent_care',
      spreadsheet: 'Morgan shares the model. Fourteen tabs. There is an index tab. Tab 9 is labelled "MOM?" and is empty.',
      fit: { grand_plan: 'poor', joint_plan: 'appropriate', referral: 'acceptable', not_now: 'acceptable' },
      unlocks: { joint_plan: ['spouse_stakeholder'], referral: ['parent_care'] },
      conversation: [
        { text: '"I brought the spreadsheet. Fourteen tabs. Don\'t worry, there\'s an index tab."', tag: 'tangent' },
        { text: '"Jordan thinks I\'m overdoing it. But Jordan isn\'t in charge of the spreadsheet."', tag: 'fact', fact: 'spouse_stakeholder', subtle: true },
        { text: '"What return assumption do you use? I need a number."', tag: 'question', pitch: true },
        { text: '"Inflation is basically solved, so I set it to one percent."', tag: 'misconception' },
        { text: '"My mom\'s been needing more help lately. That\'s a separate tab. It\'s... not done."', tag: 'fact', fact: 'parent_care', subtle: true },
        { text: '"Honestly, I mostly want someone to tell me I\'m right."', tag: 'fact', fact: 'wants_validation' },
        { text: '"I\'ve modeled eleven scenarios. Want to see scenario seven? It has a chart."', tag: 'tangent' },
        { text: '"I hate surprises. That\'s why the spreadsheet exists."', tag: 'emotion' }
      ]
    },

    rosa: {
      id: 'rosa', name: 'Rosa', title: 'The Busy Shop Owner', hue: 330,
      opener: '"Got twenty minutes before the lunch rush. Go."',
      surface: 'Wants something quick that "doesn\'t get fancy."',
      traits: ['Short on time', 'Texts, never calls', 'Business and life are one thing'],
      prefers: 'text', patience: 3, complexity: 'low',
      facts: {
        cashflow_season: { label: 'Cash is tight half the year: summers are dead', key: true },
        partner_exit: { label: 'Business partner Dee may want out', key: true },
        espresso: { label: 'Still bitter about the espresso machine' }
      },
      stakeholderFact: 'partner_exit',
      stakeholder: 'Rosa\'s business partner Dee', shortStake: 'Dee',
      we: '"We\'d have to see. Dee and I split everything. For now."',
      keyFact: 'partner_exit',
      keyQuestion: '"Is the business partner staying?" the Specialist asks. "This whole plan depends on it."',
      changeOfMind: '"Dee told me yesterday. She\'s out by spring. So... yeah."',
      spreadsheetFact: 'cashflow_season',
      spreadsheet: 'Rosa sends a photo of a napkin. It has the word "SUMMER" circled three times.',
      fit: { grand_plan: 'poor', simple_start: 'appropriate', partner_plan: 'appropriate', not_now: 'acceptable' },
      unlocks: { simple_start: ['cashflow_season'], partner_plan: ['partner_exit'] },
      conversation: [
        { text: '"Twenty minutes. Lunch rush at noon."', tag: 'emotion' },
        { text: '"Shop\'s doing fine. Mostly."', tag: 'fact', fact: 'cashflow_season', subtle: true },
        { text: '"Can you just send me the short version of whatever this is?"', tag: 'question', pitch: true },
        { text: '"My partner Dee\'s been talking about \'what\'s next\' a lot."', tag: 'fact', fact: 'partner_exit', subtle: true },
        { text: '"Business money and personal money are the same thing for me, right?"', tag: 'misconception' },
        { text: '"I don\'t need fancy. Fancy is how I lost money on the espresso machine."', tag: 'fact', fact: 'espresso' },
        { text: '"Summers are dead, winters I\'m drowning. Normal stuff."', tag: 'fact', fact: 'cashflow_season' },
        { text: '"If this takes six meetings, I\'m out."', tag: 'emotion' }
      ]
    }
  };

  /* Practice client for Priya's quest at the port. */
  PP.content.practiceClient = {
    id: 'pat', name: 'Captain Pat', title: 'Retired Ferry Captain', hue: 160, shortStake: 'Pat\'s daughter', prefers: 'call', patience: 5,
    facts: { boat_sale: { label: 'Wants to sell the ferry', key: true }, grandkids: { label: 'Grandkids visit every summer' } },
    conversation: [
      { text: '"Forty years on that ferry. Never missed a crossing."', tag: 'emotion' },
      { text: '"The engine\'s getting old. Like me. Ha."', tag: 'fact', fact: 'boat_sale', subtle: true },
      { text: '"What do people usually do in my situation?"', tag: 'question', pitch: true },
      { text: '"The grandkids are here every July. Best month of the year."', tag: 'fact', fact: 'grandkids' },
      { text: '"I figure if I don\'t touch anything, nothing can go wrong."', tag: 'misconception' },
      { text: '"Did I tell you about the time we carried a cow? Long story."', tag: 'tangent' }
    ]
  };
})(window.PP);

/* Check-ins: the back-and-forth you can start any day on the trail.
 * Each answer can reveal a fact. Some facts need enough Trust (minTrust)
 * or Curiosity (curious) before the client will say them out loud; otherwise
 * you get the guarded version, which usually hints that there is more. */
(function (PP) {
  PP.content.checkinTopics = [
    { id: 'goal', label: '"If this goes well, what is different a year from now?"' },
    { id: 'work', label: '"How are things going at work?"' },
    { id: 'people', label: '"Who else will have a say in this?"' },
    { id: 'worry', label: '"What part of this worries you most?"' },
    { id: 'money', label: '"How do things look month to month?"' }
  ];
  const C = PP.content.clients;
  C.taylor.checkin = {
    goal: { text: '"Honestly? Feeling like I\'m not winging it. And the kids being okay, no matter what."', fact: 'family_first' },
    work: { minTrust: 6, text: '"Okay. Don\'t tell anyone. I\'ve been interviewing. There\'s an offer in Denver. Maybe."', fact: 'career_change', guarded: '"Work\'s... fine. Busy. Things might shift. We\'ll see." Taylor changes the subject quickly.' },
    people: { text: '"My sister Jess has a binder. She\'ll want to see whatever we do. It\'s color-coded."', fact: 'sister_binder' },
    worry: { curious: true, text: '"Making a big decision right before everything changes. Like, if I move, does any of this still work?"', fact: 'career_change', guarded: '"Making a big decision and regretting it." You sense there is a specific reason.' },
    money: { text: '"Fine, month to month. I just don\'t know what \'fine\' looks like a year from now."' }
  };
  C.morgan.checkin = {
    goal: { text: '"Proof the model is right. Then I can stop running it at 2am."', fact: 'wants_validation' },
    work: { text: '"Stable. Boring. I like boring."' },
    people: { minTrust: 6, text: '"Well... Jordan. My spouse. Jordan hasn\'t actually seen any of this. Jordan would have to agree."', fact: 'spouse_stakeholder', guarded: '"I handle the planning. Jordan... has opinions." Morgan does not elaborate.' },
    worry: { curious: true, text: '"My mom. She\'s needing more help. I haven\'t modeled that. I don\'t know how to."', fact: 'parent_care', guarded: '"Surprises. I hate surprises." Morgan glances at tab 9 and closes the laptop.' },
    money: { text: '"Tab 4 has it to the penny. Do you want to see tab 4? You want to see tab 4."' }
  };
  C.rosa.checkin = {
    goal: { text: '"Not stressing out every summer. That\'s it. That\'s the goal."', fact: 'cashflow_season' },
    work: { text: '"Shop\'s the shop. Winters I\'m drowning, summers are dead."', fact: 'cashflow_season' },
    people: { minTrust: 6, text: '"Dee. My partner in the shop. She keeps saying \'what\'s next.\' I think she wants out."', fact: 'partner_exit', guarded: '"Me and Dee split everything. It\'s fine." It does not sound fine.' },
    worry: { curious: true, text: '"If Dee leaves, I can\'t run it alone. There. I said it."', fact: 'partner_exit', guarded: '"Wasting my time on meetings." Rosa checks her phone.' },
    money: { text: '"Don\'t make me talk about the espresso machine."', fact: 'espresso' }
  };
})(window.PP);
