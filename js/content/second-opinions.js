/* Second opinions: someone a rival agent signed (and then forgot) asks you to look at their
 * paperwork. You review it and tell them the truth. The lesson is the real one: winning a
 * rival's client comes from serving them better, not from talking them into switching.
 * Sometimes the honest answer is "keep what you have", and that wins the most trust.
 *
 *   { id, arch, rival, ask, verdict: 'keep' | 'fix' | 'replace', lesson,
 *     papers: [{ icon, label, note, flag: 'ok' | 'gap' | 'wrong' }] }
 *
 *   keep     everything fits; replacing it would cost them fees and protection they already have
 *   fix      the plan is sound apart from one gap
 *   replace  the plan was built for a life they no longer live
 */
(function (PP) {
  PP.content.secondOpinions = [
    /* ---- Keep what you have ---- */
    { id: 'so_golf', arch: 'walter', rival: 'Velocity Wealth', verdict: 'keep',
      ask: '"Velocity set this up six years ago. My golf buddy says I should roll it all over to his guy. Should I?"',
      lesson: 'Nothing here is broken. Moving it would cost fees and buy nothing.',
      papers: [
        { icon: '🏦', label: 'Retirement savings', note: 'Low-cost funds, on track for his retirement date.', flag: 'ok' },
        { icon: '🛡️', label: 'Life coverage', note: 'Term policy that ends the year the mortgage is paid off.', flag: 'ok' },
        { icon: '🏥', label: 'Health cover before Medicare', note: 'Already priced into the retirement budget.', flag: 'ok' },
        { icon: '📄', label: 'Beneficiaries', note: 'His wife on everything, updated last year.', flag: 'ok' }
      ] },
    { id: 'so_teacher', arch: 'maxine', rival: 'Summit Peak Advisors', verdict: 'keep',
      ask: '"Someone in the staff room said my old agent oversold me. Did he? He never calls, so I can\'t ask."',
      lesson: 'He never calls, but he did good work. A quiet agent is not the same as a bad plan.',
      papers: [
        { icon: '📚', label: 'Pension', note: 'Full credit for 22 years of teaching.', flag: 'ok' },
        { icon: '💵', label: 'Retirement savings', note: 'Small, steady contributions with low fees.', flag: 'ok' },
        { icon: '🩹', label: 'Disability cover', note: 'Through the union, replaces most of her pay.', flag: 'ok' },
        { icon: '📄', label: 'Will', note: 'Updated after her divorce, names her son.', flag: 'ok' }
      ] },
    { id: 'so_tab11', arch: 'morgan', rival: 'Bayside Money Group', verdict: 'keep',
      ask: '"Tab 11 is my current setup. Bayside did it. I would like a second opinion on tab 11. I have printed tab 11."',
      lesson: 'A careful plan from a careful client. Saying so out loud is worth more than any sale.',
      papers: [
        { icon: '🧾', label: 'Budget', note: 'Reviewed every month. Of course it is.', flag: 'ok' },
        { icon: '🛟', label: 'Emergency fund', note: 'Six months of costs, kept somewhere boring.', flag: 'ok' },
        { icon: '🛡️', label: 'Life coverage', note: 'Covers the mortgage and both kids through college.', flag: 'ok' },
        { icon: '🩹', label: 'Disability cover', note: 'Protects the paycheck the whole plan depends on.', flag: 'ok' }
      ] },

    /* ---- Keep it, fix one gap ---- */
    { id: 'so_baby', arch: 'taylor', rival: 'Bayside Money Group', verdict: 'fix',
      ask: '"Bayside set us up when we got married. Now there\'s a baby. Do we have to start over?"',
      lesson: 'The plan is sound. It just needs to catch up with the baby: cover for the partner too.',
      papers: [
        { icon: '🛡️', label: 'Life coverage', note: 'Covers Taylor only. The partner has none.', flag: 'gap' },
        { icon: '🏦', label: 'Retirement savings', note: 'Both contributing enough to get the full match.', flag: 'ok' },
        { icon: '🛟', label: 'Emergency fund', note: 'Three months of costs. Fine for now.', flag: 'ok' },
        { icon: '📄', label: 'Beneficiaries', note: 'Each other, on everything.', flag: 'ok' }
      ] },
    { id: 'so_shop', arch: 'rosa', rival: 'Lighthouse Financial', verdict: 'fix',
      ask: '"Lighthouse did the shop\'s paperwork years ago. Dee keeps asking what happens if one of us leaves. I don\'t know."',
      lesson: 'Good bones. The one missing piece is an agreement for what happens if a partner leaves.',
      papers: [
        { icon: '🏪', label: 'Business insurance', note: 'Building, equipment, liability. All current.', flag: 'ok' },
        { icon: '🏦', label: 'Retirement savings', note: 'A small-business plan, funded every year.', flag: 'ok' },
        { icon: '🤝', label: 'Partner agreement', note: 'None. If Dee leaves or dies, nobody knows what happens to the shop.', flag: 'gap' },
        { icon: '🛡️', label: 'Personal life cover', note: 'Enough for her own family.', flag: 'ok' }
      ] },
    { id: 'so_grad', arch: 'mateo', rival: 'Velocity Wealth', verdict: 'fix',
      ask: '"A guy from Velocity signed me up for stuff at orientation. Then he vanished. Did I mess it up?"',
      lesson: 'Mostly right. One form change gets the full employer match: free money he was leaving behind.',
      papers: [
        { icon: '🏦', label: 'Workplace retirement plan', note: 'Enrolled, but saving 1%. His employer matches up to 5%.', flag: 'gap' },
        { icon: '🏥', label: 'Health plan', note: 'A sensible pick for someone who rarely sees a doctor.', flag: 'ok' },
        { icon: '🎓', label: 'Student loans', note: 'On a payment plan he can afford.', flag: 'ok' },
        { icon: '🏠', label: 'Renters insurance', note: 'Cheap, and it covers the laptop.', flag: 'ok' }
      ] },

    /* ---- Start over ---- */
    { id: 'so_widow', arch: 'evelyn', rival: 'Lighthouse Financial', verdict: 'replace',
      ask: '"Harold\'s agent retired years ago. Nobody has looked at any of this since the funeral."',
      lesson: 'This plan was built for two people. Her life has changed, so the plan has to change with it.',
      papers: [
        { icon: '📄', label: 'Beneficiaries', note: 'Her accounts still name Harold.', flag: 'wrong' },
        { icon: '💵', label: 'Income plan', note: 'Built around two people\'s costs and two pension checks.', flag: 'wrong' },
        { icon: '📈', label: 'Investments', note: 'Aggressive picks Harold made at 50. She is 74.', flag: 'wrong' },
        { icon: '🏠', label: 'Home insurance', note: 'Current and sensible.', flag: 'ok' }
      ] },
    { id: 'so_carer', arch: 'lorraine', rival: 'Summit Peak Advisors', verdict: 'replace',
      ask: '"Summit Peak made my plan before Dad got sick. I cut my hours. I don\'t think any of it fits anymore."',
      lesson: 'She is right: it fits the life she had before. Starting over is the honest answer here.',
      papers: [
        { icon: '🧾', label: 'Budget', note: 'Assumes full-time pay. She works part-time now.', flag: 'wrong' },
        { icon: '🏦', label: 'Retirement savings', note: 'Stopped when her hours changed. Nobody noticed.', flag: 'wrong' },
        { icon: '✍️', label: 'Paperwork for Dad', note: 'Nobody is allowed to sign anything for him.', flag: 'wrong' },
        { icon: '🚗', label: 'Car insurance', note: 'Fine.', flag: 'ok' }
      ] },
    { id: 'so_freelance', arch: 'zoe', rival: 'Velocity Wealth', verdict: 'replace',
      ask: '"Velocity gave me the same plan they give people with salaries. I don\'t have a salary. I have vibes."',
      lesson: 'A salaried plan for a freelancer: it breaks every lean month. It needs rebuilding around lumpy income.',
      papers: [
        { icon: '🔁', label: 'Monthly investing', note: 'A fixed amount every month, whatever she earned. Three overdrafts.', flag: 'wrong' },
        { icon: '🧾', label: 'Taxes', note: 'Nothing set aside for the quarterly tax bill.', flag: 'wrong' },
        { icon: '🏦', label: 'Retirement plan', note: 'An employer-style plan she cannot pay into as a freelancer.', flag: 'wrong' },
        { icon: '🏥', label: 'Health plan', note: 'A reasonable marketplace plan.', flag: 'ok' }
      ] }
  ];

  /* What each answer leads to. Telling the truth is what pays off over time. */
  PP.content.secondOpinionOutcome = function (verdict, choice) {
    if (choice === verdict) return {
      keep: { right: true, now: 0, perDay: 15, sat: 9, status: 'steady', referral: true, text: (n) => `You tell ${n} to keep what they have. They look relieved, then surprised: "Nobody has ever told me not to buy something." They ask you to do their reviews from now on, and they are sending a friend your way.` },
      fix: { right: true, now: 600, perDay: 25, sat: 8, status: 'steady', text: (n) => `You keep everything that works and fix the one gap. ${n} likes that you didn't tear it all up. They move their business to you.` },
      replace: { right: true, now: 1500, perDay: 40, sat: 8, status: 'life', text: (n) => `You walk ${n} through why the old plan no longer fits, and build a new one around the life they have now. A client for life.` }
    }[verdict];
    if (choice === 'replace') return { right: false, now: 2500, perDay: 0, sat: 4, status: 'at-risk', replaced: true, text: (n) => `${n} signs. It is a big commission. But the old plan ${verdict === 'keep' ? 'was fine' : 'only needed one fix'}, and replacing a plan that works costs the client fees and protection they already had. Replacements get reviewed. ${n} may not stay.` };
    if (choice === 'fix') return verdict === 'keep'
      ? { right: false, now: 300, perDay: 0, sat: 5, status: 'at-risk', text: (n) => `You find something small to add. ${n} buys it, but nothing needed fixing, and they can tell.` }
      : { right: false, now: 600, perDay: 15, sat: 6, status: 'steady', text: (n) => `You patch the worst of it. Better than nothing, but the plan still fits a life ${n} no longer lives.` };
    return { right: false, now: 0, perDay: 0, sat: 0, status: null, text: (n) => `${n} thanks you and goes home reassured. They shouldn't be.` };
  };
})(window.PP);
