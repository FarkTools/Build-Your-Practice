# Port Prospect

A light adventure game about learning to navigate client work. A new agent starts at Port Prospect with limited skills and incomplete information, a client shows up, and there is no dotted route.

This repo is a **playable concept prototype**: a vertical slice with a working example of every core element from the concept doc, plus an Element Lab where each mechanic can be tried on its own.

**Play:** open `index.html` in a browser, or host it on GitHub Pages (below).

## How it plays

**Your career is the reason to keep going.** You start with savings, and every day costs living expenses. Clients you guide well join your book and keep paying a little every day. Your level is book income compared with costs: **Unemployed** (savings gone, career over), **Survivable**, **Sustainable**, **Profitable** (the goal).

**Each client is a journey, Oregon Trail style.** You load the wagon at Port Prospect and travel trails measured in days. A numbered "You may:" menu always shows the next move: continue on the trail, check in with the client, talk to people, rest, look at the map, change pace, use your pack. Forks are story choices ("North to the Lighthouse, 3 days, or the Loop of Endless Data Entry, 2 days?").

**Along the trail:** travelers and opportunities (Slick Rick, a lost intern, a peddler with a Plan Generator 3000, Steve), campfire conversations where the client opens up, cut scenes at landmarks, and two arcade mini-games.

**Repercussions:** shortcuts become hidden risk debt that catches up days later. Quick closes pay more now but may cancel on a later journey and get clawed back, delivered by mail rider. Good fits keep paying and refer friends. A respectful "not yet" may come back.

## What's in it

| Element | Where it lives |
|---|---|
| Career: savings, payouts, levels, clawbacks, referrals | `js/content/career.js` |
| Map: 16 landmarks from the concept art, trails in days, side trails, Secret Shortcut | `js/content/world.js`, `js/ui/map.js` |
| Trail scene and cut scenes (canvas) | `js/ui/trailscene.js` |
| Journey loop: days, pace, menu, forks, check-ins, finale | `js/ui/trail.js` |
| 40+ events, multi-step conversations, risk-debt checks | `js/content/events.js` |
| Clients, hidden facts, check-in answers | `js/content/clients.js` |
| Port: people, practice quests, contacts, pack items | `js/content/port.js` |
| Mini-games: Document Dash, The Conversation, Fraud or Friend?, Inbox Rapids, the Snake Pit | `js/minigames/` |
| Element Lab: every mechanic in isolation | `js/ui/lab.js` |

## How it's built

Plain HTML, CSS and JavaScript: no framework, no build step, no server. Scripts load in order from `index.html` and share one global, `PP`.

```
index.html            app shell + roadmap page
css/style.css         all styling
js/core.js            state, effects, risk debt
js/content/*.js       the game's data: edit these to change the game
js/minigames/*.js     one file per mini-game, same interface
js/ui/*.js            map, trail scene, journey loop, game shell, Element Lab
tools/bundle.py       optional: build a single-file version into dist/
```

## Adding content

- **Event:** add an object to `js/content/events.js`. The header comment documents every field.
- **Shortcut that bites later:** give a choice `debt: { tag, sev }` and describe the tag in `PP.content.debts` in `world.js`.
- **Client:** copy one in `clients.js`, then change the facts, the conversation script and the `fit` / `unlocks` maps.
- **Mini-game:** copy a file in `js/minigames/`. It gets `start(root, ctx, done)` and calls `done({ score, max, eff, lines })`.

## Hosting on GitHub Pages

1. Create a repository and push this folder to `main`.
2. In the repo, go to **Settings → Pages**. Under Source choose **Deploy from a branch**, then `main` and `/ (root)`.
3. After a minute it's live at `https://<your-username>.github.io/<repo-name>/`.

Deep links: `#play`, `#lab`, `#roadmap`.

## Playtesting

`.github/ISSUE_TEMPLATE/playtest-feedback.md` turns the seven questions from the concept doc into a feedback form. The key signal is whether people start a second run without being asked.

---

Working prototype for concept feedback. It is not a specification or formal training content.
