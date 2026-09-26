import { useState } from 'react';
import { Button, DataGrid } from '@aec/ui';
import { useFiscalPeriods, useVendors } from '@/features/master-data';
import { PeriodForm, VendorForm, periodColumns, vendorColumns } from '@/features/master-data/ui';
import { PAGE_SIZE } from '@/shared/lib/pagination';

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
          {showForm ? 'Close' : '+ Create New'}
        </Button>
      </div>

      <div className="mb-4 flex gap-2">
        {(['vendors', 'periods'] as Tab[]).map((t) => (
          <button
            key={t}
            onClick={() => { setTab(t); setShowForm(false); }}
            className={`rounded-md px-3 py-1.5 text-body-sm font-medium transition-colors ${
              tab === t ? 'bg-racing-red-600 text-white' : 'border border-neutral-200 bg-white text-neutral-600 hover:border-neutral-300'
            }`}
          >
            {t === 'vendors' ? `Vendor (${vendors.data?.total ?? 0})` : `Fiscal Period (${periods.data?.total ?? 0})`}
          </button>
        ))}
      </div>

      {showForm && tab === 'vendors' && <VendorForm onDone={() => setShowForm(false)} />}
      {showForm && tab === 'periods' && <PeriodForm onDone={() => setShowForm(false)} />}

      <div className="rounded-md border border-neutral-200 bg-white shadow-xs">
        {tab === 'vendors' && <DataGrid columns={vendorColumns} data={vendors.data?.items ?? []} rowCount={vendors.data?.total ?? 0} isLoading={vendors.isLoading} isError={vendors.isError} onRetry={() => vendors.refetch()} emptyMessage="No vendors yet" {...gridProps} />}
        {tab === 'periods' && <DataGrid columns={periodColumns} data={periods.data?.items ?? []} rowCount={periods.data?.total ?? 0} isLoading={periods.isLoading} isError={periods.isError} onRetry={() => periods.refetch()} emptyMessage="No fiscal periods yet" {...gridProps} />}
      </div>
    </div>
  );
}
