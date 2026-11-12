/**
 * Where the globe opens.
 *
 * The map used to open on 0,0 (the Gulf of Guinea). It now opens roughly over
 * the visitor, tilted so the spires (src/lib/map-spires.ts) are visible.
 *
 * "Roughly" is deliberate: the position comes from the browser's time zone,
 * which needs no permission prompt and no network call, and says nothing more
 * precise than a region. If the visitor has already granted location access,
 * GlobeView still flies to their actual position afterwards.
 */

/** Default tilt, in degrees. Spires point straight up and vanish from directly overhead. */
export const DEFAULT_PITCH = 38;

/** Approximate [longitude, latitude] for common time zones. */
const ZONES: Record<string, readonly [number, number]> = {
  "America/Los_Angeles": [-119, 36], "America/Vancouver": [-123, 49], "America/Denver": [-106, 40],
  "America/Phoenix": [-112, 33], "America/Chicago": [-92, 38], "America/Mexico_City": [-99, 20],
  "America/New_York": [-77, 40], "America/Toronto": [-79, 44], "America/Bogota": [-74, 5],
  "America/Lima": [-77, -12], "America/Santiago": [-71, -33], "America/Sao_Paulo": [-47, -22],
  "America/Argentina/Buenos_Aires": [-58, -35], "America/Halifax": [-64, 45], "America/Anchorage": [-150, 61],
  "Pacific/Honolulu": [-158, 21], "Europe/London": [-1, 53], "Europe/Dublin": [-7, 53],
  "Europe/Lisbon": [-9, 39], "Europe/Madrid": [-4, 40], "Europe/Paris": [2, 47], "Europe/Brussels": [4, 51],
  "Europe/Amsterdam": [5, 52], "Europe/Zurich": [8, 47], "Europe/Berlin": [10, 51], "Europe/Rome": [12, 43],
  "Europe/Vienna": [16, 48], "Europe/Prague": [14, 50], "Europe/Warsaw": [19, 52], "Europe/Stockholm": [17, 60],
  "Europe/Oslo": [10, 60], "Europe/Copenhagen": [12, 56], "Europe/Helsinki": [25, 61], "Europe/Athens": [23, 38],
  "Europe/Bucharest": [26, 45], "Europe/Kyiv": [31, 49], "Europe/Kiev": [31, 49], "Europe/Istanbul": [32, 39],
  "Europe/Moscow": [38, 56], "Europe/Podgorica": [19, 43], "Europe/Belgrade": [21, 44],
  "Africa/Cairo": [31, 28], "Africa/Lagos": [7, 9], "Africa/Nairobi": [37, -1], "Africa/Johannesburg": [27, -28],
  "Africa/Casablanca": [-7, 32], "Asia/Jerusalem": [35, 31], "Asia/Riyadh": [45, 24], "Asia/Qatar": [51, 25],
  "Asia/Dubai": [55, 25], "Asia/Tehran": [52, 34], "Asia/Karachi": [68, 28], "Asia/Kolkata": [78, 21],
  "Asia/Calcutta": [78, 21], "Asia/Dhaka": [90, 24], "Asia/Bangkok": [101, 15], "Asia/Jakarta": [108, -6],
  "Asia/Ho_Chi_Minh": [106, 14], "Asia/Singapore": [104, 1], "Asia/Kuala_Lumpur": [102, 4],
  "Asia/Manila": [122, 13], "Asia/Hong_Kong": [114, 22], "Asia/Shanghai": [112, 32], "Asia/Taipei": [121, 24],
  "Asia/Seoul": [127, 37], "Asia/Tokyo": [138, 36], "Australia/Perth": [117, -30], "Australia/Adelaide": [138, -33],
  "Australia/Brisbane": [150, -25], "Australia/Sydney": [149, -33], "Australia/Melbourne": [145, -37],
  "Pacific/Auckland": [174, -40],
};

/** Typical latitude of populated places per continent prefix, for zones not listed above. */
const REGION_LATITUDE: Record<string, number> = {
  Europe: 49, America: 30, Asia: 30, Africa: 5, Australia: -30, Pacific: -15, Atlantic: 35, Indian: -15,
};

/**
 * Approximate map center for a time zone and UTC offset. Unknown zones fall
 * back to the longitude implied by the offset (15 degrees per hour) and the
 * typical latitude of the zone's continent.
 */
export function centerForTimeZone(timeZone: string | undefined, offsetMinutesEastOfUtc: number): { longitude: number; latitude: number } {
  const known = timeZone ? ZONES[timeZone] : undefined;
  if (known) return { longitude: known[0], latitude: known[1] };
  const hours = Number.isFinite(offsetMinutesEastOfUtc) ? offsetMinutesEastOfUtc / 60 : 0;
  const longitude = Math.max(-180, Math.min(180, hours * 15));
  const latitude = REGION_LATITUDE[(timeZone || "").split("/")[0]] ?? 25;
  return { longitude, latitude };
}

/** Initial view for the globe. Safe on the server (returns the fallback view). */
export function initialGlobeView(): { longitude: number; latitude: number; zoom: number; pitch: number } {
  let timeZone: string | undefined;
  let offset = 0;
  try {
    timeZone = Intl.DateTimeFormat().resolvedOptions().timeZone;
    offset = -new Date().getTimezoneOffset();
  } catch {
    // Keep the fallback.
  }
  return { ...centerForTimeZone(timeZone, offset), zoom: 2.5, pitch: DEFAULT_PITCH };
}
