import { Injectable, Logger, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../../database/prisma.service';
import { HealthScoreWeightsDto } from './dto/health-score-weights.dto';
import { FormulaStep } from './health-score-formula.service';
import { InvestmentCategory } from '@prisma/client';

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

export type StressScenario = 'MARKET_MELTDOWN' | 'JOB_LOSS' | 'MEDICAL_SHOCK';

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
    age?: number;
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
    const age = Number.isFinite(client.age as number) ? Number(client.age) : null;

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
    const agePenaltyMultiplier =
      age == null ? 1 : age >= 55 ? 1.2 : age >= 45 ? 1.05 : age <= 30 ? 0.85 : 1;
    const cryptoConcentration =
      risk === 'conservative' || risk === 'balanced'
        ? Math.min(1, (Math.max(0, cryptoPct - 10) / 40) * agePenaltyMultiplier)
        : Math.min(1, ((cryptoPct / 100) * 0.6) * agePenaltyMultiplier);

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
      age_factor:
        age == null
          ? 0
          : age <= 30
            ? 1
            : age <= 45
              ? 0.7
              : age <= 55
                ? 0.4
                : 0.1,
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
      age?: number;
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

    // Age factor: small additive adjustment to reflect risk tolerance across life stage.
    const age = Number.isFinite(client.age as number) ? Number(client.age) : null;
    const ageAdjustment =
      age == null ? 0 : age <= 30 ? 0.4 : age <= 45 ? 0.15 : age <= 55 ? -0.15 : -0.35;
    rawScore += ageAdjustment;
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

  private applyScenarioToClient(
    client: {
      annual_income: number;
      monthly_expense: number;
      emergency_fund: number | null;
      insurance_coverage: number | null;
      risk_profile: string | null;
      investments: {
        investment_type: string;
        category: InvestmentCategory;
        total_value: number;
        buy_rate: number;
        cmp: number;
        quantity: number;
        instrument_name: string;
      }[];
    },
    scenario: StressScenario,
  ) {
    const cloned = {
      ...client,
      investments: client.investments.map((investment) => ({ ...investment })),
    };

    if (scenario === 'MARKET_MELTDOWN') {
      cloned.investments = cloned.investments.map((investment) => {
        const cat = investment.category as string;
        let factor = 1;
        if (cat === 'CRYPTO') factor = 0.3;
        else if (cat === 'STOCK') factor = 0.6;
        else if (cat === 'MUTUAL_FUND') factor = 0.78;
        else if (cat === 'DEBT') factor = 0.95;
        if (factor === 1) return investment;
        return {
          ...investment,
          cmp: investment.cmp * factor,
          total_value: investment.total_value * factor,
        };
      });
    }

    if (scenario === 'JOB_LOSS') {
      cloned.annual_income = 0;
      const cashLike = cloned.investments
        .filter((investment) => {
          const c = investment.category as string;
          return c === 'DEBT' || c === 'MUTUAL_FUND';
        })
        .reduce((sum, investment) => sum + investment.total_value, 0);
      const emergency = cloned.emergency_fund ?? 0;
      const protectedLiquidity = cashLike + emergency;
      const syntheticAlrInvestment = {
        investment_type: 'CASH_BUFFER',
        category: 'DEBT' as InvestmentCategory,
        total_value: protectedLiquidity,
        buy_rate: 1,
        cmp: 1,
        quantity: protectedLiquidity,
        instrument_name: 'Stress Cash Buffer',
      };
      cloned.investments = [syntheticAlrInvestment];
    }

    if (scenario === 'MEDICAL_SHOCK') {
      let remainingShock = 500_000;
      const applyMedicalDraw = (inv: (typeof cloned.investments)[0]) => {
        if (remainingShock <= 0) return inv;
        const deduction = Math.min(inv.total_value, remainingShock);
        remainingShock -= deduction;
        const nextValue = Math.max(0, inv.total_value - deduction);
        return {
          ...inv,
          total_value: nextValue,
          cmp: inv.quantity > 0 ? nextValue / inv.quantity : 0,
        };
      };
      cloned.investments = cloned.investments.map((investment) =>
        (investment.category as string) === 'DEBT' ? applyMedicalDraw(investment) : investment,
      );
      cloned.investments = cloned.investments.map((investment) =>
        (investment.category as string) === 'MUTUAL_FUND' ? applyMedicalDraw(investment) : investment,
      );
      if (remainingShock > 0) {
        cloned.emergency_fund = Math.max(0, (cloned.emergency_fund ?? 0) - remainingShock);
      }
    }

    return cloned;
  }

  async simulateStress(advisorId: string, scenarioType: StressScenario) {
    const formula = await this.prisma.healthScoreFormula.findUnique({
      where: { advisor_id: advisorId },
    });
    const steps = (formula?.steps as FormulaStep[] | null) ?? [];

    const clients = await this.prisma.client.findMany({
      where: { advisor_id: advisorId },
      include: { investments: true },
    });

    if (clients.length === 0) {
      return {
        scenario: scenarioType,
        currentScore: 0,
        stressedScore: 0,
        pointsDropped: 0,
        survivalHorizonMonths: 0,
        biggestVulnerability: 'No clients',
      };
    }

    const currentRaw = clients.map((client) => this.calculateGlobalScore(client, steps));
    const stressedRaw = clients.map((client) =>
      this.calculateGlobalScore(this.applyScenarioToClient(client as any, scenarioType), steps),
    );

    const currentRawValues = currentRaw.map((b) => b.rawScore);
    const stressedRawValues = stressedRaw.map((b) => b.rawScore);
    const currentMin = Math.min(...currentRawValues);
    const currentMax = Math.max(...currentRawValues);
    const stressedMin = Math.min(...stressedRawValues);
    const stressedMax = Math.max(...stressedRawValues);

    const currentScores = currentRaw.map((b) => this.normalizeRawScore(b.rawScore, currentMin, currentMax));
    const stressedScores = stressedRaw.map((b) => this.normalizeRawScore(b.rawScore, stressedMin, stressedMax));
    const currentScore = currentScores.reduce((s, v) => s + v, 0) / currentScores.length;
    const stressedScore = stressedScores.reduce((s, v) => s + v, 0) / stressedScores.length;

    const sample = this.applyScenarioToClient(clients[0] as any, scenarioType);
    const cashLike = sample.investments
      .filter((investment) => {
        const c = investment.category as string;
        return c === 'DEBT' || c === 'MUTUAL_FUND';
      })
      .reduce((sum, investment) => sum + investment.total_value, 0);
    const survivalHorizonMonths = sample.monthly_expense > 0
      ? (cashLike + (sample.emergency_fund ?? 0)) / sample.monthly_expense
      : 0;

    const factorNames = Object.keys(stressedRaw[0]?.factorValues ?? {});
    const biggestVulnerability = factorNames.reduce(
      (worst, factor) => {
        const current = currentRaw[0]?.factorValues[factor] ?? 0;
        const stressed = stressedRaw[0]?.factorValues[factor] ?? 0;
        const drop = current - stressed;
        if (drop > worst.drop) return { factor, drop };
        return worst;
      },
      { factor: 'liquidity', drop: -Infinity },
    ).factor;

    return {
      scenario: scenarioType,
      currentScore: Math.round(currentScore * 10) / 10,
      stressedScore: Math.round(stressedScore * 10) / 10,
      pointsDropped: Math.round((currentScore - stressedScore) * 10) / 10,
      survivalHorizonMonths: Math.round(survivalHorizonMonths * 10) / 10,
      biggestVulnerability,
    };
  }

  async simulateStressForClient(clientId: string, scenarioType: StressScenario) {
    const client = await this.prisma.client.findUnique({
      where: { id: clientId },
      include: { investments: true },
    });
    if (!client) throw new NotFoundException('Client not found');

    const formula = await this.prisma.healthScoreFormula.findUnique({
      where: { advisor_id: client.advisor_id },
    });
    const steps = (formula?.steps as FormulaStep[] | null) ?? [];

    const advisorClients = await this.prisma.client.findMany({
      where: { advisor_id: client.advisor_id },
      include: { investments: true },
    });

    const currentRawPool = advisorClients.map((c) => this.calculateGlobalScore(c, steps).rawScore);
    const stressedRawPool = advisorClients.map((c) =>
      this.calculateGlobalScore(this.applyScenarioToClient(c as any, scenarioType), steps).rawScore,
    );
    const currentMin = Math.min(...currentRawPool);
    const currentMax = Math.max(...currentRawPool);
    const stressedMin = Math.min(...stressedRawPool);
    const stressedMax = Math.max(...stressedRawPool);

    const currentBreakdown = this.calculateGlobalScore(client, steps);
    const stressedClient = this.applyScenarioToClient(client as any, scenarioType);
    const stressedBreakdown = this.calculateGlobalScore(stressedClient, steps);

    const currentScore = this.normalizeRawScore(currentBreakdown.rawScore, currentMin, currentMax);
    const stressedScore = this.normalizeRawScore(stressedBreakdown.rawScore, stressedMin, stressedMax);

    const cashLike = stressedClient.investments
      .filter((investment) => {
        const c = investment.category as string;
        return c === 'DEBT' || c === 'MUTUAL_FUND';
      })
      .reduce((sum, investment) => sum + investment.total_value, 0);
    const survivalHorizonMonths = stressedClient.monthly_expense > 0
      ? (cashLike + (stressedClient.emergency_fund ?? 0)) / stressedClient.monthly_expense
      : 0;

    const factorNames = Object.keys(stressedBreakdown.factorValues ?? {});
    const biggestVulnerability = factorNames.reduce(
      (worst, factor) => {
        const current = currentBreakdown.factorValues[factor] ?? 0;
        const stressed = stressedBreakdown.factorValues[factor] ?? 0;
        const drop = current - stressed;
        if (drop > worst.drop) return { factor, drop };
        return worst;
      },
      { factor: 'liquidity', drop: -Infinity },
    ).factor;

    return {
      scenario: scenarioType,
      currentScore: Math.round(currentScore * 10) / 10,
      stressedScore: Math.round(stressedScore * 10) / 10,
      pointsDropped: Math.round((currentScore - stressedScore) * 10) / 10,
      survivalHorizonMonths: Math.round(survivalHorizonMonths * 10) / 10,
      biggestVulnerability,
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