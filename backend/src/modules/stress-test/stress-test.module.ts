import { Module } from '@nestjs/common';
import { StressTestController } from './stress-test.controller';
import { StressTestService } from './stress-test.service';
import { PrismaModule } from '../../database/prisma.module';
import { HealthScoreModule } from '../health-score/health-score.module';

@Module({
  imports: [PrismaModule, HealthScoreModule],
  controllers: [StressTestController],
  providers: [StressTestService],
  exports: [StressTestService],
})
export class StressTestModule {}
