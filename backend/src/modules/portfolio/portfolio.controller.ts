import { Controller, Get, Param, ParseUUIDPipe } from '@nestjs/common';
import { PortfolioService } from './portfolio.service';

@Controller('clients/:clientId/portfolio')
export class PortfolioController {
  constructor(private readonly portfolioService: PortfolioService) {}

  @Get()
  getByClient(@Param('clientId', ParseUUIDPipe) clientId: string) {
    return this.portfolioService.getByClient(clientId);
  }
}
