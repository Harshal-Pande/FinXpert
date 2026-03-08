import { apiClient } from './client';

export interface MarketInsight {
  id: string;
  title: string;
  event_type: string;
  severity: string;
  ai_summary: string | null;
  affected_clients: string[];
  created_at: string;
}

export async function getMarketInsights(limit = 20): Promise<MarketInsight[]> {
  return apiClient<MarketInsight[]>(`/market-insights?limit=${limit}`);
}
