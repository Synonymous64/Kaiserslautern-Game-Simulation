"use strict";
// =================== ENVIRONMENT FX ===================
// Sun-driven shadows, drifting cloud shadows, wet roads, skid marks,
// tyre smoke / spray, traffic-light drawing, headlights and colour grading.

// ---- sun ----
const SUN = { x: 6, y: 8, a: 0.3 };
function updateSun() {
  const h = (clock / 60) % 24;
  const k = clamp((h - 6) / 14, 0, 1); // 06:00 → 20:00
  const th = Math.PI + k * Math.PI; // shadow points west → north → east
  const len = 7 + 12 * (1 - Math.sin(k * Math.PI)); // long mornings/evenings
  SUN.x = Math.cos(th) * len;
  SUN.y = Math.sin(th) * len;
  const day = 1 - darkness() / 0.62;
  SUN.a = (0.08 + 0.24 * day) * (1 - 0.55 * weather.wet);
}
const shadowFill = (mul = 1) => `rgba(10,15,10,${(SUN.a * mul).toFixed(3)})`;

// ---- cloud shadows ----
const clouds = [];
for (let i = 0; i < 10; i++)
  clouds.push({
    x: Math.random() * MW * T,
    y: Math.random() * MH * T,
    r: T * (6 + Math.random() * 9),
    s: 0.6 + Math.random() * 0.7,
    e: 1.3 + Math.random() * 0.7,
  });
function updateClouds(dt) {
  const wind = 22 + weather.wet * 34;
  for (const c of clouds) {
    c.x += wind * c.s * dt;
    c.y += wind * 0.3 * c.s * dt;
    if (c.x - c.r * c.e > MW * T) c.x = -c.r * c.e;
    if (c.y - c.r > MH * T) c.y = -c.r;
  }
}
function drawClouds(l, t, r, b) {
  if (SETTINGS.quality === "low") return;
  const day = 1 - darkness() / 0.62;
  if (day < 0.05) return;
  const a = 0.14 * day * (1 - 0.65 * weather.wet);
  for (const c of clouds) {
    const rx = c.r * c.e;
    if (c.x + rx < l || c.x - rx > r || c.y + c.r < t || c.y - c.r > b)
      continue;
    ctx.save();
    ctx.translate(c.x, c.y);
    ctx.scale(c.e, 1);
    const g = ctx.createRadialGradient(0, 0, 0, 0, 0, c.r);
    g.addColorStop(0, `rgba(8,16,26,${a})`);
    g.addColorStop(0.55, `rgba(8,16,26,${a * 0.65})`);
    g.addColorStop(1, "rgba(8,16,26,0)");
    ctx.fillStyle = g;
    ctx.fillRect(-c.r, -c.r, c.r * 2, c.r * 2);
    ctx.restore();
  }
}

// ---- skid marks ----
const skids = [];
function addSkid(x1, y1, x2, y2, w) {
  if (Math.hypot(x2 - x1, y2 - y1) > 40) return; // teleport guard
  skids.push({ x1, y1, x2, y2, w, a: weather.wet > 0.4 ? 0.22 : 0.5 });
  if (skids.length > 900) skids.shift();
}
function updateSkids(dt) {
  const fade = dt * (weather.rain ? 0.04 : 0.01);
  for (const s of skids) s.a -= fade;
  while (skids.length && skids[0].a <= 0) skids.shift();
}
function drawSkids(l, t, r, b) {
  ctx.lineCap = "round";
  for (const s of skids) {
    if (s.x1 < l - 10 || s.x1 > r + 10 || s.y1 < t - 10 || s.y1 > b + 10)
      continue;
    ctx.strokeStyle = `rgba(18,18,20,${s.a.toFixed(3)})`;
    ctx.lineWidth = s.w;
    ctx.beginPath();
    ctx.moveTo(s.x1, s.y1);
    ctx.lineTo(s.x2, s.y2);
    ctx.stroke();
  }
  ctx.lineCap = "butt";
}
/** Lay rubber from the rear wheels of v; intensity 0..1 controls smoke. */
function emitTyres(v, intensity) {
  const d = VT[v.type],
    c = Math.cos(v.a),
    s = Math.sin(v.a);
  const two = v.type === "bike" || v.type === "escooter";
  const rx = v.x - c * d.len * 0.32,
    ry = v.y - s * d.len * 0.32;
  const ox = -s * d.wid * 0.38,
    oy = c * d.wid * 0.38;
  const wheels = two
    ? [[rx, ry]]
    : [
        [rx + ox, ry + oy],
        [rx - ox, ry - oy],
      ];
  if (!v.skid) v.skid = [];
  wheels.forEach((w, i) => {
    const p = v.skid[i];
    if (p) addSkid(p[0], p[1], w[0], w[1], two ? 1.6 : 3);
    v.skid[i] = w;
    if (Math.random() < intensity * 0.5) {
      if (weather.wet > 0.4)
        puff(w[0], w[1], -c * 30, -s * 30, 0.5, 3, "rgba(205,215,228,1)");
      else
        puff(
          w[0],
          w[1],
          (Math.random() - 0.5) * 30,
          (Math.random() - 0.5) * 30,
          0.9,
          4,
          "rgba(190,190,190,1)",
        );
    }
  });
}

// ---- smoke / spray ----
const smoke = [];
function puff(x, y, vx, vy, life, r, col) {
  if (smoke.length > (SETTINGS.quality === "low" ? 70 : 280)) return;
  smoke.push({ x, y, vx, vy, t: life, life, r, col });
}
function updateSmoke(dt) {
  for (let i = smoke.length - 1; i >= 0; i--) {
    const p = smoke[i];
    p.t -= dt;
    p.x += p.vx * dt;
    p.y += p.vy * dt;
    p.vx *= 0.95;
    p.vy *= 0.95;
    p.r += dt * 12;
    if (p.t <= 0) smoke.splice(i, 1);
  }
}
function drawSmoke() {
  for (const p of smoke) {
    ctx.globalAlpha = (p.t / p.life) * 0.4;
    ctx.fillStyle = p.col;
    ctx.beginPath();
    ctx.arc(p.x, p.y, p.r, 0, 6.3);
    ctx.fill();
  }
  ctx.globalAlpha = 1;
}

// ---- street furniture: lamps, stop lines, zebras, signals ----
function drawLamps(l, t, r, b) {
  for (const [x, y] of lights) {
    if (x < l - 20 || x > r + 20 || y < t - 20 || y > b + 20) continue;
    ctx.strokeStyle = shadowFill(1.4);
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.moveTo(x, y);
    ctx.lineTo(x + SUN.x * 1.6, y + SUN.y * 1.6);
    ctx.stroke();
    ctx.fillStyle = "#2c3036";
    ctx.beginPath();
    ctx.arc(x, y, 3.2, 0, 6.3);
    ctx.fill();
    ctx.fillStyle = "#c9c4b4";
    ctx.beginPath();
    ctx.arc(x, y, 1.6, 0, 6.3);
    ctx.fill();
  }
}
function drawJunctionMarks(l, t, r, b) {
  ctx.fillStyle = "rgba(240,236,225,.85)";
  for (const s of SIGNALS) {
    const cx = tc(s.x),
      cy = tc(s.y);
    if (cx < l - 120 || cx > r + 120 || cy < t - 120 || cy > b + 120) continue;
    const H = T * 1.5,
      S = T * 1.62;
    // [approach exists?, stop line rect, zebra origin, horizontal zebra?]
    const app = [
      [get(s.x - 2, s.y) === ROAD, [cx - S - 3, cy, 3, H], cx - S - 32, true],
      [get(s.x + 2, s.y) === ROAD, [cx + S, cy - H, 3, H], cx + S + 8, true],
      [get(s.x, s.y - 2) === ROAD, [cx - H, cy - S - 3, H, 3], cy - S - 32, false],
      [get(s.x, s.y + 2) === ROAD, [cx, cy + S, H, 3], cy + S + 8, false],
    ];
    for (const [ok, sl, z, hz] of app) {
      if (!ok) continue;
      ctx.fillRect(sl[0], sl[1], sl[2], sl[3]);
      for (let k = -H + 4; k < H - 4; k += 9) {
        if (hz) ctx.fillRect(z, cy + k, 22, 4.5);
        else ctx.fillRect(cx + k, z, 4.5, 22);
      }
    }
  }
}
const SIG_COL = { red: "#ff3b30", amber: "#ffb020", green: "#3ddc6a" };
function drawSignals(l, t, r, b) {
  const o = T * 1.62,
    now = performance.now() / 1000;
  for (const s of SIGNALS) {
    const cx = tc(s.x),
      cy = tc(s.y);
    if (cx < l - 80 || cx > r + 80 || cy < t - 80 || cy > b + 80) continue;
    // NE + SW serve h-traffic, NW + SE serve v-traffic (right-hand traffic)
    for (const [dx, dy, axis] of [
      [1, -1, "h"],
      [-1, 1, "h"],
      [-1, -1, "v"],
      [1, 1, "v"],
    ]) {
      const x = cx + dx * o,
        y = cy + dy * o;
      if (get(Math.floor(x / T), Math.floor(y / T)) !== WALK) continue;
      const st = signalState(s, axis);
      ctx.fillStyle = shadowFill(1.2);
      ctx.fillRect(x - 3 + SUN.x * 0.5, y - 8 + SUN.y * 0.5, 7, 17);
      ctx.fillStyle = "#16181b";
      rr(ctx, x - 3.5, y - 8.5, 7, 17, 2);
      ctx.fill();
      const ys = { red: -5, amber: 0, green: 5 };
      for (const k of ["red", "amber", "green"]) {
        ctx.fillStyle = k === st ? SIG_COL[k] : "rgba(255,255,255,.07)";
        ctx.beginPath();
        ctx.arc(x, y + ys[k], 2.1, 0, 6.3);
        ctx.fill();
      }
    }
  }
  // Blitzer pole
  const bx = tc(BLITZER.x),
    by = tc(BLITZER.y);
  if (bx > l - 40 && bx < r + 40 && by > t - 40 && by < b + 40) {
    ctx.fillStyle = shadowFill(1.2);
    ctx.fillRect(bx - 4 + SUN.x * 0.6, by - 4 + SUN.y * 0.6, 9, 9);
    ctx.fillStyle = "#e8e6df";
    rr(ctx, bx - 5, by - 5, 10, 10, 2);
    ctx.fill();
    ctx.fillStyle = "#1a1a1a";
    ctx.fillRect(bx - 3, by + 1, 6, 3);
    ctx.fillStyle = ((now * 0.5) | 0) % 2 ? "#c42222" : "#5a1010";
    ctx.beginPath();
    ctx.arc(bx, by - 1.5, 1.4, 0, 6.3);
    ctx.fill();
  }
}

// ---- lights at night (drawn into the half-res light mask) ----
function lightCone(sx, sy, a, R, spread) {
  const g = lctx.createRadialGradient(sx, sy, 0, sx, sy, R);
  g.addColorStop(0, "rgba(0,0,0,.92)");
  g.addColorStop(0.7, "rgba(0,0,0,.45)");
  g.addColorStop(1, "rgba(0,0,0,0)");
  lctx.fillStyle = g;
  lctx.beginPath();
  lctx.moveTo(sx, sy);
  lctx.arc(sx, sy, R, a - spread, a + spread);
  lctx.closePath();
  lctx.fill();
}
/** Warm additive glow for head/tail lights, drawn in world space at night. */
function drawVehicleGlows(l, t, r, b, dk) {
  ctx.globalCompositeOperation = "lighter";
  const glow = (x, y, R, col) => {
    const g = ctx.createRadialGradient(x, y, 0, x, y, R);
    g.addColorStop(0, col);
    g.addColorStop(1, "rgba(0,0,0,0)");
    ctx.fillStyle = g;
    ctx.fillRect(x - R, y - R, R * 2, R * 2);
  };
  const list = vehicles.filter((v) => v.ai || v === P.veh);
  for (const c of chasers) if (c.kind === "van") list.push(c);
  for (const v of list) {
    if (v.x < l - 80 || v.x > r + 80 || v.y < t - 80 || v.y > b + 80) continue;
    const d = VT[v.type],
      a = v.ra ?? v.a,
      c = Math.cos(a),
      s = Math.sin(a);
    const fx = v.x + c * d.len * 0.5,
      fy = v.y + s * d.len * 0.5;
    glow(fx + c * 26, fy + s * 26, 34, `rgba(255,225,160,${0.22 * dk})`);
    if (d.wid > 12) {
      const bk = v.braking ? 0.85 : 0.35;
      const rx = v.x - c * d.len * 0.5,
        ry = v.y - s * d.len * 0.5;
      glow(rx, ry, v.braking ? 18 : 11, `rgba(255,40,30,${bk * dk})`);
    }
    if (v.type === "van")
      glow(
        v.x,
        v.y,
        40,
        ((performance.now() / 180) | 0) % 2
          ? `rgba(60,120,255,${0.7 * dk})`
          : `rgba(255,50,50,${0.6 * dk})`,
      );
  }
  ctx.globalCompositeOperation = "source-over";
}

// ---- colour grading, wet tint, vignette, camera flash ----
let vignette = null,
  vigW = 0,
  vigH = 0;
function drawGrade() {
  const h = (clock / 60) % 24;
  const bell = (a, b) =>
    h >= a && h < b ? Math.sin(((h - a) / (b - a)) * Math.PI) : 0;
  const tint = (col, a) => {
    if (a <= 0.004) return;
    ctx.fillStyle = `rgba(${col},${a.toFixed(3)})`;
    ctx.fillRect(0, 0, W, H);
  };
  tint("255,140,170", 0.1 * bell(5, 7.6)); // dawn
  const hq = SETTINGS.quality !== "low";
  if (hq)   tint("255,236,190", 0.045 * bell(10, 16)); // midday warmth
  tint("255,120,50", 0.14 * bell(17.3, 20.6)); // golden hour / dusk
  tint("60,74,96", 0.12 * weather.wet); // overcast, wet
  if (!hq) {
    if (flashFx > 0) tint("255,255,255", Math.min(0.85, flashFx * 3));
    return; // fast mode: no vignette
  }
  if (!vignette || vigW !== W || vigH !== H) {
    vigW = W;
    vigH = H;
    vignette = ctx.createRadialGradient(
      W / 2,
      H / 2,
      Math.min(W, H) * 0.35,
      W / 2,
      H / 2,
      Math.hypot(W, H) * 0.62,
    );
    vignette.addColorStop(0, "rgba(0,0,0,0)");
    vignette.addColorStop(1, "rgba(0,0,0,.38)");
  }
  ctx.fillStyle = vignette;
  ctx.fillRect(0, 0, W, H);
  if (flashFx > 0) tint("255,255,255", Math.min(0.85, flashFx * 3));
}
