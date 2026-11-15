// =================== POSITION / TOAST / DIALOG ===================
import { langListeners, tr, tx } from "../core/i18n.js";
import { $ } from "../core/utils.js";
import { game, P } from "../core/state.js";
import { audio, sfx } from "../systems/audio.js";
import { el } from "./phone.js";

export const pos = () => (P.onFoot || !P.veh ? P : P.veh);

let toastT = 0;
export function toast(m, ms = 2800) {
  const t = $("toast");
  t.textContent = tr(m);
  t.classList.add("show");
  toastT = ms / 1000;
}
let flashT = 0;
export function flash(a, b) {
  const f = $("cheatflash");
  f.textContent = "";
  f.append(document.createTextNode(a));
  const s = document.createElement("small");
  s.textContent = b;
  f.append(s);
  f.classList.add("show");
  flashT = 2.2;
}
/** Hides the toast and the cheat flash once their time is up. */
export function updateFeedback(dt) {
  if (toastT > 0) {
    toastT -= dt;
    if (toastT <= 0) $("toast").classList.remove("show");
  }
  if (flashT > 0) {
    flashT -= dt;
    if (flashT <= 0) $("cheatflash").classList.remove("show");
  }
}

// ---- dialog queue ----
// Entries: { who, text } | { who, text, opts: [{ label, fn → reply lines }] } | { fn }
// `who` and `text` may be { en, de } objects; they are resolved when shown.
const dq = [];
export let dCur = null;
export function say(lines, after) {
  for (const l of lines) dq.push(Array.isArray(l) ? { who: l[0], text: l[1] } : l);
  if (after) dq.push({ fn: after });
  if (game.state !== "dialog") nextDialog();
}
export function nextDialog() {
  if (dCur && dCur.opts) return; // a choice must be picked
  while (dq.length && dq[0].fn) dq.shift().fn();
  if (!dq.length) {
    dCur = null;
    $("dialog").hidden = true;
    if (game.state === "dialog") game.state = "play";
    return;
  }
  // a callback may have opened a card; queued lines wait until it closes
  if (game.state !== "play" && game.state !== "dialog") {
    dCur = null;
    $("dialog").hidden = true;
    return;
  }
  dCur = dq.shift();
  renderDialog();
  game.state = "dialog";
}
function renderDialog() {
  const d = dCur;
  if (!d) return;
  $("dWho").textContent = tr(d.who);
  $("dTxt").textContent = tr(d.text);
  const act = $("dAct");
  act.textContent = "";
  if (d.opts) {
    d.opts.forEach((o, i) => {
      const b = el("button", "btn ghost choice", `${i + 1}. ${tr(o.label)}`);
      b.type = "button";
      b.onclick = () => choose(i);
      act.append(b);
    });
  } else {
    const b = el("button", "btn", tx("Next", "Weiter"));
    b.type = "button";
    b.id = "dNext";
    b.onclick = () => {
      audio();
      nextDialog();
    };
    act.append(b);
  }
  $("dialog").hidden = false;
}
export function choose(i) {
  const d = dCur;
  if (!d || !d.opts || !d.opts[i]) return;
  audio();
  sfx.pick();
  const reply = d.opts[i].fn ? d.opts[i].fn() || [] : [];
  dCur = null;
  dq.unshift(...reply.map((l) => (Array.isArray(l) ? { who: l[0], text: l[1] } : l)));
  nextDialog();
}
/** Drops the open line and everything queued behind it. */
export function clearDialog() {
  dq.length = 0;
  dCur = null;
}
/** Resume queued dialog after a card/overlay closes. */
export function resumeDialog() {
  if (dq.length && game.state === "play") nextDialog();
}
langListeners.push(renderDialog);
