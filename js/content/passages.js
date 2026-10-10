/* Hidden passages: better ways through each obstacle, opened by what you have built up.
 *
 * Every obstacle can still be faced head on (its normal event) or skipped by going around.
 * A passage is the third way: it gets you through the obstacle well, often turns it to
 * your advantage, and makes the next trail a day shorter. Locked passages are shown as
 * teasers ("needs Curiosity 2") so players know what to work toward.
 *
 *  PP.content.passages[nodeId] = [{
 *    id, name,                       short evocative name, e.g. 'The boardwalk'
 *    key: one of                      what opens it
 *      { skill: 'curiosity', level: 2 }
 *      { contact: 'whisperer' }       on call and not yet used this journey (uses it up)
 *      { system: 'planning' }         built at Harbor Street (or earned at the school)
 *      { item: 'notebook' }           in your pack, unused (uses it up)
 *      { trust: 7 } | { insight: 6 }  this journey's resources
 *      { fact: 'key' | 'stakeholder' | 'any' } or { facts: 3 }   what you know about this client
 *      { perk: 'scout' }              a school certificate perk
 *      { password: true }             Steve's back channels (from Steve, or his class at the school)
 *      { visits: 2 }                  you have been to this landmark on 2+ earlier journeys
 *      { followup: true }             only on a follow-up journey with an existing client
 *      { any: [key, key, ...] }       any one of these
 *    text: string | (s) => string,    what happens (use PP.clientName(s) for the client)
 *    eff:  effect object | (s) => effect   (see PP.apply in core.js)
 *  }]
 *
 * The engine (PP.passageOpen / PP.passageNeed) lives at the bottom of this file.
 */
(function (PP) {
  const C = (s) => PP.clientName(s);
  PP.content.passages = {
    swamp: [
      { id: 'swamp_boardwalk', name: 'The boardwalk', key: { system: 'planning' },
        text: (s) => `Your planning software lays a clean boardwalk across the cells. ${C(s)} watches the numbers line up and, for once, relaxes.`, eff: { momentum: 2, insight: 1 } },
      { id: 'swamp_their_model', name: 'Their own spreadsheet', key: { fact: 'any' },
        text: (s) => `Instead of fighting ${C(s)}'s spreadsheet, you ask them to walk you through it. Tab 7 is where the real worry lives.`, eff: (s) => ({ insight: 2, trust: 1, fact: s.client.spreadsheetFact }) },
      { id: 'swamp_local', name: 'Your old path through the reeds', key: { visits: 2 },
        text: 'You have crossed this swamp before. You know which cells hold weight and which are just formatting.', eff: { momentum: 1, energy: 1 } }
    ]
  };

  /* ---------- engine ---------- */
  const skillLabel = (id) => (PP.SKILLS.find((x) => x.id === id) || { label: id }).label;
  function open(s, k) {
    const c = s.career || {};
    if (k.any) return k.any.some((x) => open(s, x));
    if (k.skill) return PP.skill(s, k.skill) >= Math.max(1, k.level - (c.perks && c.perks.pathfinder ? 1 : 0));
    if (k.contact) return (s.contacts || []).includes(k.contact) && PP.contactReady(s, k.contact);
    if (k.system) return PP.career.hasSystem(c, k.system);
    if (k.item) return PP.hasItem(s, k.item);
    if (k.trust) return s.res.trust >= k.trust;
    if (k.insight) return s.res.insight >= k.insight;
    if (k.facts) return Object.keys(s.facts).length >= k.facts;
    if (k.fact) {
      const cl = s.client || {};
      if (k.fact === 'any') return Object.keys(s.facts).length > 0;
      if (k.fact === 'key') return PP.knows(s, cl.keyFact);
      if (k.fact === 'stakeholder') return PP.knows(s, cl.stakeholderFact);
      return PP.knows(s, k.fact);
    }
    if (k.perk) return !!(c.perks && c.perks[k.perk]);
    if (k.password) return !!s.password;
    if (k.visits) return ((c.visits || {})[s.map.current] || 0) >= k.visits;
    if (k.followup) return !!s.followUp;
    return false;
  }
  function need(k) {
    if (k.any) return k.any.map(need).join(' or ');
    if (k.skill) return `${skillLabel(k.skill)} ${k.level}`;
    if (k.contact) return `${(PP.content.contacts[k.contact] || {}).who || k.contact} on call`;
    if (k.system) return `the ${((PP.content.practice.systems[k.system]) || {}).name || k.system}`;
    if (k.item) return `a ${((PP.content.items[k.item]) || {}).name || k.item} in your pack`;
    if (k.trust) return `Trust ${k.trust}`;
    if (k.insight) return `Insight ${k.insight}`;
    if (k.facts) return `${k.facts} facts about the client`;
    if (k.fact) return k.fact === 'any' ? 'something you have learned about the client' : k.fact === 'key' ? 'the thing that changes everything for this client' : k.fact === 'stakeholder' ? 'knowing who else has a say' : 'a particular fact about the client';
    if (k.perk) return `the ${((PP.content.town && PP.content.town.perks[k.perk]) || {}).name || k.perk} certificate`;
    if (k.password) return 'one of Steve\'s back channels';
    if (k.visits) return `${k.visits} earlier trips through here`;
    if (k.followup) return 'an existing client';
    return '?';
  }
  PP.passageOpen = (s, p) => open(s, p.key);
  PP.passageNeed = (p) => p.need || need(p.key);
  PP.passagesAt = (id) => (PP.content.passages && PP.content.passages[id]) || [];
  /* Spend what the key consumes (a contact's help or a pack item). */
  PP.passageSpend = (s, k) => {
    if (k.any) { const hit = k.any.find((x) => open(s, x)); if (hit) PP.passageSpend(s, hit); return; }
    if (k.contact) PP.useContact(s, k.contact);
    if (k.item) PP.useItem(s, k.item);
  };
})(window.PP);
