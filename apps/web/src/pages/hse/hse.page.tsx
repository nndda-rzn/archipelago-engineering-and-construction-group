import { useState } from 'react';
import { createColumnHelper } from '@tanstack/react-table';
import { Badge, Button, DataGrid, Input, Label } from '@aec/ui';
import { useProjects } from '@/entities/project';
import {
  useObservations, useCreateObservation, useResolveObservation,
  useIncidents, useCreateIncident, useInvestigateIncident, useResolveIncident,
  useCreateCorrectiveAction, useVerifyCorrectiveAction,
  usePermits, useCreatePermit, useRevokePermit,
  type SafetyObservation, type HseIncident, type PermitToWork, type CorrectiveAction,
} from '@/features/hse';

const PAGE_SIZE = 20;

const severityVariant: Record<string, 'default' | 'success' | 'warning'> = {
  LOW: 'success',
  MEDIUM: 'default',
  HIGH: 'warning',
  CRITICAL: 'warning',
};

const obsHelper = createColumnHelper<SafetyObservation>();
const incHelper = createColumnHelper<HseIncident>();
const permitHelper = createColumnHelper<PermitToWork>();
const caHelper = createColumnHelper<CorrectiveAction>();

const observationColumns = [
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
    cell: ({ row }) => {
      const resolve = useResolveObservation();
      if (row.original.status !== 'OPEN') return null;
      return (
        <Button size="sm" variant="secondary" loading={resolve.isPending} onClick={() => resolve.mutate({ id: row.original.id })}>
          Resolve
        </Button>
      );
    },
  }),
];

const incidentColumns = [
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
    cell: (info) => <span className="max-w-xs truncate text-neutral-600">{info.getValue() ?? '—'}</span>,
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

const caColumns = [
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
    cell: ({ row }) => {
      const verify = useVerifyCorrectiveAction();
      if (row.original.status === 'VERIFIED') return null;
      return (
        <Button size="sm" variant="secondary" loading={verify.isPending} onClick={() => verify.mutate({ id: row.original.id, evidence: 'done' })}>
          Verifikasi
        </Button>
      );
    },
  }),
];

const permitColumns = [
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
    cell: ({ row }) => {
      const revoke = useRevokePermit();
      if (row.original.status !== 'ACTIVE') return null;
      return (
        <Button size="sm" variant="ghost" loading={revoke.isPending} onClick={() => revoke.mutate({ id: row.original.id })}>
          Cabut
        </Button>
      );
    },
  }),
];

function ObservationForm({ onDone }: { onDone: () => void }) {
  const [type, setType] = useState('UNSAFE');
  const [description, setDescription] = useState('');
  const create = useCreateObservation();
  const onSubmit = () => {
    if (!description) return;
    create.mutate(
      { type, description },
      { onSuccess: () => { setDescription(''); onDone(); } },
    );
  };
  return (
    <div className="mb-4 rounded-md border border-neutral-200 bg-white p-4 shadow-xs">
      <div className="flex items-end gap-3">
        <div>
          <Label htmlFor="obs-type">Tipe</Label>
          <select id="obs-type" value={type} onChange={(e) => setType(e.target.value)} className="flex h-9 rounded-md border border-neutral-200 bg-white px-3 text-body">
            <option value="UNSAFE">UNSAFE</option>
            <option value="SAFE">SAFE</option>
          </select>
        </div>
        <div className="flex-1">
          <Label htmlFor="obs-desc">Deskripsi</Label>
          <Input id="obs-desc" value={description} onChange={(e) => setDescription(e.target.value)} />
        </div>
        <Button onClick={onSubmit} loading={create.isPending}>Buat Observasi</Button>
      </div>
    </div>
  );
}

function IncidentForm({ onDone }: { onDone: () => void }) {
  const [type, setType] = useState('NEAR_MISS');
  const [severity, setSeverity] = useState('MEDIUM');
  const [description, setDescription] = useState('');
  const create = useCreateIncident();
  const onSubmit = () => {
    if (!description) return;
    create.mutate(
      { type, severity, description },
      { onSuccess: () => { setDescription(''); onDone(); } },
    );
  };
  return (
    <div className="mb-4 rounded-md border border-neutral-200 bg-white p-4 shadow-xs">
      <div className="flex items-end gap-3">
        <div>
          <Label htmlFor="inc-type">Tipe</Label>
          <select id="inc-type" value={type} onChange={(e) => setType(e.target.value)} className="flex h-9 rounded-md border border-neutral-200 bg-white px-3 text-body">
            <option value="NEAR_MISS">NEAR_MISS</option>
            <option value="INJURY">INJURY</option>
            <option value="PROPERTY">PROPERTY</option>
            <option value="ENVIRONMENT">ENVIRONMENT</option>
          </select>
        </div>
        <div>
          <Label htmlFor="inc-sev">Severity</Label>
          <select id="inc-sev" value={severity} onChange={(e) => setSeverity(e.target.value)} className="flex h-9 rounded-md border border-neutral-200 bg-white px-3 text-body">
            <option value="LOW">LOW</option>
            <option value="MEDIUM">MEDIUM</option>
            <option value="HIGH">HIGH</option>
            <option value="CRITICAL">CRITICAL</option>
          </select>
        </div>
        <div className="flex-1">
          <Label htmlFor="inc-desc">Deskripsi</Label>
          <Input id="inc-desc" value={description} onChange={(e) => setDescription(e.target.value)} />
        </div>
        <Button onClick={onSubmit} loading={create.isPending}>Buat Insiden</Button>
      </div>
    </div>
  );
}

function PermitForm({ onDone }: { onDone: () => void }) {
  const [area, setArea] = useState('');
  const [issuedTo, setIssuedTo] = useState('');
  const [validFrom, setValidFrom] = useState('');
  const [validTo, setValidTo] = useState('');
  const create = useCreatePermit();
  const onSubmit = () => {
    if (!area || !issuedTo || !validFrom || !validTo) return;
    create.mutate(
      { area, issuedTo, validFrom, validTo },
      { onSuccess: () => { setArea(''); setIssuedTo(''); setValidFrom(''); setValidTo(''); onDone(); } },
    );
  };
  return (
    <div className="mb-4 rounded-md border border-neutral-200 bg-white p-4 shadow-xs">
      <div className="flex items-end gap-3">
        <div>
          <Label htmlFor="ptw-area">Area</Label>
          <Input id="ptw-area" value={area} onChange={(e) => setArea(e.target.value)} />
        </div>
        <div>
          <Label htmlFor="ptw-to">Diterbitkan ke</Label>
          <Input id="ptw-to" value={issuedTo} onChange={(e) => setIssuedTo(e.target.value)} />
        </div>
        <div>
          <Label htmlFor="ptw-from">Dari</Label>
          <Input id="ptw-from" type="date" value={validFrom} onChange={(e) => setValidFrom(e.target.value)} />
        </div>
        <div>
          <Label htmlFor="ptw-until">Sampai</Label>
          <Input id="ptw-until" type="date" value={validTo} onChange={(e) => setValidTo(e.target.value)} />
        </div>
        <Button onClick={onSubmit} loading={create.isPending}>Terbitkan PTW</Button>
      </div>
    </div>
  );
}

type Tab = 'observations' | 'incidents' | 'permits';

export function HsePage() {
  const [tab, setTab] = useState<Tab>('observations');
  const [pagination, setPagination] = useState({ pageIndex: 0, pageSize: PAGE_SIZE });
  const [showForm, setShowForm] = useState(false);
  const [selectedIncident, setSelectedIncident] = useState<HseIncident | null>(null);
  const obs = useObservations({ page: pagination.pageIndex + 1, pageSize: pagination.pageSize });
  const incidents = useIncidents({ page: pagination.pageIndex + 1, pageSize: pagination.pageSize });
  const permits = usePermits({ page: pagination.pageIndex + 1, pageSize: pagination.pageSize });
  const createCa = useCreateCorrectiveAction();
  const [caAction, setCaAction] = useState('');
  const [caOwner, setCaOwner] = useState('');
  const [caDue, setCaDue] = useState('');

  const gridProps = {
    pagination,
    onPaginationChange: setPagination,
  };

  return (
    <div>
      <div className="mb-6 flex items-center justify-between">
        <div>
          <h1 className="text-h1 text-neutral-950">HSE</h1>
          <p className="mt-1 text-body-sm text-neutral-500">Safety observation, insiden, permit to work, corrective action (FR-HSE-001..005)</p>
        </div>
        <Button size="sm" onClick={() => setShowForm((s) => !s)}>
          {showForm ? 'Tutup' : '+ Buat Baru'}
        </Button>
      </div>

      <div className="mb-4 flex gap-2">
        {(['observations', 'incidents', 'permits'] as Tab[]).map((t) => (
          <button
            key={t}
            onClick={() => { setTab(t); setShowForm(false); setSelectedIncident(null); }}
            className={`rounded-md px-3 py-1.5 text-body-sm font-medium transition-colors ${
              tab === t ? 'bg-racing-red-600 text-white' : 'bg-white text-neutral-600 border border-neutral-200 hover:border-neutral-300'
            }`}
          >
            {t === 'observations' ? 'Observasi' : t === 'incidents' ? `Insiden (${incidents.data?.total ?? 0})` : 'Permit to Work'}
          </button>
        ))}
      </div>

      {showForm && tab === 'observations' && <ObservationForm onDone={() => setShowForm(false)} />}
      {showForm && tab === 'incidents' && <IncidentForm onDone={() => setShowForm(false)} />}
      {showForm && tab === 'permits' && <PermitForm onDone={() => setShowForm(false)} />}

      {tab === 'observations' && (
        <div className="rounded-md border border-neutral-200 bg-white shadow-xs">
          <DataGrid
            columns={observationColumns}
            data={obs.data?.items ?? []}
            rowCount={obs.data?.total ?? 0}
            isLoading={obs.isLoading}
            isError={obs.isError}
            onRetry={() => obs.refetch()}
            emptyMessage="Belum ada observasi"
            {...gridProps}
          />
        </div>
      )}

      {tab === 'incidents' && (
        <div className="rounded-md border border-neutral-200 bg-white shadow-xs">
          <DataGrid
            columns={incidentColumns}
            data={incidents.data?.items ?? []}
            rowCount={incidents.data?.total ?? 0}
            isLoading={incidents.isLoading}
            isError={incidents.isError}
            onRetry={() => incidents.refetch()}
            onRowClick={(row) => setSelectedIncident(row.original)}
            emptyMessage="Belum ada insiden"
            {...gridProps}
          />
        </div>
      )}

      {tab === 'permits' && (
        <div className="rounded-md border border-neutral-200 bg-white shadow-xs">
          <DataGrid
            columns={permitColumns}
            data={permits.data?.items ?? []}
            rowCount={permits.data?.total ?? 0}
            isLoading={permits.isLoading}
            isError={permits.isError}
            onRetry={() => permits.refetch()}
            emptyMessage="Belum ada permit"
            {...gridProps}
          />
        </div>
      )}

      {selectedIncident && (
        <div className="mt-6 rounded-md border border-neutral-200 bg-white p-4 shadow-xs">
          <h2 className="text-h2 text-neutral-950">{selectedIncident.incidentNumber} — Corrective Actions</h2>
          <p className="text-caption text-neutral-500">{selectedIncident.description} · Klik baris lain untuk ganti</p>
          <div className="mt-4 flex flex-wrap items-end gap-2 border-t border-neutral-100 pt-4">
            <div>
              <Label htmlFor="ca-action">Tindakan</Label>
              <Input id="ca-action" placeholder="mis. Pasang railing" value={caAction} onChange={(e) => setCaAction(e.target.value)} />
            </div>
            <div>
              <Label htmlFor="ca-owner">Owner</Label>
              <Input id="ca-owner" placeholder="mis. Tim HSE" value={caOwner} onChange={(e) => setCaOwner(e.target.value)} />
            </div>
            <div>
              <Label htmlFor="ca-due">Jatuh Tempo</Label>
              <Input id="ca-due" type="date" value={caDue} onChange={(e) => setCaDue(e.target.value)} />
            </div>
            <Button
              loading={createCa.isPending}
              disabled={!caAction || !caOwner || !caDue}
              onClick={() => {
                createCa.mutate(
                  { sourceType: 'INCIDENT', sourceId: selectedIncident.id, action: caAction, owner: caOwner, dueDate: caDue },
                  { onSuccess: () => { setCaAction(''); setCaOwner(''); setCaDue(''); } },
                );
              }}
            >
              Tambah CA
            </Button>
          </div>
          <div className="mt-4">
            <DataGrid columns={caColumns} data={selectedIncident.correctiveActions ?? []} emptyMessage="Belum ada corrective action" />
          </div>
        </div>
      )}
    </div>
  );
}
