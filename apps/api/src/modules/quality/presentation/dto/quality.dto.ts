import { Type } from 'class-transformer';
import { IsBoolean, IsDateString, IsIn, IsNumber, IsOptional, IsString, Length, Max, MaxLength, Min } from 'class-validator';

export class CreateItpDto {
  @IsOptional()
  @IsString()
  projectId?: string;

  @IsOptional()
  @IsString()
  workPackageId?: string;

  @IsString()
  @Length(3, 200)
  title!: string;

  @IsOptional()
  @IsString()
  @MaxLength(500)
  description?: string;
}

export class ListItpQueryDto {
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

export class CreateInspectionDto {
  @IsOptional()
  @IsString()
  projectId?: string;

  @IsOptional()
  @IsString()
  workPackageId?: string;

  @IsOptional()
  @IsString()
  itpId?: string;

  @IsString()
  @Length(3, 1000)
  description!: string;
}

export class InspectDto {
  @IsIn(['PASS', 'FAIL'])
  result!: string;
}

export class ListInspectionQueryDto {
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

  @IsOptional()
  @IsString()
  result?: string;
}

export class CreateNcrDto {
  @IsOptional()
  @IsString()
  projectId?: string;

  @IsOptional()
  @IsString()
  workPackageId?: string;

  @IsOptional()
  @IsIn(['MATERIAL', 'WORKMANSHIP', 'DESIGN', 'DOCUMENT', 'OTHER'])
  category?: string;

  @IsOptional()
  @IsIn(['MINOR', 'MAJOR', 'CRITICAL'])
  severity?: string;

  @IsString()
  @Length(3, 2000)
  description!: string;

  @IsOptional()
  @IsBoolean()
  reinspectionRequired?: boolean;
}

export class DisposeNcrDto {
  @IsOptional()
  @IsString()
  @MaxLength(2000)
  rootCause?: string;

  @IsOptional()
  @IsString()
  @MaxLength(2000)
  correctiveAction?: string;
}

export class ReinspectNcrDto {
  @IsIn(['PASS', 'FAIL'])
  result!: string;
}

export class ListNcrQueryDto {
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

export class CreatePunchItemDto {
  @IsOptional()
  @IsString()
  projectId?: string;

  @IsOptional()
  @IsString()
  workPackageId?: string;

  @IsOptional()
  @IsString()
  handoverPackageId?: string;

  @IsString()
  @Length(3, 1000)
  description!: string;
}

export class ClosePunchItemDto {}

export class ListPunchItemQueryDto {
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
