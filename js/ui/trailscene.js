/* The trail scene: a side-scrolling, hand-inked view of the wagon on the trail,
 * plus cut scenes for landmarks, encounters, and risk debt catching up.
 *
 *   const scene = new PP.TrailScene(canvas);
 *   scene.setTerrain('swamp'); scene.setMoving(true);
 *   await scene.cut('debt', { title: 'Something from earlier', caption: '...' });
 */
(function (PP) {
  const W = 960, H = 320, GROUND = 236;
  const INK = '#4a2e14', NAVY = '#10196b', PARCH = '#f5e2bd', ORANGE = '#f29b1f';
  const FONT = '"Patrick Hand", "Comic Sans MS", "Chalkboard SE", cursive';
  const rnd = (i, salt = 0) => { const x = Math.sin(i * 127.1 + salt * 311.7) * 43758.5453; return x - Math.floor(x); };

  /* Terrain palette and props for each kind of place. */
  const T = {
    port: { ground: '#e3c992', far: 'sea', farFill: '#bcd8ee', props: ['grass', 'post', 'barrel'] },
    meadow: { ground: '#c9d89a', far: 'hills', farFill: '#a9c97f', props: ['tree', 'grass', 'flower', 'flower'] },
    lighthouse: { ground: '#e0cc98', far: 'sea', farFill: '#bcd8ee', props: ['grass', 'rock', 'grass'] },
    wreck: { ground: '#e0cc98', far: 'sea', farFill: '#bcd8ee', props: ['rock', 'grass', 'rock'] },
    fog: { ground: '#d8ccb0', far: 'hills', farFill: '#c9c7bd', props: ['grass', 'post', 'rock'], fog: 0.55 },
    loop: { ground: '#e3d09e', far: 'hills', farFill: '#d8c79a', props: ['paper', 'grass', 'sign'] },
    cliffs: { ground: '#d9c08b', far: 'cliffs', farFill: '#c2a679', props: ['rock', 'grass', 'skull'] },
    swamp: { ground: '#a9bf7c', far: 'swamp', farFill: '#9bb873', props: ['reed', 'reed', 'grid', 'tree'] },
    snakepit: { ground: '#9cae74', far: 'swamp', farFill: '#8aa266', props: ['reed', 'phone', 'skull'] },
    sands: { ground: '#ead39a', far: 'dunes', farFill: '#e5c682', props: ['memo', 'cactus', 'grass'] },
    caves: { ground: '#cdb58a', far: 'cliffs', farFill: '#a8916b', props: ['rock', 'skull', 'rock'] },
    summit: { ground: '#d2c6a6', far: 'mountains', farFill: '#b9b4a6', props: ['pine', 'rock', 'pine'] },
    isles: { ground: '#d9cb9c', far: 'river', farFill: '#bcd8ee', props: ['grass', 'lock', 'post'] },
    toll: { ground: '#d9cb9c', far: 'river', farFill: '#bcd8ee', props: ['grass', 'post', 'sign'] },
    backchannel: { ground: '#d0c597', far: 'river', farFill: '#bcd8ee', props: ['grass', 'rock', 'tree'] },
    clients: { ground: '#ecd59a', far: 'hills', farFill: '#f3cf86', props: ['flower', 'tree', 'star'] }
  };
  const SIGNS = ['ADVICE 2 MI', 'NO U-TURNS (EXCEPT ALL OF THEM)', 'SCOPE CREEK', 'NOW ENTERING: AMBIGUITY', 'REPLY-ALL RANCH', 'TRUST ME, 5 MI', 'CIRCLE BACK RD'];

  function ink(c, w = 2.5) { c.strokeStyle = INK; c.lineWidth = w; c.lineJoin = 'round'; c.lineCap = 'round'; }

  class TrailScene {
    constructor(canvas) {
      this.cv = canvas;
      this.c = canvas.getContext('2d');
      this.terrain = 'port';
      this.moving = false;
      this.speed = 70;
      this.off = 0;
      this.t = 0;
      this.cutState = null;
      this.landmark = null;
      this.night = 0;
      this.weather = null;
      this.reduced = window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches;
      this.resize();
      this._onResize = () => this.resize();
      window.addEventListener('resize', this._onResize);
      this._skip = () => this.skip();
      canvas.addEventListener('click', this._skip);
      let last = performance.now();
      const loop = (now) => {
        if (this.dead) return;
        const dt = Math.min(0.05, (now - last) / 1000); last = now;
        this.t += dt;
        if (this.moving) this.off += this.speed * dt;
        this.draw();
        this.raf = requestAnimationFrame(loop);
      };
      this.raf = requestAnimationFrame(loop);
    }
    destroy() { this.dead = true; cancelAnimationFrame(this.raf); window.removeEventListener('resize', this._onResize); }
    resize() {
      const dpr = Math.min(2, window.devicePixelRatio || 1);
      this.cv.width = W * dpr; this.cv.height = H * dpr;
      this.c.setTransform(dpr, 0, 0, dpr, 0, 0);
    }
    setTerrain(k) { if (T[k]) this.terrain = k; }
    setMoving(m) { this.moving = m; }
    setLandmark(kind) { this.landmark = kind; }
    setPace(p) { this.speed = p === 'breakneck' ? 150 : p === 'brisk' ? 100 : 70; }

    /* Play a cut scene. Resolves when finished or skipped (click / key). */
    cut(key, opts = {}) {
      return new Promise((resolve) => {
        const dur = this.reduced ? 900 : opts.duration || 2800;
        if (this.cutState) this.cutState.resolve();
        this.cutState = { key, opts, start: this.t, dur: dur / 1000, resolve: () => { this.cutState = null; resolve(); } };
        setTimeout(() => { if (this.cutState && this.cutState.key === key) this.cutState.resolve(); }, dur);
      });
    }
    skip() { if (this.cutState) this.cutState.resolve(); }

    /* ---------- drawing ---------- */
    draw() {
      const c = this.c, t = this.t;
      const cs = this.cutState;
      const cutP = cs ? Math.min(1, (t - cs.start) / cs.dur) : 0;
      const nightCut = cs && (cs.key === 'campfire' || cs.key === 'steve');
      const darkCut = cs && (cs.key === 'emails' || cs.key === 'debt');
      const terr = T[this.terrain];
      c.save();
      if (cs && (cs.key === 'debt' || cs.key === 'stampede' || cs.key === 'breakdown') && cutP < 0.5 && !this.reduced) c.translate((rnd(Math.floor(t * 30)) - 0.5) * 6, (rnd(Math.floor(t * 30), 2) - 0.5) * 4);

      // Sky
      const g = c.createLinearGradient(0, 0, 0, GROUND);
      if (nightCut) { g.addColorStop(0, '#1b2366'); g.addColorStop(1, '#3a3f7a'); }
      else if (darkCut) { g.addColorStop(0, '#9c9483'); g.addColorStop(1, '#cbbd9a'); }
      else { g.addColorStop(0, '#f8ead0'); g.addColorStop(1, '#f1d9a8'); }
      c.fillStyle = g; c.fillRect(-10, -10, W + 20, GROUND + 10);
      if (nightCut) this.stars(); else this.sun();
      this.clouds(darkCut);

      // Far layer
      this.far(terr, this.off * 0.18);
      // Mid props
      this.props(terr, this.off * 0.55, 0.75, GROUND - 6);
      // Ground
      c.fillStyle = terr.ground; c.fillRect(-10, GROUND, W + 20, H - GROUND + 10);
      ink(c, 2); c.beginPath(); c.moveTo(-10, GROUND); c.lineTo(W + 10, GROUND); c.stroke();
      // Ground texture tufts
      for (let i = 0; i < 30; i++) {
        const x = ((i * 53 - this.off * 1.0) % (W + 60) + W + 60) % (W + 60) - 30;
        c.strokeStyle = 'rgba(74,46,20,.35)'; c.lineWidth = 1.5;
        c.beginPath(); c.moveTo(x, 300 - (i % 3) * 12); c.lineTo(x + 6, 296 - (i % 3) * 12); c.stroke();
      }
      // Dotted trail
      c.fillStyle = NAVY;
      for (let x = -(this.off % 22); x < W + 22; x += 22) { c.beginPath(); c.arc(x, 270, 3.2, 0, Math.PI * 2); c.fill(); }

      // Landmark when stopped at one
      if (this.landmark && !(cs && cs.key === 'arrive')) this.drawLandmark(this.landmark, 760, GROUND, 1, t);

      // Cut-scene background art (behind the wagon)
      if (cs) this.cutBack(cs, cutP, t);

      // Wagon
      const wx = cs && cs.key === 'breakdown' ? 300 : 300;
      this.wagon(wx, 258, this.moving || (cs && cs.key === 'depart'), cs && cs.key === 'breakdown' ? cutP : 0);

      // Foreground props
      this.props(terr, this.off * 1.35, 1.15, H - 6, true);

      // Weather
      const fogAmt = (terr.fog || 0) + (cs && cs.key === 'fog' ? 0.5 * Math.sin(cutP * Math.PI) : 0);
      if (fogAmt) this.fog(fogAmt);
      if (cs) this.cutFront(cs, cutP, t);
      if (nightCut) { c.fillStyle = 'rgba(16,25,107,.28)'; c.fillRect(0, 0, W, H); this.campfire(cs.key === 'steve' ? 640 : 470, 286, t); }
      c.restore();

      // Vignette + banner on top of everything
      if (cs) this.banner(cs, cutP);
    }

    sun() {
      const c = this.c;
      ink(c, 2); c.fillStyle = '#f7c560';
      c.beginPath(); c.arc(840, 62, 22, 0, Math.PI * 2); c.fill(); c.stroke();
      for (let i = 0; i < 10; i++) {
        const a = i / 10 * Math.PI * 2 + this.t * 0.15;
        c.beginPath(); c.moveTo(840 + Math.cos(a) * 30, 62 + Math.sin(a) * 30); c.lineTo(840 + Math.cos(a) * 38, 62 + Math.sin(a) * 38); c.stroke();
      }
    }
    stars() {
      const c = this.c; c.fillStyle = '#fdf3d6';
      for (let i = 0; i < 50; i++) { const tw = 0.6 + 0.4 * Math.sin(this.t * 3 + i); c.globalAlpha = tw; c.fillRect(rnd(i) * W, rnd(i, 3) * 180, 2, 2); }
      c.globalAlpha = 1;
      c.beginPath(); c.arc(820, 60, 18, 0, Math.PI * 2); c.fill();
      c.fillStyle = '#1b2366'; c.beginPath(); c.arc(828, 54, 16, 0, Math.PI * 2); c.fill();
    }
    clouds(dark) {
      const c = this.c;
      for (let i = 0; i < 5; i++) {
        const x = ((rnd(i) * W * 1.6 - this.off * 0.06 - this.t * 6) % (W + 200) + W + 200) % (W + 200) - 100;
        const y = 30 + rnd(i, 1) * 70;
        c.fillStyle = dark ? '#8d8676' : '#fbf3e1'; ink(c, 1.8);
        c.beginPath();
        c.arc(x, y, 16, Math.PI * 0.5, Math.PI * 1.5); c.arc(x + 20, y - 10, 18, Math.PI, Math.PI * 2); c.arc(x + 44, y, 16, Math.PI * 1.5, Math.PI * 0.5); c.closePath();
        c.fill(); c.stroke();
      }
    }

    far(terr, o) {
      const c = this.c;
      c.fillStyle = terr.farFill; ink(c, 2);
      const base = GROUND;
      if (terr.far === 'sea' || terr.far === 'river') {
        c.fillRect(-10, base - 70, W + 20, 70);
        c.strokeStyle = 'rgba(16,25,107,.45)'; c.lineWidth = 2;
        for (let r = 0; r < 3; r++) for (let x = -(o * (1 + r * 0.3) % 60) - 60; x < W + 60; x += 60) {
          const y = base - 55 + r * 18 + Math.sin(this.t * 2 + x * 0.05) * 2;
          c.beginPath(); c.moveTo(x, y); c.quadraticCurveTo(x + 15, y - 7, x + 30, y); c.stroke();
        }
        ink(c, 2); c.beginPath(); c.moveTo(-10, base - 70); c.lineTo(W + 10, base - 70); c.stroke();
        if (terr.far === 'river') { for (let i = 0; i < 3; i++) { const x = ((i * 380 - o * 1.2) % (W + 300) + W + 300) % (W + 300) - 150; c.fillStyle = '#c9d79a'; c.beginPath(); c.ellipse(x, base - 40, 46, 12, 0, 0, Math.PI * 2); c.fill(); ink(c, 2); c.stroke(); } }
        return;
      }
      c.beginPath(); c.moveTo(-10, base);
      for (let x = -10; x <= W + 10; x += 10) {
        const k = (x + o);
        let y;
        if (terr.far === 'mountains') y = base - 70 - Math.abs(((k / 160) % 2) - 1) * 110 - rnd(Math.floor(k / 160)) * 30;
        else if (terr.far === 'dunes') y = base - 30 - Math.sin(k / 90) * 18 - Math.sin(k / 37) * 6;
        else if (terr.far === 'cliffs') y = base - 40 - (Math.floor(k / 120) % 2 ? 60 : 20) - rnd(Math.floor(k / 40)) * 10;
        else if (terr.far === 'swamp') y = base - 22 - Math.sin(k / 50) * 6;
        else y = base - 40 - Math.sin(k / 140) * 28 - Math.sin(k / 53) * 10;
        c.lineTo(x, y);
      }
      c.lineTo(W + 10, base); c.closePath(); c.fill(); c.stroke();
      if (terr.far === 'mountains') { // snow caps
        c.fillStyle = '#fbf7ee';
        for (let i = -1; i < 8; i++) { const px = i * 160 - (o % 160) + 80; c.beginPath(); c.moveTo(px - 26, GROUND - 145); c.lineTo(px, GROUND - 180 + 0); c.lineTo(px + 26, GROUND - 145); c.closePath(); c.globalAlpha = 0.85; c.fill(); c.globalAlpha = 1; }
      }
      if (terr.far === 'swamp') { // gridlines
        c.strokeStyle = 'rgba(74,110,40,.5)'; c.lineWidth = 1.2;
        for (let x = -(o % 40); x < W; x += 40) { c.beginPath(); c.moveTo(x, base - 24); c.lineTo(x, base); c.stroke(); }
        c.beginPath(); c.moveTo(0, base - 12); c.lineTo(W, base - 12); c.stroke();
      }
    }

    props(terr, o, scale, baseY, fore) {
      const c = this.c;
      const tile = fore ? 260 : 150;
      const first = Math.floor(o / tile) - 1;
      for (let i = first; i < first + W / tile + 3; i++) {
        const r = rnd(i, fore ? 9 : 4);
        if (fore && r < 0.6) continue;
        if (!fore && r < 0.25) continue;
        const kind = terr.props[Math.floor(rnd(i, 7) * terr.props.length)];
        const x = i * tile - o + rnd(i, 5) * tile * 0.6;
        this.prop(kind, x, baseY, scale * (0.8 + rnd(i, 6) * 0.4), i);
      }
    }

    prop(kind, x, y, s, i) {
      const c = this.c;
      c.save(); c.translate(x, y); c.scale(s, s); ink(c, 2);
      switch (kind) {
        case 'tree':
          c.fillStyle = '#7da65a'; c.beginPath(); c.arc(0, -46, 20, 0, Math.PI * 2); c.arc(-14, -34, 14, 0, Math.PI * 2); c.arc(14, -34, 14, 0, Math.PI * 2); c.fill(); c.stroke();
          c.beginPath(); c.moveTo(0, -24); c.lineTo(0, 0); c.stroke(); break;
        case 'pine':
          c.fillStyle = '#5f8a57'; c.beginPath(); c.moveTo(0, -60); c.lineTo(16, -14); c.lineTo(-16, -14); c.closePath(); c.fill(); c.stroke();
          c.beginPath(); c.moveTo(0, -14); c.lineTo(0, 0); c.stroke(); break;
        case 'grass':
          c.strokeStyle = '#4d7a32'; for (let k = -1; k <= 1; k++) { c.beginPath(); c.moveTo(k * 8 - 5, 0); c.lineTo(k * 8, -12); c.lineTo(k * 8 + 5, 0); c.stroke(); } break;
        case 'flower':
          c.strokeStyle = '#4d7a32'; c.beginPath(); c.moveTo(0, 0); c.lineTo(0, -14); c.stroke();
          c.fillStyle = ORANGE; c.beginPath(); c.arc(0, -16, 5, 0, Math.PI * 2); c.fill(); ink(c, 1.5); c.stroke(); break;
        case 'rock':
          c.fillStyle = '#b8a888'; c.beginPath(); c.moveTo(-18, 0); c.quadraticCurveTo(-14, -20, 0, -22); c.quadraticCurveTo(16, -18, 18, 0); c.closePath(); c.fill(); c.stroke(); break;
        case 'reed':
          c.strokeStyle = '#4d7a32'; for (let k = 0; k < 4; k++) { c.beginPath(); c.moveTo(k * 5, 0); c.quadraticCurveTo(k * 5 + 2, -18, k * 5 - 2, -34 - k * 3); c.stroke(); }
          c.fillStyle = '#7a5a3a'; c.fillRect(8, -40, 4, 10); break;
        case 'grid':
          c.fillStyle = 'rgba(169,201,90,.6)'; c.beginPath(); c.ellipse(0, -4, 34, 8, 0, 0, Math.PI * 2); c.fill(); c.stroke();
          c.beginPath(); c.moveTo(-12, -11); c.lineTo(-12, 3); c.moveTo(12, -11); c.lineTo(12, 3); c.moveTo(-30, -4); c.lineTo(30, -4); c.stroke(); break;
        case 'post':
          c.fillStyle = '#9c7a4f'; c.fillRect(-3, -30, 6, 30); c.strokeRect(-3, -30, 6, 30); break;
        case 'barrel':
          c.fillStyle = '#b07a43'; c.beginPath(); c.ellipse(0, -14, 11, 14, 0, 0, Math.PI * 2); c.fill(); c.stroke();
          c.beginPath(); c.moveTo(-11, -18); c.lineTo(11, -18); c.moveTo(-11, -10); c.lineTo(11, -10); c.stroke(); break;
        case 'sign': {
          const text = SIGNS[Math.abs(i) % SIGNS.length];
          c.fillStyle = '#9c7a4f'; c.fillRect(-2, -40, 4, 40);
          c.font = `15px ${FONT}`; const w = c.measureText(text).width + 14;
          c.fillStyle = '#f3dcae'; c.fillRect(-w / 2, -58, w, 22); c.strokeRect(-w / 2, -58, w, 22);
          c.fillStyle = INK; c.textAlign = 'center'; c.fillText(text, 0, -42); break;
        }
        case 'paper':
          c.fillStyle = '#fffaf0'; c.save(); c.rotate((rnd(i) - 0.5) * 0.8); c.fillRect(-9, -12, 18, 12); c.strokeRect(-9, -12, 18, 12);
          c.beginPath(); c.moveTo(-5, -8); c.lineTo(5, -8); c.moveTo(-5, -4); c.lineTo(3, -4); c.stroke(); c.restore(); break;
        case 'memo':
          c.fillStyle = '#fffaf0'; c.fillRect(-12, -26, 24, 18); c.strokeRect(-12, -26, 24, 18);
          c.fillStyle = ORANGE; c.beginPath(); c.arc(0, -17, 4, 0, Math.PI * 2); c.fill();
          c.beginPath(); c.moveTo(-6, -8); c.lineTo(-8, 0); c.moveTo(6, -8); c.lineTo(8, 0); c.stroke(); break;
        case 'cactus':
          c.fillStyle = '#7da65a'; c.beginPath(); c.roundRect ? c.roundRect(-6, -40, 12, 40, 6) : c.rect(-6, -40, 12, 40); c.fill(); c.stroke();
          c.beginPath(); c.moveTo(-6, -22); c.lineTo(-14, -22); c.lineTo(-14, -32); c.moveTo(6, -16); c.lineTo(14, -16); c.lineTo(14, -28); c.stroke(); break;
        case 'skull':
          c.fillStyle = '#fbf3e1'; c.beginPath(); c.arc(0, -12, 9, 0, Math.PI * 2); c.fill(); c.stroke();
          c.fillStyle = INK; c.beginPath(); c.arc(-3, -13, 2, 0, Math.PI * 2); c.arc(3, -13, 2, 0, Math.PI * 2); c.fill(); break;
        case 'phone':
          c.fillStyle = '#2f2f2f'; c.fillRect(-6, -22, 12, 20); c.strokeRect(-6, -22, 12, 20);
          if (Math.sin(this.t * 10 + i) > 0) { c.beginPath(); c.arc(0, -12, 16, -0.8, -0.2); c.stroke(); c.beginPath(); c.arc(0, -12, 16, Math.PI + 0.2, Math.PI + 0.8); c.stroke(); } break;
        case 'lock':
          c.fillStyle = ORANGE; c.fillRect(-8, -16, 16, 13); c.strokeRect(-8, -16, 16, 13);
          c.beginPath(); c.arc(0, -16, 6, Math.PI, 0); c.stroke(); break;
        case 'star':
          c.fillStyle = ORANGE; c.beginPath(); for (let k = 0; k < 8; k++) { const a = k * Math.PI / 4, rr = k % 2 ? 4 : 10; c.lineTo(Math.cos(a) * rr, -20 + Math.sin(a) * rr); } c.closePath(); c.fill(); break;
      }
      c.restore();
    }

    wagon(x, y, moving, broken) {
      const c = this.c;
      const bob = moving ? Math.sin(this.t * 10) * 1.6 : 0;
      const spin = this.off / 16;
      // Ox
      c.save(); c.translate(x + 120, y + bob * 0.6); ink(c, 2.2);
      c.fillStyle = '#b07a43';
      c.beginPath(); c.ellipse(0, -16, 30, 15, 0, 0, Math.PI * 2); c.fill(); c.stroke();
      c.beginPath(); c.ellipse(32, -24, 11, 9, 0.3, 0, Math.PI * 2); c.fill(); c.stroke();
      c.beginPath(); c.moveTo(30, -32); c.lineTo(26, -40); c.moveTo(38, -31); c.lineTo(44, -38); c.stroke();
      const leg = moving ? Math.sin(this.t * 10) * 5 : 0;
      c.beginPath(); c.moveTo(-18, -4); c.lineTo(-18 + leg, 10); c.moveTo(-8, -3); c.lineTo(-8 - leg, 10); c.moveTo(12, -3); c.lineTo(12 + leg, 10); c.moveTo(20, -4); c.lineTo(20 - leg, 10); c.stroke();
      c.fillStyle = INK; c.beginPath(); c.arc(36, -26, 1.6, 0, Math.PI * 2); c.fill();
      c.restore();
      // Hitch
      ink(c, 2); c.beginPath(); c.moveTo(x + 62, y - 14 + bob); c.lineTo(x + 92, y - 16 + bob); c.stroke();
      // Wagon body
      c.save(); c.translate(x, y + bob);
      ink(c, 2.5);
      c.fillStyle = '#9c6a3a'; c.fillRect(-62, -34, 124, 24); c.strokeRect(-62, -34, 124, 24);
      c.beginPath(); c.moveTo(-62, -22); c.lineTo(62, -22); c.stroke();
      // Canvas cover
      c.fillStyle = '#fbf3e1';
      c.beginPath(); c.moveTo(-58, -34); c.bezierCurveTo(-58, -92, 58, -92, 58, -34); c.closePath(); c.fill(); c.stroke();
      for (const k of [-28, 0, 28]) { c.beginPath(); c.moveTo(k, -34); c.quadraticCurveTo(k * 1.05, -70, k * 0.9, -80); c.stroke(); }
      // Sign on canvas
      c.fillStyle = NAVY; c.font = `16px ${FONT}`; c.textAlign = 'center'; c.fillText('PROSPECT', 0, -46);
      // Driver (agent) and client peeking
      c.fillStyle = '#f2c79a'; ink(c, 2);
      c.beginPath(); c.arc(56, -48, 7, 0, Math.PI * 2); c.fill(); c.stroke();
      c.fillStyle = NAVY; c.fillRect(48, -58, 16, 4); c.fillRect(52, -64, 8, 7);
      c.fillStyle = '#e8b48a'; c.beginPath(); c.arc(-50, -50, 7, 0, Math.PI * 2); c.fill(); c.stroke();
      c.restore();
      // Wheels
      const wheel = (wx, wy, rot) => {
        c.save(); c.translate(wx, wy); c.rotate(rot); ink(c, 2.5); c.fillStyle = 'rgba(156,106,58,.25)';
        c.beginPath(); c.arc(0, 0, 15, 0, Math.PI * 2); c.fill(); c.stroke();
        for (let k = 0; k < 6; k++) { c.beginPath(); c.moveTo(0, 0); c.lineTo(Math.cos(k * Math.PI / 3) * 15, Math.sin(k * Math.PI / 3) * 15); c.stroke(); }
        c.restore();
      };
      wheel(x + 40, y - 4 + bob, spin);
      if (broken) wheel(x - 40 + broken * 500, y - 4 + Math.abs(Math.sin(broken * 14)) * -20 * (1 - broken), spin + broken * 30);
      else wheel(x - 40, y - 4 + bob, spin);
    }

    fog(a) {
      const c = this.c;
      for (let i = 0; i < 4; i++) {
        const x = ((i * 300 - this.t * 20 - this.off * 0.3) % (W + 400) + W + 400) % (W + 400) - 200;
        const g = c.createRadialGradient(x, 200, 20, x, 200, 260);
        g.addColorStop(0, `rgba(240,236,226,${0.75 * a})`); g.addColorStop(1, 'rgba(240,236,226,0)');
        c.fillStyle = g; c.fillRect(0, 0, W, H);
      }
      c.fillStyle = `rgba(232,228,216,${0.35 * a})`; c.fillRect(0, 0, W, H);
    }

    campfire(x, y, t) {
      const c = this.c;
      ink(c, 2); c.fillStyle = '#7a5a3a'; c.fillRect(x - 18, y - 4, 36, 6);
      for (let i = 0; i < 3; i++) {
        const h = 20 + Math.sin(t * 9 + i * 2) * 6;
        c.fillStyle = i === 1 ? '#ffd76a' : ORANGE; c.globalAlpha = 0.9;
        c.beginPath(); c.moveTo(x - 10 + i * 10, y - 4); c.quadraticCurveTo(x - 14 + i * 10, y - h * 0.6, x - 8 + i * 8, y - h); c.quadraticCurveTo(x + 2 + i * 6, y - h * 0.5, x + 4 + i * 6, y - 4); c.fill();
      }
      c.globalAlpha = 1;
      const g = c.createRadialGradient(x, y - 10, 5, x, y - 10, 140); g.addColorStop(0, 'rgba(255,190,90,.35)'); g.addColorStop(1, 'rgba(255,190,90,0)');
      c.fillStyle = g; c.fillRect(x - 140, y - 150, 280, 160);
    }

    /* Big landmark art, used when you stop at a place and in arrival cut scenes. */
    drawLandmark(kind, x, y, s, t) {
      const c = this.c;
      c.save(); c.translate(x, y); c.scale(s, s); ink(c, 2.8);
      const label = (txt) => { c.font = `22px ${FONT}`; c.textAlign = 'center'; c.fillStyle = INK; c.fillText(txt, 0, 26); };
      switch (kind) {
        case 'port':
          c.fillStyle = '#9c6a3a'; c.fillRect(-90, -20, 150, 10); c.strokeRect(-90, -20, 150, 10);
          for (const px of [-80, -40, 0, 40]) { c.beginPath(); c.moveTo(px, -10); c.lineTo(px, 6); c.stroke(); }
          for (const [hx, hh, col] of [[-70, 40, '#f3e6c8'], [-30, 56, '#f3e6c8'], [14, 44, '#f3e6c8']]) {
            c.fillStyle = col; c.fillRect(hx, -20 - hh, 34, hh); c.strokeRect(hx, -20 - hh, 34, hh);
            c.fillStyle = '#c4532d'; c.beginPath(); c.moveTo(hx - 4, -20 - hh); c.lineTo(hx + 17, -38 - hh); c.lineTo(hx + 38, -20 - hh); c.closePath(); c.fill(); c.stroke();
          }
          break;
        case 'meadow':
          c.fillStyle = '#b9d38f'; c.beginPath(); c.ellipse(0, -10, 110, 34, 0, Math.PI, 0); c.fill(); c.stroke();
          c.strokeStyle = '#4d7a32'; for (let i = 0; i < 6; i++) { const gx = -80 + i * 30, gy = -18 - (i % 2) * 12; c.beginPath(); c.moveTo(gx - 5, gy); c.lineTo(gx, gy - 10); c.lineTo(gx + 5, gy); c.stroke(); }
          c.fillStyle = ORANGE; for (let i = 0; i < 5; i++) { c.beginPath(); c.arc(-70 + i * 36, -14 - (i % 3) * 8, 4.5, 0, Math.PI * 2); c.fill(); }
          ink(c, 2.5); c.fillStyle = '#9c6a3a'; c.fillRect(30, -34, 40, 6); c.strokeRect(30, -34, 40, 6); c.beginPath(); c.moveTo(34, -28); c.lineTo(34, -14); c.moveTo(66, -28); c.lineTo(66, -14); c.stroke();
          break;
        case 'lighthouse': {
          c.fillStyle = '#fbf7ee'; c.beginPath(); c.moveTo(-22, 0); c.lineTo(-14, -140); c.lineTo(14, -140); c.lineTo(22, 0); c.closePath(); c.fill(); c.stroke();
          c.fillStyle = '#c4532d'; for (const yy of [-36, -86]) { c.beginPath(); c.moveTo(-20 + (yy / -140) * 6, yy); c.lineTo(20 - (yy / -140) * 6, yy); c.lineTo(19 - (yy / -140) * 6, yy - 18); c.lineTo(-19 + (yy / -140) * 6, yy - 18); c.closePath(); c.fill(); c.stroke(); }
          c.fillStyle = '#ffd76a'; c.fillRect(-12, -162, 24, 22); c.strokeRect(-12, -162, 24, 22);
          c.fillStyle = INK; c.beginPath(); c.moveTo(-16, -162); c.lineTo(0, -178); c.lineTo(16, -162); c.closePath(); c.fill();
          const a = Math.sin(t * 1.4) * 0.6;
          c.save(); c.translate(0, -151); c.rotate(a); c.fillStyle = 'rgba(255,215,106,.35)'; c.beginPath(); c.moveTo(0, 0); c.lineTo(-260, -50); c.lineTo(-260, 40); c.closePath(); c.fill(); c.restore();
          c.strokeStyle = ORANGE; c.lineWidth = 3; for (const k of [-1, 0, 1]) { c.beginPath(); c.moveTo(18, -151 + k * 10); c.lineTo(36, -151 + k * 16); c.stroke(); }
          break;
        }
        case 'wreck':
          c.fillStyle = '#9c6a3a'; c.save(); c.rotate(-0.18);
          c.beginPath(); c.moveTo(-70, -30); c.lineTo(60, -40); c.lineTo(40, -6); c.lineTo(-56, 0); c.closePath(); c.fill(); c.stroke();
          c.beginPath(); c.moveTo(-6, -36); c.lineTo(-10, -110); c.stroke();
          c.fillStyle = '#fbf3e1'; c.beginPath(); c.moveTo(-10, -106); c.lineTo(30, -70); c.lineTo(-8, -64); c.closePath(); c.fill(); c.stroke();
          c.restore();
          c.fillStyle = '#b8a888'; for (const rx of [-130, -100, 90]) { c.beginPath(); c.moveTo(rx - 20, 0); c.lineTo(rx, -44); c.lineTo(rx + 20, 0); c.closePath(); c.fill(); c.stroke(); }
          c.font = `24px ${FONT}`; c.fillStyle = NAVY; for (let i = 0; i < 4; i++) c.fillText(i % 2 ? '♪' : '♫', -150 + i * 22 + Math.sin(t * 2 + i) * 6, -60 - ((t * 30 + i * 20) % 60));
          break;
        case 'fog':
          c.strokeStyle = '#8a8fa8'; c.lineWidth = 3;
          for (let r = 0; r < 4; r++) { c.beginPath(); for (let k = -120; k <= 120; k += 10) c.lineTo(k + Math.sin(t + r) * 10, -30 - r * 22 + Math.sin(k / 18 + t * 2 + r) * 6); c.stroke(); }
          break;
        case 'loop':
          c.strokeStyle = NAVY; c.lineWidth = 4; c.setLineDash([2, 9]);
          c.beginPath(); for (let a = 0; a < Math.PI * 6; a += 0.1) { const rr = 8 + a * 7; c.lineTo(Math.cos(a + t) * rr, -60 + Math.sin(a + t) * rr * 0.6); } c.stroke(); c.setLineDash([]);
          break;
        case 'cliffs':
          c.fillStyle = '#c2a679'; c.beginPath(); c.moveTo(-120, 0); c.lineTo(-120, -90); c.lineTo(10, -90); c.lineTo(20, -60); c.lineTo(-10, 0); c.closePath(); c.fill(); c.stroke();
          c.beginPath(); c.moveTo(20, -80); c.lineTo(50, -40); c.lineTo(80, -80); c.stroke();
          this.prop('skull', 60, -10, 1.4, 0);
          break;
        case 'swamp':
          c.fillStyle = '#b5d18c'; c.beginPath(); c.ellipse(0, -20, 120, 30, 0, 0, Math.PI * 2); c.fill(); c.stroke();
          c.strokeStyle = '#6b8f3e'; c.lineWidth = 2; for (const gx of [-40, 0, 40]) { c.beginPath(); c.moveTo(gx, -48); c.lineTo(gx, 8); c.stroke(); } c.beginPath(); c.moveTo(-110, -20); c.lineTo(110, -20); c.stroke();
          c.fillStyle = INK; c.font = `16px ${FONT}`; c.textAlign = 'center'; c.fillText('#REF!', -60 + Math.sin(t) * 4, -60 - ((t * 20) % 30)); c.fillText('=SUM(??)', 60, -64 - ((t * 20 + 15) % 30));
          this.prop('reed', -120, -10, 1.2, 0); this.prop('reed', 110, -10, 1.2, 1);
          break;
        case 'snakepit':
          c.fillStyle = '#3a2a1a'; c.beginPath(); c.ellipse(0, -14, 80, 22, 0, Math.PI, 0); c.fill(); c.stroke();
          for (let i = 0; i < 3; i++) { const px = -40 + i * 40, py = -30 - Math.abs(Math.sin(t * 3 + i)) * 26; this.prop('phone', px, py + 20, 1.4, i); }
          c.strokeStyle = '#4d7a32'; c.lineWidth = 4; c.beginPath(); c.moveTo(-90, -6); c.quadraticCurveTo(-70, -30, -56, -8); c.quadraticCurveTo(-46, 8, -30, -10); c.stroke();
          this.prop('skull', 100, -4, 1.4, 0);
          break;
        case 'sands':
          c.strokeStyle = '#b07a43'; c.lineWidth = 3; for (let r = 0; r < 3; r++) { c.beginPath(); c.arc(-60 + r * 60, -10 - r * 14, 50, Math.PI * 1.15, Math.PI * 1.85); c.stroke(); }
          for (let i = 0; i < 3; i++) this.prop('memo', -70 + i * 70 + Math.sin(t * 2 + i) * 10, -40 - i * 10, 1.4, i);
          break;
        case 'caves':
          c.fillStyle = '#a8916b'; c.beginPath(); c.moveTo(-110, 0); c.quadraticCurveTo(-60, -110, 0, -110); c.quadraticCurveTo(70, -110, 110, 0); c.closePath(); c.fill(); c.stroke();
          c.fillStyle = '#2a1d10'; c.beginPath(); c.moveTo(-36, 0); c.quadraticCurveTo(-30, -60, 0, -62); c.quadraticCurveTo(30, -60, 36, 0); c.closePath(); c.fill(); c.stroke();
          this.prop('skull', 70, -10, 1.4, 0);
          break;
        case 'summit':
          c.fillStyle = '#c9c3b2'; c.beginPath(); c.moveTo(-150, 0); c.lineTo(-60, -170); c.lineTo(-10, -100); c.lineTo(40, -150); c.lineTo(150, 0); c.closePath(); c.fill(); c.stroke();
          c.fillStyle = '#fbf7ee'; c.beginPath(); c.moveTo(-82, -128); c.lineTo(-60, -170); c.lineTo(-38, -134); c.lineTo(-52, -140); c.lineTo(-62, -128); c.closePath(); c.fill(); c.stroke();
          ink(c, 2); c.beginPath(); c.moveTo(-60, -170); c.lineTo(-60, -200); c.stroke(); c.fillStyle = ORANGE; c.beginPath(); c.moveTo(-60, -200); c.lineTo(-34, -193); c.lineTo(-60, -186); c.fill(); c.stroke();
          c.font = `italic 16px ${FONT}`; c.fillStyle = INK; c.textAlign = 'center'; c.fillText('allow 3–5 business days', 40, -60);
          break;
        case 'isles':
          c.fillStyle = '#bcd8ee'; c.beginPath(); c.ellipse(0, -16, 140, 28, 0, 0, Math.PI * 2); c.fill(); c.stroke();
          c.fillStyle = '#e8d5a6'; for (const ix of [-80, 0, 80]) { c.beginPath(); c.ellipse(ix, -20, 26, 10, 0, 0, Math.PI * 2); c.fill(); c.stroke(); }
          c.strokeStyle = NAVY; c.lineWidth = 3; c.setLineDash([3, 6]); c.globalAlpha = 0.5 + 0.5 * Math.sin(t * 6);
          c.beginPath(); c.moveTo(-54, -22); c.lineTo(-26, -22); c.moveTo(26, -22); c.lineTo(54, -22); c.stroke(); c.setLineDash([]); c.globalAlpha = 1;
          for (const ix of [-80, 0, 80]) this.prop('lock', ix, -24, 1, 0);
          break;
        case 'toll':
          c.fillStyle = '#bcd8ee'; c.fillRect(-150, -18, 300, 18);
          c.fillStyle = '#9c6a3a'; c.fillRect(-140, -34, 280, 10); c.strokeRect(-140, -34, 280, 10);
          for (let k = -130; k <= 130; k += 26) { c.beginPath(); c.moveTo(k, -34); c.lineTo(k, -24); c.stroke(); }
          c.fillStyle = '#f3e6c8'; c.fillRect(70, -90, 44, 56); c.strokeRect(70, -90, 44, 56);
          c.fillStyle = '#7da65a'; c.beginPath(); c.arc(92, -66, 12, 0, Math.PI * 2); c.fill(); c.stroke();
          c.fillStyle = '#4d7a32'; c.fillRect(80, -80, 24, 4);
          c.font = `15px ${FONT}`; c.fillStyle = INK; c.textAlign = 'center'; c.fillText('TOLL', 92, -96);
          break;
        case 'backchannel':
          c.fillStyle = '#bcd8ee'; c.fillRect(-150, -18, 300, 18);
          c.fillStyle = '#c7b9a0'; c.beginPath(); c.moveTo(-120, -18); c.quadraticCurveTo(0, -90, 120, -18); c.lineTo(100, -18); c.quadraticCurveTo(0, -60, -100, -18); c.closePath(); c.fill(); c.stroke();
          for (let k = -90; k <= 90; k += 30) { c.strokeRect(k - 10, -60 + Math.abs(k) * 0.3, 20, 12); }
          break;
        case 'clients': {
          const g = c.createRadialGradient(0, -80, 10, 0, -80, 150); g.addColorStop(0, 'rgba(255,215,106,.7)'); g.addColorStop(1, 'rgba(255,215,106,0)');
          c.fillStyle = g; c.fillRect(-160, -230, 320, 230);
          c.lineWidth = 22; c.strokeStyle = NAVY; c.lineCap = 'round';
          c.beginPath(); c.moveTo(-50, -130); c.lineTo(50, -30); c.moveTo(50, -130); c.lineTo(-50, -30); c.stroke();
          c.lineWidth = 14; c.strokeStyle = ORANGE;
          c.beginPath(); c.moveTo(-50, -130); c.lineTo(50, -30); c.moveTo(50, -130); c.lineTo(-50, -30); c.stroke();
          for (let i = 0; i < 6; i++) { const a = i / 6 * Math.PI * 2 + t * 0.6; this.prop('star', Math.cos(a) * 110, -60 + Math.sin(a) * 60, 0.9 + 0.3 * Math.sin(t * 4 + i), 0); }
          break;
        }
      }
      c.restore();
    }

    /* Cut-scene art drawn behind the wagon. */
    cutBack(cs, p, t) {
      const c = this.c;
      const k = cs.key;
      const ease = 1 - Math.pow(1 - Math.min(1, p * 1.8), 3);
      if (k === 'arrive' && cs.opts.kind) this.drawLandmark(cs.opts.kind, 1100 - ease * 340, GROUND, 0.7 + ease * 0.35, t);
      const lm = { sirens: 'wreck', fog: 'fog', loop: 'loop', cliffs: 'cliffs', swamp: 'swamp', phones: 'snakepit', caves: 'caves', summit: 'summit', isles: 'isles', bridge: 'toll', finale: 'clients', depart: 'port' }[k];
      if (lm) this.drawLandmark(lm, k === 'depart' ? 120 - ease * 200 : 1100 - ease * 340, GROUND, 0.75 + ease * 0.3, t);
      if (k === 'dragon') {
        c.fillStyle = '#bcd8ee'; c.fillRect(-10, GROUND - 70, W + 20, 70);
        const x0 = 1000 - p * 1300;
        ink(c, 3); c.fillStyle = '#4d6aa8';
        for (let i = 0; i < 4; i++) { const hx = x0 + i * 70; c.beginPath(); c.arc(hx, GROUND - 40, 26, Math.PI, 0); c.fill(); c.stroke(); }
        c.beginPath(); c.ellipse(x0 - 30, GROUND - 74, 24, 16, 0, 0, Math.PI * 2); c.fill(); c.stroke();
        c.fillStyle = '#fbf3e1'; c.beginPath(); c.arc(x0 - 40, GROUND - 78, 6, 0, Math.PI * 2); c.arc(x0 - 24, GROUND - 78, 6, 0, Math.PI * 2); c.fill(); c.stroke();
        c.beginPath(); c.moveTo(x0 - 34, GROUND - 78); c.lineTo(x0 - 30, GROUND - 78); c.stroke();
      }
      if (k === 'steve') {
        const sx = 660; ink(c, 2.5);
        c.fillStyle = '#bcd8ee'; c.beginPath(); c.ellipse(sx + 90, GROUND + 30, 80, 14, 0, 0, Math.PI * 2); c.fill(); c.stroke();
        c.fillStyle = '#8a6a9a'; c.fillRect(sx - 10, GROUND - 40, 22, 32); c.strokeRect(sx - 10, GROUND - 40, 22, 32);
        c.fillStyle = '#f2c79a'; c.beginPath(); c.arc(sx + 1, GROUND - 50, 10, 0, Math.PI * 2); c.fill(); c.stroke();
        c.beginPath(); c.moveTo(sx + 10, GROUND - 30); c.lineTo(sx + 80, GROUND - 90); c.lineTo(sx + 100, GROUND + 26 + Math.sin(t * 2) * 3); c.stroke();
        c.font = `18px ${FONT}`; c.fillStyle = '#fdf3d6'; c.textAlign = 'center'; c.fillText('Steve', sx, GROUND - 68);
      }
      if (k === 'mail') {
        const x = 1000 - ease * 520, bob = Math.abs(Math.sin(t * 12)) * -6;
        c.save(); c.translate(x, GROUND + bob); ink(c, 2.5);
        c.fillStyle = '#7a5a3a'; c.beginPath(); c.ellipse(0, -30, 34, 14, 0, 0, Math.PI * 2); c.fill(); c.stroke();
        c.beginPath(); c.ellipse(-36, -44, 12, 9, -0.5, 0, Math.PI * 2); c.fill(); c.stroke();
        const lg = Math.sin(t * 16) * 10;
        c.beginPath(); c.moveTo(-20, -20); c.lineTo(-20 + lg, 2); c.moveTo(-8, -18); c.lineTo(-8 - lg, 2); c.moveTo(14, -18); c.lineTo(14 + lg, 2); c.moveTo(24, -20); c.lineTo(24 - lg, 2); c.stroke();
        c.fillStyle = '#10196b'; c.fillRect(-6, -70, 16, 26); c.strokeRect(-6, -70, 16, 26);
        c.fillStyle = '#f2c79a'; c.beginPath(); c.arc(2, -78, 8, 0, Math.PI * 2); c.fill(); c.stroke();
        c.fillStyle = '#fffaf0'; c.fillRect(-30, -66, 22, 14); c.strokeRect(-30, -66, 22, 14);
        c.beginPath(); c.moveTo(-30, -66); c.lineTo(-19, -58); c.lineTo(-8, -66); c.stroke();
        c.restore();
      }
      if (k === 'debt') {
        const x = -60 + ease * 230;
        c.fillStyle = 'rgba(42,29,16,.85)';
        c.beginPath(); c.arc(x, GROUND - 70, 14, 0, Math.PI * 2); c.fill();
        c.fillRect(x - 12, GROUND - 56, 24, 40);
        const leg = Math.sin(t * 14) * 10; ink(c, 5); c.strokeStyle = 'rgba(42,29,16,.85)';
        c.beginPath(); c.moveTo(x - 6, GROUND - 16); c.lineTo(x - 6 + leg, GROUND + 6); c.moveTo(x + 6, GROUND - 16); c.lineTo(x + 6 - leg, GROUND + 6);
        c.moveTo(x + 10, GROUND - 48); c.lineTo(x + 34, GROUND - 60); c.stroke();
        c.font = `16px ${FONT}`; c.fillStyle = '#7a2a1a'; c.textAlign = 'center'; c.fillText('PAST YOU', x, GROUND - 92);
      }
    }

    /* Cut-scene effects drawn in front. */
    cutFront(cs, p, t) {
      const c = this.c, k = cs.key;
      if (k === 'emails' || k === 'stampede') {
        const n = k === 'emails' ? 40 : 9;
        for (let i = 0; i < n; i++) {
          if (k === 'emails') {
            const x = (rnd(i) * W + t * 30) % W, y = ((rnd(i, 2) * H + t * (120 + rnd(i, 3) * 120)) % (H + 40)) - 20;
            c.save(); c.translate(x, y); c.rotate((rnd(i, 4) - 0.5)); ink(c, 1.5);
            c.fillStyle = rnd(i, 5) < 0.15 ? '#ffd76a' : '#fffaf0'; c.fillRect(-10, -7, 20, 14); c.strokeRect(-10, -7, 20, 14);
            c.beginPath(); c.moveTo(-10, -7); c.lineTo(0, 1); c.lineTo(10, -7); c.stroke(); c.restore();
          } else {
            const x = 1000 - (p * 1400) + i * 70 + rnd(i) * 30, y = GROUND + 20 + rnd(i, 1) * 50;
            this.prop('memo', x, y + Math.abs(Math.sin(t * 12 + i)) * -8, 1.6, i);
          }
        }
      }
      if (k === 'finale') {
        for (let i = 0; i < 24; i++) {
          const a = rnd(i) * Math.PI * 2, d = p * (120 + rnd(i, 1) * 200);
          this.prop('star', 760 + Math.cos(a) * d, 120 + Math.sin(a) * d * 0.6 + 20, 0.6 + rnd(i, 2), i);
        }
      }
    }

    banner(cs, p) {
      const c = this.c;
      const a = Math.min(1, p * 5, (1 - p) * 6 + 0.4);
      // Vignette
      const g = c.createRadialGradient(W / 2, H / 2, H * 0.3, W / 2, H / 2, W * 0.7);
      g.addColorStop(0, 'rgba(10,19,86,0)'); g.addColorStop(1, `rgba(10,19,86,${0.45 * a})`);
      c.fillStyle = g; c.fillRect(0, 0, W, H);
      if (!cs.opts.title) return;
      c.save(); c.globalAlpha = Math.max(0, a);
      c.font = `34px ${FONT}`;
      const title = cs.opts.title;
      const tw = Math.min(W - 80, c.measureText(title).width + 70);
      const y = 22 + (1 - Math.min(1, p * 6)) * -30;
      // Ribbon
      c.fillStyle = PARCH; ink(c, 2.5);
      c.beginPath(); c.moveTo(W / 2 - tw / 2 - 24, y + 6); c.lineTo(W / 2 - tw / 2, y + 26); c.lineTo(W / 2 - tw / 2 - 24, y + 46); c.lineTo(W / 2 - tw / 2 + 10, y + 46); c.closePath(); c.fill(); c.stroke();
      c.beginPath(); c.moveTo(W / 2 + tw / 2 + 24, y + 6); c.lineTo(W / 2 + tw / 2, y + 26); c.lineTo(W / 2 + tw / 2 + 24, y + 46); c.lineTo(W / 2 + tw / 2 - 10, y + 46); c.closePath(); c.fill(); c.stroke();
      c.fillRect(W / 2 - tw / 2, y, tw, 46); c.strokeRect(W / 2 - tw / 2, y, tw, 46);
      c.fillStyle = cs.key === 'debt' ? '#7a2a1a' : NAVY; c.textAlign = 'center'; c.textBaseline = 'middle';
      c.fillText(title, W / 2, y + 24, tw - 30);
      if (cs.opts.caption) {
        c.font = `20px ${FONT}`;
        const words = cs.opts.caption.split(' '); let line = '', lines = [];
        for (const w of words) { const test = line ? line + ' ' + w : w; if (c.measureText(test).width > W * 0.62) { lines.push(line); line = w; } else line = test; }
        lines.push(line); lines = lines.slice(0, 3);
        const bh = lines.length * 24 + 14, by = y + 56;
        c.fillStyle = 'rgba(245,226,189,.92)'; c.fillRect(W / 2 - W * 0.33, by, W * 0.66, bh); ink(c, 1.5); c.strokeRect(W / 2 - W * 0.33, by, W * 0.66, bh);
        c.fillStyle = INK; lines.forEach((l, i) => c.fillText(l, W / 2, by + 18 + i * 24));
      }
      c.font = `14px ${FONT}`; c.fillStyle = 'rgba(253,243,214,.85)'; c.textAlign = 'right'; c.fillText('click to skip', W - 14, H - 14);
      c.restore();
    }
  }

  PP.TrailScene = TrailScene;
  PP.TrailScene.KINDS = Object.keys(T);
  PP.TrailScene.CUTS = ['depart', 'arrive', 'debt', 'sirens', 'fog', 'loop', 'cliffs', 'swamp', 'phones', 'caves', 'summit', 'isles', 'bridge', 'campfire', 'steve', 'emails', 'stampede', 'dragon', 'breakdown', 'mail', 'finale'];
})(window.PP);
