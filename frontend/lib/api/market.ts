import { apiClient } from './client';

export interface MarketEvent {
  title: string;
  summary: string;
  impact: 'High' | 'Med' | 'Low';
  category: 'Global' | 'Domestic' | 'Sector-wise';
  timestamp: string;
}

export async function getMarketNews(): Promise<MarketEvent[]> {
  return apiClient<MarketEvent[]>('/market/news');
}
