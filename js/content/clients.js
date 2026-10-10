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
      id: 'taylor', segment: 'family', name: 'Taylor', title: 'The Hesitant Starter', hue: 18,
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
      fit: { grand_plan: 'poor', bridge_plan: 'appropriate', not_now: 'acceptable', steady_ground: 'acceptable', gap_check: 'poor', buffer_first: 'poor' },
      unlocks: { bridge_plan: ['career_change'], steady_ground: ['career_change'] },
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
      id: 'morgan', segment: 'numbers', name: 'Morgan', title: 'The Spreadsheet Enthusiast', hue: 200,
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
      fit: { grand_plan: 'poor', joint_plan: 'appropriate', referral: 'acceptable', not_now: 'acceptable', steady_ground: 'poor', gap_check: 'acceptable', buffer_first: 'poor' },
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
      id: 'rosa', segment: 'owner', name: 'Rosa', title: 'The Busy Shop Owner', hue: 330,
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
      fit: { grand_plan: 'poor', simple_start: 'appropriate', partner_plan: 'appropriate', not_now: 'acceptable', steady_ground: 'poor', gap_check: 'poor', buffer_first: 'acceptable' },
      unlocks: { simple_start: ['cashflow_season'], partner_plan: ['partner_exit'], buffer_first: ['cashflow_season'] },
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
    },

    evelyn: {
      id: 'evelyn', segment: 'changes', name: 'Evelyn', title: 'The Newly Widowed', hue: 270,
      opener: '"Harold always did this part. I don\'t even know which drawer the papers are in."',
      surface: 'Wants to "get everything sorted," fast. Possibly sell the house.',
      traits: ['Organized about everything except money', 'Apologizes a lot', 'Wants a real voice on the phone'],
      prefers: 'call', patience: 5, complexity: 'low',
      facts: {
        shoebox: { label: 'Harold handled every account, and the statements are in a shoebox' },
        house_rush: { label: 'Wants to sell the house mostly because it is too quiet now', key: true },
        daughter_pushing: { label: 'Daughter Corinne wants her to move closer, immediately' },
        fine_for_now: { label: 'Money is not urgent: the next year is already covered' }
      },
      stakeholderFact: 'daughter_pushing',
      stakeholder: 'Evelyn\'s daughter Corinne', shortStake: 'Corinne',
      we: '"Corinne thinks I should decide by summer. Corinne thinks a lot of things."',
      keyFact: 'house_rush',
      keyQuestion: '"Why is Evelyn selling the house?" the Specialist asks. "Is it the money, or is it the quiet?"',
      changeOfMind: '"I put a sign in the yard. Then I took it down at two in the morning. In my robe. The neighbors saw."',
      spreadsheetFact: 'fine_for_now',
      spreadsheet: 'Evelyn hands over Harold\'s ledger. Neat pencil columns, last entry in March. After that, in her handwriting, a single "?"',
      fit: { grand_plan: 'poor', steady_ground: 'appropriate', referral: 'acceptable', gap_check: 'acceptable', not_now: 'acceptable', bridge_plan: 'poor', buffer_first: 'poor' },
      unlocks: { steady_ground: ['house_rush'], referral: ['shoebox'], gap_check: ['fine_for_now'] },
      conversation: [
        { text: '"Thank you for seeing me. I made a list. Then I lost the list."', tag: 'emotion' },
        { text: '"Harold did all of it. Every bill. I just signed where he pointed. There\'s a shoebox."', tag: 'fact', fact: 'shoebox' },
        { text: '"The house is so big now. I keep a radio on in every room."', tag: 'fact', fact: 'house_rush', subtle: true },
        { text: '"How long does all this usually take? Corinne says I should be done by now."', tag: 'question', pitch: true },
        { text: '"I suppose I should do everything at once and get it over with."', tag: 'misconception', pitch: true },
        { text: '"Harold kept his ledger in pencil. Pencil! In case he changed his mind, he said."', tag: 'tangent' },
        { text: '"The lawyer said the next year or so is taken care of. I didn\'t really hear the rest."', tag: 'fact', fact: 'fine_for_now' },
        { text: '"Corinne wants me two blocks from her by fall. She\'s already found a condo. It has a ramp."', tag: 'fact', fact: 'daughter_pushing' },
        { text: '"I just don\'t want to be a bother to anyone."', tag: 'emotion' }
      ]
    },

    walter: {
      id: 'walter', segment: 'retiree', name: 'Walter', title: 'The Countdown Clock', hue: 40,
      opener: '"Five hundred and twelve days. Not that I\'m counting. I have an app."',
      surface: 'Wants to retire in eighteen months and "lock it in."',
      traits: ['Counts down to everything', 'Prints his emails', 'Speaks for two people'],
      prefers: 'email', patience: 5, complexity: 'high',
      facts: {
        countdown: { label: 'Has a retirement countdown app, and checks it at lunch' },
        bernadette_staying: { label: 'Wife Bernadette has no plans to retire when he does', key: true },
        part_time_offer: { label: 'His boss offered a three-day week instead of a hard stop' },
        golf_shoes: { label: 'Plans to golf every day. Owns the shoes, not the clubs' }
      },
      stakeholderFact: 'bernadette_staying',
      stakeholder: 'Walter\'s wife Bernadette', shortStake: 'Bernadette',
      we: '"We\'re retiring in eighteen months. Well. I am. It\'s a we thing. Mostly."',
      keyFact: 'bernadette_staying',
      keyQuestion: '"Every page here says \'we retire,\'" the Specialist says. "Has Bernadette ever said that?"',
      changeOfMind: '"Bernadette got promoted. She\'s thrilled. I\'m thrilled. I am... recalculating."',
      spreadsheetFact: 'part_time_offer',
      spreadsheet: 'Walter shares a printout titled THE DAY. Column B is his paycheck going to zero. There is no column for Bernadette. A sticky note on the back says "Dave: 3 days??"',
      fit: { grand_plan: 'poor', joint_plan: 'appropriate', bridge_plan: 'acceptable', gap_check: 'acceptable', not_now: 'acceptable', steady_ground: 'poor', buffer_first: 'poor' },
      unlocks: { joint_plan: ['bernadette_staying'], bridge_plan: ['part_time_offer'] },
      conversation: [
        { text: '"Five hundred and twelve days. I checked this morning. And at lunch."', tag: 'fact', fact: 'countdown' },
        { text: '"Bernadette loves the hospital. Says she\'s never been busier. Good for her."', tag: 'fact', fact: 'bernadette_staying', subtle: true },
        { text: '"What\'s the earliest I can walk out the door? Give me a date. I have a pen."', tag: 'question', pitch: true },
        { text: '"Once you retire you basically stop spending money, right? No commute."', tag: 'misconception' },
        { text: '"I\'m taking up golf. I bought the shoes. Not the clubs yet. Shoes first."', tag: 'fact', fact: 'golf_shoes' },
        { text: '"Dave, my boss, floated something about three days a week. I said I\'d think about it. I have not."', tag: 'fact', fact: 'part_time_offer', subtle: true },
        { text: '"Did you know the average person spends six months of their life at red lights? I read that. I timed mine."', tag: 'tangent' },
        { text: '"Thirty-eight years at the same desk. I\'d like to see what the rest of the day looks like."', tag: 'emotion' },
        { text: '"I just want it locked in. Signed, stamped, done."', tag: 'emotion' }
      ]
    },

    mateo: {
      id: 'mateo', segment: 'early', name: 'Mateo', title: 'The "Too Early" Graduate', hue: 140,
      opener: '"My mom made this appointment. I\'m twenty-three. I don\'t really have money yet."',
      surface: 'Thinks it\'s way too early for any of this.',
      traits: ['Polite, slightly suspicious', 'Replies in emoji', 'Budgets snacks with precision'],
      prefers: 'text', patience: 3, complexity: 'low',
      facts: {
        student_loans: { label: 'Student loan payments start this fall' },
        unenrolled: { label: 'Never signed up for the savings plan at work, so the company match goes unclaimed', key: true },
        no_cushion: { label: 'One car repair away from the credit card' },
        mom_cosigned: { label: 'Mom Lucia co-signed the loans and checks in weekly' }
      },
      stakeholderFact: 'mom_cosigned',
      stakeholder: 'Mateo\'s mom Lucia', shortStake: 'Lucia',
      we: '"My mom co-signed some stuff, so she kind of... has opinions. Lots of them."',
      keyFact: 'unenrolled',
      keyQuestion: '"Is Mateo signed up for the plan at work?" the Specialist asks. "Because that changes the order of everything."',
      changeOfMind: '"ok so HR emailed. apparently there\'s free money I\'ve been ignoring for a year?? is that a thing??"',
      spreadsheetFact: 'no_cushion',
      spreadsheet: 'Mateo shares a phone note called "money." It lists rent, loans, and "burritos (a lot)." Under savings: a single question mark.',
      fit: { grand_plan: 'poor', simple_start: 'appropriate', buffer_first: 'acceptable', not_now: 'acceptable', steady_ground: 'poor', gap_check: 'poor' },
      unlocks: { simple_start: ['unenrolled'], buffer_first: ['no_cushion'] },
      conversation: [
        { text: '"No offense, but isn\'t this stuff for, like, people with houses?"', tag: 'misconception' },
        { text: '"Loans kick in this fall. I\'m trying not to think about it."', tag: 'fact', fact: 'student_loans' },
        { text: '"There was this HR packet on my first day. Super thick. I think it\'s in my car?"', tag: 'fact', fact: 'unenrolled', subtle: true },
        { text: '"How much money do I need before I\'m allowed to do this?"', tag: 'question', pitch: true },
        { text: '"My mom co-signed the loans, so she texts me about them. Daily. With links."', tag: 'fact', fact: 'mom_cosigned' },
        { text: '"My car made a noise last week. I turned the music up. Problem solved."', tag: 'fact', fact: 'no_cushion' },
        { text: '"Have you tried the burrito place on Dock Street? Life-changing. Anyway."', tag: 'tangent' },
        { text: '"Everyone online either says buy a house now or never buy anything ever. I just tune it out."', tag: 'emotion', pitch: true },
        { text: '"I just don\'t want to be stressed about money forever, you know?"', tag: 'emotion' }
      ]
    },

    lorraine: {
      id: 'lorraine', segment: 'caregiver', name: 'Lorraine', title: 'The Middle of the Sandwich', hue: 300,
      opener: '"Sorry, I\'m in the car. I\'m always in the car. Practice, then Dad\'s, then practice again."',
      surface: 'Wants help "paying for everything." Everything is a lot.',
      traits: ['Runs three households from a minivan', 'Never asks for help', 'Answers questions with lists'],
      prefers: 'call', patience: 4, complexity: 'low',
      facts: {
        teens_college: { label: 'Two teenagers, and the oldest is touring colleges' },
        dad_decline: { label: 'Dad\'s memory is slipping, and nobody has the authority to handle his affairs', key: true },
        brothers_assume: { label: 'Her brothers assume she will handle Dad, and she has never asked them to help' },
        self_last: { label: 'Has set nothing aside for herself in three years' }
      },
      stakeholderFact: 'brothers_assume',
      stakeholder: 'Lorraine\'s brother Vince', shortStake: 'Vince',
      we: '"My brothers? They\'re... around. Vince sends a very nice text on holidays."',
      keyFact: 'dad_decline',
      keyQuestion: '"Who can legally sign for her father?" the Specialist asks. "Because if he can\'t anymore, nobody in this plan can."',
      changeOfMind: '"Dad called me by my mother\'s name yesterday. Twice. I think we\'re past \'keeping an eye on it.\'"',
      spreadsheetFact: 'self_last',
      spreadsheet: 'Lorraine shares the family budget. A column for each kid, a column for Dad, a column for the dog. There is no column for Lorraine.',
      fit: { grand_plan: 'poor', referral: 'appropriate', joint_plan: 'acceptable', buffer_first: 'acceptable', not_now: 'poor', steady_ground: 'poor', gap_check: 'poor' },
      unlocks: { referral: ['dad_decline'], joint_plan: ['brothers_assume'], buffer_first: ['self_last'] },
      conversation: [
        { text: '"Hang on, I\'m merging. Okay. Go."', tag: 'emotion' },
        { text: '"My oldest wants to look at schools four states away. Four!"', tag: 'fact', fact: 'teens_college' },
        { text: '"Dad\'s fine. He forgets things. He put the remote in the fridge. Everybody does that."', tag: 'fact', fact: 'dad_decline', subtle: true },
        { text: '"Is there one thing that pays for college, Dad, and the roof? Like a bundle?"', tag: 'question', pitch: true },
        { text: '"My brothers live far away. They figure I\'ve got it. And I do. Mostly."', tag: 'fact', fact: 'brothers_assume', subtle: true },
        { text: '"I\'ll think about my own retirement once the kids are through school."', tag: 'misconception', pitch: true },
        { text: '"The dog has a vet appointment Thursday. The dog has a better calendar than I do."', tag: 'tangent' },
        { text: '"When did I last buy something for me? Um. There was a lip balm in 2022."', tag: 'fact', fact: 'self_last' },
        { text: '"I\'m tired. Not complaining. Just tired."', tag: 'emotion' }
      ]
    },

    zoe: {
      id: 'zoe', segment: 'early', name: 'Zoe', title: 'The Feast-or-Famine Freelancer', hue: 175,
      opener: '"I just got paid for a huge project! I want to do something smart with it before I do something dumb with it."',
      surface: 'Wants to invest one big check. Today, ideally.',
      traits: ['Illustrator, lives by deadlines', 'Texts at 1am', 'Optimistic to a fault'],
      prefers: 'text', patience: 3, complexity: 'low',
      facts: {
        lumpy_income: { label: 'Income swings wildly: one great month, then nothing for three', key: true },
        tax_surprise: { label: 'Got blindsided by a tax bill last spring' },
        moving_in: { label: 'Apartment-hunting with girlfriend Imani; they would split everything' },
        plants: { label: 'Owns forty-one houseplants and knows all their names' }
      },
      stakeholderFact: 'moving_in',
      stakeholder: 'Zoe\'s girlfriend Imani', shortStake: 'Imani',
      we: '"Imani and I might get a place. So it\'s my money, but also kind of soon-to-be-our money?"',
      keyFact: 'lumpy_income',
      keyQuestion: '"What does Zoe earn in a slow month?" the Specialist asks. "Because this plan assumes every month looks like this one."',
      changeOfMind: '"ok so the big client paused all their projects. indefinitely. so the next check is... not coming. lol. (not lol)"',
      spreadsheetFact: 'tax_surprise',
      spreadsheet: 'Zoe shares an invoice tracker. Gorgeous colors, hand-lettered headers. The "taxes" column is a doodle of a ghost.',
      fit: { grand_plan: 'poor', buffer_first: 'appropriate', simple_start: 'acceptable', joint_plan: 'acceptable', not_now: 'acceptable', steady_ground: 'poor', gap_check: 'poor' },
      unlocks: { buffer_first: ['lumpy_income'], simple_start: ['tax_surprise'], joint_plan: ['moving_in'] },
      conversation: [
        { text: '"Okay, I\'m kind of buzzing. This is the biggest check I\'ve ever gotten."', tag: 'emotion' },
        { text: '"Work\'s great right now! It\'s a little feast-or-famine, but right now it\'s feast."', tag: 'fact', fact: 'lumpy_income', subtle: true },
        { text: '"What\'s the best thing to put it in? Like, the very best one?"', tag: 'question', pitch: true },
        { text: '"Taxes just come out automatically, right? Like at a normal job?"', tag: 'misconception' },
        { text: '"Last April a letter about taxes ruined my entire week. I still flinch at envelopes."', tag: 'fact', fact: 'tax_surprise' },
        { text: '"Imani and I are looking at apartments. One has a skylight. For the plants."', tag: 'fact', fact: 'moving_in' },
        { text: '"I have forty-one plants. The fern is named Gregory. Gregory is thriving."', tag: 'fact', fact: 'plants' },
        { text: '"Do you think a monstera can tell when you\'re stressed? Mine can. It droops at me."', tag: 'tangent' },
        { text: '"This is the year I finally feel like a grown-up. I can feel it."', tag: 'emotion', pitch: true }
      ]
    },

    darnell: {
      id: 'darnell', segment: 'changes', name: 'Darnell', title: 'The Starting-Over Dad', hue: 225,
      opener: '"I want to redo everything. New accounts, new everything. Clean slate."',
      surface: 'Wants a complete fresh start after the divorce. Right now.',
      traits: ['Methodical, a little raw', 'Every-other-weekend dad', 'Makes lists to stay calm'],
      prefers: 'email', patience: 4, complexity: 'high',
      facts: {
        not_final: { label: 'The divorce is not final until spring, and some things cannot change yet', key: true },
        coparent: { label: 'Big costs for the kids still get decided with his ex, Simone' },
        one_income: { label: 'Running a household on one income for the first time' },
        pancakes: { label: 'Has perfected dinosaur pancakes for weekends with the kids' }
      },
      stakeholderFact: 'coparent',
      stakeholder: 'Darnell\'s ex-wife Simone', shortStake: 'Simone',
      we: '"The kids\' stuff... Simone and I still have to agree on that. Per the mediator."',
      keyFact: 'not_final',
      keyQuestion: '"Is the divorce final?" the Specialist asks. "Because half of these changes can\'t happen until it is."',
      changeOfMind: '"My lawyer called. The court date moved to April. So my clean slate has a few smudges until then."',
      spreadsheetFact: 'one_income',
      spreadsheet: 'Darnell shares a budget dated last week. Every line has been cut in half. "Weekend groceries (3)" has been cut in half twice.',
      fit: { grand_plan: 'poor', bridge_plan: 'appropriate', buffer_first: 'acceptable', joint_plan: 'acceptable', steady_ground: 'acceptable', not_now: 'acceptable', gap_check: 'poor' },
      unlocks: { bridge_plan: ['not_final'], buffer_first: ['one_income'], joint_plan: ['coparent'] },
      conversation: [
        { text: '"I made a list. Forty items. I\'d like to do all forty this month."', tag: 'emotion' },
        { text: '"The lawyers are still going back and forth on a couple of things. Paperwork, mostly."', tag: 'fact', fact: 'not_final', subtle: true },
        { text: '"Can we just close everything and start fresh? What\'s the fastest way?"', tag: 'question', pitch: true },
        { text: '"Once you move out, it\'s basically over, legally. Right?"', tag: 'misconception' },
        { text: '"I make pancakes shaped like dinosaurs now. The kids say the stegosaurus is \'mid.\'"', tag: 'fact', fact: 'pancakes' },
        { text: '"Simone and I still split the big kid stuff. Braces. Camp. We\'re civil. Mostly civil."', tag: 'fact', fact: 'coparent' },
        { text: '"First time I\'ve paid every bill myself. The electric company and I are on a first-name basis."', tag: 'fact', fact: 'one_income' },
        { text: '"Did you know dinosaur pancake molds come in a twelve-pack? I own the twelve-pack."', tag: 'tangent' },
        { text: '"I just want the kids to have one place that feels steady."', tag: 'emotion' }
      ]
    },

    ingrid: {
      id: 'ingrid', segment: 'windfall', name: 'Ingrid', title: 'The Guilty Windfall', hue: 55,
      opener: '"My aunt left me money. A lot of money. I feel like I should apologize to somebody."',
      surface: 'Wants to "do something responsible" with an inheritance. Immediately.',
      traits: ['Thoughtful, overthinks', 'Writes long emails, then apologizes for them', 'Uncomfortable being the lucky one'],
      prefers: 'email', patience: 5, complexity: 'high',
      facts: {
        guilt_driven: { label: 'Wants the money gone fast because it does not feel like hers', key: true },
        cousin_bram: { label: 'Cousin Bram expected a share and is not speaking to her' },
        tax_unknowns: { label: 'Has no idea what, if anything, she owes on it' },
        aunt_hedda: { label: 'Aunt Hedda taught her poker, and lost on purpose' }
      },
      stakeholderFact: 'cousin_bram',
      stakeholder: 'Ingrid\'s cousin Bram', shortStake: 'Bram',
      we: '"Bram thinks half of it should be his. Maybe he\'s right. I honestly don\'t know."',
      keyFact: 'guilt_driven',
      keyQuestion: '"Why the rush?" the Specialist asks. "Nothing here needs deciding this year. Does Ingrid know that?"',
      changeOfMind: '"I almost gave the whole thing to Bram yesterday. The email was written. Then I thought of you and saved it as a draft."',
      spreadsheetFact: 'tax_unknowns',
      spreadsheet: 'Ingrid shares a document called "Ways To Not Be Selfish." It has nineteen options, color-coded by how noble they feel. None of them mention taxes.',
      fit: { grand_plan: 'poor', steady_ground: 'appropriate', referral: 'acceptable', not_now: 'acceptable', joint_plan: 'poor', bridge_plan: 'poor', gap_check: 'poor', buffer_first: 'poor' },
      unlocks: { steady_ground: ['guilt_driven'], referral: ['tax_unknowns'], joint_plan: ['cousin_bram'] },
      conversation: [
        { text: '"I rewrote my email to you four times. Sorry it was so long."', tag: 'emotion' },
        { text: '"Aunt Hedda taught me poker. She lost on purpose and pretended she didn\'t."', tag: 'fact', fact: 'aunt_hedda' },
        { text: '"I\'d like to have this all decided by next month. It feels wrong just sitting there."', tag: 'fact', fact: 'guilt_driven', subtle: true },
        { text: '"What would a responsible person do with this? Just tell me and I\'ll do it."', tag: 'question', pitch: true },
        { text: '"If I do everything fast enough, I won\'t have time to mess it up."', tag: 'misconception', pitch: true },
        { text: '"There was a form from the estate lawyer. I put it under a plant so I wouldn\'t have to look at it."', tag: 'fact', fact: 'tax_unknowns' },
        { text: '"Bram hasn\'t returned my calls since the will was read. He expected more."', tag: 'fact', fact: 'cousin_bram' },
        { text: '"She kept a jar of buttons from every coat she ever owned. I got the jar too."', tag: 'tangent' },
        { text: '"I didn\'t do anything to deserve this. She just... loved me. Somehow that\'s harder."', tag: 'emotion' }
      ]
    },

    rafael: {
      id: 'rafael', segment: 'owner', name: 'Rafael', title: 'The Next Generation', hue: 95,
      opener: '"My dad wants to talk about \'the future of the business.\' He sent me to you first. I think it\'s a test."',
      surface: 'Taking over the family hardware store. Wants a plan for "when it\'s mine."',
      traits: ['Dutiful', 'Knows every bolt in the store', 'Changes the subject when Dad comes up'],
      prefers: 'call', patience: 4, complexity: 'low',
      facts: {
        wants_out: { label: 'Does not actually want to run the store. Wants to teach', key: true },
        dad_aurelio: { label: 'Father Aurelio built the store and expects him to take over' },
        sister_interested: { label: 'Younger sister Paloma quietly wants the store' },
        forty_years: { label: 'The store turns forty next spring, and Dad wants a party' }
      },
      stakeholderFact: 'dad_aurelio',
      stakeholder: 'Rafael\'s father Aurelio', shortStake: 'Aurelio',
      we: '"Dad\'s still the boss. On paper. And in every other way, really."',
      keyFact: 'wants_out',
      keyQuestion: '"Does Rafael actually want the store?" the Specialist asks. "Because everything here assumes yes."',
      changeOfMind: '"I told Dad. About teaching. He didn\'t say anything for a long time. Then he asked if Paloma knows how to order lumber. She does."',
      spreadsheetFact: 'sister_interested',
      spreadsheet: 'Rafael shares the store\'s books. Neat, careful, all in Dad\'s handwriting. In the margins, in a different hand: notes on cutting costs. They\'re good. They\'re Paloma\'s.',
      fit: { grand_plan: 'poor', partner_plan: 'appropriate', joint_plan: 'acceptable', not_now: 'acceptable', simple_start: 'poor', steady_ground: 'poor', gap_check: 'poor', buffer_first: 'poor' },
      unlocks: { partner_plan: ['wants_out'], joint_plan: ['dad_aurelio'] },
      conversation: [
        { text: '"Sorry, my dad called on the way here. Twice. Three times. That was three."', tag: 'emotion' },
        { text: '"I\'ve worked the counter since I was nine. I can find any screw by feel."', tag: 'tangent' },
        { text: '"I coach the robotics club at the high school on Thursdays. Best part of my week. Don\'t tell Dad."', tag: 'fact', fact: 'wants_out', subtle: true },
        { text: '"How do we make sure the store keeps going after Dad? What\'s the big plan?"', tag: 'question', pitch: true },
        { text: '"Forty years next spring. Dad wants a cake shaped like a hammer."', tag: 'fact', fact: 'forty_years' },
        { text: '"Family businesses just go to the oldest. That\'s how it works."', tag: 'misconception', pitch: true },
        { text: '"My sister Paloma redid the whole inventory system over a weekend. For fun. Who does that for fun?"', tag: 'fact', fact: 'sister_interested', subtle: true },
        { text: '"Dad\'s expected me to take over since before I could walk."', tag: 'fact', fact: 'dad_aurelio' },
        { text: '"I don\'t want to let him down. That\'s the whole thing."', tag: 'emotion' }
      ]
    },

    maxine: {
      id: 'maxine', segment: 'retiree', name: 'Maxine', title: 'The Pension Believer', hue: 355,
      opener: '"I\'ve got the pension. I\'m honestly only here because my coworker wouldn\'t stop talking about you."',
      surface: 'Assumes the pension covers everything. Here mostly to be polite.',
      traits: ['ER nurse, unflappable', 'Brings snacks to every meeting', 'Trusts the system she has paid into'],
      prefers: 'call', patience: 5, complexity: 'low',
      facts: {
        pension_gap: { label: 'Plans to stop at 55, but the full pension does not start until 60', key: true },
        lenny_counts: { label: 'Husband Lenny is self-employed and counting on her pension for both of them' },
        night_shifts: { label: 'Twenty-six years of night shifts, and her knees have opinions' }
      },
      stakeholderFact: 'lenny_counts',
      stakeholder: 'Maxine\'s husband Lenny', shortStake: 'Lenny',
      we: '"Lenny figures my pension\'s got us both covered. It\'s my pension, but it\'s our retirement."',
      keyFact: 'pension_gap',
      keyQuestion: '"When does Maxine plan to stop working?" the Specialist asks. "And when does the pension actually start? Those are two different numbers."',
      changeOfMind: '"They\'re offering early retirement to anyone over fifty-four. HR made it sound like a gift basket. I\'m tempted."',
      spreadsheetFact: 'pension_gap',
      spreadsheet: 'Maxine brings her pension statement, folded into a perfect square. It projects a monthly amount "at normal retirement age." Someone has circled the word "normal."',
      fit: { grand_plan: 'poor', gap_check: 'appropriate', joint_plan: 'acceptable', not_now: 'acceptable', steady_ground: 'poor', buffer_first: 'poor', bridge_plan: 'poor' },
      unlocks: { gap_check: ['pension_gap'], joint_plan: ['lenny_counts'] },
      conversation: [
        { text: '"Granola bar? I always bring extras. Nurses never know when lunch is."', tag: 'tangent' },
        { text: '"I\'ve paid into that pension for twenty-six years. It\'s handled."', tag: 'misconception', pitch: true },
        { text: '"I\'m thinking fifty-five and done. My knees are thinking fifty-three."', tag: 'fact', fact: 'pension_gap', subtle: true },
        { text: '"So what do you actually do for someone like me? Honest question."', tag: 'question', pitch: true },
        { text: '"Lenny does landscaping. His retirement plan is \'Maxine\'s pension.\' He says it like a joke."', tag: 'fact', fact: 'lenny_counts' },
        { text: '"Twenty-six years of nights. I sleep with a fan, a mask and earplugs. Like an astronaut."', tag: 'fact', fact: 'night_shifts' },
        { text: '"We had a man last week who swallowed a car key. Very calm about it. Wanted to know if he could still drive home."', tag: 'tangent' },
        { text: '"I take care of everybody. I don\'t love being the one asking questions."', tag: 'emotion' }
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
  C.evelyn.checkin = {
    goal: { minTrust: 6, text: '"Not rattling around in a big quiet house. I keep thinking if I sell it, I\'ll stop missing him in every room."', fact: 'house_rush', guarded: '"Getting it all sorted. Quickly. Before... well. Quickly." She smooths her skirt and does not finish the thought.' },
    work: { text: '"I retired from the library six years ago. These days my job is returning casserole dishes."' },
    people: { text: '"Corinne. She calls every morning at 8:05. She\'s already picked out a condo for me. It has a ramp. I don\'t need a ramp."', fact: 'daughter_pushing' },
    worry: { curious: true, text: '"Honestly? The quiet. I think I want to sell the house so I stop hearing it. Is that a terrible reason?"', fact: 'house_rush', guarded: '"Making a mess of things Harold kept so tidy." She looks around the room, at nothing in particular.' },
    money: { minTrust: 5, text: '"The lawyer said I\'m fine for the next year at least. I think I wanted it not to be fine, so there\'d be something to fix. And there\'s the shoebox."', fact: 'fine_for_now', guarded: '"I wouldn\'t know. That was Harold\'s department. There\'s a shoebox." She folds her hands.' }
  };
  C.walter.checkin = {
    goal: { text: '"Waking up on a Tuesday with nowhere to be. And golf. I have the shoes."', fact: 'golf_shoes' },
    work: { text: '"Dave keeps hinting I could go to three days a week instead. I keep changing the subject. To golf, mostly."', fact: 'part_time_offer' },
    people: { minTrust: 6, text: '"All right. Bernadette doesn\'t want to stop. She told me last spring. I was hoping she\'d come around by the time the app hit zero."', fact: 'bernadette_staying', guarded: '"Bernadette and I are on the same page." He straightens the printout. "Roughly the same chapter."' },
    worry: { curious: true, text: '"That I retire and she doesn\'t, and I\'m home alone in my golf shoes, watching the clock for her to get back."', fact: 'bernadette_staying', guarded: '"Running out of money." He says it like an answer he rehearsed in the car.' },
    money: { text: '"I print it monthly. Do you want the printout? I brought the printout. I brought two."', fact: 'countdown' }
  };
  C.mateo.checkin = {
    goal: { text: '"Not panicking when the loan bill shows up. That\'s the whole dream, honestly."', fact: 'student_loans' },
    work: { curious: true, text: '"Wait. HR keeps emailing about \'enrollment.\' I thought that was spam. Is that... money?"', fact: 'unenrolled', guarded: '"Good! It\'s a real job. There\'s a lanyard." He does not seem to have read much past the lanyard.' },
    people: { text: '"My mom, Lucia. She co-signed the loans. She\'d honestly be thrilled I\'m here. Please don\'t tell her I said that."', fact: 'mom_cosigned' },
    worry: { minTrust: 6, text: '"Ok, real talk. My coworker said she gets extra money just for signing some form at work. I never signed anything. I think I already messed up."', fact: 'unenrolled', guarded: '"Messing up before I even start." He laughs, but not much.' },
    money: { text: '"Rent, loans, burritos. If the car breaks, I guess... the credit card?"', fact: 'no_cushion' }
  };
  C.lorraine.checkin = {
    goal: { minTrust: 6, text: '"Knowing Dad\'s taken care of if he can\'t... decide things anymore. Which might be soon. Nobody\'s allowed to sign for him. I checked."', fact: 'dad_decline', guarded: '"A month where nobody I love has an emergency." She laughs. It sounds practiced.' },
    work: { text: '"I\'m part-time at the clinic now. I cut back for Dad. Nobody asked me to. Nobody had to."', fact: 'self_last' },
    people: { minTrust: 6, text: '"My brothers. Vince and Paulie. They\'ve never once offered, and I\'ve never once asked. I think I\'m angry about it. Huh."', fact: 'brothers_assume', guarded: '"Me. It\'s just me, really. It\'s fine." She grips the wheel a little tighter.' },
    worry: { curious: true, text: '"Dad. He got lost driving home from the hardware store last week. If something happens, I don\'t think I\'m allowed to sign anything for him."', fact: 'dad_decline', guarded: '"Everything. Pick one." She laughs, then quickly asks about college tours instead.' },
    money: { text: '"Kids, Dad, mortgage, dog. In that order. I\'m somewhere after the dog."', fact: 'self_last' }
  };
  C.zoe.checkin = {
    goal: { text: '"Feeling like a real adult. With a couch that didn\'t come from the curb."' },
    work: { curious: true, text: '"Honestly? This check is the first real money since spring. Before that it was three months of rice and refreshing my inbox."', fact: 'lumpy_income', guarded: '"Busy! Super busy. Right now." She leans on "right now" without seeming to notice.' },
    people: { text: '"Imani. We\'re apartment hunting. So whatever I do, she\'s kind of in it too."', fact: 'moving_in' },
    worry: { minTrust: 6, text: '"That this is the last big check for a while, and I blow it. It\'s happened before. Twice."', fact: 'lumpy_income', guarded: '"Picking the wrong thing to invest in?" She says it like a question.' },
    money: { text: '"Depends on the month! Some months are great. Some months the government writes me sad letters."', fact: 'tax_surprise' }
  };
  C.darnell.checkin = {
    goal: { text: '"A place the kids actually like coming to. And a budget that works on one paycheck."', fact: 'one_income' },
    work: { text: '"Steady. I asked for fewer late shifts so I can do school pickups. My boss was decent about it."' },
    people: { text: '"Simone, for anything with the kids. We have a shared calendar. Very color-coded. Very polite."', fact: 'coparent' },
    worry: { curious: true, text: '"Honestly? Nothing\'s final yet. Court\'s not until spring, and I keep acting like it\'s done because I want it to be done."', fact: 'not_final', guarded: '"Doing it wrong. Again." He looks at his list instead of at you.' },
    money: { minTrust: 6, text: '"Tight, and stuck. My lawyer said not to move anything big until the decree is signed. I was kind of hoping you\'d say she was wrong."', fact: 'not_final', guarded: '"Fine. Tighter. I\'m figuring it out." He doesn\'t offer any numbers.' }
  };
  C.ingrid.checkin = {
    goal: { minTrust: 6, text: '"Honestly? Not having it. Every time I see the balance I feel like I stole it. I want it gone, so I can just miss her."', fact: 'guilt_driven', guarded: '"Doing right by her." She doesn\'t say what that means, and you suspect she doesn\'t know yet either.' },
    work: { text: '"I teach piano. Kids, mostly. Nobody gets rich teaching piano. Hence the guilt."' },
    people: { text: '"My cousin Bram. He thinks he should have gotten more. He might be right. He isn\'t answering my calls."', fact: 'cousin_bram' },
    worry: { curious: true, text: '"That I\'ll keep it and turn into someone who keeps things. So I want to give it all away fast, before I can change my mind."', fact: 'guilt_driven', guarded: '"Being selfish." She says it quietly, then asks about the weather.' },
    money: { text: '"My normal money is fine. This money is in a separate account I don\'t look at. There\'s a tax form somewhere. Under a plant."', fact: 'tax_unknowns' }
  };
  C.rafael.checkin = {
    goal: { curious: true, text: '"Can I be honest? I want to teach. High school science. I\'ve wanted it for years. I just don\'t know how to make the store not mine."', fact: 'wants_out', guarded: '"The store doing well. For Dad." He says "for Dad" twice without meaning to.' },
    work: { text: '"The store\'s fine. Paloma\'s better at the computer side than me, honestly. She lights up when the shipment comes in."', fact: 'sister_interested' },
    people: { text: '"Dad. Aurelio. He built the place. He\'s been planning my takeover since I was in diapers. Probably earlier."', fact: 'dad_aurelio' },
    worry: { minTrust: 6, text: '"That I spend thirty years behind that counter being good at something I don\'t want. And Dad never knows."', fact: 'wants_out', guarded: '"Letting Dad down." That much seems true. You sense it is not the whole thing.' },
    money: { text: '"The store pays me okay. Not great. Dad says it\'ll be great \'once it\'s yours.\' He says that a lot."', fact: 'forty_years' }
  };
  C.maxine.checkin = {
    goal: { text: '"Stop working nights. Garden. Sleep when it\'s dark, like a normal person."', fact: 'night_shifts' },
    work: { minTrust: 6, text: '"Honestly, I\'m done at fifty-five. Maybe sooner. Someone said the full pension starts at sixty, but I figured that\'s a technicality."', fact: 'pension_gap', guarded: '"Same as always. Busy, loud, someone always bleeding." She smiles. "A few more years."' },
    people: { text: '"Lenny. My husband. He\'s self-employed, so no pension of his own. Mine\'s kind of ours."', fact: 'lenny_counts' },
    worry: { curious: true, text: '"The years between stopping and the pension starting. I don\'t actually know what happens there. Never asked. Funny, right? I ask questions all day."', fact: 'pension_gap', guarded: '"Worry? I\'ve got the pension." She takes a long sip of coffee.' },
    money: { text: '"Fine. Regular paycheck, regular bills. Lenny\'s money comes in spring through fall, and then it\'s mostly my money."', fact: 'lenny_counts' }
  };
})(window.PP);
