import { Badge, EntityAvatar, EmptyState, StatusBadge } from '@aec/ui';
import type { Vendor } from '@aec/api-contracts';

/** Warna chip per kategori — memakai palet aman buta warna, bukan merah. */
const CATEGORY_TONE: Record<string, string> = {
  MATERIAL: 'bg-info-50 text-info-700 border-info-200',
  SUBCONTRACTOR: 'bg-warning-50 text-warning-700 border-warning-200',
  SERVICE: 'bg-success-50 text-success-700 border-success-200',
  EQUIPMENT: 'bg-neutral-100 text-neutral-700 border-neutral-200',
  OTHER: 'bg-neutral-100 text-neutral-600 border-neutral-200',
};

export interface VendorListProps {
  vendors: Vendor[];
  selectedId: string;
  onSelect: (id: string) => void;
}

/**
 * Daftar vendor kaya (bukan tabel datar): monogram, nama + kode, chip kategori,
 * penanda status. Baris dapat dipilih untuk membuka detail di panel kanan
 * (master–detail). `role="listbox"`/`option` agar terpilih terbaca screen reader.
 */
export function VendorList({ vendors, selectedId, onSelect }: VendorListProps) {
  if (vendors.length === 0) {
    return <EmptyState title="No vendors" description="No vendors match the current filters." />;
  }
  return (
    <ul role="listbox" aria-label="Vendors" className="divide-y divide-neutral-100">
      {vendors.map((v) => {
        const selected = v.id === selectedId;
        return (
          <li key={v.id}>
            <button
              type="button"
              role="option"
              aria-selected={selected}
              onClick={() => onSelect(v.id)}
              className={`flex w-full items-center gap-3 px-3 py-2.5 text-left transition-colors duration-fast focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-racing-red-600 ${
                selected ? 'bg-racing-red-50' : 'hover:bg-neutral-50'
              }`}
            >
              <EntityAvatar name={v.name} size="md" />
              <span className="min-w-0 flex-1">
                <span className="flex items-center gap-2">
                  <span className="truncate text-body-sm font-medium text-neutral-900" title={v.name}>{v.name}</span>
                  {v.status === 'INACTIVE' && <StatusBadge status="INACTIVE" />}
                </span>
                <span className="mt-0.5 flex items-center gap-2">
                  <span className="font-mono text-caption text-neutral-500">{v.vendorCode}</span>
                  <span className={`rounded border px-1.5 py-px text-caption ${CATEGORY_TONE[v.category] ?? CATEGORY_TONE.OTHER}`}>
                    {v.category}
                  </span>
                </span>
              </span>
            </button>
          </li>
        );
      })}
    </ul>
  );
}

/** Chip kategori yang dipakai ulang di panel detail. */
export function CategoryChip({ category }: { category: string }) {
  return (
    <Badge variant="default" className={`border ${CATEGORY_TONE[category] ?? CATEGORY_TONE.OTHER}`}>
      {category}
    </Badge>
  );
}
