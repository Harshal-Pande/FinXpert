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
  sentiment?: MarketEvent['sentiment'];
}

export type MarketNewsFeedSource =
  | 'live'
  | 'fallback_no_api_key'
  | 'fallback_error'
  | 'empty_live';

export type NewsFeedScope = 'All' | 'Global' | 'Domestic' | 'Sector-wise';

export interface MarketNewsFeedResponse {
  items: MarketNewsItemDto[];
  feedSource: MarketNewsFeedSource;
  queryUsed: string;
}

function coerceNewsArray(payload: unknown): MarketNewsItemDto[] {
  return Array.isArray(payload) ? (payload as MarketNewsItemDto[]) : [];
}

function normalizeFeedResponse(raw: unknown, scope: NewsFeedScope): MarketNewsFeedResponse {
  if (raw && typeof raw === 'object' && raw !== null && 'items' in raw) {
    const o = raw as Record<string, unknown>;
    const feedSource = (o.feedSource as MarketNewsFeedSource) ?? 'live';
    const queryUsed = typeof o.queryUsed === 'string' ? o.queryUsed : '';
    return {
      items: coerceNewsArray(o.items),
      feedSource,
      queryUsed,
    };
  }
  if (Array.isArray(raw)) {
    return { items: raw as MarketNewsItemDto[], feedSource: 'live', queryUsed: '' };
  }
  return {
    items: [],
    feedSource: 'empty_live',
    queryUsed: scope === 'All' ? '' : String(scope),
  };
}

export async function getMarketNewsFeed(
  limit = 10,
  scope: NewsFeedScope = 'All',
): Promise<MarketNewsFeedResponse> {
  const capped = Math.min(30, Math.max(1, limit));
  const qs = new URLSearchParams();
  qs.set('limit', String(capped));
  if (scope && scope !== 'All') qs.set('scope', scope);
  const raw = await apiClient<unknown>(`/news/market?${qs}`);
  return normalizeFeedResponse(raw, scope);
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
    sentiment: item.sentiment,
  };
}
