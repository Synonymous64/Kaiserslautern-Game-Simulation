// minimap base
import { tr } from "../core/i18n.js";
import {
  $, BLD, clamp, FOREST, GRASS, LAND, LOT, map, MH, MW, PARK, PITCH, PLAZA, RAIL, ROAD, RUIN, T,
  tc, WALK, WATER,
} from "../core/utils.js";
import { POIS } from "../world/world.js";
import { game, P } from "../core/state.js";
import { M, missionTarget } from "../systems/missions.js";
import { pos } from "../ui/feedback.js";
import { routeTo } from "../systems/route.js";

const miniBase = document.createElement("canvas");
miniBase.width = MW;
miniBase.height = MH;
{
  const m = miniBase.getContext("2d"),
    img = m.createImageData(MW, MH);
  const MC = {
    [GRASS]: [85, 125, 60],
    [ROAD]: [225, 220, 205],
    [WALK]: [150, 140, 128],
    [BLD]: [120, 70, 55],
    [PARK]: [95, 143, 65],
    [FOREST]: [36, 69, 45],
    [WATER]: [63, 115, 147],
    [PLAZA]: [194, 171, 144],
    [RAIL]: [70, 64, 58],
    [PITCH]: [63, 143, 58],
    [LOT]: [90, 90, 96],
    [LAND]: [200, 90, 60],
    [RUIN]: [142, 122, 98],
  };
  for (let i = 0; i < map.length; i++) {
    const c = MC[map[i]];
    img.data.set([c[0], c[1], c[2], 255], i * 4);
  }
  m.putImageData(img, 0, 0);
}
const mini = $("mini"),
  mctx = mini.getContext("2d");
export function target() {
  if (game.job) {
    const t = game.job.phase === "pickup" ? game.job.from : game.job.to;
    return {
      x: tc(t.x),
      y: tc(t.y),
      name: tr(game.job.phase === "pickup" ? game.job.from.name : game.job.to.name),
    };
  }
  if (game.state === "title") return null;
  return missionTarget();
}
export function drawMini() {
  const q = pos(),
    s = 2;
  mctx.setTransform(1, 0, 0, 1, 0, 0);
  mctx.fillStyle = "#24452d";
  mctx.fillRect(0, 0, 240, 180);
  const ox = 120 - (q.x / T) * s,
    oy = 90 - (q.y / T) * s;
  mctx.imageSmoothingEnabled = false;
  mctx.drawImage(miniBase, ox, oy, MW * s, MH * s);
  const tg = target();
  if (tg) {
    // sat-nav route along the streets
    const pts = routeTo(q, tg);
    mctx.strokeStyle = "rgba(242,194,48,.95)";
    mctx.lineWidth = 3;
    mctx.lineJoin = "round";
    mctx.beginPath();
    pts.forEach((p, i) => (i ? mctx.lineTo : mctx.moveTo).call(mctx, ox + (p.x / T) * s, oy + (p.y / T) * s));
    mctx.stroke();
    let tx = ox + (tg.x / T) * s,
      ty = oy + (tg.y / T) * s;
    tx = clamp(tx, 6, 234);
    ty = clamp(ty, 6, 174);
    mctx.fillStyle = "#f2c230";
    mctx.strokeStyle = "#111";
    mctx.lineWidth = 2;
    mctx.beginPath();
    mctx.arc(tx, ty, 5, 0, 6.3);
    mctx.fill();
    mctx.stroke();
  }
  if (M) for (const k of M.pickups) {
    mctx.fillStyle = "#7fcf8a";
    mctx.fillRect(ox + (k.x / T) * s - 2, oy + (k.y / T) * s - 2, 4, 4);
  }
  mctx.fillStyle = "#6fa8ff";
  for (const c of game.chasers) {
    mctx.fillRect(ox + (c.x / T) * s - 2, oy + (c.y / T) * s - 2, 4, 4);
  }
  mctx.save();
  mctx.translate(120, 90);
  mctx.rotate(P.onFoot ? P.a : P.veh.a);
  mctx.fillStyle = "#fff";
  mctx.strokeStyle = "#c4472f";
  mctx.lineWidth = 2;
  mctx.beginPath();
  mctx.moveTo(7, 0);
  mctx.lineTo(-5, -5);
  mctx.lineTo(-3, 0);
  mctx.lineTo(-5, 5);
  mctx.closePath();
  mctx.fill();
  mctx.stroke();
  mctx.restore();
}
export function drawBigMap() {
  const c = $("bigcv"),
    m = c.getContext("2d"),
    s = 7;
  m.setTransform(1, 0, 0, 1, 0, 0);
  m.imageSmoothingEnabled = false;
  m.drawImage(miniBase, 0, 0, MW * s, MH * s);
  m.font = '700 15px "Barlow Condensed",sans-serif';
  m.textAlign = "center";
  m.textBaseline = "middle";
  for (const [n, x, y] of [
    ["Stiftskirche", 61, 37.5],
    ["Rathaus", 71, 18.6],
    ["Hbf", 58, 76.6],
    ["Betzenberg", 13, 33],
    ["Pfaff", 38.5, 16.4],
    ["Gartenschau", 95, 13.4],
    ["Campus", 108, 73.6],
    ["Stadtpark", 38, 51],
    ["Im K", 51, 35],
    ["Theater", 74, 50],
  ]) {
    m.lineWidth = 4;
    m.strokeStyle = "rgba(0,0,0,.7)";
    m.strokeText(n.toUpperCase(), x * s, y * s);
    m.fillStyle = "#fff";
    m.fillText(n.toUpperCase(), x * s, y * s);
  }
  for (const k in POIS) {
    const p = POIS[k];
    m.fillStyle =
      p.kind === "food"
        ? "#c4472f"
        : p.kind === "bus"
          ? "#f2c230"
          : p.kind === "pfand"
            ? "#2f8f4a"
            : "#6fa8ff";
    m.beginPath();
    m.arc((tc(p.x) / T) * s, (tc(p.y) / T) * s, 4, 0, 6.3);
    m.fill();
  }
  const tg = target();
  if (tg) {
    m.fillStyle = "#f2c230";
    m.strokeStyle = "#111";
    m.lineWidth = 2;
    m.beginPath();
    m.arc((tg.x / T) * s, (tg.y / T) * s, 8, 0, 6.3);
    m.fill();
    m.stroke();
  }
  const q = pos();
  m.fillStyle = "#fff";
  m.strokeStyle = "#c4472f";
  m.lineWidth = 3;
  m.beginPath();
  m.arc((q.x / T) * s, (q.y / T) * s, 6, 0, 6.3);
  m.fill();
  m.stroke();
}

export function darkness() {
  const h = (game.clock / 60) % 24;
  if (h >= 7 && h < 18) return 0;
  if (h >= 18 && h < 21) return ((h - 18) / 3) * 0.62;
  if (h >= 21 || h < 5) return 0.62;
  return ((7 - h) / 2) * 0.62;
}
export function clockStr() {
  const m = Math.floor(game.clock) % 1440;
  return (
    String(Math.floor(m / 60)).padStart(2, "0") +
    ":" +
    String(m % 60).padStart(2, "0")
  );
}
