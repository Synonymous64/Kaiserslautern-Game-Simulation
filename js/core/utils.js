"use strict";
// =================== CONSTANTS & HELPERS ===================
const T = 32,
  MW = 120,
  MH = 90;
const GRASS = 0,
  ROAD = 1,
  WALK = 2,
  BLD = 3,
  PARK = 4,
  FOREST = 5,
  WATER = 6,
  PLAZA = 7,
  RAIL = 8,
  PITCH = 9,
  LOT = 10,
  LAND = 11,
  RUIN = 12;
const map = new Uint8Array(MW * MH);
const grp = new Int32Array(MW * MH).fill(-1);
const idx = (x, y) => y * MW + x;
const inb = (x, y) => x >= 0 && y >= 0 && x < MW && y < MH;
const get = (x, y) => (inb(x, y) ? map[idx(x, y)] : FOREST);
const set = (x, y, v) => {
  if (inb(x, y)) map[idx(x, y)] = v;
};
const rect = (x1, y1, x2, y2, v, cond) => {
  for (let y = y1; y <= y2; y++)
    for (let x = x1; x <= x2; x++) {
      if (!inb(x, y)) continue;
      if (cond && !cond(get(x, y))) continue;
      set(x, y, v);
    }
};
const hash = (x, y) => {
  let h = (x * 374761393 + y * 668265263) | 0;
  h = Math.imul(h ^ (h >>> 13), 1274126177);
  return ((h ^ (h >>> 16)) >>> 0) / 4294967296;
};
const clamp = (v, a, b) => (v < a ? a : v > b ? b : v);
const dist = (ax, ay, bx, by) => Math.hypot(ax - bx, ay - by);
const pick = (a) => a[Math.floor(Math.random() * a.length)];
const tc = (t) => (t + 0.5) * T;
const tileAtPx = (x, y) => get(Math.floor(x / T), Math.floor(y / T));
const angDiff = (a, b) => {
  let d = b - a;
  while (d > Math.PI) d -= Math.PI * 2;
  while (d < -Math.PI) d += Math.PI * 2;
  return d;
};
const eur = (n) => {
  const s = (Math.round(n * 100) / 100).toFixed(2);
  return (n < 0 ? "−€" : "€") + (SETTINGS.lang === "de" ? s.replace("-", "").replace(".", ",") : s.replace("-", ""));
};
const $ = (id) => document.getElementById(id);

