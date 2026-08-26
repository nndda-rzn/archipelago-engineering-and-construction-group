import { Type } from 'class-transformer';
import { IsEnum, IsInt, IsNumber, IsOptional, IsString, Length, Max, MaxLength, Min } from 'class-validator';

export class TechnicalReviewDto {
  @IsEnum(['PASS', 'REJECT'])
  technicalStatus!: string;

  @IsOptional()
  @IsString()
  @MaxLength(1000)
  technicalNote?: string;
}

export class CreatePoChangeDto {
  @Type(() => Number)
  @IsNumber()
  newTotal!: number;

  @IsString()
  @MaxLength(1000)
  reason!: string;
}

export class CreateVendorRatingDto {
  @IsString()
  vendorId!: string;

  @IsOptional()
  @IsString()
  projectId?: string;

  @IsEnum(['DELIVERY', 'QUALITY', 'COMMERCIAL', 'HSE', 'RESPONSIVENESS'])
  category!: string;

  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(5)
  score!: number;

  @IsOptional()
  @IsString()
  @MaxLength(1000)
  remark?: string;
}

export class ListRatingQueryDto {
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
  category?: string;
}
