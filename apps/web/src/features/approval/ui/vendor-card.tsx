import { Star } from 'lucide-react';
import { Badge, EmptyCell } from '@aec/ui';
import type { ApprovalDetail } from '@aec/api-contracts';

const CATEGORY_LABEL: Record<string, string> = {
  MATERIAL: 'Material', SUBCONTRACTOR: 'Subcontractor', SERVICE: 'Service', EQUIPMENT: 'Equipment', OTHER: 'Other',
};

function Stars({ value }: { value: number }) {
  const full = Math.round(value);
  return (
    <span className="inline-flex items-center gap-0.5" role="img" aria-label={`Average rating ${value.toFixed(1)} of 5`}>
      {[1, 2, 3, 4, 5].map((n) => (
        <Star key={n} className={`h-3.5 w-3.5 ${n <= full ? 'fill-warning-500 text-warning-500' : 'text-neutral-300'}`} aria-hidden="true" />
      ))}
    </span>
  );
}

/** Kartu vendor (PO). Rating hanya tampil bila ada — tidak dikarang. */
export function VendorCard({ vendor }: { vendor: NonNullable<ApprovalDetail['vendor']> }) {
  return (
    <section className="border-b border-neutral-200 px-6 py-4" aria-label="Vendor">
      <h3 className="mb-2 text-h3 text-neutral-800">Vendor</h3>
      <div className="flex flex-wrap items-center gap-2">
        <span className="text-body text-neutral-900">{vendor.name}</span>
        {vendor.category && <Badge variant="default">{CATEGORY_LABEL[vendor.category] ?? vendor.category}</Badge>}
      </div>
      <dl className="mt-2 grid grid-cols-2 gap-x-6 gap-y-1 text-caption sm:grid-cols-3">
        <div><dt className="text-neutral-500">Tax ID (NPWP)</dt><dd className="text-neutral-800">{vendor.taxId ?? <EmptyCell label="Not recorded" />}</dd></div>
        <div><dt className="text-neutral-500">Contact</dt><dd className="text-neutral-800">{vendor.contactPerson ?? <EmptyCell label="Not recorded" />}</dd></div>
        <div>
          <dt className="text-neutral-500">Rating</dt>
          <dd className="flex items-center gap-1.5 text-neutral-800">
            {vendor.avgRating != null ? (
              <><Stars value={vendor.avgRating} /><span className="font-mono tabular-nums">{vendor.avgRating.toFixed(1)}</span><span className="text-neutral-400">({vendor.ratingCount})</span></>
            ) : (
              <span className="text-neutral-500">No ratings yet</span>
            )}
          </dd>
        </div>
      </dl>
    </section>
  );
}
