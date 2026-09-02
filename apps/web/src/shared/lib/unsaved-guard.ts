import { useEffect } from 'react';

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
