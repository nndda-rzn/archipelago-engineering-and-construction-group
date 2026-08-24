import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import {
  createGoodsReceiptSchema,
  createMaterialIssueSchema,
  createStockAdjustmentSchema,
  createStockOpnameSchema,
  createWarehouseSchema,
  goodsReceiptSchema,
  materialIssueSchema,
  stockAdjustmentSchema,
  stockLedgerEntrySchema,
  stockOpnameSchema,
  stockSummarySchema,
  warehouseSchema,
  type CreateGoodsReceipt,
  type CreateMaterialIssue,
  type CreateStockAdjustment,
  type CreateStockOpname,
  type CreateWarehouse,
  type GoodsReceipt,
  type MaterialIssue,
  type StockAdjustment,
  type StockLedgerEntry,
  type StockOpname,
  type StockSummary,
  type Warehouse,
} from '@aec/api-contracts';
import { getJson, postJson } from '@/shared/lib/http';

export const warehouseKeys = { all: ['warehouses'] as const, list: (params: object) => [...warehouseKeys.all, 'list', params] as const };
export const grKeys = { all: ['goods-receipts'] as const, list: (params: object) => [...grKeys.all, 'list', params] as const };
export const ledgerKeys = { all: ['stock-ledger'] as const, list: (params: object) => [...ledgerKeys.all, 'list', params] as const };
export const miKeys = { all: ['material-issues'] as const, list: (params: object) => [...miKeys.all, 'list', params] as const };
export const adjKeys = { all: ['stock-adjustments'] as const, list: (params: object) => [...adjKeys.all, 'list', params] as const };
export const opnKeys = { all: ['stock-opnames'] as const, list: (params: object) => [...opnKeys.all, 'list', params] as const };

export function useWarehouses(params: { page: number; pageSize: number }) {
  return useQuery({
    queryKey: warehouseKeys.list(params),
    queryFn: async () => {
      const qs = new URLSearchParams({ page: String(params.page), pageSize: String(params.pageSize) });
      const data = await getJson<{ items: unknown; total: number }>(`/warehouses?${qs}`);
      return { items: warehouseSchema.array().parse(data.items), total: data.total };
    },
  });
}

export function useCreateWarehouse() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (input: CreateWarehouse) => postJson<unknown>('/warehouses', input),
    onSuccess: () => qc.invalidateQueries({ queryKey: warehouseKeys.all }),
  });
}

export function useGoodsReceipts(params: { page: number; pageSize: number }) {
  return useQuery({
    queryKey: grKeys.list(params),
    queryFn: async () => {
      const qs = new URLSearchParams({ page: String(params.page), pageSize: String(params.pageSize) });
      const data = await getJson<{ items: unknown; total: number }>(`/goods-receipts?${qs}`);
      return { items: goodsReceiptSchema.array().parse(data.items), total: data.total };
    },
  });
}

export function useCreateGoodsReceipt() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (input: CreateGoodsReceipt) => postJson<unknown>('/goods-receipts', input),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: grKeys.all });
      qc.invalidateQueries({ queryKey: ledgerKeys.all });
    },
  });
}

export function useStockLedger(params: { page: number; pageSize: number }) {
  return useQuery({
    queryKey: ledgerKeys.list(params),
    queryFn: async () => {
      const qs = new URLSearchParams({ page: String(params.page), pageSize: String(params.pageSize) });
      const data = await getJson<{ items: unknown; total: number }>(`/stock-ledger?${qs}`);
      return { items: stockLedgerEntrySchema.array().parse(data.items), total: data.total };
    },
  });
}

export function useStockSummary(projectId: string | null) {
  return useQuery({
    queryKey: ['stock-summary', projectId],
    queryFn: async () => stockSummarySchema.parse(await getJson<StockSummary>(`/projects/${projectId}/stock-summary`)),
    enabled: !!projectId,
  });
}

export function useMaterialIssues(params: { page: number; pageSize: number }) {
  return useQuery({
    queryKey: miKeys.list(params),
    queryFn: async () => {
      const qs = new URLSearchParams({ page: String(params.page), pageSize: String(params.pageSize) });
      const data = await getJson<{ items: unknown; total: number }>(`/material-issues?${qs}`);
      return { items: materialIssueSchema.array().parse(data.items), total: data.total };
    },
  });
}

export function useCreateMaterialIssue() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (input: CreateMaterialIssue) => {
      const parsed = createMaterialIssueSchema.parse(input);
      return postJson<unknown>('/material-issues', parsed);
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: miKeys.all });
      qc.invalidateQueries({ queryKey: ledgerKeys.all });
    },
  });
}

export function useStockAdjustments(params: { page: number; pageSize: number }) {
  return useQuery({
    queryKey: adjKeys.list(params),
    queryFn: async () => {
      const qs = new URLSearchParams({ page: String(params.page), pageSize: String(params.pageSize) });
      const data = await getJson<{ items: unknown; total: number }>(`/stock-adjustments?${qs}`);
      return { items: stockAdjustmentSchema.array().parse(data.items), total: data.total };
    },
  });
}

export function useCreateStockAdjustment() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (input: CreateStockAdjustment) => {
      const parsed = createStockAdjustmentSchema.parse(input);
      return postJson<unknown>('/stock-adjustments', parsed);
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: adjKeys.all }),
  });
}

export function useApproveStockAdjustment() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => postJson<unknown>(`/stock-adjustments/${id}/approve`, {}),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: adjKeys.all });
      qc.invalidateQueries({ queryKey: ledgerKeys.all });
    },
  });
}

export function useStockOpnames(params: { page: number; pageSize: number }) {
  return useQuery({
    queryKey: opnKeys.list(params),
    queryFn: async () => {
      const qs = new URLSearchParams({ page: String(params.page), pageSize: String(params.pageSize) });
      const data = await getJson<{ items: unknown; total: number }>(`/stock-opnames?${qs}`);
      return { items: stockOpnameSchema.array().parse(data.items), total: data.total };
    },
  });
}

export function useCreateStockOpname() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (input: CreateStockOpname) => {
      const parsed = createStockOpnameSchema.parse(input);
      return postJson<unknown>('/stock-opnames', parsed);
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: opnKeys.all });
      qc.invalidateQueries({ queryKey: adjKeys.all });
    },
  });
}

export type { GoodsReceipt, MaterialIssue, StockAdjustment, StockLedgerEntry, StockOpname, StockSummary, Warehouse };
