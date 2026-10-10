/* The Conversation — the risk: hearing facts without noticing what matters.
 * Statements arrive one at a time. Choose: Ask a follow-up, Challenge, Explain, or Keep listening.
 * A tempting "Pitch" button shows up at the worst moments. Doing nothing counts as listening.
 */
(function (PP) {
  const h = PP.h;

  const ACTIONS = [
    { id: 'ask', label: 'Ask a follow-up', key: '1' },
    { id: 'challenge', label: 'Challenge', key: '2' },
    { id: 'explain', label: 'Explain', key: '3' },
    { id: 'listen', label: 'Keep listening', key: '4' }
  ];

  const WHY = {
    emotion: { listen: 'They needed to be heard, and you let them.', ask: 'Fine, but they mostly needed space.', explain: 'You answered a feeling with information.', challenge: 'You argued with a feeling.' },
    question: { explain: 'They asked; you answered clearly.', ask: 'Clarifying is fine.', listen: 'They asked a question and got silence.', challenge: 'They asked a question and got pushback.' },
    misconception: { challenge: 'You gently corrected something important.', explain: 'You explained without making it a fight.', ask: 'Understanding first is good.', listen: 'A misconception went unchallenged.' },
    tangent: { listen: 'Rapport, at the cost of time.', explain: 'You steered back to the point.', ask: 'Down the rabbit hole you go.', challenge: 'Abrupt.' },
    fact: { ask: 'You followed the thread.', listen: 'You let them keep talking.', explain: 'You talked over something important.', challenge: 'You challenged them right as they opened up.' }
  };

  function judge(st, action, ctx, localTrust) {
    const cur = PP.skill(ctx.state, 'curiosity');
    const comm = PP.skill(ctx.state, 'communication');
    const out = { q: 'ok', d: {}, reveal: false, debt: null };
    switch (st.tag) {
      case 'emotion':
        if (action === 'listen') { out.q = 'good'; out.d.trust = 1; }
        else if (action === 'ask') out.q = 'ok';
        else { out.q = 'bad'; out.d.trust = action === 'challenge' ? -2 : -1; }
        break;
      case 'question':
        if (action === 'explain') { out.q = 'good'; out.d.trust = 1; out.d.insight = 0.5; }
        else if (action === 'ask') out.q = 'ok';
        else { out.q = 'bad'; out.d.trust = -1; }
        break;
      case 'misconception':
        if (action === 'challenge') { out.q = comm ? 'good' : 'ok'; out.d.insight = 1; out.d.trust = comm ? 0 : -0.5; }
        else if (action === 'explain') { out.q = 'good'; out.d.insight = 1; }
        else if (action === 'ask') { out.q = cur ? 'good' : 'ok'; out.d.insight = cur ? 1 : 0.5; out.d.trust = cur ? 0.5 : 0; }
        else { out.q = 'bad'; out.debt = { tag: 'unchallenged_assumption', sev: 1 }; }
        break;
      case 'tangent':
        if (action === 'listen') { out.q = 'ok'; out.d.momentum = -0.5; out.d.trust = 0.5; }
        else if (action === 'explain') { out.q = 'good'; out.d.momentum = 0.5; }
        else if (action === 'ask') { out.q = 'bad'; out.d.momentum = -1; out.d.trust = 0.5; }
        else { out.q = 'bad'; out.d.trust = -1; }
        break;
      case 'fact':
        if (action === 'ask') {
          if (!st.subtle || cur > 0 || PP.chance(0.5)) { out.q = 'good'; out.reveal = true; out.d.insight = 1; }
          else { out.q = 'ok'; out.note = 'Your follow-up was a bit generic. They shrug it off.'; }
        } else if (action === 'listen') {
          if (!st.subtle || localTrust >= 7) { out.q = 'good'; out.reveal = true; out.d.insight = 1; }
          else { out.q = 'ok'; out.note = 'They move on before saying more.'; }
        } else { out.q = 'bad'; out.d.trust = action === 'challenge' ? -1 : 0; }
        break;
    }
    return out;
  }

  const REACT = {
    good: ['{c} relaxes a little.', '{c} brightens.', '{c} leans in.', '"Exactly," says {c}.'],
    ok: ['{c} nods.', '{c} carries on.', '"Mm-hm," says {c}.'],
    bad: ["{c}'s smile tightens.", '{c} goes a bit quiet.', '{c} glances at the clock.', '"...Right," says {c}.']
  };

  PP.minigames.conversation = {
    title: 'The Conversation',
    risk: 'missing what actually matters',
    blurb: 'Statements arrive one at a time. Ask, challenge, explain, or keep listening. Some of what matters is said quietly.',
    start(root, ctx, done) {
      const client = ctx.client;
      const script = client.conversation;
      const practice = !!ctx.practice;
      const prep = ctx.prep || 0;
      const per = 8 + prep * 2;
      const ui = PP.mg.shell(root, this.title, this.risk);
      const transcript = h('div', { class: 'conv-log' });
      const btns = h('div', { class: 'mg-actions four' });
      const pitchBtn = h('button', { class: 'btn pitch', onclick: () => pitch(), hidden: true }, 'Pitch the Grand Plan!');
      ui.body.append(
        h('div', { class: 'conv-who' }, PP.ui.avatar ? PP.ui.avatar(client, 36) : null, h('div', null, h('strong', null, client.name), h('div', { class: 'muted small' }, client.title))),
        transcript, h('div', { class: 'pitch-row' }, pitchBtn), btns);
      ACTIONS.forEach((a) => btns.appendChild(h('button', { class: 'btn action', onclick: () => respond(a.id) }, h('kbd', null, a.key), a.label)));
      const onKey = (e) => { const a = ACTIONS.find((x) => x.key === e.key); if (a) { e.preventDefault(); respond(a.id); } };
      document.addEventListener('keydown', onKey);

      let i = -1, timer = null, finished = false, localTrust = ctx.state.res.trust, locked = false;
      const acc = { trust: 0, momentum: 0, insight: 0 };
      const facts = [], missed = [], debts = [], lines = [];
      let pitched = false;

      function next() {
        i++;
        if (i >= script.length) return finish();
        ui.status.textContent = `${i + 1} of ${script.length}`;
        const st = script[i];
        transcript.appendChild(h('div', { class: 'bubble client enter' }, PP.mg.fill(st.text, client)));
        transcript.scrollTop = transcript.scrollHeight;
        pitchBtn.hidden = !st.pitch || pitched;
        locked = false;
        if (timer) timer.stop();
        timer = PP.mg.timer(ui.bar, per, () => respond('listen', true));
      }

      function respond(action, timedOut) {
        if (finished || locked || i < 0 || i >= script.length) return;
        locked = true;
        timer && timer.stop();
        const st = script[i];
        const r = judge(st, action, ctx, localTrust);
        for (const k in r.d) acc[k] += r.d[k];
        localTrust = PP.clamp(localTrust + (r.d.trust || 0), 0, 10);
        if (r.debt) debts.push(r.debt);
        const label = ACTIONS.find((a) => a.id === action).label;
        transcript.appendChild(h('div', { class: 'bubble you' }, timedOut ? '(you keep listening)' : label));
        let fb = PP.mg.fill(PP.pick(REACT[r.q]), client);
        if (r.note) fb = r.note;
        if (st.tag === 'fact') {
          const f = client.facts[st.fact];
          if (r.reveal) { if (!facts.includes(st.fact)) facts.push(st.fact); fb = 'You learned: ' + f.label + '.'; }
          else if (!facts.includes(st.fact) && !missed.includes(st.fact)) missed.push(st.fact);
        }
        if (practice) fb += ' ' + WHY[st.tag][action];
        ui.feedback.textContent = fb;
        ui.feedback.className = 'mg-feedback q-' + (practice || r.reveal ? r.q : 'neutral');
        lines.push({ q: r.q, text: `"${PP.mg.fill(st.text, client).replace(/^"|"$/g, '').slice(0, 70)}${st.text.length > 72 ? '…' : ''}" → ${label}${practice ? ' — ' + WHY[st.tag][action] : ''}` });
        setTimeout(next, timedOut ? 400 : 650);
      }

      function pitch() {
        if (finished || locked) return;
        pitched = true;
        pitchBtn.hidden = true;
        acc.momentum += 1; acc.trust -= 2;
        localTrust = PP.clamp(localTrust - 2, 0, 10);
        debts.push({ tag: 'premature_pitch', sev: 2 });
        transcript.appendChild(h('div', { class: 'bubble you pitchy' }, '"Have you considered... the Grand Plan?"'));
        ui.feedback.textContent = PP.mg.fill('{c} blinks. "Oh. Um. Maybe?"', client);
        ui.feedback.className = 'mg-feedback q-bad';
        lines.push({ q: 'bad', text: 'Pitched the Grand Plan mid-conversation.' });
      }

      function finish() {
        if (finished) return;
        finished = true;
        timer && timer.stop();
        document.removeEventListener('keydown', onKey);
        const remaining = missed.filter((f) => !facts.includes(f));
        const score = lines.reduce((a, l) => a + (l.q === 'good' ? 1 : l.q === 'ok' ? 0.5 : 0), 0);
        const eff = {
          energy: -1,
          // Capped so one bad conversation hurts without ending the run on its own.
          trust: PP.clamp(Math.round(acc.trust), -3, 3),
          momentum: PP.clamp(Math.round(acc.momentum), -2, 2),
          insight: Math.round(acc.insight),
          fact: facts
        };
        if (remaining.length) eff.missed = remaining[0];
        if (debts.length) eff.debt = debts;
        const result = {
          score: Math.round(score * 10) / 10, max: script.length, eff, lines, showDebt: practice,
          passed: ctx.pass != null ? score >= ctx.pass : null,
          headline: facts.length
            ? 'You picked up on: ' + facts.map((f) => client.facts[f].label.toLowerCase()).join('; ') + '.'
            : 'You came away with the facts, but not much underneath them.'
        };
        if (practice && remaining.length) result.lines.push({ q: 'bad', text: 'Slipped past you: ' + remaining.map((f) => client.facts[f].label.toLowerCase()).join('; ') + '.' });
        PP.mg.summary(root, PP.minigames.conversation.title, result, done);
      }

      next();
      return { stop() { finished = true; timer && timer.stop(); document.removeEventListener('keydown', onKey); } };
    }
  };
})(window.PP);
