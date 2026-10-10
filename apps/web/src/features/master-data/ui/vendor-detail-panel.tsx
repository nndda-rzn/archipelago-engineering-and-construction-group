import { ConfirmActionButton, ErrorState, ScaleBar, Skeleton, StatusBadge } from '@aec/ui';
import { Money } from '@/shared/ui/money';
import { useSetVendorStatus, useVendorDetail } from '../model/master-data.api';
import { CategoryChip } from './vendor-list';

function Field({ label, value }: { label: string; value: React.ReactNode }) {
  return (
    <div className="flex flex-col gap-0.5">
      <dt className="text-overline uppercase text-neutral-500">{label}</dt>
      <dd className="text-body-sm text-neutral-800">{value}</dd>
    </div>
  );
}

/**
 * Panel kanan (master–detail): profil vendor + ringkasan performa per kategori +
 * pengadaan nyata (spend & jumlah PO). Aksi edit dan activate/deactivate.
 */
export function VendorDetailPanel({ vendorId, onEdit }: { vendorId: string; onEdit: () => void }) {
  const { data, isLoading, isError, refetch } = useVendorDetail(vendorId);
  const setStatus = useSetVendorStatus();

  if (isLoading) {
    return (
      <div className="space-y-3 p-4">
        <Skeleton className="h-12 w-full" />
        <Skeleton className="h-24 w-full" />
        <Skeleton className="h-24 w-full" />
      </div>
    );
  }
  if (isError || !data) {
    return <div className="p-4"><ErrorState message="Could not load this vendor." onRetry={() => refetch()} /></div>;
  }

  const { vendor, performance, spend } = data;
  const perfCats = Object.entries(performance.byCategory);

  return (
    <div className="flex flex-col gap-5 p-4">
      <header className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <div className="flex items-center gap-2">
            <h2 className="truncate text-h2 text-neutral-950" title={vendor.name}>{vendor.name}</h2>
            <StatusBadge status={vendor.status} />
          </div>
          <p className="mt-0.5 flex items-center gap-2">
            <span className="font-mono text-caption text-neutral-500">{vendor.vendorCode}</span>
            <CategoryChip category={vendor.category} />
          </p>
        </div>
        <div className="flex shrink-0 gap-2">
          <button type="button" onClick={onEdit} className="rounded-md border border-neutral-200 px-2.5 py-1 text-caption text-neutral-700 hover:bg-neutral-50">
            Edit
          </button>
          <ConfirmActionButton
            confirmTitle={vendor.status === 'ACTIVE' ? `Deactivate ${vendor.name}?` : `Activate ${vendor.name}?`}
            confirmDescription={vendor.status === 'ACTIVE' ? 'Vendor will no longer be selectable for new documents.' : 'Vendor becomes selectable again.'}
            confirmLabel={vendor.status === 'ACTIVE' ? 'Deactivate' : 'Activate'}
            variant={vendor.status === 'ACTIVE' ? 'destructive' : 'primary'}
            onConfirm={() => setStatus.mutate({ id: vendor.id, status: vendor.status === 'ACTIVE' ? 'INACTIVE' : 'ACTIVE' })}
          >
            {vendor.status === 'ACTIVE' ? 'Deactivate' : 'Activate'}
          </ConfirmActionButton>
        </div>
      </header>

      <dl className="grid grid-cols-2 gap-x-4 gap-y-3 border-t border-neutral-100 pt-4">
        <Field label="Tax ID" value={vendor.taxId ?? '—'} />
        <Field label="Contact" value={vendor.contactPerson ?? '—'} />
        <Field label="Email" value={vendor.email ?? '—'} />
        <Field label="Phone" value={vendor.phone ?? '—'} />
        <Field label="Address" value={vendor.address ?? '—'} />
      </dl>

      <section aria-label="Procurement" className="grid grid-cols-3 gap-3 border-t border-neutral-100 pt-4">
        <Field label="Posted spend" value={<Money value={spend.postedInvoiceValue} className="font-mono tabular-nums" />} />
        <Field label="Invoices" value={spend.invoiceCount} />
        <Field label="POs" value={spend.poCount} />
      </section>

      <section aria-label="Performance" className="border-t border-neutral-100 pt-4">
        <div className="mb-2 flex items-baseline justify-between">
          <h3 className="text-h3 text-neutral-900">Performance</h3>
          <span className="text-caption text-neutral-500">
            Overall <span className="font-mono font-medium text-neutral-800">{performance.overall ?? '—'}</span>
            {performance.count > 0 && <span className="text-neutral-400"> · {performance.count} ratings</span>}
          </span>
        </div>
        {perfCats.length === 0 ? (
          <p className="text-caption text-neutral-500">No performance ratings yet.</p>
        ) : (
          <ul className="space-y-2">
            {perfCats.map(([cat, v]) => (
              <li key={cat} className="grid grid-cols-[7rem_1fr_auto] items-center gap-2 text-caption">
                <span className="text-neutral-600">{cat}</span>
                <ScaleBar value={v.avg} max={5} label={`${cat} score`} tone="neutral" />
                <span className="w-10 text-right font-mono tabular-nums text-neutral-700">{v.avg}</span>
              </li>
            ))}
          </ul>
        )}
      </section>
    </div>
  );
}
