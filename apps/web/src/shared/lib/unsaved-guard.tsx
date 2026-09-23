import { useBlocker } from '@tanstack/react-router';
import { Button, Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@aec/ui';

/**
 * Blokir navigasi SPA (klik Link/sidebar) + tutup tab saat form masih kotor.
 * Mengembalikan resolver blocker; biasanya tidak perlu dipakai langsung —
 * render `<UnsavedGuard dirty={isDirty} />` sebagai gantinya.
 */
export function useUnsavedGuard(dirty: boolean) {
  return useBlocker({
    shouldBlockFn: () => dirty,
    withResolver: true,
    enableBeforeUnload: true,
  });
}

/**
 * Dialog konfirmasi "Buang perubahan?". Render di dalam form dan pass
 * `formState.isDirty`. Mengembalikan null saat tidak ada navigasi tertahan.
 */
export function UnsavedGuard({ dirty }: { dirty: boolean }) {
  const blocker = useUnsavedGuard(dirty);
  const blocked = blocker.status === 'blocked';

  return (
    <Dialog
      open={blocked}
      onOpenChange={(open) => {
        if (!open && blocker.status === 'blocked') blocker.reset?.();
      }}
    >
      <DialogContent className="max-w-sm" showClose={false}>
        <DialogHeader>
          <DialogTitle>Buang perubahan?</DialogTitle>
          <DialogDescription>Perubahan yang belum disimpan akan hilang.</DialogDescription>
        </DialogHeader>
        <DialogFooter>
          <Button variant="ghost" onClick={() => blocker.reset?.()}>
            Tetap di sini
          </Button>
          <Button variant="destructive" onClick={() => blocker.proceed?.()}>
            Buang
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
