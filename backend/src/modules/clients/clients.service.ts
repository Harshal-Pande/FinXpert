import { Injectable, NotFoundException, UnauthorizedException } from '@nestjs/common';
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
    advisorId: string;
    search?: string;
    riskProfile?: string;
    page?: number;
    limit?: number;
  }) {
    const { advisorId, search, riskProfile, page = 1, limit = 100 } = params;

    const where: Record<string, unknown> = { advisor_id: advisorId };

    // Search by name (case-insensitive)
    if (search && search.trim()) {
      where.name = {
        contains: search.trim(),
        mode: 'insensitive',
      };
    }

    // Filter by risk profile
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

    let steps: FormulaStep[] | null = null;
    try {
      const formula = await this.formulaService.getForAdvisor(advisorId);
      steps = (formula.steps as FormulaStep[]) ?? [];
    } catch {
      // In a fresh production DB (no seeded advisor), the formula service can’t resolve an advisor.
      // Clients list should still work; we simply omit calculated health score fields.
      steps = null;
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

    // Same peer-normalization as findOne: min/max raw scores across ALL clients matching
    // this query (not just the current page), so list and detail always show one number.
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

  async findOne(id: string, advisorId: string) {
    const client = await this.prisma.client.findFirst({
      where: { id, advisor_id: advisorId },
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

    // Compute the live normalized health score using the same cross-client
    // pipeline as findAll, so both endpoints always agree on the number.
    // Falls back gracefully when no formula is configured for the advisor.
    let steps: FormulaStep[] | null = null;
    try {
      const formula = await this.formulaService.getForAdvisor(client.advisor_id);
      steps = (formula.steps as FormulaStep[]) ?? [];
    } catch {
      // No formula configured — return client without computed health scores
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
    advisorId: string;
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
    if (!data.advisorId?.trim()) {
      throw new UnauthorizedException('Advisor context required to create a client');
    }

    const horizon = (data.investment_horizon ?? 'long').toLowerCase();

    return this.prisma.client.create({
      data: {
        advisor_id: data.advisorId,
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

  async update(id: string, advisorId: string, data: UpdateClientDto) {
    await this.assertClientOwnedByAdvisor(id, advisorId);
    return this.prisma.client.update({
      where: { id },
      data,
    });
  }

  async getPortfolioHistory(clientId: string, advisorId: string) {
    await this.assertClientOwnedByAdvisor(clientId, advisorId);
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

  private async assertClientOwnedByAdvisor(clientId: string, advisorId: string): Promise<void> {
    const row = await this.prisma.client.findFirst({
      where: { id: clientId, advisor_id: advisorId },
      select: { id: true },
    });
    if (!row) {
      throw new NotFoundException(`Client with ID ${clientId} not found`);
    }
  }

  async getAdvisorAumHistory(advisorId: string) {
    const clients = await this.prisma.client.findMany({
      where: { advisor_id: advisorId },
      select: { id: true },
    });
    const ids = clients.map((c) => c.id);
    if (ids.length === 0) {
      return [];
    }

    const all = await this.prisma.portfolioSnapshot.findMany({
      where: { client_id: { in: ids } },
      orderBy: { date: 'asc' },
      select: { total_value: true, date: true },
    });

    // Group by month label (e.g. "Oct '24")
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