/* Call-a-thon (prospecting). A phone on the left, your week on the right.
 * Dial through strangers. Pick the best answer to each objection before they hang up.
 * Every booked appointment flies onto your calendar as a sticky note. */
(function (PP) {
  const h = PP.h, fx = () => PP.fx;
  const NAMES = ['Mrs. Alvarez', 'Ted Brooks', 'Priyanka S.', 'Gary', 'The Nguyens', 'Doug (Doug\'s Tires)', 'Marisa K.', 'Stan Wright', 'Ola B.', 'Frank, 71', 'Kim from accounting', 'Leo Marsh', 'Ruth G.', 'Omar F.', 'Bev Tanaka', 'Hal P.'];
  const OBJ = [
    { line: '"I\'m in the middle of dinner."', r: [['So sorry! When would be a better time to call?', 'good'], ['This will only take a minute!', 'bad'], ['No problem, bye!', 'ok']] },
    { line: '"Just send me some information."', r: [['Happy to. What would be most useful to you?', 'good'], ['Sure, what\'s your email?', 'ok'], ['Information won\'t help. Let\'s meet.', 'bad']] },
    { line: '"I already have someone for that."', r: [['That\'s great. How\'s it going with them?', 'good'], ['Are you sure they\'re any good?', 'bad'], ['Okay, keep me in mind!', 'ok']] },
    { line: '"Is this a sales call?"', r: [['Yes. I help people get organized with money. Is now a bad time?', 'good'], ['No, no, just a quick survey!', 'bad'], ['Kind of?', 'ok']] },
    { line: '"How did you get my number?"', r: [['From a public list. Happy to take you off it.', 'good'], ['Doesn\'t matter!', 'bad'], ['Uh... a list.', 'ok']] },
    { line: '"Actually... I\'ve been meaning to sort this out."', r: [['What made you start thinking about it?', 'good'], ['Perfect, I\'ll send you a contract!', 'bad'], ['Great, let\'s book a time.', 'ok']], warm: true },
    { line: '"I\'m not interested."', r: [['Totally fair. Mind if I ask what you\'d want if you ever were?', 'good'], ['But you haven\'t heard the offer!', 'bad'], ['Okay, have a good one.', 'ok']] },
    { line: '"We don\'t have any money to invest."', r: [['A lot of people I help feel that way. It\'s more about getting organized.', 'good'], ['Everyone has money somewhere!', 'bad'], ['Ah, okay.', 'ok']] }
  ];
  const SLOTS = ['Mon 9', 'Mon 2', 'Tue 10', 'Tue 3', 'Wed 9', 'Wed 1', 'Thu 11', 'Thu 4', 'Fri 10', 'Fri 2'];

  PP.minigames.callathon = {
    title: 'Call-a-thon',
    risk: 'prospecting by phone',
    prospecting: true,
    blurb: 'Dial through a list of strangers. Pick the best answer to each objection before they hang up. Fill your calendar with appointments.',
    start(root, ctx, done) {
      const prep = ctx.prep || 0;
      const ui = PP.mg.shell(root, this.title, this.risk);
      const F = fx();
      const dials = F.counter('Dials'), booked = F.counter('Booked'), streak = F.counter('Streak');
      const rep = F.meter('Reputation', 'good'); rep.set(10, 10);
      ui.hud.append(dials.el, booked.el, streak.el, rep.el);

      const face = h('div', { class: 'ct-face' });
      const who = h('div', { class: 'ct-who' });
      const state = h('div', { class: 'ct-state' });
      const bubble = h('div', { class: 'ct-bubble', hidden: true });
      const phone = h('div', { class: 'ct-phone' }, h('div', { class: 'ct-handset', 'aria-hidden': 'true', html: '<svg viewBox="0 0 26 26"><path d="M7,4 l4,0 l2,5 l-3,2 a12,12 0 0 0 5,5 l2,-3 l5,2 l0,4 a3,3 0 0 1 -3,3 a17,17 0 0 1 -15,-15 a3,3 0 0 1 3,-3z" fill="currentColor" stroke="#4a2e14" stroke-width="1.5"/></svg>' }), face, who, state, bubble);
      const cal = h('div', { class: 'ct-cal' }, h('div', { class: 'ct-cal-head' }, 'Your week'), h('div', { class: 'ct-slots' }, SLOTS.map((s) => h('div', { class: 'ct-slot' }, h('span', null, s)))));
      const stage = h('div', { class: 'mg-stage-area ct-stage' }, phone, cal);
      const answers = h('div', { class: 'ct-answers' });
      ui.body.append(stage, answers);

      const stats = { dialed: 0, picked: 0, appts: [], bad: 0, vm: 0, streak: 0 };
      let finished = false, t1 = null, t2 = null, respondT = null, current = null, repV = 10;
      const timer = PP.mg.timer(ui.bar, 45 + prep * 6, () => finish());
      const names = PP.shuffle(NAMES);
      const onKey = (e) => { const n = parseInt(e.key, 10); const b = answers.querySelectorAll('button')[n - 1]; if (b) { e.preventDefault(); b.click(); } };
      document.addEventListener('keydown', onKey);

      function setFace(mood, extra) { face.innerHTML = PP.art.face({ mood, hue: stats.dialed * 47, surprised: extra === 'surprised' }); }
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
          if (r < 0.25) { state.textContent = 'No answer.'; face.innerHTML = '<div class="ct-dialing">✕</div>'; F.popOn(stage, phone, 'No answer', 'meh'); t2 = setTimeout(dial, 650); }
          else if (r < 0.4) voicemail(name);
          else pickup(name);
        }, 700 + Math.random() * 600);
      }
      function voicemail(name) {
        stats.vm++;
        face.innerHTML = '<div class="ct-dialing vm">VM</div>';
        state.textContent = `"You've reached ${name}. Leave a message…" BEEP`;
        answers.append(
          h('button', { class: 'ct-answer', onclick: () => { if (PP.chance(0.25)) book({ temp: 'cold', source: 'a call-back from your voicemail' }, name + ' (call-back)'); else F.popOn(stage, phone, 'Message left', 'meh'); next(); } }, h('b', null, '1'), ' Leave a short, friendly message'),
          h('button', { class: 'ct-answer', onclick: () => { F.sfx('click'); next(); } }, h('b', null, '2'), ' Hang up and keep dialing'));
      }
      function pickup(name) {
        stats.picked++;
        current = PP.pick(OBJ);
        setFace(0, 'surprised');
        state.textContent = 'Picked up!';
        bubble.hidden = false;
        bubble.textContent = current.line;
        F.sfx('ding');
        PP.shuffle(current.r).forEach(([text, q], i) => answers.appendChild(h('button', { class: 'ct-answer', onclick: () => answer(q, name) }, h('b', null, String(i + 1)), ' "' + text + '"')));
        respondT = setTimeout(() => { setFace(-1); F.popOn(stage, phone, 'Too slow. Click.', 'bad'); F.sfx('bad'); stats.streak = 0; streak.set(0); next(); }, (5.5 + prep) * 1000);
      }
      function answer(q, name) {
        clearTimeout(respondT);
        answers.querySelectorAll('button').forEach((b) => (b.disabled = true));
        const ok = q === 'good' ? PP.chance(0.75) : q === 'ok' ? PP.chance(0.2) : false;
        if (q === 'bad') { stats.bad++; repV = Math.max(0, repV - 2); rep.set(repV, 10); }
        if (ok) { setFace(2); book({ temp: current.warm ? 'warm' : 'cold', source: 'your call-a-thon' }, name); stats.streak++; }
        else if (q === 'bad') { setFace(-2); F.shake(phone); F.popOn(stage, phone, 'CLICK!', 'bad'); F.sfx('bad'); stats.streak = 0; }
        else { setFace(q === 'good' ? 1 : 0); F.popOn(stage, phone, q === 'good' ? '"Thanks, not now"' : '"Okay. Bye."', 'meh'); F.sfx('meh'); stats.streak = 0; }
        streak.set(stats.streak);
        if (stats.streak >= 3) F.popOn(stage, cal, `${stats.streak} in a row!`, 'great');
        next(900);
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
        PP.mg.summary(root, PP.minigames.callathon.title, {
          score: n, max: Math.max(n, 6), eff: { energy: -2 }, prospects: stats.appts, passed: ctx.pass != null ? n >= ctx.pass : null,
          headline: `${stats.dialed} dials, ${stats.picked} people picked up, ${n} appointment${n === 1 ? '' : 's'} on your calendar.`,
          lines: [
            { q: n >= 3 ? 'good' : n ? 'ok' : 'bad', text: `Appointments booked: ${n}` },
            { q: stats.bad ? 'bad' : 'good', text: stats.bad ? `Pushy or dishonest answers: ${stats.bad}. People remember those.` : 'You stayed honest and polite the whole time.' },
            { q: 'ok', text: `Voicemails: ${stats.vm}` }
          ]
        }, done);
      }
      dial();
      return { stop() { finished = true; [t1, t2, respondT].forEach(clearTimeout); timer.stop(); document.removeEventListener('keydown', onKey); } };
    }
  };
})(window.PP);
