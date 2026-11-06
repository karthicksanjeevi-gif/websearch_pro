import React, { useRef, useState } from 'react';
import { 
  Globe, 
  Upload, 
  Sparkles, 
  Trash2, 
  Play, 
  Pause, 
  Square, 
  RefreshCw, 
  FileText, 
  Sliders, 
  CheckCheck,
  AlertCircle
} from 'lucide-react';

interface ConfigPanelProps {
  baseUrl: string;
  onBaseUrlChange: (url: string) => void;
  rawAsinsText: string;
  onRawAsinsChange: (text: string) => void;
  onGenerateAndCheck: () => void;
  onPauseResume: () => void;
  onStop: () => void;
  onRecheckAll: () => void;
  onRecheckNoOnly: () => void;
  isChecking: boolean;
  isPaused: boolean;
  totalAsins: number;
  delayMs: number;
  onDelayChange: (delay: number) => void;
  concurrency: number;
  onConcurrencyChange: (c: number) => void;
}

const SAMPLE_ASINS = [
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
];

const PRESET_DOMAINS = [
  { label: 'US (.com)', url: 'https://www.amazon.com/dp/' },
  { label: 'UK (.co.uk)', url: 'https://www.amazon.co.uk/dp/' },
  { label: 'Germany (.de)', url: 'https://www.amazon.de/dp/' },
  { label: 'Canada (.ca)', url: 'https://www.amazon.ca/dp/' },
  { label: 'India (.in)', url: 'https://www.amazon.in/dp/' },
  { label: 'Japan (.co.jp)', url: 'https://www.amazon.co.jp/dp/' },
];

export const ConfigPanel: React.FC<ConfigPanelProps> = ({
  baseUrl,
  onBaseUrlChange,
  rawAsinsText,
  onRawAsinsChange,
  onGenerateAndCheck,
  onPauseResume,
  onStop,
  onRecheckAll,
  onRecheckNoOnly,
  isChecking,
  isPaused,
  totalAsins,
  delayMs,
  onDelayChange,
  concurrency,
  onConcurrencyChange,
}) => {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [showSettings, setShowSettings] = useState(false);
  const [dragActive, setDragActive] = useState(false);

  const handleFileUpload = (file: File) => {
    const reader = new FileReader();
    reader.onload = (e) => {
      const content = (e.target?.result as string) || '';
      // Support comma separated or line separated
      const lines = content
        .split(/[\r\n,]+/)
        .map(line => line.trim())
        .filter(line => line.length > 0);

      onRawAsinsChange(lines.join('\n'));
    };
    reader.readAsText(file);
  };

  const handleDrag = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (e.type === 'dragenter' || e.type === 'dragover') {
      setDragActive(true);
    } else if (e.type === 'dragleave') {
      setDragActive(false);
    }
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setDragActive(false);
    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      handleFileUpload(e.dataTransfer.files[0]);
    }
  };

  const handleLoadSamples = () => {
    onRawAsinsChange(SAMPLE_ASINS.join('\n'));
  };

  const handleDeduplicate = () => {
    const lines = rawAsinsText
      .split('\n')
      .map(s => s.trim().toUpperCase())
      .filter(Boolean);
    const unique = Array.from(new Set(lines));
    onRawAsinsChange(unique.join('\n'));
  };

  const handleClear = () => {
    if (window.confirm('Clear all ASINs?')) {
      onRawAsinsChange('');
    }
  };

  // Preview the first generated URL
  const firstAsin = rawAsinsText
    .split('\n')
    .map(s => s.trim())
    .find(s => s.length > 0) || 'B0B4WK6143';
  const cleanBase = baseUrl.endsWith('/') ? baseUrl : `${baseUrl}/`;
  const sampleUrlPreview = `${cleanBase}${firstAsin}`;

  return (
    <div className="bg-white rounded-2xl border border-slate-200/90 shadow-sm overflow-hidden">
      {/* Panel Header */}
      <div className="p-5 border-b border-slate-100 flex items-center justify-between bg-slate-50/50">
        <div className="flex items-center gap-2.5">
          <div className="w-8 h-8 rounded-lg bg-amber-500/10 text-amber-700 flex items-center justify-center font-bold">
            1
          </div>
          <div>
            <h2 className="text-base font-bold text-slate-900">URL & ASIN Bulk Configuration</h2>
            <p className="text-xs text-slate-500">Customize base Amazon domain and paste/upload product ASINs</p>
          </div>
        </div>

        <button
          type="button"
          onClick={() => setShowSettings(!showSettings)}
          className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold transition-colors ${
            showSettings ? 'bg-slate-200 text-slate-800' : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
          }`}
        >
          <Sliders className="w-3.5 h-3.5" />
          Checking Settings
        </button>
      </div>

      <div className="p-5 space-y-5">
        {/* Step 1: Base URL */}
        <div className="space-y-2">
          <div className="flex items-center justify-between">
            <label className="text-xs font-bold uppercase tracking-wider text-slate-700 flex items-center gap-1.5">
              <Globe className="w-3.5 h-3.5 text-amber-600" />
              Base Amazon URL
            </label>
            <span className="text-[11px] text-slate-500">Appends ASIN to this prefix</span>
          </div>

          <div className="relative">
            <input
              type="text"
              value={baseUrl}
              onChange={(e) => onBaseUrlChange(e.target.value)}
              placeholder="https://www.amazon.com/dp/"
              className="w-full pl-3 pr-24 py-2.5 text-sm font-mono border border-slate-200 rounded-xl bg-slate-50/50 focus:bg-white focus:outline-none focus:ring-2 focus:ring-amber-500/20 focus:border-amber-500 transition-all"
            />
            <span className="absolute right-3 top-1/2 -translate-y-1/2 text-xs font-semibold text-slate-400 select-none">
              + [ASIN]
            </span>
          </div>

          {/* Quick Domain Presets */}
          <div className="flex flex-wrap items-center gap-1.5 pt-1">
            <span className="text-[11px] font-medium text-slate-400 mr-1">Presets:</span>
            {PRESET_DOMAINS.map((domain) => (
              <button
                key={domain.url}
                type="button"
                onClick={() => onBaseUrlChange(domain.url)}
                className={`text-xs px-2.5 py-1 rounded-md transition-all font-medium ${
                  baseUrl === domain.url
                    ? 'bg-amber-500 text-white shadow-xs'
                    : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                }`}
              >
                {domain.label}
              </button>
            ))}
          </div>
        </div>

        {/* Step 2: Bulk ASIN Input */}
        <div className="space-y-2">
          <div className="flex items-center justify-between">
            <label className="text-xs font-bold uppercase tracking-wider text-slate-700 flex items-center gap-1.5">
              <FileText className="w-3.5 h-3.5 text-amber-600" />
              Bulk ASIN Input (One per line)
            </label>
            <span className="text-xs font-semibold text-slate-500">
              {totalAsins} {totalAsins === 1 ? 'ASIN' : 'ASINs'} entered
            </span>
          </div>

          {/* Actions Bar above Textarea */}
          <div className="flex flex-wrap items-center justify-between gap-2 bg-slate-50 p-2 rounded-t-xl border border-b-0 border-slate-200">
            <div className="flex items-center gap-1.5">
              <button
                type="button"
                onClick={handleLoadSamples}
                className="inline-flex items-center gap-1 text-xs px-2.5 py-1 rounded-md bg-amber-100 text-amber-800 hover:bg-amber-200 font-semibold transition-colors shadow-2xs"
                title="Loads 10 example ASINs provided in user prompt"
              >
                <Sparkles className="w-3 h-3 text-amber-600" />
                Load 10 Sample ASINs
              </button>

              <button
                type="button"
                onClick={handleDeduplicate}
                className="inline-flex items-center gap-1 text-xs px-2.5 py-1 rounded-md bg-white text-slate-700 hover:bg-slate-100 border border-slate-200 font-medium transition-colors"
                title="Remove duplicate ASINs and clean whitespace"
              >
                <CheckCheck className="w-3 h-3 text-emerald-600" />
                Deduplicate & Clean
              </button>
            </div>

            <div className="flex items-center gap-1.5">
              <input
                ref={fileInputRef}
                type="file"
                accept=".txt,.csv"
                onChange={(e) => {
                  if (e.target.files && e.target.files[0]) {
                    handleFileUpload(e.target.files[0]);
                  }
                }}
                className="hidden"
              />
              <button
                type="button"
                onClick={() => fileInputRef.current?.click()}
                className="inline-flex items-center gap-1 text-xs px-2.5 py-1 rounded-md bg-white text-slate-700 hover:bg-slate-100 border border-slate-200 font-medium transition-colors"
              >
                <Upload className="w-3 h-3 text-blue-600" />
                Upload .txt / .csv
              </button>

              {totalAsins > 0 && (
                <button
                  type="button"
                  onClick={handleClear}
                  className="inline-flex items-center gap-1 text-xs px-2 py-1 rounded-md text-rose-600 hover:bg-rose-50 font-medium transition-colors"
                  title="Clear ASIN list"
                >
                  <Trash2 className="w-3 h-3" />
                </button>
              )}
            </div>
          </div>

          {/* Textarea with Drag & Drop */}
          <div
            onDragEnter={handleDrag}
            onDragOver={handleDrag}
            onDragLeave={handleDrag}
            onDrop={handleDrop}
            className={`relative rounded-b-xl border transition-all ${
              dragActive ? 'border-amber-500 bg-amber-50/30' : 'border-slate-200 bg-white'
            }`}
          >
            <textarea
              rows={6}
              value={rawAsinsText}
              onChange={(e) => onRawAsinsChange(e.target.value)}
              placeholder="Paste ASINs here (one per line)...&#10;e.g.&#10;B0B4WK6143&#10;B0FPF5S7J8&#10;B0FJFPZ7LF&#10;B09FXFP23T"
              className="w-full p-3 font-mono text-xs text-slate-800 focus:outline-none focus:ring-0 resize-y rounded-b-xl leading-relaxed"
            />

            {dragActive && (
              <div className="absolute inset-0 bg-amber-500/10 border-2 border-dashed border-amber-500 rounded-b-xl flex items-center justify-center pointer-events-none">
                <span className="text-xs font-bold text-amber-800 bg-white px-3 py-1.5 rounded-full shadow-md">
                  Drop .txt or .csv file here
                </span>
              </div>
            )}
          </div>
        </div>

        {/* Live URL Combination Preview */}
        <div className="bg-slate-50 p-3 rounded-xl border border-slate-200/80 flex flex-col gap-1">
          <span className="text-[11px] font-semibold text-slate-500 uppercase tracking-wider flex items-center gap-1">
            <AlertCircle className="w-3 h-3 text-amber-500" />
            Automatic URL Generation Preview:
          </span>
          <div className="font-mono text-xs text-slate-700 truncate bg-white px-2.5 py-1.5 rounded-md border border-slate-200 select-all">
            {sampleUrlPreview}
          </div>
        </div>

        {/* Optional Settings Panel (Delay, Concurrency) */}
        {showSettings && (
          <div className="p-4 rounded-xl bg-slate-50 border border-slate-200 space-y-3 animate-in fade-in duration-200">
            <h4 className="text-xs font-bold text-slate-800 uppercase tracking-wider">Checking Engine Settings</h4>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="text-xs font-medium text-slate-600 block mb-1">
                  Delay Between Requests: <span className="font-bold text-amber-600">{delayMs}ms</span>
                </label>
                <div className="flex gap-2">
                  {[200, 400, 800, 1500].map(val => (
                    <button
                      key={val}
                      type="button"
                      onClick={() => onDelayChange(val)}
                      className={`text-xs px-2.5 py-1 rounded-md font-semibold flex-1 ${
                        delayMs === val ? 'bg-amber-500 text-white' : 'bg-white text-slate-700 border border-slate-200'
                      }`}
                    >
                      {val}ms
                    </button>
                  ))}
                </div>
              </div>

              <div>
                <label className="text-xs font-medium text-slate-600 block mb-1">
                  Worker Concurrency: <span className="font-bold text-amber-600">{concurrency} concurrent</span>
                </label>
                <div className="flex gap-2">
                  {[1, 2, 3].map(val => (
                    <button
                      key={val}
                      type="button"
                      onClick={() => onConcurrencyChange(val)}
                      className={`text-xs px-2.5 py-1 rounded-md font-semibold flex-1 ${
                        concurrency === val ? 'bg-amber-500 text-white' : 'bg-white text-slate-700 border border-slate-200'
                      }`}
                    >
                      {val}
                    </button>
                  ))}
                </div>
              </div>
            </div>
            <p className="text-[11px] text-slate-500">
              Tip: Moderate delay (400ms) with 2 workers ensures fast results while respecting Amazon rate thresholds.
            </p>
          </div>
        )}

        {/* Action Controls */}
        <div className="flex flex-wrap items-center gap-2 pt-2 border-t border-slate-100">
          {!isChecking ? (
            <button
              type="button"
              disabled={totalAsins === 0}
              onClick={onGenerateAndCheck}
              className={`flex-1 inline-flex items-center justify-center gap-2 px-5 py-3 rounded-xl font-bold text-sm text-white shadow-md transition-all ${
                totalAsins === 0
                  ? 'bg-slate-300 cursor-not-allowed shadow-none'
                  : 'bg-amber-500 hover:bg-amber-600 active:scale-[0.99] cursor-pointer'
              }`}
            >
              <Play className="w-4 h-4 fill-white" />
              Start Automated Check ({totalAsins} ASINs)
            </button>
          ) : (
            <>
              <button
                type="button"
                onClick={onPauseResume}
                className={`flex-1 inline-flex items-center justify-center gap-2 px-4 py-3 rounded-xl font-bold text-sm text-white shadow-sm transition-all ${
                  isPaused ? 'bg-emerald-600 hover:bg-emerald-700' : 'bg-amber-600 hover:bg-amber-700'
                }`}
              >
                {isPaused ? <Play className="w-4 h-4 fill-white" /> : <Pause className="w-4 h-4 fill-white" />}
                {isPaused ? 'Resume Checking' : 'Pause Checking'}
              </button>

              <button
                type="button"
                onClick={onStop}
                className="inline-flex items-center justify-center gap-2 px-4 py-3 rounded-xl font-bold text-sm bg-rose-600 hover:bg-rose-700 text-white shadow-sm transition-all"
              >
                <Square className="w-4 h-4 fill-white" />
                Stop
              </button>
            </>
          )}

          {!isChecking && totalAsins > 0 && (
            <div className="flex items-center gap-1.5">
              <button
                type="button"
                onClick={onRecheckAll}
                className="inline-flex items-center gap-1.5 px-3 py-3 rounded-xl font-semibold text-xs bg-slate-100 hover:bg-slate-200 text-slate-700 transition-colors"
                title="Reset status and check all again"
              >
                <RefreshCw className="w-3.5 h-3.5" />
                Re-check All
              </button>

              <button
                type="button"
                onClick={onRecheckNoOnly}
                className="inline-flex items-center gap-1.5 px-3 py-3 rounded-xl font-semibold text-xs bg-rose-50 hover:bg-rose-100 text-rose-700 border border-rose-200 transition-colors"
                title="Only re-test items marked as NO"
              >
                <RefreshCw className="w-3.5 h-3.5 text-rose-600" />
                Retry NO Only
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
