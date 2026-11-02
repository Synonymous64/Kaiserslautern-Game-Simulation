"use strict";
// =================== MISSION ENGINE ===================
let M = null; // active mission run, or null
const STAR_BONUS = 10; // € per bonus star

const curMission = () => (M ? MISSIONS[M.idx] : null);
const curStep = () => (M && M.si >= 0 ? MISSIONS[M.idx].steps[M.si] : null);
const missionUnlocked = (i) => i >= 0 && i < MISSIONS.length && i <= mi;
const totalStars = () => stars.reduce((a, b) => a + (b || 0), 0);

function calcTimer(to) {
  const p = POIS[to],
    q = pos();
  return Math.round(
    16 + ((Math.abs(p.x * T - q.x) + Math.abs(p.y * T - q.y)) / T) * 0.3,
  );
}

/** Run statistics used by bonus checks. */
function runStats() {
  if (!M) return null;
  return {
    t: M.t,
    flags: M.flags,
    maxAerger: M.maxAerger,
    crashes: P.crashes - M.s0.crashes,
    redlights: P.redlights - M.s0.redlights,
    jobs: P.deliveries - M.s0.deliveries,
    bottles: P.bottlesTotal - M.s0.bottles,
    integrity: M.integrityMin ?? 100,
    timeLeft: M.timeLeft ?? 0,
    collectTime: M.collectTime ?? 0,
    vehicle: P.onFoot ? "foot" : P.veh.type,
    rewardOverride: M.rewardOverride,
  };
}

// ---------- briefing ----------
function offerMission(i) {
  const m = MISSIONS[i];
  if (!m || M) return;
  const body = [];
  const goals = el("div", "mc-sec");
  goals.append(el("h4", null, tx("Objectives", "Ziele")));
  const ul = el("ul", "mc-list");
  m.steps.forEach((s, k) => {
    if (s.skipIf) return;
    const li = el("li");
    li.append(el("span", "ic", String(k + 1)), el("span", null, tr(s.text)));
    ul.append(li);
  });
  goals.append(ul);
  body.push(goals);
  const bon = el("div", "mc-sec");
  bon.append(el("h4", null, tx("Bonus goals · ★ +€10 each", "Bonusziele · ★ je +10 €")));
  const ub = el("ul", "mc-list");
  for (const b of m.bonus) {
    const li = el("li");
    li.append(el("span", "ic", "★"), el("span", null, tr(b.text)));
    ub.append(li);
  }
  bon.append(ub);
  body.push(bon);
  const best = stars[i] || 0;
  const done = i < mi;
  showCard({
    refresh: () => {
      $("mcard").hidden = true;
      state = "play";
      offerMission(i);
    },
    kicker:
      tx(`Mission ${i + 1} of ${MISSIONS.length}`, `Mission ${i + 1} von ${MISSIONS.length}`) +
      (done ? " · " + tx("Replay", "Wiederholen") + " " + starStr(best) : ""),
    title: tr(m.title),
    lede: tr(m.blurb),
    body,
    actions: [
      {
        label: tx("Later", "Später"),
        cls: "ghost",
        fn: () => {
          if (!done) toast(tx("Start it any time from your phone (Story).", "Jederzeit übers Handy starten (Story)."));
        },
      },
      { label: done ? tx("Replay", "Nochmal") : tx("Start mission", "Mission starten"), fn: () => startMission(i) },
    ],
  });
}
const starStr = (n) => "★".repeat(n) + "☆".repeat(3 - n);

// ---------- run lifecycle ----------
function startMission(i) {
  const m = MISSIONS[i];
  if (!m) return;
  if (job) {
    job = null;
    toast(tx("Job cancelled for the mission.", "Job für die Mission abgebrochen."));
  }
  nextMissionIn = -1;
  M = {
    idx: i,
    si: -1,
    t: 0,
    flags: {},
    timer: null,
    wait: 0,
    integrity: null,
    integrityMin: null,
    timeLeft: null,
    collectTime: null,
    pickups: [],
    visited: {},
    nagT: 0,
    maxAerger: aerger,
    s0: {
      crashes: P.crashes,
      redlights: P.redlights,
      deliveries: P.deliveries,
      bottles: P.bottlesTotal,
    },
  };
  say(m.intro, () => {
    if (!M) return;
    if (m.timeLimit) M.timer = m.timeLimit;
    gotoStep(0);
  });
}
function gotoStep(k) {
  const m = curMission();
  if (!m) return;
  M.si = k;
  const st = curStep();
  if (!st) return finishMission();
  if (st.skipIf && st.skipIf(M)) return gotoStep(k + 1);
  if (st.timer === "auto") M.timer = calcTimer(st.to) + (st.timerBonus || 0);
  else if (typeof st.timer === "number") M.timer = st.timer;
  M.wait = st.wait || 0;
  M.nagT = 0;
  if (st.cargo) {
    M.integrity = 100;
    M.integrityMin = 100;
  }
  if (st.matchday) matchday = true;
  if (st.type === "multi") M.visited = {};
  if (st.type === "collect") spawnPickups(st);
  M.stepT = 0;
}
function spawnPickups(st) {
  const a = st.area,
    cand = [];
  for (let y = a.y1; y <= a.y2; y++)
    for (let x = a.x1; x <= a.x2; x++) {
      const v = get(x, y);
      if (v === WALK || v === PARK || v === PLAZA) cand.push([x, y]);
    }
  M.pickups = [];
  for (let i = 0; i < st.count && cand.length; i++) {
    const [x, y] = cand.splice(Math.floor(Math.random() * cand.length), 1)[0];
    M.pickups.push({ x: tc(x) + (Math.random() - 0.5) * 10, y: tc(y) + (Math.random() - 0.5) * 10 });
  }
  M.collectStart = M.t;
}
function completeStep() {
  const m = curMission(),
    st = curStep();
  if (st.pay) P.money -= st.pay;
  if (st.timer) {
    M.timeLeft = M.timer;
    if (!m.timeLimit) M.timer = null;
  }
  if (st.cargo) M.integrity = null;
  if (st.type === "collect") M.collectTime = M.t - M.collectStart;
  if (st.to === "pfand" && P.bottles) {
    const v = P.bottles * 0.25;
    P.money += v;
    toast(tx(`${P.bottles} bottles returned · +${eur(v)}`, `${P.bottles} Flaschen eingelöst · +${eur(v)}`));
    P.bottles = 0;
  }
  sfx.ok();
  const next = M.si + 1;
  M.si = -1; // pause the step while dialogs play
  const R = runStats();
  const after = () => {
    if (!M) return;
    if (next >= m.steps.length) {
      if (m.timeLimit) M.timeLeft = M.timer;
      finishMission();
    } else gotoStep(next);
  };
  const lines = st.done || [];
  if (st.choice) {
    const c = st.choice;
    say(
      [
        {
          who: c.who,
          text: c.text,
          opts: c.opts.map((o) => ({
            label: o.label,
            fn: () => {
              if (o.fn) o.fn(M);
              return o.reply || [];
            },
          })),
        },
        ...lines,
      ],
      after,
    );
  } else say(lines, after);
  void R;
}
function finishMission() {
  const m = curMission(),
    i = M.idx,
    R = runStats();
  const results = m.bonus.map((b) => !!b.check(R));
  const got = 1 + results.filter(Boolean).length;
  const prev = stars[i] || 0;
  const first = i >= mi;
  let pay = 0;
  if (first) pay = (M.rewardOverride ?? m.reward) + STAR_BONUS * (got - 1);
  else if (got > prev) pay = STAR_BONUS * (got - prev);
  stars[i] = Math.max(prev, got);
  P.money += pay;
  if (first) mi = i + 1;
  matchday = false;
  const finale = m.finale && first;
  M = null;
  save();
  sfx.coin();
  if (m.finale) fireworks(tc(13), tc(42), 8);

  // ----- result card -----
  const body = [];
  const sr = el("div", "bigstars");
  for (let k = 0; k < 3; k++) sr.append(el("span", k < got ? "on" : "", "★"));
  body.push(sr);
  const sec = el("div", "mc-sec");
  const ul = el("ul", "mc-list");
  const row = (ok, text, r) => {
    const li = el("li", ok ? "ok" : "no");
    li.append(el("span", "ic", ok ? "✓" : "✗"), el("span", null, text), el("span", "r", r || ""));
    ul.append(li);
  };
  row(true, tx("Mission complete", "Mission geschafft"));
  m.bonus.forEach((b, k) => row(results[k], tr(b.text), b.live ? b.live(R) : ""));
  sec.append(ul);
  body.push(sec);
  const st = el("div", "stats");
  for (const [a, b] of [
    [tx("Time", "Zeit"), fmtTime(R.t)],
    [tx("Crashes", "Unfälle"), R.crashes],
    [tx("Reward", "Belohnung"), "+" + eur(pay)],
    [tx("Balance", "Kontostand"), eur(P.money)],
  ]) st.append(el("span", null, a), el("span", null, String(b)));
  body.push(st);
  const actions = [];
  if (got < 3) actions.push({ label: tx("Replay for ★", "Nochmal für ★"), cls: "ghost", fn: () => startMission(i) });
  actions.push({
    label: finale ? tx("Chapter finale", "Kapitel-Finale") : tx("Continue", "Weiter"),
    cls: "gold",
    fn: () => {
      if (finale) showFinale();
      else if (mi < MISSIONS.length && first) nextMissionIn = 4;
    },
  });
  showCard({
    kicker: tx("Mission complete", "Mission geschafft"),
    title: tr(m.title),
    lede: "",
    body,
    actions,
  });
}
function failMission(reason) {
  if (!M) return;
  const i = M.idx;
  M = null;
  matchday = false;
  sfx.fail();
  showCard({
    kicker: tx("Mission failed", "Mission gescheitert"),
    title: tr(MISSIONS[i].title),
    lede: tr(reason),
    fail: true,
    actions: [
      { label: tx("Later", "Später"), cls: "ghost", fn: () => {} },
      { label: tx("Retry", "Nochmal"), fn: () => startMission(i) },
    ],
  });
}
function abandonMission() {
  if (!M) return;
  M = null;
  matchday = false;
  toast(tx("Mission abandoned.", "Mission abgebrochen."));
}
const fmtTime = (s) => {
  s = Math.max(0, Math.round(s));
  return Math.floor(s / 60) + ":" + String(s % 60).padStart(2, "0");
};

/** Where the objective marker should point (null = nothing). */
function missionTarget() {
  const st = curStep();
  if (!st) return null;
  const q = pos();
  if (st.type === "go") {
    const p = POIS[st.to];
    return { x: tc(p.x), y: tc(p.y), name: tr(p.name) };
  }
  if (st.type === "multi") {
    let best = null,
      bd = Infinity;
    for (const s of st.stops) {
      if (M.visited[s.to]) continue;
      const p = POIS[s.to],
        d = dist(tc(p.x), tc(p.y), q.x, q.y);
      if (d < bd) {
        bd = d;
        best = { x: tc(p.x), y: tc(p.y), name: tr(p.name) };
      }
    }
    return best;
  }
  if (st.type === "collect") {
    let best = null,
      bd = Infinity;
    for (const k of M.pickups) {
      const d = dist(k.x, k.y, q.x, q.y);
      if (d < bd) {
        bd = d;
        best = { x: k.x, y: k.y, name: tr(st.label), small: true };
      }
    }
    return best;
  }
  return null;
}

// ---------- per-frame ----------
function updateMission(dt) {
  if (nextMissionIn > 0) {
    nextMissionIn -= dt;
    if (nextMissionIn <= 0) {
      nextMissionIn = -1;
      if (!M && mi < MISSIONS.length) offerMission(mi);
    }
  }
  if (!M) return;
  M.maxAerger = Math.max(M.maxAerger, aerger);
  const st = curStep();
  if (!st) return; // dialogs between steps
  const m = curMission();
  M.t += dt;
  M.nagT -= dt;
  if (M.timer !== null) {
    M.timer -= dt;
    if (M.timer <= 0) return failMission(st.timeout || m.timeout || L2("Too late.", "Zu spät."));
  }
  if (M.integrity !== null && M.integrity <= 0)
    return failMission(st.broken || L2("The cargo did not survive.", "Die Ladung hat’s nicht überlebt."));
  const q = pos();
  const near = (to) => {
    const p = POIS[to];
    return dist(q.x, q.y, tc(p.x), tc(p.y)) < T * 1.8;
  };

  if (st.type === "go") {
    if (!near(st.to)) {
      if (st.wait) M.wait = st.wait;
      return;
    }
    if (st.need && P.money < st.need) {
      if (M.nagT <= 0) {
        M.nagT = 4;
        toast(
          tx(
            `You have ${eur(P.money)} of ${eur(st.need)}. Phone → Jobs.`,
            `Du hast ${eur(P.money)} von ${eur(st.need)}. Handy → Jobs.`,
          ),
        );
      }
      return;
    }
    if (st.wait) {
      M.wait -= dt;
      if (M.wait > 0) return;
    }
    completeStep();
  } else if (st.type === "multi") {
    for (const s of st.stops) {
      if (M.visited[s.to] || !near(s.to)) continue;
      if (P.money < s.cost) {
        if (M.nagT <= 0) {
          M.nagT = 4;
          toast(tx(`${tr(s.label)} costs ${eur(s.cost)}. You’re short.`, `${tr(s.label)} kostet ${eur(s.cost)}. Zu wenig Geld.`));
        }
        continue;
      }
      P.money -= s.cost;
      M.visited[s.to] = true;
      sfx.coin();
      const n = Object.keys(M.visited).length;
      toast(`✓ ${tr(s.label)} · −${eur(s.cost)} (${n}/${st.stops.length})`);
    }
    if (st.stops.every((s) => M.visited[s.to])) completeStep();
  } else if (st.type === "collect") {
    for (let k = M.pickups.length - 1; k >= 0; k--) {
      const b = M.pickups[k];
      if (dist(b.x, b.y, q.x, q.y) < 22) {
        M.pickups.splice(k, 1);
        P.bottles++;
        P.bottlesTotal++;
        sfx.pick();
        toast(`+1 · ${st.count - M.pickups.length}/${st.count} ${tr(st.label)}`, 1100);
      }
    }
    if (!M.pickups.length) completeStep();
  }
}
/** Called by crash handling: fragile cargo / passenger comfort takes damage. */
function missionCrash(impact) {
  const st = curStep();
  if (!M || !st || !st.cargo || M.integrity === null) return;
  M.integrity = Math.max(0, M.integrity - impact * st.cargo.mul);
  M.integrityMin = Math.min(M.integrityMin, M.integrity);
  if (impact > 110) toast(`${tr(st.cargo.label)}: ${Math.round(M.integrity)}%`, 1400);
}
