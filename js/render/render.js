"use strict";
// =================== FRAME RENDER ===================
const worldTransform = () =>
  ctx.setTransform(
    DPR * Z,
    0,
    0,
    DPR * Z,
    DPR * (W / 2 - cam.x * Z),
    DPR * (H / 2 - cam.y * Z),
  );

function render() {
  const q = state === "title" ? cam : pos();
  updateSun();
  worldTransform();
  const vw = W / Z,
    vh = H / Z,
    l = cam.x - vw / 2,
    t = cam.y - vh / 2,
    r = l + vw,
    b = t + vh;
  const x0 = Math.max(0, Math.floor(l / T) - 1),
    y0 = Math.max(0, Math.floor(t / T) - 1),
    x1 = Math.min(MW - 1, Math.floor(r / T) + 1),
    y1 = Math.min(MH - 1, Math.floor(b / T) + 1);
  const now = performance.now() / 1000;

  // ---- ground layer ----
  ctx.fillStyle = COL[FOREST];
  ctx.fillRect(l - T, t - T, vw + 2 * T, vh + 2 * T);
  drawTiles(x0, y0, x1, y1);
  drawRoadMarks(l, t, r, b);
  drawJunctionMarks(l, t, r, b);
  drawSkids(l, t, r, b);

  // bottles
  for (const bt of bottles) {
    if (bt.x < l || bt.x > r || bt.y < t || bt.y > b) continue;
    ctx.save();
    ctx.translate(bt.x, bt.y);
    ctx.rotate(bt.a);
    ctx.fillStyle = "#2f8f4a";
    ctx.fillRect(-6, -2.5, 10, 5);
    ctx.fillRect(4, -1.2, 4, 2.4);
    ctx.fillStyle = "rgba(255,255,255,.4)";
    ctx.fillRect(-5, -2, 7, 1);
    ctx.restore();
  }

  // mission pickups: glowing bottles that bob
  if (M && M.pickups.length) {
    for (const k of M.pickups) {
      if (k.x < l - 30 || k.x > r + 30 || k.y < t - 30 || k.y > b + 30) continue;
      const pul = (now * 1.4 + k.x * 0.01) % 1;
      ctx.strokeStyle = `rgba(127,207,138,${(1 - pul) * 0.9})`;
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.arc(k.x, k.y, 6 + pul * 16, 0, 6.3);
      ctx.stroke();
      ctx.save();
      ctx.translate(k.x, k.y - 3 + Math.sin(now * 4 + k.y) * 2);
      ctx.rotate(-0.6);
      ctx.fillStyle = "#3fbf62";
      ctx.fillRect(-7, -3, 11, 6);
      ctx.fillRect(4, -1.5, 5, 3);
      ctx.fillStyle = "rgba(255,255,255,.55)";
      ctx.fillRect(-6, -2.2, 8, 1.2);
      ctx.restore();
    }
  }

  // ---- actors ----
  if (job && job.kind === "taxi" && job.phase === "pickup") {
    const fx = tc(job.from.x),
      fy = tc(job.from.y);
    drawPerson(fx, fy, Math.PI / 2, "#6b3a8c", "#d9a57b", {});
    ctx.fillStyle = "#d9a57b";
    ctx.fillRect(fx - 2, fy - 14, 4, 8);
  }
  for (const p of peds) {
    if (p.x < l - 20 || p.x > r + 20 || p.y < t - 20 || p.y > b + 20)
      continue;
    drawPerson(p.x, p.y, p.a, p.shirt, p.skin, {
      knock: p.knock > 0,
      ka: p.ka,
      hair: p.hair,
      legs: p.legs,
      umbrella: weather.rain && !p.knock ? p.umb : null,
      t: p.stand ? 0 : now + p.sp,
    });
  }
  for (const c of chasers)
    if (c.kind === "officer")
      drawPerson(c.x, c.y, c.a, "#1d2f55", "#e6b98f", {
        cap: "#1d2f55",
        vest: true,
        t: now,
      });
  for (const v of vehicles) {
    if (v.x < l - 60 || v.x > r + 60 || v.y < t - 60 || v.y > b + 60)
      continue;
    drawVeh(v);
  }
  for (const c of chasers) if (c.kind === "van") drawVeh(c);
  drawSmoke();
  if (state !== "title" && P.onFoot) {
    ctx.strokeStyle = "rgba(242,194,48,.8)";
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.arc(P.x, P.y, 12, 0, 6.3);
    ctx.stroke();
    drawPerson(P.x, P.y, P.a, "#c4472f", P.skin || "#d9a57b", {
      pack: true,
      hair: "#3b2a1e",
      t: P.anim,
    });
  }
  drawLamps(l, t, r, b);
  drawSignals(l, t, r, b);

  // ---- tall layer ----
  drawBuildings(x0, y0, x1, y1);
  drawLandmarks(l, t, r, b);
  drawTrees(x0, y0, x1, y1);
  drawClouds(l, t, r, b);
  drawLabels(l, t, r, b);

  // target marker
  const tg = state === "title" ? null : target();
  if (tg && !tg.small) {
    const pul = (now * 1.6) % 1;
    ctx.strokeStyle = `rgba(242,194,48,${1 - pul})`;
    ctx.lineWidth = 3;
    ctx.beginPath();
    ctx.arc(tg.x, tg.y, 14 + pul * 26, 0, 6.3);
    ctx.stroke();
    ctx.fillStyle = "rgba(242,194,48,.35)";
    ctx.beginPath();
    ctx.arc(tg.x, tg.y, T * 1.2, 0, 6.3);
    ctx.fill();
    const by = tg.y - 34 + Math.sin(now * 4) * 4;
    ctx.fillStyle = "#f2c230";
    ctx.strokeStyle = "#111";
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.moveTo(tg.x - 10, by - 12);
    ctx.lineTo(tg.x + 10, by - 12);
    ctx.lineTo(tg.x, by + 4);
    ctx.closePath();
    ctx.fill();
    ctx.stroke();
  }
  // fireworks
  for (const p of particles) {
    ctx.globalAlpha = Math.max(0, Math.min(1, p.t));
    ctx.fillStyle = p.c;
    ctx.fillRect(p.x - 2, p.y - 2, 4, 4);
  }
  ctx.globalAlpha = 1;

  // ---- night lighting ----
  const dkn = darkness();
  const dk = dkn * (1 + 0.1 * weather.wet) + 0.12 * weather.wet;
  ctx.setTransform(DPR, 0, 0, DPR, 0, 0);
  if (dk > 0.02) {
    const hs = 0.5;
    const toS = (x, y) => [
      ((x - cam.x) * Z + W / 2) * hs,
      ((y - cam.y) * Z + H / 2) * hs,
    ];
    lctx.setTransform(1, 0, 0, 1, 0, 0);
    lctx.globalCompositeOperation = "source-over";
    lctx.clearRect(0, 0, lc.width, lc.height);
    lctx.fillStyle = `rgba(8,12,32,${Math.min(0.75, dk)})`;
    lctx.fillRect(0, 0, lc.width, lc.height);
    if (dkn > 0.05) {
      lctx.globalCompositeOperation = "destination-out";
      const offS = (sx, sy, R) =>
        sx < -R || sy < -R || sx > lc.width + R || sy > lc.height + R;
      const lit = (x, y, R) => {
        const [sx, sy] = toS(x, y);
        if (offS(sx, sy, R)) return;
        const g = lctx.createRadialGradient(sx, sy, 0, sx, sy, R);
        g.addColorStop(0, "rgba(0,0,0,.95)");
        g.addColorStop(1, "rgba(0,0,0,0)");
        lctx.fillStyle = g;
        lctx.fillRect(sx - R, sy - R, R * 2, R * 2);
      };
      const beam = (v, len, spread) => {
        const d = VT[v.type],
          a = v.ra ?? v.a;
        const [sx, sy] = toS(
          v.x + Math.cos(a) * d.len * 0.45,
          v.y + Math.sin(a) * d.len * 0.45,
        );
        const R = len * Z * hs;
        if (!offS(sx, sy, R)) lightCone(sx, sy, a, R, spread);
      };
      for (const [x, y] of lights) lit(x, y, 70 * Z * hs);
      if (state !== "title") {
        lit(q.x, q.y, 60 * Z * hs);
        if (!P.onFoot)
          beam(P.veh, P.veh.type === "bike" ? 120 : 210, 0.42);
      }
      for (const v of vehicles) if (v.ai) beam(v, 140, 0.4);
      for (const c of chasers) if (c.kind === "van") beam(c, 160, 0.4);
    }
    lctx.globalCompositeOperation = "source-over";
    ctx.drawImage(lc, 0, 0, W, H);
    if (dkn > 0.15) {
      worldTransform();
      drawVehicleGlows(l, t, r, b, dkn / 0.62);
      ctx.fillStyle = `rgba(255,205,120,${dkn * 1.1})`;
      for (const [x, y] of windowsLit) {
        const px = x * T,
          py = y * T;
        if (px < l - T || px > r || py < t - T || py > b) continue;
        // a few windows switch on and off over the night
        if (hash(x, y + ((clock / 37) | 0)) < 0.12) continue;
        ctx.fillRect(px + 6, py + T - 7, 6, 4);
        if (hash(y, x) > 0.5) ctx.fillRect(px + 19, py + T - 7, 6, 4);
      }
      ctx.fillStyle = `rgba(255,215,140,${dkn})`;
      for (const [x, y] of lights) {
        if (x < l || x > r || y < t || y > b) continue;
        ctx.beginPath();
        ctx.arc(x, y, 3, 0, 6.3);
        ctx.fill();
      }
      ctx.setTransform(DPR, 0, 0, DPR, 0, 0);
    }
  }
  drawGrade();

  // ---- rain ----
  if (weather.rain) {
    ctx.strokeStyle = "rgba(200,215,235,.42)";
    ctx.lineWidth = 1;
    ctx.beginPath();
    for (const d of drops) {
      ctx.moveTo(d.x, d.y);
      ctx.lineTo(d.x - 3, d.y + 14);
    }
    ctx.stroke();
  }
  // ---- speech bubbles ----
  if (bubbles.length) {
    worldTransform();
    for (const bb of bubbles) drawBubble(bb.o.x, bb.o.y, tr(bb.text));
    ctx.setTransform(DPR, 0, 0, DPR, 0, 0);
  }
  // ---- off-screen objective arrow ----
  if (tg) {
    const sx = (tg.x - cam.x) * Z + W / 2,
      sy = (tg.y - cam.y) * Z + H / 2,
      m = 56;
    if (sx < m || sy < m || sx > W - m || sy > H - m) {
      const a = Math.atan2(sy - H / 2, sx - W / 2);
      // keep the arrow in the free band between the HUD and the controls
      const top = Math.min(H / 2, HUD_SAFE.top),
        bot = Math.max(H / 2, H - HUD_SAFE.bottom);
      const cx = clamp(sx, m, W - m),
        cy = clamp(sy, top, bot);
      ctx.save();
      ctx.translate(cx, cy);
      ctx.rotate(a);
      ctx.fillStyle = "#f2c230";
      ctx.strokeStyle = "#111";
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.moveTo(16, 0);
      ctx.lineTo(-10, -11);
      ctx.lineTo(-5, 0);
      ctx.lineTo(-10, 11);
      ctx.closePath();
      ctx.fill();
      ctx.stroke();
      ctx.restore();
      const dm = (Math.hypot(tg.x - q.x, tg.y - q.y) / T) * 25;
      ctx.font = '600 12px "IBM Plex Mono",monospace';
      ctx.textAlign = "center";
      ctx.textBaseline = "middle";
      ctx.lineWidth = 3;
      ctx.strokeStyle = "rgba(0,0,0,.7)";
      const tx =
        dm >= 1000
          ? (SETTINGS.lang === "de" ? (dm / 1000).toFixed(1).replace(".", ",") : (dm / 1000).toFixed(1)) + " km"
          : Math.round(dm / 10) * 10 + " m";
      ctx.strokeText(tx, cx - Math.cos(a) * 26, cy - Math.sin(a) * 26);
      ctx.fillStyle = "#fff";
      ctx.fillText(tx, cx - Math.cos(a) * 26, cy - Math.sin(a) * 26);
    }
  }
}
