/* Call-a-thon (prospecting). Dial through a list of strangers.
 * Some don't answer, some go to voicemail, and the rest hit you with an objection.
 * Pick the best response before they hang up. Good responses book appointments. */
(function (PP) {
  const h = PP.h;
  const NAMES = ['Mrs. Alvarez', 'Ted Brooks', 'Priyanka S.', 'Gary (no last name)', 'The Nguyens', 'Doug at Doug\'s Tires', 'Marisa K.', 'Stan Wright', 'Ola B.', 'Frank, age 71', 'Kim from accounting', 'Leo Marsh', 'Ruth G.', 'Omar F.'];
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

  PP.minigames.callathon = {
    title: 'Call-a-thon',
    risk: 'prospecting by phone',
    prospecting: true,
    blurb: 'Dial through a list of strangers. Pick the best response to each objection before they hang up. Good answers book appointments.',
    start(root, ctx, done) {
      const prep = ctx.prep || 0;
      const ui = PP.mg.shell(root, this.title, this.risk);
      const phone = h('div', { class: 'phone-card' });
      const btns = h('div', { class: 'stack' });
      ui.body.append(h('p', { class: 'mg-instr' }, 'Pick a response with the mouse or keys 1–3. No answer? It dials the next number on its own.'), phone, btns);
      const stats = { dialed: 0, picked: 0, appts: [], bad: 0, vm: 0 };
      let finished = false, t1 = null, t2 = null, respondTimer = null, current = null;
      const timer = PP.mg.timer(ui.bar, 45 + prep * 6, () => finish());
      const names = PP.shuffle(NAMES);
      const onKey = (e) => { const n = parseInt(e.key, 10); const b = btns.querySelectorAll('button')[n - 1]; if (b) { e.preventDefault(); b.click(); } };
      document.addEventListener('keydown', onKey);

      function status() { ui.status.textContent = `Dialed ${stats.dialed} · Appointments ${stats.appts.length}`; }
      function dial() {
        if (finished) return;
        btns.innerHTML = '';
        const who = names[stats.dialed % names.length];
        stats.dialed++; status();
        phone.innerHTML = '';
        phone.append(h('div', { class: 'phone-who' }, who), h('div', { class: 'phone-state ringing' }, 'Ringing…'));
        t1 = setTimeout(() => {
          if (finished) return;
          const r = Math.random();
          if (r < 0.28) { phone.querySelector('.phone-state').textContent = 'No answer.'; phone.querySelector('.phone-state').className = 'phone-state'; t2 = setTimeout(dial, 700); }
          else if (r < 0.42) voicemail(who);
          else pickup(who);
        }, 600 + Math.random() * 700);
      }
      function voicemail(who) {
        stats.vm++;
        phone.querySelector('.phone-state').textContent = `"Hi, you've reached ${who}. Leave a message…" BEEP.`;
        phone.querySelector('.phone-state').className = 'phone-state';
        btns.append(
          h('button', { class: 'btn', onclick: () => { if (PP.chance(0.25)) stats.appts.push({ temp: 'cold', source: 'a call-back from your voicemail' }); say('You leave a short, friendly message.', 'ok'); next(); } }, '1. Leave a short, friendly message'),
          h('button', { class: 'btn', onclick: () => { say('Click.', 'ok'); next(); } }, '2. Hang up and keep dialing'));
      }
      function pickup(who) {
        stats.picked++;
        current = PP.pick(OBJ);
        phone.querySelector('.phone-state').className = 'phone-state live';
        phone.querySelector('.phone-state').textContent = current.line;
        PP.shuffle(current.r).forEach(([text, q], i) => btns.appendChild(h('button', { class: 'btn', onclick: () => answer(q) }, `${i + 1}. "${text}"`)));
        respondTimer = setTimeout(() => { say('Too slow. Dial tone.', 'bad'); next(); }, (5.5 + prep) * 1000);
      }
      function answer(q) {
        clearTimeout(respondTimer);
        const booked = q === 'good' ? PP.chance(0.7) : q === 'ok' ? PP.chance(0.2) : false;
        if (q === 'bad') stats.bad++;
        if (booked) { stats.appts.push({ temp: current.warm ? 'warm' : 'cold', source: 'your call-a-thon' }); say('"...Okay, sure. Thursday works." Appointment booked!', 'good'); }
        else say(q === 'bad' ? 'Click. That did not land.' : q === 'ok' ? '"Okay. Bye." Polite, but no.' : '"Thanks, but not right now." Kind, at least.', q === 'bad' ? 'bad' : 'ok');
        next();
      }
      function next() { btns.innerHTML = ''; status(); clearTimeout(t2); t2 = setTimeout(dial, 600); }
      function say(t, q) { ui.feedback.textContent = t; ui.feedback.className = 'mg-feedback q-' + q; }

      function finish() {
        if (finished) return;
        finished = true;
        [t1, t2, respondTimer].forEach(clearTimeout); timer.stop(); document.removeEventListener('keydown', onKey);
        const n = stats.appts.length;
        const result = {
          score: n, max: Math.max(n, 6), eff: { energy: -2 }, prospects: stats.appts, passed: ctx.pass != null ? n >= ctx.pass : null,
          headline: `${stats.dialed} dials, ${stats.picked} people picked up, ${n} appointment${n === 1 ? '' : 's'} booked.`,
          lines: [
            { q: n >= 3 ? 'good' : n ? 'ok' : 'bad', text: `Appointments booked: ${n}` },
            { q: stats.bad ? 'bad' : 'good', text: stats.bad ? `Pushy or dishonest answers: ${stats.bad}. People remember those.` : 'You stayed honest and polite the whole time.' },
            { q: 'ok', text: `Voicemails: ${stats.vm}` }
          ]
        };
        PP.mg.summary(root, PP.minigames.callathon.title, result, done);
      }
      dial();
      return { stop() { finished = true; [t1, t2, respondTimer].forEach(clearTimeout); timer.stop(); document.removeEventListener('keydown', onKey); } };
    }
  };
})(window.PP);
