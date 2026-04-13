import { Module } from '@nestjs/common';
import { AdvisoryController } from './advisory.controller';
import { AdvisoryService } from './advisory.service';
import { AiInsightService } from '../../services/ai-insight.service';
import { ClientsModule } from '../clients/clients.module';

@Module({
  imports: [ClientsModule],
  controllers: [AdvisoryController],
  providers: [AdvisoryService, AiInsightService],
})
export class AdvisoryModule {}
