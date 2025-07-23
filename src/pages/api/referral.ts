import type { NextApiRequest, NextApiResponse } from 'next';

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'POST') {
    return res.status(405).json({ message: 'Method not allowed' });
  }

  try {
    const { refkey, refvalue } = req.body;

    if (!refkey || !refvalue) {
      return res.status(400).json({ message: 'Missing required fields: refkey, refvalue' });
    }

    const REF_API_URL = process.env.NEXT_PUBLIC_REF_API_URL || 'http://dev.api.cleanapp.io:8080/write_referral';

    console.log('Referral API called', JSON.stringify(req.body));
    const response = await fetch(REF_API_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(req.body)
    });

    if (response.ok) {
      return res.status(200);
    } else {
      console.error('External API error:', response.status, response.statusText);
      return res.status(response.status).json({ 
        message: 'Failed to send referral data to external API',
        status: response.status,
        statusText: response.statusText
      });
    }
  } catch (error) {
    console.error('Error in referral API:', error);
    return res.status(500).json({ message: 'Internal server error' });
  }
} 