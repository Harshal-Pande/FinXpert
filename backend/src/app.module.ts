import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { envConfig } from './config/env.config';
import { PrismaModule } from './database/prisma.module';
import { AuthModule } from './modules/auth/auth.module';
import { ClientsModule } from './modules/clients/clients.module';
import { PortfolioModule } from './modules/portfolio/portfolio.module';
import { AssetsModule } from './modules/assets/assets.module';
import { HealthScoreModule } from './modules/health-score/health-score.module';
import { StressTestModule } from './modules/stress-test/stress-test.module';
import { RebalancingModule } from './modules/rebalancing/rebalancing.module';
import { MarketInsightsModule } from './modules/market-insights/market-insights.module';

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
      load: [envConfig],
    }),
    PrismaModule,
    AuthModule,
    ClientsModule,
    PortfolioModule,
    AssetsModule,
    HealthScoreModule,
    StressTestModule,
    RebalancingModule,
    MarketInsightsModule,
  ],
})
export class AppModule {}
