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
