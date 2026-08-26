import { Type } from 'class-transformer';
import { IsDateString, IsEnum, IsInt, IsNumber, IsOptional, IsString, Length, Max, MaxLength, Min } from 'class-validator';

export class CreateCostCodeDto {
  @IsString()
  @Length(1, 30)
  code!: string;

  @IsString()
  @Length(1, 200)
  name!: string;

  @IsOptional()
  @IsString()
  wbsItemId?: string;

  @IsOptional()
  @IsEnum(['DIRECT', 'INDIRECT', 'LABOR', 'MATERIAL', 'SUBCONTRACTOR', 'EQUIPMENT', 'OVERHEAD'])
  costType?: string;
}

export class ListCostCodeQueryDto {
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
  status?: string;

  @IsOptional()
  @IsString()
  costType?: string;
}

export class CreateControlAccountDto {
  @IsString()
  @Length(1, 30)
  code!: string;

  @IsString()
  @Length(1, 200)
  name!: string;

  @IsString()
  wbsItemId!: string;

  @IsString()
  @MaxLength(200)
  responsibleManager!: string;

  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  budgetAmount?: number;

  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  plannedValue?: number;

  @IsOptional()
  @IsDateString()
  scheduleStart?: string;

  @IsOptional()
  @IsDateString()
  scheduleEnd?: string;
}

export class ListControlAccountQueryDto {
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
}

export class CreateForecastDto {
  @IsString()
  period!: string;

  @Type(() => Number)
  @IsNumber()
  estimateAtCompletion!: number;

  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  estimateToComplete?: number;

  @IsOptional()
  @IsString()
  @MaxLength(500)
  note?: string;
}
