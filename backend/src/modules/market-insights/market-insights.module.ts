import { Module } from '@nestjs/common';
import { MarketInsightsController } from './market-insights.controller';
import { MarketInsightsService } from './market-insights.service';
import { PrismaModule } from '../../database/prisma.module';
import { AiInsightService } from '../../services/ai-insight.service';

@Module({
  imports: [PrismaModule],
  controllers: [MarketInsightsController],
  providers: [MarketInsightsService, AiInsightService],
  exports: [MarketInsightsService],
})
export class MarketInsightsModule {}
