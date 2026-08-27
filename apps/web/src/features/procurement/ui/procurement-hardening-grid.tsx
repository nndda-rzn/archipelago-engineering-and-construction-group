import { createColumnHelper } from '@tanstack/react-table';
import { Badge, DataGrid } from '@aec/ui';
import {
  type VendorRating, type CommercialEvaluation, type VendorPerformance,
} from '@/features/procurement';
import { formatIdr as fmt } from '@/shared/lib/format';
import { statusVariant } from './procurement-status';

// ── Vendor Rating grid ──────────────────────────────────────────────────────

const ratingHelper = createColumnHelper<VendorRating>();

export const ratingColumns = [
  ratingHelper.accessor('vendor', {
    header: 'Vendor',
    cell: (i) => <span className="text-neutral-800">{i.getValue()?.name}</span>,
  }),
  ratingHelper.accessor('category', {
    header: 'Kategori',
    cell: (i) => <Badge variant="default">{i.getValue()}</Badge>,
  }),
  ratingHelper.accessor('score', {
    header: 'Skor',
    cell: (i) => <span className="font-mono tabular-nums text-neutral-800">{i.getValue()}/5</span>,
  }),
  ratingHelper.accessor('remark', {
    header: 'Catatan',
    cell: (i) => <span className="max-w-[200px] truncate text-neutral-600">{i.getValue() ?? '-'}</span>,
  }),
  ratingHelper.accessor('project', {
    header: 'Project',
    cell: (i) => <span className="font-mono text-neutral-600">{i.getValue()?.code ?? '-'}</span>,
  }),
];

// ── Commercial Eval table ───────────────────────────────────────────────────

export function CommercialEvalTable({ data }: { data: CommercialEvaluation }) {
  return (
    <div className="rounded-md border border-neutral-200 bg-white p-4 shadow-xs">
      <h3 className="text-h3 text-neutral-900">
        Komparasi Komersial Normalized - {data.rfqNumber}
      </h3>
      <table className="mt-2 w-full text-left text-body">
        <thead className="bg-neutral-50 text-caption uppercase tracking-wide text-neutral-500">
          <tr>
            <th className="px-4 py-2">Vendor</th>
            <th className="px-4 py-2 text-right">Total</th>
            <th className="px-4 py-2 text-right">Lead Time</th>
            <th className="px-4 py-2 text-right">Skor Normalized</th>
            <th className="px-4 py-2">Teknis</th>
            <th className="px-4 py-2">Pemenang</th>
          </tr>
        </thead>
        <tbody>
          {data.items.map((i) => (
            <tr key={i.quoteId} className="border-t border-neutral-100 hover:bg-neutral-50">
              <td className="px-4 py-2 text-neutral-800">{i.vendor}</td>
              <td className="px-4 py-2 text-right font-mono tabular-nums text-neutral-700">{fmt(i.totalAmount)}</td>
              <td className="px-4 py-2 text-right font-mono tabular-nums text-neutral-600">{i.leadTimeDays} hari</td>
              <td className="px-4 py-2 text-right font-mono tabular-nums text-neutral-800">{i.normalizedScore.toLocaleString('id-ID')}</td>
              <td className="px-4 py-2">
                <Badge variant={statusVariant[i.technicalStatus] ?? 'default'}>{i.technicalStatus}</Badge>
              </td>
              <td className="px-4 py-2">{i.isWinner ? <Badge variant="success">Winner</Badge> : '-'}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

// ── Vendor Performance summary table ───────────────────────────────────────

export function VendorPerformanceSummaryTable({ items }: { items: VendorPerformance['items'] }) {
  return (
    <div className="mb-4 rounded-md border border-neutral-200 bg-white p-4 shadow-xs">
      <h3 className="text-h3 text-neutral-900">Ringkasan Performance Vendor</h3>
      <div className="mt-3 overflow-x-auto">
        <table className="w-full text-left text-body">
          <thead className="bg-neutral-50 text-caption uppercase tracking-wide text-neutral-500">
            <tr>
              <th className="px-4 py-2">Vendor</th>
              <th className="px-4 py-2 text-center">Delivery</th>
              <th className="px-4 py-2 text-center">Quality</th>
              <th className="px-4 py-2 text-center">Commercial</th>
              <th className="px-4 py-2 text-center">HSE</th>
              <th className="px-4 py-2 text-center">Responsiveness</th>
              <th className="px-4 py-2 text-center">Overall</th>
            </tr>
          </thead>
          <tbody>
            {items.map((v) => (
              <tr key={v.vendorCode} className="border-t border-neutral-100 hover:bg-neutral-50">
                <td className="px-4 py-2">
                  <span className="font-mono text-neutral-600">{v.vendorCode}</span>
                  <span className="ml-2 text-neutral-800">{v.vendorName}</span>
                </td>
                {[v.DELIVERY, v.QUALITY, v.COMMERCIAL, v.HSE, v.RESPONSIVENESS].map((s, idx) => (
                  <td key={idx} className="px-4 py-2 text-center font-mono tabular-nums text-neutral-700">
                    {s || '-'}
                  </td>
                ))}
                <td className="px-4 py-2 text-center font-mono tabular-nums font-medium text-neutral-900">
                  {v.overall || '-'}
                </td>
              </tr>
            ))}
            {items.length === 0 && (
              <tr>
                <td colSpan={7} className="px-4 py-4 text-caption text-neutral-500">
                  Belum ada rating vendor.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}

// ── Vendor Rating DataGrid wrapper ──────────────────────────────────────────

type PaginationState = { pageIndex: number; pageSize: number };

export function VendorRatingGrid({
  data,
  total,
  isLoading,
  isError,
  onRetry,
  pagination,
  onPaginationChange,
}: {
  data: VendorRating[];
  total: number;
  isLoading: boolean;
  isError: boolean;
  onRetry: () => void;
  pagination: PaginationState;
  onPaginationChange: (p: PaginationState) => void;
}) {
  return (
    <div className="rounded-md border border-neutral-200 bg-white shadow-xs">
      <DataGrid
        columns={ratingColumns}
        data={data}
        rowCount={total}
        isLoading={isLoading}
        isError={isError}
        onRetry={onRetry}
        emptyMessage="Belum ada rating"
        pagination={pagination}
        onPaginationChange={onPaginationChange}
      />
    </div>
  );
}
