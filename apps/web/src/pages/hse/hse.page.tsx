import { useState } from 'react';
import { Button, DataGrid, Input, Label } from '@aec/ui';
import { useCreateCorrectiveAction, useIncidents, useObservations, usePermits, type HseIncident } from '@/features/hse';
import { ObservationForm, IncidentForm, PermitForm, observationColumns, incidentColumns, permitColumns, caColumns } from '@/features/hse/ui';

const PAGE_SIZE = 20;

type Tab = 'observations' | 'incidents' | 'permits';

const TAB_LABELS: Record<Tab, string> = {
  observations: 'Observasi',
  incidents: 'Insiden',
  permits: 'Permit to Work',
};

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

  const gridProps = { pagination, onPaginationChange: setPagination };

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

      <div className="mb-4 flex flex-wrap gap-2">
        {(['observations', 'incidents', 'permits'] as Tab[]).map((t) => (
          <button
            key={t}
            onClick={() => { setTab(t); setShowForm(false); setSelectedIncident(null); }}
            className={`rounded-md px-3 py-1.5 text-body-sm font-medium transition-colors ${
              tab === t ? 'bg-racing-red-600 text-white' : 'border border-neutral-200 bg-white text-neutral-600 hover:border-neutral-300'
            }`}
          >
            {t === 'incidents' ? `Insiden (${incidents.data?.total ?? 0})` : TAB_LABELS[t]}
          </button>
        ))}
      </div>

      {showForm && tab === 'observations' && <ObservationForm onDone={() => setShowForm(false)} />}
      {showForm && tab === 'incidents' && <IncidentForm onDone={() => setShowForm(false)} />}
      {showForm && tab === 'permits' && <PermitForm onDone={() => setShowForm(false)} />}

      {tab === 'observations' && (
        <div className="rounded-md border border-neutral-200 bg-white shadow-xs">
          <DataGrid columns={observationColumns} data={obs.data?.items ?? []} rowCount={obs.data?.total ?? 0} isLoading={obs.isLoading} isError={obs.isError} onRetry={() => obs.refetch()} emptyMessage="Belum ada observasi" {...gridProps} />
        </div>
      )}

      {tab === 'incidents' && (
        <div className="rounded-md border border-neutral-200 bg-white shadow-xs">
          <DataGrid columns={incidentColumns} data={incidents.data?.items ?? []} rowCount={incidents.data?.total ?? 0} isLoading={incidents.isLoading} isError={incidents.isError} onRetry={() => incidents.refetch()} onRowClick={(row) => setSelectedIncident(row.original)} emptyMessage="Belum ada insiden" {...gridProps} />
        </div>
      )}

      {tab === 'permits' && (
        <div className="rounded-md border border-neutral-200 bg-white shadow-xs">
          <DataGrid columns={permitColumns} data={permits.data?.items ?? []} rowCount={permits.data?.total ?? 0} isLoading={permits.isLoading} isError={permits.isError} onRetry={() => permits.refetch()} emptyMessage="Belum ada permit" {...gridProps} />
        </div>
      )}

      {selectedIncident && (
        <div className="mt-6 rounded-md border border-neutral-200 bg-white p-4 shadow-xs">
          <h2 className="text-h2 text-neutral-950">{selectedIncident.incidentNumber} - Corrective Actions</h2>
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
