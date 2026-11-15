// =================== 3D CITY (static, built once from the tile map) ===================
// Units: one 3D unit = one 2D world pixel. 2D (x, y) → 3D (x, height, y).
import * as THREE from "three";
import { SETTINGS } from "../core/i18n.js";
import {
  BLD, FOREST, get, grp, hash, idx, MH, MW, RUIN, T, tc,
} from "../core/utils.js";
import { groupColor, inPfaff, LANDMARKS, lights, POIS, SEGS, SIGN_SPOTS, STREET_TREES } from "../world/world.js";
import { BLITZER, SIGNAL_POLES, signalState } from "../world/traffic-lights.js";
import { weather } from "../core/state.js";
import { COL, drawRoadMarks, drawTiles, drawWith } from "../render/ground.js";
import { drawJunctionMarks } from "../render/effects.js";
import { facadeTextures, glowTexture, signTexture } from "./textures.js";

export const STOREY = 20;
const WORLD_W = MW * T,
  WORLD_H = MH * T;

const color = (hex) => new THREE.Color(hex);
const stdMat = (hex, opts = {}) =>
  new THREE.MeshStandardMaterial({ color: hex, roughness: 0.88, metalness: 0, ...opts });

/** Height of the building block at tile (x, y), in 3D units. */
export function bldHeight(x, y) {
  if (inPfaff(x, y)) return 76;
  return Math.round(18 + (0.9 + hash(grp[idx(x, y)], 13) * 1.4) * 36);
}
const FACADES = ["#e9dfcc", "#ddcdb0", "#efe7d8", "#d4c6b3", "#e6d3bd", "#cbbfae", "#f1e4c9", "#d9cfc4"];
function blockColors(x, y) {
  if (inPfaff(x, y)) return { wall: "#a25a43", roof: "#6e2f22" };
  if (x >= 98 && y >= 60) return { wall: "#b8bbbf", roof: "#8d9096" };
  const g = grp[idx(x, y)];
  return { wall: FACADES[Math.floor(hash(g, 29) * FACADES.length)], roof: groupColor[g] };
}

// ---------------------------------------------------------------------------
// Geometry builder: quads into flat arrays (positions, normals, colours, uvs)
// ---------------------------------------------------------------------------
class Builder {
  constructor() {
    this.p = [];
    this.n = [];
    this.c = [];
    this.uv = [];
  }
  /** a,b,c,d corners (CCW seen from outside), n = outward normal, col = THREE.Color. */
  quad(a, b, c, d, n, col, uva = [0, 0, 1, 0, 1, 1, 0, 1]) {
    for (const [v, k] of [[a, 0], [b, 1], [c, 2], [a, 0], [c, 2], [d, 3]]) {
      this.p.push(v[0], v[1], v[2]);
      this.n.push(n[0], n[1], n[2]);
      this.c.push(col.r, col.g, col.b);
      this.uv.push(uva[k * 2], uva[k * 2 + 1]);
    }
  }
  /** Facade wall between (x0,z0) and (x1,z1) from y0 to y1, facing n. UVs: 1 = one tile / one storey. */
  wall(x0, z0, x1, z1, y0, y1, n, col) {
    const along = (x, z) => (n[2] !== 0 ? x : z) / T;
    const u0 = along(x0, z0),
      u1 = along(x1, z1);
    this.quad(
      [x0, y0, z0], [x1, y0, z1], [x1, y1, z1], [x0, y1, z0], n, col,
      [u0, y0 / STOREY, u1, y0 / STOREY, u1, y1 / STOREY, u0, y1 / STOREY],
    );
  }
  /** Axis-aligned box: four facade walls (+ optional roof into `roof`). */
  box(x0, z0, x1, z1, y0, y1, wallCol, roof, roofCol) {
    const w = color(wallCol);
    this.wall(x1, z0, x0, z0, y0, y1, [0, 0, -1], w); // north
    this.wall(x0, z1, x1, z1, y0, y1, [0, 0, 1], w); // south
    this.wall(x0, z0, x0, z1, y0, y1, [-1, 0, 0], w); // west
    this.wall(x1, z1, x1, z0, y0, y1, [1, 0, 0], w); // east
    if (roof) roof.quad([x0, y1, z1], [x1, y1, z1], [x1, y1, z0], [x0, y1, z0], [0, 1, 0], color(roofCol));
  }
  mesh(mat) {
    const g = new THREE.BufferGeometry();
    g.setAttribute("position", new THREE.Float32BufferAttribute(this.p, 3));
    g.setAttribute("normal", new THREE.Float32BufferAttribute(this.n, 3));
    g.setAttribute("color", new THREE.Float32BufferAttribute(this.c, 3));
    g.setAttribute("uv", new THREE.Float32BufferAttribute(this.uv, 2));
    g.computeBoundingSphere();
    const m = new THREE.Mesh(g, mat);
    m.castShadow = m.receiveShadow = true;
    return m;
  }
}

/** Free-form solid from 8 corners: bottom [4] and top [4], both CCW seen from above. */
function hexa(bot, top, mat) {
  const tri = [];
  const f = (a, b, c, d) => tri.push(a, b, c, a, c, d);
  f(top[0], top[1], top[2], top[3]); // top (CCW from above means facing up)
  f(bot[3], bot[2], bot[1], bot[0]); // bottom
  for (let i = 0; i < 4; i++) {
    const j = (i + 1) % 4;
    f(bot[i], bot[j], top[j], top[i]);
  }
  const g = new THREE.BufferGeometry();
  g.setAttribute("position", new THREE.Float32BufferAttribute(tri.flat(), 3));
  g.computeVertexNormals();
  const m = new THREE.Mesh(g, mat);
  m.castShadow = m.receiveShadow = true;
  return m;
}
/** Rectangle corners at height y, CCW seen from above (y-up, z = south). */
const rectAt = (x0, z0, x1, z1, y) => [[x0, y, z1], [x1, y, z1], [x1, y, z0], [x0, y, z0]];

/** Hip roof (pyramid when square) over a rectangle. */
function hipRoof(x0, z0, x1, z1, y0, y1, mat) {
  const w = x1 - x0,
    d = z1 - z0,
    cx = (x0 + x1) / 2,
    cz = (z0 + z1) / 2;
  const top =
    w >= d
      ? [[x0 + d / 2, y1, cz], [x1 - d / 2, y1, cz], [x1 - d / 2, y1, cz], [x0 + d / 2, y1, cz]]
      : [[cx, y1, z1 - w / 2], [cx, y1, z1 - w / 2], [cx, y1, z0 + w / 2], [cx, y1, z0 + w / 2]];
  return hexa(rectAt(x0, z0, x1, z1, y0), top, mat);
}
/** Gable roof with its ridge along x. */
function gableRoof(x0, z0, x1, z1, y0, y1, mat) {
  const cz = (z0 + z1) / 2;
  return hexa(rectAt(x0, z0, x1, z1, y0), [[x0, y1, cz], [x1, y1, cz], [x1, y1, cz], [x0, y1, cz]], mat);
}
function boxMesh(x0, z0, x1, z1, y0, y1, mat) {
  const m = new THREE.Mesh(new THREE.BoxGeometry(x1 - x0, y1 - y0, z1 - z0), mat);
  m.position.set((x0 + x1) / 2, (y0 + y1) / 2, (z0 + z1) / 2);
  m.castShadow = m.receiveShadow = true;
  return m;
}
function spire(cx, cz, half, y0, y1, mat) {
  const m = new THREE.Mesh(new THREE.ConeGeometry(half * Math.SQRT2, y1 - y0, 4), mat);
  m.rotation.y = Math.PI / 4;
  m.position.set(cx, (y0 + y1) / 2, cz);
  m.castShadow = true;
  return m;
}

// ---------------------------------------------------------------------------
// Ground: the 2D tile renderer painted once into a big texture
// ---------------------------------------------------------------------------
function bakeGround(scale) {
  const c = document.createElement("canvas");
  c.width = Math.round(WORLD_W * scale);
  c.height = Math.round(WORLD_H * scale);
  const g = c.getContext("2d");
  g.setTransform(scale, 0, 0, scale, 0, 0);
  const wet = weather.wet;
  weather.wet = 0; // bake the dry look; wetness is a material effect in 3D
  try {
    drawWith(g, () => {
      g.fillStyle = COL[FOREST];
      g.fillRect(0, 0, WORLD_W, WORLD_H);
      drawTiles(0, 0, MW - 1, MH - 1);
      // lane dashes, zebras and signs are real geometry in 3D (sharp up close)
      drawRoadMarks(-1e9, -1e9, 1e9, 1e9, { dashes: false, signs: false });
    });
  } finally {
    weather.wet = wet;
  }
  // building footprints: a dark floor, not lawn
  g.fillStyle = "#34373c";
  for (let y = 0; y < MH; y++)
    for (let x = 0; x < MW; x++) if (get(x, y) === BLD) g.fillRect(x * T, y * T, T + 0.6, T + 0.6);
  return c;
}

/** White road paint (lane dashes, stop lines, zebras) as flat quads. */
function buildMarkings() {
  const rects = [];
  // lane dashes: 14 on / 14 off along each street's centre line, 2 wide
  for (const s of SEGS) {
    const ax = tc(s.a[0]),
      ay = tc(s.a[1]),
      len = Math.abs(tc(s.b[0]) - ax) + Math.abs(tc(s.b[1]) - ay),
      dx = Math.sign(s.b[0] - s.a[0]),
      dy = Math.sign(s.b[1] - s.a[1]);
    for (let d = 0; d < len; d += 28) {
      const e = Math.min(d + 14, len);
      if (s.h) rects.push([Math.min(ax + dx * d, ax + dx * e), ay - 1, Math.abs(e - d), 2]);
      else rects.push([ax - 1, Math.min(ay + dy * d, ay + dy * e), 2, Math.abs(e - d)]);
    }
  }
  // stop lines + zebras: run the 2D drawing code against a recorder
  const rec = { fillStyle: "", fillRect: (x, y, w, h) => rects.push([x, y, w, h]) };
  drawWith(rec, () => drawJunctionMarks(-1e9, -1e9, 1e9, 1e9));
  const b = new Builder(),
    white = color("#efebe1"),
    Y = 0.35;
  for (const [x, z, w, d] of rects) b.quad([x, Y, z + d], [x + w, Y, z + d], [x + w, Y, z], [x, Y, z], [0, 1, 0], white);
  const m = b.mesh(new THREE.MeshStandardMaterial({ vertexColors: true, roughness: 0.8, polygonOffset: true, polygonOffsetFactor: -2 }));
  m.castShadow = false;
  return m;
}

/** Upright blue street-name signs on poles (the 3D chase/first-person views). */
function buildStreetSigns(poleMat) {
  const group = new THREE.Group();
  const texCache = new Map();
  const PX = 64,
    H = 9; // plate: 64 px of texture per 9 units of height
  const plate = (name) => {
    if (texCache.has(name)) return texCache.get(name);
    const c = document.createElement("canvas"),
      g = c.getContext("2d");
    g.font = `600 ${Math.round(PX * 0.62)}px "Atkinson Hyperlegible",system-ui,sans-serif`;
    const w = Math.ceil(g.measureText(name).width + PX * 0.7);
    c.width = w;
    c.height = PX;
    g.fillStyle = "#ffffff";
    g.fillRect(0, 0, w, PX);
    g.fillStyle = "#1d3b74";
    g.fillRect(4, 4, w - 8, PX - 8);
    g.fillStyle = "#ffffff";
    g.font = `600 ${Math.round(PX * 0.62)}px "Atkinson Hyperlegible",system-ui,sans-serif`;
    g.textAlign = "center";
    g.textBaseline = "middle";
    g.fillText(name, w / 2, PX / 2 + 2);
    const t = new THREE.CanvasTexture(c);
    t.colorSpace = THREE.SRGBColorSpace;
    t.anisotropy = 4;
    const v = { mat: new THREE.MeshStandardMaterial({ map: t, roughness: 0.6 }), w: (w / PX) * H };
    texCache.set(name, v);
    return v;
  };
  const poleGeo = new THREE.CylinderGeometry(0.9, 0.9, 34, 6).translate(0, 17, 0);
  for (const sp of SIGN_SPOTS) {
    const { mat, w } = plate(sp.n);
    const sign = new THREE.Group();
    const pole = new THREE.Mesh(poleGeo, poleMat);
    pole.castShadow = true;
    sign.add(pole);
    // two plates back to back so the name reads correctly from both sides
    const geo = new THREE.PlaneGeometry(w, H);
    for (const ry of [0, Math.PI]) {
      const p = new THREE.Mesh(geo, mat);
      p.position.set(0, 30, ry ? -0.3 : 0.3);
      p.rotation.y = ry;
      p.castShadow = true;
      sign.add(p);
    }
    sign.position.set(sp.x, 0, sp.y);
    sign.rotation.y = sp.h ? 0 : Math.PI / 2; // plate runs along the street
    group.add(sign);
  }
  return group;
}

export function buildCity(scene, renderer) {
  const hq = SETTINGS.quality !== "low";
  const out = {};

  // ---- ground ----
  const maxTex = renderer.capabilities.maxTextureSize;
  const scale = Math.min(hq ? 1 : 0.5, maxTex / WORLD_W, maxTex / WORLD_H);
  const groundTex = new THREE.CanvasTexture(bakeGround(scale));
  groundTex.colorSpace = THREE.SRGBColorSpace;
  groundTex.anisotropy = Math.min(8, renderer.capabilities.getMaxAnisotropy());
  const groundMat = new THREE.MeshStandardMaterial({ map: groundTex, roughness: 0.95, metalness: 0 });
  const ground = new THREE.Mesh(new THREE.PlaneGeometry(WORLD_W, WORLD_H), groundMat);
  ground.rotation.x = -Math.PI / 2;
  ground.position.set(WORLD_W / 2, 0, WORLD_H / 2);
  ground.receiveShadow = true;
  scene.add(ground);
  // endless forest floor beyond the map edge
  const outside = new THREE.Mesh(
    new THREE.PlaneGeometry(WORLD_W * 6, WORLD_H * 6),
    new THREE.MeshStandardMaterial({ color: COL[FOREST], roughness: 1 }),
  );
  outside.rotation.x = -Math.PI / 2;
  outside.position.set(WORLD_W / 2, -0.5, WORLD_H / 2);
  scene.add(outside, buildMarkings());
  out.groundMat = groundMat;

  // ---- building blocks (one merged mesh for walls, one for roofs) ----
  const { map: facadeMap, lit: facadeLit } = facadeTextures();
  const walls = new Builder(),
    roofs = new Builder();
  const hAt = (x, y) => (get(x, y) === BLD ? bldHeight(x, y) : 0);
  for (let y = 0; y < MH; y++)
    for (let x = 0; x < MW; x++) {
      if (get(x, y) !== BLD) continue;
      const h = bldHeight(x, y),
        { wall, roof } = blockColors(x, y),
        wc = color(wall);
      const x0 = x * T,
        x1 = x0 + T,
        z0 = y * T,
        z1 = z0 + T;
      let nh;
      if ((nh = hAt(x, y - 1)) < h) walls.wall(x1, z0, x0, z0, nh, h, [0, 0, -1], wc);
      if ((nh = hAt(x, y + 1)) < h) walls.wall(x0, z1, x1, z1, nh, h, [0, 0, 1], wc);
      if ((nh = hAt(x - 1, y)) < h) walls.wall(x0, z0, x0, z1, nh, h, [-1, 0, 0], wc);
      if ((nh = hAt(x + 1, y)) < h) walls.wall(x1, z1, x1, z0, nh, h, [1, 0, 0], wc);
      roofs.quad([x0, h, z1], [x1, h, z1], [x1, h, z0], [x0, h, z0], [0, 1, 0], color(roof));
    }

  // ---- landmarks ----
  const lm = new THREE.Group();
  const sand = stdMat("#c9b08c"),
    churchRoof = stdMat("#7d3426"),
    spireMat = stdMat("#9c4130"),
    darkMetal = stdMat("#2c3036", { roughness: 0.6 });
  for (const L of LANDMARKS) {
    const x = L.x1 * T,
      z = L.y1 * T,
      w = (L.x2 - L.x1 + 1) * T,
      d = (L.y2 - L.y1 + 1) * T;
    if (L.kind === "church") {
      // Stiftskirche: nave with a steep roof, a west spire and two east towers
      const nx0 = x + T * 1.4,
        nx1 = x + w - T * 0.2,
        nz0 = z + T * 0.7,
        nz1 = z + d - T * 0.7;
      lm.add(boxMesh(nx0, nz0, nx1, nz1, 0, 62, sand));
      lm.add(gableRoof(nx0, nz0, nx1, nz1, 62, 100, churchRoof));
      const tx = x + T * 0.9,
        tz = z + d / 2;
      lm.add(boxMesh(tx - T * 0.6, tz - T * 0.6, tx + T * 0.6, tz + T * 0.6, 0, 128, sand));
      lm.add(spire(tx, tz, T * 0.6, 128, 222, spireMat));
      for (const sz of [z + T * 0.55, z + d - T * 0.55]) {
        lm.add(boxMesh(x + T * 2.25, sz - T * 0.35, x + T * 2.95, sz + T * 0.35, 0, 92, sand));
        lm.add(spire(x + T * 2.6, sz, T * 0.35, 92, 140, spireMat));
      }
    } else if (L.kind === "tower") {
      // Rathaus: podium + the 84 m tower (tallest structure in the city)
      walls.box(x, z, x + w, z + d, 0, 34, "#9a9da2", roofs, "#7f8389");
      walls.box(x + w * 0.15, z + d * 0.1, x + w * 0.85, z + d * 0.9, 34, 272, "#c3c6cb", roofs, "#8e9196");
      const pad = new THREE.Mesh(new THREE.CylinderGeometry(T * 0.55, T * 0.55, 3, 20), stdMat("#d8dadd"));
      pad.position.set(x + w / 2, 273.5, z + d / 2);
      lm.add(pad);
      lm.add(boxMesh(x + w / 2 - 2, z + d / 2 - 2, x + w / 2 + 2, z + d / 2 + 2, 275, 300, stdMat("#c4472f")));
    } else if (L.kind === "mall") {
      walls.box(x, z, x + w, z + d, 0, 64, "#c9c5bd", roofs, "#d8d4cc");
      const sign = new THREE.Mesh(
        new THREE.PlaneGeometry(w * 0.7, d * 0.35),
        new THREE.MeshStandardMaterial({ map: signTexture("IM K", "#d8d4cc", "#c4472f"), roughness: 0.8 }),
      );
      sign.rotation.x = -Math.PI / 2;
      sign.position.set(x + w / 2, 64.6, z + d / 2);
      lm.add(sign);
    } else if (L.kind === "hall") {
      const wallCol = L.id === "frucht" ? "#dcb894" : "#8a8f99";
      walls.box(x, z, x + w, z + d, 0, 52, wallCol);
      const rm = stdMat(L.col);
      lm.add(hipRoof(x, z, x + w, z + d, 52, 52 + Math.min(w, d) * 0.32, rm));
    } else if (L.kind === "station") {
      walls.box(x, z, x + w, z + d, 0, 42, "#9aa3ab", roofs, "#7f8a93");
      const hx = x + w / 2;
      walls.box(hx - T * 1.5, z, hx + T * 1.5, z + d, 0, 68, "#cdb18a", roofs, "#b9a07f");
      const clock = new THREE.Mesh(new THREE.CircleGeometry(9, 24), stdMat("#ffffff", { emissive: "#ffffff", emissiveIntensity: 0.15 }));
      clock.position.set(hx, 56, z + d + 0.6);
      lm.add(clock);
    } else if (L.kind === "campus") {
      walls.box(x, z, x + w, z + d, 0, 46, "#a9acb1", roofs, "#878a90");
    }
  }

  // Betzenberg stadium: four raked stands around the pitch, canopy, floodlights
  {
    const red = stdMat("#a52222"),
      dark = stdMat("#5a1414");
    const X0 = 3 * T,
      X1 = 24 * T,
      Z0 = 35 * T,
      Z1 = 50 * T,
      PX0 = 6 * T,
      PX1 = 21 * T,
      PZ0 = 38 * T,
      PZ1 = 47 * T,
      HI = 66,
      LO = 10;
    const stand = (bot, top) => lm.add(hexa(bot, top, red));
    // north (rakes down to the south)
    stand(rectAt(X0, Z0, X1, PZ0, 0), [[PX0, LO, PZ0], [PX1, LO, PZ0], [X1, HI, Z0], [X0, HI, Z0]]);
    // south, split for the entrance at x 12–14
    for (const [a, b] of [[X0, 12 * T], [15 * T, X1]])
      stand(rectAt(a, PZ1, b, Z1, 0), [[a, HI, Z1], [b, HI, Z1], [Math.min(b, PX1), LO, PZ1], [Math.max(a, PX0), LO, PZ1]]);
    // west / east
    stand(rectAt(X0, PZ0, PX0, PZ1, 0), [[X0, HI, PZ1], [PX0, LO, PZ1], [PX0, LO, PZ0], [X0, HI, PZ0]]);
    stand(rectAt(PX1, PZ0, X1, PZ1, 0), [[PX1, LO, PZ1], [X1, HI, PZ1], [X1, HI, PZ0], [PX1, LO, PZ0]]);
    // canopy over the north stand with the club sign on top
    lm.add(boxMesh(X0, Z0 - 6, X1, Z0 + T * 2.2, HI + 8, HI + 13, dark));
    const betze = new THREE.Mesh(
      new THREE.PlaneGeometry(T * 8, T * 1.6),
      new THREE.MeshStandardMaterial({ map: signTexture("BETZE", "#5a1414", "#ffffff", 512, 112), roughness: 0.8 }),
    );
    betze.rotation.x = -Math.PI / 2;
    betze.position.set((X0 + X1) / 2, HI + 13.2, Z0 + T * 0.9);
    lm.add(betze);
    out.floodlights = [];
    for (const [cx, cz] of [[X0 + 8, Z0 + 8], [X1 - 8, Z0 + 8], [X0 + 8, Z1 - 8], [X1 - 8, Z1 - 8]]) {
      const mast = new THREE.Mesh(new THREE.CylinderGeometry(2, 3, 150, 8), darkMetal);
      mast.position.set(cx, 75, cz);
      mast.castShadow = true;
      lm.add(mast);
      const lamp = new THREE.Mesh(new THREE.BoxGeometry(18, 10, 4), new THREE.MeshBasicMaterial({ color: "#555a60" }));
      lamp.position.set(cx, 152, cz);
      lamp.lookAt((X0 + X1) / 2, 0, (Z0 + Z1) / 2);
      lm.add(lamp);
      out.floodlights.push(lamp.material);
    }
  }
  // Pfaff chimney
  {
    const brick = stdMat("#7a3426");
    const ch = new THREE.Mesh(new THREE.CylinderGeometry(7, 11, 190, 16), brick);
    ch.position.set(tc(38), 95, tc(22));
    ch.castShadow = true;
    lm.add(ch);
    const rim = new THREE.Mesh(new THREE.CylinderGeometry(8, 8, 4, 16), stdMat("#2a1a16"));
    rim.position.set(tc(38), 190, tc(22));
    lm.add(rim);
  }
  // Kaiserpfalz ruins: broken sandstone walls
  for (let y = 0; y < MH; y++)
    for (let x = 0; x < MW; x++) {
      if (get(x, y) !== RUIN) continue;
      const h = hash(x, y);
      if (h < 0.3) continue;
      const hh = 8 + h * 22;
      if (get(x, y - 1) !== RUIN || h > 0.8)
        walls.box(x * T, y * T, x * T + T, y * T + 6, 0, hh, "#b39a7b", roofs, "#a38c70");
      if (get(x - 1, y) !== RUIN)
        walls.box(x * T, y * T, x * T + 6, y * T + T, 0, hh * 0.8, "#b39a7b", roofs, "#a38c70");
    }

  const wallMat = new THREE.MeshStandardMaterial({
    vertexColors: true,
    map: facadeMap,
    emissive: "#ffc477",
    emissiveMap: facadeLit,
    emissiveIntensity: 0,
    roughness: 0.85,
    metalness: 0,
  });
  const roofMat = new THREE.MeshStandardMaterial({ vertexColors: true, roughness: 0.9, metalness: 0 });
  out.wallMat = wallMat;
  scene.add(walls.mesh(wallMat), roofs.mesh(roofMat), lm);

  // ---- trees (instanced) ----
  const trees = [];
  for (let y = 0; y < MH; y++)
    for (let x = 0; x < MW; x++) {
      const v = get(x, y),
        h = hash(x, y);
      if (v === FOREST) {
        trees.push([x * T + 10 + h * 12, y * T + 12 + hash(y, x) * 10, 15 + h * 5, h > 0.5]);
        if (h > 0.4) trees.push([x * T + 22 - h * 8, y * T + 24, 11 + h * 3, h > 0.7]);
      }
    }
  for (const [x, z, r] of STREET_TREES) trees.push([x, z, r, hash(x | 0, z | 0) > 0.6]);
  {
    const crownGeo = new THREE.IcosahedronGeometry(1, 0),
      trunkGeo = new THREE.CylinderGeometry(1.6, 2.2, 1, 6);
    trunkGeo.translate(0, 0.5, 0);
    const crowns = new THREE.InstancedMesh(crownGeo, stdMat("#ffffff", { flatShading: true }), trees.length);
    const trunks = new THREE.InstancedMesh(trunkGeo, stdMat("#5b4330"), trees.length);
    const m = new THREE.Matrix4(),
      q = new THREE.Quaternion(),
      e = new THREE.Euler(),
      s = new THREE.Vector3(),
      p = new THREE.Vector3();
    const greens = ["#2e5a37", "#386a40", "#3d7a3f", "#4f9150", "#335f3b"].map(color);
    trees.forEach(([x, z, r, alt], i) => {
      const trunkH = r * 0.9;
      e.set(0, hash(i, 3) * 6, 0);
      q.setFromEuler(e);
      m.compose(p.set(x, 0, z), q, s.set(1, trunkH, 1));
      trunks.setMatrixAt(i, m);
      m.compose(p.set(x, trunkH + r * 0.7, z), q, s.set(r, r * 1.15, r));
      crowns.setMatrixAt(i, m);
      crowns.setColorAt(i, greens[(alt ? 2 : 0) + Math.floor(hash(i, 9) * 3)]);
    });
    crowns.castShadow = trunks.castShadow = true;
    crowns.receiveShadow = true;
    scene.add(crowns, trunks);
  }

  // ---- street lamps: poles, bulbs and warm light pools at night ----
  {
    const n = lights.length;
    const poleGeo = new THREE.CylinderGeometry(1, 1.4, 38, 6);
    poleGeo.translate(0, 19, 0);
    const poles = new THREE.InstancedMesh(poleGeo, darkMetal, n);
    const bulbMat = new THREE.MeshBasicMaterial({ color: "#c9c4b4" });
    const bulbs = new THREE.InstancedMesh(new THREE.SphereGeometry(3, 8, 6), bulbMat, n);
    const poolMat = new THREE.MeshBasicMaterial({
      map: glowTexture(),
      color: "#ffcf8a",
      transparent: true,
      opacity: 0,
      blending: THREE.AdditiveBlending,
      depthWrite: false,
    });
    const poolGeo = new THREE.PlaneGeometry(130, 130);
    poolGeo.rotateX(-Math.PI / 2);
    const pools = new THREE.InstancedMesh(poolGeo, poolMat, n);
    const m = new THREE.Matrix4();
    lights.forEach(([x, z], i) => {
      poles.setMatrixAt(i, m.makeTranslation(x, 0, z));
      bulbs.setMatrixAt(i, m.makeTranslation(x, 38, z));
      pools.setMatrixAt(i, m.makeTranslation(x, 0.7, z));
    });
    poles.castShadow = true;
    pools.renderOrder = 1;
    scene.add(poles, bulbs, pools);
    out.lampBulb = bulbMat;
    out.lampPool = poolMat;
  }

  // ---- traffic lights: pole + housing + three lamps per corner ----
  {
    const heads = SIGNAL_POLES;
    const n = heads.length;
    const poleGeo = new THREE.CylinderGeometry(1, 1, 30, 6);
    poleGeo.translate(0, 15, 0);
    const poles = new THREE.InstancedMesh(poleGeo, darkMetal, n);
    const housings = new THREE.InstancedMesh(new THREE.BoxGeometry(6, 17, 6), stdMat("#16181b"), n);
    const lampMat = new THREE.MeshBasicMaterial({ color: "#ffffff" });
    const lamps = new THREE.InstancedMesh(new THREE.SphereGeometry(2, 8, 6), lampMat, n * 3);
    const m = new THREE.Matrix4();
    heads.forEach((h, i) => {
      poles.setMatrixAt(i, m.makeTranslation(h.x, 0, h.y));
      housings.setMatrixAt(i, m.makeTranslation(h.x, 38, h.y));
      // lamps on the south face (towards the camera) and the top
      [44, 38, 32].forEach((ly, k) => lamps.setMatrixAt(i * 3 + k, m.makeTranslation(h.x, ly, h.y + 3)));
    });
    poles.castShadow = housings.castShadow = true;
    scene.add(poles, housings, lamps);
    const COLS = { red: color("#ff3b30"), amber: color("#ffb020"), green: color("#3ddc6a") };
    const OFF = color("#2a2c30");
    const ORDER = ["red", "amber", "green"];
    out.signalHeads = heads;
    out.updateSignals = () => {
      heads.forEach((h, i) => {
        const st = signalState(h.s, h.axis);
        ORDER.forEach((k, j) => lamps.setColorAt(i * 3 + j, k === st ? COLS[k] : OFF));
      });
      lamps.instanceColor.needsUpdate = true;
    };
    out.updateSignals();
  }

  // ---- speed camera ----
  {
    const bx = tc(BLITZER.x),
      bz = tc(BLITZER.y);
    const pole = new THREE.Mesh(new THREE.CylinderGeometry(1.5, 1.5, 22, 8), darkMetal);
    pole.position.set(bx, 11, bz);
    const head = boxMesh(bx - 5, bz - 5, bx + 5, bz + 5, 22, 34, stdMat("#e8e6df"));
    const eye = new THREE.Mesh(new THREE.SphereGeometry(1.8, 8, 6), new THREE.MeshBasicMaterial({ color: "#c42222" }));
    eye.position.set(bx, 30, bz + 5.2);
    scene.add(pole, head, eye);
    out.blitzEye = eye.material;
  }

  // ---- bus stops: pole with the yellow-green "H" disc ----
  {
    const disc = new THREE.MeshStandardMaterial({ map: signTexture("H", "#f2c230", "#1f7a3a", 128, 128), roughness: 0.7 });
    for (const k in POIS) {
      const p = POIS[k];
      if (p.kind !== "bus") continue;
      const x = tc(p.x),
        z = tc(p.y);
      const pole = new THREE.Mesh(new THREE.CylinderGeometry(1, 1, 30, 6), darkMetal);
      pole.position.set(x, 15, z);
      const sign = new THREE.Mesh(new THREE.CylinderGeometry(7, 7, 1.5, 20), disc);
      sign.rotation.x = Math.PI / 2;
      sign.position.set(x, 32, z);
      pole.castShadow = sign.castShadow = true;
      scene.add(pole, sign);
    }
  }

  out.signs = buildStreetSigns(darkMetal);
  scene.add(out.signs);
  return out;
}
