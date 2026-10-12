import { useId, useRef, useState } from 'react';
import { Search } from 'lucide-react';
import { ICON_SIZE, ICON_STROKE, cn } from '@aec/ui';
import { useProjects } from '@/entities/project';
import { PAGE_SIZE } from '@/shared/lib/pagination';

const STATUS_LABEL: Record<string, string> = {
  ACTIVE: 'Active', PLANNING: 'Planning', ON_HOLD: 'On hold', COMPLETED: 'Completed', CANCELLED: 'Cancelled',
};

interface Option {
  id: string;
  code: string;
  name: string;
  client: string;
  status: string;
}

/**
 * Pemilih proyek type-ahead. Bukan dropdown form biasa: pencarian **server-side**
 * (memakai `search` API yang sudah ada) sehingga tak ada plafon jumlah proyek, dan
 * tiap baris membawa konteks (kode · nama + klien · status) agar proyek dengan
 * klien sama tetap bisa dibedakan. Keyboard: ↑/↓ pindah, Enter pilih, Esc tutup.
 */
export function ProjectPicker({
  value,
  onValueChange,
  className,
}: {
  value: string;
  onValueChange: (value: string) => void;
  className?: string;
}) {
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState('');
  const [active, setActive] = useState(0);
  const inputRef = useRef<HTMLInputElement>(null);
  const listId = useId();

  const trimmed = query.trim();
  const projects = useProjects({ page: 1, pageSize: PAGE_SIZE, ...(trimmed ? { search: trimmed } : {}) });
  const items: Option[] = projects.data?.items ?? [];

  const selected = items.find((p) => p.id === value);

  // Clamp saat render (bukan lewat effect) agar sorotan selalu valid tanpa render berantai.
  const activeIndex = items.length === 0 ? 0 : Math.min(Math.max(0, active), items.length - 1);

  const openList = () => {
    setOpen(true);
    setQuery('');
    setActive(0);
    // Fokus ke input agar pengetikan langsung terasa (bukan dropdown yang "dibuka").
    requestAnimationFrame(() => inputRef.current?.focus());
  };

  const close = () => {
    setOpen(false);
    setQuery('');
  };

  const choose = (option: Option) => {
    onValueChange(option.id);
    close();
  };

  const onKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Escape') {
      e.preventDefault();
      close();
    } else if (e.key === 'ArrowDown') {
      e.preventDefault();
      setOpen(true);
      setActive((a) => Math.min(items.length - 1, a + 1));
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      setActive((a) => Math.max(0, a - 1));
    } else if (e.key === 'Enter' && open && items[activeIndex]) {
      e.preventDefault();
      choose(items[activeIndex]!);
    }
  };

  const activeId = open && items[activeIndex] ? `${listId}-opt-${items[activeIndex]!.id}` : undefined;

  return (
    <div className={cn('relative min-w-0', className)}>
      {open ? (
        <div className="relative">
          <Search size={ICON_SIZE.sm} strokeWidth={ICON_STROKE} className="pointer-events-none absolute left-2.5 top-1/2 -translate-y-1/2 text-neutral-400" aria-hidden="true" />
          <input
            ref={inputRef}
            role="combobox"
            aria-expanded
            aria-controls={listId}
            aria-autocomplete="list"
            aria-activedescendant={activeId}
            aria-label="Search project"
            value={query}
            onChange={(e) => { setQuery(e.target.value); setActive(0); }}
            onKeyDown={onKeyDown}
            onBlur={() => setTimeout(close, 120)}
            placeholder="Search code, name or client…"
            spellCheck={false}
            autoComplete="off"
            className="h-9 w-full rounded-md border border-neutral-200 bg-white pl-8 pr-3 text-body-sm text-neutral-900 focus-visible:border-racing-red-600 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-racing-red-600/20"
          />
        </div>
      ) : (
        <button
          type="button"
          role="combobox"
          aria-expanded={false}
          aria-controls={listId}
          aria-label="Select project"
          onClick={openList}
          onKeyDown={(e) => { if (e.key === 'ArrowDown' || e.key === 'Enter' || e.key === ' ') { e.preventDefault(); openList(); } }}
          className="flex h-9 w-full items-center gap-2 rounded-md border border-neutral-200 bg-white px-3 text-left text-body-sm text-neutral-900 hover:border-neutral-300 focus-visible:border-racing-red-600 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-racing-red-600/20"
        >
          <span className={cn('min-w-0 flex-1 truncate', !value && 'text-neutral-500')} title={selected ? `${selected.code} · ${selected.name}` : undefined}>
            {selected ? `${selected.code} · ${selected.name}` : 'Select project…'}
          </span>
          <Search size={ICON_SIZE.sm} strokeWidth={ICON_STROKE} className="shrink-0 text-neutral-400" aria-hidden="true" />
        </button>
      )}

      {open && (
        <ul
          id={listId}
          role="listbox"
          aria-label="Projects"
          className="absolute z-dropdown mt-1 max-h-72 w-full overflow-y-auto rounded-md border border-neutral-200 bg-white py-1 shadow-md"
        >
          {projects.isLoading ? (
            <li className="px-3 py-2 text-body-sm text-neutral-500">Searching…</li>
          ) : projects.isError ? (
            <li className="px-3 py-2 text-body-sm text-destructive-600">Could not load projects.</li>
          ) : items.length === 0 ? (
            <li className="px-3 py-2 text-body-sm text-neutral-500">
              {trimmed ? `No project matches “${trimmed}”.` : 'No projects yet.'}
            </li>
          ) : (
            items.map((p, i) => (
              <li
                key={p.id}
                id={`${listId}-opt-${p.id}`}
                role="option"
                aria-selected={p.id === value}
                onMouseEnter={() => setActive(i)}
                onMouseDown={(e) => e.preventDefault()}
                onClick={() => choose(p)}
                className={cn(
                  'flex cursor-pointer items-baseline gap-2 px-3 py-1.5',
                  i === activeIndex ? 'bg-neutral-100' : 'hover:bg-neutral-50',
                )}
              >
                <span className="shrink-0 font-mono text-caption text-neutral-500">{p.code}</span>
                <span className="min-w-0 flex-1 truncate text-body-sm text-neutral-900" title={p.name}>{p.name}</span>
                <span className="hidden shrink-0 text-caption text-neutral-500 sm:inline">{p.client}</span>
                <span className="shrink-0 rounded border border-neutral-200 px-1.5 py-px text-caption text-neutral-600">
                  {STATUS_LABEL[p.status] ?? p.status}
                </span>
              </li>
            ))
          )}
        </ul>
      )}
    </div>
  );
}
