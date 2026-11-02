# Lautre: a Kaiserslautern city game

An open-city browser game set in Kaiserslautern. New in town and broke, you
register at the Bürgeramt, earn your deposit with delivery jobs, dodge the
Ordnungsamt and make kickoff on the Betzenberg.

- **8 story missions** with bonus goals, star ratings, dialogue choices,
  timers, fragile cargo, shopping runs and collection rallies
- **English and German**, switchable at any time (landing page, pause menu)
- **Desktop and mobile**: keyboard controls, or a floating joystick with
  context-aware buttons on touch screens
- Day/night cycle, weather and wet roads, traffic lights, a speed camera,
  drifting, engine sound
- A calm generative soundtrack that follows the time of day and the weather
- Static files only: no build step, no backend, no dependencies

## Play locally

Open `index.html` directly in a browser, or serve the folder (needed for
offline/PWA features):

```bash
npx serve .          # or: npm start
# then open http://localhost:8080
```

Add `?touch=1` to the URL to preview the touch controls on a desktop.

## Deploy

The game is plain static files, so any static host works. Publish the
repository root.

| Host | How |
| --- | --- |
| **GitHub Pages** | Push to `main`. `.github/workflows/pages.yml` deploys automatically (enable *Settings → Pages → Source: GitHub Actions* once). |
| **Netlify** | Drag the folder onto app.netlify.com/drop, or connect the repo (`netlify.toml` is included). |
| **Vercel** | `vercel deploy` or import the repo (`vercel.json` is included). |
| **Any web server** | Copy the folder to the web root. |

All paths are relative, so it also works from a sub-path such as
`username.github.io/lautre/`.

After changing files, bump `VERSION` in `sw.js` so returning players drop the
old offline cache. The worker fetches from the network first, so updates show
up straight away when online.

## Project structure

```
index.html              markup: landing, HUD, dialogs, cards, phone, map, pause
manifest.webmanifest    installable web app metadata
sw.js                   service worker (offline cache)
assets/                 icon + social preview image
css/
  base.css              tokens, buttons, glass panels, town sign
  landing.css           landing page
  hud.css               in-game HUD (responsive grid)
  overlays.css          dialog, mission cards, phone, map, pause
  touch.css             joystick + touch buttons
js/
  core/      i18n.js (settings + EN/DE), utils.js, state.js (save/load)
  world/     world.js (map, POIs), traffic-lights.js, vehicles.js
  data/      text.js (dialogue pools), missions.js (chapter 1)
  systems/   missions.js (engine), jobs.js, aerger.js (wanted level),
             population.js, actions.js, audio.js, update.js (physics, AI)
  input/     input.js (keyboard, cheats, touch)
  render/    ground, buildings, sprites, effects, maps, render
  ui/        feedback.js (toasts, dialog), phone.js, hud.js, menus.js
  main.js    game loop + boot
archive/                the original single-file version
```

Scripts are classic `<script>` tags that share one global scope (so the game
also runs from `file://`). Load order in `index.html` matters.

### Adding a mission

Append an entry to `MISSIONS` in `js/data/missions.js`. Step types are `go`,
`multi` and `collect`. See the comment at the top of that file. Every text is
written as `L2("English", "Deutsch")`.

## Controls

| Action | Keyboard | Touch |
| --- | --- | --- |
| Move / drive | WASD or arrow keys | drag on the left half |
| Run / handbrake | Shift / Space | small button |
| Use (enter, buy, talk) | E | big button (shows its action) |
| Horn | H | Horn button (in vehicles) |
| Phone / map / pause | P / M / Esc | top-right buttons |
| Dialogue choice | 1 / 2 | tap |

## Credits

Created, designed and developed by **Prajwal Vilas Urkude**.

- Typefaces: Barlow Condensed, Atkinson Hyperlegible, IBM Plex Mono (SIL Open Font License, via Google Fonts)
- Sound: synthesised in the browser with the Web Audio API

All shops and people are fiction; the street layout is stylised.

## Copyright

© 2026 Prajwal Vilas Urkude. All rights reserved. See [LICENSE](LICENSE).
