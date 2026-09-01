import { Type } from 'class-transformer';
import { IsDateString, IsNumber, IsOptional, IsString, Length, Max, MaxLength, Min } from 'class-validator';

export class CreateSubcontractDto {
  @IsString() projectId!: string;
  @IsString() @Length(2, 200) vendor!: string;
  @IsString() @Length(3, 200) title!: string;
  @IsOptional() @IsString() @MaxLength(500) description?: string;
  @Type(() => Number) @IsNumber() @Min(0.01) contractValue!: number;
  @IsOptional() @IsString() @Length(3, 3) currency?: string;
  @IsOptional() @IsDateString() startDate?: string;
  @IsOptional() @IsDateString() endDate?: string;
}

export class ListSubcontractQueryDto {
  @IsOptional() @Type(() => Number) @IsNumber() @Min(1) page?: number;
  @IsOptional() @Type(() => Number) @IsNumber() @Min(1) pageSize?: number;
  @IsOptional() @IsString() projectId?: string;
  @IsOptional() @IsString() status?: string;
}

export class CreateSubcontractProgressDto {
  @IsOptional() @IsString() subcontractId?: string;
  @IsOptional() @IsString() @MaxLength(30) period?: string;
  @IsOptional() @IsDateString() progressDate?: string;
  @Type(() => Number) @IsNumber() @Min(0.01) @Max(100) progressPercent!: number;
  @IsOptional() @IsString() @MaxLength(500) remark?: string;
}

export class ListSubcontractProgressQueryDto {
  @IsOptional() @Type(() => Number) @IsNumber() @Min(1) page?: number;
  @IsOptional() @Type(() => Number) @IsNumber() @Min(1) pageSize?: number;
  @IsOptional() @IsString() status?: string;
}
