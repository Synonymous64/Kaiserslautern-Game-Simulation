// =================== ODD JOBS: food delivery + taxi fares ===================
import { tr, tx } from "../core/i18n.js";
import { dist, eur, MW, pick, T, tc } from "../core/utils.js";
import { doors, POIS, RESTAURANTS } from "../world/world.js";
import { game, P, save, weather } from "../core/state.js";
import { sfx } from "./audio.js";
import { L2, ORDERS, STREETS } from "../data/text.js";
import { M } from "./missions.js";
import { pos, toast } from "../ui/feedback.js";
import { closePhone } from "../ui/phone.js";

function randDoor(fx, fy, min, max) {
  for (let i = 0; i < 200; i++) {
    const d = pick(doors),
      x = d % MW,
      y = (d / MW) | 0,
      m = Math.abs(x - fx) + Math.abs(y - fy);
    if (m >= min && m <= max) return { x, y };
  }
  const d = pick(doors);
  return { x: d % MW, y: (d / MW) | 0 };
}
export function startJob(kind) {
  if (game.job) {
    toast(tx("Finish your current job first.", "Erst den aktuellen Job beenden."));
    return;
  }
  if (M && M.timer !== null) {
    toast(tx("Finish the timed mission first.", "Erst die Mission mit Zeitlimit beenden."));
    return;
  }
  if (kind === "taxi" && (P.onFoot || P.veh.type !== "taxi")) {
    toast(
      tx(
        "Taxi fares need a taxi. One waits at the Hauptbahnhof car park.",
        "Taxifahrten brauchen ein Taxi. Eins steht am Parkplatz beim Hauptbahnhof.",
      ),
    );
    return;
  }
  const q = pos(),
    qx = Math.floor(q.x / T),
    qy = Math.floor(q.y / T);
  if (kind === "food") {
    const r = POIS[pick(RESTAURANTS)];
    const d = randDoor(r.x, r.y, 14, 48);
    game.job = {
      kind,
      phase: "pickup",
      from: { x: r.x, y: r.y, name: r.name },
      to: {
        x: d.x,
        y: d.y,
        name: `${pick(STREETS)} ${1 + Math.floor(Math.random() * 90)}`,
      },
      item: pick(ORDERS),
      timer: null,
      pay: 0,
    };
    toast(
      tx(
        `Pfalzfood order: ${tr(game.job.item)}. Pick up at ${tr(r.name)}.`,
        `Pfalzfood-Bestellung: ${tr(game.job.item)}. Abholen bei ${tr(r.name)}.`,
      ),
    );
  } else {
    const f = randDoor(qx, qy, 6, 22);
    const keysP = Object.keys(POIS).filter((k) => !k.startsWith("bus"));
    let t = POIS[pick(keysP)];
    for (let i = 0; i < 20 && Math.abs(t.x - f.x) + Math.abs(t.y - f.y) < 20; i++)
      t = POIS[pick(keysP)];
    game.job = {
      kind,
      phase: "pickup",
      from: { x: f.x, y: f.y, name: L2("Passenger", "Fahrgast") },
      to: { x: t.x, y: t.y, name: t.name },
      timer: null,
      pay: 0,
    };
    toast(tx("A passenger is waiting nearby. Follow the marker.", "Ein Fahrgast wartet in der Nähe. Folge der Markierung."));
  }
  closePhone();
}
export function cancelJob(msg) {
  game.job = null;
  if (msg) toast(msg);
}
export function updateJob(dt) {
  if (!game.job) return;
  const q = pos(),
    tgt = game.job.phase === "pickup" ? game.job.from : game.job.to;
  if (game.job.timer !== null) game.job.timer -= dt;
  if (game.job.kind === "taxi" && (P.onFoot || P.veh.type !== "taxi") && game.job.phase === "drop") {
    cancelJob(tx("Your passenger got out. Fare lost.", "Dein Fahrgast ist ausgestiegen. Fahrt verloren."));
    sfx.fail();
    return;
  }
  if (dist(q.x, q.y, tc(tgt.x), tc(tgt.y)) >= T * 1.8) return;
  if (game.job.phase === "pickup") {
    if (game.job.kind === "taxi" && (P.onFoot || P.veh.type !== "taxi")) return;
    const m = Math.abs(game.job.from.x - game.job.to.x) + Math.abs(game.job.from.y - game.job.to.y);
    game.job.phase = "drop";
    game.job.timer = Math.round(14 + m * 0.32);
    game.job.pay =
      Math.round((game.job.kind === "taxi" ? 10 + m * 0.32 : 6 + m * 0.24) * (weather.rain ? 1.25 : 1) * 2) / 2;
    game.job.rainy = weather.rain;
    toast(
      game.job.kind === "taxi"
        ? tx(`Passenger in. To ${tr(game.job.to.name)}.`, `Fahrgast eingestiegen. Ziel: ${tr(game.job.to.name)}.`)
        : tx(`Picked up: ${tr(game.job.item)}. Deliver to ${game.job.to.name}.`, `Abgeholt: ${tr(game.job.item)}. Liefern an ${game.job.to.name}.`),
    );
    sfx.pick();
  } else {
    let pay = game.job.pay;
    const late = game.job.timer < 0;
    if (late) pay = Math.round(pay * 0.5 * 2) / 2;
    else pay += Math.round(game.job.timer * 0.1);
    P.money += pay;
    P.deliveries++;
    sfx.coin();
    toast(
      late
        ? tx(`Late. “Cold.” ★★☆☆☆ · +${eur(pay)}`, `Zu spät. „Kalt.“ ★★☆☆☆ · +${eur(pay)}`)
        : tx(
            `Delivered ★★★★★ · +${eur(pay)}${game.job.rainy ? " (rain bonus)" : ""}`,
            `Geliefert ★★★★★ · +${eur(pay)}${game.job.rainy ? " (Regen-Zuschlag)" : ""}`,
          ),
    );
    game.job = null;
    save();
  }
}
