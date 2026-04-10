'use client';

import { FormEvent, useEffect, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { Users, Search, Plus } from 'lucide-react';
import {
  createClient,
  listClients,
  Client,
  ListClientsResponse,
  CreateClientPayload,
} from '@/lib/api/clients';

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

// Health score badge/label helpers — identical thresholds used on ALL pages.
function getHealthScoreBadge(score?: number): string {
  if (score == null) return 'bg-slate-100 text-slate-500';
  if (score < 4)   return 'bg-red-100 text-red-700';
  if (score < 6)   return 'bg-orange-100 text-orange-700';
  if (score < 7)   return 'bg-yellow-100 text-yellow-700';
  if (score < 8.5) return 'bg-lime-100 text-lime-700';
  return 'bg-emerald-100 text-emerald-700';
}

function getHealthScoreLabel(score?: number): string {
  if (score == null) return 'N/A';
  if (score < 4)   return 'Poor';
  if (score < 6)   return 'Weak';
  if (score < 7)   return 'Moderate';
  if (score < 8.5) return 'Good';
  return 'Excellent';
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
  const [showAddModal, setShowAddModal] = useState(false);
  const [savingClient, setSavingClient] = useState(false);
  const [addClientError, setAddClientError] = useState<string | null>(null);
  const [addClientForm, setAddClientForm] = useState({
    name: '',
    age: '',
    occupation: '',
    annual_income: '',
    monthly_expense: '',
    emergency_fund: '',
    insurance_coverage: '',
    risk_profile: 'moderate',
    investment_horizon: 'long',
  });

  // Search & filter state
  const [search, setSearch] = useState('');
  const [riskFilter, setRiskFilter] = useState('');
  const [searchInput, setSearchInput] = useState('');

  const loadClients = () => {
    setLoading(true);
    setError(null);

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
  };

  // Fetch when search/filter changes
  useEffect(() => {
    loadClients();
  }, [search, riskFilter]);

  const handleSearch = () => {
    setSearch(searchInput.trim());
  };

  const handleClear = () => {
    setSearchInput('');
    setSearch('');
    setRiskFilter('');
  };

  const closeModal = () => {
    if (savingClient) return;
    setShowAddModal(false);
    setAddClientError(null);
  };

  const handleCreateClient = async (e: FormEvent) => {
    e.preventDefault();
    setAddClientError(null);
    setSavingClient(true);

    try {
      const payload: CreateClientPayload = {
        name: addClientForm.name.trim(),
        age: Number(addClientForm.age),
        occupation: addClientForm.occupation.trim(),
        annual_income: Number(addClientForm.annual_income),
        monthly_expense: Number(addClientForm.monthly_expense),
        risk_profile: addClientForm.risk_profile as CreateClientPayload['risk_profile'],
        investment_horizon:
          addClientForm.investment_horizon as CreateClientPayload['investment_horizon'],
      };

      if (addClientForm.emergency_fund.trim()) {
        payload.emergency_fund = Number(addClientForm.emergency_fund);
      }
      if (addClientForm.insurance_coverage.trim()) {
        payload.insurance_coverage = Number(addClientForm.insurance_coverage);
      }

      await createClient(payload);
      setShowAddModal(false);
      setAddClientForm({
        name: '',
        age: '',
        occupation: '',
        annual_income: '',
        monthly_expense: '',
        emergency_fund: '',
        insurance_coverage: '',
        risk_profile: 'moderate',
        investment_horizon: 'long',
      });
      loadClients();
    } catch (err) {
      setAddClientError(err instanceof Error ? err.message : 'Failed to create client');
    } finally {
      setSavingClient(false);
    }
  };

  return (
    <div className="min-h-screen bg-slate-50 p-8 flex flex-col items-center font-sans text-slate-800">
      
      {/* Container: All Clients */}
      <div className="w-full max-w-5xl border-2 border-slate-800 rounded-3xl p-8 relative flex flex-col items-center bg-white min-h-[600px]">
        {/* Title over border trick */}
        <div className="absolute -top-4 left-10 bg-white px-2 text-xl font-medium tracking-wide">
          All Clients
        </div>

        <button
          type="button"
          onClick={() => setShowAddModal(true)}
          className="absolute -top-4 right-10 inline-flex items-center gap-2 rounded-full border-2 border-slate-800 bg-white px-3 py-1.5 text-xs font-semibold uppercase tracking-wide hover:bg-slate-50"
        >
          <Plus className="h-3.5 w-3.5" />
          Add Client
        </button>

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
                            {client.calculatedHealthScore != null ? (
                              <span
                                className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-[11px] font-bold ${getHealthScoreBadge(client.calculatedHealthScore)}`}
                              >
                                <span className="font-mono">{client.calculatedHealthScore.toFixed(1)}</span>
                                <span>{getHealthScoreLabel(client.calculatedHealthScore)}</span>
                              </span>
                            ) : (
                              <span className="text-xs text-slate-400">—</span>
                            )}
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

      {showAddModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
          <div className="w-full max-w-2xl rounded-2xl border-2 border-slate-800 bg-white p-6 shadow-xl">
            <div className="mb-4 flex items-center justify-between">
              <h2 className="text-lg font-semibold">Add New Client</h2>
              <button
                type="button"
                onClick={closeModal}
                className="rounded-md border border-slate-300 px-2 py-1 text-xs text-slate-600 hover:bg-slate-50"
              >
                Close
              </button>
            </div>

            <form onSubmit={handleCreateClient} className="space-y-4">
              <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
                <input
                  required
                  placeholder="Client Name"
                  value={addClientForm.name}
                  onChange={(e) => setAddClientForm((p) => ({ ...p, name: e.target.value }))}
                  className="rounded-xl border border-slate-300 px-3 py-2 text-sm focus:border-slate-800 focus:outline-none"
                />
                <input
                  required
                  type="number"
                  min={1}
                  max={120}
                  placeholder="Age"
                  value={addClientForm.age}
                  onChange={(e) => setAddClientForm((p) => ({ ...p, age: e.target.value }))}
                  className="rounded-xl border border-slate-300 px-3 py-2 text-sm focus:border-slate-800 focus:outline-none"
                />
                <input
                  required
                  placeholder="Occupation"
                  value={addClientForm.occupation}
                  onChange={(e) => setAddClientForm((p) => ({ ...p, occupation: e.target.value }))}
                  className="rounded-xl border border-slate-300 px-3 py-2 text-sm focus:border-slate-800 focus:outline-none"
                />
                <select
                  value={addClientForm.risk_profile}
                  onChange={(e) => setAddClientForm((p) => ({ ...p, risk_profile: e.target.value }))}
                  className="rounded-xl border border-slate-300 bg-white px-3 py-2 text-sm focus:border-slate-800 focus:outline-none"
                >
                  <option value="conservative">Conservative</option>
                  <option value="moderate">Moderate</option>
                  <option value="aggressive">Aggressive</option>
                  <option value="passive">Passive</option>
                </select>
                <input
                  required
                  type="number"
                  min={0}
                  placeholder="Annual Income (INR)"
                  value={addClientForm.annual_income}
                  onChange={(e) => setAddClientForm((p) => ({ ...p, annual_income: e.target.value }))}
                  className="rounded-xl border border-slate-300 px-3 py-2 text-sm focus:border-slate-800 focus:outline-none"
                />
                <input
                  required
                  type="number"
                  min={0}
                  placeholder="Monthly Expense (INR)"
                  value={addClientForm.monthly_expense}
                  onChange={(e) =>
                    setAddClientForm((p) => ({ ...p, monthly_expense: e.target.value }))
                  }
                  className="rounded-xl border border-slate-300 px-3 py-2 text-sm focus:border-slate-800 focus:outline-none"
                />
                <input
                  type="number"
                  min={0}
                  placeholder="Emergency Fund (optional)"
                  value={addClientForm.emergency_fund}
                  onChange={(e) =>
                    setAddClientForm((p) => ({ ...p, emergency_fund: e.target.value }))
                  }
                  className="rounded-xl border border-slate-300 px-3 py-2 text-sm focus:border-slate-800 focus:outline-none"
                />
                <input
                  type="number"
                  min={0}
                  placeholder="Insurance Coverage (optional)"
                  value={addClientForm.insurance_coverage}
                  onChange={(e) =>
                    setAddClientForm((p) => ({ ...p, insurance_coverage: e.target.value }))
                  }
                  className="rounded-xl border border-slate-300 px-3 py-2 text-sm focus:border-slate-800 focus:outline-none"
                />
              </div>

              <div>
                <label className="mb-1 block text-xs font-medium text-slate-600">
                  Investment Horizon
                </label>
                <select
                  value={addClientForm.investment_horizon}
                  onChange={(e) =>
                    setAddClientForm((p) => ({ ...p, investment_horizon: e.target.value }))
                  }
                  className="w-full rounded-xl border border-slate-300 bg-white px-3 py-2 text-sm focus:border-slate-800 focus:outline-none"
                >
                  <option value="short">Short</option>
                  <option value="medium">Medium</option>
                  <option value="long">Long</option>
                </select>
              </div>

              {addClientError && (
                <div className="rounded-xl border border-red-200 bg-red-50 p-3 text-sm text-red-700">
                  {addClientError}
                </div>
              )}

              <div className="flex justify-end gap-2 pt-1">
                <button
                  type="button"
                  onClick={closeModal}
                  disabled={savingClient}
                  className="rounded-xl border border-slate-300 px-4 py-2 text-sm text-slate-600 hover:bg-slate-50 disabled:opacity-50"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={savingClient}
                  className="rounded-xl bg-slate-800 px-4 py-2 text-sm font-semibold text-white hover:bg-slate-700 disabled:opacity-50"
                >
                  {savingClient ? 'Saving...' : 'Create Client'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
