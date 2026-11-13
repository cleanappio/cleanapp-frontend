/**
 * The globe's idle spin: a slow, steady turn about the Earth's axis.
 *
 * West to east, like the real thing, so the surface drifts left to right
 * across the screen (the view's center longitude decreases). Only the
 * longitude changes; latitude, zoom and bearing are left alone.
 *
 * The spin yields to everything else:
 * - any touch, drag, scroll or key press stops it at once, and it resumes
 *   RESUME_AFTER_MS after the map was last moved by someone else;
 * - it never starts while the map is already moving (the app flying to a
 *   report or to the visitor's location), so it cannot cancel that movement;
 * - it does not run when the caller says it is paused (something is selected,
 *   the visitor is drawing), when zoomed in past MAX_SPIN_ZOOM, or when the
 *   visitor has asked their device for reduced motion.
 *
 * Implementation: one long linear `easeTo` per segment, chained on `moveend`.
 * A per-frame `setCenter` would fire the map's move events sixty times a
 * second and re-render the page each time; long segments fire them once a
 * minute.
 */

/** Degrees of longitude per second: one full turn in about six minutes. */
export const SPIN_DEGREES_PER_SECOND = 1;
const SEGMENT_SECONDS = 60;
export const RESUME_AFTER_MS = 5000;
/** Above this zoom the visitor is looking at a place, not at the globe. */
export const MAX_SPIN_ZOOM = 3.5;

type SpinMap = {
  getCenter(): { lng: number; lat: number };
  getZoom(): number;
  isMoving(): boolean;
  easeTo(options: Record<string, unknown>): unknown;
  stop(): unknown;
  on(type: string, listener: () => void): unknown;
  off(type: string, listener: () => void): unknown;
  getCanvasContainer(): HTMLElement;
};

/**
 * Start spinning `map`. `isPaused` is asked before every segment. Returns a
 * function that stops the spin and removes every listener.
 */
export function startGlobeSpin(map: SpinMap, isPaused: () => boolean): () => void {
  if (typeof window === "undefined") return () => {};
  if (window.matchMedia?.("(prefers-reduced-motion: reduce)").matches) return () => {};

  let stopped = false;
  let segmentEndsAt = 0; // 0 means no segment of ours is running
  let timer: ReturnType<typeof setTimeout> | undefined;

  const schedule = (delay: number) => {
    if (timer !== undefined) clearTimeout(timer);
    timer = setTimeout(spin, delay);
  };

  function spin() {
    timer = undefined;
    if (stopped) return;
    // Someone else is moving the map: wait for their `moveend`.
    if (map.isMoving()) return;
    if (isPaused() || map.getZoom() > MAX_SPIN_ZOOM || document.hidden) {
      schedule(RESUME_AFTER_MS);
      return;
    }
    const center = map.getCenter();
    segmentEndsAt = Date.now() + SEGMENT_SECONDS * 1000;
    map.easeTo({
      center: [center.lng - SPIN_DEGREES_PER_SECOND * SEGMENT_SECONDS, center.lat],
      duration: SEGMENT_SECONDS * 1000,
      easing: (t: number) => t,
    });
  }

  const onMoveEnd = () => {
    if (stopped) return;
    const ownSegmentFinished = segmentEndsAt > 0 && Date.now() >= segmentEndsAt - 250;
    segmentEndsAt = 0;
    // Our own segment ran to its end: carry straight on. Anything else (the
    // visitor, or the app flying somewhere) gets a quiet pause first.
    schedule(ownSegmentFinished ? 0 : RESUME_AFTER_MS);
  };

  // A press or scroll that does not move the map (holding still, a click on
  // a dot) fires no `moveend`, so stop and re-arm here as well.
  const onInteract = () => {
    if (stopped) return;
    if (segmentEndsAt > 0) {
      segmentEndsAt = 0;
      map.stop();
    }
    schedule(RESUME_AFTER_MS);
  };

  const container = map.getCanvasContainer();
  const interactions = ["mousedown", "touchstart", "wheel", "keydown"] as const;
  interactions.forEach((type) => container.addEventListener(type, onInteract, { passive: true }));
  map.on("moveend", onMoveEnd);
  schedule(RESUME_AFTER_MS / 2);

  return () => {
    stopped = true;
    if (timer !== undefined) clearTimeout(timer);
    interactions.forEach((type) => container.removeEventListener(type, onInteract));
    map.off("moveend", onMoveEnd);
    if (segmentEndsAt > 0) map.stop();
  };
}
