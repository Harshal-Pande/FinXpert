import { IsIn } from 'class-validator';

export class RunStressTestDto {
  @IsIn(['stock_crash', 'crypto_crash', 'bear_market'])
  scenario: string;
}
