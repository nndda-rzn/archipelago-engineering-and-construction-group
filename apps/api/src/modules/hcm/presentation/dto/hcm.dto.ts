import { Type } from 'class-transformer';
import { IsBoolean, IsDateString, IsNumber, IsOptional, IsString, Length, Max, MaxLength, Min } from 'class-validator';

export class CreateEmployeeDto {
  @IsOptional()
  @IsString()
  userId?: string;

  @IsString()
  legalEntityId!: string;

  @IsString()
  @Length(2, 200)
  name!: string;

  @IsString()
  @Length(2, 100)
  position!: string;

  @IsOptional()
  @IsString()
  @Length(1, 20)
  grade?: string;

  @IsOptional()
  @IsString()
  @MaxLength(100)
  department?: string;

  @IsOptional()
  @IsString()
  @MaxLength(100)
  location?: string;

  @IsOptional()
  @IsString()
  @MaxLength(100)
  costCenter?: string;

  @IsOptional()
  @IsString()
  managerId?: string;

  @IsOptional()
  @IsDateString()
  joinDate?: string;
}

export class ListEmployeeQueryDto {
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
  legalEntityId?: string;

  @IsOptional()
  @IsString()
  status?: string;
}

export class CreateProjectAssignmentDto {
  @IsString()
  projectId!: string;

  @IsOptional()
  @IsString()
  @MaxLength(100)
  role?: string;

  @Type(() => Number)
  @IsNumber()
  @Min(1)
  @Max(100)
  allocationPercent!: number;

  @IsOptional()
  @IsDateString()
  startDate?: string;

  @IsOptional()
  @IsDateString()
  endDate?: string;

  @IsOptional()
  @IsBoolean()
  exceptionApproved?: boolean;
}

export class EndAssignmentDto {
  @IsOptional()
  @IsDateString()
  endDate?: string;
}

export class CreateTimesheetDto {
  @IsString()
  employeeId!: string;

  @IsString()
  projectId!: string;

  @IsOptional()
  @IsString()
  wbsItemId?: string;

  @IsOptional()
  @IsDateString()
  workDate?: string;

  @Type(() => Number)
  @IsNumber()
  @Min(0.5)
  @Max(24)
  hours!: number;

  @IsOptional()
  @IsString()
  @MaxLength(100)
  activity?: string;

  @IsOptional()
  @IsString()
  @MaxLength(500)
  description?: string;
}

export class ApproveTimesheetDto {
  @IsOptional()
  @IsString()
  status?: string;
}

export class ListTimesheetQueryDto {
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
  employeeId?: string;

  @IsOptional()
  @IsString()
  projectId?: string;

  @IsOptional()
  @IsString()
  status?: string;
}

export class CreatePayrollAllocationDto {
  @IsString()
  employeeId!: string;

  @IsOptional()
  @IsString()
  projectId?: string;

  @IsString()
  @Length(7, 7)
  period!: string; // "2026-08"

  @Type(() => Number)
  @IsNumber()
  @Min(0)
  grossAmount!: number;

  @Type(() => Number)
  @IsNumber()
  @Min(0)
  projectAmount!: number;

  @Type(() => Number)
  @IsNumber()
  @Min(0)
  overheadAmount!: number;
}

export class ListPayrollAllocationQueryDto {
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
  @Length(7, 7)
  period?: string;

  @IsOptional()
  @IsString()
  employeeId?: string;
}

export class ChangeEmployeeStatusDto {
  @IsString()
  status!: string;

  @IsOptional()
  @IsDateString()
  leaveDate?: string;
}
