"use strict";
// =================== SPRITES: vehicles, people, speech bubbles ===================

/** Rotate the world-space sun vector into a sprite's local frame. */
function localShadow(a, k) {
  const c = Math.cos(a),
    s = Math.sin(a);
  return [(SUN.x * c + SUN.y * s) * k, (-SUN.x * s + SUN.y * c) * k];
}

function drawVeh(v) {
  const d = VT[v.type],
    L = d.len,
    Wd = d.wid,
    a = v.ra ?? v.a;
  const now = performance.now();
  ctx.save();
  ctx.translate(v.x, v.y);
  ctx.rotate(a);
  const [sx, sy] = localShadow(a, 0.45);

  // ---- two-wheelers ----
  if (v.type === "bike" || v.type === "escooter") {
    ctx.fillStyle = shadowFill(0.9);
    ctx.fillRect(-L / 2 + sx, -2 + sy, L, 5);
    ctx.fillStyle = "#1c1c1c";
    ctx.beginPath();
    ctx.ellipse(-L / 2 + 3, 0, 3.5, 1.8, 0, 0, 6.3);
    ctx.ellipse(L / 2 - 3, 0, 3.5, 1.8, 0, 0, 6.3);
    ctx.fill();
    ctx.fillStyle = v.color;
    ctx.fillRect(-L / 2 + 3, -1.5, L - 6, 3);
    ctx.fillStyle = "#333";
    ctx.fillRect(L / 2 - (v.type === "escooter" ? 5 : 7), -5, 2, 10);
    if (v.type === "escooter") {
      ctx.fillStyle = "#37b24d";
      ctx.fillRect(-L / 2 + 4, -1, 4, 2);
    }
    if (P.veh === v) {
      ctx.fillStyle = "#3a4a3a";
      ctx.fillRect(-9, -4, 4, 8);
      ctx.fillStyle = "#c4472f";
      ctx.beginPath();
      ctx.ellipse(-1, 0, 5, 6.5, 0, 0, 6.3);
      ctx.fill();
      ctx.fillStyle = "#2a2d33";
      ctx.fillRect(3, -5.5, 4, 2);
      ctx.fillRect(3, 3.5, 4, 2);
      ctx.fillStyle = P.skin || "#d9a57b";
      ctx.beginPath();
      ctx.arc(2, 0, 3.5, 0, 6.3);
      ctx.fill();
      ctx.fillStyle = "#e9ecef";
      ctx.beginPath();
      ctx.arc(1.5, 0, 3.6, Math.PI * 0.6, Math.PI * 1.4);
      ctx.fill();
    }
    ctx.restore();
    return;
  }

  // ---- ground shadow ----
  ctx.fillStyle = shadowFill(1.1);
  rr(ctx, -L / 2 + sx, -Wd / 2 + sy, L, Wd, 5);
  ctx.fill();

  // ---- tractor ----
  if (v.type === "tractor") {
    ctx.fillStyle = "#1d1d1d";
    ctx.fillRect(-L / 2, -Wd / 2 - 2, 12, 5);
    ctx.fillRect(-L / 2, Wd / 2 - 3, 12, 5);
    ctx.fillRect(L / 2 - 10, -Wd / 2, 7, 4);
    ctx.fillRect(L / 2 - 10, Wd / 2 - 4, 7, 4);
    ctx.fillStyle = v.color;
    rr(ctx, -L / 2 + 2, -Wd / 2 + 3, L - 4, Wd - 6, 3);
    ctx.fill();
    ctx.fillStyle = "#e9e6dc";
    ctx.fillRect(-L / 2 + 4, -Wd / 2 + 5, 13, Wd - 10);
    ctx.fillStyle = "#223";
    ctx.fillRect(L / 2 - 6, -3, 4, 6);
    ctx.fillStyle = "#555";
    ctx.beginPath();
    ctx.arc(L / 2 - 14, -Wd / 2 + 6, 2, 0, 6.3);
    ctx.fill();
    ctx.restore();
    return;
  }

  // ---- body ----
  // wheels peeking out
  ctx.fillStyle = "#151515";
  const wx = L * 0.3;
  for (const ex of [wx, -wx])
    for (const ey of [-1, 1]) ctx.fillRect(ex - 4, ey * (Wd / 2) - 2, 8, 4);
  const body = v.color;
  ctx.fillStyle = body;
  rr(ctx, -L / 2, -Wd / 2, L, Wd, v.type === "bus" ? 4 : 7);
  ctx.fill();
  // side shading for volume
  ctx.fillStyle = "rgba(0,0,0,.16)";
  ctx.fillRect(-L / 2 + 3, Wd / 2 - 3, L - 6, 3);
  ctx.fillStyle = "rgba(255,255,255,.14)";
  ctx.fillRect(-L / 2 + 3, -Wd / 2 + 1, L - 6, 2);

  if (v.type === "bus") {
    ctx.fillStyle = "rgba(25,35,50,.9)";
    ctx.fillRect(L / 2 - 9, -Wd / 2 + 3, 6, Wd - 6);
    ctx.fillStyle = "rgba(255,255,255,.2)";
    ctx.fillRect(-L / 2 + 6, -Wd / 2 + 4, L - 18, Wd - 8);
    ctx.fillStyle = "rgba(0,0,0,.25)";
    for (let i = -L / 2 + 14; i < L / 2 - 14; i += 14)
      ctx.fillRect(i, -Wd / 2 + 4, 2, Wd - 8);
    // roof AC units
    ctx.fillStyle = "rgba(230,230,230,.7)";
    ctx.fillRect(-L * 0.25, -5, 14, 10);
    ctx.fillStyle = "#1d3b74";
    ctx.font = '800 11px "Barlow Condensed",sans-serif';
    ctx.textAlign = "center";
    ctx.textBaseline = "middle";
    ctx.fillText("105", L * 0.15, 1);
  } else {
    // windscreen, rear window, roof
    ctx.fillStyle = "rgba(28,40,56,.9)";
    ctx.beginPath();
    ctx.moveTo(L * 0.12, -Wd / 2 + 3);
    ctx.lineTo(L * 0.3, -Wd / 2 + 4);
    ctx.lineTo(L * 0.3, Wd / 2 - 4);
    ctx.lineTo(L * 0.12, Wd / 2 - 3);
    ctx.closePath();
    ctx.fill();
    ctx.fillRect(-L * 0.36, -Wd / 2 + 4, L * 0.1, Wd - 8);
    ctx.fillStyle = shade(body.length === 7 ? body : "#888888", 0.12);
    ctx.fillRect(-L * 0.26, -Wd / 2 + 3, L * 0.38, Wd - 6);
    // windscreen glare
    ctx.fillStyle = "rgba(255,255,255,.18)";
    ctx.fillRect(L * 0.16, -Wd / 2 + 4, 2, Wd - 8);
    // mirrors
    ctx.fillStyle = body;
    ctx.fillRect(L * 0.1, -Wd / 2 - 2, 3, 2.5);
    ctx.fillRect(L * 0.1, Wd / 2 - 0.5, 3, 2.5);
    if (v.type === "taxi") {
      ctx.fillStyle = "#f2c230";
      ctx.fillRect(-5, -4, 10, 8);
      ctx.fillStyle = "#111";
      ctx.font = "700 6px sans-serif";
      ctx.textAlign = "center";
      ctx.textBaseline = "middle";
      ctx.fillText("TAXI", 0, 0.5);
    }
    if (v.type === "van") {
      ctx.fillStyle = "#1d4f9c";
      ctx.fillRect(-L / 2, -1.5, L, 3);
      const ph = ((now / 180) | 0) % 2;
      ctx.fillStyle = ph ? "#3a7bff" : "#2a3c66";
      ctx.fillRect(-2, -Wd / 2 + 2, 6, Wd / 2 - 2);
      ctx.fillStyle = ph ? "#4a1414" : "#ff3333";
      ctx.fillRect(-2, 0, 6, Wd / 2 - 2);
    }
  }

  // ---- lights ----
  ctx.fillStyle = "#fffbe0";
  ctx.fillRect(L / 2 - 2, -Wd / 2 + 2, 2, 4);
  ctx.fillRect(L / 2 - 2, Wd / 2 - 6, 2, 4);
  const brake = !!v.braking;
  ctx.fillStyle = brake ? "#ff2a1f" : "#8f1717";
  const bw = brake ? 3 : 2;
  ctx.fillRect(-L / 2, -Wd / 2 + 2, bw, 4);
  ctx.fillRect(-L / 2, Wd / 2 - 6, bw, 4);
  // indicators (blink at ~1.5 Hz)
  const turn = v.ai ? v.ai.turn : 0;
  if (turn && ((now / 330) | 0) % 2) {
    const sy2 = turn > 0 ? Wd / 2 - 2 : -Wd / 2;
    ctx.fillStyle = "#ffa41b";
    ctx.fillRect(L / 2 - 4, sy2, 4, 2);
    ctx.fillRect(-L / 2, sy2, 4, 2);
  }
  ctx.restore();
}

function drawPerson(x, y, a, shirt, skin, opts = {}) {
  ctx.save();
  ctx.translate(x, y);
  ctx.rotate(a);
  const [sx, sy] = localShadow(a, 0.35);
  if (opts.knock) {
    ctx.rotate(opts.ka || 0);
    ctx.fillStyle = shadowFill(0.8);
    ctx.beginPath();
    ctx.ellipse(2, 3, 11, 6, 0, 0, 6.3);
    ctx.fill();
    ctx.fillStyle = shirt;
    ctx.beginPath();
    ctx.ellipse(0, 0, 10, 5, 0, 0, 6.3);
    ctx.fill();
    ctx.fillStyle = skin;
    ctx.beginPath();
    ctx.arc(10, 0, 3.5, 0, 6.3);
    ctx.fill();
    ctx.restore();
    return;
  }
  ctx.fillStyle = shadowFill(0.8);
  ctx.beginPath();
  ctx.ellipse(sx, sy, 6, 7, 0, 0, 6.3);
  ctx.fill();
  const sw = Math.sin((opts.t || 0) * 12) * 3;
  // legs
  ctx.fillStyle = opts.legs || "#2a2d33";
  ctx.fillRect(-2 + sw, -5, 4, 3);
  ctx.fillRect(-2 - sw, 2, 4, 3);
  if (opts.pack) {
    ctx.fillStyle = "#3a4a3a";
    ctx.fillRect(-9, -4.5, 5, 9);
  }
  // torso + swinging arms
  ctx.fillStyle = shade(shirt.length === 7 ? shirt : "#777777", -0.15);
  ctx.fillRect(-1 - sw * 0.6, -7.5, 3, 2.2);
  ctx.fillRect(-1 + sw * 0.6, 5.3, 3, 2.2);
  ctx.fillStyle = shirt;
  ctx.beginPath();
  ctx.ellipse(0, 0, 4.5, 6.5, 0, 0, 6.3);
  ctx.fill();
  if (opts.vest) {
    ctx.fillStyle = "#d8e24a";
    ctx.fillRect(-3, -5, 5, 10);
  }
  ctx.fillStyle = skin;
  ctx.beginPath();
  ctx.arc(1, 0, 3.6, 0, 6.3);
  ctx.fill();
  if (opts.hair) {
    ctx.fillStyle = opts.hair;
    ctx.beginPath();
    ctx.arc(0.5, 0, 3.7, Math.PI * 0.55, Math.PI * 1.45);
    ctx.fill();
  }
  if (opts.cap) {
    ctx.fillStyle = opts.cap;
    ctx.beginPath();
    ctx.arc(1, 0, 3.8, Math.PI / 2, Math.PI * 1.5);
    ctx.fill();
  }
  ctx.restore();
  if (opts.umbrella) {
    ctx.fillStyle = shadowFill(0.6);
    ctx.beginPath();
    ctx.arc(x + SUN.x * 0.5, y + SUN.y * 0.5, 11, 0, 6.3);
    ctx.fill();
    ctx.fillStyle = opts.umbrella;
    ctx.beginPath();
    ctx.arc(x, y - 2, 11, 0, 6.3);
    ctx.fill();
    ctx.strokeStyle = "rgba(0,0,0,.22)";
    ctx.lineWidth = 1;
    ctx.beginPath();
    for (let k = 0; k < 4; k++) {
      const aa = (k / 4) * Math.PI;
      ctx.moveTo(x - Math.cos(aa) * 11, y - 2 - Math.sin(aa) * 11);
      ctx.lineTo(x + Math.cos(aa) * 11, y - 2 + Math.sin(aa) * 11);
    }
    ctx.stroke();
  }
}

function drawBubble(x, y, text) {
  ctx.font = '600 12px "Atkinson Hyperlegible",sans-serif';
  const w = ctx.measureText(text).width + 14;
  ctx.fillStyle = "rgba(0,0,0,.18)";
  rr(ctx, x - w / 2 + 2, y - 32, w, 22, 8);
  ctx.fill();
  ctx.fillStyle = "rgba(255,255,255,.96)";
  rr(ctx, x - w / 2, y - 34, w, 22, 8);
  ctx.fill();
  ctx.beginPath();
  ctx.moveTo(x - 5, y - 12.5);
  ctx.lineTo(x + 5, y - 12.5);
  ctx.lineTo(x, y - 6);
  ctx.fill();
  ctx.fillStyle = "#1a1a1a";
  ctx.textAlign = "center";
  ctx.textBaseline = "middle";
  ctx.fillText(text, x, y - 23);
}
