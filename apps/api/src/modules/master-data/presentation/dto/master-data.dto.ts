import { Type } from 'class-transformer';
import { IsDateString, IsEmail, IsEnum, IsInt, IsNumber, IsOptional, IsString, Length, Max, MaxLength, Min } from 'class-validator';
import { FiscalPeriodStatus, NumberSequenceStatus, VendorCategory, VendorStatus } from '@prisma/client';

export const VENDOR_CATEGORIES = ['MATERIAL', 'SUBCONTRACTOR', 'SERVICE', 'EQUIPMENT', 'OTHER'] as const;
export const VENDOR_STATUSES = ['ACTIVE', 'INACTIVE'] as const;
export const FISCAL_PERIOD_STATUSES = ['FUTURE', 'OPEN', 'SOFT_CLOSED', 'CLOSED', 'LOCKED'] as const;

export class CreateVendorDto {
  @IsString()
  @Length(2, 200)
  name!: string;

  @IsOptional()
  @IsString()
  @MaxLength(30)
  taxId?: string;

  @IsOptional()
  @IsEnum(VendorCategory)
  category?: VendorCategory;

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

/** Update parsial — semua field opsional; hanya field yang dikirim yang berubah. */
export class UpdateVendorDto {
  @IsOptional()
  @IsString()
  @Length(2, 200)
  name?: string;

  @IsOptional()
  @IsString()
  @MaxLength(30)
  taxId?: string;

  @IsOptional()
  @IsEnum(VendorCategory)
  category?: VendorCategory;

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

export class SetVendorStatusDto {
  @IsEnum(VendorStatus)
  status!: VendorStatus;
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

  /** Cari pada nama, kode, atau NPWP. */
  @IsOptional()
  @IsString()
  @MaxLength(100)
  search?: string;

  @IsOptional()
  @IsEnum(VendorCategory)
  category?: VendorCategory;

  @IsOptional()
  @IsEnum(VendorStatus)
  status?: VendorStatus;
}

export class CreateFiscalPeriodDto {
  @IsString()
  @Length(7, 7)
  periodCode!: string;

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
  @IsEnum(FiscalPeriodStatus)
  status!: FiscalPeriodStatus;
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
  @IsEnum(FiscalPeriodStatus)
  status?: FiscalPeriodStatus;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(2000)
  @Max(2100)
  periodYear?: number;
}

export class ListNumberSequenceQueryDto {
  @IsOptional()
  @IsEnum(NumberSequenceStatus)
  status?: NumberSequenceStatus;
}
