import { IsString, IsNumber, IsOptional, Min, Max, IsIn } from 'class-validator';
import { Type } from 'class-transformer';

export class UpdateClientDto {
  @IsOptional()
  @IsString()
  name?: string;

  @IsOptional()
  @IsNumber()
  @Type(() => Number)
  @Min(1)
  @Max(120)
  age?: number;

  @IsOptional()
  @IsString()
  occupation?: string;

  @IsOptional()
  @IsNumber()
  @Type(() => Number)
  @Min(0)
  annual_income?: number;

  @IsOptional()
  @IsNumber()
  @Type(() => Number)
  @Min(0)
  monthly_expense?: number;

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
  @IsIn(['conservative', 'moderate', 'aggressive'])
  risk_profile?: string;

  @IsOptional()
  @IsIn(['short', 'medium', 'long'])
  investment_horizon?: string;
}
