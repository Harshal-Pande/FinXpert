import { Controller, Get, Post, Param, ParseUUIDPipe } from '@nestjs/common';
import { HealthScoreService } from './health-score.service';
import { Public } from '../../common/decorators/public.decorator';

@Public()
@Controller('clients/:clientId/health-score')
export class HealthScoreController {
  constructor(private readonly healthScoreService: HealthScoreService) {}

  @Get()
  getLatest(@Param('clientId', ParseUUIDPipe) clientId: string) {
    return this.healthScoreService.getLatest(clientId);
  }

  @Post('calculate')
  calculate(@Param('clientId', ParseUUIDPipe) clientId: string) {
    return this.healthScoreService.calculate(clientId);
  }
}