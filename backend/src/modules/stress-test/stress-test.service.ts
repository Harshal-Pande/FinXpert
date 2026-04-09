import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../database/prisma.service';
import { RunStressTestDto } from './dto/run-stress-test.dto';
import { HealthScoreService } from '../health-score/health-score.service';

@Injectable()
export class StressTestService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly healthScoreService: HealthScoreService,
  ) {}

  async run(clientId: string, dto: RunStressTestDto) {
    await this.prisma.client.findUniqueOrThrow({ where: { id: clientId } });
    return this.healthScoreService.simulateStressForClient(clientId, dto.scenario);
  }
}
