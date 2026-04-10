'use client';

import { useCallback, useEffect, useState } from 'react';
import { ActionItem } from '@/lib/api/dashboard';
import { getUpcomingCompliance, type ComplianceItem } from '@/lib/api/compliance';
import { ApiError } from '@/lib/api/client';
import { AlertCircle, Wallet, Calendar } from 'lucide-react';

function ComplianceSkeleton() {
  return (
    <div className="space-y-1.5 animate-pulse">
      {[1, 2, 3].map((i) => (
        <div key={i} className="h-14 rounded-xl bg-slate-100/80" />
      ))}
    </div>
  );
}

export default function ActionCenter({
  highDrift,
  idleCash,
}: {
  highDrift: ActionItem[];
  idleCash: ActionItem[];
}) {
  const [items, setItems] = useState<ComplianceItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const loadCompliance = useCallback(async (showSkeleton = true) => {
    setError(null);
    if (showSkeleton) setLoading(true);
    try {
      const data = await getUpcomingCompliance();
      const sorted = [...data].sort(
        (a, b) => new Date(a.dueDate).getTime() - new Date(b.dueDate).getTime(),
      );
      setItems(sorted);
    } catch (e) {
      const msg =
        e instanceof ApiError
          ? e.message
          : 'We could not load compliance items. Please try again in a moment.';
      setError(msg);
      setItems([]);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void loadCompliance(true);
  }, [loadCompliance]);

  const formatDeadline = (iso: string) =>
    new Date(iso).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' });

  return (
    <div className="flex flex-col gap-3 h-full overflow-hidden">
      <div className="space-y-2">
        <div className="flex items-center gap-2 px-1">
          <AlertCircle className="h-3.5 w-3.5 text-red-500" />
          <span className="text-[10px] font-bold uppercase tracking-widest text-slate-400">
            Portfolio drift targets
          </span>
        </div>
        <div className="space-y-1.5">
          {highDrift.length === 0 ? (
            <p className="text-[10px] text-slate-400 italic px-1 py-2 rounded-xl border border-dashed border-slate-100">
              No clients exceed equity drift thresholds right now.
            </p>
          ) : (
            highDrift.map((item, i) => (
              <div
                key={`${item.clientName}-${i}`}
                className="group flex items-center justify-between p-2 rounded-xl bg-slate-50 border border-slate-100 hover:border-slate-300 transition-all duration-200 hover:shadow-sm"
              >
                <div className="flex flex-col min-w-0">
                  <span className="text-xs font-bold text-slate-800 truncate">{item.clientName}</span>
                  <span className="text-[10px] text-red-600 font-medium">{item.drift}</span>
                </div>
              </div>
            ))
          )}
        </div>
      </div>

      <div className="space-y-2">
        <div className="flex items-center gap-2 px-1">
          <Wallet className="h-3.5 w-3.5 text-amber-500" />
          <span className="text-[10px] font-bold uppercase tracking-widest text-slate-400">
            Idle cash deployments
          </span>
        </div>
        <div className="space-y-1.5">
          {idleCash.length === 0 ? (
            <p className="text-[10px] text-slate-400 italic px-1 py-2 rounded-xl border border-dashed border-slate-100">
              No large idle cash balances flagged.
            </p>
          ) : (
            idleCash.map((item, i) => (
              <div
                key={`${item.clientName}-${i}`}
                className="group flex items-center justify-between p-2 rounded-xl bg-slate-50 border border-slate-100 hover:border-slate-300 transition-all duration-200 hover:shadow-sm"
              >
                <div className="flex flex-col min-w-0">
                  <span className="text-xs font-bold text-slate-800 truncate">{item.clientName}</span>
                  <span className="text-[10px] text-amber-600 font-medium">
                    Available: ₹{((item.amount ?? 0) / 100000).toFixed(1)}L
                  </span>
                </div>
              </div>
            ))
          )}
        </div>
      </div>

      <div className="space-y-2">
        <div className="flex items-center justify-between px-1">
          <div className="flex items-center gap-2">
            <Calendar className="h-3.5 w-3.5 text-blue-500" />
            <span className="text-[10px] font-bold uppercase tracking-widest text-slate-400">
              Upcoming compliance
            </span>
          </div>
          {!loading && (
            <button
              type="button"
              onClick={() => void loadCompliance(false)}
              className="text-[9px] font-bold uppercase text-indigo-600 hover:text-indigo-800 transition-colors"
            >
              Refresh
            </button>
          )}
        </div>
        {error && (
          <p className="text-[10px] text-amber-800 bg-amber-50 border border-amber-100 rounded-lg px-2 py-1.5 leading-snug">
            {error}
          </p>
        )}
        {loading ? (
          <ComplianceSkeleton />
        ) : items.length === 0 && !error ? (
          <p className="text-[10px] text-slate-500 px-1 py-2 rounded-xl border border-dashed border-slate-100 text-center">
            No upcoming compliance.
          </p>
        ) : (
          <div className="space-y-1.5">
            {items.map((c) => (
              <div
                key={c.id}
                className="flex items-center justify-between p-2 rounded-xl bg-slate-50 border border-slate-100 transition-all duration-200 hover:shadow-sm hover:border-slate-200/80"
              >
                <div className="flex flex-col min-w-0 pr-2">
                  <span className="text-xs font-bold text-slate-800 truncate">{c.name}</span>
                  <span className="text-[10px] text-slate-500 font-medium">
                    Due {formatDeadline(c.dueDate)}
                  </span>
                </div>
                <span
                  className={`shrink-0 text-[9px] font-extrabold px-1.5 py-0.5 rounded uppercase tracking-wide ${
                    c.status === 'urgent'
                      ? 'bg-red-100 text-red-600'
                      : 'bg-slate-200/80 text-slate-600'
                  }`}
                >
                  {c.status === 'urgent' ? 'Urgent' : 'Pending'}
                </span>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
