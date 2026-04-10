import { Controller, Get, Query } from '@nestjs/common';
import { NewsService } from './news.service';
import { Public } from '../../common/decorators/public.decorator';

@Controller('news')
export class NewsController {
  constructor(private readonly newsService: NewsService) {}

  @Public()
  @Get('market')
  getMarket(@Query('limit') limit?: string) {
    const n = limit != null && limit !== '' ? parseInt(limit, 10) : 10;
    const capped = Math.min(30, Math.max(1, Number.isFinite(n) ? n : 10));
    return this.newsService.getMarketNews(capped);
  }
}
