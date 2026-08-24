import { useState } from 'react';
import { createColumnHelper } from '@tanstack/react-table';
import { Badge, DataGrid } from '@aec/ui';
import { useAuditLogs } from './audit.api';
import type { AuditLog } from '@aec/api-contracts';

const PAGE_SIZE = 20;

const columnHelper = createColumnHelper<AuditLog>();

const columns = [
  columnHelper.accessor('createdAt', {
    header: 'Waktu',
    cell: (info) => {
      const d = new Date(info.getValue());
      return (
        <span className="font-mono text-body-sm text-neutral-600">
          {d.toLocaleString('id-ID', { day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit' })}
        </span>
      );
    },
  }),
  columnHelper.accessor('action', {
    header: 'Aksi',
    cell: (info) => <Badge variant="default">{info.getValue()}</Badge>,
  }),
  columnHelper.accessor('resource', {
    header: 'Resource',
    cell: (info) => <span className="font-mono text-neutral-700">{info.getValue()}</span>,
  }),
  columnHelper.accessor('resourceId', {
    header: 'Resource ID',
    cell: (info) => <span className="font-mono text-neutral-500">{info.getValue() ?? '-'}</span>,
  }),
  columnHelper.accessor('userId', {
    header: 'Aktor',
    cell: (info) => <span className="font-mono text-neutral-500">{info.getValue().slice(0, 8)}…</span>,
  }),
  columnHelper.accessor('correlationId', {
    header: 'Correlation',
    cell: (info) => <span className="font-mono text-neutral-400">{info.getValue()?.slice(0, 8) ?? '-'}</span>,
  }),
];

export function AuditLogPage() {
  const [pagination, setPagination] = useState({ pageIndex: 0, pageSize: PAGE_SIZE });
  const { data, isLoading, isError, refetch } = useAuditLogs({
    page: pagination.pageIndex + 1,
    pageSize: pagination.pageSize,
  });

  return (
    <div>
      <div className="mb-6">
        <h1 className="text-h1 text-neutral-950">Audit Trail</h1>
        <p className="mt-1 text-body-sm text-neutral-500">Riwayat aksi kritis (FR-FND-008)</p>
      </div>

      <div className="rounded-md border border-neutral-200 bg-white shadow-xs">
        <DataGrid
          columns={columns}
          data={data?.items ?? []}
          rowCount={data?.total ?? 0}
          pagination={pagination}
          onPaginationChange={setPagination}
          isLoading={isLoading}
          isError={isError}
          onRetry={() => refetch()}
          emptyMessage="Belum ada audit log"
        />
      </div>
    </div>
  );
}
