import { Injectable, Logger } from '@nestjs/common';
import { MarketDataService } from '../../services/market-data.service';
import type { NewsArticle } from '../../services/market-data.service';
import type { MarketNewsCategory, MarketNewsImpact, MarketNewsItemDto } from './news.dto';
import { getCuratedMarketNewsFallback } from './curated-fallback-news';

export type { MarketNewsCategory, MarketNewsImpact, MarketNewsItemDto } from './news.dto';

export type MarketNewsFeedSource =
  | 'live'
  | 'fallback_no_api_key'
  | 'fallback_error'
  | 'empty_live'
  | 'fallback_gemini'
  | 'curated';

export interface MarketNewsFeedResponse {
  items: MarketNewsItemDto[];
  feedSource: MarketNewsFeedSource;
  queryUsed: string;
}

export type NewsScope = 'All' | 'STOCK' | 'DEBT' | 'CRYPTO' | 'MUTUAL_FUND';

const HIGH_IMPACT_HINTS =
  /\b(crash|plunge|surge|rbi|rate hike|default|crisis|record high|record low|ban|hack|liquidat)\b/i;

@Injectable()
export class NewsService {
  private readonly logger = new Logger(NewsService.name);

  constructor(private readonly marketData: MarketDataService) {}

  private inferImpact(title: string, description: string): MarketNewsImpact {
    const blob = `${title} ${description}`.toLowerCase();
    if (HIGH_IMPACT_HINTS.test(blob)) return 'High';
    if (/\b(moderate|steady|flat|range)\b/i.test(blob)) return 'Low';
    return 'Med';
  }

  private normalizeCategory(
    raw: string | undefined,
    title: string,
    description: string,
  ): MarketNewsCategory {
    const u = raw?.toUpperCase().trim();
    if (u === 'STOCK' || u === 'DEBT' || u === 'CRYPTO' || u === 'MUTUAL_FUND') return u;
    const blob = `${title} ${description}`.toLowerCase();
    if (/\b(bitcoin|ethereum|crypto|defi|btc|eth|token|stablecoin|exchange)\b/.test(blob)) {
      return 'CRYPTO';
    }
    if (/\b(mutual fund|amc|sip|nav|mf |etf|index fund)\b/.test(blob)) return 'MUTUAL_FUND';
    if (/\b(rbi|repo|g-sec|bond|fd\b|fixed deposit|yield|ocr)\b/.test(blob)) return 'DEBT';
    return 'STOCK';
  }

  private toDto(a: NewsArticle): MarketNewsItemDto {
    const category = this.normalizeCategory(a.subjectCategory, a.title, a.description ?? '');
    return {
      headline: a.title,
      source: a.source,
      time: a.publishedAt,
      url: a.url,
      thumbnail: a.urlToImage ?? null,
      summary: a.description ?? '',
      category,
      impact: this.inferImpact(a.title, a.description ?? ''),
      sentiment: a.sentiment,
      metrics: a.metrics,
    };
  }

  private filterByScope(items: MarketNewsItemDto[], scope: NewsScope): MarketNewsItemDto[] {
    if (scope === 'All') return items;
    return items.filter((i) => i.category === scope);
  }

  /**
   * Subject-oriented headlines via Gemini (STOCK, DEBT, CRYPTO, MUTUAL_FUND; ~90% India, ~10% global crypto).
   * Falls back to curated static items when Gemini is unavailable.
   */
  async getMarketNews(limit = 10, scope: NewsScope = 'All'): Promise<MarketNewsFeedResponse> {
    const capped = Math.min(30, Math.max(1, limit));
    const queryUsed =
      'Gemini subject news: categories STOCK|DEBT|CRYPTO|MUTUAL_FUND; ~90% Indian markets, ~10% global crypto';

    const fetchCount = scope === 'All' ? capped : Math.min(30, capped * 4);
    const articles = await this.marketData.generateSubjectMarketHeadlines(fetchCount);

    let feedSource: MarketNewsFeedSource;
    let pool: MarketNewsItemDto[];

    if (articles.length > 0) {
      feedSource = 'fallback_gemini';
      pool = articles
        .filter((a) => a.title?.trim() && a.url && a.url !== '#')
        .map((a) => this.toDto(a));
    } else {
      this.logger.warn('Subject news: Gemini returned no items; using curated fallback');
      feedSource = 'curated';
      pool = getCuratedMarketNewsFallback();
    }

    const scoped = this.filterByScope(pool, scope);
    const sorted = [...scoped].sort(
      (a, b) => new Date(b.time).getTime() - new Date(a.time).getTime(),
    );

    return {
      items: sorted.slice(0, capped),
      feedSource,
      queryUsed,
    };
  }
}
