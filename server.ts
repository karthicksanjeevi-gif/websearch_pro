import express from 'express';
import path from 'path';
import { fileURLToPath } from 'url';
import { checkAmazonProduct, parseAmazonUrl, CheckResult } from './api/_checker.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const PORT = process.env.PORT ? parseInt(process.env.PORT, 10) : 3000;

app.use(express.json({ limit: '10mb' }));

// API Routes
app.post('/api/check-asin', async (req, res) => {
  const { url, asin } = req.body;
  if (!url && !asin) {
    return res.status(400).json({ error: 'url or asin is required' });
  }

  const finalUrl = url || `https://www.amazon.com/dp/${asin}`;
  const finalAsin = asin || parseAmazonUrl(finalUrl, '').asin;

  const result = await checkAmazonProduct(finalUrl, finalAsin);
  return res.json(result);
});

app.post('/api/check-batch', async (req, res) => {
  const { items, concurrency = 2, delayMs = 400 } = req.body;
  if (!Array.isArray(items)) {
    return res.status(400).json({ error: 'items array is required' });
  }

  const results: CheckResult[] = [];
  const limit = Math.max(1, Math.min(concurrency, 4));

  for (let i = 0; i < items.length; i += limit) {
    const chunk = items.slice(i, i + limit);
    const chunkResults = await Promise.all(
      chunk.map((item: { url: string; asin: string }) => checkAmazonProduct(item.url, item.asin))
    );
    results.push(...chunkResults);

    if (i + limit < items.length && delayMs > 0) {
      await new Promise(resolve => setTimeout(resolve, delayMs));
    }
  }

  return res.json({ results });
});

app.get('/api/proxy-image', async (req, res) => {
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
    return res.send(Buffer.from(arrayBuffer));
  } catch (error: any) {
    return res.status(500).send(error?.message || 'Proxy error');
  }
});

// Vite / static file serving
async function startServer() {
  const isProd = process.env.NODE_ENV === 'production';

  if (!isProd) {
    const { createServer: createViteServer } = await import('vite');
    const vite = await createViteServer({
      server: {
        middlewareMode: true,
        hmr: process.env.DISABLE_HMR !== 'true',
        watch: process.env.DISABLE_HMR === 'true' ? null : {},
      },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  } else {
    app.use(express.static(path.resolve(__dirname, 'dist')));
    app.get('*', (_req, res) => {
      res.sendFile(path.resolve(__dirname, 'dist', 'index.html'));
    });
  }

  app.listen(PORT, '0.0.0.0', () => {
    console.log(`[Amazon ASIN Bulk Checker] Server active on http://0.0.0.0:${PORT}`);
  });
}

startServer();
