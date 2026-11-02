"use strict";
// =================== GAME STATE ===================
const START_POS = { x: tc(58), y: tc(68) };
const P = {
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
let state = "title", // title | play | dialog | phone | map | card | pause
  clock = 8 * 60,
  day = 1,
  cheated = false,
  cheatSlow = false,
  superSprint = 0,
  matchday = false,
  busWait = 3;
let aerger = 0,
  aergerCalm = 0,
  aergerCd = 0,
  chasers = [];
// story progress: `mi` = missions completed in order, `stars` = best per mission
let mi = 0,
  stars = [],
  nextMissionIn = -1,
  finaleShown = false;
let job = null;
const weather = { rain: false, next: 150, lock: 0, wet: 0 };
let shake = 0, // camera shake after crashes (px)
  flashFx = 0, // white camera flash (Blitzer)
  blitzCd = 0, // cooldown between traffic-camera fines
  skidLevel = 0; // 0..1, drives the tyre screech
const peds = [],
  bubbles = [],
  particles = [],
  drops = [];
let bottles = [];
const cam = { x: tc(70), y: tc(40) };
let Z = 1;
const keys = {};
const tin = { x: 0, y: 0, active: false, sprint: false, brake: false };

const SAVE_KEY = "lautre-save-v2";
const OLD_SAVE_KEY = "lautre-save-v1";
function save() {
  try {
    localStorage.setItem(
      SAVE_KEY,
      JSON.stringify({
        v: 2,
        money: Math.round(P.money * 100) / 100,
        mi,
        stars,
        bottles: P.bottles,
        deliveries: P.deliveries,
        bottlesTotal: P.bottlesTotal,
        crashes: P.crashes,
        redlights: P.redlights,
        fines: P.fines,
        cheated,
        clock,
        day,
        finaleShown,
      }),
    );
  } catch (e) {}
}
function load() {
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
    mi = clamp(num(s.mi, 0) | 0, 0, 99);
    stars = Array.isArray(s.stars) ? s.stars.map((n) => clamp(n | 0, 0, 3)) : [];
    P.bottles = num(s.bottles, 0);
    P.deliveries = num(s.deliveries, 0);
    P.bottlesTotal = num(s.bottlesTotal, 0);
    P.crashes = num(s.crashes, 0);
    P.redlights = num(s.redlights, 0);
    P.fines = num(s.fines, 0);
    cheated = !!s.cheated;
    clock = clamp(num(s.clock, 480), 0, 1439);
    day = Math.max(1, num(s.day, 1));
    finaleShown = !!s.finaleShown;
    return true;
  } catch (e) {
    return false;
  }
}
function resetProgress() {
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
  mi = 0;
  stars = [];
  cheated = false;
  clock = 480;
  day = 1;
  finaleShown = false;
}
