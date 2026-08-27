import { useState } from 'react';
import { Button, EntitySelect } from '@aec/ui';
import { useLegalEntities } from '@/entities/legal-entity';
import { useChartOfAccounts } from '@/features/finance';
import { CoaForm, ChartOfAccountTable } from '@/features/finance/ui';

export function ChartOfAccountPage() {
  const [entityId, setEntityId] = useState('');
  const [showForm, setShowForm] = useState(false);
  const entities = useLegalEntities({ page: 1, pageSize: 100 });
  const defaultEntityId = entityId || entities.data?.items[0]?.id || '';

  const { data: accounts, isLoading, isError, refetch } = useChartOfAccounts({ legalEntityId: defaultEntityId || undefined });

  return (
    <div>
      <div className="mb-6 flex items-center justify-between">
        <div>
          <h1 className="text-h1 text-neutral-950">Chart of Accounts</h1>
          <p className="mt-1 text-body-sm text-neutral-500">Daftar akun GL (FR-FIN-002)</p>
        </div>
        <div className="flex items-center gap-3">
          <EntitySelect
            value={defaultEntityId}
            onValueChange={(v) => { setEntityId(v); setShowForm(false); }}
            options={(entities.data?.items ?? []).map((e) => ({ value: e.id, label: e.code }))}
            placeholder="Pilih entity…"
            searchPlaceholder="Cari entity…"
            className="w-48"
          />
          {defaultEntityId && <Button size="sm" onClick={() => setShowForm((s) => !s)}>{showForm ? 'Tutup' : '+ Tambah Akun'}</Button>}
        </div>
      </div>

      {showForm && defaultEntityId && <CoaForm onDone={() => setShowForm(false)} entityId={defaultEntityId} />}

      <div className="rounded-md border border-neutral-200 bg-white shadow-xs">
        {isLoading && <p className="p-4 text-body-sm text-neutral-500">Memuat…</p>}
        {isError && (
          <div className="flex items-center justify-between p-4">
            <p className="text-body-sm text-destructive-600">Gagal memuat akun.</p>
            <Button size="sm" variant="secondary" onClick={() => refetch()}>Ulangi</Button>
          </div>
        )}
        {!isLoading && !isError && <ChartOfAccountTable accounts={accounts ?? []} />}
      </div>
    </div>
  );
}
