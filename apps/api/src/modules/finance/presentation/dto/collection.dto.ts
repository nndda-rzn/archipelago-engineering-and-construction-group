import { Type } from 'class-transformer';
import { ArrayUnique, IsArray, IsNumber, IsOptional, IsString, Length, MaxLength, Min, ValidateNested } from 'class-validator';

export class CollectionItemDto {
  @IsString() clientInvoiceId!: string;
  @Type(() => Number) @IsNumber() @Min(0.01) amount!: number;
}

export class CreateCollectionDto {
  @IsString() projectId!: string;
  @IsString() @Length(2, 200) client!: string;
  @IsOptional() @IsString() @MaxLength(100) bankAccount?: string;
  @IsOptional() @IsString() @MaxLength(100) reference?: string;
  @IsOptional() @IsString() @MaxLength(500) remark?: string;
  // Satu client invoice = satu baris. Penggabungan ganda tetap dijaga di service, tetapi menolak
  // duplikat di sini membuat API langsung memberi pesan yang jelas alih-alih "kelebihan terima".
  @IsArray()
  @ArrayUnique((item: CollectionItemDto) => item.clientInvoiceId, {
    message: 'Setiap client invoice hanya boleh muncul satu kali; gabungkan nominalnya dalam satu baris',
  })
  @ValidateNested({ each: true })
  @Type(() => CollectionItemDto)
  items!: CollectionItemDto[];
}

export class ListCollectionQueryDto {
  @IsOptional() @Type(() => Number) @IsNumber() @Min(1) page?: number;
  @IsOptional() @Type(() => Number) @IsNumber() @Min(1) pageSize?: number;
  @IsOptional() @IsString() projectId?: string;
  @IsOptional() @IsString() status?: string;
}
