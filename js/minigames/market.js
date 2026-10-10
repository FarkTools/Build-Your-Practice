/* Farmers market tent (prospecting). People stroll past your tent.
 * Click the ones who look interested to wave them over, then hand them a raffle slip
 * (into the fishbowl) or have a real chat. Waving at joggers is awkward. Anyone
 * interested who walks past gets pulled in by the rival tent's gimmick.
 * Each session rolls the day (busy Saturday, rainy morning, holiday market...) which
 * changes the pace and who shows up, and which rival set up across the path. */
(function (PP) {
  const h = PP.h;
  /* label = the visible tell. say = what they say when you wave them over. */
  const TYPES = [
    { id: 'stroller', fig: 'family', label: 'Pushing a stroller', interested: true, bias: { family: 3 }, w: 3, say: '"Is this the raffle? We\'ll take anything free right now."' },
    { id: 'sunhat', fig: 'retiree', label: 'Sun hat, reading glasses', interested: true, bias: { retiree: 3, numbers: 1 }, w: 2, say: '"I just retired. My wife sent me to buy eggs and \'talk to people.\'"' },
    { id: 'baker', fig: 'vendor', label: 'Apron from the bakery stall', interested: true, bias: { owner: 3 }, w: 2, say: '"Five-minute break. What is this, and does it involve carbs?"' },
    { id: 'mortgage', fig: 'couple', label: 'Clutching a mortgage letter', interested: true, bias: { family: 2, numbers: 1 }, w: 1.5, say: '"We just signed this. We\'re still not sure what we signed."' },
    { id: 'lanyard', fig: 'guest', label: 'Work lanyard on a Saturday', interested: true, bias: { early: 3 }, w: 1.5, say: '"First real job. Everyone says \'start saving.\' Start what, exactly?"' },
    { id: 'pension', fig: 'retiree', label: 'Squinting at a pension letter', interested: true, bias: { retiree: 3 }, w: 1.2, say: '"This letter has four options and I understand none of them."' },
    { id: 'truck', fig: 'owner', label: 'Food truck T-shirt, counting cash', interested: true, bias: { owner: 3 }, w: 1.2, say: '"Slow hour. My accountant says I need \'a plan.\' He won\'t say which one."' },
    { id: 'florist', fig: 'vendor', label: 'Arms full of sunflowers', interested: true, bias: { owner: 2 }, w: 1, say: '"I run the flower stall. Hold these? Thanks. Okay, what\'s this about?"' },
    { id: 'parent', fig: 'client', label: 'Helping an older parent pick tomatoes', interested: true, bias: { caregiver: 3 }, w: 1.2, say: '"Mom, sit, I\'ve got it. Sorry. What\'s this? I could use some help, honestly."' },
    { id: 'scrubs', fig: 'client', label: 'Scrubs, just off a night shift', interested: true, bias: { caregiver: 2, family: 1 }, w: 1, say: '"Twelve-hour shift. I came for coffee and now I\'m talking to you. Go."' },
    { id: 'honey', fig: 'numbers', label: 'Comparing honey prices per ounce', interested: true, bias: { numbers: 3 }, w: 1.2, say: '"Your raffle odds aren\'t posted. What are they? ...Fine. What do you do?"' },
    { id: 'laptop', fig: 'phone', label: 'Laptop bag, working on a Saturday', interested: true, bias: { early: 2 }, w: 1, say: '"Freelancer. Feast or famine. Currently: famine. Is that a free pen?"' },
    { id: 'weekend', fig: 'family', label: 'Weekend dad, two kids, one long list', interested: true, bias: { changes: 3 }, w: 1, say: '"New apartment, new routine, new everything. Where do people even start?"' },
    { id: 'folder', fig: 'guest', label: 'Carrying a lawyer\'s office folder', interested: true, bias: { windfall: 3 }, w: 0.8, say: '"My uncle left me something. I feel strange even saying that out loud."' },
    { id: 'expecting', fig: 'couple', label: 'Expecting, browsing tiny socks', interested: true, bias: { family: 3 }, w: 1, say: '"Due in March. We\'ve read eleven books. None of them were about money."' },
    { id: 'brochure', fig: 'family', label: 'College brochure poking out of a tote', interested: true, bias: { family: 2 }, w: 1, say: '"Our oldest is a junior. I\'m trying not to look at the tuition page."' },
    { id: 'forOne', fig: 'retiree', label: 'Buying vegetables for one', interested: true, bias: { changes: 2, retiree: 1 }, w: 0.8, say: '"I still buy too much. Thirty-eight years of cooking for two. Sorry, what\'s this?"' },
    { id: 'tshirt', fig: 'retiree', label: '"Just Retired!" T-shirt', interested: true, bias: { retiree: 3 }, w: 1, say: '"Three weeks in. My kids got me this shirt. I have questions."' },
    { id: 'newcomers', fig: 'couple', label: 'New in town, holding a map', interested: true, bias: { early: 2, family: 1 }, w: 1, say: '"We just moved here. Where\'s the good coffee? Also, what do you do?"' },
    { id: 'ornaments', fig: 'vendor', label: 'Selling handmade ornaments', interested: true, bias: { owner: 3 }, w: 0.2, say: '"December is my whole year. Then nothing until spring. How do I plan for that?"' },
    { id: 'jogger', fig: 'jogger', label: 'Jogging, earbuds in', interested: false, w: 2 },
    { id: 'kid', fig: 'kid', label: 'Chasing a balloon', interested: false, w: 1 },
    { id: 'dog', fig: 'dog', label: 'Walked by a large dog', interested: false, w: 1.5 },
    { id: 'phone', fig: 'phone', label: 'On a very loud call', interested: false, w: 1.5 },
    { id: 'teen', fig: 'guest', label: 'Teenager, headphones, eye-roll ready', interested: false, w: 1 },
    { id: 'cyclist', fig: 'jogger', label: 'Cyclist in full gear, mid-ride', interested: false, w: 1 },
    { id: 'totes', fig: 'client', label: 'Four tote bags, parking meter running', interested: false, w: 1 },
    { id: 'meltdown', fig: 'family', label: 'Toddler mid-meltdown', interested: false, w: 0.8 },
    { id: 'flyers', fig: 'mlm', label: 'Handing out flyers for her own thing', interested: false, w: 0.7 },
    { id: 'scout', fig: 'rival', label: 'Rival agent, "just browsing"', interested: false, w: 0.5 },
    { id: 'restroom', fig: 'guest', label: 'Urgently looking for a restroom', interested: false, w: 0.7 },
    { id: 'umbrella', fig: 'phone', label: 'Running, umbrella inside out', interested: false, w: 0 }
  ];
  const DAYS = [
    { id: 'saturday', name: 'Busy Saturday', note: 'Peak crowds. Lots of strollers. It moves fast.', time: 30, spawn: [700, 700], speed: 1.1, boost: { stroller: 1.5, expecting: 1.3 } },
    { id: 'rain', name: 'Rainy morning', note: 'Only the serious shoppers came out. Fewer people, and they\'re in a hurry.', time: 32, spawn: [1500, 1100], speed: 1.35, interested: 1.4, boost: { umbrella: 2.5, jogger: 0.2, cyclist: 0.2, dog: 0.5, kid: 0.3 }, cls: 'mk-rain' },
    { id: 'holiday', name: 'Holiday market', note: 'Twinkle lights and cider. People stroll slowly and chat.', time: 30, spawn: [1000, 900], speed: 0.8, boost: { ornaments: 8, sunhat: 1.5, brochure: 1.5, jogger: 0.3, cyclist: 0.2 }, cls: 'mk-holiday' },
    { id: 'hot', name: 'Hot afternoon', note: 'Everyone wants shade. Dogs everywhere. Your tent has shade.', time: 30, spawn: [1100, 1000], speed: 0.9, boost: { dog: 2.2, kid: 1.6, jogger: 0.4, scrubs: 1.5 }, cls: 'mk-hot' },
    { id: 'spring', name: 'First market of spring', note: 'New faces everywhere. Half the town just moved here, apparently.', time: 30, spawn: [900, 900], speed: 1, boost: { newcomers: 3, lanyard: 2, laptop: 1.5 } },
    { id: 'early', name: 'Opening bell, 7am', note: 'Early birds: retirees, vendors and joggers. Mostly joggers.', time: 30, spawn: [1000, 1000], speed: 1.05, boost: { sunhat: 2, tshirt: 2, pension: 2, baker: 2, florist: 2, truck: 1.5, jogger: 2.2, cyclist: 1.6, stroller: 0.4, teen: 0.2 } }
  ];
  const RIVALS = [
    { name: 'Velocity Wealth', gim: 'tube', lost: 'Lost to the tube man!', what: 'the inflatable tube man' },
    { name: 'Summit Peak Advisors', gim: 'wheel', lost: 'Lost to the prize wheel!', what: 'the spinning prize wheel' },
    { name: 'Bayside Money Group', gim: 'popcorn', lost: 'Lost to free popcorn!', what: 'the free popcorn machine' },
    { name: 'Lighthouse Financial', gim: 'dog', lost: 'Lost to Biscuit the dog!', what: 'Biscuit, their golden retriever' }
  ];
  const DOG = '<svg viewBox="0 0 60 40" aria-hidden="true"><path d="M8,26 q0,-12 16,-12 h14 l6,-8 l6,4 l2,8 q4,2 2,8 l-8,2 v12 h-5 v-10 h-20 v10 h-5 v-12 q-6,-2 -8,-2z" fill="#e6b85c" stroke="#4a2c12" stroke-width="2" stroke-linejoin="round"/><circle cx="48" cy="14" r="1.6" fill="#4a2c12"/><path d="M8,26 q-6,-4 -4,-10" fill="none" stroke="#4a2c12" stroke-width="2.4" stroke-linecap="round"/></svg>';

  PP.minigames.market = {
    title: 'Farmers Market Tent',
    risk: 'prospecting in your community',
    prospecting: true,
    blurb: 'Wave over people who look interested, then hand them a raffle slip or have a real chat. Anyone interested who walks past ends up at the rival tent.',
    start(root, ctx, done) {
      const F = PP.fx;
      const prep = ctx.prep || 0;
      const day = PP.pick(DAYS), rv = PP.pick(RIVALS);
      const narrow = root.getBoundingClientRect().width < 560;
      const ui = PP.mg.shell(root, this.title, this.risk);
      const leadsC = F.counter('Leads'), bowlC = F.counter('Fishbowl'), lostC = F.counter(narrow ? 'Lost' : 'Lost to rival');
      ui.hud.append(leadsC.el, bowlC.el, lostC.el);
      ui.wrap.insertBefore(h('div', { class: 'mg-scene' }, h('b', null, day.name), h('span', null, day.note + ` Across the path: ${rv.name}, with ${rv.what}.`)), ui.hud);

      const bowl = h('div', { class: 'mk-bowl', title: 'Raffle fishbowl' });
      const clip = h('div', { class: 'mk-clip' }, h('span', null, 'Leads'));
      const gimmick = h('i', { class: 'mk-gim g-' + rv.gim, html: rv.gim === 'dog' ? DOG : '' });
      const rival = h('div', { class: 'mk-tent rival' }, h('span', null, rv.name), gimmick);
      const lane = h('div', { class: 'mg-stage-area mk-lane ' + (day.cls || '') + (narrow ? ' mk-narrow' : '') },
        h('div', { class: 'mk-tent mine' }, h('span', null, 'Your tent'), h('div', { class: 'mk-table' }, bowl)),
        rival, clip, h('div', { class: 'mk-path' }));
      ui.body.append(h('p', { class: 'mg-instr' }, 'Tap people who look interested. Raffle slips are quick but cold. A chat takes three seconds and usually makes a warm lead.'), lane);

      const leads = [], walkers = [];
      const stats = { stolen: 0, awkward: 0, raffle: 0, chat: 0, seen: {} };
      let finished = false, busy = false, spawnT = null, raf = 0, last = performance.now(), seed = 1 + Math.floor(Math.random() * 30);
      const stealX = narrow ? 66 : 74;
      const timer = PP.mg.timer(ui.bar, day.time + prep * 5, () => finish());
      const wt = (t) => t.w * (day.boost[t.id] != null ? day.boost[t.id] : 1) * (t.interested && day.interested ? day.interested : 1);
      const pickType = () => { const tot = TYPES.reduce((a, t) => a + wt(t), 0); let r = Math.random() * tot; for (const t of TYPES) { r -= wt(t); if (r <= 0) return t; } return TYPES[0]; };

      function spawn() {
        if (finished) return;
        const t = pickType();
        const w = { t, x: -12, speed: (9 + Math.random() * 6) * day.speed, row: Math.floor(Math.random() * 2) };
        // Keep two walkers on the same row from spawning on top of each other.
        const lastOnRow = walkers.filter((o) => !o.gone && o.row === w.row).pop();
        if (lastOnRow && lastOnRow.x < 8) w.row = 1 - w.row;
        w.el = h('button', { class: 'mk-walker', onclick: () => wave(w), 'aria-label': t.label });
        w.el.innerHTML = PP.art.figure(t.fig, { seed: seed++ });
        w.el.appendChild(h('span', { class: 'mk-label' }, t.label));
        w.el.style.top = (w.row ? 58 : 39) + '%';
        w.el.style.left = w.x + '%';
        lane.appendChild(w.el);
        walkers.push(w);
        spawnT = setTimeout(spawn, day.spawn[0] + Math.random() * day.spawn[1]);
      }
      function frame(now) {
        if (finished) return;
        const dt = Math.min(0.05, (now - last) / 1000); last = now;
        walkers.forEach((w) => {
          if (w.gone || w.stopped) return;
          w.x += w.speed * dt;
          w.el.style.left = w.x + '%';
          if (w.t.interested && w.x > stealX && !w.lost) {
            w.lost = true; w.gone = true; stats.stolen++; lostC.set(stats.stolen);
            w.el.classList.add('to-rival');
            F.popOn(lane, rival, rv.lost, 'bad'); F.sfx('meh'); F.bump(gimmick);
            setTimeout(() => w.el.remove(), 600);
          } else if (w.x > 100) { w.gone = true; w.el.remove(); }
        });
        raf = requestAnimationFrame(frame);
      }
      function wave(w) {
        if (busy || w.gone || finished) return;
        if (!w.t.interested) {
          stats.awkward++; timer.sub(1.5); w.speed *= 1.8;
          F.popOn(lane, w.el, '?!  (−1.5s)', 'bad'); F.sfx('bad'); F.shake(w.el);
          return;
        }
        busy = true; w.stopped = true; w.el.classList.add('stopped'); F.sfx('click');
        const bub = h('div', { class: 'mk-bubble', style: narrow ? {} : { left: Math.max(1, Math.min(58, w.x - 6)) + '%' } },
          h('p', null, w.t.say || '"Hi! What\'s this about?"'),
          h('div', { class: 'mx-choices' },
            h('button', { class: 'chip-btn', onclick: () => resolve(w, 'raffle', bub) }, 'Raffle slip'),
            h('button', { class: 'chip-btn primary', onclick: () => resolve(w, 'chat', bub) }, 'Have a real chat')));
        lane.appendChild(bub);
      }
      function addLead(w, temp, label) {
        leads.push({ temp, bias: w.t.bias, source: temp === 'warm' ? `your farmers market tent (${day.name.toLowerCase()})` : 'your raffle fishbowl', event: true });
        leadsC.set(leads.length);
        F.popOn(lane, w.el, label, temp === 'warm' ? 'good' : 'meh'); F.sfx('coin');
        const card = h('div', { class: 'mx-card' }, temp);
        w.el.appendChild(card);
        F.fly(card, clip, lane, () => { clip.appendChild(h('i', { class: 'mx-card-stack ' + temp })); F.bump(clip); });
        card.remove();
      }
      function resolve(w, how, bub) {
        bub.remove();
        const leave = () => { w.el.classList.add('leaving'); w.gone = true; setTimeout(() => w.el.remove(), 500); busy = false; };
        if (how === 'raffle') {
          stats.raffle++; bowlC.set(stats.raffle);
          const slip = h('div', { class: 'mk-slip' });
          w.el.appendChild(slip);
          F.fly(slip, bowl, lane, () => { bowl.appendChild(h('i', { class: 'mk-slip-in', style: { left: 10 + Math.random() * 60 + '%', bottom: 6 + Math.random() * 30 + '%', transform: `rotate(${Math.random() * 60 - 30}deg)` } })); F.bump(bowl); });
          slip.remove();
          F.sfx('whoosh');
          if (PP.chance(0.3)) setTimeout(() => addLead(w, 'cold', '+ Cold lead'), 350); else F.popOn(lane, w.el, 'Into the bowl', 'meh');
          setTimeout(leave, 500);
        } else {
          stats.chat++;
          w.el.classList.add('chatting');
          setTimeout(() => {
            w.el.classList.remove('chatting');
            if (finished) return;
            const r = Math.random();
            if (r < 0.55) { addLead(w, 'warm', '+ Warm lead!'); F.burstOn(lane, w.el, 'good', 12); }
            else if (r < 0.8) addLead(w, 'cold', '+ Cold lead');
            else { F.popOn(lane, w.el, PP.pick(['Lovely chat about tomatoes', 'They just wanted directions', 'A long story about zucchini']), 'meh'); F.sfx('meh'); }
            leave();
          }, 3000);
        }
      }
      function finish() {
        if (finished) return;
        finished = true;
        clearTimeout(spawnT); cancelAnimationFrame(raf); timer.stop();
        const n = leads.length;
        PP.mg.summary(root, PP.minigames.market.title, {
          score: n, max: Math.max(n, 5), eff: { energy: -1 }, prospects: leads, passed: ctx.pass != null ? n >= ctx.pass : null,
          headline: `${n} lead${n === 1 ? '' : 's'} from the market (${day.name.toLowerCase()}).`,
          lines: [
            { q: stats.chat ? 'good' : 'ok', text: `Real chats: ${stats.chat}` },
            { q: 'ok', text: `Raffle slips in the fishbowl: ${stats.raffle}` },
            { q: stats.stolen > 3 ? 'bad' : 'ok', text: `Lost to ${rv.what}: ${stats.stolen}` },
            { q: stats.awkward ? 'bad' : 'good', text: `Awkward waves at people who weren't interested: ${stats.awkward}` }
          ]
        }, done);
      }
      spawn();
      raf = requestAnimationFrame(frame);
      return { stop() { finished = true; clearTimeout(spawnT); cancelAnimationFrame(raf); timer.stop(); } };
    }
  };
})(window.PP);
