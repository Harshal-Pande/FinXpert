import { IsString, IsNumber, IsOptional, IsIn, Min, IsDateString } from 'class-validator';
import { Type } from 'class-transformer';

export class UpdateAssetDto {
  @IsOptional()
  @IsIn(['Stock', 'Crypto', 'Debt', 'Mutual Fund'])
  investment_type?: 'Stock' | 'Crypto' | 'Debt' | 'Mutual Fund';

  @IsOptional()
  @IsIn(['STOCK', 'MUTUAL_FUND', 'CRYPTO', 'CASH'])
  category?: 'STOCK' | 'MUTUAL_FUND' | 'CRYPTO' | 'CASH';

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
  @IsNumber()
  @Type(() => Number)
  @Min(0)
  avg_buy_price?: number;

  @IsOptional()
  @IsNumber()
  @Type(() => Number)
  @Min(0)
  current_price?: number;

  @IsOptional()
  @IsDateString()
  bought_at?: string;
}
