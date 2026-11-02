"use strict";
// =================== AUDIO ===================
let AC = null,
  soundOn = SETTINGS.sound,
  rainNode = null;
// Every sound goes through one master gain, so Sound On/Off is instant.
let masterOut = null;
function OUT() {
  if (!masterOut) {
    masterOut = AC.createGain();
    masterOut.gain.value = soundOn ? 1 : 0;
    masterOut.connect(AC.destination);
  }
  return masterOut;
}
function audio() {
  if (!AC) {
    try {
      AC = new (window.AudioContext || window.webkitAudioContext)();
    } catch (e) {}
  }
  if (AC && AC.state === "suspended") AC.resume();
}
function tone(f, d, type = "sine", vol = 0.12, f2) {
  if (!AC || !soundOn) return;
  const o = AC.createOscillator(),
    g = AC.createGain();
  o.type = type;
  o.frequency.setValueAtTime(f, AC.currentTime);
  if (f2)
    o.frequency.exponentialRampToValueAtTime(f2, AC.currentTime + d);
  g.gain.setValueAtTime(vol, AC.currentTime);
  g.gain.exponentialRampToValueAtTime(0.0001, AC.currentTime + d);
  o.connect(g);
  g.connect(OUT());
  o.start();
  o.stop(AC.currentTime + d + 0.02);
}
const sfx = {
  horn() {
    tone(392, 0.28, "square", 0.06);
    tone(494, 0.28, "square", 0.05);
  },
  coin() {
    tone(988, 0.09, "sine", 0.1);
    setTimeout(() => tone(1318, 0.16, "sine", 0.1), 80);
  },
  whistle() {
    tone(2300, 0.12, "sine", 0.07, 2600);
    setTimeout(() => tone(2300, 0.25, "sine", 0.07, 2500), 140);
  },
  fail() {
    tone(220, 0.4, "sawtooth", 0.06, 110);
  },
  pick() {
    tone(1200, 0.06, "triangle", 0.08);
  },
  ok() {
    tone(660, 0.1, "triangle", 0.1);
    setTimeout(() => tone(880, 0.1, "triangle", 0.1), 90);
    setTimeout(() => tone(1320, 0.2, "triangle", 0.1), 180);
  },
  crunch(imp) {
    noiseBurst(0.25, 900, Math.min(0.22, imp / 1400));
    tone(90, 0.25, "triangle", Math.min(0.14, imp / 1800), 45);
  },
  camera() {
    noiseBurst(0.06, 4000, 0.08);
    setTimeout(() => noiseBurst(0.05, 2500, 0.06), 70);
  },
  boom() {
    tone(160, 0.5, "triangle", 0.12, 60);
  },
};
function rainSound(on) {
  if (!AC) return;
  if (on && soundOn && !rainNode) {
    const b = AC.createBuffer(1, AC.sampleRate * 2, AC.sampleRate),
      d = b.getChannelData(0);
    for (let i = 0; i < d.length; i++)
      d[i] = (Math.random() * 2 - 1) * 0.5;
    const s = AC.createBufferSource();
    s.buffer = b;
    s.loop = true;
    const f = AC.createBiquadFilter();
    f.type = "lowpass";
    f.frequency.value = 1200;
    const g = AC.createGain();
    g.gain.value = 0.05;
    s.connect(f);
    f.connect(g);
    g.connect(OUT());
    s.start();
    rainNode = s;
  } else if ((!on || !soundOn) && rainNode) {
    try {
      rainNode.stop();
    } catch (e) {}
    rainNode = null;
  }
}


// ---- noise helpers ----
let noiseBuf = null;
function getNoise() {
  if (!noiseBuf) {
    noiseBuf = AC.createBuffer(1, AC.sampleRate * 2, AC.sampleRate);
    const d = noiseBuf.getChannelData(0);
    for (let i = 0; i < d.length; i++) d[i] = Math.random() * 2 - 1;
  }
  return noiseBuf;
}
function noiseBurst(dur, freq, vol) {
  if (!AC || !soundOn) return;
  const s = AC.createBufferSource(),
    f = AC.createBiquadFilter(),
    g = AC.createGain();
  s.buffer = getNoise();
  f.type = "bandpass";
  f.frequency.value = freq;
  g.gain.setValueAtTime(vol, AC.currentTime);
  g.gain.exponentialRampToValueAtTime(0.0001, AC.currentTime + dur);
  s.connect(f);
  f.connect(g);
  g.connect(OUT());
  s.start();
  s.stop(AC.currentTime + dur + 0.05);
}

// ---- engine + tyre screech (continuous, driven every frame) ----
const ENGINE = {
  car: { wave: "sawtooth", base: 34, span: 62, vol: 0.05, gears: [0, 85, 160, 235, 300] },
  taxi: { wave: "sawtooth", base: 32, span: 58, vol: 0.05, gears: [0, 85, 160, 235, 300] },
  van: { wave: "sawtooth", base: 30, span: 55, vol: 0.05, gears: [0, 90, 170, 250] },
  bus: { wave: "sawtooth", base: 24, span: 36, vol: 0.06, gears: [0, 70, 140, 200] },
  tractor: { wave: "square", base: 22, span: 22, vol: 0.035, gears: [0, 70] },
  escooter: { wave: "sine", base: 240, span: 420, vol: 0.025, gears: [0] },
};
let eng = null;
function engineUpdate(skid) {
  if (!AC) return;
  const v = !P.onFoot && state === "play" ? P.veh : null;
  const spec = v && ENGINE[v.type];
  if (!eng) {
    const o = AC.createOscillator(),
      f = AC.createBiquadFilter(),
      g = AC.createGain();
    f.type = "lowpass";
    f.frequency.value = 420;
    g.gain.value = 0;
    o.connect(f);
    f.connect(g);
    g.connect(OUT());
    o.start();
    const n = AC.createBufferSource(),
      nf = AC.createBiquadFilter(),
      ng = AC.createGain();
    n.buffer = getNoise();
    n.loop = true;
    nf.type = "bandpass";
    nf.frequency.value = 1700;
    nf.Q.value = 3;
    ng.gain.value = 0;
    n.connect(nf);
    nf.connect(ng);
    ng.connect(OUT());
    n.start();
    eng = { o, f, g, ng, wave: "" };
  }
  const t = AC.currentTime;
  if (!spec || !soundOn) {
    eng.g.gain.setTargetAtTime(0, t, 0.08);
    eng.ng.gain.setTargetAtTime(0, t, 0.05);
    return;
  }
  if (eng.wave !== spec.wave) {
    eng.o.type = spec.wave;
    eng.wave = spec.wave;
  }
  const sp = Math.abs(v.speed);
  // rpm rises through each gear, then drops on the shift
  let gi = 0;
  for (let i = 0; i < spec.gears.length; i++) if (sp >= spec.gears[i]) gi = i;
  const lo = spec.gears[gi],
    hi = spec.gears[gi + 1] ?? VT[v.type].max * 1.05;
  const rpm = 0.25 + 0.75 * clamp((sp - lo) / Math.max(1, hi - lo), 0, 1);
  eng.o.frequency.setTargetAtTime(spec.base + rpm * spec.span, t, 0.05);
  eng.f.frequency.setTargetAtTime(300 + rpm * 900, t, 0.08);
  eng.g.gain.setTargetAtTime(spec.vol * (0.55 + 0.45 * rpm), t, 0.08);
  eng.ng.gain.setTargetAtTime(skid * 0.07, t, 0.04);
}

// Silence everything while the tab is hidden (rAF stops, oscillators would not).
document.addEventListener("visibilitychange", () => {
  if (!AC) return;
  if (document.hidden) AC.suspend();
  else AC.resume();
});
function setSound(on) {
  soundOn = on;
  SETTINGS.sound = on;
  saveSettings();
  if (AC) {
    if (AC.state === "suspended") AC.resume();
    const g = OUT().gain,
      t = AC.currentTime;
    g.cancelScheduledValues(t);
    g.setValueAtTime(g.value, t);
    g.linearRampToValueAtTime(on ? 1 : 0, t + 0.08);
  }
  rainSound(weather.rain && state !== "title");
  if (on) {
    sfx.ok(); // audible confirmation
    musicKick();
  }
}
