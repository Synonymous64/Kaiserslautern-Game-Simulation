"use strict";
// =================== PHONE / MAP ===================
function el(tag, cls, text) {
  const e = document.createElement(tag);
  if (cls) e.className = cls;
  if (text != null) e.textContent = text;
  return e;
}
function btn(label, cls, fn) {
  const b = el("button", "btn small " + (cls || ""), label);
  b.type = "button";
  b.onclick = fn;
  return b;
}
function item(t, s, cls, right) {
  const d = el("div", "ph-item" + (cls ? " " + cls : ""));
  const head = el("span", "t");
  head.append(el("span", null, t));
  if (right) head.append(el("span", "stars", right));
  d.append(head);
  if (s) d.append(el("span", "s", s));
  return d;
}

let phTab = "story";
function openPhone() {
  if (state !== "play") return;
  state = "phone";
  $("phone").hidden = false;
  renderPhone();
}
function closePhone() {
  if (state === "phone") state = "play";
  $("phone").hidden = true;
  resumeDialog();
}
document.querySelectorAll(".ph-tabs button").forEach((b) =>
  b.addEventListener("click", () => {
    phTab = b.dataset.tab;
    renderPhone();
  }),
);
$("phClose").addEventListener("click", closePhone);

function renderPhone() {
  if ($("phone").hidden) return;
  document
    .querySelectorAll(".ph-tabs button")
    .forEach((b) => b.setAttribute("aria-selected", b.dataset.tab === phTab ? "true" : "false"));
  const B = $("phBody");
  B.textContent = "";
  $("phClock").textContent = clockStr();
  if (phTab === "story") {
    B.append(el("h4", null, tx("Chapter 1 · Innenstadt", "Kapitel 1 · Innenstadt")));
    B.append(el("span", "s", tx(`${totalStars()} of ${MISSIONS.length * 3} stars`, `${totalStars()} von ${MISSIONS.length * 3} Sternen`)));
    MISSIONS.forEach((m, i) => {
      const active = M && M.idx === i;
      const done = i < mi;
      const cls = active ? "now" : done ? "done" : i === mi ? "now" : "locked";
      const st = active && curStep() ? tx("Now: ", "Jetzt: ") + tr(curStep().text) : i > mi ? tx("Locked. ", "Gesperrt. ") + tr(m.blurb) : tr(m.blurb);
      const d = item(`${i + 1}. ${tr(m.title)}`, st, cls, done ? starStr(stars[i] || 0) : "");
      if (active) {
        d.append(btn(tx("Abandon", "Abbrechen"), "ghost", () => {
          abandonMission();
          renderPhone();
        }));
      } else if (!M && missionUnlocked(i)) {
        d.append(
          btn(done ? tx("Replay", "Nochmal") : tx("Start", "Starten"), done ? "ghost" : "", () => {
            closePhone();
            offerMission(i);
          }),
        );
      }
      B.append(d);
    });
    if (mi >= MISSIONS.length)
      B.append(item(tx("Free roam", "Freies Spiel"), tx("Chapter done. Replay missions for stars, deliver food, drive taxi, find codes.", "Kapitel geschafft. Missionen für Sterne wiederholen, liefern, Taxi fahren, Codes finden.")));
  } else if (phTab === "jobs") {
    B.append(el("h4", null, tx("Odd jobs", "Nebenjobs")));
    if (job) {
      const d = item(
        job.kind === "taxi" ? tx("Taxi fare running", "Taxifahrt läuft") : tx("Pfalzfood order running", "Pfalzfood-Bestellung läuft"),
        job.kind === "taxi" ? tx("To ", "Nach ") + tr(job.to.name) : `${tr(job.item)} → ${job.to.name}`,
        "now",
      );
      d.append(btn(tx("Cancel job", "Job abbrechen"), "ghost", () => {
        cancelJob(tx("Job cancelled.", "Job abgebrochen."));
        renderPhone();
      }));
      B.append(d);
    }
    const f = item(
      tx("Pfalzfood delivery", "Pfalzfood-Lieferung"),
      tx("Pick up at a restaurant, deliver before the timer runs out. ", "Im Restaurant abholen, vor Ablauf des Timers liefern. ") +
        (weather.rain ? tx("Raining now: +25%.", "Es regnet: +25 %.") : tx("Rain pays 25% extra.", "Regen bringt 25 % extra.")),
    );
    f.append(btn(tx("Take order", "Auftrag annehmen"), "", () => startJob("food")));
    B.append(f);
    const t = item(tx("Taxi fares", "Taxifahrten"), tx("Needs a taxi. The ivory one waits at the Hauptbahnhof car park.", "Braucht ein Taxi. Das elfenbeinfarbene steht am Hauptbahnhof-Parkplatz."));
    t.append(btn(tx("Find passenger", "Fahrgast suchen"), "", () => startJob("taxi")));
    B.append(t);
    B.append(item(tx("Bottle deposit", "Pfandflaschen"), tx("Green bottles lie around town. 25 cents each at the Globo Markt machine.", "Grüne Flaschen liegen überall. 25 Cent pro Stück am Globo-Automaten.")));
  } else if (phTab === "codes") {
    B.append(el("h4", null, tx("Codes", "Codes")));
    B.append(el("span", "s", tx("Type a code on the keyboard while playing, or tap one. Codes mark your save as cheated. There are more than these.", "Code während des Spiels tippen oder antippen. Codes markieren den Spielstand. Es gibt noch mehr.")));
    for (const c of ["REJE", "SUNN", "NACHT", "GUDEMORJE", "SCHORLE", "GELD", "KEENSTRESS", "BETZE"]) {
      const d = item("", tr(CHEATS[c][1]));
      d.firstChild.className = "t code";
      d.firstChild.textContent = c;
      d.append(btn(tx("Use", "Nutzen"), "ghost", () => {
        runCheat(c);
        closePhone();
      }));
      B.append(d);
    }
  } else {
    B.append(el("h4", null, tx("Me", "Ich")));
    B.append(item(eur(P.money), tx("Balance", "Kontostand")));
    B.append(item(`${totalStars()} ★`, tx("Mission stars", "Missionssterne")));
    B.append(item(String(P.deliveries), tx("Jobs done", "Erledigte Jobs")));
    B.append(item(String(P.bottles), tx("Bottles in your bag", "Pfandflaschen im Rucksack")));
    B.append(item(`${P.crashes} / ${P.redlights} / ${eur(P.fines)}`, tx("Crashes / red lights / fines paid", "Unfälle / rote Ampeln / Bußgelder")));
    B.append(item(tx("Day ", "Tag ") + day, clockStr() + (cheated ? tx(" · cheats used", " · Cheats benutzt") : "")));
    const s = item(tx("Settings", "Einstellungen"), tx("Language, sound and graphics", "Sprache, Ton und Grafik"));
    s.append(btn(tx("Open", "Öffnen"), "ghost", () => {
      closePhone();
      openPause();
    }));
    B.append(s);
  }
}
langListeners.push(renderPhone);

function openMap() {
  if (state !== "play") return;
  state = "map";
  $("bigmap").hidden = false;
  drawBigMap();
}
function closeMap() {
  if (state === "map") state = "play";
  $("bigmap").hidden = true;
  resumeDialog();
}
$("mapClose").addEventListener("click", closeMap);
$("bigmap").addEventListener("click", (e) => {
  if (e.target === $("bigmap")) closeMap();
});
