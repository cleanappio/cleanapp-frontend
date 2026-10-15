/**
 * Legacy reports use (0, 0) for an unknown location. Keep those reports in
 * feeds, but never turn the sentinel or malformed data into a physical pin.
 * A zero on just one axis is a valid equator/prime-meridian location.
 */
export function reportMapCoordinates(latitude: unknown, longitude: unknown): [number, number] | null {
  if (
    typeof latitude !== "number" || typeof longitude !== "number" ||
    !Number.isFinite(latitude) || !Number.isFinite(longitude) ||
    latitude < -90 || latitude > 90 || longitude < -180 || longitude > 180 ||
    (latitude === 0 && longitude === 0)
  ) return null;
  return [longitude, latitude];
}
