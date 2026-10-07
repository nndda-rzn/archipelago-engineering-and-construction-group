import { readFileSync, readdirSync, statSync } from 'node:fs';
import { join } from 'node:path';
import { Permission } from '@aec/shared-types';

/**
 * Penjaga anti-drift: daftar permission di `@aec/shared-types` harus mencakup
 * SETIAP kode yang dipakai controller backend lewat `Permission.*`. Dulu daftar
 * backend, seed, dan frontend sempat berbeda — `Handover.EDIT` dipakai controller
 * tapi tak ada di seed, sehingga endpoint-nya tidak bisa diakses siapa pun.
 */
function walk(dir: string, out: string[] = []): string[] {
  for (const entry of readdirSync(dir)) {
    const full = join(dir, entry);
    if (statSync(full).isDirectory()) walk(full, out);
    else if (entry.endsWith('.ts')) out.push(full);
  }
  return out;
}

describe('permission registry is the single source of truth', () => {
  const values = new Set<string>(Object.values(Permission));

  it('has no duplicate codes', () => {
    const all = Object.values(Permission);
    expect(new Set(all).size).toBe(all.length);
  });

  it('every code is Resource.ACTION shaped', () => {
    for (const code of values) expect(code).toMatch(/^[A-Za-z]+\.[A-Z_]+$/);
  });

  it('covers every Permission.* used by a controller', () => {
    const files = walk(join(__dirname, '..', '..', 'modules')).filter((f) => f.endsWith('.controller.ts'));
    const used = new Set<string>();
    for (const file of files) {
      const src = readFileSync(file, 'utf8');
      for (const m of src.matchAll(/Permission\.(\w+)/g)) used.add(m[1]!);
    }
    // Setiap key yang dirujuk controller harus ada di registry.
    const missing = [...used].filter((k) => !(k in Permission));
    expect(missing).toEqual([]);
  });

  it('includes Handover.EDIT (used by the handover controller, previously un-seeded)', () => {
    expect(values.has('Handover.EDIT')).toBe(true);
  });
});
