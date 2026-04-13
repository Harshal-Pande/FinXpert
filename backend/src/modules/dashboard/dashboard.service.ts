import { Injectable } from '@nestjs/common';
import { Investment, InvestmentCategory, InvestmentType } from '@prisma/client';
import { PrismaService } from '../../database/prisma.service';
import { MarketDataService } from '../../services/market-data.service';
import { ComplianceService } from '../compliance/compliance.service';
import { NewsService, MarketNewsItemDto } from '../news/news.service';
import { HealthScoreService } from '../health-score/health-score.service';
import {
  FormulaStep,
  HealthScoreFormulaService,
} from '../health-score/health-score-formula.service';

export interface StrategicInsight {
  title: string;
  recommendation: string;
  impact: string;
  category: 'REBALANCE' | 'DEPLOY' | 'RISK' | 'EXPERT';
}

export interface RecentNewsItem {
  title: string;
  summary: string;
  source?: string;
  impact: 'High' | 'Med' | 'Low';
  category: 'STOCK' | 'DEBT' | 'CRYPTO' | 'MUTUAL_FUND';
  timestamp: string;
  url: string;
  thumbnail?: string;
}

function normalizeRisk(r: string | null | undefined): 'conservative' | 'moderate' | 'aggressive' | 'unknown' {
  if (!r) return 'unknown';
  const x = r.toLowerCase();
  if (x.includes('conservative') || x.includes('low')) return 'conservative';
  if (x.includes('aggressive') || x.includes('high')) return 'aggressive';
  if (x.includes('moderate') || x.includes('medium') || x.includes('balanced')) return 'moderate';
  return 'unknown';
}

function defaultEquityTarget(risk: ReturnType<typeof normalizeRisk>): number {
  switch (risk) {
    case 'conservative':
      return 0.45;
    case 'moderate':
      return 0.6;
    case 'aggressive':
      return 0.75;
    default:
      return 0.6;
  }
}

function isEquityExposure(inv: Investment): boolean {
  return (
    inv.category === InvestmentCategory.STOCK ||
    inv.category === InvestmentCategory.MUTUAL_FUND ||
    inv.category === InvestmentCategory.CRYPTO
  );
}

function isGoldProxy(inv: Investment): boolean {
  return /\bgold\b|sgb|sovereign\s*gold/i.test(inv.instrument_name);
}

type ClientAgg = {
  name: string;
  risk: ReturnType<typeof normalizeRisk>;
  total: number;
  equity: number;
  debt: number;
  gold: number;
  targetEquity: number | null;
};

type InvestmentWithClient = Investment & {
  client: {
    id: string;
    name: string;
    risk_profile: string | null;
    portfolioTarget: {
      stock_target: number;
      mutual_fund_target: number;
      crypto_target: number;
      debt_target: number;
    } | null;
  };
};

type ClientInsightRow = { id: string; name: string; normalizedHealthScore: number };

@Injectable()
export class DashboardService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly newsService: NewsService,
    private readonly marketData: MarketDataService,
    private readonly compliance: ComplianceService,
    private readonly healthScoreService: HealthScoreService,
    private readonly healthScoreFormulaService: HealthScoreFormulaService,
  ) {}

  private mapNewsToRecent(items: MarketNewsItemDto[]): RecentNewsItem[] {
    return items.map((n) => ({
      title: n.headline,
      summary: n.summary,
      source: n.source,
      impact: n.impact,
      category: n.category,
      timestamp: n.time,
      url: n.url,
      thumbnail: n.thumbnail ?? undefined,
    }));
  }

  private bookCategorySums(investments: Investment[]): Record<
    'STOCK' | 'DEBT' | 'CRYPTO' | 'MUTUAL_FUND',
    number
  > {
    const sums = { STOCK: 0, DEBT: 0, CRYPTO: 0, MUTUAL_FUND: 0 };
    for (const inv of investments) {
      if (inv.category in sums) {
        sums[inv.category as keyof typeof sums] += inv.total_value;
      }
    }
    return sums;
  }

  /**
   * Book-level AUM narrative from stored holdings (no extra model call).
   */
  private buildAiPortfolioSummary(
    totalAUM: number,
    sums: { STOCK: number; DEBT: number; CRYPTO: number; MUTUAL_FUND: number },
  ): string {
    if (totalAUM <= 0) {
      return 'No aggregate AUM on record yet. Add client investments to produce a book-level allocation summary.';
    }
    const pct = (v: number) => (v / totalAUM) * 100;
    const pStock = pct(sums.STOCK);
    const pDebt = pct(sums.DEBT);
    const pMf = pct(sums.MUTUAL_FUND);
    const pCrypto = pct(sums.CRYPTO);
    const equityLike = pStock + pMf;

    const lead = `Across the database, AUM is about ${pStock.toFixed(0)}% stocks, ${pMf.toFixed(0)}% mutual funds, ${pDebt.toFixed(0)}% debt, and ${pCrypto.toFixed(0)}% crypto.`;

    if (equityLike >= 58 && pDebt < 18) {
      return `${lead} The book is equity-heavy; consider increasing 'Debt' allocation for suitable clients given RBI rate volatility and higher reinvestment certainty in fixed income.`;
    }
    if (pCrypto >= 12) {
      return `${lead} Crypto is a double-digit share of AUM; review concentration, liquidity, and mandate fit client-by-client.`;
    }
    if (pDebt >= 42) {
      return `${lead} The aggregate book skews defensive; confirm return-seeking clients are not unintentionally below growth targets versus their IPS.`;
    }
    return `${lead} Allocation looks moderate at the advisor level; continue monitoring drift versus model sleeves.`;
  }

  private buildClientAllocationMap(investments: InvestmentWithClient[]): Map<string, ClientAgg> {
    const clientMap = new Map<string, ClientAgg>();
    for (const inv of investments) {
      const id = inv.client_id;
      const risk = normalizeRisk(inv.client.risk_profile);
      let row = clientMap.get(id);
      if (!row) {
        const pt = inv.client.portfolioTarget;
        const targetEquity = pt
          ? pt.stock_target + pt.mutual_fund_target + pt.crypto_target
          : null;
        row = {
          name: inv.client.name,
          risk,
          total: 0,
          equity: 0,
          debt: 0,
          gold: 0,
          targetEquity,
        };
        clientMap.set(id, row);
      }
      row.total += inv.total_value;
      if (isEquityExposure(inv)) row.equity += inv.total_value;
      if (inv.investment_type === InvestmentType.Debt) row.debt += inv.total_value;
      if (isGoldProxy(inv)) row.gold += inv.total_value;
    }
    return clientMap;
  }

  private buildHighDriftActions(clientMap: Map<string, ClientAgg>) {
    const scored: Array<{
      absGap: number;
      item: { clientName: string; drift: string; action: string };
    }> = [];
    for (const [, row] of clientMap) {
      if (row.total <= 0) continue;
      const equityPct = row.equity / row.total;
      const targetEq = row.targetEquity ?? defaultEquityTarget(row.risk);
      const gapPct = Math.round((equityPct - targetEq) * 100);
      if (gapPct >= 6) {
        scored.push({
          absGap: Math.abs(gapPct),
          item: {
            clientName: row.name,
            drift: `+${gapPct}% vs equity target`,
            action: 'Rebalance',
          },
        });
      } else if (gapPct <= -10) {
        scored.push({
          absGap: Math.abs(gapPct),
          item: {
            clientName: row.name,
            drift: `${gapPct}% vs equity target`,
            action: 'Review allocation',
          },
        });
      }
    }
    scored.sort((a, b) => b.absGap - a.absGap);
    return scored.slice(0, 8).map((s) => s.item);
  }

  private buildStrategicInsights(
    newsItems: MarketNewsItemDto[],
    clientMap: Map<string, ClientAgg>,
    clientInsightRows: ClientInsightRow[],
    marketStats: Awaited<ReturnType<MarketDataService['getMarketStats']>>,
    aggregatedBigCash: Array<{ name: string; total: number }>,
    totalAUM: number,
  ): StrategicInsight[] {
    const candidates: Array<{ insight: StrategicInsight; weight: number }> = [];
    const push = (insight: StrategicInsight, weight: number) =>
      candidates.push({ insight, weight });

    const marketDown =
      marketStats.nifty.trend === 'down' && marketStats.sensex.trend === 'down';

    for (const c of clientInsightRows) {
      const score = c.normalizedHealthScore;
      if (score > 0 && score < 3.0) {
        push(
          {
            category: 'RISK',
            title: 'Critical Health Score',
            recommendation: `Portfolio health for ${c.name} is ${score.toFixed(1)}/10 (peer-normalized). Immediate risk review required.`,
            impact: 'Capital Protection',
          },
          100,
        );
      }
    }

    for (const [, row] of clientMap) {
      if (row.total <= 0) continue;
      const equityPct = row.equity / row.total;
      const targetEq = row.targetEquity ?? defaultEquityTarget(row.risk);
      const gapPct = Math.round((equityPct - targetEq) * 100);

      if (row.risk === 'conservative' && equityPct > 0.52) {
        push(
          {
            category: 'RISK',
            title: 'Risk–return mismatch',
            recommendation: `${row.name}'s risk profile is conservative, but equity-like allocation is about ${(equityPct * 100).toFixed(0)}%. Consider rebalancing toward debt or hybrid funds.`,
            impact: 'Policy alignment',
          },
          90,
        );
      }

      if (gapPct >= 8) {
        push(
          {
            category: 'REBALANCE',
            title: 'Equity above target',
            recommendation: `${row.name}'s portfolio is overexposed to equity by about ${gapPct}% vs model target. Consider profit booking or shifting to debt.`,
            impact: 'Risk Re-alignment',
          },
          70,
        );
      }

      if (gapPct <= -12) {
        push(
          {
            category: 'REBALANCE',
            title: 'Equity below target',
            recommendation: `${row.name} is underweight equity by about ${Math.abs(gapPct)}% vs target. Review entry opportunities if horizon allows.`,
            impact: 'Long-term growth',
          },
          55,
        );
      }
    }

    let bookEquity = 0;
    let bookTargetSum = 0;
    let bookTargetWeight = 0;
    for (const [, row] of clientMap) {
      if (row.total <= 0) continue;
      bookEquity += row.equity;
      const w = row.total / totalAUM;
      const t = row.targetEquity ?? defaultEquityTarget(row.risk);
      bookTargetSum += t * w;
      bookTargetWeight += w;
    }
    if (totalAUM > 0 && bookTargetWeight > 0) {
      const bookEquityPct = bookEquity / totalAUM;
      const avgTarget = bookTargetSum / bookTargetWeight;
      const bookGapPct = Math.round((bookEquityPct - avgTarget) * 100);
      if (bookGapPct >= 10) {
        push(
          {
            category: 'REBALANCE',
            title: 'Book-level equity tilt',
            recommendation: `Across your book, equity-like exposure is about ${bookGapPct}% above blended client targets. Rebalancing at scale may reduce concentration risk.`,
            impact: 'Book risk',
          },
          65,
        );
      }
    }

    const bookGold =
      totalAUM > 0
        ? [...clientMap.values()].reduce((s, r) => s + r.gold, 0) / totalAUM
        : 0;

    if (marketDown && totalAUM > 0) {
      push(
        {
          category: 'REBALANCE',
          title: 'Volatile tape',
          recommendation:
            'Headline indices are weak. Consider increasing debt or hybrid allocation for suitable clients to cushion drawdowns.',
          impact: 'Volatility',
        },
        60,
      );
      if (bookGold < 0.05) {
        push(
          {
            category: 'EXPERT',
            title: 'Gold sleeve',
            recommendation:
              bookGold < 0.01
                ? 'No meaningful gold / SGB sleeve detected across the book while markets are soft. Review a small strategic gold allocation where policy allows.'
                : 'Gold allocation appears below a common 5–10% strategic sleeve. Consider topping up via SGB or gold funds for clients who need diversifiers.',
            impact: 'Diversification',
          },
          50,
        );
      }
    }

    for (const clientCash of aggregatedBigCash) {
      push(
        {
          category: 'DEPLOY',
          title: 'Idle Cash Alert',
          recommendation: `Deploy ₹${(clientCash.total / 100000).toFixed(1)}L idle cash for ${clientCash.name} into suggested funds per IPS.`,
          impact: 'Cash drag reduction',
        },
        58,
      );
    }

    const priorityMap = { High: 3, Med: 2, Low: 1 };
    const sortedNews = [...newsItems].sort(
      (a, b) => (priorityMap[b.impact] ?? 0) - (priorityMap[a.impact] ?? 0),
    );
    const topNews = sortedNews[0];
    if (topNews) {
      const sumLine =
        topNews.summary?.split('.')[0] ?? topNews.headline;
      push(
        {
          category: 'EXPERT',
          title: topNews.headline,
          recommendation: `${sumLine}. Worth reviewing positioning across ${clientInsightRows.length} clients in light of this headline.`,
          impact: `${topNews.impact} impact news`,
        },
        40,
      );
    }

    candidates.sort((a, b) => b.weight - a.weight);
    const seen = new Set<string>();
    const out: StrategicInsight[] = [];
    for (const { insight } of candidates) {
      const key = insight.title + insight.recommendation.slice(0, 40);
      if (seen.has(key)) continue;
      seen.add(key);
      out.push(insight);
      if (out.length >= 8) break;
    }
    return out;
  }

  /**
   * Same peer-normalized 0–10 scores as GET /clients and client detail, for dashboard average and insights.
   */
  private async buildClientHealthContext(
    advisorId: string | undefined,
    clientWhere: Record<string, unknown>,
  ): Promise<{ avgHealthScore: number; insightRows: ClientInsightRow[] }> {
    const clients = await this.prisma.client.findMany({
      where: clientWhere,
      include: {
        investments: true,
        healthScores: { orderBy: { calculated_at: 'desc' }, take: 1 },
      },
    });

    if (clients.length === 0) {
      return { avgHealthScore: 0, insightRows: [] };
    }

    let steps: FormulaStep[];
    try {
      const formula = await this.healthScoreFormulaService.getForAdvisor(advisorId);
      steps = (formula.steps as FormulaStep[]) ?? [];
    } catch {
      const avg =
        clients.reduce((s, c) => s + (c.healthScores[0]?.score ?? 0), 0) / clients.length;
      return {
        avgHealthScore: Math.round(avg * 10) / 10,
        insightRows: clients.map((c) => ({
          id: c.id,
          name: c.name,
          normalizedHealthScore: c.healthScores[0]?.score ?? 0,
        })),
      };
    }

    const rawPool = clients.map((c) =>
      this.healthScoreService.calculateGlobalScore(c, steps).rawScore,
    );
    const gMin = Math.min(...rawPool);
    const gMax = Math.max(...rawPool);

    const insightRows: ClientInsightRow[] = clients.map((c, i) => ({
      id: c.id,
      name: c.name,
      normalizedHealthScore:
        Math.round(
          this.healthScoreService.normalizeRawScore(rawPool[i], gMin, gMax) * 10,
        ) / 10,
    }));

    const sumNorm = insightRows.reduce((s, r) => s + r.normalizedHealthScore, 0);
    return {
      avgHealthScore: Math.round((sumNorm / insightRows.length) * 10) / 10,
      insightRows,
    };
  }

  async getSummary(advisorId?: string) {
    const clientWhere: Record<string, unknown> = {};
    if (advisorId && advisorId !== 'undefined') {
      clientWhere.advisor_id = advisorId;
    }

    const [
      totalClients,
      investments,
      marketAlerts,
      todos,
      newsItems,
      upcomingCompliance,
      marketStats,
    ] = await Promise.all([
      this.prisma.client.count({ where: clientWhere }),
      this.prisma.investment.findMany({
        where: clientWhere.advisor_id
          ? { client: { advisor_id: clientWhere.advisor_id as string } }
          : {},
        include: {
          client: {
            include: { portfolioTarget: true },
          },
        },
      }),
      this.prisma.marketInsight.count({
        where: {
          created_at: {
            gte: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000),
          },
        },
      }),
      this.prisma.todoItem.count({
        where: {
          ...(advisorId && advisorId !== 'undefined' ? { advisor_id: advisorId } : {}),
          status: { not: 'done' },
        },
      }),
      this.newsService.getMarketNews(10).then((r) => r.items),
      this.compliance.getUpcoming(),
      this.marketData.getMarketStats(),
    ]);

    const { avgHealthScore, insightRows } = await this.buildClientHealthContext(
      advisorId,
      clientWhere,
    );

    const totalAUM = investments.reduce((sum, inv) => sum + inv.total_value, 0);
    const categorySums = this.bookCategorySums(investments);
    const aiPortfolioSummary = this.buildAiPortfolioSummary(totalAUM, categorySums);

    const cashAggregation = investments
      .filter((inv) => inv.category === InvestmentCategory.DEBT)
      .reduce(
        (acc, inv) => {
          const cid = inv.client_id;
          if (!acc[cid]) {
            acc[cid] = { name: inv.client.name, total: 0 };
          }
          acc[cid].total += inv.total_value;
          return acc;
        },
        {} as Record<string, { name: string; total: number }>,
      );

    const aggregatedBigCash = Object.values(cashAggregation).filter((c) => c.total > 500000);

    const clientMap = this.buildClientAllocationMap(investments as InvestmentWithClient[]);
    const strategicInsights = this.buildStrategicInsights(
      newsItems,
      clientMap,
      insightRows,
      marketStats,
      aggregatedBigCash,
      totalAUM,
    );

    const actionCenter = {
      highDrift: this.buildHighDriftActions(clientMap),
      idleCash: aggregatedBigCash.map((c) => ({
        clientName: c.name,
        amount: c.total,
        action: 'Deploy',
      })),
      wtcAlerts: upcomingCompliance.map((c) => ({
        title: c.name,
        deadline: new Date(c.dueDate).toLocaleDateString('en-IN', { day: 'numeric', month: 'short' }),
        priority: c.status === 'urgent' ? 'High' : 'Med',
      })),
    };

    const marketPulse = [marketStats.nifty, marketStats.sensex, marketStats.gold];

    return {
      totalClients,
      totalAUM,
      avgHealthScore,
      marketAlerts,
      pendingTodos: todos,
      actionCenter,
      strategicInsights,
      marketPulse,
      recentNews: this.mapNewsToRecent(newsItems.slice(0, 10)),
      aiPortfolioSummary,
    };
  }
}
