import { Type } from 'class-transformer';
import { IsArray, IsNumber, IsOptional, IsString, Length, MaxLength, Min, ValidateNested } from 'class-validator';

export class JournalLineDto {
  @IsString() accountId!: string;
  @IsOptional() @IsString() @MaxLength(300) description?: string;
  @Type(() => Number) @IsNumber() @Min(0) debit!: number;
  @Type(() => Number) @IsNumber() @Min(0) credit!: number;
  @IsOptional() @IsString() projectId?: string;
  @IsOptional() @IsString() wbsItemId?: string;
}

export class CreateJournalDto {
  @IsString() legalEntityId!: string;
  @IsOptional() @IsString() date?: string;
  @IsString() @Length(1, 500) description!: string;
  @IsOptional() @IsString() @MaxLength(100) reference?: string;
  @IsArray() @ValidateNested({ each: true }) @Type(() => JournalLineDto) lines!: JournalLineDto[];
}

export class ListJournalQueryDto {
  @IsOptional() @Type(() => Number) @IsNumber() @Min(1) page?: number;
  @IsOptional() @Type(() => Number) @IsNumber() @Min(1) pageSize?: number;
  @IsOptional() @IsString() legalEntityId?: string;
  @IsOptional() @IsString() source?: string;
  @IsOptional() @IsString() status?: string;
}
