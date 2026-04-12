import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../../database/prisma.service';
import { UpdateClientDto } from './dto/update-client.dto';
import { HealthScoreService } from '../health-score/health-score.service';
import {
  FormulaStep,
  HealthScoreFormulaService,
} from '../health-score/health-score-formula.service';

@Injectable()
export class ClientsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly healthScoreService: HealthScoreService,
    private readonly formulaService: HealthScoreFormulaService,
  ) {}

  async findAll(params: {
    search?: string;
    riskProfile?: string;
    page?: number;
    limit?: number;
  }) {
    const { search, riskProfile, page = 1, limit = 100 } = params;

    const where: Record<string, unknown> = {};

    if (search && search.trim()) {
      where.name = {
        contains: search.trim(),
        mode: 'insensitive',
      };
    }

    if (riskProfile) {
      where.risk_profile = riskProfile;
    }

    const [items, total] = await Promise.all([
      this.prisma.client.findMany({
        where,
        include: { investments: true },
        skip: (page - 1) * limit,
        take: limit,
        orderBy: { created_at: 'desc' },
      }),
      this.prisma.client.count({ where }),
    ]);

    const firstAdvisor = await this.prisma.advisor.findFirst({
      orderBy: { created_at: 'asc' },
      select: { id: true },
    });
    const formulaAdvisorId = firstAdvisor?.id;

    let steps: FormulaStep[] | null = null;
    if (formulaAdvisorId) {
      try {
        const formula = await this.formulaService.getForAdvisor(formulaAdvisorId);
        steps = (formula.steps as FormulaStep[]) ?? [];
      } catch {
        steps = null;
      }
    }

    if (!steps) {
      return {
        items: items.map((client) => ({
          ...client,
          calculatedHealthScore: null,
          calculatedHealthBreakdown: null,
        })),
        total,
        page,
        limit,
      };
    }

    const allMatching = await this.prisma.client.findMany({
      where,
      include: { investments: true },
    });
    const globalRawScores = allMatching.map((c) =>
      this.healthScoreService.calculateGlobalScore(c, steps).rawScore,
    );
    const globalMinRaw = globalRawScores.length ? Math.min(...globalRawScores) : 0;
    const globalMaxRaw = globalRawScores.length ? Math.max(...globalRawScores) : 0;
    const roundedMin = Math.round(globalMinRaw * 10) / 10;
    const roundedMax = Math.round(globalMaxRaw * 10) / 10;

    const projected = items.map((client) => {
      const breakdown = this.healthScoreService.calculateGlobalScore(client, steps);
      const normalized = this.healthScoreService.normalizeRawScore(
        breakdown.rawScore,
        globalMinRaw,
        globalMaxRaw,
      );
      const weightedTotal = Math.round(normalized * 10) / 10;
      return {
        ...client,
        calculatedHealthScore: weightedTotal,
        calculatedHealthBreakdown: {
          ...breakdown,
          normalizedScore: weightedTotal,
          globalMinRaw: roundedMin,
          globalMaxRaw: roundedMax,
          weightedTotal,
        },
      };
    });

    return { items: projected, total, page, limit };
  }

  async findOne(id: string) {
    const client = await this.prisma.client.findUnique({
      where: { id },
      include: {
        investments: true,
        healthScores: {
          orderBy: { calculated_at: 'desc' },
          take: 1,
        },
        portfolioTarget: true,
      },
    });

    if (!client) throw new NotFoundException(`Client with ID ${id} not found`);

    let steps: FormulaStep[] | null = null;
    try {
      const formula = await this.formulaService.getForAdvisor(client.advisor_id);
      steps = (formula.steps as FormulaStep[]) ?? [];
    } catch {
      steps = null;
    }

    if (!steps) {
      return {
        ...client,
        calculatedHealthScore: null,
        calculatedHealthBreakdown: null,
      };
    }

    const allClients = await this.prisma.client.findMany({
      where: { advisor_id: client.advisor_id },
      include: { investments: true },
    });

    const rawPool = allClients.map((c) =>
      this.healthScoreService.calculateGlobalScore(c, steps).rawScore,
    );
    const globalMinRaw = Math.min(...rawPool);
    const globalMaxRaw = Math.max(...rawPool);

    const clientBreakdown = this.healthScoreService.calculateGlobalScore(client, steps);
    const normalized =
      Math.round(
        this.healthScoreService.normalizeRawScore(
          clientBreakdown.rawScore,
          globalMinRaw,
          globalMaxRaw,
        ) * 10,
      ) / 10;

    return {
      ...client,
      calculatedHealthScore: normalized,
      calculatedHealthBreakdown: {
        ...clientBreakdown,
        normalizedScore: normalized,
        globalMinRaw: Math.round(globalMinRaw * 10) / 10,
        globalMaxRaw: Math.round(globalMaxRaw * 10) / 10,
        weightedTotal: normalized,
      },
    };
  }

  async create(data: {
    name: string;
    age: number;
    occupation: string;
    annual_income: number;
    monthly_expense: number;
    emergency_fund?: number;
    insurance_coverage?: number;
    risk_profile?: string;
    investment_horizon?: string;
  }) {
    const advisorId = await this.resolveFirstAdvisorId();
    const horizon = (data.investment_horizon ?? 'long').toLowerCase();

    return this.prisma.client.create({
      data: {
        advisor_id: advisorId,
        name: data.name,
        age: data.age,
        occupation: data.occupation,
        annual_income: data.annual_income,
        monthly_expense: data.monthly_expense,
        emergency_fund: data.emergency_fund ?? null,
        insurance_coverage: data.insurance_coverage ?? null,
        risk_profile: data.risk_profile ?? 'moderate',
        investment_horizon: horizon,
      },
      include: { investments: true },
    });
  }

  private async resolveFirstAdvisorId(): Promise<string> {
    const advisor = await this.prisma.advisor.findFirst({
      orderBy: { created_at: 'asc' },
      select: { id: true },
    });
    if (!advisor) {
      throw new BadRequestException(
        'No advisor exists yet. Seed or create an advisor before adding clients.',
      );
    }
    return advisor.id;
  }

  async update(id: string, data: UpdateClientDto) {
    return this.prisma.client.update({
      where: { id },
      data,
    });
  }

  async getPortfolioHistory(clientId: string) {
    await this.prisma.client.findUniqueOrThrow({ where: { id: clientId } });
    const snapshots = await this.prisma.portfolioSnapshot.findMany({
      where: { client_id: clientId },
      orderBy: { date: 'asc' },
      select: { id: true, total_value: true, date: true },
    });
    return snapshots.map((s) => ({
      id: s.id,
      totalValue: s.total_value,
      date: s.date.toISOString(),
      month: s.date.toLocaleDateString('en-IN', { month: 'short', year: '2-digit' }),
    }));
  }

  async getAdvisorAumHistory() {
    const all = await this.prisma.portfolioSnapshot.findMany({
      orderBy: { date: 'asc' },
      select: { total_value: true, date: true },
    });

    const grouped = new Map<string, { total: number; date: Date }>();
    for (const s of all) {
      const key = s.date.toLocaleDateString('en-IN', { month: 'short', year: '2-digit' });
      const existing = grouped.get(key);
      if (existing) {
        existing.total += s.total_value;
      } else {
        grouped.set(key, { total: s.total_value, date: s.date });
      }
    }

    return Array.from(grouped.entries())
      .sort((a, b) => a[1].date.getTime() - b[1].date.getTime())
      .map(([month, { total }]) => ({ month, totalValue: Math.round(total) }));
  }
}
