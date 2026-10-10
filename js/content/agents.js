/* Agent types you can start as. Each trades off money, skills and natural market.
 *   savings:  starting cash
 *   living:   personal living costs per day
 *   market:   size of your natural market (warm contacts you can call)
 *   skills:   starting skill levels
 *   perk:     one special rule (checked in code by id)
 */
(function (PP) {
  PP.content.agentTypes = [
    {
      id: 'changer', name: 'Career Changer', tagline: 'Left a corporate job to do something that matters.',
      savings: 9000, living: 130, market: 9, skills: { judgment: 1 },
      perk: 'Former colleagues', perkText: 'Warm calls always turn up two prospects, and they start with +1 Trust.',
      cons: 'Used to a corporate salary. Living costs are high.'
    },
    {
      id: 'grad', name: 'Recent Grad', tagline: 'Hungry, broke, and very good with a phone.',
      savings: 1800, living: 60, market: 4, skills: { curiosity: 1, navigation: 1 },
      perk: 'Fast learner', perkText: 'Learning from people at the port does not use up a day.',
      cons: 'Tiny cushion and a small network. Prospecting is everything.'
    },
    {
      id: 'connector', name: 'Community Connector', tagline: 'Coaches Little League. Knows every barista by name.',
      savings: 3500, living: 90, market: 16, skills: { communication: 1, resourcefulness: 1 },
      perk: 'Everyone knows you', perkText: 'Prospects you meet at events start warm, and referrals come easier.',
      cons: 'Modest savings. Knowing people is not the same as knowing the work.'
    },
    {
      id: 'insider', name: 'Industry Insider', tagline: 'Fifteen years as an accountant. Loves a good spreadsheet.',
      savings: 5500, living: 100, market: 5, skills: { preparation: 1, judgment: 1, curiosity: 1 },
      perk: 'Numbers person', perkText: 'Starts with the Swamp Mark, so Planning Software is available from day one. Spreadsheet types seek you out.',
      cons: 'Small network, and people skills are a work in progress.'
    }
  ];
})(window.PP);
