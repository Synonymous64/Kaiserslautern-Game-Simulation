"use strict";
// =================== SETTINGS & LANGUAGE (EN / DE) ===================
// Every player-facing string goes through tx(en, de) or tr({ en, de }).
// Place and street names stay German; they are proper nouns.

const SETTINGS_KEY = "lautre-settings-v1";
const IS_TOUCH =
  matchMedia("(pointer: coarse)").matches ||
  /[?&]touch=1/.test(location.search);
const SETTINGS = (() => {
  const def = {
    lang: (navigator.language || "en").toLowerCase().startsWith("de")
      ? "de"
      : "en",
    sound: true,
    quality: IS_TOUCH ? "low" : "high",
  };
  try {
    return Object.assign(
      def,
      JSON.parse(localStorage.getItem(SETTINGS_KEY) || "{}"),
    );
  } catch (e) {
    return def;
  }
})();
function saveSettings() {
  try {
    localStorage.setItem(SETTINGS_KEY, JSON.stringify(SETTINGS));
  } catch (e) {}
}

const tx = (en, de) => (SETTINGS.lang === "de" ? de : en);
const tr = (o) =>
  o == null ? "" : typeof o === "string" ? o : (o[SETTINGS.lang] ?? o.en);

// ---- static page text (elements with data-i18n / data-i18n-html) ----
const I18N = {
  eyebrow: {
    en: "Open-city adventure · Kaiserslautern",
    de: "Open-City-Abenteuer · Kaiserslautern",
  },
  signSub: {
    en: "Kaiserslautern · Chapter 1: Innenstadt",
    de: "Kaiserslautern · Kapitel 1: Innenstadt",
  },
  headline: {
    en: "New in town.<br>Broke. <em>Determined.</em>",
    de: "Neu in der Stadt.<br>Pleite. <em>Entschlossen.</em>",
  },
  lede: {
    en: "One backpack, a squeaky bike and a landlord who wants <b>three months’ rent</b> as a deposit. Make Lautre your home: deliver food, dodge the Ordnungsamt, catch the late train and make kickoff on the Betze.",
    de: "Ein Rucksack, ein quietschendes Fahrrad und ein Vermieter, der <b>drei Kaltmieten</b> Kaution will. Mach Lautre zu deinem Zuhause: Essen ausliefern, dem Ordnungsamt entwischen, den verspäteten Zug abholen und pünktlich zum Anpfiff auf dem Betze sein.",
  },
  play: { en: "Play", de: "Spielen" },
  newGame: { en: "New game", de: "Neues Spiel" },
  enterHint: {
    en: "Press <kbd>Enter</kbd> to start · progress saves in your browser",
    de: "<kbd>Enter</kbd> zum Starten · Fortschritt wird im Browser gespeichert",
  },
  touchHint: {
    en: "Best in landscape · progress saves on this device",
    de: "Am besten im Querformat · Fortschritt wird auf dem Gerät gespeichert",
  },
  chip1: { en: "8 story missions", de: "8 Story-Missionen" },
  chip2: { en: "Day & night", de: "Tag & Nacht" },
  chip3: { en: "Live weather", de: "Wetter" },
  chip4: { en: "Real traffic lights", de: "Echte Ampeln" },
  chip5: { en: "English & Deutsch", de: "Deutsch & English" },
  panelMissions: { en: "Chapter 1 · Innenstadt", de: "Kapitel 1 · Innenstadt" },
  panelControls: { en: "How to play", de: "Steuerung" },
  panelCity: { en: "The city", de: "Die Stadt" },
  cWalk: { en: "Walk, ride, drive", de: "Laufen, radeln, fahren" },
  cRun: { en: "Run (uses energy)", de: "Rennen (kostet Energie)" },
  cUse: {
    en: "Get in/out, buy, talk",
    de: "Ein-/Aussteigen, kaufen, reden",
  },
  cBrake: { en: "Handbrake / drift", de: "Handbremse / Drift" },
  cHorn: { en: "Horn", de: "Hupe" },
  cPhone: {
    en: "Phone: missions, jobs, codes",
    de: "Handy: Missionen, Jobs, Codes",
  },
  cMap: { en: "City map", de: "Stadtplan" },
  cPause: { en: "Pause & settings", de: "Pause & Einstellungen" },
  tJoy: {
    en: "Drag anywhere on the left half to move. Your vehicle turns towards the stick.",
    de: "Linke Bildschirmhälfte ziehen zum Bewegen. Fahrzeuge lenken in Richtung des Sticks.",
  },
  tUse: {
    en: "Big button: get in, buy, talk. It shows what it will do.",
    de: "Großer Knopf: einsteigen, kaufen, reden. Er zeigt, was er tut.",
  },
  tAlt: {
    en: "Run on foot · handbrake in a vehicle",
    de: "Zu Fuß rennen · im Fahrzeug Handbremse",
  },
  tTop: {
    en: "Phone, map and pause sit at the top right.",
    de: "Handy, Karte und Pause sind oben rechts.",
  },
  dInnen: {
    en: "Unlocked. 8 missions, Betzenberg and campus included.",
    de: "Freigeschaltet. 8 Missionen, mit Betzenberg und Campus.",
  },
  dVogel: {
    en: "Locked. Still queueing at the commissary.",
    de: "Gesperrt. Steht noch an der Commissary an.",
  },
  dHohen: {
    en: "Locked. Hiking to the castle, back by coffee and cake.",
    de: "Gesperrt. Wandert zur Burg, zurück zu Kaffee und Kuchen.",
  },
  dEins: {
    en: "Locked. Train cancelled, replacement bus pending.",
    de: "Gesperrt. Zug fällt aus, Schienenersatzverkehr folgt.",
  },
  dSieg: {
    en: "Locked. Feeding the goats at the zoo.",
    de: "Gesperrt. Füttert die Ziegen im Zoo.",
  },
  foot: {
    en: "All shops and people are fiction; the street layout is stylised, not a real map. Type cheat codes while playing.",
    de: "Alle Läden und Personen sind erfunden; der Stadtplan ist stilisiert. Cheatcodes während des Spiels eintippen.",
  },
  energy: { en: "Energy", de: "Energie" },
  next: { en: "Next", de: "Weiter" },
  close: { en: "Close", de: "Schließen" },
  mapTitle: { en: "Kaiserslautern · Innenstadt", de: "Kaiserslautern · Innenstadt" },
  paused: { en: "Paused", de: "Pause" },
  resume: { en: "Resume", de: "Weiter" },
  mainMenu: { en: "Main menu", de: "Hauptmenü" },
  language: { en: "Language", de: "Sprache" },
  sound: { en: "Sound", de: "Ton" },
  quality: { en: "Graphics", de: "Grafik" },
  qHigh: { en: "High", de: "Hoch" },
  qLow: { en: "Fast", de: "Schnell" },
  on: { en: "On", de: "An" },
  off: { en: "Off", de: "Aus" },
  tabStory: { en: "Story", de: "Story" },
  tabJobs: { en: "Jobs", de: "Jobs" },
  tabCodes: { en: "Codes", de: "Codes" },
  tabMe: { en: "Me", de: "Ich" },
  live: { en: "Live", de: "Live" },
  rotate: {
    en: "Tip: turn your phone sideways for a wider view.",
    de: "Tipp: Handy quer halten für mehr Überblick.",
  },
};
function applyI18n(root = document) {
  document.documentElement.lang = SETTINGS.lang;
  root.querySelectorAll("[data-i18n]").forEach((e) => {
    const v = I18N[e.dataset.i18n];
    if (v) e.textContent = tr(v);
  });
  root.querySelectorAll("[data-i18n-html]").forEach((e) => {
    const v = I18N[e.dataset.i18nHtml];
    if (v) e.innerHTML = tr(v); // static, developer-authored markup only
  });
  root.querySelectorAll("[data-i18n-label]").forEach((e) => {
    const v = I18N[e.dataset.i18nLabel];
    if (v) e.setAttribute("aria-label", tr(v));
  });
  document
    .querySelectorAll("[data-lang]")
    .forEach((b) =>
      b.setAttribute("aria-pressed", String(b.dataset.lang === SETTINGS.lang)),
    );
}
const langListeners = [];
function setLang(l) {
  SETTINGS.lang = l;
  saveSettings();
  applyI18n();
  langListeners.forEach((f) => f());
}
