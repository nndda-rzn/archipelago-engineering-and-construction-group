import { useEffect } from 'react';

/**
 * useUnsavedGuard — cegah data form hilang saat pindah halaman/tutup tab.
 * Wajib dipanggil di page dengan form panjang (PR, journal, dsb).
 */
export function useUnsavedGuard(dirty: boolean) {
  useEffect(() => {
    if (!dirty) return;

    const beforeUnload = (e: BeforeUnloadEvent) => {
      e.preventDefault();
      e.returnValue = '';
    };
    window.addEventListener('beforeunload', beforeUnload);
    return () => window.removeEventListener('beforeunload', beforeUnload);
  }, [dirty]);
}
