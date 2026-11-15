// =================== 3D SAT-NAV ===================
// Works out the street route to the objective for the compass under the
// minimap and the waypoint pin (the route itself is drawn on the minimap).
import { routeLength, routeLookAhead, routeTo } from "../systems/route.js";

export function createNav() {
  /** Returns { dist, ahead } for the compass, or null without an objective. */
  function update(q, tg) {
    if (!tg) return null;
    const pts = routeTo(q, tg);
    return { dist: routeLength(pts), ahead: routeLookAhead(pts, 70) };
  }
  return { update };
}
