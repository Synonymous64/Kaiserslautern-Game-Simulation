"use strict";
// =================== UPDATE ===================
function updatePlayer(dt) {
  const inp = input();
  if (P.onFoot) {
    const run = inp.sprint && (P.energy > 2 || superSprint > 0);
    const sp = run ? (superSprint > 0 ? 290 : 175) : 115;
    let mx = inp.x,
      my = inp.y;
    const m = Math.hypot(mx, my);
    if (m > 0) {
      mx /= Math.max(1, m);
      my /= Math.max(1, m);
      P.a = Math.atan2(my, mx);
      P.anim += dt;
      const nx = P.x + mx * sp * dt,
        ny = P.y + my * sp * dt;
      if (!footBlocked(nx, P.y)) P.x = nx;
      if (!footBlocked(P.x, ny)) P.y = ny;
      if (run && superSprint <= 0) P.energy -= 2.2 * dt;
    }
    P.energy -= 0.07 * dt;
    for (let i = 0; i < bottles.length; i++) {
      const bt = bottles[i];
      if (Math.hypot(bt.x - P.x, bt.y - P.y) < 18) {
        P.bottles++;
        P.bottlesTotal++;
        sfx.pick();
        toast(tx(`+1 bottle (${P.bottles})`, `+1 Pfandflasche (${P.bottles})`), 1200);
        respawnBottle(i);
      }
    }
  } else {
    const v = P.veh,
      d = VT[v.type];
    let max = d.max * (cheatSlow ? 0.5 : 1);
    const surf = tileAtPx(v.x, v.y);
    if (
      (surf === GRASS ||
        surf === PARK ||
        surf === FOREST ||
        surf === PITCH ||
        surf === RUIN) &&
      v.type !== "tractor"
    )
      max *= 0.55;
    const twoWheel = v.type === "bike" || v.type === "escooter";
    const offroad = max < d.max * (cheatSlow ? 0.5 : 1);
    const wet = weather.wet;
    // throttle falls off near top speed, like a real engine
    const thr = d.acc * (1 - 0.55 * clamp(v.speed / max, 0, 1));
    if (inp.y < 0) v.speed += (v.speed < 0 ? d.acc * 2.2 : thr) * dt;
    else if (inp.y > 0) {
      if (v.speed > 10) v.speed -= d.brake * (1 - 0.3 * wet) * dt;
      else v.speed -= d.acc * 0.6 * dt;
    } else
      v.speed -=
        Math.sign(v.speed) *
        Math.min(Math.abs(v.speed), (40 + Math.abs(v.speed) * 0.35) * dt);
    if (inp.hand)
      v.speed -=
        Math.sign(v.speed) *
        Math.min(Math.abs(v.speed), (twoWheel ? 600 : 380) * dt);
    v.speed = Math.max(v.speed, -max * 0.35);
    if (v.speed > max) v.speed = Math.max(max, v.speed - 500 * dt);
    v.braking = (inp.y > 0 && v.speed > 5) || inp.hand;
    // steering: less authority at high speed (understeer), more on handbrake
    const sp = Math.abs(v.speed);
    const steer =
      clamp(v.speed / 110, -1, 1) * (1 - 0.35 * clamp((sp - 160) / 220, 0, 1));
    const yaw = inp.x * d.turn * dt * steer * (inp.hand ? 1.55 : 1);
    const na = v.a + yaw;
    // lateral slip: momentum keeps the old heading, tyre grip pulls it back
    let grip = twoWheel ? 16 : 10;
    grip *= 1 - 0.45 * wet;
    if (offroad) grip *= 0.7;
    if (inp.hand && !twoWheel) grip *= 0.16;
    v.slip = (v.slip || 0) - v.speed * Math.sin(yaw);
    v.speed *= Math.cos(yaw); // momentum is redirected, not created
    v.slip *= Math.exp(-grip * dt);
    v.slip = clamp(v.slip, -260, 260);
    const nx =
        v.x + Math.cos(na) * v.speed * dt - Math.sin(na) * v.slip * dt,
      ny = v.y + Math.sin(na) * v.speed * dt + Math.cos(na) * v.slip * dt;
    // skid marks, tyre smoke and road spray
    const skidI = clamp(
      Math.max(
        (Math.abs(v.slip) - 38) / 90,
        inp.hand && sp > 70 ? 0.6 : 0,
        inp.y > 0 && v.speed > 150 ? 0.45 : 0,
        inp.y < 0 && v.speed < 60 && v.speed > 0 && !twoWheel && !wet
          ? 0.25
          : 0,
      ),
      0,
      1,
    );
    if (skidI > 0 && !offroad) emitTyres(v, skidI);
    else v.skid = null;
    skidLevel = skidI;
    if (wet > 0.4 && sp > 120 && !offroad && Math.random() < 0.5) {
      const c = Math.cos(v.a),
        s = Math.sin(v.a);
      puff(
        v.x - c * d.len * 0.5,
        v.y - s * d.len * 0.5,
        -c * 40 + (Math.random() - 0.5) * 30,
        -s * 40 + (Math.random() - 0.5) * 30,
        0.45,
        3,
        "rgba(210,220,232,1)",
      );
    }
    // ---- collision resolution ----
    // 1) Already wedged into a wall (e.g. after unstick/teleport)? free it.
    if (vehBlocked(v, v.x, v.y, v.a)) unstick(v);
    // 2) Overlapping another vehicle? push apart instead of locking up.
    separateVehicle(v);
    // 3) Try the full move, then slide along walls on each axis.
    const moveOk = (x, y, a) => !vehBlocked(v, x, y, a) && !vehicleInto(v, x, y, a);
    const dx = nx - v.x,
      dy = ny - v.y,
      dl = Math.hypot(dx, dy) || 1;
    let hitV = null;
    if (moveOk(nx, ny, na)) {
      v.x = nx;
      v.y = ny;
      v.a = na;
    } else {
      hitV = vehicleInto(v, nx, ny, na);
      const canTurn = moveOk(v.x, v.y, na);
      const slideX = moveOk(v.x + dx, v.y, canTurn ? na : v.a);
      const slideY = moveOk(v.x, v.y + dy, canTurn ? na : v.a);
      // the share of motion that hits the obstacle = impact strength
      let lost = 1;
      if (slideX && Math.abs(dx) >= Math.abs(dy)) {
        v.x += dx;
        lost = Math.abs(dy) / dl;
      } else if (slideY) {
        v.y += dy;
        lost = Math.abs(dx) / dl;
      } else if (slideX) {
        v.x += dx;
        lost = Math.abs(dy) / dl;
      }
      if (canTurn) v.a = na;
      const imp = Math.abs(v.speed) * lost + Math.abs(v.slip) * 0.3;
      if (lost > 0.85) {
        // head-on: bounce back a little; reversing away is always possible
        v.speed *= -0.25;
        v.slip *= -0.2;
      } else {
        // glancing: scrub speed, keep going along the wall
        v.speed *= 1 - lost * 0.6;
        v.slip *= 0.5;
      }
      v.skid = null;
      if (imp > 60) {
        P.crashes += imp > 110 ? 1 : 0;
        if (imp > 90) {
          shake = Math.max(shake, Math.min(14, imp / 22));
          sfx.crunch(imp);
        }
        onCrash(imp);
        if (hitV && hitV.ai) {
          hitV.ai.stop = 1.8;
          if (imp > 140) {
            addAerger(1, L2("Traffic accident", "Unfall"));
            bubble(hitV, pick(ANGRY));
          }
        }
        if (imp > 150) sfx.boom();
      }
    }
    v.ra = v.a;
    if (
      surf === PLAZA &&
      !["bike", "escooter"].includes(v.type) &&
      Math.abs(v.speed) > 30
    )
      addAerger(1, L2("Driving in the pedestrian zone", "Auto in der Fußgängerzone"));
    if (
      surf === PITCH &&
      !["bike", "escooter"].includes(v.type) &&
      Math.abs(v.speed) > 30
    )
      addAerger(1, L2("Driving on the pitch", "Rasen befahren"));
    checkTrafficCameras(v);
    P.energy -= 0.04 * dt;
    P.x = v.x;
    P.y = v.y;
    if (v.type === "bike" || v.type === "escooter")
      for (let i = 0; i < bottles.length; i++) {
        const bt = bottles[i];
        if (Math.hypot(bt.x - v.x, bt.y - v.y) < 18) {
          P.bottles++;
        P.bottlesTotal++;
          sfx.pick();
          toast(tx(`+1 bottle (${P.bottles})`, `+1 Pfandflasche (${P.bottles})`), 1200);
          respawnBottle(i);
        }
      }
  }
  if (superSprint > 0) superSprint -= dt;
  if (P.energy <= 0) {
    P.energy = 40;
    const lose = Math.min(P.money, 10);
    P.money -= lose;
    if (!P.onFoot) exitVeh();
    say([
      [
        NAR,
        L2(
          `You ran out of energy and sat down on a bench. A friendly local handed you a Dubbeglas of Schorle. You paid the round: −${eur(lose)}.`,
          `Dir ist die Energie ausgegangen und du hast dich auf eine Bank gesetzt. Ein netter Pfälzer hat dir ein Dubbeglas Schorle gereicht. Du hast die Runde gezahlt: −${eur(lose)}.`,
        ),
      ],
    ]);
  }
}

/** Vehicle that the move (x, y, a) would drive *into* (closing distance), or null. */
function vehicleInto(v, x, y, a) {
  const test = (o) => {
    if (o === v || Math.abs(o.x - x) > 120 || Math.abs(o.y - y) > 120) return false;
    if (!vehOverlap(v, x, y, a, o)) return false;
    // moving apart from something we already touch is always allowed
    return dist(x, y, o.x, o.y) < dist(v.x, v.y, o.x, o.y) - 0.01;
  };
  for (const o of vehicles) if (test(o)) return o;
  for (const c of chasers) if (c.kind === "van" && test(c)) return c;
  return null;
}
/** Push the player vehicle (and loose parked vehicles) out of overlaps. */
function separateVehicle(v) {
  for (const o of vehicles.concat(chasers.filter((c) => c.kind === "van"))) {
    if (o === v || Math.abs(o.x - v.x) > 120 || Math.abs(o.y - v.y) > 120) continue;
    if (!vehOverlap(v, v.x, v.y, v.a, o)) continue;
    let ux = v.x - o.x,
      uy = v.y - o.y;
    const d = Math.hypot(ux, uy) || 1;
    ux /= d;
    uy /= d;
    const push = 2.5;
    if (!vehBlocked(v, v.x + ux * push, v.y + uy * push, v.a)) {
      v.x += ux * push;
      v.y += uy * push;
    }
    // parked cars get shoved a bit, like real ones would
    if (!o.ai && o.kind !== "van" && !vehBlocked(o, o.x - ux * push, o.y - uy * push, o.a)) {
      o.x -= ux * push;
      o.y -= uy * push;
    }
  }
}
function updateTraffic(dt) {
  const q = pos();
  for (const v of vehicles) {
    if (!v.ai) continue;
    const a = v.ai;
    if (a.stop > 0) {
      a.stop -= dt;
      v.speed = 0;
      continue;
    }
    let tgtS =
      a.cruise *
      (cheatSlow ? 0.5 : 1) *
      (matchday ? 0.6 : 1) *
      (weather.rain ? 0.9 : 1);
    const c = Math.cos(v.a),
      s = Math.sin(v.a);
    const look = 34 + VT[v.type].len * 0.6;
    const ahead = (ox, oy, lx) => {
      const dx = ox - v.x,
        dy = oy - v.y;
      const f = dx * c + dy * s;
      if (f <= 0 || f > lx) return false;
      return Math.abs(-dx * s + dy * c) < 15;
    };
    for (const o of vehicles) {
      if (
        o === v ||
        Math.abs(o.x - v.x) > 130 ||
        Math.abs(o.y - v.y) > 130
      )
        continue;
      if (ahead(o.x, o.y, look + VT[o.type].len * 0.4)) {
        tgtS = 0;
        break;
      }
    }
    // never plough into the player's car (it may sit sideways in the lane)
    if (tgtS > 0 && !P.onFoot && P.veh && P.veh !== v && Math.abs(P.veh.x - v.x) < 140 && Math.abs(P.veh.y - v.y) < 140) {
      if (vehOverlap(v, v.x + c * look * 0.75, v.y + s * look * 0.75, v.a, P.veh)) tgtS = 0;
    }
    if (tgtS > 0 && state !== "title") {
      if (P.onFoot ? ahead(P.x, P.y, look + 10) : false) tgtS = 0;
      for (const ch of chasers)
        if (ch.kind === "van" && ahead(ch.x, ch.y, look + 20)) tgtS = 0;
    }
    const e = edges[a.e];
    const fromId = a.fwd ? e.a : e.b,
      toId = a.fwd ? e.b : e.a;
    const A = nodes[fromId],
      B = nodes[toId];
    const front = a.s + VT[v.type].len / 2;
    // obey the traffic light at the junction ahead
    const sig = signalAt.get(toId);
    if (sig && tgtS > 0) {
      const axis = A.y === B.y ? "h" : "v";
      const toLine = e.len - T * 1.75 - front; // distance to the stop line
      const ls = signalState(sig, axis);
      if (ls !== "green" && toLine > -4 && toLine < 140) {
        // on amber, keep going if too close to stop comfortably
        if (ls === "red" || toLine > 28)
          tgtS = Math.min(tgtS, Math.max(0, toLine * 1.7));
      }
    }
    // slow down for turns, choose the next road early and indicate
    if (a.next == null && e.len - a.s < 120) {
      let opts = nodes[toId].edges.filter((i) => i !== a.e);
      if (!opts.length) opts = [a.e];
      a.next = pick(opts);
      const ne = edges[a.next],
        C = nodes[ne.a === toId ? ne.b : ne.a];
      const dx = Math.sign(B.x - A.x),
        dy = Math.sign(B.y - A.y),
        nx = Math.sign(C.x - B.x),
        ny = Math.sign(C.y - B.y);
      a.turn = Math.sign(dx * ny - dy * nx);
    }
    if (a.turn && e.len - a.s < 70) tgtS = Math.min(tgtS, 85);
    v.braking = tgtS < v.speed - 8;
    v.speed += clamp(tgtS - v.speed, -420 * dt, 150 * dt);
    a.s += v.speed * dt;
    if (a.s >= e.len) {
      const nid = toId;
      let ni = a.next;
      if (ni == null) {
        let opts = nodes[nid].edges.filter((i) => i !== a.e);
        if (!opts.length) opts = [a.e];
        ni = pick(opts);
      }
      a.s = Math.max(0, a.s - e.len);
      a.e = ni;
      a.fwd = edges[ni].a === nid;
      a.next = null;
      a.turn = 0;
    }
    placeAI(v);
    v.ra = v.ra + angDiff(v.ra, v.a) * Math.min(1, dt * 9);
    if (P.onFoot && state === "play" && v.speed > 40) {
      for (const [cx, cy, r] of vehCircles(v, v.x, v.y, v.ra)) {
        const d = Math.hypot(P.x - cx, P.y - cy);
        if (d < r + 8 && d > 0) {
          const nx = P.x + ((P.x - cx) / d) * 6,
            ny = P.y + ((P.y - cy) / d) * 6;
          if (!footBlocked(nx, ny)) {
            P.x = nx;
            P.y = ny;
          }
          a.stop = 1.2;
        }
      }
    }
  }
}
// Red-light and speed cameras. Motor vehicles only; bikes get a lecture.
function checkTrafficCameras(v) {
  if (blitzCd > 0) return;
  const tX = Math.floor(v.x / T),
    tY = Math.floor(v.y / T);
  const kmh = Math.abs(v.speed) * 0.16;
  const motor = !["bike", "escooter"].includes(v.type);
  const s = signalNearTile(tX, tY);
  if (s !== P.lastSig) {
    if (s && kmh > 12) {
      const axis =
        Math.abs(Math.cos(v.a)) > Math.abs(Math.sin(v.a)) ? "h" : "v";
      if (signalState(s, axis) === "red") {
        if (motor) P.redlights++;
        blitz(
          motor ? 20 : 0,
          motor
            ? L2("Ran a red light", "Rotlichtverstoß")
            : L2("Red light on a bike. A passer-by tuts loudly.", "Rote Ampel mit dem Rad. Ein Passant schnalzt laut."),
        );
      }
    }
    P.lastSig = s;
  }
  if (
    motor &&
    Math.abs(tX - BLITZER.x) <= 1 &&
    Math.abs(tY - (BLITZER.y + 2)) <= 1 &&
    kmh > BLITZER.limit
  )
    blitz(15, L2(`Speed camera: ${Math.round(kmh)} km/h in a 50 zone`, `Geblitzt: ${Math.round(kmh)} km/h in der 50er-Zone`));
}
function blitz(fine, why) {
  blitzCd = 6;
  if (fine) {
    flashFx = 0.25;
    const paid = Math.min(P.money, fine);
    P.money -= paid;
    sfx.camera();
    P.fines += paid;
    toast(`📸 ${tr(why)} · ${tx("Fine", "Bußgeld")} −${eur(paid)}`, 3200);
    save();
  } else toast(why, 2400);
}
function updateWeather(dt) {
  weather.wet = clamp(
    weather.wet + (weather.rain ? dt / 16 : -dt / 75),
    0,
    1,
  );
  if (weather.lock > 0) weather.lock -= dt;
  else {
    weather.next -= dt;
    const h = Math.floor(clock / 60) % 24;
    if (h === 16 && !weather.rain && weather.next > 5) {
      weather.rain = true;
      weather.next = 60;
      toast(tx("16:00. It rains, punctual as always.", "16:00. Es regnet, pünktlich wie immer."));
    }
    if (weather.next <= 0) {
      weather.rain = Math.random() < 0.4;
      weather.next = 90 + Math.random() * 150;
    }
  }
  if (weather.rain) {
    while (drops.length < 220)
      drops.push({
        x: Math.random() * W,
        y: Math.random() * H,
        v: 600 + Math.random() * 300,
      });
    for (const d of drops) {
      d.y += d.v * dt;
      d.x -= d.v * 0.2 * dt;
      if (d.y > H) {
        d.y = -14;
        d.x = Math.random() * (W + 100);
      }
    }
  } else drops.length = 0;
  rainSound(weather.rain && state !== "title");
}
function updateParticles(dt) {
  for (let i = particles.length - 1; i >= 0; i--) {
    const p = particles[i];
    p.t -= dt;
    p.x += p.vx * dt;
    p.y += p.vy * dt;
    p.vx *= 0.97;
    p.vy = p.vy * 0.97 + 20 * dt;
    if (p.t <= 0) particles.splice(i, 1);
  }
  for (let i = bubbles.length - 1; i >= 0; i--) {
    bubbles[i].t -= dt;
    if (bubbles[i].t <= 0) bubbles.splice(i, 1);
  }
}

