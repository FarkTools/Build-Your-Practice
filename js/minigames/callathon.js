/* Call-a-thon (prospecting). A phone on the left, your week on the right.
 * Dial through strangers. Pick the best answer to each objection before they hang up.
 * Every booked appointment flies onto your calendar as a sticky note.
 * Each session draws a random call list (new homeowners, local businesses, your old
 * high school class...) that changes who you reach and what they say. */
(function (PP) {
  const h = PP.h, fx = () => PP.fx;

  const NAMES = ['Mrs. Alvarez', 'Ted Brooks', 'Priyanka S.', 'Gary', 'The Nguyens', 'Marisa K.', 'Stan Wright', 'Ola B.', 'Frank, 71', 'Kim from accounting', 'Leo Marsh', 'Ruth G.', 'Omar F.', 'Bev Tanaka', 'Hal P.',
    'Deshawn M.', 'Carol Finch', 'The Kowalskis', 'Ines R.', 'Big Mike', 'Little Mike', 'Yusuf A.', 'Paula D.', 'Glen O.', 'Sunita V.', 'Wes Harlan', 'Nora Quinn', 'Tomás L.', 'Aunt Deb (not yours)', 'Bryce',
    'Meredith P.', 'Ken Ito', 'Lourdes', 'The Abernathys', 'Jo Kim', 'Rashida T.', 'Arnie', 'Fiona McK.', 'Victor B.', 'Hannah W.', 'Mr. Osei', 'Celeste', 'Dmitri', 'Patrice L.'];
  const BIZ_NAMES = ['Doug (Doug\'s Tires)', 'Linh (Pho Corner)', 'Sal (Sal\'s Barbers)', 'Joy (Bloom Florist)', 'Raj (Quick Copy)', 'Teresa (Pawsome Grooming)', 'Ed (Ed\'s Locksmith)', 'Mona (Yoga Loft)', 'Gus (Harbor Diner)', 'Kat (Kat\'s Cakes)'];
  const CLASS_NAMES = ['Jenna from homeroom', 'Marcus (band)', 'Tiff R.', '"Coach" Danny', 'Becca, prom committee', 'Andre (lab partner)', 'Steph L.', 'Nate, class clown', 'Kayla from chemistry', 'Tyler (still Tyler)'];

  /* Call lists: one per session. tags pull matching lines; bias steers which clients turn up. */
  const LISTS = [
    { id: 'homes', name: 'New homeowners', blurb: 'Public records of recent home sales. Expect boxes and barking.', tags: ['home', 'family'], bias: { family: 3, early: 1 }, noAnswer: 0.25, vm: 0.15 },
    { id: 'biz', name: 'Local small businesses', blurb: 'The Chamber directory. They pick up fast and talk faster.', tags: ['biz'], bias: { owner: 3 }, noAnswer: 0.18, vm: 0.2, names: BIZ_NAMES },
    { id: 'class', name: 'Your old high school class', blurb: 'The reunion committee\'s list. Some of them remember you. Some remember too much.', tags: ['classmate'], bias: { early: 1, family: 2, changes: 1 }, noAnswer: 0.2, vm: 0.15, names: CLASS_NAMES, warmer: true },
    { id: 'retire', name: 'Recent retirees from the plant', blurb: 'The plant had a big retirement wave this spring. Lots of free time.', tags: ['retire'], bias: { retiree: 3, windfall: 1 }, noAnswer: 0.12, vm: 0.2 },
    { id: 'seminar', name: 'Last year\'s seminar sign-ups', blurb: 'They came for the sandwiches. Some stayed for the slides.', tags: ['seminar'], bias: { numbers: 2, retiree: 1, caregiver: 1 }, noAnswer: 0.22, vm: 0.18, warmer: true },
    { id: 'stale', name: 'A list your manager swears is "warm"', blurb: 'Printed in 2019. Several numbers are now laundromats.', tags: ['stale'], bias: { changes: 1, caregiver: 1 }, noAnswer: 0.3, vm: 0.2 },
    { id: 'parents', name: 'Youth soccer league sponsors', blurb: 'Parents and local shops who put their names on the jerseys.', tags: ['family', 'biz'], bias: { family: 2, owner: 1, caregiver: 1 }, noAnswer: 0.2, vm: 0.18 }
  ];

  /* Lines. r = [answer, grade, reaction?]. kind: wrong / kid / later / talker / referral change the outcome.
   * tags make a line likelier on a matching list. seg nudges which client a booking becomes. */
  const OBJ = [
    { line: '"I\'m in the middle of dinner."', r: [['So sorry! When would be a better time to call?', 'good'], ['This will only take a minute!', 'bad'], ['No problem, bye!', 'ok']] },
    { line: '"Just send me some information."', r: [['Happy to. What would be most useful to you?', 'good'], ['Sure, what\'s your email?', 'ok'], ['Information won\'t help. Let\'s meet.', 'bad']] },
    { line: '"I already have someone for that."', r: [['That\'s great. How\'s it going with them?', 'good'], ['Are you sure they\'re any good?', 'bad'], ['Okay, keep me in mind!', 'ok']] },
    { line: '"Is this a sales call?"', r: [['Yes. I help people get organized with money. Is now a bad time?', 'good'], ['No, no, just a quick survey!', 'bad'], ['Kind of?', 'ok']] },
    { line: '"How did you get my number?"', r: [['From a public list. Happy to take you off it.', 'good'], ['Doesn\'t matter!', 'bad'], ['Uh... a list.', 'ok']] },
    { line: '"Actually... I\'ve been meaning to sort this out."', r: [['What made you start thinking about it?', 'good'], ['Perfect, I\'ll send you a contract!', 'bad'], ['Great, let\'s book a time.', 'ok']], warm: true },
    { line: '"I\'m not interested."', r: [['Totally fair. Mind if I ask what you\'d want if you ever were?', 'good'], ['But you haven\'t heard the offer!', 'bad'], ['Okay, have a good one.', 'ok']] },
    { line: '"We don\'t have any money to invest."', r: [['A lot of people I help feel that way. It\'s more about getting organized.', 'good'], ['Everyone has money somewhere!', 'bad'], ['Ah, okay.', 'ok']] },
    { line: '"Is this going to take long? I\'m in the school pickup line."', r: [['Not at all. Could I call back tonight instead?', 'good'], ['Just two minutes, I promise!', 'bad'], ['I\'ll be quick: want to meet?', 'ok']], seg: 'family' },
    { line: '"My brother-in-law does this. I\'m contractually obligated to use him."', r: [['Ha. Family first. Is there anything he hasn\'t gotten to yet?', 'good'], ['Is he even licensed?', 'bad'], ['Fair enough!', 'ok']] },
    { line: '"Can you just tell me what to buy?"', r: [['I\'d need to understand your situation first. Could we sit down for twenty minutes?', 'good'], ['Not on a cold call, sorry.', 'ok'], ['Sure, I\'ve got a hot tip for you.', 'bad']], seg: 'numbers' },
    { line: '"I\'m 26. Isn\'t this for old people?"', r: [['Starting early is the easy mode. Want to grab a coffee?', 'good'], ['Young people are the worst with money.', 'bad'], ['Not really.', 'ok']], seg: 'early', tags: ['classmate'] },
    { line: '"We just closed on the house. Everything\'s still in boxes."', r: [['Congratulations! Want me to call in a few weeks, once you\'ve unpacked?', 'good'], ['Great time to get organized!', 'ok'], ['New homeowners are the most at risk, you know.', 'bad']], tags: ['home'], seg: 'family' },
    { line: '"Honestly, the mortgage scared us. We don\'t know what we can afford anymore."', r: [['That\'s a really common feeling. Want to look at it together?', 'good'], ['You\'ll be fine!', 'ok'], ['Then you definitely need what I\'m selling.', 'bad']], tags: ['home'], warm: true, seg: 'family' },
    { line: '"Is this about the house? Did we do something wrong?"', r: [['Nothing wrong at all! I help new homeowners get organized. Is now okay?', 'good'], ['Not yet!', 'bad'], ['No.', 'ok']], tags: ['home'] },
    { line: '"I run a business. I don\'t have time to breathe."', r: [['I hear that a lot. Would fifteen minutes before you open work?', 'good'], ['Everyone has time for what matters.', 'bad'], ['I\'ll call back sometime.', 'ok']], tags: ['biz'], seg: 'owner' },
    { line: '"My bookkeeper handles all that."', r: [['Good bookkeepers are gold. Does anyone look at the personal side?', 'good'], ['Bookkeepers aren\'t planners.', 'bad'], ['Okay, great.', 'ok']], tags: ['biz'], seg: 'owner' },
    { line: '"You\'re the third advisor to call this week. What makes you different?"', r: [['Honestly? I listen before I suggest anything. Could I prove it in twenty minutes?', 'good'], ['I\'m local!', 'ok'], ['The other two are crooks.', 'bad']], tags: ['biz'], seg: 'owner' },
    { line: '"Hang on, I\'ve got a customer. ...Okay. Go. Fast."', r: [['I\'ll be brief: can I buy you a coffee one morning this week?', 'good'], ['So, let me tell you about my background...', 'bad'], ['Sorry, I\'ll call later.', 'ok']], tags: ['biz'], seg: 'owner' },
    { line: '"Wait... we had homeroom together! You sat behind me!"', r: [['I did! How have you been?', 'good'], ['Ha, small world. So, about your finances...', 'ok'], ['Great, then you owe me a meeting.', 'bad']], tags: ['classmate'], warm: true },
    { line: '"Didn\'t you borrow my calculator in eleventh grade?"', r: [['I may have. Can I buy you a coffee to make it right?', 'good', '"Ha! Deal."'], ['I don\'t remember that.', 'ok'], ['Prove it.', 'bad']], tags: ['classmate'], warm: true },
    { line: '"Are you calling everyone from our class? Jenna posted about it."', r: [['Guilty. It\'s been fun catching up. How are you?', 'good'], ['Maybe.', 'ok'], ['Jenna needs to mind her business.', 'bad']], tags: ['classmate'] },
    { line: '"I retired in March and I still don\'t know what day it is."', r: [['Ha. Is the money side feeling settled, or still a question mark?', 'good'], ['It\'s Tuesday.', 'ok'], ['Retirees are my favourite targets!', 'bad']], tags: ['retire'], warm: true, seg: 'retiree' },
    { line: '"I have a pension. I\'m all set."', r: [['That\'s great. Do you know what happens to it for your spouse?', 'good'], ['Glad to hear it.', 'ok'], ['Pensions fail all the time!', 'bad']], tags: ['retire'], seg: 'retiree' },
    { line: '"My wife says I need a hobby. Is this a hobby?"', r: [['Ha. It could be! Want to sit down and look at your plan together?', 'good'], ['No.', 'ok'], ['Sure, it\'s a fun little game.', 'bad']], tags: ['retire'], seg: 'retiree' },
    { line: '"I came to your seminar. The sandwiches were good."', r: [['Glad you came! What stuck with you?', 'good'], ['Thanks! Want to meet?', 'ok'], ['Great, so you\'re ready to sign?', 'bad']], tags: ['seminar'], warm: true },
    { line: '"I took notes at your seminar. I have eleven follow-up questions."', r: [['I love that. Want to go through them over coffee?', 'good'], ['Can you email them?', 'ok'], ['Eleven? Wow.', 'bad']], tags: ['seminar'], warm: true, seg: 'numbers' },
    { line: '"I\'ll only meet if you can promise the market goes up."', r: [['Nobody can honestly promise that. I can help you plan for either way.', 'good'], ['I can\'t promise that.', 'ok'], ['Oh, it definitely will!', 'bad']], seg: 'numbers' },
    { line: '"My last advisor stopped returning my calls."', r: [['That\'s frustrating. What would you want done differently?', 'good'], ['I always call back!', 'ok'], ['Their loss is my gain!', 'bad']], warm: true },
    { line: '"Let me think about it."', r: [['Of course. What would help you decide?', 'good'], ['Sure, I\'ll follow up.', 'ok'], ['This offer expires today!', 'bad']] },
    { line: '"My husband handles the money. Call back when he\'s home."', r: [['Happy to. Would it make sense to meet with you both?', 'good'], ['Okay, I\'ll try later.', 'ok'], ['But surely you have opinions too?', 'bad']] },
    { line: '"We just got married. We haven\'t even talked about money yet."', r: [['Congratulations! Lots of couples start with one simple chat.', 'good'], ['You should, soon.', 'ok'], ['Uh oh. That\'s how it starts.', 'bad']], tags: ['home', 'family'], warm: true, seg: 'family' },
    { line: '"I\'m a teacher. We don\'t make enough for this."', r: [['Some of my favourite clients are teachers. It\'s about a plan, not a number.', 'good'], ['I understand.', 'ok'], ['You should ask for a raise.', 'bad']] },
    { line: '"Do you do taxes?"', r: [['I don\'t, but I work with people who do. What\'s coming up for you?', 'good'], ['No.', 'ok'], ['Sure, I can figure it out.', 'bad']] },
    { line: '"Are you a robot?"', r: [['Real person, slightly too much coffee. Is now a bad time?', 'good', '"Ha. Okay, go on."'], ['No.', 'ok'], ['Press 1 to continue.', 'bad']] },
    { line: '"Is this about my car\'s extended warranty?"', r: [['Ha, no. I\'m a local agent. I help people get organized with money.', 'good'], ['Kind of the same idea.', 'bad'], ['No.', 'ok']] },
    { line: '"Hang on, I\'m putting you on speaker. Everyone say hi!"', r: [['Hi, everyone! Should I call back when it\'s quieter?', 'good'], ['Hi... so, I\'ll launch right in.', 'ok'], ['Can you take me off speaker? This is private.', 'bad']] },
    // Special situations
    { line: '"Who? There\'s no Gary here. This is a laundromat."', kind: 'wrong', tags: ['stale'], r: [['So sorry to bother you. Have a good day!', 'good', '"No problem. Good luck!"'], ['Oh! Well, while I have you...', 'bad'], ['Is Gary there, though?', 'ok']] },
    { line: '"This number belonged to my grandpa. He passed last year."', kind: 'wrong', tags: ['stale'], r: [['I\'m so sorry. I\'ll take it off my list. Take care.', 'good', '"Thank you for that."'], ['Oh. Are you handling his estate?', 'bad'], ['Oh, sorry. Bye.', 'ok']] },
    { line: '"Hello? Mommy\'s in the bathroom. Who is this?"', kind: 'kid', r: [['That\'s okay! I\'ll call back another time. Bye!', 'good'], ['Can you go get her? It\'s important!', 'bad'], ['Can you take a message?', 'ok', '"Okay." (There is no message.)']] },
    { line: '"Hi! I\'m seven. I have a loose tooth."', kind: 'kid', tags: ['home', 'family'], r: [['Wow! Good luck with the tooth. Is a grown-up around?', 'good', 'A tired parent takes the phone. "Sorry. Who is this?"'], ['Can I talk to your parents about money?', 'bad'], ['Okay... bye!', 'ok']] },
    { line: '"Oh, a real person! Do you have a minute? Let me tell you about my gutters..."', kind: 'talker', r: [['I\'d love to hear it over coffee. Could we set a time?', 'good'], ['Settle in and listen (costs 8 seconds)', 'ok', null, 8], ['Gutters aren\'t really my area.', 'bad']] },
    { line: '"Nobody ever calls anymore. So, what\'s the weather like where you are?"', kind: 'talker', tags: ['retire'], r: [['Sunny! I\'d enjoy chatting properly. Coffee on Thursday?', 'good'], ['Chat about the weather (costs 8 seconds)', 'ok', null, 8], ['I need to get to the point, sorry.', 'bad']] },
    { line: '"I can\'t talk long. I\'m at my mom\'s appointment."', kind: 'later', r: [['Of course. Can I try you next week?', 'good'], ['This will just take a sec!', 'bad'], ['Okay, bye.', 'ok']], seg: 'caregiver' },
    { line: '"We\'re about to have a baby. Like, any minute. Literally."', kind: 'later', tags: ['home', 'family'], r: [['Congratulations! Go! I\'ll check in in a few months.', 'good', '"Ha. Thanks!" Click.'], ['Can I quickly book you in?', 'ok'], ['Perfect time to talk about life insurance!', 'bad']], seg: 'family' },
    { line: '"Not for me. But my sister just got divorced and she\'s overwhelmed."', kind: 'referral', r: [['I\'m sorry she\'s going through that. Would she want a call, or should I leave my number with you?', 'good'], ['Feel free to pass my number along.', 'ok'], ['Great, give me her number and I\'ll call her today.', 'bad']], seg: 'changes' },
    { line: '"I just came into some money from my aunt. I feel weird about it."', r: [['That makes sense. There\'s no rush. Want to talk it through sometime?', 'good'], ['Congratulations!', 'ok'], ['Let\'s get that money working right away!', 'bad']], tags: ['retire', 'seminar'], warm: true, seg: 'windfall' }
  ];

  const SLOT_DAYS = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri'], SLOT_TIMES = ['9', '10', '11', '1', '2', '3', '4'];

  PP.minigames.callathon = {
    title: 'Call-a-thon',
    risk: 'prospecting by phone',
    prospecting: true,
    blurb: 'Dial through a list of strangers. Pick the best answer to each objection before they hang up. Fill your calendar with appointments.',
    start(root, ctx, done) {
      const prep = ctx.prep || 0;
      const ui = PP.mg.shell(root, this.title, this.risk);
      const F = fx();
      const list = PP.pick(LISTS);
      const narrow = root.getBoundingClientRect().width < 560;
      const dials = F.counter('Dials'), booked = F.counter('Booked'), streak = F.counter('Streak');
      const rep = F.meter('Reputation', 'good'); rep.set(10, 10);
      ui.hud.append(dials.el, booked.el, streak.el, rep.el);
      ui.wrap.insertBefore(h('div', { class: 'mg-scene' }, h('b', null, 'Today\'s list: ' + list.name), h('span', null, list.blurb)), ui.hud);

      // This week's open slots, different each session.
      const SLOTS = SLOT_DAYS.flatMap((d) => PP.shuffle(SLOT_TIMES).slice(0, 2).sort((a, b) => (+a < 8 ? +a + 12 : +a) - (+b < 8 ? +b + 12 : +b)).map((t) => d + ' ' + t));
      const face = h('div', { class: 'ct-face' });
      const who = h('div', { class: 'ct-who' });
      const state = h('div', { class: 'ct-state' });
      const bubble = h('div', { class: 'ct-bubble', hidden: true });
      const phone = h('div', { class: 'ct-phone' }, h('div', { class: 'ct-handset', 'aria-hidden': 'true', html: '<svg viewBox="0 0 26 26"><path d="M7,4 l4,0 l2,5 l-3,2 a12,12 0 0 0 5,5 l2,-3 l5,2 l0,4 a3,3 0 0 1 -3,3 a17,17 0 0 1 -15,-15 a3,3 0 0 1 3,-3z" fill="currentColor" stroke="#4a2e14" stroke-width="1.5"/></svg>' }), face, who, state, bubble);
      const cal = h('div', { class: 'ct-cal' }, h('div', { class: 'ct-cal-head' }, 'Your week'), h('div', { class: 'ct-slots' }, SLOTS.map((s) => h('div', { class: 'ct-slot' }, h('span', null, s)))));
      const answers = h('div', { class: 'ct-answers' });
      // On a phone the answers sit right under the caller; the week strip goes last.
      const stage = narrow ? h('div', { class: 'mg-stage-area ct-stage ct-narrow' }, phone) : h('div', { class: 'mg-stage-area ct-stage' }, phone, cal);
      if (narrow) ui.body.append(stage, answers, cal); else ui.body.append(stage, answers);

      const stats = { dialed: 0, picked: 0, appts: [], bad: 0, vm: 0, streak: 0, wrong: 0, kind: 0 };
      let finished = false, t1 = null, t2 = null, respondT = null, current = null, repV = 10;
      const timer = PP.mg.timer(ui.bar, 45 + prep * 6, () => finish());
      const names = PP.shuffle(list.names ? list.names.concat(PP.shuffle(NAMES).slice(0, 10)) : NAMES);
      // Draw lines weighted by today's list, without repeats until the deck runs out.
      const weightOf = (o) => (o.tags && o.tags.some((t) => list.tags.includes(t)) ? 3 : !o.tags ? 1 : 0.25);
      let deck = [];
      const refill = () => { deck = OBJ.map((o) => ({ o, k: Math.random() ** (1 / weightOf(o)) })).sort((a, b) => b.k - a.k).map((x) => x.o); };
      const draw = () => { if (!deck.length) refill(); return deck.shift(); };
      const leadBias = (o) => { const b = Object.assign({}, list.bias); if (o && o.seg) b[o.seg] = (b[o.seg] || 0) + 2; return b; };
      const onKey = (e) => { const n = parseInt(e.key, 10); const b = answers.querySelectorAll('button')[n - 1]; if (b) { e.preventDefault(); b.click(); } };
      document.addEventListener('keydown', onKey);

      function setFace(mood, extra) { face.innerHTML = PP.art.face({ mood, hue: stats.dialed * 47 + 11, surprised: extra === 'surprised' }); }
      function dial() {
        if (finished) return;
        answers.innerHTML = '';
        bubble.hidden = true;
        const name = names[stats.dialed % names.length];
        stats.dialed++; dials.set(stats.dialed);
        who.textContent = name;
        face.innerHTML = '<div class="ct-dialing">…</div>';
        state.textContent = 'Ringing…';
        phone.classList.add('ringing');
        F.sfx('ring');
        t1 = setTimeout(() => {
          phone.classList.remove('ringing');
          if (finished) return;
          const r = Math.random();
          if (r < list.noAnswer) { state.textContent = PP.pick(['No answer.', 'Rings out.', 'Straight to a full mailbox.', 'Busy signal. Somehow.']); face.innerHTML = '<div class="ct-dialing">✕</div>'; F.popOn(stage, phone, 'No answer', 'meh'); t2 = setTimeout(dial, 650); }
          else if (r < list.noAnswer + list.vm) voicemail(name);
          else pickup(name);
        }, 700 + Math.random() * 600);
      }
      function voicemail(name) {
        stats.vm++;
        face.innerHTML = '<div class="ct-dialing vm">VM</div>';
        state.textContent = PP.pick([`"You've reached ${name}. Leave a message…" BEEP`, `"Hi, it's ${name}! Or it's my voicemail. Ha! Gotcha." BEEP`, `"The mailbox you are trying to reach..." BEEP`, `"This is ${name}. I don't check this. Text me." BEEP`]);
        answers.append(
          h('button', { class: 'ct-answer', onclick: () => { if (PP.chance(0.25)) book({ temp: 'cold', source: 'a call-back from your voicemail', bias: list.bias }, name + ' (call-back)'); else F.popOn(stage, phone, 'Message left', 'meh'); next(); } }, h('b', null, '1'), ' Leave a short, friendly message'),
          h('button', { class: 'ct-answer', onclick: () => { F.sfx('click'); next(); } }, h('b', null, '2'), ' Hang up and keep dialing'));
      }
      function pickup(name) {
        stats.picked++;
        current = draw();
        setFace(current.kind === 'kid' ? 1 : 0, 'surprised');
        state.textContent = current.kind === 'kid' ? 'Someone small picked up.' : 'Picked up!';
        bubble.hidden = false;
        bubble.textContent = current.line;
        F.sfx('ding');
        PP.shuffle(current.r).forEach((ans, i) => {
          const [text, q, react, cost] = ans;
          answers.appendChild(h('button', { class: 'ct-answer', onclick: () => answer(ans, name) }, h('b', null, String(i + 1)), cost ? ' ' + text : ' "' + text + '"'));
        });
        respondT = setTimeout(() => { setFace(-1); F.popOn(stage, phone, 'Too slow. Click.', 'bad'); F.sfx('bad'); stats.streak = 0; streak.set(0); next(); }, (5.5 + prep + (current.line.length > 80 ? 1 : 0)) * 1000);
      }
      function say(text) { if (text) { bubble.textContent = text; bubble.classList.add('reply'); setTimeout(() => bubble.classList.remove('reply'), 600); } }
      function answer(ans, name) {
        const [, q, react, cost] = ans;
        const o = current;
        clearTimeout(respondT);
        answers.querySelectorAll('button').forEach((b) => (b.disabled = true));
        if (q === 'bad') { stats.bad++; repV = Math.max(0, repV - 2); rep.set(repV, 10); }
        if (cost) { timer.sub(cost); F.popOn(stage, phone, `−${cost}s`, 'meh'); }
        let ok = false, temp = o.warm || list.warmer ? 'warm' : 'cold', src = 'your call-a-thon (' + list.name.toLowerCase() + ')', who2 = name;
        if (o.kind === 'wrong') {
          stats.wrong++;
          if (q === 'good') { stats.kind++; repV = Math.min(10, repV + 1); rep.set(repV, 10); }
        } else if (o.kind === 'kid') {
          if (q === 'good' && PP.chance(0.3)) { ok = true; temp = 'cold'; src = 'a parent who called you back'; who2 = name + '\'s parent'; }
        } else if (o.kind === 'later') {
          if (q === 'good' && PP.chance(0.45)) { ok = true; temp = 'cold'; src = 'a "call me next month" on your call-a-thon'; }
        } else if (o.kind === 'talker') {
          ok = q === 'good' ? PP.chance(0.7) : cost ? PP.chance(0.65) : false; temp = cost ? 'warm' : temp;
        } else if (o.kind === 'referral') {
          if (q === 'good' ? PP.chance(0.8) : q === 'ok' ? PP.chance(0.3) : false) { ok = true; temp = q === 'good' ? 'warm' : 'cold'; src = `a referral from ${name} on your call-a-thon`; who2 = name + '\'s sister'; }
        } else {
          ok = q === 'good' ? PP.chance(o.warm ? 0.85 : 0.75) : q === 'ok' ? PP.chance(o.warm ? 0.35 : 0.2) : false;
        }
        if (ok) { setFace(2); say(react || PP.pick(['"Okay, sure. Let\'s do it."', '"You know what? Yes."', '"Fine. But you\'re bringing coffee."', '"Tuesday works."', '"Honestly? That would help."'])); book({ temp, source: src, bias: leadBias(o) }, who2); stats.streak++; }
        else if (q === 'bad') { setFace(-2); say(react || PP.pick(['"Wow. Okay."', '"Don\'t call again."', '"...Click."', '"Seriously?"'])); F.shake(phone); F.popOn(stage, phone, 'CLICK!', 'bad'); F.sfx('bad'); stats.streak = 0; }
        else {
          setFace(q === 'good' ? 1 : 0);
          say(react || (q === 'good' ? PP.pick(['"Thanks for being decent about it."', '"Not now, but thanks."', '"Maybe another time."']) : PP.pick(['"Okay. Bye."', '"Mm-hm."', '"Sure..."'])));
          F.popOn(stage, phone, o.kind === 'wrong' && q === 'good' ? 'Kind. Next!' : q === 'good' ? 'Not now' : 'Meh', 'meh'); F.sfx('meh'); if (o.kind !== 'wrong') stats.streak = 0;
        }
        streak.set(stats.streak);
        if (stats.streak >= 3) F.popOn(stage, narrow ? phone : cal, `${stats.streak} in a row!`, 'great');
        next(1100);
      }
      function book(p, name) {
        stats.appts.push(p);
        booked.set(stats.appts.length);
        const slot = cal.querySelectorAll('.ct-slot')[(stats.appts.length - 1) % SLOTS.length];
        const note = h('div', { class: 'ct-note' }, name);
        F.popOn(stage, phone, 'Booked!', 'good');
        F.sfx('coin');
        const flyer = h('div', { class: 'ct-note flying' }, name);
        phone.appendChild(flyer);
        F.fly(flyer, slot, stage, () => { slot.appendChild(note); F.burstOn(stage, slot, 'good', 10); });
        flyer.remove();
      }
      function next(delay) { clearTimeout(t2); t2 = setTimeout(dial, delay || 600); }

      function finish() {
        if (finished) return;
        finished = true;
        [t1, t2, respondT].forEach(clearTimeout); timer.stop(); document.removeEventListener('keydown', onKey);
        const n = stats.appts.length;
        const lines = [
          { q: n >= 3 ? 'good' : n ? 'ok' : 'bad', text: `Appointments booked from "${list.name}": ${n}` },
          { q: stats.bad ? 'bad' : 'good', text: stats.bad ? `Pushy or dishonest answers: ${stats.bad}. People remember those.` : 'You stayed honest and polite the whole time.' },
          { q: 'ok', text: `Voicemails: ${stats.vm}` }
        ];
        if (stats.wrong) lines.push({ q: stats.kind === stats.wrong ? 'good' : 'ok', text: `Wrong numbers: ${stats.wrong}. ${stats.kind === stats.wrong ? 'You were gracious every time.' : 'A little grace goes a long way.'}` });
        PP.mg.summary(root, PP.minigames.callathon.title, {
          score: n, max: Math.max(n, 6), eff: { energy: -2 }, prospects: stats.appts, passed: ctx.pass != null ? n >= ctx.pass : null,
          headline: `${stats.dialed} dials, ${stats.picked} people picked up, ${n} appointment${n === 1 ? '' : 's'} on your calendar.`,
          lines
        }, done);
      }
      dial();
      return { stop() { finished = true; [t1, t2, respondT].forEach(clearTimeout); timer.stop(); document.removeEventListener('keydown', onKey); } };
    }
  };
})(window.PP);
