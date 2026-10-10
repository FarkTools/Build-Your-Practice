/* The Port Prospect town map, drawn in the same parchment style as the trail map.
 * PP.ui.townMap(career, selectedId, onPick) -> <svg>. Each place is a big tap target. */
(function (PP) {
  const NS = 'http://www.w3.org/2000/svg';
  const INK = '#4a2c12', NAVY = '#000a62', ORANGE = '#f39c12';
  const W = 360, H = 440;
  const el = (tag, attrs, ...kids) => {
    const e = document.createElementNS(NS, tag);
    for (const k in attrs || {}) if (attrs[k] != null) e.setAttribute(k, attrs[k]);
    kids.flat().forEach((c) => c && e.appendChild(typeof c === 'string' ? document.createTextNode(c) : c));
    return e;
  };
  const p = (d, cls) => el('path', { d, class: cls || 'ink' });

  /* Little buildings, each drawn around (0,0) = the place's anchor. */
  const ICON = {
    trailhead: () => [p('M0,16 v-36', 'ink thick'), p('M0,-18 h22 l6,5 l-6,5 h-22z', 'fill-orange'), p('M0,-6 h-20 l-6,5 l6,5 h20z', 'fill-fog'), p('M-30,16 q30,-8 60,0', 'ink thin'), el('circle', { cx: 18, cy: 8, r: 6, class: 'fill-tan' }), p('M14,4 h8', 'ink thin')],
    docks: () => [
      p('M-34,8 h68 M-28,8 v14 M-10,8 v14 M8,8 v14 M26,8 v14', 'ink thick'),
      el('g', { class: 't-boat' }, p('M-60,24 h30 l-6,9 h-18z', 'fill-fog'), p('M-46,24 v-20 l14,17z', 'fill-orange')),
      el('g', { class: 't-boat b2' }, p('M36,30 h26 l-5,8 h-16z', 'fill-tan'), p('M42,30 v-8 h12 v8', 'fill-fog'))
    ],
    square: () => [-26, 0, 26].map((dx, i) => el('g', { transform: `translate(${dx} 0)` },
      p('M-11,-2 h22 v14 h-22z', 'fill-fog'), p('M-14,-2 l3,-10 h22 l3,10z', i === 1 ? 'fill-orange' : i ? 'fill-water' : 'fill-meadow'), p('M-7,-12 v10 M0,-12 v10 M7,-12 v10', 'ink thin'))),
    chamber: () => [p('M-26,12 h52 v-24 h-52z', 'fill-fog'), p('M-30,-12 L0,-28 L30,-12z', 'fill-parch3'), p('M-18,12 v-22 M-6,12 v-22 M6,12 v-22 M18,12 v-22', 'ink thin'), p('M0,-28 v-12 l12,4 l-12,4', 'fill-orange')],
    office: () => [p('M-18,14 v-26 h36 v26z', 'fill-fog'), p('M-22,-12 L0,-26 L22,-12z', 'fill-red'), p('M-4,14 v-12 h8 v12', 'fill-tan'), p('M-13,-6 h7 v7 h-7z M6,-6 h7 v7 h-7z', 'fill-water')],
    street: () => [-24, 0, 24].map((dx, i) => el('g', { transform: `translate(${dx} 0)` }, p(`M-10,14 v-${22 + i * 6} h20 v${22 + i * 6}z`, i === 1 ? 'fill-parch3' : 'fill-fog'), p(`M-5,${-12 - i * 4} h4 v4 h-4z M2,${-12 - i * 4} h4 v4 h-4z M-5,0 h4 v4 h-4z M2,0 h4 v4 h-4z`, 'fill-water'))),
    homes: () => [[-28, 4], [0, -4], [28, 4]].map(([dx, dy], i) => el('g', { transform: `translate(${dx} ${dy})` }, p('M-10,10 v-12 h20 v12z', 'fill-fog'), p('M-13,-2 L0,-13 L13,-2z', ['fill-red', 'fill-blue', 'fill-meadow'][i]), p('M-3,10 v-6 h6 v6', 'fill-tan'))),
    school: () => [p('M-26,14 v-20 h52 v20z', 'fill-fog'), p('M-30,-6 L0,-18 L30,-6z', 'fill-red'), p('M-6,-18 v-14 h12 v14', 'fill-fog'), p('M-8,-32 L0,-40 L8,-32z', 'fill-red'), el('circle', { cx: 0, cy: -25, r: 3, class: 'fill-orange' }), p('M-4,14 v-10 h8 v10', 'fill-tan'), p('M-20,0 h8 v6 h-8z M12,0 h8 v6 h-8z', 'fill-water')],
    library: () => [p('M-22,12 v-18 h44 v18z', 'fill-fog'), p('M-26,-6 h52 l-4,-8 h-44z', 'fill-parch3'), p('M-14,12 v-16 M14,12 v-16', 'ink thin'), p('M-7,-1 h6 v10 h-6z', 'fill-blue'), p('M0,-1 h6 v10 h-6z', 'fill-orange')],
    field: () => [el('path', { d: 'M0,-20 L22,0 L0,20 L-22,0z', class: 'fill-meadow' }), p('M0,-20 L22,0 L0,20 L-22,0z', 'ink thin'), el('circle', { cx: 0, cy: 0, r: 3, class: 'fill-fog' }), p('M-30,-22 v-14 h16 v8 h-16', 'fill-orange')]
  };

  PP.ui.townMap = function (c, selected, onPick) {
    const T = PP.content.town;
    const svg = el('svg', { viewBox: `0 0 ${W} ${H}`, class: 'town-map', role: 'group', 'aria-label': 'Map of Port Prospect. Tap a place.' });
    // Land, water, coast
    svg.append(
      el('rect', { x: 2, y: 2, width: W - 4, height: H - 4, rx: 4, class: 'land' }),
      el('path', { d: `M2,352 C50,340 100,358 150,346 C200,334 240,356 278,362 C310,368 340,372 358,366 V438 H2z`, class: 'sea' }),
      ...[0, 1, 2].map((r) => el('path', { d: `M${14 + r * 30},${392 + r * 12} q10,-6 20,0 t20,0 M${220 + r * 40},${394 + r * 12} q10,-6 20,0 t20,0`, class: 'wave' })),
      el('path', { d: 'M330,318 C344,312 350,300 358,296', class: 'road' }),
      el('text', { x: 346, y: 352, class: 't-sea t-small' }, 'trail →')
    );
    // Roads (dotted, like the trail map)
    const roads = ['M78,150 C120,170 150,190 178,214', 'M178,214 C220,200 250,170 282,140', 'M178,214 C230,225 260,232 300,236', 'M178,214 C170,270 160,320 150,352', 'M178,214 C230,250 280,290 312,318', 'M56,262 C100,250 140,232 178,214',
      'M170,62 C175,120 176,170 178,214', 'M170,62 C220,58 250,54 292,52', 'M58,62 C100,60 130,62 170,62', 'M78,150 C70,110 62,85 58,62', 'M282,140 C288,110 290,80 292,52'];
    roads.forEach((d) => svg.appendChild(el('path', { d, class: 'road' })));
    // Scenery: trees and grass
    [[120, 110], [236, 96], [22, 200], [118, 300], [330, 180], [246, 300], [26, 120], [334, 100], [60, 330], [228, 336], [96, 322]].forEach(([x, y], i) =>
      svg.appendChild(i % 2 ? el('path', { d: `M${x - 5},${y} l5,-10 l5,10`, class: 'grass' }) : el('g', null, el('circle', { cx: x, cy: y - 8, r: 7, class: 'fill-tree' }), el('path', { d: `M${x},${y - 1} v6`, class: 'ink thin' }))));
    // Compass
    svg.appendChild(el('g', { transform: 'translate(330 30)', class: 't-compass' }, el('circle', { r: 13, class: 'fill-fog' }), el('path', { d: 'M0,-16 L3,-3 L0,0 L-3,-3z', class: 'fill-orange' }), el('path', { d: 'M0,16 L3,3 L0,0 L-3,3z', class: 'fill-navy' }), el('text', { y: -19, class: 't-n' }, 'N')));

    const badges = {
      trailhead: c.pipeline.length + (c.followUps || []).length ? { n: c.pipeline.length + (c.followUps || []).length, cls: 'b-go', title: 'ready to set out' } : null,
      homes: (() => { const act = c.book.filter((b) => ['life', 'steady', 'at-risk'].includes(b.status)); const un = act.filter((b) => b.sat < 5).length + (c.followUps || []).length; return un ? { n: '!', cls: 'b-warn', title: 'clients need you' } : act.length ? { n: act.length, cls: 'b-ok', title: 'clients' } : null; })()
    };
    Object.entries(T.places).forEach(([id, pl]) => {
      if (!badges[id] && pl.npcs.some((n) => !c.met[n])) badges[id] = { n: '•', cls: 'b-new', title: 'someone new to meet' };
      const label = id === 'office' ? { kitchen: 'Your table', cowork: 'Your desk', office: 'Your office' }[c.workspace] || pl.short : pl.short;
      const lw = label.length * 6.6 + 16;
      const g = el('g', { class: 'tp' + (id === selected ? ' on' : ''), 'data-id': id, transform: `translate(${pl.x} ${pl.y})`, tabindex: 0, role: 'button', 'aria-label': pl.name },
        el('circle', { r: 36, class: 'hit' }),
        el('ellipse', { cx: 0, cy: 16, rx: 34, ry: 6, class: 'shadow' }),
        el('g', { class: 'icon' }, ICON[id] ? ICON[id]() : []),
        el('g', { class: 'label', transform: 'translate(0 34)' }, el('rect', { x: -lw / 2, y: -10, width: lw, height: 20, rx: 10 }), el('text', { y: 4 }, label)));
      const b = badges[id];
      if (b) g.appendChild(el('g', { class: 'badge ' + b.cls, transform: `translate(${lw / 2 - 2} 24)` }, el('title', null, b.title), el('circle', { r: 9 }), el('text', { y: 4 }, String(b.n))));
      const go = () => onPick(id);
      g.addEventListener('click', go);
      g.addEventListener('keydown', (e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); go(); } });
      svg.appendChild(g);
    });
    return svg;
  };
})(window.PP);
