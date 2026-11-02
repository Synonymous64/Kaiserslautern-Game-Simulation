"use strict";
// =================== POSITION / TOAST / DIALOG ===================
const pos = () => (P.onFoot || !P.veh ? P : P.veh);

let toastT = 0;
function toast(m, ms = 2800) {
  const t = $("toast");
  t.textContent = tr(m);
  t.classList.add("show");
  toastT = ms / 1000;
}
let flashT = 0;
function flash(a, b) {
  const f = $("cheatflash");
  f.textContent = "";
  f.append(document.createTextNode(a));
  const s = document.createElement("small");
  s.textContent = b;
  f.append(s);
  f.classList.add("show");
  flashT = 2.2;
}

// ---- dialog queue ----
// Entries: { who, text } | { who, text, opts: [{ label, fn → reply lines }] } | { fn }
// `who` and `text` may be { en, de } objects; they are resolved when shown.
const dq = [];
let dCur = null;
function say(lines, after) {
  for (const l of lines) dq.push(Array.isArray(l) ? { who: l[0], text: l[1] } : l);
  if (after) dq.push({ fn: after });
  if (state !== "dialog") nextDialog();
}
function nextDialog() {
  if (dCur && dCur.opts) return; // a choice must be picked
  while (dq.length && dq[0].fn) dq.shift().fn();
  if (!dq.length) {
    dCur = null;
    $("dialog").hidden = true;
    if (state === "dialog") state = "play";
    return;
  }
  // a callback may have opened a card; queued lines wait until it closes
  if (state !== "play" && state !== "dialog") {
    dCur = null;
    $("dialog").hidden = true;
    return;
  }
  dCur = dq.shift();
  renderDialog();
  state = "dialog";
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
function choose(i) {
  const d = dCur;
  if (!d || !d.opts || !d.opts[i]) return;
  audio();
  sfx.pick();
  const reply = d.opts[i].fn ? d.opts[i].fn() || [] : [];
  dCur = null;
  dq.unshift(...reply.map((l) => (Array.isArray(l) ? { who: l[0], text: l[1] } : l)));
  nextDialog();
}
/** Resume queued dialog after a card/overlay closes. */
function resumeDialog() {
  if (dq.length && state === "play") nextDialog();
}
langListeners.push(renderDialog);
