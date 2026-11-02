"use strict";
// =================== PLAYER ACTIONS ===================
function onCrash(impact) {
  if (impact < 60) return;
  missionCrash(impact);
}
function nearestVeh() {
  let best = null,
    bd = 46;
  for (const v of vehicles) {
    const d = dist(v.x, v.y, P.x, P.y) - VT[v.type].len * 0.35;
    if (d < bd) {
      bd = d;
      best = v;
    }
  }
  return best;
}
function nearestPOI() {
  let best = null,
    bd = T * 1.7;
  for (const k in POIS) {
    const p = POIS[k],
      d = dist(tc(p.x), tc(p.y), P.x, P.y);
    if (d < bd) {
      bd = d;
      best = p;
    }
  }
  return best;
}
/** What the use button would do right now (for HUD hint + touch label). */
function useAction() {
  if (state === "dialog") return { key: "next", label: tx("Next", "Weiter") };
  if (state !== "play") return null;
  if (!P.onFoot) return { key: "exit", label: tx("Get out", "Aussteigen") };
  const v = nearestVeh();
  if (v)
    return {
      key: "enter",
      label: v.ai ? tx("Take car", "Auto nehmen") : tx("Get on", "Einsteigen"),
      long: (v.ai ? tx("take ", "nimm ") : tx("get on ", "steig ein: ")) + tr(VT[v.type].name),
    };
  const p = nearestPOI();
  if (!p) return null;
  const k = p.kind;
  const lbl =
    k === "food"
      ? [tx("Buy", "Kaufen"), `${tr(p.item)} (${eur(p.price)})`]
      : k === "pfand"
        ? [tx("Return", "Einlösen"), tx(`return bottles (${P.bottles})`, `Pfand einlösen (${P.bottles})`)]
        : k === "bus"
          ? [tx("Wait", "Warten"), tx("wait for the bus", "auf den Bus warten")]
          : k === "wg"
            ? [tx("Rest", "Ausruhen"), tx("rest at home", "zu Hause ausruhen")]
            : k === "mensa"
              ? [tx("Eat", "Essen"), tx("semolina pudding (€2.40)", "Grießbrei (2,40 €)")]
              : [tx("Talk", "Reden"), tr(p.name)];
  return { key: "poi", label: lbl[0], long: lbl[1] };
}
function useKey() {
  if (state === "dialog") {
    nextDialog();
    return;
  }
  if (state !== "play") return;
  if (!P.onFoot) {
    exitVeh();
    return;
  }
  const v = nearestVeh();
  if (v) {
    enterVeh(v);
    return;
  }
  const p = nearestPOI();
  if (p) interact(p);
}
function enterVeh(v) {
  if (v.ai) {
    addAerger(2, L2("Car stolen", "Auto geklaut"));
    const d = {
      x: v.x + Math.cos(v.a + Math.PI / 2) * 30,
      y: v.y + Math.sin(v.a + Math.PI / 2) * 30,
      a: 0,
      sp: 40,
      t: 2,
      shirt: pick(SHIRTS),
      skin: pick(SKIN),
      knock: 0,
      stand: true,
    };
    peds.push(d);
    bubble(d, pick(ANGRY));
    v.ai = null;
    v.speed = 0;
  }
  v.slip = 0;
  v.braking = false;
  v.skid = null;
  P.veh = v;
  P.onFoot = false;
  v.ra = v.a;
  sfx.pick();
}
function exitVeh() {
  const v = P.veh,
    d = VT[v.type];
  if (Math.abs(v.speed) > 90) {
    toast(tx("Slow down before getting out.", "Erst abbremsen, dann aussteigen."), 1500);
    return;
  }
  const tries = [
    [v.a + Math.PI / 2, d.wid / 2 + 12],
    [v.a - Math.PI / 2, d.wid / 2 + 12],
    [v.a + Math.PI, d.len / 2 + 12],
    [v.a, d.len / 2 + 12],
    [v.a + Math.PI / 2, d.wid / 2 + 26],
    [v.a - Math.PI / 2, d.wid / 2 + 26],
  ];
  for (const [a, r] of tries) {
    const x = v.x + Math.cos(a) * r,
      y = v.y + Math.sin(a) * r;
    if (!footBlocked(x, y)) {
      P.x = x;
      P.y = y;
      P.onFoot = true;
      v.speed = 0;
      v.slip = 0;
      v.skid = null;
      v.braking = false;
      P.veh = null;
      if (job && job.kind === "taxi" && job.phase === "drop")
        cancelJob(tx("Your passenger got out. Fare lost.", "Dein Fahrgast ist ausgestiegen. Fahrt verloren."));
      return;
    }
  }
  toast(tx("No space to get out here.", "Hier ist kein Platz zum Aussteigen."));
}
function interact(p) {
  const k = p.kind;
  if (k === "food") {
    if (P.energy > 97) {
      toast(`${tr(p.name)}: ${tx("“You’re full, love.”", "„Du bisch doch satt.“")}`);
      return;
    }
    if (P.money < p.price) {
      toast(tx(`${tr(p.item)} costs ${eur(p.price)}. You’re broke.`, `${tr(p.item)} kostet ${eur(p.price)}. Du bisch pleite.`));
      return;
    }
    P.money -= p.price;
    P.energy = Math.min(100, P.energy + p.gain);
    sfx.coin();
    toast(`${tr(p.item)} · −${eur(p.price)} · +${p.gain} ${tx("energy", "Energie")}`);
    return;
  }
  if (k === "pfand") {
    if (!P.bottles) {
      toast(tx("Bottle machine: “Please insert empties.” You have none.", "Pfandautomat: „Bitte Leergut einlegen.“ Du hast keine Flaschen."));
      return;
    }
    const m = P.bottles * 0.25;
    P.money += m;
    toast(tx(`${P.bottles} bottles returned · +${eur(m)}`, `${P.bottles} Pfandflaschen eingelöst · +${eur(m)}`));
    P.bottles = 0;
    sfx.coin();
    save();
    return;
  }
  if (k === "bus") {
    toast(tx(`${tr(p.name)} · Line 105 · due in ${busWait} min`, `${tr(p.name)} · Linie 105 · kommt in ${busWait} Min.`));
    busWait += 2 + Math.floor(Math.random() * 3);
    bubble(P, L2("It’s not coming.", "Der kommt net."));
    return;
  }
  if (k === "wg") {
    const h = Math.floor(clock / 60);
    if (h >= 21 || h < 6) {
      clock = 7 * 60;
      day++;
      P.energy = 100;
      toast(tx("Slept well. Good morning, Lautern.", "Geschlafen. Guten Morgen, Lautern."));
      save();
    } else {
      P.energy = Math.min(100, P.energy + 10);
      toast(
        tx(
          "Your WG. The cleaning rota says it’s your week. You can sleep here after 21:00.",
          "Deine WG. Laut Putzplan bist du diese Woche dran. Schlafen geht ab 21:00.",
        ),
      );
    }
    return;
  }
  const msgs = {
    rathaus: L2("Bürgeramt: appointments online only. Next free slot: March.", "Bürgeramt: Termine nur online. Nächster freier Termin: März."),
    hbf: L2("Departures: every train +20 min. Reason: operational delays.", "Abfahrtstafel: alle Züge +20 Min. Grund: Verzögerungen im Betriebsablauf."),
    stadion: matchday
      ? L2("Entry! Show your ticket.", "Einlass! Ticket bitte.")
      : L2("No match today. The grass is sacred anyway.", "Heute kein Spiel. Der Rasen ist trotzdem heilig."),
    garten: L2("Gartenschau: Japanese garden, rose beds and life-size dinosaurs. Students free.", "Gartenschau: Japanischer Garten, Rosen und lebensgroße Dinos. Studierende frei."),
    oma: L2("Oma Hilde: “Have you eaten yet?”", "Oma Hilde: „Hesch schon gess?“"),
  };
  if (k === "mensa") {
    if (P.money < 2.4) {
      toast(tx("Semolina pudding costs €2.40.", "Grießbrei kostet 2,40 €."));
      return;
    }
    P.money -= 2.4;
    P.energy = Math.min(100, P.energy + 30);
    sfx.coin();
    toast(tx("Semolina pudding with cherries · −€2.40 · +30 energy", "Grießbrei mit Kirschen · −2,40 € · +30 Energie"));
    return;
  }
  if (msgs[k]) toast(msgs[k], 3400);
}
function horn() {
  if (state !== "play") return;
  sfx.horn();
  const q = pos();
  let n = 0;
  for (const p of peds) {
    if (n < 1 && !p.knock && Math.hypot(p.x - q.x, p.y - q.y) < T * 4) {
      bubble(p, pick(HONKED));
      n++;
    }
  }
}
