import { Controller, Get, Param, ParseUUIDPipe } from '@nestjs/common';
import { RebalancingService } from './rebalancing.service';

@Controller('clients/:clientId/rebalancing')
export class RebalancingController {
  constructor(private readonly rebalancingService: RebalancingService) {}

  @Get('recommendations')
  getRecommendations(@Param('clientId', ParseUUIDPipe) clientId: string) {
    return this.rebalancingService.getRecommendations(clientId);
  }
}
