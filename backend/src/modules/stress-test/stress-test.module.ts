import { Module } from '@nestjs/common';
import { StressTestController } from './stress-test.controller';
import { StressTestService } from './stress-test.service';
import { PrismaModule } from '../../database/prisma.module';

@Module({
  imports: [PrismaModule],
  controllers: [StressTestController],
  providers: [StressTestService],
  exports: [StressTestService],
})
export class StressTestModule {}
