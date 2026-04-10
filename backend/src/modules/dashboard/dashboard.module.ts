import { Module } from '@nestjs/common';
import { DashboardController } from './dashboard.controller';
import { DashboardService } from './dashboard.service';

import { MarketModule } from '../market/market.module';
import { ComplianceModule } from '../compliance/compliance.module';
import { NewsModule } from '../news/news.module';

@Module({
  imports: [MarketModule, ComplianceModule, NewsModule],
  controllers: [DashboardController],
  providers: [DashboardService],
})
export class DashboardModule {}
