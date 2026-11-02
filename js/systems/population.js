"use strict";
// =================== PEDS / BOTTLES / PARTICLES ===================
const SKIN = ["#f1c9a5", "#d9a57b", "#a8714a", "#7a4b2c", "#e6b98f"];
const HAIR = ["#2b1d14", "#4a3020", "#8a6a3a", "#c9a46a", "#1a1a1a", "#9a9a9a"];
const LEGS = ["#2a2d33", "#33415c", "#3b3b3b", "#5a4a3a", "#1f2a44"];
const UMBRELLAS = ["#1d3b74", "#c42222", "#2b2b2b", "#f2c230", "#2f8f4a", "#7a3b8f"];
const SHIRTS = [
  "#3a5a8c",
  "#6b8f3a",
  "#8c3a5a",
  "#d9d2c3",
  "#2b2b2b",
  "#c47a2c",
  "#5a4a8c",
  "#2c7a7a",
];
function spawnPed(nearOnly) {
  const q = state === "title" ? cam : pos();
  for (let i = 0; i < 40; i++) {
    const t = pick(pedTiles),
      x = t % MW,
      y = (t / MW) | 0,
      d = Math.hypot(tc(x) - q.x, tc(y) - q.y) / T;
    if (nearOnly ? d > 10 && d < 26 : d < 26) {
      const fan = matchday && Math.random() < 0.75;
      const a = Math.random() * Math.PI * 2;
      peds.push({
        x: tc(x) + (Math.random() - 0.5) * 16,
        y: tc(y) + (Math.random() - 0.5) * 16,
        a,
        sp: (28 + Math.random() * 22) * (weather.rain ? 1.25 : 1),
        t: Math.random() * 3,
        shirt: fan ? "#c42222" : pick(SHIRTS),
        skin: pick(SKIN),
        fan,
        hair: Math.random() < 0.85 ? pick(HAIR) : null,
        legs: pick(LEGS),
        umb: Math.random() < 0.65 ? (fan ? "#c42222" : pick(UMBRELLAS)) : null,
        knock: 0,
        stand: Math.random() < 0.2,
      });
      return;
    }
  }
}
function walkableP(x, y) {
  const v = tileAtPx(x, y);
  return (
    v === WALK || v === PLAZA || v === PARK || v === LOT || v === PITCH
  );
}
function updatePeds(dt) {
  const q = state === "title" ? cam : pos();
  const night = darkness() > 0.4;
  const want = Math.round((matchday ? 75 : 55) * (night ? 0.45 : 1) * (weather.rain ? 0.75 : 1) * (SETTINGS.quality === "low" ? 0.7 : 1));
  for (let i = peds.length - 1; i >= 0; i--) {
    const p = peds[i];
    if (Math.hypot(p.x - q.x, p.y - q.y) > T * 32) {
      peds.splice(i, 1);
      continue;
    }
    if (p.knock > 0) {
      p.knock -= dt;
      if (p.knock <= 0) bubble(p, pick(ANGRY));
      continue;
    }
    p.t -= dt;
    if (p.t <= 0) {
      p.t = 2 + Math.random() * 4;
      p.a = Math.random() * Math.PI * 2;
      p.stand = Math.random() < 0.2;
      if (matchday && p.fan) {
        p.a =
          Math.atan2(tc(42) - p.y, tc(13) - p.x) +
          (Math.random() - 0.5);
        p.stand = false;
      }
    }
    if (!p.stand) {
      const nx = p.x + Math.cos(p.a) * p.sp * dt,
        ny = p.y + Math.sin(p.a) * p.sp * dt;
      if (walkableP(nx, ny)) {
        p.x = nx;
        p.y = ny;
      } else {
        p.a += Math.PI * (0.5 + Math.random());
      }
    }
    if (!P.onFoot) {
      const v = P.veh,
        s = Math.abs(v.speed);
      if (s > 55) {
        for (const [cx, cy, r] of vehCircles(v, v.x, v.y, v.a)) {
          if (Math.hypot(p.x - cx, p.y - cy) < r + 7) {
            p.knock = 2.2;
            p.ka = Math.random() * 6;
            const push = v.a + (Math.random() < 0.5 ? 1.2 : -1.2);
            for (let k = 0; k < 6; k++) {
              const nx = p.x + Math.cos(push) * 6,
                ny = p.y + Math.sin(push) * 6;
              if (walkableP(nx, ny) || tileAtPx(nx, ny) === ROAD) {
                p.x = nx;
                p.y = ny;
              }
            }
            v.speed *= 0.8;
            onCrash(s * 0.5);
            if (s > 100) addAerger(1, L2("Knocked over a pedestrian", "Fußgänger umgefahren"));
            break;
          }
        }
      }
    } else {
      const d = Math.hypot(p.x - P.x, p.y - P.y);
      if (d < 13 && d > 0) {
        p.x += ((p.x - P.x) / d) * 1.5;
        p.y += ((p.y - P.y) / d) * 1.5;
      }
    }
    if (
      !p.say &&
      Math.random() < (p.fan ? 0.004 : 0.0015) &&
      Math.hypot(p.x - q.x, p.y - q.y) < T * 7 &&
      !bubbles.length
    )
      bubble(p, p.fan ? pick(FAN) : pick(PED_LINES));
  }
  // bounded: spawnPed can fail near the map edge (used to freeze the game)
  for (let k = 0; k < 12 && peds.length < want; k++)
    spawnPed(peds.length >= want * 0.5);
}
function bubble(o, text) {
  bubbles.push({ o, text, t: 3 });
}
function respawnBottle(i) {
  const q = state === "title" ? cam : pos();
  for (let k = 0; k < 50; k++) {
    const t = pick(pedTiles),
      x = t % MW,
      y = (t / MW) | 0;
    if (Math.hypot(tc(x) - q.x, tc(y) - q.y) > T * 15) {
      bottles[i] = {
        x: tc(x) + (Math.random() - 0.5) * 14,
        y: tc(y) + (Math.random() - 0.5) * 14,
        a: Math.random() * 6,
      };
      return;
    }
  }
  // fallback so a bottle never stays under the player (infinite pickups)
  const t = pick(pedTiles);
  bottles[i] = { x: tc(t % MW), y: tc((t / MW) | 0), a: Math.random() * 6 };
}
for (let i = 0; i < 36; i++) {
  const t = pick(pedTiles);
  bottles.push({
    x: tc(t % MW),
    y: tc((t / MW) | 0),
    a: Math.random() * 6,
  });
}
function fireworks(x, y, secs) {
  for (let i = 0; i < secs * 3; i++)
    setTimeout(() => {
      const cx = x + (Math.random() - 0.5) * T * 14,
        cy = y + (Math.random() - 0.5) * T * 10;
      sfx.boom();
      for (let k = 0; k < 46; k++) {
        const a = Math.random() * Math.PI * 2,
          s = 60 + Math.random() * 180;
        particles.push({
          x: cx,
          y: cy,
          vx: Math.cos(a) * s,
          vy: Math.sin(a) * s,
          t: 1.3 + Math.random() * 0.6,
          c: Math.random() < 0.65 ? "#ff3b30" : "#ffffff",
        });
      }
    }, i * 330);
}

