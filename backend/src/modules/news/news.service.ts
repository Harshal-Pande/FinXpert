import { Injectable, Logger } from '@nestjs/common';
import { MarketDataService } from '../../services/market-data.service';
import type { NewsArticle, NewsFetchProvider } from '../../services/market-data.service';

export type MarketNewsCategory = 'Global' | 'Domestic' | 'Sector-wise';
export type MarketNewsImpact = 'High' | 'Med' | 'Low';

export type MarketNewsFeedSource =
  | 'live'
  | 'fallback_no_api_key'
  | 'fallback_error'
  | 'empty_live';

export interface MarketNewsItemDto {
  headline: string;
  source: string;
  time: string;
  url: string;
  thumbnail: string | null;
  summary: string;
  category: MarketNewsCategory;
  impact: MarketNewsImpact;
  sentiment?: 'Positive' | 'Negative' | 'Neutral';
}

export interface MarketNewsFeedResponse {
  items: MarketNewsItemDto[];
  feedSource: MarketNewsFeedSource;
  queryUsed: string;
}

export type NewsScope = 'All' | 'Global' | 'Domestic' | 'Sector-wise';

const DOMESTIC_HINTS =
  /economic times|moneycontrol|livemint|business\s?standard|ndtv|times of india|hindu|rbi|nse|bse|cnbc.*india|financial express|etmarkets|zee business|india/i;

const SECTOR_HINTS =
  /\b(auto|bank|banking|pharma|it sector|fmcg|real estate|infrastructure|oil|energy|metal|telecom|defense|renewable)\b/i;

const HIGH_IMPACT_HINTS =
  /\b(crash|plunge|surge|rbi|fed|rate hike|emergency|default|crisis|record high|record low)\b/i;

/** NewsAPI `q` strings per UI scope (Task 4: distinct keywords per filter). */
const SCOPE_SEARCH: Record<Exclude<NewsScope, 'All'>, string> = {
  Global: '("stock market" OR equities OR "Federal Reserve" OR "S&P 500" OR "Wall Street")',
  Domestic: '(NIFTY OR Sensex OR BSE OR NSE OR RBI OR "Indian stock market" OR rupee)',
  'Sector-wise':
    '("sector rotation" OR banking OR pharma OR "IT sector" OR FMCG OR energy OR metals) AND (stocks OR earnings)',
};

@Injectable()
export class NewsService {
  private readonly logger = new Logger(NewsService.name);

  constructor(private readonly marketData: MarketDataService) {}

  private categorize(source: string, title: string): MarketNewsCategory {
    const blob = `${source} ${title}`;
    if (SECTOR_HINTS.test(blob)) return 'Sector-wise';
    if (DOMESTIC_HINTS.test(blob)) return 'Domestic';
    return 'Global';
  }

  private inferImpact(title: string, description: string): MarketNewsImpact {
    const blob = `${title} ${description}`.toLowerCase();
    if (HIGH_IMPACT_HINTS.test(blob)) return 'High';
    if (/\b(moderate|steady|flat|range)\b/i.test(blob)) return 'Low';
    return 'Med';
  }

  private resolveSearchQuery(scope: NewsScope): string {
    if (scope === 'All') return this.marketData.getDefaultNewsQuery();
    return SCOPE_SEARCH[scope];
  }

  private mapProviderToFeedSource(provider: NewsFetchProvider): MarketNewsFeedSource {
    if (provider === 'newsapi') return 'live';
    if (provider === 'fallback_no_key') return 'fallback_no_api_key';
    if (provider === 'empty_live') return 'empty_live';
    return 'fallback_error';
  }

  private toDto(a: NewsArticle): MarketNewsItemDto {
    return {
      headline: a.title,
      source: a.source,
      time: a.publishedAt,
      url: a.url,
      thumbnail: a.urlToImage ?? null,
      summary: a.description ?? '',
      category: this.categorize(a.source, a.title),
      impact: this.inferImpact(a.title, a.description ?? ''),
      sentiment: a.sentiment,
    };
  }

  async getMarketNews(limit = 10, scope: NewsScope = 'All'): Promise<MarketNewsFeedResponse> {
    const capped = Math.min(30, Math.max(1, limit));
    const searchQuery = this.resolveSearchQuery(scope);
    const { articles, provider, query } = await this.marketData.fetchFinancialNews(
      searchQuery,
      Math.max(20, capped),
    );

    if (provider === 'empty_live') {
      return {
        items: [],
        feedSource: 'empty_live',
        queryUsed: query,
      };
    }

    const pool = [...articles].filter((a) => a.title && a.url);
    if (pool.length === 0) {
      this.logger.warn('News feed: no articles with title+url after filter');
      return {
        items: [],
        feedSource: provider === 'newsapi' ? 'empty_live' : this.mapProviderToFeedSource(provider),
        queryUsed: query,
      };
    }

    const sorted = pool
      .sort(
        (a, b) =>
          new Date(b.publishedAt).getTime() - new Date(a.publishedAt).getTime(),
      )
      .slice(0, capped);

    return {
      items: sorted.map((a) => this.toDto(a)),
      feedSource: this.mapProviderToFeedSource(provider),
      queryUsed: query,
    };
  }
}
