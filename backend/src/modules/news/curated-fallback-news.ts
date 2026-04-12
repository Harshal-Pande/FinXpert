/**
 * Static fallback feed when NewsAPI / upstream feeds return nothing.
 * 10 Global, 10 Domestic (India), 10 Sector-wise — for Market Trends filters.
 */

import type { MarketNewsItemDto } from './news.dto';

type Seed = {
  headline: string;
  summary: string;
  url: string;
  category: 'Global' | 'Domestic' | 'Sector-wise';
  impact: 'High' | 'Med' | 'Low';
  hoursAgo: number;
};

const GLOBAL: Seed[] = [
  {
    headline: 'Major central banks signal data-dependent policy into next quarter',
    summary:
      'Policymakers reiterated that inflation and labour prints will drive the pace of easing or holds, keeping volatility elevated in rate-sensitive assets.',
    url: 'https://www.imf.org/en/News',
    category: 'Global',
    impact: 'High',
    hoursAgo: 1,
  },
  {
    headline: 'Dollar index steadies as traders weigh growth vs. recession odds',
    summary:
      'FX desks cited thinner liquidity and month-end flows; EM portfolios saw modest rebalancing away from pure USD cash.',
    url: 'https://www.federalreserve.gov/monetarypolicy.htm',
    category: 'Global',
    impact: 'Med',
    hoursAgo: 3,
  },
  {
    headline: 'Oil benchmarks whipsaw on supply outlook and inventory data',
    summary:
      'Crude moved in a wide range after weekly stockpiles and OPEC+ commentary; energy equities tracked the complex closely.',
    url: 'https://www.iea.org/news',
    category: 'Global',
    impact: 'High',
    hoursAgo: 5,
  },
  {
    headline: 'European equities digest PMI surprises and regional growth fears',
    summary:
      'Cyclicals lagged defensives as services prints missed in several economies; bond yields slipped on safe-haven bids.',
    url: 'https://www.ecb.europa.eu/press/html/index.en.html',
    category: 'Global',
    impact: 'Med',
    hoursAgo: 7,
  },
  {
    headline: 'US tech megacaps lead as AI capex narratives stay in focus',
    summary:
      'Investors differentiated between monetisation timelines and infrastructure spend; semis and cloud names saw two-way flow.',
    url: 'https://www.sec.gov/news/pressreleases',
    category: 'Global',
    impact: 'Med',
    hoursAgo: 9,
  },
  {
    headline: 'Asian markets mixed after China activity data and regional trade figures',
    summary:
      'Exporters and materials reacted to shipment volumes; India-relative flows drew attention on relative valuation arguments.',
    url: 'https://www.worldbank.org/en/news',
    category: 'Global',
    impact: 'Low',
    hoursAgo: 11,
  },
  {
    headline: 'Global bond funds see inflows as investors extend duration cautiously',
    summary:
      'Fixed-income strategists noted demand for quality sovereign paper amid equity dispersion and event risk in H2.',
    url: 'https://www.bis.org/',
    category: 'Global',
    impact: 'Low',
    hoursAgo: 13,
  },
  {
    headline: 'Commodity complex: industrial metals pause after a strong run',
    summary:
      'Copper and aluminium paused as China property indicators stayed soft; gold held bid on real-rate chatter.',
    url: 'https://www.wto.org/english/news_e/news_e.htm',
    category: 'Global',
    impact: 'Low',
    hoursAgo: 15,
  },
  {
    headline: 'Cross-border M&A pipeline stirs as financing conditions ease slightly',
    summary:
      'Advisers reported more strategic talks in healthcare and software; antitrust timelines remain a key execution risk.',
    url: 'https://unctad.org/topic/investment/world-investment-report',
    category: 'Global',
    impact: 'Low',
    hoursAgo: 17,
  },
  {
    headline: 'Hedge funds trim gross exposure into macro event cluster',
    summary:
      'Prime brokers noted reduced leverage in crowded factor books while macro pods added selective rates and FX hedges.',
    url: 'https://www.oecd.org/newsroom/',
    category: 'Global',
    impact: 'Med',
    hoursAgo: 19,
  },
];

const DOMESTIC: Seed[] = [
  {
    headline: 'Nifty holds key levels as FII flows and crude INR interplay',
    summary:
      'Index heavyweights saw stock-specific moves; participants watched OI build-up and global cues for the next leg.',
    url: 'https://www.nseindia.com/',
    category: 'Domestic',
    impact: 'Med',
    hoursAgo: 2,
  },
  {
    headline: 'RBI commentary keeps focus on inflation trajectory and liquidity',
    summary:
      'Money markets parsed guidance on durable liquidity and transmission; short-end rates moved within a narrow band.',
    url: 'https://www.rbi.org.in/',
    category: 'Domestic',
    impact: 'High',
    hoursAgo: 4,
  },
  {
    headline: 'SEBI continues push on transparency for intermediaries and disclosures',
    summary:
      'Market structure watchers expect incremental clarity on retail participation safeguards and corporate governance norms.',
    url: 'https://www.sebi.gov.in/',
    category: 'Domestic',
    impact: 'Med',
    hoursAgo: 6,
  },
  {
    headline: 'Direct tax collections trend in focus ahead of quarterly review',
    summary:
      'Analysts linked revenue prints to nominal GDP and compliance; bond vigilantes watched the fiscal glide path.',
    url: 'https://www.incometax.gov.in/iec/foportal/',
    category: 'Domestic',
    impact: 'Low',
    hoursAgo: 8,
  },
  {
    headline: 'GST collections and compliance metrics tracked for consumption pulse',
    summary:
      'State-wise distribution and e-invoice adoption remained talking points for services vs. manufacturing mix.',
    url: 'https://www.gst.gov.in/',
    category: 'Domestic',
    impact: 'Low',
    hoursAgo: 10,
  },
  {
    headline: 'Primary market: IPO pipeline and anchor quotas stay on investor radar',
    summary:
      'Book-building dynamics and grey-market chatter aside, long-only accounts emphasised post-listing liquidity and governance.',
    url: 'https://www.bseindia.com/markets/PublicIssues.html',
    category: 'Domestic',
    impact: 'Med',
    hoursAgo: 12,
  },
  {
    headline: 'Rupee trades with oil and US yields as key overnight drivers',
    summary:
      'Exporters layered hedges while importers watched CBIC-related timelines; RBI FX operations referenced only obliquely.',
    url: 'https://www.rbi.org.in/Scripts/BS_PressReleaseDisplay.aspx',
    category: 'Domestic',
    impact: 'Med',
    hoursAgo: 14,
  },
  {
    headline: 'Mutual fund SIP flows cited as structural domestic equity support',
    summary:
      'AMC commentary highlighted continued systematic plans into flex-cap and index hybrids despite headline index chop.',
    url: 'https://www.amfiindia.com/',
    category: 'Domestic',
    impact: 'Low',
    hoursAgo: 16,
  },
  {
    headline: 'Insurance and pension assets in focus for long-duration G-Sec demand',
    summary:
      'Actuarial buyers reportedly extended portfolios at the long end as term-premium debates continued.',
    url: 'https://irdai.gov.in/',
    category: 'Domestic',
    impact: 'Low',
    hoursAgo: 18,
  },
  {
    headline: 'State development loans see steady appetite from banks and PF trusts',
    summary:
      'Spreads versus G-Secs were debated state by state; power and transport names drew dedicated specialist desks.',
    url: 'https://www.ccilindia.com/',
    category: 'Domestic',
    impact: 'Low',
    hoursAgo: 20,
  },
];

const SECTOR: Seed[] = [
  {
    headline: 'Banking: margin outlook debated as deposit pricing stays competitive',
    summary:
      'Analysts trimmed or held NIM assumptions while credit growth in retail and SME stayed the narrative anchor.',
    url: 'https://www.rbi.org.in/Scripts/BS_ViewBulletin.aspx',
    category: 'Sector-wise',
    impact: 'Med',
    hoursAgo: 1.5,
  },
  {
    headline: 'IT services: deal ramp and Gen-AI monetisation timelines under scrutiny',
    summary:
      'Large-caps guided for measured hiring; mid-caps highlighted vertical-specific digital pipelines.',
    url: 'https://www.nasscom.in/',
    category: 'Sector-wise',
    impact: 'Med',
    hoursAgo: 3.5,
  },
  {
    headline: 'Pharma: USFDA inspection cadence and API sourcing remain key overhangs',
    summary:
      'Formulation exporters balanced pricing pressure with cost controls; domestic branded generics saw steady offtake.',
    url: 'https://cdsco.gov.in/',
    category: 'Sector-wise',
    impact: 'High',
    hoursAgo: 5.5,
  },
  {
    headline: 'Auto: PV wholesales and EV penetration tracked month on month',
    summary:
      'OEM commentary cited financing availability and monsoon-linked rural demand as swing factors for two-wheelers.',
    url: 'https://www.siam.in/',
    category: 'Sector-wise',
    impact: 'Low',
    hoursAgo: 7.5,
  },
  {
    headline: 'FMCG: volume growth vs. premiumisation debated across urban and rural',
    summary:
      'Margin recovery from softer input costs competed with competitive intensity in staples and beverages.',
    url: 'https://ficci.in/',
    category: 'Sector-wise',
    impact: 'Low',
    hoursAgo: 9.5,
  },
  {
    headline: 'Oil & gas: refining cracks and marketing margins swing with inventory data',
    summary:
      'OMCs saw trading interest around policy on retail fuels; explorers tracked global benchmark moves.',
    url: 'https://www.petroleum.nic.in/',
    category: 'Sector-wise',
    impact: 'High',
    hoursAgo: 11.5,
  },
  {
    headline: 'Metals: China property signals and inventory on exchanges drive sentiment',
    summary:
      'Steel spreads were watched closely; aluminium and zinc reacted to power-cost narratives.',
    url: 'https://mines.gov.in/',
    category: 'Sector-wise',
    impact: 'Med',
    hoursAgo: 13.5,
  },
  {
    headline: 'Infrastructure and capital goods: order inflows vs. execution lag in focus',
    summary:
      'Roads, rails, and renewables saw headline awards; working capital cycles stayed a stock-picker’s theme.',
    url: 'https://infra.gov.in/',
    category: 'Sector-wise',
    impact: 'Low',
    hoursAgo: 15.5,
  },
  {
    headline: 'Real estate: pre-sales and launch pipelines diverge by micro-market',
    summary:
      'Listed developers highlighted balance-sheet discipline; rental yields in commercial stayed a talking point.',
    url: 'https://maharera.mahaonline.gov.in/',
    category: 'Sector-wise',
    impact: 'Low',
    hoursAgo: 17.5,
  },
  {
    headline: 'Telecom: ARPU trajectory and capex intensity shape investor positioning',
    summary:
      'Spectrum dues and 5G rollout economics remained central to consensus sum-of-the-parts debates.',
    url: 'https://www.trai.gov.in/',
    category: 'Sector-wise',
    impact: 'Med',
    hoursAgo: 19.5,
  },
];

function toDto(seed: Seed, baseMs: number): MarketNewsItemDto {
  const ms = baseMs - Math.round(seed.hoursAgo * 3600000);
  return {
    headline: seed.headline,
    source: '',
    summary: seed.summary,
    url: seed.url,
    thumbnail: null,
    category: seed.category,
    impact: seed.impact,
    time: new Date(ms).toISOString(),
  };
}

/** 30 curated items: 10 Global, 10 Domestic, 10 Sector-wise (deterministic categories). */
export function getCuratedMarketNewsFallback(baseTimeMs = Date.now()): MarketNewsItemDto[] {
  const seeds = [...GLOBAL, ...DOMESTIC, ...SECTOR];
  return seeds.map((s) => toDto(s, baseTimeMs));
}
