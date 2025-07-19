import type { NextApiRequest, NextApiResponse } from 'next';

interface PlacesSearchResponse {
  results: any[];
  status: string;
  error_message?: string;
}

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse<PlacesSearchResponse | { error: string }>
) {
  // Only allow GET requests
  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const { query } = req.query;

  // Validate required parameters
  if (!query) {
    return res.status(400).json({ error: 'Missing required parameter: query' });
  }

  // Get API key from environment variable (more secure)
  const apiKey = process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY;
  if (!apiKey) {
    return res.status(500).json({ error: 'Google Maps API key not configured' });
  }

  try {
    // Make request to Google Maps Places API
    const encodedQuery = encodeURIComponent(query as string);
    const url = `https://maps.googleapis.com/maps/api/place/textsearch/json?query=${encodedQuery}&key=${apiKey}`;
    
    const response = await fetch(url);
    
    if (!response.ok) {
      throw new Error(`Google Maps API responded with status: ${response.status}`);
    }

    const data = await response.json();

    // Return the data from Google Maps API
    res.status(200).json(data);
  } catch (error) {
    console.error('Error fetching from Google Maps API:', error);
    res.status(500).json({ 
      error: 'Failed to fetch places data',
      results: [],
      status: 'ERROR'
    });
  }
} 