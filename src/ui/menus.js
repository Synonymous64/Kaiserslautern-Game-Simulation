// =================== CARDS, PAUSE, SETTINGS, LANDING ===================
import {
  applyI18n, I18N, langListeners, saveSettings, setLang, SETTINGS, tr, tx,
} from "../core/i18n.js";
import { $, eur } from "../core/utils.js";
import { game, P, save } from "../core/state.js";
import { audio, rainSound, setSound, soundOn } from "../systems/audio.js";
import { MUSIC, setMusic } from "../systems/music.js";
import { TIPS } from "../data/text.js";
import { MISSIONS } from "../data/missions.js";
import { abandonMission, M, totalStars } from "../systems/missions.js";
import { clearDialog, resumeDialog } from "./feedback.js";
import { closeMap, closePhone, el } from "./phone.js";
import { resize } from "../render/ground.js";
import { applyView } from "../render/view.js";
import { updateHUD } from "./hud.js";
import { hasSave } from "../main.js";

// ---------- modal card (mission briefing / result / fail / finale) ----------
let cardActs = [],
  cardRefresh = null; // re-renders the open card after a language switch
export function showCard({ kicker, title, lede, body = [], actions = [], fail = false, refresh = null }) {
  cardRefresh = refresh;
  $("dialog").hidden = true;
  const c = $("mcard");
  c.querySelector(".mcard").classList.toggle("fail", fail);
  $("mcK").textContent = kicker || "";
  $("mcT").textContent = title || "";
  $("mcP").textContent = lede || "";
  $("mcP").hidden = !lede;
  const B = $("mcBody");
  B.textContent = "";
  B.append(...body);
  const A = $("mcA");
  A.textContent = "";
  cardActs = actions;
  actions.forEach((a) => {
    const b = el("button", "btn " + (a.cls || ""), a.label);
    b.type = "button";
    b.onclick = () => closeCard(a);
    A.append(b);
  });
  game.state = "card";
  c.hidden = false;
  setTimeout(() => A.lastChild && A.lastChild.focus({ preventScroll: true }), 50);
}
function closeCard(a) {
  cardRefresh = null;
  $("mcard").hidden = true;
  game.state = "play";
  if (a && a.fn) a.fn();
  resumeDialog();
}
/** Enter on a card = its primary (last) action. */
export function cardDefault() {
  if (cardActs.length) closeCard(cardActs[cardActs.length - 1]);
}

// ---------- settings rows (rendered into landing + pause) ----------
function segRow(label, opts, cur, onPick) {
  const row = el("div", "set-row");
  row.append(el("span", null, label));
  const seg = el("div", "seg");
  for (const [val, txt] of opts) {
    const b = el("button", null, txt);
    b.type = "button";
    b.setAttribute("aria-pressed", String(val === cur));
    b.onclick = () => {
      onPick(val);
      renderSettings();
    };
    seg.append(b);
  }
  row.append(seg);
  return row;
}
function renderSettings() {
  for (const id of ["settingsStart", "settingsPause"]) {
    const box = $(id);
    if (!box) continue;
    box.textContent = "";
    box.append(
      segRow(tr(I18N.language), [["en", "English"], ["de", "Deutsch"]], SETTINGS.lang, (v) => setLang(v)),
      segRow(tr(I18N.sound), [[true, tr(I18N.on)], [false, tr(I18N.off)]], soundOn, (v) => {
        audio();
        setSound(v);
      }),
      segRow(tr(I18N.music), [[true, tr(I18N.on)], [false, tr(I18N.off)]], MUSIC.on, (v) => {
        audio();
        setMusic(v);
      }),
      segRow(tr(I18N.view), [["3d", "3D"], ["2d", "2D"]], SETTINGS.view, (v) => {
        SETTINGS.view = v;
        saveSettings();
        applyView();
      }),
      segRow(tr(I18N.quality), [["high", tr(I18N.qHigh)], ["low", tr(I18N.qLow)]], SETTINGS.quality, (v) => {
        SETTINGS.quality = v;
        saveSettings();
        resize();
      }),
    );
  }
}

// ---------- pause ----------
export function openPause() {
  if (game.state !== "play" && game.state !== "phone" && game.state !== "map") return;
  if (game.state === "phone") closePhone();
  if (game.state === "map") closeMap();
  game.state = "pause";
  renderSettings();
  $("pause").hidden = false;
}
export function closePause() {
  $("pause").hidden = true;
  if (game.state === "pause") game.state = "play";
  resumeDialog();
}
$("pResume").addEventListener("click", closePause);
$("pMenu").addEventListener("click", () => {
  closePause();
  backToMenu();
});
$("pause").addEventListener("click", (e) => {
  if (e.target === $("pause")) closePause();
});

function backToMenu() {
  if (M) abandonMission();
  clearDialog();
  save();
  for (const id of ["dialog", "phone", "bigmap", "mcard", "hud", "touch"]) $(id).hidden = true;
  game.state = "title";
  rainSound(false);
  refreshLanding();
  $("start").hidden = false;
  $("start").scrollTop = 0;
}

// ---------- landing ----------
export function refreshLanding() {
  applyI18n();
  const has = hasSave;
  $("play").textContent = has
    ? game.mi >= MISSIONS.length
      ? tx("Free roam", "Freies Spiel")
      : tx("Continue", "Weiterspielen")
    : tr(I18N.play);
  $("reset").hidden = !has;
  const list = $("startMissions");
  list.textContent = "";
  MISSIONS.forEach((m, i) => {
    const li = el("li", i < game.mi ? "done" : i === game.mi ? "now" : "locked");
    li.append(el("span", "num", i < game.mi ? "✓" : String(i + 1)));
    li.append(el("span", "t", tr(m.title)));
    const s = el("span", "stars");
    const n = game.stars[i] || 0;
    for (let k = 0; k < 3; k++) s.append(k < n ? el("b", null, "★") : document.createTextNode("★"));
    li.append(s);
    list.append(li);
  });
  const done = Math.min(game.mi, MISSIONS.length);
  $("startProgress").textContent = `${done}/${MISSIONS.length} · ${totalStars()}★`;
  $("startBar").style.width = (done / MISSIONS.length) * 100 + "%";
  renderSettings();
  showTip();
}
let tipI = Math.floor(Math.random() * TIPS.length);
function showTip(advance) {
  if (advance) tipI++;
  const t = $("tip");
  t.textContent = "";
  t.append(el("b", null, tx("Tip", "Tipp")), document.createTextNode(tr(TIPS[tipI % TIPS.length])));
}
setInterval(() => {
  if (game.state === "title") showTip(true);
}, 6000);
document.querySelectorAll("[data-lang]").forEach((b) =>
  b.addEventListener("click", () => {
    setLang(b.dataset.lang);
  }),
);
langListeners.push(() => {
  if (game.state === "title") refreshLanding();
  else if (game.state === "card" && cardRefresh) cardRefresh();
  else renderSettings();
  updateHUD();
});

// ---------- chapter finale ----------
export function showFinale() {
  game.finaleShown = true;
  save();
  const body = [];
  const s = el("div", "stats");
  for (const [a, b] of [
    [tx("Balance", "Kontostand"), eur(P.money)],
    [tx("Stars", "Sterne"), `${totalStars()} / ${MISSIONS.length * 3}`],
    [tx("Jobs", "Jobs"), P.deliveries],
    [tx("Day", "Tag"), game.day],
    [tx("Cheats", "Cheats"), game.cheated ? tx("yes", "ja") : tx("no", "nein")],
  ]) s.append(el("span", null, a), el("span", null, String(b)));
  body.push(s);
  const sig = el("div", "signature big");
  sig.append(el("span", "sig-kicker", tx("A game by", "Ein Spiel von")), el("span", "sig-name", "Prajwal Vilas Urkude"));
  body.push(sig);
  showCard({
    kicker: tx("Chapter 1 complete", "Kapitel 1 geschafft"),
    title: tx("Welcome home, Lautre", "Willkommen daheim, Lautre"),
    lede: tx(
      "Registered, deposit paid, Saumagen intact, and you made kickoff on the Betze. The city stays open: replay missions for stars, take jobs and hunt for codes.",
      "Angemeldet, Kaution bezahlt, Saumagen heil und pünktlich zum Anpfiff auf dem Betze. Die Stadt bleibt offen: Missionen für Sterne wiederholen, Jobs annehmen, Codes suchen.",
    ),
    body,
    actions: [{ label: tx("Keep playing", "Weiterspielen"), cls: "gold", fn: () => {} }],
  });
}

// ---------- credits ----------
let creditsReturn = null;
function openCredits() {
  creditsReturn = document.activeElement;
  applyI18n($("credits"));
  $("credits").hidden = false;
  $("crClose").focus({ preventScroll: true });
}
function closeCredits() {
  $("credits").hidden = true;
  if (creditsReturn && creditsReturn.focus) creditsReturn.focus({ preventScroll: true });
}
$("creditsBtn").addEventListener("click", openCredits);
$("pCredits").addEventListener("click", openCredits);
$("crClose").addEventListener("click", closeCredits);
$("credits").addEventListener("click", (e) => {
  if (e.target === $("credits")) closeCredits();
});
// Esc / Enter close the credits before the game sees the key
addEventListener(
  "keydown",
  (e) => {
    if ($("credits").hidden) return;
    if (e.key === "Escape" || e.key === "Enter") {
      e.preventDefault();
      e.stopImmediatePropagation();
      closeCredits();
    }
  },
  true,
);
