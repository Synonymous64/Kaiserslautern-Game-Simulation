// =================== 3D ACTORS (vehicles, people, pickups, markers) ===================
// Every frame the game objects are mirrored into low-poly models. Models are
// pooled per game object, so nothing is rebuilt while it stays on screen.
import * as THREE from "three";
import { T, tc } from "../core/utils.js";
import { vehicles, VT } from "../world/vehicles.js";
import { bubbles, game, P, particles, peds, weather } from "../core/state.js";
import { SKIN } from "../systems/population.js";

const pickSkin = () => SKIN[Math.floor(Math.random() * SKIN.length)];
import { M } from "../systems/missions.js";
import { beamTexture, coneTexture } from "./textures.js";
import { makeLook, makePerson, posePerson } from "./people.js";

// ---------- shared materials / geometry ----------
const matCache = new Map();
const mat = (hex, opts) => {
  const k = hex + (opts ? JSON.stringify(opts) : "");
  if (!matCache.has(k)) matCache.set(k, new THREE.MeshStandardMaterial({ color: hex, roughness: 0.75, metalness: 0, ...opts }));
  return matCache.get(k);
};
const geoCache = new Map();
const box = (w, h, d) => {
  const k = `b${w},${h},${d}`;
  if (!geoCache.has(k)) geoCache.set(k, new THREE.BoxGeometry(w, h, d));
  return geoCache.get(k);
};
const wheelGeo = (r, w) => {
  const k = `w${r},${w}`;
  if (!geoCache.has(k)) geoCache.set(k, new THREE.CylinderGeometry(r, r, w, 12).rotateX(Math.PI / 2));
  return geoCache.get(k);
};
const ringGeo = (r) => {
  const k = `t${r}`;
  if (!geoCache.has(k)) geoCache.set(k, new THREE.TorusGeometry(r, 0.8, 6, 16));
  return geoCache.get(k);
};
function part(geo, material, x, y, z, parent, shadow = true) {
  const m = new THREE.Mesh(geo, material);
  m.position.set(x, y, z);
  m.castShadow = shadow;
  parent.add(m);
  return m;
}

const GLASS = mat("#1c2836", { roughness: 0.25, metalness: 0.3 });
const TYRE = mat("#151515", { roughness: 0.9 });
const DARK = mat("#2a2d33");
const headOn = new THREE.MeshStandardMaterial({ color: "#fffbe0", emissive: "#fff1c4", emissiveIntensity: 0.4 });
const headOff = mat("#d9d6c8");
const tailMat = new THREE.MeshStandardMaterial({ color: "#5a1010", emissive: "#ff2a1f", emissiveIntensity: 0.25 });
const brakeMat = new THREE.MeshStandardMaterial({ color: "#ff2a1f", emissive: "#ff2a1f", emissiveIntensity: 2.2 });
const barMats = {
  blueOn: new THREE.MeshBasicMaterial({ color: "#3a7bff" }),
  blueOff: new THREE.MeshBasicMaterial({ color: "#1b2848" }),
  redOn: new THREE.MeshBasicMaterial({ color: "#ff3333" }),
  redOff: new THREE.MeshBasicMaterial({ color: "#3a1010" }),
};
const coneMat = new THREE.MeshBasicMaterial({
  map: coneTexture(),
  color: "#ffe2a8",
  transparent: true,
  opacity: 0,
  blending: THREE.AdditiveBlending,
  depthWrite: false,
});
const coneGeo = new THREE.PlaneGeometry(160, 80).rotateX(-Math.PI / 2).translate(80, 0, 0);

// ---------- vehicles ----------
function lightsFor(root, L, Wd, y, zf = 0.32) {
  const heads = [],
    tails = [];
  for (const s of [-1, 1]) {
    heads.push(part(box(1, 2.2, 3.5), headOff, L / 2, y, s * Wd * zf, root, false));
    tails.push(part(box(1, 2.2, 3.5), tailMat, -L / 2, y, s * Wd * zf, root, false));
  }
  return { heads, tails };
}
/** Low-poly vehicle facing +x, built from VT dimensions. */
function makeVehicle(v) {
  const d = VT[v.type],
    L = d.len,
    Wd = d.wid,
    paint = mat(v.color, { roughness: 0.45, metalness: 0.15 });
  const root = new THREE.Group();
  const o = { root, heads: [], tails: [], bar: null, cone: null, riderSlot: null, type: v.type };
  const wheels = (r, w, xs, zs) => {
    for (const x of xs) for (const z of zs) part(wheelGeo(r, w), TYRE, x, r, z, root);
  };
  if (v.type === "bike" || v.type === "escooter") {
    const bike = v.type === "bike";
    const r = bike ? 4 : 3;
    for (const x of [L / 2 - r, -L / 2 + r]) part(ringGeo(r), TYRE, x, r + 0.8, 0, root);
    if (bike) {
      part(box(L * 0.6, 1.3, 1.3), paint, 0, 7.5, 0, root);
      part(box(1.2, 6, 1.2), paint, -L * 0.15, 7.8, 0, root);
      part(box(3.2, 1, 2.6), DARK, -L * 0.15, 11, 0, root);
      part(box(1, 5, 1), DARK, L * 0.3, 9.5, 0, root);
      part(box(1, 1, 8), DARK, L * 0.3, 12, 0, root);
    } else {
      part(box(L * 0.7, 1.2, 4), paint, 0, 3.5, 0, root);
      part(box(1.2, 14, 1.2), DARK, L / 2 - 4, 10.5, 0, root);
      part(box(1, 1, 8), DARK, L / 2 - 4, 17.5, 0, root);
      part(box(3, 0.6, 1.6), mat("#37b24d", { emissive: "#37b24d", emissiveIntensity: 0.6 }), -L / 2 + 5, 4.3, 0, root, false);
    }
    o.riderSlot = { x: bike ? -2.5 : -1, y: bike ? 5 : 4.2, sit: bike };
    o.cone = part(coneGeo, coneMat, L / 2, 0.9, 0, root, false);
    o.cone.scale.setScalar(0.6);
    return o;
  }
  if (v.type === "tractor") {
    wheels(9, 6, [-L * 0.25], [Wd / 2 - 1, -Wd / 2 + 1]);
    wheels(5, 4, [L * 0.3], [Wd / 2 - 3, -Wd / 2 + 3]);
    part(box(L * 0.55, 9, Wd * 0.5), paint, L * 0.18, 10, 0, root);
    part(box(L * 0.42, 2, Wd * 0.72), paint, -L * 0.22, 10, 0, root);
    for (const x of [-L * 0.4, -L * 0.04]) for (const z of [-Wd * 0.34, Wd * 0.34]) part(box(1.2, 15, 1.2), DARK, x, 18, z, root);
    part(box(L * 0.48, 1.6, Wd * 0.82), mat("#e9e6dc"), -L * 0.22, 26, 0, root);
    part(new THREE.CylinderGeometry(0.8, 0.8, 12, 6), DARK, L * 0.08, 18, Wd * 0.15, root);
    Object.assign(o, lightsFor(root, L, Wd * 0.5, 11));
    o.cone = part(coneGeo, coneMat, L / 2, 0.9, 0, root, false);
    return o;
  }
  if (v.type === "bus") {
    wheels(5.5, 4, [L * 0.33, -L * 0.33], [Wd / 2 - 2, -Wd / 2 + 2]);
    part(box(L, 11, Wd), paint, 0, 10.5, 0, root);
    part(box(L * 0.985, 9, Wd * 0.985), GLASS, 0, 20.5, 0, root);
    part(box(L, 4, Wd), paint, 0, 27, 0, root);
    part(box(16, 3, 12), mat("#d9d9d9"), -L * 0.25, 30.5, 0, root);
    Object.assign(o, lightsFor(root, L, Wd, 10));
    o.cone = part(coneGeo, coneMat, L / 2, 0.9, 0, root, false);
    return o;
  }
  // ---- the cool cars ----
  if (v.type === "sports") {
    // low and wide, small glasshouse, rear wing
    wheels(4.2, 3.4, [L * 0.3, -L * 0.3], [Wd / 2 - 1.5, -Wd / 2 + 1.5]);
    part(box(L, 6, Wd), paint, 0, 6.5, 0, root);
    part(box(L * 0.36, 4.6, Wd * 0.78), GLASS, -L * 0.06, 11.6, 0, root);
    part(box(L * 0.28, 0.9, Wd * 0.74), paint, -L * 0.08, 14.3, 0, root);
    part(box(L * 0.22, 0.5, Wd * 0.6), DARK, L * 0.26, 9.6, 0, root); // bonnet vent
    for (const z of [Wd * 0.3, -Wd * 0.3]) part(box(1, 3, 1), DARK, -L * 0.44, 11, z, root);
    part(box(4, 0.8, Wd * 0.94), DARK, -L * 0.45, 12.8, 0, root); // wing
    Object.assign(o, lightsFor(root, L, Wd, 7.5, 0.34));
    o.cone = part(coneGeo, coneMat, L / 2, 0.9, 0, root, false);
    return o;
  }
  if (v.type === "muscle") {
    // long bonnet with a scoop, twin racing stripes over the whole car
    wheels(4.6, 3.6, [L * 0.3, -L * 0.3], [Wd / 2 - 1.5, -Wd / 2 + 1.5]);
    part(box(L, 8, Wd), paint, 0, 8.5, 0, root);
    part(box(L * 0.4, 6, Wd * 0.82), GLASS, -L * 0.13, 15.5, 0, root);
    part(box(L * 0.32, 1.2, Wd * 0.78), paint, -L * 0.14, 18.9, 0, root);
    part(box(6, 2, 6), DARK, L * 0.2, 13.4, 0, root); // scoop
    const stripe = mat("#f5f5f5");
    for (const z of [2.2, -2.2]) {
      part(box(L + 0.2, 0.3, 2.2), stripe, 0, 12.6, z, root, false);
      part(box(L * 0.32, 0.3, 2.2), stripe, -L * 0.14, 19.6, z, root, false);
    }
    Object.assign(o, lightsFor(root, L, Wd, 9.5));
    o.cone = part(coneGeo, coneMat, L / 2, 0.9, 0, root, false);
    return o;
  }
  if (v.type === "cabrio") {
    // open top: raked windscreen, two seats, no roof
    wheels(4, 3, [L * 0.3, -L * 0.3], [Wd / 2 - 1.5, -Wd / 2 + 1.5]);
    part(box(L, 7, Wd), paint, 0, 7.5, 0, root);
    part(box(L * 0.42, 1, Wd * 0.84), mat("#3a2a22"), -L * 0.06, 11.2, 0, root); // interior
    for (const z of [Wd * 0.21, -Wd * 0.21]) part(box(4, 6, 5.5), mat("#4a3a30"), -L * 0.12, 13.5, z, root);
    const ws = part(box(1, 5.5, Wd * 0.84), GLASS, L * 0.13, 13.6, 0, root);
    ws.rotation.z = 0.45;
    o.riderSlot = { x: -L * 0.12, y: 5.5, z: -Wd * 0.21, sit: true }; // you can see the driver
    Object.assign(o, lightsFor(root, L, Wd, 8.5));
    o.cone = part(coneGeo, coneMat, L / 2, 0.9, 0, root, false);
    return o;
  }
  // cars, taxis, enforcement vans
  const van = v.type === "van";
  const r = van ? 4.5 : 4;
  wheels(r, 3, [L * 0.3, -L * 0.3], [Wd / 2 - 1.5, -Wd / 2 + 1.5]);
  if (van) {
    part(box(L, 10, Wd), paint, 0, 9.5, 0, root);
    part(box(L * 0.82, 9, Wd * 0.96), paint, -L * 0.09, 19, 0, root);
    part(box(L * 0.12, 8, Wd * 0.86), GLASS, L * 0.36, 18, 0, root);
    part(box(L + 0.4, 2.5, Wd + 0.4), mat("#1d4f9c"), 0, 11, 0, root, false);
    const blue = part(box(3, 2.4, Wd * 0.4), barMats.blueOff, 0, 24.7, Wd * 0.22, root, false),
      red = part(box(3, 2.4, Wd * 0.4), barMats.redOff, 0, 24.7, -Wd * 0.22, root, false);
    o.bar = { blue, red };
  } else {
    part(box(L, 8, Wd), paint, 0, 8.5, 0, root);
    part(box(L * 0.5, 7, Wd * 0.84), GLASS, -L * 0.05, 16, 0, root);
    part(box(L * 0.4, 1.6, Wd * 0.8), paint, -L * 0.06, 20.2, 0, root);
    if (v.type === "taxi")
      part(box(4, 3, 8), mat("#f2c230", { emissive: "#f2c230", emissiveIntensity: 0.35 }), -L * 0.06, 22.5, 0, root);
  }
  Object.assign(o, lightsFor(root, L, Wd, van ? 10 : 9.5));
  o.cone = part(coneGeo, coneMat, L / 2, 0.9, 0, root, false);
  return o;
}

// ---------- pool: one model per game object ----------
class Pool {
  constructor(scene, make) {
    this.scene = scene;
    this.make = make;
    this.map = new Map();
    this.frame = 0;
  }
  begin() {
    this.frame++;
  }
  get(key, ...args) {
    let o = this.map.get(key);
    if (!o) {
      o = this.make(key, ...args);
      this.scene.add(o.root);
      this.map.set(key, o);
    }
    o.seen = this.frame;
    o.root.visible = true;
    return o;
  }
  end() {
    for (const [k, o] of this.map)
      if (o.seen !== this.frame) {
        this.scene.remove(o.root);
        this.map.delete(k);
      }
  }
}

export function createActors(scene) {
  // each person gets a random look the first time they are seen, kept while on screen
  const people = new Pool(scene, (_k, lookFn) => makePerson(lookFn()));
  const cars = new Pool(scene, (v) => makeVehicle(v));
  // the player always looks the same: red jacket, backpack, short brown hair
  const PLAYER = {
    pres: "andro", kid: false, elder: false, wheel: false, hairStyle: "short", beard: null, bottom: "trousers",
    print: null, glasses: null, lips: null, earrings: false, freckles: false, blush: false, flag: null, cane: false,
    wid: 1, tall: 1, eye: "#5b3a1e", hair: "#3b2a1e",
  };
  const playerLook = (pack) =>
    makeLook({ shirt: "#c4472f", skin: P.skin || "#d9a57b", hair: "#3b2a1e", legs: "#2a2d33" }, { extra: { ...PLAYER, pack } });
  let player = makePerson(playerLook(true)),
    playerSkin = P.skin;
  scene.add(player.root);
  let rider = makePerson(playerLook(false));

  // player ring
  const ring = new THREE.Mesh(
    new THREE.RingGeometry(10, 12.5, 28).rotateX(-Math.PI / 2),
    new THREE.MeshBasicMaterial({ color: "#f2c230", transparent: true, opacity: 0.8, depthWrite: false }),
  );
  scene.add(ring);

  // Pfand bottles lying around
  const bottleGeo = new THREE.CylinderGeometry(1.7, 1.7, 9, 8).rotateZ(Math.PI / 2).translate(0, 1.8, 0);
  const bottles = new THREE.InstancedMesh(bottleGeo, mat("#2f8f4a", { roughness: 0.3 }), 96);
  bottles.castShadow = true;
  scene.add(bottles);

  // mission pickups: glowing bobbing bottles with a pulse ring
  const pickupMat = new THREE.MeshStandardMaterial({ color: "#3fbf62", emissive: "#3fbf62", emissiveIntensity: 0.9 });
  const pulseMat = new THREE.MeshBasicMaterial({ color: "#7fcf8a", transparent: true, depthWrite: false });
  const pickups = new Pool(scene, () => {
    const root = new THREE.Group();
    const b = part(bottleGeo, pickupMat, 0, 6, 0, root);
    b.rotation.z = -0.6;
    const pulse = part(new THREE.RingGeometry(0.8, 1, 24).rotateX(-Math.PI / 2), pulseMat, 0, 0.8, 0, root, false);
    return { root, b, pulse };
  });

  // objective marker: light beam, ground disc, pulse ring, bobbing arrow
  const tgt = new THREE.Group();
  const yellow = "#f2c230";
  const beam = new THREE.Mesh(
    new THREE.CylinderGeometry(18, 18, 260, 24, 1, true).translate(0, 130, 0),
    new THREE.MeshBasicMaterial({
      map: beamTexture(),
      color: yellow,
      transparent: true,
      opacity: 0.55,
      blending: THREE.AdditiveBlending,
      depthWrite: false,
      side: THREE.DoubleSide,
    }),
  );
  const disc = new THREE.Mesh(
    new THREE.CircleGeometry(T * 1.2, 32).rotateX(-Math.PI / 2),
    new THREE.MeshBasicMaterial({ color: yellow, transparent: true, opacity: 0.35, depthWrite: false }),
  );
  disc.position.y = 0.9;
  const tPulse = new THREE.Mesh(
    new THREE.RingGeometry(0.88, 1, 32).rotateX(-Math.PI / 2),
    new THREE.MeshBasicMaterial({ color: yellow, transparent: true, depthWrite: false }),
  );
  tPulse.position.y = 1;
  const arrow = new THREE.Mesh(new THREE.ConeGeometry(9, 18, 4).rotateX(Math.PI), mat(yellow, { emissive: yellow, emissiveIntensity: 0.6 }));
  arrow.castShadow = true;
  tgt.add(beam, disc, tPulse, arrow);
  scene.add(tgt);

  // fireworks
  const FW = 3000;
  const fwPos = new Float32Array(FW * 3),
    fwCol = new Float32Array(FW * 3);
  const fwGeo = new THREE.BufferGeometry();
  fwGeo.setAttribute("position", new THREE.BufferAttribute(fwPos, 3).setUsage(THREE.DynamicDrawUsage));
  fwGeo.setAttribute("color", new THREE.BufferAttribute(fwCol, 3).setUsage(THREE.DynamicDrawUsage));
  const fw = new THREE.Points(
    fwGeo,
    new THREE.PointsMaterial({ size: 7, vertexColors: true, blending: THREE.AdditiveBlending, transparent: true, depthWrite: false }),
  );
  fw.frustumCulled = false;
  scene.add(fw);
  const tmpC = new THREE.Color();

  const m4 = new THREE.Matrix4(),
    q4 = new THREE.Quaternion(),
    e4 = new THREE.Euler(),
    v3 = new THREE.Vector3(),
    one = new THREE.Vector3(1, 1, 1);

  /** cx, cy = camera focus (world px); night = 0 (day) … 1 (night). */
  function update(cx, cy, now, night, tg, state, view) {
    const fpv = view.mode === "fpv";
    const R = 1300;
    const near = (o) => Math.abs(o.x - cx) < R && Math.abs(o.y - cy) < R;
    const flash = ((now * 1000) / 180) % 2 < 1;

    headOn.emissiveIntensity = 0.4 + night * 2.6;
    tailMat.emissiveIntensity = 0.25 + night * 0.9;
    coneMat.opacity = night * 0.55;

    // ---- vehicles (incl. the Ordnungsamt vans) ----
    cars.begin();
    const syncVeh = (v) => {
      if (!near(v)) return;
      const o = cars.get(v);
      o.root.position.set(v.x, 0, v.y);
      o.root.rotation.y = -(v.ra ?? v.a);
      const active = !!(v.ai || v === P.veh || v.kind === "van");
      for (const h of o.heads) h.material = active ? headOn : headOff;
      for (const t of o.tails) t.material = v.braking ? brakeMat : tailMat;
      if (o.cone) o.cone.visible = active && night > 0.05;
      if (o.bar) {
        o.bar.blue.material = flash ? barMats.blueOn : barMats.blueOff;
        o.bar.red.material = flash ? barMats.redOff : barMats.redOn;
      }
      if (o.riderSlot) {
        const riding = P.veh === v && !P.onFoot;
        if (riding && rider.root.parent !== o.root) {
          o.root.add(rider.root);
          rider.root.position.set(o.riderSlot.x, o.riderSlot.y, o.riderSlot.z || 0);
          rider.root.rotation.set(0, 0, 0);
          const bend = o.riderSlot.sit ? 1.1 : 0;
          rider.legL.rotation.z = rider.legR.rotation.z = bend;
          rider.armL.rotation.z = rider.armR.rotation.z = 1.1;
        } else if (!riding && rider.root.parent === o.root) o.root.remove(rider.root);
        rider.root.visible = !fpv; // your own body would fill the first-person view
      }
    };
    for (const v of vehicles) syncVeh(v);
    for (const c of game.chasers) if (c.kind === "van") syncVeh(c);
    cars.end();
    if (P.onFoot && rider.root.parent) rider.root.parent.remove(rider.root);

    // ---- people (faces: talking while their speech bubble is up, angry when knocked over) ----
    const talking = new Set(bubbles.map((b) => b.o));
    const face = (o, knocked) => (knocked ? "angry" : talking.has(o) ? "talk" : "normal");
    people.begin();
    for (const p of peds) {
      if (!near(p)) continue;
      const o = people.get(p, () =>
        makeLook({ shirt: p.shirt, skin: p.skin, hair: p.hair, legs: p.legs }, p.fan ? { plain: true } : undefined),
      );
      posePerson(o, p.x, p.y, p.a, p.stand ? 0 : now + p.sp, p.knock > 0, p.ka, weather.rain && !p.knock ? p.umb : null, face(p, p.knock > 0));
    }
    for (const c of game.chasers)
      if (c.kind === "officer" && near(c)) {
        const o = people.get(c, () =>
          makeLook({ shirt: "#1d2f55", skin: pickSkin(), legs: "#1d2f55" }, { adult: true, plain: true, extra: { cap: "#1d2f55", vest: true, bottom: "trousers", flag: null, wheel: false } }),
        );
        posePerson(o, c.x, c.y, c.a, now, false, 0, null, face(c, false));
      }
    if (game.job && game.job.kind === "taxi" && game.job.phase === "pickup") {
      const o = people.get(game.job, () => makeLook({ shirt: "#6b3a8c", skin: pickSkin() }, { adult: true, extra: { wheel: false } }));
      posePerson(o, tc(game.job.from.x), tc(game.job.from.y), Math.PI / 2, 0, false, 0, null, "talk");
      o.armL.rotation.x = -2.6; // waving for a taxi
    }
    people.end();

    // ---- player on foot ----
    if (P.skin !== playerSkin) {
      // skin is picked at game start; rebuild the two player models once
      scene.remove(player.root);
      if (rider.root.parent) rider.root.parent.remove(rider.root);
      player = makePerson(playerLook(true));
      rider = makePerson(playerLook(false));
      scene.add(player.root);
      playerSkin = P.skin;
    }
    const onFoot = state !== "title" && P.onFoot;
    player.root.visible = onFoot && !fpv;
    ring.visible = onFoot && view.mode === "top";
    if (onFoot) {
      posePerson(player, P.x, P.y, P.a, P.anim, false, 0, null);
      ring.position.set(P.x, 0.8, P.y);
    }

    // ---- bottles ----
    let n = 0;
    for (const bt of game.bottles) {
      if (n >= 96) break;
      if (!near(bt)) continue;
      e4.set(0, -bt.a, 0);
      q4.setFromEuler(e4);
      bottles.setMatrixAt(n++, m4.compose(v3.set(bt.x, 0, bt.y), q4, one));
    }
    bottles.count = n;
    bottles.instanceMatrix.needsUpdate = true;

    // ---- mission pickups ----
    pickups.begin();
    if (M && M.pickups.length)
      for (const k of M.pickups) {
        const o = pickups.get(k);
        const pul = (now * 1.4 + k.x * 0.01) % 1;
        o.root.position.set(k.x, 0, k.y);
        o.b.position.y = 7 + Math.sin(now * 4 + k.y) * 2.5;
        o.b.rotation.y = now * 1.5;
        o.pulse.scale.setScalar(6 + pul * 16);
      }
    pulseMat.opacity = 0.9 * (1 - ((now * 1.4) % 1));
    pickups.end();

    // ---- objective marker ----
    tgt.visible = !!(tg && !tg.small);
    if (tgt.visible) {
      const pul = (now * 1.6) % 1;
      tgt.position.set(tg.x, 0, tg.y);
      tPulse.scale.setScalar(14 + pul * 26);
      tPulse.material.opacity = 1 - pul;
      arrow.position.y = 62 + Math.sin(now * 4) * 5;
      arrow.rotation.y = now * 1.2;
    }

    // ---- fireworks (2D particles burst at rooftop height) ----
    let f = 0;
    for (const p of particles) {
      if (f >= FW) break;
      fwPos[f * 3] = p.x;
      fwPos[f * 3 + 1] = 150 + (f % 11) * 4;
      fwPos[f * 3 + 2] = p.y;
      tmpC.set(p.c).multiplyScalar(Math.max(0, Math.min(1, p.t)));
      fwCol[f * 3] = tmpC.r;
      fwCol[f * 3 + 1] = tmpC.g;
      fwCol[f * 3 + 2] = tmpC.b;
      f++;
    }
    fwGeo.setDrawRange(0, f);
    fwGeo.attributes.position.needsUpdate = true;
    fwGeo.attributes.color.needsUpdate = true;
  }
  return { update };
}
