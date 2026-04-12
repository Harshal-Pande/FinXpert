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
  sentiment?: 'Positive' | 'Negative' | 'Neutral';
  metrics?: {
    accuracy: number;
    rmse: number;
    mape: number;
    mse: number;
    mae: number;
  };
}
