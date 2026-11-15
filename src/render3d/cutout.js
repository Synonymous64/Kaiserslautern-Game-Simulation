// "X-ray" hole: building fragments between the camera and the player are
// discarded, so tall blocks never hide the player. Patched into the standard
// three.js materials of everything that can stand in the way.
import * as THREE from "three";

export const CUT = {
  uCutTarget: { value: new THREE.Vector3() },
  uCutCam: { value: new THREE.Vector3() },
  uCutOn: { value: 0 },
};

export function withCutout(mat) {
  mat.onBeforeCompile = (sh) => {
    Object.assign(sh.uniforms, CUT);
    sh.vertexShader = sh.vertexShader
      .replace("#include <common>", "#include <common>\nvarying vec3 vCutPos;")
      .replace(
        "#include <project_vertex>",
        "#include <project_vertex>\nvCutPos = (modelMatrix * vec4(transformed, 1.0)).xyz;",
      );
    sh.fragmentShader = sh.fragmentShader
      .replace(
        "#include <common>",
        "#include <common>\nvarying vec3 vCutPos;\nuniform vec3 uCutTarget;\nuniform vec3 uCutCam;\nuniform float uCutOn;",
      )
      .replace(
        "#include <clipping_planes_fragment>",
        `#include <clipping_planes_fragment>
        if (uCutOn > 0.5) {
          vec3 ab = uCutTarget - uCutCam;
          float L = length(ab);
          vec3 dir = ab / L;
          float t = dot(vCutPos - uCutCam, dir);
          if (t > 0.0 && t < L - 4.0) {
            float r = length(vCutPos - (uCutCam + dir * t));
            // narrow: just enough to see the player, not the neighbouring blocks
            float rad = mix(4.0, 24.0, t / L);
            // dithered rim so the hole edge is soft rather than a hard circle
            float n = fract(sin(dot(gl_FragCoord.xy, vec2(12.9898, 78.233))) * 43758.5453);
            if (r < rad - 5.0 * n) discard;
          }
        }`,
      );
  };
  mat.customProgramCacheKey = () => "cutout";
  return mat;
}
