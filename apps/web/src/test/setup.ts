import { afterEach } from 'vitest';
import { cleanup } from '@testing-library/react';

// Auto-cleanup RTL tidak aktif karena vitest `globals: false`, jadi didaftarkan manual.
afterEach(() => {
  cleanup();
});
