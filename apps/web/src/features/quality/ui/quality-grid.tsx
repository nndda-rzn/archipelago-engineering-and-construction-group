import { useState } from 'react';
import { Badge, Button, Input } from '@aec/ui';
import { createColumnHelper } from '@tanstack/react-table';
import { useClosePunchItem, useDisposeNcr, useInspect, useReinspectNcr } from '../model/quality.api';
import type { InspectionRequest, Itp, Ncr, PunchListItem } from '@aec/api-contracts';

export const statusVariant: Record<string, 'default' | 'success' | 'warning'> = {
  OPEN: 'warning',
  PASS: 'success',
  FAIL: 'warning',
  CLOSED: 'success',
  DISPOSED: 'success',
  DRAFT: 'default',
};

const itpHelper = createColumnHelper<Itp>();
const insHelper = createColumnHelper<InspectionRequest>();
const ncrHelper = createColumnHelper<Ncr>();
const punchHelper = createColumnHelper<PunchListItem>();

export const itpColumns = [
  itpHelper.accessor('itpNumber', {
    header: 'No. ITP',
    cell: (info) => <span className="font-mono text-neutral-800">{info.getValue()}</span>,
  }),
  itpHelper.accessor('title', {
    header: 'Judul',
    cell: (info) => <span className="text-neutral-800">{info.getValue()}</span>,
  }),
  itpHelper.accessor('workPackage', {
    header: 'Work Package',
    cell: (info) => <span className="font-mono text-neutral-600">{info.getValue()?.wpNumber ?? '-'}</span>,
  }),
  itpHelper.accessor('status', {
    header: 'Status',
    cell: (info) => <Badge variant={statusVariant[info.getValue()] ?? 'default'}>{info.getValue()}</Badge>,
  }),
];

export const insColumns = [
  insHelper.accessor('inspectionNumber', {
    header: 'No. Inspeksi',
    cell: (info) => <span className="font-mono text-neutral-800">{info.getValue()}</span>,
  }),
  insHelper.accessor('description', {
    header: 'Deskripsi',
    cell: (info) => <span className="max-w-sm truncate text-neutral-700">{info.getValue()}</span>,
  }),
  insHelper.accessor('result', {
    header: 'Hasil',
    cell: (info) => <Badge variant={statusVariant[info.getValue()] ?? 'default'}>{info.getValue()}</Badge>,
  }),
  insHelper.accessor('status', {
    header: 'Status',
    cell: (info) => <Badge variant={statusVariant[info.getValue()] ?? 'default'}>{info.getValue()}</Badge>,
  }),
  insHelper.display({
    id: 'actions',
    header: '',
    cell: ({ row }) => <InspectButtons inspection={row.original} />,
  }),
];

export const ncrColumns = [
  ncrHelper.accessor('ncrNumber', {
    header: 'No. NCR',
    cell: (info) => <span className="font-mono text-neutral-800">{info.getValue()}</span>,
  }),
  ncrHelper.accessor('severity', {
    header: 'Severity',
    cell: (info) => <Badge variant={info.getValue() === 'CRITICAL' ? 'warning' : info.getValue() === 'MAJOR' ? 'warning' : 'default'}>{info.getValue()}</Badge>,
  }),
  ncrHelper.accessor('category', {
    header: 'Kategori',
    cell: (info) => <Badge variant="default">{info.getValue()}</Badge>,
  }),
  ncrHelper.accessor('description', {
    header: 'Deskripsi',
    cell: (info) => <span className="max-w-xs truncate text-neutral-700">{info.getValue()}</span>,
  }),
  ncrHelper.accessor('reinspectionResult', {
    header: 'Re-inspeksi',
    cell: (info) => (info.getValue() ? <Badge variant={info.getValue() === 'PASS' ? 'success' : 'warning'}>{info.getValue()}</Badge> : '-'),
  }),
  ncrHelper.accessor('status', {
    header: 'Status',
    cell: (info) => <Badge variant={statusVariant[info.getValue()] ?? 'default'}>{info.getValue()}</Badge>,
  }),
  ncrHelper.display({
    id: 'actions',
    header: '',
    cell: ({ row }) => <NcrActions ncr={row.original} />,
  }),
];

export const punchColumns = [
  punchHelper.accessor('punchNumber', {
    header: 'No.',
    cell: (info) => <span className="font-mono text-neutral-800">{info.getValue()}</span>,
  }),
  punchHelper.accessor('description', {
    header: 'Deskripsi',
    cell: (info) => <span className="max-w-sm truncate text-neutral-700">{info.getValue()}</span>,
  }),
  punchHelper.accessor('status', {
    header: 'Status',
    cell: (info) => <Badge variant={info.getValue() === 'CLOSED' ? 'success' : 'warning'}>{info.getValue()}</Badge>,
  }),
  punchHelper.display({
    id: 'actions',
    header: '',
    cell: ({ row }) => {
      const close = useClosePunchItem();
      if (row.original.status === 'CLOSED') return null;
      return (
        <Button size="sm" variant="secondary" loading={close.isPending} onClick={() => close.mutate({ id: row.original.id })}>
          Tutup
        </Button>
      );
    },
  }),
];

function InspectButtons({ inspection }: { inspection: InspectionRequest }) {
  const inspect = useInspect();
  if (inspection.status === 'CLOSED') return null;
  return (
    <div className="flex items-center gap-1">
      <Button size="sm" variant="secondary" loading={inspect.isPending} onClick={() => inspect.mutate({ id: inspection.id, result: 'PASS' })}>
        PASS
      </Button>
      <Button size="sm" variant="ghost" loading={inspect.isPending} onClick={() => inspect.mutate({ id: inspection.id, result: 'FAIL' })}>
        FAIL
      </Button>
    </div>
  );
}

function NcrActions({ ncr }: { ncr: Ncr }) {
  const dispose = useDisposeNcr();
  const reinspect = useReinspectNcr();
  const [rootCause, setRootCause] = useState('');
  const [action, setAction] = useState('');
  if (ncr.status === 'CLOSED') return null;
  return (
    <div className="flex items-center gap-1">
      {ncr.status === 'OPEN' ? (
        <>
          <Input placeholder="Root cause" value={rootCause} onChange={(e) => setRootCause(e.target.value)} className="h-8 w-32" />
          <Button size="sm" variant="secondary" disabled={!rootCause} loading={dispose.isPending} onClick={() => dispose.mutate({ id: ncr.id, rootCause, correctiveAction: action || undefined })}>
            Dispose
          </Button>
        </>
      ) : null}
      {ncr.status === 'UNDER_REVIEW' ? (
        <>
          <Input placeholder="Tindakan" value={action} onChange={(e) => setAction(e.target.value)} className="h-8 w-32" />
          <Button size="sm" variant="secondary" loading={reinspect.isPending} onClick={() => reinspect.mutate({ id: ncr.id, result: 'PASS' })}>
            Re-inspeksi PASS
          </Button>
          <Button size="sm" variant="ghost" loading={reinspect.isPending} onClick={() => reinspect.mutate({ id: ncr.id, result: 'FAIL' })}>
            FAIL
          </Button>
        </>
      ) : null}
    </div>
  );
}
