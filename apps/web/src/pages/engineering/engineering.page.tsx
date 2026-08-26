import { useState } from 'react';
import { createColumnHelper } from '@tanstack/react-table';
import { Badge, Button, DataGrid, Input, Label } from '@aec/ui';
import {
  useDeliverables, useCreateDeliverable, useUpdateDeliverableStatus,
  useDrawings, useCreateDrawing, usePublishDrawing,
  useRfis, useCreateRfi, useAnswerRfi,
  useSubmittals, useCreateSubmittal, useReviewSubmittal,
  useTransmittals, useCreateTransmittal,
  type Deliverable, type Drawing, type Rfi, type Submittal, type Transmittal,
} from '@/features/engineering';
import { formatIdr as fmt } from '@/shared/lib/format';

const PAGE_SIZE = 20;

const statusVariant: Record<string, 'default' | 'success' | 'warning'> = {
  ISSUED: 'success',
  APPROVED: 'success',
  PUBLISHED: 'success',
  ANSWERED: 'success',
  CLOSED: 'success',
  REJECTED: 'warning',
  OPEN: 'warning',
  SUBMITTED: 'default',
};

const dlvHelper = createColumnHelper<Deliverable>();
const drwHelper = createColumnHelper<Drawing>();
const rfiHelper = createColumnHelper<Rfi>();
const subHelper = createColumnHelper<Submittal>();
const trmHelper = createColumnHelper<Transmittal>();

const dlvColumns = [
  dlvHelper.accessor('deliverableNumber', {
    header: 'No.',
    cell: (info) => <span className="font-mono text-neutral-800">{info.getValue()}</span>,
  }),
  dlvHelper.accessor('title', {
    header: 'Deliverable',
    cell: (info) => <span className="max-w-xs truncate text-neutral-800">{info.getValue()}</span>,
  }),
  dlvHelper.accessor('discipline', {
    header: 'Disiplin',
    cell: (info) => <Badge variant="default">{info.getValue()}</Badge>,
  }),
  dlvHelper.accessor('engineer', {
    header: 'Engineer',
    cell: (info) => <span className="text-neutral-600">{info.getValue()}</span>,
  }),
  dlvHelper.accessor('forecastDate', {
    header: 'Forecast',
    cell: (info) => {
      const d = info.getValue();
      return <span className="font-mono text-neutral-600">{d ? new Date(d).toLocaleDateString('id-ID') : '—'}</span>;
    },
  }),
  dlvHelper.accessor('status', {
    header: 'Status',
    cell: (info) => <Badge variant={statusVariant[info.getValue()] ?? 'default'}>{info.getValue()}</Badge>,
  }),
  dlvHelper.display({
    id: 'actions',
    header: '',
    cell: ({ row }) => {
      const update = useUpdateDeliverableStatus();
      const next: Record<string, string> = { NOT_STARTED: 'IN_PROGRESS', IN_PROGRESS: 'SUBMITTED', SUBMITTED: 'APPROVED', APPROVED: 'ISSUED' };
      const to = next[row.original.status];
      if (!to) return null;
      return (
        <Button size="sm" variant="secondary" loading={update.isPending} onClick={() => update.mutate({ id: row.original.id, status: to })}>
          → {to}
        </Button>
      );
    },
  }),
];

const drwColumns = [
  drwHelper.accessor('drawingNumber', {
    header: 'No. Drawing',
    cell: (info) => <span className="font-mono text-neutral-800">{info.getValue()}</span>,
  }),
  drwHelper.accessor('title', {
    header: 'Judul',
    cell: (info) => <span className="max-w-xs truncate text-neutral-800">{info.getValue()}</span>,
  }),
  drwHelper.accessor('discipline', {
    header: 'Disiplin',
    cell: (info) => <Badge variant="default">{info.getValue()}</Badge>,
  }),
  drwHelper.accessor('currentRevision', {
    header: 'Rev',
    cell: (info) => <Badge variant="success">{info.getValue()}</Badge>,
  }),
  drwHelper.accessor('status', {
    header: 'Status',
    cell: (info) => <Badge variant={statusVariant[info.getValue()] ?? 'default'}>{info.getValue()}</Badge>,
  }),
  drwHelper.display({
    id: 'actions',
    header: '',
    cell: ({ row }) => {
      const publish = usePublishDrawing();
      return (
        <Button size="sm" variant="secondary" loading={publish.isPending} onClick={() => publish.mutate({ id: row.original.id })}>
          Publish Rev
        </Button>
      );
    },
  }),
];

const rfiColumns = [
  rfiHelper.accessor('rfiNumber', {
    header: 'No. RFI',
    cell: (info) => <span className="font-mono text-neutral-800">{info.getValue()}</span>,
  }),
  rfiHelper.accessor('title', {
    header: 'Judul',
    cell: (info) => <span className="max-w-xs truncate text-neutral-800">{info.getValue()}</span>,
  }),
  rfiHelper.accessor('question', {
    header: 'Pertanyaan',
    cell: (info) => <span className="max-w-xs truncate text-neutral-600">{info.getValue()}</span>,
  }),
  rfiHelper.accessor('impactCost', {
    header: 'Impact',
    cell: (info) => {
      const v = info.getValue();
      return v != null ? <span className="font-mono tabular-nums text-neutral-700">{fmt(v)}</span> : '—';
    },
  }),
  rfiHelper.accessor('status', {
    header: 'Status',
    cell: (info) => <Badge variant={statusVariant[info.getValue()] ?? 'default'}>{info.getValue()}</Badge>,
  }),
  rfiHelper.display({
    id: 'actions',
    header: '',
    cell: ({ row }) => {
      const answer = useAnswerRfi();
      const [text, setText] = useState('');
      if (row.original.status === 'CLOSED' || row.original.status === 'ANSWERED') return null;
      return (
        <div className="flex items-center gap-1">
          <Input placeholder="Jawaban…" value={text} onChange={(e) => setText(e.target.value)} className="h-8 w-48" />
          <Button size="sm" variant="secondary" disabled={!text} loading={answer.isPending} onClick={() => answer.mutate({ id: row.original.id, answer: text })}>
            Jawab
          </Button>
        </div>
      );
    },
  }),
];

const subColumns = [
  subHelper.accessor('submittalNumber', {
    header: 'No.',
    cell: (info) => <span className="font-mono text-neutral-800">{info.getValue()}</span>,
  }),
  subHelper.accessor('title', {
    header: 'Submittal',
    cell: (info) => <span className="max-w-xs truncate text-neutral-800">{info.getValue()}</span>,
  }),
  subHelper.accessor('dueDate', {
    header: 'Due',
    cell: (info) => {
      const d = info.getValue();
      return <span className="font-mono text-neutral-600">{d ? new Date(d).toLocaleDateString('id-ID') : '—'}</span>;
    },
  }),
  subHelper.accessor('status', {
    header: 'Status',
    cell: (info) => <Badge variant={statusVariant[info.getValue()] ?? 'default'}>{info.getValue()}</Badge>,
  }),
  subHelper.display({
    id: 'actions',
    header: '',
    cell: ({ row }) => {
      const review = useReviewSubmittal();
      if (row.original.status === 'APPROVED' || row.original.status === 'REJECTED') return null;
      return (
        <div className="flex items-center gap-1">
          <Button size="sm" variant="secondary" loading={review.isPending} onClick={() => review.mutate({ id: row.original.id, status: 'UNDER_REVIEW' })}>
            Review
          </Button>
          <Button size="sm" variant="ghost" loading={review.isPending} onClick={() => review.mutate({ id: row.original.id, status: 'APPROVED' })}>
            Approve
          </Button>
        </div>
      );
    },
  }),
];

const trmColumns = [
  trmHelper.accessor('transmittalNumber', {
    header: 'No.',
    cell: (info) => <span className="font-mono text-neutral-800">{info.getValue()}</span>,
  }),
  trmHelper.accessor('recipient', {
    header: 'Penerima',
    cell: (info) => <span className="text-neutral-700">{info.getValue()}</span>,
  }),
  trmHelper.accessor('subject', {
    header: 'Subjek',
    cell: (info) => <span className="max-w-xs truncate text-neutral-800">{info.getValue()}</span>,
  }),
  trmHelper.accessor('sentAt', {
    header: 'Dikirim',
    cell: (info) => <span className="font-mono text-neutral-600">{new Date(info.getValue()).toLocaleDateString('id-ID')}</span>,
  }),
];

type Tab = 'deliverables' | 'drawings' | 'rfis' | 'submittals' | 'transmittals';

export function EngineeringPage() {
  const [tab, setTab] = useState<Tab>('deliverables');
  const [pagination, setPagination] = useState({ pageIndex: 0, pageSize: PAGE_SIZE });
  const [showForm, setShowForm] = useState(false);
  const deliverables = useDeliverables({ page: pagination.pageIndex + 1, pageSize: pagination.pageSize });
  const drawings = useDrawings({ page: pagination.pageIndex + 1, pageSize: pagination.pageSize });
  const rfis = useRfis({ page: pagination.pageIndex + 1, pageSize: pagination.pageSize });
  const submittals = useSubmittals({ page: pagination.pageIndex + 1, pageSize: pagination.pageSize });
  const transmittals = useTransmittals({ page: pagination.pageIndex + 1, pageSize: pagination.pageSize });

  const gridProps = { pagination, onPaginationChange: setPagination };

  const SimpleForm = () => {
    const [title, setTitle] = useState('');
    const [engineer, setEngineer] = useState('');
    const createDlv = useCreateDeliverable();
    const createDrw = useCreateDrawing();
    const createRfi = useCreateRfi();
    const createSub = useCreateSubmittal();
    const createTrm = useCreateTransmittal();
    const [question, setQuestion] = useState('');
    const [recipient, setRecipient] = useState('');

    const submit = () => {
      if (tab === 'deliverables' && title && engineer) createDlv.mutate({ title, engineer });
      if (tab === 'drawings' && title) createDrw.mutate({ title });
      if (tab === 'rfis' && title && question) createRfi.mutate({ title, question });
      if (tab === 'submittals' && title) createSub.mutate({ title });
      if (tab === 'transmittals' && recipient && title) createTrm.mutate({ recipient, subject: title });
      setTitle('');
      setEngineer('');
      setQuestion('');
      setRecipient('');
      setShowForm(false);
    };

    return (
      <div className="mb-4 rounded-md border border-neutral-200 bg-white p-4 shadow-xs">
        <div className="flex items-end gap-3">
          <div className="flex-1">
            <Label htmlFor="eng-title">{tab === 'transmittals' ? 'Subjek' : 'Judul'}</Label>
            <Input id="eng-title" value={title} onChange={(e) => setTitle(e.target.value)} />
          </div>
          {tab === 'deliverables' && (
            <div>
              <Label htmlFor="eng-eng">Engineer</Label>
              <Input id="eng-eng" value={engineer} onChange={(e) => setEngineer(e.target.value)} />
            </div>
          )}
          {tab === 'rfis' && (
            <div className="flex-1">
              <Label htmlFor="eng-q">Pertanyaan</Label>
              <Input id="eng-q" value={question} onChange={(e) => setQuestion(e.target.value)} />
            </div>
          )}
          {tab === 'transmittals' && (
            <div>
              <Label htmlFor="eng-recipient">Penerima</Label>
              <Input id="eng-recipient" value={recipient} onChange={(e) => setRecipient(e.target.value)} />
            </div>
          )}
          <Button onClick={submit} loading={false}>Buat</Button>
        </div>
      </div>
    );
  };

  return (
    <div>
      <div className="mb-6 flex items-center justify-between">
        <div>
          <h1 className="text-h1 text-neutral-950">Engineering</h1>
          <p className="mt-1 text-body-sm text-neutral-500">Deliverable, drawing revision, RFI, submittal, transmittal (FR-ENG-001..005)</p>
        </div>
        <Button size="sm" onClick={() => setShowForm((s) => !s)}>
          {showForm ? 'Tutup' : '+ Buat Baru'}
        </Button>
      </div>

      <div className="mb-4 flex flex-wrap gap-2">
        {(['deliverables', 'drawings', 'rfis', 'submittals', 'transmittals'] as Tab[]).map((t) => (
          <button
            key={t}
            onClick={() => { setTab(t); setShowForm(false); }}
            className={`rounded-md px-3 py-1.5 text-body-sm font-medium transition-colors ${
              tab === t ? 'bg-racing-red-600 text-white' : 'bg-white text-neutral-600 border border-neutral-200 hover:border-neutral-300'
            }`}
          >
            {t === 'deliverables' ? `Deliverable (${deliverables.data?.total ?? 0})` : t === 'drawings' ? `Drawing (${drawings.data?.total ?? 0})` : t === 'rfis' ? `RFI (${rfis.data?.total ?? 0})` : t === 'submittals' ? `Submittal (${submittals.data?.total ?? 0})` : `Transmittal (${transmittals.data?.total ?? 0})`}
          </button>
        ))}
      </div>

      {showForm && <SimpleForm />}

      <div className="rounded-md border border-neutral-200 bg-white shadow-xs">
        {tab === 'deliverables' && <DataGrid columns={dlvColumns} data={deliverables.data?.items ?? []} rowCount={deliverables.data?.total ?? 0} isLoading={deliverables.isLoading} isError={deliverables.isError} onRetry={() => deliverables.refetch()} emptyMessage="Belum ada deliverable" {...gridProps} />}
        {tab === 'drawings' && <DataGrid columns={drwColumns} data={drawings.data?.items ?? []} rowCount={drawings.data?.total ?? 0} isLoading={drawings.isLoading} isError={drawings.isError} onRetry={() => drawings.refetch()} emptyMessage="Belum ada drawing" {...gridProps} />}
        {tab === 'rfis' && <DataGrid columns={rfiColumns} data={rfis.data?.items ?? []} rowCount={rfis.data?.total ?? 0} isLoading={rfis.isLoading} isError={rfis.isError} onRetry={() => rfis.refetch()} emptyMessage="Belum ada RFI" {...gridProps} />}
        {tab === 'submittals' && <DataGrid columns={subColumns} data={submittals.data?.items ?? []} rowCount={submittals.data?.total ?? 0} isLoading={submittals.isLoading} isError={submittals.isError} onRetry={() => submittals.refetch()} emptyMessage="Belum ada submittal" {...gridProps} />}
        {tab === 'transmittals' && <DataGrid columns={trmColumns} data={transmittals.data?.items ?? []} rowCount={transmittals.data?.total ?? 0} isLoading={transmittals.isLoading} isError={transmittals.isError} onRetry={() => transmittals.refetch()} emptyMessage="Belum ada transmittal" {...gridProps} />}
      </div>
    </div>
  );
}
