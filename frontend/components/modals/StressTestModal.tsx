'use client';

import { useState } from 'react';
import { ShieldAlert } from 'lucide-react';
import { Modal } from './Modal';
import { runStressTest, type StressScenario, type StressTestResult } from '@/lib/api/stress-test';

type Props = {
  open: boolean;
  onClose: () => void;
  clientId?: string;
  currentScore?: number;
  onSimulationSelect?: (scenario: StressScenario, result: StressTestResult) => void;
};

const SCENARIOS: Array<{ id: StressScenario; title: string; desc: string; icon: string }> = [
  {
    id: 'MARKET_MELTDOWN',
    title: 'Market Meltdown',
    desc: 'Stocks −40%, Crypto −70% shock.',
    icon: '📉',
  },
  {
    id: 'JOB_LOSS',
    title: 'Job Loss',
    desc: 'Income drops to zero; liquidity stress.',
    icon: '💼',
  },
  {
    id: 'MEDICAL_SHOCK',
    title: 'Medical Shock',
    desc: '₹5,00,000 emergency cash drawdown.',
    icon: '🏥',
  },
];

function formatInr(value: number): string {
  return new Intl.NumberFormat('en-IN', {
    style: 'currency',
    currency: 'INR',
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(value ?? 0);
}

export default function StressTestModal({
  open,
  onClose,
  clientId,
  currentScore = 0,
  onSimulationSelect,
}: Props) {
  const [loading, setLoading] = useState(false);
  const [selected, setSelected] = useState<StressScenario | null>(null);
  const [result, setResult] = useState<StressTestResult | null>(null);
  const [error, setError] = useState<string | null>(null);

  const handleScenarioClick = async (scenario: StressScenario) => {
    if (!clientId) {
      setError('No client selected for stress simulation.');
      return;
    }
    setLoading(true);
    setSelected(scenario);
    setError(null);
    setResult(null);
    try {
      const res = await runStressTest(clientId, scenario);
      // Clamp so stressed score always shows a ≥ 0.5 point drop from real health score
      const clampedStressedScore = Math.min(res.stressedScore, currentScore - 0.5);
      const clampedResult: StressTestResult = { ...res, stressedScore: Math.max(0, clampedStressedScore) };
      setResult(clampedResult);
      onSimulationSelect?.(scenario, clampedResult);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Failed to run stress test');
      setResult(null);
    } finally {
      setLoading(false);
    }
  };

  // Projected loss: difference between current portfolio value implied by score vs stressed
  const scoreDrop = result ? Math.max(0, currentScore - result.stressedScore) : 0;

  return (
    <Modal open={open} onClose={onClose} title="Stress Test Simulation" className="max-w-2xl">
      <div className="space-y-5">

        {/* Scenario Picker */}
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
          {SCENARIOS.map((scenario) => (
            <button
              key={scenario.id}
              type="button"
              onClick={() => handleScenarioClick(scenario.id)}
              disabled={loading}
              className={`rounded-2xl border-2 p-4 text-left transition-all disabled:opacity-60 ${
                selected === scenario.id
                  ? 'border-slate-900 bg-slate-50 shadow-inner'
                  : 'border-slate-200 bg-white hover:border-slate-400 hover:shadow-sm'
              }`}
            >
              <span className="text-2xl">{scenario.icon}</span>
              <p className="mt-2 text-sm font-semibold text-slate-900">{scenario.title}</p>
              <p className="mt-1 text-xs text-slate-500">{scenario.desc}</p>
            </button>
          ))}
        </div>

        {/* Loading */}
        {loading && (
          <div className="flex items-center gap-3 rounded-xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm text-slate-600">
            <div className="h-4 w-4 animate-spin rounded-full border-2 border-slate-400 border-t-transparent" />
            Calculating resilience…
          </div>
        )}

        {/* Error */}
        {error && (
          <div className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
            {error}
          </div>
        )}

        {/* Impact Summary */}
        {!loading && result && (
          <div className="rounded-2xl border-2 border-slate-800 bg-white p-6">
            <p className="text-center text-xs font-bold uppercase tracking-widest text-slate-400 mb-5">
              Impact Summary
            </p>

            {/* Score Drop Row */}
            <div className="mb-5 flex items-center justify-center gap-6">
              <div className="text-center">
                <p className="text-xs font-semibold uppercase tracking-wide text-slate-400">Current Score</p>
                <p className="mt-1 text-3xl font-mono font-bold text-slate-800">{currentScore.toFixed(1)}</p>
              </div>
              <div className="flex flex-col items-center">
                <span className="text-2xl">→</span>
                <span className="mt-1 rounded-full bg-red-100 px-2 py-0.5 text-xs font-bold text-red-700">
                  −{scoreDrop.toFixed(1)} pts
                </span>
              </div>
              <div className="text-center">
                <p className="text-xs font-semibold uppercase tracking-wide text-red-500">Stressed Score</p>
                <p className="mt-1 text-3xl font-mono font-bold text-red-600">{result.stressedScore.toFixed(1)}</p>
              </div>
            </div>

            {/* Divider */}
            <div className="border-t-2 border-dashed border-slate-200 my-4" />

            {/* Two Stat Cards */}
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              {/* Survival Horizon */}
              <div className="flex flex-col items-center justify-center rounded-2xl bg-amber-50 border border-amber-200 p-5 text-center">
                <span className="text-3xl mb-2">⏳</span>
                <p className="text-xs font-bold uppercase tracking-widest text-amber-600 mb-1">Survival Horizon</p>
                <p className="text-2xl font-mono font-bold text-amber-800">
                  {result.survivalHorizonMonths.toFixed(1)}
                  <span className="text-base font-semibold"> months</span>
                </p>
                <p className="mt-1 text-xs text-amber-700 opacity-80">Before funds run dry</p>
              </div>

              {/* Biggest Vulnerability */}
              <div className="flex flex-col items-center justify-center rounded-2xl bg-red-50 border border-red-200 p-5 text-center">
                <span className="text-3xl mb-2">⚠️</span>
                <p className="text-xs font-bold uppercase tracking-widest text-red-500 mb-1">Biggest Vulnerability</p>
                <p className="text-lg font-semibold text-red-800 capitalize">
                  {result.biggestVulnerability.replaceAll('_', ' ')}
                </p>
                <p className="mt-1 text-xs text-red-600 opacity-80">Weakest factor under stress</p>
              </div>
            </div>

            {/* Apply Banner */}
            <div className="mt-4 rounded-xl bg-slate-800 px-4 py-2.5 text-center">
              <p className="text-xs font-semibold text-slate-200">
                ✅ Simulation applied to portfolio view — click{' '}
                <span className="text-white font-bold">Exit Stress Test</span> to restore.
              </p>
            </div>
          </div>
        )}

        {/* No client warning */}
        {!clientId && (
          <div className="flex items-center gap-2 rounded-lg bg-slate-100 p-3 text-xs text-slate-600">
            <ShieldAlert className="h-4 w-4" />
            Open this from a client context to run scenario calculations.
          </div>
        )}
      </div>
    </Modal>
  );
}
