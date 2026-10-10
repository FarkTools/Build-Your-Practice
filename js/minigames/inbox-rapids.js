/* Inbox Rapids — the risk: drowning in noise and missing what matters.
 * An action game: paddle a canoe left and right through a river of email.
 * Catch the gold envelopes (real messages from your client). Dodge the junk.
 * Arrow keys / A-D, or tap the left and right halves of the river.
 */
(function (PP) {
  const h = PP.h;
  const W = 640, H = 360, LANES = 5, INK = '#4a2e14', FONT = '"Patrick Hand", "Comic Sans MS", cursive';
  const KINDS = {
    gold: { label: (c) => c.name, fill: '#ffd76a', good: true },
    stake: { label: (c) => c.shortStake || 'Partner', fill: '#ffe9b0', good: true },
    news: { label: () => 'Newsletter', fill: '#fffaf0' },
    reply: { label: () => 'RE: RE: RE:', fill: '#e8e2d6' },
    urgent: { label: () => 'URGENT!! $$$', fill: '#ffb3a6', scam: true }
  };

  PP.minigames.inboxRapids = {
    title: 'Inbox Rapids',
    risk: 'missing what matters in the noise',
    blurb: 'Paddle through a river of email. Catch the gold envelopes from your client and their people. Dodge everything else. Arrow keys, A/D, or tap left and right.',
    start(root, ctx, done) {
      const client = ctx.client;
      const prep = ctx.prep || 0;
      const practice = !!ctx.practice;
      const dur = 30;
      const ui = PP.mg.shell(root, this.title, this.risk);
      const cv = h('canvas', { class: 'mg-canvas', width: W, height: H, 'aria-label': 'Inbox Rapids game area' });
      const left = h('button', { class: 'btn action', 'aria-label': 'Paddle left', onclick: () => move(-1) }, '◀ Left');
      const right = h('button', { class: 'btn action', 'aria-label': 'Paddle right', onclick: () => move(1) }, 'Right ▶');
      ui.body.append(h('p', { class: 'mg-instr' }, 'Catch gold envelopes. Dodge newsletters, reply-alls, and anything URGENT.'), cv, h('div', { class: 'mg-actions two' }, left, right));
      const c = cv.getContext('2d');
      const dpr = Math.min(2, window.devicePixelRatio || 1);
      cv.width = W * dpr; cv.height = H * dpr; c.setTransform(dpr, 0, 0, dpr, 0, 0);

      let lane = 2, x = laneX(2), items = [], t = 0, spawn = 0, finished = false, raf = 0, last = performance.now();
      const stats = { gold: 0, goldMissed: 0, junk: 0, scam: 0, total: 0 };
      function laneX(l) { return 64 + l * ((W - 128) / (LANES - 1)); }
      function move(d) { lane = PP.clamp(lane + d, 0, LANES - 1); }
      const onKey = (e) => {
        if (['ArrowLeft', 'a', 'A'].includes(e.key)) { e.preventDefault(); move(-1); }
        if (['ArrowRight', 'd', 'D'].includes(e.key)) { e.preventDefault(); move(1); }
      };
      document.addEventListener('keydown', onKey);
      cv.addEventListener('pointerdown', (e) => { const r = cv.getBoundingClientRect(); move(e.clientX - r.left < r.width / 2 ? -1 : 1); });
      const timer = PP.mg.timer(ui.bar, dur, () => finish());
      const F = PP.fx, floats = [], parts = [];
      let combo = 0, shakeT = 0;
      const caughtC = F.counter('Caught'), comboC = F.counter('Combo'), junkC = F.counter('Junk hit');
      ui.hud.append(caughtC.el, comboC.el, junkC.el);
      const float = (x, y, text, color) => floats.push({ x, y, text, color, t: 0 });
      const spray = (x, y, color, n) => { for (let k = 0; k < n; k++) { const a = Math.random() * Math.PI * 2, v = 60 + Math.random() * 120; parts.push({ x, y, vx: Math.cos(a) * v, vy: Math.sin(a) * v - 60, t: 0, color }); } };

      function frame(now) {
        if (finished) return;
        const dt = Math.min(0.05, (now - last) / 1000); last = now; t += dt;
        x += (laneX(lane) - x) * Math.min(1, dt * 14);
        const speed = (110 + t * 5) * (1 - prep * 0.12);
        spawn -= dt;
        if (spawn <= 0) {
          spawn = Math.max(0.38, 0.9 - t * 0.015);
          const r = Math.random();
          const kind = r < 0.26 ? 'gold' : r < 0.36 ? 'stake' : r < 0.6 ? 'news' : r < 0.84 ? 'reply' : 'urgent';
          items.push({ kind, lane: Math.floor(Math.random() * LANES), y: -30, wob: Math.random() * 6 });
          if (KINDS[kind].good) stats.total++;
        }
        items.forEach((it) => { it.y += speed * dt; });
        // Collisions
        items = items.filter((it) => {
          const ix = laneX(it.lane);
          if (it.y > H - 92 && it.y < H - 40 && Math.abs(ix - x) < 40) {
            const k = KINDS[it.kind];
            if (k.good) { stats.gold++; combo++; caughtC.set(stats.gold); comboC.set(combo); float(ix, it.y - 20, combo >= 3 ? `+1  x${combo}!` : '+1 ' + k.label(client), '#2f7a3a'); spray(ix, it.y, '#f2b544', 14); F.sfx(combo >= 3 ? 'great' : 'coin'); flash('Caught: ' + k.label(client), 'good'); }
            else if (k.scam) { stats.scam++; combo = 0; comboC.set(0); junkC.set(stats.junk + stats.scam); float(ix, it.y - 20, 'SCAM!', '#b4321f'); spray(ix, it.y, '#ff7262', 18); shakeT = 0.35; F.sfx('bad'); flash('Oops. You opened the URGENT one.', 'bad'); }
            else { stats.junk++; combo = 0; comboC.set(0); junkC.set(stats.junk + stats.scam); float(ix, it.y - 20, 'Splash. Junk.', '#7a5a3a'); spray(ix, it.y, '#cfe3f2', 10); F.sfx('meh'); flash('Splash. Junk.', 'ok'); }
            return false;
          }
          if (it.y > H + 20) { if (KINDS[it.kind].good) { stats.goldMissed++; combo = 0; comboC.set(0); float(laneX(it.lane), H - 30, 'Missed!', '#b4321f'); F.sfx('meh'); flash('A real message floated past!', 'bad'); } return false; }
          return true;
        });
        draw();
        drawFx(dt);
        ui.status.textContent = `Caught ${stats.gold} · Junk ${stats.junk + stats.scam}`;
        raf = requestAnimationFrame(frame);
      }
      function flash(text, q) { ui.feedback.textContent = text; ui.feedback.className = 'mg-feedback q-' + q; }

      function draw() {
        // River
        c.fillStyle = '#bcd8ee'; c.fillRect(0, 0, W, H);
        c.strokeStyle = 'rgba(16,25,107,.35)'; c.lineWidth = 2;
        for (let r = 0; r < 9; r++) for (let k = 0; k < 8; k++) {
          const yy = ((r * 46 + t * 120) % (H + 40)) - 20, xx = k * 90 + (r % 2) * 40;
          c.beginPath(); c.moveTo(xx, yy); c.quadraticCurveTo(xx + 14, yy - 6, xx + 28, yy); c.stroke();
        }
        // Banks
        c.fillStyle = '#d9c08b'; c.fillRect(0, 0, 22, H); c.fillRect(W - 22, 0, 22, H);
        c.strokeStyle = INK; c.lineWidth = 2.5; c.beginPath(); c.moveTo(22, 0); c.lineTo(22, H); c.moveTo(W - 22, 0); c.lineTo(W - 22, H); c.stroke();
        // Envelopes
        items.forEach((it) => {
          const k = KINDS[it.kind], ix = laneX(it.lane) + Math.sin(t * 3 + it.wob) * 3;
          c.save(); c.translate(ix, it.y); c.rotate(Math.sin(t * 2 + it.wob) * 0.1);
          c.fillStyle = k.fill; c.strokeStyle = INK; c.lineWidth = 2;
          c.fillRect(-34, -18, 68, 36); c.strokeRect(-34, -18, 68, 36);
          c.beginPath(); c.moveTo(-34, -18); c.lineTo(0, 4); c.lineTo(34, -18); c.stroke();
          c.fillStyle = k.scam ? '#7a2a1a' : INK; c.font = `13px ${FONT}`; c.textAlign = 'center'; c.fillText(k.label(client).slice(0, 12), 0, 14);
          c.restore();
        });
        // Canoe with you and your client
        c.save(); c.translate(x, H - 52);
        c.strokeStyle = INK; c.lineWidth = 2.5;
        c.fillStyle = '#9c6a3a'; c.beginPath(); c.moveTo(-46, -6); c.quadraticCurveTo(0, 22, 46, -6); c.closePath(); c.fill(); c.stroke();
        c.fillStyle = '#f2c79a'; c.beginPath(); c.arc(-16, -16, 7, 0, Math.PI * 2); c.fill(); c.stroke(); c.beginPath(); c.arc(16, -16, 7, 0, Math.PI * 2); c.fill(); c.stroke();
        c.fillStyle = '#10196b'; c.fillRect(10, -26, 13, 4);
        c.beginPath(); c.moveTo(30, -20); c.lineTo(44, 10); c.stroke();
        c.restore();
      }

      function drawFx(dt) {
        parts.forEach((p) => { p.t += dt; p.x += p.vx * dt; p.y += p.vy * dt; p.vy += 300 * dt; });
        for (let k = parts.length - 1; k >= 0; k--) if (parts[k].t > 0.7) parts.splice(k, 1);
        parts.forEach((p) => { c.globalAlpha = 1 - p.t / 0.7; c.fillStyle = p.color; c.fillRect(p.x - 3, p.y - 3, 6, 6); });
        floats.forEach((f) => { f.t += dt; f.y -= 40 * dt; });
        for (let k = floats.length - 1; k >= 0; k--) if (floats[k].t > 1) floats.splice(k, 1);
        floats.forEach((f) => { c.globalAlpha = 1 - f.t; c.fillStyle = f.color; c.font = `22px ${FONT}`; c.textAlign = 'center'; c.strokeStyle = '#fffaf0'; c.lineWidth = 4; c.strokeText(f.text, f.x, f.y); c.fillText(f.text, f.x, f.y); });
        c.globalAlpha = 1;
        if (shakeT > 0) { shakeT -= dt; cv.style.transform = `translate(${(Math.random() - 0.5) * 8}px, ${(Math.random() - 0.5) * 6}px)`; } else cv.style.transform = '';
      }

      function finish() {
        if (finished) return;
        finished = true;
        cancelAnimationFrame(raf); timer.stop(); document.removeEventListener('keydown', onKey);
        const missed = stats.goldMissed + items.filter((i) => KINDS[i.kind].good).length;
        const caughtFrac = stats.total ? stats.gold / stats.total : 1;
        const score = Math.round(caughtFrac * 10 - Math.min(4, (stats.junk + stats.scam * 2) * 0.5));
        const eff = {
          energy: stats.junk + stats.scam > 5 ? -2 : -1,
          insight: caughtFrac >= 0.7 ? 1 : 0,
          momentum: stats.junk + stats.scam <= 2 ? 1 : stats.junk + stats.scam >= 6 ? -1 : 0,
          trust: missed >= 4 ? -1 : 0
        };
        const debts = [];
        if (missed >= 2) debts.push({ tag: 'missed_message', sev: Math.min(3, missed - 1) });
        if (stats.scam) debts.push({ tag: 'fraud', sev: Math.min(3, stats.scam) });
        if (debts.length) eff.debt = debts;
        const result = {
          score: Math.max(0, score), max: 10, eff, showDebt: practice, passed: ctx.pass != null ? score >= ctx.pass : null,
          headline: `You caught ${stats.gold} of ${stats.total} real messages and hit ${stats.junk + stats.scam} pieces of junk.`,
          lines: [
            { q: caughtFrac >= 0.7 ? 'good' : 'bad', text: `Real messages caught: ${stats.gold} of ${stats.total}` + (missed ? ` (${missed} slipped past)` : '') },
            { q: stats.junk <= 2 ? 'good' : 'ok', text: `Newsletters and reply-alls you crashed into: ${stats.junk}` },
            { q: stats.scam ? 'bad' : 'good', text: stats.scam ? `URGENT scams you opened: ${stats.scam}. That can come back later.` : 'You dodged every scam.' }
          ]
        };
        PP.mg.summary(root, PP.minigames.inboxRapids.title, result, done);
      }

      raf = requestAnimationFrame(frame);
      return { stop() { finished = true; cancelAnimationFrame(raf); timer.stop(); document.removeEventListener('keydown', onKey); } };
    }
  };
})(window.PP);
