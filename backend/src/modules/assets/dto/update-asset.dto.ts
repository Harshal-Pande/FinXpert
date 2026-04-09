import { IsString, IsNumber, IsOptional, IsIn, Min, IsDateString } from 'class-validator';
import { Type } from 'class-transformer';

export class UpdateAssetDto {
  @IsOptional()
  @IsIn(['Stock', 'Crypto', 'Debt', 'Mutual Fund'])
  investment_type?: 'Stock' | 'Crypto' | 'Debt' | 'Mutual Fund';

  @IsOptional()
  @IsString()
  instrument_name?: string;

  @IsOptional()
  @IsNumber()
  @Type(() => Number)
  @Min(0)
  quantity?: number;

  @IsOptional()
  @IsNumber()
  @Type(() => Number)
  @Min(0)
  buy_rate?: number;

  @IsOptional()
  @IsDateString()
  bought_at?: string;
}
