import { apiClient } from './client';
import type { MarketEvent, MarketPulse } from './market';

export interface ActionItem {
  clientName?: string;
  drift?: string;
  amount?: number;
  title?: string;
  deadline?: string;
  action?: string;
  priority?: string;
}

export interface StrategicInsight {
  title: string;
  recommendation: string;
  impact: string;
  category: 'REBALANCE' | 'DEPLOY' | 'RISK' | 'EXPERT';
}

export type { MarketPulse };

export interface DashboardSummary {
  totalClients: number;
  totalAUM: number;
  avgHealthScore: number;
  marketAlerts: number;
  pendingTodos: number;
  actionCenter: {
    highDrift: ActionItem[];
    idleCash: ActionItem[];
    wtcAlerts: ActionItem[];
  };
  strategicInsights: StrategicInsight[];
  marketPulse: MarketPulse[];
  recentNews: MarketEvent[];
  isAiPowered?: boolean;
  aiRates?: any[];
}

export async function getDashboardSummary(advisorId?: string): Promise<DashboardSummary> {
  const url = advisorId ? `/dashboard/summary?advisorId=${advisorId}` : '/dashboard/summary';
  return apiClient<DashboardSummary>(url);
}
