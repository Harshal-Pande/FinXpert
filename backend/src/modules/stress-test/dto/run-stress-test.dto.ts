import { IsIn } from 'class-validator';

export class RunStressTestDto {
  @IsIn(['MARKET_MELTDOWN', 'JOB_LOSS', 'MEDICAL_SHOCK'])
  scenario: 'MARKET_MELTDOWN' | 'JOB_LOSS' | 'MEDICAL_SHOCK';
}
