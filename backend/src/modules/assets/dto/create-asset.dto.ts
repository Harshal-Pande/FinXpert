import { IsString, IsNumber, IsIn, Min } from 'class-validator';
import { Type } from 'class-transformer';

export class CreateAssetDto {
  @IsIn(['stock', 'mutual_fund', 'crypto', 'debt'])
  asset_type: string;

  @IsString()
  asset_name: string;

  @IsNumber()
  @Type(() => Number)
  @Min(0)
  value: number;
}
