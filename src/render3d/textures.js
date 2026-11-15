// Procedural canvas textures for the 3D view (no image files to download).
import * as THREE from "three";
import { hash } from "../core/utils.js";

const canvas = (w, h) => {
  const c = document.createElement("canvas");
  c.width = w;
  c.height = h;
  return c;
};
const tex = (c, srgb = true) => {
  const t = new THREE.CanvasTexture(c);
  if (srgb) t.colorSpace = THREE.SRGBColorSpace;
  return t;
};

/**
 * Facade texture: a 4×4 block of "one tile wide × one storey high" cells.
 * White plaster (tinted per building by vertex colour) with dark windows.
 * Returns { map, lit }: `lit` is the emissive map with ~half the windows on.
 */
export function facadeTextures() {
  const S = 64,
    N = 4;
  const day = canvas(S * N, S * N),
    night = canvas(S * N, S * N);
  const d = day.getContext("2d"),
    n = night.getContext("2d");
  d.fillStyle = "#ffffff";
  d.fillRect(0, 0, S * N, S * N);
  n.fillStyle = "#000000";
  n.fillRect(0, 0, S * N, S * N);
  for (let cy = 0; cy < N; cy++)
    for (let cx = 0; cx < N; cx++) {
      const ox = cx * S,
        oy = cy * S;
      // storey line
      d.fillStyle = "rgba(0,0,0,.10)";
      d.fillRect(ox, oy + S - 4, S, 4);
      for (const wx of [10, 38]) {
        const x = ox + wx,
          y = oy + 16,
          w = 16,
          h = 28;
        d.fillStyle = "rgba(0,0,0,.22)"; // frame / reveal
        d.fillRect(x - 2, y - 2, w + 4, h + 4);
        d.fillStyle = "#3d4a58"; // glass
        d.fillRect(x, y, w, h);
        d.fillStyle = "rgba(190,215,235,.35)"; // sky reflection
        d.fillRect(x, y, w, h * 0.4);
        if (hash(cx * 7 + wx, cy * 13) > 0.45) {
          n.fillStyle = hash(cx + wx, cy * 5) > 0.3 ? "#ffd38a" : "#ffeccc";
          n.fillRect(x, y, w, h);
        }
      }
    }
  const map = tex(day),
    lit = tex(night);
  for (const t of [map, lit]) {
    t.wrapS = t.wrapT = THREE.RepeatWrapping;
    t.repeat.set(1 / N, 1 / N);
  }
  return { map, lit };
}

/** Soft round glow (for lamp pools and headlight spill), white → transparent. */
export function glowTexture() {
  const c = canvas(128, 128),
    g = c.getContext("2d");
  const r = g.createRadialGradient(64, 64, 0, 64, 64, 64);
  r.addColorStop(0, "rgba(255,255,255,1)");
  r.addColorStop(0.35, "rgba(255,255,255,.55)");
  r.addColorStop(1, "rgba(255,255,255,0)");
  g.fillStyle = r;
  g.fillRect(0, 0, 128, 128);
  return tex(c);
}

/** Headlight cone on the ground: bright at the car, fading forwards (+x). */
export function coneTexture() {
  const c = canvas(128, 64),
    g = c.getContext("2d");
  const lin = g.createLinearGradient(0, 0, 128, 0);
  lin.addColorStop(0, "rgba(255,255,255,.95)");
  lin.addColorStop(1, "rgba(255,255,255,0)");
  g.fillStyle = lin;
  g.beginPath();
  g.moveTo(0, 26);
  g.lineTo(128, 0);
  g.lineTo(128, 64);
  g.lineTo(0, 38);
  g.closePath();
  g.fill();
  return tex(c);
}

/** Vertical beam for the objective marker: opaque at the bottom, fading up. */
export function beamTexture() {
  const c = canvas(4, 128),
    g = c.getContext("2d");
  const lin = g.createLinearGradient(0, 128, 0, 0);
  lin.addColorStop(0, "rgba(255,255,255,.85)");
  lin.addColorStop(1, "rgba(255,255,255,0)");
  g.fillStyle = lin;
  g.fillRect(0, 0, 4, 128);
  return tex(c);
}

/** Flat roof sign (e.g. "IM K", "BETZE") on a coloured background. */
export function signTexture(text, bg, fg, w = 256, h = 128) {
  const c = canvas(w, h),
    g = c.getContext("2d");
  g.fillStyle = bg;
  g.fillRect(0, 0, w, h);
  g.fillStyle = fg;
  g.font = `800 ${Math.round(h * 0.62)}px "Barlow Condensed","Arial Narrow",sans-serif`;
  g.textAlign = "center";
  g.textBaseline = "middle";
  g.fillText(text, w / 2, h / 2 + h * 0.04);
  return tex(c);
}
