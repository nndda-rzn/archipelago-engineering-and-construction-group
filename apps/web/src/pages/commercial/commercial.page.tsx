import { useState } from 'react';
import { createColumnHelper } from '@tanstack/react-table';
import { Badge, Button, DataGrid, Input, Label } from '@aec/ui';
import { useClients, useCreateClient, useOpportunities, useCreateOpportunity, useUpdateOpportunityStage, useContracts, useCreateContract, useExecuteContract, type Client, type Opportunity, type Contract } from '@/features/commercial';
import { useProjects } from '@/entities/project';
import { formatIdr as fmt } from '@/shared/lib/format';

const PAGE_SIZE = 20;

const statusVariant: Record<string, 'default' | 'success' | 'warning'> = {
  ACTIVE: 'success',
  OPEN: 'success',
  DRAFT: 'default',
  EXECUTED: 'success',
  WON: 'success',
  LOST: 'warning',
  COMPLETED: 'success',
  TERMINATED: 'warning',
};

const clientHelper = createColumnHelper<Client>();
const oppHelper = createColumnHelper<Opportunity>();
const contractHelper = createColumnHelper<Contract>();

const clientColumns = [
  clientHelper.accessor('clientCode', {
    header: 'Kode',
    cell: (info) => <span className="font-mono text-neutral-800">{info.getValue()}</span>,
  }),
  clientHelper.accessor('name', {
    header: 'Client',
    cell: (info) => <span className="text-neutral-800 font-medium">{info.getValue()}</span>,
  }),
  clientHelper.accessor('industry', {
    header: 'Industri',
    cell: (info) => <span className="text-neutral-600">{info.getValue() ?? '—'}</span>,
  }),
  clientHelper.accessor('contactPerson', {
    header: 'Kontak',
    cell: (info) => <span className="text-neutral-600">{info.getValue() ?? '—'}</span>,
  }),
  clientHelper.accessor('email', {
    header: 'Email',
    cell: (info) => <span className="font-mono text-neutral-500">{info.getValue() ?? '—'}</span>,
  }),
  clientHelper.accessor('status', {
    header: 'Status',
    cell: (info) => <Badge variant={statusVariant[info.getValue()] ?? 'default'}>{info.getValue()}</Badge>,
  }),
];

const oppColumns = [
  oppHelper.accessor('oppNumber', {
    header: 'No.',
    cell: (info) => <span className="font-mono text-neutral-800">{info.getValue()}</span>,
  }),
  oppHelper.accessor('title', {
    header: 'Opportunity',
    cell: (info) => <span className="max-w-xs truncate text-neutral-800">{info.getValue()}</span>,
  }),
  oppHelper.accessor('client', {
    header: 'Client',
    cell: (info) => <span className="text-neutral-700">{info.getValue()?.name}</span>,
  }),
  oppHelper.accessor('stage', {
    header: 'Stage',
    cell: (info) => <Badge variant={info.getValue() === 'WON' ? 'success' : info.getValue() === 'LOST' ? 'warning' : 'default'}>{info.getValue()}</Badge>,
  }),
  oppHelper.accessor('probability', {
    header: 'Prob.',
    cell: (info) => <span className="font-mono tabular-nums text-neutral-600">{info.getValue()}%</span>,
  }),
  oppHelper.accessor('expectedValue', {
    header: 'Nilai',
    cell: (info) => <span className="font-mono tabular-nums text-neutral-800 font-medium">{fmt(info.getValue())}</span>,
  }),
  oppHelper.display({
    id: 'actions',
    header: '',
    cell: ({ row }) => {
      const update = useUpdateOpportunityStage();
      const opp = row.original;
      if (opp.stage === 'WON' || opp.stage === 'LOST') return null;
      const nextStage = opp.stage === 'LEAD' ? 'QUALIFIED' : opp.stage === 'QUALIFIED' ? 'PROPOSAL' : opp.stage === 'PROPOSAL' ? 'NEGOTIATION' : 'WON';
      return (
        <div className="flex items-center gap-1">
          <Button size="sm" variant="secondary" loading={update.isPending} onClick={() => update.mutate({ id: opp.id, stage: nextStage, probability: Math.min(opp.probability + 15, 100) })}>
            → {nextStage}
          </Button>
          <Button size="sm" variant="ghost" loading={update.isPending} onClick={() => update.mutate({ id: opp.id, stage: 'LOST' })}>
            Lost
          </Button>
        </div>
      );
    },
  }),
];

const contractColumns = [
  contractHelper.accessor('contractNumber', {
    header: 'No. Kontrak',
    cell: (info) => <span className="font-mono text-neutral-800">{info.getValue()}</span>,
  }),
  contractHelper.accessor('title', {
    header: 'Judul',
    cell: (info) => <span className="max-w-xs truncate text-neutral-800">{info.getValue()}</span>,
  }),
  contractHelper.accessor('client', {
    header: 'Client',
    cell: (info) => <span className="text-neutral-700">{info.getValue()?.name}</span>,
  }),
  contractHelper.accessor('contractType', {
    header: 'Tipe',
    cell: (info) => <Badge variant="default">{info.getValue()}</Badge>,
  }),
  contractHelper.accessor('value', {
    header: 'Nilai',
    cell: (info) => <span className="font-mono tabular-nums text-neutral-800 font-medium">{fmt(info.getValue())}</span>,
  }),
  contractHelper.accessor('retentionTerm', {
    header: 'Retensi',
    cell: (info) => <span className="font-mono tabular-nums text-neutral-600">{info.getValue()}%</span>,
  }),
  contractHelper.accessor('status', {
    header: 'Status',
    cell: (info) => <Badge variant={statusVariant[info.getValue()] ?? 'default'}>{info.getValue()}</Badge>,
  }),
  contractHelper.display({
    id: 'actions',
    header: '',
    cell: ({ row }) => {
      const execute = useExecuteContract();
      if (row.original.status !== 'DRAFT') return null;
      return (
        <Button size="sm" variant="secondary" loading={execute.isPending} onClick={() => execute.mutate({ id: row.original.id })}>
          Eksekusi
        </Button>
      );
    },
  }),
];

function ClientForm({ onDone }: { onDone: () => void }) {
  const [name, setName] = useState('');
  const [industry, setIndustry] = useState('');
  const [contactPerson, setContactPerson] = useState('');
  const [email, setEmail] = useState('');
  const create = useCreateClient();
  const onSubmit = () => {
    if (!name) return;
    create.mutate(
      { name, industry: industry || undefined, contactPerson: contactPerson || undefined, email: email || undefined },
      { onSuccess: () => { setName(''); setIndustry(''); setContactPerson(''); setEmail(''); onDone(); } },
    );
  };
  return (
    <div className="mb-4 rounded-md border border-neutral-200 bg-white p-4 shadow-xs">
      <div className="flex items-end gap-3">
        <div className="flex-1">
          <Label htmlFor="clt-name">Nama Client</Label>
          <Input id="clt-name" value={name} onChange={(e) => setName(e.target.value)} />
        </div>
        <div>
          <Label htmlFor="clt-industry">Industri</Label>
          <Input id="clt-industry" value={industry} onChange={(e) => setIndustry(e.target.value)} />
        </div>
        <div>
          <Label htmlFor="clt-contact">Kontak</Label>
          <Input id="clt-contact" value={contactPerson} onChange={(e) => setContactPerson(e.target.value)} />
        </div>
        <div>
          <Label htmlFor="clt-email">Email</Label>
          <Input id="clt-email" type="email" value={email} onChange={(e) => setEmail(e.target.value)} />
        </div>
        <Button onClick={onSubmit} loading={create.isPending}>Buat Client</Button>
      </div>
    </div>
  );
}

function OpportunityForm({ onDone }: { onDone: () => void }) {
  const { data: clients } = useClients({ page: 1, pageSize: 100 });
  const [clientId, setClientId] = useState('');
  const [title, setTitle] = useState('');
  const [expectedValue, setExpectedValue] = useState('');
  const [owner, setOwner] = useState('');
  const create = useCreateOpportunity();
  const onSubmit = () => {
    if (!clientId || !title || !expectedValue || !owner) return;
    create.mutate(
      { clientId, title, expectedValue: Number(expectedValue), owner },
      { onSuccess: () => { setTitle(''); setExpectedValue(''); setOwner(''); onDone(); } },
    );
  };
  return (
    <div className="mb-4 rounded-md border border-neutral-200 bg-white p-4 shadow-xs">
      <div className="flex items-end gap-3">
        <div>
          <Label htmlFor="opp-client">Client</Label>
          <select id="opp-client" value={clientId} onChange={(e) => setClientId(e.target.value)} className="flex h-9 rounded-md border border-neutral-200 bg-white px-3 text-body">
            <option value="">Pilih…</option>
            {(clients?.items ?? []).map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
          </select>
        </div>
        <div className="flex-1">
          <Label htmlFor="opp-title">Judul</Label>
          <Input id="opp-title" value={title} onChange={(e) => setTitle(e.target.value)} />
        </div>
        <div>
          <Label htmlFor="opp-value">Nilai</Label>
          <Input id="opp-value" type="number" min={0} value={expectedValue} onChange={(e) => setExpectedValue(e.target.value)} />
        </div>
        <div>
          <Label htmlFor="opp-owner">Owner</Label>
          <Input id="opp-owner" value={owner} onChange={(e) => setOwner(e.target.value)} />
        </div>
        <Button onClick={onSubmit} loading={create.isPending}>Buat Opportunity</Button>
      </div>
    </div>
  );
}

function ContractForm({ onDone }: { onDone: () => void }) {
  const { data: clients } = useClients({ page: 1, pageSize: 100 });
  const { data: projects } = useProjects({ page: 1, pageSize: 100 });
  const [clientId, setClientId] = useState('');
  const [projectId, setProjectId] = useState('');
  const [title, setTitle] = useState('');
  const [value, setValue] = useState('');
  const [contractType, setContractType] = useState('LUMP_SUM');
  const [retentionTerm, setRetentionTerm] = useState('5');
  const create = useCreateContract();
  const onSubmit = () => {
    if (!clientId || !title || !value) return;
    create.mutate(
      {
        clientId,
        projectId: projectId || undefined,
        title,
        value: Number(value),
        contractType,
        retentionTerm: Number(retentionTerm),
      },
      { onSuccess: () => { setTitle(''); setValue(''); onDone(); } },
    );
  };
  return (
    <div className="mb-4 rounded-md border border-neutral-200 bg-white p-4 shadow-xs">
      <div className="flex items-end gap-3">
        <div>
          <Label htmlFor="ctr-client">Client</Label>
          <select id="ctr-client" value={clientId} onChange={(e) => setClientId(e.target.value)} className="flex h-9 rounded-md border border-neutral-200 bg-white px-3 text-body">
            <option value="">Pilih…</option>
            {(clients?.items ?? []).map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
          </select>
        </div>
        <div>
          <Label htmlFor="ctr-project">Project (opsional)</Label>
          <select id="ctr-project" value={projectId} onChange={(e) => setProjectId(e.target.value)} className="flex h-9 rounded-md border border-neutral-200 bg-white px-3 text-body">
            <option value="">Tanpa</option>
            {(projects?.items ?? []).map((p) => <option key={p.id} value={p.id}>{p.code}</option>)}
          </select>
        </div>
        <div className="flex-1">
          <Label htmlFor="ctr-title">Judul Kontrak</Label>
          <Input id="ctr-title" value={title} onChange={(e) => setTitle(e.target.value)} />
        </div>
        <div>
          <Label htmlFor="ctr-type">Tipe</Label>
          <select id="ctr-type" value={contractType} onChange={(e) => setContractType(e.target.value)} className="flex h-9 rounded-md border border-neutral-200 bg-white px-3 text-body">
            <option value="LUMP_SUM">LUMP_SUM</option>
            <option value="UNIT_PRICE">UNIT_PRICE</option>
            <option value="COST_PLUS">COST_PLUS</option>
            <option value="TIME_MATERIAL">TIME_MATERIAL</option>
          </select>
        </div>
        <div>
          <Label htmlFor="ctr-value">Nilai</Label>
          <Input id="ctr-value" type="number" min={0} value={value} onChange={(e) => setValue(e.target.value)} />
        </div>
        <div>
          <Label htmlFor="ctr-ret">Retensi %</Label>
          <Input id="ctr-ret" type="number" min={0} max={100} value={retentionTerm} onChange={(e) => setRetentionTerm(e.target.value)} className="w-16" />
        </div>
        <Button onClick={onSubmit} loading={create.isPending}>Buat Kontrak</Button>
      </div>
    </div>
  );
}

type Tab = 'clients' | 'opportunities' | 'contracts';

export function CommercialPage() {
  const [tab, setTab] = useState<Tab>('clients');
  const [pagination, setPagination] = useState({ pageIndex: 0, pageSize: PAGE_SIZE });
  const [showForm, setShowForm] = useState(false);
  const clients = useClients({ page: pagination.pageIndex + 1, pageSize: pagination.pageSize });
  const opportunities = useOpportunities({ page: pagination.pageIndex + 1, pageSize: pagination.pageSize });
  const contracts = useContracts({ page: pagination.pageIndex + 1, pageSize: pagination.pageSize });

  const gridProps = { pagination, onPaginationChange: setPagination };

  return (
    <div>
      <div className="mb-6 flex items-center justify-between">
        <div>
          <h1 className="text-h1 text-neutral-950">Komersial</h1>
          <p className="mt-1 text-body-sm text-neutral-500">Client, opportunity pipeline, kontrak (Fase 2)</p>
        </div>
        <Button size="sm" onClick={() => setShowForm((s) => !s)}>
          {showForm ? 'Tutup' : '+ Buat Baru'}
        </Button>
      </div>

      <div className="mb-4 flex gap-2">
        {(['clients', 'opportunities', 'contracts'] as Tab[]).map((t) => (
          <button
            key={t}
            onClick={() => { setTab(t); setShowForm(false); }}
            className={`rounded-md px-3 py-1.5 text-body-sm font-medium transition-colors ${
              tab === t ? 'bg-racing-red-600 text-white' : 'bg-white text-neutral-600 border border-neutral-200 hover:border-neutral-300'
            }`}
          >
            {t === 'clients' ? `Client (${clients.data?.total ?? 0})` : t === 'opportunities' ? `Opportunity (${opportunities.data?.total ?? 0})` : `Kontrak (${contracts.data?.total ?? 0})`}
          </button>
        ))}
      </div>

      {showForm && tab === 'clients' && <ClientForm onDone={() => setShowForm(false)} />}
      {showForm && tab === 'opportunities' && <OpportunityForm onDone={() => setShowForm(false)} />}
      {showForm && tab === 'contracts' && <ContractForm onDone={() => setShowForm(false)} />}

      <div className="rounded-md border border-neutral-200 bg-white shadow-xs">
        {tab === 'clients' && <DataGrid columns={clientColumns} data={clients.data?.items ?? []} rowCount={clients.data?.total ?? 0} isLoading={clients.isLoading} isError={clients.isError} onRetry={() => clients.refetch()} emptyMessage="Belum ada client" {...gridProps} />}
        {tab === 'opportunities' && <DataGrid columns={oppColumns} data={opportunities.data?.items ?? []} rowCount={opportunities.data?.total ?? 0} isLoading={opportunities.isLoading} isError={opportunities.isError} onRetry={() => opportunities.refetch()} emptyMessage="Belum ada opportunity" {...gridProps} />}
        {tab === 'contracts' && <DataGrid columns={contractColumns} data={contracts.data?.items ?? []} rowCount={contracts.data?.total ?? 0} isLoading={contracts.isLoading} isError={contracts.isError} onRetry={() => contracts.refetch()} emptyMessage="Belum ada kontrak" {...gridProps} />}
      </div>
    </div>
  );
}
