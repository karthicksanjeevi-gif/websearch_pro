/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { useState, useEffect, useRef, useCallback } from 'react';
import { Navbar } from './components/Navbar';
import { ConfigPanel } from './components/ConfigPanel';
import { StatsCards } from './components/StatsCards';
import { ResultsDashboard } from './components/ResultsDashboard';
import { ImageModal } from './components/ImageModal';
import { AsinItem, CheckStats } from './types';

const INITIAL_SAMPLE_ASINS = [
  'B0B4WK6143',
  'B0FPF5S7J8',
  'B0FJFPZ7LF',
  'B0FGQBBTQZ',
  'B0FHKN2QNN',
  'B0FMNB1S66',
  'B0FHBMTLPW',
  'B0FJ62F8KC',
  'B0FPXMVQRZ',
  'B09FXFP23T'
].join('\n');

export default function App() {
  const [baseUrl, setBaseUrl] = useState('https://www.amazon.com/dp/');
  const [rawAsinsText, setRawAsinsText] = useState(INITIAL_SAMPLE_ASINS);
  const [items, setItems] = useState<AsinItem[]>([]);
  const [isChecking, setIsChecking] = useState(false);
  const [isPaused, setIsPaused] = useState(false);
  const [delayMs, setDelayMs] = useState(400);
  const [concurrency, setConcurrency] = useState(2);
  const [activeImageModalItem, setActiveImageModalItem] = useState<AsinItem | null>(null);

  // Control refs for aborting and pausing queue
  const abortControllerRef = useRef<boolean>(false);
  const isPausedRef = useRef<boolean>(false);

  // Sync ref with state
  useEffect(() => {
    isPausedRef.current = isPaused;
  }, [isPaused]);

  // Generate / Synchronize items list whenever baseUrl or rawAsinsText changes
  useEffect(() => {
    if (isChecking) return; // don't disrupt in-flight checks

    const lines = rawAsinsText
      .split('\n')
      .map((line) => line.trim())
      .filter((line) => line.length > 0);

    const cleanBase = baseUrl.trim().endsWith('/') ? baseUrl.trim() : `${baseUrl.trim()}/`;

    setItems((prevItems) => {
      const prevMap = new Map<string, AsinItem>();
      prevItems.forEach((item) => prevMap.set(item.asin, item));

      return lines.map((asin) => {
        const cleanAsin = asin.toUpperCase();
        const generatedUrl = `${cleanBase}${cleanAsin}`;
        const existing = prevMap.get(cleanAsin);

        if (existing) {
          // If URL prefix changed, update generated URL while preserving checked status if applicable
          return {
            ...existing,
            url: generatedUrl,
          };
        }

        return {
          id: `item-${cleanAsin}-${Math.random().toString(36).substring(2, 7)}`,
          asin: cleanAsin,
          url: generatedUrl,
          status: 'pending',
          title: null,
          imageUrl: null,
          price: null,
          availability: null,
          statusCode: 0,
          reason: 'Waiting to be checked',
          checkedAt: null,
        };
      });
    });
  }, [baseUrl, rawAsinsText, isChecking]);

  // Client-side browser direct image probe fallback (immune to serverless / datacenter IP blocks)
  const probeAmazonImageInBrowser = (asin: string): Promise<{ valid: boolean; imageUrl: string | null }> => {
    return new Promise((resolve) => {
      const urls = [
        `https://images-na.ssl-images-amazon.com/images/P/${asin}.01._SCLZZZZZZZ_SX500_.jpg`,
        `https://ws-na.amazon-adsystem.com/widgets/q?_encoding=UTF8&Format=_SL400_&ASIN=${asin}&MarketPlace=US&ID=AsinImage`
      ];

      let tried = 0;
      let found = false;

      urls.forEach((url) => {
        const img = new Image();
        const timer = setTimeout(() => {
          if (!found) {
            tried++;
            if (tried === urls.length) resolve({ valid: false, imageUrl: null });
          }
        }, 4000);

        img.onload = () => {
          clearTimeout(timer);
          if (!found && img.naturalWidth > 15 && img.naturalHeight > 15) {
            found = true;
            resolve({ valid: true, imageUrl: url });
          } else {
            tried++;
            if (tried === urls.length && !found) resolve({ valid: false, imageUrl: null });
          }
        };

        img.onerror = () => {
          clearTimeout(timer);
          tried++;
          if (tried === urls.length && !found) resolve({ valid: false, imageUrl: null });
        };

        img.src = url;
      });
    });
  };

  // Check a single ASIN against backend API with client fallback
  const checkSingleItem = async (item: AsinItem): Promise<Partial<AsinItem>> => {
    try {
      const response = await fetch('/api/check-asin', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ url: item.url, asin: item.asin }),
      });

      if (response.ok) {
        const data = await response.json();
        if (data.isValid) {
          return {
            status: 'valid',
            title: data.title,
            imageUrl: data.imageUrl,
            price: data.price,
            availability: data.availability,
            statusCode: data.statusCode || 200,
            reason: data.reason || 'Product verified',
            checkedAt: data.checkedAt || new Date().toISOString(),
          };
        }

        // If server marked not valid, run browser probe to confirm
        const browserCheck = await probeAmazonImageInBrowser(item.asin);
        if (browserCheck.valid && browserCheck.imageUrl) {
          return {
            status: 'valid',
            title: data.title || `Amazon Product (${item.asin})`,
            imageUrl: browserCheck.imageUrl,
            price: data.price,
            availability: data.availability,
            statusCode: 200,
            reason: 'Verified active listing via Amazon Media CDN',
            checkedAt: new Date().toISOString(),
          };
        }

        return {
          status: 'no',
          title: null,
          imageUrl: null,
          price: null,
          availability: null,
          statusCode: data.statusCode || 404,
          reason: data.reason || 'Product not found',
          checkedAt: data.checkedAt || new Date().toISOString(),
        };
      }

      // If server returned non-200 (e.g. 404 or 500 on Vercel), fallback to browser probe
      const fallback = await probeAmazonImageInBrowser(item.asin);
      if (fallback.valid && fallback.imageUrl) {
        return {
          status: 'valid',
          title: `Amazon Product (${item.asin})`,
          imageUrl: fallback.imageUrl,
          price: null,
          availability: 'Active product',
          statusCode: 200,
          reason: 'Verified active listing via Amazon CDN (Client fallback)',
          checkedAt: new Date().toISOString(),
        };
      }

      return {
        status: 'no',
        statusCode: response.status,
        reason: `Product not found (Status ${response.status})`,
        checkedAt: new Date().toISOString(),
      };
    } catch {
      // If network fetch threw error (e.g. offline / CORS / static hosting), test via browser
      const fallback = await probeAmazonImageInBrowser(item.asin);
      if (fallback.valid && fallback.imageUrl) {
        return {
          status: 'valid',
          title: `Amazon Product (${item.asin})`,
          imageUrl: fallback.imageUrl,
          price: null,
          availability: 'Active product',
          statusCode: 200,
          reason: 'Verified active listing via Amazon CDN (Client fallback)',
          checkedAt: new Date().toISOString(),
        };
      }

      return {
        status: 'no',
        statusCode: 500,
        reason: 'Product not found / Inactive ASIN',
        checkedAt: new Date().toISOString(),
      };
    }
  };

  // Run the batch execution queue
  const runQueue = useCallback(
    async (targetItems: AsinItem[]) => {
      if (targetItems.length === 0) return;

      setIsChecking(true);
      setIsPaused(false);
      abortControllerRef.current = false;

      // Queue of indices to process
      const queue = [...targetItems];
      let activeCount = 0;

      const processNext = async (): Promise<void> => {
        if (abortControllerRef.current) return;

        // Handle pause
        while (isPausedRef.current && !abortControllerRef.current) {
          await new Promise((resolve) => setTimeout(resolve, 250));
        }

        if (abortControllerRef.current || queue.length === 0) return;

        const currentItem = queue.shift();
        if (!currentItem) return;

        // Mark as checking
        setItems((prev) =>
          prev.map((it) => (it.id === currentItem.id ? { ...it, status: 'checking', reason: 'Checking URL...' } : it))
        );

        activeCount++;

        try {
          const update = await checkSingleItem(currentItem);
          setItems((prev) =>
            prev.map((it) => (it.id === currentItem.id ? { ...it, ...update } : it))
          );
        } catch {
          setItems((prev) =>
            prev.map((it) =>
              it.id === currentItem.id
                ? { ...it, status: 'no', reason: 'Request failed', checkedAt: new Date().toISOString() }
                : it
            )
          );
        } finally {
          activeCount--;
          if (delayMs > 0 && !abortControllerRef.current) {
            await new Promise((resolve) => setTimeout(resolve, delayMs));
          }
        }

        if (queue.length > 0 && !abortControllerRef.current) {
          await processNext();
        }
      };

      // Launch workers up to concurrency
      const workers: Promise<void>[] = [];
      const numWorkers = Math.min(concurrency, queue.length);

      for (let w = 0; w < numWorkers; w++) {
        workers.push(processNext());
      }

      await Promise.all(workers);
      setIsChecking(false);
      setIsPaused(false);
    },
    [concurrency, delayMs]
  );

  // Start checking all items
  const handleGenerateAndCheck = () => {
    // Reset any items that are not already in progress
    setItems((prev) =>
      prev.map((it) => ({
        ...it,
        status: 'pending',
        reason: 'Waiting in queue',
      }))
    );
    runQueue(items);
  };

  // Re-check all
  const handleRecheckAll = () => {
    setItems((prev) =>
      prev.map((it) => ({
        ...it,
        status: 'pending',
        reason: 'Waiting in queue',
      }))
    );
    runQueue(items);
  };

  // Retry only items marked as "NO" or error
  const handleRecheckNoOnly = () => {
    const noItems = items.filter((it) => it.status === 'no' || it.status === 'error');
    if (noItems.length === 0) return;

    setItems((prev) =>
      prev.map((it) =>
        it.status === 'no' || it.status === 'error'
          ? { ...it, status: 'pending', reason: 'Retrying verification' }
          : it
      )
    );
    runQueue(noItems);
  };

  // Recheck a single item
  const handleRecheckSingle = async (id: string) => {
    const target = items.find((it) => it.id === id);
    if (!target) return;

    setItems((prev) =>
      prev.map((it) => (it.id === id ? { ...it, status: 'checking', reason: 'Re-verifying URL...' } : it))
    );

    const update = await checkSingleItem(target);
    setItems((prev) =>
      prev.map((it) => (it.id === id ? { ...it, ...update } : it))
    );
  };

  // Delete an item
  const handleDeleteItem = (id: string) => {
    setItems((prev) => {
      const remaining = prev.filter((it) => it.id !== id);
      setRawAsinsText(remaining.map((it) => it.asin).join('\n'));
      return remaining;
    });
  };

  // Pause / Resume
  const handlePauseResume = () => {
    setIsPaused((prev) => !prev);
  };

  // Stop / Cancel
  const handleStop = () => {
    abortControllerRef.current = true;
    setIsChecking(false);
    setIsPaused(false);
    setItems((prev) =>
      prev.map((it) => (it.status === 'checking' ? { ...it, status: 'pending', reason: 'Stopped by user' } : it))
    );
  };

  // Clear Session
  const handleReset = () => {
    if (window.confirm('Clear all ASINs and reset session?')) {
      handleStop();
      setRawAsinsText('');
      setItems([]);
    }
  };

  // Compute stats
  const stats: CheckStats = {
    total: items.length,
    valid: items.filter((it) => it.status === 'valid').length,
    no: items.filter((it) => it.status === 'no').length,
    pending: items.filter((it) => it.status === 'pending').length,
    checking: items.filter((it) => it.status === 'checking').length,
  };

  const processedCount = stats.valid + stats.no;
  const progressPercent = stats.total > 0 ? Math.round((processedCount / stats.total) * 100) : 0;

  return (
    <div className="min-h-screen bg-slate-100 flex flex-col selection:bg-amber-500 selection:text-white">
      {/* Top Navbar */}
      <Navbar onReset={handleReset} hasItems={items.length > 0} />

      {/* Main Container */}
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6 flex-1 w-full space-y-6">
        {/* Metric Cards & Real-Time Progress Bar */}
        <StatsCards 
          stats={stats} 
          isChecking={isChecking} 
          progressPercent={progressPercent} 
        />

        {/* 2-Column Responsive Layout */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
          {/* Left / Config Panel (5 cols on lg) */}
          <div className="lg:col-span-5 space-y-6">
            <ConfigPanel
              baseUrl={baseUrl}
              onBaseUrlChange={setBaseUrl}
              rawAsinsText={rawAsinsText}
              onRawAsinsChange={setRawAsinsText}
              onGenerateAndCheck={handleGenerateAndCheck}
              onPauseResume={handlePauseResume}
              onStop={handleStop}
              onRecheckAll={handleRecheckAll}
              onRecheckNoOnly={handleRecheckNoOnly}
              isChecking={isChecking}
              isPaused={isPaused}
              totalAsins={items.length}
              delayMs={delayMs}
              onDelayChange={setDelayMs}
              concurrency={concurrency}
              onConcurrencyChange={setConcurrency}
            />
          </div>

          {/* Right / Results Dashboard (7 cols on lg) */}
          <div className="lg:col-span-7">
            <ResultsDashboard
              items={items}
              onRecheckSingle={handleRecheckSingle}
              onDeleteItem={handleDeleteItem}
              onOpenImageModal={setActiveImageModalItem}
              isChecking={isChecking}
            />
          </div>
        </div>
      </main>

      {/* Lightbox / High-Res Image Preview Modal */}
      <ImageModal
        item={activeImageModalItem}
        onClose={() => setActiveImageModalItem(null)}
      />

      {/* Footer */}
      <footer className="border-t border-slate-200 bg-white py-4 text-center text-xs text-slate-500">
        <div className="max-w-7xl mx-auto px-4 flex flex-col sm:flex-row items-center justify-between gap-2">
          <p>
            Amazon ASIN Bulk Checker &bull; Automated URL generation, validity verification & image display
          </p>
          <p className="font-mono text-[11px] text-slate-400">
            Complies with Amazon URL schema &bull; High-resolution image CDN extraction
          </p>
        </div>
      </footer>
    </div>
  );
}
