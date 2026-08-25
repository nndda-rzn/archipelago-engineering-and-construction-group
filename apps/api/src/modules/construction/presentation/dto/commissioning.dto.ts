import { IsEnum, IsInt, IsOptional, IsString, Length, Max, MaxLength, Min } from 'class-validator';
import { Type } from 'class-transformer';

export class CreateCommissioningDto {
  @IsString()
  projectId!: string;

  @IsOptional()
  @IsString()
  parentId?: string;

  @IsString()
  @Length(1, 30)
  code!: string;

  @IsString()
  @Length(2, 200)
  name!: string;

  @IsEnum(['PLANT', 'SYSTEM', 'SUBSYSTEM', 'EQUIPMENT'])
  level!: 'PLANT' | 'SYSTEM' | 'SUBSYSTEM' | 'EQUIPMENT';

  @IsOptional()
  @IsString()
  @MaxLength(500)
  remark?: string;
}

export class UpdateCommissioningStatusDto {
  @IsEnum(['NOT_STARTED', 'IN_PROGRESS', 'COMPLETED'])
  status!: 'NOT_STARTED' | 'IN_PROGRESS' | 'COMPLETED';
}

export class CreateHandoverDto {
  @IsString()
  projectId!: string;

  @IsString()
  @Length(3, 200)
  title!: string;

  @IsOptional()
  @IsString()
  handoverDate?: string;

  @IsOptional()
  @IsString()
  @MaxLength(1000)
  checklist?: string;

  @IsOptional()
  @IsString()
  @MaxLength(1000)
  note?: string;

  @IsOptional()
  items?: { documentName: string; isMandatory?: boolean }[];
}

export class ListHandoverQueryDto {
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
