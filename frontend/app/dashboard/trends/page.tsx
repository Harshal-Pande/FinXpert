'use client';

import { useEffect, useState } from 'react';
import { Clock, Filter, Globe, Home, Layers, Zap } from 'lucide-react';
import { getMarketNews, MarketEvent } from '@/lib/api/market';
import Breadcrumb from '@/components/layout/Breadcrumb';

type CategoryFilter = 'All' | 'Global' | 'Domestic' | 'Sector-wise';

export default function TrendsPage() {
  const [news, setNews] = useState<MarketEvent[]>([]);
  const [filteredNews, setFilteredNews] = useState<MarketEvent[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<CategoryFilter>('All');
  const [lastUpdated, setLastUpdated] = useState<string>('');

  const fetchNews = async () => {
    try {
      const data = await getMarketNews();
      setNews(data);
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

  useEffect(() => {
    if (filter === 'All') {
      setFilteredNews(news);
    } else {
      setFilteredNews(news.filter((item) => item.category === filter));
    }
  }, [filter, news]);

  const getImpactColor = (impact: string) => {
    switch (impact) {
      case 'High': return 'text-red-600 bg-red-50 border-red-100';
      case 'Med': return 'text-amber-600 bg-amber-50 border-amber-100';
      case 'Low': return 'text-blue-600 bg-blue-50 border-blue-100';
      default: return 'text-slate-600 bg-slate-50 border-slate-100';
    }
  };

  const getCategoryIcon = (category: string) => {
    switch (category) {
      case 'Global': return <Globe className="h-4 w-4" />;
      case 'Domestic': return <Home className="h-4 w-4" />;
      case 'Sector-wise': return <Layers className="h-4 w-4" />;
      default: return null;
    }
  };

  return (
    <div className="min-h-screen bg-slate-50 p-8 flex justify-center font-sans text-slate-800">
      <div className="w-full max-w-5xl border-2 border-slate-800 rounded-3xl p-8 relative bg-white">
        
        {/* Title over border trick */}
        <div className="absolute -top-4 left-10 bg-white px-2 text-xl font-medium tracking-wide">
          Market Trends & News
        </div>

        <div className="mb-8">
          <Breadcrumb />
          <p className="mt-2 text-sm text-slate-500">Live feed of global and domestic market events. Updated every 5 minutes.</p>
        </div>

        {/* Filters and Refresh Info */}
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 mb-8">
          <div className="flex flex-wrap items-center gap-2">
            {(['All', 'Global', 'Domestic', 'Sector-wise'] as CategoryFilter[]).map((cat) => (
              <button
                key={cat}
                onClick={() => setFilter(cat)}
                className={`px-4 py-2 rounded-xl text-sm font-semibold transition-all ${
                  filter === cat 
                    ? 'bg-slate-800 text-white' 
                    : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                }`}
              >
                {cat}
              </button>
            ))}
          </div>
          <div className="flex items-center gap-2 text-xs text-slate-400">
            <Clock className="h-3 w-3" />
            Last updated: {lastUpdated}
          </div>
        </div>

        {/* News Feed */}
        <div className="space-y-6">
          {loading ? (
            <div className="flex flex-col items-center justify-center py-20 gap-4">
              <div className="h-10 w-10 animate-spin rounded-full border-2 border-slate-800 border-t-transparent" />
              <p className="text-sm font-medium text-slate-400 font-mono italic">FETCHING RECENT EVENTS...</p>
            </div>
          ) : filteredNews.length > 0 ? (
            filteredNews.map((event, index) => (
              <div 
                key={index} 
                className="group relative border-2 border-slate-100 rounded-2xl p-6 hover:border-slate-800 transition-all bg-white hover:shadow-xl hover:-translate-y-1"
              >
                <div className="flex flex-col md:flex-row md:items-start justify-between gap-4">
                  <div className="flex-1">
                    <div className="flex items-center gap-3 mb-2">
                      <span className={`flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[10px] font-bold uppercase border-2 ${getImpactColor(event.impact)}`}>
                        <Zap className="h-3 w-3" />
                        {event.impact} IMPACT
                      </span>
                      <span className="flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-slate-100 text-slate-600 text-[10px] font-bold uppercase">
                        {getCategoryIcon(event.category)}
                        {event.category}
                      </span>
                      <span className="text-[10px] font-medium text-slate-400 flex items-center gap-1">
                        <Clock className="h-3 w-3" />
                        {new Date(event.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                      </span>
                    </div>
                    <h3 className="text-lg font-bold text-slate-800 group-hover:text-indigo-600 transition-colors uppercase tracking-tight">
                      {event.title}
                    </h3>
                    <p className="mt-2 text-sm text-slate-600 leading-relaxed font-medium">
                      {event.summary}
                    </p>
                  </div>
                </div>
              </div>
            ))
          ) : (
            <div className="text-center py-20 border-2 border-dashed border-slate-200 rounded-3xl">
              <p className="text-slate-400 font-medium italic">No news events found for this category.</p>
            </div>
          )}
        </div>

        {/* Advisor Confidence Footer */}
        <div className="mt-12 text-center">
          <p className="text-[10px] font-bold text-slate-300 uppercase tracking-widest">
            FINXPERT MARKET INTELLIGENCE • REAL-TIME FEED • {lastUpdated}
          </p>
        </div>
      </div>
    </div>
  );
}
