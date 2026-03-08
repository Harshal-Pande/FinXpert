import { IsNumber, Min, Max } from 'class-validator';
import { Type } from 'class-transformer';

export class HealthScoreWeightsDto {
  @IsNumber()
  @Type(() => Number)
  @Min(0)
  @Max(1)
  stock_target: number;

  @IsNumber()
  @Type(() => Number)
  @Min(0)
  @Max(1)
  mutual_fund_target: number;

  @IsNumber()
  @Type(() => Number)
  @Min(0)
  @Max(1)
  crypto_target: number;

  @IsNumber()
  @Type(() => Number)
  @Min(0)
  @Max(1)
  debt_target: number;
}
