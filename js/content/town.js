/* Port Prospect, the town. Each place on the town map gathers the things you can do
 * there and the people you can find there. The UI (js/ui/town.js + game.js) reads this.
 *
 *  places[id] = { name, short, blurb, x, y, activities: [prospecting ids], npcs: [npc ids], sections: [ui section ids] }
 *  school.courses = [{ id, name, blurb, days, cost, skill?, needs?, grants? }]
 *     grants: { system: id } | { password: true } | { perk: id }
 *  perks = { id: { name, blurb } }  (read by the journey start / trail code)
 *  arrivals = people stepping off the boats at the docks
 */
(function (PP) {
  PP.content.town = {
    places: {
      docks: {
        name: 'The Docks', short: 'Docks', x: 196, y: 330,
        blurb: 'Where the trail begins, and where the boats come in. New faces step off every day, and sailors carry news from out on the trail.',
        activities: [], npcs: ['marge', 'gus'], sections: ['boats', 'pipeline']
      },
      square: {
        name: 'Market Square', short: 'Market', x: 178, y: 214,
        blurb: 'Stalls, the coffee cart, the bank on the corner, and a strip mall that has seen better decades.',
        activities: ['market', 'stripmall'], npcs: ['bernie', 'ray', 'ellen'], sections: []
      },
      chamber: {
        name: 'Chamber Hall', short: 'Chamber', x: 78, y: 150,
        blurb: 'Mixers, lunch & learns, ribbon-cuttings and a lot of folding chairs.',
        activities: ['mixer', 'seminar'], npcs: ['bev', 'priya', 'lance'], sections: []
      },
      office: {
        name: 'Your desk', short: 'Your desk', x: 282, y: 140,
        blurb: 'Phone, laptop, calendar. Where the day-to-day work happens.',
        activities: ['warm', 'callathon', 'neighbors'], npcs: ['olu', 'fatima', 'kenji', 'harold'], sections: ['plan', 'inbox', 'oncall']
      },
      street: {
        name: 'Harbor Street', short: 'Harbor St', x: 300, y: 236,
        blurb: 'Offices to rent, agents to partner with, recruits to train, and systems to build.',
        activities: [], npcs: ['tess', 'sloane'], sections: ['workspace', 'partner', 'recruits', 'systems']
      },
      homes: {
        name: 'Maple Row', short: 'Clients', x: 292, y: 52,
        blurb: 'Where your clients live. Life keeps happening to them whether you visit or not.',
        activities: ['referrals', 'appreciation'], npcs: [], sections: ['book']
      },
      school: {
        name: 'Harbor Night School', short: 'School', x: 170, y: 62,
        blurb: 'Evening classes for working agents. Spend time and money to learn skills, and earn certificates that open shortcuts on the trail.',
        activities: [], npcs: ['dev'], sections: ['courses']
      },
      library: {
        name: 'The Library', short: 'Library', x: 56, y: 262,
        blurb: 'Free workshops in Room B. Teach, don\'t sell.',
        activities: ['library'], npcs: ['connie'], sections: []
      },
      field: {
        name: 'The Ball Field', short: 'Ball field', x: 58, y: 62,
        blurb: 'Little League on Saturdays, the school fair in spring. Families, and every local business with a banner.',
        activities: ['littleleague', 'fair'], npcs: [], sections: []
      }
    },

    /* Old tab names still used around the code, mapped to a place. */
    tabPlace: { prospect: 'office', pipeline: 'docks', book: 'homes', build: 'street', people: 'office' },

    school: {
      courses: [
        { id: 'c_comm', name: 'Reading the Room', skill: 'communication', days: 2, cost: 150, blurb: 'Saying the hard thing simply. Lots of role-play with strangers. Nobody enjoys it; everybody improves.' },
        { id: 'c_curious', name: 'Asking Better Questions', skill: 'curiosity', days: 2, cost: 150, blurb: 'Open questions, follow-ups, and the art of the comfortable silence.' },
        { id: 'c_prep', name: 'Case Prep Bootcamp', skill: 'preparation', days: 2, cost: 200, blurb: 'Agendas, checklists and the habit of reading the file before the meeting. More time in every mini-game.' },
        { id: 'c_judgment', name: 'Ethics and Judgment', skill: 'judgment', days: 2, cost: 150, blurb: 'Case studies about shortcuts that went wrong. You start seeing the trade-off hidden in every choice.' },
        { id: 'c_nav', name: 'Wayfinding for Advisors', skill: 'navigation', days: 2, cost: 200, blurb: 'Reading the map before you need it. Named places show up sooner on the trail.' },
        { id: 'c_resource', name: 'Doing More With Less', skill: 'resourcefulness', days: 1, cost: 100, blurb: 'Who to call, what to borrow, and how to make one contact go twice as far.' },
        { id: 'cert_specialist', name: 'Specialist Liaison Certificate', days: 3, cost: 700, needs: { preparation: 1 }, grants: { system: 'specialist' }, blurb: 'Learn how the specialists at the Summit actually work. Summit trails take a day less, without needing its Mark.' },
        { id: 'cert_portal', name: 'Portal Pro Certificate', days: 2, cost: 500, needs: { resourcefulness: 1 }, grants: { system: 'tech' }, blurb: 'Logins, e-signatures and two-factor, mastered. New options in the Login Isles.' },
        { id: 'cert_crm', name: 'Client Database Workshop', days: 2, cost: 800, needs: { preparation: 1 }, grants: { system: 'crm' }, blurb: 'Set up a client database properly. The Loop of Endless Data Entry takes a day less.' },
        { id: 'cert_routes', name: 'Old Harbor Routes (Steve\'s class)', days: 2, cost: 400, needs: { navigation: 1 }, grants: { password: true }, blurb: 'Steve teaches one class a year, mostly about fishing. Near the end he mentions the password to the Secret Shortcut.' },
        { id: 'cert_stamina', name: 'Sustainable Pace Seminar', days: 1, cost: 250, grants: { perk: 'stamina' }, blurb: 'Sleep, boundaries and lunch breaks. Start every journey with +2 Energy.' },
        { id: 'cert_mapping', name: 'Field Notes Practicum', days: 2, cost: 350, needs: { curiosity: 1 }, grants: { perk: 'scout' }, blurb: 'Keep a proper field journal. Every journey starts with +1 Insight, and nearby places are named on the map.' }
      ]
    },

    perks: {
      stamina: { name: 'Sustainable pace', blurb: '+2 Energy at the start of every journey.' },
      scout: { name: 'Field notes', blurb: '+1 Insight at the start of every journey.' }
    },

    /* The docks. People stepping off boats are new to town: they need everything set up,
     * and nobody has met them yet. Sailors in from the trail bring news of what lies ahead. */
    arrivals: [
      { id: 'a_family', arch: 'taylor', fig: 'family', who: 'A young family with a moving van\'s worth of boxes', tell: 'The toddler is asleep on a lamp.', kind: 'resident', bias: { family: 3 }, warm: 'You carry boxes up the gangway for an hour. They ask what you do, then ask for your number.', cold: 'You hand them a card. They put it in a box labelled "MISC".' },
      { id: 'a_retiree', arch: 'walter', fig: 'retiree', who: 'A couple who just sold their house inland', tell: 'Matching sun hats. One is holding a list titled "Retirement: what now?"', kind: 'resident', bias: { retiree: 3 }, warm: 'You walk them to the good bakery and listen to the list. It is long. They want help with it.', cold: 'They take your card politely. "We have a lot of lists right now."' },
      { id: 'a_owner', arch: 'rosa', fig: 'owner', who: 'A woman opening a bakery on Harbor Street', tell: 'Carrying a mixer bigger than her suitcase.', kind: 'business', bias: { owner: 3 }, warm: 'You point her to the Chamber, the permit office and the cheapest flour. She owes you one, she says.', cold: 'She is too busy to talk. "Come by when we open."' },
      { id: 'a_grad', arch: 'mateo', fig: 'phone', who: 'A new grad starting a job at the hospital', tell: 'Reading the employee benefits booklet on the gangway, frowning.', kind: 'resident', bias: { early: 3 }, warm: 'You help decode the benefits booklet over coffee. "Wait, they match what?" A new prospect.', cold: 'They nod at your card and go back to the booklet.' },
      { id: 'a_widow', arch: 'evelyn', fig: 'retiree', who: 'A woman moving closer to her daughter', tell: 'Holding a folder of her late husband\'s papers very carefully.', kind: 'resident', bias: { changes: 3 }, warm: 'You don\'t pitch. You help her find a taxi and leave your number for "whenever you\'re ready." She calls a week later.', cold: 'She takes your card, but you can tell today is not the day.' },
      { id: 'a_freelancer', arch: 'zoe', fig: 'phone', who: 'A freelance designer who works from anywhere', tell: 'Laptop open before the boat has docked.', kind: 'resident', bias: { early: 2, owner: 1 }, warm: 'You talk about lumpy income while they look for Wi-Fi. They want to talk properly next week.', cold: 'They connect with you online without looking up.' },
      { id: 'a_caregiver', arch: 'lorraine', fig: 'family', who: 'Someone moving back to look after their dad', tell: 'Two suitcases, one of them full of pill organizers.', kind: 'resident', bias: { caregiver: 3 }, warm: 'You walk with them to the pharmacy and mention the library has a caregiver group. They ask if you do "this kind of thing too."', cold: 'They thank you. They have a lot on their mind.' },
      { id: 'a_heir', arch: 'ingrid', fig: 'guest', who: 'Someone here to settle a relative\'s estate', tell: 'Looks at the town like they have never seen it, which they haven\'t.', kind: 'resident', bias: { windfall: 3 }, warm: 'You recommend the lawyer everyone trusts and say nothing about money. That is exactly why they ask you about it later.', cold: 'They take your card. You suspect they are getting a lot of cards.' },
      { id: 'a_dentist', arch: 'morgan', fig: 'numbers', who: 'A dentist taking over the practice on the square', tell: 'Spreadsheet of the practice\'s finances, printed, laminated.', kind: 'business', bias: { owner: 2, numbers: 2 }, warm: 'You admire the spreadsheet. Sincerely. A friendship is born.', cold: 'They hand you THEIR card. You are now a patient.' },
      { id: 'a_tourist', fig: 'jogger', who: 'A tourist on a day trip', tell: 'Camera, map, total joy.', kind: 'traveler', warm: 'You give great directions to the lighthouse. Lovely person. Lives four states away.', cold: 'They take your card as a souvenir.' },
      { id: 'a_cousin', fig: 'guest', who: 'Somebody\'s visiting cousin', tell: 'Here for a wedding. Already sunburnt.', kind: 'traveler', warm: 'You chat about the wedding. Nice, but they leave Sunday.', cold: 'They use your card to fix a wobbly table.' },
      { id: 'a_rival', fig: 'rival', who: 'A well-dressed agent from the city', tell: 'Already handing out glossy folders on the pier.', kind: 'rival', warm: 'You introduce yourself. He says "Ah, the local." By lunch he has met everyone you were hoping to meet.', cold: 'You watch him work the pier. You learn something, mostly about hair product.' },
      { id: 'a_sailor', fig: 'vendor', who: 'A sailor in from the far side of the map', tell: 'Weathered, cheerful, and full of stories about the trail.', kind: 'sailor', warm: 'Over a coffee she sketches the trail she came down. Two places on your map get names.', cold: 'She tells you one useful thing about the weather out there.' },
      { id: 'a_surveyor', fig: 'numbers', who: 'A surveyor back from mapping the far trails', tell: 'Rolled charts under both arms.', kind: 'sailor', warm: 'He lets you copy a corner of his chart. Your map gets clearer.', cold: 'He nods and hurries off with his charts.' },
      { id: 'a_teacher', arch: 'maxine', fig: 'couple', who: 'A teacher starting at the high school', tell: 'Pension paperwork sticking out of a tote bag.', kind: 'resident', bias: { retiree: 2, family: 1 }, warm: 'You help carry a box of textbooks. "Someone said my pension covers everything. Does it?" A prospect.', cold: 'They\'ll "look into it." Maybe they will.' },
      { id: 'a_couple', arch: 'taylor', fig: 'couple', who: 'Newlyweds who just bought the blue house', tell: 'Still arguing, lovingly, about who carries what.', kind: 'resident', bias: { family: 2, early: 1 }, warm: 'You settle the argument by carrying the heaviest box yourself. They want to "get organized" together.', cold: 'They are too busy arguing to take a card.' }
    ]
  };
})(window.PP);
