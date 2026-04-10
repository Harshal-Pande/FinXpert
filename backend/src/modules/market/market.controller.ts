import { Controller, Get } from '@nestjs/common';
import { MarketNewsService } from './market-news.service';
import { MarketDataService } from '../../services/market-data.service';
import { Public } from '../../common/decorators/public.decorator';

@Controller('market')
export class MarketController {
  constructor(
    private readonly marketNewsService: MarketNewsService,
    private readonly marketDataService: MarketDataService,
  ) {}

  @Public()
  @Get('news')
  getNews() {
    return this.marketNewsService.getNews();
  }

  @Public()
  @Get('indices')
  getIndices() {
    return this.marketDataService.getIndices();
  }

  @Public()
  @Get('nifty')
  getNifty() {
    return this.marketDataService.getNifty();
  }

  @Public()
  @Get('sensex')
  getSensex() {
    return this.marketDataService.getSensex();
  }

  @Public()
  @Get('gold')
  getGold() {
    return this.marketDataService.getGold();
  }
}
