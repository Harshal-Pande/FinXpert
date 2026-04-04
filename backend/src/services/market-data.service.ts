import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';

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

interface NewsArticle {
  title: string;
  description: string;
  url: string;
  source: string;
  publishedAt: string;
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

  constructor(private readonly config: ConfigService) {
    this.alphaVantageKey = this.config.get<string>('externalApis.alphaVantageKey');
    this.binanceBaseUrl = this.config.get<string>('externalApis.binanceBaseUrl') ?? 'https://api.binance.com';
    this.newsApiKey = this.config.get<string>('externalApis.newsApiKey');
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
  async fetchFinancialNews(query = 'finance'): Promise<{ query: string; articles: NewsArticle[] }> {
    if (!this.newsApiKey) {
      this.logger.warn('NEWS_API_KEY not set, returning mock news');
      return { query, articles: this.getMockNews() };
    }

    try {
      const url = `https://newsapi.org/v2/everything?q=${encodeURIComponent(query)}&sortBy=publishedAt&pageSize=10&apiKey=${this.newsApiKey}`;
      const res = await fetch(url);
      const json = await res.json();

      const articles: NewsArticle[] = (json.articles ?? []).map(
        (a: Record<string, unknown>) => ({
          title: a.title as string,
          description: a.description as string,
          url: a.url as string,
          source: (a.source as Record<string, string>)?.name ?? 'Unknown',
          publishedAt: a.publishedAt as string,
        }),
      );

      return { query, articles };
    } catch (error) {
      this.logger.error('NewsAPI fetch failed:', error);
      return { query, articles: this.getMockNews() };
    }
  }

  /**
   * Get a combined market statistics snapshot.
   */
  async getMarketStats() {
    const [niftyData, cryptoData, newsData] = await Promise.all([
      this.fetchStockData('RELIANCE.BSE'),
      this.fetchCryptoPrices(['BTCUSDT', 'ETHUSDT']),
      this.fetchFinancialNews('Indian stock market'),
    ]);

    return {
      stocks: {
        symbol: niftyData.symbol,
        latestPrice: niftyData.data[0]?.close ?? 0,
        change: niftyData.data.length >= 2
          ? niftyData.data[0].close - niftyData.data[1].close
          : 0,
      },
      crypto: cryptoData.data,
      newsCount: newsData.articles.length,
      topHeadline: newsData.articles[0]?.title ?? 'No news available',
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

  private getMockNews(): NewsArticle[] {
    return [
      {
        title: 'Sensex rises 300 points amid positive global cues',
        description:
          'Indian stock markets opened higher on Monday, tracking gains in Asian markets.',
        url: 'https://example.com/news/1',
        source: 'Economic Times',
        publishedAt: new Date().toISOString(),
      },
      {
        title: 'RBI holds interest rates steady, signals cautious optimism',
        description:
          'The Reserve Bank of India kept the repo rate unchanged at 6.5%.',
        url: 'https://example.com/news/2',
        source: 'Mint',
        publishedAt: new Date().toISOString(),
      },
    ];
  }
}
