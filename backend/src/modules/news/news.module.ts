import { Module } from '@nestjs/common';
import { NewsController } from './news.controller';
import { NewsService } from './news.service';
import { MarketModule } from '../market/market.module';

@Module({
  imports: [MarketModule],
  controllers: [NewsController],
  providers: [NewsService],
  exports: [NewsService],
})
export class NewsModule {}
