import type { VercelRequest, VercelResponse } from '@vercel/node';
import { checkAmazonProduct, CheckResult } from './_checker.js';

export default async function handler(req: VercelRequest, res: VercelResponse) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST,OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') {
    res.status(200).end();
    return;
  }

  const { items, concurrency = 2, delayMs = 300 } = (req.body || {}) as {
    items?: Array<{ url: string; asin: string }>;
    concurrency?: number;
    delayMs?: number;
  };

  if (!Array.isArray(items)) {
    return res.status(400).json({ error: 'items array is required' });
  }

  const results: CheckResult[] = [];
  const limit = Math.max(1, Math.min(concurrency, 3));

  for (let i = 0; i < items.length; i += limit) {
    const chunk = items.slice(i, i + limit);
    const chunkResults = await Promise.all(
      chunk.map((item) => checkAmazonProduct(item.url, item.asin))
    );
    results.push(...chunkResults);

    if (i + limit < items.length && delayMs > 0) {
      await new Promise((resolve) => setTimeout(resolve, delayMs));
    }
  }

  return res.status(200).json({ results });
}
