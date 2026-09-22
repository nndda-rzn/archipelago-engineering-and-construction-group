import { useState } from 'react';
import { Badge, Button, Input, StatusBadge } from '@aec/ui';
import { createColumnHelper } from '@tanstack/react-table';
import { useDisposeNcr, useReinspectNcr } from '../model/quality.api';
import type { Ncr } from '@aec/api-contracts';

const ncrHelper = createColumnHelper<Ncr>();

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

export const ncrColumns = [
  ncrHelper.accessor('ncrNumber', { header: 'No. NCR', cell: (info) => <span className="font-mono text-neutral-800">{info.getValue()}</span> }),
  ncrHelper.accessor('severity', { header: 'Severity', cell: (info) => <Badge variant={info.getValue() === 'CRITICAL' ? 'warning' : info.getValue() === 'MAJOR' ? 'warning' : 'default'}>{info.getValue()}</Badge> }),
  ncrHelper.accessor('category', { header: 'Kategori', cell: (info) => <Badge variant="default">{info.getValue()}</Badge> }),
  ncrHelper.accessor('description', { header: 'Deskripsi', cell: (info) => <span className="max-w-xs truncate text-neutral-700">{info.getValue()}</span> }),
  ncrHelper.accessor('reinspectionResult', { header: 'Re-inspeksi', cell: (info) => (info.getValue() ? <Badge variant={info.getValue() === 'PASS' ? 'success' : 'warning'}>{info.getValue()}</Badge> : '-') }),
  ncrHelper.accessor('status', { header: 'Status', cell: ({ row }) => <StatusBadge status={row.original.status} /> }),
  ncrHelper.display({ id: 'actions', header: '', cell: ({ row }) => <NcrActions ncr={row.original} /> }),
];
