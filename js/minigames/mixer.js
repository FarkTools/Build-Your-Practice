/* Networking event (prospecting). A room full of people and a clock.
 * Each session is a different event: the Chamber mixer, a charity gala, a ribbon-cutting,
 * a trivia night or a neighbourhood potluck, each with its own host and crowd.
 * Click a guest to walk over. Ask about them, talk about yourself, or swap cards.
 * Most people want to be asked about. Some are in a hurry (just swap cards). A few
 * ask what you do (tell them). Leads fly into your card holder; time sinks eat your clock. */
(function (PP) {
  const h = PP.h;

  /* prefer: what works best with this guest. listen (default) / card (in a hurry) / pitch (they asked).
   * venues: only appears at these events. seg: who they become as a prospect. */
  const GUESTS = [
    { type: 'lead', seg: 'owner', fig: 'owner', name: 'Dana', tag: 'Owns Dana\'s Bakery', open: '"Business is booming, but I never have a minute to think about my own money."' },
    { type: 'lead', seg: 'owner', fig: 'vendor', name: 'Hector', tag: 'Hector\'s Hardware', open: '"Thirty years running the store. My kids don\'t want it. Not sure what happens next."' },
    { type: 'lead', seg: 'owner', fig: 'guest', name: 'Wen', tag: '???', realTag: 'Runs a dental practice', open: '"I just opened a second location. Everyone says I should \'have a plan.\'"' },
    { type: 'lead', seg: 'owner', fig: 'owner', name: 'Luis', tag: 'Food truck owner', open: '"I have to get back to the truck in five. Got a card?"', prefer: 'card' },
    { type: 'lead', seg: 'owner', fig: 'vendor', name: 'Priya', tag: '???', realTag: 'Two yoga studios', open: '"So what is it you actually do? Everyone here is so vague."', prefer: 'pitch' },
    { type: 'lead', seg: 'family', fig: 'family', name: 'Chris', tag: '???', realTag: 'New dad, works at the bank', open: '"We just had our first kid. I have no idea what we\'re supposed to be doing."' },
    { type: 'lead', seg: 'family', fig: 'couple', name: 'Jess & Omar', tag: 'Just bought a house', open: '"Our babysitter leaves at nine. We have exactly four minutes."', prefer: 'card' },
    { type: 'lead', seg: 'family', fig: 'family', name: 'Renée', tag: '???', realTag: 'Three kids, one income', open: '"I came for the free food, honestly. Three kids, one paycheck. You understand."' },
    { type: 'lead', seg: 'numbers', fig: 'numbers', name: 'Pat', tag: 'Civil engineer', open: '"I made a spreadsheet of the buffet. The cheese-to-cracker ratio is off by 14%."' },
    { type: 'lead', seg: 'numbers', fig: 'numbers', name: 'Deepa', tag: '???', realTag: 'Actuary, very direct', open: '"Give me your thirty-second version. What do you do, exactly?"', prefer: 'pitch' },
    { type: 'lead', seg: 'retiree', fig: 'retiree', name: 'Walt', tag: 'Retired fire captain', open: '"Retired in June. I\'ve cleaned the garage twice. What do people do all day?"' },
    { type: 'lead', seg: 'retiree', fig: 'retiree', name: 'June', tag: '???', realTag: 'Retiring in 18 months', open: '"Everyone keeps asking when I\'m retiring. I keep saying \'soon\' like I know."' },
    { type: 'lead', seg: 'early', fig: 'guest', name: 'Tyler', tag: 'First job, nice lanyard', open: '"My company has a retirement thing? I just clicked \'skip for now.\'"' },
    { type: 'lead', seg: 'early', fig: 'phone', name: 'Kai', tag: '???', realTag: 'Freelance designer', open: '"Some months I\'m rich, some months I eat cereal for dinner. Is that normal?"' },
    { type: 'lead', seg: 'caregiver', fig: 'client', name: 'Monique', tag: 'Nurse, off shift', open: '"My dad moved in with us last month. Between him and the kids, I\'m stretched thin."' },
    { type: 'lead', seg: 'caregiver', fig: 'guest', name: 'Sandra', tag: '???', realTag: 'Looking after her mom', open: '"I\'m only here because my sister said I need a night out. I keep checking my phone."', prefer: 'card' },
    { type: 'lead', seg: 'windfall', fig: 'guest', name: 'Felix', tag: '???', realTag: 'Sold his software company', open: '"I sold my company last year. Now everyone wants to have lunch with me. Suspicious."' },
    { type: 'lead', seg: 'changes', fig: 'client', name: 'Grace', tag: 'Recently divorced', open: '"First event since the divorce. I\'m relearning everything, including small talk."' },
    { type: 'rival', fig: 'rival', name: 'Vance', tag: 'Velocity Wealth', open: '"Ha! Another advisor. I closed forty deals last quarter. Want to know how?"' },
    { type: 'rival', fig: 'rival', name: 'Courtney', tag: 'Summit Peak Advisors', open: '"Oh, you\'re new! Adorable. I\'ve been working this room for twelve years."' },
    { type: 'mlm', fig: 'mlm', name: 'Brenda', tag: '???', realTag: 'Essential oils "entrepreneur"', open: '"Have you heard about the opportunity of a lifetime? It involves lavender."' },
    { type: 'mlm', fig: 'mlm', name: 'Kyle', tag: '???', realTag: 'Shake-based "wellness coach"', open: '"Quick question: are you happy with your energy levels? Be honest."' },
    { type: 'sink', fig: 'guest', name: 'Lyle', tag: 'Has a boat', open: '"Do you like boats? Let me show you some photos of my boat. I have... a lot."' },
    { type: 'sink', fig: 'phone', name: 'Dr. Pruitt', tag: '???', realTag: 'Retired, has opinions', open: '"You know what\'s wrong with this town? Parking. Let me explain."' },
    { type: 'connector', fig: 'connector', name: 'Gail', tag: 'Knows everyone', open: '"New face! Let me tell you who\'s who in this room."' },
    { type: 'connector', fig: 'connector', name: 'Ray', tag: 'At every event since 1994', open: '"You look lost. I\'m Ray. I know everybody here, and their dogs."' },
    // Hosts, one per event
    { type: 'host', fig: 'president', name: 'Marcus', tag: 'Chamber president', open: '"Glad you came! We\'re always looking for speakers for our monthly breakfast."', venues: ['chamber'], win: 'He invites you to speak at next month\'s breakfast!', pop: 'Speaking invite!', src: 'your talk at the Chamber breakfast' },
    { type: 'host', fig: 'president', name: 'Celia', tag: 'Gala chair', open: '"Thank you for coming. Have you met anyone at the donor tables yet?"', venues: ['gala'], win: 'Celia walks you over to a donor table and introduces you by name.', pop: 'Introduced!', src: 'an introduction at the gala' },
    { type: 'host', fig: 'owner', name: 'Mabel', tag: 'Cutting the ribbon', open: '"I can\'t believe it\'s finally open. I have no idea how to run the money side."', venues: ['ribbon'], win: 'Mabel asks you to come back next week and look at her numbers with her.', pop: 'Come back next week!', src: 'Mabel, the new shop owner' },
    { type: 'host', fig: 'president', name: 'Quizmaster Lou', tag: 'Runs trivia', open: '"Need a team? The Accountants Anonymous table is a player short."', venues: ['trivia'], win: 'You join the table, nail the money round, and leave with a new friend.', pop: 'Drafted!', src: 'your trivia team' },
    { type: 'host', fig: 'retiree', name: 'Bev', tag: 'Neighbourhood association', open: '"Welcome! We do a short talk at every meeting. People always ask about money."', venues: ['potluck'], win: 'Bev signs you up to give a short talk at next month\'s meeting!', pop: 'Talk booked!', src: 'your talk at the neighbourhood association' },
    // Event-specific crowds
    { type: 'lead', seg: 'windfall', fig: 'couple', name: 'The Whitfields', tag: 'Big donors', open: '"We give a lot to charity. We\'d like to be smarter about it, but we never get around to it."', venues: ['gala'] },
    { type: 'lead', seg: 'retiree', fig: 'retiree', name: 'Eleanor', tag: 'Board member', open: '"I was a schoolteacher for forty years. My pension is a mystery to me."', venues: ['gala', 'potluck'] },
    { type: 'lead', seg: 'owner', fig: 'vendor', name: 'Tony', tag: 'Owns the shop next door', open: '"Mabel\'s great. I\'ve had my shop here twenty years. Never once had a plan."', venues: ['ribbon'] },
    { type: 'lead', seg: 'early', fig: 'guest', name: 'Bree', tag: 'Team "Smarty Pints"', open: '"We\'re in last place. Do you know any capitals? Also, what does \'vested\' mean?"', venues: ['trivia'] },
    { type: 'lead', seg: 'family', fig: 'family', name: 'The Okonjos', tag: 'Brought a casserole', open: '"Our twins start kindergarten next year. Everyone says to start saving. For what, exactly?"', venues: ['potluck'] }
  ];
  const EVENTS = [
    { id: 'chamber', title: 'Chamber of Commerce Mixer', banner: 'Harbor Chamber of Commerce · Monthly Mixer', where: 'name tags and warm white wine', cls: 'v-chamber', segs: ['owner', 'numbers'], time: 0, src: 'the Chamber mixer',
      moments: ['Marcus taps a glass for announcements. Everyone stops for a minute.', 'Raffle draw! You did not win the fruit basket.'] },
    { id: 'gala', title: 'Charity Gala', banner: 'Harbor Food Bank · Autumn Gala', where: 'borrowed blazer, tiny desserts', cls: 'v-gala', segs: ['windfall', 'retiree'], time: 1, src: 'the food bank gala',
      moments: ['The auction starts. You accidentally bid on a weekend cabin. Someone outbids you, thankfully.', 'Speeches. Long ones. Everyone claps politely.'] },
    { id: 'ribbon', title: 'Ribbon-Cutting', banner: 'Grand Opening · Mabel\'s Hardware & Plants', where: 'giant scissors and lemonade', cls: 'v-ribbon', segs: ['owner', 'family'], time: -1, src: 'the ribbon-cutting',
      moments: ['The ribbon won\'t cut. Three people try. Everyone cheers when it finally goes.', 'The local paper herds everyone in for a group photo.'] },
    { id: 'trivia', title: 'Trivia Night', banner: 'Trivia Night at the Tap Room', where: 'pencils, nachos, a microphone that squeals', cls: 'v-trivia', segs: ['early', 'family'], time: 0, src: 'trivia night',
      moments: ['"Round three: name the seven dwarfs." The whole room goes quiet.', 'The microphone squeals. Everyone winces for a solid minute.'] },
    { id: 'potluck', title: 'Neighbourhood Potluck', banner: 'Elm Street Association · Fall Potluck', where: 'folding tables and eleven pasta salads', cls: 'v-potluck', segs: ['family', 'retiree', 'caregiver'], time: 0.5, src: 'the neighbourhood potluck',
      moments: ['Someone\'s dog gets loose. You help catch it. It takes a minute.', 'A casserole dish is dropped. You help sweep up.'] }
  ];

  PP.minigames.mixer = {
    title: 'Chamber of Commerce Mixer',
    risk: 'prospecting at events',
    prospecting: true,
    blurb: 'Walk the room before the event ends. Ask people about themselves and find the ones who need help. Some guests are time sinks.',
    start(root, ctx, done) {
      const F = PP.fx;
      const ev = PP.pick(EVENTS);
      const comm = PP.skill(ctx.state, 'communication');
      const total = 6 + comm + (ctx.prep || 0) * 0.5 + ev.time;
      let minutes = total;
      const ui = PP.mg.shell(root, ev.title, this.risk);
      const narrow = root.getBoundingClientRect().width < 560;
      ui.wrap.querySelector('.mg-timer').hidden = true;
      const clock = F.meter('Time left', 'warn'); clock.set(minutes, total, `${minutes} min`);
      const leadsC = F.counter('Leads');
      ui.hud.append(clock.el, leadsC.el);
      ui.wrap.insertBefore(h('div', { class: 'mg-scene' }, h('b', null, ev.banner), h('span', null, 'Tonight: ' + ev.where + '.')), ui.hud);

      const holder = h('div', { class: 'mx-holder', title: 'Your card holder' }, h('span', null, 'Cards'));
      const room = h('div', { class: 'mg-stage-area mx-room ' + ev.cls + (narrow ? ' mx-narrow' : '') },
        h('div', { class: 'mx-banner' }, ev.banner),
        h('div', { class: 'mx-table', style: { left: narrow ? '26%' : '32%', top: narrow ? '31%' : '36%' } }), h('div', { class: 'mx-table', style: { left: narrow ? '60%' : '72%', top: narrow ? '58%' : '37%' } }),
        holder,
        h('button', { class: 'btn small mx-leave', onclick: () => finish() }, 'Head home'));
      ui.body.append(h('p', { class: 'mg-instr' }, 'Tap someone to walk over. Most people like being asked about themselves. Some are in a hurry, and some will ask what you do.'), room);

      // Draw tonight's crowd: the host, a connector most nights, a few distractions, mostly real people.
      const count = narrow ? 8 : 7 + Math.floor(Math.random() * 3);
      const pool = GUESTS.filter((g) => !g.venues || g.venues.includes(ev.id));
      const host = pool.find((g) => g.type === 'host');
      const leadW = (g) => (ev.segs.includes(g.seg) ? 3 : 1) * (g.venues ? 4 : 1);
      const leadsPool = pool.filter((g) => g.type === 'lead').map((g) => ({ g, k: Math.random() ** (1 / leadW(g)) })).sort((a, b) => b.k - a.k).map((x) => x.g);
      const odd = PP.shuffle(['rival', 'mlm', 'sink']).slice(0, 1 + Math.floor(Math.random() * 2)).map((t) => PP.pick(pool.filter((g) => g.type === t)));
      const conn = PP.chance(0.75) ? [PP.pick(pool.filter((g) => g.type === 'connector'))] : [];
      const crowd = [host].concat(conn, odd);
      while (crowd.length < count) crowd.push(leadsPool.shift());
      // Spots: a loose grid, jittered, so the room looks different every time.
      const cols = narrow ? [1, 34.5, 68] : [3, 22, 42, 62, 81];
      const rows = narrow ? [10, 37, 64] : [13, 54];
      const jit = narrow ? 1 : 2;
      const spots = PP.shuffle(rows.flatMap((y) => cols.map((x) => [x + (Math.random() * 2 - 1) * jit, y + (Math.random() * 2 - 1) * jit])));
      const guests = PP.shuffle(crowd).map((g, i) => Object.assign({ met: false, spot: spots[i] }, g));
      const leads = [], lines = [];
      let finished = false, bonus = [], busy = false, talks = 0, moment = PP.chance(0.75) ? PP.pick(ev.moments) : null;

      guests.forEach((g, i) => {
        g.el = h('button', { class: 'mx-guest', style: { left: g.spot[0] + '%', top: g.spot[1] + '%', animationDelay: (i * 0.37) + 's' }, onclick: () => approach(g), 'aria-label': `Talk to ${g.name}` });
        g.el.innerHTML = PP.art.figure(g.fig, { seed: i + 2 + Math.floor(Math.random() * 20) });
        g.tagEl = h('span', { class: 'mx-tag' }, h('b', null, g.name), h('span', null, g.tag));
        g.el.appendChild(g.tagEl);
        room.appendChild(g.el);
      });

      function approach(g) {
        if (busy || g.met || finished) return;
        busy = true;
        F.sfx('click');
        g.el.classList.add('talking');
        const style = narrow ? {} : { left: Math.min(62, Math.max(2, g.spot[0] - 8)) + '%', top: (g.spot[1] > 40 ? g.spot[1] - 34 : g.spot[1] + 30) + '%' };
        const sinkCost = g.type === 'mlm' || g.type === 'sink' ? '2' : '1';
        const bub = h('div', { class: 'mx-bubble' + (narrow ? ' sheet' : ''), style },
          h('p', null, h('strong', null, g.name + ': '), g.open),
          h('div', { class: 'mx-choices' },
            h('button', { class: 'chip-btn', onclick: () => act(g, 'listen', bub) }, `Ask about them (${sinkCost} min)`),
            h('button', { class: 'chip-btn', onclick: () => act(g, 'pitch', bub) }, 'Talk about yourself (1 min)'),
            h('button', { class: 'chip-btn', onclick: () => act(g, 'card', bub) }, 'Swap cards (½ min)')));
        room.appendChild(bub);
      }

      function act(g, how, bub) {
        g.met = true; talks++;
        const cost = how === 'card' ? 0.5 : (g.type === 'mlm' || g.type === 'sink') && how === 'listen' ? 2 : 1;
        minutes = Math.max(0, minutes - cost);
        clock.set(minutes, total, `${minutes} min`);
        let msg = '', q = 'meh', lead = null;
        const mk = (temp) => (lead = { temp, bias: g.seg ? { [g.seg]: 3 } : undefined, source: `${ev.src} (${g.name})`, event: true });
        if (g.type === 'lead') {
          const pref = g.prefer || 'listen';
          if (how === pref) {
            mk(pref === 'card' ? 'cold' : 'warm'); q = 'good';
            msg = pref === 'listen' ? `${g.name} talks for a while, then asks for your card.` : pref === 'card' ? `${g.name} grabs your card on the way out. "I\'ll actually call. Promise."` : `You keep it short and plain. ${g.name} nods. "Okay. That I understand. Let\'s talk."`;
          } else if (pref === 'card' && how === 'listen') msg = `${g.name} keeps glancing at the door. "Sorry, I really have to go."`;
          else if (pref === 'pitch' && how === 'listen') { if (PP.chance(0.5)) { mk('cold'); msg = `"You didn\'t answer my question," says ${g.name}. But they take your card.`; } else msg = `"Still not sure what you do," says ${g.name}, wandering off.`; }
          else if (how === 'pitch') { if (PP.chance(0.4)) { mk('cold'); msg = `${g.name} politely takes your card.`; } else msg = `${g.name}'s eyes glaze over. They go find the cheese.`; }
          else { if (PP.chance(0.35)) { mk('cold'); msg = 'Cards swapped. They might call.'; } else msg = 'Cards swapped. Yours vanishes into a pocket full of cards.'; }
        } else if (g.type === 'rival') {
          msg = how === 'listen' ? `${g.name} talks about ${g.name === 'Vance' ? 'himself. He drives a boat to work.' : 'her twelve years here. You learn which caterer to avoid.'}` : how === 'pitch' ? `"Cute," says ${g.name}.` : g.name === 'Vance' ? 'His card is metal. It is heavy.' : 'Her card has a QR code that goes to a video of her.'; q = how === 'card' ? 'meh' : 'bad';
        } else if (g.type === 'mlm') {
          msg = how === 'listen' ? (g.name === 'Brenda' ? 'Two whole minutes on lavender. You now own a sample.' : 'Two minutes on shakes. You agree to "think about it."') : how === 'pitch' ? 'You pitch. They pitch back. Nobody listens.' : 'Escaped! Cards swapped, sample declined.'; q = how === 'card' ? 'good' : 'bad';
        } else if (g.type === 'sink') {
          msg = how === 'listen' ? (g.name === 'Lyle' ? 'Forty-one photos of the boat. Some are of the same rope.' : 'Two minutes on parking. You now have opinions about parking.') : how === 'pitch' ? `${g.name} waits politely for you to finish, then continues.` : 'A quick card swap and a clean exit. Well done.'; q = how === 'card' ? 'good' : 'bad';
        } else if (g.type === 'host') {
          if (how === 'listen') { bonus.push({ temp: 'warm', source: g.src, event: true, bias: { [PP.pick(ev.segs)]: 2 } }); msg = g.win; q = 'great'; } else msg = `${g.name} smiles and moves on to the next guest.`;
        } else if (g.type === 'connector') {
          if (how === 'listen') { msg = `${g.name} points out everyone in the room, and who is in a hurry.`; q = 'great'; reveal(); } else msg = '"Lovely to meet you!" ' + g.name + ' drifts off.';
        }
        bub.innerHTML = '';
        bub.appendChild(h('p', null, msg));
        lines.push({ q: q === 'great' ? 'good' : q === 'meh' ? 'ok' : q, text: `${g.name} (${g.realTag || g.tag}): ${how === 'listen' ? 'asked about them' : how === 'pitch' ? 'talked about yourself' : 'swapped cards'}` + (q === 'bad' || q === 'meh' ? hint(g, how) : '') });
        if (lead) {
          leads.push(lead);
          leadsC.set(leads.length);
          F.popOn(room, g.el, '+ Lead!', 'good'); F.sfx('coin');
          const card = h('div', { class: 'mx-card' }, g.name);
          g.el.appendChild(card);
          F.fly(card, holder, room, () => { holder.appendChild(h('i', { class: 'mx-card-stack' })); F.bump(holder); });
          card.remove();
        } else if (q === 'bad') { F.popOn(room, g.el, cost >= 2 ? '−2 min!' : 'Ugh.', 'bad'); F.sfx('bad'); F.shake(g.el); }
        else if (q === 'great') { F.popOn(room, g.el, g.type === 'host' ? g.pop : 'Room revealed!', 'great'); F.sfx('great'); F.burstOn(room, g.el, 'great', 14); }
        else if (q === 'good') { F.popOn(room, g.el, 'Clean exit', 'good'); F.sfx('good'); }
        else { F.popOn(room, g.el, how === 'card' ? 'Card swapped' : 'Meh', 'meh'); F.sfx('meh'); }
        setTimeout(() => {
          bub.remove(); g.el.classList.remove('talking'); g.el.classList.add('met'); busy = false;
          if (moment && talks === 2 && minutes > 1) {
            const m = moment; moment = null;
            minutes = Math.max(0, minutes - 0.5); clock.set(minutes, total, `${minutes} min`);
            ui.feedback.textContent = m + ' (−½ min)'; ui.feedback.className = 'mg-feedback q-ok';
            F.sfx('ding');
          }
          if (minutes <= 0 || guests.every((x) => x.met)) finish();
        }, 1500);
      }
      function hint(g, how) {
        if (g.type === 'lead' && g.prefer === 'card') return '. They were in a hurry: a quick card swap was the move.';
        if (g.type === 'lead' && g.prefer === 'pitch') return '. They asked what you do: a short, plain answer was the move.';
        if (g.type === 'lead') return '. Asking about them usually goes further.';
        if (g.type === 'host') return '. Hosts open doors if you ask about them.';
        if (g.type === 'mlm' || g.type === 'sink') return '. A polite card swap is the fastest exit.';
        return '';
      }
      function reveal() {
        guests.forEach((x) => {
          if (x.realTag) { x.tagEl.lastChild.textContent = x.realTag; F.glow(x.tagEl, 'great'); }
          if (!x.met && x.prefer) { x.tagEl.lastChild.textContent = (x.realTag || x.tag) + (x.prefer === 'card' ? ' · in a hurry' : ' · will ask you'); F.glow(x.tagEl, 'great'); }
        });
      }

      function finish() {
        if (finished) return;
        finished = true;
        bonus.forEach((b) => leads.push(b));
        const n = leads.length;
        setTimeout(() => PP.mg.summary(root, ev.title, {
          score: n, max: Math.max(n, 4), eff: { energy: -1 }, prospects: leads, passed: ctx.pass != null ? n >= ctx.pass : null,
          headline: `You leave ${ev.title.toLowerCase()} with ${n} real lead${n === 1 ? '' : 's'}${bonus.length ? ', including one from the host' : ''}.`,
          lines: lines.length ? lines : [{ q: 'bad', text: 'You stood by the snack table the whole time.' }]
        }, done), 300);
      }
      return { stop() { finished = true; } };
    }
  };
})(window.PP);
