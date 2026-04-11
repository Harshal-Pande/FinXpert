import { Module } from '@nestjs/common';
import { MarketInsightsController } from './market-insights.controller';
import { MarketInsightsService } from './market-insights.service';
import { PrismaModule } from '../../database/prisma.module';
import { AiInsightService } from '../../services/ai-insight.service';
import { PortfolioObserverService } from './portfolio-observer.service';

@Module({
  imports: [PrismaModule],
  controllers: [MarketInsightsController],
  providers: [MarketInsightsService, AiInsightService, PortfolioObserverService],
  exports: [MarketInsightsService, AiInsightService],
})
export class MarketInsightsModule {}
