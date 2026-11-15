// =================== HUD ===================
import { tr, tx } from "../core/i18n.js";
import { $, clamp, eur } from "../core/utils.js";
import { POIS } from "../world/world.js";
import { VT } from "../world/vehicles.js";
import { game, P, weather } from "../core/state.js";
import { AL } from "../data/text.js";
import { MISSIONS } from "../data/missions.js";
import { curMission, curStep, fmtTime, M, runStats } from "../systems/missions.js";
import { useAction } from "../systems/actions.js";
import { coarse } from "../input/input.js";
import { el } from "./phone.js";
import { clockStr } from "../render/maps.js";

export const HUD_SAFE = { top: 120, bottom: 110 };
let hudT = 0,
  lastMoney = null,
  moneyFx = 0;
const setText = (id, v) => {
  const e = $(id);
  if (e.textContent !== v) e.textContent = v;
};
/** Refreshes the HUD ten times a second. */
export function tickHUD(dt) {
  hudT -= dt;
  if (hudT <= 0) {
    hudT = 0.1;
    updateHUD();
  }
}
/** Makes the next tickHUD() redraw straight away. */
export function resetHUD() {
  hudT = 0;
}
export function updateHUD() {
  const ht = document.querySelector(".hud-top").getBoundingClientRect();
  HUD_SAFE.top = ht.bottom + 34;
  HUD_SAFE.bottom = coarse ? 200 : 100;
  // ---- money (flashes green/red on change) ----
  setText("hMoney", eur(P.money));
  if (lastMoney !== null && Math.abs(P.money - lastMoney) > 0.001) {
    const m = $("hMoney");
    m.classList.remove("flash-up", "flash-down");
    m.classList.add(P.money > lastMoney ? "flash-up" : "flash-down");
    moneyFx = 0.8;
  }
  lastMoney = P.money;
  if (moneyFx > 0 && (moneyFx -= 0.1) <= 0) $("hMoney").classList.remove("flash-up", "flash-down");

  setText("hBottles", `${P.bottles} ${tx("bottles", "Pfand")}`);
  setText("hClock", `${tx("Day", "Tag")} ${game.day} · ${clockStr()}`);
  const h = (game.clock / 60) % 24;
  setText(
    "hWeather",
    (weather.rain ? tx("Rain", "Regen") : weather.wet > 0.3 ? tx("Wet", "Nass") : tx("Clear", "Klar")) +
      (h >= 21 || h < 6 ? " · " + tx("Night", "Nacht") : ""),
  );
  const en = $("hEnergy");
  en.style.width = Math.max(0, P.energy) + "%";
  en.style.background = P.energy < 25 ? "var(--red-lt)" : "var(--sign)";

  // ---- wanted level ----
  $("hAerger").hidden = !game.aerger;
  if (game.aerger) {
    [...$("hPips").children].forEach((e, i) => e.classList.toggle("on", i < game.aerger));
    setText("hALabel", tr(AL[game.aerger]));
  }

  // ---- objective panel ----
  let kicker = "",
    title = "",
    text = "",
    timer = null;
  const extra = [];
  const st = curStep();
  if (game.job) {
    kicker = game.job.kind === "taxi" ? "Taxi" : "Pfalzfood";
    title =
      game.job.phase === "pickup"
        ? game.job.kind === "taxi"
          ? tx("Pick up the passenger", "Hol den Fahrgast ab")
          : tx(`Pick up at ${tr(game.job.from.name)}`, `Abholen bei ${tr(game.job.from.name)}`)
        : game.job.kind === "taxi"
          ? tx(`Drive to ${tr(game.job.to.name)}`, `Fahr zu ${tr(game.job.to.name)}`)
          : tx(`Deliver to ${game.job.to.name}`, `Liefern an ${game.job.to.name}`);
    if (game.job.kind === "food") text = tr(game.job.item);
    if (game.job.timer !== null) {
      timer = game.job.timer;
      extra.push(el("span", null, eur(game.job.pay)));
    }
    if (st) text = (text ? text + " · " : "") + tx("Mission: ", "Mission: ") + tr(st.text);
  } else if (st) {
    const m = curMission();
    kicker = `${M.idx + 1}/${MISSIONS.length} · ${tr(m.title)}`;
    title = tr(st.text);
    if (st.need) text = `${eur(P.money)} / ${eur(st.need)}`;
    if (st.type === "multi") {
      const box = el("div", "checks");
      for (const s of st.stops) {
        const c = el("span", M.visited[s.to] ? "ok" : "", `${tr(s.label)} · ${tr(POIS[s.to].name)}`);
        box.append(c);
      }
      extra.push(box);
    }
    if (st.type === "collect")
      text = `${st.count - M.pickups.length}/${st.count} ${tr(st.label)}`;
    if (st.wait && M.wait < st.wait) {
      text = st.waitText ? tr(st.waitText(M.wait)) : "";
      timer = M.wait;
    }
    if (M.timer !== null) timer = M.timer;
    if (st.cargo && M.integrity !== null) {
      const lab = el("span", null, tr(st.cargo.label));
      const bar = el("div", "bar");
      const i = el("i");
      i.style.width = M.integrity + "%";
      i.style.background = M.integrity < 35 ? "var(--red-lt)" : "var(--good)";
      bar.append(i);
      extra.push(lab, bar);
    }
    // live bonus counters (e.g. jobs 2/3)
    const R = runStats();
    const live = m.bonus.filter((b) => b.live).map((b) => `★ ${b.live(R)}`);
    if (live.length) extra.push(el("span", null, live.join(" · ")));
  }
  const O = $("hObj");
  O.hidden = !title;
  if (title) {
    setText("hObjK", kicker);
    setText("hObjT", title);
    setText("hObjP", text);
    const tm = $("hObjTimer");
    tm.hidden = timer === null;
    if (timer !== null) {
      setText("hObjTimer", timer < 0 ? tx("late", "spät") : fmtTime(Math.ceil(timer)));
      tm.classList.toggle("low", timer < 10);
    }
    const X = $("hObjX");
    X.textContent = "";
    X.append(...extra);
    X.hidden = !extra.length;
  }

  // ---- vehicle box + gauge ----
  const box = $("hVehBox");
  box.classList.toggle("foot", P.onFoot);
  if (P.onFoot) {
    setText("hVeh", tx("On foot", "Zu Fuß"));
  } else {
    const kmh = Math.round(Math.abs(P.veh.speed) * 0.16);
    setText("hVeh", tr(VT[P.veh.type].name));
    setText("hSpd", String(kmh));
    const g = $("hGauge");
    const p = clamp(Math.abs(P.veh.speed) / VT[P.veh.type].max, 0, 1);
    g.style.setProperty("--p", p.toFixed(3));
    g.style.setProperty("--gc", kmh > 50 ? "var(--red-lt)" : p > 0.7 ? "var(--sign)" : "var(--good)");
  }
  const ua = useAction();
  const hint = $("hHint");
  hint.textContent = "";
  const keyHint = (k, t) => {
    const b = el("b", null, k);
    if (hint.childNodes.length) hint.append(" · ");
    hint.append(b, " " + t);
  };
  if (!P.onFoot) {
    keyHint("E", tx("get out", "aussteigen"));
    keyHint("Space", tx("handbrake", "Handbremse"));
    keyHint("H", tx("horn", "Hupe"));
  } else if (ua && ua.long) keyHint("E", ua.long);
  else {
    keyHint("P", tx("phone", "Handy"));
    keyHint("M", tx("map", "Karte"));
  }

  // ---- touch buttons follow context ----
  if (coarse) {
    const use = $("tUse");
    setText("tUseL", ua ? ua.label : tx("Use", "Aktion"));
    use.classList.toggle("idle", !ua);
    setText("tAlt", P.onFoot ? tx("Run", "Rennen") : tx("Brake", "Bremse"));
    $("tHorn").hidden = P.onFoot;
    setText("tHorn", tx("Horn", "Hupe"));
  }
}
