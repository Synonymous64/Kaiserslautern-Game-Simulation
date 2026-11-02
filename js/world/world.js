"use strict";
// =================== WORLD GENERATION ===================
const inStadiumArea = (x, y) => x <= 27 && y >= 32 && y <= 57;
for (let y = 0; y < MH; y++)
  for (let x = 0; x < MW; x++) {
    const u = x >= 15 && x <= 106 && y >= 8 && y <= 71;
    set(x, y, u ? GRASS : FOREST);
  }
rect(1, 32, 27, 57, GRASS);
rect(84, 0, 108, 12, GRASS);
rect(92, 58, 118, 89, GRASS);
rect(0, 72, MW - 1, 72, GRASS);
rect(0, 75, MW - 1, 75, GRASS);
rect(0, 73, MW - 1, 74, RAIL);

const SEGS = [
  { n: "Pariser Straße", a: [2, 30], b: [60, 30] },
  { n: "Mainzer Straße", a: [60, 30], b: [117, 30] },
  { n: "Lauterstraße", a: [30, 14], b: [106, 14] },
  { n: "Rudolf-Breitscheid-Straße", a: [14, 58], b: [106, 58] },
  { n: "Altstadtring", a: [30, 44], b: [49, 44] },
  { n: "Altstadtring", a: [66, 44], b: [96, 44] },
  { n: "Ring West", a: [30, 14], b: [30, 66] },
  { n: "Eisenbahnstraße", a: [46, 30], b: [46, 66] },
  { n: "Burgstraße", a: [66, 14], b: [66, 66] },
  { n: "Kanalstraße", a: [82, 14], b: [82, 66] },
  { n: "Trippstadter Straße", a: [96, 14], b: [96, 82] },
  { n: "Bahnhofstraße", a: [30, 66], b: [96, 66] },
  { n: "Betzenbergstraße", a: [14, 52], b: [30, 52] },
  { n: "Betzenbergstraße", a: [14, 52], b: [14, 58] },
  { n: "Campusring", a: [96, 82], b: [114, 82] },
];
for (const s of SEGS) {
  const [x1, y1] = s.a,
    [x2, y2] = s.b;
  s.h = y1 === y2;
  for (let x = Math.min(x1, x2); x <= Math.max(x1, x2); x++)
    for (let y = Math.min(y1, y2); y <= Math.max(y1, y2); y++)
      for (let w = -1; w <= 1; w++) {
        if (s.h) set(x, y + w, ROAD);
        else set(x + w, y, ROAD);
      }
}
{
  const tmp = map.slice();
  for (let y = 0; y < MH; y++)
    for (let x = 0; x < MW; x++) {
      const v = tmp[idx(x, y)];
      if (v !== GRASS && v !== FOREST) continue;
      let near = false;
      for (let dy = -1; dy <= 1 && !near; dy++)
        for (let dx = -1; dx <= 1; dx++) {
          if (
            inb(x + dx, y + dy) &&
            tmp[idx(x + dx, y + dy)] === ROAD
          ) {
            near = true;
            break;
          }
        }
      if (near) set(x, y, WALK);
    }
}
const notRW = (v) => v !== ROAD && v !== WALK,
  notR = (v) => v !== ROAD;
// Gartenschau + Japanese garden pond
rect(84, 1, 106, 11, PARK, notRW);
for (let y = 2; y <= 9; y++)
  for (let x = 89; x <= 104; x++) {
    if (((x - 96) / 5.5) ** 2 + ((y - 5) / 2.6) ** 2 <= 1)
      set(x, y, WATER);
  }
rect(32, 46, 44, 56, PARK, notRW);
rect(98, 60, 118, 72, PARK, notRW);
rect(98, 75, 118, 89, PARK, notRW);
for (const r of [
  [100, 61, 106, 64],
  [109, 61, 115, 64],
  [100, 67, 106, 70],
  [109, 67, 115, 70],
])
  rect(r[0], r[1], r[2], r[3], BLD, (v) => v === PARK);
// plazas
rect(55, 31, 57, 56, PLAZA, notR);
rect(50, 38, 64, 46, PLAZA, notR);
rect(44, 68, 72, 68, PLAZA, notR);
rect(44, 69, 49, 71, PLAZA, notR);
rect(67, 69, 69, 71, PLAZA, notR);
rect(70, 69, 79, 71, LOT, notR);
// stadium
rect(3, 35, 23, 49, LAND);
rect(6, 38, 20, 46, PITCH);
rect(12, 47, 14, 49, WALK);
rect(3, 50, 23, 50, LOT, notR);
const LANDMARKS = [
  {
    id: "stift",
    name: "Stiftskirche",
    x1: 59,
    y1: 39,
    x2: 63,
    y2: 43,
    kind: "church",
  },
  {
    id: "rathaus",
    name: "Rathaus",
    x1: 69,
    y1: 20,
    x2: 73,
    y2: 25,
    kind: "tower",
  },
  {
    id: "mall",
    name: "Im K",
    x1: 48,
    y1: 32,
    x2: 53,
    y2: 37,
    kind: "mall",
  },
  {
    id: "frucht",
    name: "Fruchthalle",
    x1: 59,
    y1: 48,
    x2: 63,
    y2: 53,
    kind: "hall",
    col: "#c26a4c",
  },
  {
    id: "theater",
    name: "Pfalztheater",
    x1: 70,
    y1: 47,
    x2: 78,
    y2: 53,
    kind: "hall",
    col: "#5d6371",
  },
  {
    id: "hbf",
    name: "Hauptbahnhof",
    x1: 50,
    y1: 69,
    x2: 66,
    y2: 71,
    kind: "station",
  },
  {
    id: "mensa",
    name: "Mensa",
    x1: 99,
    y1: 76,
    x2: 104,
    y2: 79,
    kind: "campus",
  },
  {
    id: "g42",
    name: "Gebäude 42",
    x1: 107,
    y1: 76,
    x2: 115,
    y2: 79,
    kind: "campus",
  },
  {
    id: "g48",
    name: "Gebäude 48",
    x1: 99,
    y1: 85,
    x2: 105,
    y2: 88,
    kind: "campus",
  },
  {
    id: "bib",
    name: "Unibibliothek",
    x1: 107,
    y1: 85,
    x2: 115,
    y2: 88,
    kind: "campus",
  },
];
for (const L of LANDMARKS) rect(L.x1, L.y1, L.x2, L.y2, LAND, notRW);
rect(75, 19, 80, 24, RUIN, notRW);
// urban blocks
for (let y = 8; y <= 71; y++)
  for (let x = 15; x <= 106; x++) {
    if (get(x, y) !== GRASS || inStadiumArea(x, y)) continue;
    set(x, y, x % 10 === 4 || y % 9 === 4 ? WALK : BLD);
  }
// building groups
const groupColor = [];
{
  const ROOFS = [
    "#a5452f",
    "#b8573a",
    "#8f3b2a",
    "#4b5260",
    "#5a6170",
    "#b9664a",
    "#c9b79c",
    "#bfa98a",
    "#8d8f93",
    "#9c8a74",
  ];
  let g = 0;
  for (let i = 0; i < map.length; i++) {
    if (map[i] !== BLD || grp[i] >= 0) continue;
    const st = [i];
    grp[i] = g;
    while (st.length) {
      const c = st.pop(),
        cx = c % MW,
        cy = (c / MW) | 0;
      for (const [dx, dy] of [
        [1, 0],
        [-1, 0],
        [0, 1],
        [0, -1],
      ]) {
        const nx = cx + dx,
          ny = cy + dy;
        if (!inb(nx, ny)) continue;
        const n = idx(nx, ny);
        if (map[n] === BLD && grp[n] < 0) {
          grp[n] = g;
          st.push(n);
        }
      }
    }
    groupColor[g] = ROOFS[Math.floor(hash(g, 7) * ROOFS.length)];
    g++;
  }
}
const inPfaff = (x, y) => x >= 33 && x <= 44 && y >= 17 && y <= 27;
const isBld = (x, y) => {
  const v = get(x, y);
  return v === BLD;
};

const shade = (hex, f) => {
  const n = parseInt(hex.slice(1), 16);
  let r = n >> 16,
    g = (n >> 8) & 255,
    b = n & 255;
  if (f < 0) {
    r *= 1 + f;
    g *= 1 + f;
    b *= 1 + f;
  } else {
    r += (255 - r) * f;
    g += (255 - g) * f;
    b += (255 - b) * f;
  }
  return `rgb(${r | 0},${g | 0},${b | 0})`;
};
const roofCache = {};
const roofCols = (c) =>
  roofCache[c] ||
  (roofCache[c] = {
    top: c,
    hi: shade(c, 0.18),
    lo: shade(c, -0.35),
    det: shade(c, -0.15),
  });

// ---- POIs ----
const POIS = {
  hbf: { name: "Hauptbahnhof", x: 58, y: 68, kind: "hbf" },
  rathaus: {
    name: { en: "Rathaus · Citizens' Office", de: "Rathaus · Bürgeramt" },
    x: 68,
    y: 22,
    kind: "rathaus",
  },
  wg: { name: { en: "Your flat-share (WG)", de: "Deine WG" }, x: 28, y: 36, kind: "wg" },
  mensa: { name: { en: "Mensa (student canteen)", de: "Mensa" }, x: 101, y: 80, kind: "mensa" },
  stadion: {
    name: "Stadion Betzenberg",
    x: 13,
    y: 50,
    kind: "stadion",
  },
  doener: {
    name: "Döner am Stiftsplatz",
    x: 53,
    y: 44,
    kind: "food",
    price: 5,
    gain: 45,
    item: { en: "Döner, everything, extra spicy", de: "Döner mit allem, scharf" },
  },
  baecker: {
    name: "Bäckerei Brezelglück",
    x: 57,
    y: 33,
    kind: "food",
    price: 2,
    gain: 20,
    item: { en: "Pretzel", de: "Laugenbrezel" },
  },
  metzger: {
    name: "Metzgerei Hambacher",
    x: 44,
    y: 40,
    kind: "food",
    price: 3,
    gain: 30,
    item: { en: "Lyoner sausage roll", de: "Lyoner-Weck" },
  },
  pfand: {
    name: { en: "Globo Markt · Bottle return", de: "Globo Markt · Pfandautomat" },
    x: 84,
    y: 40,
    kind: "pfand",
  },
  oma: { name: "Oma Hilde", x: 62, y: 45, kind: "oma" },
  garten: { name: { en: "Gartenschau (garden show)", de: "Gartenschau" }, x: 95, y: 12, kind: "garten" },
  pizza: {
    name: "Pizzeria Lauterbella",
    x: 88,
    y: 32,
    kind: "food",
    price: 3,
    gain: 30,
    item: { en: "Palatinate-style pizza slice", de: "Pizzastück Pfälzer Art" },
  },
  wok: {
    name: "Wok-Express Kanalstraße",
    x: 84,
    y: 52,
    kind: "food",
    price: 6,
    gain: 50,
    item: { en: "Wok box", de: "Wok-Box" },
  },
  wein: {
    name: "Weinstube Dubbeglas",
    x: 68,
    y: 40,
    kind: "food",
    price: 3,
    gain: 25,
    item: { en: "Wine spritzer in a Dubbeglas", de: "Schorle im Dubbeglas" },
  },
  bus1: { name: { en: "Bus stop Pfaffplatz", de: "Haltestelle Pfaffplatz" }, x: 44, y: 33, kind: "bus" },
  bus2: {
    name: { en: "Bus stop Schillerplatz", de: "Haltestelle Schillerplatz" },
    x: 60,
    y: 32,
    kind: "bus",
  },
  bus3: { name: { en: "Bus stop Kanalstraße", de: "Haltestelle Kanalstraße" }, x: 84, y: 60, kind: "bus" },
  bus4: { name: { en: "Bus stop Uni-Ost", de: "Haltestelle Uni-Ost" }, x: 94, y: 70, kind: "bus" },
  bus5: { name: { en: "Bus stop Ring West", de: "Haltestelle Ring West" }, x: 32, y: 60, kind: "bus" },
};
for (const k in POIS) {
  const p = POIS[k];
  p.id = k;
  if (get(p.x, p.y) === BLD || get(p.x, p.y) === LAND)
    set(p.x, p.y, WALK);
}
const RESTAURANTS = [
  "doener",
  "pizza",
  "wok",
  "wein",
  "baecker",
  "metzger",
];

// ---- tile lists ----
const pedTiles = [],
  doors = [],
  lights = [],
  windowsLit = [];
for (let y = 0; y < MH; y++)
  for (let x = 0; x < MW; x++) {
    const v = get(x, y);
    if (v === WALK || v === PLAZA || v === PARK || v === LOT)
      pedTiles.push(idx(x, y));
    if (v === WALK) {
      let nb = false,
        nr = false;
      for (const [dx, dy] of [
        [1, 0],
        [-1, 0],
        [0, 1],
        [0, -1],
      ]) {
        if (get(x + dx, y + dy) === BLD) nb = true;
        if (get(x + dx, y + dy) === ROAD) nr = true;
      }
      if (nb && nr && x >= 15 && x <= 106 && y >= 8 && y <= 71)
        doors.push(idx(x, y));
      if (nr && (x * 3 + y * 5) % 7 === 0) lights.push([tc(x), tc(y)]);
    }
    if (v === PLAZA && (x + y * 3) % 6 === 0)
      lights.push([tc(x), tc(y)]);
    if (v === BLD && get(x, y + 1) !== BLD && hash(x, y) > 0.55)
      windowsLit.push([x, y]);
  }

// ---- traffic graph ----
const nodes = [],
  nodeAt = new Map(),
  edges = [];
const nodeId = (x, y) => {
  const k = x + "," + y;
  if (!nodeAt.has(k)) {
    nodeAt.set(k, nodes.length);
    nodes.push({ x, y, edges: [] });
  }
  return nodeAt.get(k);
};
for (const s of SEGS) {
  const pts = [s.a.slice(), s.b.slice()];
  for (const o of SEGS) {
    if (o === s || o.h === s.h) continue;
    const h = s.h ? s : o,
      v = s.h ? o : s;
    const ix = v.a[0],
      iy = h.a[1];
    const hx1 = Math.min(h.a[0], h.b[0]),
      hx2 = Math.max(h.a[0], h.b[0]),
      vy1 = Math.min(v.a[1], v.b[1]),
      vy2 = Math.max(v.a[1], v.b[1]);
    if (ix >= hx1 && ix <= hx2 && iy >= vy1 && iy <= vy2)
      pts.push([ix, iy]);
  }
  pts.sort((p, q) => (s.h ? p[0] - q[0] : p[1] - q[1]));
  const uniq = [];
  for (const p of pts) {
    const l = uniq[uniq.length - 1];
    if (!l || l[0] !== p[0] || l[1] !== p[1]) uniq.push(p);
  }
  for (let i = 0; i < uniq.length - 1; i++) {
    const a = nodeId(uniq[i][0], uniq[i][1]),
      b = nodeId(uniq[i + 1][0], uniq[i + 1][1]);
    const len =
      (Math.abs(uniq[i + 1][0] - uniq[i][0]) +
        Math.abs(uniq[i + 1][1] - uniq[i][1])) *
      T;
    if (len <= 0) continue;
    const e = edges.length;
    edges.push({ a, b, len });
    nodes[a].edges.push(e);
    nodes[b].edges.push(e);
  }
}

