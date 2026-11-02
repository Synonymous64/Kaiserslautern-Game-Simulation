"use strict";
// =================== RENDERING ===================
const cv = $("cv"),
  ctx = cv.getContext("2d");
const lc = document.createElement("canvas"),
  lctx = lc.getContext("2d");
let W = 0,
  H = 0,
  DPR = 1;
function resize() {
  DPR = Math.min(SETTINGS.quality === "low" ? 1.25 : 2, window.devicePixelRatio || 1);
  W = innerWidth;
  H = innerHeight;
  cv.width = Math.round(W * DPR);
  cv.height = Math.round(H * DPR);
  cv.style.width = W + "px";
  cv.style.height = H + "px";
  lc.width = Math.ceil(W / 2);
  lc.height = Math.ceil(H / 2);
}
addEventListener("resize", resize);
resize();

const COL = {
  [GRASS]: "#557d3c",
  [ROAD]: "#3b3e44",
  [WALK]: "#a89d8f",
  [PARK]: "#5f8f41",
  [FOREST]: "#24452d",
  [WATER]: "#3f7393",
  [PLAZA]: "#c2ab90",
  [RAIL]: "#5d544b",
  [PITCH]: "#3f8f3a",
  [LOT]: "#46494f",
  [LAND]: "#777",
  [RUIN]: "#8e7a62",
};
function rr(c, x, y, w, h, r) {
  c.beginPath();
  if (c.roundRect) c.roundRect(x, y, w, h, r);
  else c.rect(x, y, w, h);
}

function drawTiles(x0, y0, x1, y1) {
  for (let y = y0; y <= y1; y++)
    for (let x = x0; x <= x1; x++) {
      const v = get(x, y),
        px = x * T,
        py = y * T,
        h = hash(x, y);
      if (v === BLD || v === LAND)
        ((ctx.fillStyle = COL[GRASS]),
          ctx.fillRect(px, py, T + 0.6, T + 0.6));
      else {
        ctx.fillStyle = COL[v];
        ctx.fillRect(px, py, T + 0.6, T + 0.6);
      }
      if (v === WALK) {
        ctx.fillStyle = "rgba(0,0,0,.07)";
        ctx.fillRect(px, py + 15, T, 1);
        ctx.fillRect(px + (y % 2 ? 8 : 24), py, 1, T);
      } else if (v === PLAZA) {
        ctx.fillStyle = "rgba(120,70,50,.12)";
        if ((x + y) % 2) ctx.fillRect(px, py, T, T);
        ctx.fillStyle = "rgba(0,0,0,.08)";
        ctx.fillRect(px, py, T, 1);
        ctx.fillRect(px, py, 1, T);
      } else if (v === GRASS || v === PARK) {
        if (h > 0.7) {
          ctx.fillStyle = "rgba(255,255,220,.06)";
          ctx.fillRect(px + h * 20, py + h * 14, 5, 4);
        }
      } else if (v === PITCH) {
        ctx.fillStyle =
          x % 2 ? "rgba(255,255,255,.06)" : "rgba(0,0,0,.04)";
        ctx.fillRect(px, py, T, T);
      } else if (v === LOT) {
        ctx.fillStyle = "rgba(255,255,255,.55)";
        ctx.fillRect(px, py, 2, 14);
        ctx.fillRect(px + 16, py, 2, 14);
      } else if (v === RAIL) {
        ctx.fillStyle = "#6d5c4a";
        for (let i = 0; i < 4; i++)
          ctx.fillRect(px + i * 8 + 1, py + 5, 4, 22);
        ctx.fillStyle = "#a9a9ad";
        ctx.fillRect(px, py + 9, T, 2.5);
        ctx.fillRect(px, py + 21, T, 2.5);
      } else if (v === ROAD && (y === 73 || y === 74)) {
        ctx.fillStyle = "#8f8f94";
        ctx.fillRect(px, py + 9, T, 2.5);
        ctx.fillRect(px, py + 21, T, 2.5);
      } else if (v === RUIN) {
        ctx.fillStyle = "#a38c70";
        ctx.fillRect(px + 2, py + 2, T - 4, 6);
        ctx.fillRect(px + 2, py + 2, 6, T - 4);
        ctx.fillStyle = "#6e5d49";
        ctx.fillRect(px + 2, py + 8, T - 4, 2);
      } else if (v === WATER) {
        ctx.fillStyle = "rgba(255,255,255,.08)";
        ctx.fillRect(
          px + ((h * 20 + performance.now() / 200) % T),
          py + h * 24,
          8,
          1.5,
        );
      }
      if (v === ROAD) {
        // asphalt wear: patched repairs and oil stains
        if (h > 0.82) {
          ctx.fillStyle = "rgba(0,0,0,.09)";
          ctx.fillRect(px + h * 10, py + hash(y, x) * 12, 14, 10);
        } else if (h < 0.06) {
          ctx.fillStyle = "rgba(255,255,255,.035)";
          ctx.fillRect(px + 4, py + 6, 20, 16);
        }
        // kerb where the road meets a pavement
        ctx.fillStyle = "rgba(210,205,195,.55)";
        if (get(x, y - 1) === WALK) ctx.fillRect(px, py, T + 0.6, 1.5);
        if (get(x, y + 1) === WALK) ctx.fillRect(px, py + T - 1.5, T + 0.6, 1.5);
        if (get(x - 1, y) === WALK) ctx.fillRect(px, py, 1.5, T + 0.6);
        if (get(x + 1, y) === WALK) ctx.fillRect(px + T - 1.5, py, 1.5, T + 0.6);
      }
      // wet surfaces: darker, glossy, with puddles that ripple in the rain
      if (
        weather.wet > 0.02 &&
        (v === ROAD || v === WALK || v === PLAZA || v === LOT)
      ) {
        ctx.fillStyle = `rgba(12,22,38,${(0.2 * weather.wet).toFixed(3)})`;
        ctx.fillRect(px, py, T + 0.6, T + 0.6);
        const ph = hash(x + 11, y + 5);
        if (ph > 0.86) {
          const cx = px + 8 + ph * 14,
            cy = py + 8 + hash(y, x + 3) * 14;
          ctx.fillStyle = `rgba(150,170,195,${(0.3 * weather.wet).toFixed(3)})`;
          ctx.beginPath();
          ctx.ellipse(cx, cy, 9 + ph * 5, 5 + ph * 2, 0, 0, 6.3);
          ctx.fill();
          if (weather.rain) {
            const rp = (performance.now() / 900 + ph * 7) % 1;
            ctx.strokeStyle = `rgba(220,230,245,${(0.5 * (1 - rp)).toFixed(3)})`;
            ctx.lineWidth = 1;
            ctx.beginPath();
            ctx.ellipse(cx, cy, 1 + rp * 7, 0.6 + rp * 3.5, 0, 0, 6.3);
            ctx.stroke();
          }
        }
      }
    }
}
function drawTrees(x0, y0, x1, y1) {
  for (let y = y0; y <= y1; y++)
    for (let x = x0; x <= x1; x++) {
      const v = get(x, y),
        h = hash(x, y);
      if (v === FOREST) {
        const px = x * T,
          py = y * T;
        ctx.fillStyle = shadowFill(0.85);
        ctx.beginPath();
        ctx.arc(px + 16 + SUN.x * 0.9, py + 16 + SUN.y * 0.9, 19, 0, 6.3);
        ctx.fill();
        ctx.fillStyle = h > 0.5 ? "#2e5a37" : "#284f30";
        ctx.beginPath();
        ctx.arc(
          px + 10 + h * 12,
          py + 12 + hash(y, x) * 10,
          15 + h * 5,
          0,
          6.3,
        );
        ctx.fill();
        ctx.fillStyle = h > 0.3 ? "#386a40" : "#335f3b";
        ctx.beginPath();
        ctx.arc(px + 18 - h * 6, py + 18, 11, 0, 6.3);
        ctx.fill();
      } else if (
        (v === PARK && h > 0.72) ||
        (v === WALK && h > 0.965 && x >= 15) ||
        (v === PLAZA && h > 0.95)
      ) {
        const px = x * T + 8 + h * 16,
          py = y * T + 8 + hash(y, x) * 16,
          r = v === PARK ? 13 : 9;
        ctx.fillStyle = shadowFill(0.85);
        ctx.beginPath();
        ctx.arc(px + SUN.x * 0.8, py + SUN.y * 0.8, r, 0, 6.3);
        ctx.fill();
        ctx.fillStyle = "#3d7a3f";
        ctx.beginPath();
        ctx.arc(px, py, r, 0, 6.3);
        ctx.fill();
        ctx.fillStyle = "#4f9150";
        ctx.beginPath();
        ctx.arc(px - 3, py - 3, r * 0.55, 0, 6.3);
        ctx.fill();
      }
    }
}
function drawRoadMarks(l, t, r, b) {
  ctx.strokeStyle = "rgba(240,236,225,.75)";
  ctx.lineWidth = 2;
  ctx.setLineDash([14, 14]);
  ctx.beginPath();
  for (const s of SEGS) {
    const ax = tc(s.a[0]),
      ay = tc(s.a[1]),
      bx = tc(s.b[0]),
      by = tc(s.b[1]);
    if (
      Math.max(ax, bx) < l ||
      Math.min(ax, bx) > r ||
      Math.max(ay, by) < t ||
      Math.min(ay, by) > b
    )
      continue;
    ctx.moveTo(ax, ay);
    ctx.lineTo(bx, by);
  }
  ctx.stroke();
  ctx.setLineDash([]);
  // Bahnübergang barriers
  ctx.fillStyle = "#d22";
  for (const yy of [72, 75]) {
    for (let k = 0; k < 3; k++) {
      ctx.fillStyle = k % 2 ? "#fff" : "#d22";
      ctx.fillRect(
        tc(94) + k * 10,
        yy * T + (yy === 72 ? 26 : 2),
        10,
        4,
      );
    }
  }
  // street name signs
  ctx.font = '600 11px "Atkinson Hyperlegible",system-ui,sans-serif';
  ctx.textBaseline = "middle";
  for (const s of SEGS) {
    const len = Math.abs(s.b[0] - s.a[0]) + Math.abs(s.b[1] - s.a[1]);
    for (let k = 6; k < len; k += 22) {
      const x = s.h
          ? tc(Math.min(s.a[0], s.b[0]) + k)
          : tc(s.a[0]) + T * 1.75,
        y = s.h
          ? tc(s.a[1]) - T * 1.75
          : tc(Math.min(s.a[1], s.b[1]) + k);
      if (x < l - 200 || x > r + 200 || y < t - 50 || y > b + 50)
        continue;
      const w = ctx.measureText(s.n).width + 12;
      ctx.fillStyle = "#fff";
      ctx.fillRect(x - w / 2 - 1, y - 9, w + 2, 18);
      ctx.fillStyle = "#1d3b74";
      ctx.fillRect(x - w / 2, y - 8, w, 16);
      ctx.fillStyle = "#fff";
      ctx.textAlign = "center";
      ctx.fillText(s.n, x, y + 1);
    }
  }
}
