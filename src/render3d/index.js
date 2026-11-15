// =================== 3D VIEW ===================
// A three.js renderer for the same game state the 2D view draws. Gameplay is
// untouched: this only reads state. The 2D canvas (#cv) stays on top as a
// transparent overlay for labels, speech bubbles, the objective arrow, rain
// and colour grading. Loaded on demand (see render/view.js).
import * as THREE from "three";
import { IS_TOUCH, SETTINGS, tr } from "../core/i18n.js";
import { $, clamp, T, tc } from "../core/utils.js";
import { POIS, SIGN_SPOTS } from "../world/world.js";
import { bubbles, cam, camView, game, weather } from "../core/state.js";
import { pos } from "../ui/feedback.js";
import { ctx, cv, DPR, drawStreetSign, H, rr, W } from "../render/ground.js";
import { drawGrade } from "../render/effects.js";
import { darkness, target } from "../render/maps.js";
import { drawObjectiveArrow, drawRain } from "../render/render.js";
import { drawBubble } from "../render/sprites.js";
import { label, LABELS } from "../render/buildings.js";
import { buildCity } from "./city.js";
import { createActors } from "./actors.js";
import { CUT } from "./cutout.js";
import { createCameraRig } from "./camera.js";
import { createNav } from "./nav.js";

/** World px → "350 m" / "1.2 km" (same scale as the 2D arrow: one tile = 25 m). */
const fmtDist = (px) => {
  const m = (px / T) * 25;
  if (m < 1000) return Math.max(10, Math.round(m / 10) * 10) + " m";
  const km = (m / 1000).toFixed(1);
  return (SETTINGS.lang === "de" ? km.replace(".", ",") : km) + " km";
};
/** GTA-style waypoint pin: yellow drop with the distance underneath. */
function waypointPin(x, y, dist) {
  const bob = Math.sin(performance.now() / 250) * 3;
  y += bob;
  ctx.save();
  ctx.fillStyle = "#f2c230";
  ctx.strokeStyle = "#111";
  ctx.lineWidth = 2.5;
  ctx.beginPath();
  ctx.arc(x, y - 14, 11, Math.PI * 0.85, Math.PI * 0.15);
  ctx.lineTo(x, y + 4);
  ctx.closePath();
  ctx.fill();
  ctx.stroke();
  ctx.fillStyle = "#111";
  ctx.beginPath();
  ctx.arc(x, y - 14, 4, 0, Math.PI * 2);
  ctx.fill();
  if (dist) {
    const s = fmtDist(dist);
    ctx.font = '700 12px "IBM Plex Mono",monospace';
    ctx.textAlign = "center";
    ctx.textBaseline = "top";
    ctx.lineWidth = 3;
    ctx.strokeStyle = "rgba(0,0,0,.75)";
    ctx.strokeText(s, x, y + 8);
    ctx.fillStyle = "#fff";
    ctx.fillText(s, x, y + 8);
  }
  ctx.restore();
}

// how high above the ground each place name floats (landmarks sit on their roofs)
const LABEL_H = {
  Stiftskirche: 240,
  "Town Hall · 84 m": 320,
  "Im K": 90,
  Fruchthalle: 110,
  Pfalztheater: 100,
  "Main Station": 95,
  "Stadion Betzenberg": 110,
  "Pfaff-Quartier": 110,
  Kaiserpfalz: 50,
};
const C = (hex) => new THREE.Color(hex);
const SKY = { day: C("#b7d3e6"), night: C("#0b1222"), dusk: C("#e3a07a"), dawn: C("#e9b3b8"), wet: C("#8796a6") };
const SKY_TOP = { day: C("#6fa3d6"), night: C("#04070f") };
const HEMI_SKY ={ day: C("#d6e7f5"), night: C("#3a4c80") };
const HEMI_GND = { day: C("#5f6b4e"), night: C("#141c18") };
const SUN_COL = { noon: C("#fff6e8"), low: C("#ffcf96"), moon: C("#9fb4ff") };
const WET_GROUND = C("#8d97a6");

export async function create3D() {
  // throws when WebGL is unavailable; the caller then stays on the 2D view
  const renderer = new THREE.WebGLRenderer({ antialias: true, powerPreference: "high-performance" });
  renderer.toneMapping = THREE.NeutralToneMapping;
  renderer.shadowMap.enabled = true;
  renderer.shadowMap.type = THREE.PCFShadowMap;
  const el = renderer.domElement;
  el.id = "cv3d";
  el.setAttribute("aria-hidden", "true");
  Object.assign(el.style, { position: "fixed", inset: "0", display: "none" });
  cv.before(el);

  const scene = new THREE.Scene();
  scene.fog = new THREE.Fog(0xb7d3e6, 1000, 4000);
  scene.background = new THREE.Color(0xb7d3e6);
  const camera = new THREE.PerspectiveCamera(60, 1, 1, 8000);

  const hemi = new THREE.HemisphereLight(0xd6e7f5, 0x5f6b4e, 1.6);
  const sun = new THREE.DirectionalLight(0xfff6e8, 2.6);
  sun.shadow.mapSize.set(2048, 2048);
  sun.shadow.bias = -0.0004;
  sun.shadow.normalBias = 0.6;
  sun.shadow.camera.near = 50;
  sun.shadow.camera.far = 4000;
  // a soft light that follows the player at night (the 2D view lights the player too)
  const playerLight = new THREE.PointLight(0xffe2b0, 0, 260, 1);
  scene.add(hemi, sun, sun.target, playerLight);

  // street signs are painted into the ground texture, so wait for the fonts
  try {
    await Promise.race([document.fonts.ready, new Promise((r) => setTimeout(r, 2000))]);
  } catch (e) {}
  const city = buildCity(scene, renderer);
  const actors = createActors(scene);
  const rig = createCameraRig(camera);
  const nav = createNav();

  // gradient sky dome that follows the camera (its horizon matches the fog)
  const skyMat = new THREE.ShaderMaterial({
    uniforms: { top: { value: new THREE.Color() }, horizon: { value: new THREE.Color() } },
    vertexShader: "varying vec3 vP; void main(){ vP = position; gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0); }",
    fragmentShader:
      "uniform vec3 top; uniform vec3 horizon; varying vec3 vP; void main(){ float h = clamp(normalize(vP).y * 2.2, 0.0, 1.0); gl_FragColor = vec4(mix(horizon, top, h), 1.0); }",
    side: THREE.BackSide,
    depthWrite: false,
    fog: false,
  });
  const skyDome = new THREE.Mesh(new THREE.SphereGeometry(2800, 24, 12), skyMat);
  skyDome.renderOrder = -1;
  skyDome.frustumCulled = false;
  scene.add(skyDome);

  let sizeKey = "",
    shadowSize = 0,
    lastT = 0;
  const v = new THREE.Vector3(),
    fwd = new THREE.Vector3();
  /** World point → screen px, or null when behind the camera. */
  const project = (x, h, y) => {
    v.set(x, h, y);
    if (v.clone().sub(camera.position).dot(fwd) <= 0) return null;
    v.project(camera);
    return { x: ((v.x + 1) / 2) * W, y: ((1 - v.y) / 2) * H };
  };

  function frame() {
    const hq = SETTINGS.quality !== "low";
    const pr = hq ? Math.min(DPR, 1.5) : 1;
    const key = `${W}x${H}@${pr}`;
    if (key !== sizeKey) {
      sizeKey = key;
      renderer.setPixelRatio(pr);
      renderer.setSize(W, H);
      camera.aspect = W / H;
    }
    const now = performance.now() / 1000;
    const q = game.state === "title" ? cam : pos();

    // ---- time of day ----
    const h = (game.clock / 60) % 24;
    const dayF = 1 - darkness() / 0.62,
      night = 1 - dayF,
      wet = weather.wet;
    const bell = (a, b) => (h >= a && h < b ? Math.sin(((h - a) / (b - a)) * Math.PI) : 0);
    const dusk = bell(17.3, 20.6),
      dawn = bell(5, 7.6);
    const sky = SKY.night.clone().lerp(SKY.day, dayF);
    sky.lerp(SKY.dusk, dusk * 0.55).lerp(SKY.dawn, dawn * 0.45).lerp(SKY.wet, wet * 0.5 * dayF);
    scene.background.copy(sky);
    scene.fog.color.copy(sky);
    hemi.color.copy(HEMI_SKY.night).lerp(HEMI_SKY.day, dayF);
    hemi.groundColor.copy(HEMI_GND.night).lerp(HEMI_GND.day, dayF);
    hemi.intensity = 0.55 + 1.15 * dayF;

    // sun path: east (morning) → south (noon) → west (evening)
    const k = clamp((h - 6) / 14, 0, 1);
    const elev = ((15 + 50 * Math.sin(k * Math.PI)) * Math.PI) / 180;
    const dir = new THREE.Vector3(Math.cos(k * Math.PI) * Math.cos(elev), Math.sin(elev), Math.sin(k * Math.PI) * Math.cos(elev));
    sun.color.copy(SUN_COL.low).lerp(SUN_COL.noon, Math.sin(k * Math.PI)).lerp(SUN_COL.moon, night);
    sun.intensity = 0.35 + 2.5 * dayF * (1 - 0.5 * wet);
    sun.castShadow = hq;

    // ---- camera (chase / first person / top, see camera.js) ----
    const dt = Math.min(0.1, now - (lastT || now));
    lastT = now;
    const view = rig.update(dt, W);
    const top = view.mode === "top";
    camera.getWorldDirection(fwd);
    scene.fog.near = view.fogNear;
    scene.fog.far = view.fogFar;
    skyDome.position.copy(camera.position);
    skyMat.uniforms.top.value.copy(SKY_TOP.night).lerp(SKY_TOP.day, dayF).lerp(SKY.wet, wet * 0.4 * dayF);
    skyMat.uniforms.horizon.value.copy(sky);

    // shadow box follows the camera focus
    sun.target.position.set(view.focusX, 0, view.focusZ);
    sun.position.copy(sun.target.position).addScaledVector(dir, 1800);
    const S = Math.round(view.shadow / 50) * 50;
    if (S !== shadowSize) {
      shadowSize = S;
      Object.assign(sun.shadow.camera, { left: -S, right: S, top: S, bottom: -S });
      sun.shadow.camera.updateProjectionMatrix();
    }

    // ---- city state ----
    city.groundMat.color.set(0xffffff).lerp(WET_GROUND, wet * 0.6);
    city.groundMat.roughness = 0.95 - 0.55 * wet;
    city.wallMat.emissiveIntensity = night * 1.5;
    city.lampBulb.color.set(night > 0.1 ? 0xfff0c0 : 0xc9c4b4);
    city.lampPool.opacity = night * 0.65;
    playerLight.position.set(q.x, 55, q.y);
    playerLight.intensity = game.state === "title" ? 0 : night * 140;
    for (const f of city.floodlights) f.color.set(night > 0.2 || game.matchday ? 0xffffff : 0x555a60);
    city.blitzEye.color.set(((now * 0.5) | 0) % 2 ? 0xc42222 : 0x3a0c0c);
    city.updateSignals();

    // ---- see-through hole between camera and player (overview only; the
    // chase camera moves in front of walls instead) ----
    CUT.uCutOn.value = top && game.state !== "title" ? 1 : 0;
    CUT.uCutTarget.value.set(q.x, 12, q.y);
    CUT.uCutCam.value.copy(camera.position);
    city.signs.visible = !top; // upright signs in street views; flat labels from above

    const tg = game.state === "title" ? null : target();
    actors.update(view.focusX, view.focusZ, now, night, tg, game.state, view);
    const navInfo = nav.update(q, tg);
    renderer.render(scene, camera);

    // ---- 2D overlay ----
    ctx.setTransform(DPR, 0, 0, DPR, 0, 0);
    ctx.clearRect(0, 0, W, H);
    // in street views: only names that are near and not hidden behind buildings
    const seen = (x, h, y, r) =>
      top || (Math.hypot(x - camera.position.x, y - camera.position.z) < r && rig.visible(x, h, y));
    if (top)
      for (const sp of SIGN_SPOTS) {
        const p = project(sp.x, 0, sp.y);
        if (p && p.x > -100 && p.x < W + 100 && p.y > -20 && p.y < H + 20) drawStreetSign(sp.n, p.x, p.y);
      }
    for (const [n, x, y] of LABELS) {
      const key = typeof n === "string" ? n : n.en;
      const lh = LABEL_H[key] ?? 30;
      if (!seen(x * T + 16, lh, y * T, 1400)) continue;
      const p = project(x * T + 16, lh, y * T);
      if (!p || p.x < -200 || p.x > W + 200 || p.y < -40 || p.y > H + 40) continue;
      const s = tr(n);
      label(s, p.x, p.y, s.length > 14 ? 14 : 16);
    }
    for (const k in POIS) {
      const poi = POIS[k];
      if (poi.kind === "bus") continue; // bus stops have a 3D sign
      if (!seen(tc(poi.x), 26, tc(poi.y), 520)) continue;
      const p = project(tc(poi.x), 26, tc(poi.y));
      if (p && p.x > -100 && p.x < W + 100 && p.y > -40 && p.y < H + 40) poiMarker(poi, p.x, p.y);
    }
    drawRain();
    for (const bb of bubbles) {
      if (!seen(bb.o.x, 24, bb.o.y, 700)) continue;
      const p = project(bb.o.x, 24, bb.o.y);
      if (p) drawBubble(p.x, p.y + 8, tr(bb.text));
    }
    // street cameras get the compass + pin; from above the edge arrow and beam suffice
    // street cameras: compass + waypoint pin; from above: the edge arrow (+ beam)
    const street = !top && tg && navInfo;
    if (tg) {
      if (top) drawObjectiveArrow(tg, q, ...screenOf(tg), navInfo?.dist);
      else if (street) {
        const pin = project(tg.x, 70, tg.y);
        if (pin && pin.x > 0 && pin.x < W && pin.y > 0 && pin.y < H) waypointPin(pin.x, pin.y, navInfo.dist);
      }
    }
    drawGrade();
    if (street) compass(q, navInfo, tg);
  }

  /** Screen position of a ground point; behind the camera → far off the bottom edge. */
  function screenOf(t) {
    const p = project(t.x, 0, t.y);
    if (p) return [p.x, p.y];
    v.set(t.x, 0, t.y).applyMatrix4(camera.matrixWorldInverse);
    return [W / 2 + Math.sign(v.x || 1) * W, H * 2];
  }

  /** Where the compass sits: just below the whole top HUD (it grows while the mission briefing is open). */
  function compassAt() {
    const mini = $("mini").getBoundingClientRect(),
      top = document.querySelector(".hud-top").getBoundingClientRect();
    if (IS_TOUCH && W > H) {
      // phone sideways: the thumb buttons own the right edge, so use the top
      // centre (under the mission briefing while it is open)
      const obj = $("hObj");
      const y = obj.hidden ? top.top : obj.getBoundingClientRect().bottom;
      return { ok: mini.width > 0, cx: W / 2, cy: y + 36 };
    }
    return { ok: mini.width > 0, cx: Math.min(mini.left + mini.width / 2, W - 92), cy: top.bottom + 40 };
  }

  /** Sat-nav compass under the minimap: which way to go now, how far, where to. */
  function compass(q, nav, tg) {
    const { ok, cx, cy } = compassAt();
    if (!ok) return;
    const R = 26;
    const world = Math.atan2(nav.ahead.y - q.y, nav.ahead.x - q.x);
    const a = world - camView.forward - Math.PI / 2; // screen angle (up = where the camera looks)
    ctx.save();
    ctx.fillStyle = "rgba(10,18,14,.78)";
    ctx.strokeStyle = "rgba(242,194,48,.9)";
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.arc(cx, cy, R, 0, Math.PI * 2);
    ctx.fill();
    ctx.stroke();
    ctx.translate(cx, cy);
    ctx.rotate(a);
    ctx.fillStyle = "#f2c230";
    ctx.beginPath();
    ctx.moveTo(18, 0);
    ctx.lineTo(-10, -12);
    ctx.lineTo(-4, 0);
    ctx.lineTo(-10, 12);
    ctx.closePath();
    ctx.fill();
    ctx.restore();
    const name = tg.name || "";
    ctx.font = '700 13px "IBM Plex Mono",monospace';
    ctx.textAlign = "center";
    ctx.textBaseline = "top";
    ctx.lineWidth = 3;
    ctx.strokeStyle = "rgba(0,0,0,.75)";
    ctx.fillStyle = "#fff";
    const d = fmtDist(nav.dist);
    ctx.strokeText(d, cx, cy + R + 6);
    ctx.fillText(d, cx, cy + R + 6);
    if (name) {
      ctx.font = '600 12px "Atkinson Hyperlegible",sans-serif';
      const s = name.length > 26 ? name.slice(0, 25) + "…" : name;
      ctx.strokeText(s, cx, cy + R + 23);
      ctx.fillText(s, cx, cy + R + 23);
    }
  }

  function setActive(on) {
    el.style.display = on ? "block" : "none";
    cv.style.background = on ? "transparent" : "";
  }
  return { render: frame, setActive };
}

/** POI icon + name, same look as the 2D map labels. */
function poiMarker(p, x, y) {
  const col = p.kind === "food" ? "#c4472f" : p.kind === "pfand" ? "#2f8f4a" : "#1d3b74";
  ctx.fillStyle = col;
  rr(ctx, x - 7, y - 7, 14, 14, 4);
  ctx.fill();
  ctx.fillStyle = "#fff";
  ctx.font = '800 10px "Barlow Condensed",sans-serif';
  ctx.textAlign = "center";
  ctx.textBaseline = "middle";
  ctx.fillText(p.kind === "food" ? "€" : p.kind === "pfand" ? "P" : "i", x, y + 0.5);
  ctx.font = '600 11px "Atkinson Hyperlegible",sans-serif';
  ctx.lineWidth = 3;
  ctx.strokeStyle = "rgba(12,20,15,.75)";
  ctx.strokeText(tr(p.name), x, y + 16);
  ctx.fillStyle = "#fff";
  ctx.fillText(tr(p.name), x, y + 16);
}
