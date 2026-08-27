import { useState } from 'react';
import { Button, DataGrid } from '@aec/ui';
import {
  useClients,
  useOpportunities,
  useContracts,
} from '@/features/commercial';
import {
  clientColumns,
  oppColumns,
  contractColumns,
  ClientForm,
  OpportunityForm,
  ContractForm,
} from '@/features/commercial/ui';

const PAGE_SIZE = 20;

type Tab = 'clients' | 'opportunities' | 'contracts';

const TABS: { key: Tab; label: string }[] = [
  { key: 'clients', label: 'Client' },
  { key: 'opportunities', label: 'Opportunity' },
  { key: 'contracts', label: 'Kontrak' },
];

const FORM: Record<Tab, React.ComponentType<{ onDone: () => void }>> = {
  clients: ClientForm,
  opportunities: OpportunityForm,
  contracts: ContractForm,
};

export function CommercialPage() {
  const [tab, setTab] = useState<Tab>('clients');
  const [page, setPage] = useState(1);
  const [showForm, setShowForm] = useState(false);

  const clients = useClients({ page, pageSize: PAGE_SIZE });
  const opportunities = useOpportunities({ page, pageSize: PAGE_SIZE });
  const contracts = useContracts({ page, pageSize: PAGE_SIZE });

  const gridProps = { page, pageSize: PAGE_SIZE, onPageChange: setPage };

  const ActiveForm = showForm ? FORM[tab] : null;

  return (
    <div className="space-y-4 p-6">
      <div className="flex items-center justify-between">
        <h1 className="text-heading-2 font-semibold text-neutral-900">Commercial</h1>
        <Button onClick={() => setShowForm((v) => !v)}>
          {showForm ? 'Tutup' : '+ Baru'}
        </Button>
      </div>

      <div className="flex gap-1 border-b border-neutral-200">
        {TABS.map(({ key, label }) => (
          <button
            key={key}
            onClick={() => { setTab(key); setPage(1); setShowForm(false); }}
            className={`px-4 py-2 text-body font-medium transition-colors ${
              tab === key
                ? 'border-b-2 border-primary-600 text-primary-600'
                : 'text-neutral-500 hover:text-neutral-700'
            }`}
          >
            {label}
          </button>
        ))}
      </div>

      {ActiveForm && <ActiveForm onDone={() => setShowForm(false)} />}

      <div className="rounded-md border border-neutral-200 bg-white shadow-xs">
        {tab === 'clients' && (
          <DataGrid
            columns={clientColumns}
            data={clients.data?.items ?? []}
            rowCount={clients.data?.total ?? 0}
            isLoading={clients.isLoading}
            isError={clients.isError}
            onRetry={() => clients.refetch()}
            emptyMessage="Belum ada client"
            {...gridProps}
          />
        )}
        {tab === 'opportunities' && (
          <DataGrid
            columns={oppColumns}
            data={opportunities.data?.items ?? []}
            rowCount={opportunities.data?.total ?? 0}
            isLoading={opportunities.isLoading}
            isError={opportunities.isError}
            onRetry={() => opportunities.refetch()}
            emptyMessage="Belum ada opportunity"
            {...gridProps}
          />
        )}
        {tab === 'contracts' && (
          <DataGrid
            columns={contractColumns}
            data={contracts.data?.items ?? []}
            rowCount={contracts.data?.total ?? 0}
            isLoading={contracts.isLoading}
            isError={contracts.isError}
            onRetry={() => contracts.refetch()}
            emptyMessage="Belum ada kontrak"
            {...gridProps}
          />
        )}
      </div>
    </div>
  );
}
