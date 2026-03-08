import { Controller, Get, Param, ParseUUIDPipe } from '@nestjs/common';
import { HealthScoreService } from './health-score.service';
import { Public } from '../../common/decorators/public.decorator';

@Public() // 👈 Essential for your current "no-login" vibe
@Controller('clients/:clientId/health-score')
export class HealthScoreController {
  constructor(private readonly healthScoreService: HealthScoreService) {}

  @Get()
  getLatest(@Param('clientId', ParseUUIDPipe) clientId: string) {
    // This calls your existing service to get the latest score for Rahul, Anita, or Kevin
    return this.healthScoreService.getLatest(clientId);
  }
}