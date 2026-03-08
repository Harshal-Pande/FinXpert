'use client';

import { useEffect, useState } from 'react';
import { useParams } from 'next/navigation';
import { getClient, Client } from '@/lib/api/clients';
import Link from 'next/link';
import { ArrowLeft, User, Briefcase, Sparkles } from 'lucide-react';

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

function formatAssetType(type: string): string {
  const t = (type ?? '').replace(/_/g, ' ');
  return t.charAt(0).toUpperCase() + t.slice(1).toLowerCase();
}

function computeDiversificationScore(assets: { asset_type: string }[]): number {
  if (!assets?.length) return 0;
  const types = new Set(assets.map((a) => a.asset_type?.toLowerCase()).filter(Boolean));
  const maxTypes = 4;
  return Math.round((types.size / maxTypes) * 10 * 10) / 10;
}

export default function ClientDetailPage() {
  const { id } = useParams<{ id: string }>();
  const [client, setClient] = useState<Client | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!id) return;
    getClient(id)
      .then(setClient)
      .catch((err) => setError(err instanceof Error ? err.message : 'Failed to load client'))
      .finally(() => setLoading(false));
  }, [id]);

  if (!id) {
    return (
      <div className="mx-auto max-w-2xl px-6 py-20 text-center">
        <h2 className="text-xl font-bold text-slate-900">Invalid Client</h2>
        <Link
          href="/dashboard/clients"
          className="mt-6 inline-flex items-center gap-2 rounded-lg bg-emerald-600 px-4 py-2 text-sm font-semibold text-white hover:bg-emerald-700"
        >
          Back to Clients
        </Link>
      </div>
    );
  }

  if (loading) {
    return (
      <div className="flex min-h-[400px] items-center justify-center">
        <div className="flex flex-col items-center gap-4">
          <div className="h-10 w-10 animate-spin rounded-full border-2 border-emerald-600 border-t-transparent" />
          <p className="font-medium text-slate-500">Loading client profile…</p>
        </div>
      </div>
    );
  }

  if (error || !client) {
    return (
      <div className="mx-auto max-w-2xl px-6 py-20 text-center">
        <h2 className="text-xl font-bold text-slate-900">Client Not Found</h2>
        <p className="mt-2 text-slate-600">
          {error || 'The requested client could not be found.'}
        </p>
        <Link
          href="/dashboard/clients"
          className="mt-6 inline-flex items-center gap-2 rounded-lg bg-emerald-600 px-4 py-2 text-sm font-semibold text-white hover:bg-emerald-700"
        >
          <ArrowLeft className="h-4 w-4" />
          Back to Clients
        </Link>
      </div>
    );
  }

  const riskScore = client.healthScores?.[0]?.score ?? null;
  const diversificationScore = computeDiversificationScore(
    client.portfolio?.assets ?? [],
  );
  const totalAssets = client.portfolio?.total_value ?? 0;

  return (
    <div className="min-h-screen bg-white">
      <div className="mx-auto max-w-5xl px-6 py-10">
        {/* Back link */}
        <Link
          href="/dashboard/clients"
          className="mb-8 inline-flex items-center gap-2 text-sm font-medium text-slate-600 hover:text-emerald-600"
        >
          <ArrowLeft className="h-4 w-4" />
          Back to Clients
        </Link>

        {/* Profile Header */}
        <header className="mb-10 rounded-xl border border-slate-200 bg-slate-50/50 p-6">
          <div className="flex flex-wrap items-start justify-between gap-4">
            <div>
              <h1 className="text-2xl font-bold text-slate-900">{client.name}</h1>
              <div className="mt-2 flex flex-wrap items-center gap-3 text-sm text-slate-600">
                <span className="flex items-center gap-1.5">
                  <Briefcase className="h-4 w-4" />
                  {client.occupation || '—'}
                </span>
                <span
                  className={`inline-flex rounded-full px-2.5 py-0.5 text-xs font-semibold capitalize ${getRiskBadgeStyles(client.risk_profile ?? '')}`}
                >
                  {client.risk_profile || '—'}
                </span>
                {client.investment_horizon && (
                  <span className="text-slate-500">
                    Horizon: {client.investment_horizon}
                  </span>
                )}
              </div>
              <div className="mt-3 flex items-center gap-2 text-sm text-slate-500">
                <User className="h-4 w-4" />
                <span>Contact: —</span>
              </div>
            </div>
          </div>
        </header>

        {/* Financial Summary Cards */}
        <section className="mb-10">
          <h2 className="mb-4 text-sm font-semibold uppercase tracking-wider text-slate-500">
            Financial Summary
          </h2>
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
            <div className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
              <p className="text-xs font-semibold uppercase tracking-wider text-slate-500">
                Total Assets
              </p>
              <p className="mt-2 font-mono text-2xl font-bold text-slate-900">
                {formatInr(totalAssets)}
              </p>
            </div>
            <div className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
              <p className="text-xs font-semibold uppercase tracking-wider text-slate-500">
                Risk Score
              </p>
              <p className="mt-2 font-mono text-2xl font-bold text-slate-900">
                {riskScore != null ? `${riskScore}/10` : '—'}
              </p>
            </div>
            <div className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
              <p className="text-xs font-semibold uppercase tracking-wider text-slate-500">
                Diversification Score
              </p>
              <p className="mt-2 font-mono text-2xl font-bold text-slate-900">
                {diversificationScore}/10
              </p>
            </div>
          </div>
        </section>

        {/* Assets Table */}
        <section className="mb-10">
          <h2 className="mb-4 text-sm font-semibold uppercase tracking-wider text-slate-500">
            Holdings
          </h2>
          <div className="overflow-hidden rounded-xl border border-slate-200 bg-white shadow-sm">
            <table className="min-w-full divide-y divide-slate-200">
              <thead>
                <tr className="bg-slate-50/80">
                  <th className="px-6 py-3 text-left text-xs font-semibold uppercase tracking-wider text-slate-500">
                    Asset
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-semibold uppercase tracking-wider text-slate-500">
                    Type
                  </th>
                  <th className="px-6 py-3 text-right text-xs font-semibold uppercase tracking-wider text-slate-500">
                    Value (INR)
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {(client.portfolio?.assets ?? []).map((asset) => (
                  <tr key={asset.id} className="transition-colors hover:bg-slate-50">
                    <td className="px-6 py-4 font-medium text-slate-900">
                      {asset.asset_name}
                    </td>
                    <td className="px-6 py-4 text-slate-600">
                      {formatAssetType(asset.asset_type)}
                    </td>
                    <td className="px-6 py-4 text-right font-mono font-medium text-slate-900">
                      {formatInr(asset.value)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
            {(!client.portfolio?.assets?.length ?? true) && (
              <div className="py-12 text-center text-slate-500">
                No holdings recorded for this portfolio.
              </div>
            )}
          </div>
        </section>

        {/* AI Insight Placeholder */}
        <section>
          <h2 className="mb-4 flex items-center gap-2 text-sm font-semibold uppercase tracking-wider text-slate-500">
            <Sparkles className="h-4 w-4 text-amber-500" />
            Gemini Portfolio Analysis
          </h2>
          <div className="rounded-xl border border-dashed border-slate-300 bg-slate-50/50 p-8 text-center">
            <p className="text-slate-500">
              AI-powered portfolio feedback will appear here.
            </p>
            <p className="mt-1 text-sm text-slate-400">
              Coming soon: Gemini integration for actionable insights.
            </p>
          </div>
        </section>
      </div>
    </div>
  );
}
