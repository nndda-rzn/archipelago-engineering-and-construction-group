import { BulletBar, EmptyCell, StatusBadge } from '@aec/ui';
import type { ApprovalDetail } from '@aec/api-contracts';
import { formatDate, formatIdr } from '@/shared/lib/format';

const COST_LABEL: Record<string, string> = {
  DIRECT: 'Direct', LABOR: 'Labor', MATERIAL: 'Material', SUBCONTRACTOR: 'Subcontractor',
  EQUIPMENT: 'Equipment', INDIRECT: 'Indirect', OVERHEAD: 'Overhead',
};

/**
 * Konteks proyek. `baselineByCostType` sengaja dilabeli "Project baseline" —
 * itu komposisi anggaran SELURUH proyek, bukan atribusi dokumen ini (PR/PO item
 * tidak menyimpan cost type). Timeline hanya digambar bila tanggalnya ada.
 */
export function ProjectContext({ project }: { project: NonNullable<ApprovalDetail['project']> }) {
  const maxCost = Math.max(...project.baselineByCostType.map((c) => c.amount), 0);
  const hasSchedule = project.startDate && project.completionDate;

  return (
    <section className="border-b border-neutral-200 px-6 py-4" aria-label="Project context">
      <h3 className="mb-2 text-h3 text-neutral-800">Project context</h3>

      <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-body-sm">
        <span className="text-neutral-900">{project.code} · {project.name}</span>
        <StatusBadge status={project.status} />
      </div>

      <dl className="mt-2 grid grid-cols-2 gap-x-6 gap-y-1 text-caption sm:grid-cols-3">
        <div><dt className="text-neutral-500">Client</dt><dd className="text-neutral-800">{project.client}</dd></div>
        <div>
          <dt className="text-neutral-500">Contract value</dt>
          <dd className="font-mono tabular-nums text-neutral-800">{project.contractValue != null ? formatIdr(project.contractValue) : <EmptyCell label="No contract" />}</dd>
        </div>
        <div><dt className="text-neutral-500">Manager</dt><dd className="text-neutral-800">{project.manager ?? <EmptyCell label="Unassigned" />}</dd></div>
      </dl>

      {hasSchedule && (
        <p className="mt-2 text-caption text-neutral-500">
          Schedule <time dateTime={project.startDate!}>{formatDate(project.startDate)}</time> → <time dateTime={project.completionDate!}>{formatDate(project.completionDate)}</time>
        </p>
      )}

      {project.baselineByCostType.length > 0 && (
        <div className="mt-3">
          <p className="text-caption text-neutral-500">Project baseline by cost type</p>
          <ul className="mt-1 space-y-1">
            {project.baselineByCostType.map((c) => (
              <li key={c.costType} className="grid grid-cols-[7rem_1fr_auto] items-center gap-3">
                <span className="text-caption text-neutral-600">{COST_LABEL[c.costType] ?? c.costType}</span>
                <BulletBar value={c.amount} max={maxCost} label={`${COST_LABEL[c.costType] ?? c.costType} baseline`} tone="neutral" className="h-1.5" />
                <span className="font-mono text-caption tabular-nums text-neutral-700">{formatIdr(c.amount)}</span>
              </li>
            ))}
          </ul>
          <p className="mt-2 text-caption text-neutral-400">Whole-project baseline, not this document.</p>
        </div>
      )}
    </section>
  );
}
