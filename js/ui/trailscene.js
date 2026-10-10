/* The trail scene: a side-scrolling, hand-inked view of you and your client on the trail,
 * plus cut scenes for landmarks, encounters, and risk debt catching up.
 *
 *   const scene = new PP.TrailScene(canvas);
 *   scene.setTerrain('swamp'); scene.setMoving(true);
 *   await scene.cut('debt', { title: 'Something from earlier', caption: '...' });
 */
(function (PP) {
  const W = 960, H = 320, GROUND = 236;
  const INK = '#4a2c12', NAVY = '#000a62', PARCH = '#f5ddbb', ORANGE = '#f39c12';
  const FONT = '"Kalam", "Open Sans", sans-serif';
  const SANS = '"Open Sans", system-ui, sans-serif';
  const MEADOW = '#dce6bc', SWAMPC = '#c9ddb8', WATER = '#cfe3f7', RIVER = '#9cc2e6', FOG = '#fcf6ee', PARCH2 = '#eed3ad', PARCH3 = '#e3c6a0';
  const rnd = (i, salt = 0) => { const x = Math.sin(i * 127.1 + salt * 311.7) * 43758.5453; return x - Math.floor(x); };

  /* Terrain palette and props for each kind of place. */
  const T = {
    port: { ground: PARCH2, far: 'sea', farFill: WATER, props: ['grass', 'post', 'barrel'] },
    meadow: { ground: PARCH2, far: 'hills', farFill: MEADOW, props: ['tree', 'grass', 'flower', 'flower'] },
    lighthouse: { ground: PARCH2, far: 'sea', farFill: WATER, props: ['grass', 'rock', 'grass'] },
    wreck: { ground: PARCH2, far: 'sea', farFill: WATER, props: ['rock', 'grass', 'rock'] },
    fog: { ground: PARCH2, far: 'hills', farFill: '#e9e3d6', props: ['grass', 'post', 'rock'], fog: 0.55 },
    loop: { ground: PARCH2, far: 'hills', farFill: PARCH3, props: ['paper', 'grass', 'sign'] },
    cliffs: { ground: PARCH2, far: 'cliffs', farFill: PARCH3, props: ['rock', 'grass', 'skull'] },
    swamp: { ground: SWAMPC, far: 'swamp', farFill: MEADOW, props: ['reed', 'reed', 'grid', 'tree'] },
    snakepit: { ground: SWAMPC, far: 'swamp', farFill: MEADOW, props: ['reed', 'phone', 'skull'] },
    sands: { ground: '#f1d9a8', far: 'dunes', farFill: '#ecd09c', props: ['memo', 'cactus', 'grass'] },
    caves: { ground: PARCH2, far: 'cliffs', farFill: PARCH3, props: ['rock', 'skull', 'rock'] },
    summit: { ground: PARCH2, far: 'mountains', farFill: FOG, props: ['pine', 'rock', 'pine'] },
    isles: { ground: PARCH2, far: 'river', farFill: WATER, props: ['grass', 'lock', 'post'] },
    toll: { ground: PARCH2, far: 'river', farFill: WATER, props: ['grass', 'post', 'sign'] },
    backchannel: { ground: PARCH2, far: 'river', farFill: WATER, props: ['grass', 'rock', 'tree'] },
    clients: { ground: PARCH2, far: 'hills', farFill: MEADOW, props: ['flower', 'tree', 'star'] }
  };
  const SIGNS = ['ADVICE 2 MI', 'NO U-TURNS (EXCEPT ALL OF THEM)', 'SCOPE CREEK', 'NOW ENTERING: AMBIGUITY', 'REPLY-ALL RANCH', 'TRUST ME, 5 MI', 'CIRCLE BACK RD'];

  function ink(c, w = 1.8) { c.strokeStyle = INK; c.lineWidth = w; c.lineJoin = 'round'; c.lineCap = 'round'; }

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
      // Phones get a narrower window onto the same 960-wide scene, centred on the hikers.
      this.vw = window.innerWidth < 600 ? 560 : W;
      this.ox = (W - this.vw) / 2;
      this.lmx = this.vw < W ? 640 : 760;
      this.cv.width = this.vw * dpr; this.cv.height = H * dpr;
      this.cv.classList.toggle('narrow', this.vw < W);
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
        const cs = (this.cutState = { key, opts, start: this.t, dur: dur / 1000, resolve: () => { if (this.cutState === cs) this.cutState = null; resolve(); } });
        setTimeout(() => { if (this.cutState === cs) cs.resolve(); }, dur);
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
      c.translate(-this.ox, 0);
      if (cs && (cs.key === 'debt' || cs.key === 'stampede' || cs.key === 'breakdown') && cutP < 0.5 && !this.reduced) c.translate((rnd(Math.floor(t * 30)) - 0.5) * 6, (rnd(Math.floor(t * 30), 2) - 0.5) * 4);

      // Sky
      c.fillStyle = nightCut ? '#262c66' : darkCut ? '#d9c7a6' : PARCH; c.fillRect(-10, -10, W + 20, GROUND + 10);
      if (nightCut) this.stars(); else this.compass();
      this.clouds(darkCut);

      // Far layer
      this.far(terr, this.off * 0.18);
      // Mid props
      this.props(terr, this.off * 0.55, 0.75, GROUND - 6);
      // Ground
      c.fillStyle = terr.ground; c.fillRect(-10, GROUND, W + 20, H - GROUND + 10);
      ink(c, 1.6); c.beginPath(); c.moveTo(-10, GROUND); c.lineTo(W + 10, GROUND); c.stroke();
      // Ground texture tufts
      for (let i = 0; i < 30; i++) {
        const x = ((i * 53 - this.off * 1.0) % (W + 60) + W + 60) % (W + 60) - 30;
        const gy = 302 - (i % 3) * 12;
        c.strokeStyle = 'rgba(63,122,47,.55)'; c.lineWidth = 1.3;
        if (i % 4 === 0) { c.fillStyle = ORANGE; c.beginPath(); c.arc(x, gy - 3, 2.6, 0, Math.PI * 2); c.fill(); }
        else { c.beginPath(); c.moveTo(x - 4, gy); c.lineTo(x, gy - 7); c.lineTo(x + 4, gy); c.stroke(); }
      }
      // Dotted trail
      c.fillStyle = NAVY;
      for (let x = -(this.off % 16); x < W + 16; x += 16) { c.beginPath(); c.arc(x, 270, 2.6, 0, Math.PI * 2); c.fill(); }

      // Landmark when stopped at one
      if (this.landmark && !(cs && cs.key === 'arrive')) this.drawLandmark(this.landmark, this.lmx, GROUND, 1, t);

      // Cut-scene background art (behind the hikers)
      if (cs) this.cutBack(cs, cutP, t);

      // You and your client
      this.hikers(320, 268, this.moving || (cs && cs.key === 'depart'), cs && cs.key === 'breakdown' ? cutP : 0);

      // Foreground props
      this.props(terr, this.off * 1.35, 1.15, H - 6, true);

      // Weather
      const fogAmt = (terr.fog || 0) + (cs && cs.key === 'fog' ? 0.5 * Math.sin(cutP * Math.PI) : 0);
      if (fogAmt) this.fog(fogAmt);
      if (this._wisps) { const w = this._wisps; this._wisps = null; c.save(); c.translate(w.x, w.y); c.scale(w.s, w.s); this.creature('wisps', t, w.pop); c.restore(); }
      if (cs) this.cutFront(cs, cutP, t);
      if (nightCut) { c.fillStyle = 'rgba(16,25,107,.28)'; c.fillRect(0, 0, W, H); this.campfire(cs.key === 'steve' ? 640 : 470, 286, t); }
      c.restore();

      // Vignette + banner on top of everything
      if (cs) this.banner(cs, cutP);
    }

    compass() {
      const c = this.c, x = this.ox + this.vw - 80, y = 64;
      ink(c, 1.4); c.fillStyle = FOG;
      c.beginPath(); c.arc(x, y, 26, 0, Math.PI * 2); c.fill(); c.stroke();
      c.beginPath(); c.arc(x, y, 20, 0, Math.PI * 2); c.setLineDash([1.5, 3]); c.stroke(); c.setLineDash([]);
      for (let i = 0; i < 4; i++) {
        const a = i * Math.PI / 2 - Math.PI / 2;
        c.fillStyle = i === 0 ? ORANGE : INK;
        c.beginPath(); c.moveTo(x + Math.cos(a) * 30, y + Math.sin(a) * 30);
        c.lineTo(x + Math.cos(a + 0.5) * 6, y + Math.sin(a + 0.5) * 6); c.lineTo(x + Math.cos(a - 0.5) * 6, y + Math.sin(a - 0.5) * 6); c.closePath(); c.fill();
      }
      c.font = `600 11px ${SANS}`; c.fillStyle = NAVY; c.textAlign = 'center'; c.textBaseline = 'alphabetic'; c.fillText('N', x, y - 34);
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
        c.fillStyle = dark ? '#cdbfa4' : FOG; ink(c, 1.3);
        c.beginPath();
        c.arc(x, y, 16, Math.PI * 0.5, Math.PI * 1.5); c.arc(x + 20, y - 10, 18, Math.PI, Math.PI * 2); c.arc(x + 44, y, 16, Math.PI * 1.5, Math.PI * 0.5); c.closePath();
        c.fill(); c.stroke();
      }
    }

    far(terr, o) {
      const c = this.c;
      c.fillStyle = terr.farFill; ink(c, 1.6);
      const base = GROUND;
      if (terr.far === 'sea' || terr.far === 'river') {
        c.fillRect(-10, base - 70, W + 20, 70);
        c.strokeStyle = RIVER; c.lineWidth = 1.6;
        for (let r = 0; r < 3; r++) for (let x = -(o * (1 + r * 0.3) % 60) - 60; x < W + 60; x += 60) {
          const y = base - 55 + r * 18 + Math.sin(this.t * 2 + x * 0.05) * 2;
          c.beginPath(); c.moveTo(x, y); c.quadraticCurveTo(x + 15, y - 7, x + 30, y); c.stroke();
        }
        ink(c, 1.6); c.beginPath(); c.moveTo(-10, base - 70); c.lineTo(W + 10, base - 70); c.stroke();
        if (terr.far === 'river') { for (let i = 0; i < 3; i++) { const x = ((i * 380 - o * 1.2) % (W + 300) + W + 300) % (W + 300) - 150; c.fillStyle = MEADOW; c.beginPath(); c.ellipse(x, base - 40, 46, 12, 0, 0, Math.PI * 2); c.fill(); ink(c, 2); c.stroke(); } }
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
        c.fillStyle = '#ffffff';
        for (let i = -1; i < 8; i++) { const px = i * 160 - (o % 160) + 80; c.beginPath(); c.moveTo(px - 26, GROUND - 145); c.lineTo(px, GROUND - 180 + 0); c.lineTo(px + 26, GROUND - 145); c.closePath(); c.globalAlpha = 0.85; c.fill(); c.globalAlpha = 1; }
      }
      if (terr.far === 'swamp') { // gridlines
        c.strokeStyle = 'rgba(63,122,47,.45)'; c.lineWidth = 1;
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
      c.save(); c.translate(x, y); c.scale(s, s); ink(c, 1.6);
      switch (kind) {
        case 'tree':
          c.fillStyle = '#b9cf8f'; c.beginPath(); c.arc(0, -46, 20, 0, Math.PI * 2); c.arc(-14, -34, 14, 0, Math.PI * 2); c.arc(14, -34, 14, 0, Math.PI * 2); c.fill(); c.stroke();
          c.beginPath(); c.moveTo(0, -24); c.lineTo(0, 0); c.stroke(); break;
        case 'pine':
          c.fillStyle = '#9fbd7a'; c.beginPath(); c.moveTo(0, -60); c.lineTo(16, -14); c.lineTo(-16, -14); c.closePath(); c.fill(); c.stroke();
          c.beginPath(); c.moveTo(0, -14); c.lineTo(0, 0); c.stroke(); break;
        case 'grass':
          c.strokeStyle = '#3f7a2f'; for (let k = -1; k <= 1; k++) { c.beginPath(); c.moveTo(k * 8 - 5, 0); c.lineTo(k * 8, -12); c.lineTo(k * 8 + 5, 0); c.stroke(); } break;
        case 'flower':
          c.strokeStyle = '#3f7a2f'; c.beginPath(); c.moveTo(0, 0); c.lineTo(0, -14); c.stroke();
          c.fillStyle = ORANGE; c.beginPath(); c.arc(0, -16, 5, 0, Math.PI * 2); c.fill(); ink(c, 1.5); c.stroke(); break;
        case 'rock':
          c.fillStyle = '#e3c6a0'; c.beginPath(); c.moveTo(-18, 0); c.quadraticCurveTo(-14, -20, 0, -22); c.quadraticCurveTo(16, -18, 18, 0); c.closePath(); c.fill(); c.stroke(); break;
        case 'reed':
          c.strokeStyle = '#3f7a2f'; for (let k = 0; k < 4; k++) { c.beginPath(); c.moveTo(k * 5, 0); c.quadraticCurveTo(k * 5 + 2, -18, k * 5 - 2, -34 - k * 3); c.stroke(); }
          c.fillStyle = '#7a5a3a'; c.fillRect(8, -40, 4, 10); break;
        case 'grid':
          c.fillStyle = 'rgba(169,201,90,.6)'; c.beginPath(); c.ellipse(0, -4, 34, 8, 0, 0, Math.PI * 2); c.fill(); c.stroke();
          c.beginPath(); c.moveTo(-12, -11); c.lineTo(-12, 3); c.moveTo(12, -11); c.lineTo(12, 3); c.moveTo(-30, -4); c.lineTo(30, -4); c.stroke(); break;
        case 'post':
          c.fillStyle = '#b0763c'; c.fillRect(-3, -30, 6, 30); c.strokeRect(-3, -30, 6, 30); break;
        case 'barrel':
          c.fillStyle = '#b07a43'; c.beginPath(); c.ellipse(0, -14, 11, 14, 0, 0, Math.PI * 2); c.fill(); c.stroke();
          c.beginPath(); c.moveTo(-11, -18); c.lineTo(11, -18); c.moveTo(-11, -10); c.lineTo(11, -10); c.stroke(); break;
        case 'sign': {
          const text = SIGNS[Math.abs(i) % SIGNS.length];
          c.fillStyle = '#b0763c'; c.fillRect(-2, -40, 4, 40);
          c.font = `600 12px ${SANS}`; const w = c.measureText(text).width + 14;
          c.fillStyle = '#fbf1e1'; c.fillRect(-w / 2, -58, w, 22); c.strokeRect(-w / 2, -58, w, 22);
          c.fillStyle = INK; c.textAlign = 'center'; c.fillText(text, 0, -42); break;
        }
        case 'paper':
          c.fillStyle = '#fbf1e1'; c.save(); c.rotate((rnd(i) - 0.5) * 0.8); c.fillRect(-9, -12, 18, 12); c.strokeRect(-9, -12, 18, 12);
          c.beginPath(); c.moveTo(-5, -8); c.lineTo(5, -8); c.moveTo(-5, -4); c.lineTo(3, -4); c.stroke(); c.restore(); break;
        case 'memo':
          c.fillStyle = '#fbf1e1'; c.fillRect(-12, -26, 24, 18); c.strokeRect(-12, -26, 24, 18);
          c.fillStyle = ORANGE; c.beginPath(); c.arc(0, -17, 4, 0, Math.PI * 2); c.fill();
          c.beginPath(); c.moveTo(-6, -8); c.lineTo(-8, 0); c.moveTo(6, -8); c.lineTo(8, 0); c.stroke(); break;
        case 'cactus':
          c.fillStyle = '#b9cf8f'; c.beginPath(); c.roundRect ? c.roundRect(-6, -40, 12, 40, 6) : c.rect(-6, -40, 12, 40); c.fill(); c.stroke();
          c.beginPath(); c.moveTo(-6, -22); c.lineTo(-14, -22); c.lineTo(-14, -32); c.moveTo(6, -16); c.lineTo(14, -16); c.lineTo(14, -28); c.stroke(); break;
        case 'skull':
          c.fillStyle = '#fcf6ee'; c.beginPath(); c.arc(0, -12, 9, 0, Math.PI * 2); c.fill(); c.stroke();
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

    /* You (leading, big pack, walking stick) and your client (behind, daypack). */
    hikers(x, y, moving, broken) {
      const c = this.c;
      const walk = moving ? this.t * 7 : 0;
      const limb = (x1, y1, x2, y2, col, w) => {
        c.lineCap = 'round'; c.strokeStyle = INK; c.lineWidth = w + 2.6; c.beginPath(); c.moveTo(x1, y1); c.lineTo(x2, y2); c.stroke();
        c.strokeStyle = col; c.lineWidth = w; c.beginPath(); c.moveTo(x1, y1); c.lineTo(x2, y2); c.stroke();
      };
      const person = (px, o) => {
        const sw = moving ? Math.sin(walk + o.phase) * 9 : 0;
        const bob = moving ? -Math.abs(Math.sin(walk + o.phase)) * 2 : 0;
        c.save(); c.translate(px, y + bob);
        c.fillStyle = 'rgba(74,44,18,.12)'; c.beginPath(); c.ellipse(0, 0, 16, 2.6, 0, 0, Math.PI * 2); c.fill();
        // legs
        limb(-3, -30, -3 - sw * 0.7, -2, '#6b5a48', 3); limb(4, -30, 4 + sw * 0.7, -2, '#6b5a48', 3);
        // pack
        ink(c, 1.6); c.fillStyle = o.pack;
        const ph = o.bigPack ? 32 : 20;
        c.beginPath(); c.roundRect ? c.roundRect(-22, -64, 14, ph, 4) : c.rect(-22, -64, 14, ph); c.fill(); c.stroke();
        if (o.bigPack) { c.fillStyle = '#c86f4f'; c.beginPath(); c.ellipse(-15, -67, 9, 4, 0, 0, Math.PI * 2); c.fill(); c.stroke(); }
        // torso (same shape as the figure art)
        c.fillStyle = o.coat; ink(c, 2);
        c.beginPath(); c.moveTo(-10, -62); c.quadraticCurveTo(0, -68, 10, -62); c.lineTo(9, -30); c.lineTo(-9, -30); c.closePath(); c.fill(); c.stroke();
        // arm with stick or map
        const hx = 14 + sw * 0.35, hy = -42;
        if (o.stick) { c.strokeStyle = '#7a5a3a'; c.lineWidth = 2.4; c.beginPath(); c.moveTo(hx, hy - 8); c.lineTo(hx + 6, -1); c.stroke(); }
        limb(5, -58, hx, hy, o.coat, 3);
        if (o.map) { ink(c, 1.3); c.fillStyle = '#fbf1e1'; c.fillRect(hx - 2, hy - 9, 13, 10); c.strokeRect(hx - 2, hy - 9, 13, 10); c.beginPath(); c.moveTo(hx + 2, hy - 9); c.lineTo(hx + 2, hy + 1); c.moveTo(hx + 6, hy - 9); c.lineTo(hx + 6, hy + 1); c.stroke(); }
        // head
        ink(c, 2); c.fillStyle = o.skin;
        c.beginPath(); c.arc(1, -75, 9.5, 0, Math.PI * 2); c.fill(); c.stroke();
        c.fillStyle = o.hair; c.beginPath(); c.moveTo(-8.5, -76); c.quadraticCurveTo(-8, -86.5, 1, -86.5); c.quadraticCurveTo(10, -86.5, 10.5, -76); c.quadraticCurveTo(5, -81, 1, -81); c.quadraticCurveTo(-4, -81, -8.5, -76); c.closePath(); c.fill(); ink(c, 1.6); c.stroke();
        if (o.hat) { c.fillStyle = NAVY; c.beginPath(); c.moveTo(-9, -80); c.quadraticCurveTo(1, -92, 11, -80); c.closePath(); c.fill(); c.stroke(); c.beginPath(); c.moveTo(9, -80); c.lineTo(16, -79); c.stroke(); }
        c.fillStyle = INK; c.beginPath(); c.arc(5, -75, 1.3, 0, Math.PI * 2); c.fill();
        c.lineWidth = 1.3; c.beginPath(); c.moveTo(4, -70.5); c.quadraticCurveTo(6.5, -69, 8, -71); c.stroke();
        c.restore();
      };
      person(x - 72, { coat: '#7f9f5a', pack: '#b0763c', skin: '#e6bb93', hair: '#8a4a2a', phase: 1.7, map: true });
      person(x, { coat: NAVY, pack: ORANGE, skin: '#f3d6b6', hair: '#4a2c12', hat: true, bigPack: !broken, stick: true, phase: 0 });
      if (broken) {
        c.save();
        c.translate(x - 15 + broken * 520, y - 40 - Math.abs(Math.sin(broken * 12)) * 40 * (1 - broken));
        c.rotate(broken * 14); ink(c, 1.8); c.fillStyle = ORANGE; c.fillRect(-8, -16, 16, 32); c.strokeRect(-8, -16, 16, 32);
        c.restore();
      }
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
    drawLandmark(kind, x, y, s, t, pop = 1) {
      const c = this.c;
      c.save(); c.translate(x, y); c.scale(s, s); ink(c, 2);
      const label = (txt) => { c.font = `22px ${FONT}`; c.textAlign = 'center'; c.fillStyle = INK; c.fillText(txt, 0, 26); };
      switch (kind) {
        case 'port':
          c.fillStyle = '#b0763c'; c.fillRect(-90, -20, 150, 10); c.strokeRect(-90, -20, 150, 10);
          for (const px of [-80, -40, 0, 40]) { c.beginPath(); c.moveTo(px, -10); c.lineTo(px, 6); c.stroke(); }
          for (const [hx, hh, col] of [[-70, 40, '#fbf1e1'], [-30, 56, '#fbf1e1'], [14, 44, '#fbf1e1']]) {
            c.fillStyle = col; c.fillRect(hx, -20 - hh, 34, hh); c.strokeRect(hx, -20 - hh, 34, hh);
            c.fillStyle = '#c86f4f'; c.beginPath(); c.moveTo(hx - 4, -20 - hh); c.lineTo(hx + 17, -38 - hh); c.lineTo(hx + 38, -20 - hh); c.closePath(); c.fill(); c.stroke();
          }
          break;
        case 'meadow':
          c.fillStyle = '#dce6bc'; c.beginPath(); c.ellipse(0, -10, 110, 34, 0, Math.PI, 0); c.fill(); c.stroke();
          c.strokeStyle = '#3f7a2f'; for (let i = 0; i < 6; i++) { const gx = -80 + i * 30, gy = -18 - (i % 2) * 12; c.beginPath(); c.moveTo(gx - 5, gy); c.lineTo(gx, gy - 10); c.lineTo(gx + 5, gy); c.stroke(); }
          c.fillStyle = ORANGE; for (let i = 0; i < 5; i++) { c.beginPath(); c.arc(-70 + i * 36, -14 - (i % 3) * 8, 4.5, 0, Math.PI * 2); c.fill(); }
          ink(c, 2.5); c.fillStyle = '#b0763c'; c.fillRect(30, -34, 40, 6); c.strokeRect(30, -34, 40, 6); c.beginPath(); c.moveTo(34, -28); c.lineTo(34, -14); c.moveTo(66, -28); c.lineTo(66, -14); c.stroke();
          break;
        case 'lighthouse': {
          c.fillStyle = '#ffffff'; c.beginPath(); c.moveTo(-22, 0); c.lineTo(-14, -140); c.lineTo(14, -140); c.lineTo(22, 0); c.closePath(); c.fill(); c.stroke();
          c.fillStyle = '#c86f4f'; for (const yy of [-36, -86]) { c.beginPath(); c.moveTo(-20 + (yy / -140) * 6, yy); c.lineTo(20 - (yy / -140) * 6, yy); c.lineTo(19 - (yy / -140) * 6, yy - 18); c.lineTo(-19 + (yy / -140) * 6, yy - 18); c.closePath(); c.fill(); c.stroke(); }
          c.fillStyle = '#ffd76a'; c.fillRect(-12, -162, 24, 22); c.strokeRect(-12, -162, 24, 22);
          c.fillStyle = INK; c.beginPath(); c.moveTo(-16, -162); c.lineTo(0, -178); c.lineTo(16, -162); c.closePath(); c.fill();
          const a = Math.sin(t * 1.4) * 0.6;
          c.save(); c.translate(0, -151); c.rotate(a); c.fillStyle = 'rgba(255,215,106,.35)'; c.beginPath(); c.moveTo(0, 0); c.lineTo(-260, -50); c.lineTo(-260, 40); c.closePath(); c.fill(); c.restore();
          c.strokeStyle = ORANGE; c.lineWidth = 3; for (const k of [-1, 0, 1]) { c.beginPath(); c.moveTo(18, -151 + k * 10); c.lineTo(36, -151 + k * 16); c.stroke(); }
          break;
        }
        case 'wreck':
          c.fillStyle = '#b0763c'; c.save(); c.rotate(-0.18);
          c.beginPath(); c.moveTo(-70, -30); c.lineTo(60, -40); c.lineTo(40, -6); c.lineTo(-56, 0); c.closePath(); c.fill(); c.stroke();
          c.beginPath(); c.moveTo(-6, -36); c.lineTo(-10, -110); c.stroke();
          c.fillStyle = '#fcf6ee'; c.beginPath(); c.moveTo(-10, -106); c.lineTo(30, -70); c.lineTo(-8, -64); c.closePath(); c.fill(); c.stroke();
          c.restore();
          c.fillStyle = '#e3c6a0'; ink(c, 2);
          for (const [rx, rw, rh] of [[-96, 34, 30], [84, 32, 28]]) { c.beginPath(); c.moveTo(rx - rw, 0); c.quadraticCurveTo(rx - rw + 4, -rh, rx, -rh - 2); c.quadraticCurveTo(rx + rw - 4, -rh, rx + rw, 0); c.closePath(); c.fill(); c.stroke(); }
          break;
        case 'fog':
          c.strokeStyle = '#8a8fa8'; c.lineWidth = 3;
          for (let r = 0; r < 4; r++) { c.beginPath(); for (let k = -120; k <= 120; k += 10) c.lineTo(k + Math.sin(t + r) * 10, -30 - r * 22 + Math.sin(k / 18 + t * 2 + r) * 6); c.stroke(); }
          break;
        case 'loop':
          c.strokeStyle = NAVY; c.lineWidth = 4; c.setLineDash([0.1, 11]);
          c.beginPath(); c.ellipse(0, -4, 120, 10, 0, 0, Math.PI * 2); c.stroke(); c.setLineDash([]);
          break;
        case 'cliffs':
          c.fillStyle = '#e3c6a0'; c.beginPath(); c.moveTo(-120, 0); c.lineTo(-120, -90); c.lineTo(10, -90); c.lineTo(20, -60); c.lineTo(-10, 0); c.closePath(); c.fill(); c.stroke();
          c.beginPath(); c.moveTo(20, -80); c.lineTo(50, -40); c.lineTo(80, -80); c.stroke();
          this.prop('skull', 60, -10, 1.4, 0);
          break;
        case 'swamp':
          c.fillStyle = '#c9ddb8'; c.beginPath(); c.ellipse(0, -20, 120, 30, 0, 0, Math.PI * 2); c.fill(); c.stroke();
          c.strokeStyle = '#6b8f3e'; c.lineWidth = 2; for (const gx of [-40, 0, 40]) { c.beginPath(); c.moveTo(gx, -48); c.lineTo(gx, 8); c.stroke(); } c.beginPath(); c.moveTo(-110, -20); c.lineTo(110, -20); c.stroke();
          c.fillStyle = INK; c.font = `16px ${FONT}`; c.textAlign = 'center'; c.fillText('#REF!', -92 + Math.sin(t) * 4, -112 - ((t * 20) % 30)); c.fillText('=SUM(??)', 62, -120 - ((t * 20 + 15) % 30));
          this.prop('reed', -120, -10, 1.2, 0); this.prop('reed', 110, -10, 1.2, 1);
          break;
        case 'snakepit':
          c.fillStyle = '#7a5a3a'; c.beginPath(); c.ellipse(0, -8, 84, 18, 0, 0, Math.PI * 2); c.fill(); c.stroke();
          c.fillStyle = '#4a3420'; c.beginPath(); c.ellipse(0, -10, 64, 11, 0, 0, Math.PI * 2); c.fill(); ink(c, 1.6); c.stroke();
          c.strokeStyle = '#3f7a2f'; c.lineWidth = 3; c.beginPath(); c.moveTo(-104, -2); c.quadraticCurveTo(-96, -16, -88, -4); c.quadraticCurveTo(-82, 6, -74, -6); c.stroke();
          this.prop('skull', 100, -2, 1.3, 0);
          break;
        case 'sands':
          c.strokeStyle = '#b07a43'; c.lineWidth = 3; for (let r = 0; r < 3; r++) { c.beginPath(); c.arc(-60 + r * 60, -10 - r * 14, 50, Math.PI * 1.15, Math.PI * 1.85); c.stroke(); }
          ink(c, 2); c.fillStyle = '#b0763c'; c.fillRect(-122, -78, 4, 78); c.strokeRect(-122, -78, 4, 78);
          c.fillStyle = ORANGE; c.beginPath(); c.moveTo(-118, -78); c.lineTo(-84 + Math.sin(t * 3) * 3, -70); c.lineTo(-118, -60); c.closePath(); c.fill(); c.stroke();
          c.font = `700 10px ${SANS}`; c.fillStyle = INK; c.textAlign = 'center'; c.fillText('#1', -106, -66);
          break;
        case 'caves':
          c.fillStyle = '#d8b98f'; c.beginPath(); c.moveTo(-110, 0); c.quadraticCurveTo(-60, -110, 0, -110); c.quadraticCurveTo(70, -110, 110, 0); c.closePath(); c.fill(); c.stroke();
          c.fillStyle = '#7a5a3a'; c.beginPath(); c.moveTo(-36, 0); c.quadraticCurveTo(-30, -60, 0, -62); c.quadraticCurveTo(30, -60, 36, 0); c.closePath(); c.fill(); c.stroke();
          break;
        case 'summit':
          c.fillStyle = '#fcf6ee'; c.beginPath(); c.moveTo(-150, 0); c.lineTo(-60, -170); c.lineTo(-10, -100); c.lineTo(40, -150); c.lineTo(150, 0); c.closePath(); c.fill(); c.stroke();
          c.fillStyle = '#ffffff'; c.beginPath(); c.moveTo(-82, -128); c.lineTo(-60, -170); c.lineTo(-38, -134); c.lineTo(-52, -140); c.lineTo(-62, -128); c.closePath(); c.fill(); c.stroke();
          ink(c, 2); c.beginPath(); c.moveTo(-60, -170); c.lineTo(-60, -200); c.stroke(); c.fillStyle = ORANGE; c.beginPath(); c.moveTo(-60, -200); c.lineTo(-34, -193); c.lineTo(-60, -186); c.fill(); c.stroke();
          break;
        case 'isles':
          c.fillStyle = '#cfe3f7'; c.beginPath(); c.ellipse(0, -16, 140, 28, 0, 0, Math.PI * 2); c.fill(); c.stroke();
          c.fillStyle = '#eed3ad'; for (const ix of [-104, 92]) { c.beginPath(); c.ellipse(ix, -18, 24, 9, 0, 0, Math.PI * 2); c.fill(); c.stroke(); }
          for (const ix of [-104, 92]) this.prop('lock', ix, -22, 1, 0);
          break;
        case 'toll':
          c.fillStyle = '#cfe3f7'; c.fillRect(-150, -18, 300, 18);
          c.fillStyle = '#fbf1e1'; c.fillRect(66, -88, 40, 54); c.strokeRect(66, -88, 40, 54);
          c.fillStyle = '#c86f4f'; c.beginPath(); c.moveTo(60, -88); c.lineTo(86, -104); c.lineTo(112, -88); c.closePath(); c.fill(); c.stroke();
          c.fillStyle = '#7a5a3a'; c.fillRect(74, -76, 24, 20); c.strokeRect(74, -76, 24, 20);
          c.font = `13px ${FONT}`; c.fillStyle = INK; c.textAlign = 'center'; c.fillText('TOLL', 86, -40);
          this.creature('toll', t, pop, 'back');
          c.fillStyle = '#b0763c'; ink(c, 2); c.fillRect(-140, -34, 280, 10); c.strokeRect(-140, -34, 280, 10);
          for (let k = -130; k <= 130; k += 26) { c.beginPath(); c.moveTo(k, -34); c.lineTo(k, -24); c.stroke(); }
          break;
        case 'backchannel':
          c.fillStyle = '#cfe3f7'; c.fillRect(-150, -18, 300, 18);
          c.fillStyle = '#e3c6a0'; c.beginPath(); c.moveTo(-120, -18); c.quadraticCurveTo(0, -90, 120, -18); c.lineTo(100, -18); c.quadraticCurveTo(0, -60, -100, -18); c.closePath(); c.fill(); c.stroke();
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
      this.creature(kind, t, pop);
      if (kind === 'fog') this._wisps = { x, y, s, pop };
      c.restore();
    }

    /* The guardian creature of each landmark, drawn in the landmark's local frame
     * (x = 0 at the landmark, y = 0 on the ground). Kept between x -150 and +115 so it
     * stays in the phone window and clear of the hikers. pop scales it in on arrival. */
    creature(kind, t, pop = 1, layer = 'front') {
      if (pop <= 0) return;
      const c = this.c, P = Math.PI * 2, S = Math.sin;
      const dot = (x, y, r, col = INK) => { c.fillStyle = col; c.beginPath(); c.arc(x, y, r, 0, P); c.fill(); };
      const blinking = (seed) => ((t + seed * 1.37) % 3.4) < 0.14;
      const eyes = (x, y, gap, r = 1.7, seed = 0) => {
        if (blinking(seed)) { ink(c, 1.5); c.beginPath(); c.moveTo(x - gap / 2 - r, y); c.lineTo(x - gap / 2 + r, y); c.moveTo(x + gap / 2 - r, y); c.lineTo(x + gap / 2 + r, y); c.stroke(); }
        else { dot(x - gap / 2, y, r); dot(x + gap / 2, y, r); }
      };
      const happy = (x, y, gap, r = 2.2) => { ink(c, 1.5); c.beginPath(); c.arc(x - gap / 2, y + 1, r, Math.PI * 1.1, Math.PI * 1.9); c.moveTo(x + gap / 2 + r * Math.cos(Math.PI * 1.1), y + 1 + r * Math.sin(Math.PI * 1.1)); c.arc(x + gap / 2, y + 1, r, Math.PI * 1.1, Math.PI * 1.9); c.stroke(); };
      const smile = (x, y, w = 3) => { ink(c, 1.4); c.beginPath(); c.arc(x, y - w * 0.5, w, 0.2 * Math.PI, 0.8 * Math.PI); c.stroke(); };
      const blush = (x, y) => { c.fillStyle = 'rgba(200,111,79,.4)'; c.beginPath(); c.ellipse(x, y, 2.6, 1.6, 0, 0, P); c.fill(); };
      const fillStroke = (fill, w = 2) => { c.fillStyle = fill; c.fill(); ink(c, w); c.stroke(); };
      const bubble = (x, y, rx, ry, tx, ty) => {
        c.beginPath(); c.moveTo(x - rx * 0.25, y + ry * 0.6); c.lineTo(tx, ty); c.lineTo(x + rx * 0.2, y + ry * 0.7); fillStroke('#fbf1e1', 1.5);
        c.beginPath(); c.ellipse(x, y, rx, ry, 0, 0, P); fillStroke('#fbf1e1', 1.5);
        c.beginPath(); c.moveTo(x - rx * 0.25 + 1.5, y + ry * 0.55); c.lineTo(tx + (x - tx) * 0.12, ty + (y - ty) * 0.12); c.lineTo(x + rx * 0.2 - 1.5, y + ry * 0.62); c.closePath(); c.fillStyle = '#fbf1e1'; c.fill();
      };
      const cloud = (x, y, k = 1, fill = FOG) => { c.beginPath(); c.arc(x - 5 * k, y + 1 * k, 4 * k, Math.PI * 0.5, Math.PI * 1.5); c.arc(x, y - 2 * k, 5 * k, Math.PI, 0); c.arc(x + 5 * k, y + 1 * k, 4 * k, Math.PI * 1.5, Math.PI * 0.5); c.closePath(); fillStroke(fill, 1.3); };
      const note = (x, y, a) => { c.globalAlpha = a; c.fillStyle = NAVY; c.strokeStyle = NAVY; c.lineWidth = 1.8; c.beginPath(); c.ellipse(x, y, 3.6, 2.6, -0.4, 0, P); c.fill(); c.beginPath(); c.moveTo(x + 3, y - 1); c.lineTo(x + 3, y - 14); c.quadraticCurveTo(x + 6, y - 10, x + 9, y - 9); c.stroke(); c.globalAlpha = 1; };
      // A tapered tube (tails, necks, tentacles): pts = [[x, y, width], ...]
      const tube = (pts, fill) => {
        c.lineCap = 'round'; c.lineJoin = 'round';
        for (const pass of [0, 1]) for (let i = 1; i < pts.length; i++) {
          const [x0, y0, w0] = pts[i - 1], [x1, y1, w1] = pts[i];
          c.strokeStyle = pass ? fill : INK; c.lineWidth = (w0 + w1) / 2 + (pass ? 0 : 3.8);
          c.beginPath(); c.moveTo(x0, y0); c.lineTo(x1, y1); c.stroke();
        }
      };
      c.save();
      if (pop !== 1) { c.translate(0, -30); c.scale(pop, pop); c.translate(0, 30); }
      switch (kind) {
        case 'meadow': { // Small-Talk Sprites, each with a little weather report
          const bodies = ['#fcf6ee', '#ffd76a', '#f3d6b6'];
          [[-78, -82], [2, -122], [78, -88]].forEach(([x0, y0], i) => {
            const x = x0 + S(t * 1.2 + i * 2.1) * 12, y = y0 + S(t * 2.4 + i * 1.3) * 7;
            c.save(); c.translate(x, y); c.scale(1.25, 1.25);
            const f = 0.25 + 0.75 * Math.abs(S(t * 13 + i * 1.7));
            for (const sd of [-1, 1]) { c.beginPath(); c.ellipse(sd * 9, -6, 9, 5 * f + 1, sd * -0.6, 0, P); fillStroke('rgba(207,227,247,.95)', 1.4); }
            ink(c, 1.3); c.beginPath(); c.moveTo(-3, -8); c.quadraticCurveTo(-5, -15, -8, -16); c.moveTo(3, -8); c.quadraticCurveTo(5, -15, 8, -16); c.stroke();
            dot(-8, -16, 1.6, ORANGE); dot(8, -16, 1.6, ORANGE);
            c.beginPath(); c.arc(0, 0, 8.5, 0, P); fillStroke(bodies[i], 1.6);
            c.fillStyle = '#9fbd7a'; c.beginPath(); c.moveTo(-6, -6); c.quadraticCurveTo(0, -13, 6, -6); c.quadraticCurveTo(0, -8, -6, -6); c.fill(); ink(c, 1.2); c.stroke();
            eyes(0.5, -0.5, 6, 1.4, i); smile(0.5, 3.5, 2.4); blush(-4.5, 2.5); blush(5.5, 2.5);
            c.restore();
            // speech bubble with a weather icon
            const bx = x + (i === 2 ? -26 : 26), by = y - 30;
            bubble(bx, by, 15, 11, x + (i === 2 ? -8 : 8), y - 12);
            const w = (Math.floor(t / 2.2) + i) % 3;
            if (w === 0) { // sun
              ink(c, 1.3); c.strokeStyle = ORANGE; for (let k = 0; k < 8; k++) { const a = k * P / 8 + t; c.beginPath(); c.moveTo(bx + Math.cos(a) * 6.5, by + Math.sin(a) * 6.5); c.lineTo(bx + Math.cos(a) * 9, by + Math.sin(a) * 9); c.stroke(); }
              c.beginPath(); c.arc(bx, by, 4.5, 0, P); fillStroke(ORANGE, 1.2);
            } else if (w === 1) cloud(bx, by + 1.5, 1);
            else { cloud(bx, by - 1.5, 0.9, '#d9dde6'); c.strokeStyle = '#2f5a9c'; c.lineWidth = 1.4; for (const k of [-4, 0, 4]) { const dy = ((t * 14 + k * 3) % 5); c.beginPath(); c.moveTo(bx + k, by + 4 + dy); c.lineTo(bx + k - 1, by + 6.5 + dy); c.stroke(); } }
          });
          break;
        }
        case 'lighthouse': { // the Lighthouse Oracle, robed and riddling
          const bob = S(t * 1.6) * 1.5;
          c.save(); c.translate(64, bob);
          c.fillStyle = 'rgba(74,44,18,.12)'; c.beginPath(); c.ellipse(0, -bob, 20, 3, 0, 0, P); c.fill();
          c.beginPath(); c.moveTo(-19, 0); c.quadraticCurveTo(-17, -40, -4, -62); c.quadraticCurveTo(0, -70, 4, -62); c.quadraticCurveTo(17, -40, 19, 0); c.closePath(); fillStroke(NAVY, 2);
          for (const [sx, sy] of [[-9, -12], [7, -24], [-4, -28], [10, -8]]) dot(sx, sy, 1.6, ORANGE);
          c.beginPath(); c.ellipse(0, -44, 8.5, 10, 0, 0, P); fillStroke('#f3d6b6', 1.6);
          c.beginPath(); c.moveTo(-7, -40); c.quadraticCurveTo(-6, -26, 0, -16); c.quadraticCurveTo(6, -26, 7, -40); c.quadraticCurveTo(0, -36, -7, -40); fillStroke('#fcf6ee', 1.5);
          eyes(0, -46, 6, 1.4, 4);
          // staff with a glowing orb
          ink(c, 2.4); c.strokeStyle = '#7a5a3a'; c.beginPath(); c.moveTo(-20, 0); c.lineTo(-20, -56); c.stroke();
          const glow = 0.25 + 0.2 * S(t * 3);
          c.fillStyle = `rgba(255,215,106,${glow})`; c.beginPath(); c.arc(-20, -62, 12, 0, P); c.fill();
          c.beginPath(); c.arc(-20, -62, 6.5, 0, P); fillStroke('#ffd76a', 1.6);
          ink(c, 2); c.strokeStyle = INK; c.beginPath(); c.moveTo(-15, -30); c.quadraticCurveTo(-18, -34, -20, -36); c.stroke();
          c.restore();
          // the riddle
          const rid = ['?', '…', '?!'][Math.floor(t / 1.8) % 3];
          bubble(92, -96 + bob, 17, 13, 72, -74);
          c.font = `700 18px ${FONT}`; c.fillStyle = NAVY; c.textAlign = 'center'; c.textBaseline = 'middle'; c.fillText(rid, 92, -95 + bob); c.textBaseline = 'alphabetic';
          break;
        }
        case 'wreck': { // two Sirens of the Quick Close, singing on their rocks
          const siren = (x, y, hair, skin, ph, flip) => {
            c.save(); c.translate(x, y); c.scale(flip * 1.3, 1.3);
            const sway = S(t * 2.2 + ph) * 0.35;
            // hair behind
            c.beginPath(); c.moveTo(-9, -30); c.quadraticCurveTo(-14, -14, -12 + S(t * 2 + ph) * 2, -4); c.lineTo(8, -10); c.quadraticCurveTo(12, -26, 8, -34); c.closePath(); fillStroke(hair, 1.6);
            // tail and fin
            c.beginPath(); c.moveTo(-7, -4); c.quadraticCurveTo(-8, 10, 12, 14); c.lineTo(14, 9); c.quadraticCurveTo(4, 6, 7, -4); c.closePath(); fillStroke('#b9cf8f', 1.6);
            c.save(); c.translate(13, 11.5); c.rotate(sway); c.beginPath(); c.moveTo(0, 0); c.quadraticCurveTo(6, -9, 10, -7); c.quadraticCurveTo(7, -2, 9, 4); c.quadraticCurveTo(5, 4, 0, 0); fillStroke('#b9cf8f', 1.5); c.restore();
            // torso
            c.beginPath(); c.moveTo(-6, -19); c.lineTo(6, -19); c.lineTo(7, -3); c.lineTo(-7, -3); c.closePath(); fillStroke(skin, 1.6);
            c.beginPath(); c.arc(-2.5, -15, 2.4, 0, P); c.arc(3, -15, 2.4, 0, P); fillStroke(ORANGE, 1.1);
            // head, singing
            c.beginPath(); c.arc(0, -27, 8, 0, P); fillStroke(skin, 1.6);
            c.beginPath(); c.moveTo(-8, -28); c.quadraticCurveTo(-6, -37, 1, -36); c.quadraticCurveTo(8, -35, 8, -28); c.quadraticCurveTo(2, -32, -8, -28); fillStroke(hair, 1.4);
            happy(2, -28, 5, 1.8);
            const m = 1.3 + Math.abs(S(t * 5 + ph)) * 1.4; dot(3, -23, m, INK);
            blush(-2.5, -24.5); blush(6.5, -24.5);
            // arm with the contract
            ink(c, 2.4); c.strokeStyle = skin; c.lineWidth = 2.6; c.beginPath(); c.moveTo(5, -16); c.lineTo(12, -22 + S(t * 3 + ph) * 2); c.stroke();
            c.save(); c.translate(14, -26 + S(t * 3 + ph) * 2); c.rotate(0.2); c.fillStyle = '#fbf1e1'; c.fillRect(-4, -6, 9, 11); ink(c, 1.2); c.strokeRect(-4, -6, 9, 11);
            c.beginPath(); c.moveTo(-2, 2); c.quadraticCurveTo(0, -1, 3, 2); c.stroke(); c.restore();
            c.restore();
            // notes rising from the song
            for (let k = 0; k < 2; k++) { const q = ((t * 0.5 + k * 0.5 + ph * 0.13) % 1); note(x + flip * (14 + q * 26 + S(q * 9 + ph) * 4), y - 38 - q * 50, 1 - q); }
          };
          siren(-96, -30, '#c86f4f', '#f3d6b6', 0, 1);
          siren(84, -28, ORANGE, '#e6bb93', 2.1, -1);
          break;
        }
        case 'wisps': { // Will-o'-Wisps: drawn over the fog so they glow through it
          [[-112, -70], [-50, -118], [4, -64], [58, -112], [100, -58]].forEach(([x0, y0], i) => {
            const x = x0 + S(t * 0.7 + i * 1.9) * 16, y = y0 + S(t * 1.3 + i * 2.3) * 10;
            const tip = S(t * 3 + i) * 4;
            c.fillStyle = `rgba(255,215,106,${0.18 + 0.12 * S(t * 2.5 + i)})`; c.beginPath(); c.arc(x, y - 2, 17, 0, P); c.fill();
            c.save(); c.translate(x, y);
            c.beginPath(); c.moveTo(tip, -21); c.quadraticCurveTo(10, -11, 9.5, 0); c.arc(0, 0, 9.5, 0, Math.PI); c.quadraticCurveTo(-10, -11, tip, -21); fillStroke('#ffd76a', 1.6);
            c.beginPath(); c.moveTo(tip * 0.6, -12); c.quadraticCurveTo(5, -6, 5, 1); c.arc(0, 1, 5, 0, Math.PI); c.quadraticCurveTo(-5, -6, tip * 0.6, -12); c.fillStyle = '#fcf6ee'; c.fill();
            eyes(0, -1, 5.5, 1.4, i + 2); dot(0, 4, 1.3);
            c.restore();
            if (i % 2 === 0) { c.globalAlpha = 0.5 + 0.5 * S(t * 2 + i); c.font = `700 15px ${FONT}`; c.fillStyle = '#5f6685'; c.textAlign = 'center'; c.fillText('?', x + 13, y - 18); c.globalAlpha = 1; }
          });
          break;
        }
        case 'loop': { // the Paperwork Ouroboros, slowly turning, forever re-filing itself
          c.save(); c.translate(0, -84); c.rotate(t * 0.35);
          const R = 52, a0 = 0.32, a1 = P - 0.12;
          const pts = [];
          for (let a = a0; a <= a1 + 1e-6; a += 0.1) pts.push([Math.cos(a) * R, Math.sin(a) * R, 5 + 13 * Math.min(1, (a - a0) / 2.2)]);
          tube(pts, '#fbf1e1');
          // page edges and ruled lines
          ink(c, 1.3);
          for (let a = a0 + 0.5; a < a1 - 0.2; a += 0.42) { const w = (5 + 13 * Math.min(1, (a - a0) / 2.2)) / 2 + 1.5; c.beginPath(); c.moveTo(Math.cos(a) * (R - w), Math.sin(a) * (R - w)); c.lineTo(Math.cos(a) * (R + w), Math.sin(a) * (R + w)); c.stroke(); }
          c.strokeStyle = '#9cc2e6'; c.lineWidth = 1.2; c.beginPath(); c.arc(0, 0, R, a0 + 0.3, a1 - 0.2); c.stroke();
          for (const a of [1.6, 3.3, 4.9]) dot(Math.cos(a) * R, Math.sin(a) * R, 2.4, '#c86f4f');
          // head biting the tail
          const ah = a1 + 0.04;
          c.save(); c.translate(Math.cos(ah) * R, Math.sin(ah) * R); c.rotate(ah + Math.PI / 2); c.scale(1.3, 1.3);
          c.beginPath(); c.moveTo(-8, -10); c.quadraticCurveTo(8, -15, 20, -5); c.lineTo(10, -1); c.lineTo(20, 5); c.quadraticCurveTo(8, 14, -8, 10); c.quadraticCurveTo(-13, 0, -8, -10); fillStroke('#fbf1e1', 1.8);
          c.beginPath(); c.arc(4, -5, 3.6, 0, P); fillStroke('#fcf6ee', 1.2); dot(5, -5, 1.7);
          ink(c, 1.3); c.beginPath(); c.moveTo(0, -10); c.lineTo(8, -10.5); c.stroke(); blush(4, 4);
          // pencil behind the ear
          c.save(); c.translate(-3, -12); c.rotate(-0.5); c.fillStyle = ORANGE; c.fillRect(-7, -2, 13, 4); ink(c, 1.2); c.strokeRect(-7, -2, 13, 4); c.beginPath(); c.moveTo(6, -2); c.lineTo(10, 0); c.lineTo(6, 2); c.fillStyle = '#f3d6b6'; c.fill(); c.stroke(); c.restore();
          c.restore();
          c.restore();
          // a loose form fluttering off
          const q = (t * 0.3) % 1; c.globalAlpha = Math.min(1, (1 - q) * 3);
          this.prop('paper', 40 + q * 60, -150 + S(t * 3) * 6 - q * 20, 1, Math.floor(t * 0.3)); c.globalAlpha = 1;
          break;
        }
        case 'cliffs': { // Pitch Harpies circling, waving brochures
          const harpy = (a, ph, word) => {
            const x = -40 + Math.cos(a) * 92, y = -150 + Math.sin(a) * 20, dir = -Math.sin(a) >= 0 ? 1 : -1, k = 1.15 + Math.sin(a) * 0.12;
            c.save(); c.translate(x, y); c.scale(dir * k, k);
            const fl = S(t * 9 + ph);
            const wing = (back) => { c.beginPath(); c.moveTo(-4, -4); c.quadraticCurveTo(-12, -16 - fl * 10, -24, -18 - fl * 14); c.quadraticCurveTo(-18, -12, -20, -8 - fl * 6); c.quadraticCurveTo(-14, -6, -14, -2); c.quadraticCurveTo(-8, 0, -4, 2); c.closePath(); fillStroke(back ? '#d9b38c' : '#e3c6a0', 1.6); };
            wing(true);
            // talons + brochure
            ink(c, 1.4); c.beginPath(); c.moveTo(-2, 7); c.lineTo(-3, 13); c.moveTo(3, 7); c.lineTo(4, 13); c.stroke();
            c.save(); c.scale(dir, 1); c.fillStyle = '#fbf1e1'; c.fillRect(-12, 12, 24, 13); ink(c, 1.3); c.strokeRect(-12, 12, 24, 13);
            c.font = `800 8.5px ${SANS}`; c.fillStyle = '#c86f4f'; c.textAlign = 'center'; c.fillText(word, 0, 21.5); c.restore();
            c.beginPath(); c.ellipse(0, 0, 13, 9, -0.15, 0, P); fillStroke('#b0763c', 1.8);
            c.beginPath(); c.moveTo(-12, -1); c.lineTo(-20, -4); c.lineTo(-18, 2); c.lineTo(-22, 5); c.lineTo(-11, 4); fillStroke('#b0763c', 1.6);
            wing(false);
            c.beginPath(); c.arc(12, -9, 7.5, 0, P); fillStroke('#f3d6b6', 1.6);
            c.beginPath(); c.moveTo(5, -10); c.quadraticCurveTo(6, -18, 13, -17.5); c.quadraticCurveTo(19, -17, 19.5, -11); c.quadraticCurveTo(13, -14, 5, -10); fillStroke('#4a2c12', 1.2);
            c.beginPath(); c.arc(7, -17, 3, 0, P); fillStroke('#4a2c12', 1.2);
            dot(14, -10, 1.4); dot(17, -6, 1.3 + Math.abs(fl) * 0.8); blush(11, -6.5);
            c.restore();
            return [x, y, dir];
          };
          const a = t * 0.9;
          const hs = [[a, 0, 'BUY!'], [a + Math.PI, 1.3, 'NEW!']].sort((p, q) => Math.sin(p[0]) - Math.sin(q[0]));
          for (const [aa, ph, w] of hs) {
            const [x, y, dir] = harpy(aa, ph, w);
            if (S(t * 4 + ph) > 0.2) { ink(c, 1.6); c.strokeStyle = '#c86f4f'; for (const k of [-1, 0, 1]) { c.beginPath(); c.moveTo(x + dir * 26, y - 10 + k * 6); c.lineTo(x + dir * 33, y - 12 + k * 9); c.stroke(); } }
          }
          break;
        }
        case 'swamp': { // the Spreadsheet Hydra: heads keep popping up
          c.beginPath(); c.ellipse(0, -22, 44, 14, 0, Math.PI, 0); fillStroke('#9fbd7a', 2);
          const heads = [[-34, 0], [-12, 1.7], [12, 3.4], [34, 5.1]];
          const extra = Math.max(0, S(t * 0.8));
          if (extra > 0.02) heads.push([66, -1, extra]);
          heads.forEach(([bx, ph, grow = 1], i) => {
            const h = (42 + 30 * (0.5 + 0.5 * S(t * 1.5 + ph))) * grow;
            const lean = (bx / 34) * 16 + S(t * 1.1 + ph) * 5;
            const hx = bx + lean, hy = -22 - h;
            const by0 = i === 4 ? -18 : -24;
            const pts = []; for (let k = 0; k <= 8; k++) { const u = k / 8; pts.push([bx + lean * u * u + S(u * 3 + t * 2 + ph) * 3 * u, by0 + (hy - by0) * u, 13 - u * 3]); }
            tube(pts, '#9fbd7a');
            ink(c, 1); c.strokeStyle = 'rgba(63,122,47,.7)';
            for (let k = 2; k < 8; k += 2) { const [px, py] = pts[k]; c.beginPath(); c.moveTo(px - 5, py); c.lineTo(px + 5, py); c.stroke(); }
            if (i === 4) { c.strokeStyle = '#fcf6ee'; c.lineWidth = 1.6; c.beginPath(); c.ellipse(bx, -18, 14 * grow, 3, 0, 0, P); c.stroke(); }
            c.save(); c.translate(hx, hy); const fl = bx < 0 ? -1 : 1; c.scale(fl, 1); c.rotate(-0.15);
            c.beginPath(); c.moveTo(-8, -4); c.lineTo(-11, -13); c.lineTo(-4, -8); c.moveTo(-2, -8); c.lineTo(-2, -15); c.lineTo(2, -8); fillStroke('#e3c6a0', 1.3);
            c.beginPath(); c.ellipse(2, 0, 13, 9, 0, 0, P); fillStroke('#9fbd7a', 1.8);
            c.beginPath(); c.ellipse(11, 2, 5, 5, 0, 0, P); c.fillStyle = '#9fbd7a'; c.fill();
            eyes(4, -3, 7, 1.5, i * 0.7); smile(8, 3, 3); dot(13, 0, 0.9);
            if (i === 1) { ink(c, 1.2); c.beginPath(); c.arc(0.5, -3, 3.4, 0, P); c.moveTo(11, -3); c.arc(7.5, -3, 3.4, 0, P); c.moveTo(4, -3); c.lineTo(4, -3); c.stroke(); }
            if (i === 2) { c.beginPath(); c.moveTo(-9, -7); c.lineTo(12, -7); c.lineTo(17, -3); c.lineTo(-4, -3); c.closePath(); fillStroke('rgba(63,122,47,.85)', 1.2); }
            c.restore();
          });
          break;
        }
        case 'snakepit': { // the Voicemail Gorgon and her phone-cord hair
          const rise = S(t * 1.2) * 3;
          c.save(); c.beginPath(); c.rect(-200, -300, 400, 290); c.ellipse(0, -10, 64, 11, 0, 0, Math.PI); c.clip();
          c.translate(0, rise);
          // shoulders and toga
          c.beginPath(); c.moveTo(-30, -2); c.quadraticCurveTo(-28, -30, 0, -32); c.quadraticCurveTo(28, -30, 30, -2); c.closePath(); fillStroke('#fcf6ee', 2);
          ink(c, 1.4); c.beginPath(); c.moveTo(-18, -26); c.quadraticCurveTo(0, -14, 20, -28); c.stroke();
          // cords: coiled, each ending in a handset
          const ringing = Math.floor(t * 0.7) % 5;
          const cords = [[-14, -68, -46, -92, '#2f2f2f'], [-6, -74, -20, -116, '#c86f4f'], [6, -74, 22, -116, NAVY], [14, -68, 48, -94, ORANGE], [-17, -58, -50, -60, '#2f5a9c']];
          cords.forEach(([x0, y0, x1, y1, col], i) => {
            const shake = i === ringing ? S(t * 40) * 2 : 0;
            const ex = x1 + S(t * 1.6 + i * 1.3) * 4 + shake, ey = y1 + S(t * 2 + i) * 3;
            const mx = (x0 + ex) / 2 + (i - 2) * 6, my = (y0 + ey) / 2 - 6;
            ink(c, 1.6); c.strokeStyle = col; c.lineWidth = 1.8; c.beginPath();
            for (let k = 0; k <= 60; k++) {
              const u = k / 60, iu = 1 - u;
              const px = iu * iu * x0 + 2 * iu * u * mx + u * u * ex, py = iu * iu * y0 + 2 * iu * u * my + u * u * ey;
              const tx = 2 * iu * (mx - x0) + 2 * u * (ex - mx), ty = 2 * iu * (my - y0) + 2 * u * (ey - my), L = Math.hypot(tx, ty) || 1;
              const ph = u * P * 6, r = 3.2;
              c.lineTo(px + (-ty / L) * Math.sin(ph) * r + (tx / L) * Math.cos(ph) * r * 0.7, py + (tx / L) * Math.sin(ph) * r + (ty / L) * Math.cos(ph) * r * 0.7);
            }
            c.stroke();
            // handset
            const ang = Math.atan2(ey - my, ex - mx) + Math.PI / 2;
            c.save(); c.translate(ex, ey); c.rotate(ang + shake * 0.08);
            c.beginPath(); c.moveTo(-9, -1); c.quadraticCurveTo(-10, -6, -6, -6); c.lineTo(6, -6); c.quadraticCurveTo(10, -6, 9, -1); c.lineTo(5, 0); c.quadraticCurveTo(0, -3, -5, 0); c.closePath(); fillStroke(col, 1.5);
            c.restore();
            if (i === ringing) { ink(c, 1.5); c.beginPath(); c.arc(ex, ey, 11, -1.1, -0.3); c.stroke(); c.beginPath(); c.arc(ex, ey, 11, Math.PI + 0.3, Math.PI + 1.1); c.stroke(); }
          });
          // head
          c.beginPath(); c.arc(0, -56, 19, 0, P); fillStroke('#b9cf8f', 2);
          c.fillStyle = '#9fbd7a'; c.beginPath(); c.arc(0, -56, 19, Math.PI * 1.1, Math.PI * 1.9); c.quadraticCurveTo(0, -66, -18, -62); c.fill(); ink(c, 1.4); c.stroke();
          // bored eyes behind cat-eye glasses
          dot(-7, -55, 1.7); dot(7, -55, 1.7); ink(c, 1.5); c.beginPath(); c.moveTo(-10, -57); c.lineTo(-4, -57); c.moveTo(4, -57); c.lineTo(10, -57); c.stroke();
          c.strokeStyle = NAVY; c.lineWidth = 1.8; c.beginPath(); c.moveTo(-13, -59); c.lineTo(-2, -58); c.lineTo(-3, -52); c.quadraticCurveTo(-9, -50, -12, -53); c.closePath(); c.moveTo(13, -59); c.lineTo(2, -58); c.lineTo(3, -52); c.quadraticCurveTo(9, -50, 12, -53); c.closePath(); c.moveTo(-2, -57); c.lineTo(2, -57); c.stroke();
          ink(c, 1.5); c.beginPath(); c.moveTo(-4, -46); c.quadraticCurveTo(0, -47.5, 4, -46); c.stroke();
          dot(-18, -50, 2, ORANGE); dot(18, -50, 2, ORANGE);
          c.restore();
          ink(c, 2); c.beginPath(); c.ellipse(0, -10, 64, 11, 0, 0.05, Math.PI - 0.05); c.stroke();
          // voicemail bubble with a 99+ badge
          const bx = 62, by = -104 + rise;
          bubble(bx, by, 22, 13, 26, -74);
          ink(c, 1.6); c.beginPath(); c.arc(bx - 7, by + 1, 4, 0, P); c.moveTo(bx + 11, by + 1); c.arc(bx + 7, by + 1, 4, 0, P); c.moveTo(bx - 7, by + 5); c.lineTo(bx + 7, by + 5); c.stroke();
          c.beginPath(); c.arc(bx + 18, by - 10, 8, 0, P); fillStroke('#c86f4f', 1.4);
          c.font = `800 8px ${SANS}`; c.fillStyle = '#fbf1e1'; c.textAlign = 'center'; c.textBaseline = 'middle'; c.fillText('99+', bx + 18, by - 9.5); c.textBaseline = 'alphabetic';
          break;
        }
        case 'sands': { // the Djinn of Incentives, wavering out of a trophy lamp
          const lx = -40;
          // smoke tail from the spout up to the Djinn
          const dx = 12 + S(t * 1.3) * 5, dy = -98 + S(t * 1.7) * 3;
          const pts = [];
          for (let k = 0; k <= 14; k++) { const u = k / 14; pts.push([lx + 26 + (dx - lx - 26) * u + S(u * 5 - t * 3) * 7 * u * (1 - u) * 2, -40 + (dy + 6 + 40) * u, 3 + 15 * u]); }
          tube(pts, '#9cc2e6');
          // trophy lamp
          c.save(); c.translate(lx, 0);
          c.beginPath(); c.moveTo(-14, 0); c.lineTo(14, 0); c.lineTo(11, -7); c.lineTo(-11, -7); c.closePath(); fillStroke('#b0763c', 1.8);
          c.beginPath(); c.moveTo(-3, -7); c.lineTo(-3, -15); c.lineTo(3, -15); c.lineTo(3, -7); fillStroke(ORANGE, 1.6);
          c.beginPath(); c.arc(-17, -32, 7, Math.PI * 0.4, Math.PI * 1.6); c.stroke(); c.beginPath(); c.arc(17, -32, 7, -Math.PI * 0.6, Math.PI * 0.6); c.stroke();
          c.beginPath(); c.moveTo(-18, -40); c.lineTo(18, -40); c.quadraticCurveTo(26, -42, 30, -48); c.lineTo(32, -46); c.quadraticCurveTo(26, -32, 16, -28); c.quadraticCurveTo(10, -16, 0, -15); c.quadraticCurveTo(-14, -16, -18, -40); c.closePath(); fillStroke(ORANGE, 2);
          c.fillStyle = '#ffd76a'; c.beginPath(); c.moveTo(-12, -36); c.quadraticCurveTo(-10, -24, -4, -20); c.lineTo(-7, -20); c.quadraticCurveTo(-13, -26, -14, -36); c.fill();
          c.font = `800 10px ${SANS}`; c.fillStyle = INK; c.textAlign = 'center'; c.fillText('#1', 2, -26);
          c.restore();
          // Djinn
          c.save(); c.translate(dx, dy);
          c.beginPath(); c.moveTo(-16, 6); c.quadraticCurveTo(-20, -18, -10, -26); c.lineTo(10, -26); c.quadraticCurveTo(20, -18, 16, 6); c.closePath(); fillStroke('#9cc2e6', 2);
          // arm holding the fine print
          const unroll = 22 + 8 * (0.5 + 0.5 * S(t * 1.4));
          c.fillStyle = '#fbf1e1'; c.fillRect(24, -16, 16, unroll); ink(c, 1.4); c.strokeRect(24, -16, 16, unroll);
          for (let yy = -11; yy < -16 + unroll - 3; yy += 3.5) { c.beginPath(); c.moveTo(27, yy); c.lineTo(37, yy); c.lineWidth = 0.9; c.stroke(); }
          c.beginPath(); c.ellipse(32, -17, 9, 3, 0, 0, P); fillStroke('#fbf1e1', 1.4);
          c.beginPath(); c.moveTo(10, -20); c.quadraticCurveTo(20, -18, 25, -18); c.lineWidth = 6; c.strokeStyle = INK; c.stroke(); c.lineWidth = 3.4; c.strokeStyle = '#9cc2e6'; c.stroke();
          c.beginPath(); c.moveTo(-10, -18); c.quadraticCurveTo(-4, -8, 6, -12); c.lineWidth = 6; c.strokeStyle = INK; c.stroke(); c.lineWidth = 3.4; c.strokeStyle = '#9cc2e6'; c.stroke();
          dot(-1, -24, 0); c.fillStyle = ORANGE; c.fillRect(20, -21, 4, 6); ink(c, 1.2); c.strokeRect(20, -21, 4, 6);
          // head
          c.beginPath(); c.arc(0, -38, 12, 0, P); fillStroke('#9cc2e6', 2);
          c.beginPath(); c.moveTo(-4, -49); c.quadraticCurveTo(0, -60, 6 + S(t * 2) * 2, -62); c.quadraticCurveTo(4, -54, 4, -49); fillStroke('#4a2c12', 1.4);
          eyes(3, -39, 7, 1.5, 6); ink(c, 1.3); c.beginPath(); c.moveTo(4, -45); c.lineTo(9, -46.5); c.moveTo(-3, -44); c.lineTo(1, -43.5); c.stroke();
          c.beginPath(); c.moveTo(0, -33); c.quadraticCurveTo(5, -31, 9, -35); c.stroke();
          dot(-11, -35, 2, ORANGE);
          c.restore();
          // sparkle of temptation
          const sp = Math.abs(S(t * 2.5)); c.fillStyle = ORANGE; c.save(); c.translate(dx + 46, dy - 34); c.scale(sp, sp); c.beginPath(); for (let k = 0; k < 8; k++) { const a = k * Math.PI / 4, rr = k % 2 ? 2 : 7; c.lineTo(Math.cos(a) * rr, Math.sin(a) * rr); } c.closePath(); c.fill(); c.restore();
          break;
        }
        case 'caves': { // the What-If Dragon, asleep on its hoard of worst cases
          // hoard
          c.beginPath(); c.moveTo(-74, 0); c.quadraticCurveTo(-40, -22, 0, -20); c.quadraticCurveTo(50, -22, 84, 0); c.closePath(); fillStroke('#ffd76a', 2);
          for (const [hx, hy] of [[-50, -6], [-30, -12], [40, -10], [62, -5], [20, -14]]) { c.beginPath(); c.ellipse(hx, hy, 5, 3, 0, 0, P); fillStroke(ORANGE, 1.2); }
          for (const [hx, hy, r, txt] of [[-60, -12, -0.4, '?'], [70, -14, 0.35, '!']]) { c.save(); c.translate(hx, hy); c.rotate(r); c.fillStyle = '#fbf1e1'; c.fillRect(-7, -9, 14, 11); ink(c, 1.3); c.strokeRect(-7, -9, 14, 11); c.font = `700 10px ${SANS}`; c.fillStyle = '#c86f4f'; c.textAlign = 'center'; c.fillText(txt, 0, 0); c.restore(); }
          const br = 1 + 0.05 * S(t * 1.6);
          // tail curling round the front
          const tw = S(t * 0.9) * 4;
          tube([[-44, -24, 12], [-62, -16, 10], [-62, -6, 8], [-40, -2, 6], [-10, -2, 5], [10 + tw, -6, 4]], '#c86f4f');
          c.save(); c.translate(12 + tw, -7); c.rotate(-0.4); c.beginPath(); c.moveTo(0, 0); c.lineTo(8, -6); c.lineTo(10, 3); c.closePath(); fillStroke('#c86f4f', 1.5); c.restore();
          // body (breathing)
          c.save(); c.translate(-6, -20); c.scale(1, br);
          c.beginPath(); c.moveTo(-46, 0); c.quadraticCurveTo(-48, -44, -6, -46); c.quadraticCurveTo(36, -46, 42, 0); c.closePath(); fillStroke('#c86f4f', 2);
          c.fillStyle = ORANGE; ink(c, 1.4);
          for (let k = 0; k < 5; k++) { const a = Math.PI * (1.12 + k * 0.17), px = -4 + Math.cos(a) * 44, py = -2 + Math.sin(a) * 44; c.beginPath(); c.moveTo(px - 5, py + 3); c.lineTo(px + Math.cos(a) * 8, py + Math.sin(a) * 8); c.lineTo(px + 5, py + 4); c.closePath(); c.fill(); c.stroke(); }
          c.beginPath(); c.moveTo(-16, -30); c.quadraticCurveTo(-6, -52, 12, -44); c.quadraticCurveTo(4, -40, 8, -34); c.quadraticCurveTo(-2, -34, -2, -28); c.quadraticCurveTo(-10, -30, -16, -30); fillStroke('#e3a07f', 1.6);
          c.beginPath(); c.moveTo(-34, 0); c.quadraticCurveTo(-4, -18, 30, 0); c.closePath(); c.fillStyle = '#f5ddbb'; c.fill(); ink(c, 1.3); c.stroke();
          c.restore();
          // head resting on paws
          c.save(); c.translate(48, -24);
          c.beginPath(); c.moveTo(-12, -14); c.lineTo(-18, -26); c.lineTo(-6, -17); fillStroke('#fcf6ee', 1.3);
          c.beginPath(); c.ellipse(0, -6, 17, 13, 0, 0, P); fillStroke('#c86f4f', 2);
          c.beginPath(); c.ellipse(16, -2, 13, 9, 0, 0, P); fillStroke('#c86f4f', 2);
          c.beginPath(); c.ellipse(4, -2, 10, 8, 0, 0, P); c.fillStyle = '#c86f4f'; c.fill();
          dot(24, -5, 1.3); dot(26, -1, 1.3);
          ink(c, 1.6); c.beginPath(); c.arc(1, -9, 4, 0.15 * Math.PI, 0.85 * Math.PI); c.stroke();
          c.beginPath(); c.moveTo(-2, -5.5); c.lineTo(-4, -3); c.moveTo(1, -5); c.lineTo(1, -2.5); c.stroke();
          ink(c, 1.4); c.beginPath(); c.moveTo(14, 4); c.quadraticCurveTo(20, 6, 25, 3); c.stroke();
          c.beginPath(); c.ellipse(6, 10, 9, 4, 0, 0, P); fillStroke('#c86f4f', 1.6);
          c.restore();
          // sleepy smoke puffs and Zzz
          const q = (t * 0.6) % 1;
          if (q < 0.7) { c.globalAlpha = 1 - q / 0.7; c.beginPath(); c.arc(80 + q * 18, -30 - q * 14, 3 + q * 5, 0, P); fillStroke(FOG, 1.2); c.globalAlpha = 1; }
          c.font = `700 16px ${FONT}`; c.fillStyle = NAVY; c.textAlign = 'center';
          for (let k = 0; k < 3; k++) { const z = ((t * 0.4 + k / 3) % 1); c.globalAlpha = Math.min(1, (1 - z) * 2.5, z * 6); c.font = `700 ${11 + z * 10}px ${FONT}`; c.fillText('Z', 62 + z * 34 + S(z * 6) * 4, -50 - z * 54); }
          c.globalAlpha = 1;
          break;
        }
        case 'summit': { // the Summit Sphinx, blocking the path, tail flicking
          c.save(); c.translate(24, 0); c.scale(1.25, 1.25);
          const flick = Math.max(0, S(t * 2.2)) ** 3;
          // tail
          ink(c, 2.6); c.beginPath(); c.moveTo(56, -14); c.quadraticCurveTo(72, -22, 66, -42 - flick * 6); c.quadraticCurveTo(62, -52, 54 - flick * 10, -56 - flick * 4); c.stroke();
          c.save(); c.translate(54 - flick * 10, -56 - flick * 4); c.rotate(0.5 - flick); c.beginPath(); c.ellipse(0, 0, 6, 4, 0, 0, P); fillStroke('#b0763c', 1.4); c.restore();
          // body lying down
          c.beginPath(); c.moveTo(-34, 0); c.quadraticCurveTo(-36, -30, -14, -36); c.quadraticCurveTo(30, -42, 50, -30); c.quadraticCurveTo(68, -20, 62, 0); c.closePath(); fillStroke('#e0ac6a', 2);
          c.beginPath(); c.moveTo(28, -2); c.quadraticCurveTo(30, -30, 48, -28); c.stroke();
          // front paws, one on a stack of forms
          c.fillStyle = '#fbf1e1'; for (let k = 0; k < 3; k++) { c.fillRect(-72 + k, -8 - k * 4, 24, 4); ink(c, 1.2); c.strokeRect(-72 + k, -8 - k * 4, 24, 4); }
          c.beginPath(); c.ellipse(-48, -4, 14, 5, 0, 0, P); fillStroke('#e0ac6a', 1.6);
          c.beginPath(); c.ellipse(-56, -22, 12, 5, 0, 0, P); fillStroke('#e0ac6a', 1.6);
          // chest
          c.beginPath(); c.ellipse(-26, -22, 15, 20, 0, 0, P); fillStroke('#e0ac6a', 2);
          c.beginPath(); c.ellipse(-56, -22, 12, 5, 0, 0, P); fillStroke('#e0ac6a', 1.6);
          // head with a striped headdress
          c.save(); c.translate(-26, -52);
          c.beginPath(); c.moveTo(-14, -6); c.quadraticCurveTo(-14, -20, 0, -21); c.quadraticCurveTo(14, -20, 14, -6); c.lineTo(19, 20); c.lineTo(-19, 20); c.closePath();
          c.save(); c.fillStyle = NAVY; c.fill(); c.clip(); c.strokeStyle = ORANGE; c.lineWidth = 3; for (let yy = -16; yy < 22; yy += 7) { c.beginPath(); c.moveTo(-22, yy); c.lineTo(22, yy); c.stroke(); } c.restore(); ink(c, 2); c.stroke();
          c.beginPath(); c.ellipse(0, 1, 10, 12, 0, 0, P); fillStroke('#f3d6b6', 1.6);
          eyes(0, -1, 7, 1.6, 9); smile(0, 6, 3); blush(-6, 3); blush(6, 3);
          c.fillStyle = '#b0763c'; c.fillRect(-2, 12, 4, 7); ink(c, 1.2); c.strokeRect(-2, 12, 4, 7);
          c.restore();
          c.restore();
          // speech bubble
          bubble(-24, -138, 82, 19, -10, -106);
          c.font = `16px ${FONT}`; c.fillStyle = INK; c.textAlign = 'center'; c.textBaseline = 'middle'; c.fillText('allow 3–5 business days', -24, -135); c.textBaseline = 'alphabetic';
          break;
        }
        case 'isles': { // the Password Kraken, a different demand on every tentacle
          const items = ['key', 'lock', 'phone', 'note'];
          [[-52, -1], [-26, 1], [26, -1], [52, 1]].forEach(([bx, side], i) => {
            const sw = S(t * 1.5 + i * 1.4);
            const tipx = bx + side * 0 + (bx < 0 ? -10 : 10) + sw * 8, tipy = -78 - (i % 2) * 18 + Math.abs(sw) * 4;
            const pts = []; for (let k = 0; k <= 9; k++) { const u = k / 9; pts.push([bx + (tipx - bx) * u + S(u * 4 + t * 2 + i) * 6 * u * (1 - u) * 2, -18 + (tipy + 18) * u, 12 - u * 8]); }
            tube(pts, '#9f86b0');
            for (let k = 2; k < 8; k += 2) dot(pts[k][0] + (bx < 0 ? 3 : -3), pts[k][1], 1.4, '#d8cce2');
            const [ix, iy] = pts[9];
            c.save(); c.translate(ix, iy - 8); c.rotate(sw * 0.2);
            if (items[i] === 'key') { c.beginPath(); c.arc(0, -4, 5, 0, P); fillStroke(ORANGE, 1.5); dot(0, -4, 1.6, '#fbf1e1'); ink(c, 2.2); c.strokeStyle = INK; c.beginPath(); c.moveTo(0, 1); c.lineTo(0, 11); c.moveTo(0, 8); c.lineTo(4, 8); c.moveTo(0, 5); c.lineTo(3, 5); c.stroke(); }
            else if (items[i] === 'lock') { ink(c, 1.8); c.beginPath(); c.arc(0, -4, 5, Math.PI, 0); c.stroke(); c.fillStyle = ORANGE; c.fillRect(-7, -4, 14, 11); c.strokeRect(-7, -4, 14, 11); dot(0, 1, 1.6); }
            else if (items[i] === 'phone') { c.fillStyle = '#2f2f2f'; c.fillRect(-6, -10, 12, 20); ink(c, 1.5); c.strokeRect(-6, -10, 12, 20); c.fillStyle = '#cfe3f7'; c.fillRect(-4, -7, 8, 12); c.font = `800 5.5px ${SANS}`; c.fillStyle = NAVY; c.textAlign = 'center'; c.fillText('2FA', 0, 0); }
            else { c.fillStyle = '#ffd76a'; c.fillRect(-9, -8, 18, 15); ink(c, 1.4); c.strokeRect(-9, -8, 18, 15); c.font = `800 9px ${SANS}`; c.fillStyle = INK; c.textAlign = 'center'; c.fillText('***', 0, 4); }
            c.restore();
          });
          // head
          const bob = S(t * 1.8) * 2;
          c.beginPath(); c.moveTo(-24, -16); c.quadraticCurveTo(-28, -76 + bob, 0, -78 + bob); c.quadraticCurveTo(28, -76 + bob, 24, -16); c.closePath(); fillStroke('#9f86b0', 2);
          for (const [sx, sy, r] of [[-10, -64, 3], [12, -60, 2.4], [2, -70, 1.8]]) dot(sx, sy + bob, r, '#c4b0d2');
          eyes(0, -40 + bob, 13, 2.2, 11); blush(-12, -34 + bob); blush(12, -34 + bob);
          ink(c, 1.5); c.beginPath(); c.moveTo(-10, -48 + bob); c.lineTo(-4, -46 + bob); c.moveTo(10, -48 + bob); c.lineTo(4, -46 + bob); c.stroke();
          c.beginPath(); c.moveTo(-4, -32 + bob); c.quadraticCurveTo(-2, -34 + bob, 0, -32 + bob); c.quadraticCurveTo(2, -30 + bob, 4, -32 + bob); c.stroke();
          c.strokeStyle = '#fcf6ee'; c.lineWidth = 2; c.beginPath(); c.ellipse(0, -16, 34, 5, 0, 0.1, Math.PI - 0.1); c.stroke();
          break;
        }
        case 'toll': { // the Toll Troll checks the dates. Twice.
          const look = S(t * 1.1);
          if (layer === 'back') {
            c.save(); c.translate(-18, 0);
            c.beginPath(); c.moveTo(-30, -18); c.quadraticCurveTo(-32, -62, 0, -64); c.quadraticCurveTo(32, -62, 30, -18); c.closePath(); fillStroke('#9fbd7a', 2);
            c.beginPath(); c.moveTo(-14, -60); c.quadraticCurveTo(0, -50, 14, -60); c.lineTo(10, -30); c.lineTo(-10, -30); c.closePath(); fillStroke('#fbf1e1', 1.6);
            dot(0, -48, 1.6, '#c86f4f'); dot(0, -40, 1.6, '#c86f4f');
            // head
            c.beginPath(); c.ellipse(-22, -80, 5, 7, -0.4, 0, P); fillStroke('#9fbd7a', 1.6);
            c.beginPath(); c.ellipse(22, -80, 5, 7, 0.4, 0, P); fillStroke('#9fbd7a', 1.6);
            c.beginPath(); c.arc(0, -80, 20, 0, P); fillStroke('#9fbd7a', 2);
            c.beginPath(); c.moveTo(-16, -92); c.quadraticCurveTo(0, -110, 16, -92); c.closePath(); fillStroke(NAVY, 1.6);
            c.beginPath(); c.moveTo(12, -93); c.lineTo(26, -90); c.stroke();
            const ex = look * 2.2;
            ink(c, 1.4); c.beginPath(); c.arc(-7, -81, 5.5, 0, P); c.moveTo(12.5, -81); c.arc(7, -81, 5.5, 0, P); c.moveTo(-1.5, -81); c.lineTo(1.5, -81); c.stroke();
            if (blinking(13)) { c.beginPath(); c.moveTo(-9 + ex, -81); c.lineTo(-5 + ex, -81); c.moveTo(5 + ex, -81); c.lineTo(9 + ex, -81); c.stroke(); }
            else { dot(-7 + ex, -81, 1.6); dot(7 + ex, -81, 1.6); }
            c.beginPath(); c.ellipse(0, -73, 5.5, 4.5, 0, 0, P); fillStroke('#7f9f5a', 1.6);
            ink(c, 1.5); c.beginPath(); c.moveTo(-8, -65); c.quadraticCurveTo(0, -62, 8, -65); c.stroke();
            c.beginPath(); c.moveTo(-6, -64.5); c.lineTo(-5, -68); c.lineTo(-3.5, -64); c.moveTo(6, -64.5); c.lineTo(5, -68); c.lineTo(3.5, -64); fillStroke('#fcf6ee', 1.1);
            c.restore();
          } else {
            c.save(); c.translate(-18, 0);
            // clipboard on the railing
            c.save(); c.translate(-30, -46); c.rotate(-0.12);
            c.fillStyle = '#b0763c'; c.fillRect(-12, -16, 24, 30); ink(c, 1.6); c.strokeRect(-12, -16, 24, 30);
            c.fillStyle = '#fbf1e1'; c.fillRect(-9, -12, 18, 23); c.strokeRect(-9, -12, 18, 23);
            c.fillStyle = '#7a5a3a'; c.fillRect(-5, -18, 10, 4);
            ink(c, 1); for (const yy of [-7, -2, 3]) { c.beginPath(); c.moveTo(-6, yy); c.lineTo(5, yy); c.stroke(); }
            ink(c, 1.6); c.strokeStyle = '#3f7a2f'; c.beginPath(); c.moveTo(-5, 7); c.lineTo(-3, 9); c.lineTo(1, 5); c.stroke();
            c.restore();
            c.beginPath(); c.arc(-20, -38, 6, 0, P); fillStroke('#9fbd7a', 1.6);
            // magnifier sweeping the dates
            const mx = -30 + look * 7, my = -54 + Math.abs(look) * 3;
            ink(c, 3); c.strokeStyle = '#7a5a3a'; c.beginPath(); c.moveTo(mx + 6, my + 6); c.lineTo(mx + 14, my + 14); c.stroke();
            c.fillStyle = 'rgba(207,227,247,.75)'; c.beginPath(); c.arc(mx, my, 7.5, 0, P); c.fill(); ink(c, 1.8); c.stroke();
            c.beginPath(); c.arc(mx + 16, my + 16, 5.5, 0, P); fillStroke('#9fbd7a', 1.6);
            c.restore();
          }
          break;
        }
      }
      c.restore();
    }

    /* Cut-scene art drawn behind the hikers. */
    cutBack(cs, p, t) {
      const c = this.c;
      const k = cs.key;
      const ease = 1 - Math.pow(1 - Math.min(1, p * 1.8), 3);
      const popIn = (q) => { if (q <= 0) return 0; if (q >= 1) return 1; const s1 = 2.2; q -= 1; return 1 + (s1 + 1) * q * q * q + s1 * q * q; };
      if (k === 'arrive' && cs.opts.kind) this.drawLandmark(cs.opts.kind, 1100 - ease * (1100 - this.lmx), GROUND, 0.7 + ease * 0.35, t, popIn((p - 0.3) / 0.28));
      const lm = { sirens: 'wreck', fog: 'fog', loop: 'loop', cliffs: 'cliffs', swamp: 'swamp', phones: 'snakepit', caves: 'caves', summit: 'summit', isles: 'isles', bridge: 'toll', finale: 'clients', depart: 'port' }[k];
      if (lm) this.drawLandmark(lm, k === 'depart' ? 120 - ease * 200 : 1100 - ease * (1100 - this.lmx), GROUND, 0.75 + ease * 0.3, t, k === 'depart' ? 1 : popIn((p - 0.3) / 0.28));
      if (k === 'dragon') {
        c.fillStyle = '#cfe3f7'; c.fillRect(-10, GROUND - 70, W + 20, 70);
        const x0 = 1000 - p * 1300;
        ink(c, 3); c.fillStyle = '#4d6aa8';
        for (let i = 0; i < 4; i++) { const hx = x0 + i * 70; c.beginPath(); c.arc(hx, GROUND - 40, 26, Math.PI, 0); c.fill(); c.stroke(); }
        c.beginPath(); c.ellipse(x0 - 30, GROUND - 74, 24, 16, 0, 0, Math.PI * 2); c.fill(); c.stroke();
        c.fillStyle = '#fcf6ee'; c.beginPath(); c.arc(x0 - 40, GROUND - 78, 6, 0, Math.PI * 2); c.arc(x0 - 24, GROUND - 78, 6, 0, Math.PI * 2); c.fill(); c.stroke();
        c.beginPath(); c.moveTo(x0 - 34, GROUND - 78); c.lineTo(x0 - 30, GROUND - 78); c.stroke();
      }
      if (k === 'steve') {
        const sx = 660; ink(c, 2.5);
        c.fillStyle = '#cfe3f7'; c.beginPath(); c.ellipse(sx + 90, GROUND + 30, 80, 14, 0, 0, Math.PI * 2); c.fill(); c.stroke();
        c.fillStyle = '#8a6a9a'; c.fillRect(sx - 10, GROUND - 40, 22, 32); c.strokeRect(sx - 10, GROUND - 40, 22, 32);
        c.fillStyle = '#f2c79a'; c.beginPath(); c.arc(sx + 1, GROUND - 50, 10, 0, Math.PI * 2); c.fill(); c.stroke();
        c.beginPath(); c.moveTo(sx + 10, GROUND - 30); c.lineTo(sx + 80, GROUND - 90); c.lineTo(sx + 100, GROUND + 26 + Math.sin(t * 2) * 3); c.stroke();
        c.font = `18px ${FONT}`; c.fillStyle = '#fdf3d6'; c.textAlign = 'center'; c.fillText('Steve', sx, GROUND - 68);
      }
      if (k === 'mail') {
        const x = 1000 - ease * 640, y = 90 + ease * 70 + Math.sin(t * 6) * 6;
        const flap = Math.sin(t * 22) * 14;
        c.save(); c.translate(x, y); ink(c, 2.2);
        c.fillStyle = '#9aa3b5'; c.beginPath(); c.ellipse(0, 0, 18, 10, 0, 0, Math.PI * 2); c.fill(); c.stroke();
        c.beginPath(); c.arc(-18, -6, 7, 0, Math.PI * 2); c.fill(); c.stroke();
        c.fillStyle = ORANGE; c.beginPath(); c.moveTo(-25, -6); c.lineTo(-31, -4); c.lineTo(-25, -3); c.fill();
        c.fillStyle = '#c7cdd9'; c.beginPath(); c.moveTo(-2, -4); c.lineTo(10, -22 - flap); c.lineTo(16, -4); c.closePath(); c.fill(); c.stroke();
        c.fillStyle = '#fbf1e1'; c.fillRect(2, 8, 12, 9); c.strokeRect(2, 8, 12, 9);
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
            c.fillStyle = rnd(i, 5) < 0.15 ? '#ffd76a' : '#fbf1e1'; c.fillRect(-10, -7, 20, 14); c.strokeRect(-10, -7, 20, 14);
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
      const c = this.c, W = this.vw;
      const a = Math.min(1, p * 5, (1 - p) * 6 + 0.4);
      // Vignette
      const g = c.createRadialGradient(W / 2, H / 2, H * 0.3, W / 2, H / 2, W * 0.7);
      g.addColorStop(0, 'rgba(0,10,98,0)'); g.addColorStop(1, `rgba(0,10,98,${0.25 * a})`);
      c.fillStyle = g; c.fillRect(0, 0, W, H);
      if (!cs.opts.title) return;
      c.save(); c.globalAlpha = Math.max(0, a);
      c.font = `700 28px ${FONT}`;
      const title = cs.opts.title;
      const tw = Math.min(W - 80, c.measureText(title).width + 70);
      const y = 22 + (1 - Math.min(1, p * 6)) * -30;
      // Ribbon
      c.fillStyle = '#fbf1e1'; ink(c, 1.8);
      c.beginPath(); c.moveTo(W / 2 - tw / 2 - 24, y + 6); c.lineTo(W / 2 - tw / 2, y + 26); c.lineTo(W / 2 - tw / 2 - 24, y + 46); c.lineTo(W / 2 - tw / 2 + 10, y + 46); c.closePath(); c.fill(); c.stroke();
      c.beginPath(); c.moveTo(W / 2 + tw / 2 + 24, y + 6); c.lineTo(W / 2 + tw / 2, y + 26); c.lineTo(W / 2 + tw / 2 + 24, y + 46); c.lineTo(W / 2 + tw / 2 - 10, y + 46); c.closePath(); c.fill(); c.stroke();
      c.fillRect(W / 2 - tw / 2, y, tw, 46); c.strokeRect(W / 2 - tw / 2, y, tw, 46);
      c.fillStyle = cs.key === 'debt' ? '#7a2a1a' : NAVY; c.textAlign = 'center'; c.textBaseline = 'middle';
      c.fillText(title, W / 2, y + 24, tw - 30);
      if (cs.opts.caption) {
        c.font = `italic 17px ${SANS}`;
        const words = cs.opts.caption.split(' '); let line = '', lines = [];
        for (const w of words) { const test = line ? line + ' ' + w : w; if (c.measureText(test).width > W * 0.62) { lines.push(line); line = w; } else line = test; }
        lines.push(line); lines = lines.slice(0, 3);
        const bh = lines.length * 24 + 14, by = y + 56;
        c.fillStyle = 'rgba(251,241,225,.95)'; c.fillRect(W / 2 - W * 0.33, by, W * 0.66, bh); ink(c, 1.5); c.strokeRect(W / 2 - W * 0.33, by, W * 0.66, bh);
        c.fillStyle = INK; lines.forEach((l, i) => c.fillText(l, W / 2, by + 18 + i * 24));
      }
      c.font = `12px ${SANS}`; c.fillStyle = 'rgba(74,44,18,.7)'; c.textAlign = 'right'; c.fillText('click to skip', W - 14, H - 14);
      c.restore();
    }
  }

  PP.TrailScene = TrailScene;
  PP.TrailScene.KINDS = Object.keys(T);
  PP.TrailScene.CUTS = ['depart', 'arrive', 'debt', 'sirens', 'fog', 'loop', 'cliffs', 'swamp', 'phones', 'caves', 'summit', 'isles', 'bridge', 'campfire', 'steve', 'emails', 'stampede', 'dragon', 'breakdown', 'mail', 'finale'];
})(window.PP);
