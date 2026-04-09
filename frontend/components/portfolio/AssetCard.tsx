'use client';

import { Investment } from '@/lib/api/clients';
import { StressScenario } from '@/lib/api/stress-test';

type Props = {
  investment: Investment;
  viewMode: 'VALUE' | 'RETURNS';
  activeSimulation?: StressScenario | null;
  medicalShockDeduction?: number;
};

function fallbackPerformance(investment: Investment) {
  if (investment.category === 'CASH') {
    return {
      invested_amount: 0,
      current_value: 0,
      absolute_pnl: 0,
      pnl_percentage: 0,
    };
  }
  const invested_amount = investment.quantity * investment.avg_buy_price;
  const current_value = investment.quantity * investment.current_price;
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
  const absoluteReturn = (investment.current_price - investment.buy_rate) * investment.quantity;
  const returnPct = investment.buy_rate > 0
    ? ((investment.current_price - investment.buy_rate) / investment.buy_rate) * 100
    : 0;
  const marketValue = perf.current_value;
  const stressedMarketValue =
    activeSimulation === 'MARKET_MELTDOWN'
      ? investment.category === 'STOCK'
        ? marketValue * 0.6
        : investment.category === 'CRYPTO'
        ? marketValue * 0.3
        : marketValue
      : activeSimulation === 'MEDICAL_SHOCK'
      ? Math.max(0, marketValue - medicalShockDeduction)
      : marketValue;
  const stressedAbsoluteReturn = stressedMarketValue - investment.quantity * investment.buy_rate;
  const stressedReturnPct =
    investment.quantity * investment.buy_rate > 0
      ? (stressedAbsoluteReturn / (investment.quantity * investment.buy_rate)) * 100
      : 0;
  const positive = (activeSimulation ? stressedAbsoluteReturn : absoluteReturn) >= 0;

  return (
    <div className="rounded-lg border border-slate-200 p-3">
      <div className="flex items-center justify-between gap-3">
        <p className="text-sm font-medium text-slate-800">{investment.instrument_name}</p>
        <span className="rounded bg-slate-100 px-2 py-0.5 text-[10px] font-semibold text-slate-600">
          {investment.category}
        </span>
      </div>
      <p className="mt-1 text-xs text-slate-500">
        Qty: {investment.quantity} | Avg: {investment.avg_buy_price.toFixed(2)} | CMP: {investment.current_price.toFixed(2)}
      </p>
      {investment.category !== 'CASH' && (
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
            <p className={`text-sm font-semibold ${positive ? 'text-green-600' : 'text-red-600'}`}>
              {formatInr(activeSimulation ? stressedAbsoluteReturn : absoluteReturn)} (
              {(activeSimulation ? stressedReturnPct : returnPct).toFixed(2)}%)
            </p>
          )}
        </div>
      )}
    </div>
  );
}
