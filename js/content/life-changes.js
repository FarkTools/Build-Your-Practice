/* Life changes: why an existing client calls you again, starting a follow-up journey.
 *
 *  { id, title,                      short, e.g. 'A baby on the way'
 *    segs: ['family', ...],          optional: which client segments this can happen to (omit = anyone)
 *    call: '...',                    the message they leave you (use {c} for their name)
 *    need: '...',                    the hidden detail that decides the right destination (a fact label)
 *    line: '"..."',                  a subtle line in conversation that hints at the need
 *    reveal: '"..."',                what they say when you ask about worries with enough Curiosity
 *    guarded: '...',                 the guarded version when you don't have it yet
 *    goal: '"..."',                  their answer to "what would make this go well?"
 *    right: 'destinationId',         the destination that fits once you know the need
 *    ok: ['destinationId', ...],     acceptable alternatives
 *    help: '...'                     "how else can you help": a line shown at the end of a good lap
 *  }
 *  Destinations: see PP.content.destinations in world.js.
 */
(function (PP) {
  PP.content.lifeChanges = [
    { id: 'lc_baby', title: 'A baby on the way', segs: ['family', 'early', 'changes'],
      call: '{c} calls, half laughing, half panicking: "So... we\'re having a baby. Does anything need to change?"',
      need: 'Worried about what happens to the family if something happens to them',
      line: '"I keep thinking, what if it\'s just them, without me? Sorry. That got dark."',
      reveal: '"Honestly? The plan was about me. Now there\'s a whole person depending on me. What happens to them if I\'m not here?"',
      guarded: '"It\'s all good! Just... a lot." {c} laughs a little too quickly.',
      goal: '"Knowing the baby\'s okay. No matter what."',
      right: 'joint_plan', ok: ['bridge_plan', 'simple_start'],
      help: '{c} mentions their sister is expecting too. "Can I give her your number?"' },
    { id: 'lc_layoff', title: 'Lost their job',
      call: '{c} leaves a short voicemail: "I got laid off on Friday. Can we talk? I don\'t know what to touch and what not to touch."',
      need: 'Has a severance deadline in three weeks they haven\'t mentioned',
      line: '"HR gave me a folder. I haven\'t opened it. There\'s a date on the front."',
      reveal: '"Okay. The folder. There\'s a severance offer and I have to decide by the 30th. I\'ve been avoiding it."',
      guarded: '"I\'m fine. I\'ve got savings. Mostly." You sense there is a deadline somewhere.',
      goal: '"Not making it worse while I figure out what\'s next."',
      right: 'steady_ground', ok: ['bridge_plan', 'not_now'],
      help: 'Later, {c} sends a former coworker your way: "She got laid off too. You were calm when I wasn\'t."' }
  ];
})(window.PP);
