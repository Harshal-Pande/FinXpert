'use client';

import { useMemo, useState } from 'react';
import { ShieldAlert } from 'lucide-react';
import { Modal } from './Modal';
import { runStressTest, type StressScenario, type StressTestResult } from '@/lib/api/stress-test';

type Props = {
  open: boolean;
  onClose: () => void;
  clientId?: string;
  currentScore?: number;
  onSimulationActiveChange?: (active: boolean) => void;
  onSimulationSelect?: (scenario: StressScenario, result: StressTestResult) => void;
};

const SCENARIOS: Array<{ id: StressScenario; title: string; desc: string }> = [
  {
    id: 'MARKET_MELTDOWN',
    title: 'Market Meltdown',
    desc: 'Stocks -40%, Crypto -70% shock simulation.',
  },
  {
    id: 'JOB_LOSS',
    title: 'Job Loss',
    desc: 'Income drops to zero; liquidity stress takes over.',
  },
  {
    id: 'MEDICAL_SHOCK',
    title: 'Medical Shock',
    desc: 'Instant INR 5,00,000 emergency cash drawdown.',
  },
];

function Gauge({ score, color }: { score: number; color: 'slate' | 'red' }) {
  const clamped = Math.max(0, Math.min(10, score));
  const angle = (clamped / 10) * 180;
  const arcColor = color === 'red' ? '#ef4444' : '#334155';
  return (
    <div className="relative h-24 w-44">
      <svg viewBox="0 0 200 110" className="h-full w-full">
        <path d="M 10 100 A 90 90 0 0 1 190 100" stroke="#E2E8F0" strokeWidth="14" fill="none" />
        <path d="M 10 100 A 90 90 0 0 1 190 100" stroke={arcColor} strokeWidth="10" fill="none" strokeDasharray="282.7" strokeDashoffset={282.7 - (282.7 * clamped) / 10} />
      </svg>
      <div className="absolute left-1/2 top-[14px] h-[74px] w-[2px] -translate-x-1/2 origin-bottom bg-slate-900" style={{ transform: `translateX(-50%) rotate(${angle - 90}deg)` }} />
      <div className="absolute bottom-1 left-1/2 -translate-x-1/2 rounded-md bg-white/90 px-2 py-0.5 text-xs font-semibold text-slate-700">
        {clamped.toFixed(1)}
      </div>
    </div>
  );
}

export default function StressTestModal({
  open,
  onClose,
  clientId,
  currentScore,
  onSimulationActiveChange,
  onSimulationSelect,
}: Props) {
  const [loading, setLoading] = useState(false);
  const [selected, setSelected] = useState<StressScenario | null>(null);
  const [result, setResult] = useState<StressTestResult | null>(null);
  const [error, setError] = useState<string | null>(null);

  const narrative = useMemo(() => {
    if (!result) return null;
    return `Your score would drop from ${result.currentScore.toFixed(1)} to ${result.stressedScore.toFixed(
      1,
    )}. Your biggest vulnerability is ${result.biggestVulnerability.replaceAll('_', ' ')}.`;
  }, [result]);

  const handleScenarioClick = async (scenario: StressScenario) => {
    if (!clientId) {
      setError('No client selected for stress simulation.');
      return;
    }
    setLoading(true);
    setSelected(scenario);
    setError(null);
    try {
      const res = await runStressTest(clientId, scenario);
      setResult(res);
      onSimulationActiveChange?.(true);
      onSimulationSelect?.(scenario, res);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Failed to run stress test');
      setResult(null);
      onSimulationActiveChange?.(false);
    } finally {
      setLoading(false);
    }
  };

  return (
    <Modal open={open} onClose={onClose} title="Stress Test Simulation" className="max-w-3xl">
      <div className="space-y-4">
        <div className="grid grid-cols-1 gap-3 md:grid-cols-3">
          {SCENARIOS.map((scenario) => (
            <button
              key={scenario.id}
              type="button"
              onClick={() => handleScenarioClick(scenario.id)}
              className={`rounded-xl border p-3 text-left transition ${
                selected === scenario.id
                  ? 'border-slate-900 bg-slate-50'
                  : 'border-slate-200 bg-white hover:border-slate-400'
              }`}
            >
              <p className="text-sm font-semibold text-slate-900">{scenario.title}</p>
              <p className="mt-1 text-xs text-slate-600">{scenario.desc}</p>
            </button>
          ))}
        </div>

        {loading && (
          <div className="rounded-xl border border-slate-200 bg-slate-50 p-4 text-sm text-slate-700">
            Calculating Resilience...
          </div>
        )}

        {error && (
          <div className="rounded-xl border border-red-200 bg-red-50 p-3 text-sm text-red-700">{error}</div>
        )}

        {!loading && result && (
          <div className="space-y-4 rounded-xl border border-slate-200 p-4">
            <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
              <div className="rounded-xl bg-slate-50 p-3">
                <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">Current Score</p>
                <div className="mt-2 flex justify-center">
                  <Gauge score={currentScore ?? result.currentScore} color="slate" />
                </div>
              </div>
              <div className="rounded-xl bg-red-50 p-3">
                <p className="text-xs font-semibold uppercase tracking-wide text-red-500">Stressed Score</p>
                <div className="mt-2 flex justify-center">
                  <Gauge score={result.stressedScore} color="red" />
                </div>
              </div>
            </div>
            <div className="rounded-lg bg-amber-50 p-3 text-sm text-amber-900">
              <span className="font-semibold">Survival Horizon:</span>{' '}
              You survive {result.survivalHorizonMonths.toFixed(1)} months in this scenario.
            </div>
            <div className="rounded-lg bg-slate-100 p-3 text-sm text-slate-800">
              <p className="font-semibold">Narrative Output</p>
              <p className="mt-1">{narrative}</p>
              <p className="mt-1 text-red-600">Points Dropped: -{Math.abs(result.pointsDropped).toFixed(1)}</p>
            </div>
          </div>
        )}

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
