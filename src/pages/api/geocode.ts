import type { NextApiRequest, NextApiResponse } from 'next';
import { coordinate, language, locationRequest, LocationError, LOCATION_ATTRIBUTION } from '../../lib/amazon-location';

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  res.setHeader('Cache-Control', 'no-store');
  if (req.method !== 'GET') { res.setHeader('Allow', 'GET'); return res.status(405).json({ success: false, error: 'Method not allowed' }); }
  const lat = coordinate(req.query.lat, 90), lng = coordinate(req.query.lng, 180), lang = language(req.query.language);
  if (lat === undefined || lng === undefined || !lang) return res.status(400).json({ success: false, error: 'Invalid coordinates or language' });
  try {
    const items = await locationRequest('reverse-geocode', { QueryPosition: [lng, lat], Language: lang, MaxResults: 1 });
    const address = items[0]?.Address?.Label;
    if (!address) return res.status(404).json({ success: false, error: 'No address found for these coordinates' });
    return res.status(200).json({ success: true, address, provider: 'amazon-location', attribution: LOCATION_ATTRIBUTION });
  } catch (error) {
    const status = error instanceof LocationError ? error.status : 502;
    if (status === 429) res.setHeader('Retry-After', '60');
    return res.status(status).json({ success: false, error: error instanceof LocationError ? error.message : 'Address lookup is temporarily unavailable' });
  }
}
