import { Type } from 'class-transformer';
import { IsDateString, IsIn, IsInt, IsNumber, IsOptional, IsString, Length, Max, MaxLength, Min } from 'class-validator';

export class CreateDeliverableDto {
  @IsOptional()
  @IsString()
  projectId?: string;

  @IsString()
  @Length(3, 200)
  title!: string;

  @IsOptional()
  @IsIn(['CIVIL', 'STRUCTURAL', 'PIPING', 'ELECTRICAL', 'INSTRUMENT', 'MECHANICAL', 'OTHER'])
  discipline?: string;

  @IsString()
  @Length(2, 200)
  engineer!: string;

  @IsOptional()
  @IsDateString()
  plannedDate?: string;

  @IsOptional()
  @IsDateString()
  forecastDate?: string;
}

export class UpdateDeliverableStatusDto {
  @IsIn(['NOT_STARTED', 'IN_PROGRESS', 'SUBMITTED', 'APPROVED', 'ISSUED'])
  status!: string;

  @IsOptional()
  @IsDateString()
  forecastDate?: string;
}

export class ListDeliverableQueryDto {
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
  discipline?: string;

  @IsOptional()
  @IsString()
  status?: string;
}

export class CreateDrawingDto {
  @IsOptional()
  @IsString()
  projectId?: string;

  @IsString()
  @Length(3, 200)
  title!: string;

  @IsOptional()
  @IsString()
  discipline?: string;
}

export class PublishDrawingDto {
  @IsOptional()
  @IsString()
  @Length(1, 10)
  revision?: string;

  @IsOptional()
  @IsString()
  @MaxLength(500)
  description?: string;

  @IsOptional()
  isIFC?: boolean;
}

export class ListDrawingQueryDto {
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
}

export class CreateRfiDto {
  @IsOptional()
  @IsString()
  projectId?: string;

  @IsString()
  @Length(3, 200)
  title!: string;

  @IsString()
  @Length(5, 2000)
  question!: string;
}

export class AnswerRfiDto {
  @IsString()
  @Length(3, 2000)
  answer!: string;

  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  @Min(0)
  impactCost?: number;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(-3650)
  @Max(3650)
  impactScheduleDays?: number;
}

export class ListRfiQueryDto {
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

export class CreateSubmittalDto {
  @IsOptional()
  @IsString()
  projectId?: string;

  @IsString()
  @Length(3, 200)
  title!: string;

  @IsOptional()
  @IsDateString()
  dueDate?: string;
}

export class ReviewSubmittalDto {
  @IsIn(['SUBMITTED', 'UNDER_REVIEW', 'APPROVED', 'REJECTED'])
  status!: string;

  @IsOptional()
  @IsString()
  @MaxLength(1000)
  responseNote?: string;
}

export class ListSubmittalQueryDto {
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

export class CreateTransmittalDto {
  @IsOptional()
  @IsString()
  projectId?: string;

  @IsString()
  @Length(2, 200)
  recipient!: string;

  @IsString()
  @Length(3, 200)
  subject!: string;

  @IsOptional()
  @IsString()
  @MaxLength(2000)
  documentList?: string;
}

export class ListTransmittalQueryDto {
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
}
