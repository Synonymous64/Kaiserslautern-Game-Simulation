"use strict";
// =================== GENERATIVE MUSIC ===================
// A soft ambient score composed live with the Web Audio API: slow pad chords,
// a warm bass, and sparse bell notes, all through a lush generated reverb.
// It follows the game: brighter by day, darker and slower at night, muffled
// in the rain, and it steps back while you drive fast or race a timer.

const MUSIC = {
  on: SETTINGS.music !== false,
  master: null, // overall music volume
  tone: null, // low-pass "colour" (rain / night muffle the top end)
  bus: null, // everything musical feeds this
  next: 0, // AudioContext time of the next chord
  ci: 0, // chord index
  bellT: 2, // seconds until the next bell
  night: false,
};
const midiHz = (n) => 440 * Math.pow(2, (n - 69) / 12);

// Day: Cmaj7 → Am7 → Fmaj7 → G6/9 (warm, open)
const PROG_DAY = [
  { root: 48, notes: [60, 64, 67, 71] },
  { root: 45, notes: [57, 60, 64, 67] },
  { root: 41, notes: [53, 57, 60, 64] },
  { root: 43, notes: [55, 59, 62, 64, 69] },
];
// Night: Am9 → Fmaj7(#11) → Dm9 → Em7 (calm, a little melancholic)
const PROG_NIGHT = [
  { root: 45, notes: [57, 60, 64, 67, 71] },
  { root: 41, notes: [53, 57, 60, 64, 71] },
  { root: 38, notes: [50, 53, 57, 60, 64] },
  { root: 40, notes: [52, 55, 59, 62] },
];

/** Stereo reverb impulse: decaying noise, generated once. */
function makeImpulse(seconds, decay) {
  const len = Math.floor(AC.sampleRate * seconds),
    buf = AC.createBuffer(2, len, AC.sampleRate);
  for (let ch = 0; ch < 2; ch++) {
    const d = buf.getChannelData(ch);
    for (let i = 0; i < len; i++) d[i] = (Math.random() * 2 - 1) * Math.pow(1 - i / len, decay);
  }
  return buf;
}
function ensureMusic() {
  if (MUSIC.master || !AC) return !!MUSIC.master;
  const master = AC.createGain(),
    tone = AC.createBiquadFilter(),
    bus = AC.createGain(),
    verb = AC.createConvolver(),
    wet = AC.createGain(),
    dry = AC.createGain();
  master.gain.value = 0;
  tone.type = "lowpass";
  tone.frequency.value = 2400;
  tone.Q.value = 0.3;
  verb.buffer = makeImpulse(3.4, 2.6);
  wet.gain.value = 0.55;
  dry.gain.value = 0.7;
  bus.connect(tone);
  tone.connect(dry);
  tone.connect(verb);
  verb.connect(wet);
  dry.connect(master);
  wet.connect(master);
  master.connect(AC.destination);
  Object.assign(MUSIC, { master, tone, bus, next: AC.currentTime + 0.3 });
  return true;
}

/** One pad chord with slow swells, plus a soft bass under it. */
function playChord(ch, t, dur) {
  const att = 2.4,
    rel = 3.2,
    end = t + dur + rel;
  const pad = AC.createBiquadFilter();
  pad.type = "lowpass";
  pad.frequency.value = MUSIC.night ? 760 : 1150;
  pad.Q.value = 0.5;
  pad.connect(MUSIC.bus);
  const per = 0.055 / ch.notes.length;
  for (const n of ch.notes) {
    for (const [type, cents, lvl] of [
      ["triangle", -7, 1],
      ["sine", +6, 0.8],
    ]) {
      const o = AC.createOscillator(),
        g = AC.createGain();
      o.type = type;
      o.frequency.value = midiHz(n);
      o.detune.value = cents;
      g.gain.setValueAtTime(0, t);
      g.gain.linearRampToValueAtTime(per * lvl, t + att);
      g.gain.setValueAtTime(per * lvl, t + dur);
      g.gain.linearRampToValueAtTime(0, end);
      o.connect(g);
      g.connect(pad);
      o.start(t);
      o.stop(end + 0.05);
    }
  }
  // bass: a round sine an octave+ below
  const b = AC.createOscillator(),
    bg = AC.createGain();
  b.type = "sine";
  b.frequency.value = midiHz(ch.root);
  bg.gain.setValueAtTime(0, t);
  bg.gain.linearRampToValueAtTime(0.07, t + 1.2);
  bg.gain.setValueAtTime(0.07, t + dur);
  bg.gain.linearRampToValueAtTime(0, end);
  b.connect(bg);
  bg.connect(MUSIC.bus);
  b.start(t);
  b.stop(end + 0.05);
}

/** A single soft bell / glass note from the current chord. */
function playBell(ch, t) {
  const n = pick(ch.notes) + (MUSIC.night ? 12 : pick([12, 12, 24]));
  const f = midiHz(n);
  const g = AC.createGain();
  g.gain.setValueAtTime(0, t);
  g.gain.linearRampToValueAtTime(0.032, t + 0.012);
  g.gain.exponentialRampToValueAtTime(0.0001, t + 3.2);
  g.connect(MUSIC.bus);
  for (const [mul, lvl] of [
    [1, 1],
    [2.01, 0.25],
    [3.98, 0.08],
  ]) {
    const o = AC.createOscillator(),
      og = AC.createGain();
    o.type = "sine";
    o.frequency.value = f * mul;
    og.gain.value = lvl;
    o.connect(og);
    og.connect(g);
    o.start(t);
    o.stop(t + 3.3);
  }
}

/** Called every frame from the main loop. */
function musicUpdate(dt) {
  if (!AC || AC.state !== "running") return;
  let target = 0;
  if (MUSIC.on && soundOn) {
    target = state === "title" ? 1 : 0.62;
    if (state === "play" && !P.onFoot && P.veh) {
      // step back as the engine takes over
      target *= 1 - 0.5 * clamp(Math.abs(P.veh.speed) / VT[P.veh.type].max, 0, 1);
    }
    if (M && M.timer !== null) target *= 0.6;
    if (aerger) target *= 0.65;
  }
  if (!target && !MUSIC.master) return; // never started, nothing to fade
  if (!ensureMusic()) return;
  const now = AC.currentTime;
  MUSIC.master.gain.setTargetAtTime(target * 0.55, now, 0.9);
  MUSIC.night = darkness() > 0.3;
  const bright = (MUSIC.night ? 1500 : 2600) * (weather.rain ? 0.5 : 1);
  MUSIC.tone.frequency.setTargetAtTime(bright, now, 1.5);
  if (!target) {
    MUSIC.next = now + 0.3; // idle: schedule nothing while silent
    return;
  }
  // chords: schedule just ahead so they land seamlessly
  if (now + 0.4 >= MUSIC.next) {
    const prog = MUSIC.night ? PROG_NIGHT : PROG_DAY,
      dur = MUSIC.night ? 10 : 8;
    const t = Math.max(MUSIC.next, now + 0.05);
    playChord(prog[MUSIC.ci % prog.length], t, dur);
    MUSIC.cur = prog[MUSIC.ci % prog.length];
    MUSIC.ci++;
    MUSIC.next = t + dur;
  }
  // sparse bells, more of them by day
  MUSIC.bellT -= dt;
  if (MUSIC.bellT <= 0 && MUSIC.cur) {
    MUSIC.bellT = (MUSIC.night ? 2.6 : 1.5) + Math.random() * 3.2;
    if (Math.random() < 0.72) playBell(MUSIC.cur, now + 0.05);
    if (!MUSIC.night && Math.random() < 0.25) playBell(MUSIC.cur, now + 0.35);
  }
}
function setMusic(on) {
  MUSIC.on = on;
  SETTINGS.music = on;
  saveSettings();
}

// Browsers only allow audio after a gesture: the first tap/key on the landing
// page wakes the audio engine so the music can fade in there already.
const unlockAudio = () => {
  audio();
  removeEventListener("pointerdown", unlockAudio, true);
  removeEventListener("keydown", unlockAudio, true);
};
addEventListener("pointerdown", unlockAudio, true);
addEventListener("keydown", unlockAudio, true);
