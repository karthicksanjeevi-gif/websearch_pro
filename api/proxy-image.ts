import type { VercelRequest, VercelResponse } from '@vercel/node';

export default async function handler(req: VercelRequest, res: VercelResponse) {
  res.setHeader('Access-Control-Allow-Origin', '*');

  const imageUrl = req.query.url as string;
  if (!imageUrl) {
    return res.status(400).send('Image URL missing');
  }

  try {
    const parsed = new URL(imageUrl);
    if (!['http:', 'https:'].includes(parsed.protocol)) {
      return res.status(400).send('Invalid protocol');
    }

    const imgResponse = await fetch(imageUrl, {
      headers: {
        'User-Agent':
          'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/132.0.0.0 Safari/537.36',
        Referer: 'https://www.amazon.com/',
        Accept: 'image/avif,image/webp,image/apng,image/*,*/*;q=0.8',
      },
      signal: AbortSignal.timeout(7000),
    });

    if (!imgResponse.ok) {
      return res.status(imgResponse.status).send('Failed to fetch image');
    }

    const contentType = imgResponse.headers.get('content-type') || 'image/jpeg';
    res.setHeader('Content-Type', contentType);
    res.setHeader('Cache-Control', 'public, max-age=86400');

    const arrayBuffer = await imgResponse.arrayBuffer();
    return res.status(200).send(Buffer.from(arrayBuffer));
  } catch (error: any) {
    return res.status(500).send(error?.message || 'Proxy error');
  }
}
