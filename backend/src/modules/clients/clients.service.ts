import { Injectable, NotFoundException } from '@nestjs/common';
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
    advisorId?: string;
    search?: string;
    riskProfile?: string;
    page?: number;
    limit?: number;
  }) {
    const { advisorId, search, riskProfile, page = 1, limit = 100 } = params;

    const where: Record<string, unknown> = {};

    // Filter by advisor
    if (advisorId && advisorId !== 'undefined' && advisorId !== 'null') {
      where.advisor_id = advisorId;
    }

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

    const [items, total, formula] = await Promise.all([
      this.prisma.client.findMany({
        where,
        include: { investments: true },
        skip: (page - 1) * limit,
        take: limit,
        orderBy: { created_at: 'desc' },
      }),
      this.prisma.client.count({ where }),
      this.formulaService.getForAdvisor(advisorId),
    ]);

    const steps = formula.steps as FormulaStep[];

    const rawPass = items.map((client) => ({
      client,
      breakdown: this.healthScoreService.calculateGlobalScore(client, steps),
    }));
    const rawScores = rawPass.map((entry) => entry.breakdown.rawScore);
    const globalMinRaw = rawScores.length ? Math.min(...rawScores) : 0;
    const globalMaxRaw = rawScores.length ? Math.max(...rawScores) : 0;

    const projected = rawPass.map((entry) => {
      const normalized = this.healthScoreService.normalizeRawScore(
        entry.breakdown.rawScore,
        globalMinRaw,
        globalMaxRaw,
      );
      const breakdown = {
        ...entry.breakdown,
        normalizedScore: Math.round(normalized * 10) / 10,
        globalMinRaw: Math.round(globalMinRaw * 10) / 10,
        globalMaxRaw: Math.round(globalMaxRaw * 10) / 10,
        weightedTotal: Math.round(normalized * 10) / 10,
      };
      return {
        ...entry.client,
        calculatedHealthScore: breakdown.weightedTotal,
        calculatedHealthBreakdown: breakdown,
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
    return client;
  }

  async create(data: { advisorId: string; [key: string]: unknown }) {
    const { advisorId, ...rest } = data;
    return this.prisma.client.create({
      data: {
        ...rest,
        advisor_id: advisorId,
      } as any,
    });
  }

  async update(id: string, data: UpdateClientDto) {
    return this.prisma.client.update({
      where: { id },
      data,
    });
  }
}