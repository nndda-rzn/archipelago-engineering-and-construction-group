import { Link } from '@tanstack/react-router';
import { AlertTriangle, CalendarClock, CircleAlert, Flag, ShieldAlert, Users } from 'lucide-react';
import { AvatarStack, ICON_STROKE, StatusBadge } from '@aec/ui';
import type { ProjectRegisterItem as RegisterItem } from '@aec/api-contracts';
import { formatIdr, formatIdrCompact } from '@/shared/lib/format';
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
  if (utilization == null) return <span className="text-caption text-neutral-500">No budget</span>;
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
                  <span className="text-caption text-neutral-500">—</span>
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
  const tone = (v: number | null) => (v == null ? 'text-neutral-500' : v >= 1 ? 'text-financial-positive-600' : 'text-warning-600');
  return (
    <span className="inline-flex gap-2 font-mono text-caption tabular-nums">
      <span className={tone(cpi)} title="Cost performance index">{cpi == null ? '—' : cpi.toFixed(2)}</span>
      <span className="text-neutral-300">/</span>
      <span className={tone(spi)} title="Schedule performance index">{spi == null ? '—' : spi.toFixed(2)}</span>
    </span>
  );
}

/** Tentukan kelompok urgensi: perlu perhatian / sehat / selesai. */
export function urgencyGroup(p: RegisterRow): 'attention' | 'healthy' | 'done' {
  if (p.status === 'COMPLETED' || p.status === 'CLOSED') return 'done';
  if (p.isWatchlist || p.health === 'CRITICAL' || p.health === 'AT_RISK' || p.openHse > 0 || p.openRisks > 2) return 'attention';
  return 'healthy';
}

// ─── Vonis & sinyal kartu ────────────────────────────────────────────────────
//
// Kartu menjawab satu pertanyaan: "proyek mana yang perlu saya lihat?". Register
// membawa DUA field kesehatan dengan arti berbeda, dan kartu dulu menukarnya:
//
//   `healthStatus` = kesehatan PROYEK   (CRITICAL / AT_RISK / ON_HOLD / COMPLETED)
//   `health`       = kesehatan SERAPAN BIAYA (NO_BUDGET / ON_TRACK / AT_RISK / CRITICAL)
//
// Kartu mewarnai dirinya dengan `health` — yang hampir selalu ON_TRACK karena
// utilisasi semua proyek ±45-56%, di bawah ambang — sementara mengelompokkan
// dengan `healthStatus`. Akibatnya proyek ber-`healthStatus` CRITICAL tampil
// hijau "On Track" di dalam grup "Needs attention". Vonis di bawah memakai
// `healthStatus`; `health` turun menjadi metrik berlabel "Budget used".

export type CardVerdictKey = 'COMPLETED' | 'CRITICAL' | 'AT_RISK' | 'ON_HOLD' | 'ON_TRACK';

export interface CardVerdict {
  key: CardVerdictKey;
  label: string;
  /** Warna aksen tepi kiri kartu. */
  accentClass: string;
  /** Warna teks label vonis. */
  textClass: string;
}

const VERDICT_META: Record<CardVerdictKey, Omit<CardVerdict, 'key'>> = {
  COMPLETED: { label: 'Completed', accentClass: 'bg-project-on-track-500', textClass: 'text-project-on-track-700' },
  CRITICAL: { label: 'Critical', accentClass: 'bg-project-critical-500', textClass: 'text-project-critical-700' },
  AT_RISK: { label: 'At risk', accentClass: 'bg-project-at-risk-500', textClass: 'text-project-at-risk-700' },
  ON_HOLD: { label: 'On hold', accentClass: 'bg-neutral-400', textClass: 'text-neutral-600' },
  ON_TRACK: { label: 'On track', accentClass: 'bg-project-on-track-500', textClass: 'text-project-on-track-700' },
};

/**
 * Vonis proyek dengan presedensi eksplisit. Selesai lebih dulu (proyek tutup
 * tidak "berisiko"), lalu tingkat kesehatan proyek, lalu status penangguhan.
 */
export function cardVerdict(p: RegisterRow): CardVerdict {
  const key: CardVerdictKey =
    p.status === 'COMPLETED' || p.status === 'CLOSED' ? 'COMPLETED'
    : p.healthStatus === 'CRITICAL' ? 'CRITICAL'
    : p.healthStatus === 'AT_RISK' ? 'AT_RISK'
    : p.status === 'ON_HOLD' || p.healthStatus === 'ON_HOLD' ? 'ON_HOLD'
    : 'ON_TRACK';
  return { key, ...VERDICT_META[key] };
}

export interface CardSignalItem {
  kind: 'watchlist' | 'hse' | 'ncr' | 'risk' | 'noteam' | 'behind';
  label: string;
  count?: number;
  tone: 'bad' | 'warn';
}

/**
 * Sinyal TERKUAT saja — bukan tiga sejajar. Urutannya juga hierarki keparahan
 * yang dipakai UI: keselamatan > mutu > risiko > kelengkapan data > jadwal.
 * `null` bila proyek tidak punya sinyal apa pun.
 */
export function cardSignal(p: RegisterRow): CardSignalItem | null {
  if (p.isWatchlist && p.watchlistReason) {
    return { kind: 'watchlist', label: p.watchlistReason, tone: p.healthStatus === 'CRITICAL' ? 'bad' : 'warn' };
  }
  if (p.openHse > 0) return { kind: 'hse', label: p.openHse === 1 ? 'open HSE incident' : 'open HSE incidents', count: p.openHse, tone: 'bad' };
  if (p.openNcr > 0) return { kind: 'ncr', label: p.openNcr === 1 ? 'open NCR' : 'open NCRs', count: p.openNcr, tone: 'warn' };
  if (p.openRisks > 2) return { kind: 'risk', label: 'open risks', count: p.openRisks, tone: 'warn' };
  if (p.teamCount === 0) return { kind: 'noteam', label: 'no team assigned', tone: 'warn' };
  if (p.progressActual < p.progressPlanned) return { kind: 'behind', label: 'behind plan', tone: 'warn' };
  return null;
}

const SIGNAL_ICON = {
  watchlist: AlertTriangle,
  hse: Flag,
  ncr: CircleAlert,
  risk: ShieldAlert,
  noteam: Users,
  behind: CalendarClock,
} as const;

/** Bar progress: terisi = aktual, penanda tegak = rencana. */
function ProgressBar({ actual, planned }: { actual: number; planned: number }) {
  const a = Math.min(100, Math.max(0, actual));
  const pl = Math.min(100, Math.max(0, planned));
  return (
    <span className="relative block h-1.5 w-full rounded-full bg-neutral-100" aria-hidden="true">
      <span className="absolute inset-y-0 left-0 rounded-full bg-neutral-800" style={{ width: `${a}%` }} />
      <span className="absolute inset-y-0 w-0.5 bg-neutral-500" style={{ left: `calc(${pl}% - 1px)` }} />
    </span>
  );
}

/** Satu kartu proyek — vonis memimpin, satu sinyal, sisanya mendukung. */
function ProjectCard({ p }: { p: RegisterRow }) {
  const verdict = cardVerdict(p);
  const signal = cardSignal(p);
  const delta = Math.round(p.progressActual) - Math.round(p.progressPlanned);
  const SignalIcon = signal ? SIGNAL_ICON[signal.kind] : null;

  return (
    <li>
      <Link
        to="/projects/$projectId"
        params={{ projectId: p.projectId }}
        className="group relative flex h-full flex-col gap-3 overflow-hidden rounded-md border border-neutral-200 bg-surface-raised p-4 shadow-xs transition-[box-shadow,border-color] duration-fast hover:border-neutral-300 hover:shadow-md focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-neutral-800 focus-visible:ring-offset-2 motion-reduce:transition-none"
      >
        {/* Aksen tepi kiri = warna vonis. Warna untuk memindai, teks untuk semua. */}
        <span className={`absolute inset-y-0 left-0 w-[3px] ${verdict.accentClass}`} aria-hidden="true" />

        {/* Baris 1 — vonis + kode */}
        <div className="flex items-center justify-between gap-2">
          <span className={`text-caption font-medium uppercase tracking-wide ${verdict.textClass}`}>{verdict.label}</span>
          <span className="font-mono text-caption text-neutral-500">{p.code}</span>
        </div>

        {/* Baris 2 — nama memimpin; fase + klien sebagai konteks */}
        <div className="min-w-0">
          <p className="truncate text-body font-semibold text-neutral-950" title={p.name}>{p.name}</p>
          <p className="mt-0.5 truncate text-caption text-neutral-500">
            {PHASE_LABEL[p.phase] ?? p.phase}
            {p.client ? ` · ${p.client}` : ''}
          </p>
        </div>

        {/* Baris 3 — progress: angka + bar dengan penanda rencana */}
        <div>
          <div className="flex items-baseline justify-between gap-2">
            <p className="font-mono text-metric-sm tabular-nums text-neutral-950">{Math.round(p.progressActual)}%</p>
            <p className="font-mono text-caption tabular-nums text-neutral-500">
              {delta === 0 ? 'on plan' : `${delta > 0 ? '+' : '−'}${Math.abs(delta)} pts vs ${Math.round(p.progressPlanned)}%`}
            </p>
          </div>
          <div className="mt-1.5">
            <ProgressBar actual={p.progressActual} planned={p.progressPlanned} />
          </div>
        </div>

        {/* Baris 4 — satu sinyal terkuat, atau ruang kosong agar kaki rata */}
        <div className="min-h-[1.25rem]">
          {signal && SignalIcon ? (
            <span
              className={`inline-flex max-w-full items-center gap-1 text-caption ${signal.tone === 'bad' ? 'text-destructive-600' : 'text-warning-700'}`}
              title={signal.count != null ? `${signal.count} ${signal.label}` : signal.label}
            >
              <SignalIcon className="h-3.5 w-3.5 shrink-0" strokeWidth={ICON_STROKE} aria-hidden="true" />
              {signal.count != null && <span className="font-mono tabular-nums">{signal.count}</span>}
              <span className="truncate">{signal.label}</span>
            </span>
          ) : null}
        </div>

        {/* Kaki — uang ringkas (nominal penuh di title) + serapan biaya */}
        <div className="mt-auto flex items-end justify-between gap-2 border-t border-neutral-100 pt-2.5">
          <span className="font-mono text-body-sm tabular-nums text-neutral-800" title={formatIdr(p.contractValue)}>
            {formatIdrCompact(p.contractValue)}
          </span>
          <span className="flex items-center gap-2 text-caption text-neutral-500" title="Cost consumed against budget">
            <span>Budget used</span>
            {p.utilization == null ? (
              <span>—</span>
            ) : (
              <>
                <span className="block h-1 w-10 rounded-full bg-neutral-100" aria-hidden="true">
                  <span className="block h-full rounded-full bg-neutral-500" style={{ width: `${Math.min(100, Math.max(0, p.utilization))}%` }} />
                </span>
                <span className="font-mono tabular-nums text-neutral-700">{Math.round(p.utilization)}%</span>
              </>
            )}
          </span>
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
 * dikelompokkan per urgensi (bukan grid seragam) dan tiap kartu membawa satu
 * vonis + satu sinyal, bukan seluruh isi tabel.
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
            <span className="text-caption text-neutral-500">{g.hint}</span>
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
