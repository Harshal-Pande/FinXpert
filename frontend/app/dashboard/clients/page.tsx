'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { Users, Search, Filter } from 'lucide-react';
import { listClients, Client, ListClientsResponse } from '@/lib/api/clients';

function getRiskBadgeStyles(riskProfile: string): string {
  const r = (riskProfile ?? '').toLowerCase();
  if (r === 'aggressive') return 'bg-red-100 text-red-700';
  if (r === 'moderate') return 'bg-emerald-100 text-emerald-700';
  if (r === 'conservative') return 'bg-blue-100 text-blue-700';
  return 'bg-slate-100 text-slate-600';
}

function formatInr(value: number): string {
  return new Intl.NumberFormat('en-IN', {
    style: 'currency',
    currency: 'INR',
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(value ?? 0);
}

function getHealthScoreBadge(score?: number): string {
  if (score == null) return 'bg-slate-100 text-slate-600';
  if (score < 4) return 'bg-red-100 text-red-700';
  if (score < 6) return 'bg-orange-100 text-orange-700';
  if (score < 8) return 'bg-yellow-100 text-yellow-700';
  if (score < 9.5) return 'bg-lime-100 text-lime-700';
  return 'bg-emerald-100 text-emerald-700';
}

function getHealthScoreLabel(score?: number): string {
  if (score == null) return 'N/A';
  if (score < 4) return 'POOR';
  if (score < 6) return 'WEAK';
  if (score < 8) return 'MODERATE';
  if (score < 9.5) return 'GOOD';
  return 'EXCELLENT';
}

const RISK_OPTIONS = [
  { label: 'All Profiles', value: '' },
  { label: 'Conservative', value: 'conservative' },
  { label: 'Moderate', value: 'moderate' },
  { label: 'Aggressive', value: 'aggressive' },
];

export default function ClientsPage() {
  const router = useRouter();
  const [clients, setClients] = useState<Client[]>([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Search & filter state
  const [search, setSearch] = useState('');
  const [riskFilter, setRiskFilter] = useState('');
  const [searchInput, setSearchInput] = useState('');

  // Fetch when search/filter changes
  useEffect(() => {
    setLoading(true);
    setError(null);

    const params: Record<string, string> = { limit: '100' };
    if (search) params.search = search;
    if (riskFilter) params.riskProfile = riskFilter;
    
    listClients({ limit: 100, search, riskProfile: riskFilter } as any)
      .then((res: ListClientsResponse) => {
        setClients(res?.items ?? []);
        // @ts-ignore
        setTotal(res?.total ?? res?.items?.length ?? 0);
      })
      .catch((err: Error) => {
        setError(err.message ?? 'Failed to load clients');
      })
      .finally(() => {
        setLoading(false);
      });
  }, [search, riskFilter]);

  const handleSearch = () => {
    setSearch(searchInput.trim());
  };

  const handleClear = () => {
    setSearchInput('');
    setSearch('');
    setRiskFilter('');
  };

  return (
    <div className="min-h-screen bg-slate-50 p-8 flex flex-col items-center font-sans text-slate-800">
      
      {/* Container: All Clients */}
      <div className="w-full max-w-5xl border-2 border-slate-800 rounded-3xl p-8 relative flex flex-col items-center bg-white min-h-[600px]">
        {/* Title over border trick */}
        <div className="absolute -top-4 left-10 bg-white px-2 text-xl font-medium tracking-wide">
          All Clients
        </div>

        {/* Box: Search And Filter */}
        <div className="border-2 border-slate-800 rounded-3xl px-6 py-4 w-full max-w-2xl relative bg-white mt-4 flex items-center justify-center gap-4">
          <div className="absolute -top-3 w-full text-center left-0 text-sm font-medium tracking-wide">
            <span className="bg-white px-2">Search And Filter</span>
          </div>

          <div className="flex w-full mt-2 gap-3">
             <div className="relative flex-1">
                <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
                <input
                  type="text"
                  placeholder="Search by name…"
                  value={searchInput}
                  onChange={(e) => setSearchInput(e.target.value)}
                  onKeyDown={(e) => e.key === 'Enter' && handleSearch()}
                  className="w-full rounded-xl border border-slate-300 py-2 pl-9 pr-3 text-sm focus:border-slate-800 focus:outline-none"
                />
              </div>
              <button
                onClick={handleSearch}
                className="rounded-xl bg-slate-800 px-4 py-2 text-sm font-semibold text-white hover:bg-slate-700"
              >
                Search
              </button>

              <select
                value={riskFilter}
                onChange={(e) => setRiskFilter(e.target.value)}
                className="rounded-xl border border-slate-300 bg-white px-3 py-2 text-sm text-slate-700 focus:border-slate-800 focus:outline-none"
              >
                {RISK_OPTIONS.map((opt) => (
                  <option key={opt.value} value={opt.value}>
                    {opt.label}
                  </option>
                ))}
              </select>

              {(search || riskFilter) && (
                <button
                  onClick={handleClear}
                  className="rounded-xl border border-slate-300 px-3 py-2 text-sm text-slate-500 hover:bg-slate-50"
                >
                  Clear
                </button>
              )}
          </div>
        </div>

        {error && (
          <div className="mt-4 rounded-xl border border-red-200 bg-red-50 p-4 w-full text-center">
            <p className="text-sm text-red-600">{error}</p>
          </div>
        )}

        {/* Box: All Clients Data */}
        <div className="border-2 border-slate-800 rounded-3xl w-full p-6 relative bg-white mt-10 min-h-[300px] flex flex-col">
           <div className="absolute top-4 w-full text-center left-0 text-sm font-medium tracking-wide">
             All Clients Data
           </div>
           
           <div className="mt-12 w-full flex-1 overflow-auto pr-2">
             <table className="min-w-full text-sm text-left">
               <thead>
                 <tr className="border-b-2 border-slate-100 text-slate-500">
                   <th className="py-3 px-4 font-semibold uppercase tracking-wider">Client</th>
                   <th className="py-3 px-4 font-semibold uppercase tracking-wider text-center">Risk Profile</th>
                  <th className="py-3 px-4 font-semibold uppercase tracking-wider text-right">Portfolio Value</th>
                  <th className="py-3 px-4 font-semibold uppercase tracking-wider text-center">Health Score</th>
                 </tr>
               </thead>
               <tbody className="divide-y divide-slate-50">
                  {loading
                    ? Array.from({ length: 3 }).map((_, i) => (
                        <tr key={i}>
                          <td colSpan={4} className="px-4 py-4">
                            <div className="h-4 w-full animate-pulse rounded bg-slate-100" />
                          </td>
                        </tr>
                      ))
                    : clients.map((client) => (
                        <tr
                          key={client.id}
                          className="cursor-pointer transition-colors hover:bg-slate-50 rounded-lg group"
                          onClick={() => router.push(`/dashboard/clients/${client.id}`)}
                        >
                          <td className="px-4 py-4">
                            <div className="font-semibold text-slate-800 group-hover:text-emerald-600 transition-colors">{client.name}</div>
                            <div className="text-xs text-slate-500 mt-0.5">{client.occupation || '—'}</div>
                          </td>
                          <td className="px-4 py-4 text-center">
                            <span
                              className={`inline-flex rounded-full px-3 py-1 text-[11px] font-bold uppercase tracking-wide ${getRiskBadgeStyles(client.risk_profile ?? '')}`}
                            >
                              {client.risk_profile || '—'}
                            </span>
                          </td>
                          <td className="px-4 py-4 text-right font-mono font-medium text-slate-800">
                            {formatInr(
                              (client.investments ?? []).reduce(
                                (sum, investment) => sum + investment.total_value,
                                0,
                              ),
                            )}
                          </td>
                          <td className="px-4 py-4 text-center">
                            <span
                              className={`inline-flex rounded-full px-2.5 py-1 text-[11px] font-bold ${getHealthScoreBadge(client.calculatedHealthScore)}`}
                            >
                              {client.calculatedHealthScore?.toFixed(1) ?? '—'} {getHealthScoreLabel(client.calculatedHealthScore)}
                            </span>
                          </td>
                        </tr>
                      ))}
               </tbody>
             </table>

             {!loading && clients.length === 0 && (
              <div className="flex flex-col items-center justify-center py-10 text-center">
                <Users className="h-10 w-10 text-slate-300 mb-2" />
                <p className="text-sm text-slate-500">
                  {search || riskFilter
                    ? 'No clients match your search.'
                    : 'Your client database is empty.'}
                </p>
              </div>
            )}
           </div>
        </div>

      </div>
    </div>
  );
}
