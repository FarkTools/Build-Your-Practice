/* Chamber of Commerce mixer (prospecting). A room of name tags and limited time.
 * Talk to people: ask about them, talk about yourself, or swap cards and move on.
 * Business owners become prospects. Some guests are time sinks. */
(function (PP) {
  const h = PP.h;
  const GUESTS = [
    { type: 'owner', name: 'Dana', tag: 'Owns Dana\'s Bakery', open: '"Business is booming, but I never have a minute to think about my own money."', bias: { rosa: 3 } },
    { type: 'owner', name: 'Hector', tag: 'Hector\'s Hardware', open: '"Thirty years running the store. My kids don\'t want it. Not sure what happens next."', bias: { rosa: 3 } },
    { type: 'owner', name: 'Wen', tag: '???', realTag: 'Runs a dental practice', open: '"I just opened a second location. Everyone says I should \'have a plan.\'"', bias: { rosa: 2, morgan: 1 } },
    { type: 'family', name: 'Chris', tag: '???', realTag: 'New dad, works at the bank', open: '"We just had our first kid. I have no idea what we\'re supposed to be doing."', bias: { taylor: 3 } },
    { type: 'numbers', name: 'Pat', tag: 'Civil engineer', open: '"I made a spreadsheet of the buffet. The cheese-to-cracker ratio is off by 14%."', bias: { morgan: 3 } },
    { type: 'rival', name: 'Vance', tag: 'Velocity Wealth', open: '"Ha! Another advisor. I closed forty deals last quarter. Want to know how?"' },
    { type: 'mlm', name: 'Brenda', tag: '???', realTag: 'Essential oils "entrepreneur"', open: '"Have you heard about the opportunity of a lifetime? It involves lavender."' },
    { type: 'president', name: 'Marcus', tag: 'Chamber president', open: '"Glad you came! We\'re always looking for speakers for our monthly breakfast."' },
    { type: 'connector', name: 'Gail', tag: 'Knows everyone', open: '"New face! Let me tell you who\'s who in this room."' }
  ];

  PP.minigames.mixer = {
    title: 'Chamber of Commerce Mixer',
    risk: 'prospecting at events',
    prospecting: true,
    blurb: 'Work the room before the event ends. Ask people about themselves, and find the ones who need help. Some guests are time sinks.',
    start(root, ctx, done) {
      const comm = PP.skill(ctx.state, 'communication');
      let minutes = 6 + comm + (ctx.prep || 0) * 0.5;
      const ui = PP.mg.shell(root, this.title, this.risk);
      ui.wrap.querySelector('.mg-timer').hidden = true;
      const room = h('div', { class: 'mixer-room' });
      const talk = h('div', { class: 'mixer-talk' });
      ui.body.append(h('p', { class: 'mg-instr' }, 'Each conversation takes time. Asking about someone takes a minute, swapping cards takes half. When the clock runs out, the mixer is over.'), room, talk,
        h('button', { class: 'btn ghost', onclick: () => finish() }, 'Head home early'));
      const guests = PP.shuffle(GUESTS).slice(0, 8).map((g) => Object.assign({ met: false }, g));
      const leads = [], lines = [];
      let finished = false, bonus = 0;

      function status() { ui.status.textContent = `${Math.max(0, minutes)} minute${minutes === 1 ? '' : 's'} left · ${leads.length} lead${leads.length === 1 ? '' : 's'}`; }
      function renderRoom() {
        room.innerHTML = '';
        guests.forEach((g) => room.appendChild(h('button', { class: 'nametag' + (g.met ? ' met' : ''), disabled: g.met || finished, onclick: () => approach(g) },
          h('span', { class: 'hello' }, 'HELLO my name is'), h('strong', null, g.name), h('span', { class: 'tagline' }, g.revealed ? g.realTag || g.tag : g.tag))));
        status();
      }
      function approach(g) {
        talk.innerHTML = '';
        talk.append(h('p', { class: 'mixer-open' }, h('strong', null, g.name + ': '), g.open),
          h('div', { class: 'stack' },
            h('button', { class: 'btn', onclick: () => act(g, 'listen') }, `Ask about them (${g.type === 'mlm' ? '2 minutes' : '1 minute'})`),
            h('button', { class: 'btn', onclick: () => act(g, 'pitch') }, 'Talk about yourself (1 minute)'),
            h('button', { class: 'btn', onclick: () => act(g, 'card') }, 'Swap cards and move on (½ minute)')));
      }
      function act(g, how) {
        g.met = true;
        minutes -= how === 'card' ? 0.5 : g.type === 'mlm' && how === 'listen' ? 2 : 1;
        let msg = '', q = 'ok';
        const lead = (temp) => leads.push({ temp, bias: g.bias, source: `the Chamber mixer (${g.name})`, event: true });
        if (g.type === 'owner' || g.type === 'family' || g.type === 'numbers') {
          if (how === 'listen') { lead('warm'); msg = `${g.name} talks for a while, then asks for your card. "Can we keep talking next week?"`; q = 'good'; }
          else if (how === 'pitch') { if (PP.chance(0.4)) { lead('cold'); msg = `${g.name} nods politely and takes your card.`; } else msg = `${g.name}'s eyes glaze over. They excuse themselves to find the cheese.`; q = 'ok'; }
          else { if (PP.chance(0.35)) { lead('cold'); msg = `You swap cards with ${g.name}. They might call.`; } else msg = `You swap cards with ${g.name}. It goes straight into a pocket full of other cards.`; }
        } else if (g.type === 'rival') {
          msg = how === 'listen' ? 'Vance talks about himself for a full minute. You learn that he drives a boat to work.' : how === 'pitch' ? '"Cute," says Vance.' : 'Vance hands you a card. It is metal. It is heavy.'; q = how === 'card' ? 'ok' : 'bad';
        } else if (g.type === 'mlm') {
          msg = how === 'listen' ? 'Two minutes on lavender. You now own a sample.' : how === 'pitch' ? 'You talk about yourself. Brenda talks about lavender. Neither of you listens.' : 'You escape with a card that smells faintly of eucalyptus.'; q = how === 'card' ? 'good' : 'bad';
        } else if (g.type === 'president') {
          if (how === 'listen') { bonus++; msg = 'Marcus invites you to speak at next month\'s breakfast. That will bring someone your way.'; q = 'good'; }
          else msg = 'Marcus smiles and moves on to greet someone else.';
        } else if (g.type === 'connector') {
          if (how === 'listen') { guests.forEach((x) => (x.revealed = true)); msg = 'Gail points out everyone in the room, including the person you should avoid.'; q = 'good'; }
          else msg = '"Lovely to meet you!" Gail drifts off.';
        }
        lines.push({ q, text: `${g.name} (${g.realTag || g.tag}): ${how === 'listen' ? 'asked about them' : how === 'pitch' ? 'talked about yourself' : 'swapped cards'}` });
        talk.innerHTML = '';
        talk.append(h('p', { class: 'mg-feedback q-' + q }, msg));
        renderRoom();
        if (minutes <= 0 || guests.every((x) => x.met)) setTimeout(finish, 700);
      }
      function finish() {
        if (finished) return;
        finished = true;
        for (let i = 0; i < bonus; i++) leads.push({ temp: 'warm', source: 'your talk at the Chamber breakfast', event: true });
        const n = leads.length;
        PP.mg.summary(root, PP.minigames.mixer.title, {
          score: n, max: Math.max(n, 4), eff: { energy: -1 }, prospects: leads, passed: ctx.pass != null ? n >= ctx.pass : null,
          headline: `You leave with ${n} real lead${n === 1 ? '' : 's'}${bonus ? ', including a speaking invite' : ''}.`,
          lines: lines.length ? lines : [{ q: 'bad', text: 'You stood by the snack table the whole time.' }]
        }, done);
      }
      renderRoom();
      return { stop() { finished = true; } };
    }
  };
})(window.PP);
