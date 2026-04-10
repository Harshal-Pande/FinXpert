import { Controller, Get, Query } from '@nestjs/common';
import { ComplianceService } from './compliance.service';
import { Public } from '../../common/decorators/public.decorator';

@Public()
@Controller('compliance')
export class ComplianceController {
  constructor(private readonly complianceService: ComplianceService) {}

  @Get('upcoming')
  async getUpcoming(@Query('advisorId') advisorId?: string) {
    return this.complianceService.getUpcoming(advisorId);
  }
}
