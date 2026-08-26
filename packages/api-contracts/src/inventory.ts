import { z } from 'zod';

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
  project: z.object({ code: z.string(), name: z.string() }).nullable().optional(),
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
  project: z.object({ code: z.string(), name: z.string() }).nullable().optional(),
  warehouse: z.object({ code: z.string(), name: z.string() }).nullable().optional(),
  po: z.object({ poNumber: z.string(), vendor: z.string() }).nullable().optional(),
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
  project: z.object({ code: z.string() }).nullable().optional(),
  wbsItem: z.object({ code: z.string(), name: z.string() }).nullable().optional(),
  warehouse: z.object({ code: z.string(), name: z.string() }).nullable().optional(),
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
  project: z.object({ code: z.string(), name: z.string() }).nullable().optional(),
  warehouse: z.object({ code: z.string(), name: z.string() }).nullable().optional(),
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
  project: z.object({ code: z.string(), name: z.string() }).nullable().optional(),
  fromWarehouse: z.object({ code: z.string(), name: z.string() }).nullable().optional(),
  toWarehouse: z.object({ code: z.string(), name: z.string() }).nullable().optional(),
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
  project: z.object({ code: z.string() }).nullable().optional(),
  warehouse: z.object({ code: z.string(), name: z.string() }).nullable().optional(),
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
  project: z.object({ code: z.string() }).nullable().optional(),
  warehouse: z.object({ code: z.string(), name: z.string() }).nullable().optional(),
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