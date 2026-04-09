import { IsString, IsNumber, IsIn, Min, IsDateString, IsOptional } from 'class-validator';
import { Type } from 'class-transformer';

export class CreateAssetDto {
  @IsIn(['Stock', 'Crypto', 'Debt', 'Mutual Fund'])
  investment_type: 'Stock' | 'Crypto' | 'Debt' | 'Mutual Fund';

  @IsOptional()
  @IsIn(['STOCK', 'MUTUAL_FUND', 'CRYPTO', 'CASH'])
  category?: 'STOCK' | 'MUTUAL_FUND' | 'CRYPTO' | 'CASH';

  @IsString()
  instrument_name: string;

  @IsNumber()
  @Type(() => Number)
  @Min(0)
  quantity: number;

  @IsNumber()
  @Type(() => Number)
  @Min(0)
  buy_rate: number;

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

  @IsDateString()
  bought_at: string;
}
