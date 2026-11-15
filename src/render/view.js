// =================== VIEW SWITCH (2D canvas / 3D three.js) ===================
// The 3D renderer is loaded on demand, so players on the 2D view never
// download three.js. If WebGL is unavailable the game stays on 2D.
import { SETTINGS, saveSettings, tx } from "../core/i18n.js";
import { $ } from "../core/utils.js";
import { camView } from "../core/state.js";
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

const CAMS = ["chase", "fpv", "top"];
const CAM_NAME = {
  chase: () => tx("Camera: behind the player", "Kamera: hinter der Figur"),
  fpv: () => tx("Camera: first person", "Kamera: Ego-Perspektive"),
  top: () => tx("Camera: from above", "Kamera: von oben"),
};
/** V key / camera button: behind → first person → from above → … (3D only). */
export function cycleCamera() {
  if (!is3d()) return;
  const i = CAMS.indexOf(SETTINGS.camera);
  SETTINGS.camera = CAMS[(i + 1) % CAMS.length];
  saveSettings();
  toast(CAM_NAME[SETTINGS.camera](), 1600);
}

export function renderFrame() {
  if (is3d()) r3d.render();
  else render();
}
