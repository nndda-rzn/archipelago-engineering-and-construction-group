import { Type } from 'class-transformer';
import { IsDateString, IsIn, IsNumber, IsOptional, IsString, Length, Max, MaxLength, Min } from 'class-validator';

export class CreateObservationDto {
  @IsOptional()
  @IsString()
  projectId?: string;

  @IsOptional()
  @IsDateString()
  observationDate?: string;

  @IsOptional()
  @IsIn(['SAFE', 'UNSAFE'])
  type?: string;

  @IsString()
  @Length(3, 1000)
  description!: string;
}

export class ListObservationQueryDto {
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
  type?: string;

  @IsOptional()
  @IsString()
  status?: string;
}

export class CreateIncidentDto {
  @IsOptional()
  @IsString()
  projectId?: string;

  @IsOptional()
  @IsDateString()
  incidentDate?: string;

  @IsOptional()
  @IsIn(['INJURY', 'NEAR_MISS', 'PROPERTY', 'ENVIRONMENT', 'OTHER'])
  type?: string;

  @IsOptional()
  @IsIn(['LOW', 'MEDIUM', 'HIGH', 'CRITICAL'])
  severity?: string;

  @IsString()
  @Length(3, 2000)
  description!: string;
}

export class ListIncidentQueryDto {
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
  severity?: string;

  @IsOptional()
  @IsString()
  status?: string;
}

export class InvestigateIncidentDto {
  @IsOptional()
  @IsString()
  @MaxLength(2000)
  rootCause?: string;
}

export class CreatePermitDto {
  @IsOptional()
  @IsString()
  projectId?: string;

  @IsString()
  @Length(2, 200)
  area!: string;

  @IsOptional()
  @IsString()
  @MaxLength(500)
  description?: string;

  @IsDateString()
  validFrom!: string;

  @IsDateString()
  validTo!: string;

  @IsString()
  @Length(2, 200)
  issuedTo!: string;
}

export class ListPermitQueryDto {
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

export class CreateCorrectiveActionDto {
  @IsIn(['OBSERVATION', 'INCIDENT'])
  sourceType!: string;

  @IsString()
  sourceId!: string;

  @IsString()
  @Length(3, 1000)
  action!: string;

  @IsString()
  @Length(2, 200)
  owner!: string;

  @IsDateString()
  dueDate!: string;
}

export class CloseCorrectiveActionDto {
  @IsOptional()
  @IsString()
  @MaxLength(1000)
  evidence?: string;
}
