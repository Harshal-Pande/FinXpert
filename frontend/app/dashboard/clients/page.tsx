'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { Users } from 'lucide-react';
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

export default function ClientsPage() {
  const router = useRouter();
  const [clients, setClients] = useState<Client[]>([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    listClients({ limit: 100 })
      .then((res: ListClientsResponse) => {
        setClients(res?.items ?? []);
        setTotal(res?.total ?? res?.items?.length ?? 0);
      })
      .catch((err: Error) => {
        setError(err.message ?? 'Failed to load clients');
      })
      .finally(() => {
        setLoading(false);
      });
  }, []);

  if (loading) {
    return (
      <div className="min-h-[320px] flex items-center justify-center">
        <div className="flex flex-col items-center gap-4">
          <div className="h-10 w-10 animate-spin rounded-full border-2 border-emerald-600 border-t-transparent" />
          <p className="text-slate-500 font-medium">Loading client database…</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="rounded-xl border border-red-200 bg-red-50 p-6 text-center">
        <p className="font-semibold text-red-700">Error loading clients</p>
        <p className="mt-1 text-sm text-red-600">{error}</p>
      </div>
    );
  }

  const displayTotal = total > 0 ? total : clients.length;

  return (
    <div className="min-h-screen bg-white">
      <div className="mx-auto max-w-6xl px-6 py-10">
        {/* Header */}
        <header className="mb-10">
          <h1 className="text-3xl font-extrabold tracking-tight text-slate-900">
            Client Portfolio Database
          </h1>
          <p className="mt-2 text-slate-600">
            {displayTotal} active {displayTotal === 1 ? 'client' : 'clients'}
          </p>
        </header>

        {/* Table */}
        <div className="overflow-hidden rounded-xl border border-slate-200 bg-white shadow-sm">
          <table className="min-w-full divide-y divide-slate-200">
            <thead>
              <tr className="bg-slate-50/80">
                <th className="px-6 py-4 text-left text-xs font-semibold uppercase tracking-wider text-slate-500">
                  Client
                </th>
                <th className="px-6 py-4 text-left text-xs font-semibold uppercase tracking-wider text-slate-500">
                  Risk Profile
                </th>
                <th className="px-6 py-4 text-left text-xs font-semibold uppercase tracking-wider text-slate-500">
                  Portfolio Value
                </th>
                <th className="px-6 py-4 text-right text-xs font-semibold uppercase tracking-wider text-slate-500">
                  Action
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {clients.map((client) => (
                <tr
                  key={client.id}
                  className="cursor-pointer transition-colors hover:bg-slate-50"
                  onClick={() => router.push(`/dashboard/clients/${client.id}`)}
                >
                  <td className="px-6 py-4">
                    <div className="font-semibold text-slate-900">{client.name}</div>
                    <div className="mt-0.5 text-sm text-slate-500">{client.occupation || '—'}</div>
                  </td>
                  <td className="px-6 py-4">
                    <span
                      className={`inline-flex rounded-full px-3 py-1 text-xs font-semibold capitalize ${getRiskBadgeStyles(client.risk_profile ?? '')}`}
                    >
                      {client.risk_profile || '—'}
                    </span>
                  </td>
                  <td className="px-6 py-4 font-mono text-sm font-medium text-slate-900">
                    {formatInr(client.portfolio?.total_value ?? 0)}
                  </td>
                  <td className="px-6 py-4 text-right">
                    <Link
                      href={`/dashboard/clients/${client.id}`}
                      onClick={(e) => e.stopPropagation()}
                      className="inline-flex items-center gap-1 rounded-lg bg-emerald-600 px-4 py-2 text-sm font-semibold text-white transition-colors hover:bg-emerald-700"
                    >
                      Analyze
                      <span aria-hidden>→</span>
                    </Link>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>

          {/* Empty state */}
          {clients.length === 0 && (
            <div className="flex flex-col items-center justify-center py-20 text-center">
              <div className="mb-4 flex h-20 w-20 items-center justify-center rounded-full bg-slate-100">
                <Users className="h-10 w-10 text-slate-400" />
              </div>
              <h3 className="text-lg font-semibold text-slate-800">No clients yet</h3>
              <p className="mt-1 max-w-sm text-sm text-slate-500">
                Your client portfolio database is empty. Add clients to start managing their
                portfolios and running analysis.
              </p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
