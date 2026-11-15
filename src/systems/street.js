// =================== STREET LIFE ===================
// Things that make the city feel alive and solid:
//  - lamp posts, traffic lights, sign poles, bus stops and street trees are
//    solid for the player and for pedestrians; so are cars when on foot
//  - drivers brake, honk and shout when someone steps in front of them, and
//    jaywalkers answer back; drivers stuck behind a parked car lose patience
//  - bump into people and they let you know; passers-by chat with each other
import { clamp, idx, pick, T, tc } from "../core/utils.js";
import { lights, POIS, SIGN_SPOTS, STREET_TREES } from "../world/world.js";
import { BLITZER, SIGNAL_POLES } from "../world/traffic-lights.js";
import { vehCircles, vehicles } from "../world/vehicles.js";
import { bubbles, game, P, peds } from "../core/state.js";
import { sfx } from "./audio.js";
import { BUMPED, CONVOS, DRIVER_AT_PED, DRIVER_AT_PLAYER, DRIVER_BLOCKED, PED_ANSWER } from "../data/text.js";
import { bubble } from "./population.js";
import { pos } from "../ui/feedback.js";

// ---------- static obstacles, bucketed by tile ----------
const GRID = new Map();
function addPole(x, y, r) {
  const k = idx(Math.floor(x / T), Math.floor(y / T));
  if (!GRID.has(k)) GRID.set(k, []);
  GRID.get(k).push([x, y, r]);
}
for (const [x, y] of lights) addPole(x, y, 3);
for (const s of SIGNAL_POLES) addPole(s.x, s.y, 3);
for (const s of SIGN_SPOTS) addPole(s.x, s.y, 2.5);
for (const [x, y] of STREET_TREES) addPole(x, y, 4);
addPole(tc(BLITZER.x), tc(BLITZER.y), 4);
for (const k in POIS) if (POIS[k].kind === "bus") addPole(tc(POIS[k].x), tc(POIS[k].y), 2.5);

/** The pole / trunk a circle at (x, y, r) touches, or null. */
function poleAt(x, y, r) {
  const tx = Math.floor(x / T),
    ty = Math.floor(y / T);
  for (let dy = -1; dy <= 1; dy++)
    for (let dx = -1; dx <= 1; dx++) {
      const list = GRID.get(idx(tx + dx, ty + dy));
      if (list) for (const p of list) if ((x - p[0]) ** 2 + (y - p[1]) ** 2 < (r + p[2]) ** 2) return p;
    }
  return null;
}
/** Distance from (x, y) to the nearest body circle of a vehicle touching radius r, or Infinity. */
function carGap(x, y, r) {
  let best = Infinity;
  const test = (v) => {
    if (Math.abs(v.x - x) > 80 || Math.abs(v.y - y) > 80) return;
    for (const [cx, cy, cr] of vehCircles(v, v.x, v.y, v.ra ?? v.a)) {
      const d = Math.hypot(x - cx, y - cy) - cr;
      if (d < r && d < best) best = d;
    }
  };
  for (const v of vehicles) if (v !== P.veh || P.onFoot) test(v);
  for (const c of game.chasers) if (c.kind === "van") test(c);
  return best;
}

/**
 * On foot: is the step (ox, oy) → (nx, ny) blocked by a pole or a car?
 * Moving away from something you already touch is always allowed, so you can
 * never get stuck (e.g. after getting out of a car next to a lamp post).
 */
export function footStepBlocked(ox, oy, nx, ny, r = 7) {
  const p = poleAt(nx, ny, r);
  if (p && Math.hypot(nx - p[0], ny - p[1]) < Math.hypot(ox - p[0], oy - p[1])) return true;
  const g = carGap(nx, ny, r);
  return g < r && g < carGap(ox, oy, r + 30);
}
/** Pedestrians walk around poles and cars. */
export function pedBlocked(x, y) {
  return !!poleAt(x, y, 5) || carGap(x, y, 6) < 6;
}

// ---------- little timeline for staged reactions ----------
const later = [];
function after(sec, fn) {
  later.push([sec, fn]);
}
const talking = (o) => bubbles.some((b) => b.o === o);
let honkCd = 0,
  bumpCd = 0,
  convoT = 6;

/**
 * Traffic AI: car v has to wait because of `who` ("player" on foot, "playerCar",
 * "parked" or a pedestrian object). hard = it had to slam on the brakes.
 */
export function carBlocked(v, who, hard, dt) {
  const a = v.ai;
  a.wait = (a.wait || 0) + dt;
  if (game.state !== "play" || (a.honkCd || 0) > 0) return;
  const d = Math.hypot(v.x - P.x, v.y - P.y);
  if (d > T * 14) return; // only what the player can hear
  const patience = who === "player" ? 0.4 : who === "parked" || who === "playerCar" ? 2.5 : 0.8;
  if (!hard && a.wait < patience) return;
  a.honks = (a.honks || 0) + 1;
  a.honkCd = 3.5 + Math.random() * 3;
  const vol = clamp(1 - d / (T * 14), 0.25, 1);
  if (hard) sfx.screech(vol);
  if (honkCd <= 0) {
    sfx.carHorn(vol, a.honks > 1);
    honkCd = 0.5;
  }
  if (!talking(v))
    bubble(v, pick(who === "player" ? DRIVER_AT_PLAYER : typeof who === "object" ? DRIVER_AT_PED : DRIVER_BLOCKED));
  if (typeof who === "object" && !who.knock)
    after(1.3, () => {
      if (!talking(who) && !who.knock) bubble(who, pick(PED_ANSWER));
    });
}
/** Traffic AI: the way is clear again. */
export function carFree(v, dt) {
  const a = v.ai;
  a.wait = 0;
  if (a.honkCd > 0) a.honkCd -= dt;
  else a.honks = 0;
}
/** Traffic AI: tick the honk cooldown while waiting too. */
export function carTick(v, dt) {
  if (v.ai.honkCd > 0) v.ai.honkCd -= dt;
}

/** The player walked into pedestrian p (running = they stumble). */
export function pedBumped(p, running) {
  if (game.state !== "play" || p.knock || (p.bumpCd || 0) > performance.now() / 1000) return;
  p.bumpCd = performance.now() / 1000 + 6;
  if (running) {
    p.knock = 1.1; // stumbles, and grumbles when back up
    p.ka = Math.random() * 6;
    return;
  }
  if (bumpCd > 0 || talking(p)) return;
  bumpCd = 1.2;
  bubble(p, pick(BUMPED));
}

/** Two passers-by stop and chat; lines alternate between them. */
function startConvo(a, b) {
  const lines = pick(CONVOS);
  const dur = lines.length * 2.7 + 1;
  a.a = Math.atan2(b.y - a.y, b.x - a.x);
  b.a = a.a + Math.PI;
  for (const p of [a, b]) {
    p.stand = true;
    p.cross = false;
    p.t = dur;
  }
  lines.forEach((l, i) =>
    after(i * 2.7, () => {
      const who = i % 2 ? b : a;
      if (!who.knock && peds.includes(who)) bubble(who, l);
    }),
  );
}

export function updateStreet(dt) {
  honkCd -= dt;
  bumpCd -= dt;
  for (let i = later.length - 1; i >= 0; i--) {
    later[i][0] -= dt;
    if (later[i][0] <= 0) {
      const fn = later[i][1];
      later.splice(i, 1);
      fn();
    }
  }
  if (game.state !== "play") return;
  convoT -= dt;
  if (convoT > 0) return;
  convoT = 8 + Math.random() * 9;
  const q = pos();
  for (const a of peds) {
    if (a.knock || a.cross || talking(a) || Math.hypot(a.x - q.x, a.y - q.y) > T * 8) continue;
    for (const b of peds)
      if (b !== a && !b.knock && !b.cross && !talking(b) && Math.hypot(a.x - b.x, a.y - b.y) < 48) {
        startConvo(a, b);
        return;
      }
  }
}
