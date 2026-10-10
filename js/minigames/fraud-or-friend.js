/* Fraud or Friend? — the risk: social engineering, odd requests, pressure to act fast.
 * Proceed / Verify / Escalate / Reject. Verifying protects you but costs momentum,
 * so caution is not free. In the journey, proceeding on a fake gives no warning.
 */
(function (PP) {
  const h = PP.h;

  const MSGS = [
    { ch: 'Text', from: '{c}', body: 'Running 10 min late, sorry!! traffic', truth: 'friend', verify: 'It\'s their number on file. It really is just traffic.' },
    { ch: 'Email', from: '{c} <{lc}.newemail@secure-docs-mail.co>', body: 'New email address! Please send all my documents here today. Can\'t talk, in meetings all week.', truth: 'fraud', verify: 'You call {c} on the number on file. "What? I didn\'t send that."' },
    { ch: 'Email', from: '{s} (cc: {c})', body: 'Hi! {c} asked me to join the next meeting. What time works for you?', truth: 'friend', verify: '{c} confirms: "Yes! Please include them."' },
    { ch: 'Call', from: '"Home Office IT Desk"', body: 'We need your login to fix a sync issue on {c}\'s file. Quickly, please, before it corrupts.', truth: 'fraud', verify: 'The real IT desk has never heard of this call.' },
    { ch: 'Text', from: '{c}', body: 'Can you push everything through TODAY? I leave for a trip tomorrow.', truth: 'odd', verify: 'It\'s really {c}, and they really are leaving. Some of it can\'t safely be done today.' },
    { ch: 'Text', from: 'Unknown number', body: 'hi its {c} new phone!! can u change my bank details on file? urgent', truth: 'fraud', verify: '{c}, on the number on file: "I\'ve had the same phone for six years."' },
    { ch: 'Chat', from: 'Your manager', body: 'Team huddle at 4. There will be donuts.', truth: 'friend', verify: 'There will indeed be donuts.' },
    { ch: 'Email', from: '{c} (their usual address)', body: 'Here are my docs → statement.pdf.exe', truth: 'fraud', verify: '{c}: "I didn\'t send anything today." Their email has been compromised.' },
    { ch: 'Email', from: 'Olu, Operations', body: 'Your form came back. One signature missing on page 4.', truth: 'friend', verify: 'Olu is, as always, correct.' },
    { ch: 'Text', from: '{c}', body: 'My accountant says just do what she says, can you take instructions from her directly?', truth: 'odd', verify: '{c} meant it, but you would need that in writing first.' }
  ];

  const GRADE = {
    friend: { proceed: 'good', escalate: 'ok', reject: 'bad', ignore: 'bad' },
    fraud: { reject: 'good', escalate: 'good', proceed: 'bad', ignore: 'ok' },
    odd: { escalate: 'good', reject: 'bad', proceed: 'bad', ignore: 'ok' }
  };
  const ACTIONS = [
    { id: 'proceed', label: 'Proceed', key: '1' },
    { id: 'verify', label: 'Verify', key: '2' },
    { id: 'escalate', label: 'Escalate', key: '3' },
    { id: 'reject', label: 'Reject', key: '4' }
  ];

  PP.minigames.fraudOrFriend = {
    title: 'Fraud or Friend?',
    risk: 'social engineering and pressure',
    blurb: 'Messages arrive under time pressure. Proceed, verify, escalate, or reject. Verifying costs momentum; skipping it costs more, later.',
    start(root, ctx, done) {
      const client = ctx.client;
      const practice = !!ctx.practice;
      const prep = ctx.prep || 0;
      const per = 12 + prep * 3;
      let pool = PP.shuffle(MSGS);
      const frauds = pool.filter((m) => m.truth === 'fraud').slice(0, 2);
      const rest = pool.filter((m) => !frauds.includes(m)).slice(0, 4);
      const msgs = PP.shuffle(frauds.concat(rest));
      const ui = PP.mg.shell(root, this.title, this.risk);
      const card = h('div', { class: 'msg-card' });
      const btns = h('div', { class: 'mg-actions four' });
      ui.body.append(card, btns);
      ACTIONS.forEach((a) => btns.appendChild(h('button', { class: 'btn action', 'data-a': a.id, onclick: () => act(a.id) }, h('kbd', null, a.key), a.label)));
      const onKey = (e) => { const a = ACTIONS.find((x) => x.key === e.key); if (a) { e.preventDefault(); act(a.id); } };
      document.addEventListener('keydown', onKey);

      let i = -1, timer = null, verified = false, finished = false, locked = false;
      const log = [];
      let verifies = 0;

      function setVerifyEnabled(on) { btns.querySelector('[data-a="verify"]').disabled = !on; }

      function next() {
        i++;
        if (i >= msgs.length) return finish();
        verified = false; locked = false;
        setVerifyEnabled(true);
        ui.status.textContent = `${i + 1} of ${msgs.length}`;
        const m = msgs[i];
        card.innerHTML = '';
        card.append(
          h('div', { class: 'msg-meta' }, h('span', { class: 'msg-ch' }, m.ch), h('span', { class: 'msg-from' }, PP.mg.fill(m.from, client))),
          h('div', { class: 'msg-body' }, PP.mg.fill(m.body, client)),
          h('div', { class: 'msg-verify', hidden: true }));
        card.classList.remove('enter'); void card.offsetWidth; card.classList.add('enter');
        timer && timer.stop();
        timer = PP.mg.timer(ui.bar, per, () => act('ignore'));
      }

      function act(action) {
        if (finished || locked || i < 0 || i >= msgs.length) return;
        const m = msgs[i];
        if (action === 'verify') {
          if (verified) return;
          verified = true; verifies++;
          setVerifyEnabled(false);
          const v = card.querySelector('.msg-verify');
          v.hidden = false; v.textContent = PP.mg.fill(m.verify, client);
          timer.add(per);
          ui.feedback.textContent = 'Verified. That took a little time.';
          ui.feedback.className = 'mg-feedback';
          return;
        }
        locked = true;
        timer.stop();
        let q = GRADE[m.truth][action];
        // Once verified, the right move is obvious; proceeding on a verified "odd" request is fine.
        if (verified && m.truth === 'odd' && action === 'proceed') q = 'ok';
        log.push({ m, action, q, verified });
        const labels = { proceed: 'Done!', escalate: 'Sent to the operations team.', reject: 'Rejected.', ignore: 'You let it sit.' };
        let fb = labels[action];
        if (practice) fb = (q === 'good' ? 'Good call. ' : q === 'ok' ? 'Acceptable. ' : 'Risky. ') + `It was ${m.truth === 'friend' ? 'legitimate' : m.truth === 'fraud' ? 'fake' : 'real, but needed checking'}.`;
        else if (action !== 'proceed' && !verified && m.truth === 'friend') fb += ' Hmm, that one may have been real.';
        ui.feedback.textContent = fb;
        ui.feedback.className = 'mg-feedback ' + (practice ? 'q-' + q : '');
        setTimeout(next, 650);
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
        const eff = {
          energy: -1,
          momentum: -Math.floor(verifies / 2) - escalatedFriends + (verifies === 0 ? 1 : 0),
          trust: -snubbed,
          insight: caught >= 2 ? 1 : 0
        };
        const debts = [];
        if (fooled) debts.push({ tag: 'fraud', sev: Math.min(3, 1 + fooled) });
        if (rushedOdd) debts.push({ tag: 'timeline', sev: 1 });
        if (debts.length) eff.debt = debts;
        const lines = log.map((l) => ({
          q: practice || l.action !== 'proceed' ? l.q : 'ok',
          text: `${l.m.ch} from ${PP.mg.fill(l.m.from, client)}: ${l.verified ? 'verified, then ' : ''}${l.action === 'ignore' ? 'ran out of time' : l.action}` + (practice ? ` (${l.m.truth === 'friend' ? 'legit' : l.m.truth === 'fraud' ? 'fake' : 'real but risky'})` : '')
        }));
        const result = {
          score: Math.round(score * 10) / 10, max: msgs.length, eff, lines, showDebt: practice,
          passed: ctx.pass != null ? score >= ctx.pass : null,
          headline: practice ? (fooled ? `You acted on ${fooled} fake request${fooled > 1 ? 's' : ''}. In a journey, you would not find out until later.` : 'No fakes got through.') : `Verified ${verifies} message${verifies === 1 ? '' : 's'}.`
        };
        PP.mg.summary(root, PP.minigames.fraudOrFriend.title, result, done);
      }

      next();
      return { stop() { finished = true; timer && timer.stop(); document.removeEventListener('keydown', onKey); } };
    }
  };
})(window.PP);
