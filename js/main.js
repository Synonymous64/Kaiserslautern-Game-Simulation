"use strict";
// Lautre · © 2026 Prajwal Vilas Urkude. All rights reserved.
// =================== MAIN LOOP ===================
let last = performance.now();
let liveT = 0;
function step(now) {
  const dt = Math.min(0.05, Math.max(0, (now - last) / 1000));
  last = now;
  const playing = state === "play";
  if (playing) {
    clock += dt;
    if (clock >= 1440) {
      clock -= 1440;
      day++;
    }
    updatePlayer(dt);
    updateChasers(dt);
    updateMission(dt);
    updateJob(dt);
  }
  // the world keeps living behind dialogs, cards and the landing page
  if (playing || state === "title" || state === "dialog" || state === "card") {
    updateTraffic(dt);
    updatePeds(dt);
    updateWeather(dt);
    updateParticles(dt);
    updateSmoke(dt);
    updateSkids(dt);
    updateClouds(dt);
    sigClock += dt * (cheatSlow ? 0.5 : 1);
  }
  if (!playing) skidLevel = 0;
  if (shake > 0) shake = Math.max(0, shake - dt * 30);
  if (flashFx > 0) flashFx -= dt;
  if (blitzCd > 0) blitzCd -= dt;
  engineUpdate(P.onFoot ? 0 : skidLevel);
  musicUpdate(dt);
  if (toastT > 0) {
    toastT -= dt;
    if (toastT <= 0) $("toast").classList.remove("show");
  }
  if (flashT > 0) {
    flashT -= dt;
    if (flashT <= 0) $("cheatflash").classList.remove("show");
  }
  // touch controls only while actually driving/walking
  if (coarse) {
    const show = state === "play";
    if ($("touch").hidden === show) $("touch").hidden = !show;
  }

  // ---- camera ----
  const base = clamp(Math.min(W, H) / 720, 0.62, 1.1) * (W < 600 ? 0.92 : 1);
  if (state === "title") {
    const tt = (now / 1000) * 0.05;
    cam.x = tc(60) + Math.cos(tt) * T * 22;
    cam.y = tc(40) + Math.sin(tt * 1.3) * T * 14;
    Z = base * 0.9;
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
    Z += (zt - Z) * Math.min(1, dt * 2);
  }
  // crash shake is applied only for this frame's render
  const shx = shake ? (Math.random() - 0.5) * shake * 2 : 0,
    shy = shake ? (Math.random() - 0.5) * shake * 2 : 0;
  cam.x += shx;
  cam.y += shy;
  render();
  cam.x -= shx;
  cam.y -= shy;
  if (state !== "title") {
    drawMini();
    hudT -= dt;
    if (hudT <= 0) {
      hudT = 0.1;
      updateHUD();
    }
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
function startGame() {
  audio();
  $("start").hidden = true;
  $("hud").hidden = false;
  state = "play";
  P.skin = SKIN[1];
  cam.x = P.x;
  cam.y = P.y;
  hudT = 0;
  hasSave = true;
  if (!welcomed && mi < MISSIONS.length) {
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
      ],
      () => offerMission(mi),
    );
  } else if (!M && mi < MISSIONS.length) {
    nextMissionIn = 1.5;
  } else if (mi >= MISSIONS.length) {
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
  job = null;
  welcomed = false;
  hasSave = false;
  refreshLanding();
});

// =================== BOOT ===================
document.body.classList.add(coarse ? "touch" : "kbd");
let hasSave = load();
refreshLanding();
updateLiveBadge();
requestAnimationFrame(frame);

// Offline support + installable app (only when served over http/https)
if ("serviceWorker" in navigator && /^https?:$/.test(location.protocol)) {
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
