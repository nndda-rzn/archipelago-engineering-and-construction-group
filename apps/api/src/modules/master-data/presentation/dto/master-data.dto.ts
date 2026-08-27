import { Type } from 'class-transformer';
import { IsDateString, IsEmail, IsIn, IsInt, IsNumber, IsOptional, IsString, Length, Max, MaxLength, Min } from 'class-validator';

export class CreateVendorDto {
  @IsString()
  @Length(2, 200)
  name!: string;

  @IsOptional()
  @IsString()
  @MaxLength(30)
  taxId?: string;

  @IsOptional()
  @IsIn(['MATERIAL', 'SUBCONTRACTOR', 'SERVICE', 'EQUIPMENT', 'OTHER'])
  category?: string;

  @IsOptional()
  @IsString()
  @MaxLength(200)
  contactPerson?: string;

  @IsOptional()
  @IsEmail()
  email?: string;

  @IsOptional()
  @IsString()
  @MaxLength(50)
  phone?: string;

  @IsOptional()
  @IsString()
  @MaxLength(500)
  address?: string;
}

export class ListVendorQueryDto {
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

export class CreateFiscalPeriodDto {
  @IsString()
  @Length(7, 7)
  periodCode!: string; // "2026-01"

  @Type(() => Number)
  @IsInt()
  @Min(2000)
  @Max(2100)
  periodYear!: number;

  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(12)
  periodMonth!: number;

  @IsDateString()
  startDate!: string;

  @IsDateString()
  endDate!: string;
}

export class UpdateFiscalPeriodStatusDto {
  @IsIn(['FUTURE', 'OPEN', 'SOFT_CLOSED', 'CLOSED', 'LOCKED'])
  status!: string;
}

export class ListFiscalPeriodQueryDto {
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
  status?: string;
}
