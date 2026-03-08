import { Module } from '@nestjs/common';
import { RebalancingController } from './rebalancing.controller';
import { RebalancingService } from './rebalancing.service';
import { PrismaModule } from '../../database/prisma.module';

@Module({
  imports: [PrismaModule],
  controllers: [RebalancingController],
  providers: [RebalancingService],
  exports: [RebalancingService],
})
export class RebalancingModule {}
