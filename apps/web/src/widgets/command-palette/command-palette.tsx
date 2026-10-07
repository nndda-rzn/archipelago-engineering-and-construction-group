import { useMemo, useRef, useState } from 'react';
import { useNavigate } from '@tanstack/react-router';
import { Search } from 'lucide-react';
import { cn } from '@aec/ui';
import { allNavItems, type NavItemRef } from '@/app/layouts/nav-config';

/** Normalisasi untuk pencarian: huruf kecil, tanpa pemisah. `PR/PO` → `prpo`. */
function normalize(value: string): string {
  return value.toLowerCase().replace(/[^a-z0-9]+/g, '');
}

/** Cari menu berdasarkan query (nama item, grup, subgrup). */
export function searchNav(items: NavItemRef[], query: string): NavItemRef[] {
  const q = normalize(query);
  if (!q) return items;
  return items.filter((item) => normalize(`${item.group} ${item.subgroup ?? ''} ${item.label}`).includes(q));
}

export interface CommandPaletteProps {
  open: boolean;
  onClose: () => void;
}

/**
 * Isi palette (dipisah agar state di-reset lewat `key` saat dibuka, bukan lewat
 * effect — menghindari setState-sinkron-dalam-effect yang memicu render berantai).
 */
function CommandPaletteInner({ onClose }: { onClose: () => void }) {
  const navigate = useNavigate();
  const [query, setQuery] = useState('');
  const [active, setActive] = useState(0);
  const inputRef = useRef<HTMLInputElement>(null);

  const items = useMemo(() => allNavItems(), []);
  const results = useMemo(() => searchNav(items, query).slice(0, 12), [items, query]);

  const go = (item: NavItemRef) => {
    navigate({ to: item.to as never });
    onClose();
  };

  const onKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Escape') {
      e.preventDefault();
      onClose();
    } else if (e.key === 'ArrowDown') {
      e.preventDefault();
      setActive((a) => Math.min(results.length - 1, a + 1));
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      setActive((a) => Math.max(0, a - 1));
    } else if (e.key === 'Enter' && results[active]) {
      e.preventDefault();
      go(results[active]);
    }
  };

  return (
    <div className="fixed inset-0 z-modal-backdrop flex items-start justify-center pt-[12vh]" role="presentation">
      <button type="button" aria-label="Close command palette" className="absolute inset-0 bg-neutral-950/40" onClick={onClose} />
      <div
        role="dialog"
        aria-modal="true"
        aria-label="Command palette"
        onKeyDown={onKeyDown}
        className="relative z-modal w-full max-w-lg overflow-hidden rounded-lg border border-neutral-200 bg-white shadow-lg"
      >
        <div className="flex items-center gap-2 border-b border-neutral-200 px-3">
          <Search className="h-4 w-4 shrink-0 text-neutral-400" aria-hidden="true" />
          <input
            ref={inputRef}
            autoFocus
            type="text"
            value={query}
            onChange={(e) => {
              setQuery(e.target.value);
              setActive(0);
            }}
            placeholder="Go to…"
            aria-label="Search menu"
            spellCheck={false}
            className="h-11 w-full bg-transparent text-body-sm text-neutral-900 outline-none placeholder:text-neutral-400"
          />
          <kbd className="shrink-0 rounded border border-neutral-200 px-1.5 py-0.5 text-caption text-neutral-400">Esc</kbd>
        </div>

        {results.length === 0 ? (
          <p className="px-4 py-6 text-center text-body-sm text-neutral-500">No menu found.</p>
        ) : (
          <ul role="listbox" aria-label="Menu results" className="max-h-80 overflow-y-auto p-1">
            {results.map((item, i) => (
              <li key={item.to} role="option" aria-selected={i === active}>
                <button
                  type="button"
                  onMouseEnter={() => setActive(i)}
                  onClick={() => go(item)}
                  className={cn(
                    'flex w-full flex-col items-start rounded-md px-3 py-1.5 text-left',
                    i === active ? 'bg-neutral-100' : 'hover:bg-neutral-50',
                  )}
                >
                  <span className="text-body-sm font-medium text-neutral-900">{item.label}</span>
                  <span className="text-caption text-neutral-500">
                    {item.subgroup ? `${item.group} › ${item.subgroup}` : item.group}
                  </span>
                </button>
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  );
}

/**
 * Command palette navigasi (⌘K). Mencari di seluruh menu (`allNavItems`) dan
 * berpindah route. Hanya navigasi — tidak ada aksi destruktif di sini.
 * Keyboard: ↑/↓ pindah, Enter buka, Esc tutup.
 */
export function CommandPalette({ open, onClose }: CommandPaletteProps) {
  if (!open) return null;
  // `key` memaksa state internal di-reset setiap kali dibuka kembali.
  return <CommandPaletteInner key="palette" onClose={onClose} />;
}
