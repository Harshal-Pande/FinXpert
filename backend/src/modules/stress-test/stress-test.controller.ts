import { Controller, Post, Body, Param, ParseUUIDPipe } from '@nestjs/common';
import { StressTestService } from './stress-test.service';
import { RunStressTestDto } from './dto/run-stress-test.dto';

@Controller('clients/:clientId/stress-test')
export class StressTestController {
  constructor(private readonly stressTestService: StressTestService) {}

  @Post()
  run(
    @Param('clientId', ParseUUIDPipe) clientId: string,
    @Body() dto: RunStressTestDto,
  ) {
    return this.stressTestService.run(clientId, dto);
  }
}
