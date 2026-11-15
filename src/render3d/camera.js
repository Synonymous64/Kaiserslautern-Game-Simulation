// =================== 3D CAMERA RIG ===================
// Three modes (V key / camera button):
//   chase — behind the player, mouse / drag to look, follows vehicles like GTA
//   fpv   — first person (eyes of the player or the driver's seat)
//   top   — the tilted north-up overview (and always on the title screen)
// In chase/fpv the controls turn with the camera (camView.forward), so W walks
// away from the camera; vehicles keep steering relative to themselves.
import * as THREE from "three";
import { IS_TOUCH, SETTINGS, tx } from "../core/i18n.js";
import { angDiff, BLD, clamp, get, LAND, T } from "../core/utils.js";
import { cam, camView, game, P } from "../core/state.js";
import { VT } from "../world/vehicles.js";
import { cv, H } from "../render/ground.js";
import { toast } from "../ui/feedback.js";
import { bldHeight } from "./city.js";

const TOP_FOV = 42,
  TOP_PITCH = (58 * Math.PI) / 180;
// driver's eye height per vehicle (above the bonnet, just under the roof)
const EYE = { car: 19.5, taxi: 19.5, van: 23, bus: 27, tractor: 25, bike: 23, escooter: 24 };
const PITCH0 = { chase: 0.3, fpv: 0.04 }; // default look-down angle per camera mode
const PITCH0_VEH = { chase: 0.26, fpv: 0.03 };

export function createCameraRig(camera) {
  let yaw = -Math.PI / 2, // world angle the camera looks along (2D convention)
    pitch = 0.3, // radians below the horizon
    lastLook = -1e9, // time of the last mouse / drag look
    dist = 80, // smoothed chase distance (pulled in by walls)
    lastAnim = 0,
    hinted = false,
    lastVeh = null,
    lastMode = "";
  const now = () => performance.now() / 1000;
  const active = () => SETTINGS.view === "3d" && SETTINGS.camera !== "top" && game.state === "play";
  const look = (dx, dy, k) => {
    yaw += dx * k;
    pitch = clamp(pitch + dy * k * 0.8, -0.45, 1.2);
    lastLook = now();
  };

  // ---- mouse: click the city to capture the mouse (Esc releases it) ----
  cv.addEventListener("click", () => {
    if (active() && !IS_TOUCH && document.pointerLockElement !== cv && cv.requestPointerLock) {
      try {
        const p = cv.requestPointerLock();
        if (p && p.catch) p.catch(() => {});
      } catch (e) {}
    }
  });
  addEventListener("mousemove", (e) => {
    if (document.pointerLockElement === cv) look(e.movementX, e.movementY, 0.0024);
  });
  // ---- touch (and mouse without lock): drag on the free right side to look ----
  let drag = null;
  cv.addEventListener("pointerdown", (e) => {
    if (!active() || document.pointerLockElement === cv) return;
    if (e.pointerType === "mouse" && !IS_TOUCH) return; // a mouse uses pointer lock instead
    drag = { id: e.pointerId, x: e.clientX, y: e.clientY };
  });
  addEventListener("pointermove", (e) => {
    if (!drag || e.pointerId !== drag.id) return;
    look(e.clientX - drag.x, e.clientY - drag.y, 0.006);
    drag.x = e.clientX;
    drag.y = e.clientY;
  });
  const endDrag = (e) => {
    if (drag && e.pointerId === drag.id) drag = null;
  };
  addEventListener("pointerup", endDrag);
  addEventListener("pointercancel", endDrag);

  /** Is the point inside something the camera must not enter (or see through)? */
  const solid = (x, y, z) => {
    const tx = Math.floor(x / T),
      ty = Math.floor(z / T),
      v = get(tx, ty);
    if (v === BLD) return y < bldHeight(tx, ty) + 4;
    if (v === LAND) return y < 70;
    return y < 3;
  };

  /** Positions the camera for this frame. Returns what the renderer needs to know. */
  function update(dt, W) {
    const t = now();
    const mode = game.state === "title" ? "top" : SETTINGS.camera;
    if (document.pointerLockElement === cv && (game.state !== "play" || mode === "top")) document.exitPointerLock();

    if (mode === "top") {
      lastMode = mode;
      camView.forward = -Math.PI / 2;
      const D = (H / game.Z / (2 * Math.tan((TOP_FOV * Math.PI) / 360))) * 0.92;
      camera.fov = TOP_FOV;
      camera.position.set(cam.x, D * Math.sin(TOP_PITCH), cam.y + D * Math.cos(TOP_PITCH));
      camera.lookAt(cam.x, 0, cam.y);
      camera.near = D * 0.15;
      camera.far = D * 7;
      camera.updateProjectionMatrix();
      // the chase camera starts from the player's heading next time
      yaw = P.onFoot ? P.a : P.veh.a;
      return { mode, focusX: cam.x, focusZ: cam.y, fogNear: D * 1.5, fogFar: D * 4.5, shadow: clamp((W / game.Z) * 0.8, 500, 1300) };
    }

    if (!hinted && !IS_TOUCH) {
      hinted = true;
      toast(tx("Click the city to look around with the mouse · V changes the camera", "Klick in die Stadt, um mit der Maus zu schauen · V wechselt die Kamera"), 4200);
    }
    const v = P.onFoot ? null : P.veh;
    if (v !== lastVeh || mode !== lastMode) {
      // getting in or out / switching camera: look the way the player or vehicle faces
      if (v !== lastVeh) yaw = v ? v.a : P.a;
      lastVeh = v;
      lastMode = mode;
      pitch = (v ? PITCH0_VEH : PITCH0)[mode];
      lastLook = -1e9;
    }
    const idle = t - lastLook;
    if (v) {
      // GTA-style: after a moment without mouse input the camera swings back behind the vehicle
      if (idle > 1.2) {
        const k = Math.min(1, dt * (Math.abs(v.speed) > 20 ? 3.2 : 1.2));
        yaw += angDiff(yaw, v.ra ?? v.a) * k;
        pitch += (PITCH0_VEH[mode] - pitch) * k;
      }
    } else {
      const moving = P.anim !== lastAnim;
      // walking roughly forward: let the camera settle in behind (no circling when strafing)
      if (moving && idle > 2 && Math.abs(angDiff(yaw, P.a)) < 1.1) yaw += angDiff(yaw, P.a) * Math.min(1, dt * 1.4);
    }
    lastAnim = P.anim;
    camView.forward = yaw;

    const cp = Math.cos(pitch),
      sp = Math.sin(pitch);
    const fx = Math.cos(yaw) * cp,
      fy = -sp,
      fz = Math.sin(yaw) * cp;

    if (mode === "fpv") {
      let ex, ey, ez;
      if (v) {
        // driver's seat: a little back from the centre, on the left (right-hand traffic)
        const d = VT[v.type],
          a = v.ra ?? v.a,
          two = v.type === "bike" || v.type === "escooter";
        const back = two ? -d.len * 0.1 : d.len * 0.1,
          side = two ? 0 : d.wid * 0.22;
        ex = v.x + Math.cos(a) * back + Math.sin(a) * side;
        ez = v.y + Math.sin(a) * back - Math.cos(a) * side;
        ey = EYE[v.type] || 16;
      } else {
        ex = P.x + Math.cos(P.a) * 2;
        ez = P.y + Math.sin(P.a) * 2;
        ey = 17.5;
      }
      camera.fov = 72;
      camera.near = 0.5;
      camera.far = 3000;
      camera.position.set(ex, ey, ez);
      camera.lookAt(ex + fx * 100, ey + fy * 100, ez + fz * 100);
      camera.updateProjectionMatrix();
      return { mode, focusX: ex + Math.cos(yaw) * 300, focusZ: ez + Math.sin(yaw) * 300, fogNear: 350, fogFar: 1900, shadow: 650, hidePlayer: true };
    }

    // chase
    const tx0 = v ? v.x : P.x,
      tz0 = v ? v.y : P.y;
    const th = v ? (v.type === "bus" ? 30 : v.type === "van" ? 22 : 18) : 15;
    const want = v ? 58 + VT[v.type].len * 2.1 : 72;
    // pull in before walls / buildings
    let free = want;
    for (let s = 10; s <= want; s += 5) {
      if (solid(tx0 - fx * s, th + 8 - fy * s, tz0 - fz * s)) {
        free = Math.max(8, s - 8);
        break;
      }
    }
    dist = free < dist ? free : dist + (free - dist) * Math.min(1, dt * 2.5);
    // pulled in by a wall: rise and look down over the player instead of into its head
    const lift = (want - dist) * 0.9;
    camera.fov = 60;
    camera.near = 1;
    camera.far = 3200;
    camera.position.set(tx0 - fx * dist, Math.max(3, th + 8 - fy * dist + lift), tz0 - fz * dist);
    // never inside a building: climb above whatever we ended up in
    for (let i = 0; i < 40 && solid(camera.position.x, camera.position.y, camera.position.z); i++) camera.position.y += 10;
    camera.lookAt(tx0 + Math.cos(yaw) * 20, th + 6, tz0 + Math.sin(yaw) * 20);
    camera.updateProjectionMatrix();
    return { mode, focusX: tx0 + Math.cos(yaw) * 280, focusZ: tz0 + Math.sin(yaw) * 280, fogNear: 400, fogFar: 2100, shadow: 700 };
  }
  /** Can the camera see the world point (x, h, z)? (buildings block the line of sight) */
  function visible(x, h, z) {
    const p = camera.position;
    const dx = x - p.x,
      dy = h - p.y,
      dz = z - p.z,
      len = Math.hypot(dx, dy, dz),
      n = Math.ceil(len / 14);
    for (let i = 1; i < n - 1; i++) {
      const f = i / n;
      if (solid(p.x + dx * f, p.y + dy * f, p.z + dz * f)) return false;
    }
    return true;
  }
  return { update, visible };
}
