'use client';

import { useMarketIndices } from '@/components/dashboard/MarketIndicesProvider';
import { Minus, TrendingDown, TrendingUp } from 'lucide-react';

function CardSkeleton() {
  return (
    <div className="rounded-2xl border border-white/20 bg-white/60 backdrop-blur-md p-4 animate-pulse transition-shadow">
      <div className="h-3 w-16 bg-slate-200 rounded mb-3" />
      <div className="h-7 w-28 bg-slate-200 rounded mb-2" />
      <div className="h-3 w-20 bg-slate-200 rounded" />
    </div>
  );
}

export default function MarketOverviewCards() {
  const { indices, loading, isAiPowered, error } = useMarketIndices();

  if (loading && indices.length === 0) {
    return (
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <CardSkeleton />
        <CardSkeleton />
        <CardSkeleton />
      </div>
    );
  }

  if (error && indices.length === 0) {
    return (
      <div className="rounded-2xl border border-amber-100 bg-amber-50/90 px-4 py-3 text-[11px] text-amber-900">
        {error}
      </div>
    );
  }

  return (
    <div className="space-y-2">
      {error && indices.length > 0 && (
        <p className="text-[10px] text-amber-700 bg-amber-50/80 border border-amber-100 rounded-lg px-2 py-1">
          {error} Showing last successful values.
        </p>
      )}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        {indices.map((item) => (
          <div
            key={item.name}
            className="rounded-2xl border border-white/20 bg-white/70 backdrop-blur-md shadow-[0_8px_32px_0_rgba(31,38,135,0.07)] p-4 transition-all duration-300 hover:shadow-lg hover:-translate-y-0.5"
          >
            <div className="flex items-center justify-between mb-1">
              <p className="text-[10px] font-bold uppercase tracking-widest text-slate-400">
                {item.name}
              </p>
              {isAiPowered && (
                <div className="flex items-center gap-1 scale-75 origin-right">
                  <div className="h-1.5 w-1.5 rounded-full bg-indigo-500 animate-pulse" />
                  <span className="text-[8px] font-black uppercase text-indigo-400">AI Live</span>
                </div>
              )}
            </div>
            <p className="text-lg font-black text-slate-900 tabular-nums mb-1">{item.value}</p>
            <div className="flex items-center gap-1.5">
              {item.trend === 'up' ? (
                <TrendingUp className="h-4 w-4 text-emerald-600" aria-hidden />
              ) : item.trend === 'down' ? (
                <TrendingDown className="h-4 w-4 text-red-500" aria-hidden />
              ) : (
                <Minus className="h-4 w-4 text-slate-400" aria-hidden />
              )}
              <span
                className={`text-xs font-bold tabular-nums ${
                  item.trend === 'up'
                    ? 'text-emerald-600'
                    : item.trend === 'down'
                      ? 'text-red-600'
                      : 'text-slate-500'
                }`}
              >
                {item.pc}
                {item.trend === 'flat' ? (
                  <span className="ml-1 font-normal text-slate-400">unch.</span>
                ) : null}
              </span>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
