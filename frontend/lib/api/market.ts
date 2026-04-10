import { apiClient } from './client';

export interface MarketPulse {
  name: string;
  value: string;
  change: string;
  pc: string;
  trend: 'up' | 'down';
}

export interface MarketEvent {
  title: string;
  summary: string;
  source?: string;
  impact: 'High' | 'Med' | 'Low';
  category: 'Global' | 'Domestic' | 'Sector-wise';
  timestamp: string;
  url: string;
  thumbnail?: string;
}

export async function getMarketNifty(): Promise<MarketPulse> {
  return apiClient<MarketPulse>('/market/nifty');
}

export async function getMarketSensex(): Promise<MarketPulse> {
  return apiClient<MarketPulse>('/market/sensex');
}

export async function getMarketGold(): Promise<MarketPulse> {
  return apiClient<MarketPulse>('/market/gold');
}

export async function fetchMarketIndices(): Promise<[MarketPulse, MarketPulse, MarketPulse]> {
  const tuple = await apiClient<[MarketPulse, MarketPulse, MarketPulse]>('/market/indices');
  return tuple;
}

/** Legacy static feed; prefer getMarketNewsFeed from ./news */
export async function getMarketNews(): Promise<MarketEvent[]> {
  return apiClient<MarketEvent[]>('/market/news');
}
