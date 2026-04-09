'use client';

import { useState } from 'react';

type Props = {
  value: number;
  pnl: number;
  percentage: number;
};

function formatInr(value: number): string {
  return new Intl.NumberFormat('en-IN', {
    style: 'currency',
    currency: 'INR',
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(value ?? 0);
}

export default function PerformanceDisplay({ value, pnl, percentage }: Props) {
  const [mode, setMode] = useState<'pnl' | 'value'>('pnl');
  const positive = pnl >= 0;
  const pnlColor = positive ? 'text-emerald-600' : 'text-rose-600';
  const sign = positive ? '+' : '';

  return (
    <div className="mt-2 space-y-2">
      <div className="inline-flex rounded-md border border-slate-200 p-0.5 text-xs">
        <button
          type="button"
          onClick={() => setMode('pnl')}
          className={`rounded px-2 py-1 ${mode === 'pnl' ? 'bg-slate-800 text-white' : 'text-slate-600'}`}
        >
          Groww Toggle: P/L
        </button>
        <button
          type="button"
          onClick={() => setMode('value')}
          className={`rounded px-2 py-1 ${mode === 'value' ? 'bg-slate-800 text-white' : 'text-slate-600'}`}
        >
          Current Value
        </button>
      </div>
      {mode === 'value' ? (
        <p className="text-sm font-semibold text-slate-900">{formatInr(value)}</p>
      ) : (
        <p className={`text-sm font-semibold ${pnlColor}`}>
          {sign}{formatInr(pnl)} ({sign}{percentage.toFixed(2)}%)
        </p>
      )}
    </div>
  );
}
