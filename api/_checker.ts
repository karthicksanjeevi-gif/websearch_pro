import * as cheerio from 'cheerio';

export interface CheckResult {
  asin: string;
  url: string;
  isValid: boolean;
  status: 'VALID' | 'NO';
  title: string | null;
  imageUrl: string | null;
  price: string | null;
  availability: string | null;
  statusCode: number;
  reason: string;
  checkedAt: string;
}

const USER_AGENTS = [
  'Mozilla/5.0 (iPhone; CPU iPhone OS 17_4 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.4 Mobile/15E148 Safari/604.1',
  'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/132.0.0.0 Safari/537.36',
  'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/131.0.0.0 Safari/537.36',
  'Mozilla/5.0 (Windows NT 10.0; Win64; x64; rv:134.0) Gecko/20100101 Firefox/134.0',
];

export function parseAmazonUrl(inputUrl: string, fallbackAsin: string): { domain: string; asin: string } {
  let cleanAsin = (fallbackAsin || '').trim().toUpperCase();
  let domain = 'www.amazon.com';

  try {
    const parsed = new URL(inputUrl);
    domain = parsed.hostname;

    const match = parsed.pathname.match(/\/(?:dp|gp\/product|gp\/aw\/d)\/([A-Za-z0-9]{10})/i);
    if (match && match[1]) {
      cleanAsin = match[1].toUpperCase();
    }
  } catch {
    // ignore
  }

  return { domain, asin: cleanAsin };
}

export async function checkAmazonProduct(url: string, rawAsin: string): Promise<CheckResult> {
  const { domain, asin } = parseAmazonUrl(url, rawAsin);
  const targetUrl = url.trim();

  const result: CheckResult = {
    asin,
    url: targetUrl,
    isValid: false,
    status: 'NO',
    title: null,
    imageUrl: null,
    price: null,
    availability: null,
    statusCode: 0,
    reason: 'Checking...',
    checkedAt: new Date().toISOString(),
  };

  if (!asin || asin.length < 5) {
    result.isValid = false;
    result.status = 'NO';
    result.reason = 'Invalid ASIN format';
    result.statusCode = 400;
    return result;
  }

  // Strategy 1: Mobile gateway endpoint (Most resilient against bot blocks)
  const mobileAwUrl = `https://${domain}/gp/aw/d/${asin}`;

  try {
    const mobileRes = await fetch(mobileAwUrl, {
      headers: {
        'User-Agent':
          'Mozilla/5.0 (iPhone; CPU iPhone OS 17_4 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.4 Mobile/15E148 Safari/604.1',
        Accept: 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
        'Accept-Language': 'en-US,en;q=0.9',
        'Cache-Control': 'no-cache',
      },
      redirect: 'follow',
      signal: AbortSignal.timeout(9000),
    });

    result.statusCode = mobileRes.status;

    if (mobileRes.status === 404) {
      result.isValid = false;
      result.status = 'NO';
      result.reason = 'HTTP 404 - Product not found';
      return result;
    }

    const html = await mobileRes.text();
    const $ = cheerio.load(html);

    const isDogPage =
      html.includes('Page Not Found') ||
      html.includes("Looking for something? We're sorry") ||
      html.includes('the web address you entered is not a functioning page') ||
      html.includes("sorry! we couldn't find that page");

    if (isDogPage) {
      result.isValid = false;
      result.status = 'NO';
      result.reason = 'Page Not Found (Amazon Dog 404 page)';
      return result;
    }

    let title = $('#title').text().trim() ||
      $('#productTitle').text().trim() ||
      $('h1#title').text().trim() ||
      $('title').text().trim();

    if (title) {
      title = title.replace(/^Amazon\.[a-z.]+\s*:\s*/i, '').trim().replace(/\s+/g, ' ');
    }

    let imageUrl: string | null = null;
    $('img').each((_, el) => {
      if (imageUrl) return;
      const src = $(el).attr('src') || $(el).attr('data-old-hires') || $(el).attr('data-a-dynamic-image');
      if (
        src &&
        src.includes('media-amazon.com/images/I/') &&
        !src.includes('transparent-pixel') &&
        !src.includes('00/0000000000')
      ) {
        imageUrl = src;
      }
    });

    if (!imageUrl) {
      const ogImg = $('meta[property="og:image"]').attr('content');
      if (ogImg && ogImg.includes('media-amazon.com') && !ogImg.includes('transparent-pixel')) {
        imageUrl = ogImg;
      }
    }

    const price = $('.a-price .a-offscreen').first().text().trim() ||
      $('#priceblock_ourprice').text().trim() ||
      $('.priceToPay .a-offscreen').text().trim() ||
      null;

    const availability = $('#availability').text().trim().replace(/\s+/g, ' ') || null;

    const hasValidTitle =
      !!title &&
      title !== 'Amazon.com' &&
      !title.toLowerCase().includes('page not found') &&
      !title.toLowerCase().includes('robot check');

    if (hasValidTitle && imageUrl) {
      result.isValid = true;
      result.status = 'VALID';
      result.title = title;
      result.imageUrl = imageUrl;
      result.price = price;
      result.availability = availability;
      result.reason = 'Valid product with active image';
      return result;
    }

    if (hasValidTitle) {
      result.isValid = true;
      result.status = 'VALID';
      result.title = title;
      result.imageUrl = `https://images-na.ssl-images-amazon.com/images/P/${asin}.01._SCLZZZZZZZ_SX500_.jpg`;
      result.price = price;
      result.availability = availability;
      result.reason = 'Valid product listing';
      return result;
    }
  } catch {
    // Continue to strategy 2
  }

  // Strategy 2: Direct desktop URL check
  try {
    const desktopRes = await fetch(targetUrl, {
      headers: {
        'User-Agent':
          'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/132.0.0.0 Safari/537.36',
        Accept: 'text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,*/*;q=0.8',
        'Accept-Language': 'en-US,en;q=0.9',
        'Cache-Control': 'no-cache',
      },
      redirect: 'follow',
      signal: AbortSignal.timeout(8000),
    });

    result.statusCode = desktopRes.status;

    if (desktopRes.status === 404) {
      result.isValid = false;
      result.status = 'NO';
      result.reason = 'HTTP 404 - Product not found';
      return result;
    }

    const html = await desktopRes.text();
    const $ = cheerio.load(html);

    const isDogPage =
      html.includes('Page Not Found') ||
      html.includes("Looking for something? We're sorry") ||
      $('title').text().includes('Page Not Found');

    if (isDogPage) {
      result.isValid = false;
      result.status = 'NO';
      result.reason = 'Page Not Found (Amazon Dog 404 page)';
      return result;
    }

    let title = $('#productTitle').text().trim() ||
      $('#title').text().trim() ||
      $('h1#title').text().trim() ||
      $('title').text().trim();

    if (title) {
      title = title.replace(/^Amazon\.[a-z.]+\s*:\s*/i, '').trim().replace(/\s+/g, ' ');
    }

    let imageUrl: string | null = null;
    const landingImg = $('#landingImage');
    if (landingImg.length) {
      imageUrl = landingImg.attr('data-old-hires') || landingImg.attr('src') || null;
    }

    if (!imageUrl) {
      imageUrl = $('meta[property="og:image"]').attr('content') || null;
    }

    if (title && !title.toLowerCase().includes('page not found') && !title.toLowerCase().includes('robot check')) {
      result.isValid = true;
      result.status = 'VALID';
      result.title = title;
      result.imageUrl = imageUrl;
      result.reason = imageUrl ? 'Valid product with image' : 'Valid product';
      return result;
    }
  } catch {
    // Continue to strategy 3
  }

  // Strategy 3: Media CDN probe
  try {
    const cdnUrl = `https://images-na.ssl-images-amazon.com/images/P/${asin}.01._SCLZZZZZZZ_SX500_.jpg`;
    const cdnRes = await fetch(cdnUrl, { signal: AbortSignal.timeout(4000) });
    if (cdnRes.ok) {
      const buf = await cdnRes.arrayBuffer();
      if (buf.byteLength > 1000) {
        result.isValid = true;
        result.status = 'VALID';
        result.title = `Amazon Product (${asin})`;
        result.imageUrl = cdnUrl;
        result.reason = 'Verified active ASIN via Amazon Media CDN';
        result.statusCode = 200;
        return result;
      }
    }
  } catch {
    // ignore
  }

  // Strategy 4: Amazon AdSystem Image Probe
  try {
    const adUrl = `https://ws-na.amazon-adsystem.com/widgets/q?_encoding=UTF8&Format=_SL400_&ASIN=${asin}&MarketPlace=US&ID=AsinImage`;
    const adRes = await fetch(adUrl, { signal: AbortSignal.timeout(4000) });
    if (adRes.ok) {
      const buf = await adRes.arrayBuffer();
      if (buf.byteLength > 1000) {
        result.isValid = true;
        result.status = 'VALID';
        result.title = `Amazon Product (${asin})`;
        result.imageUrl = adUrl;
        result.reason = 'Verified active ASIN via Amazon AdSystem CDN';
        result.statusCode = 200;
        return result;
      }
    }
  } catch {
    // ignore
  }

  // If no strategy matched
  result.isValid = false;
  result.status = 'NO';
  result.reason = 'Product not found / Inactive ASIN';
  return result;
}
