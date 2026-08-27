import { useState } from 'react';
import { Badge, Button, Input } from '@aec/ui';
import { createColumnHelper } from '@tanstack/react-table';
import { useInvestigateIncident, useResolveIncident } from '../model/hse.api';
import type { HseIncident } from '@aec/api-contracts';
import { severityVariant } from './hse-shared';

const incHelper = createColumnHelper<HseIncident>();

function IncidentActions({ incident }: { incident: HseIncident }) {
  const investigate = useInvestigateIncident();
  const resolve = useResolveIncident();
  const [rootCause, setRootCause] = useState('');
  if (incident.status === 'RESOLVED') return null;
  return (
    <div className="flex items-center gap-1">
      {incident.status === 'OPEN' ? (
        <Input
          placeholder="Root cause…"
          value={rootCause}
          onChange={(e) => setRootCause(e.target.value)}
          className="h-8 w-40"
          onKeyDown={(e) => e.key === 'Enter' && rootCause && investigate.mutate({ id: incident.id, rootCause })}
        />
      ) : null}
      {incident.status === 'OPEN' ? (
        <Button size="sm" variant="secondary" disabled={!rootCause} loading={investigate.isPending} onClick={() => investigate.mutate({ id: incident.id, rootCause })}>
          Investigasi
        </Button>
      ) : null}
      <Button size="sm" variant="ghost" loading={resolve.isPending} onClick={() => resolve.mutate({ id: incident.id })}>
        Resolve
      </Button>
    </div>
  );
}

export const incidentColumns = [
  incHelper.accessor('incidentNumber', { header: 'No. Insiden', cell: (info) => <span className="font-mono text-neutral-800">{info.getValue()}</span> }),
  incHelper.accessor('severity', { header: 'Severity', cell: (info) => <Badge variant={severityVariant[info.getValue()] ?? 'default'}>{info.getValue()}</Badge> }),
  incHelper.accessor('type', { header: 'Tipe', cell: (info) => <Badge variant="default">{info.getValue()}</Badge> }),
  incHelper.accessor('description', { header: 'Deskripsi', cell: (info) => <span className="max-w-xs truncate text-neutral-700">{info.getValue()}</span> }),
  incHelper.accessor('rootCause', { header: 'Root Cause', cell: (info) => <span className="max-w-xs truncate text-neutral-600">{info.getValue() ?? '-'}</span> }),
  incHelper.accessor('status', { header: 'Status', cell: (info) => <Badge variant={info.getValue() === 'RESOLVED' ? 'success' : info.getValue() === 'INVESTIGATING' ? 'default' : 'warning'}>{info.getValue()}</Badge> }),
  incHelper.display({ id: 'actions', header: '', cell: ({ row }) => <IncidentActions incident={row.original} /> }),
];
