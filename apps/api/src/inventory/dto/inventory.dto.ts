import { Type } from 'class-transformer';
import { IsArray, IsInt, IsNumber, IsOptional, IsString, Length, Max, MaxLength, Min, ValidateNested } from 'class-validator';

export class CreateWarehouseDto {
  @IsString()
  @Length(2, 30)
  code!: string;

  @IsString()
  @Length(2, 200)
  name!: string;

  @IsOptional()
  @IsString()
  warehouseType?: string;

  @IsOptional()
  @IsString()
  projectId?: string;

  @IsOptional()
  @IsString()
  @MaxLength(200)
  location?: string;
}

export class ListWarehouseQueryDto {
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
}

export class GoodsReceiptItemDto {
  @IsString()
  poItemId!: string;

  @Type(() => Number)
  @IsNumber()
  @Min(0.01)
  quantity!: number;

  @IsOptional()
  @IsString()
  wbsItemId?: string;
}

export class CreateGoodsReceiptDto {
  @IsString()
  poId!: string;

  @IsString()
  warehouseId!: string;

  @IsOptional()
  @IsString()
  @MaxLength(500)
  remark?: string;

  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => GoodsReceiptItemDto)
  items!: GoodsReceiptItemDto[];
}

export class ListGoodsReceiptQueryDto {
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
  poId?: string;

  @IsOptional()
  @IsString()
  projectId?: string;
}

export class MaterialIssueItemDto {
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
  @IsString()
  wbsItemId?: string;
}

export class CreateMaterialIssueDto {
  @IsString()
  projectId!: string;

  @IsString()
  warehouseId!: string;

  @IsString()
  @Length(2, 100)
  issuedTo!: string;

  @IsOptional()
  @IsString()
  issueReason?: string;

  @IsOptional()
  @IsString()
  @MaxLength(500)
  remark?: string;

  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => MaterialIssueItemDto)
  items!: MaterialIssueItemDto[];
}

export class ListMaterialIssueQueryDto {
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
  warehouseId?: string;
}

export class StockAdjustmentItemDto {
  @IsString()
  @Length(1, 200)
  description!: string;

  @Type(() => Number)
  @IsNumber()
  quantity!: number; // delta: + surplus, - loss

  @IsOptional()
  @IsString()
  unit?: string;

  @IsOptional()
  @IsString()
  wbsItemId?: string;
}

export class CreateStockAdjustmentDto {
  @IsString()
  projectId!: string;

  @IsString()
  warehouseId!: string;

  @IsString()
  @Length(2, 30)
  reasonCode!: string; // DAMAGE | LOSS | SURPLUS | REVALUATION | OTHERS

  @IsOptional()
  @IsString()
  @MaxLength(500)
  reason?: string;

  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => StockAdjustmentItemDto)
  items!: StockAdjustmentItemDto[];
}

export class StockOpnameItemDto {
  @IsString()
  @Length(1, 200)
  description!: string;

  @Type(() => Number)
  @IsNumber()
  @Min(0)
  bookQuantity!: number;

  @Type(() => Number)
  @IsNumber()
  @Min(0)
  actualQuantity!: number;

  @IsOptional()
  @IsString()
  unit?: string;

  @IsOptional()
  @IsString()
  wbsItemId?: string;
}

export class CreateStockOpnameDto {
  @IsString()
  projectId!: string;

  @IsString()
  warehouseId!: string;

  @IsOptional()
  @IsString()
  @MaxLength(500)
  remark?: string;

  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => StockOpnameItemDto)
  items!: StockOpnameItemDto[];
}

export class StockTransferItemDto {
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
  @IsString()
  wbsItemId?: string;
}

export class CreateStockTransferDto {
  @IsString()
  projectId!: string;

  @IsString()
  fromWarehouseId!: string;

  @IsString()
  toWarehouseId!: string;

  @IsOptional()
  @IsString()
  @MaxLength(500)
  remark?: string;

  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => StockTransferItemDto)
  items!: StockTransferItemDto[];
}

export class ListStockTransferQueryDto {
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

export class ListStockLedgerQueryDto {
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
  wbsItemId?: string;

  @IsOptional()
  @IsString()
  warehouseId?: string;
}
