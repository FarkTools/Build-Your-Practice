/* Life changes: why an existing client calls you again, starting a follow-up journey.
 *
 *  { id, title,                      short, e.g. 'A baby on the way'
 *    segs: ['family', ...],          optional: which client segments this can happen to (omit = anyone)
 *    call: '...',                    the message they leave you (use {c} for their name)
 *    need: '...',                    the hidden detail that decides the right destination (a fact label)
 *    line: '"..."',                  a subtle line in conversation that hints at the need
 *    reveal: '"..."',                what they say when you ask about worries with enough Curiosity
 *    guarded: '...',                 the guarded version when you don't have it yet
 *    goal: '"..."',                  their answer to "what would make this go well?"
 *    right: 'destinationId',         the destination that fits once you know the need
 *    ok: ['destinationId', ...],     acceptable alternatives
 *    help: '...'                     "how else can you help": a line shown at the end of a good lap
 *  }
 *  Destinations: see PP.content.destinations in world.js.
 *
 *  The title says what happened. The need says what it actually means for this
 *  person, and that is what decides the destination. Several titles look like
 *  they point somewhere obvious and don't.
 */
(function (PP) {
  PP.content.lifeChanges = [
    /* ---------------- Family ---------------- */
    { id: 'lc_baby', title: 'A baby on the way', segs: ['family', 'early', 'changes'],
      call: '{c} calls, half laughing, half panicking: "So... we\'re having a baby. Does anything need to change?"',
      need: 'Has some coverage through work, has never looked at how much, and is quietly scared it isn\'t enough',
      line: '"Work gives us something if, you know. Something happens. I think? There was a packet."',
      reveal: '"Honestly? I keep thinking, what happens to them if I\'m not here? Work has something, but I\'ve never read it. I don\'t even know what I\'d be adding to."',
      guarded: '"It\'s all good! Just... a lot." {c} laughs a little too quickly.',
      goal: '"Knowing the baby\'s okay. No matter what. Without buying three of everything."',
      right: 'gap_check', ok: ['joint_plan', 'simple_start'],
      help: '{c} mentions their sister is expecting too. "Can I give her your number? I\'ll tell her you don\'t make it weird."' },

    { id: 'lc_married', title: 'Getting married', segs: ['early', 'numbers', 'changes', 'windfall'],
      call: '{c} sends a photo of a ring and then, a minute later: "Okay, practical question. What do we do about... all of it?"',
      need: 'Assumes they\'ll keep their money separate; their partner assumes the opposite, and neither has said it out loud',
      line: '"We haven\'t really talked numbers. We figured that part would just... sort itself out."',
      reveal: '"Okay, here\'s the thing. I always pictured keeping things separate. Last week they said \'our account\' and I nodded. I don\'t know what I agreed to."',
      guarded: '"We\'re totally on the same page." {c} glances at their phone like it might disagree.',
      goal: '"Starting this without a fight we could have had now."',
      right: 'joint_plan', ok: ['gap_check', 'not_now'],
      help: 'At the wedding, {c}\'s best friend corners you by the cake: "So you\'re the one who got them to actually talk about money."' },

    { id: 'lc_divorce', title: 'Going through a divorce', segs: ['family', 'numbers', 'changes', 'caregiver'],
      call: '{c} writes: "We\'re separating. It\'s amicable. Mostly. My lawyer said to talk to you, but also not to change anything? I\'m confused."',
      need: 'The lawyer needs the accounts properly valued by someone qualified before anything is divided',
      line: '"The lawyer keeps asking what everything is \'worth.\' I keep saying \'I don\'t know, a lot of stress?\'"',
      reveal: '"The lawyer needs a proper valuation of everything before they can split it. I thought that was you. Is that you? I don\'t think that\'s you."',
      guarded: '"It\'s fine. It\'s just paperwork." {c} has clearly not slept.',
      goal: '"Coming out of this with something fair, and without hating anyone."',
      right: 'referral', ok: ['steady_ground', 'not_now'],
      help: 'A few months later, {c} sends a short note: "Thank you for not making me decide anything while I was a mess."' },

    { id: 'lc_parent_care', title: 'A parent needs care', segs: ['caregiver', 'family', 'numbers', 'owner', 'changes'],
      call: '{c} calls from a hospital parking lot: "Mom fell. She\'s okay, but she can\'t live alone anymore. I think it\'s going to be me."',
      need: 'Is about to cut back to part-time to do the caregiving, and hasn\'t worked out what that does to the month',
      line: '"I talked to my boss about going part-time. Just for a while. It\'ll be fine. Probably."',
      reveal: '"I\'m dropping to three days a week. I said yes before I did any math. I\'m scared to do the math."',
      guarded: '"We\'ll manage. We always manage." {c} is rubbing their temples.',
      goal: '"Being there for her without everything else falling apart."',
      right: 'buffer_first', ok: ['joint_plan', 'steady_ground'],
      help: '{c} asks if you would talk to their brother too. "He thinks he can\'t help. I think he just doesn\'t know how."' },

    { id: 'lc_parent_passed', title: 'Lost a parent',
      call: 'A short message from {c}: "Dad passed last week. I\'m the executor, apparently. People keep handing me forms."',
      need: 'Grieving, newly named executor, and terrified of signing the wrong thing; nothing needs deciding for months',
      line: '"Everyone keeps saying \'no rush,\' and then handing me something that says URGENT on it."',
      reveal: '"I don\'t want to decide anything. I just want someone to tell me what can wait. I think almost all of it can wait?"',
      guarded: '"I\'m handling it." {c} has three folders and none of them are labeled.',
      goal: '"Not making a big decision while I\'m like this."',
      right: 'not_now', ok: ['referral', 'steady_ground'],
      help: 'Months later, {c} calls when they\'re ready. "You said the door would be open. Is it?" It is.' },

    { id: 'lc_inheritance', title: 'An inheritance',
      call: '{c} calls, sounding strange: "My aunt left me her house. I didn\'t even know she liked me that much."',
      need: 'The inheritance is a house that costs money to keep, and they can\'t yet decide whether to sell it or keep it',
      line: '"It needs a new roof. And the garden is basically a forest. But she loved that garden."',
      reveal: '"Everyone keeps saying \'congratulations, sell it.\' But it\'s her house. And it costs money every month just to stand there. I don\'t know yet. Is it okay not to know yet?"',
      guarded: '"It\'s a good problem to have!" {c} says, as if reading from a card.',
      goal: '"Not being rushed into deciding what her house is for."',
      right: 'steady_ground', ok: ['not_now', 'gap_check'],
      help: '{c} sends you a photo of the garden, now slightly less of a forest. "Still deciding. Thanks for letting me."' },

    { id: 'lc_college', title: 'A kid heading to college', segs: ['family', 'caregiver', 'numbers', 'changes'],
      call: '{c} sends a voice memo: "The acceptance letter came! We\'re so proud! Also, how does anyone pay for this?"',
      need: 'A grandparent opened an education fund years ago, and nobody has looked at what\'s in it',
      line: '"Grandpa always said he\'d \'taken care of something\' for the kids. We never asked what."',
      reveal: '"There\'s an account. Grandpa set it up when they were born. I have a statement from... a while ago. I\'ve been too nervous to open the new ones."',
      guarded: '"We\'ll figure it out. Loans, I guess? Everyone has loans." {c} sounds unsure.',
      goal: '"Getting them through school without wrecking our own future."',
      right: 'gap_check', ok: ['buffer_first', 'joint_plan'],
      help: '{c}\'s kid, home for the holidays, asks if they can "do the money talk" with you too. A future client, maybe.' },

    { id: 'lc_boomerang', title: 'A grown kid moved back home', segs: ['retiree', 'caregiver', 'family', 'changes'],
      call: '{c} calls: "So our son is back. With a futon. And, it turns out, quite a lot of debt."',
      need: 'Is thinking of quietly paying off their kid\'s debt out of their own retirement savings',
      line: '"I could just make it go away for him. It\'s only money. It\'s only our money."',
      reveal: '"I\'ve been looking at what I\'d have to take out of our savings to clear his debt. I haven\'t told anyone. He\'d never ask. That\'s why I want to."',
      guarded: '"He\'ll be on his feet in no time." {c} says it like a hope, not a fact.',
      goal: '"Helping him without sinking us."',
      right: 'referral', ok: ['not_now', 'simple_start'],
      help: 'Six weeks later, {c}\'s son emails you himself: "Mom said you\'re the one who said I should talk to someone. I did. Thanks."' },

    { id: 'lc_empty_nest', title: 'The kids have all moved out', segs: ['family', 'retiree', 'caregiver', 'numbers'],
      call: '{c} calls on a very quiet Tuesday: "The house is silent. We keep cooking for five. What happens now?"',
      need: 'One of them wants to sell up and travel, the other wants to stay put, and they haven\'t said it to each other',
      line: '"I\'ve been looking at little places by the sea. Just looking! They\'d never move. I think."',
      reveal: '"Can I be honest? I want to sell the house and see the world. I\'m almost sure they want to stay here and wait for grandkids. We\'ve both been very polite about it."',
      guarded: '"We\'re just enjoying the peace and quiet!" A pause. "So much peace. So much quiet."',
      goal: '"A next chapter we both actually want."',
      right: 'joint_plan', ok: ['not_now', 'gap_check'],
      help: '{c} sends a postcard. It is from a seaside town. On the back: "Compromise. Two weeks a year. Thank you."' },

    { id: 'lc_spouse_work', title: 'A spouse going back to work', segs: ['family', 'retiree', 'numbers'],
      call: '{c} leaves an excited message: "Big news! My other half is going back to work after eight years. Two incomes! What do we do with two incomes?"',
      need: 'With two incomes again, the big plan they shelved years ago is finally affordable, and they both want it',
      line: '"We had this whole plan, years ago, before the kids. We put it in a drawer. I still know which drawer."',
      reveal: '"Okay, honestly? We want the whole thing. The one we couldn\'t afford back then. We talked about it last night and we were both grinning like idiots."',
      guarded: '"Probably just pay some things off, be sensible." {c} doesn\'t sound like they mean it.',
      goal: '"Finally doing it properly. The whole thing."',
      right: 'grand_plan', ok: ['gap_check', 'joint_plan'],
      help: '{c}\'s spouse asks, a little shyly, if you could also look at the benefits from the new job. "I\'ve never had to choose before."' },

    { id: 'lc_grandchild', title: 'Raising a grandchild', segs: ['retiree', 'changes', 'caregiver'],
      call: '{c} calls, sounding tired and fierce: "My granddaughter is living with me now. It\'s complicated. It might be for a long time."',
      need: 'The grandchild\'s parent may come back at any time, so anything they set up has to work with the parent, not around them',
      line: '"Her mom is getting help. She might come back. I want her to come back. I just don\'t know when."',
      reveal: '"Whatever I do, it can\'t shut her mom out. If she gets well, she\'s her mother. Everything has to have room for that."',
      guarded: '"I\'m just happy to have her." {c} means it, and is also clearly exhausted.',
      goal: '"Keeping her safe, and keeping the door open for her mom."',
      right: 'joint_plan', ok: ['referral', 'steady_ground'],
      help: '{c} mentions a support group for grandparents raising grandkids. "Half of them have nobody to ask about money. Could I mention you?"' },

    /* ---------------- Work and money ---------------- */
    { id: 'lc_layoff', title: 'Lost their job', segs: ['family', 'numbers', 'early', 'caregiver', 'changes', 'windfall', 'retiree'],
      call: '{c} leaves a short voicemail: "I got laid off on Friday. Can we talk? I don\'t know what to touch and what not to touch."',
      need: 'Has a severance deadline in three weeks they haven\'t mentioned',
      line: '"HR gave me a folder. I haven\'t opened it. There\'s a date on the front."',
      reveal: '"Okay. The folder. There\'s a severance offer and I have to decide by the 30th. I\'ve been avoiding it."',
      guarded: '"I\'m fine. I\'ve got savings. Mostly." You sense there is a deadline somewhere.',
      goal: '"Not making it worse while I figure out what\'s next."',
      right: 'steady_ground', ok: ['bridge_plan', 'not_now'],
      help: 'Later, {c} sends a former coworker your way: "She got laid off too. You were calm when I wasn\'t."' },

    { id: 'lc_newjob', title: 'Started a new job', segs: ['early', 'family', 'numbers', 'changes', 'caregiver'],
      call: '{c} texts a string of exclamation marks, then: "Got the job!! Starting Monday. Should I be doing something?"',
      need: 'The new job is a two-year contract, and they are treating it as permanent',
      line: '"It\'s technically a contract. But everyone says they always renew. Basically always."',
      reveal: '"Fine. It\'s two years. They \'usually\' extend it. I\'ve already started looking at bigger apartments, which is maybe insane."',
      guarded: '"It\'s a great company. Very stable." {c} says "very" a bit too firmly.',
      goal: '"Making the most of it without betting everything on it."',
      right: 'bridge_plan', ok: ['steady_ground', 'simple_start'],
      help: '{c} forwards your number to a friend at the new job: "She\'s on the same contract and hasn\'t thought about it at all."' },

    { id: 'lc_raise', title: 'A big raise', segs: ['early', 'numbers', 'family', 'caregiver'],
      call: '{c} calls, giddy: "I got the raise! The big one! I want to be smart about it before I am, you know, not smart about it."',
      need: 'Knows from experience that extra money vanishes within weeks unless something automatic catches it first',
      line: '"Last time I got a raise, I don\'t know where it went. Takeout, I think. A lot of takeout."',
      reveal: '"I know myself. If it lands in my account, it\'s gone. I need it caught before I ever see it. One thing. Automatic. Please."',
      guarded: '"I\'ve got a few ideas!" {c} lists four, including a boat.',
      goal: '"Six months from now, actually having something to show for it."',
      right: 'simple_start', ok: ['gap_check', 'buffer_first'],
      help: '{c} brings it up with a coworker who also got a raise. "They asked what I did. I said \'I called someone first.\'"' },

    { id: 'lc_windfall', title: 'An unexpected windfall',
      call: '{c} calls, whispering for some reason: "So. A scratch card. Not a giant one. But not nothing. Also my whole family already knows."',
      need: 'Every relative has a plan for the money, and they want permission to keep a cushion before anyone else gets any',
      line: '"My cousin has already sent me a link to a jet ski. I didn\'t ask for a jet ski."',
      reveal: '"I\'ve never had a cushion. Not once. I want to keep this, all of it, for a rainy day, and I feel horribly selfish saying that."',
      guarded: '"I\'ll probably share it around. That\'s what you do, right?" {c} looks unhappy about it.',
      goal: '"For once, not being one bad month away from trouble."',
      right: 'buffer_first', ok: ['simple_start', 'not_now'],
      help: '{c} laughs: "My cousin wants your number now. He says it\'s about the jet ski. It is not about the jet ski."' },

    { id: 'lc_health', title: 'A health scare',
      call: '{c} calls from home: "I\'m okay. Really. But they kept me in for three days, and I\'m off work for a while. It made me think."',
      need: 'Will be on reduced pay for a few months while they recover, and hasn\'t told anyone how tight that will be',
      line: '"The doctor said six to eight weeks off. HR said something about \'partial pay.\' I didn\'t ask what partial meant."',
      reveal: '"Partial pay is about half. For three months, maybe more. I haven\'t told my family because they\'ll worry, and I\'m the one who\'s meant to be worrying."',
      guarded: '"Just a wake-up call, that\'s all." {c} shifts in their chair, carefully.',
      goal: '"Getting better without worrying about bills the whole time."',
      right: 'buffer_first', ok: ['steady_ground', 'simple_start'],
      help: '{c}\'s friend from the ward asks for your card. "She\'s in the same boat and nobody\'s asked her the questions you asked me."' },

    { id: 'lc_retire_early', title: 'Retiring early', segs: ['retiree', 'numbers', 'owner'],
      call: '{c} calls, unusually breezy: "I\'m doing it! Retiring early. They offered a package and I said yes before I could chicken out."',
      need: 'Their health coverage ends the day they leave, years before anything else starts',
      line: '"The package is generous. Benefits stop when I go, but that\'s normal. Isn\'t it?"',
      reveal: '"I read the small print last night. Coverage ends my last day. Everything else doesn\'t start for years. I had a little moment in the kitchen."',
      guarded: '"It\'s all worked out!" {c} says, as if worked out were a single afternoon.',
      goal: '"Enjoying it, instead of spending the first year terrified."',
      right: 'bridge_plan', ok: ['steady_ground', 'gap_check'],
      help: '{c} sends a photo from a fishing trip with a coworker who also took the package. "He has questions. Can I give him your number?"' },

    { id: 'lc_house', title: 'Buying a home', segs: ['early', 'family', 'numbers', 'changes'],
      call: '{c} sends a photo of a front door with a SOLD sticker: "We got it! Now the paperwork is eating us alive."',
      need: 'Between the mortgage, the move and the repairs, they have no attention left; they need one small thing that runs on its own',
      line: '"Every night it\'s another form, another box, another thing broken in the bathroom. I can\'t think past Friday."',
      reveal: '"I know I should do something big. I just can\'t right now. If you gave me one thing, one, that I didn\'t have to think about, I\'d cry with gratitude."',
      guarded: '"We\'re thrilled. Just busy." {c} has paint in their hair.',
      goal: '"One less thing to think about. Seriously, just one."',
      right: 'simple_start', ok: ['buffer_first', 'bridge_plan'],
      help: '{c}\'s new neighbor comes over to say hello and, within minutes, asks who "helped them with all that." {c} points at you.' },

    { id: 'lc_moving', title: 'Moving away',
      call: '{c} calls: "We\'re moving. Across the country. Maybe. Probably. Do I have to find a new you?"',
      need: 'Isn\'t sure the move will stick and wants to see if it works before changing anything',
      line: '"We\'re renting at first. Just to see. If we hate it we can always come back. Can\'t we?"',
      reveal: '"Truthfully? It might not last. It\'s a trial. I don\'t want to rebuild everything and then move back in a year."',
      guarded: '"It\'s exciting! Fresh start!" {c} has been saying "fresh start" a lot.',
      goal: '"Trying it out without burning anything down behind us."',
      right: 'not_now', ok: ['steady_ground', 'bridge_plan'],
      help: '{c} calls from the new place: "We\'re staying. And I told our new neighbors you work remotely. You do work remotely, right?"' },

    /* ---------------- Business owners ---------------- */
    { id: 'lc_start_biz', title: 'Starting a business', segs: ['early', 'numbers', 'changes', 'windfall'],
      call: '{c} calls, buzzing: "I quit! I\'m starting my own thing with my old roommate. We have a logo already. It\'s very good."',
      need: 'Their co-founder is their old college roommate, and nothing about who owns what has been agreed in writing',
      line: '"We don\'t need contracts. We lived together for four years. We know each other."',
      reveal: '"Okay, we never wrote anything down. Who owns what, what happens if one of us wants out... we said we\'d \'figure it out as we go.\' That sounded better out loud."',
      guarded: '"It\'s going to be great. We\'re on the same wavelength." {c} doesn\'t mention any details.',
      goal: '"Still being friends with them in five years. And still having a business."',
      right: 'partner_plan', ok: ['buffer_first', 'referral'],
      help: '{c}\'s co-founder shakes your hand: "I hated the paperwork. I\'m glad we did it." Then asks about their own situation.' },

    { id: 'lc_sell_biz', title: 'Selling the business', segs: ['owner'],
      call: '{c} calls: "Someone wants to buy the shop. A real offer. I think I\'m going to say yes?"',
      need: 'The buyer wants them to stay on and train a successor for two years, so the "retirement" is really a slow handover',
      line: '"They want me to stay on for a bit. To help with the transition. A bit is two years, technically."',
      reveal: '"It\'s not really selling and walking away. It\'s two years of teaching someone else to run my shop. I don\'t know who that person is yet, and that\'s what keeps me up."',
      guarded: '"Time to put my feet up!" {c} says, and immediately starts reorganizing your desk.',
      goal: '"Handing it over to someone who\'ll look after it."',
      right: 'partner_plan', ok: ['bridge_plan', 'steady_ground'],
      help: 'A local baker who knows {c} rings you: "I hear you helped with the handover. I might need one of those in a few years."' },

    { id: 'lc_partner_leaves', title: 'A business partner is leaving', segs: ['owner'],
      call: '{c} calls, flat: "My partner wants out. We\'re talking about a buyout. Lawyers are involved. I need to know what this means."',
      need: 'The buyout terms will take months to negotiate, and nothing should move until they\'re signed',
      line: '"The lawyers say it\'ll take \'a while.\' Every time I ask how long, they bill me for the question."',
      reveal: '"Nothing\'s agreed. Could be three months, could be eight. If I rearrange everything now and the terms change, I\'ve made a mess of it twice."',
      guarded: '"I\'ve got it under control." {c} has written the same sum on four sticky notes.',
      goal: '"Getting through the next few months without making it worse."',
      right: 'steady_ground', ok: ['partner_plan', 'referral'],
      help: '{c} mentions another shop owner on the same street going through something similar. "I told her to call you before her lawyer does."' }
  ];
})(window.PP);
