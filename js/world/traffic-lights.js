"use strict";
// =================== TRAFFIC LIGHTS ===================
// Every junction of the road graph where 3+ road edges meet gets a signal.
// The horizontal and vertical axes alternate: green → amber → all-red.
const SIG_GREEN = 9,
  SIG_AMBER = 2.4,
  SIG_ALLRED = 1.3;
const SIG_HALF = SIG_GREEN + SIG_AMBER + SIG_ALLRED;
const SIG_CYCLE = SIG_HALF * 2;
const SIGNALS = [];
const signalAt = new Map(); // node id -> signal
let sigClock = 0; // real seconds, advanced by the main loop

nodes.forEach((n, id) => {
  if (n.edges.length < 3) return;
  const s = { id, x: n.x, y: n.y, off: hash(n.x * 3, n.y * 7) * SIG_CYCLE };
  SIGNALS.push(s);
  signalAt.set(id, s);
});

/** "green" | "amber" | "red" for traffic travelling along axis "h" or "v". */
function signalState(s, axis, t = sigClock) {
  let p = (t + s.off) % SIG_CYCLE;
  const mine = axis === "h" ? p < SIG_HALF : p >= SIG_HALF;
  if (!mine) return "red";
  p %= SIG_HALF;
  if (p < SIG_GREEN) return "green";
  if (p < SIG_GREEN + SIG_AMBER) return "amber";
  return "red";
}

/** Signal whose junction box contains tile (tx, ty), or null. */
function signalNearTile(tx, ty) {
  for (const s of SIGNALS)
    if (Math.abs(tx - s.x) <= 1 && Math.abs(ty - s.y) <= 1) return s;
  return null;
}

// Fixed speed camera ("Blitzer") on Mainzer Straße, 50 km/h zone.
const BLITZER = { x: 88, y: 28, limit: 50 };
