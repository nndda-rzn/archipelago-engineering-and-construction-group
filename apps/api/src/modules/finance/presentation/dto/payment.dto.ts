import { Type } from 'class-transformer';
import { ArrayUnique, IsArray, IsNumber, IsOptional, IsString, Length, MaxLength, Min, ValidateNested } from 'class-validator';

export class PaymentItemDto {
  @IsString() invoiceId!: string;
  @Type(() => Number) @IsNumber() @Min(0.01) amount!: number;
}

export class CreatePaymentDto {
  @IsString() projectId!: string;
  @IsString() @Length(2, 200) vendor!: string;
  @IsOptional() @IsString() @MaxLength(100) bankAccount?: string;
  @IsOptional() @IsString() @MaxLength(100) reference?: string;
  @IsOptional() @IsString() @MaxLength(500) remark?: string;
  // Satu invoice = satu baris. Penggabungan ganda tetap dijaga di service, tetapi menolak
  // duplikat di sini membuat API langsung memberi pesan yang jelas alih-alih "kelebihan bayar".
  @IsArray()
  @ArrayUnique((item: PaymentItemDto) => item.invoiceId, {
    message: 'Setiap invoice hanya boleh muncul satu kali; gabungkan nominalnya dalam satu baris',
  })
  @ValidateNested({ each: true })
  @Type(() => PaymentItemDto)
  items!: PaymentItemDto[];
}

export class ListPaymentQueryDto {
  @IsOptional() @Type(() => Number) @IsNumber() @Min(1) page?: number;
  @IsOptional() @Type(() => Number) @IsNumber() @Min(1) pageSize?: number;
  @IsOptional() @IsString() projectId?: string;
  @IsOptional() @IsString() status?: string;
}
