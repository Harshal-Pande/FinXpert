'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { Zap, Clock, ChevronRight } from 'lucide-react';
import { getMarketNews, MarketEvent } from '@/lib/api/market';

export default function MarketHighlights() {
  const [news, setNews] = useState<MarketEvent[]>([]);
  const [loading, setLoading] = useState(true);
  const [lastUpdated, setLastUpdated] = useState<string>('');

  const fetchNews = async () => {
    try {
      const data = await getMarketNews();
      setNews(data.slice(0, 3));
      setLastUpdated(new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }));
    } catch (error) {
      console.error('Failed to fetch market news:', error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchNews();
    const interval = setInterval(fetchNews, 300000); // 5 minutes
    return () => clearInterval(interval);
  }, []);

  const getImpactColor = (impact: string) => {
    switch (impact) {
      case 'High': return 'text-red-600 bg-red-50';
      case 'Med': return 'text-amber-600 bg-amber-50';
      case 'Low': return 'text-blue-600 bg-blue-50';
      default: return 'text-slate-600 bg-slate-50';
    }
  };

  if (loading) {
    return (
      <div className="flex h-40 items-center justify-center rounded-3xl border-2 border-slate-800 p-6">
        <div className="h-6 w-6 animate-spin rounded-full border-2 border-slate-800 border-t-transparent" />
      </div>
    );
  }

  return (
    <div className="relative flex flex-col rounded-3xl border-2 border-slate-800 p-6 min-h-[220px]">
      <div className="absolute -top-3 left-1/2 -translate-x-1/2 bg-white px-4 text-sm font-semibold tracking-wide">
        Market Highlights
      </div>

      <div className="mt-4 flex flex-1 flex-col gap-4">
        {news.map((item, index) => (
          <div key={index} className="flex items-start gap-3">
            <div className="mt-1 flex h-4 w-4 shrink-0 items-center justify-center">
              {index === 0 ? (
                <div className="relative h-2 w-2 rounded-full bg-emerald-500">
                  <div className="absolute inset-0 animate-ping rounded-full bg-emerald-500 opacity-75" />
                </div>
              ) : (
                <div className="h-1.5 w-1.5 rounded-full bg-slate-300" />
              )}
            </div>
            <div className="flex-1">
              <div className="flex items-center gap-2">
                <p className="text-sm font-bold text-slate-800 line-clamp-1">{item.title}</p>
                <span className={`rounded-full px-1.5 py-0.5 text-[10px] font-bold ${getImpactColor(item.impact)}`}>
                  {item.impact}
                </span>
              </div>
              <p className="text-xs text-slate-500 line-clamp-1 mt-0.5">{item.summary}</p>
            </div>
          </div>
        ))}
      </div>

      <div className="mt-6 flex items-center justify-between border-t border-slate-100 pt-3">
        <p className="flex items-center gap-1 text-[10px] text-slate-400">
          <Clock className="h-3 w-3" />
          Last updated: {lastUpdated}
        </p>
        <Link 
          href="/dashboard/trends" 
          className="flex items-center gap-1 text-[10px] font-bold text-indigo-600 hover:text-indigo-800"
        >
          View Full Feed <ChevronRight className="h-3 w-3" />
        </Link>
      </div>
    </div>
  );
}
