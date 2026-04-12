import { Module } from '@nestjs/common';
import { ClientsController } from './clients.controller';
import { ClientsService } from './clients.service';
import { PrismaModule } from '../../database/prisma.module';
import { HealthScoreModule } from '../health-score/health-score.module';

@Module({
  imports: [PrismaModule, HealthScoreModule],
  controllers: [ClientsController],
  providers: [ClientsService],
  exports: [ClientsService],
})
export class ClientsModule {}
