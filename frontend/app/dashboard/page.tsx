'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import {
  Users,
  Zap,
  DollarSign,
  ShieldCheck,
  Clock,
  ChevronRight,
  Zap as ZapIcon,
} from 'lucide-react';
import { getDashboardSummary, type DashboardSummary } from '@/lib/api/dashboard';
import { getAdvisorAumHistory, type AumHistoryPoint } from '@/lib/api/portfolio-history';
import { getMarketNewsFeed, toMarketEvent } from '@/lib/api/news';
import type { MarketEvent } from '@/lib/api/market';
import { ApiError } from '@/lib/api/client';
import {
  AreaChart, Area, XAxis, YAxis, CartesianGrid,
  Tooltip, ResponsiveContainer
} from 'recharts';
import MarketPulseTicker from '@/components/dashboard/MarketPulseTicker';
import MarketOverviewCards from '@/components/dashboard/MarketOverviewCards';
import { MarketIndicesProvider } from '@/components/dashboard/MarketIndicesProvider';
import ActionCenter from '@/components/dashboard/ActionCenter';

/** Auto-refresh market news (5–10 items from `/api/news/market`). */
const NEWS_REFRESH_MS = 180_000;

// --- GlassCard Wrapper Component ---
function GlassCard({ title, children, className = "", subtitle }: { title?: string, children: React.ReactNode, className?: string, subtitle?: string }) {
  return (
    <div className={`relative flex flex-col rounded-3xl border border-white/20 bg-white/70 backdrop-blur-md shadow-[0_8px_32px_0_rgba(31,38,135,0.07)] p-6 ${className}`}>
      {title && (
        <div className="absolute -top-3 left-8 bg-white/90 backdrop-blur-md border border-slate-200 px-3 py-0.5 rounded-full text-[11px] font-bold uppercase tracking-wider text-slate-500 shadow-sm z-10">
          {title}
        </div>
      )}
      {subtitle && <p className="text-[10px] text-slate-400 font-medium -mt-2 mb-4 uppercase tracking-tighter">{subtitle}</p>}
      <div className="flex-1">
        {children}
      </div>
    </div>
  );
}

export default function DashboardPage() {
  const [summary, setSummary] = useState<DashboardSummary | null>(null);
  const [loading, setLoading] = useState(true);
  const [dashboardError, setDashboardError] = useState<string | null>(null);
  const [aumHistory, setAumHistory] = useState<AumHistoryPoint[]>([]);
  const [lastUpdated, setLastUpdated] = useState<string>('');
  const [marketFeed, setMarketFeed] = useState<MarketEvent[]>([]);
  const [newsLoading, setNewsLoading] = useState(true);
  const [newsError, setNewsError] = useState<string | null>(null);
  const [newsUpdated, setNewsUpdated] = useState<string>('');

  const fetchDashboardData = async () => {
    setDashboardError(null);
    try {
      const [sum, aum] = await Promise.all([
        getDashboardSummary(),
        getAdvisorAumHistory(),
      ]);
      setSummary(sum);
      setAumHistory(aum);
      setLastUpdated(new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }));
    } catch {
      setDashboardError('We could not refresh dashboard metrics. Charts may be out of date.');
    } finally {
      setLoading(false);
    }
  };

  const fetchNews = useCallback(async () => {
    setNewsError(null);
    setNewsLoading(true);
    try {
      const res = await getMarketNewsFeed(10, 'All');
      if (res.items.length === 0) {
        setMarketFeed([]);
        setNewsError(
          res.feedSource === 'fallback_no_api_key'
            ? 'News: demo mode — NEWS_API_KEY is not set on the server.'
            : res.feedSource === 'empty_live'
              ? `News: no articles for query "${res.queryUsed}". Check NewsAPI / rate limits.`
              : 'News feed returned no articles. Check NEXT_PUBLIC_API_URL and Render logs.',
        );
        return;
      }
      setMarketFeed(res.items.map(toMarketEvent));
      if (res.feedSource !== 'live') {
        setNewsError(
          res.feedSource === 'fallback_no_api_key'
            ? 'Showing demo headlines (NEWS_API_KEY not set on server).'
            : 'Showing demo headlines (NewsAPI error or rate limit).',
        );
      }
      setNewsUpdated(new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }));
    } catch (e) {
      if (e instanceof ApiError) {
        if (e.status === 404 || e.status === 502 || e.status === 503 || e.status === 504) {
          setNewsError('Unable to reach news server.');
        } else {
          setNewsError(e.message || 'Unable to reach news server.');
        }
      } else {
        setNewsError('Unable to reach news server.');
      }
    } finally {
      setNewsLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchDashboardData();
    const interval = setInterval(fetchDashboardData, 300000);
    return () => clearInterval(interval);
  }, []);

  useEffect(() => {
    fetchNews();
    const interval = setInterval(fetchNews, NEWS_REFRESH_MS);
    return () => clearInterval(interval);
  }, [fetchNews]);

  const formatInr = (v: number) =>
    new Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR', notation: 'compact', maximumFractionDigits: 1 }).format(v);

  const chartData = useMemo(() => aumHistory.map((p) => ({ ...p })), [aumHistory]);

  const aumPeriodStats = useMemo(() => {
    if (aumHistory.length < 2) return { changePct: null as number | null, first: null as number | null, last: null as number | null };
    const first = aumHistory[0].totalValue;
    const last = aumHistory[aumHistory.length - 1].totalValue;
    if (first <= 0) return { changePct: null, first, last };
    const changePct = ((last - first) / first) * 100;
    return { changePct, first, last };
  }, [aumHistory]);

  if (loading && !summary) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-slate-50">
        <div className="h-10 w-10 animate-spin rounded-full border-2 border-slate-800 border-t-transparent" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-50 p-8 flex justify-center font-sans text-slate-800">

      <div className="w-full max-w-6xl relative flex flex-col">
        {dashboardError && (
          <p className="mb-4 rounded-xl border border-amber-100 bg-amber-50 px-3 py-2 text-xs text-amber-900">
            {dashboardError}
          </p>
        )}

        <MarketIndicesProvider>
          <div className="mb-6">
            <MarketPulseTicker />
          </div>

          <GlassCard title="Market Overview" className="mb-8">
            <p className="text-[10px] text-slate-400 font-medium uppercase tracking-tighter mb-4 pt-2">
              Sensex, Nifty &amp; gold — live values, refresh about every 50s
            </p>
            <MarketOverviewCards />
          </GlassCard>
        </MarketIndicesProvider>

        {/* Executive Ribbon */}
        <div className="grid grid-cols-3 gap-6 mb-8">
          <GlassCard className="p-4" subtitle="Client Base">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-2xl font-black">{summary?.totalClients ?? 0}</p>
                <p className="text-[10px] font-bold text-slate-400 uppercase">Active Retainers</p>
              </div>
              <Users className="h-8 w-8 text-indigo-500 opacity-20" />
            </div>
          </GlassCard>

          <GlassCard className="p-4" subtitle="Total Equity Under Management">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-2xl font-black">{formatInr(summary?.totalAUM ?? 0)}</p>
                <p className="text-[10px] font-bold text-slate-400 uppercase">Managed Assets (INR)</p>
              </div>
              <DollarSign className="h-8 w-8 text-emerald-500 opacity-20" />
            </div>
          </GlassCard>

          <GlassCard className="p-4" subtitle="Portfolio Quality Index">
            <div className="flex items-center justify-between">
              <div>
                <div className="flex items-baseline gap-1">
                  <p className="text-2xl font-black">{(summary?.avgHealthScore ?? 0).toFixed(1)}</p>
                  <span className="text-[10px] font-bold text-slate-400">/ 10</span>
                </div>
                <p className="text-[10px] font-bold text-slate-400 uppercase">Avg Advisor Score</p>
              </div>
              <ShieldCheck className="h-8 w-8 text-blue-500 opacity-20" />
            </div>
          </GlassCard>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">

          {/* Main Chart Column */}
          <div className="lg:col-span-2 space-y-8">

            {/* Box: Dynamic Total AUM History */}
            <GlassCard title="Total AUM History" className="min-h-[350px]">
              <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between mb-6 pt-4">
                <p className="text-xs text-slate-500">
                  Aggregated portfolio value from advisor snapshots (same source as client history).
                </p>
                {aumPeriodStats.changePct != null ? (
                  <p
                    className={`text-xs font-bold tabular-nums shrink-0 ${
                      aumPeriodStats.changePct >= 0 ? 'text-emerald-700' : 'text-red-700'
                    }`}
                  >
                    Chart period: {aumPeriodStats.changePct >= 0 ? '+' : ''}
                    {aumPeriodStats.changePct.toFixed(2)}% ({formatInr(aumPeriodStats.first!)} →{' '}
                    {formatInr(aumPeriodStats.last!)})
                  </p>
                ) : (
                  <p className="text-xs text-slate-400 shrink-0">Add more months of history to see period change.</p>
                )}
              </div>

              <div className="w-full h-64">
                <ResponsiveContainer width="100%" height="100%">
                  <AreaChart data={chartData}>
                    <defs>
                      <linearGradient id="aumGradient" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor="#4f46e5" stopOpacity={0.15} />
                        <stop offset="95%" stopColor="#4f46e5" stopOpacity={0} />
                      </linearGradient>
                    </defs>
                    <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                    <XAxis dataKey="month" axisLine={false} tickLine={false} tick={{ fontSize: 10, fill: '#94a3b8' }} />
                    <YAxis axisLine={false} tickLine={false} tick={{ fontSize: 10, fill: '#94a3b8' }} tickFormatter={(v) => formatInr(v)} />
                    <Tooltip
                      contentStyle={{ borderRadius: '16px', border: 'none', boxShadow: '0 10px 25px rgba(0,0,0,0.1)' }}
                      formatter={(v: number) => [formatInr(v), 'Total AUM']}
                    />
                    <Area
                      type="monotone"
                      dataKey="totalValue"
                      name="Portfolio AUM"
                      stroke="#4f46e5"
                      strokeWidth={3}
                      fill="url(#aumGradient)"
                      dot={{ r: 4, fill: '#4f46e5', strokeWidth: 0 }}
                    />
                  </AreaChart>
                </ResponsiveContainer>
              </div>
            </GlassCard>

            {/* Strategic Insights */}
            <GlassCard title="Strategic Insights" className="min-h-[220px]">
              {(!summary?.strategicInsights || summary.strategicInsights.length === 0) ? (
                <div className="flex flex-col items-center justify-center py-10 gap-3 border-2 border-dashed border-slate-100 rounded-3xl mt-6">
                  <div className="h-10 w-10 rounded-full bg-slate-50 flex items-center justify-center">
                    <ZapIcon className="h-5 w-5 text-slate-300" />
                  </div>
                  <p className="text-xs font-medium text-slate-400 text-center max-w-xs">
                    No portfolio or market-driven insights yet. Add clients, targets, and holdings to see allocation and risk guidance.
                  </p>
                </div>
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mt-8">
                  {summary.strategicInsights.map((insight, i) => {
                    const getTheme = (cat: string) => {
                      switch (cat) {
                        case 'RISK':
                          return { bg: 'bg-red-50', text: 'text-red-700', border: 'border-red-100', btn: 'Action required', icon: '🚨' };
                        case 'DEPLOY':
                          return { bg: 'bg-amber-50', text: 'text-amber-700', border: 'border-amber-100', btn: 'Review cash', icon: '💰' };
                        case 'EXPERT':
                          return { bg: 'bg-emerald-50', text: 'text-emerald-700', border: 'border-emerald-100', btn: 'View context', icon: '📰' };
                        case 'REBALANCE':
                          return { bg: 'bg-indigo-50', text: 'text-indigo-700', border: 'border-indigo-100', btn: 'Rebalance', icon: '⚖️' };
                        default:
                          return { bg: 'bg-slate-50', text: 'text-slate-700', border: 'border-slate-200', btn: 'Review', icon: '⚡' };
                      }
                    };
                    const theme = getTheme(insight.category);

                    return (
                      <div
                        key={`${insight.title}-${i}`}
                        className={`p-4 rounded-2xl ${theme.bg} border ${theme.border} relative group hover:shadow-lg hover:-translate-y-0.5 transition-all duration-300`}
                      >
                        <div className="flex justify-between items-start mb-2">
                          <span className={`px-2 py-0.5 rounded-full text-[9px] font-black uppercase tracking-widest ${theme.text} bg-white/50 border ${theme.border}`}>
                            {insight.category}
                          </span>
                          <span className="text-lg opacity-40 group-hover:opacity-80 transition-opacity duration-200">{theme.icon}</span>
                        </div>
                        <p className="text-[11px] font-extrabold text-slate-900 leading-snug mb-1.5">{insight.title}</p>
                        <p className="text-xs font-semibold text-slate-700 leading-snug mb-3 pr-1">{insight.recommendation}</p>
                        <div className="flex items-center justify-between mt-auto pt-2 border-t border-black/5">
                          <span className={`text-[9px] font-black uppercase ${theme.text}`}>Impact: {insight.impact}</span>
                          <button
                            type="button"
                            className={`flex items-center gap-1.5 text-[10px] font-black uppercase tracking-tight py-1 px-3 rounded-lg bg-white border ${theme.border} ${theme.text} hover:scale-[1.02] active:scale-100 transition-transform shadow-sm`}
                          >
                            {theme.btn} <ChevronRight className="h-3 w-3" />
                          </button>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </GlassCard>

          </div>

          {/* Side Panel: Action Center */}
          <div className="space-y-8">

            <GlassCard title="Advisor Action Center" className="mb-6">
              <div className="mt-8">
                <ActionCenter
                  highDrift={summary?.actionCenter?.highDrift ?? []}
                  idleCash={summary?.actionCenter?.idleCash ?? []}
                />
              </div>
              <div className="mt-6 pt-4 border-t border-slate-100 flex items-center justify-between">
                <div className="flex items-center gap-1.5 text-[9px] text-slate-400 font-bold uppercase">
                  <Clock className="h-3 w-3" /> Updated {lastUpdated}
                </div>
                <button className="text-[10px] font-bold text-indigo-600 flex items-center gap-1 uppercase">
                  Log History <ChevronRight className="h-3 w-3" />
                </button>
              </div>
            </GlassCard>

            {/* Live News Feed (3 short news incidents) */}
            <GlassCard title="Live Market Feed">
              <div className="mt-6 flex items-center justify-between text-[9px] text-slate-400 font-bold uppercase mb-4">
                <span>Live headlines</span>
                <span className="flex items-center gap-1 font-normal normal-case">
                  <Clock className="h-3 w-3" />
                  {newsUpdated || '—'}
                </span>
              </div>
              {newsError && (
                <p className="text-[10px] text-amber-800 bg-amber-50 border border-amber-100 rounded-lg px-2 py-1.5 mb-3">
                  {newsError}
                </p>
              )}
              <div className="mt-2 space-y-3">
                {newsLoading && marketFeed.length === 0 ? (
                  <div className="space-y-2 animate-pulse">
                    <div className="h-16 rounded-xl bg-slate-100" />
                    <div className="h-16 rounded-xl bg-slate-100" />
                  </div>
                ) : marketFeed.length === 0 && !newsError ? (
                  <p className="text-[10px] text-slate-400 italic py-4 text-center">
                    No headlines loaded yet.
                  </p>
                ) : (
                  marketFeed.slice(0, 10).map((news, i) => (
                    <a
                      key={`${news.url}-${i}`}
                      href={news.url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="group flex gap-3 rounded-2xl border border-slate-100 bg-white/50 p-2 transition-all hover:border-indigo-200 hover:shadow-md"
                    >
                      {news.thumbnail ? (
                        // eslint-disable-next-line @next/next/no-img-element
                        <img
                          src={news.thumbnail}
                          alt=""
                          className="h-14 w-14 shrink-0 rounded-lg object-cover"
                        />
                      ) : (
                        <div className="h-14 w-14 shrink-0 rounded-lg bg-slate-100" />
                      )}
                      <div className="min-w-0 flex-1">
                        <div className="flex items-center gap-2 mb-0.5 flex-wrap">
                          <span
                            className={`h-1.5 w-1.5 rounded-full shrink-0 ${
                              news.impact === 'High'
                                ? 'bg-red-500 animate-pulse'
                                : news.impact === 'Med'
                                  ? 'bg-amber-500'
                                  : 'bg-blue-500'
                            }`}
                          />
                          <span className="text-[9px] font-bold text-slate-400 uppercase tracking-tighter truncate">
                            {news.source ? `${news.source} • ` : ''}
                            {news.category} •{' '}
                            {new Date(news.timestamp).toLocaleTimeString([], {
                              hour: '2-digit',
                              minute: '2-digit',
                            })}
                          </span>
                        </div>
                        <p className="text-xs font-bold text-slate-800 line-clamp-2 group-hover:text-indigo-600 transition-colors">
                          {news.title}
                        </p>
                        {news.summary ? (
                          <p className="text-[9px] text-slate-500 mt-0.5 truncate">
                            {news.summary.length > 90 ? `${news.summary.slice(0, 90)}…` : news.summary}
                          </p>
                        ) : null}
                      </div>
                    </a>
                  ))
                )}
              </div>
              <div className="mt-6 pt-4 border-t border-slate-100">
                <Link
                  href="/dashboard/trends"
                  className="w-full text-center block text-[10px] font-bold text-slate-400 hover:text-slate-800 uppercase tracking-widest transition-colors"
                >
                  View Full Feed
                </Link>
              </div>
            </GlassCard>

          </div>

        </div>

      </div>
    </div>
  );
}
