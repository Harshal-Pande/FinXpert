import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../../database/prisma.service';
import { HealthScoreWeightsDto } from './dto/health-score-weights.dto';

@Injectable()
export class HealthScoreService {
  constructor(private readonly prisma: PrismaService) {}

  // RENAMED: from getScore to getLatest to match HealthScoreController
  async getLatest(clientId: string) {
    const latest = await this.prisma.healthScore.findFirst({
      where: { client_id: clientId },
      orderBy: { calculated_at: 'desc' },
    });

    // Vibe Guard: If no score exists in DB yet, return a default 8.5
    if (!latest) {
      return { 
        score: 8.5, 
        calculated_at: new Date(),
        client_id: clientId 
      };
    }
    return latest;
  }

  async calculate(clientId: string) {
    // Placeholder logic: creates a neutral score of 5.0
    return this.prisma.healthScore.create({
      data: {
        client_id: clientId,
        score: 5.0,
      },
    });
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