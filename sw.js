/* Lautre service worker: network-first, falls back to cache when offline. */
const VERSION = "lautre-v2.2.0";
const CORE = [
  "./",
  "index.html",
  "manifest.webmanifest",
  "assets/icon.svg",
  "css/base.css",
  "css/hud.css",
  "css/landing.css",
  "css/overlays.css",
  "css/touch.css",
  "js/core/i18n.js",
  "js/core/utils.js",
  "js/world/world.js",
  "js/world/traffic-lights.js",
  "js/world/vehicles.js",
  "js/core/state.js",
  "js/systems/audio.js",
  "js/systems/music.js",
  "js/data/text.js",
  "js/data/missions.js",
  "js/systems/missions.js",
  "js/systems/jobs.js",
  "js/ui/feedback.js",
  "js/systems/aerger.js",
  "js/systems/population.js",
  "js/systems/actions.js",
  "js/input/input.js",
  "js/ui/phone.js",
  "js/render/ground.js",
  "js/render/buildings.js",
  "js/render/sprites.js",
  "js/render/effects.js",
  "js/render/maps.js",
  "js/render/render.js",
  "js/systems/update.js",
  "js/ui/hud.js",
  "js/ui/menus.js",
  "js/main.js",
];

self.addEventListener("install", (e) => {
  e.waitUntil(caches.open(VERSION).then((c) => c.addAll(CORE)).then(() => self.skipWaiting()));
});
self.addEventListener("activate", (e) => {
  e.waitUntil(
    caches
      .keys()
      .then((keys) => Promise.all(keys.filter((k) => k !== VERSION).map((k) => caches.delete(k))))
      .then(() => self.clients.claim()),
  );
});
self.addEventListener("fetch", (e) => {
  const req = e.request;
  if (req.method !== "GET") return;
  const url = new URL(req.url);
  const sameOrigin = url.origin === location.origin;
  const fonts = /fonts\.(googleapis|gstatic)\.com$/.test(url.hostname);
  if (!sameOrigin && !fonts) return;
  // Network first, so a new deploy is picked up immediately; cache = offline fallback.
  e.respondWith(
    fetch(req)
      .then((res) => {
        if (res && (res.ok || res.type === "opaque")) {
          const copy = res.clone();
          caches.open(VERSION).then((c) => c.put(req, copy));
        }
        return res;
      })
      .catch(() => caches.match(req).then((r) => r || caches.match("index.html"))),
  );
});
