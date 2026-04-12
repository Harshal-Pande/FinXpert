import { IsString, IsNumber, IsOptional, IsIn, Min, IsDateString } from 'class-validator';
import { Type } from 'class-transformer';

export class UpdateAssetDto {
  @IsOptional()
  @IsIn(['Stock', 'Crypto', 'Debt', 'Mutual Fund'])
  investment_type?: 'Stock' | 'Crypto' | 'Debt' | 'Mutual Fund';

  @IsOptional()
  @IsIn(['STOCK', 'DEBT', 'CRYPTO', 'MUTUAL_FUND'])
  category?: 'STOCK' | 'DEBT' | 'CRYPTO' | 'MUTUAL_FUND';

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
  buyPrice?: number;

  @IsOptional()
  @IsNumber()
  @Type(() => Number)
  @Min(0)
  totalCost?: number;

  @IsOptional()
  @IsNumber()
  @Type(() => Number)
  @Min(0)
  cmp?: number;

  @IsOptional()
  @IsDateString()
  bought_at?: string;
}
