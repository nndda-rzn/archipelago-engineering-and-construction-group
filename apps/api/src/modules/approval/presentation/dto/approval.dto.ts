import { IsArray, IsIn, IsInt, IsNumber, IsOptional, IsString, ArrayMaxSize, ArrayMinSize, Length, MaxLength, Min, ValidateNested } from 'class-validator';
import { Type } from 'class-transformer';

export class WorkflowStepDto {
  @IsString()
  @Length(1, 100)
  name!: string;

  @IsString()
  @Length(2, 50)
  approverRoleCode!: string;

  @IsOptional()
  @IsString()
  conditionField?: string;

  @IsOptional()
  @IsIn(['>', '<', '>=', '<=', '=='])
  conditionOp?: string;

  @IsOptional()
  @IsNumber()
  conditionValue?: number;
}

/** Satu aturan di dalam grup syarat majemuk. */
export class WorkflowConditionDto {
  @IsString()
  @Length(1, 50)
  field!: string;

  @IsIn(['>', '<', '>=', '<=', '=='])
  op!: string;

  @IsNumber()
  value!: number;
}

/**
 * Grup syarat majemuk. Divalidasi lebih dalam lagi di service: setiap `field`
 * harus berasal dari `CONDITION_FIELDS` jenis transaksinya.
 */
export class ConditionGroupDto {
  @IsIn(['AND', 'OR'])
  combinator!: 'AND' | 'OR';

  @IsArray()
  @ArrayMinSize(1)
  @ArrayMaxSize(10)
  @ValidateNested({ each: true })
  @Type(() => WorkflowConditionDto)
  conditions!: WorkflowConditionDto[];
}

export class CreateWorkflowDefinitionDto {
  @IsString()
  @Length(2, 50)
  code!: string;

  @IsString()
  @Length(2, 100)
  name!: string;

  @IsOptional()
  @IsString()
  @MaxLength(500)
  description?: string;

  @IsString()
  @IsIn(['PurchaseRequisition', 'PurchaseOrder'])
  transactionType!: string;

  @IsIn(['DRAFT', 'ACTIVE'])
  status?: string;
}

export class AddWorkflowStepDto {
  @IsInt()
  @Min(1)
  stepOrder!: number;

  @IsString()
  @Length(1, 100)
  name!: string;

  @IsString()
  @Length(2, 50)
  approverRoleCode!: string;

  @IsOptional()
  @IsString()
  conditionField?: string;

  @IsOptional()
  @IsIn(['>', '<', '>=', '<=', '=='])
  conditionOp?: string;

  @IsOptional()
  @IsNumber()
  conditionValue?: number;

  @IsOptional()
  @ValidateNested()
  @Type(() => ConditionGroupDto)
  conditionGroup?: ConditionGroupDto | null;
}

export class PublishWorkflowDto {
  @IsString()
  @Length(2, 50)
  newVersionName!: string;

  @IsOptional()
  @IsString()
  description?: string;
}

export class UpdateWorkflowDefinitionDto {
  @IsOptional()
  @IsString()
  @Length(2, 100)
  name?: string;

  @IsOptional()
  @IsString()
  @MaxLength(500)
  description?: string | null;
}

/** Duplikasi definisi ke kode baru (selalu DRAFT, versi 1). */
export class DuplicateWorkflowDto {
  @IsString()
  @Length(2, 50)
  code!: string;

  @IsOptional()
  @IsString()
  @Length(2, 100)
  name?: string;
}

export class UpdateWorkflowStepDto {
  @IsOptional()
  @IsString()
  @Length(1, 100)
  name?: string;

  @IsOptional()
  @IsString()
  @Length(2, 50)
  approverRoleCode?: string;

  @IsOptional()
  @IsString()
  @MaxLength(50)
  conditionField?: string | null;

  @IsOptional()
  @IsIn(['>', '<', '>=', '<=', '=='])
  conditionOp?: string | null;

  @IsOptional()
  @IsNumber()
  conditionValue?: number | null;

  @IsOptional()
  @ValidateNested()
  @Type(() => ConditionGroupDto)
  conditionGroup?: ConditionGroupDto | null;
}

export class ReorderWorkflowStepsDto {
  @IsArray()
  @ArrayMinSize(1)
  @IsString({ each: true })
  stepIds!: string[];
}

export class SubmitForApprovalDto {
  @IsIn(['PurchaseRequisition', 'PurchaseOrder'])
  transactionType!: string;

  @IsString()
  transactionId!: string;

  @IsString()
  @Length(2, 50)
  approverRoleCode!: string;

  @IsOptional()
  @IsString()
  transactionCode?: string;
}

export class ApproveTaskDto {
  @IsString()
  taskId!: string;

  @IsIn(['APPROVE', 'REJECT'])
  decision!: string;

  @IsOptional()
  @IsString()
  @MaxLength(500)
  comment?: string;
}

export class BulkDecideDto {
  @IsArray()
  @ArrayMinSize(1)
  @ArrayMaxSize(100)
  @IsString({ each: true })
  taskIds!: string[];

  @IsIn(['APPROVE', 'REJECT'])
  decision!: string;

  @IsOptional()
  @IsString()
  @MaxLength(500)
  comment?: string;
}

export class ListApprovalQueryDto {
  @IsOptional()
  @IsIn(['PENDING', 'APPROVED', 'REJECTED', 'ALL'])
  status?: string;

  @IsOptional()
  @IsIn(['PurchaseRequisition', 'PurchaseOrder'])
  type?: string;

  @IsOptional()
  @IsString()
  @MaxLength(100)
  q?: string;

  @IsOptional()
  @IsIn(['true', 'false', '1', '0'])
  mine?: string;

  @IsOptional()
  @IsInt()
  @Min(1)
  page?: number;

  @IsOptional()
  @IsInt()
  @Min(1)
  pageSize?: number;
}
