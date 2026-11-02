"use strict";
// =================== ODD JOBS: food delivery + taxi fares ===================
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
function startJob(kind) {
  if (job) {
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
    job = {
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
        `Pfalzfood order: ${tr(job.item)}. Pick up at ${tr(r.name)}.`,
        `Pfalzfood-Bestellung: ${tr(job.item)}. Abholen bei ${tr(r.name)}.`,
      ),
    );
  } else {
    const f = randDoor(qx, qy, 6, 22);
    const keysP = Object.keys(POIS).filter((k) => !k.startsWith("bus"));
    let t = POIS[pick(keysP)];
    for (let i = 0; i < 20 && Math.abs(t.x - f.x) + Math.abs(t.y - f.y) < 20; i++)
      t = POIS[pick(keysP)];
    job = {
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
function cancelJob(msg) {
  job = null;
  if (msg) toast(msg);
}
function updateJob(dt) {
  if (!job) return;
  const q = pos(),
    tgt = job.phase === "pickup" ? job.from : job.to;
  if (job.timer !== null) job.timer -= dt;
  if (job.kind === "taxi" && (P.onFoot || P.veh.type !== "taxi") && job.phase === "drop") {
    cancelJob(tx("Your passenger got out. Fare lost.", "Dein Fahrgast ist ausgestiegen. Fahrt verloren."));
    sfx.fail();
    return;
  }
  if (dist(q.x, q.y, tc(tgt.x), tc(tgt.y)) >= T * 1.8) return;
  if (job.phase === "pickup") {
    if (job.kind === "taxi" && (P.onFoot || P.veh.type !== "taxi")) return;
    const m = Math.abs(job.from.x - job.to.x) + Math.abs(job.from.y - job.to.y);
    job.phase = "drop";
    job.timer = Math.round(14 + m * 0.32);
    job.pay =
      Math.round((job.kind === "taxi" ? 10 + m * 0.32 : 6 + m * 0.24) * (weather.rain ? 1.25 : 1) * 2) / 2;
    job.rainy = weather.rain;
    toast(
      job.kind === "taxi"
        ? tx(`Passenger in. To ${tr(job.to.name)}.`, `Fahrgast eingestiegen. Ziel: ${tr(job.to.name)}.`)
        : tx(`Picked up: ${tr(job.item)}. Deliver to ${job.to.name}.`, `Abgeholt: ${tr(job.item)}. Liefern an ${job.to.name}.`),
    );
    sfx.pick();
  } else {
    let pay = job.pay;
    const late = job.timer < 0;
    if (late) pay = Math.round(pay * 0.5 * 2) / 2;
    else pay += Math.round(job.timer * 0.1);
    P.money += pay;
    P.deliveries++;
    sfx.coin();
    toast(
      late
        ? tx(`Late. “Cold.” ★★☆☆☆ · +${eur(pay)}`, `Zu spät. „Kalt.“ ★★☆☆☆ · +${eur(pay)}`)
        : tx(
            `Delivered ★★★★★ · +${eur(pay)}${job.rainy ? " (rain bonus)" : ""}`,
            `Geliefert ★★★★★ · +${eur(pay)}${job.rainy ? " (Regen-Zuschlag)" : ""}`,
          ),
    );
    job = null;
    save();
  }
}
