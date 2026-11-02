"use strict";
// =================== INPUT: keyboard, cheats, touch ===================
const CHEATS = {
  REJE: [L2("Es rejent", "Es rejent"), L2("Heavy rain", "Starkregen"), () => { weather.rain = true; weather.lock = 120; }],
  SUNN: [L2("Sunn", "Sunn"), L2("Clear sky", "Klarer Himmel"), () => { weather.rain = false; weather.lock = 120; }],
  NACHT: [L2("Nacht", "Nacht"), L2("Night falls", "Die Nacht bricht an"), () => { clock = 22 * 60; }],
  GUDEMORJE: [L2("Gude Morje", "Gude Morje"), L2("Early-morning light", "Morgenlicht"), () => { clock = 6 * 60 + 30; }],
  SCHORLE: [L2("Schorle", "Schorle"), L2("Full energy", "Volle Energie"), () => { P.energy = 100; }],
  GELD: [L2("Geld", "Geld"), L2("+€500 (not real, sorry)", "+500 € (leider nicht echt)"), () => { P.money += 500; }],
  KEENSTRESS: [L2("Keen Stress", "Keen Stress"), L2("Trouble cleared", "Ärger weg"), () => clearAerger()],
  BETZE: [L2("Betze", "Betze"), L2("Red fireworks over the Betzenberg", "Rotes Feuerwerk über dem Betzenberg"), () => {
    fireworks(tc(13), tc(42), 6);
    const q = pos();
    fireworks(q.x, q.y - T * 4, 2);
  }],
  BUMMELBAHN: [L2("Bummelbahn", "Bummelbahn"), L2("Everything at half speed (toggle)", "Alles in halber Geschwindigkeit (umschalten)"), () => { cheatSlow = !cheatSlow; }],
  TRAKTOR: [L2("Traktor", "Traktor"), L2("A winemaker’s tractor appears", "Ein Winzer-Traktor erscheint"), () => {
    const q = pos();
    unstick(mkVeh("tractor", q.x + 40, q.y, 0));
  }],
  ALLEZHOPP: [L2("Allez hopp", "Allez hopp"), L2("Super sprint for one minute", "Supersprint für eine Minute"), () => { superSprint = 60; }],
};
let cbuf = "";
function runCheat(code) {
  const c = CHEATS[code];
  c[2]();
  cheated = true;
  flash(tx("Cheat: ", "Cheat: ") + tr(c[0]), tr(c[1]));
  sfx.ok();
  save();
}
const PLAYING = () => state === "play" || state === "dialog" || state === "map" || state === "phone";

addEventListener("keydown", (e) => {
  const k = e.key;
  if (["ArrowUp", "ArrowDown", "ArrowLeft", "ArrowRight", " ", "Tab"].includes(k) && state !== "title")
    e.preventDefault();
  if (state === "title") {
    if (k === "Enter" && !e.target.closest("button")) {
      e.preventDefault();
      startGame();
    }
    return;
  }
  keys[k.toLowerCase()] = true;
  audio();
  if (state === "card") {
    if (k === "Enter" && !e.repeat) cardDefault();
    return;
  }
  if (state === "pause") {
    if ((k === "Escape" || k.toLowerCase() === "p") && !e.repeat) closePause();
    return;
  }
  let typing = false;
  if (k.length === 1 && /[a-zA-Z]/.test(k) && PLAYING()) {
    cbuf = (cbuf + k.toUpperCase()).slice(-12);
    for (const c in CHEATS)
      if (cbuf.endsWith(c)) {
        cbuf = "";
        runCheat(c);
        return;
      }
    for (const c in CHEATS)
      for (let n = 2; n <= Math.min(c.length - 1, cbuf.length); n++)
        if (cbuf.slice(-n) === c.slice(0, n)) typing = true;
  }
  if (typing && "ehpm".includes(k.toLowerCase())) return;
  if (e.repeat) return;
  const lk = k.toLowerCase();
  if (state === "dialog") {
    if (dCur && dCur.opts) {
      const n = parseInt(k, 10);
      if (n >= 1 && n <= dCur.opts.length) choose(n - 1);
      return;
    }
    if (k === "Enter" || lk === "e" || k === " ") {
      nextDialog();
      return;
    }
  }
  if (lk === "e") useKey();
  else if (lk === "h") horn();
  else if (lk === "p" || k === "Tab") state === "phone" ? closePhone() : openPhone();
  else if (lk === "m") state === "map" ? closeMap() : openMap();
  else if (k === "Escape") {
    if (state === "phone") closePhone();
    else if (state === "map") closeMap();
    else if (state === "play") openPause();
  }
});
addEventListener("keyup", (e) => {
  keys[e.key.toLowerCase()] = false;
});
const releaseAll = () => {
  for (const k in keys) keys[k] = false;
  tin.active = false;
  tin.x = tin.y = 0;
  tin.sprint = tin.brake = false;
};
addEventListener("blur", releaseAll);
document.addEventListener("visibilitychange", () => {
  if (document.hidden) {
    releaseAll();
    if (state === "play") openPause();
  }
});

/**
 * Combined input. On touch, vehicles use stick-direction steering: the
 * vehicle turns towards where the stick points and accelerates with its tilt.
 */
function input() {
  let x = 0,
    y = 0;
  if (keys.a || keys.arrowleft) x -= 1;
  if (keys.d || keys.arrowright) x += 1;
  if (keys.w || keys.arrowup) y -= 1;
  if (keys.s || keys.arrowdown) y += 1;
  let hand = !!(keys[" "] || tin.brake);
  if (tin.active) {
    const mag = Math.min(1, Math.hypot(tin.x, tin.y));
    if (!P.onFoot && P.veh && mag > 0.15) {
      const v = P.veh,
        want = Math.atan2(tin.y, tin.x);
      let d = angDiff(v.a, want);
      const reversing = v.speed < 5 && Math.abs(d) > 2.3;
      if (reversing) {
        // pull the stick backwards to reverse; steer like a real reverse
        d = angDiff(v.a, want + Math.PI);
        x = clamp(-d * 2, -1, 1);
        y = mag;
      } else {
        x = clamp(d * 2.2, -1, 1);
        y = -mag * (Math.abs(d) > 1.6 ? 0.35 : 1);
      }
    } else if (P.onFoot) {
      x += tin.x;
      y += tin.y;
    }
  }
  return {
    x: clamp(x, -1, 1),
    y: clamp(y, -1, 1),
    sprint: !!(keys.shift || tin.sprint),
    hand,
  };
}

// ---------------- touch controls ----------------
const coarse = IS_TOUCH;
{
  const zone = $("joyZone"),
    joy = $("joy"),
    knob = $("knob");
  let pid = null,
    cx = 0,
    cy = 0;
  const R = 52;
  zone.addEventListener("pointerdown", (e) => {
    if (pid !== null) return;
    pid = e.pointerId;
    zone.setPointerCapture(pid);
    // floating stick: it appears under the thumb
    const zr = zone.getBoundingClientRect();
    const size = joy.offsetWidth;
    cx = e.clientX;
    cy = e.clientY;
    joy.style.left = clamp(cx - zr.left - size / 2, 4, zr.width - size - 4) + "px";
    joy.style.top = clamp(cy - zr.top - size / 2, 4, zr.height - size - 4) + "px";
    joy.style.bottom = "auto";
    const jr = joy.getBoundingClientRect();
    cx = jr.left + jr.width / 2;
    cy = jr.top + jr.height / 2;
    joy.classList.add("active");
    tin.active = true;
    mv(e);
    audio();
  });
  const mv = (e) => {
    if (e.pointerId !== pid) return;
    let dx = e.clientX - cx,
      dy = e.clientY - cy;
    const d = Math.hypot(dx, dy);
    if (d > R) {
      dx = (dx / d) * R;
      dy = (dy / d) * R;
    }
    knob.style.transform = `translate(${dx}px,${dy}px)`;
    const m = Math.hypot(dx, dy) / R;
    tin.x = m > 0.12 ? dx / R : 0;
    tin.y = m > 0.12 ? dy / R : 0;
  };
  zone.addEventListener("pointermove", mv);
  const up = (e) => {
    if (e.pointerId !== pid) return;
    pid = null;
    tin.active = false;
    tin.x = tin.y = 0;
    knob.style.transform = "";
    joy.classList.remove("active");
    joy.style.left = joy.style.top = joy.style.bottom = "";
  };
  zone.addEventListener("pointerup", up);
  zone.addEventListener("pointercancel", up);

  document.querySelectorAll(".tbtns button").forEach((b) => {
    const act = b.dataset.act;
    b.addEventListener("pointerdown", (e) => {
      e.preventDefault();
      audio();
      b.classList.add("held");
      if (act === "use") useKey();
      else if (act === "horn") horn();
      else if (act === "alt") {
        if (P.onFoot) tin.sprint = true;
        else tin.brake = true;
      }
    });
    const rel = () => {
      b.classList.remove("held");
      if (act === "alt") tin.sprint = tin.brake = false;
    };
    b.addEventListener("pointerup", rel);
    b.addEventListener("pointercancel", rel);
    b.addEventListener("pointerleave", rel);
  });
}
// HUD buttons (work for mouse and touch)
$("bPhone").addEventListener("click", () => (state === "phone" ? closePhone() : openPhone()));
$("bMap").addEventListener("click", () => (state === "map" ? closeMap() : openMap()));
$("bPause").addEventListener("click", () => openPause());
// stop the context menu / long-press callout on the game surface
addEventListener("contextmenu", (e) => {
  if (state !== "title") e.preventDefault();
});
