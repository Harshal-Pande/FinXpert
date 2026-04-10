import { Module } from '@nestjs/common';
import { MarketController } from './market.controller';
import { MarketNewsService } from './market-news.service';

@Module({
  controllers: [MarketController],
  providers: [MarketNewsService],
  exports: [MarketNewsService],
})
export class MarketModule {}
