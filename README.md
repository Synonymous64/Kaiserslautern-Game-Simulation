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
- Plain JavaScript modules built with [Vite](https://vite.dev): no framework,
  no backend, no runtime dependencies

## Play locally

Needs [Node.js](https://nodejs.org) 20.19 or newer.

```bash
npm install
npm run dev          # dev server with hot reload: http://localhost:5173
```

Add `?touch=1` to the URL to preview the touch controls on a desktop.

| Command | What it does |
| --- | --- |
| `npm run dev` | dev server with hot reload |
| `npm run build` | production build into `dist/` |
| `npm run preview` | serve the `dist/` build locally (test offline/PWA here) |

The service worker only registers in production builds, so it never caches
stale modules while you develop.

## Deploy

`npm run build` produces a static site in `dist/`; any static host works.

| Host | How |
| --- | --- |
| **GitHub Pages** | Push to `master`. `.github/workflows/pages.yml` builds and deploys automatically (enable *Settings → Pages → Source: GitHub Actions* once). |
| **Netlify** | Connect the repo (`netlify.toml` sets the build command and `dist/`), or drag the `dist/` folder onto app.netlify.com/drop. |
| **Vercel** | `vercel deploy` or import the repo (`vercel.json` is included). |
| **Any web server** | Copy the contents of `dist/` to the web root. |

All URLs in the build are relative, so it also works from a sub-path such as
`username.github.io/lautre/`.

The build writes its file list and a content-hash cache version into
`dist/sw.js` (see `vite.config.js`), so returning players get a fresh offline
cache on every deploy. No version number to bump by hand.

## Project structure

```text
index.html              markup: landing, HUD, dialogs, cards, phone, map, pause
vite.config.js          build config + service-worker precache step
public/                 copied into the build as-is
  manifest.webmanifest  installable web app metadata
  sw.js                 service worker (offline cache)
  assets/               icon + social preview image
src/
  main.js    entry: game loop + boot
  core/      i18n.js (settings + EN/DE), utils.js, state.js (game state, save/load)
  world/     world.js (map, POIs), traffic-lights.js, vehicles.js
  data/      text.js (dialogue pools), missions.js (chapter 1)
  systems/   missions.js (engine), jobs.js, aerger.js (wanted level),
             population.js, actions.js, audio.js, music.js, update.js (physics, AI)
  input/     input.js (keyboard, cheats, touch)
  render/    ground, buildings, sprites, effects, maps, render
  ui/        feedback.js (toasts, dialog), phone.js, hud.js, menus.js
  styles/    base, landing, hud, overlays, touch (.css)
archive/                the original single-file version
```

Every file is an ES module that imports what it uses. State that several
modules change during play (`state`, `clock`, `day`, the active job, Ärger
level, story progress, camera zoom…) lives on the `game` object exported from
`src/core/state.js`. A module cannot reassign another module's variables, so
write `game.clock += dt`, not a new top-level `let`.

### Adding a mission

Append an entry to `MISSIONS` in `src/data/missions.js`. Step types are `go`,
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
