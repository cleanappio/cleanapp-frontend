import { NextApiRequest, NextApiResponse } from 'next';
import axios from 'axios';

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const { sw_lat, sw_lon, ne_lat, ne_lon } = req.query;
    
    // Build the areas API URL
    const areasApiUrl = process.env.NEXT_PUBLIC_AREAS_API_URL;
    if (!areasApiUrl) {
      return res.status(500).json({ error: 'Areas API URL not configured' });
    }

    let url = `${areasApiUrl}/api/v3/get_areas`;
    const params = new URLSearchParams();
    
    if (sw_lat) params.append('sw_lat', sw_lat as string);
    if (sw_lon) params.append('sw_lon', sw_lon as string);
    if (ne_lat) params.append('ne_lat', ne_lat as string);
    if (ne_lon) params.append('ne_lon', ne_lon as string);
    
    if (params.toString()) {
      url += `?${params.toString()}`;
    }

    // Forward the request to the areas API
    const response = await axios.get(url, {
      headers: {
        'Content-Type': 'application/json',
        'Accept': 'application/json'
      },
      timeout: 30000
    });

    // Return the areas API response
    res.status(200).json(response.data);
  } catch (error: any) {
    console.error('Areas API proxy error:', error);
    
    if (error.response) {
      // Forward the error response from the areas API
      res.status(error.response.status).json(error.response.data);
    } else {
      res.status(500).json({ 
        error: 'Failed to fetch areas',
        message: error.message 
      });
    }
  }
} 