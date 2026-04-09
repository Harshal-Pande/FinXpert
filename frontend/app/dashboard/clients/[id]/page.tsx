'use client';

import { useEffect, useState } from 'react';
import { useParams } from 'next/navigation';
import { getClient, Client } from '@/lib/api/clients';
import { apiClient } from '@/lib/api/client';
import Link from 'next/link';
import { ArrowLeft, User, Briefcase, Send } from 'lucide-react';
import { AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';
import AssetCard from '@/components/portfolio/AssetCard';

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

const mockChartData = [
  { month: 'Jan', value: 4000 },
  { month: 'Feb', value: 3000 },
  { month: 'Mar', value: 5000 },
  { month: 'Apr', value: 4500 },
  { month: 'May', value: 6000 },
  { month: 'Jun', value: 6500 },
];

export default function ClientDetailPage() {
  const { id } = useParams<{ id: string }>();
  const [client, setClient] = useState<Client | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [activeTab, setActiveTab] = useState('stock');
  const [viewMode, setViewMode] = useState<'VALUE' | 'RETURNS'>('VALUE');

  // Advisory
  const [sendingAdvisory, setSendingAdvisory] = useState(false);
  const [advisoryResult, setAdvisoryResult] = useState<{
    subject: string;
    body: string;
    advice: string;
    status: string;
  } | null>(null);

  useEffect(() => {
    if (!id) return;
    getClient(id)
      .then(setClient)
      .catch((err) => setError(err instanceof Error ? err.message : 'Failed to load client'))
      .finally(() => setLoading(false));
  }, [id]);

  const handleSendAdvisory = async () => {
    if (!id) return;
    setSendingAdvisory(true);
    setAdvisoryResult(null);
    try {
      const result = await apiClient<{
        subject: string;
        body: string;
        advice: string;
        status: string;
      }>(`/clients/${id}/advisory/send`, { method: 'POST' });
      setAdvisoryResult(result);
    } catch {
      setAdvisoryResult({
        subject: 'Error',
        body: 'Failed to generate advisory. Check backend logs.',
        advice: '',
        status: 'error',
      });
    } finally {
      setSendingAdvisory(false);
    }
  };

  if (!id || (!loading && !client)) {
    return (
      <div className="mx-auto max-w-2xl px-6 py-20 text-center">
        <h2 className="text-xl font-bold text-slate-900">Client Not Found</h2>
        <p className="mt-2 text-slate-600">{error || 'The requested client could not be found.'}</p>
        <Link href="/dashboard/clients" className="mt-6 inline-flex items-center gap-2 rounded-lg bg-slate-800 px-4 py-2 text-sm font-semibold text-white hover:bg-slate-700">
          <ArrowLeft className="h-4 w-4" /> Back to Clients
        </Link>
      </div>
    );
  }

  if (loading) {
    return (
      <div className="flex min-h-[400px] items-center justify-center">
        <div className="h-10 w-10 animate-spin rounded-full border-2 border-slate-800 border-t-transparent" />
      </div>
    );
  }

  const allAssets = client!.investments ?? [];
  const stockAssets = allAssets.filter((a) => a.investment_type === 'Stock');
  const debtAssets = allAssets.filter((a) => a.investment_type === 'Debt');
  const cryptoAssets = allAssets.filter((a) => a.investment_type === 'Crypto');
  const mutualFundAssets = allAssets.filter((a) => a.investment_type === 'Mutual_Fund');

  const getAssetReturns = (asset: (typeof allAssets)[number]) =>
    (asset.current_price - asset.buy_rate) * asset.quantity;

  const getCategoryDisplayValue = (assets: typeof allAssets) => {
    if (viewMode === 'VALUE') {
      return assets.reduce((sum, asset) => sum + asset.quantity * asset.current_price, 0);
    }
    return assets.reduce((sum, asset) => sum + getAssetReturns(asset), 0);
  };

  const renderActiveTabData = () => {
    let assets = stockAssets;
    if (activeTab === 'debt') assets = debtAssets;
    if (activeTab === 'crypto') assets = cryptoAssets;
    if (activeTab === 'mutual_fund') assets = mutualFundAssets;

    if (assets.length === 0) {
       return <p className="text-sm text-slate-400 p-4 text-center border-t border-dashed border-slate-300 mt-4">No data.</p>
    }

    return (
      <div className="mt-4 pt-4 border-t border-dashed border-slate-300">
        <div className="space-y-2">
          {assets.map((asset) => (
            <AssetCard key={asset.id} investment={asset} viewMode={viewMode} />
          ))}
        </div>
      </div>
    );
  };

  return (
    <div className="min-h-screen bg-slate-50 p-8 flex justify-center font-sans text-slate-800 relative pb-20">
      
      <Link href="/dashboard/clients" className="absolute top-8 left-8 inline-flex items-center gap-2 text-sm font-medium text-slate-600 hover:text-slate-900">
        <ArrowLeft className="h-4 w-4" /> Back
      </Link>

      {/* Main Container */}
      <div className="w-full max-w-5xl border-2 border-slate-800 rounded-3xl p-8 relative flex flex-col items-center bg-white min-h-[600px] mt-8">
        
        {/* Title over border trick */}
        <div className="absolute -top-4 left-10 bg-white px-2 text-xl font-medium tracking-wide">
          Client Information
        </div>

        <div className="w-full grid grid-cols-1 md:grid-cols-2 gap-6 mt-2">
          
          {/* Information Block */}
          <div className="border-2 border-slate-800 rounded-3xl p-6 relative flex flex-col justify-center gap-2 min-h-[240px]">
            <div className="absolute top-4 w-full text-center left-0 text-sm font-medium tracking-wide bg-white">
              Information
            </div>
            <div className="mt-8 flex flex-col gap-2">
               <h1 className="text-2xl font-bold text-slate-900">{client!.name}</h1>
               <div className="flex flex-col gap-1.5 text-sm text-slate-600 mt-2">
                 <span className="flex items-center gap-2">
                   <Briefcase className="h-4 w-4 text-slate-400" />
                   {client!.occupation || 'No Occupation Listed'}
                 </span>
                 <span className="flex items-center gap-2">
                   <User className="h-4 w-4 text-slate-400" />
                   Age: {client!.age ?? '—'}
                 </span>
                 <div className="mt-2">
                   <span className={`inline-flex rounded-md px-3 py-1 text-xs font-bold uppercase tracking-wider ${getRiskBadgeStyles(client!.risk_profile ?? '')}`}>
                     {client!.risk_profile || 'Unknown Risk'}
                   </span>
                 </div>
               </div>
            </div>
          </div>

          {/* Graph Block */}
          <div className="border-2 border-slate-800 rounded-3xl p-6 relative flex flex-col justify-center min-h-[240px]">
            <div className="absolute top-4 w-full text-center left-0 text-sm font-medium tracking-wide bg-white">
              Graph
            </div>
            <div className="w-full h-32 mt-8">
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={mockChartData} margin={{ top: 0, right: 0, left: -30, bottom: 0 }}>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#E2E8F0" />
                  <XAxis dataKey="month" axisLine={false} tickLine={false} tick={{ fontSize: 10, fill: '#64748B' }} />
                  <YAxis axisLine={false} tickLine={false} tick={{ fontSize: 10, fill: '#64748B' }} />
                  <Tooltip />
                  <Area type="monotone" dataKey="value" stroke="#334155" fill="#F1F5F9" strokeWidth={2} />
                </AreaChart>
              </ResponsiveContainer>
            </div>
          </div>
        </div>

        <div className="mt-6 inline-flex rounded-xl border border-slate-300 bg-slate-100 p-1">
          <button
            type="button"
            onClick={() => setViewMode('VALUE')}
            className={`rounded-lg px-3 py-1 text-xs font-semibold ${
              viewMode === 'VALUE' ? 'bg-slate-800 text-white' : 'text-slate-700'
            }`}
          >
            Market Value
          </button>
          <button
            type="button"
            onClick={() => setViewMode('RETURNS')}
            className={`rounded-lg px-3 py-1 text-xs font-semibold ${
              viewMode === 'RETURNS' ? 'bg-slate-800 text-white' : 'text-slate-700'
            }`}
          >
            Total Returns
          </button>
        </div>

        {/* 4 Category Blocks */}
        <div className="w-full grid grid-cols-2 md:grid-cols-4 gap-6 mt-8">
          
          <div 
             onClick={() => setActiveTab('stock')}
             className={`border-2 border-slate-800 rounded-3xl p-4 min-h-[140px] relative cursor-pointer transition-all ${activeTab === 'stock' ? 'bg-slate-100 ring-4 ring-slate-200' : 'bg-white hover:bg-slate-50'}`}
          >
            <div className="absolute top-4 w-full text-center left-0 text-sm font-medium tracking-wide">
              Stock
            </div>
            <div className="mt-8 text-center text-xl font-bold font-mono">
              {formatInr(getCategoryDisplayValue(stockAssets))}
            </div>
            {activeTab === 'stock' && renderActiveTabData()}
          </div>

          <div 
             onClick={() => setActiveTab('debt')}
             className={`border-2 border-slate-800 rounded-3xl p-4 min-h-[140px] relative cursor-pointer transition-all ${activeTab === 'debt' ? 'bg-slate-100 ring-4 ring-slate-200' : 'bg-white hover:bg-slate-50'}`}
          >
            <div className="absolute top-4 w-full text-center left-0 text-sm font-medium tracking-wide">
              Debt
            </div>
            <div className="mt-8 text-center text-xl font-bold font-mono">
              {formatInr(getCategoryDisplayValue(debtAssets))}
            </div>
            {activeTab === 'debt' && renderActiveTabData()}
          </div>

          <div 
             onClick={() => setActiveTab('crypto')}
             className={`border-2 border-slate-800 rounded-3xl p-4 min-h-[140px] relative cursor-pointer transition-all ${activeTab === 'crypto' ? 'bg-slate-100 ring-4 ring-slate-200' : 'bg-white hover:bg-slate-50'}`}
          >
            <div className="absolute top-4 w-full text-center left-0 text-sm font-medium tracking-wide">
              Crypto
            </div>
            <div className="mt-8 text-center text-xl font-bold font-mono">
              {formatInr(getCategoryDisplayValue(cryptoAssets))}
            </div>
            {activeTab === 'crypto' && renderActiveTabData()}
          </div>

          <div 
             onClick={() => setActiveTab('mutual_fund')}
             className={`border-2 border-slate-800 rounded-3xl p-4 min-h-[140px] relative cursor-pointer transition-all ${activeTab === 'mutual_fund' ? 'bg-slate-100 ring-4 ring-slate-200' : 'bg-white hover:bg-slate-50'}`}
          >
            <div className="absolute top-4 w-full text-center left-0 text-sm font-medium tracking-wide whitespace-nowrap overflow-hidden text-ellipsis px-2">
              Mutual Fund
            </div>
            <div className="mt-8 text-center text-xl font-bold font-mono">
              {formatInr(getCategoryDisplayValue(mutualFundAssets))}
            </div>
            {activeTab === 'mutual_fund' && renderActiveTabData()}
          </div>

        </div>

        {/* Advisory Block */}
        <div className="w-full border-2 border-slate-800 rounded-3xl p-6 mt-8 relative flex flex-col justify-center min-h-[160px]">
          <div className="absolute top-4 w-full text-center left-0 text-sm font-medium tracking-wide bg-white shrink-0 sm:px-4">
            Advisory section(Directly mail with cron jobs)
          </div>

          <div className="mt-8 flex flex-col sm:flex-row items-center justify-between gap-6 px-4">
             <p className="text-sm text-slate-600 flex-1">
               Generate a personalized AI advisory report and queue it for mailing.
             </p>
             <button
                onClick={handleSendAdvisory}
                disabled={sendingAdvisory}
                className="flex items-center gap-2 rounded-xl bg-slate-800 px-6 py-3 text-sm font-semibold text-white hover:bg-slate-700 disabled:opacity-50 shrink-0"
              >
                <Send className="h-4 w-4" />
                {sendingAdvisory ? 'Generating…' : 'Generate Advisory'}
              </button>
          </div>

          {advisoryResult && (
             <div className="mt-6 border-t-2 border-slate-800 pt-6 px-4">
                <p className="text-xs font-semibold uppercase tracking-wider text-slate-500">Advisory Generated</p>
                <p className="mt-2 font-bold text-slate-800 text-lg">{advisoryResult.subject}</p>
                <p className="mt-2 text-sm text-slate-700 leading-relaxed">{advisoryResult.body}</p>
                {advisoryResult.advice && (
                  <div className="mt-4 p-4 bg-slate-50 rounded-xl border border-slate-200">
                    <p className="text-sm font-medium text-slate-700">💡 {advisoryResult.advice}</p>
                  </div>
                )}
                <p className="mt-4 text-xs font-medium text-emerald-600 bg-emerald-50 inline-flex px-3 py-1 rounded-full">
                  Status: {advisoryResult.status}
                </p>
             </div>
          )}

        </div>

      </div>
    </div>
  );
}
