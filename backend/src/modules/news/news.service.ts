import { Injectable } from '@nestjs/common';
import { MarketDataService } from '../../services/market-data.service';

export type MarketNewsCategory = 'Global' | 'Domestic' | 'Sector-wise';
export type MarketNewsImpact = 'High' | 'Med' | 'Low';

export interface MarketNewsItemDto {
  headline: string;
  source: string;
  time: string;
  url: string;
  thumbnail: string | null;
  summary: string;
  category: MarketNewsCategory;
  impact: MarketNewsImpact;
}

const DOMESTIC_HINTS =
  /economic times|moneycontrol|livemint|business\s?standard|ndtv|times of india|hindu|rbi|nse|bse|cnbc.*india|financial express|etmarkets|zee business|india/i;

const SECTOR_HINTS =
  /\b(auto|bank|banking|pharma|it sector|fmcg|real estate|infrastructure|oil|energy|metal|telecom|defense|renewable)\b/i;

const HIGH_IMPACT_HINTS =
  /\b(crash|plunge|surge|rbi|fed|rate hike|emergency|default|crisis|record high|record low)\b/i;

@Injectable()
export class NewsService {
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

  async getMarketNews(limit = 10): Promise<MarketNewsItemDto[]> {
    const capped = Math.min(30, Math.max(5, limit));
    const query = this.marketData.getDefaultNewsQuery();
    const { articles } = await this.marketData.fetchFinancialNews(query, Math.max(20, capped));

    const sorted = [...articles]
      .filter((a) => a.title && a.url)
      .sort(
        (a, b) =>
          new Date(b.publishedAt).getTime() - new Date(a.publishedAt).getTime(),
      )
      .slice(0, capped);

    return sorted.map((a) => ({
      headline: a.title,
      source: a.source,
      time: a.publishedAt,
      url: a.url,
      thumbnail: a.urlToImage ?? null,
      summary: a.description ?? '',
      category: this.categorize(a.source, a.title),
      impact: this.inferImpact(a.title, a.description ?? ''),
    }));
  }
}
