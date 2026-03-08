import { Module } from '@nestjs/common';
import { HealthScoreController } from './health-score.controller';
import { HealthScoreService } from './health-score.service';
import { PrismaModule } from '../../database/prisma.module';

@Module({
  imports: [PrismaModule], // Injected to allow HealthScoreService to talk to the DB
  controllers: [HealthScoreController], // Opens the /clients/:clientId/health-score endpoint
  providers: [HealthScoreService], // Contains the logic for calculating scores
  exports: [HealthScoreService], // Allows other modules (like Stress Test) to use this logic
})
export class HealthScoreModule {}