import { Controller, Get } from '@nestjs/common';
import { MarketNewsService } from './market-news.service';
import { Public } from '../../common/decorators/public.decorator';

@Controller('market')
export class MarketController {
  constructor(private readonly marketNewsService: MarketNewsService) {}

  @Public()
  @Get('news')
  getNews() {
    return this.marketNewsService.getNews();
  }
}
