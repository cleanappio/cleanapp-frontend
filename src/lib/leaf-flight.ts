/**
 * Flight paths for the receipt leaf (src/components/reporting/ReportProgress).
 *
 * The leaf follows an SVG path with CSS `offset-path`, so it banks along the
 * curve like a small plane instead of bouncing between keyframes. Two paths:
 *
 * - cruisePath: a closed aerobatic circuit across the top of the card with two
 *   loops. Repeats for as long as the report is being analyzed.
 * - landingPath: flown once when analysis ends. The leaf leaves its corner,
 *   circles the "Report something else" link, and returns home.
 *
 * Both start and end at HOME with the same heading, so cruise -> landing ->
 * rest joins without a jump. Coordinates are CSS pixels relative to the
 * top-left of the 104x64 progress mark; the leaf's center rides the path.
 * Pure functions, no DOM access.
 */

export type Point = readonly [number, number];

/** Center of the resting leaf inside the progress mark. */
export const HOME: Point = [32, 32];
/** A point just ahead of HOME; fixes the heading at take-off and touch-down. */
const AHEAD: Point = [HOME[0] + 34, HOME[1] - 5];

const round = (value: number) => Math.round(value * 10) / 10;

/**
 * Smooth cubic path through `points` (Catmull-Rom converted to Beziers).
 * `before` and `after` are not drawn; they only set the direction at each end.
 */
function smoothPath(points: readonly Point[], before: Point, after: Point): string {
  const all = [before, ...points, after];
  let path = `M ${round(points[0][0])} ${round(points[0][1])}`;
  for (let i = 1; i < all.length - 2; i++) {
    const [p0, p1, p2, p3] = [all[i - 1], all[i], all[i + 1], all[i + 2]];
    path += ` C ${round(p1[0] + (p2[0] - p0[0]) / 6)} ${round(p1[1] + (p2[1] - p0[1]) / 6)},`
      + ` ${round(p2[0] - (p3[0] - p1[0]) / 6)} ${round(p2[1] - (p3[1] - p1[1]) / 6)},`
      + ` ${round(p2[0])} ${round(p2[1])}`;
  }
  return path;
}

/**
 * Circuit across a card `width` pixels wide (measured from the mark's left
 * edge). Out along the middle with two loops, back along the bottom.
 * Waypoints are [fraction of the usable width, y in pixels].
 */
const CIRCUIT: readonly Point[] = [
  [0.16, 26], [0.31, 33], [0.45, 38], [0.57, 25], [0.52, 9], [0.43, 17], [0.50, 33],
  [0.66, 42], [0.83, 35], [0.96, 20], [0.90, 7], [0.79, 14], [0.86, 31], [0.97, 44],
  [0.80, 52], [0.55, 50], [0.30, 52], [0.10, 49], [-0.03, 42],
];

export function cruisePath(width: number): string {
  // Keep the whole leaf (28px half-width) inside the card on any screen.
  const span = Math.max(150, Math.min(width, 420) - HOME[0] - 34);
  const waypoints = CIRCUIT.map(([u, y]): Point => [HOME[0] + u * span, y]);
  const points = [HOME, ...waypoints, HOME];
  return smoothPath(points, waypoints[waypoints.length - 1], waypoints[0]);
}

/**
 * One pass from HOME around `target` (the link's box, relative to the mark)
 * and back. The leaf arrives over the top-left of the link, circles it
 * clockwise and climbs away up its left side.
 */
export function landingPath(target: { left: number; top: number; width: number; height: number }): string {
  const cx = target.left + target.width / 2;
  const cy = target.top + target.height / 2;
  const rx = target.width / 2 + 16;
  const ry = Math.max(target.height / 2, 14) + 6;
  const ring = [-135, -90, -45, 0, 45, 90, 135, 180].map((degrees): Point => {
    const angle = (degrees * Math.PI) / 180;
    return [cx + rx * Math.cos(angle), cy + ry * Math.sin(angle)];
  });
  const entry = ring[0];
  const exit = ring[ring.length - 1];
  const points: Point[] = [
    HOME,
    AHEAD,
    [(AHEAD[0] + entry[0]) / 2 + 18, (AHEAD[1] + entry[1]) / 2],
    ...ring,
    [Math.min(exit[0], HOME[0]) - 2, (exit[1] + HOME[1]) / 2 + 8],
    [HOME[0] - 12, HOME[1] + 10],
    HOME,
  ];
  return smoothPath(points, [HOME[0] - 30, HOME[1] + 6], AHEAD);
}
