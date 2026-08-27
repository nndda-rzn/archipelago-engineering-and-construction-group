import { useState } from 'react';
import { createColumnHelper } from '@tanstack/react-table';
import { Badge, Button, DataGrid, Input, Label } from '@aec/ui';
import {
  useVendors, useCreateVendor, useFiscalPeriods, useCreateFiscalPeriod, useUpdateFiscalPeriodStatus,
  type Vendor, type FiscalPeriod,
} from '@/features/master-data';

const PAGE_SIZE = 20;

const statusVariant: Record<string, 'default' | 'success' | 'warning'> = {
  ACTIVE: 'success',
  OPEN: 'success',
  CLOSED: 'warning',
  LOCKED: 'warning',
  SOFT_CLOSED: 'default',
  FUTURE: 'default',
  INACTIVE: 'warning',
};

const vendorHelper = createColumnHelper<Vendor>();
const periodHelper = createColumnHelper<FiscalPeriod>();

const vendorColumns = [
  vendorHelper.accessor('vendorCode', {
    header: 'Kode',
    cell: (info) => <span className="font-mono text-neutral-800">{info.getValue()}</span>,
  }),
  vendorHelper.accessor('name', {
    header: 'Vendor',
    cell: (info) => <span className="text-neutral-800 font-medium">{info.getValue()}</span>,
  }),
  vendorHelper.accessor('taxId', {
    header: 'NPWP',
    cell: (info) => <span className="font-mono text-neutral-600">{info.getValue() ?? '—'}</span>,
  }),
  vendorHelper.accessor('category', {
    header: 'Kategori',
    cell: (info) => <Badge variant="default">{info.getValue()}</Badge>,
  }),
  vendorHelper.accessor('contactPerson', {
    header: 'Kontak',
    cell: (info) => <span className="text-neutral-600">{info.getValue() ?? '—'}</span>,
  }),
  vendorHelper.accessor('status', {
    header: 'Status',
    cell: (info) => <Badge variant={statusVariant[info.getValue()] ?? 'default'}>{info.getValue()}</Badge>,
  }),
];

const periodColumns = [
  periodHelper.accessor('periodCode', {
    header: 'Periode',
    cell: (info) => <span className="font-mono text-neutral-800">{info.getValue()}</span>,
  }),
  periodHelper.accessor('startDate', {
    header: 'Mulai',
    cell: (info) => <span className="font-mono text-neutral-600">{new Date(info.getValue()).toLocaleDateString('id-ID')}</span>,
  }),
  periodHelper.accessor('endDate', {
    header: 'Selesai',
    cell: (info) => <span className="font-mono text-neutral-600">{new Date(info.getValue()).toLocaleDateString('id-ID')}</span>,
  }),
  periodHelper.accessor('status', {
    header: 'Status',
    cell: (info) => <Badge variant={statusVariant[info.getValue()] ?? 'default'}>{info.getValue()}</Badge>,
  }),
  periodHelper.display({
    id: 'actions',
    header: '',
    cell: ({ row }) => {
      const update = useUpdateFiscalPeriodStatus();
      const next: Record<string, string> = { FUTURE: 'OPEN', OPEN: 'SOFT_CLOSED', SOFT_CLOSED: 'CLOSED', CLOSED: 'LOCKED' };
      const to = next[row.original.status];
      if (!to) return null;
      return (
        <Button size="sm" variant="secondary" loading={update.isPending} onClick={() => update.mutate({ id: row.original.id, status: to })}>
          → {to}
        </Button>
      );
    },
  }),
];

function VendorForm({ onDone }: { onDone: () => void }) {
  const [name, setName] = useState('');
  const [taxId, setTaxId] = useState('');
  const [category, setCategory] = useState('MATERIAL');
  const create = useCreateVendor();
  const onSubmit = () => {
    if (!name) return;
    create.mutate({ name, taxId: taxId || undefined, category }, { onSuccess: () => { setName(''); setTaxId(''); onDone(); } });
  };
  return (
    <div className="mb-4 rounded-md border border-neutral-200 bg-white p-4 shadow-xs">
      <div className="flex items-end gap-3">
        <div className="flex-1">
          <Label htmlFor="vnd-name">Nama Vendor</Label>
          <Input id="vnd-name" value={name} onChange={(e) => setName(e.target.value)} />
        </div>
        <div>
          <Label htmlFor="vnd-tax">NPWP</Label>
          <Input id="vnd-tax" value={taxId} onChange={(e) => setTaxId(e.target.value)} />
        </div>
        <div>
          <Label htmlFor="vnd-cat">Kategori</Label>
          <select id="vnd-cat" value={category} onChange={(e) => setCategory(e.target.value)} className="flex h-9 rounded-md border border-neutral-200 bg-white px-3 text-body">
            {['MATERIAL', 'SUBCONTRACTOR', 'SERVICE', 'EQUIPMENT', 'OTHER'].map((c) => <option key={c} value={c}>{c}</option>)}
          </select>
        </div>
        <Button onClick={onSubmit} loading={create.isPending}>Buat Vendor</Button>
      </div>
    </div>
  );
}

function PeriodForm({ onDone }: { onDone: () => void }) {
  const [periodCode, setPeriodCode] = useState('');
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const create = useCreateFiscalPeriod();
  const onSubmit = () => {
    if (!periodCode || !startDate || !endDate) return;
    const [y, m] = periodCode.split('-');
    create.mutate(
      { periodCode, periodYear: Number(y), periodMonth: Number(m), startDate, endDate },
      { onSuccess: () => { setPeriodCode(''); setStartDate(''); setEndDate(''); onDone(); } },
    );
  };
  return (
    <div className="mb-4 rounded-md border border-neutral-200 bg-white p-4 shadow-xs">
      <div className="flex items-end gap-3">
        <div>
          <Label htmlFor="fp-code">Kode (mis. 2026-09)</Label>
          <Input id="fp-code" value={periodCode} onChange={(e) => setPeriodCode(e.target.value)} />
        </div>
        <div>
          <Label htmlFor="fp-start">Mulai</Label>
          <Input id="fp-start" type="date" value={startDate} onChange={(e) => setStartDate(e.target.value)} />
        </div>
        <div>
          <Label htmlFor="fp-end">Selesai</Label>
          <Input id="fp-end" type="date" value={endDate} onChange={(e) => setEndDate(e.target.value)} />
        </div>
        <Button onClick={onSubmit} loading={create.isPending}>Buat Periode</Button>
      </div>
    </div>
  );
}

type Tab = 'vendors' | 'periods';

export function MasterDataPage() {
  const [tab, setTab] = useState<Tab>('vendors');
  const [pagination, setPagination] = useState({ pageIndex: 0, pageSize: PAGE_SIZE });
  const [showForm, setShowForm] = useState(false);
  const vendors = useVendors({ page: pagination.pageIndex + 1, pageSize: pagination.pageSize });
  const periods = useFiscalPeriods({ page: pagination.pageIndex + 1, pageSize: pagination.pageSize });
  const gridProps = { pagination, onPaginationChange: setPagination };

  return (
    <div>
      <div className="mb-6 flex items-center justify-between">
        <div>
          <h1 className="text-h1 text-neutral-950">Master Data</h1>
          <p className="mt-1 text-body-sm text-neutral-500">Vendor master + fiscal period (FR-PRO-010, FR-FND-010)</p>
        </div>
        <Button size="sm" onClick={() => setShowForm((s) => !s)}>
          {showForm ? 'Tutup' : '+ Buat Baru'}
        </Button>
      </div>

      <div className="mb-4 flex gap-2">
        {(['vendors', 'periods'] as Tab[]).map((t) => (
          <button
            key={t}
            onClick={() => { setTab(t); setShowForm(false); }}
            className={`rounded-md px-3 py-1.5 text-body-sm font-medium transition-colors ${
              tab === t ? 'bg-racing-red-600 text-white' : 'bg-white text-neutral-600 border border-neutral-200 hover:border-neutral-300'
            }`}
          >
            {t === 'vendors' ? `Vendor (${vendors.data?.total ?? 0})` : `Fiscal Period (${periods.data?.total ?? 0})`}
          </button>
        ))}
      </div>

      {showForm && tab === 'vendors' && <VendorForm onDone={() => setShowForm(false)} />}
      {showForm && tab === 'periods' && <PeriodForm onDone={() => setShowForm(false)} />}

      <div className="rounded-md border border-neutral-200 bg-white shadow-xs">
        {tab === 'vendors' && <DataGrid columns={vendorColumns} data={vendors.data?.items ?? []} rowCount={vendors.data?.total ?? 0} isLoading={vendors.isLoading} isError={vendors.isError} onRetry={() => vendors.refetch()} emptyMessage="Belum ada vendor" {...gridProps} />}
        {tab === 'periods' && <DataGrid columns={periodColumns} data={periods.data?.items ?? []} rowCount={periods.data?.total ?? 0} isLoading={periods.isLoading} isError={periods.isError} onRetry={() => periods.refetch()} emptyMessage="Belum ada fiscal period" {...gridProps} />}
      </div>
    </div>
  );
}
