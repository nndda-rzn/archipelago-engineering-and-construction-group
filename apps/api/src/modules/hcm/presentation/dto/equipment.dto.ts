import { Type } from 'class-transformer';
import { IsDateString, IsNumber, IsOptional, IsString, Length, Max, MaxLength, Min } from 'class-validator';

export class CreateEquipmentDto {
  @IsString()
  @Length(2, 200)
  name!: string;

  @IsOptional()
  @IsString()
  category?: string;

  @IsOptional()
  @IsString()
  @MaxLength(100)
  serialNumber?: string;

  @IsOptional()
  @IsString()
  owner?: string;

  @IsOptional()
  @IsDateString()
  acquisitionDate?: string;

  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  @Min(0)
  currentMeter?: number;

  @IsOptional()
  @IsString()
  legalEntityId?: string;
}

export class ListEquipmentQueryDto {
  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  @Min(1)
  page?: number;

  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  @Min(1)
  pageSize?: number;

  @IsOptional()
  @IsString()
  category?: string;

  @IsOptional()
  @IsString()
  status?: string;
}

export class CreateEquipmentAssignmentDto {
  @IsString()
  projectId!: string;

  @IsOptional()
  @IsDateString()
  startDate?: string;

  @IsOptional()
  @IsDateString()
  endDate?: string;
}

export class CreateEquipmentUtilizationDto {
  @IsOptional()
  @IsString()
  projectId?: string;

  @IsOptional()
  @IsDateString()
  utilizationDate?: string;

  @Type(() => Number)
  @IsNumber()
  @Min(0)
  availableHours!: number;

  @Type(() => Number)
  @IsNumber()
  @Min(0)
  @Max(24)
  operatingHours!: number;

  @IsOptional()
  @IsString()
  @MaxLength(500)
  description?: string;
}

export class CreateEquipmentPmDto {
  @IsOptional()
  @IsString()
  triggerType?: string;

  @IsOptional()
  @IsDateString()
  dueDate?: string;

  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  @Min(0)
  dueMeter?: number;

  @IsOptional()
  @IsString()
  @MaxLength(500)
  description?: string;
}

export class CreateEquipmentBreakdownDto {
  @IsOptional()
  @IsDateString()
  breakdownDate?: string;

  @Type(() => Number)
  @IsNumber()
  @Min(0.1)
  downtimeHours!: number;

  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  @Min(0)
  costImpact?: number;

  @IsOptional()
  @IsString()
  @MaxLength(500)
  description?: string;
}

export class CreateEquipmentUsageDto {
  @IsString()
  projectId!: string;

  @IsOptional()
  @IsDateString()
  usageDate?: string;

  @Type(() => Number)
  @IsNumber()
  @Min(0.1)
  hours!: number;

  @Type(() => Number)
  @IsNumber()
  @Min(0)
  costAmount!: number;

  @IsOptional()
  @IsString()
  @MaxLength(500)
  description?: string;
}
