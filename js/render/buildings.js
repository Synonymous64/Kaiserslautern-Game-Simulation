"use strict";
// Each building block gets a storey count; taller blocks cast longer shadows.
const bldHeight = (x, y) => {
  if (inPfaff(x, y)) return 1.6;
  const g = grp[idx(x, y)];
  return 0.9 + hash(g, 13) * 1.4;
};
function drawBuildings(x0, y0, x1, y1) {
  ctx.fillStyle = shadowFill();
  for (let y = y0 - 2; y <= y1 + 2; y++)
    for (let x = x0 - 2; x <= x1 + 2; x++) {
      if (get(x, y) !== BLD) continue;
      const k = bldHeight(x, y);
      ctx.fillRect(x * T + SUN.x * k, y * T + SUN.y * k, T + 0.6, T + 0.6);
    }
  for (let y = y0; y <= y1; y++)
    for (let x = x0; x <= x1; x++) {
      if (get(x, y) !== BLD) continue;
      const px = x * T,
        py = y * T;
      const c = roofCols(
        inPfaff(x, y)
          ? "#8a3b2b"
          : x >= 98 && y >= 60
            ? "#9a9da3"
            : groupColor[grp[idx(x, y)]],
      );
      ctx.fillStyle = c.top;
      ctx.fillRect(px, py, T + 0.6, T + 0.6);
      if (!isBld(x, y - 1)) {
        ctx.fillStyle = c.hi;
        ctx.fillRect(px, py, T + 0.6, 3);
      }
      // roof tiling texture
      ctx.fillStyle = "rgba(0,0,0,.06)";
      for (let k = 4; k < T; k += 6) ctx.fillRect(px, py + k, T + 0.6, 1);
      if (!isBld(x, y + 1)) {
        // south facade with a row of windows (camera looks slightly north)
        ctx.fillStyle = c.lo;
        ctx.fillRect(px, py + T - 9, T + 0.6, 9);
        ctx.fillStyle = "rgba(0,0,0,.25)";
        ctx.fillRect(px, py + T - 9, T + 0.6, 1.5);
        ctx.fillStyle = "rgba(170,200,225,.38)";
        ctx.fillRect(px + 6, py + T - 7, 6, 4);
        ctx.fillRect(px + 19, py + T - 7, 6, 4);
      }
      if (!isBld(x + 1, y)) {
        ctx.fillStyle = c.det;
        ctx.fillRect(px + T - 3, py, 3, T);
      }
      if (!isBld(x - 1, y)) {
        ctx.fillStyle = "rgba(255,255,255,.07)";
        ctx.fillRect(px, py, 2, T);
      }
      const h = hash(x, y);
      if (inPfaff(x, y)) {
        ctx.fillStyle = c.lo;
        ctx.fillRect(px, py + 10, T, 2);
        ctx.fillRect(px, py + 22, T, 2);
      } else if (h > 0.84) {
        ctx.fillStyle = c.det;
        ctx.fillRect(px + 6 + h * 10, py + 8, 6, 6);
      } else if (h < 0.08) {
        ctx.fillStyle = "rgba(160,200,230,.5)";
        ctx.fillRect(px + 8, py + 8, 14, 10);
      }
    }
}
function hip(x, y, w, h, col) {
  ctx.fillStyle = shadowFill();
  ctx.fillRect(x + SUN.x * 1.3, y + SUN.y * 1.3, w, h);
  ctx.fillStyle = col;
  ctx.fillRect(x, y, w, h);
  const i = Math.min(w, h) * 0.3;
  ctx.fillStyle = shade(col, 0.15);
  ctx.beginPath();
  ctx.moveTo(x, y);
  ctx.lineTo(x + w, y);
  ctx.lineTo(x + w - i, y + i);
  ctx.lineTo(x + i, y + i);
  ctx.fill();
  ctx.fillStyle = shade(col, -0.25);
  ctx.beginPath();
  ctx.moveTo(x, y + h);
  ctx.lineTo(x + w, y + h);
  ctx.lineTo(x + w - i, y + h - i);
  ctx.lineTo(x + i, y + h - i);
  ctx.fill();
  ctx.fillStyle = shade(col, -0.1);
  ctx.beginPath();
  ctx.moveTo(x + w, y);
  ctx.lineTo(x + w, y + h);
  ctx.lineTo(x + w - i, y + h - i);
  ctx.lineTo(x + w - i, y + i);
  ctx.fill();
}
function spire(x, y, s, col) {
  // long pointed shadow cast away from the sun
  const sl = Math.hypot(SUN.x, SUN.y) || 1,
    ux = SUN.x / sl,
    uy = SUN.y / sl;
  ctx.fillStyle = shadowFill(1.15);
  ctx.beginPath();
  ctx.moveTo(x - uy * s, y + ux * s);
  ctx.lineTo(x + SUN.x * s * 0.3, y + SUN.y * s * 0.3);
  ctx.lineTo(x + uy * s, y - ux * s);
  ctx.fill();
  const q = [
    [x - s, y - s],
    [x + s, y - s],
    [x + s, y + s],
    [x - s, y + s],
  ];
  const f = [0.2, -0.1, -0.3, 0.05];
  for (let i = 0; i < 4; i++) {
    ctx.fillStyle = shade(col, f[i]);
    ctx.beginPath();
    ctx.moveTo(x, y);
    ctx.lineTo(q[i][0], q[i][1]);
    ctx.lineTo(q[(i + 1) % 4][0], q[(i + 1) % 4][1]);
    ctx.fill();
  }
}
function label(text, x, y, size = 15) {
  ctx.font = `700 ${size}px "Barlow Condensed","Arial Narrow",sans-serif`;
  ctx.textAlign = "center";
  ctx.textBaseline = "middle";
  ctx.lineWidth = 4;
  ctx.strokeStyle = "rgba(12,20,15,.85)";
  ctx.strokeText(text.toUpperCase(), x, y);
  ctx.fillStyle = "#f4efe6";
  ctx.fillText(text.toUpperCase(), x, y);
}
function drawLandmarks(l, t, r, b) {
  for (const L of LANDMARKS) {
    const x = L.x1 * T,
      y = L.y1 * T,
      w = (L.x2 - L.x1 + 1) * T,
      h = (L.y2 - L.y1 + 1) * T;
    if (
      x > r + 300 ||
      x + w < l - 300 ||
      y > b + 300 ||
      y + h < t - 300
    )
      continue;
    if (L.kind === "church") {
      hip(
        x + T * 1.4,
        y + T * 0.7,
        w - T * 1.6,
        h - T * 1.4,
        "#7d3426",
      );
      spire(x + T * 0.9, y + h / 2, T * 0.85, "#9c4130");
      spire(x + T * 2.6, y + T * 0.55, T * 0.45, "#9c4130");
      spire(x + T * 2.6, y + h - T * 0.55, T * 0.45, "#9c4130");
      ctx.strokeStyle = "rgba(255,230,200,.25)";
      ctx.lineWidth = 1.5;
      ctx.beginPath();
      ctx.moveTo(x + T * 1.4, y + h / 2);
      ctx.lineTo(x + w - T * 0.2, y + h / 2);
      ctx.stroke();
    } else if (L.kind === "tower") {
      ctx.fillStyle = shadowFill(0.95);
      ctx.beginPath();
      ctx.moveTo(x + w * 0.15, y + h * 0.1);
      ctx.lineTo(x + w * 0.85, y + h * 0.1);
      ctx.lineTo(x + w * 0.85 + SUN.x * 8, y + h * 0.9 + SUN.y * 8);
      ctx.lineTo(x + w * 0.15 + SUN.x * 8, y + h * 0.9 + SUN.y * 8);
      ctx.fill();
      ctx.fillStyle = "#8e9196";
      ctx.fillRect(x, y, w, h);
      ctx.fillStyle = "#a9acb1";
      ctx.fillRect(x + w * 0.15, y + h * 0.1, w * 0.7, h * 0.8);
      ctx.fillStyle = "rgba(40,60,80,.55)";
      for (let i = 1; i < 6; i++)
        ctx.fillRect(
          x + w * 0.15,
          y + h * 0.1 + (i * h * 0.8) / 6,
          w * 0.7,
          2,
        );
      for (let i = 1; i < 5; i++)
        ctx.fillRect(
          x + w * 0.15 + (i * w * 0.7) / 5,
          y + h * 0.1,
          2,
          h * 0.8,
        );
      ctx.fillStyle = "#d8dadd";
      ctx.beginPath();
      ctx.arc(x + w / 2, y + h / 2, T * 0.55, 0, 6.3);
      ctx.fill();
      ctx.fillStyle = "#c4472f";
      ctx.fillRect(x + w / 2 - 2, y + h / 2 - T * 0.55 - 10, 4, 10);
    } else if (L.kind === "mall") {
      ctx.fillStyle = shadowFill();
      ctx.fillRect(x + SUN.x * 1.3, y + SUN.y * 1.3, w, h);
      ctx.fillStyle = "#c9c5bd";
      ctx.fillRect(x, y, w, h);
      ctx.fillStyle = "rgba(150,190,215,.6)";
      for (let i = 0; i < 3; i++)
        ctx.fillRect(x + 16, y + 18 + (i * h) / 3.4, w - 32, 10);
      ctx.font = '800 34px "Barlow Condensed",sans-serif';
      ctx.textAlign = "center";
      ctx.textBaseline = "middle";
      ctx.fillStyle = "#c4472f";
      ctx.fillText("IM K", x + w / 2, y + h / 2 + 4);
    } else if (L.kind === "hall") {
      hip(x, y, w, h, L.col);
    } else if (L.kind === "station") {
      ctx.fillStyle = shadowFill();
      ctx.fillRect(x + SUN.x * 1.3, y + SUN.y * 1.3, w, h);
      ctx.fillStyle = "#7f8a93";
      ctx.fillRect(x, y, w, h);
      ctx.fillStyle = "#b9a07f";
      ctx.fillRect(x + w / 2 - T * 1.5, y, T * 3, h);
      ctx.fillStyle = "rgba(180,210,230,.35)";
      for (let i = 0; i < w; i += 12)
        ctx.fillRect(x + i, y + h - 12, 6, 10);
      ctx.fillStyle = "#fff";
      ctx.beginPath();
      ctx.arc(x + w / 2, y + T * 0.8, 9, 0, 6.3);
      ctx.fill();
      ctx.strokeStyle = "#222";
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.moveTo(x + w / 2, y + T * 0.8);
      ctx.lineTo(x + w / 2, y + T * 0.8 - 6);
      ctx.moveTo(x + w / 2, y + T * 0.8);
      ctx.lineTo(x + w / 2 + 5, y + T * 0.8);
      ctx.stroke();
    } else if (L.kind === "campus") {
      ctx.fillStyle = shadowFill();
      ctx.fillRect(x + SUN.x * 1.3, y + SUN.y * 1.3, w, h);
      ctx.fillStyle = "#9fa2a7";
      ctx.fillRect(x, y, w, h);
      ctx.fillStyle = "#878a90";
      ctx.fillRect(x + 10, y + 10, 18, 14);
      ctx.fillRect(x + w - 34, y + h - 26, 22, 14);
      ctx.fillStyle = "#b5b8bd";
      ctx.fillRect(x, y, w, 3);
    }
  }
  // stadium
  {
    const x = 3 * T,
      y = 35 * T,
      w = 21 * T,
      h = 15 * T;
    if (!(x > r || x + w < l || y > b || y + h < t)) {
      ctx.fillStyle = shadowFill();
      ctx.fillRect(x + SUN.x * 1.6, y + SUN.y * 1.6, w, h);
      ctx.fillStyle = "#5a1414";
      ctx.fillRect(x, y, w, h);
      ctx.fillStyle = "#a52222";
      ctx.fillRect(x + T * 0.6, y + T * 0.6, w - T * 1.2, h - T * 1.2);
      ctx.strokeStyle = "rgba(0,0,0,.25)";
      ctx.lineWidth = 1;
      for (let i = 1; i < 4; i++) {
        ctx.strokeRect(
          x + T * 0.6 + i * T * 0.55,
          y + T * 0.6 + i * T * 0.55,
          w - T * 1.2 - i * T * 1.1,
          h - T * 1.2 - i * T * 1.1,
        );
      }
      const px = 6 * T,
        py = 38 * T,
        pw = 15 * T,
        ph = 9 * T;
      for (let i = 0; i < 15; i++) {
        ctx.fillStyle = i % 2 ? "#3f8f3a" : "#479a41";
        ctx.fillRect(px + i * T, py, T, ph);
      }
      ctx.strokeStyle = "rgba(255,255,255,.85)";
      ctx.lineWidth = 2;
      ctx.strokeRect(px + 8, py + 8, pw - 16, ph - 16);
      ctx.beginPath();
      ctx.moveTo(px + pw / 2, py + 8);
      ctx.lineTo(px + pw / 2, py + ph - 8);
      ctx.stroke();
      ctx.beginPath();
      ctx.arc(px + pw / 2, py + ph / 2, T * 1.3, 0, 6.3);
      ctx.stroke();
      ctx.strokeRect(px + 8, py + ph / 2 - T * 2, T * 2, T * 4);
      ctx.strokeRect(
        px + pw - 8 - T * 2,
        py + ph / 2 - T * 2,
        T * 2,
        T * 4,
      );
      ctx.fillStyle = "#3b3e44";
      ctx.fillRect(12 * T, 47 * T, 3 * T, 3 * T);
      for (const [cx, cy] of [
        [x + 6, y + 6],
        [x + w - 6, y + 6],
        [x + 6, y + h - 6],
        [x + w - 6, y + h - 6],
      ]) {
        ctx.fillStyle = "#ddd";
        ctx.fillRect(cx - 6, cy - 6, 12, 12);
      }
      ctx.font = '800 22px "Barlow Condensed",sans-serif';
      ctx.fillStyle = "rgba(255,255,255,.85)";
      ctx.textAlign = "center";
      ctx.textBaseline = "middle";
      ctx.fillText("BETZE", x + w / 2, y + T * 0.32 + 4);
    }
  }
  // pfaff chimney
  {
    const cx = tc(38),
      cy = tc(22);
    ctx.fillStyle = shadowFill();
    ctx.beginPath();
    ctx.moveTo(cx - 7, cy);
    ctx.lineTo(cx + 7, cy);
    ctx.lineTo(cx + 7 + SUN.x * 8, cy + SUN.y * 8);
    ctx.lineTo(cx - 7 + SUN.x * 8, cy + SUN.y * 8);
    ctx.fill();
    ctx.fillStyle = "#6e2f22";
    ctx.beginPath();
    ctx.arc(cx, cy, 12, 0, 6.3);
    ctx.fill();
    ctx.fillStyle = "#2a1a16";
    ctx.beginPath();
    ctx.arc(cx, cy, 6, 0, 6.3);
    ctx.fill();
  }
}
function drawLabels(l, t, r, b) {
  const items = [
    ["Stiftskirche", 61, 38],
    [{ en: "Town Hall · 84 m", de: "Rathaus · 84 m" }, 71, 19],
    ["Im K", 50.5, 31.2],
    ["Fruchthalle", 61, 47.4],
    ["Pfalztheater", 74, 46.4],
    [{ en: "Main Station", de: "Hauptbahnhof" }, 58, 72.3],
    ["Stadion Betzenberg", 13, 33.8],
    ["Pfaff-Quartier", 38.5, 16.4],
    ["Kaiserpfalz", 77.5, 18.4],
    ["Gartenschau", 95, 1.2],
    [{ en: "Japanese Garden", de: "Japanischer Garten" }, 101, 9.6],
    [{ en: "City Park", de: "Stadtpark" }, 38, 51],
    ["Campus", 108, 74.8],
    ["Fackelstraße", 56, 49],
    ["Stiftsplatz", 54, 40],
  ];
  for (const [n, x, y] of items) {
    const px = x * T + 16,
      py = y * T;
    if (px < l - 200 || px > r + 200 || py < t - 40 || py > b + 40)
      continue;
    const s = tr(n);
    label(s, px, py, s.length > 14 ? 14 : 16);
  }
  ctx.font = '600 11px "Atkinson Hyperlegible",sans-serif';
  for (const k in POIS) {
    const p = POIS[k],
      px = tc(p.x),
      py = tc(p.y);
    if (px < l - 100 || px > r + 100 || py < t - 40 || py > b + 40)
      continue;
    if (p.kind === "bus") {
      ctx.fillStyle = "#555";
      ctx.fillRect(px - 1, py - 2, 2, 12);
      ctx.fillStyle = "#f2c230";
      ctx.beginPath();
      ctx.arc(px, py - 8, 8, 0, 6.3);
      ctx.fill();
      ctx.fillStyle = "#1f7a3a";
      ctx.font = '800 11px "Barlow Condensed",sans-serif';
      ctx.textAlign = "center";
      ctx.textBaseline = "middle";
      ctx.fillText("H", px, py - 7.5);
      continue;
    }
    const col =
      p.kind === "food"
        ? "#c4472f"
        : p.kind === "pfand"
          ? "#2f8f4a"
          : "#1d3b74";
    ctx.fillStyle = col;
    rr(ctx, px - 7, py - 7, 14, 14, 4);
    ctx.fill();
    ctx.fillStyle = "#fff";
    ctx.font = '800 10px "Barlow Condensed",sans-serif';
    ctx.textAlign = "center";
    ctx.textBaseline = "middle";
    ctx.fillText(
      p.kind === "food" ? "€" : p.kind === "pfand" ? "P" : "i",
      px,
      py + 0.5,
    );
    ctx.font = '600 11px "Atkinson Hyperlegible",sans-serif';
    ctx.lineWidth = 3;
    ctx.strokeStyle = "rgba(12,20,15,.75)";
    ctx.strokeText(tr(p.name), px, py + 16);
    ctx.fillStyle = "#fff";
    ctx.fillText(tr(p.name), px, py + 16);
  }
}
