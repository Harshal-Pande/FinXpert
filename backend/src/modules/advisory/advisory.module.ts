import { Module } from '@nestjs/common';
import { AdvisoryController } from './advisory.controller';
import { AdvisoryService } from './advisory.service';
import { AiInsightService } from '../../services/ai-insight.service';

@Module({
  controllers: [AdvisoryController],
  providers: [AdvisoryService, AiInsightService],
})
export class AdvisoryModule {}
