'use client';

import { useEffect, useState } from 'react';
import {
  AlertTriangle,
  Activity,
  TrendingDown,
  Users,
  Zap,
} from 'lucide-react';
import { getMarketInsights, type MarketInsight } from '@/lib/api/insights';

const TOTAL_CLIENTS = 3;

function getFirstName(fullName: string): string {
  return fullName.split(' ')[0] ?? fullName;
}

function isHighSeverity(severity: string): boolean {
  const s = severity?.toLowerCase() ?? '';
  return s === 'high' || s === 'critical';
}

export default function DashboardPage() {
  const [insights, setInsights] = useState<MarketInsight[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    getMarketInsights()
      .then(setInsights)
      .catch((e) => setError(e instanceof Error ? e.message : 'Failed to load'))
      .finally(() => setLoading(false));
  }, []);

  const marketAlertsCount = insights.length;

  return (
    <div className="min-h-screen bg-slate-50 p-6">
      <div className="mx-auto max-w-5xl">
        <h2 className="text-2xl font-semibold text-slate-800">Advisor Dashboard</h2>
        <p className="mt-1 text-slate-600">
          Overview and AI-powered market intelligence
        </p>

        {/* Top Stats */}
        <div className="mt-6 grid grid-cols-1 gap-4 sm:grid-cols-3">
          <div className="flex items-center gap-4 rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
            <div className="flex h-12 w-12 items-center justify-center rounded-lg bg-emerald-100 text-emerald-600">
              <Users className="h-6 w-6" />
            </div>
            <div>
              <p className="text-sm font-medium text-slate-500">Total Clients</p>
              <p className="text-2xl font-semibold text-slate-800">{TOTAL_CLIENTS}</p>
            </div>
          </div>
          <div className="flex items-center gap-4 rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
            <div className="flex h-12 w-12 items-center justify-center rounded-lg bg-amber-100 text-amber-600">
              <AlertTriangle className="h-6 w-6" />
            </div>
            <div>
              <p className="text-sm font-medium text-slate-500">Market Alerts</p>
              <p className="text-2xl font-semibold text-slate-800">
                {loading ? '—' : marketAlertsCount}
              </p>
            </div>
          </div>
          <div className="flex items-center gap-4 rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
            <div className="flex h-12 w-12 items-center justify-center rounded-lg bg-blue-100 text-blue-600">
              <Activity className="h-6 w-6" />
            </div>
            <div>
              <p className="text-sm font-medium text-slate-500">System Status</p>
              <p className="text-lg font-semibold text-emerald-600">Online</p>
            </div>
          </div>
        </div>

        {/* AI Intelligence Feed */}
        <section className="mt-8">
          <h3 className="mb-4 flex items-center gap-2 text-lg font-semibold text-slate-800">
            <Zap className="h-5 w-5 text-amber-500" />
            AI Intelligence Feed
          </h3>

          {loading && (
            <p className="rounded-lg border border-slate-200 bg-white p-6 text-center text-slate-500">
              Loading insights…
            </p>
          )}
          {error && (
            <div className="flex items-center gap-2 rounded-lg border border-red-200 bg-red-50 p-4 text-red-700">
              <AlertTriangle className="h-5 w-5 shrink-0" />
              <p>{error}</p>
            </div>
          )}
          {!loading && !error && insights.length === 0 && (
            <p className="rounded-lg border border-slate-200 bg-white p-6 text-center text-slate-500">
              No market insights yet. Trigger analysis from the backend.
            </p>
          )}
          {!loading && !error && insights.length > 0 && (
            <div className="space-y-4">
              {insights.map((insight) => (
                <article
                  key={insight.id}
                  className={`rounded-xl border bg-white p-5 shadow-sm transition-shadow hover:shadow-md ${
                    isHighSeverity(insight.severity)
                      ? 'border-red-300 ring-1 ring-red-100'
                      : 'border-slate-200'
                  }`}
                >
                  <div className="flex items-start gap-3">
                    <div
                      className={`mt-0.5 flex h-9 w-9 shrink-0 items-center justify-center rounded-lg ${
                        isHighSeverity(insight.severity)
                          ? 'bg-red-100 text-red-600'
                          : 'bg-slate-100 text-slate-600'
                      }`}
                    >
                      <TrendingDown className="h-5 w-5" />
                    </div>
                    <div className="min-w-0 flex-1">
                      <h4 className="font-semibold text-slate-800">
                        {insight.title}
                      </h4>
                      <p className="mt-1 text-sm text-slate-600">
                        {insight.ai_summary ?? 'No summary available.'}
                      </p>
                      {insight.affected_clients?.length > 0 && (
                        <div className="mt-3 flex flex-wrap gap-2">
                          <span className="text-xs font-medium text-slate-500">
                            Affected Clients:
                          </span>
                          {insight.affected_clients.map((name) => (
                            <span
                              key={name}
                              className="inline-flex items-center rounded-full bg-slate-100 px-2.5 py-0.5 text-xs font-medium text-slate-700"
                            >
                              {getFirstName(name)}
                            </span>
                          ))}
                        </div>
                      )}
                    </div>
                  </div>
                </article>
              ))}
            </div>
          )}
        </section>
      </div>
    </div>
  );
}
