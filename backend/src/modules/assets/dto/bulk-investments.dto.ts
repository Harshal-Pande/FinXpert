import { Type } from 'class-transformer';
import {
  IsArray,
  ArrayMinSize,
  IsIn,
  IsNumber,
  IsString,
  Min,
  ValidateNested,
} from 'class-validator';

export class BulkInvestmentRowDto {
  @IsString()
  instrument_name: string;

  @IsIn(['STOCK', 'DEBT', 'CRYPTO', 'MUTUAL_FUND'])
  category: 'STOCK' | 'DEBT' | 'CRYPTO' | 'MUTUAL_FUND';

  @IsNumber()
  @Type(() => Number)
  @Min(0.0001)
  quantity: number;

  @IsNumber()
  @Type(() => Number)
  @Min(0.01)
  buyPrice: number;
}

export class BulkInvestmentsDto {
  @IsArray()
  @ArrayMinSize(1)
  @ValidateNested({ each: true })
  @Type(() => BulkInvestmentRowDto)
  rows: BulkInvestmentRowDto[];
}
