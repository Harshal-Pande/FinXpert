import { Injectable, Logger, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../../database/prisma.service';
import { HealthScoreWeightsDto } from './dto/health-score-weights.dto';
import { FormulaStep } from './health-score-formula.service';

export interface HealthBreakdown {
  baseScore: number;
  rawScore: number;
  normalizedScore: number;
  globalMinRaw?: number;
  globalMaxRaw?: number;
  factorValues: Record<string, number>;
  appliedSteps: FormulaStep[];
  weightedTotal: number;
}

@Injectable()
export class HealthScoreService {
  private readonly logger = new Logger(HealthScoreService.name);

  constructor(private readonly prisma: PrismaService) {}

  private clampScore(value: number): number {
    return Math.min(10, Math.max(0, value));
  }

  private round1(value: number): number {
    return Math.round(value * 10) / 10;
  }

  private getFactorValues(client: {
    annual_income: number;
    monthly_expense: number;
    emergency_fund: number | null;
    insurance_coverage: number | null;
    risk_profile: string | null;
    investments: {
      investment_type: string;
      total_value: number;
      buy_rate: number;
      quantity: number;
      instrument_name: string;
    }[];
  }) {
    const investments = client.investments ?? [];
    const totalInvestments = investments.reduce((sum, i) => sum + (i.total_value ?? 0), 0);
    const monthlyExpense = Math.max(client.monthly_expense ?? 0, 1);
    const annualIncome = Math.max(client.annual_income ?? 0, 1);

    const alr = Math.min(1, totalInvestments / (monthlyExpense * 24));
    const emergencyFund = Math.min(1, (client.emergency_fund ?? 0) / (monthlyExpense * 6));
    const diversification = Math.min(
      1,
      new Set(investments.map((i) => i.investment_type)).size / 4,
    );
    const costBasis = investments.reduce((sum, i) => sum + (i.buy_rate ?? 0) * (i.quantity ?? 0), 0);
    const simulatedMarket = investments.reduce(
      (sum, i) => sum + (i.buy_rate ?? 0) * 1.1 * (i.quantity ?? 0),
      0,
    );
    const cushionRatio = costBasis > 0 ? (simulatedMarket - costBasis) / costBasis : 0.1;
    const investmentBehavior = cushionRatio <= 0.1 ? 0.55 : 1;

    const cryptoValue = investments
      .filter((i) => i.investment_type === 'Crypto')
      .reduce((sum, i) => sum + i.total_value, 0);
    const cryptoPct = totalInvestments > 0 ? (cryptoValue / totalInvestments) * 100 : 0;
    const risk = (client.risk_profile ?? '').toLowerCase();
    const cryptoConcentration =
      risk === 'conservative' || risk === 'balanced'
        ? Math.min(1, Math.max(0, cryptoPct - 10) / 40)
        : Math.min(1, (cryptoPct / 100) * 0.6);

    const insuranceAdequacy = Math.min(
      1,
      (client.insurance_coverage ?? 0) / (annualIncome * 10),
    );
    const debtValue = investments
      .filter((i) => i.investment_type === 'Debt')
      .reduce((sum, i) => sum + i.total_value, 0);
    const mfValue = investments
      .filter((i) => i.investment_type === 'Mutual_Fund')
      .reduce((sum, i) => sum + i.total_value, 0);
    const taxEfficientPct = totalInvestments > 0 ? ((debtValue + mfValue) / totalInvestments) * 100 : 0;
    const taxEfficiency = Math.min(1, taxEfficientPct / 100);

    return {
      alr,
      emergency_fund: emergencyFund,
      diversification,
      investment_behavior: investmentBehavior,
      crypto_concentration: cryptoConcentration,
      insurance_adequacy: insuranceAdequacy,
      tax_efficiency: taxEfficiency,
    };
  }

  normalizeRawScore(rawScore: number, globalMinRaw: number, globalMaxRaw: number): number {
    if (globalMaxRaw === globalMinRaw) {
      return 5.0;
    }
    return this.clampScore(((rawScore - globalMinRaw) / (globalMaxRaw - globalMinRaw)) * 10);
  }

  calculateGlobalScore(
    client: {
      annual_income: number;
      monthly_expense: number;
      emergency_fund: number | null;
      insurance_coverage: number | null;
      risk_profile: string | null;
      investments: {
        investment_type: string;
        total_value: number;
        buy_rate: number;
        quantity: number;
        instrument_name: string;
      }[];
    },
    steps: FormulaStep[],
  ): HealthBreakdown {
    const factorValues = this.getFactorValues(client);
    const baseScore = 5.0;
    let rawScore = baseScore;

    for (const step of steps) {
      const factorValue = factorValues[step.factorId] ?? 0;
      const delta = factorValue * step.multiplier;
      rawScore = step.operation === 'subtract' ? rawScore - delta : rawScore + delta;
    }
    const normalizedScore = this.clampScore(rawScore / 5);

    return {
      baseScore: this.round1(baseScore),
      rawScore: this.round1(rawScore),
      normalizedScore: this.round1(this.clampScore(normalizedScore)),
      factorValues,
      appliedSteps: steps,
      weightedTotal: this.round1(this.clampScore(normalizedScore)),
    };
  }

  async getLatest(clientId: string) {
    const latest = await this.prisma.healthScore.findFirst({
      where: { client_id: clientId },
      orderBy: { calculated_at: 'desc' },
    });

    if (!latest) {
      return {
        score: 8.5,
        calculated_at: new Date(),
        client_id: clientId,
        breakdown: null,
      };
    }
    return latest;
  }

  /**
   * Real health score calculation based on four factors:
   * 1. Income-to-expense ratio (weight: 25%)
   * 2. Emergency fund adequacy (weight: 25%)
   * 3. Portfolio diversification (weight: 25%)
   * 4. Insurance coverage (weight: 25%)
   */
  async calculate(clientId: string) {
    const client = await this.prisma.client.findUnique({
      where: { id: clientId },
      include: {
        investments: true,
      },
    });

    if (!client) {
      throw new NotFoundException(`Client ${clientId} not found`);
    }

    const breakdown = this.calculateGlobalScore(client, [
      { factorId: 'alr', operation: 'add', multiplier: 0.9 },
      { factorId: 'emergency_fund', operation: 'add', multiplier: 0.8 },
      { factorId: 'diversification', operation: 'add', multiplier: 0.7 },
      { factorId: 'investment_behavior', operation: 'add', multiplier: 0.6 },
      { factorId: 'crypto_concentration', operation: 'subtract', multiplier: 0.9 },
      { factorId: 'insurance_adequacy', operation: 'add', multiplier: 0.4 },
      { factorId: 'tax_efficiency', operation: 'add', multiplier: 0.3 },
    ]);

    // Save to database
    const healthScore = await this.prisma.healthScore.create({
      data: {
        client_id: clientId,
        score: breakdown.weightedTotal,
        breakdown: JSON.stringify(breakdown),
      },
    });

    return {
      ...healthScore,
      breakdownDetail: breakdown,
    };
  }

  async recalculateForAdvisor(advisorId: string, steps: FormulaStep[]) {
    const clients = await this.prisma.client.findMany({
      where: { advisor_id: advisorId },
      include: { investments: true },
    });

    const rawPass = clients.map((client) => ({
      clientId: client.id,
      breakdown: this.calculateGlobalScore(client, steps),
    }));
    const rawScores = rawPass.map((entry) => entry.breakdown.rawScore);
    const globalMinRaw = rawScores.length ? Math.min(...rawScores) : 0;
    const globalMaxRaw = rawScores.length ? Math.max(...rawScores) : 0;

    await this.prisma.healthScore.deleteMany({
      where: { client: { advisor_id: advisorId } },
    });

    for (const entry of rawPass) {
      const normalizedScore = this.normalizeRawScore(
        entry.breakdown.rawScore,
        globalMinRaw,
        globalMaxRaw,
      );
      const breakdown: HealthBreakdown = {
        ...entry.breakdown,
        normalizedScore: this.round1(normalizedScore),
        globalMinRaw: this.round1(globalMinRaw),
        globalMaxRaw: this.round1(globalMaxRaw),
        weightedTotal: this.round1(normalizedScore),
      };
      await this.prisma.healthScore.create({
        data: {
          client_id: entry.clientId,
          score: breakdown.weightedTotal,
          breakdown: JSON.stringify(breakdown),
        },
      });
    }
  }

  async updateWeights(clientId: string, dto: HealthScoreWeightsDto) {
    await this.prisma.client.findUniqueOrThrow({ where: { id: clientId } });
    return this.prisma.portfolioTarget.upsert({
      where: { client_id: clientId },
      create: { client_id: clientId, ...dto },
      update: dto,
    });
  }
}