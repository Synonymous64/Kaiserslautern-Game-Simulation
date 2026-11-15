// =================== 3D PEOPLE ===================
// Low-poly people with real faces and a wide range of looks: every gender
// presentation, all skin tones, kids and grandparents, wheelchair users,
// beards, braids, headscarves, dyed hair, skirts on anyone, glasses, earrings
// and the odd pride / trans / bi / non-binary flag on a shirt or in a hand.
// Looks are random per person (the 2D view keeps its simpler sprites).
import * as THREE from "three";

const rnd = Math.random;
const pick = (a) => a[Math.floor(rnd() * a.length)];
const chance = (p) => rnd() < p;
const wpick = (pairs) => {
  let r = rnd() * pairs.reduce((s, p) => s + p[1], 0);
  for (const [v, w] of pairs) if ((r -= w) <= 0) return v;
  return pairs[0][0];
};

const NATURAL_HAIR = ["#1a1410", "#2b1d14", "#4a3020", "#6b4423", "#8a6a3a", "#b8894a", "#d9b46a", "#8c3b1c", "#a34a26"];
const DYED_HAIR = ["#ff6fb5", "#4aa3ff", "#9b59d0", "#3ccf7a", "#e8e3d0", "#ff8a3d", "#26c6da"];
const GREY_HAIR = ["#9a9a9a", "#c8c8c8", "#e6e6e6"];
const EYES = ["#5b3a1e", "#3d2614", "#2f6fa8", "#4a8a52", "#7a6a3a", "#1c1c1c"];
const LIPS = ["#b0304a", "#8a2240", "#c2575f", "#6e2a5a"];
const SKIRTS = ["#2a2d33", "#7a3b8f", "#c42222", "#1d3b74", "#d9a54a", "#2f8f4a", "#e48fb0"];
let nextId = 1;

/** Random look; base = { shirt, skin, hair, legs } from the game (kept so 2D and 3D match). */
export function makeLook(base = {}, opts = {}) {
  const pres = opts.pres || wpick([["fem", 42], ["masc", 42], ["andro", 16]]);
  const kid = !opts.adult && chance(0.07);
  const elder = !kid && chance(0.12);
  const wheel = !kid && !opts.adult && chance(0.03);
  let hairStyle = wpick(
    pres === "fem"
      ? [["long", 22], ["ponytail", 14], ["bun", 10], ["bob", 12], ["curly", 10], ["braids", 8], ["short", 10], ["headscarf", 7], ["undercut", 4], ["afro", 6]]
      : pres === "masc"
        ? [["short", 30], ["buzz", 16], ["bald", 10], ["curly", 8], ["quiff", 10], ["manbun", 6], ["long", 6], ["afro", 6], ["braids", 4], ["mohawk", 2]]
        : [["undercut", 18], ["mohawk", 10], ["bob", 16], ["short", 16], ["curly", 12], ["buzz", 10], ["long", 10], ["afro", 8]],
  );
  if (base.hair === null && !kid && chance(0.6)) hairStyle = pres === "fem" ? "buzz" : "bald";
  const hair = elder ? pick(GREY_HAIR) : chance(pres === "andro" ? 0.35 : 0.08) ? pick(DYED_HAIR) : base.hair || pick(NATURAL_HAIR);
  const beard = !kid && (pres === "masc" ? chance(0.4) : pres === "andro" ? chance(0.12) : false) ? pick(["full", "full", "mustache", "stubble", "goatee"]) : null;
  const bottom = wheel
    ? "trousers"
    : pres === "fem"
      ? wpick([["trousers", 50], ["skirt", 35], ["dress", 15]])
      : pres === "andro"
        ? wpick([["trousers", 70], ["skirt", 30]])
        : chance(0.04) ? "skirt" : "trousers";
  const print = opts.plain
    ? null
    : wpick([[null, 82], ["rainbow", 5], ["trans", 3], ["bi", 2], ["nonbinary", 2], ["heart", 3], ["lautre", 3]]);
  return {
    id: nextId++,
    pres,
    kid,
    elder,
    wheel,
    skin: base.skin || "#d9a57b",
    shirt: base.shirt || "#3a5a8c",
    legs: base.legs || "#2a2d33",
    hair,
    hairStyle,
    beard,
    bottom,
    skirt: bottom === "dress" ? base.shirt || "#3a5a8c" : pick(SKIRTS),
    print,
    eye: pick(EYES),
    glasses: chance(elder ? 0.55 : 0.2) ? (chance(0.25) ? "sun" : "frame") : null,
    lips: (pres === "fem" && chance(0.35)) || (pres === "andro" && chance(0.25)) ? pick(LIPS) : null,
    earrings: (pres !== "masc" && chance(0.4)) || chance(0.08),
    freckles: chance(0.15),
    blush: chance(0.25),
    flag: !kid && chance(0.03) ? pick(["rainbow", "trans", "rainbow", "bi"]) : null,
    cane: elder && !wheel && chance(0.3),
    wid: kid ? 0.9 : 0.88 + rnd() * 0.3,
    tall: kid ? 0.62 : 0.94 + rnd() * 0.12,
    ...opts.extra,
  };
}

// ---------- textures ----------
const texCache = new Map();
const canvasTex = (key, w, h, draw) => {
  if (texCache.has(key)) return texCache.get(key);
  const c = document.createElement("canvas");
  c.width = w;
  c.height = h;
  draw(c.getContext("2d"), w, h);
  const t = new THREE.CanvasTexture(c);
  t.colorSpace = THREE.SRGBColorSpace;
  texCache.set(key, t);
  return t;
};
const FLAGS = {
  rainbow: ["#e40303", "#ff8c00", "#ffed00", "#008026", "#004dff", "#750787"],
  trans: ["#5bcefa", "#f5a9b8", "#ffffff", "#f5a9b8", "#5bcefa"],
  bi: ["#d60270", "#d60270", "#9b4f96", "#0038a8", "#0038a8"],
  nonbinary: ["#fcf434", "#ffffff", "#9c59d1", "#2c2c2c"],
};
const stripes = (g, cols, w, h) => cols.forEach((c, i) => ((g.fillStyle = c), g.fillRect(0, (i * h) / cols.length, w, h / cols.length + 1)));
export const flagTexture = (kind) => canvasTex("flag:" + kind, 48, 30, (g, w, h) => stripes(g, FLAGS[kind], w, h));

/** Shirt front (64×64) for prints; the rest of the torso is the plain shirt colour. */
function shirtTexture(look) {
  return canvasTex(`shirt:${look.print}:${look.shirt}`, 64, 64, (g, w, h) => {
    g.fillStyle = look.shirt;
    g.fillRect(0, 0, w, h);
    if (FLAGS[look.print]) {
      g.save();
      g.translate(14, 18);
      stripes(g, FLAGS[look.print], 36, 26);
      g.restore();
    } else if (look.print === "heart") {
      g.save();
      g.beginPath();
      g.moveTo(32, 50);
      g.bezierCurveTo(6, 32, 14, 10, 32, 24);
      g.bezierCurveTo(50, 10, 58, 32, 32, 50);
      g.clip();
      stripes(g, FLAGS.rainbow, 64, 64);
      g.restore();
    } else if (look.print === "lautre") {
      g.fillStyle = "#f2c230";
      g.fillRect(8, 24, 48, 18);
      g.fillStyle = "#141414";
      g.font = "800 15px 'Barlow Condensed',sans-serif";
      g.textAlign = "center";
      g.textBaseline = "middle";
      g.fillText("LAUTRE", 32, 34);
    }
  });
}

/** The face (64×64, front of the head). expr: "normal" | "talk" | "angry". */
function faceTexture(look, expr) {
  return canvasTex(`face:${look.id}:${expr}`, 64, 64, (g) => {
    g.fillStyle = look.skin;
    g.fillRect(0, 0, 64, 64);
    g.fillStyle = "rgba(0,0,0,.06)";
    g.fillRect(0, 54, 64, 10); // chin shadow
    const big = look.kid ? 1.25 : 1;
    // eyes
    for (const ex of [21, 43]) {
      g.fillStyle = "#ffffff";
      g.beginPath();
      g.ellipse(ex, 28, 6 * big, (expr === "angry" ? 3.4 : 4.6) * big, 0, 0, 6.3);
      g.fill();
      g.fillStyle = look.eye;
      g.beginPath();
      g.arc(ex + 0.5, 28.4, 3.3 * big, 0, 6.3);
      g.fill();
      g.fillStyle = "#111";
      g.beginPath();
      g.arc(ex + 0.5, 28.4, 1.6 * big, 0, 6.3);
      g.fill();
      g.fillStyle = "#fff";
      g.fillRect(ex + 1.2, 26.4, 1.4, 1.4);
    }
    // brows
    g.fillStyle = look.hairStyle === "bald" ? "rgba(0,0,0,.35)" : look.hair;
    const by = expr === "talk" ? 17 : 19;
    for (const [bx, dir] of [[21, 1], [43, -1]]) {
      g.save();
      g.translate(bx, by);
      g.rotate(expr === "angry" ? 0.32 * dir : expr === "talk" ? -0.1 * dir : 0);
      g.fillRect(-7, -1.5, 14, 3);
      g.restore();
    }
    // nose
    g.fillStyle = "rgba(0,0,0,.13)";
    g.fillRect(30, 30, 4, 10);
    if (look.blush) {
      g.fillStyle = "rgba(255,90,90,.22)";
      for (const cx of [13, 51]) {
        g.beginPath();
        g.arc(cx, 40, 5, 0, 6.3);
        g.fill();
      }
    }
    if (look.freckles) {
      g.fillStyle = "rgba(110,60,30,.45)";
      for (let i = 0; i < 14; i++) g.fillRect(12 + ((i * 37) % 40), 35 + ((i * 13) % 7), 1.6, 1.6);
    }
    if (look.elder) {
      g.strokeStyle = "rgba(0,0,0,.18)";
      g.lineWidth = 1;
      for (const ex of [11, 53]) {
        g.beginPath();
        g.moveTo(ex, 26);
        g.lineTo(ex + (ex < 32 ? -3 : 3), 30);
        g.stroke();
      }
    }
    // beard goes under the mouth
    const hairDark = look.hair;
    if (look.beard === "full") {
      g.fillStyle = hairDark;
      g.beginPath();
      g.moveTo(4, 34);
      g.lineTo(60, 34);
      g.lineTo(58, 56);
      g.quadraticCurveTo(32, 70, 6, 56);
      g.closePath();
      g.fill();
      g.fillStyle = look.skin;
      g.beginPath();
      g.ellipse(32, 47, 9, 5, 0, 0, 6.3);
      g.fill();
    } else if (look.beard === "goatee") {
      g.fillStyle = hairDark;
      g.fillRect(25, 50, 14, 12);
      g.fillRect(22, 41, 20, 3);
    } else if (look.beard === "stubble") {
      g.fillStyle = "rgba(40,30,20,.28)";
      g.fillRect(6, 38, 52, 26);
    }
    if (look.beard === "mustache" || look.beard === "full") {
      g.fillStyle = hairDark;
      g.fillRect(21, 40, 22, 4);
    }
    // mouth
    const lip = look.lips || "#6b2a22";
    g.strokeStyle = lip;
    g.fillStyle = expr === "talk" || expr === "angry" ? "#3a1212" : lip;
    g.lineWidth = look.lips ? 3.2 : 2.4;
    g.lineCap = "round";
    if (expr === "talk") {
      g.beginPath();
      g.ellipse(32, 48, 6, 4.5, 0, 0, 6.3);
      g.fill();
      g.stroke();
      g.fillStyle = "#fff";
      g.fillRect(27, 44.5, 10, 2);
    } else if (expr === "angry") {
      g.beginPath();
      g.ellipse(32, 49, 7, 3, 0, 0, 6.3);
      g.fill();
      g.beginPath();
      g.arc(32, 55, 9, 1.15 * Math.PI, 1.85 * Math.PI);
      g.stroke();
    } else {
      g.beginPath();
      g.arc(32, 41, 9, 0.2 * Math.PI, 0.8 * Math.PI);
      g.stroke();
    }
    // glasses on top
    if (look.glasses) {
      g.strokeStyle = "#1b1b1b";
      g.lineWidth = 2;
      for (const ex of [21, 43]) {
        if (look.glasses === "sun") {
          g.fillStyle = "rgba(10,10,14,.9)";
          g.fillRect(ex - 8, 23, 16, 10);
        }
        g.strokeRect(ex - 8, 23, 16, 10);
      }
      g.beginPath();
      g.moveTo(29, 27);
      g.lineTo(35, 27);
      g.stroke();
    }
  });
}

// ---------- geometry ----------
const G = {
  leg: new THREE.BoxGeometry(2.6, 8, 2.6).translate(0, -4, 0),
  thinLeg: new THREE.BoxGeometry(2, 8, 2).translate(0, -4, 0),
  arm: new THREE.BoxGeometry(2, 7.5, 2).translate(0, -3.6, 0),
  head: new THREE.BoxGeometry(6.4, 6.8, 6.2),
  skirt: new THREE.CylinderGeometry(3.6, 5.4, 5.5, 10),
  dress: new THREE.CylinderGeometry(3.9, 5.8, 8.5, 10),
  afro: new THREE.IcosahedronGeometry(5.2, 1),
  bun: new THREE.SphereGeometry(2.2, 8, 6),
  earring: new THREE.SphereGeometry(0.7, 6, 4),
  stick: new THREE.CylinderGeometry(0.35, 0.35, 11, 5),
  canopy: new THREE.ConeGeometry(12, 5, 8, 1, true),
  wheel: new THREE.TorusGeometry(5.4, 0.7, 6, 18),
  caster: new THREE.TorusGeometry(1.6, 0.5, 5, 10),
  flagPlane: new THREE.PlaneGeometry(6, 3.8),
};
const boxCache = new Map();
const box = (w, h, d) => {
  const k = `${w},${h},${d}`;
  if (!boxCache.has(k)) boxCache.set(k, new THREE.BoxGeometry(w, h, d));
  return boxCache.get(k);
};
const matCache = new Map();
export const mat = (hex, opts) => {
  const k = hex + (opts ? JSON.stringify(opts) : "");
  if (!matCache.has(k)) matCache.set(k, new THREE.MeshStandardMaterial({ color: hex, roughness: 0.75, ...opts }));
  return matCache.get(k);
};
const mapMat = (tex) => {
  if (!matCache.has(tex.uuid)) matCache.set(tex.uuid, new THREE.MeshStandardMaterial({ map: tex, roughness: 0.8 }));
  return matCache.get(tex.uuid);
};
function part(geo, material, x, y, z, parent, shadow = false) {
  const m = new THREE.Mesh(geo, material);
  m.position.set(x, y, z);
  m.castShadow = shadow;
  parent.add(m);
  return m;
}

/** Hair / headwear for a head centred at (0, 0, 0) facing +x. */
function addHair(look, head) {
  const h = mat(look.hair);
  const cap = (t = 2.2) => part(box(6.9, t, 6.7), h, -0.15, 3.4 + t / 2 - 1.1, 0, head);
  const back = (len = 5) => part(box(1.8, len, 6.7), h, -3.2, 2.6 - len / 2 + 1.4, 0, head);
  const sides = (len) => {
    for (const z of [3.3, -3.3]) part(box(4.6, len, 0.9), h, -1.1, 3 - len / 2, z, head);
  };
  switch (look.hairStyle) {
    case "bald":
      break;
    case "buzz":
      part(box(6.6, 0.9, 6.4), h, -0.1, 3.7, 0, head);
      break;
    case "short":
      cap();
      back(4);
      break;
    case "quiff":
      cap();
      back(4);
      part(box(3, 2.2, 5), h, 1.8, 4.6, 0, head);
      break;
    case "long":
      cap();
      back(12);
      sides(9);
      break;
    case "bob":
      cap();
      back(7);
      sides(6.5);
      break;
    case "ponytail":
      cap();
      back(4);
      part(box(1.6, 8, 1.8), h, -4.3, -1.5, 0, head).rotation.z = -0.25;
      break;
    case "bun":
      cap();
      back(4);
      part(G.bun, h, -2.8, 3.8, 0, head);
      break;
    case "manbun":
      cap(1.6);
      part(G.bun, h, -2.6, 3.9, 0, head).scale.setScalar(0.75);
      break;
    case "braids":
      cap();
      back(4);
      for (const z of [2.2, -2.2]) part(box(1.3, 11, 1.3), h, -3.6, -3.5, z, head);
      break;
    case "curly":
      cap(2.8);
      back(5);
      for (const z of [-2.5, 0, 2.5]) part(G.bun, h, -1, 4.2, z, head).scale.setScalar(0.8);
      break;
    case "afro":
      part(G.afro, h, -1.2, 2.2, 0, head);
      break;
    case "undercut":
      part(box(6.6, 0.8, 6.4), h, -0.1, 3.6, 0, head);
      part(box(5.2, 2.2, 4.6), h, 0.6, 4.7, 0.9, head);
      break;
    case "mohawk":
      part(box(6, 3.2, 1.5), h, -0.4, 4.8, 0, head);
      break;
    case "headscarf": {
      const s = mat(look.scarf || "#2c6e8f");
      part(box(7.1, 2.8, 6.9), s, -0.2, 3.6, 0, head);
      part(box(2, 10, 7), s, -3.3, -0.8, 0, head);
      for (const z of [3.5, -3.5]) part(box(5.4, 9, 0.9), s, -0.9, -0.6, z, head);
      part(box(5, 2.6, 7.2), s, 0, -4.6, 0, head);
      break;
    }
  }
}

/** Build a person facing +x. Returns the parts posePerson() animates. */
export function makePerson(look) {
  const root = new THREE.Group(),
    body = new THREE.Group();
  root.add(body);
  root.scale.set(0.85 * look.wid, 0.85 * look.tall, 0.85 * look.wid);
  const shirt = mat(look.shirt),
    skin = mat(look.skin);
  const skirted = look.bottom === "skirt" || look.bottom === "dress";
  const legMat = skirted ? mat(look.legs === "#2a2d33" ? look.skin : "#2a2d33") : mat(look.legs);
  const legGeo = skirted ? G.thinLeg : G.leg;
  const legL = part(legGeo, legMat, 0, 8, 1.7, body, true),
    legR = part(legGeo, legMat, 0, 8, -1.7, body, true);
  if (look.bottom === "skirt") part(G.skirt, mat(look.skirt), 0, 7.6, 0, body, true);
  if (look.bottom === "dress") part(G.dress, mat(look.skirt), 0, 8.4, 0, body, true);
  // torso: printed front (+x face), plain elsewhere
  const front = look.print ? mapMat(shirtTexture(look)) : shirt;
  const torso = new THREE.Mesh(box(4.2, 8, 7), [front, shirt, shirt, shirt, shirt, shirt]);
  torso.position.set(0, 12, 0);
  torso.castShadow = true;
  body.add(torso);
  if (look.vest) part(box(4.6, 6.5, 7.4), mat("#d8e24a"), 0, 12.3, 0, body);
  if (look.pack) part(box(3, 7, 5.6), mat("#3a4a3a"), -3.6, 12.5, 0, body, true);
  const armL = part(G.arm, shirt, 0, 15.8, 4.6, body),
    armR = part(G.arm, shirt, 0, 15.8, -4.6, body);
  for (const a of [armL, armR]) part(box(2.1, 1.8, 2.1), skin, 0, -7.6, 0, a); // hands
  // head with a face on the front
  const head = new THREE.Group();
  head.position.set(0.3, 19.8, 0);
  body.add(head);
  const faces = {
    normal: mapMat(faceTexture(look, "normal")),
    talk: mapMat(faceTexture(look, "talk")),
    angry: mapMat(faceTexture(look, "angry")),
  };
  const headMesh = new THREE.Mesh(G.head, [faces.normal, skin, skin, skin, skin, skin]);
  headMesh.castShadow = true;
  head.add(headMesh);
  addHair(look, head);
  if (look.cap) {
    part(new THREE.CylinderGeometry(3.6, 3.6, 1.8, 10), mat(look.cap), 0, 3.9, 0, head);
    part(box(3, 0.6, 6), mat(look.cap), 3.3, 3.1, 0, head);
  }
  if (look.earrings) for (const z of [3.25, -3.25]) part(G.earring, mat("#e8c45a", { metalness: 0.6, roughness: 0.3 }), -0.4, -1.4, z, head);
  // things in hand: a small pride flag, or a walking cane
  if (look.flag) {
    const f = new THREE.Group();
    part(G.stick, DARK, 0, 3.5, 0, f);
    const pl = part(G.flagPlane, new THREE.MeshStandardMaterial({ map: flagTexture(look.flag), side: THREE.DoubleSide }), 0, 7.2, 3, f);
    pl.rotation.y = Math.PI / 2;
    f.position.set(1, -7.6, 0);
    armR.add(f);
  }
  if (look.cane) {
    const c = part(G.stick, mat("#5b4330"), 1.2, -8, 0, armR);
    c.scale.y = 0.75;
  }
  // wheelchair
  let chair = null;
  if (look.wheel) {
    chair = new THREE.Group();
    const frame = mat("#2b2f36", { metalness: 0.5, roughness: 0.4 });
    part(box(7, 1, 7.6), mat("#1d3b74"), 0.5, 7.6, 0, chair, true);
    part(box(1, 7, 7.6), mat("#1d3b74"), -3.2, 11.5, 0, chair);
    for (const z of [4.4, -4.4]) part(G.wheel, frame, -0.5, 5.6, z, chair, true);
    for (const z of [3, -3]) part(G.caster, frame, 4.2, 1.6, z, chair);
    part(box(1, 1, 6), frame, 5, 3.4, 0, chair); // footrest
    root.add(chair);
  }
  // umbrella (shown when it rains)
  const umb = new THREE.Group();
  part(G.stick, DARK, 0, 22, 0, umb);
  const canopy = part(G.canopy, umbMat("#1d3b74"), 0, 28.5, 0, umb, true);
  umb.visible = false;
  body.add(umb);
  return { root, body, legL, legR, armL, armR, umb, canopy, headMesh, faces, expr: "normal", look, chair };
}
const DARK = mat("#2a2d33");
const umbMats = new Map();
const umbMat = (hex) => {
  if (!umbMats.has(hex)) umbMats.set(hex, new THREE.MeshStandardMaterial({ color: hex, side: THREE.DoubleSide, roughness: 0.6 }));
  return umbMats.get(hex);
};

/** Pose a person: walking phase t, knocked down, umbrella colour or null, facial expression. */
export function posePerson(o, x, y, a, t, knock, ka, umbrella, expr = "normal") {
  o.root.position.set(x, 0, y);
  if (expr !== o.expr) {
    o.expr = expr;
    o.headMesh.material[0] = o.faces[expr] || o.faces.normal;
  }
  if (knock) {
    o.root.rotation.y = -(a + (ka || 0));
    o.body.rotation.z = -Math.PI / 2;
    o.body.position.set(-11, 2.6, 0);
    o.umb.visible = false;
    if (o.chair) o.chair.visible = false;
    return;
  }
  o.root.rotation.y = -a;
  o.body.rotation.z = 0;
  o.body.position.set(0, 0, 0);
  if (o.chair) {
    // seated: legs forward, arms pushing the wheels
    o.chair.visible = true;
    o.body.position.set(0.5, 0, 0);
    o.legL.rotation.z = o.legR.rotation.z = 1.45;
    const push = 0.5 + Math.sin((t || 0) * 6) * 0.35;
    o.armL.rotation.z = o.armR.rotation.z = push;
    o.umb.visible = false;
    return;
  }
  const sw = Math.sin((t || 0) * 12) * (o.look.elder ? 0.35 : 0.55);
  o.legL.rotation.z = sw;
  o.legR.rotation.z = -sw;
  o.armL.rotation.z = -sw * 0.8;
  o.armR.rotation.z = o.look.flag ? -0.5 : sw * 0.8; // flag held up a little
  o.umb.visible = !!umbrella && !o.look.flag;
  if (umbrella) o.canopy.material = umbMat(umbrella);
}
