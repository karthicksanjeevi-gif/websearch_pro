import React from 'react';
import { X, ExternalLink, Download, Copy, Check } from 'lucide-react';
import { AsinItem } from '../types';

interface ImageModalProps {
  item: AsinItem | null;
  onClose: () => void;
}

export const ImageModal: React.FC<ImageModalProps> = ({ item, onClose }) => {
  const [copied, setCopied] = React.useState(false);

  if (!item || !item.imageUrl) return null;

  const proxiedSrc = `/api/proxy-image?url=${encodeURIComponent(item.imageUrl)}`;

  const handleCopyLink = () => {
    if (item.imageUrl) {
      navigator.clipboard.writeText(item.imageUrl);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  };

  const handleDownload = async () => {
    try {
      const res = await fetch(proxiedSrc);
      const blob = await res.blob();
      const blobUrl = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = blobUrl;
      a.download = `amazon-${item.asin}-product.jpg`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(blobUrl);
    } catch {
      window.open(proxiedSrc, '_blank');
    }
  };

  return (
    <div 
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/80 backdrop-blur-sm animate-in fade-in duration-200"
      onClick={onClose}
    >
      <div 
        className="relative bg-white rounded-2xl shadow-2xl max-w-2xl w-full overflow-hidden border border-slate-200 flex flex-col max-h-[90vh]"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-100 bg-slate-50/50">
          <div className="flex items-center gap-3">
            <span className="inline-flex items-center px-2.5 py-1 rounded-md text-xs font-mono font-bold bg-amber-100 text-amber-800 border border-amber-300">
              {item.asin}
            </span>
            <span className="text-sm font-semibold text-emerald-700 bg-emerald-50 px-2.5 py-0.5 rounded-full border border-emerald-200">
              Product Found
            </span>
          </div>
          <button 
            onClick={onClose}
            className="p-1.5 text-slate-400 hover:text-slate-700 hover:bg-slate-200/60 rounded-full transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Image Preview */}
        <div className="flex-1 overflow-auto p-6 flex flex-col items-center justify-center bg-radial from-slate-50 to-slate-100/80 min-h-[300px]">
          <img 
            src={proxiedSrc} 
            alt={item.title || item.asin}
            className="max-h-[50vh] max-w-full object-contain rounded-lg drop-shadow-md hover:scale-105 transition-transform duration-300"
            onError={(e) => {
              // fallback to direct image
              (e.currentTarget as HTMLImageElement).src = item.imageUrl || '';
            }}
          />
        </div>

        {/* Product Details Footer */}
        <div className="p-6 border-t border-slate-100 bg-white space-y-3">
          <div>
            <h3 className="font-semibold text-slate-900 text-base leading-snug line-clamp-2">
              {item.title || `Amazon Product (${item.asin})`}
            </h3>
            {item.price && (
              <p className="text-lg font-bold text-amber-600 mt-1">
                {item.price}
              </p>
            )}
          </div>

          <div className="flex flex-wrap items-center justify-between gap-2 pt-2 border-t border-slate-100">
            <a
              href={item.url}
              target="_blank"
              rel="noreferrer"
              className="inline-flex items-center gap-1.5 text-xs font-medium text-blue-600 hover:text-blue-800 hover:underline"
            >
              <ExternalLink className="w-3.5 h-3.5" />
              Open Amazon Product Page
            </a>

            <div className="flex items-center gap-2">
              <button
                onClick={handleCopyLink}
                className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-slate-700 bg-slate-100 hover:bg-slate-200 rounded-lg transition-colors"
              >
                {copied ? <Check className="w-3.5 h-3.5 text-emerald-600" /> : <Copy className="w-3.5 h-3.5" />}
                {copied ? 'Copied' : 'Copy Image URL'}
              </button>

              <button
                onClick={handleDownload}
                className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-white bg-amber-500 hover:bg-amber-600 rounded-lg transition-colors shadow-sm"
              >
                <Download className="w-3.5 h-3.5" />
                Download Image
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
