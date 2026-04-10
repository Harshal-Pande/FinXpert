import { Type } from 'class-transformer';
import {
  IsArray,
  IsIn,
  IsNumber,
  IsString,
  ValidateNested,
} from 'class-validator';

export class FormulaStepDto {
  @IsString()
  @IsIn([
    'alr',
    'emergency_fund',
    'diversification',
    'investment_behavior',
    'crypto_concentration',
    'insurance_adequacy',
    'tax_efficiency',
    'age_factor',
  ])
  factorId: string;

  @IsString()
  @IsIn(['add', 'subtract'])
  operation: 'add' | 'subtract';

  @IsNumber()
  @Type(() => Number)
  multiplier: number;
}

export class UpdateHealthScoreFormulaDto {
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => FormulaStepDto)
  steps: FormulaStepDto[];
}
