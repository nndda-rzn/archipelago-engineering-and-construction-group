import { z } from 'zod';

export const approvalTaskSchema = z.object({
  id: z.string(),
  transactionType: z.string(),
  transactionId: z.string(),
  transactionCode: z.string().nullable(),
  stepName: z.string(),
  status: z.enum(['PENDING', 'APPROVED', 'REJECTED', 'CANCELLED']),
  requesterId: z.string(),
  approverId: z.string().nullable(),
  approverRoleCode: z.string(),
  comment: z.string().nullable(),
  decidedAt: z.string().nullable(),
  createdAt: z.string(),
  canApprove: z.boolean().optional(),
});
export type ApprovalTask = z.infer<typeof approvalTaskSchema>;

export const submitForApprovalSchema = z.object({
  transactionType: z.enum(['PurchaseRequisition', 'PurchaseOrder']),
  transactionId: z.string(),
  approverRoleCode: z.string().min(2).max(50),
  transactionCode: z.string().optional(),
});
export type SubmitForApproval = z.infer<typeof submitForApprovalSchema>;

export const approveTaskSchema = z.object({
  taskId: z.string(),
  decision: z.enum(['APPROVE', 'REJECT']),
  comment: z.string().max(500).optional(),
});
export type ApproveTask = z.infer<typeof approveTaskSchema>;

export const workflowStepSchema = z.object({
  id: z.string(),
  definitionId: z.string(),
  stepOrder: z.number(),
  name: z.string(),
  approverRoleCode: z.string(),
  conditionField: z.string().nullable(),
  conditionOp: z.string().nullable(),
  conditionValue: z.number().nullable(),
});
export type WorkflowStep = z.infer<typeof workflowStepSchema>;

export const workflowDefinitionSchema = z.object({
  id: z.string(),
  code: z.string(),
  name: z.string(),
  description: z.string().nullable(),
  version: z.number(),
  status: z.string(),
  transactionType: z.string(),
  createdBy: z.string(),
  createdAt: z.string(),
  steps: z.array(workflowStepSchema),
});
export type WorkflowDefinition = z.infer<typeof workflowDefinitionSchema>;

export const createWorkflowDefinitionSchema = z.object({
  code: z.string().min(2).max(50),
  name: z.string().min(2).max(100),
  description: z.string().max(500).optional(),
  transactionType: z.enum(['PurchaseRequisition', 'PurchaseOrder']),
  status: z.enum(['DRAFT', 'ACTIVE']).optional(),
});
export type CreateWorkflowDefinition = z.infer<typeof createWorkflowDefinitionSchema>;

export const addWorkflowStepSchema = z.object({
  stepOrder: z.number().int().min(1),
  name: z.string().min(1).max(100),
  approverRoleCode: z.string().min(2).max(50),
  conditionField: z.string().optional(),
  conditionOp: z.enum(['>', '<', '>=', '<=', '==']).optional(),
  conditionValue: z.number().optional(),
});
export type AddWorkflowStep = z.infer<typeof addWorkflowStepSchema>;

export const publishWorkflowSchema = z.object({
  newVersionName: z.string().min(2).max(100),
  description: z.string().max(500).optional(),
});
export type PublishWorkflow = z.infer<typeof publishWorkflowSchema>;

export const pendingApprovalCountSchema = z.object({ count: z.number() });
export type PendingApprovalCount = z.infer<typeof pendingApprovalCountSchema>;