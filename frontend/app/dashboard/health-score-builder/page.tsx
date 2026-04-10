 'use client';

import { useEffect, useMemo, useState } from 'react';
import { listClients, Client } from '@/lib/api/clients';
import {
  FormulaFactorId,
  HealthScoreFormulaStep,
  getHealthScoreFormula,
  updateHealthScoreFormula,
} from '@/lib/api/health-score-formula';
import { Save } from 'lucide-react';
import { PieChart, Pie, Cell, ResponsiveContainer } from 'recharts';
import { toast } from 'sonner';
import Breadcrumb from '@/components/layout/Breadcrumb';

interface PreviewResult {
  rawScore: number;
  finalScore: number;
  factorValues: Record<FormulaFactorId, number>;
}

const FACTORS: Array<{ id: FormulaFactorId; label: string; desc: string }> = [
  { id: 'alr', label: 'Asset/Liability Ratio', desc: 'Investments vs monthly expense' },
  { id: 'emergency_fund', label: 'Emergency Fund', desc: 'Cash runway for 6 months' },
  { id: 'diversification', label: 'Diversification', desc: 'Spread across asset classes' },
  { id: 'investment_behavior', label: 'Investment Behavior', desc: 'Cushion over cost basis' },
  { id: 'crypto_concentration', label: 'Crypto Concentration', desc: 'Volatility exposure level' },
  { id: 'insurance_adequacy', label: 'Insurance Adequacy', desc: 'Coverage vs income obligations' },
  { id: 'tax_efficiency', label: 'Tax Efficiency', desc: 'Tax-friendly allocation score' },
];

const COLORS = ['#10B981', '#E5E7EB'];

function clamp(value: number, min = 0, max = 10) {
  return Math.min(max, Math.max(min, value));
}

function round1(value: number): number {
  return Math.round(value * 10) / 10;
}

function computeFactorValues(client: Client | undefined): Record<FormulaFactorId, number> {
  if (!client) {
    return {
      alr: 0,
      emergency_fund: 0,
      diversification: 0,
      investment_behavior: 0,
      crypto_concentration: 0,
      insurance_adequacy: 0,
      tax_efficiency: 0,
    };
  }
  const investments = client.investments ?? [];
  const totalInvestments = investments.reduce((sum, i) => sum + i.total_value, 0);
  const monthlyExpense = Math.max(client.monthly_expense ?? 0, 1);
  const annualIncome = Math.max(client.annual_income ?? 0, 1);
  const alr = Math.min(1, totalInvestments / (monthlyExpense * 24));
  const emergencyFund = Math.min(1, (client.emergency_fund ?? 0) / (monthlyExpense * 6));
  const diversification = Math.min(1, new Set(investments.map((i) => i.investment_type)).size / 4);
  const costBasis = investments.reduce((sum, i) => sum + i.buy_rate * i.quantity, 0);
  const simulatedMarket = investments.reduce((sum, i) => sum + i.buy_rate * 1.1 * i.quantity, 0);
  const cushionRatio = costBasis > 0 ? (simulatedMarket - costBasis) / costBasis : 0.1;
  const investmentBehavior = cushionRatio <= 0.1 ? 0.55 : 1;
  const cryptoValue = investments.filter((i) => i.investment_type === 'Crypto').reduce((sum, i) => sum + i.total_value, 0);
  const cryptoPct = totalInvestments > 0 ? (cryptoValue / totalInvestments) * 100 : 0;
  const cryptoConcentration = Math.min(1, cryptoPct / 100);
  const insuranceAdequacy = Math.min(1, (client.insurance_coverage ?? 0) / (annualIncome * 10));
  const debtValue = investments.filter((i) => i.investment_type === 'Debt').reduce((sum, i) => sum + i.total_value, 0);
  const mfValue = investments.filter((i) => i.investment_type === 'Mutual_Fund').reduce((sum, i) => sum + i.total_value, 0);
  const taxEfficientPct = totalInvestments > 0 ? ((debtValue + mfValue) / totalInvestments) * 100 : 0;
  const taxEfficiency = Math.min(1, taxEfficientPct / 100);
  return {
    alr,
    emergency_fund: emergencyFund,
    diversification,
    investment_behavior: investmentBehavior,
    crypto_concentration: cryptoConcentration,
    insurance_adequacy: insuranceAdequacy,
    tax_efficiency: taxEfficiency,
  };
}

function computePreview(client: Client | undefined, steps: HealthScoreFormulaStep[]): PreviewResult {
  const factorValues = computeFactorValues(client);
  let rawScore = 5.0;
  for (const step of steps) {
    const value = factorValues[step.factorId] ?? 0;
    const delta = value * step.multiplier;
    rawScore = step.operation === 'subtract' ? rawScore - delta : rawScore + delta;
  }
  const finalScore = clamp(rawScore);
  return { rawScore: round1(rawScore), finalScore: round1(finalScore), factorValues };
}

function normalizeMinMax(rawScore: number, minRaw: number, maxRaw: number): number {
  if (maxRaw === minRaw) return 5.0;
  return clamp(((rawScore - minRaw) / (maxRaw - minRaw)) * 10);
}

function getScoreBand(score: number) {
  if (score < 4) return { label: 'POOR', color: 'text-red-600 bg-red-50' };
  if (score < 6) return { label: 'WEAK', color: 'text-orange-600 bg-orange-50' };
  if (score < 8) return { label: 'MODERATE', color: 'text-yellow-700 bg-yellow-50' };
  if (score < 9.5) return { label: 'GOOD', color: 'text-lime-700 bg-lime-50' };
  return { label: 'EXCELLENT', color: 'text-emerald-700 bg-emerald-50' };
}

function factorLabel(factorId: FormulaFactorId) {
  return FACTORS.find((f) => f.id === factorId)?.label ?? factorId;
}

function formulaText(steps: HealthScoreFormulaStep[]) {
  if (!steps.length) return 'Score = Norm( 5.0 )';
  const expr = steps
    .map((step) => `${step.operation === 'add' ? '+' : '-'} (${factorLabel(step.factorId)} * ${step.multiplier.toFixed(2)})`)
    .join(' ');
  return `Score = Norm( 5.0 ${expr} )`;
}

export default function HealthScoreBuilderPage() {
  const [clients, setClients] = useState<Client[]>([]);
  const [steps, setSteps] = useState<HealthScoreFormulaStep[]>([]);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);
  const [sampleClientId, setSampleClientId] = useState<string>('');

  useEffect(() => {
    Promise.all([listClients({ limit: 100 }), getHealthScoreFormula()])
      .then(([clientsRes, formula]) => {
        setClients(clientsRes.items);
        setSteps(formula.steps ?? []);
        setSampleClientId(clientsRes.items[0]?.id ?? '');
      })
      .catch((err) => setError(err instanceof Error ? err.message : 'Failed to load builder data'));
  }, []);

  const selectedClient = clients.find((client) => client.id === sampleClientId) ?? clients[0];
  const rawPass = clients.map((client) => ({ client, preview: computePreview(client, steps) }));
  const minRaw = rawPass.length ? Math.min(...rawPass.map((entry) => entry.preview.rawScore)) : 0;
  const maxRaw = rawPass.length ? Math.max(...rawPass.map((entry) => entry.preview.rawScore)) : 0;
  const selectedRaw = computePreview(selectedClient, steps);
  const preview = {
    ...selectedRaw,
    finalScore: round1(normalizeMinMax(selectedRaw.rawScore, minRaw, maxRaw)),
  };
  const globalAverageScore = rawPass.length
    ? round1(
        rawPass.reduce(
          (sum, entry) => sum + normalizeMinMax(entry.preview.rawScore, minRaw, maxRaw),
          0,
        ) / rawPass.length,
      )
    : 0;
  const affectedPercent = useMemo(() => {
    if (!clients.length) return 0;
    const affectedCount = clients.reduce((count, client) => {
      const originalScore = client.calculatedHealthScore ?? 0;
      const rawScore = computePreview(client, steps).rawScore;
      const newScore = normalizeMinMax(rawScore, minRaw, maxRaw);
      return Math.abs(newScore - originalScore) > 0.5 ? count + 1 : count;
    }, 0);
    return Math.round((affectedCount / clients.length) * 100);
  }, [clients, steps]);

  const addStep = (factorId: FormulaFactorId) => {
    setError(null);
    setMessage(null);
    setSteps((prev) => [...prev, { factorId, operation: 'add', multiplier: 6 }]);
  };
  const updateStep = (idx: number, next: Partial<HealthScoreFormulaStep>) => {
    setSteps((prev) => prev.map((step, i) => (i === idx ? { ...step, ...next } : step)));
  };
  const removeStep = (idx: number) => setSteps((prev) => prev.filter((_, i) => i !== idx));

  const handleSave = async () => {
    if (steps.length === 0) {
      setError('Add at least one step before saving.');
      return;
    }
    setSaving(true);
    setError(null);
    try {
      console.log('Saving Formula:', steps);
      const updated = await updateHealthScoreFormula(steps);
      setSteps(updated.steps);
      console.log('Formula Saved Successfully');
      setMessage('Sequential formula saved successfully.');
      toast.success('Formula saved — scores recalculated for all clients.');
    } catch (err: unknown) {
      const messageFromError =
        err && typeof err === 'object' && 'message' in err
          ? String((err as { message?: unknown }).message ?? 'Failed to save formula')
          : 'Failed to save formula';
      setError(messageFromError);
      toast.error('Failed to save formula. Check backend logs.');
    } finally {
      setSaving(false);
    }
  };

  const gaugeData = [
    { name: 'score', value: preview.finalScore },
    { name: 'rest', value: Math.max(10 - preview.finalScore, 0) },
  ];
  const scoreBand = getScoreBand(preview.finalScore);
  const previewNeedleAngle = (preview.finalScore / 10) * 180;
  const averageNeedleAngle = (globalAverageScore / 10) * 180;

  return (
    <div className="min-h-screen bg-slate-50 p-6">
      <div className="mx-auto max-w-7xl">
        <div className="mb-5">
          <Breadcrumb />
          <h1 className="mt-2 text-2xl font-semibold text-slate-800">Health Score Builder</h1>
          <p className="text-sm text-slate-500">Build a sequential formula using add/subtract steps.</p>
        </div>

        <div className="grid grid-cols-1 gap-5 lg:grid-cols-4">
          <aside className="rounded-xl border border-slate-200 bg-white p-4 lg:col-span-1">
            <h2 className="text-sm font-semibold text-slate-800">Factors Library</h2>
            <div className="mt-3 space-y-3">
              {FACTORS.map((factor) => (
                <button
                  key={factor.id}
                  type="button"
                  onClick={() => addStep(factor.id)}
                  className="w-full rounded-lg border border-slate-100 p-3 text-left hover:bg-slate-50"
                >
                  <p className="text-sm font-medium text-slate-800">{factor.label}</p>
                  <p className="text-xs text-slate-500">{factor.desc}</p>
                </button>
              ))}
            </div>
          </aside>

          <section className="rounded-xl border border-slate-200 bg-white p-5 lg:col-span-2">
            <div className="flex items-center justify-between">
              <h2 className="text-sm font-semibold text-slate-800">Formula Editor</h2>
              <span className="rounded-md bg-slate-100 px-2 py-1 text-xs font-semibold text-slate-700">
                Steps: {steps.length}
              </span>
            </div>
            <div className="mt-4 space-y-5">
              {steps.length === 0 && (
                <div className="rounded-lg border border-dashed border-slate-300 p-4 text-sm text-slate-500">
                  Click factors from the library to add formula steps.
                </div>
              )}
              {steps.map((step, idx) => (
                <div key={`${step.factorId}-${idx}`} className="rounded-lg border border-slate-200 p-3">
                  <div className="flex items-center justify-between">
                    <p className="text-sm font-medium text-slate-800">{factorLabel(step.factorId)}</p>
                    <button
                      type="button"
                      onClick={() => removeStep(idx)}
                      className="rounded px-2 py-1 text-xs text-red-600 hover:bg-red-50"
                    >
                      X
                    </button>
                  </div>
                  <div className="mt-2 flex items-center gap-3">
                    <div className="inline-flex rounded-md border border-slate-200">
                      <button
                        type="button"
                        onClick={() => updateStep(idx, { operation: 'add' })}
                        className={`px-3 py-1 text-xs ${step.operation === 'add' ? 'bg-emerald-600 text-white' : 'bg-white text-slate-700'}`}
                      >
                        + Add
                      </button>
                      <button
                        type="button"
                        onClick={() => updateStep(idx, { operation: 'subtract' })}
                        className={`px-3 py-1 text-xs ${step.operation === 'subtract' ? 'bg-rose-600 text-white' : 'bg-white text-slate-700'}`}
                      >
                        - Subtract
                      </button>
                    </div>
                    <div className="flex items-center gap-2">
                      <label className="text-xs text-slate-600">Multiplier</label>
                      <input
                        type="number"
                        step="0.1"
                        value={step.multiplier}
                        onChange={(e) => updateStep(idx, { multiplier: Number(e.target.value || 0) })}
                        className="w-24 rounded border border-slate-300 px-2 py-1 text-sm"
                      />
                    </div>
                  </div>
                </div>
              ))}
              <div className="rounded-md bg-blue-50 px-3 py-2 text-xs text-blue-700">
                Global Impact: Ranking 15 clients relative to the new formula. Affects {affectedPercent}% of current clients.
              </div>
            </div>

            <button
              onClick={handleSave}
              disabled={saving || steps.length === 0}
              className="mt-6 inline-flex items-center gap-2 rounded-lg bg-emerald-600 px-4 py-2 text-sm font-semibold text-white hover:bg-emerald-700 disabled:opacity-50"
            >
              <Save className="h-4 w-4" />
              {saving ? 'Saving...' : 'Save Formula'}
            </button>

            {error && (
              <div className="mt-3 rounded-md border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">
                {error}
              </div>
            )}
            {message && <p className="mt-3 text-sm text-emerald-600">{message}</p>}
          </section>

          <aside className="rounded-xl border border-slate-200 bg-white p-4 lg:col-span-1">
            <h2 className="text-sm font-semibold text-slate-800">Score Preview</h2>
            <select
              value={sampleClientId}
              onChange={(e) => setSampleClientId(e.target.value)}
              className="mt-2 w-full rounded-md border border-slate-200 px-2 py-1 text-xs"
            >
              {clients.map((client) => (
                <option key={client.id} value={client.id}>
                  {client.name}
                </option>
              ))}
            </select>

            <div className="relative mt-3 h-44">
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={gaugeData}
                    dataKey="value"
                    startAngle={180}
                    endAngle={0}
                    innerRadius={58}
                    outerRadius={80}
                    stroke="none"
                  >
                    {gaugeData.map((entry, index) => (
                      <Cell key={`${entry.name}-${index}`} fill={COLORS[index]} />
                    ))}
                  </Pie>
                </PieChart>
              </ResponsiveContainer>
              <div className="absolute bottom-[28px] left-1/2 h-[64px] w-[64px] -translate-x-1/2">
                <div
                  className="absolute bottom-0 left-1/2 h-[2px] w-[64px] bg-emerald-700"
                  style={{
                    transformOrigin: 'bottom center',
                    transform: `translateX(-100%) rotate(${previewNeedleAngle}deg)`,
                  }}
                />
                <div
                  className="absolute bottom-0 left-1/2 h-[2px] w-[64px] bg-slate-500/35"
                  style={{
                    transformOrigin: 'bottom center',
                    transform: `translateX(-100%) rotate(${averageNeedleAngle}deg)`,
                  }}
                />
              </div>
              <div className="absolute inset-0 top-8 flex flex-col items-center justify-center">
                <p className="text-4xl font-bold text-slate-900">{preview.finalScore.toFixed(1)}</p>
                <p className="text-[10px] text-slate-500">Relative to Portfolio Performance</p>
                <p className={`mt-1 rounded-full px-2 py-0.5 text-xs font-semibold ${scoreBand.color}`}>
                  {scoreBand.label}
                </p>
                <p className="mt-1 text-[10px] text-slate-500">
                  Ghost needle avg: {globalAverageScore.toFixed(1)}
                </p>
              </div>
            </div>

            <div className="mt-2 space-y-1 text-xs text-slate-600">
              <p>Raw Score: {preview.rawScore}</p>
              <p>Normalized: {preview.finalScore}</p>
              <p>ALR: {preview.factorValues.alr}</p>
              <p>Emergency: {preview.factorValues.emergency_fund}</p>
              <p>Diversification: {preview.factorValues.diversification}</p>
            </div>
          </aside>
        </div>

        <div className="mt-5 rounded-xl border border-slate-200 bg-white p-4">
          <h3 className="text-sm font-semibold text-slate-800">Health Score Scale</h3>
          <div className="mt-2 grid grid-cols-1 gap-2 text-xs sm:grid-cols-5">
            <span className="rounded bg-red-50 px-2 py-1 text-red-700">0 - 3.9: POOR</span>
            <span className="rounded bg-orange-50 px-2 py-1 text-orange-700">4 - 5.9: WEAK</span>
            <span className="rounded bg-yellow-50 px-2 py-1 text-yellow-700">6 - 7.9: MODERATE</span>
            <span className="rounded bg-lime-50 px-2 py-1 text-lime-700">8 - 9.4: GOOD</span>
            <span className="rounded bg-emerald-50 px-2 py-1 text-emerald-700">9.5 - 10: EXCELLENT</span>
          </div>
          <div className="mt-4 rounded-lg bg-slate-900 p-3 font-mono text-xs text-emerald-300">
            {formulaText(steps)}
          </div>
        </div>
      </div>
    </div>
  );
}
