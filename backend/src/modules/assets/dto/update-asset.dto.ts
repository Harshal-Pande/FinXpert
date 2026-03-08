import { IsString, IsNumber, IsOptional, IsIn, Min } from 'class-validator';
import { Type } from 'class-transformer';

export class UpdateAssetDto {
  @IsOptional()
  @IsIn(['stock', 'mutual_fund', 'crypto', 'debt'])
  asset_type?: string;

  @IsOptional()
  @IsString()
  asset_name?: string;

  @IsOptional()
  @IsNumber()
  @Type(() => Number)
  @Min(0)
  value?: number;
}
