// Server-only adapter. Never import this module into a browser component.
export const LOCATION_ATTRIBUTION = 'https://docs.aws.amazon.com/location/latest/developerguide/data-attribution.html';
export class LocationError extends Error {
  constructor(public status: number, message: string) { super(message); }
}
interface Place {
  PlaceId?: string;
  Title?: string;
  Address?: { Label?: string };
  Position?: number[];
}
let minuteStart = 0, minuteCount = 0, hourStart = 0, hourCount = 0;
export async function locationRequest(operation: 'reverse-geocode' | 'search-text', body: Record<string, unknown>): Promise<Place[]> {
  const key = process.env.AMAZON_LOCATION_API_KEY;
  if (!key) throw new LocationError(503, 'Address lookup is temporarily unavailable');
  // Bound spend independently of caller-controlled headers; limits are per server process.
  const now = Date.now();
  if (now - minuteStart >= 60000) { minuteStart = now; minuteCount = 0; }
  if (now - hourStart >= 3600000) { hourStart = now; hourCount = 0; }
  if (minuteCount >= 120 || hourCount >= 1000) throw new LocationError(429, 'Address lookup is busy. Please try again later');
  minuteCount++; hourCount++;
  try {
    const response = await fetch(`https://places.geo.us-east-2.amazonaws.com/v2/${operation}?key=${encodeURIComponent(key)}`, {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ ...body, IntendedUse: 'SingleUse' }),
      signal: AbortSignal.timeout(8000), cache: 'no-store',
    });
    if (!response.ok) throw new LocationError(response.status === 429 ? 429 : 502, 'Address lookup is temporarily unavailable');
    const data = await response.json();
    if (!Array.isArray(data.ResultItems)) throw new LocationError(502, 'Invalid address lookup response');
    return data.ResultItems;
  } catch (error) {
    if (error instanceof LocationError) throw error;
    // Fetch errors can contain the authenticated URL. Never log or return them.
    throw new LocationError(502, 'Address lookup is temporarily unavailable');
  }
}
export function coordinate(value: unknown, max: number): number | undefined {
  if (typeof value !== 'string' || !value.trim()) return undefined;
  const number = Number(value);
  return Number.isFinite(number) && Math.abs(number) <= max ? number : undefined;
}
export function language(value: unknown): string | undefined {
  if (value === undefined) return 'en';
  return typeof value === 'string' && value.length <= 35 && /^[a-zA-Z]{2,8}(?:-[a-zA-Z0-9]{1,8})*$/.test(value) ? value : undefined;
}
