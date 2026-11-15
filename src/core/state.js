// =================== GAME STATE ===================
import { clamp, tc } from "./utils.js";

export const START_POS = { x: tc(58), y: tc(68) };
export const P = {
  x: START_POS.x,
  y: START_POS.y,
  a: -Math.PI / 2,
  onFoot: true,
  veh: null,
  energy: 100,
  money: 20,
  bottles: 0,
  deliveries: 0,
  anim: 0,
  // lifetime counters, used for mission bonus objectives and stats
  bottlesTotal: 0,
  crashes: 0,
  redlights: 0,
  fines: 0,
  lastSig: null,
};
/**
 * Everything that changes during play and is shared between modules.
 * (ES modules cannot reassign each other's `let`s, so these live on one object.)
 */
export const game = {
  state: "title", // title | play | dialog | phone | map | card | pause
  clock: 8 * 60, // minutes since midnight
  day: 1,
  cheated: false,
  cheatSlow: false,
  superSprint: 0,
  matchday: false,
  busWait: 3,
  // Ärger (wanted level) and the Ordnungsamt chasing you
  aerger: 0,
  aergerCalm: 0,
  aergerCd: 0,
  chasers: [],
  // story progress: `mi` = missions completed in order, `stars` = best per mission
  mi: 0,
  stars: [],
  nextMissionIn: -1,
  finaleShown: false,
  job: null,
  shake: 0, // camera shake after crashes (px)
  flashFx: 0, // white camera flash (Blitzer)
  blitzCd: 0, // cooldown between traffic-camera fines
  skidLevel: 0, // 0..1, drives the tyre screech
  bottles: [], // Pfand bottles lying around the city
  Z: 1, // camera zoom
};
export const weather = { rain: false, next: 150, lock: 0, wet: 0 };
export const peds = [],
  bubbles = [],
  particles = [],
  drops = [];
export const cam = { x: tc(70), y: tc(40) };
/**
 * Where "forward" on the controls points, as a world angle. Top-down views keep
 * it north (−π/2); the 3D chase / first-person cameras turn it with the camera,
 * so W always walks away from the camera.
 */
export const camView = { forward: -Math.PI / 2 };
export const keys = {};
export const tin = { x: 0, y: 0, active: false, sprint: false, brake: false };

const SAVE_KEY = "lautre-save-v2";
const OLD_SAVE_KEY = "lautre-save-v1";
export function save() {
  try {
    localStorage.setItem(
      SAVE_KEY,
      JSON.stringify({
        v: 2,
        money: Math.round(P.money * 100) / 100,
        mi: game.mi,
        stars: game.stars,
        bottles: P.bottles,
        deliveries: P.deliveries,
        bottlesTotal: P.bottlesTotal,
        crashes: P.crashes,
        redlights: P.redlights,
        fines: P.fines,
        cheated: game.cheated,
        clock: game.clock,
        day: game.day,
        finaleShown: game.finaleShown,
      }),
    );
  } catch (e) {}
}
export function load() {
  try {
    let s = JSON.parse(localStorage.getItem(SAVE_KEY) || "null");
    if (!s) {
      // migrate a v1 save (6-mission chapter) to the new 8-mission chapter
      s = JSON.parse(localStorage.getItem(OLD_SAVE_KEY) || "null");
      if (s) s.mi = Math.min(s.mi ?? 0, 4);
    }
    if (!s || typeof s !== "object") return false;
    const num = (v, d) => (Number.isFinite(v) ? v : d);
    P.money = num(s.money, 20);
    game.mi = clamp(num(s.mi, 0) | 0, 0, 99);
    game.stars = Array.isArray(s.stars) ? s.stars.map((n) => clamp(n | 0, 0, 3)) : [];
    P.bottles = num(s.bottles, 0);
    P.deliveries = num(s.deliveries, 0);
    P.bottlesTotal = num(s.bottlesTotal, 0);
    P.crashes = num(s.crashes, 0);
    P.redlights = num(s.redlights, 0);
    P.fines = num(s.fines, 0);
    game.cheated = !!s.cheated;
    game.clock = clamp(num(s.clock, 480), 0, 1439);
    game.day = Math.max(1, num(s.day, 1));
    game.finaleShown = !!s.finaleShown;
    return true;
  } catch (e) {
    return false;
  }
}
export function resetProgress() {
  try {
    localStorage.removeItem(SAVE_KEY);
    localStorage.removeItem(OLD_SAVE_KEY);
  } catch (e) {}
  Object.assign(P, {
    money: 20,
    bottles: 0,
    deliveries: 0,
    bottlesTotal: 0,
    crashes: 0,
    redlights: 0,
    fines: 0,
    energy: 100,
  });
  game.mi = 0;
  game.stars = [];
  game.cheated = false;
  game.clock = 480;
  game.day = 1;
  game.finaleShown = false;
}
