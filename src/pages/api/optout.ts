import type { NextApiRequest, NextApiResponse } from 'next';

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'GET') {
    return res.status(405).json({ message: 'Method not allowed' });
  }

  try {
    const { email } = req.query;

    if (!email || typeof email !== 'string') {
      return res.status(400).json({ message: 'Missing or invalid email parameter' });
    }

    const API_URL = process.env.NEXT_PUBLIC_EMAIL_API_URL;

    if (!API_URL) {
      console.error('NEXT_PUBLIC_EMAIL_API_URL is not configured');
      return res.status(500).json({ message: 'API configuration error' });
    }

    console.log('Optout API called for email:', email);
    
    // Call the external API to opt out the email
    const response = await fetch(`${API_URL}/api/v3/optout`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ email })
    });
    console.log('Response:', response);

    if (response.ok) {
      // Redirect to the optout confirmation page
      res.redirect(302, `/optout-confirmation?email=${encodeURIComponent(email)}`);
    } else {
      console.error('External API error:', response.status, response.statusText);
      // Still redirect but with an error parameter
      res.redirect(302, `/optout-confirmation?email=${encodeURIComponent(email)}&error=true`);
    }
  } catch (error) {
    console.error('Error in optout API:', error);
    // Redirect to error page
    res.redirect(302, '/optout-confirmation?error=true');
  }
}
