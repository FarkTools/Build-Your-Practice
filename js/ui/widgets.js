/* Shared UI pieces: avatars, resource gauges, effect chips, and the event scene runner.
 * The scene runner is used by the journey and by the Element Lab's event deck. */
(function (PP) {
  const h = PP.h;
  const KIND = { through: 'Go through', around: 'Go around', prepare: 'Prepare', help: 'Get help' };
  PP.ui.KIND = KIND;

  PP.ui.avatar = function (client, size = 44) {
    let n = client.hue || 0;
    for (const ch of client.name) n = (n * 31 + ch.charCodeAt(0)) % 9973;
    return h('span', { class: 'avatar face', style: { width: size + 'px', height: size + 'px' }, 'aria-hidden': 'true', html: PP.art ? PP.art.face({ mood: 1, hue: n }) : '' });
  };

  PP.ui.gauges = function (s, prevRes) {
    return h('div', { class: 'gauges' }, PP.RES.map((r) => {
      const v = s.res[r.id];
      const d = prevRes ? v - prevRes[r.id] : 0;
      return h('div', { class: 'gauge g-' + r.id, title: r.blurb },
        h('div', { class: 'gauge-top' }, h('span', { class: 'gauge-label' }, r.label), h('span', { class: 'gauge-num' }, String(v), d ? h('span', { class: 'gauge-delta ' + (d > 0 ? 'up' : 'down') }, (d > 0 ? '+' : '') + d) : null)),
        h('div', { class: 'gauge-track' }, h('div', { class: 'gauge-fill', style: { width: v * 10 + '%' } }),
          ...Array.from({ length: 9 }, (_, i) => h('span', { class: 'tick', style: { left: (i + 1) * 10 + '%' } }))));
    }));
  };

  /* Turn an effect object into readable chips. Debt is hidden unless asked. */
  PP.ui.effectChips = function (eff, opts = {}) {
    if (!eff) return null;
    const chips = [];
    PP.RES.forEach((r) => {
      const v = eff[r.id];
      if (v) chips.push(h('span', { class: `chip c-${r.id} ${v > 0 ? 'up' : 'down'}` }, `${v > 0 ? '+' : ''}${v} ${r.label}`));
    });
    if (eff.fact && !opts.hideFacts) {
      const facts = [].concat(eff.fact).filter(Boolean);
      if (facts.length) chips.push(h('span', { class: 'chip c-fact' }, facts.length === 1 && opts.client && opts.client.facts[facts[0]] ? 'Learn: ' + opts.client.facts[facts[0]].label : `Learn ${facts.length > 1 ? facts.length + ' things' : 'something'} about the client`));
    }
    if (eff.skill) Object.keys(eff.skill).forEach((k) => chips.push(h('span', { class: 'chip c-skill' }, '+ ' + PP.SKILLS.find((x) => x.id === k).label)));
    if (eff.reveal) chips.push(h('span', { class: 'chip c-fact' }, 'Reveal the map'));
    if (eff.cash) chips.push(h('span', { class: 'chip ' + (eff.cash > 0 ? 'up' : 'down') }, (eff.cash > 0 ? '+' : '') + PP.career.money(eff.cash)));
    if (eff.days) chips.push(h('span', { class: 'chip down' }, `${eff.days} day${eff.days > 1 ? 's' : ''} pass`));
    if (eff.item) chips.push(h('span', { class: 'chip c-skill' }, 'Pack: ' + PP.content.items[eff.item].name));
    if (eff.style && opts.showStyle) Object.keys(eff.style).forEach((k) => { if (eff.style[k] > 0) chips.push(h('span', { class: 'chip c-style' }, PP.STYLE.find((x) => x.id === k).label)); });
    if (eff.clearDebt && !opts.hideDebt) chips.push(h('span', { class: 'chip c-good' }, 'Clears a risk'));
    if (eff.debt && !opts.hideDebt) [].concat(eff.debt).forEach((d) => chips.push(h('span', { class: 'chip c-debt' }, `Hidden risk: ${PP.content.debts[d.tag].label.toLowerCase()} (${'●'.repeat(d.sev)})`)));
    if (eff.missed && !opts.hideDebt) chips.push(h('span', { class: 'chip c-debt' }, 'Something slips past you'));
    if (!chips.length) chips.push(h('span', { class: 'chip neutral' }, 'No visible change'));
    return h('div', { class: 'chips' }, chips);
  };

  /* Run one event in `host`. ctx: { state, onDone(choice), lab } */
  PP.ui.runScene = function (host, ev, ctx) {
    const s = ctx.state;
    host.innerHTML = '';
    const text = PP.val(ev.text, s);
    const where = ev.debt ? 'Risk debt comes due' : ev.at && ev.at[0] !== 'travel' && PP.content.nodes[s.map.current] ? PP.content.nodes[s.map.current].name : `On the trail · Day ${s.day || 1}`;
    const skeptic = s.skepticActive;
    const judgment = PP.skill(s, 'judgment');
    const choices = (ev.choices || []).filter((c) => !c.show || c.show(s));

    // Olu's checklist quietly prevents a debt from landing
    if (ev.debt && PP.hasItem(s, 'checklist')) choices.push({ label: "Use Olu's checklist", kind: 'help', item: 'checklist', debtRescue: true, preview: 'The checklist catches it in time.' });

    const card = h('div', { class: 'scene' + (ev.debt ? ' scene-debt' : '') },
      h('div', { class: 'eyebrow' }, where),
      h('h3', { class: 'scene-title' }, ev.title),
      h('p', { class: 'scene-text' }, text),
      ev.sub ? h('p', { class: 'scene-sub' }, ev.sub) : null,
      skeptic ? h('p', { class: 'skeptic-note' }, 'Gus leans over your shoulder: "Here\'s what each of these really costs."') : null,
      h('div', { class: 'choices' }, choices.map((c) => {
        let preview = null;
        if (skeptic || ctx.lab) {
          if (c.preview) preview = h('div', { class: 'chips' }, h('span', { class: 'chip neutral' }, c.preview));
          else if (c.minigame) preview = h('div', { class: 'chips' }, h('span', { class: 'chip neutral' }, 'Outcome depends on how you play'));
          else preview = PP.ui.effectChips(PP.val(c.eff, s), { client: s.client, showStyle: true });
        }
        return h('button', { class: 'choice k-' + c.kind, onclick: () => pick(c) },
          h('span', { class: 'kind' }, KIND[c.kind] || c.kind),
          h('span', { class: 'choice-label' }, c.label, c.contact ? h('span', { class: 'tag' }, 'uses ' + PP.content.contacts[c.contact].who) : null, c.item ? h('span', { class: 'tag' }, 'uses item') : null),
          judgment && c.hint && !preview ? h('span', { class: 'hint' }, c.hint) : null,
          preview);
      })));
    host.appendChild(card);
    const first = card.querySelector('.choice');
    if (first && !ctx.noFocus) first.focus({ preventScroll: true });

    function pick(c) {
      if (c.contact) PP.useContact(s, c.contact);
      if (c.item) PP.useItem(s, c.item);
      if (skeptic) { s.skepticActive = false; }
      s.seenEvents[ev.id] = true;
      if (s.career) { s.career.evSeen = s.career.evSeen || {}; s.career.evSeen[ev.id] = (s.career.evSeen[ev.id] || 0) + 1; }
      const before = Object.assign({}, s.res);

      if (ev.debt) return resolveDebt(c, before);
      if (c.minigame) {
        const mg = PP.minigames[c.minigame];
        host.innerHTML = '';
        const stage = h('div', { class: 'scene mg-stage' });
        host.appendChild(stage);
        ctx.onMinigame && ctx.onMinigame(true);
        mg.start(stage, { state: s, client: s.client, prep: PP.skill(s, 'preparation'), practice: !!ctx.lab }, (res) => {
          ctx.onMinigame && ctx.onMinigame(false);
          const notes = PP.apply(s, res.eff, mg.title);
          PP.apply(s, c.eff, ev.title);
          PP.log(s, `${ev.title}: played ${mg.title} (${res.score}/${res.max}).`, 'choice');
          showResult(PP.val(c.result, s), before, res.eff, c);
        });
        return;
      }
      const eff = PP.val(c.eff, s);
      PP.apply(s, eff, ev.title);
      if (ev.onResolve) ev.onResolve(c);
      PP.log(s, `${ev.title}: ${c.label}.`, 'choice');
      if (c.then) {
        // The conversation continues: same event, next beat.
        const said = h('div', { class: 'said' }, '› ' + c.label);
        const firstKind = ctx.firstKind || c.kind;
        PP.ui.runScene(host, { id: ev.id, title: ev.title, at: ev.at, text: c.then.text, choices: c.then.choices, cont: true }, Object.assign({}, ctx, { firstKind }));
        host.querySelector('.scene').insertBefore(said, host.querySelector('.scene-text'));
        ctx.onStep && ctx.onStep();
        return;
      }
      showResult(PP.val(c.result, s), before, eff, c);
    }

    function resolveDebt(c, before) {
      const d = ev.debt, def = PP.content.debts[d.tag];
      let outcome, text, eff = null;
      if (c.debtRescue) { outcome = 'rescued'; text = c.item ? "The checklist had a line for exactly this. Crisis avoided." : 'Olu makes two calls and fills in one form. It is as if it never happened.'; }
      else {
        outcome = PP.rollDebt(s, d);
        if (outcome === 'harmless') text = def.harmless;
        else { text = def[outcome].text; eff = def[outcome].eff; }
      }
      PP.apply(s, eff, 'risk debt');
      PP.settleDebt(s, d, outcome, c.debtRescue ? (c.item ? 'checklist' : 'Olu') : 'came due');
      PP.log(s, `Risk debt (${def.label.toLowerCase()}): ${outcome}.`, 'debt');
      showResult(text, before, eff, c, outcome);
    }

    function showResult(text, before, eff, c, outcome) {
      host.innerHTML = '';
      const after = s.res;
      const delta = {};
      PP.RES.forEach((r) => { if (after[r.id] !== before[r.id]) delta[r.id] = after[r.id] - before[r.id]; });
      const learned = eff && eff.fact ? [].concat(eff.fact).filter((f) => s.facts[f] != null && s.facts[f] === s.turn) : [];
      const res = h('div', { class: 'scene scene-result' + (outcome ? ' out-' + outcome : '') },
        h('div', { class: 'eyebrow' }, outcome ? 'Outcome: ' + outcome : 'You chose: ' + c.label),
        h('p', { class: 'scene-text' }, text || 'Done.'),
        PP.ui.effectChips(Object.assign({}, delta, { fact: learned, days: eff && eff.days, item: eff && eff.item, skill: eff && eff.skill, cash: eff && eff.cash }), { client: s.client, hideDebt: !ctx.lab }),
        ctx.lab && eff && (eff.debt || eff.missed || eff.style) ? h('div', { class: 'lab-reveal' }, h('span', { class: 'eyebrow' }, 'Hidden from the player'), PP.ui.effectChips({ debt: eff.debt, missed: eff.missed, style: eff.style }, { showStyle: true })) : null,
        h('button', { class: 'btn primary', onclick: () => ctx.onDone && ctx.onDone(ctx.firstKind ? Object.assign({}, c, { kind: ctx.firstKind }) : c) }, 'Continue'));
      host.appendChild(res);
      res.querySelector('.btn').focus({ preventScroll: true });
    }
  };
})(window.PP);
