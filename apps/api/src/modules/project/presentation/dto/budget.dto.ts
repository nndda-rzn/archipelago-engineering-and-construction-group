import { IsEnum, IsNumber, IsOptional, IsString } from 'class-validator';

export class UpsertBudgetItemDto {
  @IsString()
  wbsItemId!: string;

  @IsOptional()
  @IsEnum(['DIRECT', 'LABOR', 'MATERIAL', 'SUBCONTRACTOR', 'EQUIPMENT', 'INDIRECT', 'OVERHEAD'])
  costType?: string;

  @IsNumber()
  amount!: number;
}

export class PublishBudgetDto {
  @IsOptional()
  @IsString()
  note?: string;
}
