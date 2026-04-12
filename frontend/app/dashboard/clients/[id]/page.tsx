'use client';

import { useEffect, useMemo, useState } from 'react';
import { useParams } from 'next/navigation';
import { getClient, Client } from '@/lib/api/clients';
import { apiClient } from '@/lib/api/client';
import { getClientHistory, type PortfolioSnapshot } from '@/lib/api/portfolio-history';
import Link from 'next/link';
import { User, Briefcase, Send, Shield, ArrowLeft } from 'lucide-react';
import {
  AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip,
  ResponsiveContainer,
} from 'recharts';
import { toast } from 'sonner';
import Breadcrumb from '@/components/layout/Breadcrumb';
import AssetCard from '@/components/portfolio/AssetCard';
import AssetVault from '@/components/portfolio/AssetVault';
import StressTestModal from '@/components/modals/StressTestModal';
import { StressScenario, StressTestResult } from '@/lib/api/stress-test';

function getRiskBadgeStyles(riskProfile: string): string {
  const r = (riskProfile ?? '').toLowerCase();
  if (r === 'aggressive') return 'bg-red-100 text-red-700';
  if (r === 'moderate') return 'bg-emerald-100 text-emerald-700';
  if (r === 'conservative') return 'bg-blue-100 text-blue-700';
  return 'bg-slate-100 text-slate-600';
}

function formatInr(value: number): string {
  return new Intl.NumberFormat('en-IN', {
    style: 'currency',
    currency: 'INR',
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(value ?? 0);
}


export default function ClientDetailPage() {
  const { id } = useParams<{ id: string }>();
  const [client, setClient] = useState<Client | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [viewMode, setViewMode] = useState<'VALUE' | 'RETURNS'>('VALUE');
  const [stressOpen, setStressOpen] = useState(false);
  const [activeSimulation, setActiveSimulation] = useState<StressScenario | null>(null);
  const [stressedScore, setStressedScore] = useState<number | null>(null);
  const [displayedScore, setDisplayedScore] = useState(0);
  const [historyData, setHistoryData] = useState<PortfolioSnapshot[]>([]);
  const [historyLoaded, setHistoryLoaded] = useState(false);

  // Advisory
  const [sendingAdvisory, setSendingAdvisory] = useState(false);
  const [advisoryResult, setAdvisoryResult] = useState<{
    subject: string;
    body: string;
    advice: string;
    status: string;
  } | null>(null);

  useEffect(() => {
    if (!id) return;
    getClient(id)
      .then(setClient)
      .catch((err) => setError(err instanceof Error ? err.message : 'Failed to load client'))
      .finally(() => setLoading(false));
    setHistoryLoaded(false);
    getClientHistory(id)
      .then(setHistoryData)
      .catch(() => setHistoryData([]))
      .finally(() => setHistoryLoaded(true));
  }, [id]);

  // Single source of truth: calculatedHealthScore is the live normalized
  // peer-ranked score returned by both GET /clients and GET /clients/:id.
  const realHealthScore = useMemo(() => {
    if (!client) return 0;
    return client.calculatedHealthScore ?? 0;
  }, [client]);

  const canChartHistory = historyLoaded && historyData.length >= 2;

  // ── Helpers used by the two memos below ──────────────────────────────────
  const _allAssets = client?.investments ?? [];
  const _debtAssets = _allAssets.filter((a) => a.investment_type === 'Debt');
  const _mutualFundAssets = _allAssets.filter((a) => a.investment_type === 'Mutual_Fund');

  const _allocateDeduction = (assets: typeof _allAssets, totalDeduction: number) => {
    const deductions: Record<string, number> = {};
    let remaining = totalDeduction;
    for (const asset of assets) {
      const value = asset.quantity * asset.current_price;
      const applied = Math.min(value, remaining);
      deductions[asset.id] = applied;
      remaining -= applied;
      if (remaining <= 0) break;
    }
    return { deductions, remaining };
  };

  // MUST be declared before any early return so hook order is stable.
  const debtAllocation = useMemo(() => {
    if (activeSimulation !== 'MEDICAL_SHOCK') return { deductions: {} as Record<string, number>, remaining: 0 };
    return _allocateDeduction(_debtAssets, 500_000);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [client, activeSimulation]);

  const mfAllocation = useMemo(() => {
    if (activeSimulation !== 'MEDICAL_SHOCK') return { deductions: {} as Record<string, number>, remaining: 0 };
    return _allocateDeduction(_mutualFundAssets, Math.max(0, debtAllocation.remaining));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [client, activeSimulation, debtAllocation.remaining]);

  // Health score is authoritative from the DB via getClient().
  // No local recalculation — that was overwriting the correct normalized score.

  const headerTargetScore = activeSimulation ? stressedScore ?? realHealthScore : realHealthScore;

  useEffect(() => {
    const target = Number.isFinite(headerTargetScore) ? headerTargetScore : 0;
    const from = displayedScore;
    const steps = 16;
    let tick = 0;
    const delta = (target - from) / steps;
    const timer = window.setInterval(() => {
      tick += 1;
      if (tick >= steps) {
        setDisplayedScore(target);
        window.clearInterval(timer);
      } else {
        setDisplayedScore((prev) => prev + delta);
      }
    }, 18);
    return () => window.clearInterval(timer);
  }, [headerTargetScore]);

  const handleSendAdvisory = async () => {
    if (!id) return;
    setSendingAdvisory(true);
    setAdvisoryResult(null);
    try {
      const result = await apiClient<{
        subject: string;
        body: string;
        advice: string;
        status: string;
      }>(`/clients/${id}/advisory/send`, { method: 'POST' });
      setAdvisoryResult(result);
    } catch {
      setAdvisoryResult({
        subject: 'Error',
        body: 'Failed to generate advisory. Check backend logs.',
        advice: '',
        status: 'error',
      });
    } finally {
      setSendingAdvisory(false);
    }
  };

  if (!id || (!loading && !client)) {
    return (
      <div className="mx-auto max-w-2xl px-6 py-20 text-center">
        <h2 className="text-xl font-bold text-slate-900">Client Not Found</h2>
        <p className="mt-2 text-slate-600">{error || 'The requested client could not be found.'}</p>
        <Link href="/dashboard/clients" className="mt-6 inline-flex items-center gap-2 rounded-lg bg-slate-800 px-4 py-2 text-sm font-semibold text-white hover:bg-slate-700">
          <ArrowLeft className="h-4 w-4" /> Back to Clients
        </Link>
      </div>
    );
  }

  if (loading) {
    return (
      <div className="flex min-h-[400px] items-center justify-center">
        <div className="h-10 w-10 animate-spin rounded-full border-2 border-slate-800 border-t-transparent" />
      </div>
    );
  }



  return (
    <div className="min-h-screen bg-slate-50 p-8 flex justify-center font-sans text-slate-800 relative pb-20">

      {/* Breadcrumb — top-left */}
      <div className="absolute top-6 left-8">
        <Breadcrumb leafLabel={client!.name} />
      </div>

      {/* Main Container */}
      <div className="w-full max-w-5xl border-2 border-slate-800 rounded-3xl p-8 relative flex flex-col items-center bg-white min-h-[600px] mt-8">

        {/* Title over border trick */}
        <div className="absolute -top-4 left-10 bg-white px-2 text-xl font-medium tracking-wide">
          <div className="inline-flex items-center gap-2">
            <span>Client Information</span>
          </div>
        </div>

        <div className="w-full grid grid-cols-1 md:grid-cols-2 gap-6 mt-2">

          {/* Information Block */}
          <div className="border-2 border-slate-800 rounded-3xl p-6 relative flex flex-col justify-center gap-2 min-h-[240px]">
            <div className="absolute top-4 w-full text-center left-0 text-sm font-medium tracking-wide bg-white">
              Information
            </div>
            <div className="mt-8 flex flex-col gap-2">
              <h1 className="text-2xl font-bold text-slate-900">{client!.name}</h1>
              <div className="flex flex-col gap-1.5 text-sm text-slate-600 mt-2">
                <span className="flex items-center gap-2">
                  <Briefcase className="h-4 w-4 text-slate-400" />
                  {client!.occupation || 'No Occupation Listed'}
                </span>
                <span className="flex items-center gap-2">
                  <User className="h-4 w-4 text-slate-400" />
                  Age: {client!.age ?? '—'}
                </span>
                <div className="mt-2">
                  <div className="flex flex-wrap items-center gap-2">
                    <span className={`inline-flex rounded-md px-3 py-1 text-xs font-bold uppercase tracking-wider ${getRiskBadgeStyles(client!.risk_profile ?? '')}`}>
                      {client!.risk_profile || 'Unknown Risk'}
                    </span>
                    <span
                      className={`inline-flex rounded-md px-3 py-1 text-xs font-bold uppercase tracking-wider ${activeSimulation ? 'bg-red-100 text-red-700' : 'bg-indigo-100 text-indigo-700'
                        }`}
                    >
                      {activeSimulation ? 'Stressed Score' : 'Health Score'}:{' '}
                      {!activeSimulation && client!.calculatedHealthScore == null
                        ? '—'
                        : displayedScore.toFixed(1)}
                    </span>
                    <button
                      type="button"
                      aria-label="Open stress test simulation"
                      onClick={() => setStressOpen(true)}
                      className="inline-flex items-center rounded-md border border-slate-300 px-3 py-1 text-xs font-semibold text-slate-700 hover:bg-slate-100"
                    >
                      <Shield className="mr-1 h-3.5 w-3.5" />
                      Simulate Risk
                    </button>
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Portfolio History Graph Block */}
          <div className="border-2 border-slate-800 rounded-3xl p-6 relative flex flex-col min-h-[240px]">
            <div className="absolute top-4 w-full text-center left-0 text-sm font-medium tracking-wide bg-white">
              Portfolio History
            </div>
            <div className="w-full flex-1 mt-8" style={{ minHeight: 160 }}>
              {!historyLoaded ? (
                <div
                  className="flex h-full w-full items-center justify-center rounded-2xl border-2 border-slate-200 bg-white"
                  style={{ minHeight: 140 }}
                  aria-busy
                >
                  <div className="h-8 w-8 animate-spin rounded-full border-2 border-slate-300 border-t-slate-700" />
                </div>
              ) : !canChartHistory ? (
                <div className="flex h-full items-center justify-center">
                  <div
                    className="flex w-full flex-col items-center justify-center gap-3 rounded-2xl border-2 border-slate-300 bg-white px-8 py-8 shadow-sm"
                    style={{ minHeight: 140 }}
                  >
                    <div className="flex items-center justify-center rounded-full border border-slate-200 bg-slate-50 p-3">
                      <svg
                        xmlns="http://www.w3.org/2000/svg"
                        width="24"
                        height="24"
                        viewBox="0 0 24 24"
                        fill="none"
                        stroke="currentColor"
                        strokeWidth="1.5"
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        className="text-slate-400"
                      >
                        <polyline points="22 12 18 12 15 21 9 3 6 12 2 12" />
                      </svg>
                    </div>
                    <p className="text-sm font-medium text-slate-600">
                      {historyData.length === 0
                        ? 'No portfolio history yet'
                        : 'Not enough history to chart'}
                    </p>
                    <p className="text-xs text-slate-500 text-center max-w-[260px] leading-relaxed">
                      {historyData.length === 0
                        ? 'Trend data will appear after snapshots are recorded for this client.'
                        : 'At least two snapshots are needed to show a meaningful trend line.'}
                    </p>
                  </div>
                </div>
              ) : (
                <ResponsiveContainer width="100%" height={160}>
                  <AreaChart data={historyData} margin={{ top: 4, right: 4, left: -28, bottom: 0 }}>
                    <defs>
                      <linearGradient id="portfolioGradient" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor="#6366f1" stopOpacity={0.25} />
                        <stop offset="95%" stopColor="#6366f1" stopOpacity={0} />
                      </linearGradient>
                    </defs>
                    <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#E2E8F0" />
                    <XAxis
                      dataKey="month"
                      axisLine={false}
                      tickLine={false}
                      tick={{ fontSize: 10, fill: '#94A3B8' }}
                    />
                    <YAxis
                      axisLine={false}
                      tickLine={false}
                      tick={{ fontSize: 9, fill: '#94A3B8' }}
                      tickFormatter={(v) =>
                        new Intl.NumberFormat('en-IN', { notation: 'compact', maximumFractionDigits: 1 }).format(v)
                      }
                    />
                    <Tooltip
                      formatter={(value: number) => [
                        new Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR', maximumFractionDigits: 0 }).format(value),
                        'Portfolio Value',
                      ]}
                      contentStyle={{ fontSize: 11, borderRadius: 8, border: '1px solid #E2E8F0' }}
                    />
                    <Area
                      type="monotone"
                      dataKey="totalValue"
                      stroke="#6366f1"
                      strokeWidth={2.5}
                      fill="url(#portfolioGradient)"
                      dot={{ r: 3, fill: '#6366f1', strokeWidth: 0 }}
                      activeDot={{ r: 5 }}
                    />
                  </AreaChart>
                </ResponsiveContainer>
              )}
            </div>
          </div>
        </div>

        {/* View Mode Toggle */}
        <div className="mt-6 inline-flex rounded-xl border border-slate-300 bg-slate-100 p-1">
          <button
            type="button"
            aria-label="Show total holdings"
            onClick={() => setViewMode('VALUE')}
            className={`rounded-lg px-3 py-1 text-xs font-semibold ${viewMode === 'VALUE' ? 'bg-slate-800 text-white' : 'text-slate-700'}`}
          >
            Total Holdings
          </button>
          <button
            type="button"
            aria-label="Show total returns"
            onClick={() => setViewMode('RETURNS')}
            className={`rounded-lg px-3 py-1 text-xs font-semibold ${viewMode === 'RETURNS' ? 'bg-slate-800 text-white' : 'text-slate-700'}`}
          >
            Total Returns
          </button>
        </div>

        {activeSimulation && (
          <div className="mt-4 w-full">
            <span className="inline-flex items-center rounded-md bg-red-100 px-3 py-1 text-xs font-bold uppercase tracking-wider text-red-700">
              🚨 Stress Simulation Active
            </span>
          </div>
        )}

        {/* Asset Vault — replaces the 4-column grid */}
        <AssetVault
          investments={client!.investments ?? []}
          viewMode={viewMode}
          activeSimulation={activeSimulation}
          debtAllocation={debtAllocation}
          mfAllocation={mfAllocation}
        />

        {/* Advisory */}
        <div className="w-full border-2 border-slate-800 rounded-3xl p-6 mt-8 relative flex flex-col min-h-[140px]">
          <div className="absolute top-4 w-full text-center left-0 text-sm font-medium tracking-wide bg-white shrink-0 sm:px-4">
            Advisory
          </div>

          <div className="mt-10 space-y-4 px-2 sm:px-4">
            <p className="text-sm text-slate-600 leading-relaxed max-w-2xl">
              Build a one-page brief from this client&apos;s profile, portfolio, and risk context. Use it for
              review meetings or follow-up notes—nothing is scheduled or sent automatically.
            </p>
            <div className="flex flex-col sm:flex-row sm:items-center gap-3">
              <button
                type="button"
                onClick={handleSendAdvisory}
                disabled={sendingAdvisory}
                className="inline-flex items-center justify-center gap-2 rounded-xl bg-slate-800 px-5 py-2.5 text-sm font-semibold text-white hover:bg-slate-700 disabled:opacity-50 w-full sm:w-auto"
              >
                <Send className="h-4 w-4 shrink-0" />
                {sendingAdvisory ? 'Generating…' : 'Generate advisory brief'}
              </button>
              {advisoryResult && advisoryResult.status !== 'error' && (
                <span className="text-xs text-slate-500">Brief generated—see below.</span>
              )}
            </div>
          </div>

          {advisoryResult && (
            <div className="mt-6 border-t border-slate-200 pt-6 px-2 sm:px-4 space-y-4">
              <div>
                <p className="text-xs font-semibold uppercase tracking-wider text-slate-500">Summary</p>
                <p className="mt-1 font-semibold text-slate-900">{advisoryResult.subject}</p>
              </div>
              <div className="rounded-xl bg-slate-50 border border-slate-200 p-4">
                <p className="text-xs font-semibold text-slate-500 mb-2">Narrative</p>
                <p className="text-sm text-slate-700 leading-relaxed whitespace-pre-wrap">{advisoryResult.body}</p>
              </div>
              {advisoryResult.advice ? (
                <div className="rounded-xl border border-indigo-100 bg-indigo-50/60 p-4">
                  <p className="text-xs font-semibold text-indigo-900 mb-1">Recommendations</p>
                  <p className="text-sm text-indigo-950 leading-relaxed whitespace-pre-wrap">{advisoryResult.advice}</p>
                </div>
              ) : null}
              <div className="flex flex-wrap items-center gap-2">
                <span
                  className={`text-xs font-medium px-2.5 py-1 rounded-full ${
                    advisoryResult.status === 'error'
                      ? 'bg-red-50 text-red-700'
                      : 'bg-emerald-50 text-emerald-700'
                  }`}
                >
                  {advisoryResult.status === 'error' ? 'Failed' : 'Generated'}
                </span>
                {advisoryResult.status !== 'error' ? (
                  <span className="text-xs text-slate-500 capitalize">{advisoryResult.status.replace(/_/g, ' ')}</span>
                ) : null}
              </div>
            </div>
          )}
        </div>

      </div>
      {activeSimulation && (
        <div className="fixed bottom-4 left-1/2 z-40 w-[min(720px,92vw)] -translate-x-1/2 rounded-xl border border-red-300 bg-white/90 p-3 shadow-lg backdrop-blur">
          <div className="flex items-center justify-between gap-4">
            <p className="text-sm font-semibold text-red-700">
              🚨 SIMULATION ACTIVE: Showing Stressed Values
            </p>
            <button
              type="button"
              onClick={() => {
                setActiveSimulation(null);
                setStressedScore(null);
              }}
              className="rounded-lg border border-red-300 bg-red-600 px-3 py-1.5 text-xs font-semibold text-white hover:bg-red-700"
            >
              Exit Stress Test
            </button>
          </div>
        </div>
      )}
      <StressTestModal
        open={stressOpen}
        onClose={() => setStressOpen(false)}
        clientId={client?.id}
        currentScore={realHealthScore}
        onSimulationSelect={(scenario: StressScenario, result: StressTestResult) => {
          setActiveSimulation(scenario);
          const maxStressed =
            realHealthScore >= 0.5 ? realHealthScore - 0.5 : result.stressedScore;
          const applied = Math.min(result.stressedScore, maxStressed);
          setStressedScore(Math.max(0, applied));
          toast.warning(
            `🚨 ${scenario.replaceAll('_', ' ')} simulation active — showing stressed values`,
            {
              description: `Score dropped from ${realHealthScore.toFixed(1)} → ${Math.max(0, applied).toFixed(1)}`,
            },
          );
        }}
      />
    </div>
  );
}
