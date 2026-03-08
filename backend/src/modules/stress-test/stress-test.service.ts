import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../database/prisma.service';
import { RunStressTestDto } from './dto/run-stress-test.dto';

@Injectable()
export class StressTestService {
  constructor(private readonly prisma: PrismaService) {}

  async run(clientId: string, dto: RunStressTestDto) {
    // Placeholder: full scenario simulation to be implemented
    return { clientId, scenario: dto.scenario, result: {} };
  }
}
