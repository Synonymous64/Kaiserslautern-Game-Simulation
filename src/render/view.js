// =================== VIEW SWITCH (2D canvas / 3D three.js) ===================
// The 3D renderer is loaded on demand, so players on the 2D view never
// download three.js. If WebGL is unavailable the game stays on 2D.
import { IS_TOUCH, SETTINGS, saveSettings, tx } from "../core/i18n.js";
import { $ } from "../core/utils.js";
import { camView, game } from "../core/state.js";
import { toast } from "../ui/feedback.js";
import { render } from "./render.js";

let r3d = null,
  loading = false,
  failed = false;

const is3d = () => !!r3d && SETTINGS.view === "3d";

function sync() {
  const on = is3d();
  if (r3d) r3d.setActive(on);
  $("bCam").hidden = !on;
  if (!on) camView.forward = -Math.PI / 2; // 2D is always north-up
}

/** Apply SETTINGS.view: start (or show) the 3D view, or fall back to 2D. */
export function applyView() {
  sync();
  if (SETTINGS.view !== "3d" || failed || r3d || loading) return;
  loading = true;
  import("../render3d/index.js")
    .then((m) => m.create3D())
    .then((r) => {
      r3d = r;
      sync();
    })
    .catch((e) => {
      console.warn("3D view unavailable, staying on 2D:", e);
      failed = true;
      SETTINGS.view = "2d";
      saveSettings();
      sync();
    })
    .finally(() => {
      loading = false;
    });
}

const CAMS = ["top", "chase", "fpv"];
/** Is the 3D view up (camera button and camera tips only make sense then)? */
export const view3dActive = () => is3d();
const CAM_NAME = {
  chase: () => tx("Camera: behind the player", "Kamera: hinter der Figur"),
  fpv: () => tx("Camera: first person", "Kamera: Ego-Perspektive"),
  top: () => tx("Camera: from above", "Kamera: von oben"),
};
/** V key / camera button: behind → first person → from above → … (3D only). */
export function cycleCamera() {
  if (!is3d()) return;
  const prev = SETTINGS.camera;
  const i = CAMS.indexOf(prev);
  SETTINGS.camera = CAMS[(i + 1) % CAMS.length];
  SETTINGS.camPicked = true;
  $("bCam").classList.remove("hint-pulse");
  saveSettings();
  toast(CAM_NAME[SETTINGS.camera](), 1600);
  // phones: behind the player / first person play sideways; from above, upright
  if (SETTINGS.camera === "top") releaseLandscape();
  else goLandscape();
}

// ---------- phones: street views work best sideways ----------
const portrait = () => innerHeight > innerWidth;
const canLock = () => !!(document.documentElement.requestFullscreen && screen.orientation && screen.orientation.lock);
let rotateT = 0,
  landscapeTipShown = false,
  weLocked = false;
function hideRotateHint() {
  clearTimeout(rotateT);
  $("rotateHint").hidden = true;
}
/** Fullscreen + lock the screen sideways (needs a tap: the camera button is one). */
async function lockLandscape() {
  if (!document.fullscreenElement) await document.documentElement.requestFullscreen({ navigationUI: "hide" });
  await screen.orientation.lock("landscape");
  weLocked = true;
}
/**
 * Switching a phone to a street camera: flip the screen to landscape right
 * away where the browser allows it (Android); otherwise (iPhone) show a card
 * asking to turn the phone, for a few seconds.
 */
function goLandscape() {
  if (!IS_TOUCH || !portrait()) return;
  if (canLock())
    lockLandscape().catch(() => showRotateHint()); // e.g. the browser refused: ask instead
  else showRotateHint();
}
function showRotateHint() {
  $("rotateGo").hidden = !canLock();
  $("rotateHint").hidden = false;
  clearTimeout(rotateT);
  rotateT = setTimeout(hideRotateHint, 4500);
}
/** Back to the view from above: let the phone rotate freely again. */
function releaseLandscape() {
  hideRotateHint();
  if (!weLocked) return;
  weLocked = false;
  try {
    screen.orientation.unlock();
  } catch (e) {}
  if (document.fullscreenElement && document.exitFullscreen) document.exitFullscreen().catch(() => {});
}
$("rotateGo").addEventListener("click", () => {
  hideRotateHint();
  lockLandscape().catch(() => {});
});
$("rotateHint").addEventListener("click", (e) => {
  if (e.target.id !== "rotateGo") hideRotateHint();
});
// turned sideways: drop the hint and, once, explain the landscape controls
addEventListener("resize", () => {
  if (portrait()) return;
  hideRotateHint();
  if (IS_TOUCH && is3d() && game.state === "play" && SETTINGS.camera !== "top" && !landscapeTipShown) {
    landscapeTipShown = true;
    toast(
      tx(
        "Left thumb: walk or steer · drag the right side to look around · camera button switches the view",
        "Linker Daumen: laufen oder lenken · rechts ziehen zum Umschauen · Kamera-Knopf wechselt die Ansicht",
      ),
      4500,
    );
  }
});

export function renderFrame() {
  if (is3d()) r3d.render();
  else render();
}
