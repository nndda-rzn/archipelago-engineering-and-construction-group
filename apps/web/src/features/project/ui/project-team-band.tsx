import { useMemo, useState } from 'react';
import { X } from 'lucide-react';
import { Button, EmptyState, PersonAvatar, Skeleton, useToast } from '@aec/ui';
import type { ProjectTeamMember } from '@aec/api-contracts';
import { useAddProjectMember, useProjectEmployees, useProjectTeam, useRemoveProjectMember } from '@/entities/project';

const DAY = 86_400_000;

function fmtDate(iso: string | null): string {
  return iso ? new Date(iso).toLocaleDateString('id-ID', { dateStyle: 'medium' }) : '—';
}

/** Rentang sumbu pita: dari mulai paling awal sampai selesai paling akhir (atau hari ini). */
function bandScale(members: ProjectTeamMember[]): { min: number; span: number; todayPct: number } {
  const starts = members.map((m) => new Date(m.startDate).getTime());
  const ends = members.map((m) => (m.endDate ? new Date(m.endDate).getTime() : Date.now()));
  if (starts.length === 0) return { min: 0, span: DAY, todayPct: 0 };
  const min = Math.min(...starts);
  const max = Math.max(...ends, Date.now());
  const span = Math.max(max - min, DAY);
  return { min, span, todayPct: Math.min(100, Math.max(0, ((Date.now() - min) / span) * 100)) };
}

const pct = (t: number, min: number, span: number) => Math.min(100, Math.max(0, ((t - min) / span) * 100));

/**
 * Band Tim: siapa mengerjakan proyek ini, sebagai apa, dan seberapa besar
 * alokasinya — divisualkan sebagai **pita waktu** (bar per orang + garis hari ini),
 * bukan tabel. Key member diberi bobot lebih (avatar lebih tebal, bar lebih gelap).
 */
export function ProjectTeamBand({ projectId }: { projectId: string }) {
  const toast = useToast();
  const team = useProjectTeam(projectId);
  const employees = useProjectEmployees();
  const addMember = useAddProjectMember(projectId);
  const removeMember = useRemoveProjectMember(projectId);
  const [adding, setAdding] = useState(false);
  const [form, setForm] = useState({ employeeId: '', role: '', allocationPercent: 50, isKeyMember: false });

  const members = useMemo(() => team.data?.items ?? [], [team.data]);
  const { min, span, todayPct } = useMemo(() => bandScale(members), [members]);
  const onProject = new Set(members.map((m) => m.employeeId));
  const candidates = (employees.data ?? []).filter((e) => !onProject.has(e.id));

  if (team.isLoading) {
    return <div className="space-y-2"><Skeleton className="h-12 w-full" /><Skeleton className="h-12 w-full" /></div>;
  }

  const submit = () => {
    if (!form.employeeId) return;
    addMember.mutate(
      { employeeId: form.employeeId, role: form.role || undefined, allocationPercent: form.allocationPercent, isKeyMember: form.isKeyMember },
      {
        onSuccess: () => { setForm({ employeeId: '', role: '', allocationPercent: 50, isKeyMember: false }); setAdding(false); toast({ title: 'Member added', variant: 'success' }); },
        onError: () => toast({ title: 'Could not add member', variant: 'error' }),
      },
    );
  };

  return (
    <section aria-label="Project team">
      <div className="mb-3 flex flex-wrap items-center gap-3">
        <h2 className="text-h3 text-neutral-900">Team</h2>
        <span className="font-mono text-caption tabular-nums text-neutral-400">
          {members.length} {members.length === 1 ? 'person' : 'people'} · {team.data?.totalAllocation ?? 0}% allocated
        </span>
        <Button size="sm" variant={adding ? 'ghost' : 'secondary'} className="ml-auto" onClick={() => setAdding((v) => !v)}>
          {adding ? 'Cancel' : '+ Add member'}
        </Button>
      </div>

      {adding && (
        <div className="mb-4 flex flex-wrap items-end gap-3 rounded-md border border-neutral-200 bg-neutral-50 p-3">
          <label className="flex flex-col gap-1 text-caption text-neutral-600">
            Person
            <select
              aria-label="Select employee"
              value={form.employeeId}
              onChange={(e) => setForm((f) => ({ ...f, employeeId: e.target.value }))}
              className="h-9 min-w-56 rounded-md border border-neutral-200 bg-white px-2 text-body-sm text-neutral-800 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-racing-red-600/40"
            >
              <option value="">Select…</option>
              {candidates.map((e) => <option key={e.id} value={e.id}>{e.name} — {e.position}</option>)}
            </select>
          </label>
          <label className="flex flex-col gap-1 text-caption text-neutral-600">
            Role on project
            <input
              aria-label="Role on project"
              placeholder="e.g. Site Engineer"
              value={form.role}
              onChange={(e) => setForm((f) => ({ ...f, role: e.target.value }))}
              className="h-9 w-48 rounded-md border border-neutral-200 bg-white px-2 text-body-sm text-neutral-800 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-racing-red-600/40"
            />
          </label>
          <label className="flex flex-col gap-1 text-caption text-neutral-600">
            Allocation %
            <input
              aria-label="Allocation percent"
              type="number" min={1} max={100}
              value={form.allocationPercent}
              onChange={(e) => setForm((f) => ({ ...f, allocationPercent: Number(e.target.value) }))}
              className="h-9 w-24 rounded-md border border-neutral-200 bg-white px-2 font-mono text-body-sm tabular-nums text-neutral-800 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-racing-red-600/40"
            />
          </label>
          <label className="flex items-center gap-2 pb-2 text-body-sm text-neutral-700">
            <input type="checkbox" checked={form.isKeyMember} onChange={(e) => setForm((f) => ({ ...f, isKeyMember: e.target.checked }))} className="h-4 w-4 accent-racing-red-600" />
            Key member
          </label>
          <Button size="sm" className="ml-auto" loading={addMember.isPending} disabled={!form.employeeId} onClick={submit}>Add</Button>
        </div>
      )}

      {members.length === 0 ? (
        <EmptyState title="No team yet" description="Nobody is assigned to this project. Add people to answer who is doing the work." />
      ) : (
        <div className="flex flex-col divide-y divide-neutral-100">
          {members.map((m) => {
            const startPct = pct(new Date(m.startDate).getTime(), min, span);
            const endPct = m.endDate ? pct(new Date(m.endDate).getTime(), min, span) : 100;
            const width = Math.max(1.5, endPct - startPct);
            return (
              <div key={m.assignmentId} className="group flex items-center gap-3 py-2">
                <div className="flex w-60 shrink-0 items-center gap-2">
                  <PersonAvatar name={m.name} size="lg" />
                  <div className="min-w-0">
                    <p className="flex items-center gap-1.5 truncate text-body-sm font-medium text-neutral-900" title={m.name}>
                      {m.name}
                      {m.isKeyMember && <span className="rounded border border-racing-red-200 bg-racing-red-50 px-1 py-px text-caption text-racing-red-700">key</span>}
                    </p>
                    <p className="truncate text-caption text-neutral-500">{m.role ?? m.position}</p>
                  </div>
                </div>
                <span className="relative h-3.5 flex-1 rounded-sm bg-neutral-100" title={`${m.name}: ${fmtDate(m.startDate)} – ${m.endDate ? fmtDate(m.endDate) : 'ongoing'} · ${m.allocationPercent}%`}>
                  <span
                    className={`absolute top-0 h-full rounded-sm ${m.isKeyMember ? 'bg-neutral-800' : 'bg-neutral-400'}`}
                    style={{ left: `${startPct}%`, width: `${width}%` }}
                  />
                  {/* Garis "hari ini" — hanya bila marker jatuh di dalam rentang pita. */}
                  {todayPct >= startPct - 1 && todayPct <= endPct + 1 && (
                    <span aria-hidden="true" className="absolute inset-y-[-2px] z-10 w-px bg-racing-red-600/70" style={{ left: `${todayPct}%` }} />
                  )}
                </span>
                <span className="w-12 shrink-0 text-right font-mono text-caption tabular-nums text-neutral-600">{m.allocationPercent}%</span>
                <button
                  type="button"
                  aria-label={`Remove ${m.name} from project`}
                  onClick={() => removeMember.mutate(m.assignmentId, { onSuccess: () => toast({ title: `${m.name} removed`, variant: 'success' }) })}
                  className="shrink-0 rounded p-1 text-neutral-300 opacity-0 transition-colors duration-fast hover:bg-neutral-100 hover:text-destructive-600 focus-visible:opacity-100 group-hover:opacity-100"
                >
                  <X className="h-3.5 w-3.5" aria-hidden="true" />
                </button>
              </div>
            );
          })}
        </div>
      )}
    </section>
  );
}
