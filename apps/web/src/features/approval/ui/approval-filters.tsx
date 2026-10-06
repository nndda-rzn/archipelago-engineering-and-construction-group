import { Input, Label, SegmentedControl, Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@aec/ui';
import type { ApprovalCounts } from '@aec/api-contracts';

export interface ApprovalFiltersProps {
  status: string;
  type: string;
  query: string;
  mine: boolean;
  counts: ApprovalCounts;
  onStatus: (v: string) => void;
  onType: (v: string) => void;
  onQuery: (v: string) => void;
  onMine: (v: boolean) => void;
}

/**
 * Toolbar antrean. Urutan mengikuti kebiasaan scan: status (tab) → tipe → cari →
 * "hanya milik saya". Semua nilai disimpan di URL oleh halaman induk.
 */
export function ApprovalFilters({ status, type, query, mine, counts, onStatus, onType, onQuery, onMine }: ApprovalFiltersProps) {
  const options = [
    { value: 'PENDING', label: `Pending ${counts.PENDING}` },
    { value: 'APPROVED', label: `Approved ${counts.APPROVED}` },
    { value: 'REJECTED', label: `Rejected ${counts.REJECTED}` },
    { value: 'ALL', label: `All ${counts.ALL}` },
  ];

  return (
    <div className="flex flex-wrap items-end justify-between gap-3 border-b border-neutral-200 pb-3">
      <SegmentedControl aria-label="Filter by status" options={options} value={status} onValueChange={onStatus} />

      <div className="flex flex-wrap items-end gap-3">
        <div className="w-40">
          <Label htmlFor="approval-type">Type</Label>
          <Select value={type || 'ALL'} onValueChange={(v) => onType(v === 'ALL' ? '' : v)}>
            <SelectTrigger id="approval-type">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="ALL">All types</SelectItem>
              <SelectItem value="PurchaseRequisition">Purchase Requisition</SelectItem>
              <SelectItem value="PurchaseOrder">Purchase Order</SelectItem>
            </SelectContent>
          </Select>
        </div>

        <div className="w-56">
          <Label htmlFor="approval-search">Search</Label>
          <Input
            id="approval-search"
            type="search"
            placeholder="Document code…"
            autoComplete="off"
            value={query}
            onChange={(e) => onQuery(e.target.value)}
          />
        </div>

        <label className="flex items-center gap-2 pb-2 text-body-sm text-neutral-700">
          <input
            type="checkbox"
            className="h-4 w-4 rounded border-neutral-300 text-neutral-800 focus-visible:ring-2 focus-visible:ring-neutral-800"
            checked={mine}
            onChange={(e) => onMine(e.target.checked)}
          />
          Mine only
        </label>
      </div>
    </div>
  );
}
