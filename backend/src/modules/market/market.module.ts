import { Module } from '@nestjs/common';
import { MarketController } from './market.controller';
import { MarketNewsService } from './market-news.service';
import { MarketDataService } from '../../services/market-data.service';

@Module({
  controllers: [MarketController],
  providers: [MarketNewsService, MarketDataService],
  exports: [MarketNewsService, MarketDataService],
})
export class MarketModule {}
