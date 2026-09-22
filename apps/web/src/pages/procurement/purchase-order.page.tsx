import { useState } from 'react';
import { createColumnHelper } from '@tanstack/react-table';
import { Button, ConfirmActionButton, DataGrid, EmptyCell, Input, Label, Select, SelectContent, SelectItem, SelectTrigger, SelectValue, StatusBadge } from '@aec/ui';
import { useCreatePo, usePos, usePrs, useReleasePo, type PurchaseOrder } from '@/features/procurement';
import { formatIdr } from '@/shared/lib/format';
import { PAGE_SIZE } from '@/shared/lib/pagination';
import { useUrlPagination } from '@/shared/lib/use-url-state';

const columnHelper = createColumnHelper<PurchaseOrder>();

const columns = [
  columnHelper.accessor('poNumber', {
    header: 'Nomor PO',
    cell: (info) => <span className="font-mono text-neutral-800">{info.getValue()}</span>,
  }),
  columnHelper.accessor('vendor', {
    header: 'Vendor',
    cell: (info) => <span className="text-neutral-700">{info.getValue()}</span>,
  }),
  columnHelper.accessor('project', {
    header: 'Project',
    cell: (info) => <span className="text-neutral-600">{info.getValue()?.code ?? <EmptyCell />}</span>,
  }),
  columnHelper.accessor('totalAmount', {
    header: 'Total',
    cell: (info) => (
      <span className="font-mono tabular-nums text-neutral-700">
        {formatIdr(info.getValue())}
      </span>
    ),
  }),
  columnHelper.accessor('status', {
    header: 'Status',
    cell: (info) => <StatusBadge status={info.getValue()} />,
  }),
  columnHelper.display({
    id: 'actions',
    header: '',
    cell: ({ row }) => <ReleaseButton id={row.original.id} status={row.original.status} />,
  }),
];

function ReleaseButton({ id, status }: { id: string; status: string }) {
  const release = useReleasePo();
  if (status !== 'APPROVED') return null;
  return (
    <ConfirmActionButton
      size="sm"
      variant="secondary"
      confirmTitle="Release PO"
      confirmDescription="Commitment akan tercatat."
      confirmLabel="Release"
      onConfirm={() => release.mutate(id)}
      loading={release.isPending}
    >
      Release
    </ConfirmActionButton>
  );
}

export function PurchaseOrderPage() {
  const [showForm, setShowForm] = useState(false);
  const [requisitionId, setRequisitionId] = useState('');
  const [vendor, setVendor] = useState('');
  const { pagination, onPaginationChange } = useUrlPagination(PAGE_SIZE);

  const { data, isLoading, isError, refetch } = usePos({ page: pagination.pageIndex + 1, pageSize: pagination.pageSize });
  const prs = usePrs({ page: 1, pageSize: 100 });
  const approvedPrs = (prs.data?.items ?? []).filter((pr) => pr.status === 'APPROVED');
  const create = useCreatePo();

  const onSubmit = () => {
    if (!requisitionId || !vendor) return;
    create.mutate(
      { requisitionId, vendor },
      {
        onSuccess: () => {
          setVendor('');
          setRequisitionId('');
          setShowForm(false);
        },
      },
    );
  };

  return (
    <div>
      <div className="mb-6 flex items-center justify-between">
        <div>
          <h1 className="text-h1 text-neutral-950">Purchase Order</h1>
          <p className="mt-1 text-body-sm text-neutral-500">Pesanan pembelian → commitment (FR-PRO-007)</p>
        </div>
        <Button size="sm" onClick={() => setShowForm((s) => !s)}>
          {showForm ? 'Tutup' : '+ Buat PO dari PR'}
        </Button>
      </div>

      {showForm && (
        <div className="mb-6 rounded-md border border-neutral-200 bg-white p-4 shadow-xs">
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <div>
              <Label htmlFor="po-pr">Dari PR (harus APPROVED)</Label>
              <Select value={requisitionId} onValueChange={setRequisitionId}>
                <SelectTrigger id="po-pr">
                  <SelectValue placeholder="Pilih PR…" />
                </SelectTrigger>
                <SelectContent>
                  {approvedPrs.map((pr) => <SelectItem key={pr.id} value={pr.id}>{pr.prNumber} — {pr.requestedBy}</SelectItem>)}
                </SelectContent>
              </Select>
              {approvedPrs.length === 0 && <p className="mt-1 text-caption text-neutral-500">Tidak ada PR APPROVED. PR perlu di-approve dulu.</p>}
            </div>
            <div>
              <Label htmlFor="po-vendor">Vendor</Label>
              <Input id="po-vendor" placeholder="PT Vendor" value={vendor} onChange={(e) => setVendor(e.target.value)} />
            </div>
          </div>
          <div className="mt-4 flex justify-end gap-2">
            <Button type="button" variant="ghost" onClick={() => setShowForm(false)}>Batal</Button>
            <Button type="button" onClick={onSubmit} loading={create.isPending}>Simpan PO</Button>
          </div>
          {create.isError && <p className="mt-2 text-caption text-destructive-600">Gagal membuat PO. PR harus APPROVED.</p>}
        </div>
      )}

      <div className="rounded-md border border-neutral-200 bg-white shadow-xs">
        <DataGrid
          columns={columns}
          data={data?.items ?? []}
          rowCount={data?.total ?? 0}
          pagination={pagination}
          onPaginationChange={onPaginationChange}
          isLoading={isLoading}
          isError={isError}
          onRetry={() => refetch()}
          emptyMessage="Belum ada PO"
        />
      </div>
    </div>
  );
}
