import { IsIn, IsOptional, IsString, Length, MaxLength } from 'class-validator';

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
