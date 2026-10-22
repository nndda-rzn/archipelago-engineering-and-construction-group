import { Link } from '@tanstack/react-router';
import { AlertTriangle, CalendarClock, CircleAlert, Flag, ShieldAlert, Sparkles } from 'lucide-react';
import { AvatarStack, ICON_STROKE, Sparkline, StatusBadge } from '@aec/ui';
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
  return (
    <span className="inline-flex items-center gap-1.5 whitespace-nowrap text-caption text-neutral-700">
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

const PHASE_LABEL: Record<string, string> = {
  INITIATION: 'Initiation', FEED: 'FEED', ENGINEERING: 'Engineering', PROCUREMENT: 'Procurement',
  CONSTRUCTION: 'Construction', COMMISSIONING: 'Commissioning', CLOSEOUT: 'Closeout',
};

/** View 1 — Tabel: pekerjaan = bandingkan lintas kolom. */
export function ProjectTableView({ items }: { items: RegisterRow[] }) {
  return (
    <div className="overflow-x-auto rounded-md border border-neutral-200 bg-white shadow-xs">
      <table className="w-full border-collapse text-left text-body-sm">
        <thead className="bg-neutral-50 text-caption uppercase tracking-wide text-neutral-500">
          <tr>
            <th scope="col" className="px-3 py-2">Project</th>
            <th scope="col" className="px-3 py-2">Client</th>
            <th scope="col" className="px-3 py-2">Phase</th>
            <th scope="col" className="px-3 py-2">Team</th>
            <th scope="col" className="px-3 py-2 text-right">Contract</th>
            <th scope="col" className="px-3 py-2 text-right">CPI / SPI</th>
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
              <td className="px-3 py-2 text-caption text-neutral-600">{PHASE_LABEL[p.phase] ?? p.phase}</td>
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
              <td className="px-3 py-2 text-right">
                <IndexPair cpi={p.cpi} spi={p.spi} />
              </td>
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

/** CPI/SPI sebagai angka mono ber-tone (hijau ≥1, kuning <1). */
function IndexPair({ cpi, spi }: { cpi: number | null; spi: number | null }) {
  const tone = (v: number | null) => (v == null ? 'text-neutral-400' : v >= 1 ? 'text-financial-positive-600' : 'text-warning-600');
  return (
    <span className="inline-flex gap-2 font-mono text-caption tabular-nums">
      <span className={tone(cpi)} title="Cost performance index">{cpi == null ? '—' : cpi.toFixed(2)}</span>
      <span className="text-neutral-300">/</span>
      <span className={tone(spi)} title="Schedule performance index">{spi == null ? '—' : spi.toFixed(2)}</span>
    </span>
  );
}

/** Satu sinyal kecil di dalam kartu (ikon + angka + label). */
function CardSignal({ icon, count, label, tone }: { icon: React.ReactNode; count: number; label: string; tone: 'bad' | 'warn' | 'neutral' }) {
  if (count <= 0) return null;
  const cls = tone === 'bad' ? 'text-destructive-600' : tone === 'warn' ? 'text-warning-700' : 'text-neutral-600';
  return (
    <span className={`inline-flex items-center gap-1 text-caption ${cls}`} title={`${count} ${label}`}>
      {icon}
      <span className="font-mono tabular-nums">{count}</span>
      <span className="text-neutral-500">{label}</span>
    </span>
  );
}

/** Tentukan kelompok urgensi: perlu perhatian / sehat / selesai. */
export function urgencyGroup(p: RegisterRow): 'attention' | 'healthy' | 'done' {
  if (p.status === 'COMPLETED' || p.status === 'CLOSED') return 'done';
  if (p.isWatchlist || p.health === 'CRITICAL' || p.health === 'AT_RISK' || p.openHse > 0 || p.openRisks > 2) return 'attention';
  return 'healthy';
}

/** Satu kartu proyek — double-bezel, hero metric, sinyal, sparkline. */
function ProjectCard({ p }: { p: RegisterRow }) {
  const attention = urgencyGroup(p) === 'attention';
  const cpiTone = p.cpi == null ? 'text-neutral-400' : p.cpi >= 1 ? 'text-financial-positive-600' : 'text-warning-600';
  const behind = p.progressActual < p.progressPlanned;

  return (
    <li>
      <Link
        to="/projects/$projectId"
        params={{ projectId: p.projectId }}
        className="group block rounded-lg bg-surface-sunken p-1.5 ring-1 ring-neutral-200/70 transition-[transform,box-shadow] duration-200 [transition-timing-function:cubic-bezier(0.23,1,0.32,1)] hover:-translate-y-0.5 hover:shadow-md motion-reduce:transition-none motion-reduce:hover:translate-y-0"
      >
        <div className="flex h-full flex-col gap-3 rounded-[6px] bg-surface-raised p-4 shadow-[inset_0_1px_0_rgba(255,255,255,0.6)]">
          {/* Kepala: kode + status + watchlist */}
          <div className="flex items-start justify-between gap-2">
            <div className="min-w-0">
              <span className="font-mono text-caption text-neutral-500">{p.code}</span>
              <p className="mt-0.5 truncate text-body font-semibold text-neutral-950" title={p.name}>{p.name}</p>
              <p className="truncate text-caption text-neutral-500" title={p.tagline ?? p.client}>{p.tagline ?? p.client}</p>
            </div>
            <StatusBadge status={p.status} />
          </div>

          {/* Hero metric: fase + progress + CPI */}
          <div className="flex items-end justify-between gap-3">
            <div className="min-w-0">
              <p className="text-overline uppercase text-neutral-500">{PHASE_LABEL[p.phase] ?? p.phase}</p>
              <p className="mt-0.5 font-mono text-metric tabular-nums text-neutral-950">
                {Math.round(p.progressActual)}%
                <span className={`ml-1.5 align-middle text-caption ${behind ? 'text-warning-600' : 'text-financial-positive-600'}`}>
                  {behind ? '▼' : '▲'} vs {Math.round(p.progressPlanned)}%
                </span>
              </p>
            </div>
            <div className="shrink-0 text-right">
              <p className="text-overline uppercase text-neutral-500">CPI</p>
              <p className={`font-mono text-h3 tabular-nums ${cpiTone}`}>{p.cpi == null ? '—' : p.cpi.toFixed(2)}</p>
            </div>
            {p.trend.length >= 2 && (
              <Sparkline values={p.trend} width={72} height={26} stroke="#a1a1aa" label={`${p.name} planned curve`} className="shrink-0" />
            )}
          </div>

          {/* Watchlist reason */}
          {attention && p.watchlistReason && (
            <p className="flex items-center gap-1.5 rounded bg-warning-50 px-2 py-1 text-caption text-warning-800">
              <AlertTriangle className="h-3.5 w-3.5 shrink-0" strokeWidth={ICON_STROKE} aria-hidden="true" />
              <span className="truncate">{p.watchlistReason}</span>
            </p>
          )}

          {/* Sinyal terbuka */}
          <div className="flex flex-wrap gap-x-3 gap-y-1">
            <CardSignal icon={<ShieldAlert className="h-3.5 w-3.5" strokeWidth={ICON_STROKE} aria-hidden="true" />} count={p.openRisks} label="risks" tone="warn" />
            <CardSignal icon={<CircleAlert className="h-3.5 w-3.5" strokeWidth={ICON_STROKE} aria-hidden="true" />} count={p.openNcr} label="NCR" tone="warn" />
            <CardSignal icon={<Flag className="h-3.5 w-3.5" strokeWidth={ICON_STROKE} aria-hidden="true" />} count={p.openHse} label="HSE" tone="bad" />
            {p.teamCount === 0 && (
              <span className="inline-flex items-center gap-1 text-caption text-neutral-500">
                <Sparkles className="h-3.5 w-3.5" strokeWidth={ICON_STROKE} aria-hidden="true" />No team
              </span>
            )}
            {p.nextMilestone && (
              <span className="inline-flex items-center gap-1 text-caption text-neutral-500" title={p.nextMilestone.name}>
                <CalendarClock className="h-3.5 w-3.5" strokeWidth={ICON_STROKE} aria-hidden="true" />
                <span className="truncate">{p.nextMilestone.name}</span>
                <span className="font-mono tabular-nums text-neutral-400">{p.nextMilestone.plannedDate.slice(0, 10)}</span>
              </span>
            )}
          </div>

          {/* Kaki: nilai + tim */}
          <div className="mt-auto flex items-center justify-between gap-2 border-t border-neutral-100 pt-2">
            <span className="font-mono text-body-sm tabular-nums text-neutral-800">{formatIdr(p.contractValue)}</span>
            {p.teamCount > 0 ? (
              <span className="flex items-center gap-2">
                <AvatarStack names={p.team.map((t) => t.name)} max={4} size="sm" />
                <span className="text-caption text-neutral-500">{p.teamCount}</span>
              </span>
            ) : (
              <HealthBadge health={p.health} />
            )}
          </div>
        </div>
      </Link>
    </li>
  );
}

const GROUP_META: Array<{ key: 'attention' | 'healthy' | 'done'; title: string; hint: string }> = [
  { key: 'attention', title: 'Needs attention', hint: 'watchlist, at risk, or open safety/risk items' },
  { key: 'healthy', title: 'On track', hint: 'no blocking signals' },
  { key: 'done', title: 'Completed', hint: 'closed out' },
];

/**
 * View 2 — Kartu: pekerjaan = triage "mana yang perlu perhatian". Kartu
 * dikelompokkan per urgensi (bukan grid seragam), kartu pertama tiap kelompok
 * lebih besar (featured), dan tiap kartu membawa sinyal + mini-tren.
 */
export function ProjectCardView({ items }: { items: RegisterRow[] }) {
  const grouped = GROUP_META.map((g) => ({ ...g, items: items.filter((p) => urgencyGroup(p) === g.key) })).filter((g) => g.items.length > 0);

  return (
    <div className="flex flex-col gap-6">
      {grouped.map((g) => (
        <section key={g.key} aria-label={g.title} className="flex flex-col gap-3">
          <div className="flex items-baseline gap-2">
            <h2 className="text-h3 text-neutral-900">{g.title}</h2>
            <span className="font-mono text-caption tabular-nums text-neutral-500">{g.items.length}</span>
            <span className="text-caption text-neutral-400">{g.hint}</span>
          </div>
          <ul className={`grid grid-cols-1 gap-4 md:grid-cols-2 ${g.key === 'attention' ? 'xl:grid-cols-3' : 'xl:grid-cols-4'}`}>
            {g.items.map((p) => <ProjectCard key={p.projectId} p={p} />)}
          </ul>
        </section>
      ))}
    </div>
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
