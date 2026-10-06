import { useEffect, useRef, useState } from 'react';
import { Button, Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, Label } from '@aec/ui';

const MAX_REASON = 500;

export interface RejectDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  /** Ringkasan yang akan ditolak — mis. kode dokumen atau "3 requests". */
  target: string;
  loading?: boolean;
  /** Pesan error dari server (mis. 400 REJECT_REASON_REQUIRED), bila ada. */
  serverError?: string | null;
  onConfirm: (reason: string) => void;
}

/**
 * Dialog penolakan. Alasan **wajib**: tombol nonaktif sampai terisi dan error
 * ditampilkan di dekat field. Ini menegakkan invarian yang sama dengan backend
 * (`REJECT_REASON_REQUIRED`) supaya approver tidak menemui kegagalan bolak-balik.
 */
export function RejectDialog({ open, onOpenChange, target, loading, serverError, onConfirm }: RejectDialogProps) {
  const [reason, setReason] = useState('');
  const [touched, setTouched] = useState(false);
  const areaRef = useRef<HTMLTextAreaElement>(null);

  // Fokuskan field saat dibuka supaya keyboard langsung bisa mengetik.
  useEffect(() => {
    if (!open) return;
    const t = setTimeout(() => areaRef.current?.focus(), 0);
    return () => clearTimeout(t);
  }, [open]);

  // Reset saat ditutup (bukan saat dibuka) agar tidak ada setState sinkron di
  // dalam efek yang dipicu pembukaan dialog.
  const handleOpenChange = (next: boolean) => {
    if (!next) {
      setReason('');
      setTouched(false);
    }
    onOpenChange(next);
  };

  const empty = reason.trim().length === 0;
  const showError = touched && empty;
  const errorMessage = showError ? 'Enter a reason so the requester knows what to fix.' : serverError ?? null;

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>Reject this request?</DialogTitle>
          <DialogDescription>{target}</DialogDescription>
        </DialogHeader>

        <div className="space-y-1.5">
          <Label htmlFor="reject-reason">
            Reason for rejection <span aria-hidden="true" className="text-destructive-600">*</span>
            <span className="sr-only">(required)</span>
          </Label>
          <textarea
            id="reject-reason"
            ref={areaRef}
            value={reason}
            onChange={(e) => setReason(e.target.value.slice(0, MAX_REASON))}
            onBlur={() => setTouched(true)}
            rows={3}
            maxLength={MAX_REASON}
            aria-required="true"
            aria-invalid={showError || Boolean(serverError)}
            aria-describedby={errorMessage ? 'reject-reason-help reject-reason-error' : 'reject-reason-help'}
            placeholder="Explain what needs to change…"
            className="w-full resize-y rounded-md border border-neutral-200 bg-white px-3 py-2 text-body text-neutral-900 placeholder:text-neutral-500 focus-visible:border-racing-red-600 focus-visible:ring-2 focus-visible:ring-racing-red-600/20"
          />
          <p id="reject-reason-help" className="text-caption text-neutral-500">
            This is recorded for audit and shown to the requester.
          </p>
          {errorMessage && (
            <p id="reject-reason-error" role="alert" className="text-caption text-destructive-600">
              {errorMessage}
            </p>
          )}
          <p className="text-caption text-neutral-400 tabular-nums">
            {reason.length}/{MAX_REASON}
          </p>
        </div>

        <DialogFooter>
          <Button variant="ghost" onClick={() => onOpenChange(false)} disabled={loading}>
            Cancel
          </Button>
          <Button
            variant="destructive"
            loading={loading}
            onClick={() => {
              if (empty) {
                setTouched(true);
                return;
              }
              onConfirm(reason.trim());
            }}
          >
            Reject request
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
