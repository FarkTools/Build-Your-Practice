/* Fraud or Friend? — the risk: social engineering, odd requests, pressure to act fast.
 * Messages land on your phone. Proceed, verify (a quick call), escalate to Ops, or reject.
 * Each verdict is shown right away: scams blocked, real requests handled, or oops. */
(function (PP) {
  const h = PP.h;
  const MSGS = [
    { ch: 'Text', from: '{c}', body: 'Running 10 min late, sorry!! traffic', truth: 'friend', verify: 'It\'s their number on file. Really just traffic.' },
    { ch: 'Email', from: '{c} <{lc}.newemail@secure-docs-mail.co>', body: 'New email address! Please send all my documents here today. Can\'t talk, in meetings all week.', truth: 'fraud', verify: 'You call {c} on the number on file: "What? I didn\'t send that."' },
    { ch: 'Email', from: '{s} (cc: {c})', body: 'Hi! {c} asked me to join the next meeting. What time works for you?', truth: 'friend', verify: '{c} confirms: "Yes! Please include them."' },
    { ch: 'Call', from: '"Home Office IT Desk"', body: 'We need your login to fix a sync issue on {c}\'s file. Quickly, before it corrupts.', truth: 'fraud', verify: 'The real IT desk has never heard of this call.' },
    { ch: 'Text', from: '{c}', body: 'Can you push everything through TODAY? I leave for a trip tomorrow.', truth: 'odd', verify: 'It\'s really {c}. Some of it can\'t safely be done today.' },
    { ch: 'Text', from: 'Unknown number', body: 'hi its {c} new phone!! can u change my bank details on file? urgent', truth: 'fraud', verify: '{c}, on the number on file: "Same phone for six years."' },
    { ch: 'Chat', from: 'Your manager', body: 'Team huddle at 4. There will be donuts.', truth: 'friend', verify: 'There will indeed be donuts.' },
    { ch: 'Email', from: '{c} (their usual address)', body: 'Here are my docs → statement.pdf.exe', truth: 'fraud', verify: '{c}: "I didn\'t send anything today." Their email was hacked.' },
    { ch: 'Email', from: 'Olu, Operations', body: 'Your form came back. One signature missing on page 4.', truth: 'friend', verify: 'Olu is, as always, correct.' },
    { ch: 'Text', from: '{c}', body: 'My accountant says just do what she says. Can you take instructions from her directly?', truth: 'odd', verify: '{c} meant it, but you\'d need that in writing first.' }
  ];
  const GRADE = {
    friend: { proceed: 'good', escalate: 'ok', reject: 'bad', ignore: 'bad' },
    fraud: { reject: 'good', escalate: 'good', proceed: 'bad', ignore: 'ok' },
    odd: { escalate: 'good', reject: 'bad', proceed: 'bad', ignore: 'ok' }
  };
  const ACTIONS = [
    { id: 'proceed', label: 'Proceed', key: '1', icon: '<path d="M6,13 l5,5 l10,-12" fill="none" stroke="currentColor" stroke-width="3.5" stroke-linecap="round" stroke-linejoin="round"/>' },
    { id: 'verify', label: 'Verify', key: '2', icon: '<path d="M7,4 l4,0 l2,5 l-3,2 a12,12 0 0 0 5,5 l2,-3 l5,2 l0,4 a3,3 0 0 1 -3,3 a17,17 0 0 1 -15,-15 a3,3 0 0 1 3,-3z" fill="none" stroke="currentColor" stroke-width="2.4" stroke-linejoin="round"/>' },
    { id: 'escalate', label: 'Escalate to Ops', key: '3', icon: '<path d="M13,22 v-17 M6,12 l7,-7 l7,7" fill="none" stroke="currentColor" stroke-width="3.2" stroke-linecap="round" stroke-linejoin="round"/>' },
    { id: 'reject', label: 'Reject', key: '4', icon: '<path d="M6,8 h14 M9,8 v13 h8 v-13 M11,5 h4" fill="none" stroke="currentColor" stroke-width="2.6" stroke-linecap="round" stroke-linejoin="round"/>' }
  ];

  PP.minigames.fraudOrFriend = {
    title: 'Fraud or Friend?',
    risk: 'social engineering and pressure',
    blurb: 'Messages land on your phone under time pressure. Proceed, verify with a quick call, escalate, or reject. Caution costs time; carelessness costs more.',
    start(root, ctx, done) {
      const F = PP.fx;
      const client = ctx.client;
      const prep = ctx.prep || 0;
      const per = 12 + prep * 3;
      const frauds = PP.shuffle(MSGS.filter((m) => m.truth === 'fraud')).slice(0, 2);
      const msgs = PP.shuffle(frauds.concat(PP.shuffle(MSGS.filter((m) => !frauds.includes(m))).slice(0, 4)));
      const ui = PP.mg.shell(root, this.title, this.risk);
      const sec = F.meter('Security', 'good'); sec.set(10, 10, 'solid');
      const blockedC = F.counter('Scams blocked'), streakC = F.counter('Streak');
      ui.hud.append(sec.el, blockedC.el, streakC.el);

      const thread = h('div', { class: 'ff-thread' });
      const phone = h('div', { class: 'ff-phone' }, h('div', { class: 'ff-notch' }), h('div', { class: 'ff-top' }, 'Messages'), thread);
      const ops = h('div', { class: 'ff-bin ops' }, 'Ops');
      const trash = h('div', { class: 'ff-bin trash' }, 'Trash');
      const stage = h('div', { class: 'mg-stage-area ff-stage' }, ops, phone, trash);
      const acts = h('div', { class: 'cv-acts' });
      ACTIONS.forEach((a) => acts.appendChild(h('button', { class: 'cv-act a-' + a.id, 'data-a': a.id, onclick: () => act(a.id) },
        h('span', { class: 'dd-icon', html: `<svg viewBox="0 0 26 26" aria-hidden="true">${a.icon}</svg>` }), h('span', null, a.label), h('kbd', null, a.key))));
      ui.body.append(stage, acts);
      const onKey = (e) => { const a = ACTIONS.find((x) => x.key === e.key); if (a) { e.preventDefault(); act(a.id); } };
      document.addEventListener('keydown', onKey);

      let i = -1, timer = null, verified = false, finished = false, locked = false, bubble = null, secV = 10, streak = 0;
      const log = [];
      let verifies = 0;

      function next() {
        i++;
        if (i >= msgs.length) return finish();
        verified = false; locked = false;
        acts.querySelectorAll('button').forEach((b) => (b.disabled = false));
        ui.status.textContent = `${i + 1} of ${msgs.length}`;
        const m = msgs[i];
        bubble = h('div', { class: 'ff-msg enter' }, h('div', { class: 'ff-from' }, h('span', { class: 'msg-ch' }, m.ch), ' ', PP.mg.fill(m.from, client)), h('div', { class: 'ff-body' }, PP.mg.fill(m.body, client)));
        thread.appendChild(bubble);
        thread.scrollTop = thread.scrollHeight;
        while (thread.children.length > 3) thread.firstChild.remove();
        F.sfx('ding');
        timer && timer.stop();
        timer = PP.mg.timer(ui.bar, per, () => act('ignore'));
      }

      function act(action) {
        if (finished || locked || i < 0 || i >= msgs.length) return;
        const m = msgs[i];
        if (action === 'verify') {
          if (verified) return;
          verified = true; verifies++; locked = true;
          acts.querySelector('[data-a="verify"]').disabled = true;
          const calling = h('div', { class: 'ff-calling' }, 'Calling the number on file…');
          phone.appendChild(calling);
          F.sfx('ring');
          setTimeout(() => {
            calling.remove(); locked = false;
            if (finished) return;
            bubble.appendChild(h('div', { class: 'ff-verify' }, PP.mg.fill(m.verify, client)));
            thread.scrollTop = thread.scrollHeight;
            timer.add(per);
            F.popOn(stage, phone, 'Verified', 'meh');
          }, 900);
          return;
        }
        locked = true;
        timer.stop();
        acts.querySelectorAll('button').forEach((b) => (b.disabled = true));
        let q = GRADE[m.truth][action];
        if (verified && m.truth === 'odd' && action === 'proceed') q = 'ok';
        log.push({ m, action, q, verified });
        // Where the message goes
        if (action === 'reject') { F.fly(bubble, trash, stage, () => F.bump(trash)); bubble.classList.add('gone'); }
        else if (action === 'escalate') { F.fly(bubble, ops, stage, () => F.bump(ops)); bubble.classList.add('gone'); }
        else if (action === 'proceed') bubble.classList.add('sent');
        else bubble.classList.add('ignored');
        // Instant verdict
        const isFraud = m.truth === 'fraud';
        let stampText, kind;
        if (isFraud && (action === 'reject' || action === 'escalate')) { stampText = 'Scam blocked!'; kind = 'good'; }
        else if (isFraud && action === 'proceed') { stampText = 'That was a scam!'; kind = 'bad'; }
        else if (m.truth === 'friend' && action === 'proceed') { stampText = 'Handled'; kind = 'good'; }
        else if (m.truth === 'friend') { stampText = action === 'ignore' ? 'Left a real person waiting' : 'That one was real'; kind = action === 'escalate' ? 'meh' : 'bad'; }
        else if (m.truth === 'odd' && action === 'escalate') { stampText = 'Good instinct'; kind = 'good'; }
        else { stampText = q === 'ok' ? 'Okay, carefully' : 'Too hasty'; kind = q === 'ok' ? 'meh' : 'bad'; }
        F.stamp(stage, stampText, kind);
        F.sfx(kind === 'good' ? 'good' : kind === 'bad' ? 'bad' : 'meh');
        if (kind === 'bad') { F.shake(phone); secV = Math.max(0, secV - (isFraud ? 4 : 1)); sec.set(secV, 10, secV >= 8 ? 'solid' : secV >= 5 ? 'shaky' : 'leaky'); streak = 0; }
        else if (kind === 'good') { streak++; if (isFraud) { blockedC.set(log.filter((l) => l.m.truth === 'fraud' && (l.action === 'reject' || l.action === 'escalate')).length); F.burstOn(stage, phone, 'good', 14); } }
        else streak = 0;
        streakC.set(streak);
        ui.feedback.textContent = `It was ${m.truth === 'friend' ? 'legitimate' : isFraud ? 'a scam' : 'real, but needed care'}.`;
        ui.feedback.className = 'mg-feedback q-' + q;
        setTimeout(next, 1100);
      }

      function finish() {
        if (finished) return;
        finished = true;
        timer && timer.stop();
        document.removeEventListener('keydown', onKey);
        const score = log.reduce((a, l) => a + (l.q === 'good' ? 1 : l.q === 'ok' ? 0.5 : 0), 0);
        const fooled = log.filter((l) => l.action === 'proceed' && l.m.truth === 'fraud').length;
        const rushedOdd = log.filter((l) => l.action === 'proceed' && l.m.truth === 'odd' && !l.verified).length;
        const snubbed = log.filter((l) => (l.action === 'reject' || l.action === 'ignore') && l.m.truth === 'friend').length;
        const escalatedFriends = log.filter((l) => l.action === 'escalate' && l.m.truth === 'friend').length;
        const caught = log.filter((l) => l.m.truth === 'fraud' && (l.action === 'reject' || l.action === 'escalate')).length;
        const eff = { energy: -1, momentum: -Math.floor(verifies / 2) - escalatedFriends + (verifies === 0 ? 1 : 0), trust: -snubbed, insight: caught >= 2 ? 1 : 0 };
        const debts = [];
        if (fooled) debts.push({ tag: 'fraud', sev: Math.min(3, 1 + fooled) });
        if (rushedOdd) debts.push({ tag: 'timeline', sev: 1 });
        if (debts.length) eff.debt = debts;
        PP.mg.summary(root, PP.minigames.fraudOrFriend.title, {
          score: Math.round(score * 10) / 10, max: msgs.length, eff, showDebt: true, passed: ctx.pass != null ? score >= ctx.pass : null,
          headline: fooled ? `You acted on ${fooled} scam${fooled > 1 ? 's' : ''}. That will come back.` : `No scams got through. You verified ${verifies} message${verifies === 1 ? '' : 's'}.`,
          lines: log.map((l) => ({ q: l.q, text: `${l.m.ch} from ${PP.mg.fill(l.m.from, client)}: ${l.verified ? 'verified, then ' : ''}${l.action === 'ignore' ? 'ran out of time' : l.action} (${l.m.truth === 'friend' ? 'legit' : l.m.truth === 'fraud' ? 'scam' : 'real but risky'})` }))
        }, done);
      }
      next();
      return { stop() { finished = true; timer && timer.stop(); document.removeEventListener('keydown', onKey); } };
    }
  };
})(window.PP);
