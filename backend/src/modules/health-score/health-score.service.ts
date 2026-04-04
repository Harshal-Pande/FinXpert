import { Injectable, Logger, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../../database/prisma.service';
import { HealthScoreWeightsDto } from './dto/health-score-weights.dto';

export interface HealthBreakdown {
  incomeExpenseScore: number;
  emergencyFundScore: number;
  diversificationScore: number;
  insuranceScore: number;
  weightedTotal: number;
}

@Injectable()
export class HealthScoreService {
  private readonly logger = new Logger(HealthScoreService.name);

  constructor(private readonly prisma: PrismaService) {}

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
        portfolio: { include: { assets: true } },
      },
    });

    if (!client) {
      throw new NotFoundException(`Client ${clientId} not found`);
    }

    const breakdown = this.computeBreakdown(client);

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

  private computeBreakdown(client: {
    annual_income: number;
    monthly_expense: number;
    emergency_fund: number | null;
    insurance_coverage: number | null;
    portfolio: { assets: { asset_type: string; value: number }[] } | null;
  }): HealthBreakdown {
    // 1. Income-to-Expense Ratio (target: save at least 30% of income)
    const monthlySavings = client.annual_income / 12 - client.monthly_expense;
    const savingsRate = monthlySavings / (client.annual_income / 12);
    // Score: 10 if savings rate >= 40%, 0 if <= 0%, linear in between
    const incomeExpenseScore = Math.min(10, Math.max(0, (savingsRate / 0.4) * 10));

    // 2. Emergency Fund Adequacy (target: 6 months of expenses)
    const targetEmergencyFund = client.monthly_expense * 6;
    const emergencyFund = client.emergency_fund ?? 0;
    const emergencyRatio = targetEmergencyFund > 0
      ? emergencyFund / targetEmergencyFund
      : 0;
    const emergencyFundScore = Math.min(10, Math.max(0, emergencyRatio * 10));

    // 3. Portfolio Diversification (presence of 4 asset types = 10)
    const assets = client.portfolio?.assets ?? [];
    const uniqueTypes = new Set(assets.map((a) => a.asset_type?.toLowerCase()).filter(Boolean));
    const maxTypes = 4;
    const diversificationScore = (uniqueTypes.size / maxTypes) * 10;

    // Also check if no single asset > 60% of portfolio
    const totalValue = assets.reduce((sum, a) => sum + a.value, 0);
    let concentrationPenalty = 0;
    if (totalValue > 0) {
      const maxAssetPct = Math.max(...assets.map((a) => a.value / totalValue));
      if (maxAssetPct > 0.6) {
        concentrationPenalty = (maxAssetPct - 0.6) * 10; // penalty for over-concentration
      }
    }
    const adjustedDiversificationScore = Math.max(0, diversificationScore - concentrationPenalty);

    // 4. Insurance Coverage (target: 10x annual income)
    const targetInsurance = client.annual_income * 10;
    const insuranceCoverage = client.insurance_coverage ?? 0;
    const insuranceRatio = targetInsurance > 0
      ? insuranceCoverage / targetInsurance
      : 0;
    const insuranceScore = Math.min(10, Math.max(0, insuranceRatio * 10));

    // Weighted average (equal weights: 25% each)
    const weightedTotal = Math.round(
      (incomeExpenseScore * 0.25 +
        emergencyFundScore * 0.25 +
        adjustedDiversificationScore * 0.25 +
        insuranceScore * 0.25) * 10,
    ) / 10;

    return {
      incomeExpenseScore: Math.round(incomeExpenseScore * 10) / 10,
      emergencyFundScore: Math.round(emergencyFundScore * 10) / 10,
      diversificationScore: Math.round(adjustedDiversificationScore * 10) / 10,
      insuranceScore: Math.round(insuranceScore * 10) / 10,
      weightedTotal,
    };
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