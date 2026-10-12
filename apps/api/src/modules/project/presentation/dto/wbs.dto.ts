import { Type } from 'class-transformer';
import { IsBoolean, IsInt, IsNumber, IsOptional, IsString, Length, Max, MaxLength, Min } from 'class-validator';

export class CreateWbsItemDto {
  @IsString()
  @Length(1, 30)
  code!: string;

  @IsString()
  @Length(1, 200)
  name!: string;

  @IsOptional()
  @IsString()
  @MaxLength(500)
  description?: string;

  @IsOptional()
  @IsString()
  parentId?: string;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(0)
  sortOrder?: number;

  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  @Min(0)
  @Max(100)
  progressPercent?: number;

  @IsOptional()
  @IsString()
  plannedStart?: string;

  @IsOptional()
  @IsString()
  plannedEnd?: string;

  @IsOptional()
  @IsString()
  @MaxLength(200)
  responsibleManager?: string;

  @IsOptional()
  @IsBoolean()
  isMilestone?: boolean;
}

export class UpdateWbsItemDto {
  @IsOptional()
  @IsString()
  @Length(1, 30)
  code?: string;

  @IsOptional()
  @IsString()
  @Length(1, 200)
  name?: string;

  @IsOptional()
  @IsString()
  @MaxLength(500)
  description?: string | null;

  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  @Min(0)
  @Max(100)
  progressPercent?: number;

  @IsOptional()
  @IsString()
  plannedStart?: string | null;

  @IsOptional()
  @IsString()
  plannedEnd?: string | null;

  @IsOptional()
  @IsString()
  @MaxLength(200)
  responsibleManager?: string | null;

  @IsOptional()
  @IsBoolean()
  isMilestone?: boolean;
}

export class MoveWbsItemDto {
  @IsOptional()
  @IsString()
  parentId?: string | null;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(0)
  sortOrder?: number;
}
