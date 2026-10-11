import { Link } from '@tanstack/react-router';
import { AvatarStack, StatusBadge } from '@aec/ui';
import type { ProjectRegisterItem as RegisterItem } from '@aec/api-contracts';
import { formatIdr } from '@/shared/lib/format';
import { healthMeta } from '@/entities/health';

/** Baris register = item dari `GET /projects/register`. */
export type RegisterRow = RegisterItem;

/** Label jujur: `utilization` = serapan BIAYA, bukan progress fisik. */
export function budgetUsedLabel(utilization: number | null): string {
  return utilization == null ? '—' : `${Math.round(utilization)}%`;
}

function HealthBadge({ health }: { health: RegisterItem['health'] }) {
  const meta = healthMeta[health];
  return (    <span className="inline-flex items-center gap-1.5 whitespace-nowrap text-caption text-neutral-700">
      <span className={`inline-block h-2 w-2 rounded-full ${meta.dotClass}`} aria-hidden="true" />
      {meta.label}
    </span>
  );
}

function BudgetUsedBar({ utilization }: { utilization: number | null }) {
  if (utilization == null) return <span className="text-caption text-neutral-400">No budget</span>;
  const pct = Math.min(100, Math.max(0, utilization));
  return (
    <span className="flex items-center gap-2">
      <span className="h-2 w-20 overflow-hidden rounded-full bg-neutral-100">
        <span className="block h-full bg-neutral-700" style={{ width: `${pct}%` }} />
      </span>
      <span className="font-mono text-caption tabular-nums text-neutral-600">{Math.round(utilization)}%</span>
    </span>
  );
}

const dateRange = (start: string | null, end: string | null) =>
  start && end ? `${start.slice(0, 10)} → ${end.slice(0, 10)}` : null;

/** View 1 — Tabel: pekerjaan = bandingkan lintas kolom. */
export function ProjectTableView({ items }: { items: RegisterRow[] }) {
  return (
    <div className="overflow-x-auto rounded-md border border-neutral-200 bg-white shadow-xs">
      <table className="w-full border-collapse text-left text-body-sm">
        <thead className="bg-neutral-50 text-caption uppercase tracking-wide text-neutral-500">
          <tr>
            <th scope="col" className="px-3 py-2">Project</th>
            <th scope="col" className="px-3 py-2">Client</th>
            <th scope="col" className="px-3 py-2">Team</th>
            <th scope="col" className="px-3 py-2 text-right">Contract</th>
            <th scope="col" className="px-3 py-2">Start</th>
            <th scope="col" className="px-3 py-2">Status</th>
            <th scope="col" className="px-3 py-2">Budget used</th>
            <th scope="col" className="px-3 py-2">Health</th>
          </tr>
        </thead>
        <tbody>
          {items.map((p) => (
            <tr key={p.projectId} className="border-t border-neutral-100 hover:bg-neutral-50">
              <td className="px-3 py-2">
                <Link to="/projects/$projectId" params={{ projectId: p.projectId }} className="group inline-flex items-center gap-2">
                  <span className="font-mono text-neutral-600">{p.code}</span>
                  <span className="text-neutral-900 group-hover:underline">{p.name}</span>
                </Link>
              </td>
              <td className="px-3 py-2 text-neutral-600">{p.client}</td>
              <td className="px-3 py-2">
                {p.teamCount > 0 ? (
                  <span className="flex items-center gap-2">
                    <AvatarStack names={p.team.map((t) => t.name)} max={3} size="sm" />
                    <span className="font-mono text-caption tabular-nums text-neutral-500">{p.teamCount}</span>
                  </span>
                ) : (
                  <span className="text-caption text-neutral-400">—</span>
                )}
              </td>
              <td className="px-3 py-2 text-right font-mono tabular-nums text-neutral-700">{formatIdr(p.contractValue)}</td>
              <td className="px-3 py-2 font-mono text-caption text-neutral-600">{p.startDate ? p.startDate.slice(0, 10) : '—'}</td>
              <td className="px-3 py-2"><StatusBadge status={p.status} /></td>
              <td className="px-3 py-2"><BudgetUsedBar utilization={p.utilization} /></td>
              <td className="px-3 py-2"><HealthBadge health={p.health} /></td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

/** View 2 — Kartu: pekerjaan = pindai visual "mana yang perlu perhatian". */
export function ProjectCardView({ items }: { items: RegisterRow[] }) {
  return (
    <ul className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-3">
      {items.map((p) => (
        <li key={p.projectId}>
          <Link
            to="/projects/$projectId"
            params={{ projectId: p.projectId }}
            className="flex h-full flex-col gap-3 rounded-md border border-neutral-200 bg-white p-4 shadow-xs transition-colors duration-fast hover:border-neutral-300"
          >
            <div className="flex items-start justify-between gap-3">
              <span className="font-mono text-caption text-neutral-500">{p.code}</span>
              <StatusBadge status={p.status} />
            </div>
            <div>
              <p className="truncate text-body font-medium text-neutral-900" title={p.name}>{p.name}</p>
              <p className="truncate text-caption text-neutral-500">{p.client}</p>
            </div>
            <p className="font-mono text-h3 tabular-nums text-neutral-900">{formatIdr(p.contractValue)}</p>
            <div>
              <p className="text-caption text-neutral-500">Budget used</p>
              <BudgetUsedBar utilization={p.utilization} />
            </div>
            {/* Tim: siapa mengerjakan — avatar, bukan teks "PM Demo". */}
            <div className="flex items-center gap-2">
              {p.teamCount > 0 ? (
                <>
                  <AvatarStack names={p.team.map((t) => t.name)} max={4} size="sm" />
                  <span className="text-caption text-neutral-500">{p.teamCount} on team</span>
                </>
              ) : (
                <span className="rounded border border-dashed border-neutral-300 px-1.5 py-px text-caption text-neutral-500">No team</span>
              )}
              {p.managerRef && <span className="ml-auto truncate text-caption text-neutral-500" title={p.managerRef.name}>PM · {p.managerRef.name}</span>}
            </div>
            <div className="mt-auto flex items-center justify-between border-t border-neutral-100 pt-2">
              <HealthBadge health={p.health} />
              <span className="font-mono text-caption text-neutral-500">{dateRange(p.startDate, p.completionDate) ?? 'no dates'}</span>
            </div>
          </Link>
        </li>
      ))}
    </ul>
  );
}

const DAY = 86_400_000;

/** Hitung posisi & lebar bar relatif terhadap rentang seluruh proyek. */
export function timelineScale(items: RegisterRow[]): { min: number; span: number } {
  const starts = items.map((p) => (p.startDate ? new Date(p.startDate).getTime() : NaN)).filter((n) => Number.isFinite(n));
  const ends = items.map((p) => (p.completionDate ? new Date(p.completionDate).getTime() : NaN)).filter((n) => Number.isFinite(n));
  if (starts.length === 0 || ends.length === 0) return { min: 0, span: DAY };
  const min = Math.min(...starts);
  const max = Math.max(...ends);
  return { min, span: Math.max(max - min, DAY) };
}

/** View 3 — Timeline: pekerjaan = lihat durasi & tabrakan jadwal. */
export function ProjectTimelineView({ items, now }: { items: RegisterRow[]; now?: number }) {
  const dated = items.filter((p) => p.startDate && p.completionDate);
  const undated = items.filter((p) => !p.startDate || !p.completionDate);
  const { min, span } = timelineScale(dated);
  // `now` diberikan pemanggil (bukan Date.now() saat render) agar render tetap murni.
  const todayPct = now != null && dated.length > 0 ? Math.min(100, Math.max(0, ((now - min) / span) * 100)) : null;

  return (
    <div className="space-y-3">
      <div data-slot="timeline" className="relative rounded-md border border-neutral-200 bg-white p-4 shadow-xs">
        {dated.length === 0 ? (
          <p className="text-body-sm text-neutral-500">No projects have both start and completion dates.</p>
        ) : (
          <ul className="space-y-2">
            {dated.map((p) => {
              const start = new Date(p.startDate!).getTime();
              const end = new Date(p.completionDate!).getTime();
              const left = ((start - min) / span) * 100;
              const width = Math.max(((end - start) / span) * 100, 0.5);
              return (
                <li key={p.projectId} className="grid grid-cols-[7rem_1fr_6rem] items-center gap-3">
                  <Link to="/projects/$projectId" params={{ projectId: p.projectId }} className="truncate font-mono text-caption text-neutral-600 hover:underline">
                    {p.code}
                  </Link>
                  <span className="relative h-4 rounded-sm bg-neutral-50">
                    <Link
                      to="/projects/$projectId"
                      params={{ projectId: p.projectId }}
                      aria-label={`${p.code} ${p.name}: ${p.startDate!.slice(0, 10)} to ${p.completionDate!.slice(0, 10)}`}
                      className="absolute inset-y-0 rounded-sm opacity-90 hover:opacity-100"
                      style={{ left: `${left}%`, width: `${width}%` }}
                    >
                      <span className={`block h-full rounded-sm ${healthMeta[p.health].dotClass}`} />
                    </Link>
                    {todayPct != null && (
                      <span data-slot="today-line" aria-hidden="true" className="absolute inset-y-0 w-px bg-neutral-400" style={{ left: `${todayPct}%` }} />
                    )}
                  </span>
                  <span className="text-right font-mono text-caption tabular-nums text-neutral-500">{budgetUsedLabel(p.utilization)}</span>
                </li>
              );
            })}
          </ul>
        )}
      </div>

      {undated.length > 0 && (
        <div data-slot="timeline-undated" className="rounded-md border border-neutral-200 bg-neutral-50 p-3">
          <p className="text-caption text-neutral-500">
            {undated.length} project{undated.length === 1 ? '' : 's'} without dates — not shown on the timeline
          </p>
          <ul className="mt-1 flex flex-wrap gap-x-3 gap-y-1">
            {undated.map((p) => (
              <li key={p.projectId}>
                <Link to="/projects/$projectId" params={{ projectId: p.projectId }} className="font-mono text-caption text-neutral-600 hover:underline">
                  {p.code}
                </Link>
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
}
