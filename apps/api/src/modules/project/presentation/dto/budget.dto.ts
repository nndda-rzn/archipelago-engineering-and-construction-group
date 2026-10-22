import { IsEnum, IsNumber, IsOptional, IsString } from 'class-validator';

export class UpsertBudgetItemDto {
  @IsString()
  wbsItemId!: string;

  /**
   * WAJIB. Sebelumnya `@IsOptional()`, dan service jatuh ke 'DIRECT' bila kosong —
   * sehingga setiap edit dari UI membuat baris kelima di samping 4 cost type yang
   * sudah ada. Klien (web) mengirim nilai ini sejak Task 1.
   */
  @IsEnum(['DIRECT', 'LABOR', 'MATERIAL', 'SUBCONTRACTOR', 'EQUIPMENT', 'INDIRECT', 'OVERHEAD'])
  costType!: string;

  @IsNumber()
  amount!: number;
}

export class PublishBudgetDto {
  @IsOptional()
  @IsString()
  note?: string;
}
