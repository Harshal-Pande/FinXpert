import {
  IsString,
  IsNumber,
  IsIn,
  Min,
  IsDateString,
  IsOptional,
  ValidateIf,
} from 'class-validator';
import { Type } from 'class-transformer';

/** Add holding: unit price × quantity = totalCost; CMP resolved via Gemini on the backend. */
export class CreateAssetDto {
  @IsString()
  instrument_name: string;

  @IsIn(['STOCK', 'DEBT', 'CRYPTO', 'MUTUAL_FUND'])
  category: 'STOCK' | 'DEBT' | 'CRYPTO' | 'MUTUAL_FUND';

  @ValidateIf((o: CreateAssetDto) => o.value == null)
  @IsNumber()
  @Type(() => Number)
  @Min(0.01)
  price?: number;

  @ValidateIf((o: CreateAssetDto) => o.value == null)
  @IsNumber()
  @Type(() => Number)
  @Min(0.01)
  quantity?: number;

  /** Legacy: single lump-sum (quantity defaults to 1). */
  @IsOptional()
  @IsNumber()
  @Type(() => Number)
  @Min(0.01)
  value?: number;

  @IsOptional()
  @IsDateString()
  bought_at?: string;
}
