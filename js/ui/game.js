/* Game shell: intro -> (career) -> Port Prospect -> pack -> the trail -> journey report -> port again.
 * The career (savings, book of clients, skills, contacts) carries across journeys. */
(function (PP) {
  const h = PP.h;
  const G = (PP.game = { s: null, career: null, root: null });
  const money = (n) => PP.career.money(n);

  PP.ui.mountGame = function (root) { G.root = root; intro(); };

  function screen(...kids) {
    G.root.innerHTML = '';
    kids.forEach((k) => k && G.root.appendChild(k));
    window.scrollTo({ top: 0 });
  }

  /* ---------------- Intro ---------------- */
  function intro() {
    const saved = PP.career.load();
    screen(h('section', { class: 'intro' },
      h('div', { class: 'intro-copy' },
        h('div', { class: 'eyebrow' }, 'A light adventure about learning client work'),
        h('h1', { class: 'display' }, 'Port Prospect'),
        h('p', { class: 'lede' }, 'You are a new agent with a little savings, a lot of enthusiasm, and no idea what lies beyond the harbor. Guide clients across the territory to where they actually need to go. Build a practice that pays the bills before the money runs out.'),
        ladder(saved ? PP.career.level(saved) : 'survivable', true),
        h('div', { class: 'row' },
          saved ? h('button', { class: 'btn primary big', onclick: () => { G.career = saved; newJourney(); } }, `Continue your career (journey ${saved.journeys + 1})`) : null,
          h('button', { class: 'btn ' + (saved ? 'ghost' : 'primary big'), onclick: () => { G.career = PP.newCareer(); PP.career.save(G.career); newJourney(); } }, saved ? 'Start a new career' : 'Start your career')),
        saved ? h('p', { class: 'small muted' }, `Saved: ${money(saved.savings)} in savings, ${saved.book.filter((b) => b.perDay > 0).length} paying client${saved.book.filter((b) => b.perDay > 0).length === 1 ? '' : 's'}.`) : null),
      h('div', { class: 'intro-map', id: 'intro-map' })));
    const demo = PP.newState();
    demo.map.beam = true;
    PP.ui.renderMap(document.getElementById('intro-map'), demo, {});
  }

  /* The four practice levels, as a ladder. */
  function ladder(current, compact) {
    const levels = PP.content.practice.levels;
    const idx = levels.findIndex((l) => l.id === current);
    return h('ol', { class: 'ladder' + (compact ? ' compact' : '') }, levels.map((l, i) => h('li', { class: (i === idx ? 'now ' : '') + (i < idx ? 'past ' : '') + 'l-' + l.id },
      h('strong', null, l.label), compact ? null : h('span', { class: 'small' }, l.blurb))));
  }

  function practicePanel(c) {
    const inc = PP.career.income(c), cost = PP.content.practice.dailyCost, runway = PP.career.runway(c);
    const lvl = PP.career.level(c);
    const next = lvl === 'survivable' ? `Reach ${money(cost)}/day from your book to be Sustainable.` : lvl === 'sustainable' ? `Reach ${money(cost * 2)}/day to be Profitable.` : 'You made it. Everything from here is a bonus.';
    return h('div', { class: 'panel practice' },
      h('div', { class: 'practice-top' },
        h('div', null, h('div', { class: 'eyebrow' }, 'Your practice · journey ' + (c.journeys + 1)), h('h3', null, PP.career.levelInfo(c).label)),
        h('div', { class: 'practice-nums' },
          stat('Savings', money(c.savings)),
          stat('Book income', money(inc) + '/day'),
          stat('Living costs', money(cost) + '/day'),
          stat('Runway', runway === Infinity ? 'Covered' : runway + ' days'))),
      ladder(lvl),
      h('p', { class: 'small' }, next),
      c.book.length ? h('details', { class: 'book' }, h('summary', null, `Your book (${c.book.length})`),
        h('ul', null, c.book.map((b) => h('li', { class: 'b-' + b.status }, h('strong', null, b.name), ` · journey ${b.journey} · `, bookStatus(b))))) : null);
  }
  const stat = (k, v) => h('div', { class: 'stat' }, h('span', { class: 'lk' }, k), h('strong', null, v));
  function bookStatus(b) {
    return { life: `client for life, ${money(b.perDay)}/day`, steady: `steady, ${money(b.perDay)}/day`, 'at-risk': 'paid once; might cancel', door: '"not yet"; door open', lost: 'lost', cancelled: 'cancelled (clawed back)' }[b.status] || b.status;
  }

  /* ---------------- A new journey ---------------- */
  function newJourney() {
    const c = G.career;
    const s = PP.newState();
    s.career = c;
    s.skills = c.skills; s.contacts = c.contacts; s.met = c.met; s.quests = c.quests;
    s.trail = ['port'];
    G.s = s;
    if (c.referral) { arrive(true); }
    port();
  }

  /* ---------------- Port ---------------- */
  function port(flash) {
    const s = G.s, c = G.career;
    const need = c.journeys === 0 ? 2 : 1;
    const waiting = !!s.client;
    const contactsBox = h('div', { class: 'panel' },
      h('div', { class: 'panel-head' }, h('h3', null, 'Your contacts'), h('span', { class: 'muted small' }, `${s.contacts.length} / ${PP.contactSlots(s)} slots`)),
      s.contacts.length ? h('ul', { class: 'contact-list' }, s.contacts.map((id) => {
        const ct = PP.content.contacts[id];
        return h('li', null, h('div', null, h('strong', null, ct.name), ' · ', ct.who, h('div', { class: 'small muted' }, ct.ability)),
          h('button', { class: 'btn ghost small', onclick: () => { const i = s.contacts.indexOf(id); s.contacts.splice(i, 1); port(); } }, 'Drop'));
      })) : h('p', { class: 'muted small' }, 'Nobody yet. Talk to people, then put them on call. Slots are limited, and your contacts stay with you from journey to journey.'));

    const prospect = waiting
      ? h('div', { class: 'prospect arrived' },
        PP.ui.avatar(s.client, 52),
        h('div', null, h('div', { class: 'eyebrow' }, s.warm ? 'A warm referral has arrived' : 'A prospect has arrived'), h('h3', null, `${s.client.name}, ${s.client.title.toLowerCase()}`), h('p', null, s.client.opener),
          h('p', { class: 'small muted' }, `${s.client.name} is waiting on the bench. Each extra thing you do here costs a day (${money(PP.content.practice.dailyCost)}) and 1 Momentum.`)),
        h('button', { class: 'btn primary big', onclick: packScreen }, 'Head out'))
      : h('div', { class: 'prospect' }, h('div', { class: 'eyebrow' }, 'No client yet'),
        h('p', null, `Someone usually turns up soon. ${Math.max(0, need - s.portActions)} more thing${need - s.portActions === 1 ? '' : 's'} to do before then. Each thing here takes a day.`),
        h('button', { class: 'btn ghost small', onclick: () => portAction(() => PP.log(s, 'Waited by the dock.')) }, 'Wait by the dock'));

    screen(h('section', { class: 'port' },
      h('header', { class: 'screen-head' }, h('div', null, h('div', { class: 'eyebrow' }, 'Prepare'), h('h2', { class: 'display-sm' }, 'Port Prospect')),
        h('p', { class: 'muted' }, 'Talk to people, practice, and choose who to keep on call. Skills and contacts stay with you for your whole career.')),
      practicePanel(c),
      flash ? h('div', { class: 'flash', role: 'status' }, flash) : null,
      prospect,
      h('div', { class: 'port-grid' }, h('div', { class: 'npc-grid' }, PP.content.npcs.map(npcCard)), h('aside', { class: 'port-side' }, contactsBox, h('div', { class: 'panel' }, h('h3', null, 'Skills'), skillList(s))))));
  }

  function npcCard(n) {
    const s = G.s;
    const met = s.met[n.id];
    const q = n.quest && s.quests[n.quest.id];
    const ct = PP.content.contacts[n.contact];
    const canRecruit = (met || q === 'done') && !s.contacts.includes(n.contact);
    const full = s.contacts.length >= PP.contactSlots(s);
    return h('article', { class: 'npc' },
      h('div', { class: 'npc-head' }, h('span', { class: 'npc-mark', 'aria-hidden': 'true' }, n.name[0]), h('div', null, h('h3', null, n.name), h('div', { class: 'small muted' }, n.role))),
      h('p', { class: 'npc-greet' }, n.greet),
      h('div', { class: 'npc-actions' },
        n.talk ? h('button', { class: 'btn', disabled: met, onclick: () => portAction(() => { s.met[n.id] = true; PP.apply(s, n.talk.eff); }, n.talk.text + ' ' + skillGain(n.talk.eff)) }, met ? 'Talked ✓' : n.talk.label) : null,
        n.quest ? h('button', { class: 'btn', disabled: q === 'done', onclick: () => runQuest(n) }, q === 'done' ? 'Practice passed ✓' : n.quest.label + (q === 'failed' ? ' (retry)' : '')) : null,
        canRecruit ? h('button', { class: 'btn accent', disabled: full, title: full ? 'Your contact slots are full. Drop someone first.' : '', onclick: () => { s.contacts.push(n.contact); port(`${n.name} is on call as ${ct.name}.`); } }, full ? 'Slots full' : `Put ${n.name.split(' ').slice(-1)[0] === 'Okafor' ? 'Dev' : n.name} on call`) : null,
        s.contacts.includes(n.contact) ? h('span', { class: 'pill good' }, 'On call') : null),
      h('p', { class: 'small muted npc-ability' }, h('strong', null, ct.name + ': '), ct.ability, !met && !n.talk && !q ? ' (pass the practice to recruit)' : ''));
  }

  function skillGain(eff) {
    if (!eff || !eff.skill) return '';
    return '(+1 ' + Object.keys(eff.skill).map((k) => PP.SKILLS.find((x) => x.id === k).label).join(', ') + ')';
  }

  function portAction(fn, flash) {
    const s = G.s, c = G.career;
    fn();
    s.portActions++;
    PP.career.tickDay(c);
    flash = (flash ? flash + ' ' : '') + `(A day passes: ${money(-PP.content.practice.dailyCost + PP.career.income(c))}.)`;
    if (c.savings < 0) return journeyEnd('broke');
    if (s.client) {
      PP.apply(s, PP.content.portRules.waitingCost);
      flash += ` ${s.client.name} checks the time. (−1 Momentum)`;
    } else if (s.portActions >= (c.journeys === 0 ? 2 : 1)) {
      arrive();
      flash += ' Someone just walked into the harbor office.';
    }
    PP.career.save(c);
    port(flash);
  }

  /* Pick the next client. Repeat archetypes get a new name so every client is someone new. */
  const ALT = { taylor: ['Jamie', 'Alex', 'Robin'], morgan: ['Sam', 'Dana', 'Quinn'], rosa: ['Lena', 'Marisol', 'Bea'] };
  function arrive(warm) {
    const s = G.s, c = G.career;
    const ids = Object.keys(PP.content.clients);
    const id = s.nextClient || PP.pick(ids.filter((x) => x !== c.lastClient));
    let client = PP.content.clients[id];
    const used = c.history.filter((x) => x.clientId === id).length;
    if (used > 0) {
      const name = ALT[id][(used - 1) % ALT[id].length];
      client = JSON.parse(JSON.stringify(client).split(client.name).join(name));
      client.checkin = JSON.parse(JSON.stringify(PP.content.clients[id].checkin).split(PP.content.clients[id].name).join(name));
    }
    s.client = client;
    c.lastClient = id;
    if (warm) { s.warm = true; c.referral = false; PP.apply(s, { trust: 2 }); }
  }

  function runQuest(n) {
    const s = G.s;
    const q = n.quest;
    const mg = PP.minigames[q.minigame];
    const overlay = h('div', { class: 'overlay', role: 'dialog', 'aria-modal': 'true', 'aria-label': q.label });
    const stage = h('div', { class: 'overlay-card' });
    overlay.appendChild(stage);
    stage.appendChild(h('div', { class: 'scene' }, h('div', { class: 'eyebrow' }, n.name + ' · practice'), h('h3', { class: 'scene-title' }, q.label.replace('Practice: ', '')), h('p', { class: 'scene-text' }, q.text), h('p', { class: 'small muted' }, mg.blurb + ` Pass mark: ${q.pass}.`),
      h('div', { class: 'row' }, h('button', { class: 'btn primary', onclick: go }, 'Start'), h('button', { class: 'btn ghost', onclick: () => overlay.remove() }, 'Not now'))));
    document.body.appendChild(overlay);
    overlay.querySelector('.btn').focus();
    function go() {
      stage.innerHTML = '';
      const inner = h('div', { class: 'scene mg-stage' });
      stage.appendChild(inner);
      const client = q.minigame === 'conversation' ? PP.content.practiceClient : (s.client || PP.content.clients.taylor);
      mg.start(inner, { state: s, client, prep: PP.skill(s, 'preparation'), practice: true, pass: q.pass }, (res) => {
        overlay.remove();
        portAction(() => {
          s.met[n.id] = true;
          if (res.passed) { s.quests[q.id] = 'done'; PP.apply(s, q.reward); } else s.quests[q.id] = 'failed';
        }, res.passed ? `Passed! ${skillGain(q.reward)} ${n.name} can now be put on call.` : `Not quite (${res.score}/${res.max}). You can try again.`);
      });
    }
  }

  function skillList(s) {
    return h('ul', { class: 'skill-list' }, PP.SKILLS.map((k) => h('li', { class: s.skills[k.id] ? 'has' : '' },
      h('span', { class: 'pips', 'aria-label': `level ${s.skills[k.id]} of 2` }, h('i', { class: s.skills[k.id] >= 1 ? 'on' : '' }), h('i', { class: s.skills[k.id] >= 2 ? 'on' : '' })),
      h('span', null, h('strong', null, k.label), h('span', { class: 'small muted' }, ' ' + k.blurb)))));
  }

  /* ---------------- Pack ---------------- */
  function packScreen() {
    const s = G.s;
    const chosen = new Set();
    const go = h('button', { class: 'btn primary big', disabled: true, onclick: () => { s.pack = [...chosen]; startJourney(); } }, `Choose ${PP.content.packSize}`);
    const list = h('div', { class: 'pack-grid' }, Object.entries(PP.content.items).map(([id, it]) => h('button', { class: 'pack-item', 'aria-pressed': 'false', 'data-id': id, onclick: () => {
      if (chosen.has(id)) chosen.delete(id); else if (chosen.size < PP.content.packSize) chosen.add(id);
      list.querySelectorAll('.pack-item').forEach((el) => el.setAttribute('aria-pressed', chosen.has(el.dataset.id) ? 'true' : 'false'));
      go.disabled = chosen.size !== PP.content.packSize;
      go.textContent = chosen.size === PP.content.packSize ? 'Set out on the trail' : `Choose ${PP.content.packSize - chosen.size} more`;
    } }, h('strong', null, it.name), h('span', { class: 'small' }, it.blurb))));
    screen(h('section', { class: 'pack' },
      h('header', { class: 'screen-head' }, h('div', null, h('div', { class: 'eyebrow' }, 'Before you go'), h('h2', { class: 'display-sm' }, 'Load the wagon')), h('p', { class: 'muted' }, `You can carry ${PP.content.packSize} things.`)),
      list, h('div', { class: 'row' }, go, h('button', { class: 'btn ghost', onclick: () => port() }, 'Back to the port'))));
  }

  function startJourney() {
    const s = G.s;
    s.phase = 'journey';
    s.contacts.forEach((id) => (s.contactUses[id] = 1 + (PP.skill(s, 'resourcefulness') > 0 ? 1 : 0)));
    if (s.pack.includes('cards')) { PP.apply(s, { trust: 1 }); PP.useItem(s, 'cards'); }
    G.root.innerHTML = '';
    PP.ui.startTrail(G.root, s, { onEnd: journeyEnd });
  }

  /* ---------------- Journey report ---------------- */
  function journeyEnd(kind, reckoned) {
    const s = G.s, c = G.career, cl = s.client;
    s.phase = 'end';
    const levelBefore = PP.career.level(Object.assign({}, c, { savings: Math.max(0, c.savings) }));
    let fit = null, pts = 0, pay = null;
    if (kind === 'landed') {
      fit = cl.fit[s.destination] || 'poor';
      if (s.destination === 'not_now' && s.res.trust < 6) fit = 'poor';
      pts += fit === 'appropriate' ? 3 : fit === 'acceptable' ? 2 : 0;
      pts += s.res.trust >= 7 ? 2 : s.res.trust >= 4 ? 1 : 0;
      pts += s.settled.some((d) => d.outcome === 'costly') ? 0 : 1;
      pts += s.res.insight >= 6 ? 1 : 0;
      pay = PP.content.practice.payout(s, s.destination, fit);
      c.savings += pay.now;
      c.book.push({ id: PP.uid('b'), clientId: cl.id, name: cl.name, status: pay.status, perDay: pay.perDay, journey: c.journeys + 1 });
      if (pay.referral) c.referral = true;
    }
    if (kind !== 'broke') {
      c.journeys++;
      c.history.push({ journey: c.journeys, clientId: cl.id, client: cl.name, outcome: kind === 'landed' ? PP.content.destinations[s.destination].name : kind, fit, cash: pay ? pay.now : 0 });
    }
    const broke = kind === 'broke' || c.savings < 0;
    if (broke) c.over = true;
    const levelAfter = PP.career.level(c);
    const firstProfitable = levelAfter === 'profitable' && c.bestLevel !== 'profitable';
    if (levelAfter === 'profitable' || (levelAfter === 'sustainable' && c.bestLevel === 'survivable')) c.bestLevel = levelAfter;
    if (broke) PP.career.clear(); else PP.career.save(c);

    if (broke) return unemployed();

    const rating = kind !== 'landed' ? (kind === 'walked' ? 'The client found another guide' : 'The trail went cold')
      : pts >= 6 ? 'Trusted Guide' : pts >= 4 ? 'Steady Navigator' : pts >= 2 ? 'Got There, Eventually' : 'Lost at Sea';
    const why = kind === 'walked' ? `${cl.name} stopped talking to you. Trust ran out before the trail did.`
      : kind === 'stalled' ? `Everything slowed down until nothing was moving. ${cl.name} decided to "revisit this next year."`
        : fitText(s, fit);
    const shortcuts = s.settled.concat(s.debt.map((d) => Object.assign({}, d, { outcome: 'never came due' })));
    const unknown = Object.keys(cl.facts).filter((f) => s.facts[f] == null);
    const lvlInfo = PP.career.levelInfo(c);

    screen(h('section', { class: 'ending' },
      h('header', { class: 'ending-head' },
        h('div', { class: 'eyebrow' }, `Journey ${c.journeys} · ${kind === 'landed' ? PP.content.destinations[s.destination].name : 'journey over'} · ${s.day} days`),
        h('h2', { class: 'display' }, firstProfitable ? 'Profitable!' : rating),
        kind === 'landed' ? h('div', { class: 'stars', 'aria-label': `${pts} of 7` }, Array.from({ length: 7 }, (_, i) => h('span', { class: i < pts ? 'on' : '' }))) : null,
        h('p', { class: 'lede' }, firstProfitable ? `Your book now pays twice your living costs. You did it. ${why}` : why),
        h('div', { class: 'row' },
          h('button', { class: 'btn primary big', onclick: newJourney }, 'Back to Port Prospect for your next client'),
          h('button', { class: 'btn ghost', onclick: intro }, 'Title screen'))),
      h('div', { class: 'panel payday' },
        h('div', { class: 'eyebrow' }, 'What this journey did for your practice'),
        h('div', { class: 'practice-nums' },
          stat('Commission', pay ? money(pay.now) : '$0'),
          stat('Added to your book', pay && pay.perDay ? money(pay.perDay) + '/day' : 'nothing'),
          stat('Savings now', money(c.savings)),
          stat('Level', levelBefore !== levelAfter ? `${PP.content.practice.levels.find((l) => l.id === levelBefore).label} → ${lvlInfo.label}` : lvlInfo.label)),
        pay ? h('p', null, pay.note) : h('p', null, 'No sale, nothing added to your book. The days on the trail still cost money.'),
        pay && pay.status === 'at-risk' ? h('p', { class: 'small warn' }, `Heads up: this one may cancel during a later journey, and ${money(PP.content.practice.clawback)} would be clawed back.`) : null,
        pay && pay.referral ? h('p', { class: 'small good-text' }, 'They are sending a friend your way. Your next prospect arrives warm (+2 Trust).') : null,
        ladder(levelAfter)),
      h('div', { class: 'ending-grid' },
        h('div', { class: 'panel' }, h('h3', null, 'Where the journey ended'), PP.ui.gauges(s),
          kind === 'landed' ? h('ul', { class: 'score-list' },
            h('li', null, h('span', null, 'Destination fit'), h('strong', null, fit)),
            h('li', null, h('span', null, 'Trust'), h('strong', null, s.res.trust >= 7 ? 'strong' : s.res.trust >= 4 ? 'okay' : 'shaky')),
            h('li', null, h('span', null, 'No costly surprises'), h('strong', null, s.settled.some((d) => d.outcome === 'costly') ? 'no' : 'yes')),
            h('li', null, h('span', null, 'Understood the client'), h('strong', null, s.res.insight >= 6 ? 'yes' : 'partly'))) : null),
        h('div', { class: 'panel' }, h('h3', null, 'Your shortcuts, and when they came due'),
          shortcuts.length ? h('ol', { class: 'debt-timeline' }, shortcuts.map((d) => h('li', { class: 'o-' + String(d.outcome).replace(/ /g, '-') },
            h('div', null, h('strong', null, PP.content.debts[d.tag].label)),
            h('div', { class: 'small muted' }, `Taken near ${PP.content.nodes[d.where] ? PP.content.nodes[d.where].name : '?'}` + (d.how === 'final reckoning' ? ' · came due at the final reckoning' : d.at ? ` · came due near ${PP.content.nodes[d.at].name}` : '')),
            h('span', { class: 'pill' }, d.how === 'Olu' || d.how === 'checklist' ? 'rescued by ' + d.how : d.outcome)))) : h('p', { class: 'muted' }, 'You took no shortcuts that left a debt. Thorough, possibly slow, definitely tidy.'),
          reckoned ? h('p', { class: 'small muted' }, `${reckoned} unresolved shortcut${reckoned > 1 ? 's' : ''} rolled one last time when you landed.`) : null),
        h('div', { class: 'panel' }, h('h3', null, `What you never found out about ${cl.name}`),
          unknown.length ? h('ul', { class: 'facts' }, unknown.map((f) => h('li', { class: cl.facts[f].key ? 'key' : '' }, cl.facts[f].label + (cl.facts[f].key ? ' (this changes the destination)' : '')))) : h('p', null, 'Nothing. You got the full picture.')),
        h('div', { class: 'panel' }, h('h3', null, 'Your trail'),
          h('div', { class: 'map-host small-map', id: 'end-map' })))));
    s.map.beam = true;
    PP.ui.renderMap(document.getElementById('end-map'), s, {});
  }

  function unemployed() {
    const c = G.career;
    screen(h('section', { class: 'ending' },
      h('header', { class: 'ending-head' },
        h('div', { class: 'eyebrow' }, `Career over after ${c.journeys} journey${c.journeys === 1 ? '' : 's'} and ${c.days} days`),
        h('h2', { class: 'display' }, 'Unemployed'),
        h('p', { class: 'lede' }, 'Your savings ran out on the trail. You take a job at the bank. It has excellent dental, and nobody ever asks you to find out what a client really needs.'),
        ladder('unemployed'),
        h('div', { class: 'row' }, h('button', { class: 'btn primary big', onclick: () => { G.career = PP.newCareer(); PP.career.save(G.career); newJourney(); } }, 'Start a new career'))),
      h('div', { class: 'panel' }, h('h3', null, 'Your career'),
        c.history.length ? h('ol', { class: 'plain' }, c.history.map((x) => h('li', null, `Journey ${x.journey}: ${x.client} → ${x.outcome}${x.fit ? ` (${x.fit} fit)` : ''}, ${money(x.cash)}`))) : h('p', { class: 'muted' }, 'You never made it off the first trail.'),
        c.book.length ? h('p', { class: 'small muted' }, 'Your book at the end: ' + c.book.map((b) => `${b.name} (${bookStatus(b)})`).join('; ') + '.') : null)));
  }

  function fitText(s, fit) {
    const c = s.client, d = PP.content.destinations[s.destination].name;
    const keyKnown = PP.knows(s, c.keyFact);
    if (fit === 'appropriate') return `${d} was the right place for ${c.name}. You found it by noticing what mattered.`;
    if (fit === 'acceptable' && s.destination === 'not_now') return `${c.name} decided not to go ahead yet, and that is still a good outcome: the relationship is intact and the door is open.`;
    if (fit === 'acceptable') return `${d} works for ${c.name}, though there may have been a better fit.`;
    if (s.destination === 'not_now') return `${c.name} walked away undecided, and not in a good way. Without enough trust, "not now" means "not with you."`;
    return `${d} looked like the obvious destination, but it did not fit ${c.name}'s real situation.` + (keyKnown ? ' You knew enough to choose differently.' : ` The thing you never found out: ${c.facts[c.keyFact].label.toLowerCase()}.`);
  }

  function toast(msg) {
    const t = h('div', { class: 'toast', role: 'status' }, msg);
    document.body.appendChild(t);
    setTimeout(() => t.classList.add('out'), 4200);
    setTimeout(() => t.remove(), 4800);
  }
  PP.ui.toast = toast;
})(window.PP);
