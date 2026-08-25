import { useState } from 'react';
import { Badge, Button } from '@aec/ui';
import { CheckCircle2, Lock } from 'lucide-react';
import { useBudget, usePublishBudget, useUpsertBudget } from '@/features/project';
import { useProjects } from '@/entities/project';
import { formatIdrCustom } from '@/shared/lib/format';

const PAGE_SIZE = 100;

function BudgetRow({
  code,
  name,
  amount,
  depth,
  onSave,
  saving,
}: {
  code: string;
  name: string;
  amount: number;
  depth: number;
  onSave: (amount: number) => void;
  saving: boolean;
}) {
  const [value, setValue] = useState(amount > 0 ? String(amount) : '');
  const [touched, setTouched] = useState(false);

  const handleSave = () => {
    const parsed = Number(value);
    if (Number.isFinite(parsed) && parsed >= 0) onSave(parsed);
  };

  return (
    <div
      className="flex items-center gap-3 border-b border-neutral-100 py-2 hover:bg-neutral-50"
      style={{ paddingLeft: `${depth * 24 + 16}px` }}
    >
      <span className="w-16 shrink-0 font-mono text-body-sm text-neutral-700">{code}</span>
      <span className="min-w-0 flex-1 truncate text-body-sm text-neutral-900">{name}</span>
      <input
        type="number"
        inputMode="numeric"
        min={0}
        value={value}
        placeholder="0"
        aria-label={`Budget ${code}`}
        onChange={(e) => {
          setValue(e.target.value);
          setTouched(true);
        }}
        className="h-8 w-36 rounded-md border border-neutral-200 bg-white px-2 font-mono text-body-sm text-neutral-900 placeholder:text-neutral-400 hover:border-neutral-300 focus-visible:border-racing-red-400 focus-visible:ring-2 focus-visible:ring-racing-red-400/20"
      />
      <Button size="sm" variant="secondary" onClick={handleSave} disabled={saving || !touched || value === String(amount)}>
        {saving ? 'Menyimpan…' : 'Simpan'}
      </Button>
    </div>
  );
}

export function BudgetPage() {
  const [projectId, setProjectId] = useState('');
  const { data, isLoading, isError, refetch } = useBudget(projectId);
  const upsert = useUpsertBudget(projectId);
  const publish = usePublishBudget(projectId);
  const projects = useProjects({ page: 1, pageSize: PAGE_SIZE });

  const selectedProject = (projects.data?.items ?? []).find((p) => p.id === projectId);
  const published = data?.status === 'PUBLISHED';

  const handlePublish = () => {
    if (window.confirm('Publish budget baseline? Setelah publish tidak bisa diedit.')) {
      publish.mutate();
    }
  };

  return (
    <div>
      <div className="mb-6 flex items-center justify-between">
        <div>
          <h1 className="text-h1 text-neutral-950">Budget Baseline</h1>
          <p className="mt-1 text-body-sm text-neutral-500">Anggaran per WBS (FR-PRJ-005/006)</p>
        </div>
        {data && (
          <div className="flex items-center gap-3">
            <Badge variant={published ? 'success' : 'default'}>
              {published ? <CheckCircle2 className="h-3 w-3" aria-hidden="true" /> : <Lock className="h-3 w-3" aria-hidden="true" />}
              {published ? 'PUBLISHED' : 'DRAFT'}
            </Badge>
            {!published && (
              <Button size="sm" onClick={handlePublish} loading={publish.isPending}>
                Publish Baseline
              </Button>
            )}
          </div>
        )}
      </div>

      <div className="mb-4 w-72">
        <label htmlFor="project-budget" className="mb-1.5 block text-body-sm font-medium text-neutral-700">
          Project
        </label>
        <select
          id="project-budget"
          value={projectId}
          onChange={(e) => setProjectId(e.target.value)}
          className="flex h-9 w-full rounded-md border border-neutral-200 bg-white px-3 text-body text-neutral-900 hover:border-neutral-300 focus-visible:border-racing-red-400 focus-visible:ring-2 focus-visible:ring-racing-red-400/20"
        >
          <option value="">Pilih project…</option>
          {(projects.data?.items ?? []).map((p) => (
            <option key={p.id} value={p.id}>{p.code} — {p.name}</option>
          ))}
        </select>
      </div>

      {isLoading && <p className="text-body-sm text-neutral-500">Memuat…</p>}
      {isError && (
        <p className="text-body-sm text-destructive-600">
          Gagal memuat budget.{' '}
          <button type="button" className="text-racing-red-600 hover:underline" onClick={() => refetch()}>Coba lagi</button>
        </p>
      )}

      {data && projectId && (
        <div className="rounded-md border border-neutral-200 bg-white shadow-xs">
          <div className="flex items-center justify-between border-b border-neutral-200 bg-neutral-50 px-4 py-2">
            <span className="text-caption font-medium uppercase text-neutral-500">WBS</span>
            <span className="text-caption font-medium uppercase text-neutral-500">
              Total: <span className="font-mono tabular-nums text-neutral-900">
                {formatIdrCustom(data.totalBudget, selectedProject?.currency ?? 'IDR')}
              </span>
            </span>
          </div>
          {data.wbs.length === 0 ? (
            <p className="p-6 text-center text-body-sm text-neutral-500">Belum ada WBS. Tambah di halaman WBS dulu.</p>
          ) : (
            data.wbs.map((w) => (
              <BudgetRow
                key={w.id}
                code={w.code}
                name={w.name}
                amount={w.budget}
                depth={w.parentId ? 1 : 0}
                saving={upsert.isPending}
                onSave={(amount) => upsert.mutate({ wbsItemId: w.id, amount })}
              />
            ))
          )}
        </div>
      )}

      {upsert.isError && (
        <p className="mt-3 text-body-sm text-destructive-600">Gagal menyimpan budget.{published ? ' Budget sudah publish.' : ''}</p>
      )}
      {publish.isError && <p className="mt-3 text-body-sm text-destructive-600">Gagal publish. Periksa data budget.</p>}
    </div>
  );
}
