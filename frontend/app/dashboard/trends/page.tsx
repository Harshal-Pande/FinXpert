'use client';

import { useCallback, useEffect, useState } from 'react';
import { Clock, Globe, Home, Layers, Zap } from 'lucide-react';
import {
  getMarketNewsFeed,
  toMarketEvent,
  type MarketNewsFeedResponse,
  type NewsFeedScope,
} from '@/lib/api/news';
import type { MarketEvent } from '@/lib/api/market';
import { ApiError } from '@/lib/api/client';
import Breadcrumb from '@/components/layout/Breadcrumb';

type CategoryFilter = NewsFeedScope;

function sentimentBadgeClass(s: MarketEvent['sentiment']): string {
  if (s === 'Positive') return 'bg-emerald-50 text-emerald-800 border-emerald-200';
  if (s === 'Negative') return 'bg-rose-50 text-rose-800 border-rose-200';
  return 'bg-slate-50 text-slate-600 border-slate-200';
}

function buildEmptyOrBanner(res: MarketNewsFeedResponse, hasItems: boolean): {
  feedEmptyMessage: string | null;
  demoBanner: string | null;
} {
  if (hasItems) {
    if (res.feedSource === 'fallback_no_api_key') {
      return {
        feedEmptyMessage: null,
        demoBanner:
          'Demo feed: NEWS_API_KEY is not set on the API server. Headlines include Positive / Negative / Neutral sentiment for UI testing.',
      };
    }
    if (res.feedSource === 'fallback_error') {
      return {
        feedEmptyMessage: null,
        demoBanner:
          'Demo feed: NewsAPI returned an error or rate limit. Check Render logs; use Retry after a few minutes.',
      };
    }
    return { feedEmptyMessage: null, demoBanner: null };
  }

  if (res.feedSource === 'empty_live') {
    return {
      feedEmptyMessage: `No articles matched this search (zero results). Query sent: "${res.queryUsed}". Try another scope or Retry — NewsAPI free tier often rate-limits.`,
      demoBanner: null,
    };
  }
  if (res.feedSource === 'fallback_no_api_key') {
    return {
      feedEmptyMessage:
        'NEWS_API_KEY is not set on the API server — the feed cannot load live headlines. Add NEWS_API_KEY on Render and redeploy.',
      demoBanner: null,
    };
  }
  if (res.feedSource === 'fallback_error') {
    return {
      feedEmptyMessage:
        'News provider error — no demo articles returned. Check Render logs for NewsAPI HTTP or auth errors, then Retry.',
      demoBanner: null,
    };
  }
  return {
    feedEmptyMessage: 'News feed returned no items.',
    demoBanner: null,
  };
}

export default function TrendsPage() {
  const [news, setNews] = useState<MarketEvent[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<CategoryFilter>('All');
  const [lastUpdated, setLastUpdated] = useState<string>('');

  const [feedError, setFeedError] = useState<string | null>(null);
  const [feedEmptyMessage, setFeedEmptyMessage] = useState<string | null>(null);
  const [demoBanner, setDemoBanner] = useState<string | null>(null);
  const [queryUsed, setQueryUsed] = useState<string>('');

  const loadFeed = useCallback(async (scope: CategoryFilter) => {
    setLoading(true);
    setFeedError(null);
    setFeedEmptyMessage(null);
    setDemoBanner(null);
    try {
      const res = await getMarketNewsFeed(20, scope);
      setQueryUsed(res.queryUsed);
      const mapped = res.items.map(toMarketEvent);
      setNews(mapped);

      const hasItems = mapped.length > 0;
      const { feedEmptyMessage: emptyMsg, demoBanner: banner } = buildEmptyOrBanner(res, hasItems);
      setFeedEmptyMessage(emptyMsg);
      setDemoBanner(banner);

      if (hasItems) {
        setLastUpdated(new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }));
      }
    } catch (e) {
      setNews([]);
      if (e instanceof ApiError) {
        if (e.status === 404 || e.status === 502 || e.status === 503 || e.status === 504) {
          setFeedError('Unable to reach news server.');
        } else {
          setFeedError(e.message || 'Unable to reach news server.');
        }
      } else {
        setFeedError('Unable to reach news server.');
      }
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void loadFeed(filter);
    const interval = setInterval(() => void loadFeed(filter), 300_000);
    return () => clearInterval(interval);
  }, [filter, loadFeed]);

  const getImpactColor = (impact: string) => {
    switch (impact) {
      case 'High':
        return 'text-red-600 bg-red-50 border-red-100';
      case 'Med':
        return 'text-amber-600 bg-amber-50 border-amber-100';
      case 'Low':
        return 'text-blue-600 bg-blue-50 border-blue-100';
      default:
        return 'text-slate-600 bg-slate-50 border-slate-100';
    }
  };

  const getCategoryIcon = (category: string) => {
    switch (category) {
      case 'Global':
        return <Globe className="h-4 w-4" />;
      case 'Domestic':
        return <Home className="h-4 w-4" />;
      case 'Sector-wise':
        return <Layers className="h-4 w-4" />;
      default:
        return null;
    }
  };

  return (
    <div className="min-h-screen bg-slate-50 p-8 flex justify-center font-sans text-slate-800">
      <div className="w-full max-w-5xl border-2 border-slate-800 rounded-3xl p-8 relative bg-white">
        <div className="absolute -top-4 left-10 bg-white px-2 text-xl font-medium tracking-wide">
          Market Trends & News
        </div>

        <div className="mb-8">
          <Breadcrumb />
          <p className="mt-2 text-sm text-slate-500">
            Live feed from NewsAPI via FinXpert. Each tab sends a different search query to the backend. Refreshes every 5
            minutes.
          </p>
          {queryUsed ? (
            <p className="mt-1 text-xs font-mono text-slate-500 break-all">Last query: {queryUsed}</p>
          ) : null}
          {feedError && (
            <p className="mt-3 text-sm text-amber-800 bg-amber-50 border border-amber-100 rounded-xl px-3 py-2">
              {feedError}
            </p>
          )}
          {demoBanner && !feedError && (
            <p className="mt-3 text-sm text-indigo-900 bg-indigo-50 border border-indigo-100 rounded-xl px-3 py-2">
              {demoBanner}
            </p>
          )}
          {feedEmptyMessage && !feedError && (
            <p className="mt-3 text-sm text-slate-700 bg-slate-50 border border-slate-200 rounded-xl px-3 py-2">
              {feedEmptyMessage}
            </p>
          )}
        </div>

        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 mb-8">
          <div className="flex flex-wrap items-center gap-2">
            {(['All', 'Global', 'Domestic', 'Sector-wise'] as CategoryFilter[]).map((cat) => (
              <button
                key={cat}
                type="button"
                onClick={() => setFilter(cat)}
                className={`px-4 py-2 rounded-xl text-sm font-semibold transition-all ${
                  filter === cat ? 'bg-slate-800 text-white' : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                }`}
              >
                {cat}
              </button>
            ))}
          </div>
          <div className="flex flex-wrap items-center gap-3">
            <button
              type="button"
              disabled={loading}
              onClick={() => void loadFeed(filter)}
              className="rounded-xl bg-indigo-600 px-4 py-2 text-xs font-bold text-white hover:bg-indigo-700 disabled:opacity-50 transition-all"
            >
              {loading ? 'Loading…' : 'Retry'}
            </button>
            <div className="flex items-center gap-2 text-xs text-slate-400">
              <Clock className="h-3 w-3" />
              Last updated: {lastUpdated || '—'}
            </div>
          </div>
        </div>

        <div className="space-y-6">
          {loading ? (
            <div className="flex flex-col items-center justify-center py-20 gap-4">
              <div className="h-10 w-10 animate-spin rounded-full border-2 border-slate-800 border-t-transparent" />
              <p className="text-sm font-medium text-slate-400 font-mono italic">FETCHING RECENT EVENTS...</p>
            </div>
          ) : news.length > 0 ? (
            news.map((event, index) => (
              <a
                key={`${event.url}-${index}`}
                href={event.url}
                target="_blank"
                rel="noopener noreferrer"
                className="group block relative border-2 border-slate-100 rounded-2xl p-6 hover:border-slate-800 transition-all bg-white hover:shadow-xl hover:-translate-y-1 text-left no-underline text-inherit"
              >
                <div className="flex flex-col md:flex-row md:items-start justify-between gap-4">
                  {event.thumbnail ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img
                      src={event.thumbnail}
                      alt=""
                      className="w-full md:w-40 h-36 md:h-28 object-cover rounded-xl shrink-0 border border-slate-100"
                    />
                  ) : null}
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-3 mb-2 flex-wrap">
                      <span
                        className={`flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[10px] font-bold uppercase border-2 ${getImpactColor(event.impact)}`}
                      >
                        <Zap className="h-3 w-3" />
                        {event.impact} IMPACT
                      </span>
                      {event.sentiment ? (
                        <span
                          className={`flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[10px] font-bold uppercase border ${sentimentBadgeClass(event.sentiment)}`}
                        >
                          {event.sentiment}
                        </span>
                      ) : null}
                      <span className="flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-slate-100 text-slate-600 text-[10px] font-bold uppercase">
                        {getCategoryIcon(event.category)}
                        {event.category}
                      </span>
                      <span className="text-[10px] font-medium text-slate-400 flex items-center gap-1">
                        <Clock className="h-3 w-3" />
                        {new Date(event.timestamp).toLocaleString([], {
                          dateStyle: 'medium',
                          timeStyle: 'short',
                        })}
                      </span>
                    </div>
                    <h3 className="text-lg font-bold text-slate-800 group-hover:text-indigo-600 transition-colors uppercase tracking-tight">
                      {event.title}
                    </h3>
                    {event.source ? <p className="mt-1 text-xs font-semibold text-slate-500">{event.source}</p> : null}
                    <p className="mt-2 text-sm text-slate-600 leading-relaxed font-medium">{event.summary}</p>
                  </div>
                </div>
              </a>
            ))
          ) : feedError ? (
            <div className="text-center py-20 border-2 border-dashed border-amber-100 rounded-3xl bg-amber-50/30 px-4 space-y-4">
              <p className="text-slate-800 font-medium">{feedError}</p>
              <button
                type="button"
                disabled={loading}
                onClick={() => void loadFeed(filter)}
                className="inline-flex rounded-xl bg-indigo-600 px-6 py-2 text-sm font-bold text-white hover:bg-indigo-700 disabled:opacity-50 transition-all"
              >
                Retry
              </button>
            </div>
          ) : feedEmptyMessage || demoBanner ? (
            <div className="text-center py-16 border-2 border-dashed border-slate-200 rounded-3xl space-y-4 px-4">
              {feedEmptyMessage ? <p className="text-slate-600 font-medium">{feedEmptyMessage}</p> : null}
              {demoBanner ? <p className="text-sm text-indigo-800">{demoBanner}</p> : null}
              <button
                type="button"
                disabled={loading}
                onClick={() => void loadFeed(filter)}
                className="inline-flex rounded-xl bg-indigo-600 px-6 py-2 text-sm font-bold text-white hover:bg-indigo-700 disabled:opacity-50 transition-all"
              >
                Retry fetch
              </button>
            </div>
          ) : (
            <div className="text-center py-20 border-2 border-dashed border-slate-200 rounded-3xl">
              <p className="text-slate-500 font-medium">Unable to reach news server.</p>
              <button
                type="button"
                disabled={loading}
                onClick={() => void loadFeed(filter)}
                className="mt-4 inline-flex rounded-xl bg-indigo-600 px-6 py-2 text-sm font-bold text-white hover:bg-indigo-700 disabled:opacity-50 transition-all"
              >
                Retry
              </button>
            </div>
          )}
        </div>

        <div className="mt-12 text-center">
          <p className="text-[10px] font-bold text-slate-300 uppercase tracking-widest">
            FINXPERT MARKET INTELLIGENCE • REAL-TIME FEED • {lastUpdated}
          </p>
        </div>
      </div>
    </div>
  );
}
