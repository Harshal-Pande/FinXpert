import { Module } from '@nestjs/common';
import { AssetsController } from './assets.controller';
import { AssetsService } from './assets.service';
import { PrismaModule } from '../../database/prisma.module';
import { MarketInsightsModule } from '../market-insights/market-insights.module';
import { PortfolioPriceRefreshCron } from './portfolio-price-refresh.cron';

@Module({
  imports: [PrismaModule, MarketInsightsModule],
  controllers: [AssetsController],
  providers: [AssetsService, PortfolioPriceRefreshCron],
  exports: [AssetsService],
})
export class AssetsModule {}
