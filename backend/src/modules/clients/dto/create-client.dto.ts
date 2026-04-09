import {
  IsString,
  IsNumber,
  IsOptional,
  Min,
  Max,
  IsIn,
} from 'class-validator';
import { Type } from 'class-transformer';

export class CreateClientDto {
  @IsString()
  name: string;

  @IsNumber()
  @Type(() => Number)
  @Min(1)
  @Max(120)
  age: number;

  @IsString()
  occupation: string;

  @IsNumber()
  @Type(() => Number)
  @Min(0)
  annual_income: number;

  @IsNumber()
  @Type(() => Number)
  @Min(0)
  monthly_expense: number;

  @IsOptional()
  @IsNumber()
  @Type(() => Number)
  @Min(0)
  emergency_fund?: number;

  @IsOptional()
  @IsNumber()
  @Type(() => Number)
  @Min(0)
  insurance_coverage?: number;

  @IsOptional()
  @IsIn(['conservative', 'moderate', 'aggressive', 'passive'])
  risk_profile?: string;

  @IsOptional()
  @IsIn(['short', 'medium', 'long', 'Short', 'Medium', 'Long'])
  investment_horizon?: string;
}
