/* Personalization, sharing and friend challenges.
 *
 * PP.profile   your name and practice name (kept in this browser, carried into each career)
 * PP.share     draws a result card (a PNG) and opens a share box that works on any device:
 *              the system share sheet where the browser has one, plus LinkedIn, Facebook, X,
 *              email, copy link and download image everywhere.
 * PP.challenge builds and reads ?challenge= links: a friend gets the same agent type and the
 *              same first prospect, and sees your score to beat.
 * Nothing is sent anywhere: all of this lives in the link and in the player's browser. */
(function (PP) {
  const h = PP.h;
  const HOME = 'https://farktools.github.io/build-your-practice/';

  /* ---------- Profile ---------- */
  const clean = (v, n) => String(v || '').replace(/[<>]/g, '').replace(/\s+/g, ' ').trim().slice(0, n);
  PP.profile = {
    get() { return Object.assign({ name: '', practice: '' }, PP.store.get('profile', {})); },
    set(p) { PP.store.set('profile', { name: clean(p.name, 40), practice: clean(p.practice, 48) }); }
  };
  /* First name for dialogue ("Lead the way, Sam"), full name for cards. */
  PP.you = (c) => { const n = (c && c.you) || PP.profile.get().name; return n ? n.split(' ')[0] : ''; };
  PP.youFull = (c) => (c && c.you) || PP.profile.get().name || '';
  PP.practiceName = (c) => (c && c.practiceName) || '';

  /* ---------- Where the game lives (for links) ---------- */
  function base() {
    if (/^https?:/.test(location.protocol) && !/^(localhost|127\.)/.test(location.hostname)) return location.origin + location.pathname.replace(/index\.html$/, '');
    return HOME;
  }

  /* ---------- Challenge links ---------- */
  const b64 = (o) => btoa(unescape(encodeURIComponent(JSON.stringify(o)))).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
  const unb64 = (s) => JSON.parse(decodeURIComponent(escape(atob(s.replace(/-/g, '+').replace(/_/g, '/')))));
  PP.challenge = {
    /* r = a result from PP.share.result() */
    link(r) {
      if (!r.archetype) return base();
      return base() + '?challenge=' + b64({ v: 1, by: r.name || 'A friend', agent: r.agent, arch: r.archetype, cn: r.client, temp: r.temp || 'warm', st: r.stars, dy: r.days, rt: r.rating, ds: r.dest || '' });
    },
    read() {
      try {
        const q = new URLSearchParams(location.search).get('challenge');
        if (!q) return null;
        const d = unb64(q);
        if (!d || !PP.content.clients[d.arch] || !PP.content.agentTypes.find((a) => a.id === d.agent)) return null;
        return { by: clean(d.by, 40) || 'A friend', agent: d.agent, arch: d.arch, client: clean(d.cn, 30), temp: ['hot', 'warm', 'cold'].includes(d.temp) ? d.temp : 'warm', stars: Math.max(0, Math.min(7, d.st | 0)), days: Math.max(1, d.dy | 0), rating: clean(d.rt, 40), dest: clean(d.ds, 40) };
      } catch (e) { return null; }
    },
    /* Drop ?challenge= from the address bar once it's been accepted, so a reload doesn't re-offer it. */
    clear() { try { const u = new URL(location.href); u.searchParams.delete('challenge'); history.replaceState(null, '', u.toString()); } catch (e) { /* sandboxed */ } }
  };

  /* ---------- Result card ---------- */
  const COL = { navy: '#000a62', parch: '#f5ddbb', parch2: '#efd3ad', parch3: '#e3c6a0', ink: '#4a2c12', ink2: '#7a5a3a', orange: '#f39c12', green: '#3f7a2f', red: '#a3321c', trust: '#c4586f', momentum: '#e08a1e', energy: '#5c9a46', insight: '#3d6fb6' };
  const SANS = '"Open Sans", "Segoe UI", system-ui, -apple-system, sans-serif';
  const HAND = '"Kalam", "Segoe Print", "Bradley Hand", cursive';

  function wrap(ctx, text, x, y, maxW, lh, maxLines) {
    const words = String(text).split(' ');
    let line = '', lines = [];
    words.forEach((w) => { const t = line ? line + ' ' + w : w; if (ctx.measureText(t).width > maxW && line) { lines.push(line); line = w; } else line = t; });
    if (line) lines.push(line);
    if (maxLines && lines.length > maxLines) { lines = lines.slice(0, maxLines); lines[maxLines - 1] = lines[maxLines - 1].replace(/\s+\S*$/, '') + '…'; }
    lines.forEach((l, i) => ctx.fillText(l, x, y + i * lh));
    return lines.length * lh;
  }
  function compass(ctx, x, y, r) {
    ctx.save(); ctx.translate(x, y);
    ctx.fillStyle = COL.parch; ctx.strokeStyle = COL.orange; ctx.lineWidth = r * 0.11;
    ctx.beginPath(); ctx.arc(0, 0, r, 0, Math.PI * 2); ctx.fill(); ctx.stroke();
    const pt = (rot, fill) => { ctx.save(); ctx.rotate(rot); ctx.beginPath(); ctx.moveTo(0, -r * 0.83); ctx.lineTo(r * 0.18, -r * 0.17); ctx.lineTo(0, 0); ctx.lineTo(-r * 0.18, -r * 0.17); ctx.closePath(); ctx.fillStyle = fill; ctx.fill(); ctx.strokeStyle = COL.ink; ctx.lineWidth = r * 0.06; ctx.lineJoin = 'round'; ctx.stroke(); ctx.restore(); };
    pt(0, COL.orange); pt(Math.PI, COL.navy); pt(Math.PI / 2, '#fbf1e1'); pt(-Math.PI / 2, '#fbf1e1');
    ctx.fillStyle = COL.ink; ctx.beginPath(); ctx.arc(0, 0, r * 0.1, 0, Math.PI * 2); ctx.fill();
    ctx.restore();
  }
  function star(ctx, x, y, r, on) {
    ctx.beginPath();
    for (let i = 0; i < 10; i++) { const a = -Math.PI / 2 + i * Math.PI / 5, rr = i % 2 ? r * 0.45 : r; ctx.lineTo(x + Math.cos(a) * rr, y + Math.sin(a) * rr); }
    ctx.closePath(); ctx.fillStyle = on ? COL.orange : 'transparent'; ctx.fill();
    ctx.strokeStyle = on ? COL.ink : COL.parch3; ctx.lineWidth = 3; ctx.lineJoin = 'round'; ctx.stroke();
  }

  /* Draw the card: 1080 x 1350 (portrait, sits well on LinkedIn, Instagram, Facebook and in texts). */
  async function draw(r) {
    try { if (document.fonts && document.fonts.ready) await Promise.race([document.fonts.ready, new Promise((ok) => setTimeout(ok, 1200))]); } catch (e) { /* no font API */ }
    const W = 1080, H = 1350, cv = document.createElement('canvas');
    cv.width = W; cv.height = H;
    const ctx = cv.getContext('2d');
    ctx.fillStyle = COL.navy; ctx.fillRect(0, 0, W, H);
    // parchment card
    const m = 56, top = 170;
    ctx.fillStyle = COL.parch; ctx.strokeStyle = COL.orange; ctx.lineWidth = 6;
    ctx.beginPath(); ctx.roundRect(m, top, W - 2 * m, H - top - 120, 22); ctx.fill(); ctx.stroke();
    ctx.strokeStyle = 'rgba(74,44,18,.25)'; ctx.lineWidth = 2;
    ctx.beginPath(); ctx.roundRect(m + 18, top + 18, W - 2 * m - 36, H - top - 156, 12); ctx.stroke();
    // header
    compass(ctx, m + 52, 88, 46);
    ctx.fillStyle = COL.parch; ctx.font = `700 54px ${SANS}`; ctx.textBaseline = 'middle'; ctx.textAlign = 'left';
    ctx.fillText('Build Your Practice', m + 124, 90);
    ctx.textBaseline = 'alphabetic';
    const L = m + 64, R = W - m - 64, CW = R - L;
    let y = top + 100;
    // who
    ctx.fillStyle = COL.orange; ctx.font = `700 30px ${SANS}`;
    ctx.fillText((r.eyebrow || '').toUpperCase(), L, y);
    const big = r.headline.length > 18 ? 74 : 92;
    y += big + 10;
    ctx.fillStyle = COL.navy; ctx.font = `700 ${big}px ${SANS}`;
    y += wrap(ctx, r.headline, L, y, CW, 96, 2) - 20;
    if (r.stars != null) {
      y += 30;
      for (let i = 0; i < 7; i++) star(ctx, L + 36 + i * 86, y + 30, 34, i < r.stars);
      y += 96;
    } else y += 24;
    ctx.fillStyle = COL.ink; ctx.font = `400 40px ${SANS}`;
    y += wrap(ctx, r.line, L, y + 30, CW, 54, 4) + 20;
    // stats
    if (r.stats && r.stats.length) {
      y += 20;
      ctx.strokeStyle = COL.navy; ctx.setLineDash([3, 10]); ctx.lineWidth = 5; ctx.lineCap = 'round';
      ctx.beginPath(); ctx.moveTo(L, y); ctx.lineTo(R, y); ctx.stroke(); ctx.setLineDash([]);
      y += 70;
      const colW = CW / r.stats.length;
      r.stats.forEach(([k, v], i) => {
        const x = L + i * colW;
        ctx.fillStyle = COL.ink2; ctx.font = `700 24px ${SANS}`; ctx.fillText(k.toUpperCase(), x, y);
        ctx.fillStyle = COL.ink; ctx.font = `700 ${String(v).length > 9 ? 36 : 46}px ${SANS}`; ctx.fillText(String(v), x, y + 56);
      });
      y += 110;
    }
    if (r.gauges) {
      const gw = (CW - 3 * 30) / 4;
      PP.RES.forEach((g, i) => {
        const x = L + i * (gw + 30), v = r.gauges[g.id] || 0;
        ctx.fillStyle = COL.ink2; ctx.font = `700 22px ${SANS}`; ctx.fillText(g.label.toUpperCase(), x, y);
        ctx.fillStyle = COL.ink; ctx.font = `700 30px ${SANS}`; ctx.textAlign = 'right'; ctx.fillText(String(v), x + gw, y); ctx.textAlign = 'left';
        ctx.fillStyle = COL.parch3; ctx.beginPath(); ctx.roundRect(x, y + 16, gw, 14, 7); ctx.fill();
        ctx.fillStyle = COL[g.id]; ctx.beginPath(); ctx.roundRect(x, y + 16, Math.max(14, gw * v / 10), 14, 7); ctx.fill();
      });
      y += 70;
    }
    // challenge strip at the bottom of the card
    const by = H - 120 - 150;
    ctx.fillStyle = 'rgba(243,156,18,.18)'; ctx.beginPath(); ctx.roundRect(L - 20, by, CW + 40, 110, 14); ctx.fill();
    ctx.fillStyle = COL.ink; ctx.font = `700 38px ${HAND}`;
    ctx.fillText(r.cta || 'Think you can do better?', L, by + 50);
    ctx.fillStyle = COL.ink2; ctx.font = `400 28px ${SANS}`;
    ctx.fillText(base().replace(/^https?:\/\//, '').replace(/\/$/, ''), L, by + 90);
    // footer
    ctx.fillStyle = '#aab3e6'; ctx.font = `600 26px ${SANS}`; ctx.textAlign = 'center';
    ctx.fillText(`A light adventure about building a client practice · © ${PP.BUILT.slice(0, 4)} FarkTools`, W / 2, H - 52);
    ctx.textAlign = 'left';
    return cv;
  }

  /* ---------- Share box ---------- */
  function copy(text) {
    if (navigator.clipboard && window.isSecureContext) return navigator.clipboard.writeText(text);
    const ta = h('textarea', { style: { position: 'fixed', opacity: '0' } }); ta.value = text; document.body.appendChild(ta); ta.select();
    try { document.execCommand('copy'); } catch (e) { /* ignore */ }
    ta.remove(); return Promise.resolve();
  }

  /* r: { name, eyebrow, headline, stars, line, stats, gauges, cta, text, archetype, ... } */
  async function open(r) {
    const url = r.challenge === false ? base() : PP.challenge.link(r);
    const text = r.text;
    const status = h('p', { class: 'small muted share-status', 'aria-live': 'polite' });
    const img = h('img', { class: 'share-img', alt: 'Your result card' });
    const say = (t) => { status.textContent = t; };
    let blob = null;
    const file = () => blob && new File([blob], 'build-your-practice.png', { type: 'image/png' });
    const enc = encodeURIComponent;
    const native = navigator.share ? h('button', { class: 'btn primary big', onclick: async () => {
      try {
        const f = file();
        const data = { title: 'Build Your Practice', text, url };
        if (f && navigator.canShare && navigator.canShare({ files: [f] })) data.files = [f];
        await navigator.share(data);
      } catch (e) { if (e && e.name !== 'AbortError') say('Sharing did not work here. Try one of the buttons below.'); }
    } }, 'Share…') : null;
    const link = (label, href, cls) => h('a', { class: 'btn share-btn ' + (cls || ''), href, target: '_blank', rel: 'noopener' }, label);
    const ov = h('div', { class: 'overlay share-overlay', role: 'dialog', 'aria-modal': 'true', 'aria-label': 'Share your result', onclick: (e) => { if (e.target === ov) close(); } },
      h('div', { class: 'overlay-card share-card' }, h('div', { class: 'scene' },
        h('div', { class: 'row between' }, h('div', null, h('div', { class: 'eyebrow' }, 'Share'), h('h3', { class: 'scene-title' }, r.challenge === false ? 'Show people how it went' : 'Challenge your friends')),
          h('button', { class: 'btn ghost', onclick: () => close() }, 'Close')),
        h('div', { class: 'share-layout' },
          h('div', { class: 'share-preview' }, img),
          h('div', { class: 'share-actions' },
            r.challenge === false ? null : h('p', { class: 'small' }, `Your link sets up the same agent and the same first prospect${r.client ? ` (${r.client})` : ''}, and shows your score to beat.`),
            native,
            h('div', { class: 'share-grid' },
              link('LinkedIn', `https://www.linkedin.com/sharing/share-offsite/?url=${enc(url)}`, 's-li'),
              link('Facebook', `https://www.facebook.com/sharer/sharer.php?u=${enc(url)}`, 's-fb'),
              link('X', `https://x.com/intent/post?text=${enc(text)}&url=${enc(url)}`, 's-x'),
              link('Email', `mailto:?subject=${enc('Build Your Practice')}&body=${enc(text + '\n\n' + url)}`, 's-mail'),
              h('button', { class: 'btn share-btn', onclick: () => copy(text + ' ' + url).then(() => say('Copied. Paste it anywhere: a text, Slack, Teams.')) }, 'Copy link'),
              h('button', { class: 'btn share-btn', onclick: () => { if (!blob) return; const a = h('a', { href: URL.createObjectURL(blob), download: 'build-your-practice.png' }); document.body.appendChild(a); a.click(); a.remove(); say('Image saved. Attach it to a post along with your link.'); } }, 'Download image')),
            h('p', { class: 'small muted' }, 'LinkedIn, Facebook and X share the link. To post the picture too, download the image and add it to your post.'),
            status)))));
    function close() { ov.remove(); document.body.classList.remove('modal-open'); }
    document.body.appendChild(ov);
    document.body.classList.add('modal-open');
    const cv = await draw(r);
    img.src = cv.toDataURL('image/png');
    cv.toBlob((b) => { blob = b; });
  }

  PP.share = { open, draw, base };
})(window.PP);
