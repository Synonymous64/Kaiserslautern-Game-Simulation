// Player silhouette through walls (view from above). The buildings stay solid;
// where one hides the player (or the player's vehicle), a soft yellow outline
// of them is drawn on top of it instead.
//
// Two extra passes over just the player, after the normal frame:
//   1. mark the pixels where the player is visible (stencil = 1, no colour)
//   2. draw the player where it is behind something (depth test reversed),
//      except on the pixels marked in pass 1, so the visible parts of the
//      player are never tinted.
import * as THREE from "three";

const LAYER = 1;

export function createXray(renderer, scene, camera) {
  const mask = new THREE.MeshBasicMaterial({
    colorWrite: false,
    depthWrite: false,
    stencilWrite: true,
    stencilRef: 1,
    stencilFunc: THREE.AlwaysStencilFunc,
    stencilZPass: THREE.ReplaceStencilOp,
  });
  const ghost = new THREE.MeshBasicMaterial({
    color: "#f2c230",
    transparent: true,
    opacity: 0.6,
    fog: false,
    depthWrite: false,
    depthFunc: THREE.GreaterDepth,
    stencilWrite: true,
    stencilRef: 1,
    stencilFunc: THREE.NotEqualStencilFunc,
    stencilZPass: THREE.ReplaceStencilOp, // each pixel once, so overlapping parts don't stack
  });

  let tagged = null;
  const tag = (root, on) =>
    root.traverse((o) => {
      if (on) o.layers.enable(LAYER);
      else o.layers.disable(LAYER);
    });

  function pass(material) {
    scene.overrideMaterial = material;
    renderer.render(scene, camera);
  }

  return {
    /** Call right after the normal render of the frame. */
    render(root) {
      if (tagged && tagged !== root) tag(tagged, false);
      tagged = root || null;
      if (!root || !root.visible) return;
      tag(root, true); // cheap: a person or a car is a handful of meshes

      const bg = scene.background,
        autoClear = renderer.autoClear,
        shadows = renderer.shadowMap.autoUpdate;
      scene.background = null;
      renderer.autoClear = false;
      renderer.shadowMap.autoUpdate = false;
      camera.layers.set(LAYER);
      renderer.clearStencil();
      try {
        pass(mask);
        pass(ghost);
      } finally {
        camera.layers.set(0);
        scene.overrideMaterial = null;
        scene.background = bg;
        renderer.autoClear = autoClear;
        renderer.shadowMap.autoUpdate = shadows;
      }
    },
  };
}
