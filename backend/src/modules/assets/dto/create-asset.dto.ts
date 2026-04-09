import { IsString, IsNumber, IsIn, Min, IsDateString } from 'class-validator';
import { Type } from 'class-transformer';

export class CreateAssetDto {
  @IsIn(['Stock', 'Crypto', 'Debt', 'Mutual Fund'])
  investment_type: 'Stock' | 'Crypto' | 'Debt' | 'Mutual Fund';

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

  @IsDateString()
  bought_at: string;
}
