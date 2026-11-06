import React, { useState } from 'react';
import { ShoppingBag, HelpCircle, RotateCcw, ExternalLink, X, CheckCircle2, XCircle } from 'lucide-react';

interface NavbarProps {
  onReset: () => void;
  hasItems: boolean;
}

export const Navbar: React.FC<NavbarProps> = ({ onReset, hasItems }) => {
  const [showHelp, setShowHelp] = useState(false);

  return (
    <header className="bg-slate-900 border-b border-slate-800 text-white sticky top-0 z-40 shadow-sm">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between">
        {/* Brand */}
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-amber-500 to-amber-400 text-slate-950 flex items-center justify-center font-black shadow-md shadow-amber-500/20">
            <ShoppingBag className="w-5 h-5 text-slate-950" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h1 className="font-extrabold text-base tracking-tight text-white flex items-center gap-1.5">
                Amazon ASIN Bulk Checker
              </h1>
              <span className="text-[10px] font-bold uppercase tracking-wider bg-amber-500/20 text-amber-400 border border-amber-500/30 px-2 py-0.5 rounded-full">
                Auto Validator
              </span>
            </div>
            <p className="text-xs text-slate-400 hidden sm:block">
              Combine base URLs with ASINs, verify active status, and extract product images
            </p>
          </div>
        </div>

        {/* Actions */}
        <div className="flex items-center gap-2 sm:gap-3">
          <button
            type="button"
            onClick={() => setShowHelp(true)}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium text-slate-300 hover:text-white hover:bg-slate-800 transition-colors"
          >
            <HelpCircle className="w-4 h-4 text-amber-400" />
            <span className="hidden sm:inline">How it works</span>
          </button>

          <a
            href="https://www.amazon.com"
            target="_blank"
            rel="noreferrer"
            className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium text-slate-300 hover:text-white hover:bg-slate-800 transition-colors"
          >
            <ExternalLink className="w-3.5 h-3.5" />
            <span className="hidden sm:inline">Amazon.com</span>
          </a>

          {hasItems && (
            <button
              type="button"
              onClick={onReset}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold text-rose-400 hover:text-rose-300 hover:bg-rose-950/40 border border-rose-900/50 transition-colors"
            >
              <RotateCcw className="w-3.5 h-3.5" />
              <span>Clear Session</span>
            </button>
          )}
        </div>
      </div>

      {/* Help Modal */}
      {showHelp && (
        <div 
          className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-xs"
          onClick={() => setShowHelp(false)}
        >
          <div 
            className="relative bg-white text-slate-900 rounded-2xl shadow-2xl max-w-lg w-full p-6 border border-slate-200"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between pb-3 border-b border-slate-100">
              <h3 className="font-bold text-base text-slate-900 flex items-center gap-2">
                <ShoppingBag className="w-5 h-5 text-amber-500" />
                How the Bulk Checker Works
              </h3>
              <button 
                onClick={() => setShowHelp(false)}
                className="text-slate-400 hover:text-slate-700 p-1 rounded-full"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="mt-4 space-y-3.5 text-xs text-slate-600 leading-relaxed">
              <div className="flex items-start gap-2.5">
                <span className="w-5 h-5 rounded-full bg-amber-100 text-amber-800 flex items-center justify-center font-bold text-[11px] shrink-0 mt-0.5">
                  1
                </span>
                <p>
                  <strong>Base URL:</strong> The common Amazon URL prefix (e.g. <code>https://www.amazon.com/dp/</code>). You can edit this anytime or pick marketplace presets (UK, Germany, Japan, India, etc.).
                </p>
              </div>

              <div className="flex items-start gap-2.5">
                <span className="w-5 h-5 rounded-full bg-amber-100 text-amber-800 flex items-center justify-center font-bold text-[11px] shrink-0 mt-0.5">
                  2
                </span>
                <p>
                  <strong>ASIN Input & URL Generation:</strong> Paste or upload multiple ASINs (one per line). The engine merges each ASIN with the base URL to create complete product URLs automatically.
                </p>
              </div>

              <div className="flex items-start gap-2.5">
                <span className="w-5 h-5 rounded-full bg-amber-100 text-amber-800 flex items-center justify-center font-bold text-[11px] shrink-0 mt-0.5">
                  3
                </span>
                <p>
                  <strong>Automated Checking:</strong> The server automatically visits each generated URL and inspects if the product page contains an active, valid listing.
                </p>
              </div>

              <div className="flex items-start gap-2.5">
                <span className="w-5 h-5 rounded-full bg-amber-100 text-amber-800 flex items-center justify-center font-bold text-[11px] shrink-0 mt-0.5">
                  4
                </span>
                <div className="space-y-1">
                  <p><strong>Result Output Rules:</strong></p>
                  <p className="flex items-center gap-1.5 text-rose-700 font-semibold">
                    <XCircle className="w-4 h-4 text-rose-600 shrink-0" />
                    If no valid product result is found &rarr; displays <span className="bg-rose-100 px-1.5 py-0.5 rounded text-rose-900 font-black">NO</span>.
                  </p>
                  <p className="flex items-center gap-1.5 text-emerald-700 font-semibold">
                    <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
                    If a valid product is found &rarr; displays the <strong>Product Image</strong>.
                  </p>
                </div>
              </div>
            </div>

            <div className="mt-6 pt-3 border-t border-slate-100 text-right">
              <button
                type="button"
                onClick={() => setShowHelp(false)}
                className="px-4 py-2 rounded-xl bg-slate-900 text-white font-semibold text-xs hover:bg-slate-800 transition-colors"
              >
                Got it
              </button>
            </div>
          </div>
        </div>
      )}
    </header>
  );
};
