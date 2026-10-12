# Build Your Practice

A light adventure game about building a client practice. You start as a new agent at **Port Prospect**, the home area, with some savings and a lot to learn. Find prospects, guide them through wild terrain to a plan that actually suits them, look after the clients you have, and grow a practice that pays the bills before the money runs out.

This repo is a **playable concept prototype**. Players get the game only; the Element Lab and roadmap live on a separate, unlinked admin page.

**Play:** open `index.html` in a browser, or host it on GitHub Pages (below).

## How it plays

**Pick your agent.** Career Changer, Recent Grad, Community Connector or Industry Insider. Each trades savings, living costs, skills and the size of your natural market.

**Port Prospect is home base.** Every activity takes a day, and every day costs money:
- **Prospecting:** warm calls to your natural market, a Call-a-thon, the Chamber of Commerce mixer, a Farmers Market tent, a lunch & learn, or asking happy clients for referrals. Three of these are mini-games.
- **Pipeline:** prospects wait for you, go cold, and can be taken by rivals while you are away. Nurture them to buy time.
- **Your clients:** satisfaction slips every day. Service days keep them happy; unhappy clients cancel.
- **Build your practice:** a shared desk or your own office, partnering with another agent as equals, recruiting and training agents for override income, and systems earned on the trail.

**Make it yours, then share it.** Enter your name and practice name when you start; clients call you by name and it goes on your desk sign. Every journey ends with a share card (an image) and a share box that works on phones and computers. The link you share is a challenge: your friend starts as the same agent with the same first prospect and sees your score to beat. Nothing leaves the player's browser; the challenge lives in the link.

**The trail.** Choose a prospect and hike with them across the map, day by day, to Clients for Life. A numbered menu always shows the next move. Rivals try to take your client, you meet new prospects and mentors, and shortcuts become hidden risk debt that comes due later.

**Navigation builds the practice.** Handle a landmark well and you earn its Mark. Each Mark unlocks a system at the port (a CRM, planning software, a specialist partnership...) that shortens trails or adds better options on future journeys. Places you have explored stay on your map.

**Your level** compares income with costs: **Unemployed** (savings gone), **Survivable**, **Sustainable**, **Profitable** (the goal).

## What's in it

| Element | Where it lives |
|---|---|
| Agent types | `js/content/agents.js` |
| Practice: costs, book, pipeline, workspace, partner, recruits, systems | `js/content/career.js` |
| Prospecting activities | `js/content/prospecting.js` |
| Map: 15 landmarks grouped into relationship stages, trails in days, side trails, hidden passages at every obstacle | `js/content/world.js`, `js/ui/map.js` |
| Full-screen map viewer: zoom, drag, tap a place | `js/ui/mapview.js` |
| Trail scene and cut scenes (canvas, two hikers) | `js/ui/trailscene.js` |
| Journey loop: days, pace, menu, forks, check-ins, finale | `js/ui/trail.js` |
| 40+ events, multi-step conversations, risk-debt checks | `js/content/events.js` |
| Clients, hidden facts, check-in answers | `js/content/clients.js` |
| Exploring: where each client opens up, keepsakes, trail conditions, town requests | `js/content/explore.js` |
| Port people, practice quests, contacts, gear (items, upgrades, outfitter prices, trip hints) | `js/content/port.js` |
| Mini-games: Call-a-thon, Mixer, Farmers Market, The Conversation, Shoebox Fact Find, Monday Morning Inbox, Calendar Tetris, Life Happens | `js/minigames/` |
| Game feel: instant pops, bursts, stamps, flying cards, live meters, sound, character art | `js/minigames/fx.js` |
| Element Lab: every mechanic in isolation | `js/ui/lab.js` |

## How it's built

Plain HTML, CSS and JavaScript: no framework, no build step, no server. Scripts load in order from `index.html` and share one global, `PP`.

```
index.html            the player page (play only)
css/style.css         all styling (phone first)
css/desktop.css       wide-screen tidy-ups only (all inside min-width queries)
js/core.js            state, effects, risk debt
js/content/*.js       the game's data: edit these to change the game
js/minigames/*.js     one file per mini-game, same interface
js/ui/*.js            map, trail scene, journey loop, game shell, Element Lab
js/track.js           anonymous milestone counts (GoatCounter)
js/vendor/qrcode.js   QR code generator (MIT, Kazuhiko Arase)
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



## Home screen app

The game installs like an app. On iPhone or iPad, open it in Safari, tap Share, then **Add to Home Screen**; on Android or desktop Chrome/Edge, use the Install button the title screen offers. It launches full screen with its own icon and works offline after the first visit.

- `manifest.webmanifest`: name, colours and icons
- `sw.js`: offline cache (the page is network-first so updates still arrive; `tools/stamp.py` bumps its version)
- `icons/`: rendered from the compass logo by `python3 tools/icons.py`

## Moving a game between devices

Saves live only in the browser. **Menu → Move your game to another device** packs the whole career (a journey in progress travels as a paused journey) into a short code: JSON, compressed, base64url, starting `BYP1.`. It's shown as a QR code for a `#import=` link (the part after `#` never reaches a server) and can be copied as a code or a link. Pasting the code into the same screen on the other device loads it, which is the route into an iPhone home screen app, since scanned links open in Safari.

## Usage counts

`index.html` loads GoatCounter (`farktools.goatcounter.com`): no cookies, no names. Page views report only the page path, so challenge and save links are never recorded. `PP.track('name')` counts a milestone as an event: career starts, journeys started, paused and finished, level-ups, career over, mini-games played, shares, challenges, installs and game moves. The admin page doesn't load GoatCounter. To keep your own visits out, open `https://farktools.github.io/Build-Your-Practice/#toggle-goatcounter` once in each browser you use.

## Playtesting

`.github/ISSUE_TEMPLATE/playtest-feedback.md` turns the seven questions from the concept doc into a feedback form. The key signal is whether people start a second run without being asked.

---

Working prototype for concept feedback. It is not a specification or formal training content.
