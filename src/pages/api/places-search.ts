import type { NextApiRequest, NextApiResponse } from 'next';
import { coordinate, language, locationRequest, LocationError, LOCATION_ATTRIBUTION } from '../../lib/amazon-location';

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  res.setHeader('Cache-Control', 'no-store');
  if (req.method !== 'GET') { res.setHeader('Allow', 'GET'); return res.status(405).json({ error: 'Method not allowed' }); }
  const query = req.query.query, lang = language(req.query.language);
  const lat = coordinate(req.query.lat, 90), lng = coordinate(req.query.lng, 180);
  if (typeof query !== 'string' || !query.trim() || query.trim().length > 200 || !lang ||
      ((req.query.lat !== undefined || req.query.lng !== undefined) && (lat === undefined || lng === undefined))) {
    return res.status(400).json({ results: [], status: 'INVALID_REQUEST', error: 'Invalid search query, coordinates or language' });
  }
  try {
    const bias = lat !== undefined && lng !== undefined ? { BiasPosition: [lng, lat] } : { Filter: { BoundingBox: [-180, -90, 180, 90] } };
    const items = await locationRequest('search-text', { QueryText: query.trim(), Language: lang, MaxResults: 5, ...bias });
    // Preserve the existing map caller's result contract; coordinates are AWS [lng, lat].
    const results = items.filter(p => p.Position?.length === 2 && p.Position.every(Number.isFinite)).map(p => ({
      place_id: p.PlaceId, name: p.Title || p.Address?.Label, formatted_address: p.Address?.Label || p.Title,
      geometry: { location: { lat: p.Position![1], lng: p.Position![0] } },
    }));
    return res.status(200).json({ results, status: results.length ? 'OK' : 'ZERO_RESULTS', provider: 'amazon-location', attribution: LOCATION_ATTRIBUTION });
  } catch (error) {
    const status = error instanceof LocationError ? error.status : 502;
    if (status === 429) res.setHeader('Retry-After', '60');
    return res.status(status).json({ results: [], status: status === 429 ? 'OVER_QUERY_LIMIT' : 'ERROR', error: 'Place search is temporarily unavailable' });
  }
}
