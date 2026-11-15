// =================== GPS ROUTE ===================
// Shortest way along the streets from the player to the objective, like a
// sat-nav. Both ends snap onto the nearest road segment of the traffic graph.
import { tc } from "../core/utils.js";
import { edges, nodes } from "../world/world.js";

const NX = nodes.map((n) => tc(n.x)),
  NY = nodes.map((n) => tc(n.y));

/** Nearest point on any road segment: { e, x, y, da, db } (da/db = distance to the ends). */
function snap(x, y) {
  let best = null,
    bd = Infinity;
  edges.forEach((e, i) => {
    const ax = NX[e.a],
      ay = NY[e.a],
      bx = NX[e.b],
      by = NY[e.b];
    const L = Math.hypot(bx - ax, by - ay) || 1;
    const t = Math.max(0, Math.min(1, ((x - ax) * (bx - ax) + (y - ay) * (by - ay)) / (L * L)));
    const px = ax + (bx - ax) * t,
      py = ay + (by - ay) * t;
    const d = Math.hypot(x - px, y - py);
    if (d < bd) {
      bd = d;
      best = { e: i, x: px, y: py, da: t * L, db: (1 - t) * L };
    }
  });
  return best;
}

let cache = { key: "", t: 0, pts: null };

/** Route as a list of { x, y } world points from `from` to `to`. Cached ~0.4 s. */
export function routeTo(from, to) {
  const key = `${Math.round(to.x)},${Math.round(to.y)}`;
  const now = performance.now();
  if (cache.key === key && now - cache.t < 400 && cache.pts) {
    cache.pts[0] = { x: from.x, y: from.y };
    return cache.pts;
  }
  const s = snap(from.x, from.y),
    g = snap(to.x, to.y);
  let pts;
  if (s.e === g.e) pts = [from, { x: s.x, y: s.y }, { x: g.x, y: g.y }, to];
  else {
    // Dijkstra over the junctions (a few dozen nodes, so a simple O(n²) scan)
    const n = nodes.length,
      dist = new Array(n).fill(Infinity),
      prev = new Array(n).fill(-1),
      done = new Array(n).fill(false);
    const se = edges[s.e];
    dist[se.a] = s.da;
    dist[se.b] = s.db;
    for (;;) {
      let u = -1;
      for (let i = 0; i < n; i++) if (!done[i] && dist[i] < Infinity && (u < 0 || dist[i] < dist[u])) u = i;
      if (u < 0) break;
      done[u] = true;
      for (const ei of nodes[u].edges) {
        const e = edges[ei],
          w = e.a === u ? e.b : e.a;
        if (dist[u] + e.len < dist[w]) {
          dist[w] = dist[u] + e.len;
          prev[w] = u;
        }
      }
    }
    const ge = edges[g.e];
    let end = dist[ge.a] + g.da <= dist[ge.b] + g.db ? ge.a : ge.b;
    const chain = [];
    for (let u = end; u >= 0; u = prev[u]) chain.unshift({ x: NX[u], y: NY[u] });
    pts = [from, { x: s.x, y: s.y }, ...chain, { x: g.x, y: g.y }, to];
  }
  // drop zero-length steps
  const out = [pts[0]];
  for (const p of pts.slice(1)) {
    const l = out[out.length - 1];
    if (Math.hypot(p.x - l.x, p.y - l.y) > 2) out.push(p);
  }
  cache = { key, t: now, pts: out };
  return out;
}

/** Total length of a route in world px. */
export const routeLength = (pts) => {
  let L = 0;
  for (let i = 1; i < pts.length; i++) L += Math.hypot(pts[i].x - pts[i - 1].x, pts[i].y - pts[i - 1].y);
  return L;
};

/** The point `ahead` px along the route (where to head right now). */
export function routeLookAhead(pts, ahead) {
  let left = ahead;
  for (let i = 1; i < pts.length; i++) {
    const a = pts[i - 1],
      b = pts[i],
      L = Math.hypot(b.x - a.x, b.y - a.y);
    if (L >= left) return { x: a.x + ((b.x - a.x) * left) / L, y: a.y + ((b.y - a.y) * left) / L };
    left -= L;
  }
  return pts[pts.length - 1];
}
