import { Link } from '@tanstack/react-router';
import { SignalChip } from '@aec/ui';
import type { DomainItem, ProjectDomains, ProjectSummary } from '@aec/api-contracts';

/** Domain tile: angka + label + tautan (reuse pola dari detail page). */
export interface DomainGroupProps {
  title: string;
  items: DomainItem[];
  /** Kolom meta (mis. discipline / category) yang ditampilkan di kanan. */
  metaLabel?: string;
  /** Bila kosong: tautan ke halaman domainnya + label aksi. */
  emptyHref?: string;
  emptyLabel?: string;
}

/**
 * Grup domain: baris ringkas (ref + label + status). Bukan tabel penuh — hanya
 * daftar bernomor dengan hairline. Bila item membawa `score` (mis. progress %),
 * ditampilkan sebagai bar (FT: *magnitude*) — bukan angka telanjang. Status
 * selalu punya label teks (warna bukan satu-satunya sinyal). Empty state jujur
 * dengan tautan ke halaman domainnya.
 */
export function DomainGroup({ title, items, metaLabel, emptyHref, emptyLabel }: DomainGroupProps) {
  if (items.length === 0) {
    return (
      <section aria-label={title} className="flex flex-col gap-2">
        <h3 className="text-overline uppercase text-neutral-500">{title}</h3>
        {emptyHref ? (
          <Link to={emptyHref} className="text-body-sm text-neutral-500 underline decoration-neutral-300 underline-offset-2 hover:text-neutral-800">
            None recorded — {emptyLabel ?? 'open the register'} →
          </Link>
        ) : (
          <p className="text-body-sm text-neutral-400">None recorded.</p>
        )}
      </section>
    );
  }
  return (
    <section aria-label={title} className="flex flex-col gap-2">
      <h3 className="flex items-center gap-2 text-overline uppercase text-neutral-500">
        {title}
        <span className="font-mono text-caption tabular-nums text-neutral-400">{items.length}</span>
      </h3>
      <ul className="flex flex-col divide-y divide-neutral-100">
        {items.map((it) => (
          <li key={it.id} className="flex items-center gap-3 py-1.5">
            {it.ref && <span className="w-40 shrink-0 overflow-hidden text-ellipsis whitespace-nowrap font-mono text-caption text-neutral-500" title={it.ref}>{it.ref}</span>}
            <span className="min-w-0 flex-1 truncate text-body-sm text-neutral-800" title={it.label}>{it.label || '—'}</span>
            {it.score != null && (
              <span className="hidden shrink-0 items-center gap-2 sm:flex" title={`${it.score}%`}>
                <span className="h-1.5 w-16 overflow-hidden rounded-full bg-neutral-100">
                  <span className="block h-full rounded-full bg-neutral-700" style={{ width: `${Math.min(100, Math.max(0, it.score))}%` }} />
                </span>
                <span className="w-8 text-right font-mono text-caption tabular-nums text-neutral-500">{Math.round(it.score)}%</span>
              </span>
            )}
            {metaLabel && it.meta && <span className="hidden shrink-0 text-caption text-neutral-400 sm:inline">{it.meta}</span>}
            <span className="shrink-0 rounded border border-neutral-200 px-1.5 py-px text-caption text-neutral-600">{it.status.replace(/_/g, ' ').toLowerCase()}</span>
          </li>
        ))}
      </ul>
    </section>
  );
}

/** Signal strip domain: angka terbuka per kategori (ber-tone). */
export function DomainSignals({ summary }: { summary: ProjectSummary }) {
  const d = summary.domains;
  return (
    <div className="flex flex-wrap gap-2">
      <SignalChip severity={d.execution.workPackage === 0 ? 'low' : 'low'} count={d.execution.workPackage} label="Work packages" />
      <SignalChip severity={d.quality.ncrOpen === 0 ? 'low' : d.quality.ncrOpen > 2 ? 'high' : 'medium'} count={d.quality.ncrOpen} label="Open NCR" />
      <SignalChip severity={d.hse.incidentOpen === 0 ? 'low' : 'high'} count={d.hse.incidentOpen} label="Open HSE" />
      <SignalChip severity={d.governance.riskOpen === 0 ? 'low' : d.governance.riskOpen > 3 ? 'high' : 'medium'} count={d.governance.riskOpen} label="Open risks" />
      <SignalChip severity="low" count={d.engineering.drawing} label="Drawings" />
      <SignalChip severity="low" count={d.engineering.deliverable} label="Deliverables" />
    </div>
  );
}

export type { ProjectDomains };
