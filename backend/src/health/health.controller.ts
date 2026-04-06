import { Controller, Get } from '@nestjs/common';
import { HealthService } from './health.service';

@Controller('health')   // 👈 IMPORTANT
export class HealthController {
  constructor(private readonly healthService: HealthService) {}

  @Get()   // 👈 IMPORTANT
  getHealth() {
    return this.healthService.calculateHealthScore({});
  }
}