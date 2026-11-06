import React from 'react';
import { CheckCircle2, XCircle, Clock, Link2, Loader2 } from 'lucide-react';
import { CheckStats } from '../types';

interface StatsCardsProps {
  stats: CheckStats;
  isChecking: boolean;
  progressPercent: number;
}

export const StatsCards: React.FC<StatsCardsProps> = ({ stats, isChecking, progressPercent }) => {
  const processed = stats.valid + stats.no;
  const validRate = processed > 0 ? Math.round((stats.valid / processed) * 100) : 0;
  const noRate = processed > 0 ? Math.round((stats.no / processed) * 100) : 0;

  return (
    <div className="space-y-3">
      {/* Real-time Progress Bar */}
      {isChecking && (
        <div className="bg-white p-4 rounded-xl border border-amber-200/80 shadow-sm transition-all">
          <div className="flex items-center justify-between text-xs font-semibold mb-2">
            <span className="flex items-center gap-2 text-amber-700">
              <Loader2 className="w-4 h-4 animate-spin text-amber-600" />
              Checking Amazon URLs in progress ({processed}/{stats.total})
            </span>
            <span className="text-slate-600">{progressPercent}% Completed</span>
          </div>
          <div className="w-full bg-slate-100 rounded-full h-2.5 overflow-hidden">
            <div 
              className="bg-gradient-to-r from-amber-500 to-amber-600 h-2.5 rounded-full transition-all duration-300" 
              style={{ width: `${progressPercent}%` }}
            />
          </div>
        </div>
      )}

      {/* Grid of Metric Cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        {/* Total URLs */}
        <div className="bg-white p-4 rounded-xl border border-slate-200/80 shadow-xs flex items-center gap-3">
          <div className="w-10 h-10 rounded-lg bg-blue-50 text-blue-600 flex items-center justify-center shrink-0">
            <Link2 className="w-5 h-5" />
          </div>
          <div>
            <p className="text-xs font-medium text-slate-500 uppercase tracking-wider">Total URLs</p>
            <p className="text-2xl font-bold text-slate-900">{stats.total}</p>
          </div>
        </div>

        {/* Valid Products */}
        <div className="bg-white p-4 rounded-xl border border-emerald-200/70 shadow-xs flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-lg bg-emerald-50 text-emerald-600 flex items-center justify-center shrink-0">
              <CheckCircle2 className="w-5 h-5" />
            </div>
            <div>
              <p className="text-xs font-medium text-emerald-700 uppercase tracking-wider">Valid Products</p>
              <div className="flex items-baseline gap-1.5">
                <p className="text-2xl font-bold text-emerald-700">{stats.valid}</p>
                {processed > 0 && (
                  <span className="text-xs text-emerald-600 font-medium">({validRate}%)</span>
                )}
              </div>
            </div>
          </div>
          <span className="text-xs font-semibold px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-800">
            Image Shown
          </span>
        </div>

        {/* Not Found / NO */}
        <div className="bg-white p-4 rounded-xl border border-rose-200/70 shadow-xs flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-lg bg-rose-50 text-rose-600 flex items-center justify-center shrink-0">
              <XCircle className="w-5 h-5" />
            </div>
            <div>
              <p className="text-xs font-medium text-rose-700 uppercase tracking-wider">Invalid / NO</p>
              <div className="flex items-baseline gap-1.5">
                <p className="text-2xl font-bold text-rose-700">{stats.no}</p>
                {processed > 0 && (
                  <span className="text-xs text-rose-600 font-medium">({noRate}%)</span>
                )}
              </div>
            </div>
          </div>
          <span className="text-xs font-semibold px-2 py-0.5 rounded-full bg-rose-100 text-rose-800">
            Display NO
          </span>
        </div>

        {/* Pending / Queue */}
        <div className="bg-white p-4 rounded-xl border border-slate-200/80 shadow-xs flex items-center gap-3">
          <div className="w-10 h-10 rounded-lg bg-slate-100 text-slate-500 flex items-center justify-center shrink-0">
            <Clock className="w-5 h-5" />
          </div>
          <div>
            <p className="text-xs font-medium text-slate-500 uppercase tracking-wider">Queue / Pending</p>
            <p className="text-2xl font-bold text-slate-700">{stats.pending + stats.checking}</p>
          </div>
        </div>
      </div>
    </div>
  );
};
