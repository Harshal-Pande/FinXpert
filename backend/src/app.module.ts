import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { ScheduleModule } from '@nestjs/schedule';
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
import { DashboardModule } from './modules/dashboard/dashboard.module';
import { TodosModule } from './modules/todos/todos.module';
import { AdvisoryModule } from './modules/advisory/advisory.module';
import { HealthModule } from './health/health.module';

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
      load: [envConfig],
    }),
    ScheduleModule.forRoot(),
    PrismaModule,
    AuthModule,
    ClientsModule,
    PortfolioModule,
    AssetsModule,
    HealthScoreModule,
    StressTestModule,
    RebalancingModule,
    MarketInsightsModule,
    DashboardModule,
    TodosModule,
    AdvisoryModule,
    HealthModule,
  ],
})
export class AppModule {}
