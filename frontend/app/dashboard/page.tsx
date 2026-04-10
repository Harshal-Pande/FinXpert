'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import {
  TrendingDown,
  Activity,
  Users,
  Zap,
  DollarSign,
  LineChart as LineChartIcon,
  ShieldCheck,
  TrendingUp,
  Clock,
  ChevronRight,
  TrendingDown as TrendingDownIcon,
  Zap as ZapIcon,
} from 'lucide-react';
import { getDashboardSummary, type DashboardSummary } from '@/lib/api/dashboard';
import { getAdvisorAumHistory, type AumHistoryPoint } from '@/lib/api/portfolio-history';
import {
  LineChart, Line, AreaChart, Area, XAxis, YAxis, CartesianGrid,
  Tooltip, ResponsiveContainer, Legend
} from 'recharts';
import MarketPulseTicker from '@/components/dashboard/MarketPulseTicker';
import ActionCenter from '@/components/dashboard/ActionCenter';

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
  const [aumHistory, setAumHistory] = useState<AumHistoryPoint[]>([]);
  const [compareWithBenchmark, setCompareWithBenchmark] = useState(false);
  const [lastUpdated, setLastUpdated] = useState<string>('');

  const fetchDashboardData = async () => {
    try {
      const [sum, aum] = await Promise.all([
        getDashboardSummary(),
        getAdvisorAumHistory(),
      ]);
      setSummary(sum);
      setAumHistory(aum);
      setLastUpdated(new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }));
    } catch (err) {
      console.error('Dashboard refresh failed:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchDashboardData();
    const interval = setInterval(fetchDashboardData, 300000); // 5 mins
    return () => clearInterval(interval);
  }, []);

  const formatInr = (v: number) =>
    new Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR', notation: 'compact', maximumFractionDigits: 1 }).format(v);

  // Mock benchmark data synced with aumHistory
  const chartData = aumHistory.map((p, i) => ({
    ...p,
    benchmarkValue: p.totalValue * (1 + (Math.sin(i * 0.5) * 0.05 + 0.02)), // Simulated Nifty 50 movement
  }));

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

        {/* Ticker Header */}
        <div className="mb-6">
          <MarketPulseTicker data={summary?.marketPulse ?? []} />
        </div>

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
              <div className="flex items-center justify-between mb-6 pt-4">
                <p className="text-xs text-slate-500 italic">Tracking growth vs market baseline</p>
                <div className="flex items-center gap-2">
                  <span className="text-[10px] font-bold text-slate-400 uppercase">Compare Benchmark</span>
                  <button
                    onClick={() => setCompareWithBenchmark(!compareWithBenchmark)}
                    className={`w-8 h-4 rounded-full transition-all relative ${compareWithBenchmark ? 'bg-indigo-600' : 'bg-slate-300'}`}
                  >
                    <div className={`absolute top-0.5 w-3 h-3 bg-white rounded-full transition-all ${compareWithBenchmark ? 'left-4.5' : 'left-0.5'}`} />
                  </button>
                </div>
              </div>

              <div className="w-full h-64">
                <ResponsiveContainer width="100%" height="100%">
                  <AreaChart data={chartData}>
                    <defs>
                      <linearGradient id="aumGradient" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor="#4f46e5" stopOpacity={0.15} />
                        <stop offset="95%" stopColor="#4f46e5" stopOpacity={0} />
                      </linearGradient>
                      <linearGradient id="benchGradient" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor="#94a3b8" stopOpacity={0.1} />
                        <stop offset="95%" stopColor="#94a3b8" stopOpacity={0} />
                      </linearGradient>
                    </defs>
                    <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                    <XAxis dataKey="month" axisLine={false} tickLine={false} tick={{ fontSize: 10, fill: '#94a3b8' }} />
                    <YAxis axisLine={false} tickLine={false} tick={{ fontSize: 10, fill: '#94a3b8' }} tickFormatter={(v) => formatInr(v)} />
                    <Tooltip
                      contentStyle={{ borderRadius: '16px', border: 'none', boxShadow: '0 10px 25px rgba(0,0,0,0.1)' }}
                      formatter={(v: number) => [formatInr(v), '']}
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
                    {compareWithBenchmark && (
                      <Area
                        type="monotone"
                        dataKey="benchmarkValue"
                        name="Nifty 50 Index"
                        stroke="#94a3b8"
                        strokeWidth={2}
                        strokeDasharray="5 5"
                        fill="url(#benchGradient)"
                      />
                    )}
                    <Legend verticalAlign="top" height={36} iconType="circle" wrapperStyle={{ fontSize: '10px', textTransform: 'uppercase', fontWeight: 700 }} />
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
                  <p className="text-xs font-medium text-slate-400 italic">No critical insights detected for currently active filters.</p>
                </div>
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mt-8">
                  {summary.strategicInsights.map((insight, i) => {
                    const getTheme = (cat: string) => {
                      switch (cat) {
                        case 'RISK': return { bg: 'bg-red-50', text: 'text-red-700', border: 'border-red-100', btn: 'Action Required', icon: '🚨' };
                        case 'DEPLOY': return { bg: 'bg-amber-50', text: 'text-amber-700', border: 'border-amber-100', btn: 'Review Cash', icon: '💰' };
                        case 'EXPERT': return { bg: 'bg-emerald-50', text: 'text-emerald-700', border: 'border-emerald-100', btn: 'View Advice', icon: '🕯️' };
                        default: return { bg: 'bg-indigo-50', text: 'text-indigo-700', border: 'border-indigo-100', btn: 'Execute Trade', icon: '⚡' };
                      }
                    };
                    const theme = getTheme(insight.category);

                    return (
                      <div key={i} className={`p-4 rounded-2xl ${theme.bg} border ${theme.border} relative group hover:shadow-lg transition-all duration-300`}>
                        <div className="flex justify-between items-start mb-2">
                          <span className={`px-2 py-0.5 rounded-full text-[9px] font-black uppercase tracking-widest ${theme.text} bg-white/50 border ${theme.border}`}>
                            {insight.category}
                          </span>
                          <span className="text-lg opacity-40 group-hover:opacity-80 transition-opacity">{theme.icon}</span>
                        </div>

                        <p className="text-xs font-bold text-slate-800 leading-snug mb-2 pr-4">{insight.recommendation}</p>

                        <div className="flex items-center justify-between mt-auto pt-2 border-t border-black/5">
                          <span className={`text-[9px] font-black uppercase ${theme.text}`}>Impact: {insight.impact}</span>
                          <button className={`flex items-center gap-1.5 text-[10px] font-black uppercase tracking-tight py-1 px-3 rounded-lg bg-white border ${theme.border} ${theme.text} hover:scale-105 transition-transform shadow-sm`}>
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
                  wtcAlerts={summary?.actionCenter?.wtcAlerts ?? []}
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
              <div className="mt-8 space-y-4">
                {(summary?.recentNews ?? []).map((news, i) => (
                  <div key={i} className="group cursor-pointer">
                    <div className="flex items-center gap-2 mb-1">
                      <span className={`h-1.5 w-1.5 rounded-full ${news.impact === 'High' ? 'bg-red-500 animate-pulse' : news.impact === 'Med' ? 'bg-amber-500' : 'bg-blue-500'}`} />
                      <span className="text-[9px] font-bold text-slate-400 uppercase tracking-tighter">{news.category} • {new Date(news.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>
                    </div>
                    <p className="text-xs font-bold text-slate-800 line-clamp-2 group-hover:text-indigo-600 transition-colors">
                      {news.title}
                    </p>
                  </div>
                ))}
              </div>
              <div className="mt-6 pt-4 border-t border-slate-100">
                <Link href="/dashboard/trends" className="w-full text-center block text-[10px] font-bold text-slate-400 hover:text-slate-800 uppercase tracking-widest transition-colors">
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
