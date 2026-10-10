import { useRef } from 'react';

export interface HardeningTab {
  id: string;
  label: string;
}

export interface HardeningTabsProps {
  tabs: HardeningTab[];
  value: string;
  onChange: (value: string) => void;
}

/**
 * Tab bar semantik: `role="tablist"` + `role="tab"` + `aria-selected`, navigasi
 * panah kiri/kanan, indikator **garis bawah** (bukan pil merah — merah hanya
 * untuk aksi). Mengikuti pola `workflow-drawer` dan konvensi tab-in-URL.
 */
export function HardeningTabs({ tabs, value, onChange }: HardeningTabsProps) {
  const refs = useRef<Array<HTMLButtonElement | null>>([]);

  const onKeyDown = (e: React.KeyboardEvent, index: number) => {
    let next: number | null = null;
    if (e.key === 'ArrowRight') next = (index + 1) % tabs.length;
    else if (e.key === 'ArrowLeft') next = (index - 1 + tabs.length) % tabs.length;
    else if (e.key === 'Home') next = 0;
    else if (e.key === 'End') next = tabs.length - 1;
    if (next == null) return;
    e.preventDefault();
    const target = tabs[next];
    if (target) {
      onChange(target.id);
      refs.current[next]?.focus();
    }
  };

  return (
    <div role="tablist" aria-label="Foundation hardening sections" className="flex items-center gap-1 border-b border-neutral-200">
      {tabs.map((t, i) => {
        const selected = t.id === value;
        return (
          <button
            key={t.id}
            ref={(el) => { refs.current[i] = el; }}
            type="button"
            role="tab"
            aria-selected={selected}
            aria-controls={`tabpanel-${t.id}`}
            tabIndex={selected ? 0 : -1}
            onClick={() => onChange(t.id)}
            onKeyDown={(e) => onKeyDown(e, i)}
            className={`-mb-px border-b-2 px-3 py-2 text-body-sm font-medium transition-colors duration-fast focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-racing-red-600/40 ${
              selected ? 'border-neutral-800 text-neutral-950' : 'border-transparent text-neutral-500 hover:text-neutral-800'
            }`}
          >
            {t.label}
          </button>
        );
      })}
    </div>
  );
}
