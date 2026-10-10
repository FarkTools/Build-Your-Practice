/* The parchment map, drawn as SVG in the style of the original concept art:
 * dotted navy main trails, dashed brown side trails, hand-lettered labels,
 * skulls on the dead ends, and parchment clouds over uncharted places.
 *
 * The map reacts to working style: the Fog of Forgotten Info spreads (avoid),
 * Spreadsheet Swamp grows (overcomplicate), the Summit ices over (soloist),
 * and the Shifting Sands spread (chase).
 *
 * PP.ui.renderMap(host, state, { onMove }) — onMove makes neighbours clickable (Lab only).
 */
(function (PP) {
  const NS = 'http://www.w3.org/2000/svg';
  const W = 1280, H = 720;
  const INK = '#4a2e14', NAVY = '#10196b', ORANGE = '#f29b1f';
  const COLORS = { green: '#3f6e2a', blue: '#2d5aa0', navy: NAVY, grey: '#5f6685', tan: '#9a6532' };
  const el = (tag, attrs, ...kids) => {
    const e = document.createElementNS(NS, tag);
    for (const k in attrs || {}) if (attrs[k] != null) e.setAttribute(k, attrs[k]);
    kids.flat().forEach((c) => c && e.appendChild(typeof c === 'string' ? document.createTextNode(c) : c));
    return e;
  };

  const SPECIAL_PATHS = {
    'port|backchannel': 'M112,478 C140,560 260,556 420,556 L980,556 C1050,556 1076,520 1086,446',
    'backchannel|clients': 'M1086,432 C1190,400 1196,260 1132,176'
  };
  function trailPath(t) {
    const N = PP.content.nodes;
    const key = t.a + '|' + t.b;
    if (SPECIAL_PATHS[key]) return SPECIAL_PATHS[key];
    const A = N[t.a], B = N[t.b];
    if (t.c) return `M${A.x},${A.y} Q${t.c[0]},${t.c[1]} ${B.x},${B.y}`;
    return `M${A.x},${A.y} L${B.x},${B.y}`;
  }
  PP.ui.trailPath = trailPath;

  PP.destinationRevealed = (s) => s.res.insight >= 6 || (s.client && Object.keys(s.facts).some((f) => s.client.facts[f] && s.client.facts[f].key));

  /* visited > named > rumored > uncharted */
  PP.visibility = function (s, id) {
    if (s.map.visited[id]) return 'visited';
    if (s.map.beam || (s.map.known && s.map.known[id])) return 'named';
    const near = PP.neighbors(s, id).some((n) => s.map.visited[n]);
    if (id === 'clients') return 'named'; // the goal is always marked on the map
    if (!near) return 'uncharted';
    const thick = s.style.avoid >= 2;
    const nav = PP.skill(s, 'navigation');
    if (nav >= 2 || (nav >= 1 && !thick)) return 'named';
    return 'rumored';
  };

  /* Landmark icons, in the map's simple ink style. */
  function icon(kind, n, s) {
    const g = el('g', { class: 'm-icon' });
    const { x, y } = n;
    const add = (...k) => k.forEach((e) => g.appendChild(e));
    switch (kind) {
      case 'port':
        add(el('path', { d: `M${x - 10},${y} h46`, class: 'ink thick' }), el('path', { d: `M${x - 4},${y} v10 M${x + 12},${y} v10 M${x + 28},${y} v10`, class: 'ink' }));
        add(boat(x - 24, y - 12), boat(x + 6, y + 82), boat(x + 56, y + 84));
        break;
      case 'meadow':
        add(el('ellipse', { cx: x + 10, cy: y + 6, rx: 82, ry: 36, class: 'meadow' }));
        [[-40, -10], [-14, 18], [20, -16], [44, 10], [-30, 22], [60, -8]].forEach(([dx, dy], i) => add(i % 2 ? el('circle', { cx: x + dx + 10, cy: y + dy, r: 5, class: 'flower' }) : el('path', { d: `M${x + dx},${y + dy} l6,-12 l6,12`, class: 'grass' })));
        break;
      case 'lighthouse':
        add(el('path', { d: `M${x - 9},${y + 28} L${x - 6},${y - 22} L${x + 6},${y - 22} L${x + 9},${y + 28} Z`, class: 'tower' }),
          el('path', { d: `M${x - 8},${y + 10} h16 M${x - 7},${y - 6} h14`, class: 'stripe' }),
          el('circle', { cx: x, cy: y - 30, r: 8, class: 'lamp' }),
          el('path', { d: `M${x + 12},${y - 34} l16,-6 M${x + 12},${y - 28} l18,0 M${x + 12},${y - 22} l16,6`, class: 'rays' }));
        break;
      case 'wreck':
        add(el('path', { d: `M${x - 26},${y + 4} L${x + 24},${y - 2} L${x + 16},${y + 12} L${x - 20},${y + 14} Z`, class: 'hull' }),
          el('path', { d: `M${x - 2},${y + 2} L${x - 4},${y - 26} M${x - 4},${y - 26} L${x + 12},${y - 10} L${x - 2},${y - 8}`, class: 'ink' }));
        break;
      case 'fog': {
        const r = 1 + Math.min(4, s.style.avoid) * 0.22;
        add(el('g', { transform: `translate(${x} ${y}) scale(${r}) translate(${-x} ${-y})` },
          el('ellipse', { cx: x - 30, cy: y - 6, rx: 46, ry: 14, class: 'cloud' }), el('ellipse', { cx: x + 30, cy: y + 8, rx: 52, ry: 14, class: 'cloud' }),
          el('path', { d: `M${x - 64},${y - 6} q12,-8 24,0 t24,0 t24,0`, class: 'fogline' }), el('path', { d: `M${x - 6},${y + 8} q12,-8 24,0 t24,0 t24,0`, class: 'fogline' })));
        break;
      }
      case 'loop':
        add(el('path', { d: spiral(x, y), class: 'trail-main' }));
        break;
      case 'cliffs':
        add(el('path', { d: `M${x - 26},${y - 18} L${x - 10},${y + 4} L${x + 4},${y - 12} L${x + 18},${y + 4} L${x + 30},${y - 18} M${x - 30},${y + 8} h64`, class: 'ink thick' }));
        break;
      case 'swamp': {
        const k = 1 + Math.min(5, s.style.overcomplicate) * 0.18;
        add(el('g', { transform: `translate(${x} ${y}) scale(${k}) translate(${-x} ${-y})` },
          el('ellipse', { cx: x, cy: y, rx: 64, ry: 28, class: 'swamp' }),
          el('path', { d: `M${x - 22},${y - 26} v52 M${x + 22},${y - 26} v52 M${x - 62},${y} h124`, class: 'swampgrid' }),
          el('path', { d: `M${x - 54},${y - 14} v-22 M${x - 48},${y - 16} v-16 M${x + 54},${y - 14} v-22 M${x + 60},${y - 16} v-16`, class: 'reeds' })));
        break;
      }
      case 'snakepit':
        add(el('path', { d: `M${x - 34},${y + 6} Q${x},${y - 22} ${x + 34},${y + 6} Z`, class: 'pit' }),
          el('path', { d: `M${x - 30},${y + 4} q5,-8 10,0 t10,0`, class: 'snake' }));
        break;
      case 'sands': {
        const k = 1 + Math.min(4, s.style.chase) * 0.25;
        const g2 = el('g', { transform: `translate(${x} ${y}) scale(${k}) translate(${-x} ${-y})` });
        [[-40, 10], [0, 0], [40, 14], [-10, 24]].forEach(([dx, dy]) => g2.appendChild(el('path', { d: `M${x + dx - 26},${y + dy} q26,-18 52,0`, class: 'dune' })));
        g2.appendChild(el('path', { d: `M${x - 34},${y - 12} l8,8 M${x - 34},${y - 4} l8,-8`, class: 'ink' }));
        add(g2);
        break;
      }
      case 'caves':
        add(el('path', { d: `M${x - 34},${y + 14} Q${x - 30},${y - 26} ${x},${y - 26} Q${x + 30},${y - 26} ${x + 34},${y + 14} Z`, class: 'cave' }),
          el('path', { d: `M${x - 12},${y + 14} Q${x - 10},${y - 6} ${x},${y - 6} Q${x + 10},${y - 6} ${x + 12},${y + 14}`, class: 'cavemouth' }));
        break;
      case 'summit': {
        const ice = Math.min(3, s.style.soloist);
        add(el('path', { d: `M${x - 62},${y + 40} L${x - 30},${y - 40} L${x - 6},${y + 6} L${x + 18},${y - 54} L${x + 62},${y + 40}`, class: 'mountain' }));
        if (ice) add(el('path', { d: `M${x - 44},${y - 4} L${x - 30},${y - 40} L${x - 18},${y - 10} M${x + 4},${y - 18} L${x + 18},${y - 54} L${x + 34},${y - 14}`, class: 'ice', style: `stroke-width:${3 + ice * 2}` }));
        break;
      }
      case 'isles':
        add(el('ellipse', { cx: x + 6, cy: y + 2, rx: 76, ry: 52, class: 'lake' }));
        [[-30, 0], [10, -22], [44, 8], [0, 26]].forEach(([dx, dy]) => add(el('ellipse', { cx: x + dx, cy: y + dy, rx: 14, ry: 8, class: 'islet' })));
        add(el('path', { d: `M${x - 30},${y} L${x + 10},${y - 22} L${x + 44},${y + 8} L${x},${y + 26}`, class: 'trail-main' }));
        break;
      case 'toll':
        add(el('path', { d: `M${x - 20},${y + 10} L${x + 22},${y - 14}`, class: 'bridge' }),
          el('path', { d: `M${x - 14},${y + 4} l6,6 M${x - 4},${y - 2} l6,6 M${x + 6},${y - 8} l6,6`, class: 'ink' }));
        break;
      case 'backchannel':
        add(el('rect', { x: x - 14, y: y - 18, width: 28, height: 36, rx: 3, class: 'stonebridge' }),
          el('path', { d: `M${x - 14},${y - 6} h28 M${x - 14},${y + 6} h28 M${x},${y - 18} v12 M${x - 7},${y - 6} v12 M${x + 7},${y - 6} v12`, class: 'ink thin' }));
        break;
      case 'clients':
        add(el('circle', { cx: x, cy: y, r: 60, class: 'glow' }),
          el('path', { d: `M${x - 22},${y - 24} L${x + 22},${y + 20} M${x + 22},${y - 24} L${x - 22},${y + 20}`, class: 'x-back' }),
          el('path', { d: `M${x - 22},${y - 24} L${x + 22},${y + 20} M${x + 22},${y - 24} L${x - 22},${y + 20}`, class: 'x-front' }));
        [[-58, -30], [44, -46], [56, 14], [-50, 30], [-6, -56]].forEach(([dx, dy]) => add(sparkle(x + dx, y + dy)));
        break;
    }
    if (n.skull) add(skull(n.x + 38, n.y - 4));
    const cr = creature(kind, n, s);
    if (cr) add(cr);
    return g;
  }

  /* Each landmark's guardian creature, as a tiny ink doodle placed clear of labels and trails. */
  function creature(kind, n, s) {
    const C = { ink: '#4a2e14', skin: '#f3d6b6', green: '#9fbd7a', paper: '#fbf1e1', fog: '#fcf6ee', gold: '#ffd76a', orange: ORANGE, red: '#c86f4f', navy: NAVY, blue: '#9cc2e6', tan: '#b0763c', lav: '#9f86b0', lion: '#e0ac6a' };
    const g = el('g', { class: 'm-creature', 'stroke-linejoin': 'round', 'stroke-linecap': 'round' });
    const P = (d, fill, w = 1.6, stroke = C.ink) => g.appendChild(el('path', { d, fill: fill || 'none', stroke, 'stroke-width': w }));
    const O = (cx, cy, r, fill, w = 1.5) => g.appendChild(el('circle', { cx, cy, r, fill, stroke: w ? C.ink : 'none', 'stroke-width': w }));
    const E = (cx, cy, rx, ry, fill, w = 1.5) => g.appendChild(el('ellipse', { cx, cy, rx, ry, fill, stroke: w ? C.ink : 'none', 'stroke-width': w }));
    const dots = (x, y, gap, r = 1) => { O(x - gap / 2, y, r, C.ink, 0); O(x + gap / 2, y, r, C.ink, 0); };
    let x, y;
    switch (kind) {
      case 'meadow': // Small-Talk Sprite with a weather bubble
        x = 236; y = 382;
        E(x - 6, y - 4, 6, 3.5, C.blue, 1.2); E(x + 6, y - 4, 6, 3.5, C.blue, 1.2);
        O(x, y, 5, C.gold); dots(x, y - 0.5, 4, 0.9);
        P(`M${x + 6},${y - 7} l3,-3`, null, 1.2); O(x + 15, y - 15, 6.5, C.paper, 1.2); O(x + 15, y - 15, 2.6, C.orange, 0);
        break;
      case 'lighthouse': // the Oracle
        x = 310; y = 264;
        P(`M${x - 8},${y} Q${x - 7},${y - 14} ${x},${y - 24} Q${x + 7},${y - 14} ${x + 8},${y} Z`, C.navy);
        E(x, y - 14, 3.6, 4.2, C.skin, 1.1); P(`M${x - 3},${y - 12} Q${x},${y - 3} ${x + 3},${y - 12} Z`, C.fog, 1);
        P(`M${x - 11},${y} v-22`, null, 1.6, '#7a5a3a'); O(x - 11, y - 24, 2.8, C.gold, 1.2);
        break;
      case 'wreck': // a Siren on her rock
        x = 176; y = 232;
        P(`M${x - 13},${y + 4} Q${x - 11},${y - 8} ${x},${y - 9} Q${x + 11},${y - 8} ${x + 13},${y + 4} Z`, '#e3c6a0');
        P(`M${x - 6},${y - 22} Q${x - 9},${y - 12} ${x - 7},${y - 6} L${x + 5},${y - 10} Q${x + 7},${y - 20} ${x + 4},${y - 24} Z`, C.red, 1.2);
        P(`M${x - 3},${y - 10} Q${x - 4},${y - 2} ${x + 7},${y} l2,-3 Q${x + 2},${y - 3} ${x + 3},${y - 10} Z`, C.green, 1.2);
        O(x, y - 19, 4.5, C.skin, 1.2); O(x + 1.5, y - 17, 0.9, C.ink, 0);
        P(`M${x + 9},${y - 24} v-7 l4,2`, null, 1.3, C.navy); O(x + 8, y - 24, 1.6, C.navy, 0);
        break;
      case 'fog': { // two Will-o'-Wisps
        const w = (wx, wy) => { P(`M${wx},${wy - 11} Q${wx + 6},${wy - 5} ${wx + 5},${wy} A5,5 0 0 1 ${wx - 5},${wy} Q${wx - 6},${wy - 5} ${wx},${wy - 11} Z`, C.gold, 1.3); dots(wx, wy - 1, 3.4, 0.8); };
        w(476, 216); w(560, 214);
        break;
      }
      case 'loop': // the Paperwork Ouroboros
        x = 606; y = 312;
        P(`M${x + 10},${y - 2} A10,10 0 1 1 ${x + 4},${y - 9}`, null, 7);
        P(`M${x + 10},${y - 2} A10,10 0 1 1 ${x + 4},${y - 9}`, null, 4.2, C.paper);
        E(x + 8, y - 7, 4.5, 3.5, C.paper, 1.3); O(x + 8.5, y - 8.5, 0.9, C.ink, 0);
        break;
      case 'cliffs': // a Pitch Harpy
        x = 366; y = 438;
        P(`M${x - 2},${y - 2} Q${x - 8},${y - 12} ${x - 15},${y - 13} Q${x - 10},${y - 6} ${x - 9},${y} Z`, '#e3c6a0', 1.2);
        E(x, y, 7, 4.5, C.tan, 1.3); O(x + 7, y - 5, 4, C.skin, 1.2);
        O(x + 8.5, y - 5.5, 0.8, C.ink, 0); O(x + 10, y - 3, 0.9, C.ink, 0);
        g.appendChild(el('rect', { x: x - 5, y: y + 6, width: 10, height: 6, fill: C.paper, stroke: C.ink, 'stroke-width': 1 }));
        break;
      case 'swamp': { // the Spreadsheet Hydra's heads (grow with the swamp)
        const k = 1 + Math.min(5, s.style.overcomplicate) * 0.18, cx = n.x, cy = n.y;
        const hg = el('g', { transform: `translate(${cx} ${cy}) scale(${k}) translate(${-cx} ${-cy})` });
        [[34, 0, -18], [44, 2, -24], [54, 4, -16]].forEach(([dx, dy, h]) => {
          const bx = cx + dx, by = cy + dy;
          hg.appendChild(el('path', { d: `M${bx},${by} q-1,${h / 2} ${2},${h}`, fill: 'none', stroke: C.ink, 'stroke-width': 5.6, 'stroke-linecap': 'round' }));
          hg.appendChild(el('path', { d: `M${bx},${by} q-1,${h / 2} ${2},${h}`, fill: 'none', stroke: C.green, 'stroke-width': 3, 'stroke-linecap': 'round' }));
          hg.appendChild(el('ellipse', { cx: bx + 4, cy: by + h - 1, rx: 5, ry: 3.5, fill: C.green, stroke: C.ink, 'stroke-width': 1.2 }));
          hg.appendChild(el('circle', { cx: bx + 5, cy: by + h - 2, r: 0.9, fill: C.ink }));
        });
        g.appendChild(hg);
        break;
      }
      case 'snakepit': { // the Voicemail Gorgon peeking out, phone-cord hair
        x = 705; y = 484;
        [[-12, -8, C.red], [-4, -14, C.navy], [5, -14, C.orange], [13, -7, '#2f5a9c']].forEach(([dx, dy, col]) => {
          const x0 = x + dx * 0.35, y0 = y - 5, x1 = x + dx, y1 = y + dy;
          let d = `M${x0},${y0}`;
          for (let k = 1; k <= 4; k++) { const u = k / 4, px = x0 + (x1 - x0) * u, py = y0 + (y1 - y0) * u; d += ` A1.6,1.6 0 1 ${k % 2} ${px.toFixed(1)},${py.toFixed(1)}`; }
          P(d, null, 1.2, col);
          E(x1, y1 - 1.5, 3.4, 1.8, col, 0.9);
        });
        O(x, y, 6.5, C.green, 1.4); dots(x, y - 0.5, 4.6, 1);
        break;
      }
      case 'sands': // the Djinn and its trophy lamp
        x = 818; y = 306;
        P(`M${x + 5},${y - 5} Q${x + 12},${y - 10} ${x + 8},${y - 16} Q${x + 4},${y - 22} ${x + 10},${y - 24}`, null, 4.6);
        P(`M${x + 5},${y - 5} Q${x + 12},${y - 10} ${x + 8},${y - 16} Q${x + 4},${y - 22} ${x + 10},${y - 24}`, null, 2.4, C.blue);
        P(`M${x - 6},${y - 6} h11 l3,-3 Q${x + 6},${y + 2} ${x},${y + 2} Q${x - 6},${y + 1} ${x - 6},${y - 6} Z M${x - 3},${y + 5} h6`, C.orange, 1.2);
        O(x + 11, y - 28, 4.2, C.blue, 1.2); dots(x + 12, y - 28.5, 3, 0.8);
        break;
      case 'caves': // the What-If Dragon, asleep
        x = 936; y = 418;
        P(`M${x - 12},${y} Q${x - 12},${y - 12} ${x - 2},${y - 12} Q${x + 8},${y - 12} ${x + 8},${y} Z`, C.red, 1.3);
        P(`M${x - 8},${y - 10} l2,-4 l2,3 l2,-4 l2,4`, C.orange, 1);
        E(x + 10, y - 3, 5, 3.6, C.red, 1.2); P(`M${x + 8},${y - 4} q1.5,1.5 3,0`, null, 1);
        g.appendChild(el('text', { x: x + 14, y: y - 12, class: 'm-zz', style: 'font: 700 11px var(--hand, sans-serif); fill: ' + NAVY }, 'z'));
        g.appendChild(el('text', { x: x + 20, y: y - 20, class: 'm-zz', style: 'font: 700 14px var(--hand, sans-serif); fill: ' + NAVY }, 'Z'));
        break;
      case 'summit': // the Sphinx
        x = 822; y = 182;
        P(`M${x - 4},${y} Q${x - 4},${y - 8} ${x + 4},${y - 8} Q${x + 13},${y - 8} ${x + 13},${y} Z`, C.lion, 1.3);
        P(`M${x - 10},${y} h8`, null, 2.4, C.lion); P(`M${x - 10},${y + 1.5} h8`, null, 1);
        P(`M${x - 9},${y - 4} Q${x - 9},${y - 13} ${x - 4},${y - 13} Q${x + 1},${y - 13} ${x + 1},${y - 4} l1.5,5 h-12 Z`, C.navy, 1.2);
        E(x - 4, y - 7, 2.8, 3.4, C.skin, 1);
        P(`M${x + 13},${y - 2} q4,-3 2,-9`, null, 1.3);
        break;
      case 'isles': // the Password Kraken
        x = 1052; y = 336;
        [[-8, -1], [8, 1]].forEach(([dx, sd]) => { P(`M${x + dx * 0.6},${y} q${dx * 0.6},-6 ${dx},-12`, null, 4.4); P(`M${x + dx * 0.6},${y} q${dx * 0.6},-6 ${dx},-12`, null, 2.4, C.lav); });
        P(`M${x - 6},${y} Q${x - 7},${y - 13} ${x},${y - 13} Q${x + 7},${y - 13} ${x + 6},${y} Z`, C.lav, 1.3);
        dots(x, y - 6, 4.4, 0.9);
        g.appendChild(el('rect', { x: x + 6, y: y - 19, width: 5, height: 4, fill: C.orange, stroke: C.ink, 'stroke-width': 0.9 }));
        break;
      case 'toll': // the Toll Troll at the end of his bridge
        x = 1128; y = 304;
        P(`M${x - 7},${y + 8} Q${x - 8},${y - 3} ${x},${y - 4} Q${x + 8},${y - 3} ${x + 7},${y + 8} Z`, C.green, 1.3);
        O(x, y - 9, 6, C.green, 1.3);
        P(`M${x - 5},${y - 12} Q${x},${y - 19} ${x + 5},${y - 12} Z`, C.navy, 1);
        dots(x, y - 9.5, 4.4, 0.9); E(x, y - 6.5, 1.8, 1.4, '#7f9f5a', 0.8);
        g.appendChild(el('rect', { x: x - 13, y: y - 3, width: 6, height: 8, fill: C.paper, stroke: C.ink, 'stroke-width': 1 }));
        break;
      default: return null;
    }
    return g;
  }
  function boat(x, y) {
    return el('g', null, el('path', { d: `M${x - 12},${y} h24 l-5,7 h-14 Z`, class: 'hull' }), el('path', { d: `M${x},${y} v-16 l10,12 Z`, class: 'sail' }));
  }
  function skull(x, y) {
    return el('g', null, el('circle', { cx: x, cy: y, r: 8, class: 'skull' }), el('circle', { cx: x - 3, cy: y - 1, r: 1.8, class: 'inkfill' }), el('circle', { cx: x + 3, cy: y - 1, r: 1.8, class: 'inkfill' }), el('path', { d: `M${x - 4},${y + 8} h8`, class: 'ink thin' }));
  }
  function sparkle(x, y) {
    return el('path', { d: `M${x},${y - 8} L${x + 2},${y - 2} L${x + 8},${y} L${x + 2},${y + 2} L${x},${y + 8} L${x - 2},${y + 2} L${x - 8},${y} L${x - 2},${y - 2} Z`, class: 'sparkle' });
  }
  function spiral(cx, cy) {
    let d = '';
    for (let a = 0; a < Math.PI * 5; a += 0.2) { const r = 6 + a * 4.2; d += (d ? ' L' : 'M') + (cx + Math.cos(a) * r).toFixed(1) + ',' + (cy + Math.sin(a) * r * 0.75).toFixed(1); }
    return d;
  }

  /* Torn parchment edge */
  function parchmentPath() {
    const pts = [];
    const x0 = 52, y0 = 92, x1 = 1228, y1 = 604;
    const j = (i, a) => Math.sin(i * 12.9898 + a) * 43758.5453 % 1 * 7;
    for (let x = x0; x <= x1; x += 40) pts.push([x, y0 + j(x, 1)]);
    for (let y = y0; y <= y1; y += 40) pts.push([x1 + j(y, 2), y]);
    for (let x = x1; x >= x0; x -= 40) pts.push([x, y1 + j(x, 3)]);
    for (let y = y1; y >= y0; y -= 40) pts.push([x0 + j(y, 4), y]);
    return 'M' + pts.map((p) => p[0].toFixed(1) + ',' + p[1].toFixed(1)).join(' L') + 'Z';
  }

  function label(n, id, v) {
    const [lx, ly] = n.label || [n.x + 20, n.y + 30];
    const g = el('g', { class: 'm-label v-' + v + (n.color ? ' c-' + n.color : '') + (n.big ? ' big' : '') });
    let name = v === 'visited' || v === 'named' ? n.name : v === 'rumored' ? '?' : '';
    if (!name) return g;
    const parts = name.length > 15 && name.includes(' ') ? splitName(name) : [name];
    parts.forEach((p, i) => g.appendChild(el('text', { x: lx, y: ly + i * (n.big ? 26 : 22), style: n.color ? `fill:${COLORS[n.color]}` : null }, p)));
    if (n.sub && name !== '?') g.appendChild(el('text', { x: lx + 14, y: ly + parts.length * 22 - 2, class: 'm-sub' }, n.sub));
    if (v === 'rumored') g.appendChild(el('text', { x: lx + 18, y: ly, class: 'm-sub' }, n.x > 900 ? '' : n.teaser.length > 30 ? n.teaser.slice(0, 28) + '…' : n.teaser));
    return g;
  }
  function splitName(name) {
    const w = name.split(' ');
    let best = 1, diff = 1e9;
    for (let i = 1; i < w.length; i++) { const a = w.slice(0, i).join(' ').length, b = w.slice(i).join(' ').length; if (Math.abs(a - b) < diff) { diff = Math.abs(a - b); best = i; } }
    return [w.slice(0, best).join(' '), w.slice(best).join(' ')];
  }

  PP.ui.renderMap = function (host, s, opts = {}) {
    const svg = el('svg', { viewBox: `0 0 ${W} ${H}`, class: 'pmap', role: 'img', 'aria-label': 'Map of the territory around Port Prospect' });
    const uid = (host.id || 'm') + '-' + Math.floor(Math.random() * 1e6);
    svg.appendChild(el('defs', null,
      el('filter', { id: uid + 'rough' }, el('feTurbulence', { type: 'fractalNoise', baseFrequency: '0.9', numOctaves: '2', seed: '3' }), el('feDisplacementMap', { in: 'SourceGraphic', scale: '1.6' })),
      el('radialGradient', { id: uid + 'paper', cx: '50%', cy: '45%', r: '70%' }, el('stop', { offset: '0.6', 'stop-color': '#f6e3be' }), el('stop', { offset: '1', 'stop-color': '#e9cc98' })),
      el('radialGradient', { id: uid + 'glow' }, el('stop', { offset: '0', 'stop-color': '#ffe7a3', 'stop-opacity': '0.95' }), el('stop', { offset: '1', 'stop-color': '#ffe7a3', 'stop-opacity': '0' }))));

    svg.appendChild(el('rect', { x: 0, y: 0, width: W, height: H, class: 'm-bg' }));
    svg.appendChild(el('path', { d: parchmentPath(), fill: `url(#${uid}paper)`, class: 'm-paper' }));
    svg.appendChild(el('rect', { x: 74, y: 112, width: 1132, height: 472, class: 'm-frame' }));

    // Water: northwest sea, harbor, river and lake
    svg.appendChild(el('path', { d: 'M76,114 L400,114 C398,170 380,220 300,236 C230,250 150,246 76,262 Z', class: 'm-water' }));
    svg.appendChild(el('path', { d: 'M76,440 C110,446 128,470 120,500 C112,540 150,560 190,582 L76,582 Z', class: 'm-water' }));
    svg.appendChild(el('path', { d: 'M944,114 C960,180 990,220 1020,250 M1060,330 C1110,380 1160,410 1204,452', class: 'm-river' }));
    [[96, 150, 'Sirens of the', 'Quick Close'], [250, 140, 'Here Be', 'Dragons']].forEach(([x, y, a, b], i) => {
      svg.appendChild(el('text', { x, y, class: 'm-lore' + (i ? ' big' : '') }, a));
      svg.appendChild(el('text', { x: x + (i ? 0 : 4), y: y + (i ? 24 : 18), class: 'm-lore' + (i ? ' big' : '') }, b));
    });
    svg.appendChild(el('path', { d: 'M232,196 q12,-20 24,0 q12,-20 24,0 q12,-20 24,0 q8,-12 16,-6 l7,-5', class: 'm-dragon' }));
    // Compass
    svg.appendChild(el('g', { class: 'm-compass', transform: 'translate(1146 504)' },
      el('circle', { r: 30 }), el('path', { d: 'M0,-38 L6,0 L0,38 L-6,0 Z' }), el('path', { d: 'M-38,0 L0,6 L38,0 L0,-6 Z', class: 'thin' })));

    // Trails
    const trails = el('g', { class: 'm-trails' });
    const walked = new Set((s.walked || []).map((w) => w));
    const pathEls = {};
    PP.content.trails.forEach((t) => {
      const va = PP.visibility(s, t.a), vb = PP.visibility(s, t.b);
      const charted = va !== 'uncharted' && vb !== 'uncharted';
      const cls = 'trail-' + t.kind + (charted ? '' : ' faint') + (t.kind === 'secret' && !s.password ? ' locked' : '');
      const p = el('path', { d: trailPath(t), class: cls });
      if (walked.has(t.a + '|' + t.b) || walked.has(t.b + '|' + t.a)) trails.appendChild(el('path', { d: trailPath(t), class: 'trail-walked' }));
      trails.appendChild(p);
      pathEls[t.a + '|' + t.b] = p;
    });
    svg.appendChild(trails);
    // Hidden passages: a small dashed bypass under each obstacle that has one.
    const pg = el('g', { class: 'm-passages' });
    Object.keys(PP.content.passages || {}).forEach((id) => {
      const n = PP.content.nodes[id]; if (!n) return;
      const open = (PP.content.passages[id] || []).some((p) => PP.passageOpen && PP.passageOpen(Object.assign({}, s, { map: Object.assign({}, s.map, { current: id }) }), p));
      pg.appendChild(el('path', { d: `M${n.x - 34},${n.y + 22} q34,26 68,0`, class: 'passage' + (open ? ' open' : '') }));
    });
    svg.appendChild(pg);

    // Landmarks
    const icons = el('g', { class: 'm-icons' });
    const labels = el('g', { class: 'm-labels' });
    const vis = {};
    Object.entries(PP.content.nodes).forEach(([id, n]) => {
      vis[id] = PP.visibility(s, id);
      const ig = icon(n.kind, n, s);
      ig.setAttribute('class', 'm-icon v-' + vis[id]);
      icons.appendChild(ig);
      labels.appendChild(label(n, id, vis[id]));
    });
    svg.appendChild(icons);

    // Parchment clouds over uncharted places
    const clouds = el('g', { class: 'm-clouds' });
    Object.entries(PP.content.nodes).forEach(([id, n]) => {
      if (vis[id] !== 'uncharted') return;
      const r = 1 + Math.min(4, s.style.avoid) * 0.12;
      clouds.appendChild(el('g', { transform: `translate(${n.x} ${n.y}) scale(${r})` },
        el('ellipse', { cx: -26, cy: 6, rx: 46, ry: 26 }), el('ellipse', { cx: 18, cy: -8, rx: 50, ry: 30 }), el('ellipse', { cx: 34, cy: 18, rx: 40, ry: 22 }),
        el('text', { x: 4, y: 10, class: 'm-q' }, '?')));
    });
    svg.appendChild(clouds);
    svg.appendChild(labels);

    // Clickable neighbours (Element Lab only)
    if (opts.onMove) {
      PP.neighbors(s, s.map.current).forEach((id) => {
        const n = PP.content.nodes[id];
        const hit = el('circle', { cx: n.x, cy: n.y, r: 26, class: 'm-hit', tabindex: '0', role: 'button', 'aria-label': 'Travel to ' + (vis[id] === 'uncharted' || vis[id] === 'rumored' ? 'an uncharted place' : n.name) });
        hit.addEventListener('click', () => opts.onMove(id));
        hit.addEventListener('keydown', (e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); opts.onMove(id); } });
        svg.appendChild(hit);
      });
    }

    // Practice systems built from trail Marks show up on the map
    if (s.career && s.career.systems) {
      const built = el('g', { class: 'm-built' });
      Object.entries(PP.content.practice.systems).forEach(([id, sy]) => {
        if (!s.career.systems[id]) return;
        const n = PP.content.nodes[sy.mark];
        if (id === 'planning') built.appendChild(el('path', { d: `M${n.x - 70},${n.y + 6} L${n.x + 70},${n.y - 6}`, class: 'boardwalk' }));
        const g = el('g', { transform: `translate(${n.x - 34} ${n.y - 34})` },
          el('path', { d: 'M0,0 L0,-26 L18,-20 L0,-14', class: 'pennant' }), el('line', { x1: 0, y1: 0, x2: 0, y2: -26, class: 'pole' }));
        g.appendChild(el('title', null, sy.name));
        built.appendChild(g);
      });
      svg.appendChild(built);
    }

    // You are here: a map pin, at a landmark or partway along the current trail
    const marker = el('g', { class: 'm-pin' },
      el('path', { d: 'M0,0 C-4,-8 -12,-14 -12,-24 A12,12 0 1 1 12,-24 C12,-14 4,-8 0,0 Z', class: 'pin' }),
      el('circle', { cx: 0, cy: -24, r: 5, class: 'pin-dot' }));
    svg.appendChild(marker);

    host.innerHTML = '';
    host.appendChild(svg);

    let pos = PP.content.nodes[s.map.current] || PP.content.nodes.port;
    if (s.seg) {
      const k1 = s.seg.from + '|' + s.seg.to, k2 = s.seg.to + '|' + s.seg.from;
      const pe = pathEls[k1] || pathEls[k2];
      if (pe && pe.getTotalLength) {
        const L = pe.getTotalLength();
        const frac = PP.clamp(1 - s.seg.left / s.seg.total, 0, 1);
        const pt = pe.getPointAtLength((pathEls[k1] ? frac : 1 - frac) * L);
        pos = { x: pt.x, y: pt.y };
      }
    }
    marker.setAttribute('transform', `translate(${pos.x} ${pos.y - 4})`);
  };
})(window.PP);
