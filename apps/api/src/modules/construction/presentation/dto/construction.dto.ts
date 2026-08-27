import { Type } from 'class-transformer';
import { IsInt, IsNumber, IsOptional, IsString, IsDateString, Length, Max, MaxLength, Min } from 'class-validator';

export class CreateWorkPackageDto {
  @IsString()
  projectId!: string;

  @IsString()
  wbsItemId!: string;

  @IsString()
  @Length(3, 200)
  title!: string;

  @IsOptional()
  @IsString()
  @MaxLength(500)
  description?: string;

  @IsOptional()
  @IsString()
  @MaxLength(500)
  scope?: string;

  @IsNumber()
  @Min(0.01)
  plannedQty!: number;

  @IsOptional()
  @IsString()
  unit?: string;

  @IsOptional()
  @IsDateString()
  startDate?: string;

  @IsOptional()
  @IsDateString()
  endDate?: string;

  @IsOptional()
  requiresIFC?: boolean;
}

export class ListWorkPackageQueryDto {
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
}

export class CreateProgressDto {
  @IsNumber()
  @Min(0)
  @Max(100)
  physicalProgress!: number;

  @IsNumber()
  @Min(0)
  achievedQty!: number;

  @IsOptional()
  @IsString()
  @MaxLength(500)
  note?: string;

  @IsString()
  @Length(2, 100)
  measuredBy!: string;

  @IsOptional()
  @IsDateString()
  progressDate?: string;
}

export class CreateDailyReportDto {
  @IsString()
  projectId!: string;

  @IsOptional()
  @IsDateString()
  reportDate?: string;

  @IsOptional()
  @IsString()
  weather?: string;

  @IsOptional()
  @IsNumber()
  temperatureC?: number;

  @IsString()
  @Length(5, 2000)
  summary!: string;

  @IsOptional()
  @IsString()
  @MaxLength(2000)
  issues?: string;

  @IsOptional()
  @IsString()
  @MaxLength(2000)
  hseNote?: string;

  @IsOptional()
  @IsString()
  @MaxLength(2000)
  qualityNote?: string;

  @IsOptional()
  @IsString()
  @MaxLength(1000)
  equipmentList?: string;

  @IsOptional()
  @IsString()
  @MaxLength(1000)
  materialList?: string;

  @IsOptional()
  manpowerLines?: { trade: string; manpowerCount: number; hoursWorked: number; note?: string }[];
}

export class ListDailyReportQueryDto {
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
