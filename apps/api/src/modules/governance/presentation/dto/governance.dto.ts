import { Type } from 'class-transformer';
import { IsDateString, IsIn, IsInt, IsNumber, IsOptional, IsString, Length, Max, MaxLength, Min } from 'class-validator';

export class CreateRiskDto {
  @IsOptional()
  @IsString()
  projectId?: string;

  @IsString()
  @Length(3, 300)
  title!: string;

  @IsOptional()
  @IsIn(['FINANCIAL', 'TECHNICAL', 'SCHEDULE', 'HSE', 'COMMERCIAL', 'OTHER'])
  category?: string;

  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(5)
  likelihood!: number;

  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(5)
  impact!: number;

  @IsString()
  @Length(2, 200)
  owner!: string;

  @IsOptional()
  @IsString()
  @MaxLength(1000)
  mitigation?: string;
}

export class MitigateRiskDto {
  @IsOptional()
  @IsString()
  @MaxLength(1000)
  mitigation?: string;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(5)
  residualLikelihood?: number;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(5)
  residualImpact?: number;
}

export class ListRiskQueryDto {
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
  projectId?: string;

  @IsOptional()
  @IsString()
  status?: string;
}

export class CreateAuditDto {
  @IsString()
  @Length(3, 200)
  title!: string;

  @IsOptional()
  @IsString()
  @MaxLength(1000)
  scope?: string;
}

export class AdvanceAuditDto {
  @IsOptional()
  @IsString()
  status?: string;
}

export class CreateFindingDto {
  @IsString()
  @Length(3, 300)
  title!: string;

  @IsOptional()
  @IsIn(['LOW', 'MEDIUM', 'HIGH'])
  severity?: string;

  @IsOptional()
  @IsDateString()
  followUpDate?: string;
}

export class RespondFindingDto {
  @IsOptional()
  @IsString()
  @MaxLength(1000)
  response?: string;

  @IsOptional()
  @IsString()
  @MaxLength(1000)
  correctiveAction?: string;

  @IsOptional()
  @IsIn(['OPEN', 'ACCEPTED', 'RESOLVED', 'VERIFIED'])
  status?: string;
}

export class ListAuditQueryDto {
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

export class CreateLegalCaseDto {
  @IsOptional()
  @IsString()
  projectId?: string;

  @IsOptional()
  @IsString()
  legalEntityId?: string;

  @IsString()
  @Length(3, 200)
  title!: string;

  @IsOptional()
  @IsIn(['CONTRACT', 'LABOR', 'REGULATORY', 'TAX', 'OTHER'])
  caseType?: string;

  @IsOptional()
  @IsString()
  @MaxLength(200)
  counterpart?: string;

  @IsOptional()
  @IsString()
  @MaxLength(2000)
  description?: string;
}

export class LegalCaseStatusDto {
  @IsOptional()
  @IsIn(['OPEN', 'IN_PROGRESS', 'WON', 'LOST', 'SETTLED'])
  status?: string;
}

export class ListLegalCaseQueryDto {
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
  projectId?: string;

  @IsOptional()
  @IsString()
  status?: string;
}

export class CreateAccessReviewDto {
  @IsString()
  @Length(7, 10)
  period!: string; // mis. "2026-Q3"
}

export class CompleteAccessReviewDto {
  @IsOptional()
  @IsString()
  @MaxLength(1000)
  notes?: string;
}

export class ListAccessReviewQueryDto {
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
