import { apiClient } from './client';
import type { MarketEvent } from './market';

/** Raw API item from GET /news/market */
export interface MarketNewsItemDto {
  headline: string;
  source: string;
  time: string;
  url: string;
  thumbnail: string | null;
  summary: string;
  category: MarketEvent['category'];
  impact: MarketEvent['impact'];
}

function coerceNewsArray(payload: unknown): MarketNewsItemDto[] {
  return Array.isArray(payload) ? (payload as MarketNewsItemDto[]) : [];
}

export async function getMarketNewsFeed(limit = 10): Promise<MarketNewsItemDto[]> {
  const capped = Math.min(30, Math.max(1, limit));
  const raw = await apiClient<unknown>(`/news/market?limit=${capped}`);
  return coerceNewsArray(raw);
}

/** Normalized to shared MarketEvent shape for feeds and dashboard. */
export function toMarketEvent(item: MarketNewsItemDto): MarketEvent {
  return {
    title: item.headline,
    summary: item.summary,
    source: item.source,
    impact: item.impact,
    category: item.category,
    timestamp: item.time,
    url: item.url,
    thumbnail: item.thumbnail ?? undefined,
  };
}
