import { Type } from 'class-transformer';
import { IsBoolean, IsDateString, IsIn, IsInt, IsOptional, IsString, Length, Max, Min } from 'class-validator';
import { PartialType } from '@nestjs/mapped-types';

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

export class ListProjectQueryDto {  @IsOptional()
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

/**
 * Body `PATCH /projects/:id`. `code` & `legalEntityId` sengaja tidak ada —
 * kode adalah identitas, entity menentukan pembukuan.
 */
export class UpdateProjectDto extends PartialType(CreateProjectDto) {}

export const PROJECT_TYPES = ['EPC', 'MARINE', 'POWER', 'PROCESS', 'INFRASTRUCTURE', 'OTHER'] as const;
export const PROJECT_PRIORITIES = ['LOW', 'MEDIUM', 'HIGH', 'CRITICAL'] as const;

/** Body `PATCH /projects/:id` — menambah type/priority & manager/director sebagai orang. */
export class UpdateProjectMetaDto {
  @IsOptional() @IsIn(PROJECT_TYPES) type?: (typeof PROJECT_TYPES)[number];
  @IsOptional() @IsIn(PROJECT_PRIORITIES) priority?: (typeof PROJECT_PRIORITIES)[number];
  @IsOptional() @IsString() managerId?: string;
  @IsOptional() @IsString() directorId?: string;
}

/** Body `POST /projects/:id/team` — tugaskan karyawan ke proyek. */
export class AddProjectMemberDto {
  @IsString() employeeId!: string;

  @IsOptional() @IsString() @Length(2, 100) role?: string;

  @Type(() => Number) @IsInt() @Min(1) @Max(100) allocationPercent!: number;

  @IsOptional() @IsDateString() startDate?: string;
  @IsOptional() @IsDateString() endDate?: string;
  @IsOptional() @IsBoolean() isKeyMember?: boolean;
}

export const PROJECT_PHASES = ['INITIATION', 'FEED', 'ENGINEERING', 'PROCUREMENT', 'CONSTRUCTION', 'COMMISSIONING', 'CLOSEOUT'] as const;
export const MILESTONE_STATUSES = ['PLANNED', 'IN_PROGRESS', 'ACHIEVED', 'MISSED'] as const;
export const GATE_DECISIONS = ['GO', 'HOLD', 'NO_GO'] as const;

/** Body `POST /projects/:id/milestones`. */
export class CreateMilestoneDto {
  @IsString() @Length(2, 200) name!: string;

  @IsDateString() plannedDate!: string;

  @IsOptional() @IsDateString() actualDate?: string;

  @IsOptional() @IsIn(MILESTONE_STATUSES) status?: (typeof MILESTONE_STATUSES)[number];

  @IsOptional() @Type(() => Number) @IsInt() @Min(0) @Max(100) weight?: number;

  @IsOptional() @IsBoolean() isCritical?: boolean;

  @IsOptional() @IsString() @Length(0, 500) notes?: string;
}

/** Body `PATCH /projects/:id/milestones/:milestoneId`. */
export class UpdateMilestoneDto extends PartialType(CreateMilestoneDto) {}

/** Body `POST /projects/:id/phases/advance` — majukan fase (stage-gate). */
export class AdvancePhaseDto {
  @IsIn(PROJECT_PHASES) phase!: (typeof PROJECT_PHASES)[number];

  @IsOptional() @IsIn(GATE_DECISIONS) decision?: (typeof GATE_DECISIONS)[number];

  @IsOptional() @IsString() @Length(0, 200) gate?: string;

  @IsOptional() @IsString() @Length(0, 500) notes?: string;
}

/** Body `POST /projects/:id/stakeholders`. */
export class AddStakeholderDto {
  @IsString() @Length(2, 200) name!: string;

  @IsString() @Length(2, 100) role!: string;

  @IsOptional() @IsIn(['RESPONSIBLE', 'ACCOUNTABLE', 'CONSULTED', 'INFORMED']) raci?: string;

  @IsOptional() @IsString() employeeId?: string;
  @IsOptional() @IsString() email?: string;
  @IsOptional() @IsString() phone?: string;
  @IsOptional() @IsBoolean() isPrimary?: boolean;
}
