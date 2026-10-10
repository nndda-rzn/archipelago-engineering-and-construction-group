import { useState } from 'react';
import { createColumnHelper } from '@tanstack/react-table';
import { Badge, Button, ConfirmDialog, DataGrid, EmptyCell, useToast, Select, SelectContent, SelectItem, SelectTrigger, SelectValue, StatusBadge } from '@aec/ui';
import { useLegalEntities } from '@/entities/legal-entity';
import { useJournals, usePostJournal, type Journal } from '@/features/finance';
import { JournalForm } from '@/features/finance';
import { PAGE_SIZE } from '@/shared/lib/pagination';
import { formatDate } from '@/shared/lib/format';

const sourceLabel: Record<string, string> = {
  MANUAL: 'Manual',
  INVOICE: 'Invoice',
  PAYMENT: 'Payment',
};

const columnHelper = createColumnHelper<Journal>();

const columns = [
  columnHelper.accessor('journalNumber', {
    header: 'Journal No.',
    cell: (info) => <span className="font-mono text-neutral-800">{info.getValue()}</span>,
  }),
  columnHelper.accessor('date', {
    header: 'Date',
    cell: (info) => formatDate(info.getValue()),
  }),
  columnHelper.accessor('source', {
    header: 'Source',
    cell: (info) => <Badge variant="default">{sourceLabel[info.getValue()] ?? info.getValue()}</Badge>,
  }),
  columnHelper.accessor('reference', {
    header: 'Reference',
    cell: (info) => <span className="font-mono text-neutral-600">{info.getValue() ?? <EmptyCell />}</span>,
  }),
  columnHelper.accessor('description', {
    header: 'Description',
    cell: (info) => <span className="max-w-[260px] truncate text-neutral-700">{info.getValue()}</span>,
  }),
  columnHelper.accessor('status', {
    header: 'Status',
    cell: (info) => <StatusBadge status={info.getValue()} />,
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
  const [confirmOpen, setConfirmOpen] = useState(false);
  if (journal.status !== 'DRAFT') return null;
  return (
    <>
      <Button size="sm" variant="secondary" onClick={() => setConfirmOpen(true)} loading={post.isPending}>
        Post
      </Button>
      <ConfirmDialog
        open={confirmOpen}
        onOpenChange={setConfirmOpen}
        title="Post journal"
        description={`Post ${journal.journalNumber}? Journal is locked (BR-001).`}
        confirmLabel="Post"
        loading={post.isPending}
        onConfirm={() =>
          post.mutate(journal.id, {
            onSuccess: () => toast({ title: 'Journal posted', description: journal.journalNumber, variant: 'success' }),
            onError: () => toast({ title: 'Failed to post', description: 'Make sure debits equal credits.', variant: 'error' }),
          })
        }
      />
    </>
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
          <p className="mt-1 text-body-sm text-neutral-500">Double-entry journal · debit = credit</p>
        </div>
        <div className="flex items-center gap-3">
          <Select value={defaultEntityId} onValueChange={setEntityId}>
            <SelectTrigger className="w-48" aria-label="Select legal entity"><SelectValue placeholder="Select entity…" /></SelectTrigger>
            <SelectContent>
              {(entities.data?.items ?? []).map((en) => <SelectItem key={en.id} value={en.id}>{en.code}</SelectItem>)}
            </SelectContent>
          </Select>
          <Button size="sm" onClick={() => setShowForm((s) => !s)}>
            {showForm ? 'Close' : '+ Create Journal'}
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
          emptyMessage="No journals yet"
          exportFilename="journals"
        />
      </div>
    </div>
  );
}
