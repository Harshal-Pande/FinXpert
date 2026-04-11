'use client';

import { useMarketIndices } from '@/components/dashboard/MarketIndicesProvider';
import { ArrowDownRight, ArrowUpRight, Minus } from 'lucide-react';

export default function MarketPulseTicker() {
  const { indices, loading } = useMarketIndices();

  if (loading && indices.length === 0) {
    return (
      <div className="w-full bg-slate-900 text-white py-2.5 overflow-hidden rounded-t-3xl border-b border-slate-800">
        <div className="mx-6 h-4 rounded bg-slate-700/60 animate-pulse" aria-hidden />
      </div>
    );
  }

  if (!indices.length) return null;

  return (
    <div className="w-full bg-slate-900 text-white py-2 overflow-hidden whitespace-nowrap rounded-t-3xl border-b border-slate-800">
      <div className="flex animate-marquee gap-12 px-6">
        {[...indices, ...indices].map((item, i) => (
          <div key={`${item.name}-${i}`} className="flex items-center gap-3">
            <span className="text-[10px] font-bold tracking-widest text-slate-400 uppercase">
              {item.name}
            </span>
            <span className="text-xs font-mono font-bold tabular-nums">{item.value}</span>
            <span
              className={`flex items-center gap-0.5 text-[10px] font-bold ${
                item.trend === 'up'
                  ? 'text-emerald-400'
                  : item.trend === 'down'
                    ? 'text-red-400'
                    : 'text-slate-400'
              }`}
            >
              {item.trend === 'up' ? (
                <ArrowUpRight className="h-3 w-3 shrink-0" aria-hidden />
              ) : item.trend === 'down' ? (
                <ArrowDownRight className="h-3 w-3 shrink-0" aria-hidden />
              ) : (
                <Minus className="h-3 w-3 shrink-0" aria-hidden />
              )}
              {item.pc}
            </span>
          </div>
        ))}
      </div>
    </div>
  );
}
