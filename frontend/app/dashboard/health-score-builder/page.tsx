'use client';

import { useEffect, useState } from 'react';
import { listClients, Client } from '@/lib/api/clients';
import { apiClient } from '@/lib/api/client';
import { Activity, Calculator, ChevronDown } from 'lucide-react';

interface HealthBreakdown {
  incomeExpenseScore: number;
  emergencyFundScore: number;
  diversificationScore: number;
  insuranceScore: number;
  weightedTotal: number;
}

interface HealthResult {
  score: number;
  breakdownDetail?: HealthBreakdown;
  calculated_at: string;
}

function ScoreBar({ label, score }: { label: string; score: number }) {
  const pct = Math.min(100, Math.max(0, (score / 10) * 100));
  const color =
    score >= 7 ? 'bg-emerald-500' : score >= 4 ? 'bg-amber-500' : 'bg-red-500';
  return (
    <div>
      <div className="mb-1 flex items-center justify-between text-sm">
        <span className="text-slate-600">{label}</span>
        <span className="font-semibold text-slate-800">{score.toFixed(1)}/10</span>
      </div>
      <div className="h-2 w-full overflow-hidden rounded-full bg-slate-100">
        <div
          className={`h-full rounded-full transition-all duration-500 ${color}`}
          style={{ width: `${pct}%` }}
        />
      </div>
    </div>
  );
}

export default function HealthScoreBuilderPage() {
  const [clients, setClients] = useState<Client[]>([]);
  const [selectedId, setSelectedId] = useState('');
  const [calculating, setCalculating] = useState(false);
  const [result, setResult] = useState<HealthResult | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    listClients({ limit: 100 }).then((res) => {
      setClients(res.items);
      if (res.items.length > 0) setSelectedId(res.items[0].id);
    });
  }, []);

  const selectedClient = clients.find((c) => c.id === selectedId);

  const handleCalculate = async () => {
    if (!selectedId) return;
    setCalculating(true);
    setResult(null);
    setError(null);
    try {
      const data = await apiClient<HealthResult>(
        `/clients/${selectedId}/health-score/calculate`,
        { method: 'POST' },
      );
      setResult(data);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Calculation failed');
    } finally {
      setCalculating(false);
    }
  };

  const overallColor =
    result?.score != null
      ? result.score >= 7
        ? 'text-emerald-600'
        : result.score >= 4
        ? 'text-amber-600'
        : 'text-red-600'
      : 'text-slate-800';

  return (
    <div className="min-h-screen bg-slate-50 p-6">
      <div className="mx-auto max-w-3xl">
        <div className="mb-6">
          <h1 className="text-2xl font-semibold text-slate-800">Health Score Calculator</h1>
          <p className="mt-1 text-slate-500">
            Compute a client&apos;s financial health score based on income, emergency fund, portfolio diversification, and insurance coverage.
          </p>
        </div>

        {/* Client Selector */}
        <div className="mb-6 rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
          <label className="mb-2 block text-sm font-semibold text-slate-700">
            Select Client
          </label>
          <div className="relative">
            <select
              value={selectedId}
              onChange={(e) => {
                setSelectedId(e.target.value);
                setResult(null);
              }}
              className="w-full appearance-none rounded-lg border border-slate-200 bg-white px-4 py-2.5 pr-10 text-slate-800 focus:border-emerald-400 focus:outline-none"
            >
              {clients.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.name} — {c.risk_profile ?? 'unknown risk'}
                </option>
              ))}
            </select>
            <ChevronDown className="pointer-events-none absolute right-3 top-3 h-4 w-4 text-slate-400" />
          </div>

          {selectedClient && (
            <div className="mt-4 grid grid-cols-2 gap-3 sm:grid-cols-4 text-sm">
              <div className="rounded-lg bg-slate-50 p-3">
                <p className="text-xs text-slate-400">Annual Income</p>
                <p className="font-semibold text-slate-700">
                  ₹{(selectedClient.annual_income ?? 0).toLocaleString('en-IN')}
                </p>
              </div>
              <div className="rounded-lg bg-slate-50 p-3">
                <p className="text-xs text-slate-400">Monthly Expense</p>
                <p className="font-semibold text-slate-700">
                  ₹{(selectedClient.monthly_expense ?? 0).toLocaleString('en-IN')}
                </p>
              </div>
              <div className="rounded-lg bg-slate-50 p-3">
                <p className="text-xs text-slate-400">Emergency Fund</p>
                <p className="font-semibold text-slate-700">
                  {selectedClient.emergency_fund != null
                    ? `₹${selectedClient.emergency_fund.toLocaleString('en-IN')}`
                    : '—'}
                </p>
              </div>
              <div className="rounded-lg bg-slate-50 p-3">
                <p className="text-xs text-slate-400">Insurance</p>
                <p className="font-semibold text-slate-700">
                  {selectedClient.insurance_coverage != null
                    ? `₹${selectedClient.insurance_coverage.toLocaleString('en-IN')}`
                    : '—'}
                </p>
              </div>
            </div>
          )}
        </div>

        {/* Scoring Methodology */}
        <div className="mb-6 rounded-xl border border-blue-100 bg-blue-50 p-5">
          <p className="mb-2 text-sm font-semibold text-blue-700">Scoring Methodology (25% each)</p>
          <ul className="space-y-1 text-xs text-blue-600">
            <li>📊 <strong>Income-Expense Ratio</strong> — Savings rate vs 40% target</li>
            <li>🏦 <strong>Emergency Fund</strong> — Fund vs 6 months of expenses</li>
            <li>🎯 <strong>Diversification</strong> — Number of distinct asset classes held</li>
            <li>🛡️ <strong>Insurance Coverage</strong> — Coverage vs 10x annual income</li>
          </ul>
        </div>

        {/* Calculate Button */}
        <button
          onClick={handleCalculate}
          disabled={calculating || !selectedId}
          className="flex w-full items-center justify-center gap-2 rounded-xl bg-emerald-600 py-3 text-sm font-bold text-white hover:bg-emerald-700 disabled:opacity-60"
        >
          <Calculator className="h-5 w-5" />
          {calculating ? 'Calculating…' : 'Calculate Health Score'}
        </button>

        {error && (
          <div className="mt-4 rounded-xl border border-red-200 bg-red-50 p-4 text-sm text-red-700">
            {error}
          </div>
        )}

        {/* Results */}
        {result && (
          <div className="mt-6 rounded-xl border border-slate-200 bg-white p-6 shadow-sm">
            <div className="mb-6 text-center">
              <Activity className="mx-auto mb-2 h-8 w-8 text-emerald-500" />
              <p className="text-sm text-slate-500">Overall Financial Health Score</p>
              <p className={`text-6xl font-extrabold ${overallColor}`}>
                {result.score.toFixed(1)}
              </p>
              <p className="text-sm text-slate-400">out of 10</p>
              <p className="mt-1 text-xs text-slate-400">
                Calculated at {new Date(result.calculated_at).toLocaleString('en-IN')}
              </p>
            </div>

            {result.breakdownDetail && (
              <div className="space-y-4">
                <p className="text-xs font-semibold uppercase tracking-wider text-slate-400">Score Breakdown</p>
                <ScoreBar label="Income-Expense Ratio" score={result.breakdownDetail.incomeExpenseScore} />
                <ScoreBar label="Emergency Fund Adequacy" score={result.breakdownDetail.emergencyFundScore} />
                <ScoreBar label="Portfolio Diversification" score={result.breakdownDetail.diversificationScore} />
                <ScoreBar label="Insurance Coverage" score={result.breakdownDetail.insuranceScore} />
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
