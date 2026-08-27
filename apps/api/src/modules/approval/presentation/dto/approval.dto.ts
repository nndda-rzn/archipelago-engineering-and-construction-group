import { IsIn, IsInt, IsNumber, IsOptional, IsString, Length, MaxLength, Min } from 'class-validator';

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
}

export class PublishWorkflowDto {
  @IsString()
  @Length(2, 50)
  newVersionName!: string;

  @IsOptional()
  @IsString()
  description?: string;
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
