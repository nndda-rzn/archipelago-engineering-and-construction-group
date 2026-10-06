import { afterEach, vi } from 'vitest';
import { cleanup } from '@testing-library/react';

// Auto-cleanup RTL tidak aktif karena vitest `globals: false`, jadi didaftarkan manual.
afterEach(() => {
  cleanup();
});

// ── jsdom polyfills ──────────────────────────────────────────────────────────
// React Flow (@xyflow/react) mengukur viewport lewat ResizeObserver dan membaca
// transformasi lewat DOMMatrix. jsdom tidak menyediakannya, jadi komponen kanvas
// gagal render di test tanpa shim ini. Shim-nya minimal: cukup agar mount/measure
// tidak melempar, bukan untuk mereplikasi layout browser.

if (typeof globalThis.ResizeObserver === 'undefined') {
  class ResizeObserverStub {
    observe() {}
    unobserve() {}
    disconnect() {}
  }
  globalThis.ResizeObserver = ResizeObserverStub as unknown as typeof ResizeObserver;
}

if (typeof globalThis.DOMMatrixReadOnly === 'undefined') {
  class DOMMatrixReadOnlyStub {
    m22 = 1;
    constructor(readonly transform?: string) {}
  }
  globalThis.DOMMatrixReadOnly = DOMMatrixReadOnlyStub as unknown as typeof DOMMatrixReadOnly;
}

// matchMedia dipakai untuk prefers-reduced-motion; default: tidak reduce.
if (typeof window !== 'undefined' && typeof window.matchMedia !== 'function') {
  window.matchMedia = ((query: string) => ({
    matches: false,
    media: query,
    onchange: null,
    addListener: vi.fn(),
    removeListener: vi.fn(),
    addEventListener: vi.fn(),
    removeEventListener: vi.fn(),
    dispatchEvent: vi.fn(),
  })) as unknown as typeof window.matchMedia;
}
