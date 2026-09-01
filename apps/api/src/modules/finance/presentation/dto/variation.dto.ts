import { Type } from 'class-transformer';
import { IsIn, IsInt, IsNumber, IsOptional, IsString, Length, Max, MaxLength, Min } from 'class-validator';

export class CreateVariationDto {
  @IsString() projectId!: string;
  @IsString() @Length(3, 200) title!: string;
  @IsOptional() @IsString() @MaxLength(500) description?: string;
  @IsOptional() @IsIn(['ADDITIVE', 'DEDUCTIVE']) type?: string;
  @Type(() => Number) @IsNumber() @Min(0.01) amountChange!: number;
  @IsOptional() @Type(() => Number) @IsInt() @Min(-3650) @Max(3650) scheduleImpactDays?: number;
}

export class ListVariationQueryDto {
  @IsOptional() @Type(() => Number) @IsNumber() @Min(1) page?: number;
  @IsOptional() @Type(() => Number) @IsNumber() @Min(1) pageSize?: number;
  @IsOptional() @IsString() projectId?: string;
  @IsOptional() @IsString() status?: string;
}
