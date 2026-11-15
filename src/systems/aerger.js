// =================== ÄRGER (wanted meter) ===================
import { tr, tx } from "../core/i18n.js";
import { angDiff, clamp, eur, get, PLAZA, ROAD, T, tc, WALK } from "../core/utils.js";
import { footBlocked, vehBlocked, VT } from "../world/vehicles.js";
import { game, P, save } from "../core/state.js";
import { sfx } from "./audio.js";
import { AL } from "../data/text.js";
import { pos, say, toast } from "../ui/feedback.js";

export function addAerger(n, why) {
  if (game.aergerCd > 0 && n < 2) return;
  game.aergerCd = 2.5;
  game.aerger = Math.min(5, game.aerger + n);
  game.aergerCalm = 0;
  toast(`${tr(why)} · ${tx("Trouble", "Ärger")}: ${tr(AL[game.aerger])}`);
  sfx.whistle();
  syncChasers();
}
export function clearAerger() {
  game.aerger = 0;
  game.chasers = [];
  game.aergerCalm = 0;
}
function syncChasers() {
  const off = [0, 1, 2, 2, 2, 2][game.aerger],
    vans = [0, 0, 0, 1, 2, 3][game.aerger];
  const q = pos();
  const cnt = (k) => game.chasers.filter((c) => c.kind === k).length;
  const spot = (wantRoad) => {
    for (let i = 0; i < 300; i++) {
      const tx =
          Math.floor(q.x / T) +
          Math.round((Math.random() * 2 - 1) * 18),
        ty =
          Math.floor(q.y / T) +
          Math.round((Math.random() * 2 - 1) * 14);
      const v = get(tx, ty);
      const d = Math.hypot(tx * T - q.x, ty * T - q.y) / T;
      if (d < 9) continue;
      if (
        wantRoad ? v === ROAD : v === WALK || v === PLAZA || v === ROAD
      )
        return { x: tc(tx), y: tc(ty) };
    }
    return null;
  };
  while (cnt("officer") < off) {
    const s = spot(false);
    if (!s) break;
    game.chasers.push({ kind: "officer", x: s.x, y: s.y, a: 0 });
  }
  while (cnt("van") < vans) {
    const s = spot(true);
    if (!s) break;
    const v = {
      kind: "van",
      type: "van",
      x: s.x,
      y: s.y,
      a: 0,
      ra: 0,
      speed: 0,
      color: "#eef1f4",
    };
    game.chasers.push(v);
  }
  while (cnt("officer") > off)
    game.chasers.splice(
      game.chasers.findIndex((c) => c.kind === "officer"),
      1,
    );
  while (cnt("van") > vans)
    game.chasers.splice(
      game.chasers.findIndex((c) => c.kind === "van"),
      1,
    );
}
export function updateChasers(dt) {
  if (game.aergerCd > 0) game.aergerCd -= dt;
  if (!game.aerger) return;
  const q = pos();
  let near = false;
  for (const c of game.chasers) {
    const dx = q.x - c.x,
      dy = q.y - c.y,
      d = Math.hypot(dx, dy);
    if (d < T * 13) near = true;
    const want = Math.atan2(dy, dx);
    if (c.kind === "officer") {
      const sp = (game.aerger >= 4 ? 140 : 122) * (game.cheatSlow ? 0.5 : 1);
      let moved = false;
      for (const off of [0, 0.5, -0.5, 1, -1, 1.5, -1.5]) {
        const a = want + off,
          nx = c.x + Math.cos(a) * sp * dt,
          ny = c.y + Math.sin(a) * sp * dt;
        if (!footBlocked(nx, ny, 6)) {
          c.x = nx;
          c.y = ny;
          c.a = a;
          moved = true;
          break;
        }
      }
      if (!moved && d > T * 20) {
        c.x = q.x - (dx / d) * T * 12;
        c.y = q.y - (dy / d) * T * 12;
      }
    } else {
      let best = null;
      for (const off of [0, 0.35, -0.35, 0.8, -0.8, 1.3, -1.3]) {
        const a =
          c.a + clamp(angDiff(c.a, want + off), -2.6 * dt, 2.6 * dt);
        const sp = Math.max(c.speed, 40);
        if (
          !vehBlocked(
            c,
            c.x + Math.cos(a) * sp * dt * 4,
            c.y + Math.sin(a) * sp * dt * 4,
            a,
          )
        ) {
          best = a;
          break;
        }
      }
      if (best === null) {
        c.speed = Math.max(-60, c.speed - 500 * dt);
        c.a += 1.5 * dt;
      } else {
        c.a = best;
        c.speed = Math.min(
          VT.van.max * (game.cheatSlow ? 0.5 : 1),
          c.speed + 260 * dt,
        );
        if (d < T * 3) c.speed = Math.min(c.speed, Math.max(60, d * 2));
      }
      const nx = c.x + Math.cos(c.a) * c.speed * dt,
        ny = c.y + Math.sin(c.a) * c.speed * dt;
      if (!vehBlocked(c, nx, ny, c.a)) {
        c.x = nx;
        c.y = ny;
      } else c.speed *= -0.3;
      c.ra = c.a;
      if (d > T * 28) {
        const s = pickRoadNear(q, 12);
        if (s) {
          c.x = s.x;
          c.y = s.y;
        }
      }
    }
    const caught =
      d < (c.kind === "van" ? 32 : 20) &&
      (P.onFoot || Math.abs(P.veh.speed) < 45);
    if (caught) {
      const fine = 30 * game.aerger;
      const paid = Math.min(P.money, fine);
      P.money -= paid;
      P.fines += paid;
      clearAerger();
      sfx.fail();
      say([
        [
          c.kind === "van" ? "Ordnungsamt" : tx("Police", "Polizei"),
          tx(
            `Fine: ${eur(fine)}. ${paid < fine ? "You could only pay " + eur(paid) + ". " : ""}This isn't Mannheim, you know.`,
            `Bußgeld: ${eur(fine)}. ${paid < fine ? "Sie konnten nur " + eur(paid) + " zahlen. " : ""}Mir sin hier net in Mannheim.`,
          ),
        ],
      ]);
      save();
      return;
    }
  }
  if (!near) {
    game.aergerCalm += dt;
    if (game.aergerCalm > 7) {
      game.aergerCalm = 0;
      game.aerger--;
      if (!game.aerger) {
        toast(tx("Trouble over. They lost you.", "Ärger vorbei. Sie haben dich verloren."));
        game.chasers = [];
      } else syncChasers();
    }
  } else game.aergerCalm = 0;
}
function pickRoadNear(q, r) {
  for (let i = 0; i < 200; i++) {
    const tx =
        Math.floor(q.x / T) + Math.round((Math.random() * 2 - 1) * r),
      ty =
        Math.floor(q.y / T) + Math.round((Math.random() * 2 - 1) * r);
    if (
      get(tx, ty) === ROAD &&
      Math.hypot(tx * T - q.x, ty * T - q.y) > T * 9
    )
      return { x: tc(tx), y: tc(ty) };
  }
  return null;
}

