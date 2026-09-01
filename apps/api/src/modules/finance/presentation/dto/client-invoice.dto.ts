import { Type } from 'class-transformer';
import { IsNumber, IsOptional, IsString, MaxLength, Min } from 'class-validator';

export class CreateClientInvoiceDto {
  @IsString() claimId!: string;
  @IsOptional() @IsString() invoiceDate?: string;
  @Type(() => Number) @IsNumber() @Min(0) taxAmount?: number;
  @IsOptional() @IsString() @MaxLength(500) remark?: string;
}

export class ListClientInvoiceQueryDto {
  @IsOptional() @Type(() => Number) @IsNumber() @Min(1) page?: number;
  @IsOptional() @Type(() => Number) @IsNumber() @Min(1) pageSize?: number;
  @IsOptional() @IsString() projectId?: string;
  @IsOptional() @IsString() status?: string;
}
