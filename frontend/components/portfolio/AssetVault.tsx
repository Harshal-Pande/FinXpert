'use client';

import { useState, useRef, useLayoutEffect, useCallback, type FormEvent } from 'react';
import { Pencil } from 'lucide-react';
import { Investment } from '@/lib/api/clients';
import { StressScenario } from '@/lib/api/stress-test';
import { updateInvestment, type SimpleInvestmentCategory } from '@/lib/api/investments';

// ─── Types ────────────────────────────────────────────────────────────────────
type Tab = 'stock' | 'debt' | 'crypto' | 'mutual_fund';
type ViewMode = 'VALUE' | 'RETURNS';

interface DebtMFAllocation {
  deductions: Record<string, number>;
  remaining: number;
}

interface Props {
  /** When set, rows show Edit and updates call PUT /investments/:id then refresh client. */
  clientId?: string;
  onInvestmentUpdated?: () => void | Promise<void>;
  investments: Investment[];
  viewMode: ViewMode;
  activeSimulation: StressScenario | null;
  debtAllocation: DebtMFAllocation;
  mfAllocation: DebtMFAllocation;
}

// ─── Constants ────────────────────────────────────────────────────────────────
const TABS: { id: Tab; label: string; icon: string }[] = [
  { id: 'stock',       label: 'Stock',       icon: '📈' },
  { id: 'debt',        label: 'Debt',        icon: '🏦' },
  { id: 'crypto',      label: 'Crypto',      icon: '₿' },
  { id: 'mutual_fund', label: 'Mutual Fund', icon: '📊' },
];

const TAB_CATEGORY: Record<Tab, Investment['category']> = {
  stock:       'STOCK',
  debt:        'DEBT',
  crypto:      'CRYPTO',
  mutual_fund: 'MUTUAL_FUND',
};

const CATEGORY_COLORS: Record<string, string> = {
  STOCK:       'bg-indigo-50 text-indigo-700',
  CRYPTO:      'bg-amber-50  text-amber-700',
  MUTUAL_FUND: 'bg-emerald-50 text-emerald-700',
  DEBT:        'bg-blue-50   text-blue-700',
};

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

// ─── Helpers ─────────────────────────────────────────────────────────────────
function unitCost(asset: Investment): number {
  const a = asset.buyPrice;
  if (a != null && a > 0) return a;
  return asset.buy_rate > 0 ? asset.buy_rate : 0;
}

function formatInr(value: number, compact = false): string {
  return new Intl.NumberFormat('en-IN', {
    style: 'currency',
    currency: 'INR',
    notation: compact ? 'compact' : 'standard',
    minimumFractionDigits: 0,
    maximumFractionDigits: compact ? 2 : 0,
  }).format(value ?? 0);
}

function formatNum(value: number, decimals = 2): string {
  return new Intl.NumberFormat('en-IN', {
    minimumFractionDigits: decimals,
    maximumFractionDigits: decimals,
  }).format(value);
}

function getCategoryTotal(
  assets: Investment[],
  tab: Tab,
  viewMode: ViewMode,
  activeSimulation: StressScenario | null,
  debtAllocation: DebtMFAllocation,
  mfAllocation: DebtMFAllocation,
): number {
  return assets.reduce((sum, asset) => {
    const base = asset.quantity * asset.cmp;
    let stressed = base;
    if (activeSimulation === 'MARKET_MELTDOWN') {
      stressed = base * marketMeltdownFactor(asset.category);
    }
    if (activeSimulation === 'MEDICAL_SHOCK') {
      if (tab === 'debt')        stressed = Math.max(0, base - (debtAllocation.deductions[asset.id] ?? 0));
      if (tab === 'mutual_fund') stressed = Math.max(0, base - (mfAllocation.deductions[asset.id] ?? 0));
    }
    if (viewMode === 'VALUE') return sum + stressed;
    return sum + (stressed - asset.quantity * unitCost(asset));
  }, 0);
}

function getStressedValue(
  asset: Investment,
  tab: Tab,
  activeSimulation: StressScenario | null,
  debtAllocation: DebtMFAllocation,
  mfAllocation: DebtMFAllocation,
): number {
  const base = asset.quantity * asset.cmp;
  if (activeSimulation === 'MARKET_MELTDOWN') {
    return base * marketMeltdownFactor(asset.category);
  }
  if (activeSimulation === 'MEDICAL_SHOCK') {
    if (tab === 'debt')        return Math.max(0, base - (debtAllocation.deductions[asset.id] ?? 0));
    if (tab === 'mutual_fund') return Math.max(0, base - (mfAllocation.deductions[asset.id] ?? 0));
  }
  return base;
}

function changeBadge(pct: number) {
  if (pct > 0) return { cls: 'bg-emerald-50 text-emerald-700', sign: '+' };
  if (pct < 0) return { cls: 'bg-red-50 text-red-700',         sign: '' };
  return       { cls: 'bg-slate-100 text-slate-500',            sign: '' };
}

// ─── Portfolio Table ──────────────────────────────────────────────────────────
function PortfolioTable({
  assets,
  tab,
  viewMode,
  activeSimulation,
  debtAllocation,
  mfAllocation,
  onEditAsset,
}: {
  assets: Investment[];
  tab: Tab;
  viewMode: ViewMode;
  activeSimulation: StressScenario | null;
  debtAllocation: DebtMFAllocation;
  mfAllocation: DebtMFAllocation;
  onEditAsset?: (asset: Investment) => void;
}) {
  return (
    <div className="overflow-x-auto rounded-xl border border-slate-100">
      <table className="w-full text-sm">
        {/* Sticky header */}
        <thead>
          <tr className="sticky top-0 z-10 border-b border-slate-200 bg-slate-50 text-left">
            <th className="px-4 py-2.5 text-xs font-semibold uppercase tracking-wider text-slate-500">
              Asset
            </th>
            <th className="px-4 py-2.5 text-xs font-semibold uppercase tracking-wider text-slate-500 text-right">
              Qty
            </th>
            <th className="px-4 py-2.5 text-xs font-semibold uppercase tracking-wider text-slate-500 text-right">
              Avg. Buy
            </th>
            <th className="px-4 py-2.5 text-xs font-semibold uppercase tracking-wider text-slate-500 text-right">
              CMP
            </th>
            <th
              colSpan={viewMode === 'VALUE' ? 1 : 2}
              className="px-4 py-2.5 text-xs font-semibold uppercase tracking-wider text-slate-500 text-right"
            >
              {viewMode === 'VALUE' ? 'Total Holdings' : 'P / L'}
            </th>
            {onEditAsset ? (
              <th className="px-4 py-2.5 text-xs font-semibold uppercase tracking-wider text-slate-500 text-right w-24">
                Edit
              </th>
            ) : null}
          </tr>
        </thead>

        <tbody className="divide-y divide-slate-50">
          {assets.map((asset) => {
            const marketValue  = asset.quantity * asset.cmp;
            const stressed     = getStressedValue(asset, tab, activeSimulation, debtAllocation, mfAllocation);
            const costBasis    = asset.quantity * unitCost(asset);
            const absReturn    = stressed - costBasis;
            const returnPct    = costBasis > 0 ? (absReturn / costBasis) * 100 : 0;
            const positive     = absReturn >= 0;
            const catColor     = CATEGORY_COLORS[asset.category] ?? 'bg-slate-100 text-slate-500';
            const isStressed   = activeSimulation !== null;

            return (
              <tr
                key={asset.id}
                className="group hover:bg-slate-50/70 transition-colors duration-100"
              >
                {/* Asset Name + Badge */}
                <td className="px-4 py-3">
                  <div className="flex items-center gap-2">
                    <p className="font-medium text-slate-800 leading-tight">
                      {asset.instrument_name}
                    </p>
                    <span className={`shrink-0 rounded-full px-2 py-0.5 text-[10px] font-bold uppercase ${catColor}`}>
                      {asset.category === 'MUTUAL_FUND' ? 'MF' : asset.category}
                    </span>
                  </div>
                </td>

                {/* Quantity */}
                <td className="px-4 py-3 text-right font-mono text-slate-600 text-xs">
                  {formatNum(asset.quantity, asset.quantity % 1 === 0 ? 0 : 4)}
                </td>

                {/* Avg Buy Price */}
                <td className="px-4 py-3 text-right font-mono text-slate-600 text-xs">
                  {formatInr(asset.buyPrice)}
                </td>

                {/* CMP — keep neutral styling (no red) */}
                <td className="px-4 py-3 text-right font-mono text-xs">
                  <span className="text-slate-700">{formatInr(asset.cmp)}</span>
                </td>

                {/* Market Value OR P/L */}
                {viewMode === 'VALUE' ? (
                  <td className="px-4 py-3 text-right font-mono font-semibold">
                    {isStressed && stressed !== marketValue ? (
                      <div className="flex flex-col items-end gap-0.5">
                        <span className="text-xs text-slate-400 line-through">{formatInr(marketValue)}</span>
                        <span className="text-red-600">{formatInr(stressed)}</span>
                      </div>
                    ) : (
                      <span className="text-slate-900">{formatInr(marketValue)}</span>
                    )}
                  </td>
                ) : (
                  <>
                    {/* Absolute P/L */}
                    <td className="px-4 py-3 text-right font-mono font-semibold">
                      <span className={positive ? 'text-emerald-600' : 'text-red-600'}>
                        {positive ? '+' : ''}{formatInr(absReturn)}
                      </span>
                    </td>
                    {/* % P/L */}
                    <td className="px-4 py-3 text-right">
                      <span
                        className={`inline-flex items-center rounded-full px-2 py-0.5 text-[11px] font-bold ${
                          positive ? 'bg-emerald-50 text-emerald-700' : 'bg-red-50 text-red-700'
                        }`}
                      >
                        {positive ? '▲' : '▼'} {Math.abs(returnPct).toFixed(2)}%
                      </span>
                    </td>
                  </>
                )}
                {onEditAsset ? (
                  <td className="px-4 py-3 text-right">
                    <button
                      type="button"
                      onClick={() => onEditAsset(asset)}
                      className="inline-flex items-center justify-center rounded-lg border border-slate-200 p-1.5 text-slate-600 hover:bg-slate-100 hover:text-slate-900"
                      aria-label={`Edit ${asset.instrument_name}`}
                    >
                      <Pencil className="h-3.5 w-3.5" />
                    </button>
                  </td>
                ) : null}
              </tr>
            );
          })}
        </tbody>

        {/* Footer — totals row */}
        <tfoot>
          <tr className="border-t-2 border-slate-200 bg-slate-50/80">
            <td className="px-4 py-2.5 text-xs font-bold text-slate-500 uppercase tracking-wide" colSpan={4}>
              Total
            </td>
            {viewMode === 'VALUE' ? (
              <td className="px-4 py-2.5 text-right font-mono font-bold text-slate-900">
                {formatInr(
                  assets.reduce((s, a) =>
                    s + getStressedValue(a, tab, activeSimulation, debtAllocation, mfAllocation), 0),
                )}
              </td>
            ) : (
              <>
                <td className="px-4 py-2.5 text-right font-mono font-bold">
                  {(() => {
                    const total = assets.reduce((s, a) =>
                      s + getStressedValue(a, tab, activeSimulation, debtAllocation, mfAllocation)
                        - a.quantity * unitCost(a), 0);
                    return (
                      <span className={total >= 0 ? 'text-emerald-700' : 'text-red-700'}>
                        {total >= 0 ? '+' : ''}{formatInr(total)}
                      </span>
                    );
                  })()}
                </td>
                <td className="px-4 py-2.5 text-right font-mono font-bold">
                  {(() => {
                    const cost  = assets.reduce((s, a) => s + a.quantity * unitCost(a), 0);
                    const total = assets.reduce((s, a) =>
                      s + getStressedValue(a, tab, activeSimulation, debtAllocation, mfAllocation), 0);
                    const pct   = cost > 0 ? ((total - cost) / cost) * 100 : 0;
                    return (
                      <span className={pct >= 0 ? 'text-emerald-700' : 'text-red-700'}>
                        {pct >= 0 ? '▲' : '▼'} {Math.abs(pct).toFixed(2)}%
                      </span>
                    );
                  })()}
                </td>
              </>
            )}
            {onEditAsset ? <td className="px-4 py-2.5" aria-hidden /> : null}
          </tr>
        </tfoot>
      </table>
    </div>
  );
}

// ─── Asset Vault (main export) ────────────────────────────────────────────────
export default function AssetVault({
  clientId,
  onInvestmentUpdated,
  investments,
  viewMode,
  activeSimulation,
  debtAllocation,
  mfAllocation,
}: Props) {
  const [activeTab, setActiveTab] = useState<Tab>('stock');
  const [animKey, setAnimKey]     = useState(0);
  const contentRef                = useRef<HTMLDivElement>(null);
  const [contentHeight, setContentHeight] = useState<number | 'auto'>('auto');

  const [editTarget, setEditTarget] = useState<Investment | null>(null);
  const [editForm, setEditForm] = useState({
    instrument_name: '',
    category: 'STOCK' as SimpleInvestmentCategory,
    quantity: '',
    buyPrice: '',
  });
  const [editSaving, setEditSaving] = useState(false);
  const [editError, setEditError] = useState<string | null>(null);

  const openEditAsset = useCallback((asset: Investment) => {
    setEditTarget(asset);
    setEditForm({
      instrument_name: asset.instrument_name,
      category: asset.category,
      quantity: String(asset.quantity),
      buyPrice: String(asset.buyPrice),
    });
    setEditError(null);
  }, []);

  const closeEditAsset = useCallback(() => {
    setEditTarget(null);
    setEditError(null);
  }, []);

  const handleEditSubmit = async (e: FormEvent) => {
    e.preventDefault();
    if (!clientId || !editTarget) return;
    const qty = Number(editForm.quantity);
    const buy = Number(editForm.buyPrice);
    if (!editForm.instrument_name.trim() || !Number.isFinite(qty) || qty <= 0) {
      setEditError('Enter a valid name and quantity.');
      return;
    }
    if (!Number.isFinite(buy) || buy <= 0) {
      setEditError('Enter a valid buy price per unit.');
      return;
    }
    setEditSaving(true);
    setEditError(null);
    try {
      await updateInvestment(clientId, editTarget.id, {
        instrument_name: editForm.instrument_name.trim(),
        category: editForm.category,
        quantity: qty,
        buyPrice: buy,
      });
      await onInvestmentUpdated?.();
      closeEditAsset();
    } catch (err) {
      setEditError(err instanceof Error ? err.message : 'Update failed');
    } finally {
      setEditSaving(false);
    }
  };

  const assets = investments.filter((inv) => inv.category === TAB_CATEGORY[activeTab]);

  useLayoutEffect(() => {
    if (contentRef.current) {
      setContentHeight(contentRef.current.scrollHeight);
    }
  }, [activeTab, investments, viewMode]);

  function switchTab(tab: Tab) {
    setActiveTab(tab);
    setAnimKey((k) => k + 1);
  }

  const total    = getCategoryTotal(assets, activeTab, viewMode, activeSimulation, debtAllocation, mfAllocation);
  const costBase = assets.reduce((s, a) => s + a.quantity * unitCost(a), 0);
  const changePct = costBase > 0 ? ((total - costBase) / costBase) * 100 : 0;
  const badge     = changeBadge(changePct);
  const activeTabMeta = TABS.find((t) => t.id === activeTab)!;

  return (
    <div
      className="w-full border-2 border-slate-800 rounded-3xl bg-white mt-8 overflow-hidden relative"
      style={{ boxShadow: 'inset 0 2px 14px 0 rgba(15,23,42,0.05)' }}
    >
      {/* Title over border trick */}
      <div className="absolute -top-4 left-10 bg-white px-2 text-sm font-medium tracking-wide z-10">
        Asset Vault
      </div>

      {/* ── Pill Tab Bar ───────────────────────────────────────────────────── */}
      <div className="flex flex-wrap items-center gap-1.5 p-4 border-b border-slate-100 bg-slate-50/60">
        {TABS.map((tab) => {
          const count    = investments.filter((inv) => inv.category === TAB_CATEGORY[tab.id]).length;
          const isActive = activeTab === tab.id;
          return (
            <button
              key={tab.id}
              type="button"
              onClick={() => switchTab(tab.id)}
              aria-label={`View ${tab.label} assets`}
              className={`
                flex items-center gap-1.5 rounded-full px-3.5 py-1.5 text-xs font-semibold
                transition-all duration-200 select-none
                ${isActive
                  ? 'bg-slate-900 text-white shadow-sm'
                  : 'text-slate-500 hover:bg-slate-200 hover:text-slate-800'}
              `}
            >
              <span>{tab.icon}</span>
              <span>{tab.label}</span>
              {count > 0 && (
                <span
                  className={`ml-0.5 rounded-full px-1.5 py-0.5 text-[10px] font-bold leading-none ${
                    isActive ? 'bg-white/20 text-white' : 'bg-slate-200 text-slate-600'
                  }`}
                >
                  {count}
                </span>
              )}
            </button>
          );
        })}
      </div>

      {/* ── Category Header ─────────────────────────────────────────────────── */}
      <div className="px-6 pt-5 pb-4 flex items-end justify-between gap-4 flex-wrap">
        <div>
          <p className="text-xs font-semibold uppercase tracking-widest text-slate-400 mb-1">
            {activeTabMeta.label} Holdings
          </p>
          <p
            className={`text-3xl font-bold font-mono tracking-tight ${
              viewMode === 'RETURNS'
                ? total >= 0 ? 'text-emerald-600' : 'text-red-600'
                : 'text-slate-900'
            }`}
          >
            {formatInr(total)}
          </p>
        </div>

        <div className="flex items-center gap-3">
          {viewMode === 'VALUE' && assets.length > 0 && (
            <span className={`inline-flex items-center rounded-full px-3 py-1 text-xs font-bold ${badge.cls}`}>
              {badge.sign}{changePct.toFixed(2)}%
            </span>
          )}
          <span className="text-xs text-slate-400">
            {assets.length} holding{assets.length !== 1 ? 's' : ''}
          </span>
        </div>
      </div>

      {/* ── Animated Content Area ───────────────────────────────────────────── */}
      <div
        className="overflow-hidden transition-[height] duration-300 ease-in-out"
        style={{ height: contentHeight === 'auto' ? 'auto' : `${contentHeight}px` }}
      >
        <div ref={contentRef} className="px-6 pb-6">
          {assets.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-10 gap-3">
              <span className="text-5xl opacity-20">{activeTabMeta.icon}</span>
              <p className="text-sm text-slate-400">
                No {activeTabMeta.label.toLowerCase()} assets found for this client.
              </p>
            </div>
          ) : (
            <div key={animKey} className="animate-vault-in">
              <PortfolioTable
                assets={assets}
                tab={activeTab}
                viewMode={viewMode}
                activeSimulation={activeSimulation}
                debtAllocation={debtAllocation}
                mfAllocation={mfAllocation}
                onEditAsset={clientId ? openEditAsset : undefined}
              />
            </div>
          )}
        </div>
      </div>

      {editTarget && clientId ? (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
          <div className="w-full max-w-md rounded-2xl border-2 border-slate-800 bg-white p-6 shadow-xl">
            <div className="mb-4 flex items-center justify-between">
              <h2 className="text-lg font-semibold">Edit asset</h2>
              <button
                type="button"
                onClick={closeEditAsset}
                className="rounded-md border border-slate-300 px-2 py-1 text-xs text-slate-600 hover:bg-slate-50"
              >
                Close
              </button>
            </div>
            <p className="mb-4 text-xs text-slate-500">
              Submit to sync with FinXpert: CMP is verified via Gemini when available; otherwise buy price is used as
              CMP.
            </p>
            <form onSubmit={(ev) => void handleEditSubmit(ev)} className="space-y-4">
              <div>
                <label className="mb-1 block text-xs font-medium text-slate-600">Instrument name</label>
                <input
                  required
                  value={editForm.instrument_name}
                  onChange={(e) => setEditForm((p) => ({ ...p, instrument_name: e.target.value }))}
                  className="w-full rounded-xl border border-slate-300 px-3 py-2 text-sm focus:border-slate-800 focus:outline-none"
                />
              </div>
              <div>
                <label className="mb-1 block text-xs font-medium text-slate-600">Category</label>
                <select
                  value={editForm.category}
                  onChange={(e) =>
                    setEditForm((p) => ({ ...p, category: e.target.value as SimpleInvestmentCategory }))
                  }
                  className="w-full rounded-xl border border-slate-300 bg-white px-3 py-2 text-sm focus:border-slate-800 focus:outline-none"
                >
                  <option value="STOCK">Stock</option>
                  <option value="DEBT">Debt</option>
                  <option value="CRYPTO">Crypto</option>
                  <option value="MUTUAL_FUND">Mutual Fund</option>
                </select>
              </div>
              <div>
                <label className="mb-1 block text-xs font-medium text-slate-600">Quantity</label>
                <input
                  required
                  type="number"
                  min={0.0001}
                  step="any"
                  value={editForm.quantity}
                  onChange={(e) => setEditForm((p) => ({ ...p, quantity: e.target.value }))}
                  className="w-full rounded-xl border border-slate-300 px-3 py-2 text-sm focus:border-slate-800 focus:outline-none"
                />
              </div>
              <div>
                <label className="mb-1 block text-xs font-medium text-slate-600">Buy price per unit (INR)</label>
                <input
                  required
                  type="number"
                  min={0.01}
                  step="any"
                  value={editForm.buyPrice}
                  onChange={(e) => setEditForm((p) => ({ ...p, buyPrice: e.target.value }))}
                  className="w-full rounded-xl border border-slate-300 px-3 py-2 text-sm focus:border-slate-800 focus:outline-none"
                />
              </div>
              {editError ? <p className="text-sm text-red-600">{editError}</p> : null}
              <div className="flex justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={closeEditAsset}
                  className="rounded-xl border border-slate-300 px-4 py-2 text-sm font-semibold text-slate-700 hover:bg-slate-50"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={editSaving}
                  className="rounded-xl bg-slate-900 px-4 py-2 text-sm font-semibold text-white hover:bg-slate-800 disabled:opacity-50"
                >
                  {editSaving ? 'Saving…' : 'Save changes'}
                </button>
              </div>
            </form>
          </div>
        </div>
      ) : null}
    </div>
  );
}
