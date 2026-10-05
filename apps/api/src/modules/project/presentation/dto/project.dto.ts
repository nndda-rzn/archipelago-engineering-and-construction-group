import { Type } from 'class-transformer';
import { IsDateString, IsInt, IsOptional, IsString, Length, Max, Min } from 'class-validator';

export class CreateProjectDto {
  @IsString()
  @Length(3, 30)
  code!: string;

  @IsString()
  @Length(3, 200)
  name!: string;

  @IsString()
  @Length(2, 200)
  client!: string;

  @IsString()
  legalEntityId!: string;

  @IsOptional()
  @IsString()
  businessUnit?: string;

  @IsOptional()
  @IsString()
  location?: string;

  @IsOptional()
  @IsString()
  @Length(3, 3)
  currency?: string;

  @IsOptional()
  @Type(() => Number)
  contractValue?: number;

  @IsOptional()
  @Type(() => Number)
  advanceAmount?: number;

  @IsOptional()
  @Type(() => Number)
  @Min(0)
  @Max(100)
  advanceRecoveryRate?: number;

  @IsOptional()
  @IsDateString()
  startDate?: string;

  @IsOptional()
  @IsDateString()
  completionDate?: string;

  @IsOptional()
  @IsString()
  director?: string;

  @IsOptional()
  @IsString()
  manager?: string;
}

export class ListProjectQueryDto {
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  page?: number;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(200)
  pageSize?: number;

  @IsOptional()
  @IsString()
  search?: string;

  @IsOptional()
  @IsString()
  status?: string;

  /** Kolom sortir (di-whitelist di service; nilai asing jatuh ke default). */
  @IsOptional()
  @IsString()
  sort?: string;

  @IsOptional()
  @IsString()
  order?: string;
}
