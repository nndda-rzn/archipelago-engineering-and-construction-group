import { Type } from 'class-transformer';
import { IsEnum, IsInt, IsOptional, IsString, Max, MaxLength, Min } from 'class-validator';

export class ListLegalEntityQueryDto {
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  page = 1;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(200)
  pageSize = 50;

  @IsOptional()
  @IsEnum(['code', 'legalName', 'status', 'country', 'functionalCurrency'])
  sortBy?: 'code' | 'legalName' | 'status' | 'country' | 'functionalCurrency';

  @IsOptional()
  @IsEnum(['asc', 'desc'])
  sortDir: 'asc' | 'desc' = 'asc';

  @IsOptional()
  @IsString()
  @MaxLength(100)
  search?: string;
}
