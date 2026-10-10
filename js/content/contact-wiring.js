/* Wires each contact's ready-made `assist` choice into the events where it fits.
 * Landmark ids get it on every event there; 'travel' contacts appear on a spread of encounters. */
(function (PP) {
  const contacts = PP.content.contacts || {};
  const travel = PP.content.events.filter((e) => e.at.includes('travel'));
  Object.entries(contacts).forEach(([id, ct], n) => {
    const a = ct.assist;
    if (!a) return;
    const choice = (e) => ({ label: a.label, kind: 'help', contact: id, show: (s) => PP.contactReady(s, id), eff: a.eff, result: a.result });
    (a.at || []).forEach((place) => {
      const targets = place === 'travel' ? travel.filter((e, i) => (i + n) % 4 === 0) : PP.content.events.filter((e) => e.at.includes(place));
      targets.forEach((e) => { if (!e.choices.some((c) => c.contact === id)) e.choices.push(choice(e)); });
    });
  });
})(window.PP);
