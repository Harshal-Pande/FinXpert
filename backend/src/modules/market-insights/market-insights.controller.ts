import { Controller, Get, Post, Query } from '@nestjs/common';
import { MarketInsightsService } from './market-insights.service';
import { Public } from '../../common/decorators/public.decorator';

@Controller('market-insights')
export class MarketInsightsController {
  constructor(private readonly marketInsightsService: MarketInsightsService) {}

  @Public() 
  @Get()
  findAll(@Query('limit') limit?: string) {
    return this.marketInsightsService.findAll(limit ? parseInt(limit, 10) : 20);
  }

  @Public() // 👈 ALSO ADD HERE
  @Post('trigger')
  async trigger() {
    return this.marketInsightsService.triggerAnalysis();
  }
}