'use client';

import { ActionItem } from '@/lib/api/dashboard';
import { AlertCircle, Wallet, Calendar } from 'lucide-react';

export default function ActionCenter({ 
  highDrift, 
  idleCash, 
  wtcAlerts 
}: { 
  highDrift: ActionItem[], 
  idleCash: ActionItem[], 
  wtcAlerts: ActionItem[] 
}) {
  return (
    <div className="flex flex-col gap-3 h-full overflow-hidden">
      {/* High Drift Section */}
      <div className="space-y-2">
        <div className="flex items-center gap-2 px-1">
          <AlertCircle className="h-3.5 w-3.5 text-red-500" />
          <span className="text-[10px] font-bold uppercase tracking-widest text-slate-400">Portfolio Drift Targets</span>
        </div>
        <div className="space-y-1.5">
          {highDrift.map((item, i) => (
            <div key={i} className="group flex items-center justify-between p-2 rounded-xl bg-slate-50 border border-slate-100 hover:border-slate-300 transition-all cursor-pointer">
              <div className="flex flex-col">
                <span className="text-xs font-bold text-slate-800">{item.clientName}</span>
                <span className="text-[10px] text-red-500 font-medium">Excess Drift: {item.drift}</span>
              </div>
              {/* Removed: Rebalance/Top-up drift actions */}
            </div>
          ))}
        </div>
      </div>

      {/* Idle Cash Section */}
      <div className="space-y-2">
        <div className="flex items-center gap-2 px-1">
          <Wallet className="h-3.5 w-3.5 text-amber-500" />
          <span className="text-[10px] font-bold uppercase tracking-widest text-slate-400">Idle Cash Deployments</span>
        </div>
        <div className="space-y-1.5">
          {idleCash.map((item, i) => (
            <div key={i} className="group flex items-center justify-between p-2 rounded-xl bg-slate-50 border border-slate-100 hover:border-slate-300 transition-all cursor-pointer">
              <div className="flex flex-col">
                <span className="text-xs font-bold text-slate-800">{item.clientName}</span>
                <span className="text-[10px] text-amber-600 font-medium">Available: ₹{(item.amount! / 100000).toFixed(1)}L</span>
              </div>
              {/* Removed: Top-up / deploy action controls */}
            </div>
          ))}
        </div>
      </div>

      {/* WTC Alert Section */}
      <div className="space-y-2">
        <div className="flex items-center gap-2 px-1">
          <Calendar className="h-3.5 w-3.5 text-blue-500" />
          <span className="text-[10px] font-bold uppercase tracking-widest text-slate-400">Upcoming Compliance</span>
        </div>
        <div className="space-y-1.5">
          {wtcAlerts.map((item, i) => (
            <div key={i} className="flex items-center justify-between p-2 rounded-xl bg-slate-50 border border-slate-100">
              <div className="flex flex-col">
                <span className="text-xs font-bold text-slate-800">{item.title}</span>
                <span className="text-[10px] text-slate-500 font-medium">Deadline: {item.deadline}</span>
              </div>
              <span className={`text-[9px] font-extrabold px-1.5 py-0.5 rounded uppercase ${item.priority === 'High' ? 'bg-red-100 text-red-600' : 'bg-blue-100 text-blue-600'}`}>
                {item.priority}
              </span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
