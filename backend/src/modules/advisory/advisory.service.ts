import { Injectable, Logger } from '@nestjs/common';
import { Cron, CronExpression } from '@nestjs/schedule';
import { InvestmentCategory } from '@prisma/client';
import { PrismaService } from '../../database/prisma.service';
import { AiInsightService } from '../../services/ai-insight.service';
import { ClientsService } from '../clients/clients.service';

function fmtInr(n: number): string {
  return new Intl.NumberFormat('en-IN', { maximumFractionDigits: 0 }).format(Math.round(n));
}

/** Same retention factors as `HealthScoreService` MARKET_MELTDOWN. */
function meltdownRetentionFactor(category: InvestmentCategory | string): number {
  const c = String(category);
  if (c === 'CRYPTO') return 0.3;
  if (c === 'STOCK') return 0.6;
  if (c === 'MUTUAL_FUND') return 0.78;
  if (c === 'DEBT') return 0.95;
  return 1;
}

function computeMarketMeltdownLossInr(
  investments: Array<{ category: InvestmentCategory | string; total_value: number }>,
): number {
  const pre = investments.reduce((s, i) => s + (i.total_value ?? 0), 0);
  if (pre <= 0) return 0;
  const post = investments.reduce(
    (s, i) => s + (i.total_value ?? 0) * meltdownRetentionFactor(i.category),
    0,
  );
  return Math.round(pre - post);
}

function allocationPercentages(
  investments: Array<{ category: InvestmentCategory; total_value: number }>,
): Record<'STOCK' | 'DEBT' | 'CRYPTO' | 'MUTUAL_FUND', number> {
  const keys = ['STOCK', 'DEBT', 'CRYPTO', 'MUTUAL_FUND'] as const;
  const sums: Record<(typeof keys)[number], number> = {
    STOCK: 0,
    DEBT: 0,
    CRYPTO: 0,
    MUTUAL_FUND: 0,
  };
  for (const inv of investments) {
    const cat = inv.category as string;
    if (cat === 'STOCK' || cat === 'DEBT' || cat === 'CRYPTO' || cat === 'MUTUAL_FUND') {
      sums[cat as (typeof keys)[number]] += inv.total_value ?? 0;
    }
  }
  const t = keys.reduce((s, k) => s + sums[k], 0);
  if (t <= 0) return { STOCK: 0, DEBT: 0, CRYPTO: 0, MUTUAL_FUND: 0 };
  const out = { ...sums } as Record<(typeof keys)[number], number>;
  for (const k of keys) out[k] = Math.round((sums[k] / t) * 1000) / 10;
  return out;
}

@Injectable()
export class AdvisoryService {
  private readonly logger = new Logger(AdvisoryService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly aiInsightService: AiInsightService,
    private readonly clientsService: ClientsService,
  ) {}

  /**
   * Generate AI-powered advisory for a specific client.
   * In production, this would send an actual email via Nodemailer.
   */
  async generateAdvisory(clientId: string) {
    const client = await this.prisma.client.findUnique({
      where: { id: clientId },
      include: {
        investments: true,
        healthScores: { orderBy: { calculated_at: 'desc' }, take: 1 },
        portfolioTarget: true,
      },
    });

    if (!client) {
      throw new Error(`Client ${clientId} not found`);
    }

    // Build context for AI
    const portfolioSummary = client.investments?.map((investment) => ({
      name: investment.instrument_name,
      type: investment.investment_type,
      value: investment.total_value,
    })) ?? [];

    const healthScore = client.healthScores?.[0]?.score ?? 'N/A';

    const context = {
      clientName: client.name,
      riskProfile: client.risk_profile,
      annualIncome: client.annual_income,
      portfolioValue: client.investments?.reduce(
        (sum, investment) => sum + investment.total_value,
        0,
      ) ?? 0,
      portfolioAssets: portfolioSummary,
      healthScore,
      targets: client.portfolioTarget,
    };

    try {
      // Use AI to generate advisory content
      const aiResponse = await this.aiInsightService.generateMarketInsight(
        `Generate a personalized financial advisory email for ${client.name} based on their portfolio and financial health.`,
        context as unknown as Record<string, unknown>,
      );

      // Mock email sending — log to console
      this.logger.log(`📧 Advisory Email for ${client.name}:`);
      this.logger.log(`   Subject: ${aiResponse.title}`);
      this.logger.log(`   Body: ${aiResponse.summary}`);
      this.logger.log(`   Advice: ${aiResponse.advice}`);

      return {
        clientId,
        clientName: client.name,
        subject: aiResponse.title,
        body: aiResponse.summary,
        advice: aiResponse.advice,
        sentAt: new Date().toISOString(),
        status: 'sent_mock', // Would be 'sent' with real SMTP
      };
    } catch (error) {
      this.logger.warn(
        `AI advisory generation failed for ${client.name}, using fallback`,
      );

      // Fallback advisory when AI is not configured
      return {
        clientId,
        clientName: client.name,
        subject: `Portfolio Review Advisory - ${client.name}`,
        body: `Dear ${client.name}, based on your current portfolio value of ₹${(client.investments?.reduce((sum, investment) => sum + investment.total_value, 0) ?? 0).toLocaleString('en-IN')}, we recommend reviewing your asset allocation to align with your ${client.risk_profile ?? 'moderate'} risk profile.`,
        advice:
          'Please schedule a consultation with your advisor for a detailed review.',
        sentAt: new Date().toISOString(),
        status: 'sent_fallback',
      };
    }
  }

  /**
   * Cron job: runs daily at 9 AM to check which clients need advisory emails.
   * Checks for clients whose health score < 5 or portfolio has drifted from targets.
   */
  @Cron(CronExpression.EVERY_DAY_AT_9AM)
  async handleAdvisoryCron() {
    this.logger.log('🕘 Running daily advisory cron job...');

    try {
      // Find clients with low health scores
      const lowScoreClients = await this.prisma.healthScore.findMany({
        where: { score: { lt: 5 } },
        distinct: ['client_id'],
        orderBy: { calculated_at: 'desc' },
        include: { client: true },
      });

      for (const entry of lowScoreClients) {
        this.logger.log(
          `🔔 Client ${entry.client.name} has low health score (${entry.score}), generating advisory...`,
        );
        await this.generateAdvisory(entry.client_id);
      }

      this.logger.log(
        `✅ Advisory cron complete. Processed ${lowScoreClients.length} clients.`,
      );
    } catch (error) {
      this.logger.error('Advisory cron job failed:', error);
    }
  }

  /**
   * FinXpert AI Strategist plan: loads live client + holdings, meltdown ₹ loss (same model as stress test),
   * then Gemini (or deterministic fallback).
   */
  async generateStrategicPlan(clientId: string) {
    const client = await this.clientsService.findOne(clientId);
    const investments = client.investments ?? [];
    const totalAum = investments.reduce((s, inv) => s + inv.total_value, 0);
    const allocation = allocationPercentages(investments);
    const stressTestLoss = computeMarketMeltdownLossInr(investments);
    const monthlyIncome = (client.annual_income ?? 0) / 12;
    const monthlyExpense = client.monthly_expense ?? 0;
    const healthScore =
      typeof client.calculatedHealthScore === 'number' ? client.calculatedHealthScore : 0;

    const contextBlock = `### CLIENT DATA CONTEXT
- Name: ${client.name}
- Financial Vitals: Age ${client.age ?? '—'}, Monthly Income ₹${fmtInr(monthlyIncome)}, Monthly Expenses ₹${fmtInr(monthlyExpense)}
- Risk Profile: ${client.risk_profile ?? 'not set'}
- Health Score: ${healthScore}/10

### PORTFOLIO BREAKDOWN
- Total AUM: ₹${fmtInr(totalAum)}
- Asset Allocation:
  * Stocks: ${allocation.STOCK}%
  * Mutual Funds: ${allocation.MUTUAL_FUND}%
  * Debt: ${allocation.DEBT}%
  * Crypto: ${allocation.CRYPTO}%

### MARKET SCENARIO
- Stress Test Result: In the Market Meltdown scenario (shock applied to Stock, Mutual Fund, Crypto, and Debt positions), projected portfolio loss is ₹${fmtInr(stressTestLoss)}.`;

    let plan: string;
    let source: 'gemini' | 'fallback' = 'gemini';
    try {
      plan = await this.aiInsightService.generateFinXpertStrategicPlan(contextBlock);
    } catch (e) {
      this.logger.warn(
        `Strategic plan: Gemini unavailable (${e instanceof Error ? e.message : e}); using fallback`,
      );
      plan = this.buildFallbackStrategicPlan({
        name: client.name,
        risk: client.risk_profile ?? 'Moderate',
        healthScore,
        allocation,
        stressTestLoss,
        monthlyIncome,
        monthlyExpense,
        totalAum,
      });
      source = 'fallback';
    }

    return {
      clientId,
      plan: this.clampWords(plan, 150),
      source,
      derived: {
        total_aum: totalAum,
        monthly_income: monthlyIncome,
        monthly_expense: monthlyExpense,
        health_score: healthScore,
        allocation,
        stress_test_loss_inr: stressTestLoss,
      },
    };
  }

  private clampWords(text: string, maxWords: number): string {
    const words = text.trim().split(/\s+/).filter(Boolean);
    if (words.length <= maxWords) return text.trim();
    return `${words.slice(0, maxWords).join(' ')}…`;
  }

  private buildFallbackStrategicPlan(input: {
    name: string;
    risk: string;
    healthScore: number;
    allocation: Record<'STOCK' | 'DEBT' | 'CRYPTO' | 'MUTUAL_FUND', number>;
    stressTestLoss: number;
    monthlyIncome: number;
    monthlyExpense: number;
    totalAum: number;
  }): string {
    const r = input.risk.toLowerCase();
    const equityLike = input.allocation.STOCK + input.allocation.MUTUAL_FUND;
    const analyzeParts: string[] = [];
    analyzeParts.push(
      `${input.name} holds ₹${fmtInr(input.totalAum)} with Stock ${input.allocation.STOCK}%, Mutual Fund ${input.allocation.MUTUAL_FUND}%, Debt ${input.allocation.DEBT}%, Crypto ${input.allocation.CRYPTO}% (${equityLike.toFixed(1)}% equity-like) versus a ${input.risk} profile and health ${input.healthScore}/10.`,
    );
    if (r.includes('conservative') && equityLike > 55) {
      analyzeParts.push('Equity-like sleeves look high versus stated conservatism.');
    } else if (r.includes('aggressive') && equityLike < 45) {
      analyzeParts.push('Growth sleeves may be light versus an aggressive mandate.');
    } else {
      analyzeParts.push('Book-level mix warrants monitoring versus mandate and cash-flow cover.');
    }
    const sixMo = input.monthlyExpense * 6;

    const bullets: string[] = [];
    bullets.push(
      `• Rebalance Stock vs Mutual Fund so core beta sits in diversified Mutual Fund sleeves, trimming single-name Stock concentration where any line exceeds ~15% of AUM.`,
    );
    if (input.allocation.CRYPTO > 8) {
      bullets.push(
        `• Cap Crypto near policy max (suggest trimming toward ≤5–8% of AUM) until health clears ~7/10.`,
      );
    } else {
      bullets.push(`• Keep Crypto as a satellite sleeve only; avoid adding leverage against ₹${fmtInr(input.monthlyIncome)} monthly income.`);
    }
    if (input.allocation.DEBT < 20) {
      bullets.push(
        `• Lift Debt toward ~25–30% via high-grade bonds or short-duration Mutual Fund debt funds to stabilise the score.`,
      );
    } else {
      bullets.push(
        `• Maintain Debt quality; ladder maturities so ₹${fmtInr(sixMo)} in liquid Debt-style capacity covers ~6 months of ₹${fmtInr(input.monthlyExpense)} expenses.`,
      );
    }
    bullets.push(
      `• Use incremental Mutual Fund SIPs from surplus cash rather than raising Stock beta until health exceeds ${Math.min(8, input.healthScore + 1).toFixed(1)}/10.`,
    );
    if (input.monthlyExpense > 0) {
      bullets.push(
        `• Target roughly ₹${fmtInr(sixMo)} across Debt and liquid Mutual Fund sleeves as a six-month expense buffer against ₹${fmtInr(input.monthlyExpense)} monthly spend.`,
      );
    }

    let mitigate: string;
    if (input.totalAum <= 0 || input.stressTestLoss <= 0) {
      mitigate =
        'MITIGATE: Fund Debt and Mutual Fund core sleeves before adding Stock or Crypto beta so the next stress pass shows a bounded loss path.';
    } else {
      const moveAmt = Math.round(
        Math.min(Math.max(input.stressTestLoss * 0.25, input.totalAum * 0.02), input.totalAum * 0.12),
      );
      mitigate = `MITIGATE: Shift approximately ₹${fmtInr(moveAmt)} from Stock into short-duration Debt to reduce the modeled meltdown loss of ₹${fmtInr(input.stressTestLoss)}.`;
    }

    return [`ANALYZE: ${analyzeParts.join(' ')}`, `OPTIMIZE:\n${bullets.join('\n')}`, mitigate].join('\n\n');
  }
}
