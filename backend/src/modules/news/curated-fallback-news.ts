/**
 * Static fallback when Gemini subject headlines are unavailable.
 * Categories: STOCK | DEBT | CRYPTO | MUTUAL_FUND (~90% India-focused, ~10% global crypto).
 */

import type { MarketNewsItemDto } from './news.dto';

type Seed = {
  headline: string;
  summary: string;
  url: string;
  category: 'STOCK' | 'DEBT' | 'CRYPTO' | 'MUTUAL_FUND';
  impact: 'High' | 'Med' | 'Low';
  hoursAgo: number;
};

/** India markets — equities */
const STOCK_INDIA: Seed[] = [
  {
    headline: 'Nifty breadth mixed as heavyweights offset broader weakness',
    summary:
      'Participants cited FII positioning and crude-INR dynamics; stock pickers focused on earnings visibility into the next quarter.',
    url: 'https://www.nseindia.com/',
    category: 'STOCK',
    impact: 'Med',
    hoursAgo: 1,
  },
  {
    headline: 'Sensex holds range as investors weigh domestic flows vs. global yields',
    summary:
      'Index futures implied muted opening risk; mid-caps saw selective accumulation on relative valuation arguments.',
    url: 'https://www.bseindia.com/',
    category: 'STOCK',
    impact: 'Low',
    hoursAgo: 3,
  },
  {
    headline: 'Large-cap IT sees two-way flow ahead of US tech earnings cluster',
    summary:
      'Deal commentary and margin guardrails stayed in focus; INR hedging costs influenced near-term sentiment.',
    url: 'https://www.nseindia.com/market-data/new-stock-exchange-listings',
    category: 'STOCK',
    impact: 'Med',
    hoursAgo: 5,
  },
  {
    headline: 'Banking index in focus as street models NIM path under competitive deposit pricing',
    summary:
      'Credit growth narratives in retail and SME competed with funding-cost worries; stock-specific outcomes diverged.',
    url: 'https://www.rbi.org.in/',
    category: 'STOCK',
    impact: 'High',
    hoursAgo: 7,
  },
  {
    headline: 'Domestic cyclicals react to PMI and GST-led consumption proxies',
    summary:
      'Industrials and consumer discretionary saw event-driven moves; liquidity remained adequate in the cash segment.',
    url: 'https://www.investindia.gov.in/',
    category: 'STOCK',
    impact: 'Low',
    hoursAgo: 9,
  },
  {
    headline: 'Primary market: anchor demand steady as issuers calibrate valuations',
    summary:
      'Book-building discipline improved versus prior cycles; long-only accounts emphasised governance and float.',
    url: 'https://www.sebi.gov.in/',
    category: 'STOCK',
    impact: 'Med',
    hoursAgo: 11,
  },
];

/** India — rates, bonds, liquidity */
const DEBT_INDIA: Seed[] = [
  {
    headline: 'RBI guidance keeps markets focused on durable liquidity and transmission',
    summary:
      'Short-end rates moved in a narrow band; participants parsed commentary on inflation persistence and the policy path.',
    url: 'https://www.rbi.org.in/',
    category: 'DEBT',
    impact: 'High',
    hoursAgo: 2,
  },
  {
    headline: 'G-Sec curve debates term premium as insurance and pension demand stays firm',
    summary:
      'Actuarial buyers reportedly extended at the long end while banks managed SLR and HTM buckets carefully.',
    url: 'https://www.ccilindia.com/',
    category: 'DEBT',
    impact: 'Med',
    hoursAgo: 4,
  },
  {
    headline: 'Corporate bond primary sees selective appetite for AAA and PSU paper',
    summary:
      'Spreads versus G-Secs remained issuer-specific; offshore funding conditions influenced private placement calendars.',
    url: 'https://www.sebi.gov.in/',
    category: 'DEBT',
    impact: 'Low',
    hoursAgo: 6,
  },
  {
    headline: 'Money-market funds and T-bills in focus as quarter-end approaches',
    summary:
      'Treasury desks cited tight but orderly conditions; CP/CD issuers monitored rollover risk closely.',
    url: 'https://www.rbi.org.in/Scripts/BS_PressReleaseDisplay.aspx',
    category: 'DEBT',
    impact: 'Med',
    hoursAgo: 8,
  },
  {
    headline: 'Retail FD repricing continues as banks compete for stable funding',
    summary:
      'Customers compared tenors and small-finance bank offers; advisors highlighted credit quality and deposit insurance limits.',
    url: 'https://www.rbi.org.in/Scripts/Faq.aspx?Id=43',
    category: 'DEBT',
    impact: 'Low',
    hoursAgo: 10,
  },
];

/** India — mutual funds */
const MF_INDIA: Seed[] = [
  {
    headline: 'SIP flows cited as structural support for domestic equity mutual funds',
    summary:
      'AMCs highlighted continued systematic plans into flex-cap and index hybrids despite headline index chop.',
    url: 'https://www.amfiindia.com/',
    category: 'MUTUAL_FUND',
    impact: 'Med',
    hoursAgo: 2.5,
  },
  {
    headline: 'Debt MF categories see rotation as investors weigh duration vs. credit risk',
    summary:
      'Short-duration and corporate bond funds drew comparisons on YTM; credit spreads stayed on surveillance lists.',
    url: 'https://www.amfiindia.com/investor-corner/online-center',
    category: 'MUTUAL_FUND',
    impact: 'Med',
    hoursAgo: 5.5,
  },
  {
    headline: 'Hybrid and balanced advantage funds in focus for glide-path investors',
    summary:
      'Advisers discussed equity-debt mix rules and rebalancing frequency for clients nearing goals.',
    url: 'https://www.sebi.gov.in/',
    category: 'MUTUAL_FUND',
    impact: 'Low',
    hoursAgo: 8.5,
  },
  {
    headline: 'Index and ETF adoption rises as cost sensitivity shapes advisor model portfolios',
    summary:
      'Tracking error and liquidity on exchange remained key due-diligence items for institutional-sized tickets.',
    url: 'https://www.nseindia.com/market-data/etf',
    category: 'MUTUAL_FUND',
    impact: 'Low',
    hoursAgo: 12.5,
  },
  {
    headline: 'ELSS seasonality noted; tax-saving equity funds see measured inflows',
    summary:
      'Distributors emphasised lock-in discipline and suitability versus other 80C instruments.',
    url: 'https://www.incometax.gov.in/iec/foportal/',
    category: 'MUTUAL_FUND',
    impact: 'Low',
    hoursAgo: 15.5,
  },
];

/** ~10% of feed — global crypto context */
const CRYPTO_GLOBAL: Seed[] = [
  {
    headline: 'Bitcoin volatility compresses as majors track macro liquidity expectations',
    summary:
      'Derivatives open interest stabilised after a busy week; funding rates flipped briefly across large venues.',
    url: 'https://www.coindesk.com/',
    category: 'CRYPTO',
    impact: 'High',
    hoursAgo: 1.5,
  },
  {
    headline: 'Ethereum network upgrades and L2 activity stay in focus for allocators',
    summary:
      'Validators and restaking narratives competed with fee-market dynamics; regulatory headlines moved spot correlations.',
    url: 'https://ethereum.org/en/',
    category: 'CRYPTO',
    impact: 'Med',
    hoursAgo: 4.5,
  },
  {
    headline: 'Global stablecoin rules advance as jurisdictions align reporting expectations',
    summary:
      'Exchanges cited compliance investments; treasury desks monitored reserve transparency and redemption latency.',
    url: 'https://www.fatf-gafi.org/',
    category: 'CRYPTO',
    impact: 'Med',
    hoursAgo: 7.5,
  },
];

function toDto(seed: Seed, baseMs: number): MarketNewsItemDto {
  const ms = baseMs - Math.round(seed.hoursAgo * 3600000);
  return {
    headline: seed.headline,
    source: 'FinXpert Curated',
    summary: seed.summary,
    url: seed.url,
    thumbnail: null,
    category: seed.category,
    impact: seed.impact,
    time: new Date(ms).toISOString(),
    sentiment: 'Neutral',
  };
}

/** Curated subject headlines when Gemini is unavailable (~90% India, ~10% global crypto by count). */
export function getCuratedMarketNewsFallback(baseTimeMs = Date.now()): MarketNewsItemDto[] {
  const seeds = [...STOCK_INDIA, ...DEBT_INDIA, ...MF_INDIA, ...CRYPTO_GLOBAL];
  return seeds.map((s) => toDto(s, baseTimeMs));
}
