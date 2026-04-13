import { Controller, Post, Param, ParseUUIDPipe } from '@nestjs/common';
import { AdvisoryService } from './advisory.service';
import { Public } from '../../common/decorators/public.decorator';

@Public()
@Controller('clients/:clientId/advisory')
export class AdvisoryController {
  constructor(private readonly advisoryService: AdvisoryService) {}

  @Post('send')
  sendAdvisory(@Param('clientId', ParseUUIDPipe) clientId: string) {
    return this.advisoryService.generateAdvisory(clientId);
  }

  /** FinXpert AI Strategist — data-driven plan (Gemini + deterministic fallback). */
  @Post('strategy')
  strategicPlan(@Param('clientId', ParseUUIDPipe) clientId: string) {
    return this.advisoryService.generateStrategicPlan(clientId);
  }
}
