"use strict";
// =================== VEHICLES ===================
const VT = {
  bike: {
    name: { en: "Bike", de: "Fahrrad" },
    max: 215,
    acc: 300,
    turn: 3.4,
    len: 24,
    wid: 8,
    brake: 520,
    colors: ["#2f6f8f", "#7a3b8f", "#3a7a4a", "#b04a2a"],
  },
  escooter: {
    name: "E-Scooter",
    max: 185,
    acc: 330,
    turn: 3.6,
    len: 18,
    wid: 7,
    brake: 520,
    colors: ["#d9e3e8"],
  },
  car: {
    name: { en: "Small car", de: "Kleinwagen" },
    max: 340,
    acc: 260,
    turn: 2.5,
    len: 40,
    wid: 20,
    brake: 520,
    colors: [
      "#c9ced6",
      "#2b2f36",
      "#8a1f1f",
      "#2c4f7c",
      "#e8e4dc",
      "#5d6b3a",
      "#7a7f86",
    ],
  },
  taxi: {
    name: "Taxi",
    max: 330,
    acc: 250,
    turn: 2.5,
    len: 42,
    wid: 20,
    brake: 520,
    colors: ["#efe6c8"],
  },
  bus: {
    name: { en: "City bus", de: "Stadtbus" },
    max: 230,
    acc: 140,
    turn: 1.5,
    len: 84,
    wid: 26,
    brake: 380,
    colors: ["#d8a323"],
  },
  tractor: {
    name: { en: "Vintner's tractor", de: "Winzer-Traktor" },
    max: 140,
    acc: 180,
    turn: 2.3,
    len: 34,
    wid: 22,
    brake: 420,
    colors: ["#3f7a3a"],
  },
  van: {
    name: { en: "Enforcement van", de: "Ordnungsamt-Bus" },
    max: 290,
    acc: 260,
    turn: 2.4,
    len: 46,
    wid: 22,
    brake: 520,
    colors: ["#eef1f4"],
  },
};
const vehicles = [];
const mkVeh = (type, x, y, a = 0, color) => {
  const v = {
    type,
    x,
    y,
    a,
    ra: a,
    speed: 0,
    color: color || pick(VT[type].colors),
    ai: null,
  };
  vehicles.push(v);
  return v;
};
const solidFoot = (v) => v === BLD || v === LAND || v === WATER;
const solidVeh = (v, type) =>
  v === BLD ||
  v === LAND ||
  v === WATER ||
  (v === FOREST && type !== "tractor") ||
  (v === RUIN && type !== "bike" && type !== "escooter");
const vehCircles = (v, x, y, a) => {
  const d = VT[v.type].len * 0.3,
    r = VT[v.type].wid * 0.55,
    c = Math.cos(a),
    s = Math.sin(a);
  if (v.type === "bus")
    return [
      [x + c * d * 1.3, y + s * d * 1.3, r],
      [x, y, r],
      [x - c * d * 1.3, y - s * d * 1.3, r],
    ];
  return [
    [x + c * d, y + s * d, r],
    [x - c * d, y - s * d, r],
  ];
};
const OFFS = [
  [1, 0],
  [-1, 0],
  [0, 1],
  [0, -1],
  [0.7, 0.7],
  [-0.7, 0.7],
  [0.7, -0.7],
  [-0.7, -0.7],
];
function vehBlocked(v, x, y, a) {
  for (const [cx, cy, r] of vehCircles(v, x, y, a)) {
    for (const [ox, oy] of OFFS)
      if (solidVeh(tileAtPx(cx + ox * r, cy + oy * r), v.type))
        return true;
  }
  return false;
}
function footBlocked(x, y, r = 7) {
  for (const [ox, oy] of OFFS)
    if (solidFoot(tileAtPx(x + ox * r, y + oy * r))) return true;
  return x < 8 || y < 8 || x > MW * T - 8 || y > MH * T - 8;
}
function unstick(v) {
  if (!vehBlocked(v, v.x, v.y, v.a)) return;
  for (let r = 8; r < 200; r += 8)
    for (let k = 0; k < 12; k++) {
      const a = (k / 12) * Math.PI * 2,
        nx = v.x + Math.cos(a) * r,
        ny = v.y + Math.sin(a) * r;
      if (!vehBlocked(v, nx, ny, v.a)) {
        v.x = nx;
        v.y = ny;
        return;
      }
    }
}
function vehOverlap(v, x, y, a, o) {
  const ca = vehCircles(v, x, y, a),
    cb = vehCircles(o, o.x, o.y, o.ra ?? o.a);
  for (const p of ca)
    for (const q of cb)
      if (Math.hypot(p[0] - q[0], p[1] - q[1]) < p[2] + q[2])
        return true;
  return false;
}

function placeAI(v) {
  const e = edges[v.ai.e];
  const A = nodes[v.ai.fwd ? e.a : e.b],
    B = nodes[v.ai.fwd ? e.b : e.a];
  const dx = Math.sign(B.x - A.x),
    dy = Math.sign(B.y - A.y),
    lane = T * 0.55;
  v.x = tc(A.x) + dx * v.ai.s - dy * lane;
  v.y = tc(A.y) + dy * v.ai.s + dx * lane;
  v.a = Math.atan2(dy, dx);
}
function spawnTraffic(type) {
  const ei = Math.floor(Math.random() * edges.length);
  const v = mkVeh(type, 0, 0);
  v.ai = {
    e: ei,
    fwd: Math.random() < 0.5,
    s: Math.random() * edges[ei].len,
    cruise: (type === "bus" ? 95 : 110) + Math.random() * 55,
    stop: 0,
  };
  placeAI(v);
  v.ra = v.a;
  return v;
}
for (let i = 0; i < 30; i++)
  spawnTraffic(i < 2 ? "bus" : i < 4 ? "taxi" : "car");
// parked
const parked = [
  ["bike", 60, 68, 0],
  ["bike", 28, 37, Math.PI / 2],
  ["escooter", 52, 39, 0],
  ["escooter", 90, 32, 0],
  ["taxi", 73, 69, 0],
  ["car", 76, 70, 0],
  ["car", 71, 71, 0],
  ["car", 18, 50, 0],
  ["car", 20, 50, 0],
  ["tractor", 6, 50, 0],
  ["car", 110, 84, 0],
  ["bike", 101, 80, 0],
  ["escooter", 96, 12, 0],
  ["car", 36, 67.5, 0],
  ["bike", 84, 41, Math.PI / 2],
];
for (const [t, x, y, a] of parked) {
  const v = mkVeh(t, tc(x), tc(y), a);
  unstick(v);
}

