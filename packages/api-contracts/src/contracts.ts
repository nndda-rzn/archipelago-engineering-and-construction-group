import { z } from 'zod';
import type { Id } from '@aec/shared-types';

/**
 * Kontrak API standar — PRD §23.
 * Satu sumber type FE+BE (dipakai apps/web + apps/api + apps/worker).
 */

/** Standardized error envelope — PRD §23.4 */
export const apiErrorSchema = z.object({
  error: z.object({
    code: z.string(),
    message: z.string(),
    details: z.unknown().optional(),
    correlationId: z.string().optional(),
  }),
});
export type ApiError = z.infer<typeof apiErrorSchema>;

/** Standardized pagination — PRD §23.4 */
export const paginationParamsSchema = z.object({
  page: z.coerce.number().int().min(1).default(1),
  pageSize: z.coerce.number().int().min(1).max(200).default(50),
});
export type PaginationParams = z.infer<typeof paginationParamsSchema>;

export const paginatedResponseSchema = <T extends z.ZodType>(item: T) =>
  z.object({
    items: z.array(item),
    total: z.number(),
    page: z.number(),
    pageSize: z.number(),
    totalPages: z.number(),
  });
export type PaginatedResponse<T> = {
  items: T[];
  total: number;
  page: number;
  pageSize: number;
  totalPages: number;
};

/** Query param opsional untuk entity dengan id. */
export const byIdParamsSchema = z.object({
  id: z.string(),
});
export type ByIdParams = z.infer<typeof byIdParamsSchema>;

/** Placeholder health — digunakan apps/web & apps/api. */
export const healthResponseSchema = z.object({
  status: z.literal('ok'),
  version: z.string(),
  timestamp: z.string(),
});
export type HealthResponse = z.infer<typeof healthResponseSchema>;

/** Auth — local JWT (PRD §26 disesuaikan: Keycloak menyusul). */
export const loginRequestSchema = z.object({
  email: z.string().email(),
  password: z.string().min(8),
});
export type LoginRequest = z.infer<typeof loginRequestSchema>;

export const loginResponseSchema = z.object({
  accessToken: z.string(),
  user: z.object({
    id: z.string(),
    email: z.string(),
    username: z.string(),
    displayName: z.string(),
    roles: z.array(z.string()),
  }),
});
export type LoginResponse = z.infer<typeof loginResponseSchema>;

/** Legal entity — FR-FND-001. */
export const legalEntitySchema = z.object({
  id: z.string(),
  code: z.string(),
  legalName: z.string(),
  taxIdentifier: z.string(),
  country: z.string(),
  functionalCurrency: z.string(),
  reportingCurrency: z.string(),
  fiscalCalendar: z.string(),
  status: z.string(),
  createdAt: z.string(),
  updatedAt: z.string(),
});
export type LegalEntity = z.infer<typeof legalEntitySchema>;

export const createLegalEntitySchema = z.object({
  code: z.string().min(2).max(20),
  legalName: z.string().min(2).max(200),
  taxIdentifier: z.string().min(2).max(50),
  country: z.string().length(2),
  functionalCurrency: z.string().length(3).default('IDR'),
  reportingCurrency: z.string().length(3).default('IDR'),
});
export type CreateLegalEntity = z.infer<typeof createLegalEntitySchema>;

/** List legal entity (server pagination/sort — PRD §22, §23.4). */
export const legalEntityListParamsSchema = z.object({
  page: z.coerce.number().int().min(1).default(1),
  pageSize: z.coerce.number().int().min(1).max(200).default(50),
  sortBy: z.enum(['code', 'legalName', 'status', 'country', 'functionalCurrency']).optional(),
  sortDir: z.enum(['asc', 'desc']).optional(),
  search: z.string().max(100).optional(),
});
export type LegalEntityListParams = z.infer<typeof legalEntityListParamsSchema>;

export const legalEntityListResponseSchema = paginatedResponseSchema(legalEntitySchema);
export type LegalEntityListResponse = z.infer<typeof legalEntityListResponseSchema>;

/** User — FR-FND-003/004. */
export const userSchema = z.object({
  id: z.string(),
  username: z.string(),
  email: z.string(),
  displayName: z.string(),
  status: z.string(),
  lastLoginAt: z.string().nullable(),
  createdAt: z.string(),
  roles: z.array(z.string()),
});
export type User = z.infer<typeof userSchema>;

export const createUserSchema = z.object({
  username: z.string().min(3).max(50),
  email: z.string().email(),
  displayName: z.string().min(2).max(100),
  password: z.string().min(8).max(100),
  legalEntityId: z.string().optional(),
  roleCode: z.string().optional(),
});
export type CreateUser = z.infer<typeof createUserSchema>;

export const userListResponseSchema = paginatedResponseSchema(userSchema);
export type UserListResponse = z.infer<typeof userListResponseSchema>;

/** Role — FR-FND-004. */
export const roleSchema = z.object({
  id: z.string(),
  code: z.string(),
  name: z.string(),
  description: z.string().nullable(),
  status: z.string(),
});
export type Role = z.infer<typeof roleSchema>;

export const roleWithPermissionsSchema = roleSchema.extend({
  _count: z.object({ userRoles: z.number() }),
  permissions: z.array(
    z.object({
      permission: z.object({ code: z.string(), resource: z.string(), action: z.string() }),
    }),
  ),
});
export type RoleWithPermissions = z.infer<typeof roleWithPermissionsSchema>;

export const createRoleSchema = z.object({
  code: z.string().min(2).max(50),
  name: z.string().min(2).max(100),
  description: z.string().optional(),
});
export type CreateRole = z.infer<typeof createRoleSchema>;

export const assignPermissionsSchema = z.object({
  permissionCodes: z.array(z.string()),
});
export type AssignPermissions = z.infer<typeof assignPermissionsSchema>;

/** Audit log — FR-FND-008, PRD §28. */
export const auditLogSchema = z.object({
  id: z.string(),
  userId: z.string(),
  action: z.string(),
  resource: z.string(),
  resourceId: z.string().nullable(),
  oldValue: z.unknown().nullable(),
  newValue: z.unknown().nullable(),
  reason: z.string().nullable(),
  source: z.string(),
  correlationId: z.string().nullable(),
  createdAt: z.string(),
});
export type AuditLog = z.infer<typeof auditLogSchema>;

export const auditLogListResponseSchema = paginatedResponseSchema(auditLogSchema);
export type AuditLogListResponse = z.infer<typeof auditLogListResponseSchema>;

/** Project — FR-PRJ-001. */
export const projectSchema = z.object({
  id: z.string(),
  code: z.string(),
  name: z.string(),
  client: z.string(),
  legalEntityId: z.string(),
  businessUnit: z.string().nullable(),
  location: z.string().nullable(),
  currency: z.string(),
  contractValue: z.number().nullable(),
  startDate: z.string().nullable(),
  completionDate: z.string().nullable(),
  director: z.string().nullable(),
  manager: z.string().nullable(),
  status: z.string(),
  createdAt: z.string(),
  updatedAt: z.string(),
});
export type Project = z.infer<typeof projectSchema>;

export const projectListResponseSchema = paginatedResponseSchema(projectSchema);
export type ProjectListResponse = z.infer<typeof projectListResponseSchema>;

export const createProjectSchema = z.object({
  code: z.string().min(3).max(30),
  name: z.string().min(3).max(200),
  client: z.string().min(2).max(200),
  legalEntityId: z.string(),
  businessUnit: z.string().optional(),
  location: z.string().optional(),
  currency: z.string().length(3).optional(),
  contractValue: z.number().optional(),
  startDate: z.string().optional(),
  completionDate: z.string().optional(),
  director: z.string().optional(),
  manager: z.string().optional(),
});
export type CreateProject = z.infer<typeof createProjectSchema>;

/** Project health — actual cost vs budget (FR-PRJ-004). */
export const projectHealthSchema = z.object({
  projectId: z.string(),
  projectCode: z.string(),
  projectName: z.string(),
  client: z.string(),
  legalEntityCode: z.string(),
  contractValue: z.number(),
  totalBudget: z.number(),
  totalActual: z.number(),
  revenue: z.number(),
  variance: z.number(),
  utilization: z.number().nullable(),
  health: z.enum(['NO_BUDGET', 'ON_TRACK', 'AT_RISK', 'CRITICAL']),
  generatedAt: z.string(),
  wbs: z.array(
    z.object({
      id: z.string(),
      code: z.string(),
      name: z.string(),
      parentId: z.string().nullable(),
      budget: z.number(),
      actual: z.number(),
      variance: z.number(),
      utilization: z.number().nullable(),
    }),
  ),
});
export type ProjectHealth = z.infer<typeof projectHealthSchema>;

/** Portfolio dashboard — FR-EXE. */
export const portfolioSchema = z.object({
  generatedAt: z.string(),
  totals: z.object({
    projectCount: z.number(),
    totalContract: z.number(),
    totalBudget: z.number(),
    totalActual: z.number(),
    totalRevenue: z.number(),
    totalVariance: z.number(),
  }),
  healthCounts: z.object({
    NO_BUDGET: z.number(),
    ON_TRACK: z.number(),
    AT_RISK: z.number(),
    CRITICAL: z.number(),
  }),
  items: z.array(
    z.object({
      projectId: z.string(),
      projectCode: z.string(),
      projectName: z.string(),
      client: z.string(),
      status: z.string(),
      contractValue: z.number(),
      budget: z.number(),
      actual: z.number(),
      revenue: z.number(),
      variance: z.number(),
      utilization: z.number().nullable(),
      health: z.enum(['NO_BUDGET', 'ON_TRACK', 'AT_RISK', 'CRITICAL']),
    }),
  ),
});
export type Portfolio = z.infer<typeof portfolioSchema>;

/** Procurement — FR-PRO-001/007. */
export const prItemSchema = z.object({
  id: z.string(),
  description: z.string(),
  quantity: z.number(),
  unit: z.string(),
  estimatedUnitPrice: z.number().nullable(),
  estimatedTotal: z.number().nullable(),
});

export const purchaseRequisitionSchema = z.object({
  id: z.string(),
  prNumber: z.string(),
  projectId: z.string(),
  wbsItemId: z.string().nullable(),
  requestedBy: z.string(),
  status: z.string(),
  description: z.string().nullable(),
  createdAt: z.string(),
  items: z.array(prItemSchema),
  project: z.object({ code: z.string(), name: z.string() }).optional(),
});
export type PurchaseRequisition = z.infer<typeof purchaseRequisitionSchema>;

export const createPrSchema = z.object({
  projectId: z.string(),
  wbsItemId: z.string().optional(),
  requestedBy: z.string().min(2).max(100),
  description: z.string().max(500).optional(),
  items: z.array(
    z.object({
      description: z.string().min(1).max(200),
      quantity: z.number().min(0.01),
      unit: z.string().optional(),
      estimatedUnitPrice: z.number().min(0).optional(),
    }),
  ).min(1),
});
export type CreatePr = z.infer<typeof createPrSchema>;

export const purchaseOrderSchema = z.object({
  id: z.string(),
  poNumber: z.string(),
  projectId: z.string(),
  requisitionId: z.string().nullable(),
  vendor: z.string(),
  currency: z.string(),
  totalAmount: z.number(),
  status: z.string(),
  createdAt: z.string(),
  items: z.array(z.object({ id: z.string(), description: z.string(), quantity: z.number(), unit: z.string(), unitPrice: z.number(), totalPrice: z.number() })),
  project: z.object({ code: z.string(), name: z.string() }).optional(),
  requisition: z.object({ prNumber: z.string() }).optional(),
});
export type PurchaseOrder = z.infer<typeof purchaseOrderSchema>;

export const createPoSchema = z.object({
  requisitionId: z.string(),
  vendor: z.string().min(2).max(200),
  currency: z.string().length(3).optional(),
});
export type CreatePo = z.infer<typeof createPoSchema>;

export type { Id };

/** WBS — FR-PRJ-002. */
export const wbsItemSchema: z.ZodType<{
  id: string;
  code: string;
  name: string;
  description: string | null;
  sortOrder: number;
  children: WbsItem[];
}> = z.lazy(() =>
  z.object({
    id: z.string(),
    code: z.string(),
    name: z.string(),
    description: z.string().nullable(),
    sortOrder: z.number(),
    children: wbsItemSchema.array(),
  }),
);
export type WbsItem = z.infer<typeof wbsItemSchema>;

export const createWbsItemSchema = z.object({
  code: z.string().min(1).max(30),
  name: z.string().min(1).max(200),
  description: z.string().max(500).optional(),
  parentId: z.string().optional(),
});
export type CreateWbsItem = z.infer<typeof createWbsItemSchema>;

/** Budget — FR-PRJ-005/006. */
export const budgetSummarySchema = z.object({
  projectId: z.string(),
  status: z.enum(['DRAFT', 'PUBLISHED']),
  wbs: z.array(
    z.object({
      id: z.string(),
      code: z.string(),
      name: z.string(),
      parentId: z.string().nullable(),
      budget: z.number(),
      itemCount: z.number(),
    }),
  ),
  totalBudget: z.number(),
});
export type BudgetSummary = z.infer<typeof budgetSummarySchema>;

export const upsertBudgetSchema = z.object({
  wbsItemId: z.string(),
  costType: z.string().optional(),
  amount: z.number().min(0),
});
export type UpsertBudget = z.infer<typeof upsertBudgetSchema>;

/** Inventory — FR-INV-001/002, FR-PRO-009 (receipt leg). */
export const warehouseSchema = z.object({
  id: z.string(),
  code: z.string(),
  name: z.string(),
  warehouseType: z.string(),
  projectId: z.string().nullable(),
  location: z.string().nullable(),
  status: z.string(),
  createdAt: z.string(),
  updatedAt: z.string(),
  project: z.object({ code: z.string(), name: z.string() }).optional(),
});
export type Warehouse = z.infer<typeof warehouseSchema>;

export const createWarehouseSchema = z.object({
  code: z.string().min(2).max(30),
  name: z.string().min(2).max(200),
  warehouseType: z.string().optional(),
  projectId: z.string().optional(),
  location: z.string().max(200).optional(),
});
export type CreateWarehouse = z.infer<typeof createWarehouseSchema>;

export const goodsReceiptSchema = z.object({
  id: z.string(),
  grNumber: z.string(),
  poId: z.string(),
  projectId: z.string(),
  warehouseId: z.string(),
  receivedBy: z.string(),
  status: z.string(),
  remark: z.string().nullable(),
  createdAt: z.string(),
  items: z.array(
    z.object({
      id: z.string(),
      poItemId: z.string().nullable(),
      description: z.string(),
      quantity: z.number(),
      unit: z.string(),
      unitPrice: z.number().nullable(),
      wbsItemId: z.string().nullable(),
    }),
  ),
  project: z.object({ code: z.string(), name: z.string() }).optional(),
  warehouse: z.object({ code: z.string(), name: z.string() }).optional(),
  po: z.object({ poNumber: z.string(), vendor: z.string() }).optional(),
});
export type GoodsReceipt = z.infer<typeof goodsReceiptSchema>;

export const createGoodsReceiptSchema = z.object({
  poId: z.string(),
  warehouseId: z.string(),
  remark: z.string().max(500).optional(),
  items: z.array(
    z.object({
      poItemId: z.string(),
      quantity: z.number().min(0.01),
      wbsItemId: z.string().optional(),
    }),
  ).min(1),
});
export type CreateGoodsReceipt = z.infer<typeof createGoodsReceiptSchema>;

export const stockLedgerEntrySchema = z.object({
  id: z.string(),
  projectId: z.string(),
  wbsItemId: z.string().nullable(),
  warehouseId: z.string(),
  documentType: z.string(),
  documentId: z.string().nullable(),
  reference: z.string().nullable(),
  description: z.string().nullable(),
  movementType: z.string(),
  quantity: z.number(),
  unit: z.string(),
  unitPrice: z.number().nullable(),
  totalValue: z.number().nullable(),
  balanceAfter: z.number(),
  createdAt: z.string(),
  project: z.object({ code: z.string() }).optional(),
  wbsItem: z.object({ code: z.string(), name: z.string() }).optional(),
  warehouse: z.object({ code: z.string(), name: z.string() }).optional(),
});
export type StockLedgerEntry = z.infer<typeof stockLedgerEntrySchema>;

export const stockSummarySchema = z.object({
  projectId: z.string(),
  items: z.array(
    z.object({
      wbsItemId: z.string().nullable(),
      wbsItem: z.object({ code: z.string(), name: z.string() }).nullable(),
      warehouseId: z.string(),
      warehouse: z.object({ code: z.string(), name: z.string() }),
      quantity: z.number(),
      totalValue: z.number(),
    }),
  ),
});
export type StockSummary = z.infer<typeof stockSummarySchema>;

/** Material issue — FR-INV-004. */
export const materialIssueSchema = z.object({
  id: z.string(),
  issueNumber: z.string(),
  projectId: z.string(),
  warehouseId: z.string(),
  issuedTo: z.string(),
  issueReason: z.string(),
  status: z.string(),
  remark: z.string().nullable(),
  createdAt: z.string(),
  items: z.array(
    z.object({
      id: z.string(),
      description: z.string(),
      quantity: z.number(),
      unit: z.string(),
      unitPrice: z.number().nullable(),
      totalValue: z.number().nullable(),
      wbsItemId: z.string().nullable(),
    }),
  ),
  project: z.object({ code: z.string(), name: z.string() }).optional(),
  warehouse: z.object({ code: z.string(), name: z.string() }).optional(),
});
export type MaterialIssue = z.infer<typeof materialIssueSchema>;

export const createMaterialIssueSchema = z.object({
  projectId: z.string(),
  warehouseId: z.string(),
  issuedTo: z.string().min(2).max(100),
  issueReason: z.string().optional(),
  remark: z.string().max(500).optional(),
  items: z.array(
    z.object({
      description: z.string().min(1).max(200),
      quantity: z.number().min(0.01),
      unit: z.string().optional(),
      wbsItemId: z.string().optional(),
    }),
  ).min(1),
});
export type CreateMaterialIssue = z.infer<typeof createMaterialIssueSchema>;

/** Approval workflow — FR-FND-007 (MVP). */
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

/** Workflow definition & versioning — FR-FND-007. */
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

/** Stock transfer — FR-INV-005. */
export const stockTransferSchema = z.object({
  id: z.string(),
  transferNumber: z.string(),
  projectId: z.string(),
  fromWarehouseId: z.string(),
  toWarehouseId: z.string(),
  status: z.string(),
  remark: z.string().nullable(),
  createdAt: z.string(),
  items: z.array(
    z.object({
      id: z.string(),
      description: z.string(),
      quantity: z.number(),
      unit: z.string(),
      wbsItemId: z.string().nullable(),
    }),
  ),
  project: z.object({ code: z.string(), name: z.string() }).optional(),
  fromWarehouse: z.object({ code: z.string(), name: z.string() }).optional(),
  toWarehouse: z.object({ code: z.string(), name: z.string() }).optional(),
});
export type StockTransfer = z.infer<typeof stockTransferSchema>;

export const createStockTransferSchema = z.object({
  projectId: z.string(),
  fromWarehouseId: z.string(),
  toWarehouseId: z.string(),
  remark: z.string().max(500).optional(),
  items: z.array(
    z.object({
      description: z.string().min(1).max(200),
      quantity: z.number().min(0.01),
      unit: z.string().optional(),
      wbsItemId: z.string().optional(),
    }),
  ).min(1),
});
export type CreateStockTransfer = z.infer<typeof createStockTransferSchema>;

/** Stock adjustment — FR-INV-006 (wajib approval + reason code). */
export const stockAdjustmentSchema = z.object({
  id: z.string(),
  adjustmentNumber: z.string(),
  projectId: z.string(),
  warehouseId: z.string(),
  reasonCode: z.string(),
  reason: z.string().nullable(),
  status: z.string(),
  adjustedBy: z.string(),
  approvedBy: z.string().nullable(),
  approvedAt: z.string().nullable(),
  createdAt: z.string(),
  items: z.array(
    z.object({
      id: z.string(),
      description: z.string(),
      quantity: z.number(),
      unit: z.string(),
      wbsItemId: z.string().nullable(),
    }),
  ),
  project: z.object({ code: z.string() }).optional(),
  warehouse: z.object({ code: z.string(), name: z.string() }).optional(),
});
export type StockAdjustment = z.infer<typeof stockAdjustmentSchema>;

export const createStockAdjustmentSchema = z.object({
  projectId: z.string(),
  warehouseId: z.string(),
  reasonCode: z.string().min(2).max(30),
  reason: z.string().max(500).optional(),
  items: z.array(
    z.object({
      description: z.string().min(1).max(200),
      quantity: z.number(),
      unit: z.string().optional(),
      wbsItemId: z.string().optional(),
    }),
  ).min(1),
});
export type CreateStockAdjustment = z.infer<typeof createStockAdjustmentSchema>;

/** Stock opname — FR-INV-007 (count sheet + reconciliation). */
export const stockOpnameSchema = z.object({
  id: z.string(),
  opnameNumber: z.string(),
  projectId: z.string(),
  warehouseId: z.string(),
  status: z.string(),
  countedBy: z.string(),
  remark: z.string().nullable(),
  createdAt: z.string(),
  items: z.array(
    z.object({
      id: z.string(),
      description: z.string(),
      bookQuantity: z.number(),
      actualQuantity: z.number(),
      difference: z.number(),
      unit: z.string(),
      wbsItemId: z.string().nullable(),
    }),
  ),
  project: z.object({ code: z.string() }).optional(),
  warehouse: z.object({ code: z.string(), name: z.string() }).optional(),
});
export type StockOpname = z.infer<typeof stockOpnameSchema>;

export const createStockOpnameSchema = z.object({
  projectId: z.string(),
  warehouseId: z.string(),
  remark: z.string().max(500).optional(),
  items: z.array(
    z.object({
      description: z.string().min(1).max(200),
      bookQuantity: z.number().min(0),
      actualQuantity: z.number().min(0),
      unit: z.string().optional(),
      wbsItemId: z.string().optional(),
    }),
  ).min(1),
});
export type CreateStockOpname = z.infer<typeof createStockOpnameSchema>;

/** Vendor invoice — FR-PRO-009 (three-way match: PO + GR + Invoice). */
export const vendorInvoiceSchema = z.object({
  id: z.string(),
  invoiceNumber: z.string(),
  poId: z.string(),
  projectId: z.string(),
  vendor: z.string(),
  vendorInvoiceNo: z.string(),
  invoiceDate: z.string(),
  currency: z.string(),
  amount: z.number(),
  taxAmount: z.number().nullable(),
  totalAmount: z.number(),
  status: z.string(),
  matchedAt: z.string().nullable(),
  postedAt: z.string().nullable(),
  remark: z.string().nullable(),
  createdAt: z.string(),
  items: z.array(
    z.object({
      id: z.string(),
      poItemId: z.string().nullable(),
      description: z.string(),
      quantity: z.number(),
      unit: z.string(),
      unitPrice: z.number(),
      totalPrice: z.number(),
      receivedQuantity: z.number().nullable(),
      matchStatus: z.string(),
    }),
  ),
  project: z.object({ code: z.string(), name: z.string() }).optional(),
  po: z.object({ poNumber: z.string() }).optional(),
});
export type VendorInvoice = z.infer<typeof vendorInvoiceSchema>;

export const createVendorInvoiceSchema = z.object({
  poId: z.string(),
  vendorInvoiceNo: z.string().min(1).max(100),
  invoiceDate: z.string().optional(),
  taxAmount: z.number().min(0).optional(),
  remark: z.string().max(500).optional(),
  items: z.array(
    z.object({
      poItemId: z.string(),
      quantity: z.number().min(0.01),
      unitPrice: z.number().min(0),
    }),
  ).min(1),
});
export type CreateVendorInvoice = z.infer<typeof createVendorInvoiceSchema>;

/** Payment / AP — FR-FIN-005/007. */
export const paymentSchema = z.object({
  id: z.string(),
  paymentNumber: z.string(),
  projectId: z.string(),
  vendor: z.string(),
  bankAccount: z.string().nullable(),
  currency: z.string(),
  totalAmount: z.number(),
  status: z.string(),
  paymentDate: z.string(),
  reference: z.string().nullable(),
  remark: z.string().nullable(),
  createdAt: z.string(),
  items: z.array(
    z.object({
      id: z.string(),
      invoiceId: z.string(),
      amount: z.number(),
      invoice: z.object({ invoiceNumber: z.string(), totalAmount: z.number() }).optional(),
    }),
  ),
  project: z.object({ code: z.string(), name: z.string() }).optional(),
});
export type Payment = z.infer<typeof paymentSchema>;

export const createPaymentSchema = z.object({
  projectId: z.string(),
  vendor: z.string().min(2).max(200),
  bankAccount: z.string().max(100).optional(),
  reference: z.string().max(100).optional(),
  remark: z.string().max(500).optional(),
  items: z.array(
    z.object({
      invoiceId: z.string(),
      amount: z.number().min(0.01),
    }),
  ).min(1),
});
export type CreatePayment = z.infer<typeof createPaymentSchema>;

/** GL: Chart of Accounts — FR-FIN-002. */
export const chartOfAccountSchema = z.object({
  id: z.string(),
  legalEntityId: z.string(),
  code: z.string(),
  name: z.string(),
  accountType: z.string(),
  normalBalance: z.string(),
  parentId: z.string().nullable(),
  isActive: z.boolean(),
  description: z.string().nullable(),
  createdAt: z.string(),
  updatedAt: z.string(),
  parent: z.object({ code: z.string(), name: z.string() }).optional(),
});
export type ChartOfAccount = z.infer<typeof chartOfAccountSchema>;

export const createChartOfAccountSchema = z.object({
  legalEntityId: z.string(),
  code: z.string().min(1).max(30),
  name: z.string().min(1).max(200),
  accountType: z.string().optional(),
  normalBalance: z.string().optional(),
  parentId: z.string().optional(),
  description: z.string().max(300).optional(),
});
export type CreateChartOfAccount = z.infer<typeof createChartOfAccountSchema>;

/** GL: Journal + lines — FR-FIN-003/004. */
export const journalLineSchema = z.object({
  id: z.string(),
  accountId: z.string(),
  description: z.string().nullable(),
  debit: z.number(),
  credit: z.number(),
  projectId: z.string().nullable(),
  wbsItemId: z.string().nullable(),
  account: z.object({ code: z.string(), name: z.string() }).optional(),
});
export type JournalLine = z.infer<typeof journalLineSchema>;

export const journalSchema = z.object({
  id: z.string(),
  journalNumber: z.string(),
  legalEntityId: z.string(),
  date: z.string(),
  source: z.string(),
  sourceId: z.string().nullable(),
  reference: z.string().nullable(),
  description: z.string(),
  status: z.string(),
  postedAt: z.string().nullable(),
  postedBy: z.string().nullable(),
  createdAt: z.string(),
  lines: z.array(journalLineSchema),
  legalEntity: z.object({ code: z.string() }).optional(),
});
export type Journal = z.infer<typeof journalSchema>;

export const journalListResponseSchema = paginatedResponseSchema(journalSchema);
export type JournalListResponse = z.infer<typeof journalListResponseSchema>;

export const createJournalLineSchema = z.object({
  accountId: z.string(),
  description: z.string().max(300).optional(),
  debit: z.number().min(0),
  credit: z.number().min(0),
  projectId: z.string().optional(),
  wbsItemId: z.string().optional(),
});

export const createJournalSchema = z.object({
  legalEntityId: z.string(),
  date: z.string().optional(),
  description: z.string().min(1).max(500),
  reference: z.string().max(100).optional(),
  lines: z.array(createJournalLineSchema).min(1),
});
export type CreateJournal = z.infer<typeof createJournalSchema>;

/** GL: Trial balance — FR-FIN-001. */
export const trialBalanceSchema = z.object({
  legalEntityId: z.string(),
  legalEntityCode: z.string(),
  generatedAt: z.string(),
  from: z.string().nullable(),
  to: z.string().nullable(),
  totalDebit: z.number(),
  totalCredit: z.number(),
  balanced: z.boolean(),
  lines: z.array(
    z.object({
      accountId: z.string(),
      code: z.string(),
      name: z.string(),
      accountType: z.string(),
      normalBalance: z.string(),
      debit: z.number(),
      credit: z.number(),
      balance: z.number(),
    }),
  ),
});
export type TrialBalance = z.infer<typeof trialBalanceSchema>;

/** AR: Progress claim — FR-FIN-008. */
export const progressClaimSchema = z.object({
  id: z.string(),
  claimNumber: z.string(),
  projectId: z.string(),
  claimDate: z.string(),
  period: z.string().nullable(),
  description: z.string().nullable(),
  amount: z.number(),
  status: z.string(),
  certifiedAmount: z.number().nullable(),
  certifiedBy: z.string().nullable(),
  certifiedAt: z.string().nullable(),
  remark: z.string().nullable(),
  createdAt: z.string(),
  project: z.object({ code: z.string(), name: z.string() }).optional(),
});
export type ProgressClaim = z.infer<typeof progressClaimSchema>;

export const createProgressClaimSchema = z.object({
  projectId: z.string(),
  claimDate: z.string().optional(),
  period: z.string().max(30).optional(),
  description: z.string().max(500).optional(),
  amount: z.number().min(0.01),
});
export type CreateProgressClaim = z.infer<typeof createProgressClaimSchema>;

export const certifyClaimSchema = z.object({
  certifiedAmount: z.number().min(0),
  remark: z.string().max(500).optional(),
});
export type CertifyClaim = z.infer<typeof certifyClaimSchema>;

/** AR: Client invoice — FR-FIN-009. */
export const clientInvoiceSchema = z.object({
  id: z.string(),
  invoiceNumber: z.string(),
  projectId: z.string(),
  claimId: z.string(),
  client: z.string(),
  invoiceDate: z.string(),
  currency: z.string(),
  amount: z.number(),
  taxAmount: z.number().nullable(),
  totalAmount: z.number(),
  status: z.string(),
  postedAt: z.string().nullable(),
  postedBy: z.string().nullable(),
  remark: z.string().nullable(),
  createdAt: z.string(),
  project: z.object({ code: z.string(), name: z.string() }).optional(),
  claim: z.object({ claimNumber: z.string(), period: z.string().nullable() }).optional(),
});
export type ClientInvoice = z.infer<typeof clientInvoiceSchema>;

export const createClientInvoiceSchema = z.object({
  claimId: z.string(),
  invoiceDate: z.string().optional(),
  taxAmount: z.number().min(0).optional(),
  remark: z.string().max(500).optional(),
});
export type CreateClientInvoice = z.infer<typeof createClientInvoiceSchema>;

/** AR: Collection — FR-FIN-010. */
export const collectionSchema = z.object({
  id: z.string(),
  collectionNumber: z.string(),
  projectId: z.string(),
  client: z.string(),
  bankAccount: z.string().nullable(),
  reference: z.string().nullable(),
  currency: z.string(),
  totalAmount: z.number(),
  status: z.string(),
  collectedAt: z.string(),
  collectedBy: z.string().nullable(),
  remark: z.string().nullable(),
  createdAt: z.string(),
  items: z.array(
    z.object({
      id: z.string(),
      clientInvoiceId: z.string(),
      amount: z.number(),
      clientInvoice: z.object({ invoiceNumber: z.string(), totalAmount: z.number() }).optional(),
    }),
  ),
  project: z.object({ code: z.string(), name: z.string() }).optional(),
});
export type Collection = z.infer<typeof collectionSchema>;

export const createCollectionSchema = z.object({
  projectId: z.string(),
  client: z.string().min(2).max(200),
  bankAccount: z.string().max(100).optional(),
  reference: z.string().max(100).optional(),
  remark: z.string().max(500).optional(),
  items: z.array(
    z.object({
      clientInvoiceId: z.string(),
      amount: z.number().min(0.01),
    }),
  ).min(1),
});
export type CreateCollection = z.infer<typeof createCollectionSchema>;
