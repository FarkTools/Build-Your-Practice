/* Today at the port: small happenings that can greet you when you start a day at
 * Port Prospect. Each one is
 *   { id, text, when?: (career) => bool, choices: [{ label, eff?, result }] }
 * Career effects (eff) use only these keys, applied by PP.content.applyPortDay:
 *   savings     number, can be negative
 *   prospect    { temp, source, bias } (or an array of them): adds to the pipeline
 *   sat         number added to every active client's satisfaction (0-10)
 *   skill       { skillId: n } (skills cap at 2)
 *   energyNext  number: stored on career.energyNext, applied as Energy at the start of the next journey
 *   market      number: change to natural-market contacts (never below 0)
 *   day         true: this choice costs the day (the day passes)
 * Use PP.content.pickPortDay(career) to draw one that fits and has not been seen lately.
 */
(function (PP) {
  const active = (c) => c.book.filter((b) => ['life', 'steady', 'at-risk'].includes(b.status));
  const nActive = (c) => active(c).length;
  const level = (c) => (PP.career ? PP.career.level(c) : 'survivable');
  const runway = (c) => (PP.career ? PP.career.runway(c) : Infinity);
  const OK = (result, eff) => [{ label: 'Okay', eff, result }];

  PP.content.portDays = [
    /* ---- The coffee cart and the harbor ---- */
    {
      id: 'coffee_tip',
      text: 'Bernie slides your coffee across the cart and leans in. "Free tip with every medium drip. Woman who runs the flower stall is selling up next year and has no idea what comes after. Didn\'t hear it from me."',
      choices: [
        { label: 'Wander over to the flower stall', eff: { prospect: { temp: 'warm', source: 'a tip from Bernie at the coffee cart', bias: { owner: 2, retiree: 1 } } }, result: 'You buy some tulips you do not need and ask how business is. Twenty minutes later you have a new name in your pipeline and a very fragrant desk.' },
        { label: 'Just the coffee, thanks', eff: { energyNext: 1 }, result: 'Bernie shrugs. "Your loss." The coffee is excellent, though. You feel a little more ready for the trail.' }
      ]
    },
    {
      id: 'storm',
      text: 'A storm rolls in off the water overnight. The harbor master closes the port. Rain is going sideways, the ferry is tied up, and the power keeps flickering.',
      choices: [
        { label: 'Call every client to check they are okay', eff: { day: true, sat: 1 }, result: 'Nobody needs anything, exactly. But every single one of them remembers that you called. Satisfaction up all round.' },
        { label: 'Hunker down and catch up on notes', eff: { day: true, energyNext: 1 }, result: 'You make tea, fix three files, and take a nap you will deny later. Nothing moves today, but you feel rested.' }
      ]
    },
    {
      id: 'fog_morning',
      text: 'Thick fog this morning. You cannot see the end of the pier. The foghorn goes every ninety seconds, which you start to find oddly motivating.',
      choices: OK('A slow, quiet start. You get your desk organized for the first time in weeks.', { energyNext: 1 })
    },
    {
      id: 'harbor_days',
      text: 'It is Harbor Days. There is a parade with one tuba, three dogs in sailor hats, and the mayor waving from a borrowed boat trailer.',
      choices: [
        { label: 'Walk the parade route and say hello', eff: { day: true, market: 1, prospect: { temp: 'cold', source: 'the Harbor Days parade', bias: { family: 1, retiree: 1 } } }, result: 'You shake forty hands, eat a funnel cake, and reconnect with an old neighbor. One new name, one rekindled friendship.' },
        { label: 'Watch from your window and get work done', result: 'The tuba is surprisingly good. You get through your whole to-do list.' }
      ]
    },
    {
      id: 'fisherman',
      text: 'A fisherman named Hal is mending nets on the pier outside. "You\'re the money person? My daughter says I should talk to someone. I said I\'d think about it. I\'ve been thinking about it for six years."',
      choices: [
        { label: 'Sit on the pier and listen', eff: { prospect: { temp: 'warm', source: 'a fisherman on the pier', bias: { retiree: 2, owner: 1 } } }, result: 'You do not talk about money at all. You talk about boats, his daughter, and the winter he nearly sold everything. At the end he says, "Alright. Come by Thursday."' },
        { label: 'Give him your card and a wave', eff: { prospect: { temp: 'cold', source: 'a fisherman on the pier', bias: { retiree: 2 } } }, result: 'He tucks the card into his hat band. It will either be there in six months or in the harbor.' }
      ]
    },
    {
      id: 'dog',
      text: 'A golden retriever wanders in, sits on your foot, and refuses to move. The tag says "BISCUIT. If found, he is fine, he does this."',
      choices: [
        { label: 'Walk Biscuit home', eff: { prospect: { temp: 'warm', source: 'the owner of a very good dog', bias: { retiree: 1, changes: 1 } } }, result: 'Biscuit\'s owner is mortified, grateful, and makes you stay for coffee. Somewhere between the second cup and the photo albums, they ask what you do.' },
        { label: 'Let him stay until someone comes', eff: { energyNext: 1 }, result: 'His owner arrives two hours later. You have never felt calmer. You are considering a dog.' }
      ]
    },
    {
      id: 'parking_ticket',
      text: 'There is a parking ticket on your car. You parked there because the sign said 2-hour parking. The sign, it turns out, was referring to a different decade.',
      choices: OK('You pay it. You also take a photo of the sign for a strongly worded letter you will never send.', { savings: -45 })
    },
    {
      id: 'coat_pocket',
      text: 'You put on your winter coat for the first time this year and find forty dollars, a cough drop and a business card from your first week, with a note in your handwriting: "CALL BACK."',
      choices: [
        { label: 'Call them back, finally', eff: { savings: 40, prospect: { temp: 'cold', source: 'a card in your coat pocket' } }, result: 'They remember you. They are a little amused it took this long. They would still like to talk.' },
        { label: 'Keep the forty dollars, recycle the card', eff: { savings: 40 }, result: 'Forty dollars richer. The card goes in the recycling. Some mysteries are best left in coats.' }
      ]
    },
    {
      id: 'bake_sale',
      text: 'The church on the corner is having a bake sale. A small, very determined child is standing outside your door with a tray of lemon bars.',
      choices: [
        { label: 'Buy the whole tray', eff: { savings: -25, market: 1 }, result: 'The child\'s mother turns out to be an old school friend you had lost touch with. You swap numbers. Lemon bars for the whole week.' },
        { label: 'Buy one', eff: { savings: -3 }, result: 'It is an excellent lemon bar. The child looks at you like you have disappointed the entire congregation.' }
      ]
    },
    {
      id: 'free_gym',
      text: 'The gym next to the ferry terminal is offering a free trial week. A man in very small shorts hands you a flyer and a protein sample.',
      choices: [
        { label: 'Try it', eff: { energyNext: 2 }, result: 'You are sore in places you did not know had muscles. By day three you feel genuinely sharper.' },
        { label: 'Get a pastry instead', eff: { energyNext: -1 }, result: 'It is a beautiful pastry. You feel slightly worse for it, in a way you will remember on the trail.' }
      ]
    },

    /* ---- People at the port ---- */
    {
      id: 'reporter',
      text: 'A reporter from the Harbor Gazette pokes her head in. "We\'re doing a piece on how families are coping with prices this year. Could I get a quote from a local agent?"',
      choices: [
        { label: 'Give a careful, plain-language quote', eff: { prospect: { temp: 'cold', source: 'your quote in the Harbor Gazette', bias: { family: 2, caregiver: 1 } } }, result: 'You say something true and kind about making a plan that fits real life. It runs on page six. Somebody cuts it out and calls you.' },
        { label: 'Say something punchy and quotable', eff: { prospect: { temp: 'cold', source: 'your quote in the Harbor Gazette' }, sat: -0.5 }, result: 'It runs as a headline. Your clients read it and wonder if you meant them. One new caller, a few raised eyebrows.' },
        { label: 'Politely decline', result: 'She thanks you and goes next door to Velocity Wealth, who give her a quote about "crushing it." You feel fine about this.' }
      ]
    },
    {
      id: 'walkin_referral',
      text: 'There is someone waiting outside when you arrive, holding a folder. "Hi. Sorry. My neighbor said you were the person to talk to, and I\'ve been putting this off for a year, and if I go home I\'ll put it off for another one."',
      choices: [
        { label: 'Clear your morning for them', eff: { day: true, prospect: { temp: 'hot', source: 'turned up unannounced' } }, result: 'You make coffee, pull up a chair, and listen. By lunch they have stopped apologizing. They want to work with you.' },
        { label: 'Book them in for later in the week', eff: { prospect: { temp: 'warm', source: 'turned up unannounced' } }, result: 'They look relieved just to have a date in the calendar. "Thursday. Okay. Thursday."' }
      ]
    },
    {
      id: 'wrong_number',
      text: 'Your phone rings. "Is this the plumber? There is water coming out of a place where water should not come out."',
      choices: [
        { label: 'Help them find a plumber', eff: { prospect: { temp: 'cold', source: 'a wrong-number caller', bias: { owner: 1, family: 1 } } }, result: 'You find them a plumber in four minutes. They are so grateful they ask what you actually do. "Huh. I might need that too, once I\'m dry."' },
        { label: 'Politely explain it is the wrong number', result: 'They hang up mid-sentence. Somewhere, water continues to come out of a place it should not.' }
      ]
    },
    {
      id: 'old_colleague',
      when: (c) => c.market <= 3,
      text: 'An old colleague you have not spoken to in years emails out of nowhere: "Moved back to the area! Heard you went out on your own. Coffee?"',
      choices: [
        { label: 'Absolutely, coffee', eff: { market: 2 }, result: 'An hour turns into three. They know half the town already and start listing people you should call.' },
        { label: 'Reply "Soon!" and forget about it', result: 'You will both say "we should really get that coffee" for the next four years.' }
      ]
    },
    {
      id: 'career_day',
      text: 'The elementary school asks if you will talk at career day. "Fifteen minutes. The firefighter is going right before you, so, good luck."',
      choices: [
        { label: 'Say yes and bring piggy banks', eff: { day: true, prospect: { temp: 'warm', source: 'a parent at career day', bias: { family: 3 } } }, result: 'The firefighter brought the truck. You brought piggy banks. A surprising number of kids ask about compound interest. One parent asks for your card.' },
        { label: 'Politely pass', result: 'The dentist takes your slot. The dentist also brought stickers. You have been outmaneuvered.' }
      ]
    },
    {
      id: 'podcast',
      text: 'A local podcast called "Harbor Talk" wants you as a guest. It has eleven listeners. Four of them are the host\'s cousins.',
      choices: [
        { label: 'Go on the show', eff: { day: true, prospect: { temp: 'cold', source: 'the Harbor Talk podcast', bias: { early: 2 } } }, result: 'The host asks you about your morning routine for twenty minutes. You get one real question in. A listener under thirty messages you afterwards.' },
        { label: 'Decline, kindly', result: 'The host says "totally understand" in a voice that suggests he does not.' }
      ]
    },
    {
      id: 'award_scam',
      text: 'An email arrives in gold letters: "Congratulations! You have been nominated for Top 40 Under 40 Rising Advisors! To accept, simply pay the $499 recognition fee."',
      choices: [
        { label: 'Delete it', result: 'You delete it. Sloane, you later learn, paid. Her plaque is very shiny. Nobody has ever asked her about it.' },
        { label: 'Pay. You deserve this.', eff: { savings: -499 }, result: 'A plaque arrives. It is heavy and very shiny and says "Rising." You hang it where clients can see. No client ever mentions it.' }
      ]
    },
    {
      id: 'scam_call',
      text: 'Someone calls "from Operations" and needs your login code "to fix a payout glitch, quick quick." There is a lot of background noise and they keep calling you "boss."',
      choices: [
        { label: 'Hang up and call Operations yourself', eff: { skill: { curiosity: 1 } }, result: 'Olu answers. "We don\'t call. We don\'t say quick quick. Well done." You are now slightly harder to fool, and a little bit proud.' },
        { label: 'Read them the code', eff: { savings: -300 }, result: 'It was not Operations. Kenji spends the afternoon locking everything down and charges you only in disappointed looks, plus the cleanup fee.' }
      ]
    },
    {
      id: 'headshot',
      text: 'Tess from Marketing is standing at your desk holding your business card like it is evidence. "This headshot. Is that a wedding? Whose shoulder is that? I have booked a photographer. It\'s not optional. Well, it is, but it isn\'t."',
      choices: [
        { label: 'Get the professional headshot', eff: { savings: -150, prospect: { temp: 'cold', source: 'your new headshot, apparently' } }, result: 'You look like a person who returns phone calls. A stranger who saw your new card at the bakery calls to ask about "whatever it is you do."' },
        { label: 'Take one on your phone against the white wall', result: 'Tess looks at it for a long time. "It\'s... a choice." She lets it go. For now.' }
      ]
    },
    {
      id: 'ce_class',
      text: 'Connie at the library is hosting a free continuing education session: "Plain Language for Complicated Things." Credits count, snacks provided, attendance is "strongly encouraged by me."',
      choices: [
        { label: 'Go to the class', eff: { day: true, skill: { communication: 1 } }, result: 'You learn to say one thing at a time, and to stop at the end of the sentence. It is harder than it sounds. Connie gives you a gold star sticker. You keep it.' },
        { label: 'Skip it this time', result: 'Connie sees you walk past the library window. She does not say anything. She does not need to.' }
      ]
    },
    {
      id: 'compliance_mint',
      text: 'Harold from Compliance stops by your desk, reads the sticky notes on your monitor, and goes very still. "Is that a client\'s birthday next to their account number?"',
      choices: [
        { label: 'Ask him to show you a better way', eff: { day: true, skill: { preparation: 1 } }, result: 'Harold spends the whole afternoon setting up your files properly. He hums while he does it. At the end he gives you a mint and says, "That was the nicest afternoon I\'ve had in a while."' },
        { label: 'Peel them off quickly and apologize', result: 'He nods once. "Better." On his way out, he leaves a mint on your keyboard. You are not sure what it means.' }
      ]
    },
    {
      id: 'lance_watch',
      text: 'Lance, the top producer, sits on the edge of your desk uninvited. "Kid. Quick tip. You ever think about getting a better watch? Clients notice the watch."',
      choices: [
        { label: 'Ask what he actually does on Mondays', eff: { skill: { judgment: 1 } }, result: 'He blinks, then tells you: every Monday, before anything else, he calls three clients who have not heard from him in a while. No agenda. You write it down. You ignore the watch part.' },
        { label: 'Nod until he leaves', result: 'It takes twenty-five minutes. You learn about his boat.' }
      ]
    },
    {
      id: 'sloane_race',
      text: 'Sloane, who started the same week as you, has drawn a scoreboard on the shared whiteboard. Your name is on it. Her column is longer.',
      choices: [
        { label: 'Spend the day catching up on calls', eff: { day: true, prospect: [{ temp: 'cold', source: 'a day of catch-up calls' }, { temp: 'cold', source: 'a day of catch-up calls' }] }, result: 'You make forty-one calls out of pure spite. Two people say yes. You add two tally marks to the board, very firmly.' },
        { label: 'Suggest you swap notes instead', eff: { skill: { resourcefulness: 1 } }, result: 'Sloane looks surprised, then relieved. You trade what is working. Her phone script is better than yours. Your follow-up is better than hers. You erase the scoreboard together.' }
      ]
    },
    {
      id: 'ellen_referral',
      when: (c) => c.days >= 8,
      text: 'Ellen, the CPA upstairs, catches you on the stairs. "I have a client who needs someone who will actually listen. You return phone calls, yes? Good. Don\'t make me regret this."',
      choices: OK('She hands you a name on the back of a receipt. It is the most valuable receipt you have ever held.', { prospect: { temp: 'hot', source: 'a referral from Ellen the CPA', bias: { numbers: 2, windfall: 2 } } })
    },
    {
      id: 'bev_chairs',
      text: 'Bev from the Business Association is unloading folding chairs from a van, alone, in the rain. She spots you. She does not ask. She just looks.',
      choices: [
        { label: 'Help with the chairs', eff: { energyNext: -1, prospect: { temp: 'warm', source: 'an introduction from Bev', bias: { owner: 3 } } }, result: 'Sixty chairs later, soaked, Bev introduces you to the owner of the hardware store "who has been meaning to talk to someone for years." Your back hurts. Worth it.' },
        { label: 'Wave and hurry inside', result: 'Bev waves back. Bev remembers everything. You have a feeling this will come up.' }
      ]
    },
    {
      id: 'ray_lunch',
      text: 'Ray from the community bank invites you to lunch. "My treat. I want to know who I\'m sending people to."',
      choices: [
        { label: 'Go to lunch and mostly listen', eff: { skill: { curiosity: 1 } }, result: 'Ray asks you more questions in an hour than most people ask in a month. You realize halfway through that this is how he does it. You steal the technique.' },
        { label: 'Bring a slide deck', result: 'Ray politely closes your laptop. "Just tell me who you help." You fumble it a bit. He pays anyway.' }
      ]
    },
    {
      id: 'retired_agent',
      when: (c) => c.days >= 5 && level(c) === 'survivable',
      text: 'Marge stops by with a thermos. "You look like I did in year one. Pale. Busy. Doing everything at once. Sit down for ten minutes."',
      choices: OK('She tells you nobody\'s first year looks good from the inside. You drink her tea. It has something in it that is definitely not tea. You feel better.', { energyNext: 1 })
    },

    /* ---- Your clients ---- */
    {
      id: 'summer_job',
      when: (c) => nActive(c) >= 2,
      text: 'One of your clients\' kids, sixteen and very serious, shows up in a borrowed blazer. "I would like a summer job. I am good with spreadsheets and I do not need to be paid much. My mom said to say that."',
      choices: [
        { label: 'Hire them for the summer', eff: { savings: -400, sat: 1 }, result: 'They reorganize your files by color, fix your printer, and tell their mom you are "actually pretty cool." Word gets around your book. Everyone feels like family.' },
        { label: 'Offer to write a reference instead', eff: { sat: 0.5 }, result: 'You write a glowing reference and spend an hour on interview tips. They get a job at the bakery. Their mom sends a thank-you card.' },
        { label: 'Say no, kindly', result: 'They nod, very professionally, and shake your hand. "Thank you for your time." You feel like you just turned down a future boss.' }
      ]
    },
    {
      id: 'cookies',
      when: (c) => nActive(c) >= 1,
      text: 'A tin of cookies has been left on your doorstep with a note: "Thank you for not making me feel stupid. -- one of your clients."',
      choices: OK('You do not know which client. You eat a cookie and decide it does not matter. You will be glowing for days.', { energyNext: 1 })
    },
    {
      id: 'grumpy_email',
      when: (c) => nActive(c) >= 2,
      text: 'An email from a client, subject line "Hello?" Just that. The body is also just "Hello?"',
      choices: [
        { label: 'Call them right now', eff: { sat: 0.5 }, result: 'They had a small question three weeks ago and felt silly asking twice. You answer it in two minutes. They sound relieved. You make a note to call people before they have to email "Hello?"' },
        { label: 'Reply tomorrow, when you have time', eff: { sat: -0.5 }, result: 'By tomorrow they have told a friend you are "hard to reach." That is now a thing someone has said about you.' }
      ]
    },
    {
      id: 'client_wedding',
      when: (c) => nActive(c) >= 3,
      text: 'A wedding invitation arrives from one of your clients. Hand-lettered. There is a little note: "You helped us get here. Please come!"',
      choices: [
        { label: 'Go, and dance badly', eff: { day: true, sat: 1, market: 1 }, result: 'You dance with the bride\'s grandmother, cry at the speeches, and get seated with a table of very friendly cousins. Everyone in your book hears you came.' },
        { label: 'Send a card and a gift', eff: { savings: -80, sat: 0.3 }, result: 'A thoughtful card and something from their registry. They send back a photo of it, unwrapped and in use.' }
      ]
    },
    {
      id: 'client_promotion',
      when: (c) => nActive(c) >= 1,
      text: 'One of your clients got promoted. They texted you before they told their own brother. "Is that weird? That feels weird. Anyway, I got it!"',
      choices: [
        { label: 'Send flowers', eff: { savings: -60, sat: 0.5 }, result: 'The flowers arrive at their new office. Their new team asks who sent them. "My agent," they say, a little proudly.' },
        { label: 'Text back something warm', result: 'You send three exclamation marks and a party emoji. It is enough. It is genuinely enough.' }
      ]
    },
    {
      id: 'client_gossip',
      when: (c) => nActive(c) >= 2,
      text: 'You overhear two of your clients in the bakery line, who apparently know each other, comparing notes on you. "Oh, they\'re great. Always call back." "Mine too!"',
      choices: OK('You hide behind the bread display until they leave. You are grinning like an idiot.', { sat: 0.3 })
    },
    {
      id: 'first_client_mom',
      when: (c) => c.journeys >= 1 && c.journeys <= 3 && c.book.length >= 1,
      text: 'Your very first client\'s mother calls. "My child won\'t stop talking about you. I have some questions of my own, but I warn you, I have a folder."',
      choices: [
        { label: 'Welcome the folder', eff: { prospect: { temp: 'hot', source: 'your first client\'s mother', bias: { retiree: 3 } } }, result: 'The folder is enormous and color-coded. She is delightful. She wants to meet next week.' },
        { label: 'Suggest she starts with a free workshop', eff: { prospect: { temp: 'warm', source: 'your first client\'s mother', bias: { retiree: 3 } } }, result: 'She goes to Connie\'s Tuesday workshop, sits in the front row, and calls you afterwards. "Fine. I\'m ready."' }
      ]
    },

    /* ---- Your practice ---- */
    {
      id: 'laptop_dies',
      when: (c) => c.days >= 3,
      text: 'Your laptop makes a sound like a sad kettle, shows a spinning wheel, and goes black. It does not come back.',
      choices: [
        { label: 'Pay for a same-day repair', eff: { savings: -350 }, result: 'The repair shop gets it working by four. They also find your "notes final FINAL v3" file, which is a relief and an embarrassment.' },
        { label: 'Ask Kenji, and lose the day to it', eff: { day: true }, result: 'Kenji fixes it for the price of a sandwich and a long lecture about backups. You lose the day. You gain a backup.' },
        { label: 'Limp along on your phone', eff: { energyNext: -2 }, result: 'You type a client summary with your thumbs. It takes four hours. You squint for the rest of the week.' }
      ]
    },
    {
      id: 'rent_levy',
      when: (c) => c.workspace !== 'kitchen',
      text: 'The building manager slides a notice under your door: a one-off "harbor-facing improvements" charge. The improvement appears to be a new doormat.',
      choices: [
        { label: 'Pay it and move on', eff: { savings: -200 }, result: 'Paid. The doormat says WELCOME in a font that suggests it does not mean it.' },
        { label: 'Spend the day arguing it down', eff: { day: true, savings: -80, skill: { communication: 1 } }, result: 'You stay calm, ask lots of questions, and get it cut by more than half. You realize this is exactly the conversation you have with clients, just about a doormat.' }
      ]
    },
    {
      id: 'kitchen_table',
      when: (c) => c.workspace === 'kitchen' && c.days >= 4,
      text: 'You are on a video call with a prospect when your neighbor starts a leaf blower directly under your window. Then the smoke alarm goes off. You were not even cooking.',
      choices: OK('The prospect laughs and says, "At least I know you\'re real." Still. You start looking at the shared desks at the Co-op.')
    },
    {
      id: 'coop_coffee',
      when: (c) => c.workspace === 'desk',
      text: 'The coffee machine at the Harbor Co-op is broken. There is a sign that says "BROKEN. DO NOT TOUCH. WE MEAN IT, GREG." Greg is touching it.',
      choices: [
        { label: 'Buy a bag of good beans for everyone', eff: { savings: -25, prospect: { temp: 'warm', source: 'a grateful co-worker at the Co-op', bias: { early: 2 } } }, result: 'You are a hero. The freelancer at the next desk, who you have never spoken to, buys you lunch and asks what you actually do.' },
        { label: 'Survive without', eff: { energyNext: -1 }, result: 'You make it through the day on willpower and tap water. It shows.' }
      ]
    },
    {
      id: 'office_plant',
      when: (c) => c.workspace === 'office',
      text: 'The plant in your office window is dead. You do not know when it died. Several clients have sat next to it.',
      choices: [
        { label: 'Buy a new, better plant', eff: { savings: -35 }, result: 'The new plant is enormous and thriving. A walk-in compliments it. You feel like a person whose life is in order.' },
        { label: 'Leave it. It has character now.', result: 'Two clients ask about it. You tell them it is "resting." They both look at you a little differently.' }
      ]
    },
    {
      id: 'office_sign',
      when: (c) => c.workspace === 'office',
      text: 'Your new sign on Harbor Street has been up a week. Someone has stuck a googly eye on the first letter of your name. It is, honestly, an improvement.',
      choices: OK('You leave it. Three people mention the googly eye. One of them comes in to ask about "the sign with the eye." Good enough.', { prospect: { temp: 'cold', source: 'the sign with the googly eye' } })
    },
    {
      id: 'rival_opens',
      when: (c) => c.days >= 10,
      text: 'A rival practice opens across the street. There are balloons, a tube man, and a banner that says "GUARANTEED RESULTS!!" with two exclamation marks.',
      choices: [
        { label: 'Bring them a plant and say welcome', eff: { market: 1 }, result: 'The agent is twenty-four, terrified, and was told to put up the banner by someone else. You get along. They promise to send you anyone who is not a fit for them.' },
        { label: 'Call every client to make sure they are happy', eff: { day: true, sat: 1 }, result: 'Nobody was thinking of leaving. But now they are definitely not thinking of leaving. Satisfaction up.' },
        { label: 'Ignore the tube man', result: 'You try. It waves at you all day. It waves at you in your dreams.' }
      ]
    },
    {
      id: 'typo_cards',
      text: 'You notice your business cards have a typo in your phone number. You have handed out about two hundred of them.',
      choices: [
        { label: 'Reprint them today', eff: { savings: -60 }, result: 'New cards, correct number. You call the wrong number on the old card out of curiosity. A man named Phil answers and says he has been "fielding your calls for weeks."' },
        { label: 'Fix them with a pen', eff: { market: -1 }, result: 'Each card now has a little handwritten correction. It looks charming on some and alarming on others. At least one old friend gives up trying to reach you.' }
      ]
    },
    {
      id: 'newsletter',
      when: (c) => c.days >= 6,
      text: 'Your first email newsletter went out last night. Analytics: 2 opens. One is you. One is your mom.',
      choices: [
        { label: 'Write a better one: one useful tip, no fluff', eff: { day: true, prospect: { temp: 'cold', source: 'your email newsletter', bias: { numbers: 1, early: 1 } } }, result: 'You write two hundred words about one useful habit. It gets forwarded twice. A stranger replies: "This is the first one of these I\'ve read all the way through."' },
        { label: 'Let it rest for a while', result: 'Your mom writes back: "Very good!! Who is it for?" A fair question.' }
      ]
    },
    {
      id: 'ops_found_money',
      when: (c) => c.journeys >= 1,
      text: 'Olu from Operations calls. "Good news, weird news. A commission of yours got stuck in a queue because someone typed your name with two spaces. It\'s unstuck now."',
      choices: OK('A small payment you had forgotten about arrives. Olu adds, "Check your paperwork for double spaces." You will now see double spaces everywhere.', { savings: 300 })
    },
    {
      id: 'jury_duty',
      when: (c) => c.days >= 12,
      text: 'A summons for jury duty arrives. The date is today. It was in your mail pile under a takeout menu.',
      choices: OK('You spend the whole day in a beige room with forty strangers. You are not picked. You do, however, learn a lot about the man next to you, who is thinking of selling his landscaping business.', { day: true, prospect: { temp: 'cold', source: 'the jury waiting room', bias: { owner: 3 } } })
    },
    {
      id: 'conference',
      when: (c) => c.savings >= 4000 && c.days >= 10,
      text: 'A flyer for the regional agents\' conference: two days of sessions, a keynote titled "Your Why Is Your Wow," and a very expensive lanyard.',
      choices: [
        { label: 'Go, and skip the keynote', eff: { savings: -600, day: true, skill: { judgment: 1 }, market: 1 }, result: 'You skip the keynote and sit in a session about the clients agents lost and why. It is the most useful hour of your career. You also meet someone from your old neighborhood.' },
        { label: 'Save the money', result: 'Sloane goes. She comes back with a tote bag and the phrase "Your Why Is Your Wow" stuck in her head. You feel fine about your choice.' }
      ]
    },

    /* ---- Money, levels, and growth ---- */
    {
      id: 'tight_month',
      when: (c) => runway(c) < 20 && c.savings >= 0,
      text: 'You check your savings over breakfast and do the math twice. The second time is not better than the first.',
      choices: [
        { label: 'Cut back hard for a while', eff: { savings: 120, energyNext: -1 }, result: 'No lunches out, no fancy coffee, no streaming. You save a little, and you are a bit grumpier on the trail.' },
        { label: 'Spend the day prospecting harder', eff: { day: true, prospect: { temp: 'cold', source: 'a determined day of calls' } }, result: 'Panic is a surprisingly good motivator. You make calls until your ear hurts. One person says yes.' },
        { label: 'Breathe. Stick to the plan.', result: 'You remind yourself that a year-one practice always looks like this from the inside. Then you get back to work.' }
      ]
    },
    {
      id: 'sister_rich',
      when: (c) => c.savings >= 15000,
      text: 'Your sister texts: "Mom says you\'re doing really well?? Are you rich now?? Can you pay for brunch??"',
      choices: [
        { label: 'Pay for brunch', eff: { savings: -90, market: 1 }, result: 'She brings two friends. One of them, it turns out, has been looking for someone to talk to about her parents. Brunch was a business expense after all. Sort of.' },
        { label: 'Explain cash flow to your sister', result: 'She stops listening after "well, technically." You split the bill.' }
      ]
    },
    {
      id: 'sustainable_day',
      when: (c) => level(c) === 'sustainable' || level(c) === 'profitable',
      text: 'You realize, halfway through your morning coffee, that this month your clients covered your costs. You did not borrow, panic or eat cereal for dinner.',
      choices: OK('You sit with that for a minute. Bernie notices you smiling and gives you a free muffin. "First time it pays for itself? I remember that. Enjoy it. Then get back to work."', { energyNext: 1 })
    },
    {
      id: 'partner_vacation',
      when: (c) => !!c.partner,
      text: 'Your partner is taking a week off. They leave a list of their clients on your desk with a sticky note: "Nothing will happen. Probably. Thank you!!"',
      choices: [
        { label: 'Cover their clients properly', eff: { day: true, sat: 0.5, prospect: { temp: 'warm', source: 'your partner\'s client\'s brother' } }, result: 'Something does happen, of course. You handle it. One of their clients is so impressed they send their brother to you.' },
        { label: 'Just answer anything urgent', eff: { sat: -0.3 }, result: 'Nothing on fire. Nothing quite looked after either. Your own clients get a little less of you this week.' }
      ]
    },
    {
      id: 'partner_lead',
      when: (c) => !!c.partner,
      text: 'There is a sticky note from your partner on your monitor: "Met someone at the gym who is more your kind of client than mine. Called them for you. They\'re expecting you."',
      choices: OK('You add them to your pipeline and leave a cookie on your partner\'s desk. That is how partnerships work.', { prospect: { temp: 'warm', source: 'your partner, via the gym' } })
    },
    {
      id: 'recruit_shadow',
      when: (c) => c.recruits && c.recruits.length > 0,
      text: 'One of your new agents is hovering by your door with a notebook. "Could I... just watch you work today? I won\'t talk. I\'ll be like a plant."',
      choices: [
        { label: 'Let them shadow you all day', eff: { day: true, skill: { communication: 1 } }, result: 'Explaining what you do, out loud, all day, makes you realize which parts you actually understand. They take fourteen pages of notes. You learned more than they did.' },
        { label: 'Give them a reading list instead', result: 'They take the list very seriously. They also look a bit sad. You make a note to schedule real mentoring soon.' }
      ]
    },
    {
      id: 'too_busy',
      when: (c) => nActive(c) >= 5,
      text: 'You realize you have not eaten lunch sitting down in eleven days. Your inbox has a number in it that you would rather not say out loud.',
      choices: [
        { label: 'Block out a quiet admin day', eff: { day: true, sat: 0.5, energyNext: 1 }, result: 'You answer every email, return every call, eat lunch at a table. By evening you feel like a person again, and your clients feel looked after.' },
        { label: 'Push through', eff: { energyNext: -1 }, result: 'You push through. You will be pushing through on the trail too, with less in the tank.' }
      ]
    },
    {
      id: 'empty_pipeline_worry',
      when: (c) => c.pipeline.length === 0 && c.days >= 3,
      text: 'You look at your pipeline. It is empty. You look again in case it was a loading issue. It was not a loading issue.',
      choices: OK('Gus, passing by, glances at your screen: "Empty pipeline. Classic. Everyone has one. The trick is not to stare at it." He is right. Time to go meet people.')
    },
    {
      id: 'pipeline_crowded',
      when: (c) => c.pipeline.length >= 5,
      text: 'Five people are waiting to work with you. You have a Post-it for each one, and the Post-its are starting to overlap.',
      choices: OK('Lovely problem to have. Less lovely if they go cold while you are busy. Maybe today is a good day to guide one of them somewhere.')
    },
    {
      id: 'kid_shadow_day',
      when: (c) => c.days >= 7,
      text: 'A neighbor asks if their teenager can shadow you for a school project titled "A Day in the Life of Someone With a Job."',
      choices: [
        { label: 'Say yes', eff: { day: true, market: 1 }, result: 'The teenager is bored by 10am and fascinated by 2pm, when you explain what happens to clients who never ask questions. Their parent stops you on the street the next day to say thank you.' },
        { label: 'Say you are slammed this week', result: 'The kid shadows the dentist instead. The dentist, again.' }
      ]
    }
  ];

  /* Apply a port-day effect to the career. Returns notes [{ text, kind }] in the
   * same shape as PP.career.tickDay, ready for the port's flash panel.
   * eff.day ticks the day here (with the usual day notes) unless opts.noTick is
   * set, in which case it only reports it (use that if the caller ticks the day itself). */
  PP.content.applyPortDay = function (c, eff, opts) {
    const notes = [];
    if (!c || !eff) return notes;
    eff = PP.val(eff, c);
    const money = (n) => (PP.career ? PP.career.money(n) : '$' + n);
    if (eff.savings) {
      c.savings += eff.savings;
      notes.push({ text: `${eff.savings > 0 ? '+' : ''}${money(eff.savings)} savings.`, kind: eff.savings > 0 ? 'good' : 'bad' });
    }
    if (eff.prospect && PP.career) {
      [].concat(eff.prospect).forEach((pr) => {
        const p = PP.career.addProspect(c, Object.assign({ temp: 'warm', source: 'something that happened at the port' }, pr));
        notes.push({ text: `${p.name} (${p.temp}) joins your pipeline.`, kind: 'good' });
      });
    }
    if (eff.sat) {
      const list = active(c);
      list.forEach((b) => { b.sat = Math.round(PP.clamp((b.sat == null ? 7 : b.sat) + eff.sat, 0, 10) * 10) / 10; });
      if (list.length) notes.push({ text: `Client satisfaction ${eff.sat > 0 ? '+' : ''}${eff.sat} for everyone in your book.`, kind: eff.sat > 0 ? 'good' : 'bad' });
    }
    if (eff.skill) {
      c.skills = c.skills || {};
      Object.entries(eff.skill).forEach(([k, n]) => {
        const before = c.skills[k] || 0;
        c.skills[k] = PP.clamp(before + n, 0, 2);
        const sk = (PP.SKILLS || []).find((x) => x.id === k);
        const label = sk ? sk.label : k;
        if (c.skills[k] !== before) notes.push({ text: `${n > 0 ? '+' : ''}${c.skills[k] - before} ${label}.`, kind: n > 0 ? 'good' : 'bad' });
        else if (n > 0) notes.push({ text: `${label} is already as good as it gets.`, kind: 'info' });
      });
    }
    if (eff.energyNext) {
      c.energyNext = (c.energyNext || 0) + eff.energyNext;
      notes.push({ text: `${eff.energyNext > 0 ? '+' : ''}${eff.energyNext} Energy at the start of your next journey.`, kind: eff.energyNext > 0 ? 'good' : 'bad' });
    }
    if (eff.market) {
      const before = c.market || 0;
      c.market = Math.max(0, before + eff.market);
      const d = c.market - before;
      if (d) notes.push({ text: `${d > 0 ? '+' : ''}${d} warm contact${Math.abs(d) === 1 ? '' : 's'} in your natural market.`, kind: d > 0 ? 'good' : 'bad' });
    }
    if (eff.day) {
      if (opts && opts.noTick) notes.push({ text: 'That took the whole day.', kind: 'info' });
      else {
        notes.push({ text: 'That took the whole day.', kind: 'info' });
        if (PP.career) { const dayNotes = PP.career.tickDay(c, false); c.inbox = []; notes.push(...dayNotes); }
      }
    }
    return notes;
  };

  /* Draw one happening that fits this career, avoiding the last dozen seen.
   * Records the pick in career.portDaysSeen. Returns null if nothing fits. */
  PP.content.pickPortDay = function (c) {
    const seen = (c.portDaysSeen = c.portDaysSeen || []);
    const fits = PP.content.portDays.filter((d) => { try { return !d.when || d.when(c); } catch (e) { return false; } });
    let pool = fits.filter((d) => !seen.includes(d.id));
    if (!pool.length) pool = fits;
    if (!pool.length) return null;
    const d = PP.pick(pool);
    seen.push(d.id);
    while (seen.length > 12) seen.shift();
    return d;
  };
})(window.PP);
