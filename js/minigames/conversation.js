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

  const ICON = {
    ask: '<path d="M8,9 q0,-5 5,-5 q5,0 5,5 q0,3 -4,4.5 q-1,.5 -1,3" fill="none" stroke="currentColor" stroke-width="3" stroke-linecap="round"/><circle cx="13" cy="21" r="1.8" fill="currentColor"/>',
    challenge: '<path d="M13,4 v11" stroke="currentColor" stroke-width="3.5" stroke-linecap="round"/><circle cx="13" cy="21" r="2" fill="currentColor"/>',
    explain: '<path d="M13,3 a7,7 0 0 1 4,12.7 v2.3 h-8 v-2.3 a7,7 0 0 1 4,-12.7z" fill="none" stroke="currentColor" stroke-width="2.5"/><path d="M10,21 h6 M11,24 h4" stroke="currentColor" stroke-width="2.5" stroke-linecap="round"/>',
    listen: '<path d="M9,10 a6,6 0 1 1 10,4.5 c-2,1.5 -2,3 -3,5 a3,3 0 0 1 -5,-1" fill="none" stroke="currentColor" stroke-width="2.6" stroke-linecap="round"/><path d="M12,10 a2.5,2.5 0 1 1 4,2" fill="none" stroke="currentColor" stroke-width="2.4" stroke-linecap="round"/>'
  };
  const TAGNAME = { emotion: 'a feeling', question: 'a question', misconception: 'a misconception', tangent: 'a tangent', fact: 'something important' };

  PP.minigames.conversation = {
    title: 'The Conversation',
    risk: 'missing what actually matters',
    blurb: 'Your client talks; you respond. Ask, challenge, explain, or keep listening. Watch their face, and catch what matters before it slips past.',
    start(root, ctx, done) {
      const F = PP.fx;
      const client = ctx.client;
      const script = client.conversation;
      const practice = !!ctx.practice;
      const prep = ctx.prep || 0;
      const per = 9 + prep * 2;
      const ui = PP.mg.shell(root, this.title, this.risk);
      let localTrust = ctx.state.res.trust;
      const trustM = F.meter('Trust', 'good'); trustM.set(localTrust, 10);
      const insightC = F.counter('Insights');
      ui.hud.append(trustM.el, insightC.el);

      const face = h('div', { class: 'cv-face' });
      const notebook = h('div', { class: 'cv-notebook', title: 'What you have learned' }, h('span', null, 'Notebook'), h('b', null, '0'));
      const speech = h('div', { class: 'cv-speech' });
      const tagChip = h('div', { class: 'cv-tag' });
      const stage = h('div', { class: 'mg-stage-area cv-stage' },
        h('div', { class: 'cv-portrait' }, face, h('strong', null, client.name), h('span', { class: 'small' }, client.title)),
        h('div', { class: 'cv-right' }, speech, tagChip), notebook);
      const acts = h('div', { class: 'cv-acts' });
      const pitchBtn = h('button', { class: 'btn pitch', hidden: true, onclick: () => pitch() }, 'Pitch the Grand Plan!');
      ACTIONS.forEach((a) => acts.appendChild(h('button', { class: 'cv-act a-' + a.id, onclick: () => respond(a.id) },
        h('span', { class: 'dd-icon', html: `<svg viewBox="0 0 26 26" aria-hidden="true">${ICON[a.id]}</svg>` }), h('span', null, a.label), h('kbd', null, a.key))));
      ui.body.append(stage, h('div', { class: 'pitch-row' }, pitchBtn), acts);
      const onKey = (e) => { const a = ACTIONS.find((x) => x.key === e.key); if (a) { e.preventDefault(); respond(a.id); } };
      document.addEventListener('keydown', onKey);

      let i = -1, timer = null, finished = false, locked = false, typeT = null, pitched = false;
      const acc = { trust: 0, momentum: 0, insight: 0 };
      const facts = [], missed = [], debts = [], lines = [];
      const baseMood = () => Math.max(-2, Math.min(2, Math.round((localTrust - 5) / 2)));
      const setFace = (m, surprised) => { face.innerHTML = PP.art.face({ mood: m, hue: client.hue, surprised }); };
      setFace(baseMood());

      function type(text) {
        clearInterval(typeT);
        speech.textContent = '';
        let k = 0;
        typeT = setInterval(() => { k += 2; speech.textContent = text.slice(0, k); if (k >= text.length) clearInterval(typeT); }, 18);
      }
      function next() {
        i++;
        if (i >= script.length) return finish();
        ui.status.textContent = `${i + 1} of ${script.length}`;
        const st = script[i];
        tagChip.textContent = '';
        speech.className = 'cv-speech enter';
        type(PP.mg.fill(st.text, client));
        setFace(baseMood());
        pitchBtn.hidden = !st.pitch || pitched;
        locked = false;
        acts.querySelectorAll('button').forEach((b) => (b.disabled = false));
        if (timer) timer.stop();
        timer = PP.mg.timer(ui.bar, per, () => respond('listen', true));
      }
      function respond(action, timedOut) {
        if (finished || locked || i < 0 || i >= script.length) return;
        locked = true;
        clearInterval(typeT);
        timer && timer.stop();
        acts.querySelectorAll('button').forEach((b) => (b.disabled = true));
        const st = script[i];
        const r = judge(st, action, ctx, localTrust);
        for (const k in r.d) acc[k] += r.d[k];
        const dT = r.d.trust || 0;
        localTrust = PP.clamp(localTrust + dT, 0, 10);
        trustM.set(localTrust, 10);
        if (r.debt) debts.push(r.debt);
        const btn = acts.querySelector('.a-' + action);
        if (btn) F.glow(btn, r.q === 'bad' ? 'bad' : 'good');
        // The face reacts right away
        setFace(r.q === 'good' ? 2 : r.q === 'bad' ? -2 : 0);
        if (dT) F.popOn(stage, face, (dT > 0 ? '+' : '') + dT + ' Trust', dT > 0 ? 'good' : 'bad');
        else F.popOn(stage, face, r.q === 'good' ? 'Nice' : r.q === 'bad' ? 'Hmm.' : timedOut ? '(you listen)' : 'Okay', r.q === 'good' ? 'good' : r.q === 'bad' ? 'bad' : 'meh');
        F.sfx(r.q === 'good' ? 'good' : r.q === 'bad' ? 'bad' : 'meh');
        if (r.q === 'bad') F.shake(face);
        tagChip.textContent = 'That was ' + TAGNAME[st.tag] + '.' + (practice ? ' ' + WHY[st.tag][action] : '');
        let fb = r.note || PP.mg.fill(PP.pick(REACT[r.q]), client);
        if (st.tag === 'fact') {
          const f = client.facts[st.fact];
          if (r.reveal && !facts.includes(st.fact)) {
            facts.push(st.fact);
            insightC.set(facts.length);
            notebook.querySelector('b').textContent = String(facts.length);
            const card = h('div', { class: 'cv-fact' }, f.label);
            stage.appendChild(card);
            setTimeout(() => { F.fly(card, notebook, stage, () => { F.bump(notebook); F.burstOn(stage, notebook, 'great', 12); }); card.remove(); F.sfx('coin'); }, 550);
            fb = 'You learned: ' + f.label + '.';
          } else if (!r.reveal && !facts.includes(st.fact) && !missed.includes(st.fact)) { missed.push(st.fact); F.popOn(stage, speech, 'Something slipped past…', 'bad'); }
        }
        ui.feedback.textContent = fb;
        ui.feedback.className = 'mg-feedback q-' + r.q;
        const label = ACTIONS.find((a) => a.id === action).label;
        lines.push({ q: r.q, text: `"${PP.mg.fill(st.text, client).replace(/^"|"$/g, '').slice(0, 70)}${st.text.length > 72 ? '…' : ''}" → ${timedOut ? 'kept listening' : label} (${TAGNAME[st.tag]})` });
        setTimeout(next, 1300);
      }
      function pitch() {
        if (finished || locked) return;
        pitched = true;
        pitchBtn.hidden = true;
        acc.momentum += 1; acc.trust -= 2;
        localTrust = PP.clamp(localTrust - 2, 0, 10); trustM.set(localTrust, 10);
        debts.push({ tag: 'premature_pitch', sev: 2 });
        setFace(-1, true); F.popOn(stage, face, '−2 Trust', 'bad'); F.sfx('bad'); F.shake(face);
        ui.feedback.textContent = PP.mg.fill('{c} blinks. "Oh. Um. Maybe?"', client);
        ui.feedback.className = 'mg-feedback q-bad';
        lines.push({ q: 'bad', text: 'Pitched the Grand Plan mid-conversation.' });
      }
      function finish() {
        if (finished) return;
        finished = true;
        timer && timer.stop(); clearInterval(typeT);
        document.removeEventListener('keydown', onKey);
        const remaining = missed.filter((f) => !facts.includes(f));
        const score = lines.reduce((a, l) => a + (l.q === 'good' ? 1 : l.q === 'ok' ? 0.5 : 0), 0);
        const eff = { energy: -1, trust: PP.clamp(Math.round(acc.trust), -3, 3), momentum: PP.clamp(Math.round(acc.momentum), -2, 2), insight: Math.round(acc.insight), fact: facts };
        if (remaining.length) eff.missed = remaining[0];
        if (debts.length) eff.debt = debts;
        const result = {
          score: Math.round(score * 10) / 10, max: script.length, eff, lines, showDebt: practice,
          passed: ctx.pass != null ? score >= ctx.pass : null,
          headline: facts.length ? 'You picked up on: ' + facts.map((f) => client.facts[f].label.toLowerCase()).join('; ') + '.' : 'You came away with the facts, but not much underneath them.'
        };
        if (remaining.length) result.lines.push({ q: 'bad', text: 'Slipped past you: ' + remaining.map((f) => client.facts[f].label.toLowerCase()).join('; ') + '.' });
        PP.mg.summary(root, PP.minigames.conversation.title, result, done);
      }
      next();
      return { stop() { finished = true; timer && timer.stop(); clearInterval(typeT); document.removeEventListener('keydown', onKey); } };
    }
  };
})(window.PP);
