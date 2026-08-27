import { useState } from 'react';
import { Badge, Button, Input } from '@aec/ui';
import { createColumnHelper } from '@tanstack/react-table';
import { useInvestigateIncident, useResolveIncident, useResolveObservation, useRevokePermit, useVerifyCorrectiveAction } from '../model/hse.api';
import type { CorrectiveAction, HseIncident, PermitToWork, SafetyObservation } from '@aec/api-contracts';

export const severityVariant: Record<string, 'default' | 'success' | 'warning'> = {
  LOW: 'success',
  MEDIUM: 'default',
  HIGH: 'warning',
  CRITICAL: 'warning',
};

const obsHelper = createColumnHelper<SafetyObservation>();
const incHelper = createColumnHelper<HseIncident>();
const permitHelper = createColumnHelper<PermitToWork>();
const caHelper = createColumnHelper<CorrectiveAction>();

export const observationColumns = [
  obsHelper.accessor('observationNumber', {
    header: 'No.',
    cell: (info) => <span className="font-mono text-neutral-800">{info.getValue()}</span>,
  }),
  obsHelper.accessor('type', {
    header: 'Tipe',
    cell: (info) => <Badge variant={info.getValue() === 'UNSAFE' ? 'warning' : 'success'}>{info.getValue()}</Badge>,
  }),
  obsHelper.accessor('description', {
    header: 'Deskripsi',
    cell: (info) => <span className="text-neutral-700">{info.getValue()}</span>,
  }),
  obsHelper.accessor('status', {
    header: 'Status',
    cell: (info) => <Badge variant={info.getValue() === 'OPEN' ? 'warning' : 'success'}>{info.getValue()}</Badge>,
  }),
  obsHelper.display({
    id: 'actions',
    header: '',
    cell: ({ row }) => <ResolveObservationCell observation={row.original} />,
  }),
];

function ResolveObservationCell({ observation }: { observation: SafetyObservation }) {
  const resolve = useResolveObservation();
  if (observation.status !== 'OPEN') return null;
  return <Button size="sm" variant="secondary" loading={resolve.isPending} onClick={() => resolve.mutate({ id: observation.id })}>Resolve</Button>;
}

export const incidentColumns = [
  incHelper.accessor('incidentNumber', {
    header: 'No. Insiden',
    cell: (info) => <span className="font-mono text-neutral-800">{info.getValue()}</span>,
  }),
  incHelper.accessor('severity', {
    header: 'Severity',
    cell: (info) => <Badge variant={severityVariant[info.getValue()] ?? 'default'}>{info.getValue()}</Badge>,
  }),
  incHelper.accessor('type', {
    header: 'Tipe',
    cell: (info) => <Badge variant="default">{info.getValue()}</Badge>,
  }),
  incHelper.accessor('description', {
    header: 'Deskripsi',
    cell: (info) => <span className="max-w-xs truncate text-neutral-700">{info.getValue()}</span>,
  }),
  incHelper.accessor('rootCause', {
    header: 'Root Cause',
    cell: (info) => <span className="max-w-xs truncate text-neutral-600">{info.getValue() ?? '-'}</span>,
  }),
  incHelper.accessor('status', {
    header: 'Status',
    cell: (info) => <Badge variant={info.getValue() === 'RESOLVED' ? 'success' : info.getValue() === 'INVESTIGATING' ? 'default' : 'warning'}>{info.getValue()}</Badge>,
  }),
  incHelper.display({
    id: 'actions',
    header: '',
    cell: ({ row }) => <IncidentActions incident={row.original} />,
  }),
];

export const caColumns = [
  caHelper.accessor('action', {
    header: 'Tindakan',
    cell: (info) => <span className="text-neutral-700">{info.getValue()}</span>,
  }),
  caHelper.accessor('owner', {
    header: 'Owner',
    cell: (info) => <span className="text-neutral-600">{info.getValue()}</span>,
  }),
  caHelper.accessor('dueDate', {
    header: 'Jatuh Tempo',
    cell: (info) => <span className="font-mono text-neutral-600">{new Date(info.getValue()).toLocaleDateString('id-ID')}</span>,
  }),
  caHelper.accessor('status', {
    header: 'Status',
    cell: (info) => <Badge variant={info.getValue() === 'VERIFIED' ? 'success' : 'default'}>{info.getValue()}</Badge>,
  }),
  caHelper.display({
    id: 'actions',
    header: '',
    cell: ({ row }) => <VerifyCaCell ca={row.original} />,
  }),
];

function VerifyCaCell({ ca }: { ca: CorrectiveAction }) {
  const verify = useVerifyCorrectiveAction();
  if (ca.status === 'VERIFIED') return null;
  return <Button size="sm" variant="secondary" loading={verify.isPending} onClick={() => verify.mutate({ id: ca.id, evidence: 'done' })}>Verifikasi</Button>;
}

export const permitColumns = [
  permitHelper.accessor('permitNumber', {
    header: 'No. PTW',
    cell: (info) => <span className="font-mono text-neutral-800">{info.getValue()}</span>,
  }),
  permitHelper.accessor('area', {
    header: 'Area',
    cell: (info) => <span className="text-neutral-700">{info.getValue()}</span>,
  }),
  permitHelper.accessor('validFrom', {
    header: 'Berlaku Dari',
    cell: (info) => <span className="font-mono text-neutral-600">{new Date(info.getValue()).toLocaleDateString('id-ID')}</span>,
  }),
  permitHelper.accessor('validTo', {
    header: 'Sampai',
    cell: (info) => <span className="font-mono text-neutral-600">{new Date(info.getValue()).toLocaleDateString('id-ID')}</span>,
  }),
  permitHelper.accessor('issuedTo', {
    header: 'Diterbitkan ke',
    cell: (info) => <span className="text-neutral-600">{info.getValue()}</span>,
  }),
  permitHelper.accessor('status', {
    header: 'Status',
    cell: (info) => <Badge variant={info.getValue() === 'ACTIVE' ? 'success' : 'warning'}>{info.getValue()}</Badge>,
  }),
  permitHelper.display({
    id: 'actions',
    header: '',
    cell: ({ row }) => <RevokePermitCell permit={row.original} />,
  }),
];

function RevokePermitCell({ permit }: { permit: PermitToWork }) {
  const revoke = useRevokePermit();
  if (permit.status !== 'ACTIVE') return null;
  return <Button size="sm" variant="ghost" loading={revoke.isPending} onClick={() => revoke.mutate({ id: permit.id })}>Cabut</Button>;
}

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
 