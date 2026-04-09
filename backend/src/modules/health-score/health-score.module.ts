import { Module } from '@nestjs/common';
import { HealthScoreController } from './health-score.controller';
import { HealthScoreService } from './health-score.service';
import { PrismaModule } from '../../database/prisma.module';
import { HealthScoreFormulaService } from './health-score-formula.service';
import { HealthScoreFormulaController } from './health-score-formula.controller';

@Module({
  imports: [PrismaModule], // Injected to allow HealthScoreService to talk to the DB
  controllers: [HealthScoreController, HealthScoreFormulaController],
  providers: [HealthScoreService, HealthScoreFormulaService],
  exports: [HealthScoreService, HealthScoreFormulaService],
})
export class HealthScoreModule {}