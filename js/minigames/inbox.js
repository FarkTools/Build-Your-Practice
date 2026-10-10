/* Monday Morning Inbox. Messages from your clients pile up on your phone.
 * For each one: Handle it now, Book a call, Hand to your assistant, or Stop and verify.
 * Life events deserve a conversation. Paperwork belongs with your assistant.
 * Anything asking to move money somewhere new gets verified. If the pile gets too
 * deep, the oldest message goes stale and that client feels ignored.
 * result.sat = { clientName: change } so the caller can update the book. */
(function (PP) {
  const h = PP.h;
  const NAMES = ['The Parks', 'Dana R.', 'Mr. Okafor', 'Lucy & Sam', 'Gloria', 'Bill T.', 'Anita', 'The Romeros', 'Hank', 'Mei'];
  /* alt: routes that are a reasonable second-best ('ok') even if the table says otherwise.
   * tags tie a message to a day framing; seg is the kind of client who would send it. */
  const MSGS = [
    { kind: 'handle', body: 'Is Thursday at 2 still good?', why: 'A quick yes. Done in ten seconds.' },
    { kind: 'handle', body: 'Can you resend the meeting link? Can\'t find it.', why: 'Quick. Just send it.' },
    { kind: 'handle', body: 'Thanks so much for yesterday!! 🙏', why: 'A short reply goes a long way.' },
    { kind: 'handle', body: 'What time do you close on Fridays?', why: 'Easy answer.' },
    { kind: 'handle', body: 'Happy new year!! Hope you had a nice break.', why: 'A warm one-liner back. Easy.', tags: ['holiday'] },
    { kind: 'handle', body: 'Running 10 min late for our 9:30, so sorry!', why: '"No problem, see you soon." Done.' },
    { kind: 'handle', body: 'Do you validate parking? Asking for me.', why: 'A quick answer.' },
    { kind: 'handle', body: 'Is it okay if my husband joins on Thursday?', why: 'Of course. A quick yes.', seg: 'family' },
    { kind: 'handle', body: 'Got your card in the mail. That was so thoughtful.', why: 'A short, warm reply.' },
    { kind: 'handle', body: 'Can we move Friday to Monday? Same time.', why: 'Quick calendar fix. Just do it.' },
    { kind: 'handle', body: 'Is the website down or is it just me?', why: 'A quick "yes, it\'s down, back soon" is all they need.', tags: ['portal'], alt: ['assistant'] },
    { kind: 'handle', body: 'Did you get the documents I dropped off?', why: 'A quick "got them, thank you."', tags: ['quarter', 'tax'] },
    { kind: 'handle', body: 'What\'s your assistant\'s email again?', why: 'Ten-second answer.' },
    { kind: 'call', body: 'We\'re having a baby!! Due in June. Does anything need to change?', why: 'Big life change. Worth a real conversation.', seg: 'family' },
    { kind: 'call', body: 'I got laid off on Friday. Not sure what to do about my retirement account.', why: 'Stressful news. They need to talk, not a text.' },
    { kind: 'call', body: 'Mom passed last week. I don\'t know what to do with her accounts.', why: 'Grief and paperwork. Call them.', seg: 'changes' },
    { kind: 'call', body: 'Thinking about retiring two years early. Crazy?', why: 'A big decision. Book time to go through it.', seg: 'retiree' },
    { kind: 'call', body: 'We\'re separating. I don\'t even know what questions to ask.', why: 'A hard change. They need a person, not a form.', seg: 'changes' },
    { kind: 'call', body: 'My dad is moving in with us next month. Should we be thinking about anything?', why: 'A big shift in the household. Worth a real talk.', seg: 'caregiver' },
    { kind: 'call', body: 'JUST SOLD THE BUSINESS!! Now what??', why: 'Huge news with big decisions behind it. Call.', seg: 'owner' },
    { kind: 'call', body: 'My aunt left me money. I feel weird about it. Can we talk?', why: 'Money and feelings. A conversation, not a reply.', seg: 'windfall' },
    { kind: 'call', body: 'The market dropped again. Should I be worried?', why: 'Worry deserves a voice. A quick reassuring text works, but a call is better.', tags: ['quarter'], alt: ['handle'] },
    { kind: 'call', body: 'We\'re thinking about a bigger house. Is that a terrible idea?', why: 'A big decision. Book time.', seg: 'family' },
    { kind: 'call', body: 'Work is offering a buyout. Deadline is Friday.', why: 'A deadline and a big choice. Get on the phone.' },
    { kind: 'call', body: 'The tests came back. It\'s manageable, but I want to get things in order.', why: 'Health news. Call them, gently.' },
    { kind: 'call', body: 'Are we on track? I keep lying awake about it.', why: 'Anxiety at 2am deserves a real conversation.', seg: 'numbers', alt: ['handle'] },
    { kind: 'call', body: 'Can we talk this week? Nothing urgent. Just... a lot going on.', why: '"Nothing urgent" with "a lot going on" usually means a call.', alt: ['handle'] },
    { kind: 'assistant', body: 'Need a copy of last year\'s statement for my mortgage application.', why: 'Routine paperwork. Your assistant can send it.' },
    { kind: 'assistant', body: 'We moved! New address is 48 Harbor Lane.', why: 'An address change. Your assistant can update it.', alt: ['verify'] },
    { kind: 'assistant', body: 'Lost the form you sent. Can I get another?', why: 'Your assistant can resend it.' },
    { kind: 'assistant', body: 'Can I get a receipt for my last payment for taxes?', why: 'Routine. Hand it off.', tags: ['tax'] },
    { kind: 'assistant', body: 'Need to switch which account my monthly payment comes from. Voided check attached.', why: 'Routine, though checking bank changes is never wrong. Your assistant can process and confirm it.', alt: ['verify'] },
    { kind: 'assistant', body: 'Can\'t log in. The password reset email never comes.', why: 'Your assistant can sort out the login.', tags: ['portal'], alt: ['handle'] },
    { kind: 'assistant', body: 'Accountant needs my year-end statement. Can you send it?', why: 'Paperwork. Your assistant has it.', tags: ['quarter', 'tax'] },
    { kind: 'assistant', body: 'My name is spelled wrong on the paperwork. It\'s Siobhan, not Shivon.', why: 'A correction. Your assistant can fix it.' },
    { kind: 'assistant', body: 'My daughter just turned 18. Does she need to sign something now?', why: 'Mostly paperwork. Your assistant can check, though a quick call would be fine too.', alt: ['call'], seg: 'family' },
    { kind: 'assistant', body: 'Can I get a copy of everything we signed last month?', why: 'Your assistant can pull the file.' },
    { kind: 'assistant', body: 'Please add my husband as a contact on my file.', why: 'Paperwork, with a quick check that it\'s really them. Either route is reasonable.', alt: ['verify'] },
    { kind: 'assistant', body: 'Where do I send the signed forms? Mail or upload?', why: 'Your assistant can walk them through it. A quick answer works too.', alt: ['handle'] },
    { kind: 'assistant', body: 'End of quarter: can you confirm my contribution went through?', why: 'Your assistant can check the records.', tags: ['quarter'], alt: ['handle'] },
    { kind: 'verify', body: 'New bank, new account. Please send my withdrawal there today. Details attached.', why: 'Money going somewhere new. Always confirm by phone first.', reveal: 'You call the number on file. "I never sent that." Their email was hacked.' },
    { kind: 'verify', body: 'hi it\'s me, new phone!! can you text me my account number?', why: 'Unknown number asking for account details. Verify.', reveal: 'The real client still has the same phone. Scam stopped.' },
    { kind: 'verify', body: 'URGENT. Sell everything and move it to cash NOW. Can\'t talk.', why: 'Big, urgent, can\'t talk. Confirm before acting.', reveal: 'You reach them. They\'d seen a scary headline. You talk it through and they calm down.', tags: ['quarter'] },
    { kind: 'verify', body: '[Support] Security alert: click here to reset your client portal password.', why: 'Looks official, isn\'t. Never click; check first.', reveal: 'The link goes to a lookalike site. You report it to Operations.', tags: ['portal'] },
    { kind: 'verify', body: 'This is Frank\'s son. Dad wants me to have his login. Please send it today.', why: 'A third party asking for access. Verify with the client.', reveal: 'You call Frank. He has no idea. Neither does his son.', seg: 'retiree' },
    { kind: 'verify', body: 'Closing is today! Please wire our down payment to the title company. NEW instructions attached.', why: 'New wire instructions on closing day is a classic scam. Call first.', reveal: 'You call the client. The real title company never changed its instructions.', seg: 'family' },
    { kind: 'verify', body: 'Hi, it\'s your manager. Need you to buy gift cards for a client event, quick. Explain later.', why: 'Gift cards plus urgency equals scam. Verify.', reveal: 'Your manager is at the dentist and very confused by your call.' },
    { kind: 'verify', body: 'Please change my address and send a new checkbook to it.', why: 'Two changes at once is a red flag. Confirm by phone.', reveal: 'The client never moved. Someone was trying to take over the account.' },
    { kind: 'verify', body: 'My friend\'s online "trading coach" doubled his money. Move half of mine to his account?', why: 'Money to a stranger\'s account. Stop, verify, talk it through.', reveal: 'You call. They\'re excited. You talk it through, and they agree to hold off and look into it first.', seg: 'windfall' },
    { kind: 'verify', body: 'Holiday bonus! Click to claim your gift card from Operations.', why: 'Operations doesn\'t send gift-card links. Verify.', reveal: 'Operations sent nothing of the sort. Phishing, reported.', tags: ['holiday'] }
  ];
  /* What kind of day it is: changes the clock on the phone, the mix, and the pace. */
  const DAYS = [
    { id: 'monday', name: 'Monday morning', clock: 'Monday 8:02 AM', note: 'Coffee in hand. Here we go.', mix: { call: 2, assistant: 2, verify: [1, 2], handle: 3 }, pile: 1, pace: 1 },
    { id: 'holiday', name: 'The day after a long weekend', clock: 'Tuesday 8:15 AM', note: 'The pile started without you. Three messages are already waiting.', mix: { call: 2, assistant: 2, verify: [1, 1], handle: 4 }, pile: 3, pace: 1.05, tag: 'holiday' },
    { id: 'quarter', name: 'End of quarter', clock: 'Friday 3:45 PM', note: 'Statements, confirmations, and a few nervous clients.', mix: { call: 2, assistant: 4, verify: [1, 1], handle: 2 }, pile: 1, pace: 0.9, tag: 'quarter' },
    { id: 'portal', name: 'The day the client website went down', clock: 'Wednesday 9:20 AM', note: 'Nobody can log in. Scammers noticed too.', mix: { call: 1, assistant: 3, verify: [2, 2], handle: 3 }, pile: 2, pace: 0.88, tag: 'portal' },
    { id: 'tax', name: 'Tax week', clock: 'Monday 7:55 AM', note: 'Everybody needs a form. Everybody needs it today.', mix: { call: 1, assistant: 4, verify: [1, 2], handle: 3 }, pile: 1, pace: 0.95, tag: 'tax' },
    { id: 'friday', name: 'Friday afternoon before a holiday', clock: 'Friday 4:30 PM', note: 'Big news always lands right before a long weekend.', mix: { call: 3, assistant: 2, verify: [1, 2], handle: 2 }, pile: 1, pace: 1 }
  ];
  const GRADE = {
    handle: { handle: 'good', assistant: 'ok', call: 'ok', verify: 'bad' },
    call: { call: 'good', handle: 'bad', assistant: 'bad', verify: 'ok' },
    assistant: { assistant: 'good', handle: 'ok', call: 'ok', verify: 'bad' },
    verify: { verify: 'good', handle: 'bad', assistant: 'bad', call: 'ok' }
  };
  const ACTIONS = [
    { id: 'handle', label: 'Handle it now', key: '1', icon: '<path d="M4,20 l2,-6 l12,-10 l4,4 l-12,10z" fill="none" stroke="currentColor" stroke-width="2.4" stroke-linejoin="round"/>' },
    { id: 'call', label: 'Book a call', key: '2', icon: '<rect x="4" y="6" width="18" height="16" rx="2" fill="none" stroke="currentColor" stroke-width="2.4"/><path d="M4,11 h18 M9,3 v5 M17,3 v5" stroke="currentColor" stroke-width="2.4" stroke-linecap="round"/>' },
    { id: 'assistant', label: 'Hand to your assistant', key: '3', icon: '<circle cx="13" cy="8" r="4" fill="none" stroke="currentColor" stroke-width="2.4"/><path d="M5,23 q0,-8 8,-8 q8,0 8,8" fill="none" stroke="currentColor" stroke-width="2.4" stroke-linecap="round"/>' },
    { id: 'verify', label: 'Stop and verify', key: '4', icon: '<path d="M13,3 l8,3 v6 q0,7 -8,11 q-8,-4 -8,-11 v-6z" fill="none" stroke="currentColor" stroke-width="2.4" stroke-linejoin="round"/><path d="M9,13 l3,3 l5,-6" fill="none" stroke="currentColor" stroke-width="2.4" stroke-linecap="round"/>' }
  ];
  const MAX_PILE = 5;

  PP.minigames.inbox = {
    title: 'Monday Morning Inbox',
    risk: 'client service and scams',
    blurb: 'Messages from your clients pile up. Handle quick ones now, book calls for big life news, hand paperwork to your assistant, and verify anything that moves money somewhere new.',
    start(root, ctx, done) {
      const F = PP.fx;
      const prep = ctx.prep || 0;
      const names = PP.shuffle(ctx.names && ctx.names.length ? ctx.names.slice() : NAMES);
      const client = ctx.client;
      const day = PP.pick(DAYS);
      // A guaranteed mix for the day, leaning on messages that fit it.
      const by = (k, n) => MSGS.filter((m) => m.kind === k).map((m) => ({ m, key: Math.random() ** (1 / (m.tags && m.tags.includes(day.tag) ? 5 : m.tags ? 0.4 : 1)) })).sort((a, b) => b.key - a.key).slice(0, n).map((x) => x.m);
      const v = day.mix.verify, nv = v[0] + (PP.chance(0.5) ? v[1] - v[0] : 0);
      let pool = PP.shuffle([].concat(by('call', day.mix.call), by('assistant', day.mix.assistant), by('verify', nv), by('handle', day.mix.handle)));
      // Don't open with a scam: the first message is something ordinary.
      const firstOk = pool.findIndex((m) => m.kind !== 'verify'); if (firstOk > 0) pool.unshift(pool.splice(firstOk, 1)[0]);
      const msgs = pool.map((m, i) => ({ ...m, who: i === 0 && client ? client.name : names[i % names.length] }));
      const ui = PP.mg.shell(root, day.id === 'monday' ? this.title : 'The Inbox', this.risk);
      ui.wrap.insertBefore(h('div', { class: 'mg-scene' }, h('b', null, day.name), h('span', null, day.note)), ui.hud);
      const doneC = F.counter('Cleared'), unreadC = F.counter('Unread'), scamC = F.counter('Scams stopped');
      const mood = F.meter('Client mood', 'good'); mood.set(10, 10, 'happy');
      ui.hud.append(doneC.el, unreadC.el, scamC.el, mood.el);

      const thread = h('div', { class: 'ff-thread' });
      const phone = h('div', { class: 'ff-phone' }, h('div', { class: 'ff-notch' }), h('div', { class: 'ff-top' }, day.clock), thread);
      const icon = (id) => h('span', { class: 'dd-icon', html: `<svg viewBox="0 0 26 26" aria-hidden="true">${ACTIONS.find((a) => a.id === id).icon}</svg>` });
      const calCount = h('strong', null, '0'), asstCount = h('strong', null, '0');
      const cal = h('div', { class: 'ff-bin cal' }, icon('call'), 'Calendar', calCount);
      const asst = h('div', { class: 'ff-bin asst' }, icon('assistant'), 'Assistant', asstCount);
      const stage = h('div', { class: 'mg-stage-area ff-stage' }, cal, phone, asst);
      const acts = h('div', { class: 'cv-acts' });
      ACTIONS.forEach((a) => acts.appendChild(h('button', { class: 'cv-act a-' + a.id, onclick: () => act(a.id) }, icon(a.id), h('span', { class: 'cv-long' }, a.label), h('span', { class: 'cv-short' }, { handle: 'Reply now', call: 'Book call', assistant: 'Assistant', verify: 'Verify' }[a.id]), h('kbd', null, a.key))));
      ui.body.append(h('p', { class: 'mg-instr' }, 'Work the oldest message first (it\'s highlighted). Keys 1–4 work too. Let the pile pass five and the oldest one goes stale.'), stage, acts);
      const onKey = (e) => { const a = ACTIONS.find((x) => x.key === e.key); if (a) { e.preventDefault(); act(a.id); } };
      document.addEventListener('keydown', onKey);

      const queue = [], log = [], sat = {};
      let arrived = 0, finished = false, busy = false, moodV = 10, scams = 0, arriveT = null;
      const gap = (4.6 + prep * 0.6) * 1000 * day.pace;
      const timer = PP.mg.timer(ui.bar, 60 + prep * 6, () => finish());
      const bumpSat = (who, d) => { sat[who] = (sat[who] || 0) + d; };
      const setMood = (d) => { moodV = Math.max(0, Math.min(10, moodV + d)); mood.set(moodV, 10, moodV >= 7 ? 'happy' : moodV >= 4 ? 'okay' : 'upset'); };

      function render() {
        unreadC.set(queue.length);
        queue.forEach((m, i) => m.el.classList.toggle('active', i === 0));
        ui.status.textContent = `${log.length} of ${msgs.length}`;
      }
      function arrive() {
        if (finished || arrived >= msgs.length) return;
        const m = msgs[arrived++];
        m.el = h('div', { class: 'ff-msg enter' }, h('div', { class: 'ff-from' }, m.who), h('div', { class: 'ff-body' }, m.body));
        thread.appendChild(m.el);
        queue.push(m);
        F.sfx('ding');
        if (queue.length > MAX_PILE) stale();
        render();
        arriveT = setTimeout(arrive, arrived < day.pile ? 250 : arrived < 2 ? 500 : gap);
      }
      function stale() {
        const m = queue.shift();
        m.el.classList.add('gone');
        log.push({ m, action: 'stale', q: 'bad' });
        bumpSat(m.who, -2); setMood(-2);
        F.popOn(stage, phone, `${m.who} felt ignored`, 'bad'); F.sfx('bad');
        setTimeout(() => m.el.remove(), 500);
        checkEnd();
      }
      function act(id) {
        if (finished || busy || !queue.length) return;
        const m = queue[0];
        let q = GRADE[m.kind][id];
        if (q === 'bad' && m.alt && m.alt.includes(id)) q = 'ok';
        busy = true;
        const resolve = () => {
          queue.shift();
          log.push({ m, action: id, q });
          doneC.set(log.filter((l) => l.action !== 'stale').length);
          if (q === 'good') { bumpSat(m.who, m.kind === 'call' ? 2 : 1); setMood(0.5); F.sfx(m.kind === 'verify' ? 'great' : 'good'); }
          else if (q === 'ok') { F.sfx('meh'); }
          else { bumpSat(m.who, -2); setMood(-2); F.sfx('bad'); F.shake(phone); }
          if (m.kind === 'verify' && q === 'good') { scams++; scamC.set(scams); }
          const label = q === 'good' ? (m.kind === 'verify' && id === 'verify' ? 'Good catch' : 'Nice') : q === 'ok' ? 'Works, but…' : m.kind === 'verify' ? 'That was risky' : m.kind === 'call' ? 'Felt brushed off' : 'Hmm';
          F.popOn(stage, phone, label, q === 'good' ? 'good' : q === 'ok' ? 'meh' : 'bad');
          ui.feedback.textContent = (m.reveal && id === 'verify' ? m.reveal + ' ' : '') + m.why;
          ui.feedback.className = 'mg-feedback q-' + q;
          if (id === 'call' || id === 'assistant') {
            const bin = id === 'call' ? cal : asst, count = id === 'call' ? calCount : asstCount;
            F.fly(m.el, bin, stage, () => { count.textContent = String(+count.textContent + 1); F.glow(bin, q === 'bad' ? 'bad' : 'good'); });
            m.el.remove();
          } else { m.el.classList.add('sent'); setTimeout(() => m.el.remove(), 380); }
          busy = false;
          render();
          checkEnd();
        };
        if (id === 'handle') {
          m.el.appendChild(h('div', { class: 'ff-verify' }, 'Typing a reply…'));
          setTimeout(resolve, m.kind === 'handle' ? 350 : 1100);
        } else if (id === 'verify') {
          const calling = h('div', { class: 'ff-calling' }, `Calling ${m.who} on the number on file…`);
          phone.appendChild(calling);
          setTimeout(() => { calling.remove(); resolve(); }, 1000);
        } else resolve();
      }
      function checkEnd() { if (arrived >= msgs.length && !queue.length) setTimeout(finish, 500); }

      function finish() {
        if (finished) return;
        finished = true;
        clearTimeout(arriveT); timer.stop(); document.removeEventListener('keydown', onKey);
        queue.forEach((m) => { log.push({ m, action: 'stale', q: 'bad' }); bumpSat(m.who, -1); });
        msgs.slice(arrived).forEach((m) => { log.push({ m, action: 'stale', q: 'bad' }); bumpSat(m.who, -1); });
        const score = log.reduce((a, l) => a + (l.q === 'good' ? 1 : l.q === 'ok' ? 0.5 : 0), 0);
        const fooled = log.filter((l) => l.m.kind === 'verify' && (l.action === 'handle' || l.action === 'assistant')).length;
        const brushed = log.filter((l) => l.m.kind === 'call' && l.q === 'bad').length;
        const staleN = log.filter((l) => l.action === 'stale').length;
        const eff = { energy: -1, trust: brushed ? -1 : score >= msgs.length - 1.5 ? 1 : 0, momentum: staleN >= 2 ? -1 : 0 };
        if (fooled) eff.debt = { tag: 'fraud', sev: Math.min(3, fooled + 1) };
        if (staleN) eff.debt = eff.debt || { tag: 'missed_message', sev: Math.min(3, staleN) };
        const act = { handle: 'Handled', call: 'Booked a call with', assistant: 'Handed to your assistant:', verify: 'Verified', stale: 'Went stale:' };
        PP.mg.summary(root, day.id === 'monday' ? PP.minigames.inbox.title : 'The Inbox', {
          score: Math.round(score * 10) / 10, max: msgs.length, eff, showDebt: true, sat,
          passed: ctx.pass != null ? score >= ctx.pass : null,
          headline: day.name + ': ' + (fooled ? 'A scam got through. That will come back around.' : brushed ? 'Someone with big news got a quick text instead of a call. They noticed.' : staleN ? `${staleN} message${staleN > 1 ? 's' : ''} sat too long.` : 'Inbox zero, and every client felt looked after.'),
          lines: log.map((l) => ({ q: l.q, text: `${act[l.action]} ${l.m.who}: "${l.m.body.slice(0, 54)}${l.m.body.length > 54 ? '…' : ''}" ${l.q === 'good' ? '' : '(' + l.m.why + ')'}` }))
        }, done);
      }
      arrive();
      return { stop() { finished = true; clearTimeout(arriveT); timer.stop(); document.removeEventListener('keydown', onKey); } };
    }
  };
})(window.PP);
