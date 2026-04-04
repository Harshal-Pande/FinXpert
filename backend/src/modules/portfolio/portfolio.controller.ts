import { Controller, Get, Param, Query, ParseUUIDPipe } from '@nestjs/common';
import { PortfolioService } from './portfolio.service';
import { Public } from '../../common/decorators/public.decorator';

@Public()
@Controller('clients/:clientId/portfolio')
export class PortfolioController {
  constructor(private readonly portfolioService: PortfolioService) {}

  @Get()
  getByClient(
    @Param('clientId', ParseUUIDPipe) clientId: string,
    @Query('type') assetType?: string,
  ) {
    return this.portfolioService.getByClient(clientId, assetType);
  }
}
