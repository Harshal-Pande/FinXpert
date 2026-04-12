import { IsString, IsNumber, IsIn, Min, IsDateString, IsOptional } from 'class-validator';
import { Type } from 'class-transformer';

/** Simple portfolio line item for demo UI (name + lump-sum value + sleeve). */
export class CreateAssetDto {
  @IsString()
  instrument_name: string;

  @IsNumber()
  @Type(() => Number)
  @Min(0.01)
  value: number;

  @IsIn(['equity', 'debt', 'cash', 'gold', 'Equity', 'Debt', 'Cash', 'Gold'])
  category: 'equity' | 'debt' | 'cash' | 'gold' | 'Equity' | 'Debt' | 'Cash' | 'Gold';

  @IsOptional()
  @IsDateString()
  bought_at?: string;
}
