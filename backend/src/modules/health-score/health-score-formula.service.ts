import { Injectable } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { PrismaService } from '../../database/prisma.service';
import { UpdateHealthScoreFormulaDto } from './dto/update-health-score-formula.dto';
import { HealthScoreService } from './health-score.service';

export type FormulaFactor =
  | 'alr'
  | 'emergency_fund'
  | 'diversification'
  | 'investment_behavior'
  | 'crypto_concentration'
  | 'insurance_adequacy'
  | 'tax_efficiency'
  | 'age_factor';

export type FormulaStep = {
  factorId: FormulaFactor;
  operation: 'add' | 'subtract';
  multiplier: number;
};

const DEFAULT_STEPS: FormulaStep[] = [
  { factorId: 'alr', operation: 'add', multiplier: 8.5 },
  { factorId: 'emergency_fund', operation: 'add', multiplier: 7.5 },
  { factorId: 'diversification', operation: 'add', multiplier: 6.5 },
  { factorId: 'investment_behavior', operation: 'add', multiplier: 6.0 },
  { factorId: 'crypto_concentration', operation: 'subtract', multiplier: 5.0 },
  { factorId: 'insurance_adequacy', operation: 'add', multiplier: 4.0 },
  { factorId: 'tax_efficiency', operation: 'add', multiplier: 3.0 },
  { factorId: 'age_factor', operation: 'add', multiplier: 2.0 },
];

@Injectable()
export class HealthScoreFormulaService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly healthScoreService: HealthScoreService,
  ) {}

  private async resolveAdvisorId(advisorId?: string): Promise<string> {
    if (advisorId && advisorId !== 'undefined' && advisorId !== 'null') return advisorId;
    const fallback = await this.prisma.advisor.findFirst({ select: { id: true } });
    if (!fallback) throw new Error('No advisor found for health score formula');
    return fallback.id;
  }

  private normalizeSteps(input: unknown): FormulaStep[] {
    const source = Array.isArray(input) ? input : [];
    if (source.length === 0) return DEFAULT_STEPS;
    return source.map((step) => {
      const casted = step as Partial<FormulaStep>;
      const factorId = (casted.factorId ?? 'alr') as FormulaFactor;
      const operation = casted.operation === 'subtract' ? 'subtract' : 'add';
      const multiplier = Number(casted.multiplier ?? 1);
      return { factorId, operation, multiplier };
    });
  }

  async getForAdvisor(advisorId?: string) {
    const resolvedAdvisorId = await this.resolveAdvisorId(advisorId);
    const existing = await this.prisma.healthScoreFormula.findUnique({
      where: { advisor_id: resolvedAdvisorId },
    });

    if (existing) {
      return { ...existing, steps: this.normalizeSteps(existing.steps) };
    }

    return this.prisma.healthScoreFormula.create({
      data: {
        advisor_id: resolvedAdvisorId,
        steps: DEFAULT_STEPS,
      },
    });
  }

  async updateForAdvisor(dto: UpdateHealthScoreFormulaDto, advisorId?: string) {
    const resolvedAdvisorId = await this.resolveAdvisorId(advisorId);
    const steps = this.normalizeSteps(dto.steps);
    const stepsPayload = dto.steps as unknown as Prisma.InputJsonValue;

    let updated;
    try {
      updated = await this.prisma.healthScoreFormula.upsert({
        where: { advisor_id: resolvedAdvisorId },
        create: { advisor_id: resolvedAdvisorId, steps: stepsPayload },
        update: { steps: stepsPayload },
      });
    } catch (error) {
      console.error('HealthScoreFormula upsert failed:', error);
      throw error;
    }

    try {
      await this.healthScoreService.recalculateForAdvisor(resolvedAdvisorId, steps);
    } catch (error) {
      console.error('Health score recalculation failed:', error);
      throw error;
    }
    return updated;
  }
}
