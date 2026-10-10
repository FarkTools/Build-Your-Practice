/* Monday Morning Inbox. Messages from your clients pile up on your phone.
 * For each one: Handle it now, Book a call, Hand to your assistant, or Stop and verify.
 * Life events deserve a conversation. Paperwork belongs with your assistant.
 * Anything asking to move money somewhere new gets verified. If the pile gets too
 * deep, the oldest message goes stale and that client feels ignored.
 * result.sat = { clientName: change } so the caller can update the book. */
(function (PP) {
  const h = PP.h;
  const NAMES = ['The Parks', 'Dana R.', 'Mr. Okafor', 'Lucy & Sam', 'Gloria', 'Bill T.', 'Anita', 'The Romeros', 'Hank', 'Mei'];
  const MSGS = [
    { kind: 'handle', body: 'Is Thursday at 2 still good?', why: 'A quick yes. Done in ten seconds.' },
    { kind: 'handle', body: 'Can you resend the meeting link? Can\'t find it.', why: 'Quick. Just send it.' },
    { kind: 'handle', body: 'Thanks so much for yesterday!! 🙏', why: 'A short reply goes a long way.' },
    { kind: 'handle', body: 'What time do you close on Fridays?', why: 'Easy answer.' },
    { kind: 'call', body: 'We\'re having a baby!! Due in June. Does anything need to change?', why: 'Big life change. Worth a real conversation.' },
    { kind: 'call', body: 'I got laid off on Friday. Not sure what to do about my retirement account.', why: 'Stressful news. They need to talk, not a text.' },
    { kind: 'call', body: 'Mom passed last week. I don\'t know what to do with her accounts.', why: 'Grief and paperwork. Call them.' },
    { kind: 'call', body: 'Thinking about retiring two years early. Crazy?', why: 'A big decision. Book time to go through it.' },
    { kind: 'assistant', body: 'Need a copy of last year\'s statement for my mortgage application.', why: 'Routine paperwork. Your assistant can send it.' },
    { kind: 'assistant', body: 'We moved! New address is 48 Harbor Lane.', why: 'An address change. Your assistant can update it.' },
    { kind: 'assistant', body: 'Lost the form you sent. Can I get another?', why: 'Your assistant can resend it.' },
    { kind: 'assistant', body: 'Can I get a receipt for my last payment for taxes?', why: 'Routine. Hand it off.' },
    { kind: 'verify', body: 'New bank, new account. Please send my withdrawal there today. Details attached.', why: 'Money going somewhere new. Always confirm by phone first.', reveal: 'You call the number on file. "I never sent that." Their email was hacked.' },
    { kind: 'verify', body: 'hi it\'s me, new phone!! can you text me my account number?', why: 'Unknown number asking for account details. Verify.', reveal: 'The real client still has the same phone. Scam stopped.' },
    { kind: 'verify', body: 'URGENT. Sell everything and move it to cash NOW. Can\'t talk.', why: 'Big, urgent, can\'t talk. Confirm before acting.', reveal: 'You reach them. They\'d seen a scary headline. You talk it through and they calm down.' }
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
      // A guaranteed mix: 2 calls, 2 assistant, 1-2 verify, the rest quick.
      const by = (k, n) => PP.shuffle(MSGS.filter((m) => m.kind === k)).slice(0, n);
      const msgs = PP.shuffle([].concat(by('call', 2), by('assistant', 2), by('verify', PP.chance(0.5) ? 2 : 1), by('handle', 3))).map((m, i) => ({ ...m, who: i === 0 && client ? client.name : names[i % names.length] }));
      const ui = PP.mg.shell(root, this.title, this.risk);
      const doneC = F.counter('Cleared'), unreadC = F.counter('Unread'), scamC = F.counter('Scams stopped');
      const mood = F.meter('Client mood', 'good'); mood.set(10, 10, 'happy');
      ui.hud.append(doneC.el, unreadC.el, scamC.el, mood.el);

      const thread = h('div', { class: 'ff-thread' });
      const phone = h('div', { class: 'ff-phone' }, h('div', { class: 'ff-notch' }), h('div', { class: 'ff-top' }, 'Monday 8:02 AM'), thread);
      const icon = (id) => h('span', { class: 'dd-icon', html: `<svg viewBox="0 0 26 26" aria-hidden="true">${ACTIONS.find((a) => a.id === id).icon}</svg>` });
      const calCount = h('strong', null, '0'), asstCount = h('strong', null, '0');
      const cal = h('div', { class: 'ff-bin cal' }, icon('call'), 'Calendar', calCount);
      const asst = h('div', { class: 'ff-bin asst' }, icon('assistant'), 'Assistant', asstCount);
      const stage = h('div', { class: 'mg-stage-area ff-stage' }, cal, phone, asst);
      const acts = h('div', { class: 'cv-acts' });
      ACTIONS.forEach((a) => acts.appendChild(h('button', { class: 'cv-act a-' + a.id, onclick: () => act(a.id) }, icon(a.id), h('span', null, a.label), h('kbd', null, a.key))));
      ui.body.append(h('p', { class: 'mg-instr' }, 'Work the oldest message first (it\'s highlighted). Keys 1–4 work too. Let the pile pass five and the oldest one goes stale.'), stage, acts);
      const onKey = (e) => { const a = ACTIONS.find((x) => x.key === e.key); if (a) { e.preventDefault(); act(a.id); } };
      document.addEventListener('keydown', onKey);

      const queue = [], log = [], sat = {};
      let arrived = 0, finished = false, busy = false, moodV = 10, scams = 0, arriveT = null;
      const gap = (4.6 + prep * 0.6) * 1000;
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
        arriveT = setTimeout(arrive, arrived < 2 ? 500 : gap);
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
        const q = GRADE[m.kind][id];
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
        PP.mg.summary(root, PP.minigames.inbox.title, {
          score: Math.round(score * 10) / 10, max: msgs.length, eff, showDebt: true, sat,
          passed: ctx.pass != null ? score >= ctx.pass : null,
          headline: fooled ? 'A scam got through. That will come back around.' : brushed ? 'Someone with big news got a quick text instead of a call. They noticed.' : staleN ? `${staleN} message${staleN > 1 ? 's' : ''} sat too long.` : 'Inbox zero, and every client felt looked after.',
          lines: log.map((l) => ({ q: l.q, text: `${act[l.action]} ${l.m.who}: "${l.m.body.slice(0, 54)}${l.m.body.length > 54 ? '…' : ''}" ${l.q === 'good' ? '' : '(' + l.m.why + ')'}` }))
        }, done);
      }
      arrive();
      return { stop() { finished = true; clearTimeout(arriveT); timer.stop(); document.removeEventListener('keydown', onKey); } };
    }
  };
})(window.PP);
