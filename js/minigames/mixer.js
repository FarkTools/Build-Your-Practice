/* Chamber of Commerce mixer (prospecting). A room full of people and a clock.
 * Click a guest to walk over. Ask about them, talk about yourself, or swap cards.
 * Leads fly into your card holder; time sinks eat your clock. */
(function (PP) {
  const h = PP.h;
  const GUESTS = [
    { type: 'owner', fig: 'owner', name: 'Dana', tag: 'Owns Dana\'s Bakery', open: '"Business is booming, but I never have a minute to think about my own money."', bias: { rosa: 3 } },
    { type: 'owner', fig: 'vendor', name: 'Hector', tag: 'Hector\'s Hardware', open: '"Thirty years running the store. My kids don\'t want it. Not sure what happens next."', bias: { rosa: 3 } },
    { type: 'owner', fig: 'guest', name: 'Wen', tag: '???', realTag: 'Runs a dental practice', open: '"I just opened a second location. Everyone says I should \'have a plan.\'"', bias: { rosa: 2, morgan: 1 } },
    { type: 'family', fig: 'family', name: 'Chris', tag: '???', realTag: 'New dad, works at the bank', open: '"We just had our first kid. I have no idea what we\'re supposed to be doing."', bias: { taylor: 3 } },
    { type: 'numbers', fig: 'numbers', name: 'Pat', tag: 'Civil engineer', open: '"I made a spreadsheet of the buffet. The cheese-to-cracker ratio is off by 14%."', bias: { morgan: 3 } },
    { type: 'rival', fig: 'rival', name: 'Vance', tag: 'Velocity Wealth', open: '"Ha! Another advisor. I closed forty deals last quarter. Want to know how?"' },
    { type: 'mlm', fig: 'mlm', name: 'Brenda', tag: '???', realTag: 'Essential oils "entrepreneur"', open: '"Have you heard about the opportunity of a lifetime? It involves lavender."' },
    { type: 'president', fig: 'president', name: 'Marcus', tag: 'Chamber president', open: '"Glad you came! We\'re always looking for speakers for our monthly breakfast."' },
    { type: 'connector', fig: 'connector', name: 'Gail', tag: 'Knows everyone', open: '"New face! Let me tell you who\'s who in this room."' }
  ];
  const SPOTS = [[8, 18], [30, 10], [55, 16], [78, 12], [14, 56], [38, 52], [62, 58], [84, 54]];

  PP.minigames.mixer = {
    title: 'Chamber of Commerce Mixer',
    risk: 'prospecting at events',
    prospecting: true,
    blurb: 'Walk the room before the event ends. Ask people about themselves and find the ones who need help. Some guests are time sinks.',
    start(root, ctx, done) {
      const F = PP.fx;
      const comm = PP.skill(ctx.state, 'communication');
      const total = 6 + comm + (ctx.prep || 0) * 0.5;
      let minutes = total;
      const ui = PP.mg.shell(root, this.title, this.risk);
      ui.wrap.querySelector('.mg-timer').hidden = true;
      const clock = F.meter('Time left', 'warn'); clock.set(minutes, total, `${minutes} min`);
      const leadsC = F.counter('Leads');
      ui.hud.append(clock.el, leadsC.el);

      const holder = h('div', { class: 'mx-holder', title: 'Your card holder' }, h('span', null, 'Cards'));
      const room = h('div', { class: 'mg-stage-area mx-room' },
        h('div', { class: 'mx-banner' }, 'Harbor Chamber of Commerce · Monthly Mixer'),
        h('div', { class: 'mx-table', style: { left: '22%', top: '40%' } }), h('div', { class: 'mx-table', style: { left: '66%', top: '38%' } }),
        holder,
        h('button', { class: 'btn small mx-leave', onclick: () => finish() }, 'Head home'));
      ui.body.append(h('p', { class: 'mg-instr' }, 'Click someone to walk over. Asking about them takes a minute, swapping cards takes half.'), room);

      const guests = PP.shuffle(GUESTS).slice(0, 8).map((g, i) => Object.assign({ met: false, spot: SPOTS[i] }, g));
      const leads = [], lines = [];
      let finished = false, bonus = 0, busy = false;

      guests.forEach((g, i) => {
        g.el = h('button', { class: 'mx-guest', style: { left: g.spot[0] + '%', top: g.spot[1] + '%', animationDelay: (i * 0.37) + 's' }, onclick: () => approach(g), 'aria-label': `Talk to ${g.name}` });
        g.el.innerHTML = PP.art.figure(g.fig, { seed: i + 2 });
        g.tagEl = h('span', { class: 'mx-tag' }, h('b', null, g.name), h('span', null, g.tag));
        g.el.appendChild(g.tagEl);
        room.appendChild(g.el);
      });

      function approach(g) {
        if (busy || g.met || finished) return;
        busy = true;
        F.sfx('click');
        g.el.classList.add('talking');
        const bub = h('div', { class: 'mx-bubble', style: { left: Math.min(70, Math.max(2, g.spot[0] - 8)) + '%', top: (g.spot[1] > 40 ? g.spot[1] - 34 : g.spot[1] + 30) + '%' } },
          h('p', null, h('strong', null, g.name + ': '), g.open),
          h('div', { class: 'mx-choices' },
            h('button', { class: 'chip-btn', onclick: () => act(g, 'listen', bub) }, `Ask about them (${g.type === 'mlm' ? '2' : '1'} min)`),
            h('button', { class: 'chip-btn', onclick: () => act(g, 'pitch', bub) }, 'Talk about yourself (1 min)'),
            h('button', { class: 'chip-btn', onclick: () => act(g, 'card', bub) }, 'Swap cards (½ min)')));
        room.appendChild(bub);
      }

      function act(g, how, bub) {
        g.met = true;
        const cost = how === 'card' ? 0.5 : g.type === 'mlm' && how === 'listen' ? 2 : 1;
        minutes = Math.max(0, minutes - cost);
        clock.set(minutes, total, `${minutes} min`);
        let msg = '', q = 'meh', lead = null;
        const mk = (temp) => (lead = { temp, bias: g.bias, source: `the Chamber mixer (${g.name})`, event: true });
        if (g.type === 'owner' || g.type === 'family' || g.type === 'numbers') {
          if (how === 'listen') { mk('warm'); msg = `${g.name} talks for a while, then asks for your card.`; q = 'good'; }
          else if (how === 'pitch') { if (PP.chance(0.4)) { mk('cold'); msg = `${g.name} politely takes your card.`; } else msg = `${g.name}'s eyes glaze over. They go find the cheese.`; }
          else { if (PP.chance(0.35)) { mk('cold'); msg = 'Cards swapped. They might call.'; } else msg = 'Cards swapped. Yours vanishes into a pocket full of cards.'; }
        } else if (g.type === 'rival') {
          msg = how === 'listen' ? 'Vance talks about himself. He drives a boat to work.' : how === 'pitch' ? '"Cute," says Vance.' : 'His card is metal. It is heavy.'; q = how === 'card' ? 'meh' : 'bad';
        } else if (g.type === 'mlm') {
          msg = how === 'listen' ? 'Two whole minutes on lavender. You now own a sample.' : how === 'pitch' ? 'You pitch. She pitches back. Nobody listens.' : 'Escaped! Your hand smells of eucalyptus.'; q = how === 'card' ? 'good' : 'bad';
        } else if (g.type === 'president') {
          if (how === 'listen') { bonus++; msg = 'He invites you to speak at next month\'s breakfast!'; q = 'great'; } else msg = 'Marcus smiles and moves on.';
        } else if (g.type === 'connector') {
          if (how === 'listen') { msg = 'Gail points out everyone in the room.'; q = 'great'; reveal(); } else msg = '"Lovely to meet you!" Gail drifts off.';
        }
        bub.innerHTML = '';
        bub.appendChild(h('p', null, msg));
        lines.push({ q: q === 'great' ? 'good' : q === 'meh' ? 'ok' : q, text: `${g.name} (${g.realTag || g.tag}): ${how === 'listen' ? 'asked about them' : how === 'pitch' ? 'talked about yourself' : 'swapped cards'}` });
        if (lead) {
          leads.push(lead);
          leadsC.set(leads.length);
          F.popOn(room, g.el, '+ Lead!', 'good'); F.sfx('coin');
          const card = h('div', { class: 'mx-card' }, g.name);
          g.el.appendChild(card);
          F.fly(card, holder, room, () => { holder.appendChild(h('i', { class: 'mx-card-stack' })); F.bump(holder); });
          card.remove();
        } else if (q === 'bad') { F.popOn(room, g.el, cost >= 2 ? '−2 min!' : 'Ugh.', 'bad'); F.sfx('bad'); F.shake(g.el); }
        else if (q === 'great') { F.popOn(room, g.el, g.type === 'president' ? 'Speaking invite!' : 'Room revealed!', 'great'); F.sfx('great'); F.burstOn(room, g.el, 'great', 14); }
        else { F.popOn(room, g.el, how === 'card' ? 'Card swapped' : 'Meh', 'meh'); F.sfx('meh'); }
        setTimeout(() => {
          bub.remove(); g.el.classList.remove('talking'); g.el.classList.add('met'); busy = false;
          if (minutes <= 0 || guests.every((x) => x.met)) finish();
        }, 1300);
      }
      function reveal() {
        guests.forEach((x) => { if (x.realTag) { x.tagEl.lastChild.textContent = x.realTag; F.glow(x.tagEl, 'great'); } });
      }

      function finish() {
        if (finished) return;
        finished = true;
        for (let i = 0; i < bonus; i++) leads.push({ temp: 'warm', source: 'your talk at the Chamber breakfast', event: true });
        const n = leads.length;
        setTimeout(() => PP.mg.summary(root, PP.minigames.mixer.title, {
          score: n, max: Math.max(n, 4), eff: { energy: -1 }, prospects: leads, passed: ctx.pass != null ? n >= ctx.pass : null,
          headline: `You leave with ${n} real lead${n === 1 ? '' : 's'}${bonus ? ', including a speaking invite' : ''}.`,
          lines: lines.length ? lines : [{ q: 'bad', text: 'You stood by the snack table the whole time.' }]
        }, done), 300);
      }
      return { stop() { finished = true; } };
    }
  };
})(window.PP);
