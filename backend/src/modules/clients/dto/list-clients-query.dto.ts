import { IsOptional, IsString, IsIn } from 'class-validator';
import { PaginationDto } from '../../../common/dto/pagination.dto';

export class ListClientsQueryDto extends PaginationDto {
  @IsOptional()
  @IsString()
  search?: string;

  @IsOptional()
  @IsIn(['conservative', 'moderate', 'aggressive'])
  riskProfile?: string;
}
