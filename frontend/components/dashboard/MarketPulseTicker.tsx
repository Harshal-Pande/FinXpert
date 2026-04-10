'use client';

import { MarketPulse } from '@/lib/api/dashboard';
import { ArrowUpRight, ArrowDownRight } from 'lucide-react';

export default function MarketPulseTicker({ data }: { data: MarketPulse[] }) {
  if (!data || data.length === 0) return null;

  return (
    <div className="w-full bg-slate-900 text-white py-2 overflow-hidden whitespace-nowrap rounded-t-3xl border-b border-slate-800">
      <div className="flex animate-marquee gap-12 px-6">
        {[...data, ...data].map((item, i) => (
          <div key={i} className="flex items-center gap-3">
            <span className="text-[10px] font-bold tracking-widest text-slate-400 uppercase">{item.name}</span>
            <span className="text-xs font-mono font-bold">{item.value}</span>
            <span className={`flex items-center text-[10px] font-bold ${item.trend === 'up' ? 'text-emerald-400' : 'text-red-400'}`}>
              {item.trend === 'up' ? <ArrowUpRight className="h-3 w-3" /> : <ArrowDownRight className="h-3 w-3" />}
              {item.pc}
            </span>
          </div>
        ))}
      </div>
    </div>
  );
}
