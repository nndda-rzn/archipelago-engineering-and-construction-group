import { useId, useRef, useState } from 'react';
import { BarChart3, ChevronDown, GitCompare, Settings2 } from 'lucide-react';
import { cn } from '@aec/ui';

export interface WorkflowDrawerTab {
  value: string;
  label: string;
  icon?: React.ReactNode;
  content: React.ReactNode;
}

export interface WorkflowDrawerProps {
  tabs: WorkflowDrawerTab[];
  /** Tab yang terbuka; `null` berarti tertutup (kanvas dapat tinggi maksimal). */
  value: string | null;
  onValueChange: (value: string | null) => void;
  className?: string;
}

/**
 * Drawer bawah untuk hal-hal yang bukan pekerjaan utama: insight, riwayat versi,
 * dan pengaturan definisi.
 *
 * Tertutup secara default. Alasan: kanvas adalah alat kerja, dan tiga zona
 * vertikal sebelumnya (simulasi, versi, insight) menenggelamkannya. Menaruh
 * mereka dalam drawer yang dibuka sesuai kebutuhan menjaga hierarki — overview
 * (kanvas) dulu, detail atas permintaan (Shneiderman).
 *
 * Pola tab mengikuti WAI-ARIA: `tablist`/`tab`/`tabpanel`, navigasi panah,
 * `aria-selected`, dan `aria-controls`. Indikator tab berupa garis bawah, bukan
 * pil geser — konsisten dengan aturan visual proyek.
 */
export function WorkflowDrawer({ tabs, value, onValueChange, className }: WorkflowDrawerProps) {
  const baseId = useId();
  const tabRefs = useRef<(HTMLButtonElement | null)[]>([]);
  const open = value !== null;
  const activeTab = tabs.find((t) => t.value === value) ?? null;

  const focusTab = (index: number) => {
    const clamped = (index + tabs.length) % tabs.length;
    tabRefs.current[clamped]?.focus();
  };

  const onKeyDown = (event: React.KeyboardEvent, index: number) => {
    if (event.key === 'ArrowRight') {
      event.preventDefault();
      focusTab(index + 1);
    } else if (event.key === 'ArrowLeft') {
      event.preventDefault();
      focusTab(index - 1);
    } else if (event.key === 'Home') {
      event.preventDefault();
      focusTab(0);
    } else if (event.key === 'End') {
      event.preventDefault();
      focusTab(tabs.length - 1);
    }
  };

  return (
    <div className={cn('rounded-md border border-neutral-200 bg-white', className)}>
      <div role="tablist" aria-label="Workflow details" className="flex items-center gap-1 border-b border-neutral-200 px-2">
        {tabs.map((tab, index) => {
          const selected = tab.value === value;
          return (
            <button
              key={tab.value}
              ref={(el) => {
                tabRefs.current[index] = el;
              }}
              type="button"
              role="tab"
              id={`${baseId}-tab-${tab.value}`}
              aria-selected={selected}
              aria-controls={`${baseId}-panel-${tab.value}`}
              tabIndex={selected || (!open && index === 0) ? 0 : -1}
              onClick={() => onValueChange(selected ? null : tab.value)}
              onKeyDown={(e) => onKeyDown(e, index)}
              className={cn(
                '-mb-px flex items-center gap-1.5 border-b-2 px-3 py-2 text-body-sm transition-colors duration-fast',
                'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-neutral-400',
                selected
                  ? 'border-neutral-800 font-medium text-neutral-900'
                  : 'border-transparent text-neutral-500 hover:text-neutral-800',
              )}
            >
              {tab.icon}
              {tab.label}
            </button>
          );
        })}
        <span className="ml-auto pr-1">
          <ChevronDown
            className={cn('h-4 w-4 text-neutral-400 transition-transform duration-fast', open && 'rotate-180')}
            aria-hidden="true"
          />
        </span>
      </div>

      {activeTab && (
        <div
          role="tabpanel"
          id={`${baseId}-panel-${activeTab.value}`}
          aria-labelledby={`${baseId}-tab-${activeTab.value}`}
          className="animate-slide-up p-4 motion-reduce:animate-none"
        >
          {activeTab.content}
        </div>
      )}
    </div>
  );
}

export const DRAWER_ICONS = {
  insights: <BarChart3 className="h-4 w-4" aria-hidden="true" />,
  versions: <GitCompare className="h-4 w-4" aria-hidden="true" />,
  settings: <Settings2 className="h-4 w-4" aria-hidden="true" />,
};

/** Hook kecil agar state drawer tetap di URL-able di masa depan tanpa mengubah API. */
export function useDrawerState(initial: string | null = null) {
  return useState<string | null>(initial);
}
