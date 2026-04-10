import { Injectable } from '@nestjs/common';

export interface MarketEvent {
  title: string;
  summary: string;
  impact: 'High' | 'Med' | 'Low';
  category: 'Global' | 'Domestic' | 'Sector-wise';
  timestamp: string;
}

@Injectable()
export class MarketNewsService {
  private readonly news: MarketEvent[] = [
    {
      title: 'US Fed Signal: Interest Rate Peak Approaching',
      summary: 'FOMC minutes suggest a pause in rate hikes as inflation cools faster than expected. Markets react positively with bond yields softening.',
      impact: 'High',
      category: 'Global',
      timestamp: new Date().toISOString(),
    },
    {
      title: 'Reliance Industries Q3 Results Beat Estimates',
      summary: 'Strong performance in retail and O2C segments drives bottom-line growth. Digital services continue to show robust subscriber addition.',
      impact: 'Med',
      category: 'Domestic',
      timestamp: new Date(Date.now() - 15 * 60 * 1000).toISOString(),
    },
    {
      title: 'Automobile Sector: EV Adoption Surges 40% YoY',
      summary: 'New government subsidies and infrastructure expansion lead to record-breaking electric vehicle sales across metro cities.',
      impact: 'Med',
      category: 'Sector-wise',
      timestamp: new Date(Date.now() - 45 * 60 * 1000).toISOString(),
    },
    {
      title: 'Crude Oil Prices Stabilize Amid Geopolitical Ease',
      summary: 'Brent crude holds at $78/barrel as supply concerns diminish. Analysts expect range-bound trading for the upcoming week.',
      impact: 'Low',
      category: 'Global',
      timestamp: new Date(Date.now() - 90 * 60 * 1000).toISOString(),
    },
    {
      title: 'RBI Keeps Repo Rate Unchanged',
      summary: 'The central bank maintains its withdrawal of accommodation stance. Growth projections for the fiscal year upgraded to 7.2%.',
      impact: 'High',
      category: 'Domestic',
      timestamp: new Date(Date.now() - 120 * 60 * 1000).toISOString(),
    },
  ];

  getNews(): MarketEvent[] {
    return this.news.sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime());
  }
}
