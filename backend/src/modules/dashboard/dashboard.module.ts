import { Module } from '@nestjs/common';
import { DashboardController } from './dashboard.controller';
import { DashboardService } from './dashboard.service';

import { MarketModule } from '../market/market.module';

@Module({
  imports: [MarketModule],
  controllers: [DashboardController],
  providers: [DashboardService],
})
export class DashboardModule {}
