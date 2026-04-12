'use client';

import { Investment } from '@/lib/api/clients';
import { StressScenario } from '@/lib/api/stress-test';

type Props = {
  investment: Investment;
  viewMode: 'VALUE' | 'RETURNS';
  activeSimulation?: StressScenario | null;
  medicalShockDeduction?: number;
};

/** One cost basis for P&amp;L: prefer buyPrice, else buy_rate (matches backend AssetsService). */
function unitCost(inv: Investment): number {
  const a = inv.buyPrice;
  if (a != null && a > 0) return a;
  return inv.buy_rate > 0 ? inv.buy_rate : 0;
}

function marketMeltdownFactor(category: Investment['category']): number {
  switch (category) {
    case 'CRYPTO':
      return 0.3;
    case 'STOCK':
      return 0.6;
    case 'MUTUAL_FUND':
      return 0.78;
    case 'DEBT':
      return 0.95;
    default:
      return 1;
  }
}

function fallbackPerformance(investment: Investment) {
  const cost = unitCost(investment);
  const invested_amount = investment.quantity * cost;
  const current_value = investment.quantity * investment.cmp;
  const absolute_pnl = current_value - invested_amount;
  const pnl_percentage = invested_amount > 0 ? (absolute_pnl / invested_amount) * 100 : 0;
  return { invested_amount, current_value, absolute_pnl, pnl_percentage };
}

function formatInr(value: number): string {
  return new Intl.NumberFormat('en-IN', {
    style: 'currency',
    currency: 'INR',
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(value ?? 0);
}

export default function AssetCard({
  investment,
  viewMode,
  activeSimulation = null,
  medicalShockDeduction = 0,
}: Props) {
  const perf = investment.performance ?? fallbackPerformance(investment);
  const cost = unitCost(investment);
  const absoluteReturn = (investment.cmp - cost) * investment.quantity;
  const returnPct =
    cost > 0 ? ((investment.cmp - cost) / cost) * 100 : 0;
  const marketValue = perf.current_value;
  const stressedMarketValue =
    activeSimulation === 'MARKET_MELTDOWN'
      ? marketValue * marketMeltdownFactor(investment.category)
      : activeSimulation === 'MEDICAL_SHOCK'
      ? Math.max(0, marketValue - medicalShockDeduction)
      : marketValue;
  const costBasis = investment.quantity * cost;
  const stressedAbsoluteReturn = stressedMarketValue - costBasis;
  const stressedReturnPct =
    costBasis > 0 ? (stressedAbsoluteReturn / costBasis) * 100 : 0;

  const displayReturn = activeSimulation ? stressedAbsoluteReturn : absoluteReturn;
  const displayReturnPct = activeSimulation ? stressedReturnPct : returnPct;

  return (
    <div className="rounded-lg border border-slate-200 p-3">
      <div className="flex items-center justify-between gap-3">
        <p className="text-sm font-medium text-slate-800">{investment.instrument_name}</p>
        <span className="rounded bg-slate-100 px-2 py-0.5 text-[10px] font-semibold text-slate-600">
          {investment.category}
        </span>
      </div>
      <p className="mt-1 text-xs text-slate-500">
        Qty: {investment.quantity} | Avg: {investment.buyPrice.toFixed(2)} | CMP: {investment.cmp.toFixed(2)}
      </p>
      <div className="mt-2">
        {viewMode === 'VALUE' ? (
          activeSimulation ? (
            <div className="flex items-center gap-2">
              <p className="text-xs text-slate-500 line-through">{formatInr(marketValue)}</p>
              <p className="text-sm font-semibold text-red-600">{formatInr(stressedMarketValue)}</p>
            </div>
          ) : (
            <p className="text-sm font-semibold text-slate-900">{formatInr(perf.current_value)}</p>
          )
        ) : (
          <p
            className={`text-sm font-semibold ${displayReturn >= 0 ? 'text-green-600' : 'text-red-600'}`}
          >
            {formatInr(displayReturn)} ({displayReturnPct >= 0 ? '+' : ''}
            {displayReturnPct.toFixed(2)}%)
          </p>
        )}
      </div>
    </div>
  );
}
