// Lautre · © 2026 Prajwal Vilas Urkude. All rights reserved.
// =================== MAIN LOOP ===================
import { saveSettings, SETTINGS, tx } from "./core/i18n.js";
import { $, clamp, T, tc } from "./core/utils.js";
import { advanceSignals } from "./world/traffic-lights.js";
import { cam, game, load, P, resetProgress, START_POS } from "./core/state.js";
import { audio, engineUpdate } from "./systems/audio.js";
import { L2 } from "./data/text.js";
import { MISSIONS } from "./data/missions.js";
import { M, offerMission, updateMission } from "./systems/missions.js";
import { updateJob } from "./systems/jobs.js";
import { pos, say, toast, updateFeedback } from "./ui/feedback.js";
import { clearAerger, updateChasers } from "./systems/aerger.js";
import { SKIN, updatePeds } from "./systems/population.js";
import { updateStreet } from "./systems/street.js";
import { coarse } from "./input/input.js";
import { H, W } from "./render/ground.js";
import { updateClouds, updateSkids, updateSmoke } from "./render/effects.js";
import { drawMini } from "./render/maps.js";
import { applyView, renderFrame } from "./render/view.js";
import { updateParticles, updatePlayer, updateTraffic, updateWeather } from "./systems/update.js";
import { resetHUD, tickHUD } from "./ui/hud.js";
import { refreshLanding } from "./ui/menus.js";

let last = performance.now();
let liveT = 0;
function step(now) {
  const dt = Math.min(0.05, Math.max(0, (now - last) / 1000));
  last = now;
  const playing = game.state === "play";
  if (playing) {
    game.clock += dt;
    if (game.clock >= 1440) {
      game.clock -= 1440;
      game.day++;
    }
    updatePlayer(dt);
    updateChasers(dt);
    updateMission(dt);
    updateJob(dt);
  }
  // the world keeps living behind dialogs, cards and the landing page
  if (playing || game.state === "title" || game.state === "dialog" || game.state === "card") {
    updateTraffic(dt);
    updatePeds(dt);
    updateStreet(dt);
    updateWeather(dt);
    updateParticles(dt);
    updateSmoke(dt);
    updateSkids(dt);
    updateClouds(dt);
    advanceSignals(dt * (game.cheatSlow ? 0.5 : 1));
  }
  if (!playing) game.skidLevel = 0;
  if (game.shake > 0) game.shake = Math.max(0, game.shake - dt * 30);
  if (game.flashFx > 0) game.flashFx -= dt;
  if (game.blitzCd > 0) game.blitzCd -= dt;
  engineUpdate(P.onFoot ? 0 : game.skidLevel);
  updateFeedback(dt);
  // touch controls only while actually driving/walking
  if (coarse) {
    const show = game.state === "play";
    if ($("touch").hidden === show) $("touch").hidden = !show;
  }

  // ---- camera ----
  // phones: about 12 tiles across the short side, so the player and the street
  // read clearly (the computer formula left a phone looking at a tiny map)
  const base = coarse
    ? clamp(Math.min(W, H) / 400, 0.85, 1.2)
    : clamp(Math.min(W, H) / 720, 0.62, 1.1) * (W < 600 ? 0.92 : 1);
  if (game.state === "title") {
    const tt = (now / 1000) * 0.05;
    cam.x = tc(60) + Math.cos(tt) * T * 22;
    cam.y = tc(40) + Math.sin(tt * 1.3) * T * 14;
    game.Z = base * 0.9;
    liveT -= dt;
    if (liveT <= 0) {
      liveT = 1;
      updateLiveBadge();
    }
  } else {
    const q = pos();
    let lx = 0,
      ly = 0,
      zs = 0;
    if (!P.onFoot) {
      const v = P.veh;
      // look ahead along the actual direction of travel (incl. drift)
      lx = (Math.cos(v.a) * v.speed - Math.sin(v.a) * (v.slip || 0)) * 0.35;
      ly = (Math.sin(v.a) * v.speed + Math.cos(v.a) * (v.slip || 0)) * 0.35;
      zs = Math.min(1, Math.abs(v.speed) / 340);
    }
    const k = Math.min(1, dt * 5);
    cam.x += (q.x + lx - cam.x) * k;
    cam.y += (q.y + ly - cam.y) * k;
    const zt = base * (1 - 0.2 * zs);
    game.Z += (zt - game.Z) * Math.min(1, dt * 2);
  }
  // crash shake is applied only for this frame's render
  const shx = game.shake ? (Math.random() - 0.5) * game.shake * 2 : 0,
    shy = game.shake ? (Math.random() - 0.5) * game.shake * 2 : 0;
  cam.x += shx;
  cam.y += shy;
  renderFrame();
  cam.x -= shx;
  cam.y -= shy;
  if (game.state !== "title") {
    drawMini();
    tickHUD(dt);
  }
}
let errCount = 0;
function frame(now) {
  // one bad frame must never freeze the whole game
  try {
    step(now);
  } catch (e) {
    if (errCount++ < 5) console.error(e);
  }
  requestAnimationFrame(frame);
}

/** "Live" badge: the real local time in Kaiserslautern (not the game clock). */
function updateLiveBadge() {
  let t;
  try {
    t = new Intl.DateTimeFormat(SETTINGS.lang === "de" ? "de-DE" : "en-GB", {
      timeZone: "Europe/Berlin",
      hour: "2-digit",
      minute: "2-digit",
    }).format(new Date());
  } catch (e) {
    t = new Date().toTimeString().slice(0, 5);
  }
  $("liveTxt").textContent = "Lautern " + t;
  $("liveBadge").title = tx("Local time in Kaiserslautern", "Ortszeit in Kaiserslautern");
}

// =================== START ===================
let welcomed = false;
export function startGame() {
  audio();
  $("start").hidden = true;
  $("hud").hidden = false;
  game.state = "play";
  P.skin = SKIN[1];
  cam.x = P.x;
  cam.y = P.y;
  resetHUD();
  const fresh = !hasSave;
  hasSave = true;
  // first time in 3D (or a brand-new game): explain the camera + mission buttons
  const tip =
    SETTINGS.view === "3d" && (fresh || !SETTINGS.camTipShown)
      ? [
          "Lautre",
          coarse
            ? L2(
                "Tip: the camera button at the top right switches the view: from above, behind you, or first person. Drag on the right side of the screen to look around. The flag button shows your current mission.",
                "Tipp: Der Kamera-Knopf oben rechts wechselt die Ansicht: von oben, hinter dir oder Ego-Perspektive. Rechts auf dem Bildschirm ziehen, um dich umzuschauen. Der Fahnen-Knopf zeigt deine aktuelle Mission.",
              )
            : L2(
                "Tip: press V or the camera button at the top right to switch the view: behind you, first person, or from above. Click the city, then move the mouse to look around. The flag button shows your current mission.",
                "Tipp: Mit V oder dem Kamera-Knopf oben rechts wechselst du die Ansicht: hinter dir, Ego-Perspektive oder von oben. In die Stadt klicken und die Maus bewegen, um dich umzuschauen. Der Fahnen-Knopf zeigt deine aktuelle Mission.",
              ),
        ]
      : null;
  if (tip) {
    SETTINGS.camTipShown = true;
    saveSettings();
    const b = $("bCam");
    b.classList.add("hint-pulse");
    setTimeout(() => b.classList.remove("hint-pulse"), 12000);
  }
  if (!welcomed && game.mi < MISSIONS.length) {
    welcomed = true;
    say(
      [
        [
          "Lautre",
          coarse
            ? L2(
                "Welcome to Kaiserslautern; locals say “Lautre”. Drag on the left to move, tap the big button to get on things, and use the phone at the top right.",
                "Willkommen in Kaiserslautern, die Einheimischen sagen „Lautre“. Links ziehen zum Bewegen, großer Knopf zum Einsteigen, Handy oben rechts.",
              )
            : L2(
                "Welcome to Kaiserslautern; locals say “Lautre”. WASD to move, E to get on things, P for your phone, Esc to pause.",
                "Willkommen in Kaiserslautern, die Einheimischen sagen „Lautre“. WASD zum Bewegen, E zum Einsteigen, P fürs Handy, Esc für Pause.",
              ),
        ],
        ...(tip ? [tip] : []),
      ],
      () => offerMission(game.mi),
    );
  } else {
    if (tip) say([tip]);
    if (!M && game.mi < MISSIONS.length) game.nextMissionIn = 1.5;
    else if (game.mi >= MISSIONS.length)
      toast(tx("Free roam. Phone → Jobs for work, Story to replay missions.", "Freies Spiel. Handy → Jobs für Arbeit, Story für Wiederholungen."));
  }
}
$("play").addEventListener("click", startGame);
$("reset").addEventListener("click", () => {
  const ok = confirm(
    tx("Start a new game? Your current progress will be deleted.", "Neues Spiel starten? Dein Fortschritt wird gelöscht."),
  );
  if (!ok) return;
  resetProgress();
  P.x = START_POS.x;
  P.y = START_POS.y;
  if (!P.onFoot) {
    P.veh.speed = 0;
    P.veh = null;
    P.onFoot = true;
  }
  clearAerger();
  game.job = null;
  welcomed = false;
  hasSave = false;
  refreshLanding();
});

// =================== BOOT ===================
document.body.classList.add(coarse ? "touch" : "kbd");
export let hasSave = load();
refreshLanding();
updateLiveBadge();
applyView();
requestAnimationFrame(frame);

// Offline support + installable app (production builds served over http/https;
// in dev the worker would cache Vite's live modules)
if (import.meta.env.PROD && "serviceWorker" in navigator && /^https?:$/.test(location.protocol)) {
  addEventListener("load", () => {
    navigator.serviceWorker.register("sw.js").catch(() => {});
  });
}

// a quiet signature for the curious
console.log(
  "%cLautre%c  A game by Prajwal Vilas Urkude · © 2026",
  "font:700 16px 'Barlow Condensed',sans-serif;color:#141414;background:#f2c230;padding:2px 8px;border-radius:3px",
  "color:#a9b5a6",
);
