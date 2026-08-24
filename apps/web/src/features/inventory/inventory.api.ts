import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import {
  createGoodsReceiptSchema,
  createWarehouseSchema,
  goodsReceiptSchema,
  stockLedgerEntrySchema,
  stockSummarySchema,
  warehouseSchema,
  type CreateGoodsReceipt,
  type CreateWarehouse,
  type GoodsReceipt,
  type StockLedgerEntry,
  type StockSummary,
  type Warehouse,
} from '@aec/api-contracts';
import { getJson, postJson } from '@/shared/lib/http';

export const warehouseKeys = { all: ['warehouses'] as const, list: (params: object) => [...warehouseKeys.all, 'list', params] as const };
export const grKeys = { all: ['goods-receipts'] as const, list: (params: object) => [...grKeys.all, 'list', params] as const };
export const ledgerKeys = { all: ['stock-ledger'] as const, list: (params: object) => [...ledgerKeys.all, 'list', params] as const };

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

export type { GoodsReceipt, StockLedgerEntry, StockSummary, Warehouse };
