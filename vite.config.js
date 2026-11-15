import { createHash } from "node:crypto";
import { readdirSync, readFileSync, writeFileSync } from "node:fs";
import { join, relative, resolve, sep } from "node:path";
import { defineConfig } from "vite";

/**
 * After a build, writes the list of output files into dist/sw.js so the
 * service worker can precache them, and stamps a cache version derived from
 * their contents. No more bumping VERSION by hand.
 */
function serviceWorkerPrecache() {
  let outDir;
  const walk = (dir) =>
    readdirSync(dir, { withFileTypes: true }).flatMap((d) =>
      d.isDirectory() ? walk(join(dir, d.name)) : [join(dir, d.name)],
    );
  return {
    name: "lautre-sw-precache",
    apply: "build",
    configResolved(config) {
      outDir = resolve(config.root, config.build.outDir);
    },
    closeBundle() {
      const swPath = join(outDir, "sw.js");
      const files = walk(outDir)
        .filter((f) => f !== swPath && !f.endsWith(".map"))
        .map((f) => relative(outDir, f).split(sep).join("/"))
        .sort();
      const hash = createHash("sha256");
      for (const f of files) hash.update(f).update(readFileSync(join(outDir, f)));
      const version = "lautre-" + hash.digest("hex").slice(0, 12);
      const sw = readFileSync(swPath, "utf8")
        .replace('"__SW_VERSION__"', JSON.stringify(version))
        .replace('"__SW_PRECACHE__"', JSON.stringify(["./", ...files]));
      writeFileSync(swPath, sw);
      console.log(`sw.js: ${files.length} files precached as ${version}`);
    },
  };
}

export default defineConfig({
  // relative URLs, so the build also works from a sub-path (e.g. GitHub Pages)
  base: "./",
  plugins: [serviceWorkerPrecache()],
});
