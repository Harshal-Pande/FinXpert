import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';

/** Troy ounces per gram (for XAU USD/oz × USDINR → ₹/g). */
const GRAMS_PER_TROY_OZ = 31.1034768;

interface YahooQuoteMeta {
  price: number;
  prevClose: number;
  currency: string;
  shortName?: string;
}

interface StockQuote {
  symbol: string;
  open: number;
  high: number;
  low: number;
  close: number;
  volume: number;
  date: string;
}

interface CryptoPrice {
  symbol: string;
  price: number;
}

export type NewsArticleSentiment = 'Positive' | 'Negative' | 'Neutral';

export interface NewsArticle {
  title: string;
  description: string;
  url: string;
  source: string;
  publishedAt: string;
  urlToImage?: string;
  /** Present on curated fallback rows for UI / testing. */
  sentiment?: NewsArticleSentiment;
}

/** How the current `articles` payload was produced (for client messaging). */
export type NewsFetchProvider =
  | 'newsapi'
  | 'fallback_no_key'
  | 'fallback_error'
  | 'empty_live';

export interface NewsFetchResult {
  query: string;
  articles: NewsArticle[];
  provider: NewsFetchProvider;
}

/**
 * Aggregates market data from Alpha Vantage (stocks), Binance (crypto), NewsAPI.
 * Gracefully falls back to mock data when API keys are not configured.
 */
@Injectable()
export class MarketDataService {
  private readonly logger = new Logger(MarketDataService.name);
  private readonly alphaVantageKey?: string;
  private readonly binanceBaseUrl: string;
  private readonly newsApiKey?: string;
  private readonly newsMarketQuery: string;
  private readonly useYahooIndices: boolean;
  private readonly yahooCache = new Map<string, { at: number; data: YahooQuoteMeta | null }>();
  private static readonly YAHOO_UA = 'Mozilla/5.0 (compatible; FinXpert/1.0; +https://github.com/)';
  private static readonly YAHOO_CHART_TTL_MS = 45_000;

  constructor(private readonly config: ConfigService) {
    this.alphaVantageKey = this.config.get<string>('externalApis.alphaVantageKey');
    this.binanceBaseUrl = this.config.get<string>('externalApis.binanceBaseUrl') ?? 'https://api.binance.com';
    this.newsApiKey = this.config.get<string>('externalApis.newsApiKey')?.trim();
    this.useYahooIndices = this.config.get<boolean>('externalApis.useYahooIndices') !== false;
    const defaultFinanceQuery =
      '(NIFTY OR Sensex OR BSE OR NSE) AND ("stock market" OR equities OR RBI)';
    const rawQuery = this.config.get<string>('externalApis.newsMarketQuery') ?? defaultFinanceQuery;
    const q = rawQuery.trim();
    // NEWS_MARKET_QUERY must be a search phrase; if someone pasted a second API key, ignore it.
    if (/^[a-f0-9]{24,}$/i.test(q)) {
      this.logger.warn(
        'NEWS_MARKET_QUERY looks like an API key, not a search query. Using default finance keywords. Put your NewsAPI key only in NEWS_API_KEY.',
      );
      this.newsMarketQuery = defaultFinanceQuery;
    } else {
      this.newsMarketQuery = q || defaultFinanceQuery;
    }
  }

  getDefaultNewsQuery(): string {
    return this.newsMarketQuery;
  }

  /**
   * Strip accidental API-key-like tokens from the NewsAPI `q` parameter so the key is never sent as search text.
   */
  private sanitizeNewsSearchQuery(q: string): string {
    let s = (q ?? '').trim();
    if (!s) return this.newsMarketQuery;
    s = s.replace(/\b[a-f0-9]{24,}\b/gi, ' ').replace(/\s+/g, ' ').trim();
    return s.length >= 3 ? s : this.newsMarketQuery;
  }

  private buildNewsEverythingUrl(searchQuery: string, pageSize: number): string {
    const params = new URLSearchParams();
    params.set('q', searchQuery);
    params.set('sortBy', 'publishedAt');
    params.set('pageSize', String(Math.min(100, Math.max(1, pageSize))));
    return `https://newsapi.org/v2/everything?${params.toString()}`;
  }

  /**
   * Live index / FX from Yahoo Finance chart API (no API key). Falls back to null on error or rate limits.
   */
  private async fetchYahooQuote(symbol: string): Promise<YahooQuoteMeta | null> {
    if (!this.useYahooIndices) return null;

    const now = Date.now();
    const cached = this.yahooCache.get(symbol);
    if (cached && now - cached.at < MarketDataService.YAHOO_CHART_TTL_MS) {
      return cached.data;
    }

    let parsed: YahooQuoteMeta | null = null;
    try {
      const url = `https://query1.finance.yahoo.com/v8/finance/chart/${encodeURIComponent(symbol)}?range=5d&interval=1d`;
      const res = await fetch(url, {
        headers: { 'User-Agent': MarketDataService.YAHOO_UA, Accept: 'application/json' },
      });
      if (!res.ok) {
        this.logger.warn(`Yahoo chart HTTP ${res.status} for ${symbol}`);
      } else {
        const json = (await res.json()) as {
          chart?: { result?: Array<{ meta?: Record<string, unknown> }>; error?: unknown };
        };
        const meta = json?.chart?.result?.[0]?.meta;
        if (meta) {
          const price = meta.regularMarketPrice as number | undefined;
          const prevClose =
            (meta.chartPreviousClose as number | undefined) ??
            (meta.previousClose as number | undefined);
          if (price != null && prevClose != null && prevClose !== 0) {
            parsed = {
              price,
              prevClose,
              currency: (meta.currency as string) ?? '',
              shortName: meta.shortName as string | undefined,
            };
          }
        }
        if (!parsed && json?.chart?.error) {
          this.logger.warn(`Yahoo chart error for ${symbol}: ${JSON.stringify(json.chart.error)}`);
        }
      }
    } catch (e) {
      this.logger.warn(`Yahoo fetch failed for ${symbol}: ${e instanceof Error ? e.message : e}`);
    }

    this.yahooCache.set(symbol, { at: now, data: parsed });
    return parsed;
  }

  private formatIndexPulse(
    displayName: string,
    q: YahooQuoteMeta,
    fractionDigits: number,
  ): {
    name: string;
    value: string;
    change: string;
    pc: string;
    trend: 'up' | 'down' | 'flat';
  } {
    const delta = q.price - q.prevClose;
    const pct = (delta / q.prevClose) * 100;
    const flat =
      !Number.isFinite(delta) ||
      !Number.isFinite(pct) ||
      (Math.abs(delta) < 10 ** -fractionDigits && Math.abs(pct) < 0.005);
    const trend: 'up' | 'down' | 'flat' = flat ? 'flat' : delta > 0 ? 'up' : 'down';
    const sign = flat ? '' : delta > 0 ? '+' : '';
    return {
      name: displayName,
      value: q.price.toLocaleString('en-IN', {
        minimumFractionDigits: fractionDigits,
        maximumFractionDigits: fractionDigits,
      }),
      change: flat ? (0).toFixed(fractionDigits) : sign + delta.toFixed(fractionDigits),
      pc: flat ? '0.00%' : sign + pct.toFixed(2) + '%',
      trend,
    };
  }

  /** Approximate domestic 24k ₹/10g from COMEX gold (USD/oz) × USDINR — not MCX; useful for direction/magnitude. */
  private static goldInrPer10g(usdPerOz: number, inrPerUsd: number): number {
    const inrPerOz = usdPerOz * inrPerUsd;
    const inrPerGram = inrPerOz / GRAMS_PER_TROY_OZ;
    return inrPerGram * 10;
  }

  /**
   * Fetch daily stock data from Alpha Vantage.
   * Falls back to mock data if API key is not configured.
   */
  async fetchStockData(symbol: string): Promise<{ symbol: string; data: StockQuote[] }> {
    if (!this.alphaVantageKey) {
      this.logger.warn('ALPHA_VANTAGE_API_KEY not set, returning mock stock data');
      return {
        symbol,
        data: this.getMockStockData(symbol),
      };
    }

    try {
      const url = `https://www.alphavantage.co/query?function=TIME_SERIES_DAILY&symbol=${symbol}&apikey=${this.alphaVantageKey}&outputsize=compact`;
      const res = await fetch(url);
      const json = await res.json();

      const timeSeries = json['Time Series (Daily)'];
      if (!timeSeries) {
        this.logger.warn(`No data for symbol ${symbol}, returning mock`);
        return { symbol, data: this.getMockStockData(symbol) };
      }

      const data: StockQuote[] = Object.entries(timeSeries)
        .slice(0, 30)
        .map(([date, values]: [string, Record<string, string>]) => ({
          symbol,
          date,
          open: parseFloat(values['1. open']),
          high: parseFloat(values['2. high']),
          low: parseFloat(values['3. low']),
          close: parseFloat(values['4. close']),
          volume: parseInt(values['5. volume'], 10),
        }));

      return { symbol, data };
    } catch (error) {
      this.logger.error(`Alpha Vantage fetch failed for ${symbol}:`, error);
      return { symbol, data: this.getMockStockData(symbol) };
    }
  }

  /**
   * Fetch crypto prices from Binance.
   * Falls back to mock data if the API is unreachable.
   */
  async fetchCryptoPrices(symbols: string[]): Promise<{ symbols: string[]; data: CryptoPrice[] }> {
    try {
      const url = `${this.binanceBaseUrl}/api/v3/ticker/price`;
      const res = await fetch(url);
      const allPrices = (await res.json()) as { symbol: string; price: string }[];

      const symbolSet = new Set(symbols.map((s) => s.toUpperCase()));
      const data: CryptoPrice[] = allPrices
        .filter((p) => symbolSet.has(p.symbol))
        .map((p) => ({
          symbol: p.symbol,
          price: parseFloat(p.price),
        }));

      return { symbols, data };
    } catch (error) {
      this.logger.error('Binance fetch failed:', error);
      return {
        symbols,
        data: symbols.map((s) => ({ symbol: s, price: 0 })),
      };
    }
  }

  /**
   * Fetch financial news from NewsAPI.
   * Falls back to mock data if API key is not configured.
   */
  async fetchFinancialNews(
    query = 'finance',
    pageSize = 10,
  ): Promise<NewsFetchResult> {
    const logicalQuery = this.sanitizeNewsSearchQuery(query);

    if (!this.newsApiKey) {
      this.logger.warn('NEWS_API_KEY not set, returning mock news');
      return {
        query: logicalQuery,
        articles: this.getFallbackNewsArticles(),
        provider: 'fallback_no_key',
      };
    }

    try {
      const url = this.buildNewsEverythingUrl(logicalQuery, pageSize);
      const res = await fetch(url, {
        headers: {
          Accept: 'application/json',
          'X-Api-Key': this.newsApiKey,
        },
      });
      const rawText = await res.text();
      let json: Record<string, unknown>;
      try {
        json = JSON.parse(rawText) as Record<string, unknown>;
      } catch {
        this.logger.warn(
          `NewsAPI: non-JSON response (HTTP ${res.status}) bodyPrefix=${rawText.slice(0, 200)}`,
        );
        return {
          query: logicalQuery,
          articles: this.getFallbackNewsArticles(),
          provider: 'fallback_error',
        };
      }

      if (!res.ok) {
        this.logger.warn(
          `NewsAPI HTTP ${res.status}: ${JSON.stringify({ status: json.status, code: json.code, message: json.message }).slice(0, 500)}`,
        );
        return {
          query: logicalQuery,
          articles: this.getFallbackNewsArticles(),
          provider: 'fallback_error',
        };
      }

      if (json.status === 'error') {
        this.logger.warn(
          `NewsAPI provider error: ${JSON.stringify({ code: json.code, message: json.message })}`,
        );
        return {
          query: logicalQuery,
          articles: this.getFallbackNewsArticles(),
          provider: 'fallback_error',
        };
      }

      const rawArticles = Array.isArray(json.articles) ? json.articles : [];
      const articles: NewsArticle[] = rawArticles.map((a: Record<string, unknown>) => ({
        title: (a.title as string) ?? '',
        description: (a.description as string) ?? '',
        url: (a.url as string) ?? '#',
        source: (a.source as Record<string, string>)?.name ?? 'Unknown',
        publishedAt: (a.publishedAt as string) ?? new Date().toISOString(),
        urlToImage: typeof a.urlToImage === 'string' ? a.urlToImage : undefined,
      }));

      if (articles.length === 0) {
        this.logger.warn(
          `NewsAPI returned 0 articles (q="${logicalQuery}", pageSize=${pageSize}). totalResults=${json.totalResults ?? 'n/a'}`,
        );
        return { query: logicalQuery, articles: [], provider: 'empty_live' };
      }

      this.logger.log(`NewsAPI OK: ${articles.length} articles for q="${logicalQuery}"`);
      return { query: logicalQuery, articles, provider: 'newsapi' };
    } catch (error) {
      this.logger.error('NewsAPI fetch failed:', error);
      return {
        query: logicalQuery,
        articles: this.getFallbackNewsArticles(),
        provider: 'fallback_error',
      };
    }
  }

  /**
   * Get a combined market statistics snapshot.
   */
  async getMarketStats() {
    const [nifty, sensex, gold, newsData] = await Promise.all([
      this.getNifty(),
      this.getSensex(),
      this.getGold(),
      this.fetchFinancialNews(this.newsMarketQuery),
    ]);

    return {
      nifty,
      sensex,
      gold,
      newsCount: newsData.articles.length,
      topHeadline: newsData.articles[0]?.title ?? 'No news available',
    };
  }

  /** Single round-trip for dashboards (reduces parallel HTTP from browser → API). */
  async getIndices() {
    const [nifty, sensex, gold] = await Promise.all([
      this.getNifty(),
      this.getSensex(),
      this.getGold(),
    ]);
    return [nifty, sensex, gold] as const;
  }

  async getNifty() {
    const q = await this.fetchYahooQuote('^NSEI');
    if (q) {
      return this.formatIndexPulse('NIFTY 50', q, 2);
    }
    this.logger.warn('NIFTY: Yahoo unavailable, using demo values');
    const baseValue = 22453.8;
    const change = (Math.random() * 200 - 80).toFixed(2);
    const pc = ((parseFloat(change) / baseValue) * 100).toFixed(2);
    const ch = parseFloat(change);
    const trend: 'up' | 'down' | 'flat' = Math.abs(ch) < 1e-6 ? 'flat' : ch > 0 ? 'up' : 'down';
    const sign = trend === 'flat' ? '' : ch > 0 ? '+' : '';
    return {
      name: 'NIFTY 50 (demo)',
      value: (baseValue + ch).toLocaleString('en-IN', { minimumFractionDigits: 2 }),
      change: trend === 'flat' ? change : sign + change,
      pc: trend === 'flat' ? '0.00%' : sign + pc + '%',
      trend,
    };
  }

  async getSensex() {
    const q = await this.fetchYahooQuote('^BSESN');
    if (q) {
      return this.formatIndexPulse('SENSEX', q, 2);
    }
    this.logger.warn('SENSEX: Yahoo unavailable, using demo values');
    const baseValue = 73876.15;
    const change = (Math.random() * 600 - 250).toFixed(2);
    const pc = ((parseFloat(change) / baseValue) * 100).toFixed(2);
    const ch = parseFloat(change);
    const trend: 'up' | 'down' | 'flat' = Math.abs(ch) < 1e-6 ? 'flat' : ch > 0 ? 'up' : 'down';
    const sign = trend === 'flat' ? '' : ch > 0 ? '+' : '';
    return {
      name: 'SENSEX (demo)',
      value: (baseValue + ch).toLocaleString('en-IN', { minimumFractionDigits: 2 }),
      change: trend === 'flat' ? change : sign + change,
      pc: trend === 'flat' ? '0.00%' : sign + pc + '%',
      trend,
    };
  }

  async getGold() {
    const [gc, fx] = await Promise.all([this.fetchYahooQuote('GC=F'), this.fetchYahooQuote('INR=X')]);
    if (gc && fx) {
      const now10g = MarketDataService.goldInrPer10g(gc.price, fx.price);
      const prev10g = MarketDataService.goldInrPer10g(gc.prevClose, fx.prevClose);
      if (prev10g > 0) {
        const delta = now10g - prev10g;
        const pct = (delta / prev10g) * 100;
        const flat = Math.abs(delta) < 0.5 && Math.abs(pct) < 0.005;
        const trend: 'up' | 'down' | 'flat' = flat ? 'flat' : delta > 0 ? 'up' : 'down';
        const sign = flat ? '' : delta > 0 ? '+' : '';
        return {
          name: 'GOLD (₹/10g est.)',
          value: Math.round(now10g).toLocaleString('en-IN'),
          change: flat ? String(Math.round(delta)) : sign + Math.round(delta).toString(),
          pc: flat ? '0.00%' : sign + pct.toFixed(2) + '%',
          trend,
        };
      }
    }
    this.logger.warn('GOLD: Yahoo unavailable, using demo values');
    const baseValue = 66240;
    const change = (Math.random() * 300 - 150).toFixed(2);
    const pc = ((parseFloat(change) / baseValue) * 100).toFixed(2);
    const ch = parseFloat(change);
    const trend: 'up' | 'down' | 'flat' = Math.abs(ch) < 1e-6 ? 'flat' : ch > 0 ? 'up' : 'down';
    const sign = trend === 'flat' ? '' : ch > 0 ? '+' : '';
    return {
      name: 'GOLD (demo)',
      value: (baseValue + ch).toLocaleString('en-IN'),
      change: trend === 'flat' ? change : sign + change,
      pc: trend === 'flat' ? '0.00%' : sign + pc + '%',
      trend,
    };
  }

  private getMockStockData(symbol: string): StockQuote[] {
    const basePrice = 2500;
    return Array.from({ length: 5 }, (_, i) => ({
      symbol,
      date: new Date(Date.now() - i * 86400000).toISOString().split('T')[0],
      open: basePrice + Math.random() * 100 - 50,
      high: basePrice + Math.random() * 100,
      low: basePrice - Math.random() * 100,
      close: basePrice + Math.random() * 50 - 25,
      volume: Math.floor(Math.random() * 1000000),
    }));
  }

  /** Curated demo articles when NewsAPI is unavailable, errors, or returns no usable rows. */
  getFallbackNewsArticles(): NewsArticle[] {
    return this.getMockNews();
  }

  private getMockNews(): NewsArticle[] {
    const now = Date.now();
    return [
      {
        title: 'Nifty surges 1.2% as Sensex hits record high on FII buying',
        description:
          'Benchmark indices extended gains for a third session as global risk appetite improved. Sentiment: Positive (demo).',
        url: 'https://example.com/news/nifty-rally',
        source: 'Economic Times',
        publishedAt: new Date(now).toISOString(),
        urlToImage: undefined,
        sentiment: 'Positive',
      },
      {
        title: 'Global markets slide on growth fears; volatility spikes',
        description:
          'Major indices fell after weak manufacturing data. Sentiment: Negative (demo).',
        url: 'https://example.com/news/global-slide',
        source: 'Reuters',
        publishedAt: new Date(now - 1800000).toISOString(),
        urlToImage: undefined,
        sentiment: 'Negative',
      },
      {
        title: 'RBI holds repo rate steady; analysts expect range-bound trade',
        description:
          'Policy stance seen as balanced for inflation and growth. Sentiment: Neutral (demo).',
        url: 'https://example.com/news/rbi-hold',
        source: 'Mint',
        publishedAt: new Date(now - 3600000).toISOString(),
        urlToImage: undefined,
        sentiment: 'Neutral',
      },
      {
        title: 'Banking sector advances on strong Q4 earnings outlook',
        description:
          'Large-cap lenders led gains after upbeat guidance. Sentiment: Positive (demo).',
        url: 'https://example.com/news/banks-up',
        source: 'Business Standard',
        publishedAt: new Date(now - 5400000).toISOString(),
        urlToImage: undefined,
        sentiment: 'Positive',
      },
      {
        title: 'Crude steadies near range as OPEC+ output plans remain unchanged',
        description:
          'Energy markets await fresh catalysts; price action muted. Sentiment: Neutral (demo).',
        url: 'https://example.com/news/oil-flat',
        source: 'Livemint',
        publishedAt: new Date(now - 7200000).toISOString(),
        urlToImage: undefined,
        sentiment: 'Neutral',
      },
    ];
  }
}
