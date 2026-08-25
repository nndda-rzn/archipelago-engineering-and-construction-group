import { Type } from 'class-transformer';
import { IsArray, IsInt, IsNumber, IsOptional, IsString, Length, Max, MaxLength, Min, ValidateNested } from 'class-validator';

export class RfqItemDto {
  @IsString()
  description!: string;

  @Type(() => Number)
  @IsNumber()
  @Min(0.01)
  quantity!: number;

  @IsOptional()
  @IsString()
  unit?: string;

  @IsOptional()
  @IsString()
  wbsItemId?: string;
}

export class CreateRfqDto {
  @IsString()
  projectId!: string;

  @IsOptional()
  @IsString()
  requisitionId?: string;

  @IsString()
  @Length(2, 200)
  title!: string;

  @IsOptional()
  @IsString()
  @MaxLength(500)
  description?: string;

  @IsOptional()
  @IsString()
  dueDate?: string;

  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => RfqItemDto)
  items!: RfqItemDto[];
}

export class QuoteItemDto {
  @IsString()
  rfqItemId!: string;

  @Type(() => Number)
  @IsNumber()
  @Min(0)
  unitPrice!: number;
}

export class CreateQuoteDto {
  @IsString()
  @Length(2, 200)
  vendor!: string;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  leadTimeDays?: number;

  @IsOptional()
  @IsString()
  @MaxLength(500)
  remark?: string;

  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => QuoteItemDto)
  items!: QuoteItemDto[];
}

export class ListRfqQueryDto {
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

export class CreatePrItemDto {
  @IsString()
  @Length(1, 200)
  description!: string;

  @Type(() => Number)
  @IsNumber()
  @Min(0.01)
  quantity!: number;

  @IsOptional()
  @IsString()
  unit?: string;

  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  @Min(0)
  estimatedUnitPrice?: number;
}

export class CreatePrDto {
  @IsString()
  projectId!: string;

  @IsOptional()
  @IsString()
  wbsItemId?: string;

  @IsString()
  @Length(2, 100)
  requestedBy!: string;

  @IsOptional()
  @IsString()
  @MaxLength(500)
  description?: string;

  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => CreatePrItemDto)
  items!: CreatePrItemDto[];
}

export class ListPrQueryDto {
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
  projectId?: string;

  @IsOptional()
  @IsString()
  status?: string;
}

export class CreatePoDto {
  @IsString()
  requisitionId!: string;

  @IsString()
  @Length(2, 200)
  vendor!: string;

  @IsOptional()
  @IsString()
  @Length(3, 3)
  currency?: string;
}

export class ListPoQueryDto {
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
  projectId?: string;

  @IsOptional()
  @IsString()
  status?: string;
}
