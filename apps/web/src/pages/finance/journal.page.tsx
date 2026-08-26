import { useState } from 'react';
import { createColumnHelper } from '@tanstack/react-table';
import { Badge, Button, DataGrid, useToast } from '@aec/ui';
import { useLegalEntities } from '@/entities/legal-entity';
import { useJournals, usePostJournal, type Journal } from '@/features/finance';
import { JournalForm } from '@/features/finance';

const PAGE_SIZE = 20;

const statusVariant: Record<string, 'default' | 'success' | 'warning'> = {
  DRAFT: 'default',
  POSTED: 'success',
  REVERSED: 'warning',
};

const sourceLabel: Record<string, string> = {
  MANUAL: 'Manual',
  INVOICE: 'Invoice',
  PAYMENT: 'Payment',
};

const columnHelper = createColumnHelper<Journal>();

const columns = [
  columnHelper.accessor('journalNumber', {
    header: 'No. Journal',
    cell: (info) => <span className="font-mono text-neutral-800">{info.getValue()}</span>,
  }),
  columnHelper.accessor('date', {
    header: 'Tanggal',
    cell: (info) => new Date(info.getValue()).toLocaleDateString('id-ID'),
  }),
  columnHelper.accessor('source', {
    header: 'Sumber',
    cell: (info) => <Badge variant="default">{sourceLabel[info.getValue()] ?? info.getValue()}</Badge>,
  }),
  columnHelper.accessor('reference', {
    header: 'Referensi',
    cell: (info) => <span className="font-mono text-neutral-600">{info.getValue() ?? '-'}</span>,
  }),
  columnHelper.accessor('description', {
    header: 'Deskripsi',
    cell: (info) => <span className="max-w-[260px] truncate text-neutral-700">{info.getValue()}</span>,
  }),
  columnHelper.accessor('status', {
    header: 'Status',
    cell: (info) => <Badge variant={statusVariant[info.getValue()] ?? 'default'}>{info.getValue()}</Badge>,
  }),
  columnHelper.display({
    id: 'actions',
    header: '',
    cell: ({ row }) => <PostButton journal={row.original} />,
  }),
];

function PostButton({ journal }: { journal: Journal }) {
  const post = usePostJournal();
  const toast = useToast();
  if (journal.status !== 'DRAFT') return null;
  return (
    <Button
      size="sm"
      variant="secondary"
      onClick={() => {
        if (window.confirm(`Posting ${journal.journalNumber}? Journal terkunci (BR-001).`))
          post.mutate(journal.id, {
            onSuccess: () => toast({ title: 'Journal diposting', description: journal.journalNumber, variant: 'success' }),
            onError: () => toast({ title: 'Gagal posting', description: 'Pastikan debit sama dengan kredit.', variant: 'error' }),
          });
      }}
      loading={post.isPending}
    >
      Posting
    </Button>
  );
}

export function JournalPage() {
  const [pagination, setPagination] = useState({ pageIndex: 0, pageSize: PAGE_SIZE });
  const [showForm, setShowForm] = useState(false);
  const [entityId, setEntityId] = useState('');
  const entities = useLegalEntities({ page: 1, pageSize: 100 });
  const defaultEntityId = entityId || entities.data?.items[0]?.id || '';

  const { data, isLoading, isError, refetch } = useJournals({ page: pagination.pageIndex + 1, pageSize: pagination.pageSize });

  return (
    <div>
      <div className="mb-6 flex items-center justify-between">
        <div>
          <h1 className="text-h1 text-neutral-950">GL Journal</h1>
          <p className="mt-1 text-body-sm text-neutral-500">Double-entry journal — debit = kredit (FR-FIN-003/004)</p>
        </div>
        <div className="flex items-center gap-3">
          <select
            value={defaultEntityId}
            onChange={(e) => setEntityId(e.target.value)}
            aria-label="Pilih legal entity"
            className="flex h-9 w-48 rounded-md border border-neutral-200 bg-white px-3 text-body hover:border-neutral-300 focus-visible:border-racing-red-400 focus-visible:ring-2 focus-visible:ring-racing-red-400/20"
          >
            <option value="">Pilih entity…</option>
            {(entities.data?.items ?? []).map((en) => <option key={en.id} value={en.id}>{en.code}</option>)}
          </select>
          <Button size="sm" onClick={() => setShowForm((s) => !s)}>
            {showForm ? 'Tutup' : '+ Buat Journal'}
          </Button>
        </div>
      </div>

      {showForm && defaultEntityId && <JournalForm onDone={() => setShowForm(false)} entityId={defaultEntityId} />}

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
          emptyMessage="Belum ada journal"
        />
      </div>
    </div>
  );
}
