import { Body, Controller, Get, Put } from '@nestjs/common';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { Public } from '../../common/decorators/public.decorator';
import { UpdateHealthScoreFormulaDto } from './dto/update-health-score-formula.dto';
import { HealthScoreFormulaService } from './health-score-formula.service';

@Public()
@Controller('health-score-formula')
export class HealthScoreFormulaController {
  constructor(private readonly formulaService: HealthScoreFormulaService) {}

  @Get()
  getFormula(@CurrentUser('id') advisorId?: string) {
    return this.formulaService.getForAdvisor(advisorId);
  }

  @Put()
  updateFormula(
    @Body() dto: UpdateHealthScoreFormulaDto,
    @CurrentUser('id') advisorId?: string,
  ) {
    console.log('Received health-score-formula payload:', dto);
    return this.formulaService.updateForAdvisor(dto, advisorId);
  }
}
