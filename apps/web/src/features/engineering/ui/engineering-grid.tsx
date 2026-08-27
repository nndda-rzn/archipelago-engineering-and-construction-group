import { Badge, Button } from '@aec/ui';
import { createColumnHelper } from '@tanstack/react-table';
import type { Deliverable, Drawing, Rfi, Submittal, Transmittal } from '@aec/api-contracts';
import {
  useUpdateDeliverableStatus,
  usePublishDrawing,
  useAnswerRfi,
  useReviewSubmittal,
} from '../model/engineering.api';

export const engStatusVariant: Record<string, 'default' | 'success' | 'warning'> = {
  ISSUED: 'success',
  APPROVED: 'success',
  PUBLISHED: 'success',
  ANSWERED: 'success',
  CLOSED: 'success',
  REJECTED: 'warning',
  OPEN: 'warning',
  SUBMITTED: 'default',
};

// ---- Deliverable columns ---------------------------------------------------

const dlvHelper = createColumnHelper<Deliverable>();

export function DlvAdvanceBtn({ row }: { row: Deliverable }) {
  const update = useUpdateDeliverableStatus();
  const next: Record<string, string> = {
    NOT_STARTED: 'IN_PROGRESS',
    IN_PROGRESS: 'SUBMITTED',
    SUBMITTED: 'APPROVED',
    APPROVED: 'ISSUED',
  };
  const to = next[row.status];
  if (!to) return null;
  return (
    <Button
      size="sm"
      variant="secondary"
      loading={update.isPending}
      onClick={() => update.mutate({ id: row.id, status: to })}
    >
      {to}
    </Button>
  );
}

export const dlvColumns = [
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
      return (
        <span className="font-mono text-neutral-600">
          {d ? new Date(d).toLocaleDateString('id-ID') : '—'}
        </span>
      );
    },
  }),
  dlvHelper.accessor('status', {
    header: 'Status',
    cell: (info) => (
      <Badge variant={engStatusVariant[info.getValue()] ?? 'default'}>{info.getValue()}</Badge>
    ),
  }),
  dlvHelper.display({
    id: 'actions',
    header: '',
    cell: ({ row }) => <DlvAdvanceBtn row={row.original} />,
  }),
];

// ---- Drawing columns -------------------------------------------------------

const drwHelper = createColumnHelper<Drawing>();

export function DrwPublishBtn({ row }: { row: Drawing }) {
  const publish = usePublishDrawing();
  if (row.status === 'PUBLISHED') return null;
  return (
    <Button
      size="sm"
      variant="secondary"
      loading={publish.isPending}
      onClick={() => publish.mutate({ id: row.id })}
    >
      Publish
    </Button>
  );
}

export const drwColumns = [
  drwHelper.accessor('drawingNumber', {
    header: 'No.',
    cell: (info) => <span className="font-mono text-neutral-800">{info.getValue()}</span>,
  }),
  drwHelper.accessor('title', {
    header: 'Drawing',
    cell: (info) => <span className="max-w-xs truncate text-neutral-800">{info.getValue()}</span>,
  }),
  drwHelper.accessor('discipline', {
    header: 'Disiplin',
    cell: (info) => <Badge variant="default">{info.getValue()}</Badge>,
  }),
  drwHelper.accessor('currentRevision', {
    header: 'Rev.',
    cell: (info) => <span className="font-mono text-neutral-600">{info.getValue()}</span>,
  }),
  drwHelper.accessor('status', {
    header: 'Status',
    cell: (info) => (
      <Badge variant={engStatusVariant[info.getValue()] ?? 'default'}>{info.getValue()}</Badge>
    ),
  }),
  drwHelper.display({
    id: 'actions',
    header: '',
    cell: ({ row }) => <DrwPublishBtn row={row.original} />,
  }),
];

// ---- RFI columns -----------------------------------------------------------

const rfiHelper = createColumnHelper<Rfi>();

export function RfiAnswerBtn({ row }: { row: Rfi }) {
  const answer = useAnswerRfi();
  if (row.status !== 'OPEN') return null;
  return (
    <Button
      size="sm"
      variant="secondary"
      loading={answer.isPending}
      onClick={() => answer.mutate({ id: row.id, answer: 'Answered' })}
    >
      Answer
    </Button>
  );
}

export const rfiColumns = [
  rfiHelper.accessor('rfiNumber', {
    header: 'No.',
    cell: (info) => <span className="font-mono text-neutral-800">{info.getValue()}</span>,
  }),
  rfiHelper.accessor('title', {
    header: 'Subjek',
    cell: (info) => <span className="max-w-xs truncate text-neutral-800">{info.getValue()}</span>,
  }),
  rfiHelper.accessor('createdBy', {
    header: 'Dari',
    cell: (info) => <span className="text-neutral-600">{info.getValue()}</span>,
  }),
  rfiHelper.accessor('createdAt', {
    header: 'Tanggal',
    cell: (info) => {
      const d = info.getValue();
      return (
        <span className="font-mono text-neutral-600">
          {d ? new Date(d).toLocaleDateString('id-ID') : '—'}
        </span>
      );
    },
  }),
  rfiHelper.accessor('status', {
    header: 'Status',
    cell: (info) => (
      <Badge variant={engStatusVariant[info.getValue()] ?? 'default'}>{info.getValue()}</Badge>
    ),
  }),
  rfiHelper.display({
    id: 'actions',
    header: '',
    cell: ({ row }) => <RfiAnswerBtn row={row.original} />,
  }),
];

// ---- Submittal columns -----------------------------------------------------

const subHelper = createColumnHelper<Submittal>();

export function SubReviewBtn({ row }: { row: Submittal }) {
  const review = useReviewSubmittal();
  if (row.status !== 'SUBMITTED') return null;
  return (
    <Button
      size="sm"
      variant="secondary"
      loading={review.isPending}
      onClick={() => review.mutate({ id: row.id, status: 'APPROVED' })}
    >
      Approve
    </Button>
  );
}

export const subColumns = [
  subHelper.accessor('submittalNumber', {
    header: 'No.',
    cell: (info) => <span className="font-mono text-neutral-800">{info.getValue()}</span>,
  }),
  subHelper.accessor('title', {
    header: 'Submittal',
    cell: (info) => <span className="max-w-xs truncate text-neutral-800">{info.getValue()}</span>,
  }),
  subHelper.accessor('reviewedBy', {
    header: 'Reviewer',
    cell: (info) => <span className="text-neutral-600">{info.getValue() ?? '—'}</span>,
  }),
  subHelper.accessor('dueDate', {
    header: 'Due',
    cell: (info) => {
      const d = info.getValue();
      return (
        <span className="font-mono text-neutral-600">
          {d ? new Date(d).toLocaleDateString('id-ID') : '—'}
        </span>
      );
    },
  }),
  subHelper.accessor('status', {
    header: 'Status',
    cell: (info) => (
      <Badge variant={engStatusVariant[info.getValue()] ?? 'default'}>{info.getValue()}</Badge>
    ),
  }),
  subHelper.display({
    id: 'actions',
    header: '',
    cell: ({ row }) => <SubReviewBtn row={row.original} />,
  }),
];

// ---- Transmittal columns ---------------------------------------------------

const trmHelper = createColumnHelper<Transmittal>();

export const trmColumns = [
  trmHelper.accessor('transmittalNumber', {
    header: 'No.',
    cell: (info) => <span className="font-mono text-neutral-800">{info.getValue()}</span>,
  }),
  trmHelper.accessor('recipient', {
    header: 'Penerima',
    cell: (info) => <span className="text-neutral-800">{info.getValue()}</span>,
  }),
  trmHelper.accessor('subject', {
    header: 'Perihal',
    cell: (info) => <span className="max-w-xs truncate text-neutral-600">{info.getValue()}</span>,
  }),
  trmHelper.accessor('sentAt', {
    header: 'Tanggal',
    cell: (info) => {
      const d = info.getValue();
      return (
        <span className="font-mono text-neutral-600">
          {d ? new Date(d).toLocaleDateString('id-ID') : '—'}
        </span>
      );
    },
  }),
  trmHelper.accessor('sentBy', {
    header: 'Oleh',
    cell: (info) => <span className="text-neutral-600">{info.getValue()}</span>,
  }),
];
