import React, { useState } from 'react';
import { 
  CheckCircle2, 
  XCircle, 
  ExternalLink, 
  Copy, 
  Check, 
  RefreshCw, 
  Trash2, 
  Search, 
  Download, 
  Image as ImageIcon, 
  Eye, 
  LayoutList, 
  LayoutGrid,
  Loader2,
  AlertTriangle,
  FileText,
  ChevronDown
} from 'lucide-react';
import { AsinItem } from '../types';
import { generateAsinReportPdf } from '../utils/pdfExport';

interface ResultsDashboardProps {
  items: AsinItem[];
  onRecheckSingle: (id: string) => void;
  onDeleteItem: (id: string) => void;
  onOpenImageModal: (item: AsinItem) => void;
  isChecking: boolean;
}

export const ResultsDashboard: React.FC<ResultsDashboardProps> = ({
  items,
  onRecheckSingle,
  onDeleteItem,
  onOpenImageModal,
  isChecking,
}) => {
  const [filter, setFilter] = useState<'all' | 'valid' | 'no' | 'pending'>('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [viewMode, setViewMode] = useState<'table' | 'grid'>('table');
  const [copiedId, setCopiedId] = useState<string | null>(null);
  const [isExportingPdf, setIsExportingPdf] = useState(false);
  const [pdfProgress, setPdfProgress] = useState<{ current: number; total: number } | null>(null);
  const [showExportMenu, setShowExportMenu] = useState(false);

  const filteredItems = items.filter((item) => {
    // Filter by tab
    if (filter === 'valid' && item.status !== 'valid') return false;
    if (filter === 'no' && item.status !== 'no') return false;
    if (filter === 'pending' && item.status !== 'pending' && item.status !== 'checking') return false;

    // Search query
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      const matchAsin = item.asin.toLowerCase().includes(q);
      const matchTitle = item.title?.toLowerCase().includes(q);
      const matchUrl = item.url.toLowerCase().includes(q);
      return matchAsin || matchTitle || matchUrl;
    }

    return true;
  });

  const countValid = items.filter(i => i.status === 'valid').length;
  const countNo = items.filter(i => i.status === 'no').length;
  const countPending = items.filter(i => i.status === 'pending' || i.status === 'checking').length;

  const handleCopy = (text: string, id: string) => {
    navigator.clipboard.writeText(text);
    setCopiedId(id);
    setTimeout(() => setCopiedId(null), 1500);
  };

  const handleExportPdf = async (exportType: 'all' | 'valid' | 'no') => {
    try {
      setIsExportingPdf(true);
      setShowExportMenu(false);
      setPdfProgress({ current: 0, total: items.length });
      await generateAsinReportPdf(items, {
        exportType,
        onProgress: (current, total) => {
          setPdfProgress({ current, total });
        },
      });
    } catch (err: any) {
      alert(`Failed to export PDF: ${err?.message || 'Unknown error'}`);
    } finally {
      setIsExportingPdf(false);
      setPdfProgress(null);
    }
  };

  const handleExportCSV = (exportType: 'all' | 'valid' | 'no') => {
    setShowExportMenu(false);
    let toExport = items;
    if (exportType === 'valid') toExport = items.filter(i => i.status === 'valid');
    if (exportType === 'no') toExport = items.filter(i => i.status === 'no');

    const headers = ['ASIN', 'Status', 'Generated Amazon URL', 'Product Title', 'Image URL', 'Price', 'Reason'];
    const rows = toExport.map(item => [
      `"${item.asin}"`,
      `"${item.status.toUpperCase()}"`,
      `"${item.url}"`,
      `"${(item.title || '').replace(/"/g, '""')}"`,
      `"${item.imageUrl || ''}"`,
      `"${item.price || ''}"`,
      `"${(item.reason || '').replace(/"/g, '""')}"`,
    ]);

    const csvContent = 'data:text/csv;charset=utf-8,' + [headers.join(','), ...rows.map(r => r.join(','))].join('\n');
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement('a');
    link.setAttribute('href', encodedUri);
    link.setAttribute('download', `amazon-asin-results-${exportType}-${new Date().toISOString().slice(0, 10)}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  return (
    <div className="bg-white rounded-2xl border border-slate-200/90 shadow-sm overflow-hidden flex flex-col">
      {/* Dashboard Header & Controls */}
      <div className="p-5 border-b border-slate-100 flex flex-col md:flex-row md:items-center justify-between gap-4 bg-slate-50/50">
        <div className="flex items-center gap-2.5">
          <div className="w-8 h-8 rounded-lg bg-emerald-500/10 text-emerald-700 flex items-center justify-center font-bold">
            2
          </div>
          <div>
            <h2 className="text-base font-bold text-slate-900">Results Dashboard</h2>
            <p className="text-xs text-slate-500">Live verification status, generated URLs, and product images</p>
          </div>
        </div>

        {/* View Mode & Export Controls */}
        <div className="flex flex-wrap items-center gap-2">
          {/* View Toggle */}
          <div className="bg-slate-200/70 p-1 rounded-xl flex items-center gap-1">
            <button
              type="button"
              onClick={() => setViewMode('table')}
              className={`p-1.5 rounded-lg text-xs font-medium transition-colors ${
                viewMode === 'table' ? 'bg-white text-slate-900 shadow-xs' : 'text-slate-600 hover:text-slate-900'
              }`}
              title="Table View"
            >
              <LayoutList className="w-4 h-4" />
            </button>
            <button
              type="button"
              onClick={() => setViewMode('grid')}
              className={`p-1.5 rounded-lg text-xs font-medium transition-colors ${
                viewMode === 'grid' ? 'bg-white text-slate-900 shadow-xs' : 'text-slate-600 hover:text-slate-900'
              }`}
              title="Image Grid View"
            >
              <LayoutGrid className="w-4 h-4" />
            </button>
          </div>

          {/* Export Buttons: Primary PDF Export */}
          <div className="relative flex items-center gap-1">
            <button
              type="button"
              onClick={() => handleExportPdf('all')}
              disabled={items.length === 0 || isExportingPdf}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-bold text-slate-800 bg-white border border-slate-300 hover:bg-slate-100 hover:border-slate-400 rounded-lg transition-all shadow-2xs disabled:opacity-50"
              title="Download entire results table as a formatted PDF report"
            >
              {isExportingPdf ? (
                <>
                  <Loader2 className="w-3.5 h-3.5 text-amber-500 animate-spin" />
                  <span>
                    Generating PDF {pdfProgress?.total ? `(${pdfProgress.current}/${pdfProgress.total})` : '...'}
                  </span>
                </>
              ) : (
                <>
                  <FileText className="w-3.5 h-3.5 text-rose-600" />
                  <span>Export All (PDF)</span>
                </>
              )}
            </button>

            {countValid > 0 && !isExportingPdf && (
              <button
                type="button"
                onClick={() => handleExportPdf('valid')}
                className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-bold text-emerald-800 bg-emerald-50 border border-emerald-200 hover:bg-emerald-100 rounded-lg transition-colors"
                title="Download only valid verified products with images as a PDF"
              >
                <FileText className="w-3.5 h-3.5 text-emerald-600" />
                <span>Export Valid PDF ({countValid})</span>
              </button>
            )}

            {/* More export options dropdown (CSV / NO-only PDF) */}
            <div className="relative">
              <button
                type="button"
                onClick={() => setShowExportMenu(!showExportMenu)}
                disabled={items.length === 0 || isExportingPdf}
                className="p-1.5 text-slate-600 bg-white border border-slate-200 hover:bg-slate-100 rounded-lg transition-colors disabled:opacity-50"
                title="More export options"
              >
                <ChevronDown className="w-3.5 h-3.5" />
              </button>

              {showExportMenu && (
                <div 
                  className="absolute right-0 top-full mt-1.5 w-48 bg-white rounded-xl shadow-xl border border-slate-200 p-1 z-30 animate-in fade-in zoom-in-95 duration-150"
                  onClick={() => setShowExportMenu(false)}
                >
                  <button
                    type="button"
                    onClick={() => handleExportPdf('all')}
                    className="w-full text-left px-3 py-2 text-xs font-medium text-slate-700 hover:bg-slate-100 rounded-lg flex items-center gap-2"
                  >
                    <FileText className="w-3.5 h-3.5 text-rose-600" />
                    <span>Export All (PDF)</span>
                  </button>

                  {countValid > 0 && (
                    <button
                      type="button"
                      onClick={() => handleExportPdf('valid')}
                      className="w-full text-left px-3 py-2 text-xs font-medium text-emerald-700 hover:bg-emerald-50 rounded-lg flex items-center gap-2"
                    >
                      <FileText className="w-3.5 h-3.5 text-emerald-600" />
                      <span>Export Valid Only (PDF)</span>
                    </button>
                  )}

                  {countNo > 0 && (
                    <button
                      type="button"
                      onClick={() => handleExportPdf('no')}
                      className="w-full text-left px-3 py-2 text-xs font-medium text-rose-700 hover:bg-rose-50 rounded-lg flex items-center gap-2"
                    >
                      <FileText className="w-3.5 h-3.5 text-rose-600" />
                      <span>Export NO Only (PDF)</span>
                    </button>
                  )}

                  <div className="h-px bg-slate-100 my-1" />

                  <button
                    type="button"
                    onClick={() => handleExportCSV('all')}
                    className="w-full text-left px-3 py-2 text-xs font-medium text-slate-700 hover:bg-slate-100 rounded-lg flex items-center gap-2"
                  >
                    <Download className="w-3.5 h-3.5 text-slate-500" />
                    <span>Export All (CSV)</span>
                  </button>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Filter Tabs & Search Bar */}
      <div className="px-5 py-3 border-b border-slate-100 bg-white flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3">
        {/* Filter Pills */}
        <div className="flex items-center gap-1.5 overflow-x-auto pb-1 sm:pb-0">
          <button
            type="button"
            onClick={() => setFilter('all')}
            className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-all shrink-0 ${
              filter === 'all'
                ? 'bg-slate-900 text-white'
                : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
            }`}
          >
            All URLs ({items.length})
          </button>

          <button
            type="button"
            onClick={() => setFilter('valid')}
            className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-all shrink-0 flex items-center gap-1.5 ${
              filter === 'valid'
                ? 'bg-emerald-600 text-white'
                : 'bg-emerald-50 text-emerald-700 hover:bg-emerald-100 border border-emerald-200/60'
            }`}
          >
            <CheckCircle2 className="w-3.5 h-3.5" />
            Valid ({countValid})
          </button>

          <button
            type="button"
            onClick={() => setFilter('no')}
            className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-all shrink-0 flex items-center gap-1.5 ${
              filter === 'no'
                ? 'bg-rose-600 text-white'
                : 'bg-rose-50 text-rose-700 hover:bg-rose-100 border border-rose-200/60'
            }`}
          >
            <XCircle className="w-3.5 h-3.5" />
            Display NO ({countNo})
          </button>

          <button
            type="button"
            onClick={() => setFilter('pending')}
            className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-all shrink-0 ${
              filter === 'pending'
                ? 'bg-slate-600 text-white'
                : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
            }`}
          >
            Queue ({countPending})
          </button>
        </div>

        {/* Search Bar */}
        <div className="relative min-w-[220px]">
          <Search className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search ASIN or title..."
            className="w-full pl-8 pr-3 py-1.5 text-xs bg-slate-50 border border-slate-200 rounded-lg focus:bg-white focus:outline-none focus:ring-2 focus:ring-amber-500/20 focus:border-amber-500"
          />
        </div>
      </div>

      {/* Main Content Area */}
      {items.length === 0 ? (
        <div className="p-12 text-center flex flex-col items-center justify-center">
          <div className="w-14 h-14 rounded-2xl bg-amber-50 text-amber-500 flex items-center justify-center mb-3">
            <ImageIcon className="w-7 h-7" />
          </div>
          <h3 className="text-base font-bold text-slate-800">No URLs generated yet</h3>
          <p className="text-xs text-slate-500 max-w-sm mt-1">
            Input or paste your ASINs on the left panel and click &ldquo;Start Automated Check&rdquo; to generate URLs and verify products.
          </p>
        </div>
      ) : filteredItems.length === 0 ? (
        <div className="p-12 text-center text-slate-500 text-xs">
          No items match the selected filter or search query.
        </div>
      ) : viewMode === 'table' ? (
        /* TABLE VIEW */
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="border-b border-slate-200 bg-slate-50/80 text-[11px] font-bold text-slate-500 uppercase tracking-wider select-none">
                <th className="py-3 px-4 w-12 text-center">#</th>
                <th className="py-3 px-4 w-32">ASIN</th>
                <th className="py-3 px-4 min-w-[240px]">Generated Amazon URL</th>
                <th className="py-3 px-4 w-28 text-center">Status</th>
                <th className="py-3 px-4 w-32 text-center">Product Image</th>
                <th className="py-3 px-4 min-w-[200px]">Product Title & Details</th>
                <th className="py-3 px-4 w-28 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 text-xs">
              {filteredItems.map((item, index) => {
                const proxiedSrc = item.imageUrl 
                  ? `/api/proxy-image?url=${encodeURIComponent(item.imageUrl)}`
                  : null;

                return (
                  <tr 
                    key={item.id}
                    className={`transition-colors hover:bg-slate-50/80 ${
                      item.status === 'checking' ? 'bg-amber-50/40' : ''
                    }`}
                  >
                    {/* Index */}
                    <td className="py-3.5 px-4 text-center font-mono text-slate-400">
                      {index + 1}
                    </td>

                    {/* ASIN */}
                    <td className="py-3.5 px-4 font-mono font-bold text-slate-800">
                      <div className="flex items-center gap-1.5">
                        <span className="bg-slate-100 px-2 py-1 rounded text-slate-900 border border-slate-200">
                          {item.asin}
                        </span>
                        <button
                          type="button"
                          onClick={() => handleCopy(item.asin, `asin-${item.id}`)}
                          className="text-slate-400 hover:text-slate-700 p-1"
                          title="Copy ASIN"
                        >
                          {copiedId === `asin-${item.id}` ? (
                            <Check className="w-3.5 h-3.5 text-emerald-600" />
                          ) : (
                            <Copy className="w-3.5 h-3.5" />
                          )}
                        </button>
                      </div>
                    </td>

                    {/* Generated URL */}
                    <td className="py-3.5 px-4 font-mono text-slate-600 max-w-xs">
                      <div className="flex items-center gap-1.5 group">
                        <a
                          href={item.url}
                          target="_blank"
                          rel="noreferrer"
                          className="truncate hover:text-amber-600 hover:underline flex-1"
                          title={item.url}
                        >
                          {item.url}
                        </a>
                        <button
                          type="button"
                          onClick={() => handleCopy(item.url, `url-${item.id}`)}
                          className="opacity-0 group-hover:opacity-100 text-slate-400 hover:text-slate-700 p-0.5 transition-opacity"
                          title="Copy URL"
                        >
                          {copiedId === `url-${item.id}` ? (
                            <Check className="w-3.5 h-3.5 text-emerald-600" />
                          ) : (
                            <Copy className="w-3.5 h-3.5" />
                          )}
                        </button>
                        <a
                          href={item.url}
                          target="_blank"
                          rel="noreferrer"
                          className="opacity-0 group-hover:opacity-100 text-slate-400 hover:text-slate-700 p-0.5 transition-opacity"
                          title="Open URL in new tab"
                        >
                          <ExternalLink className="w-3.5 h-3.5" />
                        </a>
                      </div>
                    </td>

                    {/* Status Display: VALID or NO */}
                    <td className="py-3.5 px-4 text-center">
                      {item.status === 'valid' ? (
                        <div className="inline-flex items-center gap-1 px-3 py-1 rounded-full text-xs font-bold bg-emerald-100 text-emerald-800 border border-emerald-300 shadow-2xs">
                          <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
                          <span>VALID</span>
                        </div>
                      ) : item.status === 'no' ? (
                        <div className="inline-flex items-center gap-1 px-3.5 py-1 rounded-full text-xs font-black bg-rose-100 text-rose-800 border border-rose-300 shadow-2xs tracking-wide">
                          <XCircle className="w-3.5 h-3.5 text-rose-600" />
                          <span>NO</span>
                        </div>
                      ) : item.status === 'checking' ? (
                        <div className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-semibold bg-amber-100 text-amber-800 border border-amber-300 animate-pulse">
                          <Loader2 className="w-3.5 h-3.5 animate-spin text-amber-600" />
                          <span>Checking</span>
                        </div>
                      ) : (
                        <span className="inline-block px-2.5 py-0.5 rounded-full text-[11px] font-medium bg-slate-100 text-slate-600">
                          Pending
                        </span>
                      )}
                    </td>

                    {/* Product Image (Requirement: If valid product found, display product image; if not found, display NO) */}
                    <td className="py-3.5 px-4 text-center">
                      {item.status === 'valid' && proxiedSrc ? (
                        <div className="flex items-center justify-center">
                          <button
                            type="button"
                            onClick={() => onOpenImageModal(item)}
                            className="group relative w-14 h-14 rounded-lg bg-white border border-slate-200 overflow-hidden shadow-2xs hover:shadow-md hover:border-amber-400 transition-all p-1 flex items-center justify-center cursor-zoom-in"
                            title="Click to view full image"
                          >
                            <img
                              src={proxiedSrc}
                              alt={item.title || item.asin}
                              className="max-h-full max-w-full object-contain group-hover:scale-110 transition-transform duration-200"
                              onError={(e) => {
                                if (item.imageUrl) {
                                  (e.currentTarget as HTMLImageElement).src = item.imageUrl;
                                }
                              }}
                            />
                            <div className="absolute inset-0 bg-black/30 opacity-0 group-hover:opacity-100 flex items-center justify-center transition-opacity">
                              <Eye className="w-4 h-4 text-white drop-shadow" />
                            </div>
                          </button>
                        </div>
                      ) : item.status === 'valid' ? (
                        <span className="text-[11px] text-slate-400 italic">No image returned</span>
                      ) : item.status === 'no' ? (
                        <div className="flex flex-col items-center justify-center text-rose-600">
                          <span className="text-xs font-black bg-rose-50 px-2 py-0.5 rounded border border-rose-200">
                            NO
                          </span>
                        </div>
                      ) : (
                        <div className="w-10 h-10 mx-auto rounded-lg bg-slate-100 border border-dashed border-slate-200 flex items-center justify-center text-slate-300">
                          <ImageIcon className="w-4 h-4" />
                        </div>
                      )}
                    </td>

                    {/* Product Title & Details */}
                    <td className="py-3.5 px-4">
                      {item.title ? (
                        <div className="space-y-1">
                          <p className="font-semibold text-slate-800 line-clamp-2 leading-tight">
                            {item.title}
                          </p>
                          <div className="flex items-center gap-2">
                            {item.price && (
                              <span className="text-[11px] font-bold text-amber-700 bg-amber-50 px-1.5 py-0.5 rounded border border-amber-200">
                                {item.price}
                              </span>
                            )}
                            <span className="text-[10px] text-slate-400">
                              {item.reason}
                            </span>
                          </div>
                        </div>
                      ) : item.status === 'no' ? (
                        <div className="text-slate-500">
                          <span className="text-xs text-rose-700 font-medium block">
                            No product found
                          </span>
                          <span className="text-[11px] text-slate-400">
                            {item.reason}
                          </span>
                        </div>
                      ) : (
                        <span className="text-slate-400 text-xs italic">
                          {item.status === 'checking' ? 'Inspecting page content...' : 'Waiting in queue...'}
                        </span>
                      )}
                    </td>

                    {/* Actions */}
                    <td className="py-3.5 px-4 text-right">
                      <div className="flex items-center justify-end gap-1">
                        <button
                          type="button"
                          disabled={isChecking}
                          onClick={() => onRecheckSingle(item.id)}
                          className="p-1.5 text-slate-400 hover:text-amber-600 hover:bg-slate-100 rounded-lg transition-colors disabled:opacity-40"
                          title="Re-check this URL"
                        >
                          <RefreshCw className="w-3.5 h-3.5" />
                        </button>

                        <a
                          href={item.url}
                          target="_blank"
                          rel="noreferrer"
                          className="p-1.5 text-slate-400 hover:text-blue-600 hover:bg-slate-100 rounded-lg transition-colors"
                          title="Visit page on Amazon"
                        >
                          <ExternalLink className="w-3.5 h-3.5" />
                        </a>

                        <button
                          type="button"
                          disabled={isChecking}
                          onClick={() => onDeleteItem(item.id)}
                          className="p-1.5 text-slate-400 hover:text-rose-600 hover:bg-slate-100 rounded-lg transition-colors disabled:opacity-40"
                          title="Delete"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      ) : (
        /* GRID / CARDS VIEW */
        <div className="p-5 grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4 bg-slate-50/50">
          {filteredItems.map((item) => {
            const proxiedSrc = item.imageUrl 
              ? `/api/proxy-image?url=${encodeURIComponent(item.imageUrl)}`
              : null;

            return (
              <div
                key={item.id}
                className="bg-white rounded-xl border border-slate-200 overflow-hidden shadow-2xs hover:shadow-md transition-all flex flex-col"
              >
                {/* Image or NO Box */}
                <div className="relative h-44 bg-slate-50 flex items-center justify-center p-3 border-b border-slate-100">
                  {/* Status Overlay Badge */}
                  <div className="absolute top-2 left-2 z-10">
                    {item.status === 'valid' ? (
                      <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-bold bg-emerald-100 text-emerald-800 border border-emerald-300">
                        <CheckCircle2 className="w-3 h-3 text-emerald-600" />
                        VALID
                      </span>
                    ) : item.status === 'no' ? (
                      <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-black bg-rose-100 text-rose-800 border border-rose-300">
                        <XCircle className="w-3 h-3 text-rose-600" />
                        NO
                      </span>
                    ) : (
                      <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium bg-slate-100 text-slate-600">
                        Pending
                      </span>
                    )}
                  </div>

                  {/* ASIN Pill */}
                  <div className="absolute top-2 right-2 z-10">
                    <span className="text-[10px] font-mono font-bold bg-white/90 backdrop-blur-xs px-2 py-0.5 rounded border border-slate-200 text-slate-700 shadow-2xs">
                      {item.asin}
                    </span>
                  </div>

                  {item.status === 'valid' && proxiedSrc ? (
                    <button
                      type="button"
                      onClick={() => onOpenImageModal(item)}
                      className="w-full h-full flex items-center justify-center group cursor-zoom-in"
                    >
                      <img
                        src={proxiedSrc}
                        alt={item.title || item.asin}
                        className="max-h-full max-w-full object-contain group-hover:scale-105 transition-transform"
                        onError={(e) => {
                          if (item.imageUrl) {
                            (e.currentTarget as HTMLImageElement).src = item.imageUrl;
                          }
                        }}
                      />
                    </button>
                  ) : item.status === 'no' ? (
                    <div className="flex flex-col items-center justify-center text-center p-3">
                      <div className="w-12 h-12 rounded-full bg-rose-100 text-rose-600 flex items-center justify-center mb-2 font-black text-lg">
                        NO
                      </div>
                      <span className="text-xs font-bold text-rose-700">Product Not Found</span>
                      <span className="text-[10px] text-slate-400 mt-1 line-clamp-2">{item.reason}</span>
                    </div>
                  ) : (
                    <div className="flex flex-col items-center justify-center text-slate-300">
                      <ImageIcon className="w-8 h-8 mb-1" />
                      <span className="text-[11px] text-slate-400">Waiting to check</span>
                    </div>
                  )}
                </div>

                {/* Card Content */}
                <div className="p-3.5 flex-1 flex flex-col justify-between space-y-2">
                  <div>
                    <h4 className="text-xs font-semibold text-slate-900 line-clamp-2 leading-snug">
                      {item.title || (item.status === 'no' ? 'No product listing found' : `ASIN: ${item.asin}`)}
                    </h4>
                    {item.price && (
                      <p className="text-xs font-bold text-amber-600 mt-1">
                        {item.price}
                      </p>
                    )}
                  </div>

                  <div className="pt-2 border-t border-slate-100 flex items-center justify-between">
                    <a
                      href={item.url}
                      target="_blank"
                      rel="noreferrer"
                      className="inline-flex items-center gap-1 text-[11px] font-medium text-blue-600 hover:text-blue-800 truncate"
                    >
                      <ExternalLink className="w-3 h-3 shrink-0" />
                      <span className="truncate">Amazon Page</span>
                    </a>

                    <div className="flex items-center gap-1">
                      <button
                        type="button"
                        onClick={() => onRecheckSingle(item.id)}
                        className="p-1 text-slate-400 hover:text-amber-600 rounded"
                        title="Recheck"
                      >
                        <RefreshCw className="w-3 h-3" />
                      </button>
                      <button
                        type="button"
                        onClick={() => onDeleteItem(item.id)}
                        className="p-1 text-slate-400 hover:text-rose-600 rounded"
                        title="Delete"
                      >
                        <Trash2 className="w-3 h-3" />
                      </button>
                    </div>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
};
