import { apiClient } from './client';

export interface DashboardSummary {
  totalClients: number;
  totalAUM: number;
  marketAlerts: number;
  pendingTodos: number;
  recentInsights: {
    id: string;
    title: string;
    event_type: string;
    severity: string;
    ai_summary: string | null;
    affected_clients: string[];
    created_at: string;
  }[];
}

export function getDashboardSummary(): Promise<DashboardSummary> {
  return apiClient<DashboardSummary>('/dashboard/summary');
}
