import { Button } from '@aec/ui';

export interface ApprovalBulkBarProps {
  count: number;
  busy: boolean;
  onApprove: () => void;
  onReject: () => void;
  onClear: () => void;
}

/**
 * Action bar kontekstual (NN/g): muncul HANYA saat ada baris terpilih, menampilkan
 * jumlah, dan menyediakan jalan keluar (Clear). Jumlah diumumkan lewat aria-live
 * agar pengguna pembaca layar tahu pilihan berubah.
 */
export function ApprovalBulkBar({ count, busy, onApprove, onReject, onClear }: ApprovalBulkBarProps) {
  if (count === 0) return null;
  return (
    <div className="flex flex-wrap items-center justify-between gap-3 border-b border-neutral-200 bg-neutral-50 px-3 py-2">
      <p className="text-body-sm text-neutral-700" aria-live="polite" data-testid="bulk-selected-count">
        <span className="font-mono tabular-nums">{count}</span> selected
      </p>
      <div className="flex gap-2">
        <Button size="sm" onClick={onApprove} loading={busy}>
          Approve selected
        </Button>
        <Button size="sm" variant="destructive" onClick={onReject} disabled={busy}>
          Reject selected
        </Button>
        <Button size="sm" variant="ghost" onClick={onClear} disabled={busy}>
          Clear
        </Button>
      </div>
    </div>
  );
}
