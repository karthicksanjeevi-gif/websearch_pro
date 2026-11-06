import type { VercelRequest, VercelResponse } from '@vercel/node';
import { checkAmazonProduct, parseAmazonUrl } from './_checker.js';

export default async function handler(req: VercelRequest, res: VercelResponse) {
  // Enable CORS for Vercel
  res.setHeader('Access-Control-Allow-Credentials', 'true');
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET,OPTIONS,PATCH,DELETE,POST,PUT');
  res.setHeader(
    'Access-Control-Allow-Headers',
    'X-CSRF-Token, X-Requested-With, Accept, Accept-Version, Content-Length, Content-MD5, Content-Type, Date, X-Api-Version'
  );

  if (req.method === 'OPTIONS') {
    res.status(200).end();
    return;
  }

  const { url, asin } = (req.body || {}) as { url?: string; asin?: string };
  const queryUrl = (req.query?.url as string) || url;
  const queryAsin = (req.query?.asin as string) || asin;

  if (!queryUrl && !queryAsin) {
    return res.status(400).json({ error: 'url or asin is required' });
  }

  const finalUrl = queryUrl || `https://www.amazon.com/dp/${queryAsin}`;
  const finalAsin = queryAsin || parseAmazonUrl(finalUrl, '').asin;

  try {
    const result = await checkAmazonProduct(finalUrl, finalAsin);
    return res.status(200).json(result);
  } catch (error: any) {
    return res.status(500).json({
      asin: finalAsin,
      url: finalUrl,
      isValid: false,
      status: 'NO',
      title: null,
      imageUrl: null,
      price: null,
      availability: null,
      statusCode: 500,
      reason: error?.message || 'Serverless verification error',
      checkedAt: new Date().toISOString(),
    });
  }
}
